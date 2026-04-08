import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { getRedis } from '../lib/redis'
import { registerRoomHandlers } from './roomHandlers'
import { registerClockHandlers } from './clockHandlers'

export function setupSocketIO(io: Server): void {
  // ─── Redis Adapter (optional - allows horizontal scaling on Cloud Run) ───
  const pubClient = getRedis()
  if (pubClient) {
    const subClient = pubClient.duplicate()
    io.adapter(createAdapter(pubClient, subClient))
    console.log('[Socket.IO] Redis adapter attached')
  } else {
    console.log('[Socket.IO] Using default in-memory adapter (no Redis)')
  }

  // ─── Room namespace: /room ─────────────────────────────────────
  const roomNs = io.of('/room')

  roomNs.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)

    // Register clock sync (works for any client, no room required)
    registerClockHandlers(socket)

    // Register room lifecycle handlers (join, leave, chat, etc.)
    registerRoomHandlers(roomNs as unknown as Server, socket)

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`)
    })
  })
}
