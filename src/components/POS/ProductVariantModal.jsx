import { useState, useEffect } from 'react'
import { Modal, Toggle } from '../ui'
import { formatRp } from '../../utils/format'
import { db } from '../../db'

const ICE_OPTIONS = ['Normal Ice', 'Less Ice', 'No Ice']
const SWEETNESS_OPTIONS = ['Normal Sweet', 'Less Sweet', 'No Sugar']

export default function ProductVariantModal({ product, open, onClose, onAdd, orderType }) {
  const [ice, setIce] = useState('Normal Ice')
  const [sweetness, setSweetness] = useState('Normal Sweet')
  const [addons, setAddons] = useState([]) // all active addons from db
  const [selectedAddons, setSelectedAddons] = useState({}) // { [addonId]: quantity }

  useEffect(() => {
    if (open) {
      db.addons.where('isActive').equals(1).toArray().then(setAddons)
      setIce('Normal Ice')
      setSweetness('Normal Sweet')
      setSelectedAddons({})
    }
  }, [open])

  if (!product) return null

  const price = orderType === 'online' ? product.priceOnline : product.priceDirect
  
  // Calculate total addons price
  const addonsTotal = addons.reduce((sum, addon) => {
    const qty = selectedAddons[addon.id] || 0
    return sum + (addon.price * qty)
  }, 0)

  const handleAddAddon = (id) => {
    setSelectedAddons(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const handleRemoveAddon = (id) => {
    setSelectedAddons(prev => {
      const current = prev[id] || 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: current - 1 }
    })
  }

  const handleConfirm = () => {
    const finalAddons = addons
      .filter(a => selectedAddons[a.id])
      .map(a => ({ id: a.id, name: a.name, price: a.price, qty: selectedAddons[a.id] }))
      
    // Build variants string (notes)
    const variants = []
    if (product.category === 'Kopi' || product.category === 'Non-Kopi') {
      if (product.temp === 'Ice' || product.temp === 'Ice/Hot') {
        variants.push(ice)
      }
      variants.push(sweetness)
    }

    onAdd({
      ...product,
      variants, // array of string variants
      selectedAddons: finalAddons // array of {id, name, price, qty}
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Tambahkan ke Pesanan`}
      maxWidth="480px"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-amber" onClick={handleConfirm}>
            Tambah — {formatRp(price + addonsTotal)}
          </button>
        </>
      }
    >
      <div className="variant-modal">
        <div className="variant-product-info">
          <div className="variant-product-name">{product.name}</div>
          <div className="variant-product-price">{formatRp(price)}</div>
        </div>

        {(product.category === 'Kopi' || product.category === 'Non-Kopi') && (
          <>
            {(product.temp === 'Ice' || product.temp === 'Ice/Hot') && (
              <div className="variant-section">
                <div className="variant-section-title">🧊 Level Es</div>
                <div className="variant-options">
                  {ICE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      className={`variant-opt ${ice === opt ? 'active' : ''}`}
                      onClick={() => setIce(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="variant-section">
              <div className="variant-section-title">🍯 Tingkat Manis</div>
              <div className="variant-options">
                {SWEETNESS_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    className={`variant-opt ${sweetness === opt ? 'active' : ''}`}
                    onClick={() => setSweetness(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="variant-section">
          <div className="variant-section-title">➕ Add-Ons</div>
          {addons.length === 0 ? (
            <div className="text-muted text-sm">Tidak ada add-ons yang aktif</div>
          ) : (
            <div className="variant-addons-list">
              {addons.map(addon => {
                const qty = selectedAddons[addon.id] || 0
                return (
                  <div key={addon.id} className="variant-addon-item">
                    <div className="variant-addon-info">
                      <div className="variant-addon-name">{addon.name}</div>
                      <div className="variant-addon-price">+ {formatRp(addon.price)}</div>
                    </div>
                    <div className="qty-control variant-qty-control">
                      {qty > 0 ? (
                        <>
                          <button className="qty-btn" onClick={() => handleRemoveAddon(addon.id)}>−</button>
                          <span className="qty-value">{qty}</span>
                          <button className="qty-btn" onClick={() => handleAddAddon(addon.id)}>+</button>
                        </>
                      ) : (
                        <button className="btn-addon-add" onClick={() => handleAddAddon(addon.id)}>Tambah</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
