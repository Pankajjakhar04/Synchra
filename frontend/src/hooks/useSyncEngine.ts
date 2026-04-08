import { useEffect, useRef, useCallback } from 'react'
import { PlaybackState, SyncQuality } from '../types'
import { usePlaybackStore } from '../store/playbackStore'

// ────────────────────────────────────────────────────────
// D2 — Adaptive Sync Engine
// Runs every 500ms on non-host clients.
// 4-tier drift correction: none / rate-nudge / seek / ignore
// ────────────────────────────────────────────────────────

const TICK_INTERVAL = 500   // ms

// Drift thresholds (in seconds)
const DRIFT_NEGLIGIBLE  = 0.080  // < 80ms  → do nothing
const DRIFT_MINOR       = 0.500  // < 500ms → rate nudge (±4%)
const DRIFT_SIGNIFICANT = 30     // < 30s   → hard seek
// >= 30s → ignore (recovering from disconnect)

const RATE_AHEAD  = 0.97   // slightly slow down if ahead
const RATE_BEHIND = 1.04   // slightly speed up if behind
const RATE_RESET_THRESHOLD = 0.030  // reset rate at < 30ms drift
const SEEK_DEBOUNCE = 1000 // min ms between seeks

interface PlayerRef {
  getCurrentTime: () => number
  seekTo:         (time: number, allowSeekAhead?: boolean) => void
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  isPaused:       () => boolean
  isBuffering:    () => boolean
}

interface SyncEngineOptions {
  player:         PlayerRef | null
  playbackState:  PlaybackState | null
  isHost:         boolean
  getServerTime:  () => number
}

export function useSyncEngine({
  player,
  playbackState,
  isHost,
  getServerTime,
}: SyncEngineOptions): void {
  const { setSyncQuality } = usePlaybackStore()

  // ─── All sync-critical values live in refs to avoid re-creating
  // the tick function or restarting the interval on every state update.
  const lastSeekAt        = useRef<number>(0)
  const tickRef           = useRef<ReturnType<typeof setInterval> | null>(null)
  const logThrottle       = useRef<number>(0)
  const playbackStateRef  = useRef<PlaybackState | null>(playbackState)
  const playerRef         = useRef<PlayerRef | null>(player)
  const isHostRef         = useRef(isHost)
  const getServerTimeRef  = useRef(getServerTime)
  const setSyncQualityRef = useRef(setSyncQuality)

  // Keep refs in sync with latest props (no interval restart needed)
  useEffect(() => { playbackStateRef.current  = playbackState }, [playbackState])
  useEffect(() => { playerRef.current         = player }, [player])
  useEffect(() => { isHostRef.current         = isHost }, [isHost])
  useEffect(() => { getServerTimeRef.current  = getServerTime }, [getServerTime])
  useEffect(() => { setSyncQualityRef.current = setSyncQuality }, [setSyncQuality])

  // The tick function reads everything from refs — NEVER recreated.
  const tick = useCallback(() => {
    const p  = playerRef.current
    const pb = playbackStateRef.current
    if (!p || !pb) return
    if (isHostRef.current) return        // host drives, never corrects
    if (p.isBuffering()) return          // don't correct during buffering
    if (!pb.isPlaying) return            // nothing to correct if paused

    const serverNow  = getServerTimeRef.current()
    const elapsedSec = ((serverNow - pb.baseServerTime) / 1000) * pb.rate
    const expected   = pb.baseVideoTime + elapsedSec
    const actual     = p.getCurrentTime()
    const drift      = expected - actual  // positive = behind, negative = ahead

    const absDrift = Math.abs(drift)
    let quality: SyncQuality = 'good'
    let action = 'none'

    if (absDrift < DRIFT_NEGLIGIBLE) {
      // TIER 1 — Negligible: reset rate if it was nudged
      if (p.getPlaybackRate() !== 1.0) {
        p.setPlaybackRate(1.0)
      }
      quality = 'good'

    } else if (absDrift < DRIFT_MINOR) {
      // TIER 2 — Minor: rate nudge (inaudible ±4%)
      const targetRate = drift > 0 ? RATE_BEHIND : RATE_AHEAD
      if (Math.abs(p.getPlaybackRate() - targetRate) > 0.01) {
        p.setPlaybackRate(targetRate)
        action = `rate ${targetRate}`
      }
      if (absDrift < RATE_RESET_THRESHOLD) {
        p.setPlaybackRate(1.0)
      }
      quality = absDrift > 0.2 ? 'warn' : 'good'

    } else if (absDrift < DRIFT_SIGNIFICANT) {
      // TIER 3 — Significant: hard seek (debounced)
      const now = performance.now()
      if (now - lastSeekAt.current > SEEK_DEBOUNCE) {
        p.seekTo(Math.max(0, expected), true)
        p.setPlaybackRate(1.0)
        lastSeekAt.current = now
        action = `seek to ${expected.toFixed(2)}`
      }
      quality = 'warn'

    } else {
      // TIER 4 — Extreme: recovering from disconnect, ignore
      quality = 'bad'
      action = 'extreme drift, ignoring'
    }

    // Throttled logging (every 5 seconds)
    const now = Date.now()
    if (now - logThrottle.current > 5000 && absDrift > DRIFT_NEGLIGIBLE) {
      console.log(`[SyncEngine] drift=${(drift * 1000).toFixed(0)}ms, expected=${expected.toFixed(2)}, actual=${actual.toFixed(2)}, action=${action}`)
      logThrottle.current = now
    }

    setSyncQualityRef.current(quality, Math.round(drift * 1000))
  }, [])  // ← empty deps: tick is stable, reads everything from refs

  // Start / stop the interval only when player or host status actually changes.
  // playbackState changes do NOT restart the interval.
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    
    if (player && !isHost) {
      console.log('[SyncEngine] Starting sync engine (non-host)')
      tickRef.current = setInterval(tick, TICK_INTERVAL)
    }
    
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [tick, player, isHost])
}
