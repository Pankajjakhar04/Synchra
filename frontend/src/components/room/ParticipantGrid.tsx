import React from 'react'
import { VideoTile } from './VideoTile'
import { Participant } from '../../types'
import { useRoomStore } from '../../store/roomStore'
import { useWebRTC } from '../../hooks/useWebRTC'
import { Socket } from 'socket.io-client'
import { useMediaStore } from '../../store/mediaStore'
import { motion } from 'framer-motion'

interface ParticipantGridProps {
  socket: Socket | null
  localUserId: string
}

export function ParticipantGrid({ socket, localUserId }: ParticipantGridProps) {
  const { participants } = useRoomStore()
  const participantIds = Object.keys(participants)
  
  // Use our specialized WebRTC hook
  const { peers, localStream, startMedia, toggleMute, toggleCamera } = useWebRTC(socket, localUserId, participantIds)
  const { isMuted, isCameraOff, setMuted, setCameraOff } = useMediaStore()

  // Initialize media on mount
  React.useEffect(() => {
    startMedia()
  }, [startMedia])

  // Media Controls Handlers
  const handleToggleMute = () => {
    const newMuted = toggleMute()
    setMuted(newMuted)
    socket?.emit('media:muted', { isMuted: newMuted })
  }

  const handleToggleCamera = () => {
    const newCameraOff = toggleCamera()
    setCameraOff(newCameraOff)
    socket?.emit('media:cameraOff', { isCameraOff: newCameraOff })
  }

  // Determine grid layout based on count
  const count = participantIds.length
  let gridColumns = 1
  if (count >= 2) gridColumns = 2
  if (count >= 5) gridColumns = 3
  if (count >= 10) gridColumns = 4

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: '0.75rem',
          padding: '0.75rem',
          overflowY: 'auto',
          alignContent: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Local User */}
        {participants[localUserId] && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <VideoTile 
              participant={participants[localUserId]} 
              stream={localStream} 
              isLocal 
            />
          </motion.div>
        )}

        {/* Remote Peers */}
        {Object.values(peers).map(peerState => {
          const participant = participants[peerState.userId]
          if (!participant) return null
          
          return (
            <motion.div key={peerState.userId} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <VideoTile 
                participant={participant} 
                stream={peerState.stream} 
              />
            </motion.div>
          )
        })}
      </div>

      {/* Floating Control Bar for Local User */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          background: 'linear-gradient(to top, rgba(10,10,15,1), transparent)'
        }}
      >
        <button 
          onClick={handleToggleMute}
          className={`btn ${isMuted ? 'btn-coral' : 'btn-ghost'}`}
          style={{ width: 44, height: 44, padding: 0, borderRadius: '50%' }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button 
          onClick={handleToggleCamera}
          className={`btn ${isCameraOff ? 'btn-coral' : 'btn-ghost'}`}
          style={{ width: 44, height: 44, padding: 0, borderRadius: '50%' }}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraOff ? '🚫' : '📹'}
        </button>
      </div>
    </div>
  )
}
