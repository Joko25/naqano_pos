export function formatRp(amount) {
  if (amount === null || amount === undefined) return 'Rp 0'
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${formatDate(d)} ${formatTime(d)}`
}

export function generateReceiptNumber() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export const PLATFORM_LABELS = {
  gofood: 'GoFood',
  grabfood: 'GrabFood',
  shopeefood: 'ShopeeFood',
}

export const PAYMENT_LABELS = {
  cash: 'Tunai',
  transfer: 'Transfer Bank',
  qris: 'QRIS',
}

export const ORDER_TYPE_LABELS = {
  direct: 'Langsung',
  online: 'Ojek Online',
}
