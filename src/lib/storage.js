// Simple localStorage-backed room store

const STORAGE_KEY = 'rooms'

export function loadRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))
}

export function upsertRoom(room) {
  const rooms = loadRooms()
  const idx = rooms.findIndex(r => r.id === room.id)
  if (idx >= 0) rooms[idx] = room
  else rooms.push(room)
  saveRooms(rooms)
}

export function listTable() {
  const rooms = loadRooms()
  return rooms.map(r => {
    const end = addMinutes(parseTime(r.time), r.duration)
    return {
      room_id: r.id,
      name: r.name,
      location: r.location,
      time: r.time,
      end_time: formatTime(end),
      duration_min: r.duration,
      owner_id: r.owner_id,
      privacy: r.privacy,
      participants: (r.participants || []).length,
    }
  })
}

// Time helpers
export const TIME_FMT = 'YYYY-MM-DD HH:mm'

export function parseTime(str) {
  // Parse "YYYY-MM-DD HH:mm" into Date
  const [date, time] = str.split(' ')
  const [y,m,d] = date.split('-').map(Number)
  const [hh,mm] = time.split(':').map(Number)
  return new Date(y, m-1, d, hh, mm, 0, 0)
}
export function formatTime(d) {
  const pad = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function addMinutes(d, min) { return new Date(d.getTime() + min*60000) }

