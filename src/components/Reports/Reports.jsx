import { useState, useEffect } from 'react'
import { db } from '../../db'
import { formatRp, PLATFORM_LABELS, PAYMENT_LABELS, ORDER_TYPE_LABELS } from '../../utils/format'
import {
  BarChart2, Download, Trophy, CreditCard, Bike,
  User, FileText, Loader2
} from 'lucide-react'
import './Reports.css'

export default function Reports() {
  const [period, setPeriod] = useState('today')
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    const now = new Date()
    let from
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    const all = await db.transactions.toArray()
    const filtered = all.filter(t => new Date(t.createdAt) >= from)

    // Load items for each transaction
    const ids = filtered.map(t => t.id)
    const items = await db.transactionItems.where('transactionId').anyOf(ids).toArray()
    const txWithItems = filtered.map(t => ({ ...t, items: items.filter(i => i.transactionId === t.id) }))
    setTxs(txWithItems)
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

  const totalRevenue = txs.reduce((s, t) => s + t.total, 0)
  const totalTx = txs.length
  const directRevenue = txs.filter(t => t.orderType === 'direct').reduce((s, t) => s + t.total, 0)
  const onlineRevenue = txs.filter(t => t.orderType === 'online').reduce((s, t) => s + t.total, 0)

  // Top products
  const productMap = {}
  txs.forEach(t => (t.items || []).forEach(i => {
    if (!productMap[i.name]) productMap[i.name] = { name: i.name, emoji: i.emoji, qty: 0, revenue: 0 }
    productMap[i.name].qty += i.qty
    productMap[i.name].revenue += i.price * i.qty
  }))
  const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

  // Payment breakdown
  const cashTx = txs.filter(t => t.paymentMethod === 'cash')
  const transferTx = txs.filter(t => t.paymentMethod === 'transfer')
  const qrisTx = txs.filter(t => t.paymentMethod === 'qris')

  // Platform breakdown
  const gofoodRev = txs.filter(t => t.platform === 'gofood').reduce((s, t) => s + t.total, 0)
  const grabfoodRev = txs.filter(t => t.platform === 'grabfood').reduce((s, t) => s + t.total, 0)
  const shopeefoodRev = txs.filter(t => t.platform === 'shopeefood').reduce((s, t) => s + t.total, 0)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="page-title">
          <BarChart2 size={20} strokeWidth={2} /> Laporan Penjualan
        </h2>
        <div className="reports-actions">
          <div className="period-tabs">
            {[['today', 'Hari Ini'], ['week', '7 Hari'], ['month', 'Bulan Ini']].map(([v, l]) => (
              <button key={v} className={`filter-tab ${period === v ? 'active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            <Download size={14} strokeWidth={2} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={28} strokeWidth={1.5} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div>Memuat data...</div>
        </div>
      ) : (
        <div className="reports-content">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total Pendapatan</div>
              <div className="kpi-value amber">{formatRp(totalRevenue)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Transaksi</div>
              <div className="kpi-value">{totalTx}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">🧍 Langsung</div>
              <div className="kpi-value green">{formatRp(directRevenue)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">🛵 Ojek Online</div>
              <div className="kpi-value blue">{formatRp(onlineRevenue)}</div>
            </div>
          </div>

          <div className="reports-grid">
            {/* Top Products */}
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

            {/* Platform Breakdown */}
            {onlineRevenue > 0 && (
              <div className="report-card">
                <div className="report-card-title">
                  <Bike size={15} strokeWidth={2} /> Platform Online
                </div>
                <div className="breakdown-list">
                  <BreakdownRow label="🟥 GoFood" count={txs.filter(t=>t.platform==='gofood').length} amount={gofoodRev} color="red" />
                  <BreakdownRow label="🟩 GrabFood" count={txs.filter(t=>t.platform==='grabfood').length} amount={grabfoodRev} color="green" />
                  <BreakdownRow label="🟧 ShopeeFood" count={txs.filter(t=>t.platform==='shopeefood').length} amount={shopeefoodRev} color="amber" />
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="report-card full-width">
              <div className="report-card-title">
                <FileText size={15} strokeWidth={2} /> Riwayat Transaksi
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
                        <th>Tipe</th>
                        <th>Bayar</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...txs].reverse().slice(0, 20).map(t => (
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
                            <span className={`badge ${t.orderType === 'online' ? 'badge-blue' : 'badge-amber'}`}>
                              {t.orderType === 'online' ? '🛵' : '🧍'} {t.platform ? PLATFORM_LABELS[t.platform] : ORDER_TYPE_LABELS[t.orderType]}
                            </span>
                          </td>
                          <td><span className="badge badge-green">{PAYMENT_LABELS[t.paymentMethod]}</span></td>
                          <td style={{ fontWeight: 700, color: 'var(--amber)' }}>{formatRp(t.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
