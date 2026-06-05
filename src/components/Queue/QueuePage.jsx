import { useState, useEffect } from 'react'
import { db, getAllSettings } from '../../db'
import { formatRp, formatDateTime, ORDER_STATUS_LABELS, PAYMENT_LABELS, ORDER_TYPE_LABELS, PLATFORM_LABELS } from '../../utils/format'
import { Clock, CheckCircle2, Loader2, Coffee, CreditCard, User, Edit2, Printer, Banknote, XCircle } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { toast } from '../ui'
import PaymentModal from '../Payment/PaymentModal'
import './Queue.css'

export default function QueuePage({ onNavigate }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({})
  const [showPayment, setShowPayment] = useState(false)
  const { loadTransaction, clearCart, getTotal, customerName } = useCartStore()

  useEffect(() => {
    loadOrders()
    getAllSettings().then(setSettings)
    const timer = setInterval(loadOrders, 10000)
    return () => clearInterval(timer)
  }, [])

  async function loadOrders() {
    try {
      const all = await db.transactions
        .where('status')
        .anyOf(['waiting_payment', 'on_process'])
        .toArray()

      const ids = all.map(o => o.id)
      const items = await db.transactionItems.where('transactionId').anyOf(ids).toArray()

      const enriched = all.map(o => ({
        ...o,
        items: items.filter(i => i.transactionId === o.id)
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setOrders(enriched)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, newStatus) {
    if (newStatus === 'canceled' && !window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return
    await db.transactions.update(id, { status: newStatus })
    toast.success(newStatus === 'canceled' ? 'Pesanan telah dibatalkan' : `Pesanan diperbarui ke: ${ORDER_STATUS_LABELS[newStatus]}`)
    loadOrders()
  }

  async function editOrder(order, autoPay = false) {
    const cartItems = order.items.map(item => ({
      id: item.productId,
      productId: item.productId,
      name: item.name,
      emoji: item.emoji,
      temp: item.temp,
      qty: item.qty,
      priceDirect: item.price,
      priceOnline: item.price,
      costPrice: item.costPrice,
      variants: item.variants || [],
      selectedAddons: item.selectedAddons || []
    }))

    loadTransaction(order, cartItems, false)
    
    if (autoPay) {
      setShowPayment('select')
    } else {
      onNavigate('pos')
      toast.info('Mengedit pesanan #' + order.receiptNo.split('-')[1])
    }
  }

  function printReceipt(order) {
    const receiptData = {
      ...order,
      shopName: settings.shopName || 'Naqano Coffee',
      shopAddress: settings.shopAddress || '',
      shopPhone: settings.shopPhone || '',
      shopLogo: settings.shopLogo || '/logo.png',
      receiptFooter: settings.receiptFooter || 'Terima kasih!',
    }

    // Clean up previous elements if they exist
    const existingContainer = document.getElementById('print-receipt-container')
    if (existingContainer) existingContainer.remove()
    const existingStyle = document.getElementById('print-receipt-style')
    if (existingStyle) existingStyle.remove()

    // Create print container
    const printContainer = document.createElement('div')
    printContainer.id = 'print-receipt-container'
    printContainer.innerHTML = receiptHTML(receiptData)
    document.body.appendChild(printContainer)

    // Create print style to hide other elements
    const style = document.createElement('style')
    style.id = 'print-receipt-style'
    style.innerHTML = `
      #print-receipt-container {
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 280px;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #fff !important;
        }
        #root {
          display: none !important;
        }
        #print-receipt-container {
          display: block !important;
          position: static !important;
          left: auto !important;
          top: auto !important;
          width: 100% !important;
          max-width: 280px !important;
        }
      }
    `
    document.head.appendChild(style)

    const originalTitle = document.title
    document.title = `Struk #${receiptData.receiptNo}`

    // Delay a bit to ensure styles are applied
    setTimeout(() => {
      window.print()
    }, 300)

    // Cleanup function
    const cleanup = () => {
      if (printContainer.parentNode) printContainer.remove()
      if (style.parentNode) style.remove()
      document.title = originalTitle
    }

    // Clean up when window gets focus back (user returns from print dialog)
    window.addEventListener('focus', cleanup, { once: true })
    
    // Safety fallback: clean up after 1 minute if focus event didn't fire
    setTimeout(cleanup, 60000)
  }

  if (loading) return <div className="queue-loading"><Loader2 className="animate-spin" /> Memuat Antrean...</div>

  const waiting = orders.filter(o => o.status === 'waiting_payment')
  const processing = orders.filter(o => o.status === 'on_process')

  return (
    <div className="queue-page">
      <div className="queue-header">
        <h2 className="page-title"><Clock size={24} className="text-tosca" /> Antrean Pesanan</h2>
        <div className="queue-stats">
          <div className="stat-badge amber cursor-pointer" onClick={() => document.getElementById('section-cashier')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <CreditCard size={14} />
            <span>{waiting.length} Menunggu Bayar</span>
          </div>
          <div className="stat-badge tosca cursor-pointer" onClick={() => document.getElementById('section-barista')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <Coffee size={14} />
            <span>{processing.length} Sedang Proses</span>
          </div>
        </div>
      </div>

      <div className="queue-grid">
        <div className="queue-section" id="section-barista">
          <h3 className="section-title"><Coffee size={18} /> Sedang Dibuat (Barista)</h3>
          <div className="order-list">
            {processing.length === 0 ? (
              <div className="empty-state">Tidak ada pesanan yang diproses</div>
            ) : (
              processing.map(order => (
                <OrderCard key={order.id} order={order} onUpdate={updateStatus} onEdit={editOrder} onPrint={printReceipt} />
              ))
            )}
          </div>
        </div>

        <div className="queue-section" id="section-cashier">
          <h3 className="section-title"><CreditCard size={18} /> Menunggu Pembayaran (Kasir)</h3>
          <div className="order-list">
            {waiting.length === 0 ? (
              <div className="empty-state">Tidak ada pesanan menunggu bayar</div>
            ) : (
              waiting.map(order => (
                <OrderCard key={order.id} order={order} onUpdate={updateStatus} onEdit={editOrder} onPrint={printReceipt} />
              ))
            )}
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          method={showPayment}
          total={getTotal()}
          customerName={customerName}
          onClose={() => {
            setShowPayment(false)
            loadOrders() // Refresh queue after payment
          }}
        />
      )}
    </div>
  )
}

function OrderCard({ order, onUpdate, onEdit, onPrint }) {
  const isWaiting = order.status === 'waiting_payment'

  return (
    <div className={`order-card ${isWaiting ? 'waiting' : 'processing'}`}>
      <div className="order-card-header">
        <div className="order-receipt-no">#{order.receiptNo.split('-')[1]}</div>
        <div className="order-time">{formatDateTime(order.createdAt).split(' ')[3]}</div>
      </div>

      <div className="order-customer">
        <div className="flex items-center gap-2">
          <User size={13} strokeWidth={2.5} />
          <strong>{order.customerName || 'Tamu'}</strong>
        </div>
        <span className="payment-tag">{PAYMENT_LABELS[order.paymentMethod]}</span>
      </div>

      <div className="order-items">
        {order.items.map((item, i) => (
          <div key={i} className="order-item-container" style={{ marginBottom: '8px' }}>
            <div className="order-item-row">
              <span className="item-qty">{item.qty}x</span>
              <span className="item-name">{item.name} {item.temp !== 'None' ? `(${item.temp})` : ''}</span>
            </div>
            {item.variants && item.variants.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '24px', marginTop: '2px' }}>
                {item.variants.join(', ')}
              </div>
            )}
            {item.selectedAddons && item.selectedAddons.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--amber)', marginLeft: '24px', marginTop: '2px' }}>
                {item.selectedAddons.map(a => `+${a.qty} ${a.name}`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="order-footer">
        <div className="flex gap-2">
          <button className="btn-icon-sq" onClick={() => onEdit(order)} title="Edit Pesanan">
            <Edit2 size={13} />
          </button>
          <button className="btn-icon-sq" onClick={() => onPrint(order)} title="Print Struk">
            <Printer size={13} />
          </button>
          <button className="btn-icon-sq danger" onClick={() => onUpdate(order.id, 'canceled')} title="Batalkan Pesanan">
            <XCircle size={13} />
          </button>
        </div>
        <div className="order-actions">
          {isWaiting ? (
            <div className="flex gap-2">
              <button className="btn btn-green btn-sm" onClick={() => onEdit(order, true)}>
                <Banknote size={14} /> Payment
              </button>
              {/* <button className="btn btn-green btn-sm" onClick={() => onUpdate(order.id, 'delivered')}>
                <CheckCircle2 size={14} /> Selesai
              </button> */}
            </div>
          ) : (
            <button className="btn btn-blue btn-sm" onClick={() => onUpdate(order.id, 'waiting_payment')}>
              <CheckCircle2 size={14} /> Selesai Dibuat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function receiptHTML(receipt) {
  const items = receipt.items.map(i => {
    let variantsHtml = ''
    if (i.variants && i.variants.length > 0) {
      variantsHtml += `<div style="font-size: 10px; color: #555; margin-left: 14px;">${i.variants.join(', ')}</div>`
    }
    if (i.selectedAddons && i.selectedAddons.length > 0) {
      variantsHtml += `<div style="font-size: 10px; color: #555; margin-left: 14px;">${i.selectedAddons.map(a => `+${a.qty} ${a.name}`).join(', ')}</div>`
    }
    const itemAddonsPrice = i.selectedAddons?.reduce((s, a) => s + (a.price * a.qty), 0) || 0
    const itemTotal = (i.price + itemAddonsPrice) * i.qty

    return `<div>
      <div class="ri"><span>${i.qty}x ${i.name} ${i.temp && i.temp !== 'None' ? `(${i.temp})` : ''}</span><span>${formatRp(itemTotal)}</span></div>
      ${variantsHtml}
    </div>`
  }).join('')

  return `<style>
    @media print {
      * { box-sizing: border-box; margin: 0; padding: 0; }
      #print-receipt-container {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: #000;
        background: #fff;
        padding: 8px;
        width: 280px;
        margin: 0 auto;
      }
      .sh { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px; }
      .sa { text-align: center; font-size: 11px; margin-bottom: 8px; color: #444; }
      .div { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
      .ri { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; }
      .total-row { font-weight: bold; font-size: 13px; margin-top: 4px; }
      .footer { text-align: center; font-size: 11px; margin-top: 10px; color: #555; }
      @page { margin: 0; size: 58mm auto; }
    }
  </style>
  <div class="sh">${receipt.shopName}</div>
  <div class="sa">${receipt.shopAddress}</div>
  <div class="div"></div>
  <div class="row"><span>No: ${receipt.receiptNo}</span></div>
  <div class="row"><span>Tgl: ${formatDateTime(receipt.createdAt)}</span></div>
  ${receipt.customerName ? `<div class="row"><span>Nama: ${receipt.customerName}</span></div>` : ''}
  <div class="row"><span>Tipe: ${ORDER_TYPE_LABELS[receipt.orderType]}${receipt.platform ? ` (${PLATFORM_LABELS[receipt.platform]})` : ''}</span></div>
  <div class="row"><span>Bayar: ${PAYMENT_LABELS[receipt.paymentMethod]}</span></div>
  <div class="div"></div>
  ${items}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${formatRp(receipt.subtotal)}</span></div>
  ${receipt.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${formatRp(receipt.discount)}</span></div>` : ''}
  ${receipt.tax > 0 ? `<div class="row"><span>Pajak</span><span>${formatRp(receipt.tax)}</span></div>` : ''}
  <div class="row total-row"><span>TOTAL</span><span>${formatRp(receipt.total)}</span></div>
  ${receipt.paymentMethod === 'cash' ? `<div class="row"><span>Tunai</span><span>${formatRp(receipt.cashReceived)}</span></div><div class="row"><span>Kembali</span><span>${formatRp(receipt.change)}</span></div>` : ''}
  <div class="div"></div>
  <div class="footer">${receipt.receiptFooter}</div>`
}
