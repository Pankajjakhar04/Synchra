import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../../components/ui/Button'
import { apiUrl } from '../../lib/api'

interface CreateRoomButtonProps {
  className?: string
}

export function CreateRoomButton({ className = '' }: CreateRoomButtonProps) {
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(apiUrl('/api/rooms'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })

      if (!res.ok) throw new Error('Failed to create room')

      const { roomId } = await res.json()
      navigate(`/room/${roomId}`)
    } catch {
      setError('Could not create room. Is the server running?')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        id="create-room-btn"
        variant="primary"
        size="lg"
        isLoading={loading}
        onClick={handleCreate}
        style={{ minWidth: '220px', fontSize: '1.125rem' }}
      >
        🎬 Start Watching
      </Button>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop:  '0.75rem',
              color:      'var(--accent-coral)',
              fontSize:   '0.875rem',
              textAlign:  'center',
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
