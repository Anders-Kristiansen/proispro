import { useState } from 'react'
import { useWishlist, WishlistItem } from '../hooks/useWishlist'

const priorityLabels: Record<number, string> = {
  0: '🟢 Low',
  1: '🟡 Medium',
  2: '🔴 High',
}

export function WishlistPage() {
  const { items, addItem, updateItem, deleteItem, toggleAcquired } = useWishlist()

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [formData, setFormData] = useState({
    disc_name: '',
    manufacturer: '',
    plastic_pref: '',
    weight_min: '',
    weight_max: '',
    priority: 1,
    notes: '',
  })
  const [showAcquired, setShowAcquired] = useState(false)

  const wantedItems = items.filter(i => !i.acquired)
  const acquiredItems = items.filter(i => i.acquired)

  const handleCreate = () => {
    setEditingItem(null)
    setFormData({
      disc_name: '',
      manufacturer: '',
      plastic_pref: '',
      weight_min: '',
      weight_max: '',
      priority: 1,
      notes: '',
    })
    setShowModal(true)
  }

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item)
    setFormData({
      disc_name: item.disc_name,
      manufacturer: item.manufacturer,
      plastic_pref: item.plastic_pref,
      weight_min: item.weight_min != null ? String(item.weight_min) : '',
      weight_max: item.weight_max != null ? String(item.weight_max) : '',
      priority: item.priority,
      notes: item.notes,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.disc_name.trim()) return
    const payload = {
      disc_name: formData.disc_name,
      manufacturer: formData.manufacturer,
      plastic_pref: formData.plastic_pref,
      weight_min: formData.weight_min ? parseFloat(formData.weight_min) : null,
      weight_max: formData.weight_max ? parseFloat(formData.weight_max) : null,
      priority: formData.priority,
      notes: formData.notes,
    }
    if (editingItem) {
      await updateItem(editingItem.id, payload)
    } else {
      await addItem(payload)
    }
    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this wishlist item?')) {
      await deleteItem(id)
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--clr-text)' }}>
          ✨ {wantedItems.length} {wantedItems.length === 1 ? 'item' : 'items'} wanted
        </h2>
        <button
          onClick={handleCreate}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--clr-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Add to Wishlist
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--clr-surface)',
              padding: '2rem',
              borderRadius: 'var(--radius)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem', color: 'var(--clr-text)' }}>
              {editingItem ? 'Edit Wishlist Item' : 'Add to Wishlist'}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Disc Name *
              </label>
              <input
                type="text"
                value={formData.disc_name}
                onChange={e => setFormData({ ...formData, disc_name: e.target.value })}
                placeholder="e.g., Firebird"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--clr-bg)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--clr-text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Manufacturer
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Innova"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--clr-bg)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--clr-text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Plastic Preference
              </label>
              <input
                type="text"
                value={formData.plastic_pref}
                onChange={e => setFormData({ ...formData, plastic_pref: e.target.value })}
                placeholder="e.g., Star"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--clr-bg)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--clr-text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--clr-muted)',
                  }}
                >
                  Min Weight (g)
                </label>
                <input
                  type="number"
                  value={formData.weight_min}
                  onChange={e => setFormData({ ...formData, weight_min: e.target.value })}
                  placeholder="165"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--clr-bg)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--clr-text)',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--clr-muted)',
                  }}
                >
                  Max Weight (g)
                </label>
                <input
                  type="number"
                  value={formData.weight_max}
                  onChange={e => setFormData({ ...formData, weight_max: e.target.value })}
                  placeholder="175"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--clr-bg)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--clr-text)',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--clr-bg)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--clr-text)',
                  fontSize: '1rem',
                }}
              >
                <option value={0}>🟢 Low</option>
                <option value={1}>🟡 Medium</option>
                <option value={2}>🔴 High</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--clr-bg)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--clr-text)',
                  fontSize: '1rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--clr-surface2)',
                  color: 'var(--clr-text)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.disc_name.trim()}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: !formData.disc_name.trim()
                    ? 'var(--clr-surface2)'
                    : 'var(--clr-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: !formData.disc_name.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wanted Items */}
      {wantedItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--clr-muted)',
          }}
        >
          <div style={{ fontSize: '3rem' }}>✨</div>
          <p style={{ marginTop: '1rem' }}>Wishlist is empty</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {wantedItems.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--clr-surface)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                border: '1px solid var(--clr-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--clr-text)' }}>{item.disc_name}</h3>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        background: 'var(--clr-surface2)',
                        color: 'var(--clr-text)',
                      }}
                    >
                      {priorityLabels[item.priority]}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.9rem',
                      color: 'var(--clr-muted)',
                    }}
                  >
                    {item.manufacturer && <span>{item.manufacturer}</span>}
                    {item.plastic_pref && <span> • {item.plastic_pref}</span>}
                    {(item.weight_min || item.weight_max) && (
                      <span>
                        {' '}
                        • {item.weight_min || '?'}-{item.weight_max || '?'}g
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--clr-text)',
                        opacity: 0.8,
                      }}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => toggleAcquired(item.id, true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--clr-accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    ✓ Got it
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--clr-surface2)',
                      color: 'var(--clr-text)',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--clr-danger)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acquired Section */}
      {acquiredItems.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={() => setShowAcquired(!showAcquired)}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'var(--clr-surface)',
              color: 'var(--clr-text)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {showAcquired ? '▼' : '▶'} Acquired ({acquiredItems.length})
          </button>
          {showAcquired && (
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {acquiredItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--clr-surface)',
                    borderRadius: 'var(--radius)',
                    padding: '1.5rem',
                    border: '1px solid var(--clr-border)',
                    opacity: 0.7,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, color: 'var(--clr-text)' }}>
                        {item.disc_name}
                      </h3>
                      <div
                        style={{
                          marginTop: '0.25rem',
                          fontSize: '0.9rem',
                          color: 'var(--clr-muted)',
                        }}
                      >
                        {item.manufacturer && <span>{item.manufacturer}</span>}
                        {item.plastic_pref && <span> • {item.plastic_pref}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => toggleAcquired(item.id, false)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--clr-surface2)',
                          color: 'var(--clr-text)',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        ↩ Undo
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          padding: '0.5rem',
                          background: 'var(--clr-danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
