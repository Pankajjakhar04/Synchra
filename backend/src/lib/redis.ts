import Redis from 'ioredis'
import {
  RoomState,
  Participant,
  PlaybackState,
  QueueItem,
  createInitialPlaybackState
} from '../types/index'

// ─────────────────────────────────────────────
// Redis Client
// ─────────────────────────────────────────────
let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 5000),
      lazyConnect: false,
    })

    redisClient.on('connect',    () => console.log('[Redis] Connected'))
    redisClient.on('error',      (err) => console.error('[Redis] Error:', err))
    redisClient.on('reconnecting', () => console.log('[Redis] Reconnecting...'))
  }
  return redisClient
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

// ─────────────────────────────────────────────
// Key Helpers
// ─────────────────────────────────────────────
const ROOM_KEY       = (id: string) => `room:${id}`
const PRESENCE_KEY   = (roomId: string, userId: string) => `presence:${roomId}:${userId}`
const PRESENCE_GLOB  = (roomId: string) => `presence:${roomId}:*`
const ROOM_TTL       = 60 * 60 * 24      // 24 hours
const PRESENCE_TTL   = 30                // 30 seconds — heartbeat must keep alive

// ─────────────────────────────────────────────
// Room State Operations
// ─────────────────────────────────────────────
export async function createRoom(roomId: string, hostId: string, name: string | null = null): Promise<RoomState> {
  const redis = getRedis()
  const now   = Date.now()

  const room: RoomState = {
    roomId,
    name,
    hostId,
    playback: createInitialPlaybackState(),
    queue: [],
    participants: {},
    createdAt: now,
    lastActivity: now,
  }

  await redis.setex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
  return room
}

export async function getRoom(roomId: string): Promise<RoomState | null> {
  const redis = getRedis()
  const raw   = await redis.get(ROOM_KEY(roomId))
  if (!raw) return null
  return JSON.parse(raw) as RoomState
}

export async function updateRoomPlayback(roomId: string, playback: PlaybackState): Promise<void> {
  const redis = getRedis()
  const room  = await getRoom(roomId)
  if (!room) return

  room.playback     = playback
  room.lastActivity = Date.now()
  await redis.setex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
}

export async function updateRoomQueue(roomId: string, queue: QueueItem[]): Promise<void> {
  const redis = getRedis()
  const room  = await getRoom(roomId)
  if (!room) return

  room.queue        = queue
  room.lastActivity = Date.now()
  await redis.setex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
}

export async function setRoomHost(roomId: string, newHostId: string): Promise<void> {
  const redis = getRedis()
  const room  = await getRoom(roomId)
  if (!room) return

  room.hostId       = newHostId
  room.lastActivity = Date.now()
  await redis.setex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
}

export async function deleteRoom(roomId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(ROOM_KEY(roomId))
}

// ─────────────────────────────────────────────
// Presence Operations
// ─────────────────────────────────────────────
export async function setPresence(roomId: string, participant: Participant): Promise<void> {
  const redis = getRedis()
  await redis.setex(
    PRESENCE_KEY(roomId, participant.userId),
    PRESENCE_TTL,
    JSON.stringify(participant)
  )
}

export async function refreshPresence(roomId: string, userId: string): Promise<void> {
  const redis = getRedis()
  await redis.expire(PRESENCE_KEY(roomId, userId), PRESENCE_TTL)
}

export async function removePresence(roomId: string, userId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(PRESENCE_KEY(roomId, userId))
}

export async function getRoomParticipants(roomId: string): Promise<Participant[]> {
  const redis = getRedis()
  const keys  = await redis.keys(PRESENCE_GLOB(roomId))
  if (!keys.length) return []

  const values = await redis.mget(...keys)
  return values
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v) as Participant)
}

export async function updateParticipant(roomId: string, userId: string, updates: Partial<Participant>): Promise<void> {
  const redis   = getRedis()
  const raw     = await redis.get(PRESENCE_KEY(roomId, userId))
  if (!raw) return

  const current = JSON.parse(raw) as Participant
  const updated = { ...current, ...updates }
  await redis.setex(PRESENCE_KEY(roomId, userId), PRESENCE_TTL, JSON.stringify(updated))
}
