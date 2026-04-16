import { useState, useEffect } from 'react'
import {
  ShoppingCart, Package, BarChart2, Settings,
  Clock, Coffee, ArrowRight, ChevronLeft
} from 'lucide-react'
import POSView from './components/POS/POSView'
import Cart from './components/Cart/Cart'
import Products from './components/Products/Products'
import Inventory from './components/Inventory/Inventory'
import QueuePage from './components/Queue/QueuePage'
import Reports from './components/Reports/Reports'
import SettingsPage from './components/Settings/Settings'
import { Toast } from './components/ui'
import { getAllSettings } from './db'
import { useCartStore } from './store/cartStore'
import './App.css'

const NAV_ITEMS = [
  { id: 'pos',       label: 'Kasir',      Icon: ShoppingCart },
  { id: 'queue',     label: 'Antrean',    Icon: Clock },
  { id: 'products',  label: 'Produk',     Icon: Package },
  { id: 'inventory', label: 'Bahan',      Icon: Coffee },
  { id: 'reports',   label: 'Laporan',    Icon: BarChart2 },
  { id: 'settings',  label: 'Pengaturan', Icon: Settings },
]

export default function App() {
  const [page, setPage] = useState('pos')
  const [shopName, setShopName] = useState('Naqano Coffee')
  const [shopLogo, setShopLogo] = useState('')
  const [now, setNow] = useState(new Date())
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const { setTaxPercent, items, getTotal, autoOpenPayment } = useCartStore()

  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  const total = getTotal()

  useEffect(() => {
    if (autoOpenPayment && page === 'pos') {
      setMobileCartOpen(true)
    }
  }, [autoOpenPayment, page])

  useEffect(() => {
    getAllSettings().then(s => {
      if (s.shopName) setShopName(s.shopName)
      if (s.shopLogo) setShopLogo(s.shopLogo)
      if (s.taxPercent) setTaxPercent(Number.parseFloat(s.taxPercent))
    })
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="app">
      <Toast />

      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-brand">
          {shopLogo ? (
            <img src={shopLogo} alt="Logo" className="brand-logo" />
          ) : (
            <Coffee size={24} color="#fff" strokeWidth={2} />
          )}
          <span className="brand-name">{shopName}</span>
        </div>

        <nav className="topbar-nav">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-btn ${page === id ? 'active' : ''}`}
              onClick={() => { setPage(id); if (id !== 'pos') setMobileCartOpen(false) }}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="topbar-time">
            <div className="time-clock-row">
              <Clock size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <span className="time-clock">{timeStr}</span>
            </div>
            <span className="time-date">{dateStr}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {(() => {
          if (page === 'pos') {
            return (
              <div className={`pos-layout ${mobileCartOpen ? 'cart-open' : ''}`}>
                <div className="pos-left">
                  <POSView />
                  {!mobileCartOpen && itemCount > 0 && (
                    <div className="mobile-cart-fab-wrap">
                      <button className="mobile-cart-fab" onClick={() => setMobileCartOpen(true)}>
                        <div className="fab-left">
                          <div className="fab-badge">{itemCount}</div>
                          <span>Lihat Pesanan</span>
                        </div>
                        <div className="fab-right">
                          <span>Rp {total.toLocaleString('id-ID')}</span>
                          <ArrowRight size={18} />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                <div className={`pos-right ${mobileCartOpen ? 'open' : ''}`}>
                  {mobileCartOpen && (
                    <button className="mobile-cart-close" onClick={() => setMobileCartOpen(false)}>
                      <ChevronLeft size={20} /> Kembali ke Menu
                    </button>
                  )}
                  <Cart />
                </div>
              </div>
            )
          }
          if (page === 'products') return <Products />
          if (page === 'queue') return <QueuePage onNavigate={setPage} />
          if (page === 'inventory') return <Inventory />
          if (page === 'reports') return <Reports />
          return <SettingsPage onLogoChange={setShopLogo} />
        })()}
      </main>
    </div>
  )
}
