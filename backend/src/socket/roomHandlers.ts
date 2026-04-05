import { Server, Socket } from 'socket.io'
import {
  Participant,
  JoinRoomPayload,
  ChatMessage,
  ReactionPayload,
  WebRTCSignal,
  QueueItem,
} from '../types/index'
import {
  getRoom,
  createRoom,
  setPresence,
  removePresence,
  getRoomParticipants,
  setRoomHost,
  refreshPresence,
  updateRoomQueue,
  updateParticipant,
} from '../lib/redis'
import { verifyFirebaseToken } from '../lib/firebase'
import { customAlphabet } from 'nanoid'
import { registerPlaybackHandlers } from './playbackHandlers'

const nanoid   = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)
const msgNanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 12)

// ─────────────────────────────────────────────────────────────────
// Room Handlers — joining, leaving, chat, reactions, WebRTC signal
// ─────────────────────────────────────────────────────────────────

export function registerRoomHandlers(io: Server, socket: Socket): void {

  let currentRoomId: string | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  // ─── JOIN ROOM ─────────────────────────────────────────────────
  socket.on('room:join', async (payload: JoinRoomPayload) => {
    const { roomId, token, displayName, avatarUrl } = payload

    // Resolve userId from Firebase token (or generate anonymous ID)
    let userId   = `anon_${nanoid(6)}`
    let isAnon   = true

    if (token) {
      const decoded = await verifyFirebaseToken(token)
      if (decoded) {
        userId = decoded.uid
        isAnon = decoded.firebase?.sign_in_provider === 'anonymous'
      }
    }

    socket.data.userId      = userId
    socket.data.displayName = displayName
    socket.data.roomId      = roomId

    // Create room if it doesn't exist
    let room = await getRoom(roomId)
    if (!room) {
      room = await createRoom(roomId, userId)
    }

    const participant: Participant = {
      userId,
      displayName: displayName || 'Viewer',
      avatarUrl:   avatarUrl ?? null,
      isHost:      false, // corrected below after host promotion check
      isMuted:     false,
      isCameraOff: false,
      joinedAt:    Date.now(),
      syncQuality: 'good',
    }

    // Join Socket.IO room
    await socket.join(roomId)
    currentRoomId = roomId

    // If the room's host is not present (first join via socket),
    // promote this joiner to host so someone can always control playback
    const existingParticipants = await getRoomParticipants(roomId)
    if (existingParticipants.length === 0) {
      await setRoomHost(roomId, userId)
      const updatedRoom = await getRoom(roomId)
      if (updatedRoom) room = updatedRoom
    }

    const resolvedIsHost = room.hostId === userId

    const participant2: Participant = { ...participant, isHost: resolvedIsHost }

    // Store presence with correct isHost flag
    await setPresence(roomId, participant2)

    // Fetch fresh participant list
    const participants = await getRoomParticipants(roomId)

    // Send full room state to the joining client — include localUserId
    socket.emit('room:state', {
      roomId,
      localUserId:  userId,
      name:         room.name,
      hostId:       room.hostId,
      playback:     room.playback,
      queue:        room.queue,
      participants: Object.fromEntries(participants.map((p) => [p.userId, p])),
    })

    // Notify all OTHER room members
    socket.to(roomId).emit('room:participantJoined', participant2)

    // Register all event handlers for this socket/room session
    registerPlaybackHandlers(io, socket, roomId)
    registerChatHandlers(io, socket, roomId, userId, displayName, avatarUrl)
    registerReactionHandlers(io, socket, roomId, userId)
    registerWebRTCHandlers(io, socket, roomId, userId)
    registerQueueHandlers(io, socket, roomId, userId)
    registerMediaStateHandlers(io, socket, roomId, userId)

    // Heartbeat to keep presence alive
    heartbeatInterval = setInterval(async () => {
      await refreshPresence(roomId, userId)
    }, 15_000)

    console.log(`[Room ${roomId}] ${displayName} (${userId}) joined. Host: ${resolvedIsHost}`)
  })

  // ─── LEAVE ROOM ────────────────────────────────────────────────
  async function leaveRoom(): Promise<void> {
    if (!currentRoomId) return

    const roomId = currentRoomId
    const userId = socket.data.userId as string

    clearInterval(heartbeatInterval!)
    await socket.leave(roomId)
    await removePresence(roomId, userId)

    io.to(roomId).emit('room:participantLeft', { userId })

    // Promote next host if needed
    const room = await getRoom(roomId)
    if (room && room.hostId === userId) {
      const remaining = await getRoomParticipants(roomId)
      if (remaining.length > 0) {
        const newHost = remaining.sort((a, b) => a.joinedAt - b.joinedAt)[0]
        await setRoomHost(roomId, newHost.userId)
        await updateParticipant(roomId, newHost.userId, { isHost: true })
        io.to(roomId).emit('room:hostChanged', { newHostId: newHost.userId })
        console.log(`[Room ${roomId}] Host changed to ${newHost.displayName}`)
      }
    }

    currentRoomId = null
    console.log(`[Room ${roomId}] ${socket.data.displayName} left`)
  }

  socket.on('room:leave', leaveRoom)
  socket.on('disconnect', leaveRoom)
}

