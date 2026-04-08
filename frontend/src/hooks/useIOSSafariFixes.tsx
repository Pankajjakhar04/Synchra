import { useEffect, useRef, useCallback } from 'react'

/**
 * iOS Safari specific fixes and workarounds
 */

interface UseIOSSafariFixesOptions {
  enableAudioWorkaround?: boolean
  enableVideoWorkaround?: boolean
}

/**
 * Detects if running on iOS Safari
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  
  return isIOS && isSafari
}

/**
 * Hook for iOS Safari specific fixes
 */
export function useIOSSafariFixes(options: UseIOSSafariFixesOptions = {}) {
  const { enableAudioWorkaround = true, enableVideoWorkaround = true } = options
  const audioUnlocked = useRef(false)

  // Unlock audio context on first user interaction (iOS requirement)
  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current) return

    // Create and immediately play a silent audio context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)

    // Resume any suspended audio contexts
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    audioUnlocked.current = true
    console.log('[iOS] Audio context unlocked')
  }, [])

  useEffect(() => {
    if (!isIOSSafari()) return

    // Fix for 100vh issue on iOS Safari
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setViewportHeight()
    window.addEventListener('resize', setViewportHeight)
    window.addEventListener('orientationchange', setViewportHeight)

    // Unlock audio on first user interaction
    if (enableAudioWorkaround) {
      const events = ['touchstart', 'touchend', 'click']
      const handleInteraction = () => {
        unlockAudio()
        events.forEach(e => document.removeEventListener(e, handleInteraction))
      }
      events.forEach(e => document.addEventListener(e, handleInteraction, { once: true }))
    }

    // Prevent elastic scrolling / bounce
    document.body.style.overscrollBehavior = 'none'

    return () => {
      window.removeEventListener('resize', setViewportHeight)
      window.removeEventListener('orientationchange', setViewportHeight)
    }
  }, [enableAudioWorkaround, unlockAudio])

  /**
   * Get video element props for iOS Safari compatibility
   */
  const getVideoProps = useCallback(() => {
    if (!enableVideoWorkaround || !isIOSSafari()) {
      return {}
    }

    return {
      playsInline: true,
      'webkit-playsinline': 'true',
      muted: false, // Will be set by component
      autoPlay: false, // Must be triggered by user interaction
    }
  }, [enableVideoWorkaround])

  /**
   * Request camera/mic with iOS-specific constraints
   */
  const requestMedia = useCallback(async (
    video = true,
    audio = true
  ): Promise<MediaStream | null> => {
    try {
      const constraints: MediaStreamConstraints = {}

      if (audio) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      }

      if (video) {
        constraints.video = {
          facingMode: 'user',
          width: { ideal: isIOSSafari() ? 640 : 1280 },
          height: { ideal: isIOSSafari() ? 480 : 720 },
          frameRate: { ideal: isIOSSafari() ? 24 : 30 },
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // On iOS, ensure tracks are enabled
      stream.getTracks().forEach(track => {
        track.enabled = true
      })

      return stream
    } catch (err) {
      console.error('[iOS Media] Failed to get media:', err)

      // Fallback: Try audio only if video failed
      if (video && audio) {
        console.log('[iOS Media] Retrying with audio only')
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
          return null
        }
      }

      return null
    }
  }, [])

  return {
    isIOSSafari: isIOSSafari(),
    getVideoProps,
    requestMedia,
    unlockAudio,
  }
}

/**
 * Component wrapper that applies iOS Safari video fixes
 */
export function IOSVideoWrapper({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  if (!isIOSSafari()) {
    return <>{children}</>
  }

  return (
    <div 
      className={`ios-video-wrapper ${className}`}
      style={{
        // Prevent iOS from showing video controls
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        // Force GPU acceleration
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      {children}
    </div>
  )
}
