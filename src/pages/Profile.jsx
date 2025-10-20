import React, { useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { useRooms } from '../lib/rooms'
import { getTypeLabel } from '../lib/schedule'

export default function Profile(){
  const { studentId } = useAuth()
  const { rooms } = useRooms()

  const owned = useMemo(()=> rooms.filter(r => r.owner_id === studentId), [rooms, studentId])
  const joined = useMemo(()=> rooms.filter(r => (r.participants||[]).includes(studentId)), [rooms, studentId])

  function Table({ rows, emptyLabel }){
    if (rows.length === 0) {
      return <div className="empty small">{emptyLabel}</div>
    }
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Location</th><th>Start</th><th>End</th><th>Duration</th><th>Privacy</th><th>Participants</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const start = new Date(r.time.replace(' ','T'))
            const end = new Date(start.getTime() + r.duration*60000)
            const pad=n=>String(n).padStart(2,'0')
            const fmt = d=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
            return (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{getTypeLabel(r.type)}</td>
                <td>{r.location}</td>
                <td>{fmt(start)}</td>
                <td>{fmt(end)}</td>
                <td>{r.duration}</td>
                <td>{(r.privacy||'public').toUpperCase()[0]+(r.privacy||'public').slice(1)}</td>
                <td>{(r.participants||[]).length}</td>
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
        <Table rows={owned} emptyLabel="You haven't created any rooms yet." />
        <h3>Rooms You Joined</h3>
        <Table rows={joined} emptyLabel="You haven't joined any rooms yet." />
      </div>
    </div>
  )
}
