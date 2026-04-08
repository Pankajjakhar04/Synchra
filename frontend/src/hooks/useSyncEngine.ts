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

  // Use refs for sync-critical values — NO re-renders
  const lastSeekAt     = useRef<number>(0)
  const tickRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const logThrottle    = useRef<number>(0)

  const computeExpected = useCallback((state: PlaybackState): number => {
    if (!state.isPlaying || state.isBuffering) return state.baseVideoTime
    const serverNow  = getServerTime()
    const elapsedSec = ((serverNow - state.baseServerTime) / 1000) * state.rate
    return state.baseVideoTime + elapsedSec
  }, [getServerTime])

  const tick = useCallback(() => {
    if (!player || !playbackState) return
    if (isHost) return                          // host drives, never corrects
    if (player.isBuffering()) return            // don't correct during buffering

    const expected = computeExpected(playbackState)
    const actual   = player.getCurrentTime()
    const drift    = expected - actual          // positive = behind, negative = ahead

    const absDrift = Math.abs(drift)
    let quality: SyncQuality = 'good'
    let action = 'none'

    if (absDrift < DRIFT_NEGLIGIBLE) {
      // TIER 1 — Negligible: reset rate if it was nudged
      if (player.getPlaybackRate() !== 1.0) {
        player.setPlaybackRate(1.0)
      }
      quality = 'good'

    } else if (absDrift < DRIFT_MINOR) {
      // TIER 2 — Minor: rate nudge (inaudible ±4%)
      const targetRate = drift > 0 ? RATE_BEHIND : RATE_AHEAD
      if (Math.abs(player.getPlaybackRate() - targetRate) > 0.01) {
        player.setPlaybackRate(targetRate)
        action = `rate ${targetRate}`
      }
      // Reset when close enough
      if (absDrift < RATE_RESET_THRESHOLD) {
        player.setPlaybackRate(1.0)
      }
      quality = absDrift > 0.2 ? 'warn' : 'good'

    } else if (absDrift < DRIFT_SIGNIFICANT) {
      // TIER 3 — Significant: hard seek (debounced)
      const now = performance.now()
      if (now - lastSeekAt.current > SEEK_DEBOUNCE) {
        player.seekTo(Math.max(0, expected), true)
        player.setPlaybackRate(1.0)
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

    // Report sync quality to store (for indicator dot)
    setSyncQuality(quality, Math.round(drift * 1000))

  }, [player, playbackState, isHost, computeExpected, setSyncQuality])

  useEffect(() => {
    // Clear any existing interval
    if (tickRef.current) {
      clearInterval(tickRef.current)
    }
    
    // Only start if we have a player and we're not the host
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
