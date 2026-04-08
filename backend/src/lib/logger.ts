import { FastifyBaseLogger } from 'fastify'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789abcdef', 8)

// Logger instance - will be set by the server
let logger: FastifyBaseLogger | null = null

export function setLogger(l: FastifyBaseLogger) {
  logger = l
}

export function getLogger(): FastifyBaseLogger | null {
  return logger
}

// Generate request ID
export function generateRequestId(): string {
  return `req_${nanoid()}`
}

// Helper to safely log
function log(level: 'info' | 'warn' | 'error' | 'debug', obj: object, msg: string) {
  if (logger) {
    logger[level](obj, msg)
  } else {
    console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}]`, msg, obj)
  }
}

// Structured log helpers for common events
export const logEvents = {
  // Room events
  roomCreated: (roomId: string, hostId: string) => {
    log('info', {
      event: 'room_created',
      roomId,
      hostId,
    }, `Room ${roomId} created by ${hostId}`)
  },

  roomJoined: (roomId: string, userId: string, displayName: string, isHost: boolean) => {
    log('info', {
      event: 'room_joined',
      roomId,
      userId,
      displayName,
      isHost,
    }, `${displayName} joined room ${roomId}`)
  },

  roomLeft: (roomId: string, userId: string, displayName: string) => {
    log('info', {
      event: 'room_left',
      roomId,
      userId,
      displayName,
    }, `${displayName} left room ${roomId}`)
  },

  hostChanged: (roomId: string, oldHostId: string, newHostId: string) => {
    log('info', {
      event: 'host_changed',
      roomId,
      oldHostId,
      newHostId,
    }, `Host changed in room ${roomId}: ${oldHostId} -> ${newHostId}`)
  },

  // Playback events
  playbackStateChanged: (roomId: string, state: string, userId: string) => {
    log('debug', {
      event: 'playback_state_changed',
      roomId,
      state,
      triggeredBy: userId,
    }, `Playback ${state} in room ${roomId}`)
  },

  // Connection events
  socketConnected: (socketId: string) => {
    log('debug', {
      event: 'socket_connected',
      socketId,
    }, `Socket connected: ${socketId}`)
  },

  socketDisconnected: (socketId: string, reason: string) => {
    log('debug', {
      event: 'socket_disconnected',
      socketId,
      reason,
    }, `Socket disconnected: ${socketId} (${reason})`)
  },

  // Error events
  error: (error: Error, context?: Record<string, unknown>) => {
    log('error', {
      event: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    }, error.message)
  },

  // Auth events
  authSuccess: (userId: string, provider: string) => {
    log('debug', {
      event: 'auth_success',
      userId,
      provider,
    }, `Auth success: ${userId} via ${provider}`)
  },

  authFailure: (reason: string, ip?: string) => {
    log('warn', {
      event: 'auth_failure',
      reason,
      ip,
    }, `Auth failed: ${reason}`)
  },

  // Performance events
  syncAccuracy: (roomId: string, userId: string, driftMs: number) => {
    log('debug', {
      event: 'sync_accuracy',
      roomId,
      userId,
      driftMs,
      quality: driftMs < 80 ? 'good' : driftMs < 500 ? 'warn' : 'bad',
    }, `Sync drift: ${driftMs}ms in room ${roomId}`)
  },
}

export default { setLogger, getLogger, logEvents, generateRequestId }
