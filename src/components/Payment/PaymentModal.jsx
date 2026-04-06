import { useState, useEffect, useRef } from 'react'
import { db, getAllSettings } from '../../db'
import { useCartStore } from '../../store/cartStore'
import { formatRp, formatDateTime, generateReceiptNumber, PLATFORM_LABELS, PAYMENT_LABELS, ORDER_TYPE_LABELS } from '../../utils/format'
import { toast } from '../ui'
import QRCode from 'qrcode'
import './Payment.css'

export default function PaymentModal({ method, total, customerName, onClose }) {
  const { items, orderType, platform, discount, taxPercent, clearCart, getSubtotal, getTax } = useCartStore()
  const [settings, setSettings] = useState({})
  const [cashInput, setCashInput] = useState('')
  const [change, setChange] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [paid, setPaid] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const receiptRef = useRef()

  useEffect(() => {
    getAllSettings().then(s => {
      setSettings(s)
      if (method === 'qris') generateQR(s)
    })
  }, [method])

  async function generateQR(s) {
    const qrisNum = s.qrisNumber || '00020101021126570011ID.CO.BRI.WWW011893600002000000000102152000000000001020303UMI51440014ID.CO.QRIS.WWW0215ID10200000000000303UMI5204581253033605802ID5906WARUNG6007JAKARTA6105101106304'
    try {
      const url = await QRCode.toDataURL(qrisNum, { width: 220, margin: 1, color: { dark: '#000', light: '#fff' } })
      setQrDataUrl(url)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCashInput = (v) => {
    const cleaned = v.replace(/\D/g, '')
    setCashInput(cleaned)
    const n = parseInt(cleaned, 10) || 0
    setChange(Math.max(0, n - total))
  }

  const addNumpad = (val) => {
    if (val === 'C') { setCashInput(''); setChange(0); return }
    if (val === '00') { handleCashInput(cashInput + '00'); return }
    handleCashInput(cashInput + val)
  }

  const presetAmounts = [
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
  ].filter((v, i, a) => a.indexOf(v) === i).filter(v => v >= total).slice(0, 4)

  async function confirmPayment(paymentMethod) {
    const receiptNo = generateReceiptNumber()
    const now = new Date()
    const subtotal = getSubtotal()
    const tax = getTax()

    const txData = {
      receiptNo,
      createdAt: now.toISOString(),
      orderType,
      platform: platform || null,
      paymentMethod,
      customerName: customerName || '',
      subtotal,
      tax,
      discount,
      total,
      cashReceived: paymentMethod === 'cash' ? (parseInt(cashInput, 10) || total) : total,
      change: paymentMethod === 'cash' ? change : 0,
    }

    const txId = await db.transactions.add(txData)
    await db.transactionItems.bulkAdd(items.map(item => ({
      transactionId: txId,
      productId: item.id,
      name: item.name,
      emoji: item.emoji,
      temp: item.temp || 'None',
      qty: item.qty,
      price: orderType === 'online' ? item.priceOnline : item.priceDirect,
      costPrice: item.costPrice || 0,
    })))

    const receiptData = {
      ...txData,
      shopName: settings.shopName || 'Naqano Coffee',
      shopAddress: settings.shopAddress || '',
      shopPhone: settings.shopPhone || '',
      shopLogo: settings.shopLogo || '/logo.png',
      receiptFooter: settings.receiptFooter || 'Terima kasih!',
      items: items.map(item => ({
        name: item.name,
        emoji: item.emoji,
        temp: item.temp || 'None',
        qty: item.qty,
        price: orderType === 'online' ? item.priceOnline : item.priceDirect,
        costPrice: item.costPrice || 0,
      })),
    }

    setReceipt(receiptData)
    setPaid(true)
    toast.success('Pembayaran berhasil! 🎉')
  }

  function printReceipt() {
    const w = window.open('', '_blank', 'width=400,height=700')
    w.document.write(receiptHTML(receipt))
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  function handleClose() {
    if (paid) clearCart()
    onClose()
  }

  if (paid && receipt) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 440 }}>
          <div className="modal-header">
            <span className="modal-title">✅ Pembayaran Berhasil</span>
            <button className="modal-close" onClick={handleClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="receipt-preview">
              <div id="receipt-content" ref={receiptRef}>
                <ReceiptContent receipt={receipt} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={handleClose}>Transaksi Baru</button>
            <button className="btn btn-amber" onClick={printReceipt}>🖨️ Print Struk</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: method === 'cash' ? 480 : 420 }}>
        <div className="modal-header">
          <span className="modal-title">
            {method === 'cash' ? '💵 Bayar Tunai' : method === 'transfer' ? '🏦 Transfer Bank' : '📱 QRIS'}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {method === 'cash' && (
            <CashPayment
              total={total}
              cashInput={cashInput}
              change={change}
              presets={presetAmounts}
              onNumpad={addNumpad}
              onManual={handleCashInput}
              onConfirm={() => confirmPayment('cash')}
              disabled={!cashInput || parseInt(cashInput, 10) < total}
            />
          )}
          {method === 'transfer' && (
            <TransferPayment
              total={total}
              settings={settings}
              onConfirm={() => confirmPayment('transfer')}
            />
          )}
          {method === 'qris' && (
            <QRISPayment
              total={total}
              qrDataUrl={qrDataUrl}
              onConfirm={() => confirmPayment('qris')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function CashPayment({ total, cashInput, change, presets, onNumpad, onManual, onConfirm, disabled }) {
  return (
    <div className="cash-payment">
      <div className="payment-total-display">
        <div className="ptd-label">Total Tagihan</div>
        <div className="ptd-amount">{formatRp(total)}</div>
      </div>

      <div className="preset-amounts">
        {presets.map(p => (
          <button key={p} className="preset-btn" onClick={() => onManual(String(p))}>
            {formatRp(p)}
          </button>
        ))}
      </div>

      <div className="cash-display">
        <div className="cash-row">
          <span>Diterima</span>
          <span className="cash-value">{cashInput ? formatRp(parseInt(cashInput)) : '—'}</span>
        </div>
        <div className="cash-row">
          <span>Kembalian</span>
          <span className={`cash-value ${change > 0 ? 'text-green' : ''}`}>{formatRp(change)}</span>
        </div>
      </div>

      <div className="numpad">
        {['7','8','9','4','5','6','1','2','3','C','0','00'].map(k => (
          <button key={k} className={`numpad-key ${k === 'C' ? 'numpad-clear' : ''}`} onClick={() => onNumpad(k)}>
            {k}
          </button>
        ))}
      </div>

      <button className="btn btn-green btn-lg w-full" onClick={onConfirm} disabled={disabled}>
        ✓ Konfirmasi Pembayaran
      </button>
    </div>
  )
}

function TransferPayment({ total, settings, onConfirm }) {
  return (
    <div className="transfer-payment">
      <div className="payment-total-display">
        <div className="ptd-label">Total Transfer</div>
        <div className="ptd-amount">{formatRp(total)}</div>
      </div>
      <div className="transfer-info">
        <div className="bank-card">
          <div className="bank-logo">🏦</div>
          <div>
            <div className="bank-name">{settings.bankName || 'BCA'}</div>
            <div className="bank-account">{settings.bankAccount || '—'}</div>
            <div className="bank-holder">a/n {settings.bankHolder || '—'}</div>
          </div>
        </div>
        <div className="transfer-note">
          📋 Minta pelanggan transfer tepat <strong>{formatRp(total)}</strong> ke rekening di atas, lalu konfirmasi.
        </div>
      </div>
      <button className="btn btn-blue btn-lg w-full" onClick={onConfirm}>
        ✓ Konfirmasi Transfer Diterima
      </button>
    </div>
  )
}

function QRISPayment({ total, qrDataUrl, onConfirm }) {
  return (
    <div className="qris-payment">
      <div className="payment-total-display">
        <div className="ptd-label">Total QRIS</div>
        <div className="ptd-amount">{formatRp(total)}</div>
      </div>
      <div className="qris-container">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QRIS Code" className="qris-image" />
        ) : (
          <div className="qris-loading"><span className="animate-spin">⏳</span></div>
        )}
        <div className="qris-label">Scan dengan GoPay, OVO, DANA, ShopeePay, atau bank apapun</div>
      </div>
      <button className="btn btn-amber btn-lg w-full" onClick={onConfirm}>
        ✓ Konfirmasi Pembayaran Diterima
      </button>
    </div>
  )
}

function ReceiptContent({ receipt }) {
  return (
    <div className="receipt-body">
      <div className="receipt-header">
        {receipt.shopLogo && (
          <img 
            src={receipt.shopLogo} 
            alt="logo" 
            className="receipt-shop-logo"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}
        <div className="receipt-shop-name">{receipt.shopName}</div>
        <div className="receipt-shop-address">{receipt.shopAddress}</div>
        {receipt.shopPhone && <div className="receipt-shop-phone">{receipt.shopPhone}</div>}
      </div>

      <div className="receipt-divider">{'─'.repeat(32)}</div>

      <div className="receipt-meta">
        <div><span>No</span><span>: {receipt.receiptNo}</span></div>
        <div><span>Tgl</span><span>: {formatDateTime(receipt.createdAt)}</span></div>
        {receipt.customerName && (
          <div><span>Nama</span><span>: {receipt.customerName}</span></div>
        )}
        <div><span>Tipe</span><span>: {ORDER_TYPE_LABELS[receipt.orderType]}{receipt.platform ? ` (${PLATFORM_LABELS[receipt.platform]})` : ''}</span></div>
        <div><span>Bayar</span><span>: {PAYMENT_LABELS[receipt.paymentMethod]}</span></div>
      </div>

      <div className="receipt-divider">{'─'.repeat(32)}</div>

      <div className="receipt-items">
        {receipt.items.map((item, i) => (
          <div key={i} className="receipt-item">
            <div className="receipt-item-name">
              {item.qty}x {item.name} {item.temp && item.temp !== 'None' ? `(${item.temp})` : ''}
            </div>
            <div className="receipt-item-total">{formatRp(item.price * item.qty)}</div>
          </div>
        ))}
      </div>

      <div className="receipt-divider">{'─'.repeat(32)}</div>

      <div className="receipt-totals">
        <div className="receipt-row"><span>Subtotal</span><span>{formatRp(receipt.subtotal)}</span></div>
        {receipt.tax > 0 && <div className="receipt-row"><span>Pajak</span><span>{formatRp(receipt.tax)}</span></div>}
        {receipt.discount > 0 && <div className="receipt-row"><span>Diskon</span><span>-{formatRp(receipt.discount)}</span></div>}
        <div className="receipt-row receipt-row-total"><span>TOTAL</span><span>{formatRp(receipt.total)}</span></div>
        {receipt.paymentMethod === 'cash' && (
          <>
            <div className="receipt-row"><span>Tunai</span><span>{formatRp(receipt.cashReceived)}</span></div>
            <div className="receipt-row"><span>Kembali</span><span>{formatRp(receipt.change)}</span></div>
          </>
        )}
      </div>

      <div className="receipt-divider">{'─'.repeat(32)}</div>

      <div className="receipt-footer">{receipt.receiptFooter}</div>
    </div>
  )
}

function receiptHTML(receipt) {
  const items = receipt.items.map(i =>
    `<div class="ri"><span>${i.qty}x ${i.name} ${i.temp && i.temp !== 'None' ? `(${i.temp})` : ''}</span><span>${formatRp(i.price * i.qty)}</span></div>`
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Struk #${receipt.receiptNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 8px; width: 280px; }
  .sh { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px; }
  .sa { text-align: center; font-size: 11px; margin-bottom: 8px; color: #444; }
  .div { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  .ri { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; }
  .total-row { font-weight: bold; font-size: 13px; margin-top: 4px; }
  .footer { text-align: center; font-size: 11px; margin-top: 10px; color: #555; }
  @media print { body { margin: 0; } @page { margin: 0; size: 58mm auto; } }
</style></head><body>
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
<div class="footer">${receipt.receiptFooter}</div>
</body></html>`
}
