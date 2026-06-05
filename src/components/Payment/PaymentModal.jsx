import { useState, useEffect, useRef } from 'react'
import { db, getAllSettings } from '../../db'
import { useCartStore } from '../../store/cartStore'
import { formatRp, formatDateTime, generateReceiptNumber, PLATFORM_LABELS, PAYMENT_LABELS, ORDER_TYPE_LABELS, ORDER_STATUS_LABELS } from '../../utils/format'
import { Copy, QrCode, Banknote, Building2, CreditCard } from 'lucide-react'
import { toast } from '../ui'
import QRCode from 'qrcode'
import { generateDynamicQRIS } from '../../utils/qris'
import { executePrintReceipt } from '../../utils/print'
import './Payment.css'

export default function PaymentModal({ method, total, customerName, onClose }) {
  const { items, orderType, platform, discount, taxPercent, clearCart, getSubtotal, getTax, editingTransactionId } = useCartStore()
  const [settings, setSettings] = useState({})
  const [currentMethod, setCurrentMethod] = useState(method === 'select' ? null : method)
  const [cashInput, setCashInput] = useState('')
  const [change, setChange] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showFullQR, setShowFullQR] = useState(false)
  const [paid, setPaid] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const receiptRef = useRef()
  const processingRef = useRef(false)

  useEffect(() => {
    getAllSettings().then(s => {
      setSettings(s)
      if (currentMethod === 'qris') generateQR(s)
      if (method === 'queue' && !paid && !processingRef.current) {
        processingRef.current = true
        confirmPayment(null, 'on_process')
      }
    })
  }, [currentMethod])

  useEffect(() => {
    if (currentMethod !== 'qris' || paid) return
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [currentMethod, timeLeft, paid])

  async function generateQR(s) {
    const staticQR = s.qrisNumber || '00020101021126610014COM.GO-JEK.WWW01189360091438630037910210G8630037910303UMI51440014ID.CO.QRIS.WWW0215ID10254364052250303UMI5204581253033605802ID5925naqano, Makanan & Minuman6006BEKASI61051732062070703A016304CA42'
    try {
      const dynamicQR = generateDynamicQRIS(staticQR, total)
      const url = await QRCode.toDataURL(dynamicQR, { width: 220, margin: 1, color: { dark: '#000', light: '#fff' } })
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

  function formatItemText(items) {
    return items.map(i => {
      let txt = `- ${i.name} x${i.qty}`
      if (i.variants && i.variants.length > 0) txt += `\n  (${i.variants.join(', ')})`
      if (i.selectedAddons && i.selectedAddons.length > 0) {
        txt += `\n  ` + i.selectedAddons.map(a => `+${a.qty} ${a.name}`).join(', ')
      }
      return txt
    }).join('\n')
  }

  function copyPaymentDetails() {
    const bankInfo = settings.bankName ? `\n\nTransfer ke:\n${settings.bankName} ${settings.bankAccount}\na/n ${settings.bankHolder}` : ''
    const itemText = formatItemText(items)
    const text = `Halo ${customerName || 'Pelanggan'}, berikut rincian pesanan Anda di Naqano Coffee:\n\n${itemText}\n\nTotal: ${formatRp(total)}${bankInfo}\n\nTerima kasih! 🙏`
    
    navigator.clipboard.writeText(text)
    toast.success('Rincian disalin ke clipboard! 📋')
  }

  function shareToWhatsApp() {
    const bankInfo = settings.bankName ? `\n\nTransfer ke:\n${settings.bankName} ${settings.bankAccount}\na/n ${settings.bankHolder}` : ''
    const itemText = formatItemText(items)
    const text = encodeURIComponent(`Halo ${customerName || 'Pelanggan'}, berikut rincian pesanan Anda di ${settings.shopName || 'Naqano Coffee'}:\n\n${itemText}\n\nTotal: ${formatRp(total)}${bankInfo}\n\nTerima kasih! 🙏`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  async function confirmPayment(paymentMethod, forcedStatus) {
    const isEdit = !!editingTransactionId
    const now = new Date()
    const subtotal = getSubtotal()
    const tax = getTax()
    // New logic: if paying (not queueing), status is automatically 'delivered'
    const status = forcedStatus || 'delivered'

    let receiptNo = generateReceiptNumber()
    let createdAt = now.toISOString()

    if (isEdit) {
      const existing = await db.transactions.get(editingTransactionId)
      if (existing) {
        receiptNo = existing.receiptNo
        createdAt = existing.createdAt
      }
    }

    const txData = {
      receiptNo,
      createdAt,
      orderType,
      platform: platform || null,
      paymentMethod: paymentMethod || 'other',
      customerName: customerName || 'Guest',
      subtotal,
      tax,
      discount,
      total,
      status,
      cashReceived: paymentMethod === 'cash' ? (parseInt(cashInput, 10) || total) : total,
      change: paymentMethod === 'cash' ? change : 0,
    }

    let txId = editingTransactionId
    if (isEdit) {
      await db.transactions.update(editingTransactionId, txData)
      await db.transactionItems.where('transactionId').equals(editingTransactionId).delete()
    } else {
      txId = await db.transactions.add(txData)
    }

    const getBasePrice = (item) => {
      return orderType === 'online' ? (item.priceOnline || item.price) : (item.priceDirect || item.price)
    }

    await db.transactionItems.bulkAdd(items.map(item => ({
      transactionId: txId,
      productId: item.productId || item.id,
      name: item.name,
      emoji: item.emoji,
      temp: item.temp || 'None',
      qty: item.qty,
      price: getBasePrice(item),
      costPrice: item.costPrice || 0,
      variants: item.variants || [],
      selectedAddons: item.selectedAddons || [],
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
        price: getBasePrice(item),
        costPrice: item.costPrice || 0,
        variants: item.variants || [],
        selectedAddons: item.selectedAddons || [],
      })),
    }

    setReceipt(receiptData)
    setPaid(true)
    
    if (method === 'queue') {
      toast.success(isEdit ? 'Pesanan diperbarui! 📝' : 'Pesanan masuk antrean! ☕')
    } else {
      toast.success('Pembayaran Berhasil & Pesanan Selesai! 🎉')
      // Auto-print logic
      if (settings.autoPrint === 'true') {
        setTimeout(() => printReceipt(receiptData), 500)
      }
    }
  }

  function printReceipt(customData) {
    const data = customData || receipt
    executePrintReceipt(data, settings)
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
            <button className="btn btn-amber" onClick={() => printReceipt()}>🖨️ Print Struk</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: currentMethod === 'cash' ? 480 : 420 }}>
        <div className="modal-header">
          <span className="modal-title">
            {!currentMethod ? 'Pilih Metode Bayar' : currentMethod === 'cash' ? '💵 Bayar Tunai' : currentMethod === 'transfer' ? '🏦 Transfer Bank' : '📱 QRIS'}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!currentMethod && (
            <div className="method-selector">
              <button className="method-btn cash" onClick={() => setCurrentMethod('cash')}>
                <Banknote size={24} />
                <div className="method-btn-info">
                  <div className="method-name">Tunai / Cash</div>
                  <div className="method-desc">Bayar langsung di kasir</div>
                </div>
              </button>
              <button className="method-btn transfer" onClick={() => setCurrentMethod('transfer')}>
                <Building2 size={24} />
                <div className="method-btn-info">
                  <div className="method-name">Transfer Bank</div>
                  <div className="method-desc">BCA, Mandiri, atau bank lain</div>
                </div>
              </button>
              <button className="method-btn qris" onClick={() => setCurrentMethod('qris')}>
                <QrCode size={24} />
                <div className="method-btn-info">
                  <div className="method-name">QRIS Denom (Otomatis)</div>
                  <div className="method-desc">Scan dengan e-wallet/bank</div>
                </div>
              </button>
            </div>
          )}
          {currentMethod === 'cash' && (
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
          {currentMethod === 'transfer' && (
            <TransferPayment
              total={total}
              settings={settings}
              onCopy={copyPaymentDetails}
              shareToWhatsApp={shareToWhatsApp}
              onConfirm={() => confirmPayment('transfer', 'delivered')}
              onSave={() => confirmPayment('transfer', 'waiting_payment')}
            />
          )}
          {currentMethod === 'qris' && (
            <QRISPayment
              total={total}
              qrDataUrl={qrDataUrl}
              timeLeft={timeLeft}
              onCopy={copyPaymentDetails}
              shareToWhatsApp={shareToWhatsApp}
              showFullQR={showFullQR}
              setShowFullQR={setShowFullQR}
              onConfirm={() => confirmPayment('qris', 'delivered')}
              onSave={() => confirmPayment('qris', 'waiting_payment')}
              onRegenerate={() => { setTimeLeft(600); generateQR(settings) }}
            />
          )}
        </div>
        {currentMethod && currentMethod !== 'select' && (
          <div className="modal-footer" style={{ justifyContent: 'center', padding: '0 24px 20px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMethod(null)}>← Ganti Metode</button>
          </div>
        )}
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

function TransferPayment({ total, settings, onCopy, shareToWhatsApp, onConfirm, onSave }) {
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
      <div className="flex gap-2">
        <button className="btn btn-outline flex-1" onClick={onCopy}>
          <Copy size={14} /> Salin
        </button>
        <button className="btn btn-outline flex-1" onClick={shareToWhatsApp}>
          🟢 WhatsApp
        </button>
      </div>
      <button className="btn btn-blue btn-lg w-full" onClick={onConfirm}>
        ✓ Konfirmasi Transfer Diterima
      </button>
      <button className="btn btn-ghost w-full" onClick={onSave}>
        ⏳ Simpan Antrean (Belum Bayar)
      </button>
    </div>
  )
}

function QRISPayment({ total, qrDataUrl, timeLeft, onCopy, shareToWhatsApp, onConfirm, onSave, onRegenerate, showFullQR, setShowFullQR }) {
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const isExpired = timeLeft <= 0
  return (
    <div className="qris-payment">
      <div className="payment-total-display">
        <div className="ptd-label">Total QRIS (Otomatis)</div>
        <div className="ptd-amount">{formatRp(total)}</div>
      </div>
      <div className="qris-container">
        {isExpired ? (
          <div className="qris-expired">
            <div className="expired-icon">⚠️</div>
            <div className="expired-text">QR Sudah Kadaluarsa</div>
            <button className="btn btn-outline" onClick={onRegenerate}>Generate Ulang</button>
          </div>
        ) : qrDataUrl ? (
          <>
            <img src={qrDataUrl} alt="QRIS Code" className="qris-image cursor-pointer" onClick={() => setShowFullQR(true)} />
            <div className={`qris-timer ${timeLeft < 60 ? 'text-red' : ''}`}>
               ⏳ Berlaku dalam: <strong>{formatTime(timeLeft)}</strong>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFullQR(true)}>🔍 Perbesar QR</button>
          </>
        ) : (
          <div className="qris-loading"><span className="animate-spin">⏳</span></div>
        )}
        <div className="qris-label">Scan dengan GoPay, OVO, DANA, ShopeePay, atau bank apapun</div>
      </div>
      <div className="qris-actions">
        <div className="flex gap-2">
          <button className="btn btn-outline flex-1" onClick={onCopy}>
            <Copy size={14} /> Salin
          </button>
          <button className="btn btn-outline flex-1" onClick={shareToWhatsApp}>
            🟢 WhatsApp
          </button>
        </div>
        <button className="btn btn-amber btn-lg w-full" onClick={onConfirm} disabled={isExpired}>
          ✓ Konfirmasi Pembayaran Diterima
        </button>
        <button className="btn btn-ghost w-full" onClick={onSave} disabled={isExpired}>
          ⏳ Simpan Antrean (Belum Bayar)
        </button>
      </div>
    </div>
  )
}

function ReceiptContent({ receipt }) {
  return (
    <div className="receipt-body">
      <div className="receipt-header">
        {receipt.shopLogo && receipt.shopLogo !== '/logo.png' && (
          <img 
            src={receipt.shopLogo} 
            alt="logo" 
            className="receipt-shop-logo" 
            style={{ maxHeight: 60, maxWidth: 160, display: 'block', margin: '0 auto 10px' }}
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
        {receipt.items.map((item, i) => {
          const itemAddonsPrice = item.selectedAddons?.reduce((s, a) => s + (a.price * a.qty), 0) || 0
          const itemTotal = (item.price + itemAddonsPrice) * item.qty
          return (
            <div key={i} className="receipt-item">
              <div className="receipt-item-name">
                <div style={{ fontWeight: '500' }}>{item.qty}x {item.name} {item.temp && item.temp !== 'None' ? `(${item.temp})` : ''}</div>
                {item.variants && item.variants.length > 0 && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: 1 }}>{item.variants.join(', ')}</div>
                )}
                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: 1 }}>{item.selectedAddons.map(a => `+${a.qty} ${a.name}`).join(', ')}</div>
                )}
              </div>
              <div className="receipt-item-total">{formatRp(itemTotal)}</div>
            </div>
          )
        })}
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
