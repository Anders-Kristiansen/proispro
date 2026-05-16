import { useState } from 'react'
import { ClientDisc, ClientBag } from '../utils/disc'
import { useCoursePins, ClientPin, OSMCourse } from '../hooks/useCoursePins'

interface CoursesPagesProps {
  allDiscs: ClientDisc[]
  allBags: ClientBag[]
}

export function CoursesPage({ allDiscs, allBags }: CoursesPagesProps) {
  const {
    pins,
    createPin,
    deletePin,
    holeAssignments,
    assignDiscToHole,
    clearHoleAssignment,
    searchCoursesDebounced,
    downloadCourseMap,
    courseLoading,
    pdgaSuggestions,
    getHolesForPin,
  } = useCoursePins()

  const [expandedPinId, setExpandedPinId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [courseQuery, setCourseQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<OSMCourse | null>(null)
  const [selectedBagId, setSelectedBagId] = useState('')
  const [showGamePlan, setShowGamePlan] = useState<string | null>(null)

  const handlePinCourse = () => {
    setShowModal(true)
    setCourseQuery('')
    setSelectedCourse(null)
    setSelectedBagId(allBags[0]?.id || '')
  }

  const handleSavePin = async () => {
    if (!selectedCourse) {
      const name = courseQuery.trim()
      if (name && selectedBagId) {
        await createPin(name, null, selectedBagId)
        setShowModal(false)
      }
    } else {
      const courseId = `osm:${selectedCourse.osmType}:${selectedCourse.osmId}`
      await createPin(selectedCourse.name, courseId, selectedBagId)
      setShowModal(false)
    }
  }

  const handleDownloadMap = async (pin: ClientPin) => {
    if (!pin.courseId) return
    const [, osmType, osmIdStr] = pin.courseId.split(':')
    const osmId = parseInt(osmIdStr, 10)
    const course = pdgaSuggestions.find(c => c.osmId === osmId && c.osmType === osmType)
    if (course && course.lat && course.lon) {
      await downloadCourseMap(pin, course.lat, course.lon)
    }
  }

  const handleDelete = async (pinId: string) => {
    if (confirm('Delete this course pin? Hole assignments will also be deleted.')) {
      await deletePin(pinId)
    }
  }

  const handleCourseQueryChange = (value: string) => {
    setCourseQuery(value)
    setSelectedCourse(null)
    searchCoursesDebounced(value)
  }

  const handleSelectCourse = (course: OSMCourse) => {
    setSelectedCourse(course)
    setCourseQuery(course.name)
  }

  const handleHoleAssignment = async (pin: ClientPin, holeRef: string, discId: string) => {
    if (!discId) {
      await clearHoleAssignment(pin.id, holeRef)
    } else {
      const disc = allDiscs.find(d => d.id === discId)
      if (disc) {
        await assignDiscToHole(pin.id, holeRef, discId, disc.name)
      }
    }
  }

  const getBagForPin = (pin: ClientPin) => allBags.find(b => b.id === pin.bagId)

  const getDiscsForPin = (pin: ClientPin): ClientDisc[] => {
    const bag = getBagForPin(pin)
    if (!bag) return []
    return allDiscs.filter(d => bag.disc_ids.includes(d.id))
  }

  const getAssignedDiscId = (pinId: string, holeRef: string): string => {
    const assignment = holeAssignments.find(
      a => a.course_pin_id === pinId && a.hole_ref === holeRef
    )
    return assignment?.disc_id || ''
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
          🗺 {pins.length} {pins.length === 1 ? 'course' : 'courses'} pinned
        </h2>
        <button
          onClick={handlePinCourse}
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
          + Pin Course
        </button>
      </div>

      {/* Pin Modal */}
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
            <h3 style={{ margin: '0 0 1rem', color: 'var(--clr-text)' }}>Pin a Course</h3>

            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--clr-muted)',
                }}
              >
                Course Name (search OSM or type custom)
              </label>
              <input
                type="text"
                value={courseQuery}
                onChange={e => handleCourseQueryChange(e.target.value)}
                placeholder="Start typing course name..."
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
              {courseLoading && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--clr-muted)',
                  }}
                >
                  Searching OSM...
                </div>
              )}
              {pdgaSuggestions.length > 0 && !selectedCourse && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--clr-surface2)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--radius)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                  }}
                >
                  {pdgaSuggestions.map((course, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCourse(course)}
                      style={{
                        padding: '0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--clr-border)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--clr-bg)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{ color: 'var(--clr-text)', fontWeight: 500 }}>
                        {course.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>
                        {course.city} • {course.holes} holes
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                Link to Bag
              </label>
              <select
                value={selectedBagId}
                onChange={e => setSelectedBagId(e.target.value)}
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
                <option value="">Select a bag</option>
                {allBags.map(bag => (
                  <option key={bag.id} value={bag.id}>
                    {bag.name}
                  </option>
                ))}
              </select>
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
                onClick={handleSavePin}
                disabled={!courseQuery.trim() || !selectedBagId}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background:
                    !courseQuery.trim() || !selectedBagId
                      ? 'var(--clr-surface2)'
                      : 'var(--clr-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: !courseQuery.trim() || !selectedBagId ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Save Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin List */}
      {pins.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--clr-muted)',
          }}
        >
          <div style={{ fontSize: '3rem' }}>🗺</div>
          <p style={{ marginTop: '1rem' }}>No courses pinned yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pins.map(pin => {
            const bag = getBagForPin(pin)
            const holes = getHolesForPin(pin)
            const isExpanded = expandedPinId === pin.id
            const showPlan = showGamePlan === pin.id

            return (
              <div
                key={pin.id}
                style={{
                  background: 'var(--clr-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.5rem',
                  border: '1px solid var(--clr-border)',
                }}
              >
                {/* Pin Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--clr-text)' }}>
                      {pin.courseName}
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--clr-muted)' }}>
                      Bag: {bag?.name || 'Unknown'}
                      {holes && <span> • {holes.length} holes downloaded</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {pin.courseId && !holes && (
                      <button
                        onClick={() => handleDownloadMap(pin)}
                        disabled={courseLoading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--clr-accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: courseLoading ? 'wait' : 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        ⬇ Download Map
                      </button>
                    )}
                    {pin.courseId && (
                      <>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=disc+golf+${encodeURIComponent(
                            pin.courseName
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem',
                            background: 'var(--clr-surface2)',
                            color: 'var(--clr-text)',
                            borderRadius: 'var(--radius)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                          }}
                        >
                          🧭
                        </a>
                        <a
                          href={`https://www.openstreetmap.org/${pin.courseId.replace(
                            'osm:',
                            ''
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem',
                            background: 'var(--clr-surface2)',
                            color: 'var(--clr-text)',
                            borderRadius: 'var(--radius)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                          }}
                        >
                          🗺
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(pin.id)}
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

                {/* Holes */}
                {holes && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={() => setExpandedPinId(isExpanded ? null : pin.id)}
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
                      {isExpanded ? '▼' : '▶'} Holes ({holes.length})
                    </button>
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          padding: '0.5rem',
                          background: 'var(--clr-bg)',
                          borderRadius: 'var(--radius)',
                        }}
                      >
                        {holes.map(hole => (
                          <div
                            key={hole.ref}
                            style={{
                              padding: '0.5rem',
                              borderBottom: '1px solid var(--clr-border)',
                              fontSize: '0.9rem',
                              color: 'var(--clr-text)',
                            }}
                          >
                            Hole {hole.ref}
                            {hole.name && <span> - {hole.name}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Game Plan */}
                {holes && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={() => setShowGamePlan(showPlan ? null : pin.id)}
                      style={{
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
                      {showPlan ? '▼' : '▶'} Game Plan
                    </button>
                    {showPlan && (
                      <div
                        style={{
                          marginTop: '1rem',
                          display: 'grid',
                          gap: '0.75rem',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        }}
                      >
                        {holes.map(hole => {
                          const assignedId = getAssignedDiscId(pin.id, hole.ref)
                          const bagDiscs = getDiscsForPin(pin)
                          return (
                            <div
                              key={hole.ref}
                              style={{
                                padding: '1rem',
                                background: 'var(--clr-surface2)',
                                borderRadius: 'var(--radius)',
                              }}
                            >
                              <div
                                style={{
                                  marginBottom: '0.5rem',
                                  fontWeight: 600,
                                  color: 'var(--clr-text)',
                                }}
                              >
                                Hole {hole.ref}
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                  value={assignedId}
                                  onChange={e => handleHoleAssignment(pin, hole.ref, e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: 'var(--clr-bg)',
                                    border: '1px solid var(--clr-border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--clr-text)',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  <option value="">Select disc...</option>
                                  {bagDiscs.map(disc => (
                                    <option key={disc.id} value={disc.id}>
                                      {disc.name}
                                    </option>
                                  ))}
                                </select>
                                {assignedId && (
                                  <button
                                    onClick={() => clearHoleAssignment(pin.id, hole.ref)}
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
                                )}
                              </div>
                            </div>
                          )
                        })}
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
