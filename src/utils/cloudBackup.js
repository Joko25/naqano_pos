import { supabase } from '../lib/supabase'
import { exportDatabase, importDatabase } from '../db'

/**
 * Mencadangkan database lokal (IndexedDB) ke kolom `backup_db` di tabel `licenses` Supabase.
 * Fitur ini hanya berlaku bagi pengguna dengan lisensi 'LIFETIME'.
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function uploadBackupToCloud() {
  try {
    // 1. Dapatkan info lisensi dari localStorage
    const storedStr = localStorage.getItem('bestari_license')
    if (!storedStr) {
      return { success: false, error: 'Sesi lisensi tidak ditemukan.' }
    }
    
    const stored = JSON.parse(storedStr)
    if (stored.type !== 'LIFETIME') {
      return { success: false, error: 'Fitur cloud backup hanya tersedia untuk pengguna Lisensi LIFETIME.' }
    }

    // 2. Ekspor database IndexedDB lokal ke JSON string
    const jsonString = await exportDatabase()
    
    // Parse ke JSON object agar disimpan sebagai kolom jsonb terstruktur di Supabase
    const backupData = JSON.parse(jsonString)

    // 3. Update data backup ke Supabase
    const { error } = await supabase
      .from('licenses')
      .update({ backup_db: backupData })
      .eq('license_key', stored.key)

    if (error) {
      console.error('[CloudBackup] Gagal mengunggah backup ke cloud:', error)
      return { success: false, error: error.message }
    }

    console.log('[CloudBackup] Backup otomatis berhasil disimpan di cloud!')
    return { success: true }
  } catch (err) {
    console.error('[CloudBackup] Kesalahan sistem saat backup ke cloud:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Mengunduh database cadangan dari Supabase dan memulihkannya ke IndexedDB lokal.
 *
 * @returns {Promise<{ success: boolean }>}
 */
export async function restoreFromCloud() {
  try {
    // 1. Dapatkan info lisensi dari localStorage
    const storedStr = localStorage.getItem('bestari_license')
    if (!storedStr) {
      throw new Error('Sesi lisensi tidak ditemukan.')
    }
    
    const stored = JSON.parse(storedStr)

    // 2. Ambil data backup_db dari Supabase
    const { data, error } = await supabase
      .from('licenses')
      .select('backup_db')
      .eq('license_key', stored.key)
      .maybeSingle()

    if (error) {
      throw new Error(`Gagal mengunduh backup dari cloud: ${error.message}`)
    }

    if (!data || !data.backup_db) {
      throw new Error('Tidak ada data cadangan (backup) yang ditemukan di cloud untuk lisensi Anda.')
    }

    // 3. Impor data ke IndexedDB lokal (Dexie)
    // Jika Supabase mengembalikan objek jsonb, ubah dulu ke string JSON untuk importDatabase
    const jsonString = typeof data.backup_db === 'string'
      ? data.backup_db
      : JSON.stringify(data.backup_db)

    await importDatabase(jsonString)

    console.log('[CloudBackup] Pemulihan database dari cloud berhasil!')
    return { success: true }
  } catch (err) {
    console.error('[CloudBackup] Gagal memulihkan data dari cloud:', err)
    throw err
  }
}
