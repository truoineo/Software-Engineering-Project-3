import React, { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useRooms } from '../lib/rooms'
import {
  getTypeLabel,
  calculateOpenSeats,
  isNearlyFull,
  timeUntil,
  buildSparklineData,
} from '../lib/schedule'
import { updateAttendanceApi, deleteRoomApi } from '../lib/api'
import LocationPreview from '../components/LocationPreview'
import LocationLinkWithPreview from '../components/LocationLinkWithPreview'
import WeatherWidget from '../components/WeatherWidget'

function Sparkline({ data }) {
  return (
    <div className="sparkline">
      {data.map(point => (
        <div key={point.date} className="sparkline-bar">
          <div
            className="sparkline-fill"
            style={{ height: `${Math.max(point.ratio * 100, 6)}%` }}
            title={`${point.label}: ${point.count} room${point.count === 1 ? '' : 's'}`}
          />
        </div>
      ))}
    </div>
  )
}

function ProfileRoomCard({
  room,
  typeLabel,
  start,
  relative,
  capacity,
  openSeats,
  nearlyFull,
  variant,
  onViewDetails,
  onCancel,
  onLeave,
  onShare,
  onOpenLocation,
  dialogOpen,
}) {
  const handleLocationClick = useCallback(() => {
    onOpenLocation(room.location)
  }, [onOpenLocation, room.location])

  const showWeather = useMemo(() => {
    if (!room?.location || !(start instanceof Date)) return false
    return start.getTime() > Date.now()
  }, [room?.location, start])

  return (
    <article className={`profile-card ${nearlyFull ? 'profile-card-warning' : ''}`}>
      <header className="profile-card-header">
        <div>
          <h4>{room.name}</h4>
          <div className="profile-card-subtitle">
            <span className="profile-card-type">{typeLabel}</span>
            <span aria-hidden="true">•</span>
            <LocationLinkWithPreview
              location={room.location}
              onClick={handleLocationClick}
              dialogOpen={dialogOpen}
              className="location-trigger"
            />
          </div>
        </div>
        <span className="badge badge-neutral">{room.privacy}</span>
      </header>
      <div className="profile-card-meta">
        <div>
          <span className="profile-card-time">{start.toLocaleString()}</span>
          <span className="profile-card-relative">{relative}</span>
        </div>
        <span className={`badge ${openSeats === 0 ? 'badge-danger' : openSeats <= Math.ceil(capacity * 0.2) ? 'badge-warn' : 'badge-success'}`}>
          {openSeats} open of {capacity}
        </span>
              {room.privacy === 'private' && room.access_code && (
                <span className="badge badge-warn" title="Invite code">Code: {room.access_code}</span>
              )}
      </div>
      {showWeather && (
        <WeatherWidget
          variant="profile"
          location={room.location}
          dateTime={start}
        />
      )}
      <ParticipantList room={room} ownerId={room.owner_id} />
      <div className="profile-card-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onViewDetails(room)}>
          View details
        </button>
        {variant === 'owned' ? (
          <button type="button" className="btn btn-danger" onClick={() => onCancel(room)}>
            Cancel room
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => onLeave(room)}>
              Leave room
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onShare(room)}>
              Share
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function ParticipantList({ room, ownerId }) {
  const participants = room.participants || []
  const { capacity, openSeats } = calculateOpenSeats(room)
  const waitlisted = participants.length > capacity

  const avatars = participants.slice(0, 12).map(sid => {
    const initials = sid.slice(0, 2).toUpperCase()
    const colorIndex = (sid.charCodeAt(0) + sid.charCodeAt(sid.length - 1)) % 6
    const title = sid === ownerId ? `${sid} (Host)` : sid
    return (
      <span key={sid} className={`participant-avatar color-${colorIndex}`} title={title} aria-label={`Participant ${sid}`}>
        {initials}
      </span>
    )
  })

  if (avatars.length === 0) {
    avatars.push(<span key="empty" className="participant-avatar empty">—</span>)
  }

  return (
    <div className={`profile-participants ${waitlisted ? 'is-waitlisted' : ''}`}>
      <div className="participants-avatars">
        {avatars}
      </div>
      <div className="participants-meta">
        <span>{participants.length} joined</span>
        {waitlisted && <span className="badge badge-danger">Waitlist</span>}
        {!waitlisted && openSeats <= Math.ceil(capacity * 0.2) && (
          <span className="badge badge-warn">Nearly full</span>
        )}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <article className="profile-card skeleton" aria-hidden="true">
      <div className="profile-card-header skeleton-text" />
      <div className="profile-card-meta skeleton-text" />
      <div className="profile-card-body">
        <span className="skeleton-text" style={{ width: '60%' }} />
        <span className="skeleton-text" style={{ width: '40%' }} />
      </div>
      <div className="profile-card-actions">
        <span className="skeleton-btn" />
        <span className="skeleton-btn" />
      </div>
    </article>
  )
}

export default function Profile(){
  const navigate = useNavigate()
  const { studentId, setStudentId } = useAuth()
  const { rooms, isLoading, setRooms, refresh, supportsApi } = useRooms()
  const [isLocationModalOpen, setLocationModalOpen] = useState(false)
  const [modalLocation, setModalLocation] = useState(null)

  const owned = useMemo(() => rooms.filter(r => r.owner_id === studentId), [rooms, studentId])
  const joined = useMemo(
    () => rooms.filter(r => r.owner_id !== studentId && (r.participants || []).includes(studentId)),
    [rooms, studentId]
  )
  const ownedSparkline = useMemo(() => buildSparklineData(owned), [owned])
  const joinedSparkline = useMemo(() => buildSparklineData(joined), [joined])

  const handleCancel = async room => {
    if (typeof window !== 'undefined' && !window.confirm('Cancel this room? Participants will lose access.')) return
    if (supportsApi) {
      try {
        await deleteRoomApi(room.id, studentId)
        await refresh()
        return
      } catch (err) {
        console.warn('Cancel via API failed, updating locally', err)
      }
    }
    setRooms(prev => prev.filter(r => r.id !== room.id))
  }

  const handleLeave = async room => {
    if (supportsApi) {
      try {
        await updateAttendanceApi(room.id, studentId, 'leave')
        await refresh()
        return
      } catch (err) {
        console.warn('Leave via API failed, updating locally', err)
      }
    }
    setRooms(prev => prev.map(r => {
      if (r.id !== room.id) return r
      return { ...r, participants: (r.participants || []).filter(p => p !== studentId) }
    }))
  }

  const handleShare = room => {
    const shareUrl = `${window.location.origin}/join`
    const shareText = room.privacy === 'private' && room.access_code
      ? `${room.name} · Invite code: ${room.access_code}`
      : room.name
    if (navigator.share) {
      navigator.share({ title: shareText, text: shareText, url: shareUrl }).catch(() => {})
    } else if (typeof window !== 'undefined') {
      const message = room.privacy === 'private' && room.access_code
        ? `Share this invite:
${shareUrl}
Code: ${room.access_code}`
        : shareUrl
      window.prompt('Copy details to share', message)
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

  const viewDetails = useCallback(
    room => {
      if (!room?.location) return
      openLocationModal(room.location)
    },
    [openLocationModal]
  )

  const handleLogout = useCallback(() => {
    setStudentId('')
    setRooms([])
    navigate('/')
  }, [navigate, setRooms, setStudentId])

  const renderCards = (roomsList, variant, emptyLabel) => {
    if (isLoading) {
      return (
        <div className="profile-cards" aria-live="polite">
          {Array.from({ length: 3 }).map((_, idx) => <CardSkeleton key={idx} />)}
        </div>
      )
    }
    if (roomsList.length === 0) {
      return <div className="empty small">{emptyLabel}</div>
    }
    return (
      <div className="profile-cards" aria-live="polite">
        {roomsList.map(room => {
          const start = new Date(room.time.replace(' ', 'T'))
          const relative = timeUntil(start)
          const typeLabel = getTypeLabel(room.type)
          const { capacity, openSeats } = calculateOpenSeats(room)
          const nearlyFull = isNearlyFull(room)

          return (
            <ProfileRoomCard
              key={room.id}
              room={room}
              typeLabel={typeLabel}
              start={start}
              relative={relative}
              capacity={capacity}
              openSeats={openSeats}
              nearlyFull={nearlyFull}
              variant={variant}
              onViewDetails={viewDetails}
              onCancel={handleCancel}
              onLeave={handleLeave}
              onShare={handleShare}
              onOpenLocation={openLocationModal}
              dialogOpen={isLocationModalOpen}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="profile-box">
        <div className="profile-header">
          <span>Logged in as: <strong>{studentId}</strong></span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
        <h3>Rooms You Own</h3>
        {isLoading ? <div className="sparkline skeleton" aria-hidden="true" /> : <Sparkline data={ownedSparkline} />}
        {renderCards(owned, 'owned', "You haven't created any rooms yet.")}
        <h3>Rooms You Joined</h3>
        {isLoading ? <div className="sparkline skeleton" aria-hidden="true" /> : <Sparkline data={joinedSparkline} />}
        {renderCards(joined, 'joined', "You haven't joined any rooms yet.")}
      </div>
      <LocationPreview
        location={modalLocation}
        open={isLocationModalOpen}
        onClose={closeLocationModal}
      />
    </div>
  )
}
