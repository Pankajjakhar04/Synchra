import { create } from 'zustand'
import { Participant, QueueItem, RoomState } from '../types'

interface RoomStore {
  // State
  roomId:       string | null
  name:         string | null
  hostId:       string | null
  localUserId:  string | null   // set from server's room:state — canonical identity
  participants: Record<string, Participant>
  queue:        QueueItem[]
  isConnected:  boolean
  isJoining:    boolean
  error:        string | null

  // Actions
  setRoomState:         (state: Partial<RoomState> & { localUserId?: string }) => void
  setConnected:         (connected: boolean) => void
  setJoining:           (joining: boolean) => void
  setError:             (error: string | null) => void
  addParticipant:       (participant: Participant) => void
  removeParticipant:    (userId: string) => void
  updateParticipant:    (userId: string, updates: Partial<Participant>) => void
  setHost:              (hostId: string) => void
  setQueue:             (queue: QueueItem[]) => void
  clearRoom:            () => void
}

export const useRoomStore = create<RoomStore>()((set) => ({
    roomId:       null,
    name:         null,
    hostId:       null,
    localUserId:  null,
    participants: {},
    queue:        [],
    isConnected:  false,
    isJoining:    false,
    error:        null,

    setRoomState: (state) => set((s) => ({
      ...s,
      roomId:       state.roomId       ?? s.roomId,
      name:         state.name         !== undefined ? state.name : s.name,
      hostId:       state.hostId       ?? s.hostId,
      localUserId:  state.localUserId  ?? s.localUserId,
      participants: state.participants  ?? s.participants,
      queue:        state.queue        ?? s.queue,
    })),

    setConnected:  (connected) => set((s) => ({ ...s, isConnected: connected })),
    setJoining:    (joining)   => set((s) => ({ ...s, isJoining:   joining })),
    setError:      (error)     => set((s) => ({ ...s, error })),

    addParticipant: (participant) => set((s) => ({
      ...s,
      participants: { ...s.participants, [participant.userId]: participant },
    })),

    removeParticipant: (userId) => set((s) => {
      const { [userId]: _, ...rest } = s.participants
      return { ...s, participants: rest }
    }),

    updateParticipant: (userId, updates) => set((s) => ({
      ...s,
      participants: {
        ...s.participants,
        [userId]: s.participants[userId]
          ? { ...s.participants[userId], ...updates }
          : s.participants[userId],
      },
    })),

    setHost: (hostId) => set((s) => ({
      ...s,
      hostId,
      participants: Object.fromEntries(
        Object.entries(s.participants).map(([uid, p]) => [uid, { ...p, isHost: uid === hostId }])
      ),
    })),

    setQueue: (queue) => set((s) => ({ ...s, queue })),

    clearRoom: () => set(() => ({
      roomId: null, name: null, hostId: null, localUserId: null,
      participants: {}, queue: [], isConnected: false, error: null,
      isJoining: false,
    })),
}))
