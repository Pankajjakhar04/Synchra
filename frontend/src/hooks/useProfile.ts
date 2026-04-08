import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  userId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  createdAt: number
  updatedAt: number
}

interface UseProfileOptions {
  autoFetch?: boolean
}

export function useProfile(options: UseProfileOptions = { autoFetch: true }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || ''

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${apiUrl}/api/profile`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setProfile(null)
          return null
        }
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  const updateProfile = useCallback(async (updates: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl' | 'bio'>>) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      setProfile(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    if (options.autoFetch) {
      fetchProfile()
    }
  }, [options.autoFetch, fetchProfile])

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  }
}
