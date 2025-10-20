import React, { useMemo, useState } from 'react'
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
  const { rooms, setRooms, isLoading } = useRooms()

  const [typeFilter, setTypeFilter] = useState('all')
  const HEATMAP_WINDOW_DAYS = 21

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All types' },
    ...TYPE_OPTIONS,
  ], [])

  const heatmap = useMemo(() => {
    const days = listAvailableDates(HEATMAP_WINDOW_DAYS)
    const counts = days.map(date => {
      const count = rooms.filter(room => (room.time || '').startsWith(date)).length
      return { date, count }
    })
    const peak = Math.max(...counts.map(c => c.count), 1)
    return counts.map(({ date, count }) => {
      const ratio = peak === 0 ? 0 : count / peak
      let level = 0
      if (count > 0) {
        if (ratio < 0.34) level = 1
        else if (ratio < 0.67) level = 2
        else level = 3
      }
      const d = new Date(`${date}T00:00:00`)
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      const countLabel = count === 0 ? 'No rooms' : `${count} room${count === 1 ? '' : 's'}`
      return { date, count, level, label, displayDate, countLabel }
    })
  }, [rooms, HEATMAP_WINDOW_DAYS])

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.time.localeCompare(b.time))
  }, [rooms])

  const filteredRooms = useMemo(() => {
    if (typeFilter === 'all') return sortedRooms
    return sortedRooms.filter(r => (r.type || 'general') === typeFilter)
  }, [sortedRooms, typeFilter])

  const warningLocations = useMemo(() => {
    const summary = summarizeLocationLoad(sortedRooms)
    return summary.filter(entry => {
      if (!entry.location || entry.capacity === 0) return false
      const remainingRatio = entry.openSeats / entry.capacity
      return remainingRatio <= 0.2 && entry.rooms >= 1
    })
  }, [sortedRooms])

  function toggle(room){
    setRooms(prev => prev.map(r => {
      if (r.id !== room.id) return r
      const set = new Set(r.participants || [])
      if (set.has(studentId)) set.delete(studentId)
      else set.add(studentId)
      return { ...r, participants: Array.from(set) }
    }))
  }

  return (
    <div className="page">
      <h2>Available Rooms</h2>
      <div className="availability-heatmap" aria-label="Upcoming room availability heatmap">
        <div className="heatmap-header">
          <span>Upcoming activity</span>
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
                className={`heatmap-cell level-${day.level}`}
                aria-label={`${day.displayDate}: ${day.countLabel}`}
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
        {!isLoading && filteredRooms.map(r => {
          const privacy = (r.privacy||'public')
          const participants = (r.participants||[]).length
          const joined = (r.participants||[]).includes(studentId)
          const typeLabel = getTypeLabel(r.type)
          const { capacity, openSeats } = calculateOpenSeats(r)
          const nearlyFull = isNearlyFull(r)
          return (
            <div key={r.id} className={`room-card ${nearlyFull ? 'room-card-warning' : ''}`}>
              <div className="room-info">
                <div className="room-title">{r.name}</div>
                <div className="room-badges">
                  <span className="badge badge-neutral">{typeLabel}</span>
                  <span className={`badge ${openSeats === 0 ? 'badge-danger' : openSeats <= Math.ceil(capacity * 0.2) ? 'badge-warn' : 'badge-success'}`}>
                    {openSeats} open of {capacity}
                  </span>
                </div>
                <div className="room-meta">
                  {r.location} • {fmtDateTime(r.time)} • {r.duration} min • {privacy.charAt(0).toUpperCase()+privacy.slice(1)} • {participants} joined
                </div>
              </div>
              <button className={`btn ${joined ? 'btn-danger' : 'btn-primary'} room-join`} onClick={()=>toggle(r)}>
                {joined ? 'Leave' : 'Join'}
              </button>
            </div>
          )
        })}
        {!isLoading && filteredRooms.length===0 && <div className="empty">No rooms yet. Create one!</div>}
      </div>
    </div>
  )
}
