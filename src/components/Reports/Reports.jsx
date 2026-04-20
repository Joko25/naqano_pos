import { useState, useEffect } from 'react'
import { db } from '../../db'
import { formatRp, PLATFORM_LABELS, PAYMENT_LABELS, ORDER_TYPE_LABELS, ORDER_STATUS_LABELS } from '../../utils/format'
import {
  BarChart2, Download, Trophy, CreditCard, Bike,
  User, FileText, Loader2, PieChart, Clock, List, TrendingUp,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import './Reports.css'

const toDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Reports() {
  const [period, setPeriod] = useState('today')
  const [activeTab, setActiveTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [startDate, setStartDate] = useState(toDateStr(new Date()))
  const [endDate, setEndDate] = useState(toDateStr(new Date()))
  const [txs, setTxs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [prevTxs, setPrevTxs] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    loadData()
    setCurrentPage(1)
  }, [period, startDate, endDate, activeTab])

  async function loadData() {
    setLoading(true)
    const now = new Date()
    let from, to
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else {
      const [sy, sm, sd] = startDate.split('-').map(Number)
      from = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
      const [ey, em, ed] = endDate.split('-').map(Number)
      to = new Date(ey, em - 1, ed, 23, 59, 59, 999)
    }
    const filtered = await db.transactions
      .where('createdAt')
      .between(from.toISOString(), to.toISOString(), true, true)
      .toArray()

    const filteredEx = await db.expenses
      .where('date')
      .between(toDateStr(from), toDateStr(to), true, true)
      .toArray()
    setExpenses(filteredEx)

    const cats = await db.categories.toArray()
    setCategories(cats)

    const prods = await db.products.toArray()
    const productMap = {}
    prods.forEach(p => { productMap[p.id] = p })

    // Load items for each transaction
    const ids = filtered.map(t => t.id)
    const items = await db.transactionItems.where('transactionId').anyOf(ids).toArray()
    
    const txWithItems = filtered.map(t => ({ 
      ...t, 
      items: items.filter(i => i.transactionId === t.id).map(i => ({
        ...i,
        category: productMap[i.productId]?.category || 'Lainnya'
      }))
    }))
    // Calculate Previous Period for Growth
    let prevFrom, prevTo
    const diff = to.getTime() - from.getTime()
    prevFrom = new Date(from.getTime() - diff - 1)
    prevTo = new Date(from.getTime() - 1)

    const prevFiltered = await db.transactions
      .where('createdAt')
      .between(prevFrom.toISOString(), prevTo.toISOString(), true, true)
      .toArray()
    setPrevTxs(prevFiltered)

    setTxs(txWithItems)
    setAllProducts(prods)
    setLoading(false)
  }

  async function exportCSV() {
    const rows = [['No Struk', 'Tanggal', 'Pelanggan', 'Tipe', 'Platform', 'Bayar', 'Subtotal', 'Diskon', 'Pajak', 'Total']]
    txs.forEach(t => {
      rows.push([
        t.receiptNo, t.createdAt, t.customerName || '-',
        ORDER_TYPE_LABELS[t.orderType] || t.orderType,
        t.platform ? PLATFORM_LABELS[t.platform] : '-', PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod,
        t.subtotal, t.discount, t.tax, t.total
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `laporan-${period}-${Date.now()}.csv`; a.click()
  }

  const deliveredTxs = txs.filter(t => t.status === 'delivered')
  const unpaidTxs = txs.filter(t => t.status === 'waiting_payment' || t.status === 'on_process')
  
  const totalRevenue = deliveredTxs.reduce((s, t) => s + t.total, 0)
  const unpaidRevenue = unpaidTxs.reduce((s, t) => s + t.total, 0)
  const totalTx = deliveredTxs.length
  
  const directRevenue = deliveredTxs.filter(t => t.orderType === 'direct').reduce((s, t) => s + t.total, 0)
  const onlineRevenue = deliveredTxs.filter(t => t.orderType === 'online').reduce((s, t) => s + t.total, 0)

  // Top products (from finished orders only)
  const productMap = {}
  deliveredTxs.forEach(t => (t.items || []).forEach(i => {
    if (!productMap[i.name]) productMap[i.name] = { name: i.name, emoji: i.emoji, qty: 0, revenue: 0 }
    productMap[i.name].qty += i.qty
    productMap[i.name].revenue += i.price * i.qty
  }))
  const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

  // Payment breakdown
  const cashTx = deliveredTxs.filter(t => t.paymentMethod === 'cash')
  const transferTx = deliveredTxs.filter(t => t.paymentMethod === 'transfer')
  const qrisTx = deliveredTxs.filter(t => t.paymentMethod === 'qris')

  // Platform breakdown
  const gofoodRev = deliveredTxs.filter(t => t.platform === 'gofood').reduce((s, t) => s + t.total, 0)
  const grabfoodRev = deliveredTxs.filter(t => t.platform === 'grabfood').reduce((s, t) => s + t.total, 0)
  const shopeefoodRev = deliveredTxs.filter(t => t.platform === 'shopeefood').reduce((s, t) => s + t.total, 0)

  // Profit Loss Calc
  const totalHPP = deliveredTxs.reduce((s, t) => s + (t.items || []).reduce((is, item) => is + (item.costPrice || 0) * item.qty, 0), 0)
  const totalEx = expenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalRevenue - totalHPP
  const netProfit = grossProfit - totalEx

  // Advanced Analytics
  const productPerformance = {}
  const categoryPerformance = {}
  const hourMap = new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, revenue: 0 }))
  const dayMap = {}

  txs.forEach(t => {
    // Peak Hours
    const h = new Date(t.createdAt).getHours()
    hourMap[h].count++
    hourMap[h].revenue += t.total

    // Daily trends
    const day = toDateStr(new Date(t.createdAt))
    if (!dayMap[day]) dayMap[day] = { date: day, revenue: 0, count: 0 }
    dayMap[day].revenue += t.total
    dayMap[day].count++

    // Items
    (t.items || []).forEach(i => {
      // Product
      if (!productPerformance[i.productId]) {
        productPerformance[i.productId] = { name: i.name, emoji: i.emoji, qty: 0, revenue: 0, profit: 0 }
      }
      const p = productPerformance[i.productId]
      p.qty += i.qty
      p.revenue += i.price * i.qty
      p.profit += (i.price - (i.costPrice || 0)) * i.qty
      p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0

      // Category
      const cat = i.category || 'Lainnya'
      if (!categoryPerformance[cat]) categoryPerformance[cat] = { name: cat, revenue: 0, qty: 0 }
      categoryPerformance[cat].revenue += i.price * i.qty
      categoryPerformance[cat].qty += i.qty
    })
  })

  const topPerformance = Object.values(productPerformance).sort((a,b) => b.revenue - a.revenue)
  const catList = Object.values(categoryPerformance).sort((a,b) => b.revenue - a.revenue)
  const peakHours = [...hourMap].sort((a,b) => b.count - a.count).slice(0, 5)
  const dailyTrends = Object.values(dayMap).sort((a,b) => a.date.localeCompare(b.date))

  // Loyalty
  const customerMap = {}
  txs.forEach(t => {
    if (t.customerName) {
      if (!customerMap[t.customerName]) customerMap[t.customerName] = { name: t.customerName, count: 0, total: 0 }
      customerMap[t.customerName].count++
      customerMap[t.customerName].total += t.total
    }
  })
  const topCustomers = Object.values(customerMap).sort((a,b) => b.total - a.total).slice(0, 5)

  // Growth calc
  const prevRevenue = prevTxs.reduce((s,t) => s + t.total, 0)
  const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

  // Pagination for History
  const historyTxs = [...txs].reverse()
  const totalPages = Math.ceil(historyTxs.length / itemsPerPage)
  const paginatedTxs = historyTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="page-title">
          <BarChart2 size={20} strokeWidth={2} /> Laporan Penjualan
        </h2>
        <div className="reports-actions">
          <div className="period-tabs">
            {[['today', 'Hari Ini'], ['week', '7 Hari'], ['month', 'Bulan Ini'], ['custom', 'Kustom']].map(([v, l]) => (
              <button key={v} className={`filter-tab ${period === v ? 'active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="date-range-picker">
              <input 
                type="date" 
                className="date-input" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
              <span className="date-separator">s/d</span>
              <input 
                type="date" 
                className="date-input" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            <Download size={14} strokeWidth={2} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={28} strokeWidth={1.5} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Memuat data laporan...
        </div>
      ) : (
        <div className="reports-content">
          <div className="report-tabs-wrapper">
            <div className="tabs report-type-tabs">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                <BarChart2 size={14} /> Ringkasan
              </button>
              <button className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
                <PieChart size={14} /> Produk & Kategori
              </button>
              <button className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>
                <TrendingUp size={14} /> Analisis Harga
              </button>
              <button className={`tab-btn ${activeTab === 'time' ? 'active' : ''}`} onClick={() => setActiveTab('time')}>
                <Clock size={14} /> Jam & Tren
              </button>
              <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                <List size={14} /> Riwayat
              </button>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="reports-tab-content">
              <div className="reports-main-view">
                <div className="reports-main">
                  {/* Profit & Loss Card */}
                  <div className="report-card full-width pl-dashboard">
                    <div className="report-card-title">💵 Ringkasan Laba Rugi</div>
                    <div className="pl-grid">
                      <div className="pl-item">
                        <span className="pl-label">Total Omzet</span>
                        <div className="flex items-center gap-2">
                          <span className="pl-value text-tosca">{formatRp(totalRevenue)}</span>
                          {prevRevenue > 0 && (
                            <span className={`growth-badge ${revenueGrowth >= 0 ? 'up' : 'down'}`}>
                              {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="pl-item">
                        <span className="pl-label">Total HPP</span>
                        <span className="pl-value text-red">-{formatRp(totalHPP)}</span>
                      </div>
                      <div className="pl-item">
                        <span className="pl-label">Laba Kotor</span>
                        <span className="pl-value text-blue">{formatRp(grossProfit)}</span>
                      </div>
                      <div className="pl-item">
                        <span className="pl-label">Operational (Beban)</span>
                        <span className="pl-value text-amber">-{formatRp(totalEx)}</span>
                      </div>
                      <div className="pl-divider" />
                      <div className="pl-item pl-total">
                        <span className="pl-label">Laba Bersih</span>
                        <span className={`pl-value ${netProfit >= 0 ? 'text-green' : 'text-red'}`}>{formatRp(netProfit)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="report-card stat-card">
                      <div className="stat-label">Total Transaksi</div>
                      <div className="stat-value">{totalTx} <small>Pesanan</small></div>
                    </div>
                    <div className="report-card stat-card">
                      <div className="stat-label">Rata-rata / Tiket</div>
                      <div className="stat-value">{formatRp(totalTx > 0 ? totalRevenue / totalTx : 0)}</div>
                    </div>
                    <div className="report-card stat-card">
                      <div className="stat-label">Piutang (Belum Bayar)</div>
                      <div className="stat-value text-red">{formatRp(unpaidRevenue)}</div>
                    </div>
                  </div>

                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-label">🧍 Langsung</div>
                      <div className="kpi-value green">{formatRp(directRevenue)}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">🛵 Ojek Online</div>
                      <div className="kpi-value blue">{formatRp(onlineRevenue)}</div>
                    </div>
                  </div>

                  {/* Daily Sales Chart */}
                  {dailyTrends.length > 1 && (
                    <div className="report-card full-width chart-card">
                      <div className="report-card-title">
                        <TrendingUp size={15} strokeWidth={2} /> Grafik Penjualan Harian
                      </div>
                      <SalesBarChart data={dailyTrends} />
                    </div>
                  )}
                </div>

                <div className="reports-grid">
                  {/* Top Products Quick View */}
                  <div className="report-card">
                    <div className="report-card-title">
                      <Trophy size={15} strokeWidth={2} /> Produk Terlaris
                    </div>
                    {topProducts.length === 0 ? (
                      <div className="report-empty">Belum ada data</div>
                    ) : (
                      <div className="top-products">
                        {topProducts.map((p, i) => (
                          <div key={p.name} className="top-product-row">
                            <span className="rank">#{i + 1}</span>
                            <span className="tp-emoji">{p.emoji || '☕'}</span>
                            <span className="tp-name">{p.name}</span>
                            <span className="tp-qty">{p.qty}x</span>
                            <span className="tp-rev">{formatRp(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Breakdown */}
                  <div className="report-card">
                    <div className="report-card-title">
                      <CreditCard size={15} strokeWidth={2} /> Metode Pembayaran
                    </div>
                    <div className="breakdown-list">
                      <BreakdownRow label="💵 Tunai" count={cashTx.length} amount={cashTx.reduce((s,t)=>s+t.total,0)} color="green" />
                      <BreakdownRow label="🏦 Transfer" count={transferTx.length} amount={transferTx.reduce((s,t)=>s+t.total,0)} color="blue" />
                      <BreakdownRow label="📱 QRIS" count={qrisTx.length} amount={qrisTx.reduce((s,t)=>s+t.total,0)} color="amber" />
                    </div>
                  </div>

                  {/* Loyalty Card */}
                  <div className="report-card">
                    <div className="report-card-title">
                      <User size={15} strokeWidth={2} /> Pelanggan Loyal
                    </div>
                    {topCustomers.length === 0 ? (
                      <div className="report-empty">Belum ada data pelanggan</div>
                    ) : (
                      <div className="breakdown-list">
                        {topCustomers.map(c => (
                          <div key={c.name} className="breakdown-row">
                            <span className="bd-label">{c.name}</span>
                            <span className="bd-count">{c.count}x jajan</span>
                            <span className="bd-amount text-tosca">{formatRp(c.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="reports-tab-content">
              <div className="reports-grid">
                <div className="report-card">
                  <div className="report-card-title"><PieChart size={16} /> Performa Kategori</div>
                  <div className="breakdown-list">
                    {catList.map(c => (
                      <div key={c.name} className="breakdown-row">
                        <span className="bd-label text-semibold">{c.name}</span>
                        <span className="bd-count">{c.qty} item</span>
                        <span className="bd-amount text-tosca">{formatRp(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="report-card">
                  <div className="report-card-title"><TrendingUp size={16} /> Insight Margin</div>
                  <div className="report-info-box">
                    Menampilkan produk dengan profit margin tertinggi.
                  </div>
                  <div className="top-products">
                    {topPerformance.slice(0, 5).map(p => (
                      <div key={p.name} className="top-product-row">
                        <span className="tp-emoji">{p.emoji}</span>
                        <span className="tp-name">{p.name}</span>
                        <span className="tp-rev text-green" style={{ minWidth: 60 }}>{p.margin.toFixed(1)}%</span>
                        <span className="tp-rev">{formatRp(p.profit)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="report-card full-width">
                <div className="report-card-title"><Trophy size={16} /> Detail Profitabilitas Produk</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Terjual</th>
                        <th>Omzet</th>
                        <th>Profit</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformance.map(p => (
                        <tr key={p.name}>
                          <td className="text-semibold">{p.emoji} {p.name}</td>
                          <td>{p.qty}x</td>
                          <td>{formatRp(p.revenue)}</td>
                          <td className="text-green">{formatRp(p.profit)}</td>
                          <td>
                            <div className="margin-bar-wrap">
                              <div className="margin-bar" style={{ width: `${p.margin}%` }}></div>
                              <span>{p.margin.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="reports-tab-content">
              <div className="report-card full-width">
                <div className="report-card-title">💡 Rekomendasi & Analisis Harga Jual</div>
                <div className="report-info-box">
                  Rekomendasi dihitung untuk mencapai <strong>target margin 65%</strong> (Food Cost ~35%). 
                  Gunakan data ini untuk mengevaluasi menu yang kurang menguntungkan.
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>HPP (Modal)</th>
                        <th>Harga Jual (Direct)</th>
                        <th>Margin Saat Ini</th>
                        <th>Status</th>
                        <th className="text-amber">Rekomendasi Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProducts.map(p => {
                        const hpp = p.costPrice || 0
                        const price = p.priceDirect || 0
                        const profit = price - hpp
                        const margin = price > 0 ? (profit / price) * 100 : 0
                        
                        // Target 65% margin -> HPP / 0.35
                        const recommended = Math.ceil((hpp / 0.35) / 500) * 500
                        
                        let statusLine = { label: 'Ideal', class: 'badge-green' }
                        if (margin < 40) statusLine = { label: 'Rugi/Tipis', class: 'badge-red' }
                        else if (margin < 60) statusLine = { label: 'Dibawah Target', class: 'badge-amber' }
                        else if (margin > 75) statusLine = { label: 'Profit Tinggi', class: 'badge-blue' }

                        return (
                          <tr key={p.id}>
                            <td className="text-semibold">{p.emoji} {p.name}</td>
                            <td>{formatRp(hpp)}</td>
                            <td>{formatRp(price)}</td>
                            <td>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                 <div className="margin-bar-wrap" style={{ flex: 1, minWidth: 60 }}>
                                    <div className={`margin-bar ${margin < 50 ? 'bg-red' : ''}`} style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}></div>
                                 </div>
                                 <span style={{ fontSize: 12, fontWeight: 600 }}>{margin.toFixed(0)}%</span>
                               </div>
                            </td>
                            <td><span className={`badge ${statusLine.class}`}>{statusLine.label}</span></td>
                            <td className="text-bold text-amber">
                              {hpp > 0 ? formatRp(recommended) : 'Atur Resep Dulu'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'time' && (
            <div className="reports-tab-content">
              <div className="reports-grid">
                <div className="report-card">
                  <div className="report-card-title"><Clock size={16} /> Jam Sibuk (Peak Hours)</div>
                  <div className="peak-hours-list">
                    {peakHours.map((h, i) => (
                      <div key={h.hour} className="peak-hour-row">
                        <span className="rank">#{i+1}</span>
                        <span className="ph-time">{String(h.hour).padStart(2, '0')}:00</span>
                        <div className="ph-bar-wrap">
                          <div className="ph-bar" style={{ width: `${(h.count / peakHours[0].count) * 100}%` }}></div>
                        </div>
                        <span className="ph-count">{h.count} Trx</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-card">
                  <div className="report-card-title"><TrendingUp size={16} /> Tren Penjualan Harian</div>
                  <div className="peak-hours-list">
                    {dailyTrends.reverse().slice(0, 7).map(d => (
                      <div key={d.date} className="peak-hour-row">
                        <span className="ph-time" style={{ width: 80 }}>{new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}</span>
                        <div className="ph-bar-wrap">
                          <div className="ph-bar trend" style={{ width: `${(d.revenue / Math.max(...dailyTrends.map(x=>x.revenue))) * 100}%` }}></div>
                        </div>
                        <span className="ph-count" style={{ minWidth: 80 }}>{formatRp(d.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="reports-tab-content">
              <div className="report-card full-width">
                <div className="report-card-title">
                  <FileText size={15} strokeWidth={2} /> Riwayat Transaksi Lengkap
                </div>
                {txs.length === 0 ? (
                  <div className="report-empty">Belum ada transaksi di periode ini</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>No Struk</th>
                          <th>Waktu</th>
                          <th>Pelanggan</th>
                          <th>Status</th>
                          <th>Bayar</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(window.innerWidth > 768 ? paginatedTxs : historyTxs).map(t => (
                          <tr key={t.id}>
                            <td><code style={{ fontSize: 11 }}>{t.receiptNo}</code></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleString('id-ID')}</td>
                            <td>
                              {t.customerName ? (
                                <span className="customer-chip">
                                  <User size={11} strokeWidth={2} /> {t.customerName}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td>
                              <span className={`status-badge st-${t.status || 'on_process'}`}>
                                {ORDER_STATUS_LABELS[t.status || 'on_process']}
                              </span>
                            </td>
                            <td><span className="badge badge-green">{PAYMENT_LABELS[t.paymentMethod]}</span></td>
                            <td className="text-semibold text-amber">{formatRp(t.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {totalPages > 1 && (
                      <div className="pagination desktop-only-pagination">
                        <button 
                          className="pagination-btn" 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="pagination-info">
                          Halaman {currentPage} dari {totalPages}
                        </span>
                        <button 
                          className="pagination-btn" 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BreakdownRow({ label, count, amount, color }) {
  return (
    <div className="breakdown-row">
      <span className="bd-label">{label}</span>
      <span className="bd-count">{count}x</span>
      <span className={`bd-amount text-${color}`}>{formatRp(amount)}</span>
    </div>
  )
}


function SalesBarChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) return null

  const chartData = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)
  const n = chartData.length

  const W = 800, H = 220
  const PAD = { top: 24, right: 16, bottom: 40, left: 52 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const pts = chartData.map((d, i) => ({
    x: PAD.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
    y: PAD.top + plotH - (d.revenue / maxRevenue) * plotH,
    ...d,
  }))

  const linePoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPoints = [
    `${pts[0].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)}`,
    ...pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[n - 1].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)}`,
  ].join(' ')

  const todayStr = new Date().toISOString().slice(0, 10)
  const fmtDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const fmtShort = (val) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`
    if (val >= 1_000) return `${Math.round(val / 1_000)}rb`
    return String(val)
  }
  const labelStep = n <= 14 ? 1 : Math.ceil(n / 10)

  return (
    <div className="sales-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0d9488" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map(pct => {
          const y = PAD.top + plotH - (pct / 100) * plotH
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#c7e8e4" strokeWidth={pct === 0 ? 1.5 : 1} strokeDasharray={pct === 0 ? 'none' : '5 4'} />
              <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#7fa8a4">
                {pct === 0 ? '0' : fmtShort((maxRevenue * pct) / 100)}
              </text>
            </g>
          )
        })}

        <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#c7e8e4" strokeWidth="1.5" />
        <polygon points={areaPoints} fill="url(#lineAreaGrad)" />
        <polyline points={linePoints} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => {
          const isToday   = p.date === todayStr
          const isHovered = hoveredIdx === i
          const showLabel = i % labelStep === 0 || isToday || i === n - 1
          const r         = isHovered || isToday ? 6 : 4
          const tipW      = 110
          const tipX      = Math.min(Math.max(p.x - tipW / 2, PAD.left), W - PAD.right - tipW)

          return (
            <g key={p.date}>
              {showLabel && (
                <text x={p.x} y={PAD.top + plotH + 16} textAnchor="middle"
                  fontSize={isToday ? '11' : '9'} fontWeight={isToday ? '800' : '600'}
                  fill={isToday ? '#0d9488' : '#7fa8a4'}>
                  {fmtDate(p.date).split(' ')[0]}
                </text>
              )}
              <circle cx={p.x} cy={p.y} r={r}
                fill={isToday ? '#0f766e' : '#0d9488'} stroke="#fff" strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onTouchStart={(e) => { e.preventDefault(); setHoveredIdx(isHovered ? null : i) }}
              />
              {isHovered && (
                <g>
                  <rect x={tipX + 2} y={p.y - 68} width={tipW} height={60} rx="9" fill="rgba(0,0,0,0.1)" />
                  <rect x={tipX} y={p.y - 70} width={tipW} height={60} rx="9" fill="#0f766e" />
                  <polygon points={`${p.x - 6},${p.y - 12} ${p.x + 6},${p.y - 12} ${p.x},${p.y - 5}`} fill="#0f766e" />
                  <text x={tipX + tipW / 2} y={p.y - 54} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.75)" fontWeight="600">{fmtDate(p.date)}</text>
                  <text x={tipX + tipW / 2} y={p.y - 37} textAnchor="middle" fontSize="14" fill="#fff" fontWeight="800">{formatRp(p.revenue)}</text>
                  <text x={tipX + tipW / 2} y={p.y - 20} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.65)">{p.count} transaksi</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      <div className="chart-legend">
        <svg width="24" height="12" style={{ flexShrink: 0 }}>
          <line x1="0" y1="6" x2="24" y2="6" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="6" r="3.5" fill="#0d9488" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <span>Omzet harian ({chartData.length} hari)</span>
        <span className="chart-legend-max">Maks: {formatRp(maxRevenue)}</span>
      </div>
    </div>
  )
}
