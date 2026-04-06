import Dexie from 'dexie'

export const db = new Dexie('NaqanoPOS')

db.version(1).stores({
  products: '++id, name, category, isActive',
  transactions: '++id, createdAt, orderType, platform, paymentMethod',
  transactionItems: '++id, transactionId, productId',
  settings: 'key',
  categories: '++id, name',
})

// Seed default settings
db.on('populate', async () => {
  await db.settings.bulkPut([
    { key: 'shopName', value: 'Naqano Coffee' },
    { key: 'shopAddress', value: 'Jl. Kopi Nikmat No. 1' },
    { key: 'shopPhone', value: '081291070705' },
    { key: 'taxPercent', value: 0 },
    { key: 'qrisNumber', value: '00020101021126610014COM.GO-JEK.WWW01189360091438630037910210G8630037910303UMI51440014ID.CO.QRIS.WWW0215ID10254364052250303UMI5204581253033605802ID5925naqano, Makanan & Minuman6006BEKASI61051732062070703A016304CA42' },
    { key: 'bankName', value: 'BCA' },
    { key: 'bankAccount', value: '5211464187' },
    { key: 'bankHolder', value: 'Nur Hasanah' },
    { key: 'receiptFooter', value: 'Terima kasih sudah berkunjung! ☕' },
  ])

  await db.categories.bulkAdd([
    { name: 'Kopi', icon: '☕' },
    { name: 'Non-Kopi', icon: '🧃' },
    { name: 'Makanan', icon: '🍞' },
    { name: 'Camilan', icon: '🍪' },
  ])

  await db.products.bulkAdd([
    { name: 'Kopi Suga', category: 'Kopi', temp: 'Ice', priceDirect: 15000, priceOnline: 20000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Vanilla Latte', category: 'Kopi', temp: 'Ice', priceDirect: 15000, priceOnline: 20000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Vanilla Butterscoth', category: 'Kopi', temp: 'Ice', priceDirect: 15000, priceOnline: 20000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Spanish Latte', category: 'Kopi', temp: 'Ice', priceDirect: 15000, priceOnline: 20000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Butterscoth Creany Foam', category: 'Kopi', temp: 'Ice', priceDirect: 17000, priceOnline: 22000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Americano', category: 'Kopi', temp: 'Ice', priceDirect: 10000, priceOnline: 15000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Caffe Latte', category: 'Kopi', temp: 'Ice', priceDirect: 12000, priceOnline: 17000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'V60 Pour Over', category: 'Kopi', temp: 'Hot', priceDirect: 35000, priceOnline: 40000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Cappuccino', category: 'Kopi', temp: 'Hot', priceDirect: 28000, priceOnline: 33000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Matcha Latte', category: 'Non-Kopi', temp: 'Ice', priceDirect: 28000, priceOnline: 33000, stock: 99, isActive: 1, emoji: '🍵' },
    { name: 'Teh Tarik', category: 'Non-Kopi', temp: 'Ice', priceDirect: 18000, priceOnline: 23000, stock: 99, isActive: 1, emoji: '🧋' },
    { name: 'Chocono', category: 'Non-Kopi', temp: 'Ice', priceDirect: 12000, priceOnline: 17000, stock: 99, isActive: 1, emoji: '🍫' },
    { name: 'Croissant', category: 'Makanan', temp: 'None', priceDirect: 22000, priceOnline: 27000, stock: 30, isActive: 1, emoji: '🥐' },
    { name: 'Roti Bakar', category: 'Makanan', temp: 'None', priceDirect: 18000, priceOnline: 23000, stock: 30, isActive: 1, emoji: '🍞' },
    { name: 'Cookies', category: 'Camilan', temp: 'None', priceDirect: 15000, priceOnline: 19000, stock: 50, isActive: 1, emoji: '🍪' },
  ])
})

export async function getSetting(key) {
  const s = await db.settings.get(key)
  return s ? s.value : null
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

export async function getAllSettings() {
  const all = await db.settings.toArray()
  return Object.fromEntries(all.map(s => [s.key, s.value]))
}
