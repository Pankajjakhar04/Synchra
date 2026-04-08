import React from 'react'

interface AvatarProps {
  displayName: string
  avatarUrl?:  string | null
  size?:       'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isHost?:     boolean
  className?:  string
}

const SIZES = {
  xs: { outer: 24, font: 10 },
  sm: { outer: 32, font: 12 },
  md: { outer: 40, font: 14 },
  lg: { outer: 56, font: 20 },
  xl: { outer: 80, font: 28 },
}

// Generate deterministic color from name
function getColor(name: string): string {
  const hues  = [0, 30, 60, 120, 180, 200, 240, 270, 300, 330]
  let hash    = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return `hsl(${hues[Math.abs(hash) % hues.length]}, 60%, 30%)`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Avatar({ displayName, avatarUrl, size = 'md', isHost = false, className = '' }: AvatarProps) {
  const { outer, font } = SIZES[size]

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: outer, height: outer }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width:        outer,
            height:       outer,
            borderRadius: '50%',
            objectFit:    'cover',
            border:       '1.5px solid var(--border-subtle)',
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div
          style={{
            width:           outer,
            height:          outer,
            borderRadius:    '50%',
            background:      getColor(displayName),
            border:          '1.5px solid var(--border-subtle)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        font,
            fontWeight:      600,
            color:           'var(--text-primary)',
            fontFamily:      'var(--font-body)',
            letterSpacing:  '0.04em',
          }}
        >
          {getInitials(displayName)}
        </div>
      )}
      {isHost && (
        <div
          style={{
            position:  'absolute',
            top:       -4,
            right:     -4,
            fontSize:  size === 'xs' ? 8 : 12,
            lineHeight: 1,
          }}
          title="Room Host"
        >
          👑
        </div>
      )}
    </div>
  )
}
