import React, { useState } from 'react'
import { Shield, KeyRound, Loader2 } from 'lucide-react'
import { setSetting } from '../../db'
import './Auth.css'

export default function OwnerSetup({ onComplete }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSetup = async (e) => {
    e.preventDefault()
    
    if (pin.length !== 6) {
      setError('PIN harus tepat 6 angka')
      return
    }
    
    if (pin !== confirmPin) {
      setError('Konfirmasi PIN tidak cocok')
      return
    }

    setLoading(true)
    try {
      await setSetting('ownerPin', pin)
      onComplete()
    } catch (err) {
      setError('Gagal menyimpan PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-center">
        <div className="auth-form-card" style={{ zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(45, 212, 191, 0.2)', color: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Shield size={32} />
            </div>
            <div className="auth-title" style={{ fontSize: 24 }}>Setup Keamanan Owner</div>
            <div className="auth-subtitle">
              Buat PIN Owner. PIN ini digunakan untuk mengakses Laporan, Pengaturan, dan Manajemen Pegawai.
            </div>
          </div>

          <form onSubmit={handleSetup}>
            <div className="auth-input-group">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Buat PIN Owner (Angka)
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} className="auth-input-icon" />
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="6 angka"
                  className="auth-input text-center"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Konfirmasi PIN
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} className="auth-input-icon" />
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Ulangi PIN"
                  className="auth-input text-center"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Simpan & Lanjutkan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
