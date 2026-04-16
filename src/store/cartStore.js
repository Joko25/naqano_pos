import { create } from 'zustand'

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

  setOrderType: (type) => set({ orderType: type, platform: type === 'direct' ? null : get().platform }),
  setPlatform: (p) => set({ platform: p }),
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
    const existing = items.find(i => i.id === product.id)
    if (existing) {
      set({ items: items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...items, { ...product, qty: 1 }] })
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter(i => i.id !== productId) })
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter(i => i.id !== productId) })
    } else {
      set({ items: get().items.map(i => i.id === productId ? { ...i, qty } : i) })
    }
  },

  clearCart: () => set({ 
    items: [], 
    discount: 0, 
    customerName: '', 
    orderType: 'direct', 
    platform: null, 
    editingTransactionId: null, 
    customerType: 'guest' 
  }),

  getPrice: (product) => {
    const { orderType } = get()
    return orderType === 'online' ? product.priceOnline : product.priceDirect
  },

  getSubtotal: () => {
    const { items, orderType } = get()
    return items.reduce((sum, item) => {
      const price = orderType === 'online' ? item.priceOnline : item.priceDirect
      return sum + price * item.qty
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
