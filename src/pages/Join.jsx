import React, { useMemo, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { useRooms } from '../lib/rooms'
import {
  TYPE_OPTIONS,
  getTypeLabel,
  calculateOpenSeats,
  isNearlyFull,
  summarizeLocationLoad,
  listAvailableDates,
} from '../lib/schedule'
import { updateAttendanceApi, lookupPrivateRoom } from '../lib/api'
import LocationPreview from '../components/LocationPreview'
import LocationLinkWithPreview from '../components/LocationLinkWithPreview'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDateTime(ts){
  // ts: "YYYY-MM-DD HH:mm"
  const [d,t] = ts.split(' ')
  const [y,m,day] = d.split('-').map(Number)
  const [hh,mm] = t.split(':')
  return `${MONTHS[m-1]} ${day}, ${y} ${hh}:${mm}`
}

export default function Join(){
  const { studentId } = useAuth()
  const { rooms, setRooms, refresh, isLoading, supportsApi } = useRooms()

  const [typeFilter, setTypeFilter] = useState('all')
  const [isLocationModalOpen, setLocationModalOpen] = useState(false)
  const [modalLocation, setModalLocation] = useState(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLookup, setInviteLookup] = useState(null)
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const HEATMAP_WINDOW_DAYS = 21

  const unlockedRoom = inviteLookup?.room || null
  const unlockedSeatSnapshot = useMemo(() => (unlockedRoom ? calculateOpenSeats(unlockedRoom) : null), [unlockedRoom])
  const unlockedParticipants = unlockedRoom ? (unlockedRoom.participants || []).length : 0
  const unlockedJoined = unlockedRoom ? (unlockedRoom.participants || []).includes(studentId) : false

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All types' },
    ...TYPE_OPTIONS,
  ], [])

  // heatmap moved below after publicRooms is defined

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.time.localeCompare(b.time))
  }, [rooms])

  // Visible rooms include all public rooms plus private rooms
  // that the current user owns or has joined.
  const visibleRooms = useMemo(
    () => sortedRooms.filter(r => {
      const privacy = (r.privacy || 'public').toLowerCase()
      if (privacy !== 'private') return true
      const isOwner = (r.owner_id || '') === (studentId || '')
      const joined = Array.isArray(r.participants) && r.participants.includes(studentId)
      return isOwner || joined
    }),
    [sortedRooms, studentId]
  )

  const heatmap = useMemo(() => {
    const days = listAvailableDates(HEATMAP_WINDOW_DAYS)
    const relevantRooms = (typeFilter === 'all'
      ? visibleRooms
      : visibleRooms.filter(r => (r.type || 'general') === typeFilter))
    const counts = days.map(date => {
      const count = relevantRooms.filter(room => (room.time || '').startsWith(date)).length
      return { date, count }
    })
    return counts.map(({ date, count }) => {
      const level = count > 0 ? 1 : 0
      const d = new Date(`${date}T00:00:00`)
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      const countLabel = count === 0 ? 'No rooms' : `${count} room${count === 1 ? '' : 's'}`
      return { date, count, level, label, displayDate, countLabel }
    })
  }, [visibleRooms, typeFilter, HEATMAP_WINDOW_DAYS])

  const filteredRooms = useMemo(() => {
    let result = visibleRooms
    if (typeFilter !== 'all') {
      result = result.filter(r => (r.type || 'general') === typeFilter)
    }
    if (dateFilter) {
      result = result.filter(r => (r.time || '').startsWith(dateFilter))
    }
    return result
  }, [visibleRooms, typeFilter, dateFilter])

  const warningLocations = useMemo(() => {
    const summary = summarizeLocationLoad(sortedRooms)
    return summary.filter(entry => {
      if (!entry.location || entry.capacity === 0) return false
      const remainingRatio = entry.openSeats / entry.capacity
      return remainingRatio <= 0.2 && entry.rooms >= 1
    })
  }, [sortedRooms])

  async function toggle(room, accessCode){
    const joined = (room.participants || []).includes(studentId)
    if (room.privacy === 'private' && !joined && !accessCode) {
      setInviteError('Enter a valid invite code to join this private room.')
      return
    }
    if (supportsApi) {
      try {
        await updateAttendanceApi(room.id, studentId, joined ? 'leave' : 'join', { accessCode })
        await refresh()
        if (!joined && accessCode) {
          setInviteLookup(null)
          setInviteCode('')
        }
        return
      } catch (err) {
        console.warn('Join toggle via API failed, falling back to local storage', err)
      }
    }
    setRooms(prev => prev.map(r => {
      if (r.id !== room.id) return r
      const set = new Set(r.participants || [])
      if (set.has(studentId)) set.delete(studentId)
      else set.add(studentId)
      const next = { ...r, participants: Array.from(set) }
      if (accessCode && r.privacy === 'private' && !r.access_code) {
        next.access_code = accessCode
      }
      return next
    }))
  }

  const handlePrivateLookup = async event => {
    event?.preventDefault()
    const normalized = inviteCode.trim().toUpperCase()
    if (!normalized) {
      setInviteError('Enter the invite code you received.')
      setInviteLookup(null)
      return
    }
    setInviteLoading(true)
    setInviteError('')
    try {
      let room
      if (supportsApi) {
        room = await lookupPrivateRoom(normalized)
      } else {
        room = rooms.find(r => (r.access_code || '').toUpperCase() === normalized)
        if (!room) {
          throw new Error('No private room matches that code.')
        }
      }
      if (!room) {
        setInviteError('No private room matches that code.')
        setInviteLookup(null)
      } else {
        setInviteLookup({ room, accessCode: normalized })
      }
    } catch (err) {
      const message = err?.status === 404 ? 'No private room matches that code.' : (err?.message || 'Unable to unlock that room right now.')
      setInviteError(message)
      setInviteLookup(null)
    } finally {
      setInviteLoading(false)
    }
  }

  const openLocationModal = useCallback(location => {
    setModalLocation(location)
    setLocationModalOpen(true)
  }, [])

  const closeLocationModal = useCallback(() => {
    setLocationModalOpen(false)
    setModalLocation(null)
  }, [])

  return (
    <div className="page">
      <h2>Available Rooms</h2>
      <section className="private-access" aria-labelledby="private-access-heading">
        <div className="private-access-header">
          <h3 id="private-access-heading">Have an invite code?</h3>
          <p>Unlock a private lobby by entering the code shared by the host.</p>
        </div>
        <form className="private-access-form" onSubmit={handlePrivateLookup}>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            className="select"
            value={inviteCode}
            onChange={e => {
              setInviteCode(e.target.value.toUpperCase())
              setInviteError('')
            }}
            placeholder="Enter code"
            aria-label="Invite code"
          />
          <button type="submit" className="btn btn-primary" disabled={inviteLoading}>
            {inviteLoading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        {inviteError && <p className="field-hint error" role="alert">{inviteError}</p>}
        {unlockedRoom && unlockedSeatSnapshot && (
          <div className="private-access-result" aria-live="polite">
            <JoinRoomCard
              room={unlockedRoom}
              typeLabel={getTypeLabel(unlockedRoom.type)}
              joined={unlockedJoined}
              capacity={unlockedSeatSnapshot.capacity}
              openSeats={unlockedSeatSnapshot.openSeats}
              nearlyFull={isNearlyFull(unlockedRoom)}
              metaDetails={`${fmtDateTime(unlockedRoom.time)} • ${unlockedRoom.duration} min • Private • ${unlockedParticipants} joined`}
              onToggle={toggle}
              onOpenLocation={openLocationModal}
              dialogOpen={isLocationModalOpen}
              accessCode={inviteLookup?.accessCode}
            />
          </div>
        )}
      </section>
      <div className="availability-heatmap" aria-label="Upcoming room availability heatmap">
        <div className="heatmap-header">
          <span>Upcoming activity</span>
          {dateFilter && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDateFilter('')}
              aria-label="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>
        <div className={`heatmap-grid ${isLoading ? 'is-loading' : ''}`}>
          {isLoading
            ? Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="heatmap-cell skeleton" aria-hidden="true">
                <span className="heatmap-day skeleton skeleton-text" />
                <span className="heatmap-date skeleton skeleton-text" />
                <span className="heatmap-count skeleton skeleton-text" />
              </div>
            ))
            : heatmap.map(day => (
              <div
                key={day.date}
                role="button"
                tabIndex={0}
                onClick={() => setDateFilter(prev => prev === day.date ? '' : day.date)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDateFilter(prev => prev === day.date ? '' : day.date) } }}
                className={`heatmap-cell level-${day.level} ${dateFilter === day.date ? 'is-selected' : ''}`}
                aria-label={`${day.displayDate}: ${day.countLabel}. Click to filter by this day.`}
                aria-pressed={dateFilter === day.date}
                style={{ cursor: 'pointer' }}
                title={dateFilter === day.date ? 'Selected day – click to clear' : 'Click to filter by this day'}
              >
                <span className="heatmap-day">{day.label}</span>
                <span className="heatmap-date">{day.displayDate}</span>
                <span className="heatmap-count">{day.countLabel}</span>
              </div>
            ))}
        </div>
      </div>
      {warningLocations.length > 0 && (
        <div className="conflict-banner" role="status">
          <strong>Heads up:</strong>{' '}
          {warningLocations.map(entry => entry.location).join(', ')} {warningLocations.length === 1 ? 'is' : 'are'} nearly full.
        </div>
      )}
      <div className="filters">
        <label className="filters-label" htmlFor="room-type-filter">Type</label>
        <select
          id="room-type-filter"
          className="select select-sm"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={`rooms ${isLoading ? 'is-loading' : ''}`}>
        {isLoading && (
          <>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="room-card skeleton" aria-hidden="true">
                <div className="room-info">
                  <div className="room-title skeleton-text" />
                  <div className="room-meta skeleton-text" />
                </div>
                <div className="btn skeleton-btn" />
              </div>
            ))}
          </>
        )}
        {!isLoading && filteredRooms.map(room => {
          const privacy = (room.privacy || 'public')
          const participants = (room.participants || []).length
          const joined = (room.participants || []).includes(studentId)
          const typeLabel = getTypeLabel(room.type)
          const { capacity, openSeats } = calculateOpenSeats(room)
          const nearlyFull = isNearlyFull(room)
          const metaDetails = `${fmtDateTime(room.time)} • ${room.duration} min • ${privacy.charAt(0).toUpperCase()+privacy.slice(1)} • ${participants} joined`
          return (
            <JoinRoomCard
              key={room.id}
              room={room}
              typeLabel={typeLabel}
              joined={joined}
              capacity={capacity}
              openSeats={openSeats}
              nearlyFull={nearlyFull}
              metaDetails={metaDetails}
              onToggle={toggle}
              onOpenLocation={openLocationModal}
              dialogOpen={isLocationModalOpen}
            />
          )
        })}
        {!isLoading && filteredRooms.length===0 && <div className="empty">No rooms yet. Create one!</div>}
      </div>
      <LocationPreview
        location={modalLocation}
        open={isLocationModalOpen}
        onClose={closeLocationModal}
      />
    </div>
  )
}

