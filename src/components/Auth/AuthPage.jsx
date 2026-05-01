import React, { useState } from 'react'
import { ShieldCheck, Loader2, KeyRound, Coffee, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Auth.css'

export default function AuthPage({ onLoginSuccess }) {
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleActivate = async (e) => {
    e.preventDefault()
    if (!licenseKey.trim()) {
      setError('Kode lisensi tidak boleh kosong.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const code = licenseKey.trim()

      // 1. Dapatkan atau buat Device ID unik untuk browser ini
      let currentDeviceId = localStorage.getItem('bestari_device_id')
      if (!currentDeviceId) {
        currentDeviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
        localStorage.setItem('bestari_device_id', currentDeviceId)
      }

      // 2. Cek lisensi ke Supabase
      const { data, error: sbError } = await supabase
        .from('licenses')
        .select('*')
        .eq('license_key', code)
        .maybeSingle() // Gunakan maybeSingle() agar tidak error jika 0 rows

      if (sbError || !data) {
        console.error("Supabase Error:", sbError)
        throw new Error('Lisensi tidak ditemukan. Pastikan Anda mengetik dengan benar.')
      }

      if (!data.is_active) {
        throw new Error('Lisensi ini sudah dinonaktifkan. Hubungi admin.')
      }

      // 3. LOGIKA PENGECEKAN DEVICE
      if (data.device_id && data.device_id !== currentDeviceId) {
        throw new Error('Lisensi ini sudah digunakan di perangkat/browser lain. Jika Anda me-reset HP/Browser, hubungi CS untuk mereset Device ID Anda.')
      }

      // 4. Jika belum terikat (device_id null), ikat sekarang di Supabase
      if (!data.device_id) {
        const { error: updateErr } = await supabase
          .from('licenses')
          .update({ 
            device_id: currentDeviceId,
            device_info: navigator.userAgent // Mencatat info browser/HP
          })
          .eq('license_key', code)

        if (updateErr) {
          throw new Error('Gagal mengaitkan perangkat ke lisensi. Pastikan internet Anda stabil.')
        }
        data.device_id = currentDeviceId
      }

      // 5. Jika sukses, simpan di localStorage
      localStorage.setItem('bestari_license', JSON.stringify({
        key: data.license_key,
        shopName: data.shop_name,
        type: data.type,
        expiresAt: data.valid_until || data.expiresAt, // Supabase kolomnya valid_until
        deviceId: data.device_id,
        activatedAt: new Date().toISOString()
      }))

      // 3. Panggil callback untuk membuka aplikasi
      onLoginSuccess()

    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Left Branding Side */}
      <div className="auth-left">
        <div className="auth-brand">
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 16 }}>
            <Coffee size={36} color="#fff" />
          </div>
          BestariPOS
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2, position: 'relative', zIndex: 1, marginTop: 20 }}>
          Sistem Kasir Pintar.<br/>Tanpa Biaya Bulanan.
        </div>
        
        <div className="auth-features">
          <div className="auth-feature-item">
            <CheckCircle2 size={20} color="#2dd4bf" /> 100% Offline Database
          </div>
          <div className="auth-feature-item">
            <CheckCircle2 size={20} color="#2dd4bf" /> Antrean & Varian Add-On
          </div>
          <div className="auth-feature-item">
            <CheckCircle2 size={20} color="#2dd4bf" /> Kalkulasi HPP Akurat
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-title">Aktivasi Perangkat</div>
          <div className="auth-subtitle">
            Selamat datang! Masukkan kode lisensi yang Anda dapatkan saat pembelian untuk mengaktifkan sistem kasir ini.
          </div>

          <form onSubmit={handleActivate}>
            <div className="auth-input-group">
              <KeyRound size={20} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="BESTARI-XXXX-YYYY"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Memvalidasi Lisensi...</>
              ) : (
                <><ShieldCheck size={20} /> Aktifkan Perangkat</>
              )}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Butuh bantuan? <a href="https://wa.me/6281234567890" target="_blank" style={{ color: '#2dd4bf', textDecoration: 'none' }}>Hubungi Customer Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}
