import { create } from 'zustand'

const PLATFORM_NAMES = {
  gofood: 'GoFood',
  grabfood: 'GrabFood',
  shopeefood: 'ShopeeFood',
}

export const useCartStore = create((set, get) => ({
  items: [],
  orderType: 'direct', // 'direct' | 'online'
  platform: null, // 'gofood' | 'grabfood' | 'shopeefood'
  customerName: '',
  discount: 0,
  taxPercent: 0,
  editingTransactionId: null,
  customerType: 'guest', // 'guest' | 'member'
  autoOpenPayment: false,

  setOrderType: (type) => set({
    orderType: type,
    platform: type === 'direct' ? null : get().platform,
    // Reset nama pelanggan saat kembali ke direct
    customerName: type === 'direct' ? '' : get().customerName,
    customerType: type === 'direct' ? 'guest' : get().customerType,
  }),
  setPlatform: (p) => set({
    platform: p,
    // Auto-fill nama pelanggan dengan nama platform
    customerName: p ? PLATFORM_NAMES[p] || '' : '',
    customerType: p ? 'member' : 'guest',
  }),
  setCustomerType: (type) => set({ 
    customerType: type, 
    customerName: type === 'guest' ? '' : get().customerName 
  }),
  setCustomerName: (name) => set({ customerName: name }),
  setDiscount: (d) => set({ discount: d }),
  setTaxPercent: (t) => set({ taxPercent: t }),
  setAutoOpenPayment: (val) => set({ autoOpenPayment: val }),

  loadTransaction: (tx, items, autoOpen = false) => set({
    editingTransactionId: tx.id,
    items: items,
    orderType: tx.orderType,
    platform: tx.platform,
    customerType: tx.customerName === '' || tx.customerName === 'Guest' || tx.customerName === 'guest' ? 'guest' : 'member',
    customerName: tx.customerName === 'Guest' ? '' : tx.customerName,
    discount: tx.discount,
    autoOpenPayment: autoOpen
  }),

  addItem: (product) => {
    const items = get().items
    
    // Create unique key based on id + variants + addons
    const addonsKey = product.selectedAddons?.map(a => `${a.id}-${a.qty}`).sort().join('_') || ''
    const variantsKey = product.variants?.sort().join('_') || ''
    const cartItemId = product.cartItemId || `${product.id}-${variantsKey}-${addonsKey}`

    const existing = items.find(i => (i.cartItemId || i.id) === cartItemId)
    if (existing) {
      set({ items: items.map(i => (i.cartItemId || i.id) === cartItemId ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...items, { ...product, cartItemId, qty: 1 }] })
    }
  },

  removeItem: (cartItemId) => {
    set({ items: get().items.filter(i => (i.cartItemId || i.id) !== cartItemId) })
  },

  updateQty: (cartItemId, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter(i => (i.cartItemId || i.id) !== cartItemId) })
    } else {
      set({ items: get().items.map(i => (i.cartItemId || i.id) === cartItemId ? { ...i, qty } : i) })
    }
  },

  clearCart: () => set({ 
    items: [], 
    discount: 0, 
    customerName: '', 
    orderType: 'direct', 
    platform: null, 
    editingTransactionId: null, 
    customerType: 'guest',
    autoOpenPayment: false
  }),

  getPrice: (product) => {
    const { orderType } = get()
    return orderType === 'online' ? product.priceOnline : product.priceDirect
  },

  getSubtotal: () => {
    const { items, orderType } = get()
    return items.reduce((sum, item) => {
      const price = orderType === 'online' ? item.priceOnline : item.priceDirect
      const addonsPrice = item.selectedAddons?.reduce((aSum, a) => aSum + (a.price * a.qty), 0) || 0
      return sum + (price + addonsPrice) * item.qty
    }, 0)
  },

  getTax: () => {
    const { taxPercent } = get()
    return Math.round(get().getSubtotal() * taxPercent / 100)
  },

  getTotal: () => {
    const subtotal = get().getSubtotal()
    const tax = get().getTax()
    const { discount } = get()
    return Math.max(0, subtotal + tax - discount)
  },
}))