function JoinRoomCard({
  room,
  typeLabel,
  joined,
  capacity,
  openSeats,
  nearlyFull,
  metaDetails,
  onToggle,
  onOpenLocation,
  dialogOpen,
  accessCode,
}) {
  const handleLocationClick = useCallback(() => {
    onOpenLocation(room.location)
  }, [onOpenLocation, room.location])

  return (
    <div className={`room-card ${nearlyFull ? 'room-card-warning' : ''}`}>
      <div className="room-info">
        <div className="room-title">{room.name}</div>
        <div className="room-badges">
          <span className="badge badge-neutral">{typeLabel}</span>
          <span className={`badge ${openSeats === 0 ? 'badge-danger' : openSeats <= Math.ceil(capacity * 0.2) ? 'badge-warn' : 'badge-success'}`}>
            {openSeats} open of {capacity}
          </span>
          {room.privacy === 'private' && <span className="badge badge-warn">Private</span>}
        </div>
        <div className="room-meta">
          <LocationLinkWithPreview
            location={room.location}
            onClick={handleLocationClick}
            dialogOpen={dialogOpen}
            className="location-trigger"
          />
          <span aria-hidden="true">•</span>
          <span className="room-meta-text">{metaDetails}</span>
        </div>
      </div>
      <button
        className={`btn ${joined ? 'btn-danger' : 'btn-primary'} room-join`}
        onClick={() => onToggle(room, accessCode)}
      >
        {joined ? 'Leave' : 'Join'}
      </button>
    </div>
  )
}
