import { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { QueueItem } from '@/types'
import { Socket } from 'socket.io-client'

interface QueueSidebarProps {
  queue: QueueItem[]
  currentVideoId: string | null
  isHost: boolean
  socket: Socket | null
  onPlayVideo?: (item: QueueItem) => void
}

export function QueueSidebar({ 
  queue, 
  currentVideoId, 
  isHost, 
  socket,
  onPlayVideo 
}: QueueSidebarProps) {
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleAddVideo = useCallback(async () => {
    if (!socket || !newVideoUrl.trim()) return

    const videoId = extractYouTubeId(newVideoUrl.trim())
    if (!videoId) {
      alert('Invalid YouTube URL or video ID')
      return
    }

    setIsAdding(true)

    // Fetch video info from YouTube oEmbed (no API key needed)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
      const response = await fetch(oembedUrl)
      const data = await response.json()

      socket.emit('queue:add', {
        videoId,
        videoType: 'youtube',
        title: data.title || 'Untitled Video',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      })

      setNewVideoUrl('')
    } catch {
      // Fallback if oEmbed fails
      socket.emit('queue:add', {
        videoId,
        videoType: 'youtube',
        title: 'YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      })
      setNewVideoUrl('')
    } finally {
      setIsAdding(false)
    }
  }, [socket, newVideoUrl])

  const handleRemove = useCallback((itemId: string) => {
    if (!socket || !isHost) return
    socket.emit('queue:remove', { itemId })
  }, [socket, isHost])

  const handleReorder = useCallback((newOrder: QueueItem[]) => {
    if (!socket || !isHost) return
    
    // Find the item that moved
    const oldIndex = queue.findIndex(item => 
      !newOrder.some((newItem, i) => newItem.id === item.id && i === queue.indexOf(item))
    )
    const newIndex = newOrder.findIndex(item => item.id === queue[oldIndex]?.id)
    
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      socket.emit('queue:reorder', { fromIndex: oldIndex, toIndex: newIndex })
    }
  }, [socket, isHost, queue])

  const handlePlay = useCallback((item: QueueItem) => {
    if (!isHost || !onPlayVideo) return
    onPlayVideo(item)
  }, [isHost, onPlayVideo])

  // Split queue into now playing and up next
  const nowPlaying = queue.find(item => item.videoId === currentVideoId)
  const upNext = queue.filter(item => item.videoId !== currentVideoId)

  return (
    <div className="queue-sidebar">
      <div className="queue-sidebar__header">
        <h3>Queue</h3>
        <span className="queue-sidebar__count">{queue.length} videos</span>
      </div>

      {/* Add Video Input */}
      <div className="queue-sidebar__add">
        <input
          type="text"
          value={newVideoUrl}
          onChange={(e) => setNewVideoUrl(e.target.value)}
          placeholder="Paste YouTube URL..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
        />
        <button 
          onClick={handleAddVideo} 
          disabled={isAdding || !newVideoUrl.trim()}
          className="queue-sidebar__add-btn"
        >
          {isAdding ? '...' : '+'}
        </button>
      </div>

      {/* Now Playing */}
      {nowPlaying && (
        <div className="queue-sidebar__section">
          <span className="queue-sidebar__section-label">Now Playing</span>
          <QueueItemCard 
            item={nowPlaying} 
            isPlaying 
            isHost={isHost}
            onRemove={handleRemove}
          />
        </div>
      )}

      {/* Up Next */}
      {upNext.length > 0 && (
        <div className="queue-sidebar__section">
          <span className="queue-sidebar__section-label">Up Next</span>
          
          {isHost ? (
            <Reorder.Group 
              axis="y" 
              values={upNext} 
              onReorder={handleReorder}
              className="queue-sidebar__list"
            >
              <AnimatePresence>
                {upNext.map((item) => (
                  <Reorder.Item key={item.id} value={item}>
                    <QueueItemCard
                      item={item}
                      isHost={isHost}
                      onRemove={handleRemove}
                      onPlay={() => handlePlay(item)}
                      draggable
                    />
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            <div className="queue-sidebar__list">
              {upNext.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  isHost={isHost}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {queue.length === 0 && (
        <div className="queue-sidebar__empty">
          <span>🎬</span>
          <p>Queue is empty</p>
          <p className="queue-sidebar__empty-hint">Add a YouTube video to get started</p>
        </div>
      )}

      <style>{`
        .queue-sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1rem;
          overflow-y: auto;
        }

        .queue-sidebar__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .queue-sidebar__header h3 {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          color: var(--text-primary);
          margin: 0;
        }

        .queue-sidebar__count {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .queue-sidebar__add {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .queue-sidebar__add input {
          flex: 1;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 0.625rem 0.875rem;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .queue-sidebar__add input:focus {
          outline: none;
          border-color: var(--accent-gold);
        }

        .queue-sidebar__add-btn {
          background: var(--accent-gold);
          color: var(--bg-void);
          border: none;
          border-radius: 8px;
          width: 40px;
          font-size: 1.25rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .queue-sidebar__add-btn:hover:not(:disabled) {
          background: var(--accent-gold-hover);
        }

        .queue-sidebar__add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .queue-sidebar__section {
          margin-bottom: 1rem;
        }

        .queue-sidebar__section-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .queue-sidebar__list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .queue-sidebar__empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-muted);
          gap: 0.5rem;
        }

        .queue-sidebar__empty span {
          font-size: 2.5rem;
          opacity: 0.5;
        }

        .queue-sidebar__empty p {
          margin: 0;
        }

        .queue-sidebar__empty-hint {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  )
}

// Individual queue item card
interface QueueItemCardProps {
  item: QueueItem
  isPlaying?: boolean
  isHost: boolean
  draggable?: boolean
  onRemove?: (id: string) => void
  onPlay?: () => void
}

function QueueItemCard({ 
  item, 
  isPlaying = false, 
  isHost, 
  draggable,
  onRemove, 
  onPlay 
}: QueueItemCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`queue-item ${isPlaying ? 'queue-item--playing' : ''} ${draggable ? 'queue-item--draggable' : ''}`}
    >
      {/* Thumbnail */}
      <div className="queue-item__thumb">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" />
        ) : (
          <div className="queue-item__thumb-placeholder">🎬</div>
        )}
        {isPlaying && (
          <div className="queue-item__playing-badge">
            <span>▶</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="queue-item__info">
        <span className="queue-item__title">{item.title}</span>
        <span className="queue-item__meta">
          {item.videoType === 'youtube' ? 'YouTube' : 'Video'}
        </span>
      </div>

      {/* Actions */}
      <div className="queue-item__actions">
        {isHost && !isPlaying && onPlay && (
          <button 
            onClick={onPlay} 
            className="queue-item__action" 
            title="Play now"
          >
            ▶
          </button>
        )}
        {isHost && onRemove && (
          <button 
            onClick={() => onRemove(item.id)} 
            className="queue-item__action queue-item__action--remove" 
            title="Remove"
          >
            ✕
          </button>
        )}
        {draggable && (
          <div className="queue-item__drag-handle" title="Drag to reorder">
            ⋮⋮
          </div>
        )}
      </div>

      <style>{`
        .queue-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          transition: border-color 0.2s, background 0.2s;
        }

        .queue-item--playing {
          border-color: var(--accent-gold);
          background: rgba(229, 183, 84, 0.1);
        }

        .queue-item--draggable {
          cursor: grab;
        }

        .queue-item--draggable:active {
          cursor: grabbing;
        }

        .queue-item__thumb {
          position: relative;
          width: 64px;
          height: 36px;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--bg-elevated);
        }

        .queue-item__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .queue-item__thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .queue-item__playing-badge {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-gold);
          font-size: 0.875rem;
        }

        .queue-item__info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .queue-item__title {
          font-size: 0.8125rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-item__meta {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }

        .queue-item__actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .queue-item__action {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          font-size: 0.75rem;
          opacity: 0.6;
          transition: opacity 0.2s, color 0.2s;
        }

        .queue-item__action:hover {
          opacity: 1;
          color: var(--text-primary);
        }

        .queue-item__action--remove:hover {
          color: var(--sync-bad);
        }

        .queue-item__drag-handle {
          color: var(--text-muted);
          font-size: 0.875rem;
          opacity: 0.4;
          cursor: grab;
          padding: 0 0.25rem;
        }

        .queue-item:hover .queue-item__drag-handle {
          opacity: 0.8;
        }
      `}</style>
    </motion.div>
  )
}
