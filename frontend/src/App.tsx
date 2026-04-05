import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

// Route-based code splitting — landing page loads fast, room code lazy-loads
const Landing  = lazy(() => import('./pages/Landing'))
const Room     = lazy(() => import('./pages/Room'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div
      style={{
        minHeight:      '100dvh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexDirection:  'column',
        gap:            '1rem',
        background:     'var(--bg-void)',
      }}
    >
      <div
        style={{
          fontFamily:   'var(--font-display)',
          fontSize:     '1.25rem',
          letterSpacing:'0.15em',
          color:        'var(--accent-gold)',
        }}
      >
        SYNCHRA
      </div>
      <div
        style={{
          width:        40,
          height:       4,
          borderRadius: '9999px',
          background:   'var(--bg-elevated)',
          overflow:     'hidden',
        }}
      >
        <div
          style={{
            height:     '100%',
            background: 'var(--accent-gold)',
            animation:  'loading-bar 1.2s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes loading-bar {
            0%   { width: 0%; margin-left: 0%; }
            50%  { width: 100%; margin-left: 0%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="*"          element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
