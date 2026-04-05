import { create } from 'zustand'

interface MediaStore {
  localStream:    MediaStream | null
  isMuted:        boolean
  isCameraOff:    boolean
  isScreenShare:  boolean

  setLocalStream:  (stream: MediaStream | null) => void
  setMuted:        (muted: boolean) => void
  setCameraOff:    (off: boolean) => void
  setScreenShare:  (sharing: boolean) => void
  clearMedia:      () => void
}

export const useMediaStore = create<MediaStore>()((set) => ({
  localStream:   null,
  isMuted:       false,
  isCameraOff:   false,
  isScreenShare: false,

  setLocalStream:  (localStream)  => set(() => ({ localStream })),
  setMuted:        (isMuted)      => set(() => ({ isMuted })),
  setCameraOff:    (isCameraOff)  => set(() => ({ isCameraOff })),
  setScreenShare:  (isScreenShare)=> set(() => ({ isScreenShare })),
  clearMedia:      ()             => set(() => ({
    localStream: null, isMuted: false, isCameraOff: false, isScreenShare: false,
  })),
}))
