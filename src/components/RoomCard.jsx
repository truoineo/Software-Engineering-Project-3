import React from 'react'
import ParticipantList from './ParticipantList'

export default function RoomCard({
  room,
  typeLabel,
  capacityInfo,
  relativeTime,
  nearlyFull,
  onView,
  onPrimary,
  onPrimaryLabel,
  onSecondary,
  onSecondaryLabel,
  showSecondary = true,
}) {
  return (
    <article className={`profile-card ${nearlyFull ? 'profile-card-warning' : ''}`}>
      <header className="profile-card-header">
        <div>
          <h4>{room.name}</h4>
          <div className="profile-card-subtitle">{typeLabel} • {room.location}</div>
        </div>
        <span className="badge badge-neutral">{room.privacy}</span>
      </header>
      <div className="profile-card-meta">
        <div>
          <span className="profile-card-time">{new Date(room.time.replace(' ', 'T')).toLocaleString()}</span>
          <span className="profile-card-relative">{relativeTime}</span>
        </div>
        <span className={`badge ${capacityInfo.openSeats === 0 ? 'badge-danger' : capacityInfo.openSeats <= Math.ceil(capacityInfo.capacity * 0.2) ? 'badge-warn' : 'badge-success'}`}>
          {capacityInfo.openSeats} open of {capacityInfo.capacity}
        </span>
      </div>
      <ParticipantList room={room} ownerId={room.owner_id} />
      <div className="profile-card-actions">
        <button type="button" className="btn btn-ghost" onClick={onView}>
          View details
        </button>
        {showSecondary && (
          <button type="button" className="btn btn-ghost" onClick={onSecondary}>
            {onSecondaryLabel}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onPrimary}>
          {onPrimaryLabel}
        </button>
      </div>
    </article>
  )
}
