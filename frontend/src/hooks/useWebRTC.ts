import { useEffect, useRef, useCallback, useState } from 'react'
import { Socket } from 'socket.io-client'
import { ICE_SERVERS, WebRTCSignal } from '../types'

// simple-peer uses `global` which doesn't exist in browser. Lazy-load after
// Vite's `define: { global: 'globalThis' }` polyfill has been applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimplePeerInstance = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimplePeerCtor = new (opts: any) => SimplePeerInstance
let _SimplePeer: SimplePeerCtor | null = null
async function getSimplePeer(): Promise<SimplePeerCtor> {
  if (!_SimplePeer) {
    const mod = await import('simple-peer')
    _SimplePeer = (mod.default ?? mod) as SimplePeerCtor
  }
  return _SimplePeer
}

interface PeerState {
  userId: string
  stream: MediaStream | null
  peer:   SimplePeerInstance
}

interface UseWebRTCReturn {
  peers:       Record<string, PeerState>
  localStream: MediaStream | null
  startMedia:  () => Promise<void>
  stopMedia:   () => void
  toggleMute:  () => boolean
  toggleCamera:() => boolean
  isMediaReady: boolean
}

export function useWebRTC(
  socket: Socket | null,
  localUserId: string,
  participantIds: string[]
): UseWebRTCReturn {
  const [peers, setPeers] = useState<Record<string, PeerState>>({})
  const peersRef          = useRef<Record<string, SimplePeerInstance>>({})
  const localStreamRef    = useRef<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMediaReady, setIsMediaReady] = useState(false)
  const pendingSignalsRef = useRef<Record<string, unknown[]>>({})

  // ─── Start local camera/mic ─────────────────────────────
  const startMedia = useCallback(async () => {
    if (localStreamRef.current) {
      console.log('[WebRTC] Media already started')
      return
    }
    
    try {
      console.log('[WebRTC] Requesting camera/mic access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:     { ideal: 640, max: 1280 },
          height:    { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      setIsMediaReady(true)
      console.log('[WebRTC] Media ready:', stream.getTracks().map(t => t.kind).join(', '))
    } catch (err) {
      console.error('[WebRTC] getUserMedia failed:', err)
      // Try audio-only fallback
      try {
        console.log('[WebRTC] Trying audio-only...')
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = audioStream
        setLocalStream(audioStream)
        setIsMediaReady(true)
        console.log('[WebRTC] Audio-only ready')
      } catch (audioErr) {
        console.error('[WebRTC] Audio fallback failed:', audioErr)
        // Continue without media
        setIsMediaReady(true)
      }
    }
  }, [])

  // ─── Stop local stream ──────────────────────────────────
  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setIsMediaReady(false)
  }, [])

  // ─── Toggle mute ────────────────────────────────────────
  const toggleMute = useCallback((): boolean => {
    const stream = localStreamRef.current
    if (!stream) return true
    const audio = stream.getAudioTracks()[0]
    if (!audio) return true
    audio.enabled = !audio.enabled
    console.log('[WebRTC] Audio enabled:', audio.enabled)
    return !audio.enabled
  }, [])

  // ─── Toggle camera ──────────────────────────────────────
  const toggleCamera = useCallback((): boolean => {
    const stream = localStreamRef.current
    if (!stream) return true
    const video = stream.getVideoTracks()[0]
    if (!video) return true
    video.enabled = !video.enabled
    console.log('[WebRTC] Video enabled:', video.enabled)
    return !video.enabled
  }, [])

  // ─── Create a peer connection ────────────────────────────
  const createPeer = useCallback(
    async (targetUserId: string, initiator: boolean): Promise<SimplePeerInstance | null> => {
      // Don't create peer to self
      if (targetUserId === localUserId) {
        return null
      }
      
      // Check if peer already exists
      if (peersRef.current[targetUserId]) {
        console.log(`[WebRTC] Peer already exists for ${targetUserId}`)
        return peersRef.current[targetUserId]
      }
      
      console.log(`[WebRTC] Creating peer for ${targetUserId}, initiator: ${initiator}`)
      
      const SP = await getSimplePeer()
      const peer = new SP({
        initiator,
        stream:     localStreamRef.current || undefined,
        trickle:    true,
        config: {
          iceServers:          ICE_SERVERS as RTCIceServer[],
          iceCandidatePoolSize: 10,
          bundlePolicy:        'max-bundle' as RTCBundlePolicy,
        },
      })

      peer.on('signal', (signal: unknown) => {
        console.log(`[WebRTC] Signaling to ${targetUserId}:`, 
          typeof signal === 'object' && signal !== null && 'type' in signal ? (signal as {type: string}).type : 'candidate')
        socket?.emit('webrtc:signal', {
          targetUserId,
          fromUserId: localUserId,
          signal,
        } as WebRTCSignal)
      })

      peer.on('stream', (remoteStream: MediaStream) => {
        console.log(`[WebRTC] Received stream from ${targetUserId}:`, 
          remoteStream.getTracks().map(t => t.kind).join(', '))
        setPeers((prev) => ({
          ...prev,
          [targetUserId]: {
            userId: targetUserId,
            stream: remoteStream,
            peer,
          },
        }))
      })

      peer.on('connect', () => {
        console.log(`[WebRTC] Connected to ${targetUserId}`)
      })

      peer.on('close', () => {
        console.log(`[WebRTC] Connection closed with ${targetUserId}`)
        setPeers((prev) => {
          const next = { ...prev }
          delete next[targetUserId]
          return next
        })
        delete peersRef.current[targetUserId]
      })

      peer.on('error', (err: Error) => {
        console.error(`[WebRTC] Peer error (${targetUserId}):`, err.message)
        // Clean up on error
        delete peersRef.current[targetUserId]
        setPeers((prev) => {
          const next = { ...prev }
          delete next[targetUserId]
          return next
        })
      })

      peersRef.current[targetUserId] = peer
      
      // Process any pending signals for this peer
      const pendingSignals = pendingSignalsRef.current[targetUserId]
      if (pendingSignals && pendingSignals.length > 0) {
        console.log(`[WebRTC] Processing ${pendingSignals.length} pending signals for ${targetUserId}`)
        for (const signal of pendingSignals) {
          try {
            peer.signal(signal)
          } catch (e) {
            console.error('[WebRTC] Error processing pending signal:', e)
          }
        }
        delete pendingSignalsRef.current[targetUserId]
      }
      
      return peer
    },
    [socket, localUserId]
  )

  // ─── Handle incoming signals ─────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleSignal = async (payload: WebRTCSignal) => {
      const { fromUserId, signal } = payload
      
      // Don't process signals from self
      if (fromUserId === localUserId) return
      
      console.log(`[WebRTC] Received signal from ${fromUserId}:`, 
        typeof signal === 'object' && signal !== null && 'type' in signal ? (signal as {type: string}).type : 'candidate')

      let peer = peersRef.current[fromUserId]
      
      if (!peer) {
        // Create peer as non-initiator (responding to offer)
        peer = await createPeer(fromUserId, false)
      }
      
      if (peer) {
        try {
          peer.signal(signal)
        } catch (e) {
          console.error('[WebRTC] Error processing signal:', e)
          // Queue signal if peer not ready
          if (!pendingSignalsRef.current[fromUserId]) {
            pendingSignalsRef.current[fromUserId] = []
          }
          pendingSignalsRef.current[fromUserId].push(signal)
        }
      }
    }

    socket.on('webrtc:signal', handleSignal)

    return () => {
      socket.off('webrtc:signal', handleSignal)
    }
  }, [socket, localUserId, createPeer])

  // ─── Initiate connections to new participants ───────────
  useEffect(() => {
    // Wait for media to be ready before initiating connections
    if (!isMediaReady || !socket) return
    
    // Connect to participants with higher userId (prevents duplicate connections)
    participantIds.forEach((uid) => {
      if (uid !== localUserId && !peersRef.current[uid] && uid > localUserId) {
        console.log(`[WebRTC] Initiating connection to ${uid} (we: ${localUserId})`)
        createPeer(uid, true)
      }
    })
  }, [participantIds, localUserId, createPeer, isMediaReady, socket])

  // ─── Cleanup on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      console.log('[WebRTC] Cleaning up all peers')
      Object.values(peersRef.current).forEach((p) => {
        try {
          p.destroy()
        } catch (e) {
          // Ignore cleanup errors
        }
      })
      peersRef.current = {}
      stopMedia()
    }
  }, [stopMedia])

  return { peers, localStream, startMedia, stopMedia, toggleMute, toggleCamera, isMediaReady }
}
