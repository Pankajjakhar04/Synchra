import React from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'coral' | 'icon'
  size?:    'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?:    React.ReactNode
  children?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size    = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = `btn-${variant}`
  const sizeClass    = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : ''
  const iconOnlyClass = variant === 'icon' ? 'btn-icon' : ''

  return (
    <motion.button
      className={`btn ${variantClass} ${sizeClass} ${iconOnlyClass} ${className}`}
      disabled={disabled || isLoading}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1 }}
      {...(props as any)}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {icon && <span className="btn-icon-slot">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  )
}

function LoadingSpinner() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  )
}
