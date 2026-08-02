import React from 'react'

export default function Logo({ size = 28, radius = 8 }: { size?: number; radius?: number }) {
  return (
    <img
      src="/logo.png"
      alt="ScholarX"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: radius, objectFit: 'cover' }}
    />
  )
}
