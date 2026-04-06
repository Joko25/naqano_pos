import { useState, useEffect } from 'react'
import { db } from '../../db'
import { formatRp } from '../../utils/format'
import { 
  Package, ShoppingCart, Plus, Trash2, 
  Search, Loader2,
  Calendar, User, Tag
} from 'lucide-react'
import './Inventory.css'

export default function Inventory() {
  const [tab, setTab] = useState('materials')
  const [materials, setMaterials] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [tab])

  async function loadData() {
    setLoading(true)
    if (tab === 'materials') {
      const data = await db.materials.toArray()
      setMaterials(data)
    } else {
      const data = await db.purchases.orderBy('date').reverse().toArray()
      setPurchases(data)
    }
    setLoading(false)
  }

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddMaterial = async (newM) => {
    await db.materials.add(newM)
    loadData()
    setShowMaterialModal(false)
  }

  const handleDeleteMaterial = async (id) => {
    if (confirm('Hapus bahan ini?')) {
      await db.materials.delete(id)
      loadData()
    }
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
        </div>
      </div>

      <div className="inventory-actions">
        <div className="search-box">
          <Search size={16} />
          <input 
            placeholder={tab === 'materials' ? "Cari bahan baku..." : "Cari nota/supplier..."} 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {tab === 'materials' ? (
          <button className="btn btn-tosca btn-sm" onClick={() => setShowMaterialModal(true)}>
            <Plus size={14} /> Tambah Bahan
          </button>
        ) : (
          <button className="btn btn-tosca btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Catat Belanja
          </button>
        )}
      </div>

      <div className="inventory-content">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : tab === 'materials' ? (
          <MaterialTable 
            materials={filteredMaterials} 
            onDelete={handleDeleteMaterial}
          />
        ) : (
          <PurchaseTable purchases={purchases} />
        )}
      </div>

      {showMaterialModal && (
        <MaterialModal 
          onClose={() => setShowMaterialModal(false)}
          onSave={handleAddMaterial}
        />
      )}

      {showModal && (
        <PurchaseModal 
          materials={materials} 
          onClose={() => setShowModal(false)} 
          onSave={loadData}
        />
      )}
    </div>
  )
}

function MaterialTable({ materials, onDelete }) {
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
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.id}>
              <td><div className="material-icon-box">{m.name.charAt(0)}</div></td>
              <td><strong>{m.name}</strong><br/><small>{m.unit}</small></td>
              <td>
                <span className={`stock-badge ${m.stock < 5 ? 'low' : ''}`}>
                  {m.stock} {m.unit}
                </span>
              </td>
              <td>{formatRp(m.lastPrice)}</td>
              <td>
                <button className="btn-icon btn-red" onClick={() => onDelete(m.id)}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
              <td>{new Date(p.date).toLocaleDateString('id-ID')}</td>
              <td>{p.supplier}</td>
              <td className="text-bold">{formatRp(p.total)}</td>
              <td>{p.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MaterialModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', unit: 'Pcs', stock: 0, lastPrice: 0 })

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Tambah Bahan Baku</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label" htmlFor="mat-name">Nama Bahan</label>
            <input id="mat-name" className="input" placeholder="Contoh: Susu Ultra 1L" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="mat-unit">Satuan</label>
            <select id="mat-unit" className="select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
              <option value="Pcs">Pcs</option>
              <option value="kg">Kg</option>
              <option value="gr">Gram</option>
              <option value="L">Liter</option>
              <option value="ml">Mililtir</option>
              <option value="Box">Box / Dus</option>
            </select>
          </div>
          <div className="price-inputs">
             <div className="input-group">
                <label className="input-label" htmlFor="mat-stock">Stok Awal</label>
                <input id="mat-stock" className="input" type="number" value={form.stock} onChange={e => setForm({...form, stock: Number.parseInt(e.target.value) || 0})} />
             </div>
             <div className="input-group">
                <label className="input-label" htmlFor="mat-price">Harga Beli</label>
                <input id="mat-price" className="input" type="number" value={form.lastPrice} onChange={e => setForm({...form, lastPrice: Number.parseInt(e.target.value) || 0})} />
             </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-tosca" onClick={() => onSave(form)}>Simpan Bahan</button>
        </div>
      </div>
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

  const handleSubmit = async () => {
    if (!form.supplier || !form.total) return alert('Lengkapi data belanja')
    
    // Add to purchases
    await db.purchases.add({
      date: form.date,
      supplier: form.supplier,
      total: Number.parseInt(form.total),
      notes: form.notes
    })

    // Also record as an expense
    await db.expenses.add({
      date: form.date,
      category: 'Pembelian Bahan',
      amount: Number.parseInt(form.total),
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
            <input id="p-total" className="input" type="number" placeholder="450000" value={form.total} onChange={e => setForm({...form, total: e.target.value})} />
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
