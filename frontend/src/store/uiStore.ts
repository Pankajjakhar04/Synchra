import { create } from 'zustand'

interface UIStore {
  isChatOpen:        boolean
  isQueueOpen:       boolean
  isSettingsOpen:    boolean
  isTheatreMode:     boolean
  isNetworkDashOpen: boolean

  toggleChat:        () => void
  toggleQueue:       () => void
  toggleSettings:    () => void
  toggleTheatre:     () => void
  toggleNetworkDash: () => void
  closeAll:          () => void
  setTheatreMode:    (value: boolean) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  isChatOpen:        true,
  isQueueOpen:       false,
  isSettingsOpen:    false,
  isTheatreMode:     false,
  isNetworkDashOpen: false,

  toggleChat:        () => set((s) => ({ isChatOpen:        !s.isChatOpen })),
  toggleQueue:       () => set((s) => ({ isQueueOpen:       !s.isQueueOpen })),
  toggleSettings:    () => set((s) => ({ isSettingsOpen:    !s.isSettingsOpen })),
  toggleTheatre:     () => set((s) => ({ isTheatreMode:     !s.isTheatreMode })),
  toggleNetworkDash: () => set((s) => ({ isNetworkDashOpen: !s.isNetworkDashOpen })),
  closeAll:          () => set(() => ({
    isQueueOpen: false, isSettingsOpen: false, isNetworkDashOpen: false,
  })),
  setTheatreMode: (isTheatreMode) => set(() => ({ isTheatreMode })),
}))
