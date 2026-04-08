# SYNCHRA 🎬

> The world's best watch party platform. Cinema Noir design. Sub-80ms sync. Zero install.

Built entirely on GCP's $300 free credits — beating Teleparty, Watch2Gether, Rave, and every competitor.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind v4, Zustand, Framer Motion |
| Backend | Node.js 22, Fastify, Socket.IO v4, ioredis |
| Auth | Firebase Auth (Google + Anonymous) |
| State/Cache | Redis (self-hosted on Cloud Run or in-memory fallback) |
| Storage | Google Cloud Storage + Cloudflare CDN |
| Real-time | Socket.IO + Redis adapter |
| WebRTC | simple-peer (P2P mesh) → LiveKit SFU (V2) |
| Infrastructure | GCP Cloud Run, Cloud Build, Artifact Registry |

## Local Development

### Prerequisites
- Node.js 22+
- Docker + Docker Compose (optional - Redis fallback works in-memory)
- A Firebase project (for Auth)

### Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Copy and fill in environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start Redis + backend via Docker (optional)
npm run docker:up

# 4. Start frontend dev server
npm run dev:frontend

# OR run everything with one command (requires Docker running):
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Architecture

```
SYNCHRA
├── frontend/     # Vite + React 18 + TypeScript
│   ├── src/
│   │   ├── components/   # UI components (room/, ui/)
│   │   ├── hooks/        # Custom hooks (sync, WebRTC, auth)
│   │   ├── store/        # Zustand stores
│   │   └── lib/          # Utilities, Firebase config
│   └── public/           # Static assets, sw.js
└── backend/      # Node.js 22 + Fastify + Socket.IO
    └── src/
        ├── routes/       # REST API (rooms, profile, auth)
        ├── socket/       # Socket.IO handlers
        └── lib/          # Redis, Firebase Admin, Logger
```

## Key Features

### Phase 1 (Weeks 1-4) ✅
- ✅ **< 80ms sync accuracy** — Server-authoritative state machine + PTP-style clock sync
- ✅ **YouTube watch parties** — IFrame API integration with drift correction
- ✅ **WebRTC video/audio chat** — Up to 12 faces, adaptive bitrate
- ✅ **Host buffering protection** — Pauses all viewers, 3-2-1 countdown to resume
- ✅ **Cinema Noir UI** — Dark, cinematic, glassmorphism design system
- ✅ **Zero install** — Pure PWA with Service Worker, works on all browsers
- ✅ **Anonymous join** — No account needed to join a room
- ✅ **Video uploads** — GCS signed URL integration

### Phase 2 (Weeks 5-8) ✅
- ✅ **Emoji reactions** — Floating reactions overlay
- ✅ **Voice activity detection** — Speaker glow indicators
- ✅ **User profiles** — Customizable display names and avatars
- ✅ **Queue UI** — Drag-and-drop video queue management
- ✅ **Adaptive bitrate WebRTC** — Quality tiers based on network conditions
- ✅ **Network dashboard** — Connection quality monitoring
- ✅ **Error recovery** — Exponential backoff reconnection
- ✅ **Mobile optimization** — Safe areas, touch targets, swipe gestures
- ✅ **iOS Safari fixes** — Audio unlock, viewport height, playsInline
- ✅ **Structured logging** — Production-ready observability

## GCP Budget

- Phase 1: < $20 total (free tiers)
- Phase 2: < $100 total (~$25/month)
- Phase 3: < $250 total (~$83/month)
- $300 credits cover full 12-week build + 2–3 months live operation
