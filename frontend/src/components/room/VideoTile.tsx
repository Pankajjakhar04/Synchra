import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Participant } from '../../types'
import { Avatar } from '../ui/Avatar'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isLocal?: boolean
}

export function VideoTile({ participant, stream, isLocal = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const showFallback = !stream || participant.isCameraOff

  return (
    <div
      className={`video-tile ${!participant.isMuted ? 'speaking' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent echo
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showFallback ? 'none' : 'block',
          transform: isLocal ? 'scaleX(-1)' : 'none', // mirror local
        }}
      />

      {/* Fallback Avatar */}
      {showFallback && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-surface)'
          }}
        >
          <Avatar displayName={participant.displayName} avatarUrl={participant.avatarUrl} size="lg" />
        </div>
      )}

      {/* Overlays */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 8px 8px 8px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <span
          className="truncate"
          style={{
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 500,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {isLocal ? 'You' : participant.displayName}
          {participant.isHost && ' 👑'}
        </span>

        {/* Status Icons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {participant.isMuted && (
            <div
              style={{
                background: 'rgba(255,0,0,0.8)',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
              title="Muted"
            >
              🔇
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
