import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { customAlphabet } from 'nanoid'
import QRCode from 'qrcode'
import { z } from 'zod'
import { createRoom, getRoom, deleteRoom } from '../lib/redis'
import { authMiddleware } from '../middleware/auth'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

const CreateRoomSchema = z.object({
  name: z.string().max(80).optional(),
})

const AddQueueSchema = z.object({
  videoId:   z.string().min(1),
  videoType: z.enum(['youtube', 'upload', 'url']),
  title:     z.string().min(1).max(200),
  thumbnail: z.string().url().optional().nullable(),
})

export async function roomRoutes(app: FastifyInstance): Promise<void> {

  // ─── POST /rooms — Create a new room ────────────────────────────
  app.post('/rooms', {
    preHandler: authMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body  = CreateRoomSchema.safeParse(request.body)
    const name  = body.success ? (body.data.name ?? null) : null
    const roomId = nanoid()
    const hostId = request.userId ?? `anon_${nanoid(6)}`

    const room       = await createRoom(roomId, hostId, name)
    const frontendUrl = process.env.FRONTEND_URL || 'https://synchra.app'
    const inviteUrl  = `${frontendUrl}/room/${roomId}`

    // Generate QR code as data URI
    const qrCodeUrl = await QRCode.toDataURL(inviteUrl, {
      color: { dark: '#E5B754', light: '#0A0A0F' },
      width: 256,
      margin: 2,
    })

    return reply.code(201).send({
      roomId,
      inviteUrl,
      qrCodeUrl,
      createdAt: room.createdAt,
    })
  })

  // ─── GET /rooms/:id — Get room metadata ─────────────────────────
  app.get('/rooms/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const room = await getRoom(request.params.id)

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' })
    }

    // Return safe subset (no full state — that comes via WebSocket)
    return reply.send({
      roomId:      room.roomId,
      name:        room.name,
      createdAt:   room.createdAt,
      lastActivity: room.lastActivity,
      participantCount: Object.keys(room.participants).length,
      currentVideoId:  room.playback.videoId,
      currentVideoType: room.playback.videoType,
    })
  })

  // ─── DELETE /rooms/:id — Delete room (host only) ─────────────────
  app.delete('/rooms/:id', {
    preHandler: authMiddleware,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const room = await getRoom(request.params.id)

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' })
    }

    if (room.hostId !== request.userId) {
      return reply.code(403).send({ error: 'Only the host can delete this room' })
    }

    await deleteRoom(request.params.id)
    return reply.code(204).send()
  })

  // ─── POST /rooms/:id/upload — Get GCS signed upload URL ─────────
  app.post('/rooms/:id/upload', {
    preHandler: authMiddleware,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const room = await getRoom(request.params.id)
    if (!room) {
      return reply.code(404).send({ error: 'Room not found' })
    }

    const videoId = nanoid(16)

    try {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME || 'synchra-videos')

      const [url] = await bucket.file(`uploads/${videoId}/original`).getSignedUrl({
        version:     'v4',
        action:      'write',
        expires:     Date.now() + 15 * 60 * 1000,
        contentType: 'video/mp4',
      })

      return reply.send({ uploadUrl: url, videoId })
    } catch {
      // Fallback for local dev (no GCS configured)
      return reply.send({
        uploadUrl: `http://localhost:3001/upload-placeholder/${videoId}`,
        videoId,
        _dev: true,
      })
    }
  })

  // ─── GET /rooms/:id/queue ─────────────────────────────────────────
  app.get('/rooms/:id/queue', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const room = await getRoom(request.params.id)
    if (!room) return reply.code(404).send({ error: 'Room not found' })
    return reply.send({ queue: room.queue })
  })
}
