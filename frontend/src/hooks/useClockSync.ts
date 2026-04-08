import { useCallback, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'

// ────────────────────────────────────────────────────
// D3 — Clock Synchronization (PTP-Style)
// Determines clockOffset = serverTime - localTime
// Uses 10 samples, rejects outliers, applies EMA
//
// CRITICAL: Both client timestamps and server timestamps
// MUST be in the same timescale (epoch ms via Date.now()).
// Using performance.now() here would be WRONG because the
// server responds with Date.now() — mixing the two produces
// an offset that is off by the entire epoch (~1.7 trillion ms).
// ────────────────────────────────────────────────────

const SAMPLE_COUNT     = 10
const SAMPLE_INTERVAL  = 120   // ms between pings
const PING_TIMEOUT     = 3000  // ms — give up on a single ping
const EMA_ALPHA        = 0.15  // smoothing factor
const RESYNC_INTERVAL  = 60_000 // re-sync every 60s

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface ClockSyncResult {
  getServerTime: () => number      // returns current server time in ms
  getClockOffset: () => number     // returns clockOffset in ms
  syncNow: () => Promise<void>
}

export function useClockSync(socket: Socket | null): ClockSyncResult {
  const clockOffsetRef = useRef<number | null>(null)
  const resyncTimer    = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSyncing      = useRef(false)

  const syncNow = useCallback(async (): Promise<void> => {
    if (!socket?.connected) return
    if (isSyncing.current) return  // prevent overlapping syncs
    isSyncing.current = true

    try {
      const samples: Array<{ rtt: number; offset: number }> = []

      for (let i = 0; i < SAMPLE_COUNT; i++) {
        // CRITICAL: use Date.now() — same epoch timescale as the server
        const t1 = Date.now()

        const serverTime: number = await Promise.race([
          new Promise<number>((resolve) => {
            socket.emit('clock:ping', { t1 }, (st: number) => resolve(st))
          }),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error('ping timeout')), PING_TIMEOUT)
          ),
        ]).catch(() => -1)

        if (serverTime === -1) {
          // This ping timed out — skip it
          await sleep(SAMPLE_INTERVAL)
          continue
        }

        const t3 = Date.now()
        const rtt    = t3 - t1
        // Standard PTP offset: serverTime was captured at roughly (t1 + t3) / 2 local time
        const localMidpoint = (t1 + t3) / 2
        const offset = serverTime - localMidpoint

        samples.push({ rtt, offset })
        await sleep(SAMPLE_INTERVAL)
      }

      if (samples.length < 3) {
        console.warn('[ClockSync] Too few samples, skipping')
        return
      }

      // Reject samples with RTT > 1.5× median
      const sorted   = [...samples].sort((a, b) => a.rtt - b.rtt)
      const median   = sorted[Math.floor(sorted.length / 2)].rtt
      const good     = samples.filter((s) => s.rtt <= median * 1.5)

      if (good.length === 0) return

      // Take median offset of good samples
      const offsets  = [...good].sort((a, b) => a.offset - b.offset)
      const newOffset = offsets[Math.floor(offsets.length / 2)].offset

      // Exponential Moving Average — smooth transitions
      if (clockOffsetRef.current === null) {
        clockOffsetRef.current = newOffset
      } else {
        clockOffsetRef.current = EMA_ALPHA * newOffset + (1 - EMA_ALPHA) * clockOffsetRef.current
      }

      const avgRTT = good.reduce((s, x) => s + x.rtt, 0) / good.length
      console.log(
        `[ClockSync] Offset: ${clockOffsetRef.current.toFixed(1)}ms | RTT: ${avgRTT.toFixed(1)}ms | Samples: ${good.length}/${SAMPLE_COUNT}`
      )
    } finally {
      isSyncing.current = false
    }
  }, [socket])

  // Run initial sync and then periodically re-sync
  useEffect(() => {
    if (!socket) return

    const onConnect = () => { syncNow() }
    socket.on('connect', onConnect)
    if (socket.connected) syncNow()

    // Re-sync periodically
    resyncTimer.current = setInterval(syncNow, RESYNC_INTERVAL)

    // Re-sync when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncNow()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      socket.off('connect', onConnect)
      clearInterval(resyncTimer.current!)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [socket, syncNow])

  const getServerTime  = useCallback(() => Date.now() + (clockOffsetRef.current ?? 0), [])
  const getClockOffset = useCallback(() => clockOffsetRef.current ?? 0, [])

  return { getServerTime, getClockOffset, syncNow }
}
