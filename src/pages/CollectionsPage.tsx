import { useState } from 'react'
import { ClientDisc } from '../utils/disc'
import { useCollections, ClientCollection } from '../hooks/useCollections'

interface CollectionsPageProps {
  allDiscs: ClientDisc[]
}

export function CollectionsPage({ allDiscs }: CollectionsPageProps) {
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    toggleDiscInCollection,
    isDiscInCollection,
    getDiscsForCollection,
  } = useCollections()

  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<ClientCollection | null>(null)
  const [modalName, setModalName] = useState('')
  const [modalDescription, setModalDescription] = useState('')
  const [pickerCollectionId, setPickerCollectionId] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingCollection(null)
    setModalName('')
    setModalDescription('')
    setShowModal(true)
  }

  const handleEdit = (collection: ClientCollection) => {
    setEditingCollection(collection)
    setModalName(collection.name)
    setModalDescription(collection.description)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!modalName.trim()) return
    if (editingCollection) {
      await updateCollection(editingCollection.id, modalName, modalDescription)
    } else {
      await createCollection(modalName, modalDescription)
    }
    setShowModal(false)
  }

  const handleDelete = async (collection: ClientCollection) => {
    if (confirm(`Delete "${collection.name}"? This cannot be undone.`)) {
      await deleteCollection(collection.id)
    }
  }

  const handleOpenPicker = (collectionId: string) => {
    setPickerCollectionId(collectionId)
  }

  const handleToggleDisc = async (collectionId: string, discId: string) => {
    await toggleDiscInCollection(collectionId, discId)
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
          📚 {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
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
          + Create Collection
        </button>
      </div>

      {/* Create/Edit Modal */}
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
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem', color: 'var(--clr-text)' }}>
              {editingCollection ? 'Edit Collection' : 'Create Collection'}
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
                Name *
              </label>
              <input
                type="text"
                value={modalName}
                onChange={e => setModalName(e.target.value)}
                placeholder="e.g., Tournament Bag"
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Description
              </label>
              <textarea
                value={modalDescription}
                onChange={e => setModalDescription(e.target.value)}
                placeholder="Optional notes..."
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
                disabled={!modalName.trim()}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: !modalName.trim() ? 'var(--clr-surface2)' : 'var(--clr-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: !modalName.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {editingCollection ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disc Picker Modal */}
      {pickerCollectionId && (
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
          onClick={() => setPickerCollectionId(null)}
        >
          <div
            style={{
              background: 'var(--clr-surface)',
              padding: '2rem',
              borderRadius: 'var(--radius)',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem', color: 'var(--clr-text)' }}>Add / Remove Discs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allDiscs.map(disc => {
                const isIn = isDiscInCollection(pickerCollectionId, disc.id)
                return (
                  <div
                    key={disc.id}
                    onClick={() => handleToggleDisc(pickerCollectionId, disc.id)}
                    style={{
                      padding: '1rem',
                      background: isIn ? 'var(--clr-accent)' : 'var(--clr-surface2)',
                      color: isIn ? 'white' : 'var(--clr-text)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isIn}
                      readOnly
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{disc.name}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        {disc.manufacturer} {disc.plastic && `• ${disc.plastic}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setPickerCollectionId(null)}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.75rem',
                background: 'var(--clr-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Collections List */}
      {collections.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--clr-muted)',
          }}
        >
          <div style={{ fontSize: '3rem' }}>📚</div>
          <p style={{ marginTop: '1rem' }}>No collections yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {collections.map(collection => {
            const discs = getDiscsForCollection(collection, allDiscs)
            const isExpanded = expandedCollectionId === collection.id

            return (
              <div
                key={collection.id}
                style={{
                  background: 'var(--clr-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.5rem',
                  border: '1px solid var(--clr-border)',
                }}
              >
                {/* Collection Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--clr-text)' }}>
                      {collection.name}
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--clr-muted)' }}>
                      {discs.length} {discs.length === 1 ? 'disc' : 'discs'}
                      {collection.description && (
                        <span> • {collection.description}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenPicker(collection.id)}
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
                      + Add / Remove
                    </button>
                    <button
                      onClick={() => handleEdit(collection)}
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
                      onClick={() => handleDelete(collection)}
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

                {/* Disc List (Expandable) */}
                {discs.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={() =>
                        setExpandedCollectionId(isExpanded ? null : collection.id)
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'var(--clr-surface2)',
                        color: 'var(--clr-text)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      {isExpanded ? '▼' : '▶'} Discs ({discs.length})
                    </button>
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        {discs.map(disc => (
                          <div
                            key={disc.id}
                            style={{
                              padding: '1rem',
                              background: 'var(--clr-surface2)',
                              borderRadius: 'var(--radius)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--clr-text)' }}>
                                {disc.name}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>
                                {disc.manufacturer} {disc.plastic && `• ${disc.plastic}`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleDisc(collection.id, disc.id)}
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
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
