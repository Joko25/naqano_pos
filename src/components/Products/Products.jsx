import { useState, useEffect } from 'react'
import { db } from '../../db'
import { formatRp } from '../../utils/format'
import { Modal, Toggle, ConfirmModal, EmptyState, toast } from '../ui'
import './Products.css'
const EMOJI_OPTIONS = ['☕', '🧋', '🍵', '🍫', '🧃', '🍞', '🥐', '🍪', '🧁', '🍰', '🥤', '🫖']
const TEMP_OPTIONS = [
  { value: 'None', label: 'Normal', icon: null },
  { value: 'Ice', label: 'Ice', icon: '❄️' },
  { value: 'Hot', label: 'Hot', icon: '🔥' },
]

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Semua')

  useEffect(() => { loadProducts(); loadCategories() }, [])

  async function loadCategories() {
    const cats = await db.categories.orderBy('name').toArray()
    setCategories(cats)
  }

  async function loadProducts() {
    const prods = await db.products.orderBy('name').toArray()
    const prodMats = await db.product_materials.toArray()
    
    const enriched = prods.map(p => ({
      ...p,
      hasRecipe: prodMats.some(pm => pm.productId === p.id)
    }))
    setProducts(enriched)
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
          {['Semua', ...categories.map(c => c.name)].map(c => (
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
                <th>Margin</th>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        M: {formatRp(p.costPrice || 0)}
                        {p.hasRecipe && <span className="badge badge-green" style={{ fontSize: '9px', padding: '1px 4px' }}>Resep ✨</span>}
                      </span>
                      <span className={`badge ${((p.priceDirect - (p.costPrice || 0)) / (p.priceDirect || 1)) > 0.4 ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                        {Math.round(((p.priceDirect - (p.costPrice || 0)) / (p.priceDirect || 1)) * 100)}% Margin
                      </span>
                    </div>
                  </td>
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
        categories={categories}
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

function ProductFormModal({ open, onClose, onSave, initial, categories = [] }) {
  const defaultCat = categories[0]?.name || 'Kopi'
  const empty = { name: '', category: defaultCat, temp: 'None', priceDirect: '', priceOnline: '', costPrice: '', emoji: '☕', isActive: 1 }
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (initial) {
      setForm({ ...initial, priceDirect: String(initial.priceDirect), priceOnline: String(initial.priceOnline), costPrice: String(initial.costPrice || '') })
    } else {
      setForm(empty)
    }
  }, [initial, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleNumChange = (field, val) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      set(field, val)
    }
  }

  const handleSubmit = () => {
    if (!form.name || !form.priceDirect || !form.priceOnline) {
      toast.error('Nama dan harga wajib diisi!')
      return
    }
    onSave({
      name: form.name,
      category: form.category,
      temp: form.temp || 'None',
      priceDirect: parseFloat(form.priceDirect) || 0,
      priceOnline: parseFloat(form.priceOnline) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
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
          <input id="prod-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Contoh: Es Kopi Susu" autoFocus />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="prod-cat">Kategori</label>
          <select id="prod-cat" className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
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
            <input 
              id="prod-price-d" 
              className="input" 
              type="text" 
              inputMode="decimal"
              value={form.priceDirect} 
              onChange={e => handleNumChange('priceDirect', e.target.value)} 
              placeholder="22000" 
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="prod-price-o">🛵 Harga Online (GoFood/dll)</label>
            <input 
              id="prod-price-o" 
              className="input" 
              type="text" 
              inputMode="decimal"
              value={form.priceOnline} 
              onChange={e => handleNumChange('priceOnline', e.target.value)} 
              placeholder="27000" 
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="prod-cost">💰 Harga Modal (HPP)</label>
          <input 
            id="prod-cost" 
            className="input" 
            type="text" 
            inputMode="decimal"
            value={form.costPrice} 
            onChange={e => handleNumChange('costPrice', e.target.value)} 
            placeholder="8000" 
          />
          {parseFloat(form.costPrice) > 0 && (
            <div className="pricing-advice">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                 <span>Rekomendasi Jual:</span>
                 <strong className="text-amber">{formatRp(Math.ceil((parseFloat(form.costPrice) / 0.35) / 500) * 500)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                 <span>Margin Saat Ini:</span>
                 <span className={((parseFloat(form.priceDirect) - parseFloat(form.costPrice)) / parseFloat(form.priceDirect) * 100) < 50 ? 'text-red' : 'text-green'}>
                   {form.priceDirect > 0 ? Math.round(((parseFloat(form.priceDirect) - parseFloat(form.costPrice)) / parseFloat(form.priceDirect)) * 100) : 0}%
                 </span>
              </div>
            </div>
          )}
        </div>

        {form.priceDirect && form.priceOnline && (
          <div className="price-diff-hint">
            💡 Selisih harga: <strong>{formatRp(Math.abs(parseFloat(form.priceOnline || 0) - parseFloat(form.priceDirect || 0)))}</strong>
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
