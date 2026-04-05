import React, { useRef, useEffect, useState, useCallback } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer as YTPlayer } from 'react-youtube'
import { useRoomStore } from '../../store/roomStore'
import { usePlaybackStore } from '../../store/playbackStore'
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
  
  const [playerInfo, setPlayerInfo] = useState<YTPlayer | null>(null)
  
  // D2 Sync Engine Hooks
  const playerRef = useRef<{
    getCurrentTime: () => number
    seekTo: (time: number, allowSeekAhead?: boolean) => void
    setPlaybackRate: (rate: number) => void
    getPlaybackRate: () => number
    isPaused: () => boolean
    isBuffering: () => boolean
  } | null>(null)

  const [isBufferingLocal, setIsBufferingLocal] = useState(false)

  const onReady = (event: YouTubeEvent) => {
    setPlayerInfo(event.target)

    playerRef.current = {
      getCurrentTime:  () => event.target.getCurrentTime() || 0,
      seekTo:          (time, allow) => event.target.seekTo(time, allow),
      setPlaybackRate: (rate) => event.target.setPlaybackRate(rate),
      getPlaybackRate: () => event.target.getPlaybackRate() || 1,
      isPaused:        () => event.target.getPlayerState() === 2, // 2 = PAUSED
      isBuffering:     () => event.target.getPlayerState() === 3, // 3 = BUFFERING
    }
  }

  // Hook up the sync engine D2
  useSyncEngine({
    player: playerRef.current,
    playbackState: playback,
    isHost,
    getServerTime
  })

  // Watch for server state changes to drive explicit play/pause events
  useEffect(() => {
    if (!playerInfo || !playback) return

    // This handles state that requires the player action such as Play/Pause directly from the host.
    // The Sync Engine (D2) handles the drift / seek / rate.

    const currentState = playerInfo.getPlayerState() // 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING
    
    // Play / Pause sync
    if (playback.isPlaying && !playback.isBuffering && currentState !== 1 && currentState !== 3) {
      playerInfo.playVideo()
    } else if (!playback.isPlaying && currentState === 1) {
      playerInfo.pauseVideo()
    }
  }, [playerInfo, playback?.isPlaying, playback?.isBuffering])

  // Host events — if WE change state, broadcast it (D1)
  const onPlay = () => {
    if (isHost && playerInfo) {
      setIsBufferingLocal(false)
      emit('playback:play', { videoTime: playerInfo.getCurrentTime() })
    }
  }

  const onPause = () => {
    if (isHost && playerInfo) {
      setIsBufferingLocal(false)
      emit('playback:pause', { videoTime: playerInfo.getCurrentTime() })
    }
  }

  const onBuffer = () => {
    if (isHost) {
      setIsBufferingLocal(true)
      emit('playback:bufferStart')
    }
  }

  // When host stops buffering, trigger buffer end (adds 3-2-1 countdown logic)
  useEffect(() => {
    if (isHost && !isBufferingLocal && playback?.isBuffering) {
      // It means we were buffering locally but now we played (so buffering ended), 
      // but actually YouTube fires `onPlay` after `onBuffer`.
      // Let's hook into the exact transition. 
      // Handled via onPlay checking if we were buffering.
    }
  }, [isHost, isBufferingLocal, playback?.isBuffering])
  
  const onStateChange = (event: YouTubeEvent) => {
    if (!isHost) return
    const state = event.data
    // 1 (playing)
    if (state === 1) {
      if (playback?.isBuffering) {
        // We just finished buffering
        emit('playback:bufferEnd')
        playerInfo?.pauseVideo() // Wait for countdown to resume us
      } else {
        onPlay()
      }
    } 
    // 2 (paused)
    else if (state === 2) {
      onPause()
    }
    // 3 (buffering)
    else if (state === 3) {
      onBuffer()
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'black' }}>
      <YouTube
        videoId={videoId}
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: isHost ? 1 : 0, // Only host gets native controls (to seek, etc)
            disablekb: isHost ? 0 : 1, // Disable keyboard for non-hosts
            modestbranding: 1,
            rel: 0,
            fs: 0
          }
        }}
        onReady={onReady}
        onStateChange={onStateChange}
        style={{ width: '100%', height: '100%', pointerEvents: isHost ? 'auto' : 'none' }} // Non-hosts can't click to pause
      />
    </div>
  )
}
