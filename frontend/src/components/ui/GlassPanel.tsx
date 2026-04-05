import React from 'react'
import { motion } from 'framer-motion'

interface GlassPanelProps {
  children:  React.ReactNode
  className?: string
  elevated?:  boolean
  style?:     React.CSSProperties
  onClick?:   () => void
}

export function GlassPanel({ children, className = '', elevated = false, style, onClick }: GlassPanelProps) {
  return (
    <div
      className={`${elevated ? 'glass-elevated' : 'glass'} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function AnimatedGlassPanel({ children, className = '', elevated = false, ...rest }: GlassPanelProps) {
  return (
    <motion.div
      className={`${elevated ? 'glass-elevated' : 'glass'} ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  )
}
