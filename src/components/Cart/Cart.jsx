import { useState, useEffect } from 'react'
import {
  ShoppingCart, Trash2, User, X,
  Banknote, Building2, QrCode, CreditCard
} from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { formatRp, PLATFORM_LABELS, ORDER_TYPE_LABELS } from '../../utils/format'
import PaymentModal from '../Payment/PaymentModal'
import { GoFoodLogo, GrabFoodLogo, ShopeeFoodLogo, DirectOrderIcon, OnlineOrderIcon } from '../ui/PlatformLogos'
import './Cart.css'

export default function Cart() {
  const {
    items, orderType, platform, taxPercent,
    customerName, setCustomerName,
    customerType, setCustomerType,
    autoOpenPayment, setAutoOpenPayment,
    updateQty, clearCart, setDiscount,
    getSubtotal, getTax, getTotal, editingTransactionId
  } = useCartStore()

  const [showPayment, setShowPayment] = useState(false)
  const [discountInput, setDiscountInput] = useState('')

  useEffect(() => {
    if (autoOpenPayment && items.length > 0) {
      setShowPayment('select')
      setAutoOpenPayment(false)
    }
  }, [autoOpenPayment, items])

  const isCustomerValid = customerType === 'guest' || (customerType === 'member' && customerName.trim() !== '')

  async function handleCreateQueue() {
    if (items.length === 0 || !isCustomerValid) return
    setShowPayment('queue')
  }

  const subtotal = getSubtotal()
  const tax = getTax()
  const total = getTotal()
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  const handleDiscount = (v) => {
    setDiscountInput(v)
    const n = Number.parseInt(v.replaceAll(/\D/g, ''), 10)
    setDiscount(Number.isNaN(n) ? 0 : n)
  }

  return (
    <div className="cart-panel">
      {/* Header */}
      <div className="cart-header">
        <div className="cart-header-left">
          <ShoppingCart size={18} strokeWidth={2} color="var(--tosca)" />
          <span className="cart-title">Pesanan {editingTransactionId && <span className="text-amber">(Edit)</span>}</span>
          {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
        </div>
        {items.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearCart}>
            <Trash2 size={14} strokeWidth={2} /> Hapus
          </button>
        )}
      </div>

      {/* Customer Selector */}
      <div className="customer-selector">
        <button 
          className={`cust-type-btn ${customerType === 'guest' ? 'active' : ''}`}
          onClick={() => setCustomerType('guest')}
        >
          Guest
        </button>
        <button 
          className={`cust-type-btn ${customerType === 'member' ? 'active' : ''}`}
          onClick={() => setCustomerType('member')}
        >
          Customer
        </button>
      </div>

      {/* Customer Name */}
      <div className={`customer-name-row ${customerType === 'member' && !customerName ? 'invalid' : ''}`}>
        <User size={15} strokeWidth={2} className="customer-icon" />
        <input
          className="customer-name-input"
          placeholder={customerType === 'guest' ? 'Pelanggan Guest' : 'Isi nama pelanggan (Wajib)'}
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          maxLength={40}
          disabled={customerType === 'guest'}
        />
        {customerName && customerType === 'member' && (
          <button className="customer-clear" onClick={() => setCustomerName('')} title="Hapus nama">
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Order type indicator */}
      {orderType === 'online' && (
        <div className="cart-order-type online">
          <OnlineOrderIcon size={15} color="var(--blue)" />
          {ORDER_TYPE_LABELS.online}
          {platform && (
            <span className="platform-tag-logo">
              {platform === 'gofood' && <GoFoodLogo size={20} />}
              {platform === 'grabfood' && <GrabFoodLogo size={20} />}
              {platform === 'shopeefood' && <ShopeeFoodLogo size={20} />}
              {PLATFORM_LABELS[platform]}
            </span>
          )}
        </div>
      )}
      {orderType === 'direct' && (
        <div className="cart-order-type direct">
          <DirectOrderIcon size={15} color="var(--tosca-dark)" />
          {ORDER_TYPE_LABELS.direct}
        </div>
      )}

      {/* Items */}
      <div className="cart-items">
        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart size={36} strokeWidth={1.5} color="var(--text-muted)" />
            <p>Keranjang kosong</p>
            <p className="cart-empty-sub">Ketuk menu untuk menambah pesanan</p>
          </div>
        ) : (
          items.map(item => {
            const price = orderType === 'online' ? item.priceOnline : item.priceDirect
            return (
              <div key={item.id} className="cart-item">
                <div className="cart-item-left">
                  <span className="cart-item-emoji">{item.emoji || '☕'}</span>
                  <div className="cart-item-info">
                    <div className="cart-item-name">
                      {item.name}
                      {item.temp && item.temp !== 'None' && (
                        <span className={`cart-temp-tag ${item.temp.toLowerCase()}`}>{item.temp}</span>
                      )}
                    </div>
                    <div className="cart-item-price">{formatRp(price)}</div>
                  </div>
                </div>
                <div className="cart-item-right">
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <span className="qty-value">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <div className="cart-item-total">{formatRp(price * item.qty)}</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatRp(subtotal)}</span>
          </div>
          {taxPercent > 0 && (
            <div className="summary-row">
              <span>Pajak ({taxPercent}%)</span>
              <span>{formatRp(tax)}</span>
            </div>
          )}
          <div className="summary-row discount-row">
            <span>Diskon</span>
            <input
              className="discount-input"
              placeholder="0"
              value={discountInput}
              onChange={e => handleDiscount(e.target.value)}
            />
          </div>
          <div className="summary-divider" />
          <div className="summary-total">
            <span>TOTAL</span>
            <span className="total-amount">{formatRp(total)}</span>
          </div>

          {/* Payment Buttons */}
          <div className="payment-buttons">
            <button className="pay-btn pay-queue" onClick={handleCreateQueue} disabled={items.length === 0 || !isCustomerValid}>
              <ShoppingCart size={18} strokeWidth={2} />
              <span>{editingTransactionId ? 'Simpan Perubahan' : 'Buat Pesanan'}</span>
            </button>
            
            <button className="pay-btn pay-main" onClick={() => setShowPayment('select')} disabled={items.length === 0 || !isCustomerValid}>
              <CreditCard size={18} strokeWidth={2} />
              <span>{editingTransactionId ? 'Update & Bayar' : 'Lanjut ke Pembayaran'}</span>
            </button>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          method={showPayment}
          total={total}
          customerName={customerName}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}
