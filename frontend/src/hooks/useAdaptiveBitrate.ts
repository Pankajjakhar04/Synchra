import { useEffect, useRef, useCallback, useState } from 'react'

export interface NetworkStats {
  rtt: number                    // Round trip time in ms
  packetLoss: number             // Percentage (0-100)
  bitrate: number                // Current bitrate in kbps
  jitter: number                 // Jitter in ms
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  timestamp: number
}

interface VideoConstraintPreset {
  name: string
  width: number
  height: number
  frameRate: number
  maxBitrate: number
}

const QUALITY_PRESETS: VideoConstraintPreset[] = [
  { name: 'high',   width: 1280, height: 720, frameRate: 30, maxBitrate: 2500 },
  { name: 'medium', width: 854,  height: 480, frameRate: 24, maxBitrate: 1000 },
  { name: 'low',    width: 640,  height: 360, frameRate: 20, maxBitrate: 500 },
  { name: 'minimal',width: 320,  height: 240, frameRate: 15, maxBitrate: 200 },
]

const RTT_THRESHOLDS = {
  excellent: 50,
  good: 100,
  fair: 200,
}

const PACKET_LOSS_THRESHOLDS = {
  excellent: 0.5,
  good: 2,
  fair: 5,
}

function determineQuality(rtt: number, packetLoss: number): NetworkStats['quality'] {
  if (rtt < RTT_THRESHOLDS.excellent && packetLoss < PACKET_LOSS_THRESHOLDS.excellent) {
    return 'excellent'
  }
  if (rtt < RTT_THRESHOLDS.good && packetLoss < PACKET_LOSS_THRESHOLDS.good) {
    return 'good'
  }
  if (rtt < RTT_THRESHOLDS.fair && packetLoss < PACKET_LOSS_THRESHOLDS.fair) {
    return 'fair'
  }
  return 'poor'
}

function getPresetForQuality(quality: NetworkStats['quality']): VideoConstraintPreset {
  switch (quality) {
    case 'excellent': return QUALITY_PRESETS[0]
    case 'good':      return QUALITY_PRESETS[1]
    case 'fair':      return QUALITY_PRESETS[2]
    case 'poor':      return QUALITY_PRESETS[3]
  }
}

interface UseAdaptiveBitrateOptions {
  peerConnection: RTCPeerConnection | null
  enabled?: boolean
  onQualityChange?: (preset: VideoConstraintPreset) => void
}

/**
 * Adaptive bitrate hook that monitors RTCPeerConnection stats
 * and adjusts video quality based on network conditions
 */
export function useAdaptiveBitrate({
  peerConnection,
  enabled = true,
  onQualityChange,
}: UseAdaptiveBitrateOptions) {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [currentPreset, setCurrentPreset] = useState<VideoConstraintPreset>(QUALITY_PRESETS[0])
  
  const lastPacketsRef = useRef<{ sent: number; lost: number; timestamp: number } | null>(null)
  const lastBytesRef = useRef<{ bytes: number; timestamp: number } | null>(null)
  const stabilityCountRef = useRef(0)

  const collectStats = useCallback(async () => {
    if (!peerConnection || peerConnection.connectionState !== 'connected') {
      return
    }

    try {
      const report = await peerConnection.getStats()
      let rtt = 0
      let packetsSent = 0
      let packetsLost = 0
      let bytesSent = 0
      let jitter = 0

      report.forEach((stat) => {
        // Get RTT from candidate-pair
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0
        }

        // Get packet stats from outbound-rtp (video)
        if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
          packetsSent = stat.packetsSent || 0
          bytesSent = stat.bytesSent || 0
        }

        // Get remote stats for packet loss
        if (stat.type === 'remote-inbound-rtp' && stat.kind === 'video') {
          packetsLost = stat.packetsLost || 0
          jitter = stat.jitter ? stat.jitter * 1000 : 0
        }
      })

      // Calculate packet loss percentage
      let packetLoss = 0
      if (lastPacketsRef.current && packetsSent > lastPacketsRef.current.sent) {
        const sentDiff = packetsSent - lastPacketsRef.current.sent
        const lostDiff = packetsLost - lastPacketsRef.current.lost
        packetLoss = sentDiff > 0 ? (lostDiff / sentDiff) * 100 : 0
      }
      lastPacketsRef.current = { sent: packetsSent, lost: packetsLost, timestamp: Date.now() }

      // Calculate bitrate
      let bitrate = 0
      if (lastBytesRef.current) {
        const byteDiff = bytesSent - lastBytesRef.current.bytes
        const timeDiff = (Date.now() - lastBytesRef.current.timestamp) / 1000
        bitrate = timeDiff > 0 ? (byteDiff * 8) / timeDiff / 1000 : 0 // kbps
      }
      lastBytesRef.current = { bytes: bytesSent, timestamp: Date.now() }

      const quality = determineQuality(rtt, packetLoss)
      const newStats: NetworkStats = {
        rtt: Math.round(rtt),
        packetLoss: Math.round(packetLoss * 10) / 10,
        bitrate: Math.round(bitrate),
        jitter: Math.round(jitter),
        quality,
        timestamp: Date.now(),
      }

      setStats(newStats)

      // Adaptive quality adjustment with hysteresis
      const targetPreset = getPresetForQuality(quality)
      if (targetPreset.name !== currentPreset.name) {
        // Require 3 consecutive readings at same level before changing
        stabilityCountRef.current++
        if (stabilityCountRef.current >= 3) {
          setCurrentPreset(targetPreset)
          onQualityChange?.(targetPreset)
          stabilityCountRef.current = 0
        }
      } else {
        stabilityCountRef.current = 0
      }

    } catch (err) {
      console.warn('[AdaptiveBitrate] Failed to collect stats:', err)
    }
  }, [peerConnection, currentPreset, onQualityChange])

  useEffect(() => {
    if (!enabled || !peerConnection) return

    const interval = setInterval(collectStats, 2000) // Every 2 seconds
    return () => clearInterval(interval)
  }, [enabled, peerConnection, collectStats])

  const applyVideoConstraints = useCallback(async (preset: VideoConstraintPreset) => {
    if (!peerConnection) return

    const senders = peerConnection.getSenders()
    const videoSender = senders.find((s) => s.track?.kind === 'video')
    
    if (!videoSender) return

    const params = videoSender.getParameters()
    if (params.encodings && params.encodings.length > 0) {
      params.encodings[0].maxBitrate = preset.maxBitrate * 1000
      params.encodings[0].maxFramerate = preset.frameRate
      await videoSender.setParameters(params)
    }
  }, [peerConnection])

  // Apply constraints when preset changes
  useEffect(() => {
    if (enabled && peerConnection) {
      applyVideoConstraints(currentPreset)
    }
  }, [enabled, peerConnection, currentPreset, applyVideoConstraints])

  return {
    stats,
    currentPreset,
    setCurrentPreset,
    applyVideoConstraints,
    presets: QUALITY_PRESETS,
  }
}
