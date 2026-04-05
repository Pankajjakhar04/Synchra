import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { useClockSync } from '../hooks/useClockSync'
import { useFirebaseAuth } from '../hooks/useFirebaseAuth'
import { useRoomStore } from '../store/roomStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useUIStore } from '../store/uiStore'
import { CountdownOverlay } from '../components/room/CountdownOverlay'
import { ChatSidebar } from '../components/room/ChatSidebar'
import { SyncIndicator } from '../components/room/SyncIndicator'
import { ReactionOverlay } from '../components/room/ReactionOverlay'
import { ParticipantGrid } from '../components/room/ParticipantGrid'
import { VideoStage } from '../components/room/VideoStage'
import { HostControlsBar } from '../components/room/HostControlsBar'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { GlassPanel } from '../components/ui/GlassPanel'

// ─── Parse YouTube URL or bare ID ────────────────────────────────
function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    const v = url.searchParams.get('v')
    if (v) return v
    if (url.hostname === 'youtu.be') return url.pathname.slice(1)
    const m = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
    if (m) return m[1]
  } catch { /* not a URL */ }
  return null
}

// ─── Host header button: always-visible Change Video ─────────────
function HeaderChangeVideo({ emit }: { emit: (ev: string, ...a: unknown[]) => void }) {
  const [open,  setOpen]  = useState(false)
  const [val,   setVal]   = useState('')
  const [err,   setErr]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const toggle = () => { setOpen(o => !o); setVal(''); setErr('') }
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40) }, [open])

  const load = useCallback(() => {
    const id = parseYouTubeId(val)
    if (!id) { setErr('Invalid URL or ID'); return }
    emit('playback:setVideo', { videoId: id, videoType: 'youtube' })
    setOpen(false); setVal(''); setErr('')
  }, [val, emit])

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        id="change-video-btn"
        className={`btn ${open ? 'btn-primary' : 'btn-ghost'}`}
        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
        onClick={toggle}
        title="Load / change video"
      >
        {open ? '✕' : '🎬 Video'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position:       'absolute',
              top:            '110%',
              right:          0,
              display:        'flex',
              flexDirection:  'column',
              gap:            '0.375rem',
              padding:        '0.75rem',
              background:     'var(--bg-surface)',
              border:         '1px solid var(--border-subtle)',
              borderRadius:   'var(--radius-lg)',
              boxShadow:      '0 8px 32px rgba(0,0,0,0.4)',
              zIndex:         200,
              minWidth:       '320px',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>
              Paste a YouTube URL or video ID
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={inputRef}
                className="input"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                placeholder="https://youtube.com/watch?v=…"
                value={val}
                onChange={e => { setVal(e.target.value); setErr('') }}
                onKeyDown={e => { if (e.key === 'Enter') load(); if (e.key === 'Escape') toggle() }}
              />
              <button
                className="btn btn-primary"
                style={{ padding: '0 1rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                onClick={load}
                disabled={!val.trim()}
              >
                Load
              </button>
            </div>
            {err && <p style={{ color: 'var(--accent-coral)', fontSize: '0.75rem' }}>{err}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()

  const { user, isLoading: authLoading, signInAnon, getToken } = useFirebaseAuth()
  const { socket, emit } = useSocket()
  const clock = useClockSync(socket)

  const {
    participants, hostId, isConnected, isJoining, error, localUserId,
    setJoining, setError,
  } = useRoomStore()
  const { state: playback, notice } = usePlaybackStore()
  const { isChatOpen, toggleChat } = useUIStore()

  const resolvedLocalUserId = localUserId ?? user?.uid ?? ''

  const [displayName, setDisplayName] = useState('')
  const [hasJoined,   setHasJoined]   = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(true)

  // Auto sign-in anonymous if no user
  useEffect(() => {
    if (!authLoading && !user) {
      signInAnon()
    }
  }, [authLoading, user, signInAnon])

  // Listen for video load requests dispatched by VideoStage
  useEffect(() => {
    const handler = (e: Event) => {
      const { videoId, videoType } = (e as CustomEvent).detail
      emit('playback:setVideo', { videoId, videoType })
    }
    window.addEventListener('synchra:loadVideo', handler)
    return () => window.removeEventListener('synchra:loadVideo', handler)
  }, [emit])

  // Join the room
  const joinRoom = async () => {
    if (!roomId || !socket) return
    setJoining(true)

    const name  = displayName.trim() || user?.displayName || 'Viewer'
    const token = await getToken()

    socket.emit('room:join', {
      roomId,
      token,
      displayName: name,
      avatarUrl:   user?.photoURL ?? null,
    })

    setHasJoined(true)
    setShowJoinForm(false)
    setJoining(false)
  }

  // Copy invite link
  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  if (!roomId) {
    navigate('/')
    return null
  }

  // ─── JOIN FORM ─────────────────────────────────────────────────
  if (showJoinForm) {
    return (
      <div
        style={{
          minHeight:      '100dvh',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '1.5rem',
          background:     'var(--bg-void)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: '440px' }}
        >
          <GlassPanel elevated style={{ padding: '2.5rem' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  fontFamily:   'var(--font-display)',
                  fontSize:     '1.5rem',
                  letterSpacing:'0.15em',
                  color:        'var(--accent-gold)',
                  marginBottom: '0.25rem',
                }}
              >
                SYNCHRA
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                You're about to join a watch party
              </p>
              <div
                style={{
                  fontFamily:     'var(--font-mono)',
                  fontSize:       '0.75rem',
                  color:          'var(--text-muted)',
                  background:     'var(--bg-elevated)',
                  padding:        '0.25rem 0.75rem',
                  borderRadius:   '9999px',
                  display:        'inline-block',
                  marginTop:      '0.5rem',
                }}
              >
                Room: {roomId}
              </div>
            </div>

            {/* Connection status */}
            <div
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '0.5rem',
                marginBottom:'1.5rem',
                padding:     '0.625rem 0.875rem',
                borderRadius:'var(--radius-md)',
                background:  'var(--bg-elevated)',
                fontSize:    '0.8125rem',
              }}
            >
              <div style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   isConnected ? 'var(--sync-good)' : 'var(--sync-warn)',
                flexShrink:   0,
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {isConnected ? 'Connected to server' : 'Connecting...'}
              </span>
            </div>

            {/* Name input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="display-name-input"
                style={{
                  display:       'block',
                  fontSize:      '0.8125rem',
                  fontWeight:    500,
                  color:         'var(--text-secondary)',
                  marginBottom:  '0.5rem',
                }}
              >
                Your display name
              </label>
              <input
                id="display-name-input"
                className="input"
                type="text"
                placeholder={user?.displayName || 'Enter your name...'}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') joinRoom() }}
                maxLength={40}
                autoFocus
              />
            </div>

            {error && (
              <p style={{ color: 'var(--accent-coral)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {error}
              </p>
            )}

            {/* Join button */}
            <Button
              id="join-room-btn"
              variant="primary"
              size="lg"
              isLoading={isJoining || authLoading}
              onClick={joinRoom}
              disabled={!isConnected}
              style={{ width: '100%' }}
            >
              🎬 Join Watch Party
            </Button>

            {/* Anonymous note */}
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem' }}>
              Joining anonymously — no account needed
            </p>
          </GlassPanel>
        </motion.div>
      </div>
    )
  }

  const participantList = Object.values(participants)
  const isHost          = hostId === resolvedLocalUserId

  // ─── WATCH ROOM ────────────────────────────────────────────────
  return (
    <div
      id="watch-room"
      style={{
        height:        '100dvh',
        display:       'flex',
        flexDirection: 'column',
        background:    'var(--bg-void)',
        overflow:      'hidden',
      }}
    >
      {/* ── Top Bar ── */}
      <div
        id="room-header"
        style={{
          height:         '48px',
          background:     'var(--bg-surface)',
          borderBottom:   '1px solid var(--border-subtle)',
          display:        'flex',
          alignItems:     'center',
          gap:            '0.75rem',
          paddingInline:  '1rem',
          flexShrink:     0,
          zIndex:         50,
        }}
      >
        {/* Logo */}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--accent-gold)', flexShrink: 0 }}>
          SYNCHRA
        </span>

        {/* Room ID */}
        <div
          style={{
            fontFamily:   'var(--font-mono)',
            fontSize:     '0.6875rem',
            color:        'var(--text-muted)',
            padding:      '0.125rem 0.5rem',
            background:   'var(--bg-elevated)',
            borderRadius: '9999px',
            flexShrink:   0,
          }}
        >
          {roomId}
        </div>

        {/* Participants avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '-0.25rem', marginLeft: '0.25rem' }}>
          {participantList.slice(0, 5).map((p) => (
            <div key={p.userId} style={{ marginLeft: p.userId !== participantList[0].userId ? '-6px' : 0 }}>
              <Avatar displayName={p.displayName} avatarUrl={p.avatarUrl} size="xs" isHost={p.isHost} />
            </div>
          ))}
          {participantList.length > 5 && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
              +{participantList.length - 5}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sync indicator */}
        <SyncIndicator />

        {/* Host: Change Video button (always visible) */}
        {isHost && <HeaderChangeVideo emit={emit} />}

        {/* Invite button */}
        <button
          id="invite-btn"
          onClick={copyInvite}
          className="btn btn-ghost"
          style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
          title="Copy invite link"
        >
          🔗 Invite
        </button>

        {/* Chat toggle */}
        <button
          id="toggle-chat-btn"
          onClick={toggleChat}
          className="btn btn-ghost"
          style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
        >
          {isChatOpen ? '✕ Chat' : '💬 Chat'}
        </button>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Video area */}
        <div
          id="video-area"
          style={{
            flex:           3,
            display:        'flex',
            flexDirection:  'column',
            background:     '#000',
            position:       'relative',
            minWidth:       0,
          }}
        >
          {/* Main Video Player */}
          <VideoStage />

          {/* Host controls bar (always visible for host) */}
          {isHost && playback && playback.videoId && (
            <HostControlsBar emit={emit} playback={playback} />
          )}

          {/* Reaction overlay */}
          <ReactionOverlay socket={socket} />
        </div>

        {/* Participants Side Grid */}
        <div 
          style={{ 
            flex: 1, 
            minWidth: '280px',
            maxWidth: '350px',
            background: 'var(--bg-surface)', 
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              👥 Watchers
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ParticipantGrid socket={socket} localUserId={resolvedLocalUserId} />
          </div>
        </div>

        {/* Chat sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              id="chat-panel"
              key="chat"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <ChatSidebar socket={socket} localUserId={resolvedLocalUserId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Room-wide overlay components */}
      <CountdownOverlay />

      {/* Notice Toast */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="notice"
            initial={{ opacity: 0, y: -12, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -12, x: '-50%' }}
            className="notice"
            style={{ position: 'fixed', top: '64px', left: '50%', zIndex: 300 }}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
