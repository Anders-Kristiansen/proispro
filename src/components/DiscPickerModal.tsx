import { useState, useEffect } from 'react'
import { ClientBag, ClientDisc } from '../utils/disc'

interface DiscPickerModalProps {
  bag: ClientBag
  allDiscs: ClientDisc[]
  onToggle: (discId: string) => void
  onClose: () => void
}

export function DiscPickerModal({ bag, allDiscs, onToggle, onClose }: DiscPickerModalProps) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const filteredDiscs = allDiscs.filter(d => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(searchLower) ||
      d.manufacturer.toLowerCase().includes(searchLower) ||
      d.type.toLowerCase().includes(searchLower)
    )
  })

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
          maxWidth: '600px',
          maxHeight: '80vh',
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
          <h2 style={{ margin: 0, color: 'var(--clr-text)' }}>
            Add / Remove Discs
          </h2>
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

        {/* Search */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--clr-border)' }}>
          <input
            type="text"
            placeholder="Search discs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--clr-surface2)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius)',
              color: 'var(--clr-text)',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Disc list */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1rem',
          }}
        >
          {filteredDiscs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: '2rem' }}>
              No discs found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredDiscs.map(disc => {
                const isInBag = bag.disc_ids.includes(disc.id)
                return (
                  <label
                    key={disc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'var(--clr-surface2)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      border: isInBag ? '2px solid var(--clr-accent)' : '1px solid var(--clr-border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isInBag}
                      onChange={() => onToggle(disc.id)}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--clr-text)' }}>
                        {disc.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>
                        {disc.manufacturer}
                        {disc.type && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              padding: '0.125rem 0.375rem',
                              background: 'var(--clr-border)',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                            }}
                          >
                            {disc.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
