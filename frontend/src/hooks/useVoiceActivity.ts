import { useEffect, useRef, useCallback, useState } from 'react'
import { Socket } from 'socket.io-client'

interface UseVoiceActivityOptions {
  stream: MediaStream | null
  socket: Socket | null
  userId: string
  roomId: string
  threshold?: number       // 0-1, default 0.02
  smoothingWindow?: number // ms, default 100
}

interface VoiceActivityState {
  isSpeaking: boolean
  volume: number // 0-1 normalized
}

/**
 * Voice Activity Detection (VAD) hook
 * Analyzes audio stream to detect when user is speaking
 * and broadcasts speaking state to room participants
 */
export function useVoiceActivity({
  stream,
  socket,
  userId,
  roomId,
  threshold = 0.02,
  smoothingWindow = 100,
}: UseVoiceActivityOptions): VoiceActivityState {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [volume, setVolume] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBroadcastRef = useRef<boolean>(false)

  const analyze = useCallback(() => {
    if (!analyzerRef.current) return

    const analyzer = analyzerRef.current
    const dataArray = new Uint8Array(analyzer.fftSize)
    analyzer.getByteTimeDomainData(dataArray)

    // Calculate RMS (Root Mean Square) for volume level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)
    const normalizedVolume = Math.min(1, rms * 3) // Scale up for better sensitivity

    setVolume(normalizedVolume)

    // Detect speech based on threshold
    const speaking = normalizedVolume > threshold

    if (speaking) {
      // Clear any pending "stop speaking" timeout
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current)
        speakingTimeoutRef.current = null
      }

      if (!isSpeaking) {
        setIsSpeaking(true)
      }
    } else {
      // Debounce the "stop speaking" to avoid flickering
      if (isSpeaking && !speakingTimeoutRef.current) {
        speakingTimeoutRef.current = setTimeout(() => {
          setIsSpeaking(false)
          speakingTimeoutRef.current = null
        }, smoothingWindow)
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyze)
  }, [threshold, smoothingWindow, isSpeaking])

  // Broadcast speaking state changes to room
  useEffect(() => {
    if (!socket || !roomId) return

    // Only broadcast on state change
    if (lastBroadcastRef.current !== isSpeaking) {
      lastBroadcastRef.current = isSpeaking
      socket.emit('voice:speaking', { isSpeaking })
    }
  }, [socket, roomId, isSpeaking])

  // Setup audio analysis
  useEffect(() => {
    if (!stream) {
      setIsSpeaking(false)
      setVolume(0)
      return
    }

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      return
    }

    try {
      const audioContext = new AudioContext()
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 256
      analyzer.smoothingTimeConstant = 0.8

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyzer)

      audioContextRef.current = audioContext
      analyzerRef.current = analyzer

      // Start analysis loop
      animationFrameRef.current = requestAnimationFrame(analyze)
    } catch (err) {
      console.warn('[VAD] Failed to setup audio analysis:', err)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stream, analyze])

  return { isSpeaking, volume }
}

/**
 * Track remote participants' speaking state
 */
export function useRemoteSpeakingState(socket: Socket | null) {
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!socket) return

    const handleSpeaking = (data: { userId: string; isSpeaking: boolean }) => {
      setSpeakingUsers((prev) => {
        const next = new Set(prev)
        if (data.isSpeaking) {
          next.add(data.userId)
        } else {
          next.delete(data.userId)
        }
        return next
      })
    }

    socket.on('voice:speaking', handleSpeaking)

    return () => {
      socket.off('voice:speaking', handleSpeaking)
    }
  }, [socket])

  const isUserSpeaking = useCallback(
    (userId: string) => speakingUsers.has(userId),
    [speakingUsers]
  )

  return { speakingUsers, isUserSpeaking }
}
