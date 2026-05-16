import { useState } from 'react'
import { ClientBag, ClientDisc } from '../utils/disc'
import { FlightChart } from './FlightChart'
import { formatHistoryTime } from '../hooks/useBags'

interface BagCardProps {
  bag: ClientBag
  allDiscs: ClientDisc[]
  isExpanded: boolean
  onToggleExpand: () => void
  onRename: () => void
  onDelete: () => void
  onOpenDiscPicker: () => void
  onOpenPopout: () => void
  onRemoveDisc: (discId: string) => void
  loadBagHistory: (bagId: string) => Promise<BagHistoryEntry[]>
}

interface BagHistoryEntry {
  id: string
  bag_id: string
  disc_id: string
  disc_name: string
  action: 'added' | 'removed'
  changed_at: string
}

export function BagCard({
  bag,
  allDiscs,
  isExpanded,
  onToggleExpand,
  onRename,
  onDelete,
  onOpenDiscPicker,
  onOpenPopout,
  onRemoveDisc,
  loadBagHistory,
}: BagCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showFlightChart, setShowFlightChart] = useState(false)
  const [bagHistory, setBagHistory] = useState<BagHistoryEntry[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const getDiscsForBag = () => {
    return allDiscs.filter(d => bag.disc_ids.includes(d.id))
  }

  const bagDiscs = getDiscsForBag()
  const hasFlightData = bagDiscs.some(d => d.speed !== '' && d.speed != null)

  const handleToggleExpand = () => {
    if (!isExpanded && !historyLoaded) {
      loadBagHistory(bag.id).then(history => {
        setBagHistory(history)
        setHistoryLoaded(true)
      })
    }
    onToggleExpand()
  }

  const handleToggleHistory = () => {
    if (!showHistory && !historyLoaded) {
      loadBagHistory(bag.id).then(history => {
        setBagHistory(history)
        setHistoryLoaded(true)
      })
    }
    setShowHistory(!showHistory)
  }

  return (
    <div
      style={{
        background: 'var(--clr-surface)',
        border: '1px solid var(--clr-border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleToggleExpand}
      >
        <span style={{ fontSize: '1.5rem' }}>👜</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--clr-text)' }}>{bag.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)' }}>
            {bag.disc_ids.length} {bag.disc_ids.length === 1 ? 'disc' : 'discs'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={e => {
              e.stopPropagation()
              onRename()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.25rem',
            }}
            title="Rename bag"
          >
            ✏️
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.25rem',
            }}
            title="Delete bag"
          >
            🗑
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onOpenPopout()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.25rem',
            }}
            title="Open popout"
          >
            ⊞
          </button>
        </div>
        <span style={{ fontSize: '1.2rem', color: 'var(--clr-muted)' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--clr-border)', padding: '1rem' }}>
          <button
            onClick={onOpenDiscPicker}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--clr-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            Add / Remove Discs
          </button>

          {/* Disc list */}
          {bagDiscs.length === 0 ? (
            <div style={{ color: 'var(--clr-muted)', textAlign: 'center', padding: '1rem' }}>
              No discs in this bag yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bagDiscs.map(disc => (
                <div
                  key={disc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--clr-surface2)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--clr-text)' }}>{disc.name}</div>
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
                  <button
                    onClick={() => onRemoveDisc(disc.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--clr-danger)',
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                      padding: '0.25rem',
                    }}
                    title="Remove from bag"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Change history */}
          {bagHistory.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={handleToggleHistory}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--clr-surface2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  color: 'var(--clr-text)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Change history</span>
                <span>{showHistory ? '▼' : '▶'}</span>
              </button>
              {showHistory && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    fontSize: '0.85rem',
                  }}
                >
                  {bagHistory.map(entry => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--clr-border)',
                        color: 'var(--clr-muted)',
                      }}
                    >
                      <span style={{ color: entry.action === 'added' ? 'green' : 'var(--clr-danger)' }}>
                        {entry.action === 'added' ? '+' : '−'}
                      </span>{' '}
                      <span style={{ color: 'var(--clr-text)' }}>{entry.disc_name}</span>
                      {' · '}
                      <span style={{ fontSize: '0.75rem' }}>{formatHistoryTime(entry.changed_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Flight chart */}
          {hasFlightData && (
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => setShowFlightChart(!showFlightChart)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--clr-surface2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  color: 'var(--clr-text)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Flight chart</span>
                <span>{showFlightChart ? '▼' : '▶'}</span>
              </button>
              {showFlightChart && (
                <div style={{ marginTop: '0.5rem' }}>
                  <FlightChart discs={bagDiscs} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
