// Brand-accurate SVG logo components for food delivery platforms in Indonesia
// Colors sourced from official brand guidelines

// GoFood - Gojek's food delivery (red background, white text with go-jek style)
export function GoFoodLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill="#E82A2C"/>
      {/* Stylized G from Gojek */}
      <text
        x="28" y="27"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="16" fontWeight="900"
        textAnchor="middle"
        fill="white"
        dominantBaseline="middle"
        letterSpacing="-0.5"
      >
        Go
      </text>
      <text
        x="28" y="42"
        fontFamily="Arial, sans-serif"
        fontSize="10" fontWeight="700"
        textAnchor="middle"
        fill="rgba(255,255,255,0.9)"
        dominantBaseline="middle"
        letterSpacing="0.5"
      >
        FOOD
      </text>
    </svg>
  )
}

// GrabFood - Grab's green with rounded rect
export function GrabFoodLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="12" fill="#00B14F"/>
      <text
        x="28" y="25"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="14" fontWeight="900"
        textAnchor="middle"
        fill="white"
        dominantBaseline="middle"
        letterSpacing="-0.3"
      >
        Grab
      </text>
      <text
        x="28" y="41"
        fontFamily="Arial, sans-serif"
        fontSize="10" fontWeight="700"
        textAnchor="middle"
        fill="rgba(255,255,255,0.9)"
        dominantBaseline="middle"
        letterSpacing="0.5"
      >
        FOOD
      </text>
    </svg>
  )
}

// ShopeeFood - Shopee orange brand
export function ShopeeFoodLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="12" fill="#EE4D2D"/>
      {/* Shopee bag icon simplified */}
      <path
        d="M20 22c0-4.4 3.6-8 8-8s8 3.6 8 8"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <rect x="15" y="22" width="26" height="20" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
      <text
        x="28" y="35"
        fontFamily="Arial, sans-serif"
        fontSize="7.5" fontWeight="800"
        textAnchor="middle"
        fill="white"
        dominantBaseline="middle"
        letterSpacing="0.2"
      >
        ShopeeFood
      </text>
    </svg>
  )
}

// Direct order icon - using store/person inline SVG style
export function DirectOrderIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

// Online order icon - motorcycle/bike delivery
export function OnlineOrderIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5.5" cy="17.5" r="3.5"/>
      <circle cx="18.5" cy="17.5" r="3.5"/>
      <path d="M15 6h-4l-2 5H2"/>
      <path d="M15 6l3 5h2"/>
      <path d="M12 11h6"/>
    </svg>
  )
}
