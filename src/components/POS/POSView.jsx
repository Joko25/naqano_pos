import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { db } from '../../db'
import { useCartStore } from '../../store/cartStore'
import { formatRp } from '../../utils/format'
import {
  GoFoodLogo,
  GrabFoodLogo,
  ShopeeFoodLogo,
  DirectOrderIcon,
  OnlineOrderIcon,
} from '../ui/PlatformLogos'
import ProductVariantModal from './ProductVariantModal'
import './POS.css'


const PLATFORM_CONFIG = [
  { id: 'gofood', Logo: GoFoodLogo, label: 'GoFood' },
  { id: 'grabfood', Logo: GrabFoodLogo, label: 'GrabFood' },
  { id: 'shopeefood', Logo: ShopeeFoodLogo, label: 'ShopeeFood' },
]

export default function POSView() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { addItem, orderType, setOrderType, platform, setPlatform } = useCartStore()

  useEffect(() => {
    async function loadProducts() {
      const all = await db.products.toArray()
      setProducts(all.filter(p => !!p.isActive))
    }
    async function loadCategories() {
      const cats = await db.categories.orderBy('name').toArray()
      setCategories(cats)
    }
    loadProducts()
    loadCategories()
    const interval = setInterval(loadProducts, 3000)
    return () => clearInterval(interval)
  }, [])

  const filtered = products.filter(p => {
    const matchCat = category === 'Semua' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleAddItem = useCallback((product) => {
    if (product.category === 'Kopi' || product.category === 'Non-Kopi') {
      setSelectedProduct(product)
    } else {
      // Direct add without variants
      addItem({ ...product, variants: [], selectedAddons: [] })
    }
  }, [addItem])

  const handleConfirmAdd = useCallback((productWithVariants) => {
    addItem(productWithVariants)
  }, [addItem])

  return (
    <div className="pos-view">
      {/* Order Type Selector */}
      <div className="order-type-bar">
        <div className="order-type-label">Tipe Pesanan:</div>
        <div className="order-type-btns">
          <button
            className={`order-type-btn ${orderType === 'direct' ? 'active' : ''}`}
            onClick={() => setOrderType('direct')}
          >
            <DirectOrderIcon size={16} color={orderType === 'direct' ? 'var(--tosca-dark)' : 'var(--text-secondary)'} />
            Langsung
          </button>
          <button
            className={`order-type-btn ${orderType === 'online' ? 'active-online' : ''}`}
            onClick={() => setOrderType('online')}
          >
            <OnlineOrderIcon size={16} color={orderType === 'online' ? 'var(--blue)' : 'var(--text-secondary)'} />
            Ojek Online
          </button>
        </div>

        {orderType === 'online' && (
          <div className="platform-selector">
            {PLATFORM_CONFIG.map(({ id, Logo, label }) => (
              <button
                key={id}
                className={`platform-btn platform-${id} ${platform === id ? 'active' : ''}`}
                onClick={() => setPlatform(platform === id ? null : id)}
                title={label}
              >
                <Logo size={26} />
                <span className="platform-btn-label">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="pos-search-bar">
        <Search size={16} color="var(--text-muted)" strokeWidth={2} className="search-icon" />
        <input
          className="pos-search-input"
          placeholder="Cari menu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {['Semua', ...categories.map(c => c.name)].map(cat => (
          <button
            key={cat}
            className={`category-tab ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'Semua'
              ? '🍽️'
              : (categories.find(c => c.name === cat)?.icon || '📦')
            } {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {filtered.length === 0 ? (
          <div className="no-products">
            <span>🕳️</span>
            <span>Produk tidak ditemukan</span>
          </div>
        ) : (
          filtered.map(product => {
            const price = orderType === 'online' ? product.priceOnline : product.priceDirect

            return (
              <button
                key={product.id}
                className="product-card"
                onClick={() => handleAddItem(product)}
              >
                <div className="product-emoji">{product.emoji || '☕'}</div>
                <div className="product-info">
                  <div className="product-name">
                    {product.name}
                    {product.temp && product.temp !== 'None' && (
                      <span className={`card-temp-tag ${product.temp.toLowerCase()}`}>{product.temp}</span>
                    )}
                  </div>
                  <div className="product-price">{formatRp(price)}</div>
                  {orderType === 'online' && product.priceDirect !== product.priceOnline && (
                    <div className="product-price-original">{formatRp(product.priceDirect)}</div>
                  )}
                </div>
                <div className="product-add-btn">+</div>
              </button>
            )
          })
        )}
      </div>

      <ProductVariantModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={handleConfirmAdd}
        orderType={orderType}
      />
    </div>
  )
}
