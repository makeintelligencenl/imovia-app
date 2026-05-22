'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MatchOverlayProps {
  count: number
  href: string        // URL para redirecionar (matches filtrado)
  onClose: () => void
}

export function MatchOverlay({ count, href, onClose }: MatchOverlayProps) {
  const router = useRouter()

  function irParaMatches() {
    onClose()
    router.push(href)
  }

  // Auto-redireciona após 5 s
  useEffect(() => {
    const t = setTimeout(irParaMatches, 5000)
    return () => clearTimeout(t)
  }, [href])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'matchPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
          borderRadius: '24px',
          padding: '48px 56px',
          textAlign: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
          maxWidth: '380px',
          width: '90vw',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Brilho decorativo */}
        <div style={{
          position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Ícone */}
        <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '20px', animation: 'heartPulse 0.8s ease-in-out 0.4s 2' }}>
          🏠❤️
        </div>

        {/* Título */}
        <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          Match encontrado!
        </h2>

        {/* Subtítulo */}
        <p style={{ color: '#93C5FD', fontSize: '15px', fontWeight: 500, marginBottom: '28px' }}>
          {count === 1 ? '1 cliente foi notificado' : `${count} clientes foram notificados`}
        </p>

        {/* Linha decorativa */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)', marginBottom: '24px', borderRadius: '99px' }} />

        {/* Botões */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={irParaMatches}
            style={{
              background: '#2563EB',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              padding: '9px 22px',
              borderRadius: '99px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1D4ED8' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2563EB' }}
          >
            Ver matches →
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#CBD5E1',
              fontSize: '13px',
              fontWeight: 500,
              padding: '9px 18px',
              borderRadius: '99px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          >
            Fechar
          </button>
        </div>

        <p style={{ marginTop: '16px', color: 'rgba(148,163,184,0.5)', fontSize: '11px' }}>
          Redirecionando em 5s…
        </p>
      </div>

      <style>{`
        @keyframes matchPop {
          0%   { opacity: 0; transform: scale(0.5) translateY(30px); }
          70%  { transform: scale(1.05) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes heartPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
