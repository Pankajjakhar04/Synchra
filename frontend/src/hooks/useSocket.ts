import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRoomStore } from '../store/roomStore'
import { usePlaybackStore } from '../store/playbackStore'
import {
  PlaybackState,
  Participant,
  QueueItem,
} from '../types'

// Use VITE_API_URL or VITE_SOCKET_URL for the backend connection
const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'

// IMPORTANT: This must be a singleton. Multiple components call useSocket()
// (e.g. Room + YouTubePlayer). If each call creates its own Socket.IO
// connection, the app can desync (multiple connections, multiple identities,
// WebRTC signaling to the wrong peer, etc.).
let sharedSocket: Socket | null = null
let subscriberCount = 0

function ensureSocketConnected(
  onRoomState: (state: {
    roomId: string
    localUserId: string
    name: string | null
    hostId: string
    playback: PlaybackState
    queue: QueueItem[]
    participants: Record<string, Participant>
  }) => void
) {
  if (sharedSocket) return sharedSocket

  const socket = io(`${BACKEND_URL}/room`, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  })

  // Listeners are registered once for the singleton
  socket.on('connect', () => {
    useRoomStore.getState().setConnected(true)
    console.log('[Socket] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    useRoomStore.getState().setConnected(false)
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  socket.on('room:state', (state) => {
    onRoomState(state)
  })

  socket.on('room:participantJoined', (p: Participant) => useRoomStore.getState().addParticipant(p))
  socket.on('room:participantLeft', ({ userId }: { userId: string }) => useRoomStore.getState().removeParticipant(userId))
  socket.on('room:participantUpdated', ({ userId, ...updates }: { userId: string } & Partial<Participant>) => {
    useRoomStore.getState().updateParticipant(userId, updates)
  })
  socket.on('room:hostChanged', ({ newHostId }: { newHostId: string }) => useRoomStore.getState().setHost(newHostId))

  socket.on('playback:state', (state: PlaybackState) => usePlaybackStore.getState().setState(state))

  socket.on('room:countdown', ({ count }: { count: number }) => {
    usePlaybackStore.getState().setCountdown(count)
    setTimeout(() => usePlaybackStore.getState().setCountdown(null), 900)
  })

  socket.on('room:notice', ({ message }: { message: string }) => {
    usePlaybackStore.getState().setNotice(message)
    setTimeout(() => usePlaybackStore.getState().setNotice(null), 4000)
  })

  socket.on('queue:updated', ({ queue }: { queue: QueueItem[] }) => useRoomStore.getState().setQueue(queue))

  socket.connect()

  sharedSocket = socket
  return socket
}

interface UseSocketReturn {
  socket: Socket | null
  emit: (event: string, ...args: unknown[]) => void
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(sharedSocket)

  useEffect(() => {
    subscriberCount += 1

    const onRoomState = (state: {
      roomId: string
      localUserId: string
      name: string | null
      hostId: string
      playback: PlaybackState
      queue: QueueItem[]
      participants: Record<string, Participant>
    }) => {
      useRoomStore.getState().setRoomState({
        roomId: state.roomId,
        localUserId: state.localUserId,
        name: state.name,
        hostId: state.hostId,
        participants: state.participants,
        queue: state.queue,
        playback: state.playback,
      })
      usePlaybackStore.getState().setState(state.playback)
    }

    const s = ensureSocketConnected(onRoomState)
    setSocket(s)

    return () => {
      subscriberCount -= 1
      if (subscriberCount <= 0 && sharedSocket) {
        sharedSocket.disconnect()
        sharedSocket.removeAllListeners()
        sharedSocket = null
        subscriberCount = 0
      }
    }
  }, [])

  const emit = useCallback((event: string, ...args: unknown[]) => {
    sharedSocket?.emit(event, ...args)
  }, [])

  return { socket, emit }
}
