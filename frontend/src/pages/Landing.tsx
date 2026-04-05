import React from 'react'
import { Hero } from '../components/landing/Hero'
import { Features } from '../components/landing/Features'

export default function Landing() {
  return (
    <main>
      <Hero />
      <Features />

      {/* Footer */}
      <footer
        style={{
          borderTop:      '1px solid var(--border-subtle)',
          padding:        '2rem',
          textAlign:      'center',
          color:          'var(--text-muted)',
          fontSize:       '0.8125rem',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
          SYNCHRA
        </div>
        <p>Built on GCP $300 Credit · Cinema Noir Design · Sub-80ms Sync · Made with 🎬</p>
        <p style={{ marginTop: '0.25rem' }}>
          <a href="https://github.com" style={{ color: 'var(--text-secondary)' }}>GitHub</a>
          {' · '}
          <a href="/privacy" style={{ color: 'var(--text-secondary)' }}>Privacy</a>
        </p>
      </footer>
    </main>
  )
}
