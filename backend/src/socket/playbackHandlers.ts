import { Server, Socket } from 'socket.io'
import {
  PlaybackState,
  getCurrentPosition,
  createInitialPlaybackState,
  VideoType,
} from '../types/index'
import {
  getRoom,
  updateRoomPlayback,
  setRoomHost,
  getRoomParticipants,
} from '../lib/redis'

// ─────────────────────────────────────────────────────────────────
// D1 — Server-Authoritative Playback State Machine
// All playback control logic lives here. Only the host can trigger.
// ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function makeState(
  old: PlaybackState,
  override: Partial<PlaybackState>,
  now = Date.now()
): PlaybackState {
  const currentPos = getCurrentPosition(old, now)
  return {
    ...old,
    baseVideoTime:  currentPos,
    baseServerTime: now,
    ...override,
  }
}

export function registerPlaybackHandlers(io: Server, socket: Socket, roomId: string): void {
  const userId = socket.data.userId as string

  // ─── Verify caller is host ───────────────────────────────────
  async function isHost(): Promise<boolean> {
    const room = await getRoom(roomId)
    return room?.hostId === userId
  }

  // ─── SET VIDEO — Change what's playing ──────────────────────
  socket.on('playback:setVideo', async (payload: {
    videoId: string
    videoType: VideoType
    duration?: number
  }) => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    const newState: PlaybackState = {
      ...createInitialPlaybackState(payload.videoId, payload.videoType),
      duration: payload.duration ?? 0,
      isPlaying: false,
      baseServerTime: Date.now(),
    }

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
    console.log(`[Room ${roomId}] Video set to ${payload.videoId} (${payload.videoType})`)
  })

  // ─── PLAY ────────────────────────────────────────────────────
  socket.on('playback:play', async (payload: { videoTime: number }) => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    const now      = Date.now()
    const newState = makeState(room.playback, {
      baseVideoTime:  payload.videoTime,
      baseServerTime: now,
      isPlaying:      true,
      isBuffering:    false,
      bufferingSince: null,
    }, now)

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
  })

  // ─── PAUSE ───────────────────────────────────────────────────
  socket.on('playback:pause', async (payload: { videoTime: number }) => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    const now      = Date.now()
    const newState = makeState(room.playback, {
      baseVideoTime:  payload.videoTime,
      baseServerTime: now,
      isPlaying:      false,
      isBuffering:    false,
    }, now)

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
  })

  // ─── SEEK ────────────────────────────────────────────────────
  socket.on('playback:seek', async (payload: { videoTime: number }) => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    const now      = Date.now()
    const newState: PlaybackState = {
      ...room.playback,
      baseVideoTime:  Math.max(0, payload.videoTime),
      baseServerTime: now,
    }

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
  })

  // ─── RATE CHANGE ─────────────────────────────────────────────
  socket.on('playback:rateChange', async (payload: { rate: number }) => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    const rate     = Math.max(0.25, Math.min(2.0, payload.rate))
    const now      = Date.now()
    const newState = makeState(room.playback, { rate }, now)

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
  })

  // ─── HOST BUFFER START (unique to Synchra) ───────────────────
  socket.on('playback:bufferStart', async () => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    const now      = Date.now()
    const currentPos = getCurrentPosition(room.playback, now)
    const newState: PlaybackState = {
      ...room.playback,
      isBuffering:    true,
      isPlaying:      false,
      baseVideoTime:  currentPos,
      baseServerTime: now,
      bufferingSince: now,
    }

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
    io.to(roomId).emit('room:notice', { message: '⏳ Host is buffering — pausing for everyone...' })
    console.log(`[Room ${roomId}] Host buffering started at ${currentPos.toFixed(2)}s`)
  })

  // ─── HOST BUFFER END → 3-2-1 COUNTDOWN → RESUME ──────────────
  socket.on('playback:bufferEnd', async () => {
    if (!await isHost()) return

    const room = await getRoom(roomId)
    if (!room) return

    // Countdown broadcast
    for (const count of [3, 2, 1]) {
      io.to(roomId).emit('room:countdown', { count })
      await sleep(1000)
    }

    const now      = Date.now()
    const newState: PlaybackState = {
      ...room.playback,
      isBuffering:    false,
      isPlaying:      true,
      baseServerTime: now,
      bufferingSince: null,
    }

    await updateRoomPlayback(roomId, newState)
    io.to(roomId).emit('playback:state', newState)
    console.log(`[Room ${roomId}] Host buffer ended — resuming all clients`)
  })

  // ─── SYNC QUALITY REPORT (from clients) ─────────────────────
  socket.on('sync:quality', async (payload: {
    drift: number
    rtt: number
    quality: 'good' | 'warn' | 'bad'
  }) => {
    // Broadcast to room (so host can see everyone's sync health)
    socket.to(roomId).emit('sync:peerQuality', {
      userId,
      ...payload,
    })
  })
}
