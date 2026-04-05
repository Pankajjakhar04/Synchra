import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Socket } from 'socket.io-client'
import { ChatMessage } from '../../types'
import { Avatar } from '../ui/Avatar'
import { useRoomStore } from '../../store/roomStore'

interface ChatSidebarProps {
  socket:      Socket | null
  localUserId: string
}

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '😭', '🎉', '👎']

export function ChatSidebar({ socket, localUserId }: ChatSidebarProps) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!socket) return

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), msg]) // keep last 200
    })

    return () => { socket.off('chat:message') }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    const text = inputText.trim()
    if (!text || !socket) return
    socket.emit('chat:message', { text })
    setInputText('')
  }

  const sendReaction = (emoji: string) => {
    socket?.emit('reaction:send', { emoji })
  }

  return (
    <div
      id="chat-sidebar"
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        background:    'var(--bg-surface)',
        borderLeft:    '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding:        '0.875rem 1rem',
          borderBottom:   '1px solid var(--border-subtle)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
          💬 Chat
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          {messages.length} msgs
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex:        1,
          overflowY:   'auto',
          padding:     '0.75rem',
          display:     'flex',
          flexDirection:'column',
          gap:         '0.375rem',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', marginTop: '2rem' }}>
            No messages yet.<br />Say hello! 👋
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                style={{
                  padding:      '0.5rem 0.625rem',
                  borderRadius: 'var(--radius-md)',
                  background:   msg.userId === localUserId ? 'var(--accent-gold-dim)' : 'var(--bg-elevated)',
                  border:       `1px solid ${msg.userId === localUserId ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                  <Avatar displayName={msg.displayName} avatarUrl={msg.avatarUrl} size="xs" />
                  <span style={{
                    fontSize:   '0.6875rem',
                    fontWeight: 600,
                    color:      msg.userId === localUserId ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  }}>
                    {msg.userId === localUserId ? 'You' : msg.displayName}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Reactions */}
      <div
        style={{
          padding:       '0.5rem 0.75rem',
          borderTop:     '1px solid var(--border-subtle)',
          display:       'flex',
          gap:           '0.25rem',
          flexWrap:      'wrap',
        }}
      >
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            title={`Send ${emoji}`}
            style={{
              fontSize:     '1.125rem',
              background:   'none',
              border:       'none',
              cursor:       'pointer',
              padding:      '0.25rem',
              borderRadius: 'var(--radius-sm)',
              lineHeight:    1,
              transition:   'transform 0.1s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.transform = 'scale(1.3)' }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding:    '0.75rem',
          borderTop:  '1px solid var(--border-subtle)',
          display:    'flex',
          gap:        '0.5rem',
        }}
      >
        <input
          id="chat-input"
          className="input"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          maxLength={500}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          id="chat-send-btn"
          onClick={sendMessage}
          disabled={!inputText.trim()}
          className="btn btn-primary"
          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', flexShrink: 0 }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
