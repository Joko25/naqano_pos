import { useState, useEffect } from 'react'
import {
  Image, Store, DollarSign, Building2, Smartphone,
  AlertTriangle, Save, FolderOpen, Trash2, Receipt, Percent,
  Download, Upload, RefreshCw, Lock, Bluetooth
} from 'lucide-react'
import { getAllSettings, setSetting, exportDatabase, importDatabase } from '../../db'
import { toast } from '../ui'
import { connectBluetoothPrinter, disconnectBluetoothPrinter, getConnectedBluetoothDevice } from '../../utils/print'
import './Settings.css'

const FIELDS = [
  { key: 'shopName', label: 'Nama Toko', placeholder: 'Bestari Kuliner', icon: '🏪' },
  { key: 'shopAddress', label: 'Alamat', placeholder: 'Jl. Kuliner Indah No. 1', icon: '📍' },
  { key: 'shopPhone', label: 'No. HP / WhatsApp', placeholder: '08123456789', icon: '📞' },
]

export default function Settings({ onLogoChange }) {
  const [form, setForm] = useState({})
  const [btDevice, setBtDevice] = useState(getConnectedBluetoothDevice())

  const handleConnectBt = async () => {
    try {
      const dev = await connectBluetoothPrinter()
      setBtDevice(dev)
      toast.success(`Terhubung ke ${dev.name}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDisconnectBt = async () => {
    try {
      await disconnectBluetoothPrinter()
      setBtDevice(null)
      toast.success('Koneksi printer diputuskan')
    } catch (err) {
      toast.error(err.message)
    }
  }
  
  const licenseType = (() => {
    try {
      return JSON.parse(localStorage.getItem('bestari_license'))?.type || 'TRIAL'
    } catch {
      return 'TRIAL'
    }
  })()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cashiers, setCashiers] = useState([])
  const [newCashierName, setNewCashierName] = useState('')
  const [newCashierPin, setNewCashierPin] = useState('')

  useEffect(() => {
    getAllSettings().then(s => { 
      setForm(s)
      if (s.cashiers) {
        try { setCashiers(JSON.parse(s.cashiers)) } catch (e) {}
      }
      setLoading(false) 
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    for (const [k, v] of Object.entries(form)) {
      await setSetting(k, v)
    }
    await setSetting('cashiers', JSON.stringify(cashiers))
    toast.success('Pengaturan disimpan')
    setSaving(false)
  }

  const addCashier = async () => {
    if (!newCashierName || newCashierPin.length !== 6) {
      toast.error('Nama wajib diisi dan PIN harus tepat 6 angka')
      return
    }

    if (newCashierPin === form.ownerPin) {
      toast.error('PIN ini tidak bisa digunakan (bentrok dengan PIN Owner)')
      return
    }

    if (cashiers.some(c => c.pin === newCashierPin)) {
      toast.error('PIN ini sudah digunakan oleh kasir lain')
      return
    }
    const newCashier = { id: Date.now(), name: newCashierName, pin: newCashierPin }
    const updated = [...cashiers, newCashier]
    setCashiers(updated)
    await setSetting('cashiers', JSON.stringify(updated))
    toast.success('Kasir berhasil ditambahkan')
    setNewCashierName('')
    setNewCashierPin('')
  }

  const removeCashier = async (id) => {
    const updated = cashiers.filter(c => c.id !== id)
    setCashiers(updated)
    await setSetting('cashiers', JSON.stringify(updated))
    toast.success('Kasir dihapus')
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      set('shopLogo', ev.target.result)
      onLogoChange?.(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    set('shopLogo', '')
    onLogoChange?.('')
  }

  async function handleExport() {
    try {
      const data = await exportDatabase()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_pos_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup berhasil diunduh ✅')
    } catch (err) {
      toast.error('Gagal mengekspor data ❌')
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!confirm('Peringatan: Mengimpor data akan MENGHAPUS semua data saat ini dan menggantinya dengan data dari file backup. Lanjutkan?')) {
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        await importDatabase(ev.target.result)
        toast.success('Data berhasil dipulihkan! Reload aplikasi... 🔄')
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        toast.error('Gagal mengimpor file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</div>

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="page-title"><Store size={20} strokeWidth={2} /> Pengaturan</h2>
        <button className="btn btn-amber" onClick={save} disabled={saving}>
          <Save size={15} strokeWidth={2} /> {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      <div className="settings-content">
        {/* Logo Toko */}
        <div className="settings-section">
          <div className="settings-section-title"><Image size={15} strokeWidth={2} /> Logo Toko</div>
          <div className="logo-upload-area">
            <div className="logo-preview-box">
              {form.shopLogo ? (
                <img src={form.shopLogo} alt="Logo Toko" className="logo-preview-img" />
              ) : (
                <div className="logo-preview-placeholder">
                  <Store size={32} strokeWidth={1} style={{ opacity: 0.3, color: 'var(--tosca)' }} />
                  <span className="logo-placeholder-text">Belum ada logo</span>
                </div>
              )}
            </div>
            <div className="logo-upload-actions">
              <label className="btn btn-outline logo-upload-btn" htmlFor="logo-file-input">
                <FolderOpen size={15} strokeWidth={2} /> Pilih Gambar
              </label>
              <input
                id="logo-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              {form.shopLogo && (
                <button className="btn btn-ghost" onClick={removeLogo}>
                  <Trash2 size={14} strokeWidth={2} /> Hapus Logo
                </button>
              )}
              <span className="logo-upload-hint">
                Format: PNG, JPG, WebP, SVG. Maks 2MB.<br />
                Logo akan tampil di topbar dan struk.
              </span>
            </div>
          </div>
        </div>

        {/* Shop Info */}
        <div className="settings-section">
          <div className="settings-section-title"><Store size={15} strokeWidth={2} /> Informasi Toko</div>
          <div className="settings-grid">
            {FIELDS.map(f => (
              <div key={f.key} className="input-group">
                <label className="input-label">{f.icon} {f.label}</label>
                <input
                  className="input"
                  value={form[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div className="input-group">
              <label className="input-label"><Receipt size={12} strokeWidth={2} /> Teks Bawah Struk</label>
              <input className="input" value={form.receiptFooter || ''} onChange={e => set('receiptFooter', e.target.value)} placeholder="Terima kasih sudah berkunjung!" />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="settings-section">
          <div className="settings-section-title"><DollarSign size={15} strokeWidth={2} /> Harga &amp; Pajak</div>
          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label"><Percent size={12} strokeWidth={2} /> Persentase Pajak (PPN %)</label>
              <input className="input" type="number" min="0" max="100"
                value={form.taxPercent || 0} onChange={e => set('taxPercent', parseFloat(e.target.value) || 0)}
                placeholder="0" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Kosongkan atau isi 0 jika tidak pakai pajak
              </span>
            </div>
          </div>
        </div>

        {/* Transfer */}
        <div className="settings-section">
          <div className="settings-section-title"><Building2 size={15} strokeWidth={2} /> Rekening Bank</div>
          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">Nama Bank</label>
              <input className="input" value={form.bankName || ''} onChange={e => set('bankName', e.target.value)} placeholder="BCA" />
            </div>
            <div className="input-group">
              <label className="input-label">Nomor Rekening</label>
              <input className="input" value={form.bankAccount || ''} onChange={e => set('bankAccount', e.target.value)} placeholder="1234567890" />
            </div>
            <div className="input-group">
              <label className="input-label">Atas Nama</label>
              <input className="input" value={form.bankHolder || ''} onChange={e => set('bankHolder', e.target.value)} placeholder="Bestari Kuliner" />
            </div>
          </div>
        </div>

        {/* QRIS */}
        <div className="settings-section">
          <div className="settings-section-title"><Smartphone size={15} strokeWidth={2} /> QRIS</div>
          <div className="settings-grid">
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Data QRIS (string dari file QRIS Anda)</label>
              <textarea
                className="input qris-textarea"
                value={form.qrisNumber || ''}
                onChange={e => set('qrisNumber', e.target.value)}
                placeholder="Paste string QRIS dari bank/dompet digital Anda. Kosongkan untuk pakai QR demo."
                rows={4}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                💡 Anda bisa mendapat string QRIS dari aplikasi bank atau dompet digital (GoPay, OVO, DANA, BCA, dll). Kosongkan untuk menggunakan QR demo.
              </span>
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="settings-section">
          <div className="settings-section-title"><Receipt size={15} strokeWidth={2} /> Pengaturan Printer Struk</div>
          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">Koneksi Printer</label>
              <select className="select" value={form.printerConnection || 'system'} onChange={e => set('printerConnection', e.target.value)}>
                <option value="system">Sistem (Dialog Print Browser / Pihak Ketiga)</option>
                <option value="bluetooth">Direct Bluetooth (BLE - Tanpa Aplikasi)</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Lebar Kertas</label>
              <select className="select" value={form.printerWidth || '58mm'} onChange={e => set('printerWidth', e.target.value)}>
                <option value="58mm">58mm (Kecil)</option>
                <option value="80mm">80mm (Besar)</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Ukuran Huruf</label>
              <select className="select" value={form.receiptFontSize || '12px'} onChange={e => set('receiptFontSize', e.target.value)}>
                <option value="11px">Kecil</option>
                <option value="12px">Normal</option>
                <option value="14px">Besar</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Auto-Print</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                 <input 
                   type="checkbox" 
                   id="auto-print-check"
                   checked={form.autoPrint === 'true'} 
                   onChange={e => set('autoPrint', String(e.target.checked))} 
                 />
                 <label htmlFor="auto-print-check" style={{ fontSize: 13, cursor: 'pointer' }}>Munculkan dialog print otomatis saat bayar</label>
              </div>
            </div>
          </div>

          {form.printerConnection === 'bluetooth' && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bluetooth size={16} style={{ color: btDevice ? 'var(--green)' : 'var(--text-muted)' }} />
                    Direct Bluetooth LE Printer
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {btDevice ? `Terhubung ke: ${btDevice.name}` : 'Printer tidak terhubung'}
                  </div>
                </div>
                <div>
                  {btDevice ? (
                    <button className="btn btn-outline" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={handleDisconnectBt}>
                      Putuskan Koneksi
                    </button>
                  ) : (
                    <button className="btn btn-amber" onClick={handleConnectBt}>
                      Hubungkan Printer
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.4 }}>
                ⚠️ <strong>Catatan:</strong> Fitur Direct Bluetooth menggunakan Web Bluetooth API. Printer Anda harus mendukung Bluetooth BLE (bukan hanya classic), dan aplikasi harus diakses via <strong>HTTPS</strong> atau <strong>localhost</strong> di browser Chrome/Android.
              </div>
            </div>
          )}
        </div>

        {/* Pegawai / Kasir */}
        <div className="settings-section">
          <div className="settings-section-title"><Lock size={15} strokeWidth={2} /> Manajemen Pegawai (Kasir)</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Tambahkan akun Kasir. Kasir tidak bisa mengakses menu Pengaturan dan Laporan.
          </p>
          
          <div style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <div className="cashier-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label className="input-label" style={{ fontSize: 12 }}>Nama Kasir</label>
                <input 
                  className="input" 
                  placeholder="Misal: Budi" 
                  value={newCashierName}
                  onChange={e => setNewCashierName(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label" style={{ fontSize: 12 }}>PIN Kasir (6 Angka)</label>
                <input 
                  className="input" 
                  type="password"
                  placeholder="6 Angka"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={newCashierPin}
                  onChange={e => setNewCashierPin(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                />
              </div>
              <button className="btn btn-primary" onClick={addCashier}>
                + Tambah
              </button>
            </div>
          </div>

          {cashiers.length > 0 && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {cashiers.map((c, idx) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx < cashiers.length - 1 ? '1px solid var(--border-color)' : 'none', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: 14 }}>{c.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PIN: **** (Kasir)</span>
                  </div>
                  <button className="btn btn-ghost" style={{ color: 'var(--red)', padding: '6px' }} onClick={() => removeCashier(c.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reset */}
        <div className="settings-section danger-zone">
          <div className="settings-section-title" style={{ color: 'var(--red)' }}>
            <AlertTriangle size={15} strokeWidth={2} /> Zona Bahaya
          </div>
          <button className="btn btn-danger" onClick={async () => {
            if (confirm('Yakin ingin menghapus SEMUA data transaksi? Ini tidak bisa dibatalkan!')) {
              const { db } = await import('../../db')
              await db.transactions.clear()
              await db.transactionItems.clear()
              toast.success('Semua transaksi telah dihapus')
            }
          }}>
            <Trash2 size={15} strokeWidth={2} /> Hapus Semua Data Transaksi
          </button>
        </div>
        {/* Database: Backup & Restore */}
        <div className="settings-section">
          <div className="settings-section-title"><RefreshCw size={15} strokeWidth={2} /> Database: Backup & Restore</div>
          {licenseType === 'TRIAL' ? (
            <div style={{ padding: '20px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--tosca)', fontWeight: 'bold' }}>
                <Lock size={16} /> Fitur Premium Terkunci
              </div>
              Maaf, fitur Ekspor/Impor Database dan Auto-Backup harian hanya tersedia untuk <strong>Lisensi Premium</strong>. Tingkatkan lisensi Anda untuk mengamankan data transaksi kedai Anda secara penuh!
            </div>
          ) : (
            <>
              <div className="settings-grid">
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Auto-Backup Harian</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <input 
                      type="checkbox" 
                      id="auto-backup-check"
                      checked={form.autoBackup === 'true'} 
                      onChange={e => set('autoBackup', String(e.target.checked))} 
                    />
                    <label htmlFor="auto-backup-check" style={{ fontSize: 13, cursor: 'pointer' }}>Download file backup otomatis saat aplikasi pertama kali dibuka (sehari sekali)</label>
                  </div>
                </div>
              </div>
              <div className="db-controls" style={{ marginTop: 16 }}>
                <div className="db-card">
                  <div className="db-icon bg-green"><Download size={18} /></div>
                  <div className="db-info">
                    <strong>Ekspor Data (Backup)</strong>
                    <p>Simpan semua data (produk, transaksi, stok) ke dalam file JSON.</p>
                  </div>
                  <button className="btn btn-outline" onClick={handleExport}>Download Backup</button>
                </div>
                
                <div className="db-card">
                  <div className="db-icon bg-amber"><Upload size={18} /></div>
                  <div className="db-info">
                    <strong>Impor Data (Restore)</strong>
                    <p>Pindahkan data dari device lain. Semua data saat ini akan terhapus!</p>
                  </div>
                  <label className="btn btn-outline btn-restore" htmlFor="db-import-input">Pilih File Backup</label>
                  <input
                    id="db-import-input"
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImport}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
