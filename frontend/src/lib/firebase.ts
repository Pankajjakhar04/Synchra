import { initializeApp, getApp, getApps } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Check if Firebase is configured with real values
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('Dummy') &&
  !firebaseConfig.apiKey.includes('your-') &&
  firebaseConfig.projectId
)

// Prevent re-initialization in HMR
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)

export { app, auth }

export async function signInGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('profile')
    provider.addScope('email')
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch {
    return null
  }
}

export async function signInAnonymous(): Promise<User | null> {
  if (!isFirebaseConfigured) return null
  try {
    const result = await signInAnonymously(auth)
    return result.user
  } catch {
    return null
  }
}

export async function signOut(): Promise<void> {
  if (!isFirebaseConfigured) return
  await firebaseSignOut(auth)
}

export async function getIdToken(): Promise<string | null> {
  if (!isFirebaseConfigured) return null
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

export { onAuthStateChanged }
export type { User }
