import { useEffect } from 'react'
import { ClientBag, ClientDisc } from '../utils/disc'
import { FlightChart } from './FlightChart'

interface BagPopoutProps {
  bag: ClientBag
  allDiscs: ClientDisc[]
  onClose: () => void
}

export function BagPopout({ bag, allDiscs, onClose }: BagPopoutProps) {
  const bagDiscs = allDiscs.filter(d => bag.disc_ids.includes(d.id))

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--clr-surface)',
          borderRadius: 'var(--radius)',
          width: '90vw',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: 'var(--clr-text)' }}>👜 {bag.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)', marginTop: '0.25rem' }}>
              {bagDiscs.length} {bagDiscs.length === 1 ? 'disc' : 'discs'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: 'var(--clr-muted)',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
          }}
        >
          {bagDiscs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: '2rem' }}>
              No discs in this bag yet.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
                gap: '2rem',
              }}
            >
              {/* Left: Flight Chart */}
              <div>
                <h3 style={{ marginTop: 0, color: 'var(--clr-text)' }}>Flight Chart</h3>
                <FlightChart discs={bagDiscs} />
              </div>

              {/* Right: Disc List */}
              <div>
                <h3 style={{ marginTop: 0, color: 'var(--clr-text)' }}>Discs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {bagDiscs.map(disc => (
                    <div
                      key={disc.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--clr-surface2)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--clr-border)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
                        {disc.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>
                        {disc.manufacturer}
                        {disc.type && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              padding: '0.125rem 0.375rem',
                              background: 'var(--clr-border)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                            }}
                          >
                            {disc.type}
                          </span>
                        )}
                      </div>
                      {disc.speed !== '' && disc.speed != null && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--clr-text)', marginTop: '0.5rem' }}>
                          Flight: {disc.speed}/{disc.glide}/{disc.turn}/{disc.fade}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
