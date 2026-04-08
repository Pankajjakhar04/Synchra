import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Participant } from '../../types'
import { Avatar } from '../ui/Avatar'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isLocal?: boolean
  isSpeaking?: boolean
}

export function VideoTile({ participant, stream, isLocal = false, isSpeaking = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      // Assign stream to video element
      video.srcObject = stream

      // Explicitly call play() — autoPlay attribute alone is unreliable
      // across browsers, especially for elements with audio tracks.
      video.play().catch((err) => {
        // Autoplay blocked (user hasn't interacted yet).
        // Retry on next user interaction.
        console.warn('[VideoTile] play() blocked:', err.message)
        const resumeOnInteraction = () => {
          video.play().catch(() => {})
          document.removeEventListener('click', resumeOnInteraction)
          document.removeEventListener('touchstart', resumeOnInteraction)
        }
        document.addEventListener('click', resumeOnInteraction, { once: true })
        document.addEventListener('touchstart', resumeOnInteraction, { once: true })
      })
    } else {
      video.srcObject = null
    }
  }, [stream])

  const showFallback = !stream || participant.isCameraOff
  const showSpeakingRing = isSpeaking && !participant.isMuted

  return (
    <div
      className={`video-tile ${showSpeakingRing ? 'speaking' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: showSpeakingRing 
          ? '2px solid var(--accent-gold)' 
          : '1px solid var(--border-subtle)',
        boxShadow: showSpeakingRing 
          ? '0 0 20px rgba(229, 183, 84, 0.4), 0 0 40px rgba(229, 183, 84, 0.2)' 
          : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
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
