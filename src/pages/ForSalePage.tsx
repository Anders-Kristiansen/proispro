import { useState, useEffect } from 'react'
import { ClientDisc } from '../utils/disc'
import { useForSale } from '../hooks/useForSale'

interface ForSalePageProps {
  allDiscs: ClientDisc[]
}

const condLabel = (cond: string): string => {
  const labels: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    worn: 'Worn',
  }
  return labels[cond] || cond || 'Good'
}

export function ForSalePage({ allDiscs }: ForSalePageProps) {
  const {
    listings,
    saleToken,
    saleIsPublic,
    publicSaleUrl,
    ensureSaleToken,
    addListing,
    deleteListing,
    updateStatus,
    togglePublic,
    copyPublicLink,
    getDiscForListing,
  } = useForSale()

  const [showPicker, setShowPicker] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    ensureSaleToken()
  }, [])

  const handleListDisc = async (disc: ClientDisc) => {
    await addListing(disc)
    setShowPicker(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remove this listing?')) {
      await deleteListing(id)
    }
  }

  const handleCopyLink = async () => {
    await copyPublicLink()
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const alreadyListedIds = new Set(listings.map(l => l.disc_id))
  const availableDiscs = allDiscs.filter(d => !alreadyListedIds.has(d.id))

  const availableListings = listings.filter(l => l.status === 'available')
  const soldListings = listings.filter(l => l.status === 'sold')

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
          🏷 {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
        </h2>
        <button
          onClick={() => setShowPicker(true)}
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
          + List for Sale
        </button>
      </div>

      {/* Disc Picker Modal */}
      {showPicker && (
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
          onClick={() => setShowPicker(false)}
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
            <h3 style={{ margin: '0 0 1rem', color: 'var(--clr-text)' }}>
              Select Disc to List
            </h3>
            {availableDiscs.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--clr-muted)',
                }}
              >
                <p>All discs are already listed or inventory is empty.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableDiscs.map(disc => (
                  <div
                    key={disc.id}
                    onClick={() => handleListDisc(disc)}
                    style={{
                      padding: '1rem',
                      background: 'var(--clr-surface2)',
                      color: 'var(--clr-text)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--clr-accent)'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--clr-surface2)'
                      e.currentTarget.style.color = 'var(--clr-text)'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{disc.name}</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                      {disc.manufacturer}
                      {disc.plastic && ` • ${disc.plastic}`}
                      {disc.weight && ` • ${disc.weight}g`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowPicker(false)}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.75rem',
                background: 'var(--clr-surface2)',
                color: 'var(--clr-text)',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Public Share Section */}
      {saleToken && (
        <div
          style={{
            background: 'var(--clr-surface)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            border: '1px solid var(--clr-border)',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ margin: '0 0 1rem', color: 'var(--clr-text)' }}>Public Sale Page</h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            {saleIsPublic && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  publicSaleUrl
                )}`}
                alt="QR Code"
                style={{ borderRadius: 'var(--radius)' }}
              />
            )}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={publicSaleUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--clr-bg)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--clr-text)',
                  fontSize: '0.9rem',
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: copiedLink ? 'var(--clr-accent)' : 'var(--clr-surface2)',
                  color: copiedLink ? 'white' : 'var(--clr-text)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {copiedLink ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
            <button
              onClick={togglePublic}
              style={{
                padding: '0.75rem 1.5rem',
                background: saleIsPublic ? 'var(--clr-danger)' : 'var(--clr-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {saleIsPublic ? 'Make Private' : 'Make Public'}
            </button>
          </div>
        </div>
      )}

      {/* Listings */}
      {listings.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--clr-muted)',
          }}
        >
          <div style={{ fontSize: '3rem' }}>🏷</div>
          <p style={{ marginTop: '1rem' }}>No discs for sale yet</p>
        </div>
      ) : (
        <>
          {/* Available Listings */}
          {availableListings.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--clr-text)' }}>
                🟢 Available ({availableListings.length})
              </h3>
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                }}
              >
                {availableListings.map(listing => {
                  const disc = getDiscForListing(listing, allDiscs)
                  if (!disc) return null

                  return (
                    <div
                      key={listing.id}
                      style={{
                        background: 'var(--clr-surface)',
                        borderRadius: 'var(--radius)',
                        padding: '1.5rem',
                        border: '1px solid var(--clr-border)',
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--clr-text)' }}>
                        {disc.name}
                      </h4>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--clr-muted)',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {disc.manufacturer}
                        {disc.plastic && ` • ${disc.plastic}`}
                        {disc.weight && ` • ${disc.weight}g`}
                        {disc.condition && ` • ${condLabel(disc.condition)}`}
                      </div>
                      {disc.color && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--clr-text)',
                            marginBottom: '0.75rem',
                          }}
                        >
                          Color: {disc.color}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => updateStatus(listing.id, 'sold')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'var(--clr-accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          ✅ Mark Sold
                        </button>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          style={{
                            padding: '0.75rem',
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
                  )
                })}
              </div>
            </div>
          )}

          {/* Sold Listings */}
          {soldListings.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '1rem', color: 'var(--clr-text)' }}>
                ✅ Sold ({soldListings.length})
              </h3>
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                }}
              >
                {soldListings.map(listing => {
                  const disc = getDiscForListing(listing, allDiscs)
                  if (!disc) return null

                  return (
                    <div
                      key={listing.id}
                      style={{
                        background: 'var(--clr-surface)',
                        borderRadius: 'var(--radius)',
                        padding: '1.5rem',
                        border: '1px solid var(--clr-border)',
                        opacity: 0.6,
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--clr-text)' }}>
                        {disc.name}
                      </h4>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--clr-muted)',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {disc.manufacturer}
                        {disc.plastic && ` • ${disc.plastic}`}
                        {disc.weight && ` • ${disc.weight}g`}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => updateStatus(listing.id, 'available')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'var(--clr-surface2)',
                            color: 'var(--clr-text)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          ↩ Relist
                        </button>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          style={{
                            padding: '0.75rem',
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
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