// ─── CHAT HANDLERS ─────────────────────────────────────────────
function registerChatHandlers(
  io: Server,
  socket: Socket,
  roomId: string,
  userId: string,
  displayName: string,
  avatarUrl: string | null
): void {
  socket.on('chat:message', (payload: { text: string }) => {
    if (!payload.text?.trim()) return
    if (payload.text.length > 500) return

    const message: ChatMessage = {
      id:          msgNanoid(),
      userId,
      displayName,
      avatarUrl,
      text:        payload.text.trim(),
      timestamp:   Date.now(),
    }

    io.to(roomId).emit('chat:message', message)
  })
}

// ─── REACTION HANDLERS ─────────────────────────────────────────
function registerReactionHandlers(
  io: Server,
  socket: Socket,
  roomId: string,
  userId: string
): void {
  const ALLOWED_REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '😭', '🎉', '👎']

  socket.on('reaction:send', (payload: { emoji: string }) => {
    if (!ALLOWED_REACTIONS.includes(payload.emoji)) return

    const reaction: ReactionPayload = {
      userId,
      emoji:     payload.emoji,
      timestamp: Date.now(),
    }

    io.to(roomId).emit('reaction:broadcast', reaction)
  })
}

// ─── WEBRTC SIGNAL FORWARDING ──────────────────────────────────
function registerWebRTCHandlers(
  io: Server,
  socket: Socket,
  roomId: string,
  userId: string
): void {
  // Forward WebRTC signals directly to target peer
  socket.on('webrtc:signal', (payload: WebRTCSignal) => {
    const targetSocket = [...io.sockets.sockets.values()].find(
      (s) => s.data.userId === payload.targetUserId && s.rooms.has(roomId)
    )
    if (targetSocket) {
      targetSocket.emit('webrtc:signal', {
        ...payload,
        fromUserId: userId,
      })
    }
  })
}

// ─── QUEUE HANDLERS ────────────────────────────────────────────
function registerQueueHandlers(
  io: Server,
  socket: Socket,
  roomId: string,
  userId: string
): void {
  socket.on('queue:add', async (item: Omit<QueueItem, 'id' | 'addedBy' | 'addedAt'>) => {
    const room = await getRoom(roomId)
    if (!room) return

    const queueItem: QueueItem = {
      id:        nanoid(),
      videoId:   item.videoId,
      videoType: item.videoType,
      title:     item.title.slice(0, 200),
      thumbnail: item.thumbnail ?? null,
      addedBy:   userId,
      addedAt:   Date.now(),
    }

    const updated = [...room.queue, queueItem]
    await updateRoomQueue(roomId, updated)
    io.to(roomId).emit('queue:updated', { queue: updated })
  })

  socket.on('queue:remove', async (payload: { itemId: string }) => {
    const room = await getRoom(roomId)
    if (!room) return

    if (room.hostId !== userId) return

    const updated = room.queue.filter((q) => q.id !== payload.itemId)
    await updateRoomQueue(roomId, updated)
    io.to(roomId).emit('queue:updated', { queue: updated })
  })

  socket.on('queue:reorder', async (payload: { fromIndex: number; toIndex: number }) => {
    const room = await getRoom(roomId)
    if (!room || room.hostId !== userId) return

    const q = [...room.queue]
    const [item] = q.splice(payload.fromIndex, 1)
    q.splice(payload.toIndex, 0, item)

    await updateRoomQueue(roomId, q)
    io.to(roomId).emit('queue:updated', { queue: q })
  })
}

// ─── MEDIA STATE HANDLERS (mute/camera) ──────────────────────
function registerMediaStateHandlers(
  io: Server,
  socket: Socket,
  roomId: string,
  userId: string
): void {
  socket.on('media:muted', async (payload: { isMuted: boolean }) => {
    await updateParticipant(roomId, userId, { isMuted: payload.isMuted })
    socket.to(roomId).emit('room:participantUpdated', { userId, isMuted: payload.isMuted })
  })

  socket.on('media:cameraOff', async (payload: { isCameraOff: boolean }) => {
    await updateParticipant(roomId, userId, { isCameraOff: payload.isCameraOff })
    socket.to(roomId).emit('room:participantUpdated', { userId, isCameraOff: payload.isCameraOff })
  })
}
