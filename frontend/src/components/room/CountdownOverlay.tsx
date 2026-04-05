import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaybackStore } from '../../store/playbackStore'

export function CountdownOverlay() {
  const { countdown } = usePlaybackStore()

  return (
    <AnimatePresence>
      {countdown !== null && (
        <motion.div
          key={countdown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position:       'fixed',
            inset:          0,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(10, 10, 15, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex:         200,
            pointerEvents:  'none',
          }}
        >
          {/* Buffering message */}
          <motion.p
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color:        'var(--text-secondary)',
              fontFamily:   'var(--font-body)',
              fontSize:     '1.0625rem',
              marginBottom: '1.5rem',
              fontWeight:   500,
            }}
          >
            ⏳ Host is ready — resuming in...
          </motion.p>

          {/* Big countdown number */}
          <motion.div
            key={`count-${countdown}`}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="countdown-number"
          >
            {countdown}
          </motion.div>

          {/* Progress bar */}
          <motion.div
            style={{
              width:        240,
              height:       3,
              background:   'var(--bg-elevated)',
              borderRadius: '9999px',
              marginTop:    '2.5rem',
              overflow:     'hidden',
            }}
          >
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 1, ease: 'linear' }}
              style={{
                height:     '100%',
                background: 'var(--accent-gold)',
                borderRadius: '9999px',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
