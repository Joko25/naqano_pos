import React, { useState, useEffect } from 'react'
import { Lock, Delete, Store } from 'lucide-react'
import { getSetting, setSetting } from '../../db'
import './Auth.css'

export default function PinLogin({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shopName, setShopName] = useState('Kasir')

  useEffect(() => {
    getSetting('shopName').then(name => {
      if (name) setShopName(name)
    })
  }, [])

  const handleInput = (digit) => {
    if (pin.length < 6) {
      setPin(p => p + digit)
      setError('')
    }
  }

  const handleDelete = () => {
    setPin(p => p.slice(0, -1))
  }

  const handleLogin = async () => {
    if (!pin) return

    const ownerPin = await getSetting('ownerPin')
    if (pin === ownerPin) {
      onLogin({ role: 'OWNER', name: 'Owner' })
      return
    }

    const cashiersRaw = await getSetting('cashiers')
    if (cashiersRaw) {
      const cashiers = JSON.parse(cashiersRaw)
      const cashier = cashiers.find(c => c.pin === pin)
      if (cashier) {
        onLogin({ role: 'CASHIER', name: cashier.name })
        return
      }
    }

    setError('PIN salah')
    setPin('')
  }

  const handleForgotPin = async () => {
    const licenseRaw = localStorage.getItem('bestari_license')
    if (!licenseRaw) return
    const licenseKey = JSON.parse(licenseRaw).key
    const input = prompt('LUPA PIN?\n\nSilakan masukkan KODE AKTIVASI (Lisensi) aplikasi Anda untuk mereset PIN Owner:')
    if (input === licenseKey) {
       await setSetting('ownerPin', '')
       alert('PIN Owner berhasil direset! Aplikasi akan dimuat ulang untuk pembuatan PIN baru.')
       window.location.reload()
    } else if (input) {
       alert('Kode Lisensi tidak cocok. Reset dibatalkan.')
    }
  }

  useEffect(() => {
    if (pin.length === 6) {
      // Wait briefly to allow user to see the dot
      const timer = setTimeout(() => {
        handleLogin()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [pin])

  return (
    <div className="auth-container">
      <div className="auth-center" style={{ zIndex: 10 }}>
        <div style={{ marginBottom: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(45, 212, 191, 0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf', marginBottom: 16 }}>
            <Store size={32} />
          </div>
          <div className="auth-title" style={{ fontSize: 24 }}>{shopName}</div>
          <div className="auth-subtitle">Masukkan PIN Anda untuk masuk</div>
        </div>

        <div className="numpad-dots">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`numpad-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && <div className="auth-error" style={{ width: '100%', maxWidth: 300 }}>{error}</div>}

        <div className="numpad-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleInput(num.toString())} className="numpad-btn">{num}</button>
          ))}
          <button onClick={() => { setPin(''); setError('') }} className="numpad-btn numpad-action">C</button>
          <button onClick={() => handleInput('0')} className="numpad-btn">0</button>
          <button onClick={handleDelete} className="numpad-btn numpad-action"><Delete size={24} /></button>
        </div>

        <button 
          onClick={handleForgotPin}
          style={{ marginTop: 32, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Lupa PIN Owner?
        </button>
      </div>
    </div>
  )
}
