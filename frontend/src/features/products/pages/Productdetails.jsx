import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProduct } from '../hook/useProduct'

/* ─── Helpers ──────────────────────────────────────────────────── */
const formatPrice = (amount, currency) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

const getAttributeValue = (variant, attributeKey) => {
  const entry = Object.entries(variant?.attributes || {}).find(
    ([name]) => name.trim().toLowerCase() === attributeKey,
  )
  return entry?.[1] == null ? "" : String(entry[1])
}

const getColorSwatch = (value) => {
  const normalized = value.trim().toLowerCase()
  const colors = {
    black: "#1A1A1A",
    blue: "#2563EB",
    brown: "#92400E",
    burgundy: "#800020",
    charcoal: "#36454F",
    cream: "#FFFDD0",
    green: "#16A34A",
    grey: "#808080",
    gray: "#808080",
    "light blue": "#93C5FD",
    lavender: "#A78BFA",
    maroon: "#800000",
    navy: "#1E3A5F",
    "navy blue": "#1E3A5F",
    "off white": "#F8F8F6",
    olive: "#808000",
    orange: "#F97316",
    pink: "#EC4899",
    purple: "#9333EA",
    red: "#DC2626",
    teal: "#0D9488",
    white: "#FFFFFF",
    yellow: "#EAB308",
  }

  if (/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(normalized)) {
    return normalized
  }
  return colors[normalized] || "#D1D5DB"
}

/* ─── Skeleton Loader ───────────────────────────────────────────── */
const Skeleton = () => (
  <div className="min-h-screen bg-[#F8F8F6] font-['Inter',sans-serif] animate-pulse">
    <div className="h-16 bg-white border-b border-[#EFEFED]" />
    <div className="max-w-300 mx-auto px-6 md:px-10 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* Image skeleton */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-16 h-20 rounded-xl bg-[#E8E8E5]" />
          ))}
        </div>
        <div className="flex-1 aspect-3/4 rounded-2xl bg-[#E8E8E5]" />
      </div>
      {/* Info skeleton */}
      <div className="flex flex-col gap-5 pt-2">
        <div className="h-3 w-24 rounded-full bg-[#E8E8E5]" />
        <div className="h-8 w-3/4 rounded-xl bg-[#E8E8E5]" />
        <div className="h-4 w-1/3 rounded-full bg-[#E8E8E5]" />
        <div className="h-24 rounded-xl bg-[#E8E8E5]" />
        <div className="h-14 rounded-2xl bg-[#E8E8E5]" />
        <div className="h-14 rounded-2xl bg-[#E8E8E5]" />
      </div>
    </div>
  </div>
)

