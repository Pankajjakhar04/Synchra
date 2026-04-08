import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from './Avatar'

interface ProfileEditorProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileEditor({ isOpen, onClose }: ProfileEditorProps) {
  const { profile, loading, updateProfile } = useProfile()
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)

  // Sync state when profile loads
  useState(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setAvatarUrl(profile.avatarUrl || '')
      setBio(profile.bio || '')
    }
  })

  const handleSave = useCallback(async () => {
    setSaving(true)
    await updateProfile({
      displayName: displayName.trim() || 'Viewer',
      avatarUrl: avatarUrl.trim() || null,
      bio: bio.trim() || null,
    })
    setSaving(false)
    onClose()
  }, [displayName, avatarUrl, bio, updateProfile, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="profile-editor-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="profile-editor glass-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-editor__header">
            <h2>Edit Profile</h2>
            <button onClick={onClose} className="profile-editor__close">✕</button>
          </div>

          <div className="profile-editor__content">
            {/* Avatar Preview */}
            <div className="profile-editor__avatar">
              <Avatar 
                displayName={displayName || 'Viewer'} 
                avatarUrl={avatarUrl || null} 
                size="xl" 
              />
            </div>

            {/* Display Name */}
            <div className="profile-editor__field">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Your name"
              />
            </div>

            {/* Avatar URL */}
            <div className="profile-editor__field">
              <label htmlFor="avatarUrl">Avatar URL</label>
              <input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
              <span className="profile-editor__hint">
                Leave empty to use initials
              </span>
            </div>

            {/* Bio */}
            <div className="profile-editor__field">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Tell us about yourself..."
              />
              <span className="profile-editor__hint">
                {bio.length}/200 characters
              </span>
            </div>
          </div>

          <div className="profile-editor__actions">
            <button onClick={onClose} className="btn btn--ghost">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="btn btn--primary"
              disabled={saving || loading}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <style>{`
            .profile-editor-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.6);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              padding: 1rem;
            }

            .profile-editor {
              width: 100%;
              max-width: 420px;
              border-radius: 16px;
              padding: 1.5rem;
            }

            .profile-editor__header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1.5rem;
            }

            .profile-editor__header h2 {
              font-family: var(--font-heading);
              font-size: 1.5rem;
              color: var(--text-primary);
              margin: 0;
            }

            .profile-editor__close {
              background: none;
              border: none;
              color: var(--text-muted);
              font-size: 1.25rem;
              cursor: pointer;
              padding: 0.25rem;
              transition: color 0.2s;
            }

            .profile-editor__close:hover {
              color: var(--text-primary);
            }

            .profile-editor__content {
              display: flex;
              flex-direction: column;
              gap: 1.25rem;
            }

            .profile-editor__avatar {
              display: flex;
              justify-content: center;
              margin-bottom: 0.5rem;
            }

            .profile-editor__field {
              display: flex;
              flex-direction: column;
              gap: 0.375rem;
            }

            .profile-editor__field label {
              font-size: 0.875rem;
              font-weight: 500;
              color: var(--text-secondary);
            }

            .profile-editor__field input,
            .profile-editor__field textarea {
              background: var(--bg-surface);
              border: 1px solid var(--border-subtle);
              border-radius: 8px;
              padding: 0.75rem 1rem;
              color: var(--text-primary);
              font-size: 1rem;
              transition: border-color 0.2s;
            }

            .profile-editor__field input:focus,
            .profile-editor__field textarea:focus {
              outline: none;
              border-color: var(--accent-gold);
            }

            .profile-editor__field textarea {
              resize: none;
              font-family: inherit;
            }

            .profile-editor__hint {
              font-size: 0.75rem;
              color: var(--text-muted);
            }

            .profile-editor__actions {
              display: flex;
              justify-content: flex-end;
              gap: 0.75rem;
              margin-top: 1.5rem;
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

            .btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .btn--primary {
              background: var(--accent-gold);
              color: var(--bg-void);
              border: none;
            }

            .btn--primary:hover:not(:disabled) {
              background: var(--accent-gold-hover);
            }

            .btn--ghost {
              background: transparent;
              color: var(--text-secondary);
              border: 1px solid var(--border-subtle);
            }

            .btn--ghost:hover:not(:disabled) {
              border-color: var(--text-muted);
              color: var(--text-primary);
            }
          `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
