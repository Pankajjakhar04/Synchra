import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { getUserProfile, setUserProfile, UserProfile } from '../lib/redis'

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
  bio: z.string().max(200).optional(),
})

export async function profileRoutes(app: FastifyInstance): Promise<void> {

  // ─── GET /profile — Get current user's profile ────────────────────
  app.get('/profile', {
    preHandler: authMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const profile = await getUserProfile(userId)
    
    if (!profile) {
      // Return default profile for new users
      return reply.send({
        userId,
        displayName: 'Viewer',
        avatarUrl: null,
        bio: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return reply.send(profile)
  })

  // ─── PUT /profile — Update current user's profile ─────────────────
  app.put('/profile', {
    preHandler: authMiddleware,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const body = UpdateProfileSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request', details: body.error.flatten() })
    }

    const existing = await getUserProfile(userId)
    const now = Date.now()

    const profile: UserProfile = {
      userId,
      displayName: body.data.displayName ?? existing?.displayName ?? 'Viewer',
      avatarUrl: body.data.avatarUrl !== undefined ? body.data.avatarUrl : (existing?.avatarUrl ?? null),
      bio: body.data.bio ?? existing?.bio ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await setUserProfile(profile)

    return reply.send(profile)
  })

  // ─── GET /profile/:userId — Get another user's public profile ─────
  app.get('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply) => {
    const profile = await getUserProfile(request.params.userId)

    if (!profile) {
      return reply.code(404).send({ error: 'User not found' })
    }

    // Return public subset only
    return reply.send({
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
    })
  })
}
