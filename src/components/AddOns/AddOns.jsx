import { useState, useEffect } from 'react'
import { db } from '../../db'
import { Modal, ConfirmModal, EmptyState, Toggle, toast } from '../ui'
import './AddOns.css'

export default function AddOns() {
  const [addons, setAddons] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editAddon, setEditAddon] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const data = await db.addons.orderBy('name').toArray()
    setAddons(data)
  }

  async function saveAddon(data) {
    if (editAddon) {
      await db.addons.update(editAddon.id, data)
      toast.success('Add-On berhasil diperbarui ✅')
    } else {
      await db.addons.add(data)
      toast.success('Add-On berhasil ditambahkan ✅')
    }
    setShowForm(false)
    setEditAddon(null)
    loadAll()
  }

  async function deleteAddon(id) {
    await db.addons.delete(id)
    toast.success('Add-On dihapus')
    loadAll()
  }

  async function toggleStatus(id, current) {
    await db.addons.update(id, { isActive: current ? 0 : 1 })
    toast.info(`Add-On ${current ? 'dinonaktifkan' : 'diaktifkan'}`)
    loadAll()
  }

  return (
    <div className="addons-page">
      <div className="addons-header">
        <h2 className="page-title">➕ Master Add-On</h2>
        <button
          className="btn btn-amber"
          onClick={() => { setEditAddon(null); setShowForm(true) }}
        >
          + Tambah Add-On
        </button>
      </div>

      {addons.length === 0 ? (
        <EmptyState
          icon="➕"
          title="Belum ada Add-On"
          subtitle="Tambah pilihan tambahan (seperti Extra Shot, Extra Susu) untuk pesanan."
          action={
            <button className="btn btn-amber" onClick={() => setShowForm(true)}>
              + Tambah Add-On
            </button>
          }
        />
      ) : (
        <div className="addon-grid">
          {addons.map(addon => (
            <div key={addon.id} className={`addon-card ${addon.isActive ? '' : 'inactive'}`}>
              <div className="addon-info">
                <div className="addon-name">{addon.name}</div>
                <div className="addon-price">Rp {addon.price.toLocaleString('id-ID')}</div>
              </div>
              <div className="addon-actions">
                <div className="addon-toggle">
                  <span className="text-xs">{addon.isActive ? 'Aktif' : 'Nonaktif'}</span>
                  <Toggle
                    id={`tgl-${addon.id}`}
                    checked={addon.isActive === 1}
                    onChange={() => toggleStatus(addon.id, addon.isActive)}
                  />
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setEditAddon(addon); setShowForm(true) }}
                >
                  ✏️
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--red-glow)', color: 'var(--red)' }}
                  onClick={() => setConfirmId(addon.id)}
                  title="Hapus Add-On"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddonFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditAddon(null) }}
        onSave={saveAddon}
        initial={editAddon}
      />

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteAddon(confirmId)}
        title="Hapus Add-On"
        message="Yakin ingin menghapus Add-On ini?"
        danger
      />
    </div>
  )
}

function AddonFormModal({ open, onClose, onSave, initial }) {
  const empty = { name: '', price: 0, isActive: 1 }
  const [form, setForm] = useState(empty)

  useEffect(() => {
    setForm(initial ? { name: initial.name, price: initial.price, isActive: initial.isActive } : empty)
  }, [initial, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Nama Add-On wajib diisi!')
      return
    }
    onSave({ name: form.name.trim(), price: Number(form.price) || 0, isActive: form.isActive })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '✏️ Edit Add-On' : '➕ Tambah Add-On'}
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
      <div className="addon-form">
        <div className="input-group">
          <label className="input-label" htmlFor="addon-name">Nama Add-On</label>
          <input
            id="addon-name"
            className="input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Contoh: Extra Espresso"
            autoFocus
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="addon-price">Harga (Rp)</label>
          <input
            id="addon-price"
            type="number"
            className="input"
            value={form.price || ''}
            onChange={e => set('price', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <label className="input-label" style={{ marginBottom: 0 }}>Status Aktif</label>
          <Toggle
            id="addon-active"
            checked={form.isActive === 1}
            onChange={v => set('isActive', v ? 1 : 0)}
          />
        </div>
      </div>
    </Modal>
  )
}
