import Redis from 'ioredis'
import {
  RoomState,
  Participant,
  PlaybackState,
  QueueItem,
  createInitialPlaybackState
} from '../types/index'

// ─────────────────────────────────────────────
// Redis Client (or in-memory fallback)
// ─────────────────────────────────────────────
let redisClient: Redis | null = null
let redisAvailable = false

// In-memory fallback store when Redis is unavailable
const memoryStore = new Map<string, { value: string; expireAt: number }>()

function cleanExpiredMemoryEntries(): void {
  const now = Date.now()
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expireAt > 0 && entry.expireAt < now) {
      memoryStore.delete(key)
    }
  }
}

export function getRedis(): Redis | null {
  if (redisClient && redisAvailable) return redisClient
  if (redisClient) return null // Already tried, not available
  
  // Skip Redis if no REDIS_URL is set
  if (!process.env.REDIS_URL) {
    console.log('[Redis] No REDIS_URL set, using in-memory storage')
    return null
  }
  
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 5000),
      lazyConnect: false,
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected')
      redisAvailable = true
    })
    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err.message)
      redisAvailable = false
    })
    redisClient.on('reconnecting', () => console.log('[Redis] Reconnecting...'))
    
    return redisClient
  } catch (err) {
    console.log('[Redis] Failed to initialize, using in-memory storage')
    return null
  }
}

// Storage abstraction that works with Redis or memory
async function storageGet(key: string): Promise<string | null> {
  const redis = getRedis()
  if (redis) {
    return redis.get(key)
  }
  cleanExpiredMemoryEntries()
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (entry.expireAt > 0 && entry.expireAt < Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return entry.value
}

async function storageSetex(key: string, ttlSeconds: number, value: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.setex(key, ttlSeconds, value)
    return
  }
  memoryStore.set(key, { value, expireAt: Date.now() + ttlSeconds * 1000 })
}

async function storageDel(key: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.del(key)
    return
  }
  memoryStore.delete(key)
}

async function storageKeys(pattern: string): Promise<string[]> {
  const redis = getRedis()
  if (redis) {
    return redis.keys(pattern)
  }
  cleanExpiredMemoryEntries()
  // Simple pattern matching for presence:roomId:*
  const prefix = pattern.replace('*', '')
  return Array.from(memoryStore.keys()).filter(k => k.startsWith(prefix))
}

async function storageMget(...keys: string[]): Promise<(string | null)[]> {
  const redis = getRedis()
  if (redis) {
    return redis.mget(...keys)
  }
  return keys.map(key => {
    const entry = memoryStore.get(key)
    if (!entry) return null
    if (entry.expireAt > 0 && entry.expireAt < Date.now()) {
      memoryStore.delete(key)
      return null
    }
    return entry.value
  })
}

async function storageExpire(key: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.expire(key, ttlSeconds)
    return
  }
  const entry = memoryStore.get(key)
  if (entry) {
    entry.expireAt = Date.now() + ttlSeconds * 1000
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    redisAvailable = false
  }
}

// ─────────────────────────────────────────────
// Key Helpers
// ─────────────────────────────────────────────
const ROOM_KEY       = (id: string) => `room:${id}`
const PRESENCE_KEY   = (roomId: string, userId: string) => `presence:${roomId}:${userId}`
const PRESENCE_GLOB  = (roomId: string) => `presence:${roomId}:*`
const PROFILE_KEY    = (userId: string) => `profile:${userId}`
const ROOM_TTL       = 60 * 60 * 24      // 24 hours
const PRESENCE_TTL   = 30                // 30 seconds — heartbeat must keep alive
const PROFILE_TTL    = 60 * 60 * 24 * 30 // 30 days

// ─────────────────────────────────────────────
// Room State Operations
// ─────────────────────────────────────────────
export async function createRoom(roomId: string, hostId: string, name: string | null = null): Promise<RoomState> {
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

  await storageSetex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
  return room
}

export async function getRoom(roomId: string): Promise<RoomState | null> {
  const raw = await storageGet(ROOM_KEY(roomId))
  if (!raw) return null
  return JSON.parse(raw) as RoomState
}

export async function updateRoomPlayback(roomId: string, playback: PlaybackState): Promise<void> {
  const room = await getRoom(roomId)
  if (!room) return

  room.playback     = playback
  room.lastActivity = Date.now()
  await storageSetex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
}

export async function updateRoomQueue(roomId: string, queue: QueueItem[]): Promise<void> {
  const room = await getRoom(roomId)
  if (!room) return

  room.queue        = queue
  room.lastActivity = Date.now()
  await storageSetex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
}

export async function setRoomHost(roomId: string, newHostId: string): Promise<void> {
  const room = await getRoom(roomId)
  if (!room) return

  room.hostId       = newHostId
  room.lastActivity = Date.now()
  await storageSetex(ROOM_KEY(roomId), ROOM_TTL, JSON.stringify(room))
}

export async function deleteRoom(roomId: string): Promise<void> {
  await storageDel(ROOM_KEY(roomId))
}

// ─────────────────────────────────────────────
// Presence Operations
// ─────────────────────────────────────────────
export async function setPresence(roomId: string, participant: Participant): Promise<void> {
  await storageSetex(
    PRESENCE_KEY(roomId, participant.userId),
    PRESENCE_TTL,
    JSON.stringify(participant)
  )
}

export async function refreshPresence(roomId: string, userId: string): Promise<void> {
  await storageExpire(PRESENCE_KEY(roomId, userId), PRESENCE_TTL)
}

export async function removePresence(roomId: string, userId: string): Promise<void> {
  await storageDel(PRESENCE_KEY(roomId, userId))
}

export async function getRoomParticipants(roomId: string): Promise<Participant[]> {
  const keys = await storageKeys(PRESENCE_GLOB(roomId))
  if (!keys.length) return []

  const values = await storageMget(...keys)
  return values
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v) as Participant)
}

export async function updateParticipant(roomId: string, userId: string, updates: Partial<Participant>): Promise<void> {
  const raw = await storageGet(PRESENCE_KEY(roomId, userId))
  if (!raw) return

  const current = JSON.parse(raw) as Participant
  const updated = { ...current, ...updates }
  await storageSetex(PRESENCE_KEY(roomId, userId), PRESENCE_TTL, JSON.stringify(updated))
}

// ─────────────────────────────────────────────
// User Profile Operations
// ─────────────────────────────────────────────
export interface UserProfile {
  userId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  createdAt: number
  updatedAt: number
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const raw = await storageGet(PROFILE_KEY(userId))
  if (!raw) return null
  return JSON.parse(raw) as UserProfile
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  await storageSetex(PROFILE_KEY(profile.userId), PROFILE_TTL, JSON.stringify(profile))
}
