import { useEffect, useRef, useState, useCallback } from 'react'
import { onAuthStateChanged, signInAnonymous, isFirebaseConfigured } from '../lib/firebase'
import { auth } from '../lib/firebase'
import type { User } from '../lib/firebase'

interface UseFirebaseAuthReturn {
  user:         User | null
  isLoading:    boolean
  isAnonymous:  boolean
  getToken:     () => Promise<string | null>
  signInGoogle: () => Promise<void>
  signInAnon:   () => Promise<void>
  signOut:      () => Promise<void>
}

// Guest user object used when Firebase is not configured
const GUEST_USER = {
  uid:         `guest-${Math.random().toString(36).slice(2, 10)}`,
  displayName: 'Guest',
  photoURL:    null,
  isAnonymous: true,
  email:       null,
} as unknown as User

export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [user, setUser]         = useState<User | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    // If Firebase is not configured, skip auth and use guest mode
    if (!isFirebaseConfigured) {
      setUser(GUEST_USER)
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isFirebaseConfigured) return null
    if (!auth.currentUser) return null
    return auth.currentUser.getIdToken()
  }, [])

  const signInGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) return
    const { signInGoogle: googleSignIn } = await import('../lib/firebase')
    await googleSignIn()
  }, [])

  const signInAnon = useCallback(async () => {
    if (!isFirebaseConfigured) return
    await signInAnonymous()
  }, [])

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured) return
    const { signOut: firebaseSignOut } = await import('../lib/firebase')
    await firebaseSignOut()
  }, [])

  return {
    user,
    isLoading,
    isAnonymous: user?.isAnonymous ?? true,
    getToken,
    signInGoogle,
    signInAnon,
    signOut,
  }
}
