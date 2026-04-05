# SYNCHRA 🎬

> The world's best watch party platform. Cinema Noir design. Sub-80ms sync. Zero install.

Built entirely on GCP's $300 free credits — beating Teleparty, Watch2Gether, Rave, and every competitor.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind v4, Zustand, Framer Motion |
| Backend | Node.js 22, Fastify, Socket.IO v4, ioredis |
| Auth | Firebase Auth (Google + Anonymous) |
| Database | Cloud SQL PostgreSQL 16 (Supabase in dev) |
| Storage | Google Cloud Storage + Cloudflare CDN |
| Real-time | Socket.IO + Redis adapter |
| WebRTC | simple-peer (P2P mesh) → LiveKit SFU (V2) |
| Infrastructure | GCP Cloud Run, Cloud Build, Artifact Registry |

## Local Development

### Prerequisites
- Node.js 22+
- Docker + Docker Compose
- A Firebase project (for Auth)

### Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Copy and fill in environment variables
cp backend/.env.example backend/.env

# 3. Start Redis + backend via Docker
npm run docker:up

# 4. Start frontend dev server
npm run dev:frontend

# OR run everything with one command (requires Docker running):
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Architecture

```
SYNCHRA
├── frontend/     # Vite + React 18 + TypeScript
└── backend/      # Node.js 22 + Fastify + Socket.IO
```

## Key Features (Phase 1 MVP)

- ✅ **< 80ms sync accuracy** — Server-authoritative state machine + PTP-style clock sync
- ✅ **YouTube watch parties** — IFrame API integration with drift correction
- ✅ **WebRTC video/audio chat** — Up to 12 faces, adaptive bitrate
- ✅ **Host buffering protection** — Pauses all viewers, 3-2-1 countdown to resume
- ✅ **Cinema Noir UI** — Dark, cinematic, glassmorphism design system
- ✅ **Zero install** — Pure PWA, works on all browsers including iOS Safari
- ✅ **Anonymous join** — No account needed to join a room

## GCP Budget

- Phase 1: < $20 total (free tiers)
- Phase 2: < $100 total (~$25/month)
- Phase 3: < $250 total (~$83/month)
- $300 credits cover full 12-week build + 2–3 months live operation
