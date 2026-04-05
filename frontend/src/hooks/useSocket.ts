import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRoomStore } from '../store/roomStore'
import { usePlaybackStore } from '../store/playbackStore'
import {
  PlaybackState,
  Participant,
  QueueItem,
  ChatMessage,
  ReactionPayload,
} from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

interface UseSocketReturn {
  socket: Socket | null
  emit:   (event: string, ...args: unknown[]) => void
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)

  const {
    setRoomState,
    setConnected,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setHost,
    setQueue,
  } = useRoomStore()

  const { setState, setCountdown, setNotice } = usePlaybackStore()

  useEffect(() => {
    const socket = io(`${BACKEND_URL}/room`, {
      transports:       ['websocket', 'polling'],
      autoConnect:      false,
      reconnectionDelay:       1000,
      reconnectionDelayMax:    5000,
      reconnectionAttempts:    10,
    })

    socketRef.current = socket

    // ─── Connection Events ──────────────────────────────────
    socket.on('connect', () => {
      setConnected(true)
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      setConnected(false)
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
    })

    // ─── Room State (on join) ───────────────────────────────
    socket.on('room:state', (state: {
      roomId: string
      localUserId: string
      name: string | null
      hostId: string
      playback: PlaybackState
      queue: QueueItem[]
      participants: Record<string, Participant>
    }) => {
      setRoomState({
        roomId:       state.roomId,
        localUserId:  state.localUserId,
        name:         state.name,
        hostId:       state.hostId,
        participants: state.participants,
        queue:        state.queue,
        playback:     state.playback,
      })
      setState(state.playback)
    })

    // ─── Participant Events ─────────────────────────────────
    socket.on('room:participantJoined', (p: Participant) => addParticipant(p))
    socket.on('room:participantLeft',   ({ userId }: { userId: string }) => removeParticipant(userId))
    socket.on('room:participantUpdated', ({ userId, ...updates }: { userId: string } & Partial<Participant>) => {
      updateParticipant(userId, updates)
    })
    socket.on('room:hostChanged', ({ newHostId }: { newHostId: string }) => setHost(newHostId))

    // ─── Playback Events ────────────────────────────────────
    socket.on('playback:state', (state: PlaybackState) => setState(state))

    // ─── Countdown (host buffering resolved) ────────────────
    socket.on('room:countdown', ({ count }: { count: number }) => {
      setCountdown(count)
      setTimeout(() => setCountdown(null), 900)
    })

    // ─── Room Notice ────────────────────────────────────────
    socket.on('room:notice', ({ message }: { message: string }) => {
      setNotice(message)
      setTimeout(() => setNotice(null), 4000)
    })

    // ─── Queue ──────────────────────────────────────────────
    socket.on('queue:updated', ({ queue }: { queue: QueueItem[] }) => setQueue(queue))

    // Connect
    socket.connect()

    return () => {
      socket.disconnect()
      socket.removeAllListeners()
      socketRef.current = null
    }
  }, [])

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args)
  }, [])

  return { socket: socketRef.current, emit }
}
