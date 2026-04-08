import { useEffect, useState, useCallback } from 'react'

interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

interface UseMobileLayoutResult {
  isMobile: boolean
  isTablet: boolean
  isLandscape: boolean
  safeAreaInsets: SafeAreaInsets
  isTouchDevice: boolean
  isStandalone: boolean  // PWA standalone mode
  viewportHeight: number // Actual viewport height (accounts for iOS Safari bars)
}

/**
 * Hook for mobile layout optimizations
 * Handles safe areas, viewport changes, and device detection
 */
export function useMobileLayout(): UseMobileLayoutResult {
  const [state, setState] = useState<UseMobileLayoutResult>(() => ({
    isMobile: false,
    isTablet: false,
    isLandscape: false,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    isTouchDevice: false,
    isStandalone: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  }))

  const updateLayout = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight

    // Device type detection
    const isMobile = width < 768
    const isTablet = width >= 768 && width < 1024
    const isLandscape = width > height
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // PWA standalone mode detection
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    // Safe area insets from CSS env()
    const computedStyle = getComputedStyle(document.documentElement)
    const safeAreaInsets: SafeAreaInsets = {
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
    }

    setState({
      isMobile,
      isTablet,
      isLandscape,
      safeAreaInsets,
      isTouchDevice,
      isStandalone,
      viewportHeight: height,
    })

    // Set CSS custom property for true viewport height (iOS Safari fix)
    document.documentElement.style.setProperty('--vh', `${height * 0.01}px`)
    document.documentElement.style.setProperty('--viewport-height', `${height}px`)
  }, [])

  useEffect(() => {
    // Initial measurement
    updateLayout()

    // Update on resize and orientation change
    window.addEventListener('resize', updateLayout)
    window.addEventListener('orientationchange', updateLayout)

    // For iOS Safari address bar changes
    if ('visualViewport' in window && window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateLayout)
    }

    return () => {
      window.removeEventListener('resize', updateLayout)
      window.removeEventListener('orientationchange', updateLayout)
      if ('visualViewport' in window && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateLayout)
      }
    }
  }, [updateLayout])

  return state
}

/**
 * Hook for mobile touch gestures
 */
interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement>,
  handlers: SwipeHandlers,
  threshold = 50
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    let startX = 0
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const deltaX = endX - startX
      const deltaY = endY - startY

      // Determine primary direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            handlers.onSwipeRight?.()
          } else {
            handlers.onSwipeLeft?.()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0) {
            handlers.onSwipeDown?.()
          } else {
            handlers.onSwipeUp?.()
          }
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, handlers, threshold])
}
