import { Server, Socket } from 'socket.io'

// ────────────────────────────────────────────────────
// D3 — Clock Synchronization Handler (server-side)
// Cloud Run runs on Google TrueTime — sub-ms accurate
// ────────────────────────────────────────────────────

export function registerClockHandlers(socket: Socket): void {
  socket.on('clock:ping', (data: { t1: number }, ack: (serverTime: number) => void) => {
    // Respond immediately with server time
    // Cloud Run's Date.now() is backed by Google TrueTime
    ack(Date.now())
  })
}
