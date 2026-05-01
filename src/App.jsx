import { useState, useEffect } from 'react'
import { 
  Coffee, BarChart2, Settings, ShoppingBag, 
  Menu, X, Clock, Package, Tag,
  ChevronsLeft, ChevronsRight, PlusCircle, Lock,
  ArrowRight, ChevronLeft, ShoppingCart
} from 'lucide-react'
import POSView from './components/POS/POSView'
import Cart from './components/Cart/Cart'
import Products from './components/Products/Products'
import Categories from './components/Categories/Categories'
import AuthPage from './components/Auth/AuthPage'
import PinLogin from './components/Auth/PinLogin'
import OwnerSetup from './components/Auth/OwnerSetup'
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
  const [page, setPage] = useState('pos')
  const [shopName, setShopName] = useState('Bestari POS')
  const [shopLogo, setShopLogo] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('bestari_license'))
  const [now, setNow] = useState(new Date())
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const [isReady, setIsReady] = useState(false)
  const [needsOwnerSetup, setNeedsOwnerSetup] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const { items, getTotal } = useCartStore()
  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  const total = getTotal()

  useEffect(() => {
    if (!isAuthenticated) return
    getAllSettings().then(s => {
      if (s.shopName) setShopName(s.shopName)
      if (s.shopLogo) setShopLogo(s.shopLogo)
      if (!s.ownerPin) {
        setNeedsOwnerSetup(true)
      }
      setIsReady(true)
    })

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
  }, [isAuthenticated])

  if (!isAuthenticated) return <AuthPage onLoginSuccess={() => setIsAuthenticated(true)} />
  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>
  if (needsOwnerSetup) return <OwnerSetup onComplete={() => setNeedsOwnerSetup(false)} />
  if (!currentUser) return <PinLogin onLogin={(user) => setCurrentUser(user)} />

  const handleNavigate = (id) => {
    if (currentUser.role === 'CASHIER' && (id === 'settings' || id === 'reports' || id === 'inventory')) {
      alert('Akses Ditolak. Menu ini hanya untuk Owner.')
      return
    }
    setPage(id)
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }

  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app">
      <Toast />
      {sidebarOpen && <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          {shopLogo ? (
            <img src={shopLogo} alt="Logo" className="brand-logo" />
          ) : (
            <Coffee size={26} color="#fff" strokeWidth={2} className="brand-icon" />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="brand-name" style={{ fontSize: 16 }}>{shopName}</span>
            <span style={{ fontSize: 11, color: 'var(--tosca)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{width: 6, height: 6, borderRadius: 3, background: 'var(--tosca)'}} />
              {currentUser?.name || 'Kasir'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isRestricted = currentUser?.role === 'CASHIER' && (id === 'settings' || id === 'reports' || id === 'inventory')
            if (isRestricted) return null
            return (
              <button
                key={id}
                className={`nav-btn ${page === id ? 'active' : ''}`}
                onClick={() => handleNavigate(id)}
                title={label}
              >
                <span className="nav-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="nav-label">{label}</span>
              </button>
            )
          })}
        </nav>

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
          {/* Logout/Lock button */}
          <button
            className="sidebar-logout-btn"
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', 
              border: 'none', cursor: 'pointer', background: 'var(--bg-card)', 
              marginTop: '4px' 
            }}
            onClick={() => {
              if (confirm('Kunci layar dan keluar dari sesi ini?')) {
                setCurrentUser(null)
              }
            }}
            title="Kunci Layar"
          >
            <Lock size={16} strokeWidth={2.5} color="var(--red)" />
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
            if (page === 'products')   return <Products role={currentUser?.role} />
            if (page === 'categories') return <Categories role={currentUser?.role} />
            if (page === 'addons')     return <AddOns role={currentUser?.role} />
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
