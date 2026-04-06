import { useState, useEffect } from 'react'
import { db } from '../../db'
import { formatRp } from '../../utils/format'
import { Modal, Toggle, ConfirmModal, EmptyState, toast } from '../ui'
import './Products.css'

const CATEGORY_OPTIONS = ['Kopi', 'Non-Kopi', 'Makanan', 'Camilan']
const EMOJI_OPTIONS = ['☕', '🧋', '🍵', '🍫', '🧃', '🍞', '🥐', '🍪', '🧁', '🍰', '🥤', '🫖']
const TEMP_OPTIONS = [
  { value: 'None', label: 'Normal', icon: null },
  { value: 'Ice', label: 'Ice', icon: '❄️' },
  { value: 'Hot', label: 'Hot', icon: '🔥' },
]

export default function Products() {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Semua')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const prods = await db.products.orderBy('name').toArray()
    setProducts(prods)
  }

  async function saveProduct(data) {
    if (editProduct) {
      await db.products.update(editProduct.id, data)
      toast.success('Produk berhasil diperbarui ✅')
    } else {
      await db.products.add(data)
      toast.success('Produk berhasil ditambahkan ✅')
    }
    setShowForm(false)
    setEditProduct(null)
    loadProducts()
  }

  async function deleteProduct(id) {
    await db.products.delete(id)
    toast.success('Produk dihapus')
    loadProducts()
  }

  async function toggleActive(id, current) {
    await db.products.update(id, { isActive: current ? 0 : 1 })
    loadProducts()
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'Semua' || p.category === filterCat
    return matchSearch && matchCat
  })

  return (
    <div className="products-page">
      <div className="products-header">
        <h2 className="page-title">📦 Kelola Produk</h2>
        <button className="btn btn-amber" onClick={() => { setEditProduct(null); setShowForm(true) }}>
          + Tambah Produk
        </button>
      </div>

      <div className="products-toolbar">
        <input
          className="input"
          placeholder="🔍 Cari produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div className="filter-tabs">
          {['Semua', ...CATEGORY_OPTIONS].map(c => (
            <button
              key={c}
              className={`filter-tab ${filterCat === c ? 'active' : ''}`}
              onClick={() => setFilterCat(c)}
            >{c}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📦" title="Belum ada produk" subtitle="Tambah produk pertama Anda"
          action={<button className="btn btn-amber" onClick={() => setShowForm(true)}>+ Tambah Produk</button>}
        />
      ) : (
        <div className="products-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga Langsung</th>
                <th>Harga Online</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="product-row-info">
                      <span className="product-row-emoji">{p.emoji || '☕'}</span>
                      <div className="product-row-name-wrap">
                        <span className="product-row-name">{p.name}</span>
                        {p.temp && p.temp !== 'None' && (
                          <span className={`temp-tag ${p.temp.toLowerCase()}`}>{p.temp}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-amber">{p.category}</span></td>
                  <td className="price-cell">{formatRp(p.priceDirect)}</td>
                  <td className="price-cell price-online">{formatRp(p.priceOnline)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`} style={{ minWidth: '75px', justifyContent: 'center' }}>
                        {p.isActive ? 'Aktif' : 'Non-aktif'}
                      </span>
                      <Toggle
                        id={`toggle-${p.id}`}
                        checked={!!p.isActive}
                        onChange={() => toggleActive(p.id, p.isActive)}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditProduct(p); setShowForm(true) }}>✏️ Edit</button>
                      <button className="btn btn-sm" style={{ background: 'var(--red-glow)', color: 'var(--red)' }} onClick={() => setConfirmId(p.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditProduct(null) }}
        onSave={saveProduct}
        initial={editProduct}
      />

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteProduct(confirmId)}
        title="Hapus Produk"
        message="Yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan."
        danger
      />
    </div>
  )
}

function ProductFormModal({ open, onClose, onSave, initial }) {
  const empty = { name: '', category: 'Kopi', temp: 'None', priceDirect: '', priceOnline: '', emoji: '☕', isActive: 1 }
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (initial) {
      setForm({ ...initial, priceDirect: String(initial.priceDirect), priceOnline: String(initial.priceOnline) })
    } else {
      setForm(empty)
    }
  }, [initial, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name || !form.priceDirect || !form.priceOnline) {
      toast.error('Nama dan harga wajib diisi!')
      return
    }
    onSave({
      name: form.name,
      category: form.category,
      temp: form.temp || 'None',
      priceDirect: parseInt(form.priceDirect, 10),
      priceOnline: parseInt(form.priceOnline, 10),
      emoji: form.emoji,
      isActive: form.isActive ? 1 : 0,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? '✏️ Edit Produk' : '➕ Tambah Produk'} maxWidth="520px"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn btn-amber" onClick={handleSubmit}>
          {initial ? 'Simpan Perubahan' : 'Tambah Produk'}
        </button>
      </>}
    >
      <div className="product-form">
        <div className="emoji-picker-row">
          <span className="selected-emoji">{form.emoji}</span>
          <div className="emoji-options">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                className={`emoji-opt ${form.emoji === e ? 'active' : ''}`}
                onClick={() => set('emoji', e)}
              >{e}</button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="prod-name">Nama Produk</label>
          <input id="prod-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Contoh: Es Kopi Susu" />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="prod-cat">Kategori</label>
          <select id="prod-cat" className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Tipe (Ice/Hot)</label>
          <div className="temp-selector">
            {TEMP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`temp-opt ${form.temp === opt.value ? 'active' : ''}`}
                onClick={() => set('temp', opt.value)}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="price-inputs">
          <div className="input-group">
            <label className="input-label" htmlFor="prod-price-d">🧍 Harga Langsung</label>
            <input id="prod-price-d" className="input" type="number" value={form.priceDirect} onChange={e => set('priceDirect', e.target.value)} placeholder="22000" />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="prod-price-o">🛵 Harga Online (GoFood/dll)</label>
            <input id="prod-price-o" className="input" type="number" value={form.priceOnline} onChange={e => set('priceOnline', e.target.value)} placeholder="27000" />
          </div>
        </div>

        {form.priceDirect && form.priceOnline && (
          <div className="price-diff-hint">
            💡 Selisih harga: <strong>{formatRp(Math.abs(parseInt(form.priceOnline || 0) - parseInt(form.priceDirect || 0)))}</strong>
          </div>
        )}

        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="input-label" style={{ marginBottom: 0 }}>Produk Aktif</label>
          <Toggle id="form-active" checked={!!form.isActive} onChange={v => set('isActive', v ? 1 : 0)} />
        </div>
      </div>
    </Modal>
  )
}
