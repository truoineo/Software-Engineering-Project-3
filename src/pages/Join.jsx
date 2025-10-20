import React, { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useRooms } from '../lib/rooms'
import { TYPE_OPTIONS, getTypeLabel } from '../lib/schedule'

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
  const { rooms, setRooms } = useRooms()

  const [typeFilter, setTypeFilter] = useState('all')

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All types' },
    ...TYPE_OPTIONS,
  ], [])

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.time.localeCompare(b.time))
  }, [rooms])

  const filteredRooms = useMemo(() => {
    if (typeFilter === 'all') return sortedRooms
    return sortedRooms.filter(r => (r.type || 'general') === typeFilter)
  }, [sortedRooms, typeFilter])

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
      <div className="rooms">
        {filteredRooms.map(r => {
          const privacy = (r.privacy||'public')
          const participants = (r.participants||[]).length
          const joined = (r.participants||[]).includes(studentId)
          const typeLabel = getTypeLabel(r.type)
          return (
            <div key={r.id} className="room-card">
              <div className="room-info">
                <div className="room-title">{r.name}</div>
                <div className="room-meta">
                  {typeLabel} • {r.location} • {fmtDateTime(r.time)} • {r.duration} min • {privacy.charAt(0).toUpperCase()+privacy.slice(1)} • {participants} joined
                </div>
              </div>
              <button className={`btn ${joined ? 'btn-danger' : 'btn-primary'} room-join`} onClick={()=>toggle(r)}>
                {joined ? 'Leave' : 'Join'}
              </button>
            </div>
          )
        })}
        {filteredRooms.length===0 && <div className="empty">No rooms yet. Create one!</div>}
      </div>
    </div>
  )
}
