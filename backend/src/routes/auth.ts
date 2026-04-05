import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyFirebaseToken } from '../lib/firebase'

export async function authRoutes(app: FastifyInstance): Promise<void> {

  // ─── POST /auth/verify — Verify a Firebase ID token ─────────────
  app.post('/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.body as { token?: string }

    if (!token) {
      return reply.code(400).send({ error: 'Token is required' })
    }

    const decoded = await verifyFirebaseToken(token)

    if (!decoded) {
      return reply.code(401).send({ error: 'Invalid or expired token' })
    }

    return reply.send({
      uid:         decoded.uid,
      email:       decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL:    decoded.picture ?? null,
      isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
    })
  })

  // ─── GET /auth/me — Get current user info ───────────────────────
  app.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' })
    }

    const token   = authHeader.slice(7)
    const decoded = await verifyFirebaseToken(token)

    if (!decoded) {
      return reply.code(401).send({ error: 'Invalid token' })
    }

    return reply.send({
      uid:         decoded.uid,
      email:       decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL:    decoded.picture ?? null,
      isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
    })
  })
}
