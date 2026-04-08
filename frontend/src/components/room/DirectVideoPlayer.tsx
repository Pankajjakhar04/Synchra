import React, { useRef, useEffect, useState, useCallback } from 'react'
import { usePlaybackStore } from '../../store/playbackStore'
import { PlaybackState } from '../../types'
import { useSyncEngine } from '../../hooks/useSyncEngine'
import { useSocket } from '../../hooks/useSocket'
import { useClockSync } from '../../hooks/useClockSync'

interface DirectVideoPlayerProps {
  videoId: string       // URL or GCS path
  isHost: boolean
}

/**
 * HTML5 <video> player for direct URL and uploaded video sources.
 * Integrates with the same server-authoritative sync engine (D1-D3)
 * used by the YouTube player.
 */
export function DirectVideoPlayer({ videoId, isHost }: DirectVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { socket, emit } = useSocket()
  const { getServerTime } = useClockSync(socket)
  const { state: playback } = usePlaybackStore()

  const [isReady, setIsReady] = useState(false)

  const playbackRef = useRef<PlaybackState | null>(playback)
  useEffect(() => { playbackRef.current = playback }, [playback])

  // ── Player adapter for sync engine ──────────────────────────
  const playerAdapter = useRef<{
    getCurrentTime: () => number
    seekTo: (time: number) => void
    setPlaybackRate: (rate: number) => void
    getPlaybackRate: () => number
    isPaused: () => boolean
    isBuffering: () => boolean
  } | null>(null)

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    playerAdapter.current = {
      getCurrentTime:  () => video.currentTime,
      seekTo:          (t) => { video.currentTime = Math.max(0, t) },
      setPlaybackRate: (r) => { video.playbackRate = r },
      getPlaybackRate: () => video.playbackRate,
      isPaused:        () => video.paused,
      isBuffering:     () => video.readyState < 3,
    }

    setIsReady(true)

    // Report duration to server
    if (isHost && video.duration && isFinite(video.duration)) {
      emit('playback:play', { videoTime: 0 })
    }

    // Initial sync for non-host
    const pb = playbackRef.current
    if (pb && !isHost) {
      const serverNow = getServerTime()
      const expectedPos = pb.isPlaying && !pb.isBuffering
        ? pb.baseVideoTime + ((serverNow - pb.baseServerTime) / 1000) * pb.rate
        : pb.baseVideoTime
      video.currentTime = Math.max(0, expectedPos)
      if (pb.isPlaying && !pb.isBuffering) {
        video.play().catch(() => {})
      }
    }
  }, [isHost, getServerTime, emit])

  // Hook up sync engine (D2)
  useSyncEngine({
    player: isReady ? playerAdapter.current : null,
    playbackState: playback,
    isHost,
    getServerTime,
  })

  // ── Non-host: react to server play/pause ────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !playback || !isReady || isHost) return

    if (playback.isPlaying && !playback.isBuffering) {
      if (video.paused) video.play().catch(() => {})
    } else {
      if (!video.paused) video.pause()
    }
  }, [playback, isReady, isHost])

  // ── Host: broadcast local player actions ────────────────────
  const onPlay = useCallback(() => {
    if (!isHost || !videoRef.current) return
    emit('playback:play', { videoTime: videoRef.current.currentTime })
  }, [isHost, emit])

  const onPause = useCallback(() => {
    if (!isHost || !videoRef.current) return
    emit('playback:pause', { videoTime: videoRef.current.currentTime })
  }, [isHost, emit])

  const onSeeked = useCallback(() => {
    if (!isHost || !videoRef.current) return
    emit('playback:seek', { videoTime: videoRef.current.currentTime })
  }, [isHost, emit])

  const onWaiting = useCallback(() => {
    if (!isHost) return
    emit('playback:bufferStart')
  }, [isHost, emit])

  const onCanPlay = useCallback(() => {
    if (!isHost) return
    const pb = playbackRef.current
    if (pb?.isBuffering) {
      emit('playback:bufferEnd')
    }
  }, [isHost, emit])

  const onEnded = useCallback(() => {
    if (!isHost) return
    emit('queue:next')
  }, [isHost, emit])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        src={videoId}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
        onWaiting={onWaiting}
        onCanPlay={onCanPlay}
        onEnded={onEnded}
        controls={isHost}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: isHost ? 'auto' : 'none',
        }}
      />
    </div>
  )
}
