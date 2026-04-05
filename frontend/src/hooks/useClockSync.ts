import { useCallback, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'

// ────────────────────────────────────────────────────
// D3 — Clock Synchronization (PTP-Style)
// Determines clockOffset = serverTime - localTime
// Uses 15 samples, rejects outliers, applies EMA
// ────────────────────────────────────────────────────

const SAMPLE_COUNT     = 15
const SAMPLE_INTERVAL  = 100   // ms between pings
const EMA_ALPHA        = 0.1   // smoothing factor
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

  const syncNow = useCallback(async (): Promise<void> => {
    if (!socket?.connected) return

    const samples: Array<{ rtt: number; offset: number }> = []

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t1 = performance.now()

      const serverTime: number = await new Promise((resolve) => {
        socket.emit('clock:ping', { t1 }, (st: number) => resolve(st))
      }).catch(() => Date.now()) as number

      const t3 = performance.now()
      const rtt    = t3 - t1
      const offset = serverTime - (t1 + rtt / 2)

      samples.push({ rtt, offset })
      await sleep(SAMPLE_INTERVAL)
    }

    // Reject samples with RTT > 1.5× median
    const sorted   = [...samples].sort((a, b) => a.rtt - b.rtt)
    const median   = sorted[Math.floor(sorted.length / 2)].rtt
    const good     = samples.filter((s) => s.rtt <= median * 1.5)

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
  }, [socket])

  // Run initial sync and then periodically re-sync
  useEffect(() => {
    if (!socket) return

    // Sync on connect
    socket.on('connect', () => {
      syncNow()
    })
    if (socket.connected) syncNow()

    // Re-sync periodically
    resyncTimer.current = setInterval(syncNow, RESYNC_INTERVAL)

    // Re-sync when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncNow()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(resyncTimer.current!)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [socket, syncNow])

  const getServerTime  = useCallback(() => Date.now() + (clockOffsetRef.current ?? 0), [])
  const getClockOffset = useCallback(() => clockOffsetRef.current ?? 0, [])

  return { getServerTime, getClockOffset, syncNow }
}
