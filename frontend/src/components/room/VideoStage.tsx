import React, { useState, useCallback, useRef } from 'react'
import { YouTubePlayer } from './YouTubePlayer'
import { DirectVideoPlayer } from './DirectVideoPlayer'
import { usePlaybackStore } from '../../store/playbackStore'
import { useRoomStore } from '../../store/roomStore'

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

export function VideoStage() {
  const { state: playback } = usePlaybackStore()
  const { hostId, localUserId } = useRoomStore()
  const isHost = hostId === localUserId

  const [urlInput,   setUrlInput]   = useState('')
  const [inputError, setInputError] = useState('')
  const [isLoading,  setIsLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleLoadVideo = useCallback(() => {
    const videoId = parseYouTubeId(urlInput)
    if (!videoId) {
      setInputError('Enter a valid YouTube URL or video ID')
      return
    }
    setInputError('')
    setIsLoading(true)
    window.dispatchEvent(new CustomEvent('synchra:loadVideo', {
      detail: { videoId, videoType: 'youtube' },
    }))
    setTimeout(() => setIsLoading(false), 1500)
  }, [urlInput])

  // ── Connecting ───────────────────────────────────────────────
  if (!playback) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Connecting…
      </div>
    )
  }

  const { videoId, videoType } = playback

  // ── No video selected ────────────────────────────────────────
  if (!videoId) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1.5rem', padding: '2rem',
      }}>
        <div style={{ fontSize: '3.5rem', opacity: 0.35 }}>🎬</div>

        {isHost ? (
          <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{
              color: 'var(--text-primary)', fontWeight: 600,
              textAlign: 'center', marginBottom: '0.25rem',
            }}>
              Load a YouTube video to start watching
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={inputRef}
                id="youtube-url-input"
                className="input"
                type="text"
                placeholder="Paste YouTube URL or video ID…"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setInputError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLoadVideo() }}
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                id="load-video-btn"
                className="btn btn-primary"
                onClick={handleLoadVideo}
                disabled={isLoading || !urlInput.trim()}
                style={{ padding: '0 1.25rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {isLoading ? '…' : '▶ Play'}
              </button>
            </div>

            {inputError && (
              <p style={{ color: 'var(--accent-coral)', fontSize: '0.8125rem', textAlign: 'center' }}>
                {inputError}
              </p>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            <p>Waiting for the host to load a video…</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              You'll be in sync as soon as they start 🎬
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── YouTube ───────────────────────────────────────────────────
  if (videoType === 'youtube') {
    return <YouTubePlayer videoId={videoId} isHost={isHost} />
  }

  // ── Direct URL / Uploaded video ────────────────────────────────
  if (videoType === 'url' || videoType === 'upload') {
    return <DirectVideoPlayer videoId={videoId} isHost={isHost} />
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Unsupported video type: {videoType}
    </div>
  )
}
