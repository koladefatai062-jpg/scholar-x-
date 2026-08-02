import React from 'react'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40',
  border: '#1E1450', accent: '#7C3AED', cyan: '#06B6D4',
  text: '#E2D9F3', muted: '#7B6FA0', white: '#FFFFFF',
}

interface AvatarProps {
  name?: string | null
  avatarUrl?: string | null
  size?: number
  fontSize?: number
}

export default function Avatar({ name, avatarUrl, size = 36, fontSize = 13 }: AvatarProps) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SX'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'user'}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${C.accent},${C.cyan})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize, fontWeight: 700, color: '#fff' }}>{initials}</span>
    </div>
  )
}
