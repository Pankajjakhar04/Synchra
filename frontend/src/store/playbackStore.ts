import { create } from 'zustand'
import { PlaybackState, SyncQuality } from '../types'

interface PlaybackStore {
  state:        PlaybackState | null
  countdown:    number | null
  syncQuality:  SyncQuality
  syncDrift:    number
  notice:       string | null

  setState:       (state: PlaybackState) => void
  setCountdown:   (count: number | null) => void
  setSyncQuality: (quality: SyncQuality, drift: number) => void
  setNotice:      (message: string | null) => void
  clearPlayback:  () => void
}

export const usePlaybackStore = create<PlaybackStore>()((set) => ({
  state:       null,
  countdown:   null,
  syncQuality: 'good',
  syncDrift:   0,
  notice:      null,

  setState:       (state)          => set(() => ({ state })),
  setCountdown:   (countdown)      => set(() => ({ countdown })),
  setSyncQuality: (syncQuality, syncDrift) => set(() => ({ syncQuality, syncDrift })),
  setNotice:      (notice)         => set(() => ({ notice })),
  clearPlayback:  ()               => set(() => ({
    state: null, countdown: null, syncQuality: 'good' as SyncQuality,
    syncDrift: 0, notice: null,
  })),
}))
