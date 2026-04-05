import React, { useState, useRef, useCallback } from 'react'
import { PlaybackState } from '../../types'

function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    const v = url.searchParams.get('v')
    if (v) return v
    if (url.hostname === 'youtu.be') return url.pathname.slice(1)
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
    if (embedMatch) return embedMatch[1]
  } catch { /* not a URL */ }
  return null
}

interface Props {
  emit:    (event: string, ...args: unknown[]) => void
  playback: PlaybackState
}

export function HostControlsBar({ emit, playback }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [urlInput,  setUrlInput]  = useState('')
  const [inputErr,  setInputErr]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleInput = () => {
    setShowInput((v) => !v)
    setUrlInput('')
    setInputErr('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleLoad = useCallback(() => {
    const videoId = parseYouTubeId(urlInput)
    if (!videoId) { setInputErr('Invalid YouTube URL or ID'); return }
    emit('playback:setVideo', { videoId, videoType: 'youtube' })
    setShowInput(false)
    setUrlInput('')
    setInputErr('')
  }, [urlInput, emit])

  const isPlaying = playback.isPlaying

  return (
    <div
      id="host-controls"
      style={{
        position:      'absolute',
        bottom:        '1.5rem',
        left:          '50%',
        transform:     'translateX(-50%)',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '0.5rem',
        zIndex:        10,
      }}
    >
      {/* Change video input — shown when toggled */}
      {showInput && (
        <div
          style={{
            display:        'flex',
            gap:            '0.5rem',
            padding:        '0.625rem 0.875rem',
            background:     'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            borderRadius:   '9999px',
            border:         '1px solid var(--border-subtle)',
            animation:      'fadeInDown 0.15s ease',
          }}
        >
          <input
            ref={inputRef}
            style={{
              background:     'transparent',
              border:         'none',
              outline:        'none',
              color:          'var(--text-primary)',
              fontSize:       '0.875rem',
              width:          '260px',
              fontFamily:     'var(--font-sans)',
            }}
            placeholder="Paste YouTube URL or video ID…"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setInputErr('') }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLoad()
              if (e.key === 'Escape') setShowInput(false)
            }}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '0.25rem 0.875rem', fontSize: '0.8125rem', borderRadius: '9999px' }}
            onClick={handleLoad}
            disabled={!urlInput.trim()}
          >
            Load
          </button>
          {inputErr && (
            <span style={{ color: 'var(--accent-coral)', fontSize: '0.75rem', alignSelf: 'center' }}>
              {inputErr}
            </span>
          )}
        </div>
      )}

      {/* Main control pill */}
      <div
        style={{
          display:        'flex',
          gap:            '0.25rem',
          padding:        '0.5rem 0.75rem',
          background:     'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          borderRadius:   '9999px',
          border:         '1px solid var(--border-subtle)',
        }}
      >
        {/* Play / Pause */}
        <button
          className="btn btn-ghost"
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.9375rem' }}
          title={isPlaying ? 'Pause for everyone' : 'Play for everyone'}
          onClick={() => emit(isPlaying ? 'playback:pause' : 'playback:play', { videoTime: playback.baseVideoTime })}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.125rem' }} />

        {/* Change video */}
        <button
          className={`btn ${showInput ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', borderRadius: '9999px' }}
          onClick={toggleInput}
          title="Change video"
        >
          {showInput ? '✕ Cancel' : '🔄 Change Video'}
        </button>
      </div>
    </div>
  )
}