/* ─── Navbar ────────────────────────────────────────────────────── */
const Navbar = ({ navigate }) => (
  <header className="bg-white border-b border-[#EFEFED] sticky top-0 z-50 px-6 md:px-10 h-16 flex items-center justify-between">
    <button
      onClick={() => navigate('/')}
      className="flex items-center gap-2.5 group"
    >
      <span className="text-[13px] font-extrabold tracking-[0.22em] uppercase text-[#1E3A5F]">Snitch</span>
      <span className="text-[#E0E0DC] text-lg">·</span>
      <span className="text-[11px] text-[#ADADAD] tracking-[0.14em] uppercase font-semibold">Store</span>
    </button>

    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-xs font-semibold text-[#555] tracking-[0.08em] uppercase hover:text-[#1E3A5F] transition-colors duration-200"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  </header>
)

/* ─── Product Details Page ──────────────────────────────────────── */
const Productdetails = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { handleGetProductById } = useProduct()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await handleGetProductById(productId)
        setProduct(data)
        setSelectedVariantIndex(0)
        setActiveImg(0)
      } catch (err) {
        setError('Product not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId])

  if (loading) return <Skeleton />

  if (error || !product) return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center gap-4 font-['Inter',sans-serif]">
      <p className="text-[#1A1A1A] font-bold text-lg">{error || 'Something went wrong.'}</p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2.5 bg-[#1E3A5F] text-white text-sm font-semibold rounded-xl hover:bg-[#16305A] transition-colors duration-200"
      >
        Back to Home
      </button>
    </div>
  )

  const variants = product.variants || []
  const selectedVariant = variants[selectedVariantIndex] || null
  const selectedStock = Number(selectedVariant?.stock ?? 0)
  const variantImages = selectedVariant?.images || []
  const images = variantImages.length > 0 ? variantImages : product.images || []
  const price = selectedVariant?.price || product.price
  const attributeGroups = variants.reduce((groups, variant) => {
    Object.entries(variant.attributes || {}).forEach(([name, rawValue]) => {
      const key = name.trim().toLowerCase()
      const value = rawValue == null ? "" : String(rawValue)
      if (!key || !value) return

      let group = groups.find((item) => item.key === key)
      if (!group) {
        group = { key, name: name.trim(), values: [] }
        groups.push(group)
      }
      if (!group.values.some((option) => option.value === value)) {
        group.values.push({ value })
      }
    })
    return groups
  }, [])
  const isNew = (Date.now() - new Date(product.createdAt)) < 7 * 24 * 3600 * 1000

  const selectAttribute = (attributeKey, value) => {
    const matchesCurrentSelection = (variant) =>
      attributeGroups.every(
        (group) =>
          group.key === attributeKey ||
          getAttributeValue(variant, group.key) ===
            getAttributeValue(selectedVariant, group.key),
      )

    let nextIndex = variants.findIndex(
      (variant) =>
        getAttributeValue(variant, attributeKey) === value &&
        matchesCurrentSelection(variant),
    )
    if (nextIndex === -1) {
      nextIndex = variants.findIndex(
        (variant) => getAttributeValue(variant, attributeKey) === value,
      )
    }

    if (nextIndex !== -1) {
      setSelectedVariantIndex(nextIndex)
      setActiveImg(0)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] font-['Inter',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F8F8F6; }
        ::-webkit-scrollbar-thumb { background: #D0D0CC; border-radius: 3px; }
      `}</style>

      <Navbar navigate={navigate} />

      {/* ── Breadcrumb ─────────────────────────────────── */}
      <div className="max-w-300 mx-auto px-6 md:px-10 pt-6">
        <nav className="flex items-center gap-2 text-[11px] font-medium text-[#ADADAD] uppercase tracking-widest">
          <button onClick={() => navigate('/')} className="hover:text-[#1E3A5F] transition-colors duration-150">Home</button>
          <span>/</span>
          <span className="text-[#1A1A1A] truncate max-w-50">{product.title}</span>
        </nav>
      </div>

      {/* ── Main Content ────────────────────────────────── */}
      <main className="max-w-300 mx-auto px-6 md:px-10 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── Left: Image Gallery ──────────────────────── */}
          <div className="flex gap-3 lg:gap-4">
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex flex-col gap-2.5">
                {images.map((img, i) => (
                  <button
                    key={img._id}
                    onClick={() => setActiveImg(i)}
                    className={`w-15 h-19 lg:w-17 lg:h-21.5 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 ${
                      i === activeImg
                        ? 'border-[#1E3A5F] shadow-[0_0_0_2px_rgba(30,58,95,0.15)]'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-[#D0D0CC]'
                    }`}
                  >
                    <img src={img.url} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="relative flex-1 aspect-3/4 rounded-2xl overflow-hidden bg-[#F0F0EE] group">
              {images.length > 0 ? (
                <img
                  src={images[activeImg]?.url}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#C0C0BB]">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-sm tracking-wide">No Image</span>
                </div>
              )}

              {/* Badges */}
              {isNew && (
                <div className="absolute top-4 left-4 bg-[#1E3A5F] text-white text-[9px] font-extrabold tracking-[0.14em] px-3 py-1 rounded-full uppercase">
                  New
                </div>
              )}

              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/40 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md">
                  {activeImg + 1} / {images.length}
                </div>
              )}

              {/* Prev / Next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveImg(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Product Info ──────────────────────── */}
          <div className="flex flex-col gap-6 pt-1">

            {/* Label */}
            <p className="m-0 text-[11px] font-bold tracking-[0.24em] uppercase text-[#ADADAD]">
              Snitch Collection
            </p>

            {/* Title */}
            <div>
              <h1 className="m-0 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-[#1A1A1A] leading-[1.15] tracking-[-0.02em]">
                {product.title}
              </h1>
              <div className="mt-3 h-0.75 w-10 rounded-full bg-[#1E3A5F]" />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-[2rem] font-extrabold text-[#1E3A5F] tracking-[-0.03em]">
                {formatPrice(price?.amount, price?.currency)}
              </span>
              <span className="text-xs font-semibold text-[#ADADAD] tracking-[0.06em] uppercase">
                Incl. of all taxes
              </span>
            </div>

            {attributeGroups.map((group) => {
              const isColor = group.key === "color" || group.key === "colour"
              const selectedValue = getAttributeValue(selectedVariant, group.key)

              return (
                <fieldset key={group.key} className="space-y-3">
                  <legend className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#ADADAD]">
                    {group.name}
                    <span className="ml-2 normal-case tracking-normal text-[#1A1A1A]">
                      {selectedValue}
                    </span>
                  </legend>
                  <div className="flex flex-wrap gap-2.5">
                    {group.values.map(({ value }) => {
                      const isSelected = value === selectedValue

                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={`${group.name}: ${value}`}
                          aria-pressed={isSelected}
                          title={value}
                          onClick={() => selectAttribute(group.key, value)}
                          className={
                            isColor
                              ? `flex h-[68px] w-[60px] flex-col items-center justify-center gap-1 rounded-xl border transition-colors ${
                                  isSelected
                                    ? "border-[#1E3A5F] bg-[#EFF6FF] ring-2 ring-[#1E3A5F18]"
                                    : "border-[#D5D5D5] bg-white hover:border-[#1E3A5F]"
                                }`
                              : `flex h-14 min-w-[60px] items-center justify-center rounded-[14px] border px-3 text-lg transition-colors ${
                                  isSelected
                                    ? "border-[#1E3A5F] bg-[#EFF6FF] font-semibold text-[#1E3A5F]"
                                    : "border-[#D5D5D5] bg-white text-[#1A1A1A] hover:border-[#1E3A5F]"
                                }`
                          }
                        >
                          {isColor ? (
                            <>
                              <span
                                aria-hidden="true"
                                className="h-7 w-7 rounded-full border border-black/10"
                                style={{ backgroundColor: getColorSwatch(value) }}
                              />
                              <span className="max-w-full truncate text-[10px] font-medium text-[#555]">
                                {value}
                              </span>
                            </>
                          ) : (
                            value
                          )}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}

            {selectedVariant && (
              <p
                aria-live="polite"
                className={`m-0 text-sm font-semibold ${
                  selectedStock > 0 ? "text-emerald-700" : "text-[#991B1B]"
                }`}
              >
                {selectedStock > 0
                  ? `${selectedStock} ${selectedStock === 1 ? "item" : "items"} in stock`
                  : "Out of stock"}
              </p>
            )}

            {/* Divider */}
            <div className="h-px bg-[#cacaca]" />

            {/* Description */}
            {product.description && (
              <div>
                <p className="m-0 mb-2 text-[11px] font-bold tracking-[0.18em] uppercase text-[#aaa6a6]">
                  About this product
                </p>
                <p className="m-0 text-[14px] text-[#555] leading-[1.75]">
                  {product.description}
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[#EFEFED]" />

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              {/* Add to Cart */}
              <button
                disabled
                className="w-full py-4 rounded-2xl border-2 border-[#1E3A5F] text-[#1E3A5F] text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-[#EFF6FF] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(30,58,95,0.12)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:bg-transparent"
              >
                🛒 &nbsp; Add to Cart
              </button>

              {/* Buy Now */}
              <button
                disabled
                className="w-full py-4 rounded-2xl bg-[#1E3A5F] text-white text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-[#16305A] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(30,58,95,0.28)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:bg-[#1E3A5F]"
              >
                ⚡ &nbsp; Buy Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-1">

              {/* Free Delivery */}
              <div className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-[#EFEFED] text-center">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="1" />
                    <path d="M16 8h4l3 5v3h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-bold text-[#1A1A1A] leading-tight">Free Delivery</p>
                  <p className="m-0 mt-0.5 text-[10px] text-[#ADADAD] leading-snug">On orders above ₹999</p>
                </div>
              </div>

              {/* Easy Returns */}
              <div className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-[#EFEFED] text-center">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                  </svg>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-bold text-[#1A1A1A] leading-tight">Easy Returns</p>
                  <p className="m-0 mt-0.5 text-[10px] text-[#ADADAD] leading-snug">7-day hassle-free</p>
                </div>
              </div>

              {/* Secure Payments */}
              <div className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-[#EFEFED] text-center">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-bold text-[#1A1A1A] leading-tight">Secure Pay</p>
                  <p className="m-0 mt-0.5 text-[10px] text-[#ADADAD] leading-snug">100% protected</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="mt-16 border-t border-[#EFEFED] bg-white px-6 md:px-10 py-7 flex items-center justify-between flex-wrap gap-3">
        <span className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#1E3A5F]">Snitch</span>
        <span className="text-[11px] text-[#ADADAD]">
          © {new Date().getFullYear()} Snitch. All rights reserved.
        </span>
      </footer>
    </div>
  )
}

export default Productdetails
