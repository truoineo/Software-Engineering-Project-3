import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { LOCATION_OPTIONS, listAvailableDates, listAllTimes } from '../lib/schedule'
import { loadRooms, saveRooms } from '../lib/storage'

export default function Create(){
  const { studentId } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [privacy, setPrivacy] = useState('Public')
  const [location, setLocation] = useState('')
  const dateChoices = useMemo(()=>listAvailableDates(7),[])
  const [date, setDate] = useState(dateChoices[0])
  const [duration, setDuration] = useState(60)
  const [time, setTime] = useState('')
  const [status, setStatus] = useState('')

  const timeChoices = useMemo(()=> listAllTimes(date), [date])

  function submit(e){
    e?.preventDefault()
    if (!studentId) return setStatus('Please log in first.')
    if (!name.trim()) return setStatus('Room name is required.')
    if (!LOCATION_OPTIONS.includes(location)) return setStatus('Please select a valid location.')
    if (!date) return setStatus('Pick a date.')
    if (!time) return setStatus('Pick a time.')

    const rooms = loadRooms()
    const id = crypto.randomUUID()
    const room = {
      id,
      name: name.trim(),
      owner_id: studentId,
      participants: [studentId],
      time: `${date} ${time}`,
      duration: Number(duration),
      location,
      privacy: (privacy||'public').toLowerCase(),
    }
    rooms.push(room)
    saveRooms(rooms)
    setStatus(`Created ${privacy} room '${room.name}' on ${date} at ${time} (${duration}m).`)
    setTimeout(()=> nav('/join'), 600)
  }

  return (
    <div className="page">
      <h2>Create a Room</h2>
      <form className="form" onSubmit={submit}>
        <div className="row"><label>Room Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Soccer Field A" /></div>
        <div className="row"><label>Visibility</label>
          <select value={privacy} onChange={e=>setPrivacy(e.target.value)}>
            <option>Public</option>
            <option>Private</option>
          </select>
        </div>
        <div className="row"><label>Location</label>
          <select value={location} onChange={e=>setLocation(e.target.value)}>
            <option value="">Select a location…</option>
            {LOCATION_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="row multi">
          <div>
            <label>Date</label>
            <select value={date} onChange={e=>setDate(e.target.value)}>
              {dateChoices.map(d=> <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label>Time</label>
            <select value={time} onChange={e=>setTime(e.target.value)}>
              <option value="">Select time…</option>
              {timeChoices.map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Duration</label>
            <select value={duration} onChange={e=>setDuration(e.target.value)}>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
        </div>
        <div className="row end"><button type="submit" className="btn btn-primary">Save</button></div>
        {status && <div className="status">{status}</div>}
      </form>
    </div>
  )
}

