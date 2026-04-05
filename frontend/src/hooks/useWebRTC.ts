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

  // ─── Start local camera/mic ─────────────────────────────
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:     { ideal: 1280, max: 1920 },
          height:    { ideal: 720,  max: 1080 },
          frameRate: { ideal: 30, min: 15, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          sampleRate:       48000,
        },
      })
      localStreamRef.current = stream
      setLocalStream(stream)
    } catch (err) {
      console.error('[WebRTC] getUserMedia failed:', err)
    }
  }, [])

  // ─── Stop local stream ──────────────────────────────────
  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  // ─── Toggle mute ────────────────────────────────────────
  const toggleMute = useCallback((): boolean => {
    const stream = localStreamRef.current
    if (!stream) return true
    const audio = stream.getAudioTracks()[0]
    if (!audio) return true
    audio.enabled = !audio.enabled
    return !audio.enabled
  }, [])

  // ─── Toggle camera ──────────────────────────────────────
  const toggleCamera = useCallback((): boolean => {
    const stream = localStreamRef.current
    if (!stream) return true
    const video = stream.getVideoTracks()[0]
    if (!video) return true
    video.enabled = !video.enabled
    return !video.enabled
  }, [])

  // ─── Create a peer connection ────────────────────────────
  const createPeer = useCallback(
    async (targetUserId: string, initiator: boolean): Promise<void> => {
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
        socket?.emit('webrtc:signal', {
          targetUserId,
          fromUserId: localUserId,
          signal,
        } as WebRTCSignal)
      })

      peer.on('stream', (remoteStream: MediaStream) => {
        setPeers((prev) => ({
          ...prev,
          [targetUserId]: {
            userId: targetUserId,
            stream: remoteStream,
            peer,
          },
        }))
      })

      peer.on('close', () => {
        setPeers((prev) => {
          const next = { ...prev }
          delete next[targetUserId]
          return next
        })
        delete peersRef.current[targetUserId]
      })

      peer.on('error', (err: Error) => {
        console.error(`[WebRTC] Peer error (${targetUserId}):`, err)
      })

      peersRef.current[targetUserId] = peer
    },
    [socket, localUserId]
  )

  // ─── Handle incoming signals ─────────────────────────────
  useEffect(() => {
    if (!socket) return

    socket.on('webrtc:signal', (payload: WebRTCSignal) => {
      const { fromUserId, signal } = payload

      if (!peersRef.current[fromUserId]) {
        createPeer(fromUserId, false)
      }

      peersRef.current[fromUserId]?.signal(signal)
    })

    return () => {
      socket.off('webrtc:signal')
    }
  }, [socket, createPeer])

  // ─── Initiate connections to new participants ───────────
  useEffect(() => {
    participantIds.forEach((uid) => {
      if (uid !== localUserId && !peersRef.current[uid]) {
        createPeer(uid, true)
      }
    })
  }, [participantIds, localUserId, createPeer])

  // ─── Cleanup on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach((p) => p.destroy())
      stopMedia()
    }
  }, [stopMedia])

  return { peers, localStream, startMedia, stopMedia, toggleMute, toggleCamera }
}
