import { useState, useEffect } from 'react'
import {
  Image, Store, DollarSign, Building2, Smartphone,
  AlertTriangle, Save, FolderOpen, Trash2, Receipt, Percent
} from 'lucide-react'
import { getAllSettings, setSetting } from '../../db'
import { toast } from '../ui'
import './Settings.css'

const FIELDS = [
  { key: 'shopName', label: 'Nama Toko', placeholder: 'Naqano Coffee', icon: '🏪' },
  { key: 'shopAddress', label: 'Alamat', placeholder: 'Jl. Kopi Nikmat No. 1', icon: '📍' },
  { key: 'shopPhone', label: 'No. HP / WhatsApp', placeholder: '08123456789', icon: '📞' },
]

export default function Settings({ onLogoChange }) {
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAllSettings().then(s => { setForm(s); setLoading(false) })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    for (const [k, v] of Object.entries(form)) {
      await setSetting(k, v)
    }
    setSaving(false)
    toast.success('Pengaturan berhasil disimpan ✅')
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
              <input className="input" value={form.bankHolder || ''} onChange={e => set('bankHolder', e.target.value)} placeholder="Naqano Coffee" />
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
      </div>
    </div>
  )
}
