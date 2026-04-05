import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight:       '100dvh',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        textAlign:       'center',
        padding:         '2rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ fontSize: '6rem', lineHeight: 1, marginBottom: '1rem' }}>🎬</div>
        <h1 className="text-heading" style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          This screening room doesn't exist.
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The room may have expired or the link is invalid.
        </p>
        <Link to="/" className="btn btn-primary">
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  )
}
