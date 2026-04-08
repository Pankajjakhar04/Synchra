import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NetworkStats } from '@/hooks/useAdaptiveBitrate'

interface NetworkDashboardProps {
  stats: NetworkStats | null
  isExpanded?: boolean
  onToggle?: () => void
}

export function NetworkDashboard({ stats, isExpanded = false, onToggle }: NetworkDashboardProps) {
  const qualityColors = {
    excellent: 'var(--sync-good)',
    good: '#8BC34A',
    fair: 'var(--sync-warn)',
    poor: 'var(--sync-bad)',
  }

  const qualityLabels = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }

  if (!stats) {
    return null
  }

  const qualityColor = qualityColors[stats.quality]

  return (
    <div className="network-dashboard">
      {/* Compact indicator (always visible) */}
      <button 
        className="network-dashboard__indicator"
        onClick={onToggle}
        title="Network quality"
      >
        <div 
          className="network-dashboard__dot"
          style={{ backgroundColor: qualityColor }}
        />
        <span className="network-dashboard__label">
          {qualityLabels[stats.quality]}
        </span>
        <span className="network-dashboard__expand">
          {isExpanded ? '▼' : '▲'}
        </span>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="network-dashboard__panel glass-elevated"
          >
            <div className="network-dashboard__stats">
              <StatRow 
                label="Latency (RTT)" 
                value={`${stats.rtt}ms`}
                status={stats.rtt < 50 ? 'good' : stats.rtt < 150 ? 'warn' : 'bad'}
              />
              <StatRow 
                label="Packet Loss" 
                value={`${stats.packetLoss}%`}
                status={stats.packetLoss < 1 ? 'good' : stats.packetLoss < 3 ? 'warn' : 'bad'}
              />
              <StatRow 
                label="Bitrate" 
                value={`${stats.bitrate} kbps`}
                status={stats.bitrate > 500 ? 'good' : stats.bitrate > 200 ? 'warn' : 'bad'}
              />
              <StatRow 
                label="Jitter" 
                value={`${stats.jitter}ms`}
                status={stats.jitter < 30 ? 'good' : stats.jitter < 75 ? 'warn' : 'bad'}
              />
            </div>

            {/* Quality bar */}
            <div className="network-dashboard__quality">
              <span className="network-dashboard__quality-label">Connection Quality</span>
              <div className="network-dashboard__quality-bar">
                <div 
                  className="network-dashboard__quality-fill"
                  style={{ 
                    width: stats.quality === 'excellent' ? '100%' 
                         : stats.quality === 'good' ? '75%' 
                         : stats.quality === 'fair' ? '50%' 
                         : '25%',
                    backgroundColor: qualityColor,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .network-dashboard {
          position: relative;
        }

        .network-dashboard__indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .network-dashboard__indicator:hover {
          border-color: var(--text-muted);
        }

        .network-dashboard__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .network-dashboard__label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .network-dashboard__expand {
          font-size: 0.625rem;
          color: var(--text-muted);
        }

        .network-dashboard__panel {
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: 0.5rem;
          padding: 1rem;
          border-radius: 12px;
          min-width: 220px;
          overflow: hidden;
        }

        .network-dashboard__stats {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .network-dashboard__quality {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-subtle);
        }

        .network-dashboard__quality-label {
          display: block;
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin-bottom: 0.375rem;
        }

        .network-dashboard__quality-bar {
          height: 4px;
          background: var(--bg-surface);
          border-radius: 2px;
          overflow: hidden;
        }

        .network-dashboard__quality-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease, background-color 0.3s;
        }
      `}</style>
    </div>
  )
}

interface StatRowProps {
  label: string
  value: string
  status: 'good' | 'warn' | 'bad'
}

function StatRow({ label, value, status }: StatRowProps) {
  const statusColors = {
    good: 'var(--sync-good)',
    warn: 'var(--sync-warn)',
    bad: 'var(--sync-bad)',
  }

  return (
    <div className="stat-row">
      <span className="stat-row__label">{label}</span>
      <span 
        className="stat-row__value"
        style={{ color: statusColors[status] }}
      >
        {value}
      </span>

      <style>{`
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-row__label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .stat-row__value {
          font-size: 0.8125rem;
          font-weight: 500;
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  )
}
