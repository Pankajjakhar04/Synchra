import * as admin from 'firebase-admin'

let initialized = false

export function initFirebase(): admin.app.App {
  if (initialized) {
    return admin.app()
  }

  // Uses GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON)
  // Works locally with the downloaded JSON file and on Cloud Run automatically
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })

  initialized = true
  console.log('[Firebase] Admin SDK initialized')
  return admin.app()
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    return await admin.auth().verifyIdToken(token)
  } catch {
    return null
  }
}

export { admin }
