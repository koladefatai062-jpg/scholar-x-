import React from 'react'

interface LogoProps {
  size?: number
  radius?: number
  text?: string
  textSize?: number
}

export default function Logo({ size = 28, radius = 8, text, textSize }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src="/logo.png"
        alt="ScholarX"
        width={size}
        height={size}
        style={{ display: 'block', borderRadius: radius, objectFit: 'cover' }}
      />
      {text && (
        <span style={{ fontWeight: 800, fontSize: textSize || size * 0.62, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {text}
        </span>
      )}
    </div>
  )
}
