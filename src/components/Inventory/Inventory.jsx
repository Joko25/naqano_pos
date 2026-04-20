import { useState, useEffect } from 'react'
import { db } from '../../db'
import { formatRp } from '../../utils/format'
import { 
  Package, ShoppingCart, Plus, Trash2, 
  Search, Loader2,
  Calendar, User, Tag
} from 'lucide-react'
import './Inventory.css'
 
const UNIT_GROUPS = {
  liquid: ['L', 'ml'],
  weight: ['kg', 'gr'],
  discrete: ['Pcs', 'Box']
}

const CONVERSION_FACTORS = {
  'L_ml': 1000,
  'ml_L': 0.001,
  'kg_gr': 1000,
  'gr_kg': 0.001,
}

function getConversionFactor(from, to) {
  if (from === to) return 1
  return CONVERSION_FACTORS[`${from}_${to}`] || 1
}

function calculateCost(mat, amount, unit) {
  if (!mat) return 0
  const factor = getConversionFactor(unit, mat.unit)
  const qty = mat.qty || 1
  return (mat.lastPrice / qty) * (amount * factor)
}

export default function Inventory() {
  const [tab, setTab] = useState('materials')
  const [materials, setMaterials] = useState([])
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editMaterial, setEditMaterial] = useState(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    loadData()
  }, [tab])

  async function loadData() {
    setLoading(true)
    if (tab === 'materials') {
      const data = await db.materials.toArray()
      setMaterials(data)
    } else if (tab === 'purchases') {
      const data = await db.purchases.orderBy('date').reverse().toArray()
      setPurchases(data)
    } else if (tab === 'recipes') {
      const prods = await db.products.toArray()
      const mats = await db.materials.toArray()
      const prodMats = await db.product_materials.toArray()
      
      const enrichedProds = prods.map(p => {
        const recipe = prodMats.filter(pm => pm.productId === p.id)
        const currentHpp = recipe.reduce((acc, curr) => {
          if (curr.type === 'manual') return acc + (curr.amount || 0)
          const mat = mats.find(m => m.id === curr.materialId)
          return acc + calculateCost(mat, curr.amount, curr.unit || mat?.unit)
        }, 0)
        return { ...p, recipe, currentHpp }
      })
      
      setProducts(enrichedProds)
      setMaterials(mats)
    }
    setLoading(false)
  }

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  async function updateGlobalHpp() {
    const prods = await db.products.toArray()
    const mats = await db.materials.toArray()
    const prodMats = await db.product_materials.toArray()

    for (const p of prods) {
      const recipe = prodMats.filter(pm => pm.productId === p.id)
      if (recipe.length === 0) continue

      const newHpp = recipe.reduce((acc, curr) => {
        if (curr.type === 'manual') return acc + (curr.amount || 0)
        const mat = mats.find(m => m.id === curr.materialId)
        return acc + calculateCost(mat, curr.amount, curr.unit || mat?.unit)
      }, 0)

      await db.products.update(p.id, { costPrice: newHpp })
    }
  }

  const handleSaveMaterial = async (data) => {
    if (editMaterial) {
      await db.materials.update(editMaterial.id, data)
    } else {
      await db.materials.add(data)
    }
    
    // Auto sync all product HPPs with new material prices
    await updateGlobalHpp()
    
    loadData()
    setEditMaterial(null)
    setShowMaterialModal(false)
  }

  const handleDeleteMaterial = async (id) => {
    if (confirm('Hapus bahan ini?')) {
      await db.materials.delete(id)
      loadData()
    }
  }

  const handleSaveRecipe = async (productId, recipeItems) => {
    // Clear existing recipe
    await db.product_materials.where('productId').equals(productId).delete()
    
    // Add new items
    if (recipeItems.length > 0) {
      await db.product_materials.bulkAdd(recipeItems.map(item => ({
        productId,
        type: item.type || 'material',
        name: item.name || '',
        materialId: item.materialId,
        amount: parseFloat(item.amount) || 0,
        unit: item.unit
      })))
    }

    // Calculate new HPP
    const mats = await db.materials.toArray()
    const newHpp = recipeItems.reduce((acc, curr) => {
      if (curr.type === 'manual') return acc + (parseFloat(curr.amount) || 0)
      const mat = mats.find(m => m.id === curr.materialId)
      return acc + calculateCost(mat, parseFloat(curr.amount) || 0, curr.unit)
    }, 0)

    // Update product costPrice
    await db.products.update(productId, { costPrice: newHpp })
    
    loadData()
    setShowRecipeModal(false)
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h2 className="page-title">
          <Package size={20} strokeWidth={2} /> Manajemen Bahan & Belanja
        </h2>
        <div className="inventory-tabs">
          <button className={`inv-tab ${tab === 'materials' ? 'active' : ''}`} onClick={() => setTab('materials')}>
            <Tag size={14} /> Bahan Baku
          </button>
          <button className={`inv-tab ${tab === 'purchases' ? 'active' : ''}`} onClick={() => setTab('purchases')}>
            <ShoppingCart size={14} /> Riwayat Belanja
          </button>
          <button className={`inv-tab ${tab === 'recipes' ? 'active' : ''}`} onClick={() => setTab('recipes')}>
            <Plus size={14} /> Master HPP
          </button>
        </div>
      </div>

      <div className="inventory-actions">
        <div className="search-box">
          <Search size={16} />
          <input 
            placeholder={
              tab === 'materials' ? "Cari bahan baku..." : 
              tab === 'recipes' ? "Cari produk / menu..." : 
              "Cari nota/supplier..."
            } 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {tab === 'materials' ? (
          <button className="btn btn-tosca btn-sm" onClick={() => setShowMaterialModal(true)}>
            <Plus size={14} /> Tambah Bahan
          </button>
        ) : tab === 'purchases' ? (
          <button className="btn btn-tosca btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Catat Belanja
          </button>
        ) : null}
      </div>

      <div className="inventory-content">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : tab === 'materials' ? (
          <MaterialTable 
            materials={filteredMaterials} 
            onEdit={(m) => { setEditMaterial(m); setShowMaterialModal(true); }}
            onDelete={handleDeleteMaterial}
          />
        ) : tab === 'purchases' ? (
          <PurchaseTable purchases={purchases} />
        ) : (
          <RecipeTable 
            products={filteredProducts} 
            materials={materials}
            onEditRecipe={(p) => {
              setSelectedProduct(p)
              setShowRecipeModal(true)
            }}
          />
        )}
      </div>

      {showMaterialModal && (
        <MaterialModal 
          initial={editMaterial}
          onClose={() => { setShowMaterialModal(false); setEditMaterial(null); }}
          onSave={handleSaveMaterial}
        />
      )}

      {showModal && (
        <PurchaseModal 
          materials={materials} 
          onClose={() => setShowModal(false)} 
          onSave={loadData}
        />
      )}

      {showRecipeModal && selectedProduct && (
        <RecipeModal 
          product={selectedProduct}
          materials={materials}
          onClose={() => setShowRecipeModal(false)}
          onSave={handleSaveRecipe}
        />
      )}
    </div>
  )
}

