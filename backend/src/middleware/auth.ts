import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyFirebaseToken } from '../lib/firebase'

declare module 'fastify' {
  interface FastifyRequest {
    userId:      string | null
    displayName: string | null
    isAnonymous: boolean
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    request.userId      = null
    request.displayName = null
    request.isAnonymous = true
    return
  }

  const token   = authHeader.slice(7)
  const decoded = await verifyFirebaseToken(token)

  if (!decoded) {
    request.userId      = null
    request.displayName = null
    request.isAnonymous = true
    return
  }

  request.userId      = decoded.uid
  request.displayName = decoded.name ?? decoded.email ?? 'Anonymous'
  request.isAnonymous = decoded.firebase?.sign_in_provider === 'anonymous'
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await authMiddleware(request, reply)

  if (!request.userId) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Valid Firebase ID token required' })
  }
}
