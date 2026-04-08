import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '@/store/roomStore'

interface VideoUploadProps {
  roomId: string
  onUploadComplete?: (videoId: string) => void
  onClose?: () => void
}

type UploadState = 'idle' | 'selecting' | 'uploading' | 'complete' | 'error'

export function VideoUpload({ roomId, onUploadComplete, onClose }: VideoUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || ''

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file')
      return
    }

    // Validate file size (max 2GB for free tier)
    const maxSize = 2 * 1024 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 2GB.')
      return
    }

    setSelectedFile(file)
    setState('selecting')
    setError(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    setState('uploading')
    setProgress(0)
    setError(null)

    try {
      // 1. Get signed upload URL from backend
      const response = await fetch(`${apiUrl}/api/rooms/${roomId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, videoId } = await response.json()

      // 2. Upload file to GCS (or dev endpoint)
      abortControllerRef.current = new AbortController()

      const xhr = new XMLHttpRequest()
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', selectedFile.type)
        xhr.send(selectedFile)
      })

      setState('complete')
      onUploadComplete?.(videoId)

    } catch (err) {
      if (err instanceof Error && err.message === 'Upload cancelled') {
        setState('idle')
      } else {
        setState('error')
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    }
  }, [selectedFile, roomId, apiUrl, onUploadComplete])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setState('idle')
    setSelectedFile(null)
    setProgress(0)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="video-upload glass-elevated"
    >
      <div className="video-upload__header">
        <h3>Upload Video</h3>
        {onClose && (
          <button onClick={onClose} className="video-upload__close">
            ✕
          </button>
        )}
      </div>

      <div className="video-upload__content">
        <AnimatePresence mode="wait">
          {/* Idle / Select File */}
          {(state === 'idle' || state === 'selecting') && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="video-upload__dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="video-upload__input"
              />
              
              {selectedFile ? (
                <div className="video-upload__file-info">
                  <span className="video-upload__icon">🎬</span>
                  <span className="video-upload__filename">{selectedFile.name}</span>
                  <span className="video-upload__filesize">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              ) : (
                <div className="video-upload__placeholder">
                  <span className="video-upload__icon">📁</span>
                  <span>Click to select a video file</span>
                  <span className="video-upload__hint">MP4, WebM, MOV • Max 2GB</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Uploading */}
          {state === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="video-upload__progress"
            >
              <div className="video-upload__progress-bar">
                <motion.div
                  className="video-upload__progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="video-upload__progress-text">{progress}%</span>
              <span className="video-upload__progress-label">
                Uploading {selectedFile?.name}...
              </span>
            </motion.div>
          )}

          {/* Complete */}
          {state === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="video-upload__complete"
            >
              <span className="video-upload__success-icon">✓</span>
              <span>Upload complete!</span>
            </motion.div>
          )}

          {/* Error */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="video-upload__error"
            >
              <span className="video-upload__error-icon">⚠</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="video-upload__actions">
        {state === 'selecting' && (
          <>
            <button onClick={handleCancel} className="btn btn--ghost">
              Cancel
            </button>
            <button onClick={handleUpload} className="btn btn--primary">
              Upload
            </button>
          </>
        )}

        {state === 'uploading' && (
          <button onClick={handleCancel} className="btn btn--ghost">
            Cancel Upload
          </button>
        )}

        {(state === 'complete' || state === 'error') && (
          <button
            onClick={() => {
              setState('idle')
              setSelectedFile(null)
              setProgress(0)
              setError(null)
            }}
            className="btn btn--primary"
          >
            {state === 'error' ? 'Try Again' : 'Upload Another'}
          </button>
        )}
      </div>

      <style>{`
        .video-upload {
          width: 100%;
          max-width: 400px;
          padding: 1.5rem;
          border-radius: 16px;
        }

        .video-upload__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .video-upload__header h3 {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          color: var(--text-primary);
          margin: 0;
        }

        .video-upload__close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.2s;
        }

        .video-upload__close:hover {
          color: var(--text-primary);
        }

        .video-upload__content {
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-upload__input {
          display: none;
        }

        .video-upload__dropzone {
          width: 100%;
          padding: 2rem;
          border: 2px dashed var(--border-subtle);
          border-radius: 12px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          text-align: center;
        }

        .video-upload__dropzone:hover {
          border-color: var(--accent-gold);
          background: rgba(229, 183, 84, 0.05);
        }

        .video-upload__placeholder,
        .video-upload__file-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
        }

        .video-upload__icon {
          font-size: 2.5rem;
        }

        .video-upload__filename {
          font-weight: 500;
          color: var(--text-primary);
          word-break: break-all;
        }

        .video-upload__filesize {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .video-upload__hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .video-upload__progress {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .video-upload__progress-bar {
          width: 100%;
          height: 8px;
          background: var(--bg-surface);
          border-radius: 4px;
          overflow: hidden;
        }

        .video-upload__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-gold), var(--accent-coral));
          border-radius: 4px;
        }

        .video-upload__progress-text {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--accent-gold);
        }

        .video-upload__progress-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .video-upload__complete {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--sync-good);
        }

        .video-upload__success-icon {
          font-size: 3rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(76, 175, 125, 0.2);
          border-radius: 50%;
        }

        .video-upload__error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--sync-bad);
          text-align: center;
        }

        .video-upload__error-icon {
          font-size: 2rem;
        }

        .video-upload__actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn--primary {
          background: var(--accent-gold);
          color: var(--bg-void);
          border: none;
        }

        .btn--primary:hover {
          background: var(--accent-gold-hover);
        }

        .btn--ghost {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }

        .btn--ghost:hover {
          border-color: var(--text-muted);
          color: var(--text-primary);
        }
      `}</style>
    </motion.div>
  )
}
