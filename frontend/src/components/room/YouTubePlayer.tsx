import React, { useRef, useEffect, useState, useCallback } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer as YTPlayer } from 'react-youtube'
import { usePlaybackStore } from '../../store/playbackStore'
import { PlaybackState } from '../../types'
import { useSyncEngine } from '../../hooks/useSyncEngine'
import { useSocket } from '../../hooks/useSocket'
import { useClockSync } from '../../hooks/useClockSync'

interface YouTubePlayerProps {
  videoId: string
  isHost: boolean
}

export function YouTubePlayer({ videoId, isHost }: YouTubePlayerProps) {
  const { socket, emit } = useSocket()
  const { getServerTime } = useClockSync(socket)
  const { state: playback } = usePlaybackStore()
  
  const [ytPlayer, setYtPlayer] = useState<YTPlayer | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  // Keep a ref to the latest playback state so callbacks never use stale data
  const playbackRef = useRef<PlaybackState | null>(playback)
  useEffect(() => { playbackRef.current = playback }, [playback])
  
  // Player adapter for sync engine - stable reference
  const playerAdapter = useRef<{
    getCurrentTime: () => number
    seekTo: (time: number, allowSeekAhead?: boolean) => void
    setPlaybackRate: (rate: number) => void
    getPlaybackRate: () => number
    isPaused: () => boolean
    isBuffering: () => boolean
  } | null>(null)

  // ── YouTube ready handler ────────────────────────────────────
  const onReady = useCallback((event: YouTubeEvent) => {
    const player = event.target
    setYtPlayer(player)
    
    // Create stable player adapter
    playerAdapter.current = {
      getCurrentTime:  () => player.getCurrentTime() || 0,
      seekTo:          (time, allow = true) => player.seekTo(time, allow),
      setPlaybackRate: (rate) => player.setPlaybackRate(rate),
      getPlaybackRate: () => player.getPlaybackRate() || 1,
      isPaused:        () => player.getPlayerState() === 2,
      isBuffering:     () => player.getPlayerState() === 3,
    }
    
    setIsPlayerReady(true)
    console.log('[YouTubePlayer] Ready, isHost:', isHost)
    
    // Use ref for initial sync so we always read the latest state,
    // not the value captured when this callback was memoised.
    const pb = playbackRef.current
    if (pb && !isHost) {
      const serverNow = getServerTime()
      const expectedPos = pb.isPlaying && !pb.isBuffering
        ? pb.baseVideoTime + ((serverNow - pb.baseServerTime) / 1000) * pb.rate
        : pb.baseVideoTime
      
      console.log('[YouTubePlayer] Initial seek to:', expectedPos.toFixed(2), 's')
      player.seekTo(Math.max(0, expectedPos), true)
      
      if (pb.isPlaying && !pb.isBuffering) {
        player.playVideo()
      } else {
        player.pauseVideo()
      }
    }
  }, [isHost, getServerTime])

  // Hook up the sync engine D2 - only when player is ready
  useSyncEngine({
    player: isPlayerReady ? playerAdapter.current : null,
    playbackState: playback,
    isHost,
    getServerTime
  })

  // ── Non-host: react to server play/pause/seek commands ──────
  useEffect(() => {
    if (!ytPlayer || !playback || !isPlayerReady) return
    if (isHost) return  // host drives the player directly

    const currentState = ytPlayer.getPlayerState() // -1 unstarted, 1 PLAYING, 2 PAUSED, 3 BUFFERING, 5 cued
    
    if (playback.isPlaying && !playback.isBuffering) {
      // Server says PLAY
      if (currentState !== 1 && currentState !== 3) {
        console.log('[YouTubePlayer] Server says PLAY, playing video')
        ytPlayer.playVideo()
      }
    } else {
      // Server says PAUSE (or buffering)
      if (currentState === 1) {
        console.log('[YouTubePlayer] Server says PAUSE, pausing video')
        ytPlayer.pauseVideo()
      }
    }
  }, [ytPlayer, isPlayerReady, isHost, playback])

  // ── Host events: broadcast local player actions ─────────────
  const onStateChange = useCallback((event: YouTubeEvent) => {
    if (!isHost) return
    const state = event.data
    const player = event.target
    const pb = playbackRef.current
    
    // 1 = playing
    if (state === 1) {
      if (pb?.isBuffering) {
        // Host just finished buffering → trigger countdown
        console.log('[YouTubePlayer] Host buffer ended, triggering countdown')
        emit('playback:bufferEnd')
        player.pauseVideo() // Wait for countdown to resume
      } else {
        const videoTime = player.getCurrentTime()
        console.log('[YouTubePlayer] Host PLAY at:', videoTime.toFixed(2))
        emit('playback:play', { videoTime })
      }
    }
    // 2 = paused
    else if (state === 2) {
      const videoTime = player.getCurrentTime()
      console.log('[YouTubePlayer] Host PAUSE at:', videoTime.toFixed(2))
      emit('playback:pause', { videoTime })
    }
    // 3 = buffering
    else if (state === 3) {
      console.log('[YouTubePlayer] Host BUFFER START')
      emit('playback:bufferStart')
    }
  }, [isHost, emit])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'black',
        /* Ensure the YouTube iframe fills the container */
        display: 'flex',
      }}
    >
      <YouTube
        videoId={videoId}
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: isHost ? 1 : 0,
            disablekb: isHost ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            fs: 0,
            playsinline: 1,    // Required for iOS Safari inline playback
            origin: window.location.origin,
          }
        }}
        onReady={onReady}
        onStateChange={onStateChange}
        onEnd={() => { if (isHost) emit('queue:next') }}
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          pointerEvents: isHost ? 'auto' : 'none',
        }}
        iframeClassName="synchra-yt-iframe"
      />
      {/* Inline style to force the iframe to fill its wrapper */}
      <style>{`
        .synchra-yt-iframe {
          width: 100% !important;
          height: 100% !important;
          border: none;
        }
      `}</style>
    </div>
  )
}
