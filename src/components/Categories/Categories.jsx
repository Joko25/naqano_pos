import { useState, useEffect } from 'react'
import { db } from '../../db'
import { Modal, ConfirmModal, EmptyState, toast } from '../ui'
import './Categories.css'

const ICON_OPTIONS = [
  '☕', '🧃', '🍞', '🍪', '🧁', '🍰', '🥤', '🫖', '🍵', '🍫',
  '🥐', '🍳', '🍜', '🍝', '🥗', '🍕', '🍔', '🌮', '🥩', '🍱',
  '🧇', '🥞', '🍩', '🍦', '🍮', '🥛', '🍺', '🍹', '🧋', '🫗',
]

export default function Categories({ role }) {
  const isCashier = role === 'CASHIER'
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [productCounts, setProductCounts] = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const cats = await db.categories.orderBy('name').toArray()
    setCategories(cats)

    // Hitung jumlah produk per kategori
    const prods = await db.products.toArray()
    const counts = {}
    prods.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1
    })
    setProductCounts(counts)
  }

  async function saveCat(data) {
    if (editCat) {
      await db.categories.update(editCat.id, data)
      toast.success('Kategori berhasil diperbarui ✅')
    } else {
      await db.categories.add(data)
      toast.success('Kategori berhasil ditambahkan ✅')
    }
    setShowForm(false)
    setEditCat(null)
    loadAll()
  }

  async function deleteCat(id) {
    const cat = categories.find(c => c.id === id)
    const count = productCounts[cat?.name] || 0
    if (count > 0) {
      toast.error(`Tidak bisa hapus — ada ${count} produk di kategori ini!`)
      setConfirmId(null)
      return
    }
    await db.categories.delete(id)
    toast.success('Kategori dihapus')
    loadAll()
  }

  return (
    <div className="categories-page">
      <div className="categories-header">
        <h2 className="page-title">🗂️ Master Kategori</h2>
        {!isCashier && (
          <button
            className="btn btn-amber"
            onClick={() => { setEditCat(null); setShowForm(true) }}
          >
            + Tambah Kategori
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Belum ada kategori"
          subtitle="Tambah kategori untuk mengorganisir produk Anda"
          action={!isCashier && (
            <button className="btn btn-amber" onClick={() => setShowForm(true)}>
              + Tambah Kategori
            </button>
          )}
        />
      ) : (
        <div className="cat-grid">
          {categories.map(cat => {
            const count = productCounts[cat.name] || 0
            return (
              <div key={cat.id} className="cat-card">
                <div className="cat-icon">{cat.icon || '📦'}</div>
                <div className="cat-info">
                  <div className="cat-name">{cat.name}</div>
                  <div className="cat-count">
                    {count} produk
                  </div>
                </div>
                {!isCashier && (
                  <div className="cat-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditCat(cat); setShowForm(true) }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--red-glow)', color: 'var(--red)' }}
                      onClick={() => setConfirmId(cat.id)}
                      disabled={count > 0}
                      title={count > 0 ? `Tidak bisa hapus — ada ${count} produk` : 'Hapus kategori'}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CategoryFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditCat(null) }}
        onSave={saveCat}
        initial={editCat}
      />

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteCat(confirmId)}
        title="Hapus Kategori"
        message="Yakin ingin menghapus kategori ini?"
        danger
      />
    </div>
  )
}

function CategoryFormModal({ open, onClose, onSave, initial }) {
  const empty = { name: '', icon: '☕' }
  const [form, setForm] = useState(empty)

  useEffect(() => {
    setForm(initial ? { name: initial.name, icon: initial.icon || '☕' } : empty)
  }, [initial, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Nama kategori wajib diisi!')
      return
    }
    onSave({ name: form.name.trim(), icon: form.icon })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '✏️ Edit Kategori' : '➕ Tambah Kategori'}
      maxWidth="420px"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-amber" onClick={handleSubmit}>
            {initial ? 'Simpan' : 'Tambah'}
          </button>
        </>
      }
    >
      <div className="cat-form">
        <div className="cat-form-preview">
          <span className="cat-form-icon">{form.icon}</span>
          <span className="cat-form-name-preview">{form.name || 'Nama Kategori'}</span>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="cat-name">Nama Kategori</label>
          <input
            id="cat-name"
            className="input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Contoh: Minuman Segar"
            autoFocus
          />
        </div>

        <div className="input-group">
          <label className="input-label">Icon / Emoji</label>
          <div className="cat-icon-grid">
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                className={`cat-icon-opt ${form.icon === icon ? 'active' : ''}`}
                onClick={() => set('icon', icon)}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
