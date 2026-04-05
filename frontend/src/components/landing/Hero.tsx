import React from 'react'
import { motion } from 'framer-motion'
import { CreateRoomButton } from './CreateRoomButton'

const COMPETITORS = [
  { name: 'Teleparty',   sync: '~500ms', issue: 'Extension required' },
  { name: 'Watch2Gether',sync: '~800ms', issue: 'Dated, ad-heavy' },
  { name: 'Rave',        sync: '~400ms', issue: 'App install, mobile only' },
  { name: 'SYNCHRA',     sync: '< 80ms', issue: '✓ Winner', isSynchra: true },
]

export function Hero() {
  return (
    <section
      style={{
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        position:       'relative',
        overflow:       'hidden',
        paddingInline:  'clamp(1rem, 5vw, 4rem)',
        paddingBlock:   'clamp(3rem, 8vw, 6rem)',
      }}
    >
      {/* Ambient glow */}
      <div className="hero-glow hero-glow-gold" />
      <div
        className="hero-glow"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,53,0.07) 0%, transparent 70%)',
          bottom:     '-300px',
          right:      '-200px',
          left:       'auto',
          top:        'auto',
        }}
      />

      {/* Live badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
      >
        <span
          style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           '0.4rem',
            padding:       '0.35rem 0.85rem',
            borderRadius:  '9999px',
            background:    'rgba(229, 183, 84, 0.1)',
            border:        '1px solid rgba(229, 183, 84, 0.3)',
            color:         'var(--accent-gold)',
            fontSize:      '0.75rem',
            fontWeight:    600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   'var(--accent-coral)',
              animation:    'sync-pulse 1.5s infinite',
            }}
          />
          Now in Phase 1 — Early Access
        </span>
      </motion.div>

      {/* Logo / Title */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <h1
          className="text-display"
          style={{
            background:          'linear-gradient(135deg, #F0EDE8 0%, #E5B754 60%, #FF6B35 100%)',
            WebkitBackgroundClip:'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip:      'text',
            marginBottom:        '1rem',
          }}
        >
          SYNCHRA
        </h1>
        <p
          className="text-hero"
          style={{
            color:       'var(--text-primary)',
            maxWidth:    '680px',
            marginInline:'auto',
            marginBottom:'0.75rem',
          }}
        >
          Watch together.
          <br />
          <span style={{ color: 'var(--accent-gold)' }}>Perfectly in sync.</span>
        </p>
        <p
          style={{
            color:       'var(--text-secondary)',
            fontSize:    'clamp(0.9rem, 2vw, 1.0625rem)',
            maxWidth:    '560px',
            marginInline:'auto',
            lineHeight:  1.65,
            marginBottom:'0.25rem',
          }}
        >
          Sub-80ms sync accuracy. Full HD WebRTC video chat. Cinema Noir design.
          <br />No install — share a link and start watching.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          marginTop: '2.5rem',
          display:   'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <CreateRoomButton />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          No sign-up required · Free forever for basic use
        </p>
      </motion.div>

      {/* Sync comparison mini-table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          marginTop:      '4rem',
          position:       'relative',
          zIndex:         1,
          width:          '100%',
          maxWidth:       '520px',
          borderRadius:   'var(--radius-lg)',
          overflow:       'hidden',
          border:         '1px solid var(--border-subtle)',
          background:     'var(--bg-surface)',
        }}
      >
        <div
          style={{
            padding:         '0.625rem 1rem',
            borderBottom:    '1px solid var(--border-subtle)',
            display:         'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap:             '0.5rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Sync</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Verdict</span>
        </div>
        {COMPETITORS.map((c) => (
          <div
            key={c.name}
            style={{
              padding:         '0.625rem 1rem',
              borderBottom:    '1px solid var(--border-subtle)',
              display:         'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap:             '0.5rem',
              background:      c.isSynchra ? 'rgba(229,183,84,0.06)' : 'transparent',
            }}
          >
            <span style={{
              fontSize:    '0.875rem',
              fontWeight:  c.isSynchra ? 700 : 400,
              color:       c.isSynchra ? 'var(--accent-gold)' : 'var(--text-primary)',
              fontFamily:  c.isSynchra ? 'var(--font-display)' : 'var(--font-body)',
            }}>
              {c.name}
            </span>
            <span style={{
              fontSize:    '0.875rem',
              fontFamily:  'var(--font-mono)',
              color:       c.isSynchra ? 'var(--sync-good)' : 'var(--text-secondary)',
              textAlign:   'center',
            }}>
              {c.sync}
            </span>
            <span style={{
              fontSize:    '0.8125rem',
              color:       c.isSynchra ? 'var(--sync-good)' : 'var(--text-muted)',
              textAlign:   'right',
              fontWeight:  c.isSynchra ? 600 : 400,
            }}>
              {c.issue}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.2, duration: 0.5 }, y: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } }}
        style={{
          marginTop:  '3rem',
          color:      'var(--text-muted)',
          fontSize:   '0.75rem',
          display:    'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap:        '0.25rem',
          position:   'relative',
          zIndex:     1,
        }}
      >
        <span>Scroll to learn more</span>
        <span style={{ fontSize: '1.25rem' }}>↓</span>
      </motion.div>
    </section>
  )
}
