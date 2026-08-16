import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1100)
    const doneTimer = setTimeout(() => onDone(), 1500)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0B2545',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}>
        <img
            src="/buildstack-logo.svg"
            alt="BuildStack"
            style={{
              width: 88, height: 88,
              animation: 'bs-splash-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
        />
        <div style={{
          marginTop: 18,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '1.15rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: '#FFFFFF',
          opacity: 0.95,
        }}>
          Build<span style={{ color: '#E8A33D' }}>Stack</span>
        </div>
        <div style={{
          marginTop: 4,
          fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Budget
        </div>

        <style>{`
        @keyframes bs-splash-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      </div>
  )
}