import { useState, useEffect } from 'react'
import {
  ShoppingCart, Package, BarChart2, Settings,
  Clock, Coffee, ArrowRight, ChevronLeft,
  Tag, Menu, X, ChevronsLeft, ChevronsRight, PlusCircle
} from 'lucide-react'
import POSView from './components/POS/POSView'
import Cart from './components/Cart/Cart'
import Products from './components/Products/Products'
import Categories from './components/Categories/Categories'
import LandingPage from './components/Landing/LandingPage'
import AddOns from './components/AddOns/AddOns'
import Inventory from './components/Inventory/Inventory'
import QueuePage from './components/Queue/QueuePage'
import Reports from './components/Reports/Reports'
import SettingsPage from './components/Settings/Settings'
import { Toast, toast } from './components/ui'
import { db, getAllSettings } from './db'
import { useCartStore } from './store/cartStore'
import { runDailyAutoBackup } from './utils/autoBackup'
import './App.css'

const NAV_ITEMS = [
  { id: 'pos',        label: 'Kasir',      Icon: ShoppingCart },
  { id: 'queue',      label: 'Antrean',    Icon: Clock },
  { id: 'products',   label: 'Produk',     Icon: Package },
  { id: 'categories', label: 'Kategori',   Icon: Tag },
  { id: 'addons',     label: 'Add-On',     Icon: PlusCircle },
  { id: 'inventory',  label: 'Bahan',      Icon: Coffee },
  { id: 'reports',    label: 'Laporan',    Icon: BarChart2 },
  { id: 'settings',   label: 'Pengaturan', Icon: Settings },
]

export default function App() {
  const [page, setPage] = useState(() => {
    if (window.location.pathname === '/landing-page') return 'landing'
    return 'pos'
  })
  const [shopName, setShopName] = useState('Naqano Coffee')
  const [shopLogo, setShopLogo] = useState('')
  const [now, setNow] = useState(new Date())
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)       // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop collapse

  useEffect(() => {
    if (page === 'landing') {
      window.history.pushState(null, '', '/landing-page')
    } else {
      window.history.pushState(null, '', '/')
    }
  }, [page])

  const { setTaxPercent, items, getTotal, autoOpenPayment } = useCartStore()
  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  const total = getTotal()

  useEffect(() => {
    if (autoOpenPayment && page === 'pos') setMobileCartOpen(true)
  }, [autoOpenPayment, page])

  useEffect(() => {
    getAllSettings().then(s => {
      if (s.shopName) setShopName(s.shopName)
      if (s.shopLogo) setShopLogo(s.shopLogo)
      if (s.taxPercent) setTaxPercent(Number.parseFloat(s.taxPercent))

      // Auto-backup harian: jalankan sekali saat pertama buka di hari baru, JIKA diaktifkan
      if (s.autoBackup === 'true') {
        runDailyAutoBackup()
          .then(({ skipped, filename }) => {
            if (!skipped) {
              toast.success(`💾 Backup otomatis tersimpan: ${filename}`)
            }
          })
          .catch(() => {
            // Backup gagal — jangan crash app, cukup log di console
          })
      }
    })

    // Seed addons if empty (for users upgrading from v5 to v6)
    db.addons.count().then(count => {
      if (count === 0) {
        db.addons.bulkAdd([
          { name: 'Extra Espresso', price: 5000, isActive: 1 },
          { name: 'Extra Susu', price: 3000, isActive: 1 },
          { name: 'Vanilla Syrup', price: 4000, isActive: 1 },
          { name: 'Caramel Syrup', price: 4000, isActive: 1 },
        ])
      }
    })

    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

  function navigate(id) {
    setPage(id)
    setSidebarOpen(false) // tutup drawer di mobile setelah pilih menu
    if (id !== 'pos') setMobileCartOpen(false)
  }

  if (page === 'landing') {
    return <LandingPage onLogin={() => setPage('pos')} />
  }

  return (
    <div className="app">
      <Toast />

      {/* ===================== SIDEBAR ===================== */}
      {/* Overlay backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          {shopLogo ? (
            <img src={shopLogo} alt="Logo" className="brand-logo" />
          ) : (
            <Coffee size={26} color="#fff" strokeWidth={2} className="brand-icon" />
          )}
          <span className="brand-name">{shopName}</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-btn ${page === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
              title={label}
            >
              <span className="nav-icon">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer — jam & tombol collapse */}
        <div className="sidebar-footer">
          <div className="sidebar-time">
            <span className="time-clock">{timeStr}</span>
            <span className="time-date">{dateStr}</span>
          </div>
          {/* Collapse toggle hanya desktop */}
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {sidebarCollapsed
              ? <ChevronsRight size={16} strokeWidth={2.5} />
              : <ChevronsLeft size={16} strokeWidth={2.5} />
            }
          </button>
        </div>
      </aside>

      {/* ===================== MAIN BODY ===================== */}
      <div className="app-body">
        {/* Mobile Topbar (hanya tampil di ≤768px) */}
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>
          <div className="topbar-brand">
            {shopLogo
              ? <img src={shopLogo} alt="Logo" className="brand-logo" />
              : <Coffee size={22} color="#fff" strokeWidth={2} />
            }
            <span className="brand-name">{shopName}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-time">
              <div className="time-clock-row">
                <Clock size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <span className="time-clock" style={{ fontSize:14 }}>{timeStr}</span>
              </div>
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
            if (page === 'products')   return <Products />
            if (page === 'categories') return <Categories />
            if (page === 'addons')     return <AddOns />
            if (page === 'queue')      return <QueuePage onNavigate={setPage} />
            if (page === 'inventory')  return <Inventory />
            if (page === 'reports')    return <Reports />
            return <SettingsPage onLogoChange={setShopLogo} />
          })()}
        </main>
      </div>
    </div>
  )
}
