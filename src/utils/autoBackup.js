import { exportDatabase } from '../db'

const STORAGE_KEY = 'naqano_last_backup_date'

/**
 * Ambil tanggal hari ini dalam format YYYY-MM-DD (lokal)
 */
function getTodayStr() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Trigger browser download untuk string JSON
 */
function downloadJson(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Jalankan auto-backup sekali per hari.
 * - Cek tanggal terakhir backup di localStorage.
 * - Jika hari ini belum backup → export DB → download file JSON.
 * - Simpan tanggal hari ini ke localStorage supaya tidak backup lagi di sesi yang sama.
 *
 * @returns {Promise<{ skipped: boolean, filename?: string }>}
 */
export async function runDailyAutoBackup() {
  const today       = getTodayStr()
  const lastBackup  = localStorage.getItem(STORAGE_KEY)

  // Sudah backup hari ini → skip
  if (lastBackup === today) {
    return { skipped: true }
  }

  try {
    const jsonString = await exportDatabase()
    const filename   = `naqano-backup-${today}.json`

    downloadJson(jsonString, filename)

    // Tandai sudah backup hari ini
    localStorage.setItem(STORAGE_KEY, today)

    console.log(`[AutoBackup] Backup berhasil → ${filename}`)
    return { skipped: false, filename }
  } catch (err) {
    console.error('[AutoBackup] Gagal melakukan backup:', err)
    throw err
  }
}
