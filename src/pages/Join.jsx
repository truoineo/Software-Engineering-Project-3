import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { loadRooms, saveRooms } from '../lib/storage'

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
  const [rooms, setRooms] = useState(loadRooms())

  useEffect(()=>{
    const i = setInterval(()=> setRooms(loadRooms()), 3000)
    return ()=> clearInterval(i)
  }, [])

  function toggle(room){
    const updated = rooms.map(r => {
      if (r.id !== room.id) return r
      const set = new Set(r.participants || [])
      if (set.has(studentId)) set.delete(studentId)
      else set.add(studentId)
      return { ...r, participants: Array.from(set) }
    })
    saveRooms(updated)
    setRooms(updated)
  }

  return (
    <div className="page">
      <h2>Available Rooms</h2>
      <div className="rooms">
        {rooms.map(r => {
          const privacy = (r.privacy||'public')
          const participants = (r.participants||[]).length
          const joined = (r.participants||[]).includes(studentId)
          return (
            <div key={r.id} className="room-card">
              <div className="room-info">
                <div className="room-title">{r.name}</div>
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
        {rooms.length===0 && <div className="empty">No rooms yet. Create one!</div>}
      </div>
    </div>
  )
}
