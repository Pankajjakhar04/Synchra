import React from 'react'
import { motion } from 'framer-motion'
import { GlassPanel } from '../ui/GlassPanel'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Sub-80ms Sync',
    description:
      'Server-authoritative playback with PTP-style clock sync. Everyone sees the same frame — always.',
  },
  {
    icon: '🎭',
    title: 'WebRTC Video Chat',
    description:
      'Full HD video and audio with up to 12 faces. Adaptive bitrate keeps calls smooth on any network.',
  },
  {
    icon: '🔥',
    title: 'Intelligent Buffering',
    description:
      "When the host buffers, everyone pauses. A 3-2-1 countdown syncs the group restart. No more chaos.",
  },
  {
    icon: '🎟️',
    title: 'Zero Install',
    description:
      'Pure PWA. Share a link — done. Works on Chrome, Safari, Firefox, iOS, Android. No extension needed.',
  },
  {
    icon: '😂',
    title: 'Live Reactions',
    description:
      'Tap an emoji and watch it float across the screen for everyone. Cinema mood, always on.',
  },
  {
    icon: '🎬',
    title: 'Any Video Source',
    description:
      'YouTube, local files (MP4/MKV/WebM up to 2GB), or any direct video URL. Your content, your rules.',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export function Features() {
  return (
    <section
      style={{
        paddingBlock: '5rem',
        paddingInline: 'clamp(1rem, 5vw, 4rem)',
        maxWidth: 1200,
        marginInline: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '3rem' }}
      >
        <p style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Why SYNCHRA
        </p>
        <h2 className="text-heading" style={{ color: 'var(--text-primary)' }}>
          Everything the others got wrong.
          <br />
          <span style={{ color: 'var(--accent-gold)' }}>We got right.</span>
        </h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {FEATURES.map((f) => (
          <motion.div key={f.title} variants={itemVariants}>
            <GlassPanel
              style={{
                padding:     '1.75rem',
                height:      '100%',
                transition:  'border-color 0.2s, box-shadow 0.2s',
                cursor:      'default',
              }}
              className="feature-card"
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', lineHeight: 1 }}>{f.icon}</div>
              <h3
                style={{
                  fontFamily:  'var(--font-heading)',
                  fontSize:    '1.125rem',
                  color:       'var(--text-primary)',
                  marginBottom:'0.5rem',
                }}
              >
                {f.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>
                {f.description}
              </p>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>

      <style>{`
        .feature-card:hover {
          border-color: var(--border-active) !important;
          box-shadow: var(--shadow-gold) !important;
        }
      `}</style>
    </section>
  )
}
