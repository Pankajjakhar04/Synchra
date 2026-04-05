import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaybackStore } from '../../store/playbackStore'

export function SyncIndicator() {
  const { syncQuality, syncDrift } = usePlaybackStore()

  const colors = { good: 'var(--sync-good)', warn: 'var(--sync-warn)', bad: 'var(--sync-bad)' }
  const labels = { good: 'Synced', warn: 'Syncing', bad: 'Out of sync' }
  const color  = colors[syncQuality]
  const label  = labels[syncQuality]

  return (
    <div
      id="sync-indicator"
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         '0.375rem',
        padding:     '0.25rem 0.625rem',
        borderRadius:'9999px',
        background:  'rgba(0,0,0,0.4)',
        border:      `1px solid ${color}30`,
        cursor:      'default',
      }}
      title={`Sync drift: ${Math.abs(syncDrift)}ms`}
    >
      <motion.div
        animate={{ scale: syncQuality !== 'good' ? [1, 1.4, 1] : 1 }}
        transition={{ repeat: syncQuality !== 'good' ? Infinity : 0, duration: 1 }}
        style={{
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   color,
          boxShadow:    `0 0 6px ${color}`,
          flexShrink:   0,
        }}
      />
      <span
        style={{
          fontSize:   '0.6875rem',
          fontFamily: 'var(--font-mono)',
          color,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      {syncQuality !== 'good' && (
        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {Math.abs(syncDrift)}ms
        </span>
      )}
    </div>
  )
}
