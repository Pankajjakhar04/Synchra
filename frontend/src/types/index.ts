// Shared types — mirrored from backend/src/types/index.ts
// Keep in sync manually or use a shared package in production

export type VideoType = 'youtube' | 'upload' | 'url'
export type SyncQuality = 'good' | 'warn' | 'bad'

export interface PlaybackState {
  baseVideoTime:  number
  baseServerTime: number
  isPlaying:      boolean
  rate:           number
  videoId:        string
  videoType:      VideoType
  isBuffering:    boolean
  bufferingSince: number | null
  duration:       number
}

export function getCurrentPosition(state: PlaybackState, now = Date.now()): number {
  if (!state.isPlaying || state.isBuffering) return state.baseVideoTime
  const elapsedMs  = now - state.baseServerTime
  const elapsedSec = (elapsedMs / 1000) * state.rate
  return state.baseVideoTime + elapsedSec
}

export interface Participant {
  userId:      string
  displayName: string
  avatarUrl:   string | null
  isHost:      boolean
  isMuted:     boolean
  isCameraOff: boolean
  joinedAt:    number
  syncQuality: SyncQuality
}

export interface QueueItem {
  id:        string
  videoId:   string
  videoType: VideoType
  title:     string
  thumbnail: string | null
  addedBy:   string
  addedAt:   number
}

export interface RoomState {
  roomId:       string
  name:         string | null
  hostId:       string
  playback:     PlaybackState
  queue:        QueueItem[]
  participants: Record<string, Participant>
}

export interface ChatMessage {
  id:          string
  userId:      string
  displayName: string
  avatarUrl:   string | null
  text:        string
  timestamp:   number
}

export interface ReactionPayload {
  userId:    string
  emoji:     string
  timestamp: number
}

export interface WebRTCSignal {
  targetUserId: string
  fromUserId:   string
  signal:       unknown
}

// ICE Server configuration
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // TURN server added via env var at runtime
  ...(import.meta.env.VITE_TURN_URL ? [{
    urls:       [import.meta.env.VITE_TURN_URL],
    username:   import.meta.env.VITE_TURN_USERNAME || '',
    credential: import.meta.env.VITE_TURN_PASSWORD || '',
  }] : []),
]
