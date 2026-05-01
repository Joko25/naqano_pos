import Dexie from 'dexie'

export const db = new Dexie('NaqanoPOS')

db.version(6).stores({
  products: '++id, name, category, isActive',
  transactions: '++id, createdAt, orderType, platform, paymentMethod, status',
  transactionItems: '++id, transactionId, productId',
  settings: 'key',
  categories: '++id, name',
  materials: '++id, name', // Bahan Baku (Susu, Kopi, dll)
  product_materials: '++id, productId, materialId', // Relasi Produk & Bahan (Resep)
  purchases: '++id, date, supplier', // Log Belanja
  expenses: '++id, date, category', // Beban Operasional (Listrik, Sewa, dll)
  addons: '++id, name, price, isActive', // Add-on options
})

// Seed default settings
db.on('populate', async () => {
  await db.settings.bulkPut([
    { key: 'shopName', value: 'Bestari POS' },
    { key: 'shopAddress', value: 'Jl. Jenderal Sudirman No. 1, Jakarta Pusat' },
    { key: 'shopPhone', value: '081234567890' },
    { key: 'taxPercent', value: 0 },
    { key: 'qrisNumber', value: '' },
    { key: 'bankName', value: 'BCA' },
    { key: 'bankAccount', value: '1234567890' },
    { key: 'bankHolder', value: 'Nama Pemilik' },
    { key: 'shopLogo', value: '' },
    { key: 'receiptFooter', value: 'Terima kasih atas kunjungan Anda! 🙏' },
    { key: 'autoBackup', value: 'false' },
  ])

  await db.categories.bulkAdd([
    { name: 'Kopi', icon: '☕' },
    { name: 'Non-Kopi', icon: '🧃' },
    { name: 'Makanan', icon: '🍝' },
    { name: 'Camilan', icon: '🍟' },
  ])

  await db.products.bulkAdd([
    { name: 'Espresso', category: 'Kopi', temp: 'Hot', priceDirect: 15000, priceOnline: 18000, costPrice: 5000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Americano', category: 'Kopi', temp: 'Ice', priceDirect: 18000, priceOnline: 22000, costPrice: 6000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Cafe Latte', category: 'Kopi', temp: 'Ice', priceDirect: 22000, priceOnline: 27000, costPrice: 9000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Cappuccino', category: 'Kopi', temp: 'Hot', priceDirect: 22000, priceOnline: 27000, costPrice: 9000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Caramel Macchiato', category: 'Kopi', temp: 'Ice', priceDirect: 25000, priceOnline: 30000, costPrice: 11000, stock: 99, isActive: 1, emoji: '☕' },
    { name: 'Matcha Latte', category: 'Non-Kopi', temp: 'Ice', priceDirect: 24000, priceOnline: 29000, costPrice: 10000, stock: 99, isActive: 1, emoji: '🍵' },
    { name: 'Taro Latte', category: 'Non-Kopi', temp: 'Ice', priceDirect: 24000, priceOnline: 29000, costPrice: 10000, stock: 99, isActive: 1, emoji: '🧋' },
    { name: 'Chocolate Ice', category: 'Non-Kopi', temp: 'Ice', priceDirect: 20000, priceOnline: 25000, costPrice: 8000, stock: 99, isActive: 1, emoji: '🍫' },
    { name: 'Nasi Goreng Spesial', category: 'Makanan', temp: 'None', priceDirect: 30000, priceOnline: 36000, costPrice: 15000, stock: 50, isActive: 1, emoji: '🍝' },
    { name: 'Mie Goreng Telur', category: 'Makanan', temp: 'None', priceDirect: 25000, priceOnline: 30000, costPrice: 12000, stock: 50, isActive: 1, emoji: '🍜' },
    { name: 'French Fries', category: 'Camilan', temp: 'None', priceDirect: 15000, priceOnline: 18000, costPrice: 6000, stock: 50, isActive: 1, emoji: '🍟' },
    { name: 'Mix Platter', category: 'Camilan', temp: 'None', priceDirect: 25000, priceOnline: 30000, costPrice: 10000, stock: 50, isActive: 1, emoji: '🍗' },
  ])

  await db.materials.bulkAdd([
    { name: 'Biji Kopi Espresso Blend (1kg)', unit: 'Kg', stock: 5, lastPrice: 120000 },
    { name: 'Susu UHT Full Cream (1L)', unit: 'Pcs', stock: 24, lastPrice: 18000 },
    { name: 'Gula Aren Cair (1L)', unit: 'Pcs', stock: 10, lastPrice: 45000 },
    { name: 'Sirup Karamel (750ml)', unit: 'Pcs', stock: 5, lastPrice: 95000 },
    { name: 'Cup Plastik 14oz (1 Roll)', unit: 'Pcs', stock: 10, lastPrice: 25000 },
    { name: 'Paper Cup 8oz (1 Roll)', unit: 'Pcs', stock: 10, lastPrice: 20000 },
  ])

  await db.addons.bulkAdd([
    { name: 'Extra Shot Espresso', price: 5000, isActive: 1 },
    { name: 'Oat Milk Upgrade', price: 8000, isActive: 1 },
    { name: 'Extra Syrup', price: 4000, isActive: 1 },
    { name: 'Takeaway Packaging', price: 2000, isActive: 1 },
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

/**
 * Backup Database to JSON
 */
export async function exportDatabase() {
  const tables = db.tables.map(t => t.name)
  const result = {
    version: db.verno,
    timestamp: new Date().toISOString(),
    tables: {}
  }

  for (const name of tables) {
    result.tables[name] = await db.table(name).toArray()
  }

  return JSON.stringify(result, null, 2)
}

/**
 * Restore Database from JSON
 */
export async function importDatabase(jsonString) {
  try {
    const backup = JSON.parse(jsonString)
    if (!backup.tables) throw new Error('Format backup tidak valid')

    // Transaction to ensure atomicity
    await db.transaction('rw', db.tables, async () => {
      for (const [tableName, rows] of Object.entries(backup.tables)) {
        const table = db.table(tableName)
        if (table) {
          await table.clear()
          if (rows.length > 0) {
            await table.bulkAdd(rows)
          }
        }
      }
    })
    return true
  } catch (err) {
    console.error('Import failed:', err)
    throw err
  }
}

