import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactions } from '../../hooks/useReactions'
import { Socket } from 'socket.io-client'
import { ReactionPayload } from '../../types'
import { useEffect } from 'react'

interface ReactionOverlayProps {
  socket: Socket | null
}

export function ReactionOverlay({ socket }: ReactionOverlayProps) {
  const { reactions, addReaction } = useReactions()

  useEffect(() => {
    if (!socket) return
    socket.on('reaction:broadcast', (payload: ReactionPayload) => {
      addReaction(payload)
    })
    return () => { socket.off('reaction:broadcast') }
  }, [socket, addReaction])

  return (
    <div
      id="reaction-overlay"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 150 }}
    >
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            animate={{ opacity: 0, y: -140, scale: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeOut' }}
            style={{
              position:       'fixed',
              bottom:         `${r.y}px`,
              left:           `${r.x}%`,
              fontSize:       '2rem',
              lineHeight:     1,
              filter:         'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              userSelect:     'none',
              pointerEvents:  'none',
            }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
