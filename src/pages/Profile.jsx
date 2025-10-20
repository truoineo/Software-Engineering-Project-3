import React, { useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { useRooms } from '../lib/rooms'
import {
  getTypeLabel,
  calculateOpenSeats,
  isNearlyFull,
  timeUntil,
  buildSparklineData,
} from '../lib/schedule'

export default function Profile(){
  const { studentId } = useAuth()
  const { rooms, isLoading } = useRooms()

  const owned = useMemo(()=> rooms.filter(r => r.owner_id === studentId), [rooms, studentId])
  const joined = useMemo(()=>
    rooms.filter(r => r.owner_id !== studentId && (r.participants||[]).includes(studentId)),
  [rooms, studentId])
  const ownedSparkline = useMemo(() => buildSparklineData(owned), [owned])
  const joinedSparkline = useMemo(() => buildSparklineData(joined), [joined])

  function Sparkline({ data }){
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

  function Table({ rows, emptyLabel }){
    if (isLoading) {
      return (
        <div className="table-skeleton" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="table-skeleton-row">
              {Array.from({ length: 7 }).map((__, colIdx) => (
                <span key={colIdx} className="skeleton skeleton-text" />
              ))}
            </div>
          ))}
        </div>
      )
    }
    if (rows.length === 0) {
      return <div className="empty small">{emptyLabel}</div>
    }
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Location</th>
            <th>Starts</th>
            <th>Capacity</th>
            <th>Duration</th>
            <th>Privacy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const start = new Date(r.time.replace(' ','T'))
            const end = new Date(start.getTime() + r.duration*60000)
            const typeLabel = getTypeLabel(r.type)
            const { capacity, openSeats } = calculateOpenSeats(r)
            const nearlyFull = isNearlyFull(r)
            const relative = timeUntil(start)
            const participants = (r.participants || []).length
            return (
              <tr key={r.id} className={nearlyFull ? 'table-row-warning' : ''}>
                <td>
                  <div className="profile-room-name">
                    <div className="profile-room-title">{r.name}</div>
                    <div className="profile-room-subtitle">{participants} joined</div>
                  </div>
                </td>
                <td><span className="badge badge-neutral">{typeLabel}</span></td>
                <td>{r.location}</td>
                <td>
                  <div className="profile-room-status">
                    <span className="profile-room-time">{start.toLocaleString()}</span>
                    <span className="profile-room-relative">{relative}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${openSeats === 0 ? 'badge-danger' : openSeats <= Math.ceil(capacity * 0.2) ? 'badge-warn' : 'badge-success'}`}>
                    {openSeats} open of {capacity}
                  </span>
                </td>
                <td>{r.duration} min</td>
                <td>{(r.privacy||'public').toUpperCase()[0]+(r.privacy||'public').slice(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <div className="page">
      <div className="profile-box">
        <div className="profile-header">Logged in as: <strong>{studentId}</strong></div>
        <h3>Rooms You Own</h3>
        {isLoading ? <div className="sparkline skeleton" aria-hidden="true" /> : <Sparkline data={ownedSparkline} />}
        <Table rows={owned} emptyLabel="You haven't created any rooms yet." />
        <h3>Rooms You Joined</h3>
        {isLoading ? <div className="sparkline skeleton" aria-hidden="true" /> : <Sparkline data={joinedSparkline} />}
        <Table rows={joined} emptyLabel="You haven't joined any rooms yet." />
      </div>
    </div>
  )
}