function MaterialTable({ materials, onEdit, onDelete }) {
  if (materials.length === 0) return <div className="empty-state">Belum ada bahan baku tercatat.</div>

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Nama Bahan</th>
            <th>Stok Saat Ini</th>
            <th>Harga Beli Terakhir</th>
            <th className="text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.id}>
              <td><div className="material-icon-box">{m.name.charAt(0)}</div></td>
              <td data-label="Bahan"><strong>{m.name}</strong><br/><small>{m.qty || 1} {m.unit}</small></td>
              <td data-label="Stok">
                <span className={`stock-badge ${m.stock < 5 ? 'low' : ''}`}>
                  {m.stock} Unit
                </span>
              </td>
              <td data-label="Harga">{formatRp(m.lastPrice || 0)}</td>
              <td data-label="Aksi" className="text-center">
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button className="btn-icon btn-amber" onClick={() => onEdit(m)}>
                       ✏️
                    </button>
                    <button className="btn-icon btn-red" onClick={() => onDelete(m.id)}>
                       <Trash2 size={14} />
                    </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MaterialModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', unit: 'Pcs', qty: '1', stock: '0', lastPrice: '0' })

  useEffect(() => {
    if (initial) setForm({ 
      ...initial, 
      qty: String(initial.qty || 1), 
      stock: String(initial.stock || 0), 
      lastPrice: String(initial.lastPrice || 0) 
    })
  }, [initial])

  const handleNumChange = (field, val) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setForm(f => ({ ...f, [field]: val }))
    }
  }

  const handleSubmit = () => {
    onSave({
      ...form,
      qty: parseFloat(form.qty) || 0,
      stock: parseFloat(form.stock) || 0,
      lastPrice: parseFloat(form.lastPrice) || 0
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">{initial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label" htmlFor="mat-name">Nama Bahan</label>
            <input id="mat-name" className="input" placeholder="Contoh: Susu Ultra 1L" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="price-inputs">
            <div className="input-group">
              <label className="input-label" htmlFor="mat-qty">Qty per Satuan</label>
              <input 
                id="mat-qty" 
                className="input" 
                type="text" 
                inputMode="decimal"
                value={form.qty} 
                onChange={e => handleNumChange('qty', e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="mat-unit">Satuan</label>
              <select id="mat-unit" className="select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                <option value="Pcs">Pcs</option>
                <option value="kg">Kg</option>
                <option value="gr">Gram</option>
                <option value="L">Liter</option>
                <option value="ml">Mililtir</option>
                <option value="Box">Box</option>
              </select>
            </div>
          </div>
          <div className="price-inputs">
             <div className="input-group">
                <label className="input-label" htmlFor="mat-stock">Stok Saat Ini (Pcs/Botol)</label>
                <input 
                  id="mat-stock" 
                  className="input" 
                  type="text" 
                  inputMode="decimal"
                  value={form.stock} 
                  onChange={e => handleNumChange('stock', e.target.value)} 
                />
             </div>
             <div className="input-group">
                <label className="input-label" htmlFor="mat-price">Harga Beli per Satuan</label>
                <input 
                  id="mat-price" 
                  className="input" 
                  type="text" 
                  inputMode="decimal"
                  value={form.lastPrice} 
                  onChange={e => handleNumChange('lastPrice', e.target.value)} 
                />
             </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-8px' }}>
            💡 HPP akan dihitung: ({formatRp(parseFloat(form.lastPrice) || 0)} / {form.qty} {form.unit}) per pemakaian.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-tosca" onClick={handleSubmit}>Simpan Bahan</button>
        </div>
      </div>
    </div>
  )
}

function PurchaseTable({ purchases }) {
  if (purchases.length === 0) return <div className="empty-state">Belum ada riwayat belanja.</div>

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Supplier</th>
            <th>Total Belanja</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map(p => (
            <tr key={p.id}>
              <td data-label="Tanggal">{new Date(p.date).toLocaleDateString('id-ID')}</td>
              <td data-label="Supplier">{p.supplier}</td>
              <td data-label="Total" className="text-bold">{formatRp(p.total)}</td>
              <td data-label="Note">{p.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PurchaseModal({ materials, onClose, onSave }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    total: '',
    itemsSummary: '',
    notes: ''
  })

  const handleNumChange = (val) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setForm({ ...form, total: val })
    }
  }

  const handleSubmit = async () => {
    if (!form.supplier || !form.total) return alert('Lengkapi data belanja')
    
    const amount = parseFloat(form.total) || 0

    // Add to purchases
    await db.purchases.add({
      date: form.date,
      supplier: form.supplier,
      total: amount,
      notes: form.notes
    })

    // Also record as an expense
    await db.expenses.add({
      date: form.date,
      category: 'Pembelian Bahan',
      amount: amount,
      description: `Belanja di ${form.supplier}: ${form.notes}`
    })

    onSave()
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Catat Belanja Baru</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label" htmlFor="p-date"><Calendar size={14} /> Tanggal Nota</label>
            <input id="p-date" className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="p-sup"><User size={14} /> Supplier / Nama Toko</label>
            <input id="p-sup" className="input" placeholder="Contoh: Global Supplies / Indomaret" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="p-total">💰 Total Pengeluaran (Rp)</label>
            <input 
              id="p-total" 
              className="input" 
              type="text" 
              inputMode="decimal"
              placeholder="450000" 
              value={form.total} 
              onChange={e => handleNumChange(e.target.value)} 
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="p-notes">📝 Keterangan Barang</label>
            <textarea 
              id="p-notes"
              className="textarea" 
              placeholder="Contoh: Susu 10 kotak, Gula 5kg..." 
              value={form.notes} 
              onChange={e => setForm({...form, notes: e.target.value})}
              rows={3}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-tosca" onClick={handleSubmit}>Simpan Nota Belanja</button>
        </div>
      </div>
    </div>
  )
}

function RecipeTable({ products, materials, onEditRecipe }) {
  if (products.length === 0) return <div className="empty-state">Belum ada produk. Silahkan tambah produk di menu Produk.</div>

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Produk</th>
            <th>Bahan Baku (Resep)</th>
            <th className="text-right">Harga Modal (HPP)</th>
            <th className="text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong><br/><small className="badge badge-amber">{p.category}</small></td>
              <td data-label="Resep">
                <div className="recipe-brief">
                  {p.recipe.length > 0 ? (
                    p.recipe.map(pm => {
                      if (pm.type === 'manual') return (
                        <span key={pm.id} className="recipe-tag badge-amber">
                          {pm.name || 'Lainnya'} ({formatRp(pm.amount)})
                        </span>
                      )
                      const mat = materials.find(m => m.id === pm.materialId)
                      return (
                        <span key={pm.id} className="recipe-tag">
                          {mat?.name} ({pm.amount} {pm.unit || mat?.unit})
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-muted" style={{ fontSize: '11px' }}>Resep belum diatur</span>
                  )}
                </div>
              </td>
              <td data-label="HPP" className="text-right text-bold">{formatRp(p.currentHpp || 0)}</td>
              <td data-label="Aksi" className="text-center">
                <button className="btn btn-tosca btn-sm" onClick={() => onEditRecipe(p)}>
                  Atur Resep
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecipeModal({ product, materials, onClose, onSave }) {
  const [items, setItems] = useState(() => {
    return product.recipe.map(r => ({ 
      type: r.type || 'material',
      name: r.name || '',
      materialId: r.materialId, 
      amount: String(r.amount || 0),
      unit: r.unit || materials.find(m => m.id === r.materialId)?.unit || 'Pcs'
    }))
  })

  const handleAddItem = (type = 'material') => {
    const firstMat = materials[0]
    setItems([...items, { 
      type, 
      name: type === 'manual' ? 'Biaya Kemasan/Lain' : '',
      materialId: type === 'material' ? firstMat?.id : null, 
      amount: '0', 
      unit: type === 'material' ? (firstMat?.unit || 'Pcs') : '-' 
    }])
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, key, val) => {
    const newItems = [...items]
    
    if (key === 'amount') {
      if (val !== '' && !/^\d*\.?\d*$/.test(val)) return
    }

    newItems[index][key] = val
    
    if (key === 'materialId' && newItems[index].type === 'material') {
      const mat = materials.find(m => m.id === val)
      if (mat) newItems[index].unit = mat.unit
    }
    
    setItems(newItems)
  }

  const totalHpp = items.reduce((acc, curr) => {
    const amt = parseFloat(curr.amount) || 0
    if (curr.type === 'manual') return acc + amt
    const mat = materials.find(m => m.id === curr.materialId)
    return acc + calculateCost(mat, amt, curr.unit)
  }, 0)

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
             <span className="modal-title">Atur Resep: {product.name}</span>
             <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Tentukan bahan baku & biaya lainnya</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="recipe-editor-list">
            {items.map((item, idx) => {
               if (item.type === 'manual') {
                 return (
                  <div key={idx} className="recipe-item-row">
                    <div style={{ flex: 2, display: 'flex', gap: 8 }}>
                      <span className="badge badge-amber" style={{ fontSize: '10px' }}>Lainnya</span>
                      <input 
                        className="input" 
                        placeholder="Nama biaya (misal: Kemasan)" 
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div className="amount-input-wrap">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        className="input" 
                        style={{ width: 146 }} 
                        placeholder="Harga (Rp)"
                        value={item.amount}
                        onChange={e => updateItem(idx, 'amount', e.target.value)}
                      />
                    </div>
                    <button className="btn-icon btn-red" onClick={() => handleRemoveItem(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                 )
               }

               const mat = materials.find(m => m.id === item.materialId)
               let availableUnits = [mat?.unit]
               Object.values(UNIT_GROUPS).forEach(group => {
                 if (group.includes(mat?.unit)) availableUnits = group
               })

               return (
                <div key={idx} className="recipe-item-row">
                  <select 
                    className="select" 
                    style={{ flex: 2 }}
                    value={item.materialId}
                    onChange={e => updateItem(idx, 'materialId', Number(e.target.value))}
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({formatRp(m.lastPrice)}/{m.unit})</option>
                    ))}
                  </select>
                  <div className="amount-input-wrap">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      className="input" 
                      style={{ width: 70 }} 
                      value={item.amount}
                      onChange={e => updateItem(idx, 'amount', e.target.value)}
                    />
                    <select 
                      className="select-sm" 
                      style={{ width: 70, fontSize: '11px' }}
                      value={item.unit}
                      onChange={e => updateItem(idx, 'unit', e.target.value)}
                    >
                      {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <button className="btn-icon btn-red" onClick={() => handleRemoveItem(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
               )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => handleAddItem('material')}>
              + Bahan Baku
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleAddItem('manual')}>
              + Biaya Lainnya
            </button>
          </div>

          <div className="recipe-summary-box">
             <div className="summary-row">
                <span>Total HPP Terhitung:</span>
                <span className="text-bold">{formatRp(totalHpp)}</span>
             </div>
             <div className="summary-row">
                <span>Harga Jual (Direct):</span>
                <span>{formatRp(product.priceDirect)}</span>
             </div>
             <div className="summary-row margin-row">
                <span>Margin Keuntungan:</span>
                <span className="badge badge-green">
                  {product.priceDirect > 0 ? Math.round(((product.priceDirect - totalHpp) / product.priceDirect) * 100) : 0}%
                </span>
             </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-tosca" onClick={() => onSave(product.id, items)}>Simpan Resep & Update HPP</button>
        </div>
      </div>
    </div>
  )
}
