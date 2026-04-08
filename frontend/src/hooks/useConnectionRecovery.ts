import { useState, useEffect, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'

export type ConnectionState = 
  | 'connected' 
  | 'connecting' 
  | 'reconnecting' 
  | 'disconnected' 
  | 'error'

interface UseConnectionRecoveryOptions {
  socket: Socket | null
  maxRetries?: number
  baseDelay?: number      // ms
  maxDelay?: number       // ms
  onReconnect?: () => void
  onMaxRetriesReached?: () => void
}

interface ConnectionRecoveryState {
  state: ConnectionState
  retryCount: number
  nextRetryIn: number | null  // seconds until next retry
  error: string | null
}

/**
 * Hook for managing connection recovery with exponential backoff
 */
export function useConnectionRecovery({
  socket,
  maxRetries = 10,
  baseDelay = 1000,
  maxDelay = 30000,
  onReconnect,
  onMaxRetriesReached,
}: UseConnectionRecoveryOptions): ConnectionRecoveryState & {
  retry: () => void
  reset: () => void
} {
  const [state, setState] = useState<ConnectionState>('connecting')
  const [retryCount, setRetryCount] = useState(0)
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  const calculateDelay = useCallback((attempt: number) => {
    // Exponential backoff with jitter
    const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    const jitter = exponential * 0.2 * Math.random()
    return Math.round(exponential + jitter)
  }, [baseDelay, maxDelay])

  const startCountdown = useCallback((durationMs: number) => {
    const endTime = Date.now() + durationMs
    setNextRetryIn(Math.ceil(durationMs / 1000))

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!)
        countdownIntervalRef.current = null
        setNextRetryIn(null)
      } else {
        setNextRetryIn(remaining)
      }
    }, 1000)
  }, [])

  const retry = useCallback(() => {
    if (!socket) return

    clearTimers()
    setState('reconnecting')
    setNextRetryIn(null)

    // Socket.IO will handle the actual reconnection
    // We just need to trigger it
    if (socket.disconnected) {
      socket.connect()
    }
  }, [socket, clearTimers])

  const reset = useCallback(() => {
    clearTimers()
    setRetryCount(0)
    setNextRetryIn(null)
    setError(null)
    setState('connecting')
  }, [clearTimers])

  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      clearTimers()
      setState('connected')
      setRetryCount(0)
      setNextRetryIn(null)
      setError(null)
      onReconnect?.()
    }

    const handleDisconnect = (reason: string) => {
      clearTimers()

      // Don't auto-reconnect if disconnect was intentional
      if (reason === 'io client disconnect') {
        setState('disconnected')
        return
      }

      if (retryCount >= maxRetries) {
        setState('error')
        setError('Maximum reconnection attempts reached')
        onMaxRetriesReached?.()
        return
      }

      setState('reconnecting')
      setError(`Connection lost: ${reason}`)

      const delay = calculateDelay(retryCount)
      startCountdown(delay)

      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1)
        retry()
      }, delay)
    }

    const handleConnectError = (err: Error) => {
      setError(err.message || 'Connection failed')
      
      if (state !== 'reconnecting') {
        setState('reconnecting')
      }
    }

    const handleReconnectAttempt = (attempt: number) => {
      setRetryCount(attempt)
    }

    const handleReconnectFailed = () => {
      setState('error')
      setError('Reconnection failed')
      onMaxRetriesReached?.()
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)
    socket.io.on('reconnect_failed', handleReconnectFailed)

    // Set initial state
    if (socket.connected) {
      setState('connected')
    } else if (socket.disconnected) {
      setState('disconnected')
    }

    return () => {
      clearTimers()
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.io.off('reconnect_failed', handleReconnectFailed)
    }
  }, [
    socket, 
    retryCount, 
    maxRetries, 
    state, 
    clearTimers, 
    calculateDelay, 
    startCountdown, 
    retry, 
    onReconnect, 
    onMaxRetriesReached
  ])

  return {
    state,
    retryCount,
    nextRetryIn,
    error,
    retry,
    reset,
  }
}
