// ============================================================
// SYNCHRA — Shared Types
// Used by both client and server (mirrored in frontend/src/types)
// ============================================================

export type VideoType = 'youtube' | 'upload' | 'url'

// ─────────────────────────────────────────────
// D1 — Playback State Machine
// ─────────────────────────────────────────────
export interface PlaybackState {
  baseVideoTime:  number         // seconds into video at reference point
  baseServerTime: number         // server epoch ms when baseVideoTime was set
  isPlaying:      boolean
  rate:           number         // 1.0 normal, 0.5–2.0 supported
  videoId:        string
  videoType:      VideoType
  isBuffering:    boolean
  bufferingSince: number | null
  duration:       number         // total video duration in seconds
}

export function createInitialPlaybackState(videoId = '', videoType: VideoType = 'youtube'): PlaybackState {
  return {
    baseVideoTime:  0,
    baseServerTime: Date.now(),
    isPlaying:      false,
    rate:           1.0,
    videoId,
    videoType,
    isBuffering:    false,
    bufferingSince: null,
    duration:       0,
  }
}

// Compute exact current video position at any instant
export function getCurrentPosition(state: PlaybackState, now = Date.now()): number {
  if (!state.isPlaying || state.isBuffering) {
    return state.baseVideoTime
  }
  const elapsedMs  = now - state.baseServerTime
  const elapsedSec = (elapsedMs / 1000) * state.rate
  return state.baseVideoTime + elapsedSec
}

// ─────────────────────────────────────────────
// Room & Participants
// ─────────────────────────────────────────────
export interface Participant {
  userId:      string
  displayName: string
  avatarUrl:   string | null
  isHost:      boolean
  isMuted:     boolean
  isCameraOff: boolean
  joinedAt:    number           // epoch ms
  syncQuality: 'good' | 'warn' | 'bad' // green/yellow/red
}

export interface QueueItem {
  id:        string
  videoId:   string
  videoType: VideoType
  title:     string
  thumbnail: string | null
  addedBy:   string            // userId
  addedAt:   number            // epoch ms
}

export interface RoomState {
  roomId:        string
  name:          string | null
  hostId:        string
  playback:      PlaybackState
  queue:         QueueItem[]
  participants:  Record<string, Participant>
  createdAt:     number
  lastActivity:  number
}

// ─────────────────────────────────────────────
// Socket.IO Event Payloads
// ─────────────────────────────────────────────
export interface JoinRoomPayload {
  roomId:      string
  token:       string | null   // Firebase JWT (null = anonymous)
  displayName: string
  avatarUrl:   string | null
}

export interface ChatMessage {
  id:        string
  userId:    string
  displayName: string
  avatarUrl: string | null
  text:      string
  timestamp: number
}

export interface ReactionPayload {
  userId:    string
  emoji:     string
  timestamp: number
}

export interface WebRTCSignal {
  targetUserId: string
  fromUserId:   string
  signal:       unknown        // simple-peer signal data
}

export interface SyncQualityReport {
  userId:    string
  drift:     number            // ms
  rtt:       number            // ms
  quality:   'good' | 'warn' | 'bad'
}

// ─────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────
export interface CreateRoomResponse {
  roomId:    string
  inviteUrl: string
  qrCodeUrl: string
}

export interface UploadUrlResponse {
  uploadUrl: string
  videoId:   string
}
