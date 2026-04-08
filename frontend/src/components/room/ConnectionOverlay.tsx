import { motion, AnimatePresence } from 'framer-motion'
import { ConnectionState } from '@/hooks/useConnectionRecovery'

interface ConnectionOverlayProps {
  state: ConnectionState
  retryCount: number
  nextRetryIn: number | null
  error: string | null
  onRetry: () => void
  onLeave?: () => void
}

export function ConnectionOverlay({
  state,
  retryCount,
  nextRetryIn,
  error,
  onRetry,
  onLeave,
}: ConnectionOverlayProps) {
  // Don't show overlay when connected
  if (state === 'connected') {
    return null
  }

  const isReconnecting = state === 'reconnecting'
  const isError = state === 'error'
  const isConnecting = state === 'connecting'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="connection-overlay"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="connection-overlay__card glass-elevated"
        >
          {/* Icon */}
          <div className={`connection-overlay__icon ${isError ? 'error' : ''}`}>
            {isConnecting && <SpinnerIcon />}
            {isReconnecting && <ReconnectIcon />}
            {isError && <ErrorIcon />}
            {state === 'disconnected' && <DisconnectedIcon />}
          </div>

          {/* Title */}
          <h2 className="connection-overlay__title">
            {isConnecting && 'Connecting...'}
            {isReconnecting && 'Reconnecting...'}
            {isError && 'Connection Lost'}
            {state === 'disconnected' && 'Disconnected'}
          </h2>

          {/* Status message */}
          <p className="connection-overlay__message">
            {isConnecting && 'Establishing connection to the server'}
            {isReconnecting && (
              <>
                Attempt {retryCount + 1}
                {nextRetryIn && ` — retrying in ${nextRetryIn}s`}
              </>
            )}
            {isError && (error || 'Unable to connect to the server')}
            {state === 'disconnected' && 'You have been disconnected from the room'}
          </p>

          {/* Progress indicator for reconnecting */}
          {isReconnecting && nextRetryIn && (
            <div className="connection-overlay__progress">
              <motion.div
                className="connection-overlay__progress-bar"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: nextRetryIn, ease: 'linear' }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="connection-overlay__actions">
            {(isError || state === 'disconnected') && (
              <button onClick={onRetry} className="btn btn--primary">
                Try Again
              </button>
            )}
            {isReconnecting && (
              <button onClick={onRetry} className="btn btn--secondary">
                Retry Now
              </button>
            )}
            {onLeave && (
              <button onClick={onLeave} className="btn btn--ghost">
                Leave Room
              </button>
            )}
          </div>
        </motion.div>

        <style>{`
          .connection-overlay {
            position: fixed;
            inset: 0;
            background: rgba(10, 10, 15, 0.9);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .connection-overlay__card {
            max-width: 380px;
            width: 100%;
            padding: 2rem;
            border-radius: 16px;
            text-align: center;
          }

          .connection-overlay__icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 1.5rem;
            color: var(--accent-gold);
          }

          .connection-overlay__icon.error {
            color: var(--sync-bad);
          }

          .connection-overlay__icon svg {
            width: 100%;
            height: 100%;
          }

          .connection-overlay__title {
            font-family: var(--font-heading);
            font-size: 1.5rem;
            color: var(--text-primary);
            margin: 0 0 0.75rem;
          }

          .connection-overlay__message {
            color: var(--text-secondary);
            font-size: 0.9375rem;
            margin: 0 0 1.5rem;
            line-height: 1.5;
          }

          .connection-overlay__progress {
            height: 4px;
            background: var(--bg-surface);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 1.5rem;
          }

          .connection-overlay__progress-bar {
            height: 100%;
            background: var(--accent-gold);
            border-radius: 2px;
          }

          .connection-overlay__actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
          }

          .btn--primary {
            background: var(--accent-gold);
            color: var(--bg-void);
            border: none;
          }

          .btn--primary:hover {
            background: var(--accent-gold-hover);
          }

          .btn--secondary {
            background: var(--bg-surface);
            color: var(--text-primary);
            border: 1px solid var(--border-subtle);
          }

          .btn--secondary:hover {
            border-color: var(--accent-gold);
          }

          .btn--ghost {
            background: transparent;
            color: var(--text-muted);
            border: none;
          }

          .btn--ghost:hover {
            color: var(--text-primary);
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes pulse-scale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }

          .spinner-icon {
            animation: spin 1s linear infinite;
          }

          .reconnect-icon {
            animation: pulse-scale 1.5s ease-in-out infinite;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}

// SVG Icons
function SpinnerIcon() {
  return (
    <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  )
}

function ReconnectIcon() {
  return (
    <svg className="reconnect-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  )
}

function DisconnectedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" strokeLinecap="round" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" strokeLinecap="round" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" strokeLinecap="round" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" strokeLinecap="round" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeLinecap="round" />
    </svg>
  )
}
