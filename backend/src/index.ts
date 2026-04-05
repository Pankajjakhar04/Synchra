import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { Server as SocketIOServer } from 'socket.io'
import { getRedis } from './lib/redis'
import { initFirebase } from './lib/firebase'
import { setupSocketIO } from './socket/index'
import { roomRoutes } from './routes/rooms'
import { authRoutes } from './routes/auth'

const PORT         = parseInt(process.env.PORT || '3000')
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const NODE_ENV     = process.env.NODE_ENV || 'development'

async function bootstrap(): Promise<void> {
  // ─── Initialize Firebase ─────────────────────────────────────
  initFirebase()

  // ─── Initialize Redis (connect early to fail fast) ───────────
  const redis = getRedis()
  await redis.ping()
  console.log('[Redis] Ping OK')

  // ─── Create Fastify Instance ─────────────────────────────────
  const app = Fastify({
    logger: {
      level:     NODE_ENV === 'production' ? 'info' : 'warn',
      transport: NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
    disableRequestLogging: NODE_ENV === 'production',
  })

  // ─── Security & CORS ─────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  await app.register(cors, {
    origin: [
      FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      /\.synchra\.app$/,
    ],
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // ─── Rate Limiting (in-memory) ────────────────────────────────
  await app.register(rateLimit, {
    max:        100,
    timeWindow: '1 minute',
  })

  // ─── Health Check ─────────────────────────────────────────────
  app.get('/health', async () => ({
    status:    'ok',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
    env:       NODE_ENV,
  }))

  // ─── API Routes ───────────────────────────────────────────────
  await app.register(roomRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api' })

  // ─── Attach Socket.IO directly to Fastify's underlying server ─
  // Must call app.listen() first so app.server is bound
  await app.listen({ port: PORT, host: '0.0.0.0' })

  const io = new SocketIOServer(app.server, {
    cors: {
      origin:      [FRONTEND_URL, 'http://localhost:5173'],
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports:       ['websocket', 'polling'],
    pingTimeout:       60_000,
    pingInterval:      25_000,
    upgradeTimeout:    30_000,
    maxHttpBufferSize: 1e6,
  })

  setupSocketIO(io)

  console.log(`\n🎬 SYNCHRA Backend running on port ${PORT}`)
  console.log(`   Environment : ${NODE_ENV}`)
  console.log(`   Frontend URL: ${FRONTEND_URL}`)
  console.log(`   Health:       http://localhost:${PORT}/health\n`)

  // ─── Graceful Shutdown (SIGTERM for Cloud Run) ─────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully`)
    await app.close()
    console.log('[Server] HTTP server closed')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('[FATAL] Failed to start server:', err)
  process.exit(1)
})
