// Simple localStorage-backed room store with lightweight validation

const STORAGE_KEY = 'rooms'
export const ROOMS_UPDATED_EVENT = 'rooms:updated'
const DEFAULT_DURATION = 60
const VALID_TYPES = new Set(['soccer', 'football', 'basketball', 'general'])

function emitRoomsUpdated() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(ROOMS_UPDATED_EVENT))
  }
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidTimestamp(ts) {
  if (typeof ts !== 'string') return false
  const match = ts.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  if (!match) return false
  const date = new Date(ts.replace(' ', 'T'))
  return !Number.isNaN(date.getTime())
}

function sanitizeRooms(candidate) {
  if (!Array.isArray(candidate)) return []
  const seenIds = new Set()
  const sanitized = []
  for (const room of candidate) {
    if (!room || typeof room !== 'object') continue

    const id = coerceString(room.id)
    if (!id || seenIds.has(id)) continue

    const name = coerceString(room.name)
    const ownerId = coerceString(room.owner_id)
    const location = coerceString(room.location)
    const privacy = (coerceString(room.privacy) || 'public').toLowerCase()
    const time = coerceString(room.time)
    if (!name || !ownerId || !location || !isValidTimestamp(time)) continue

    const duration = Number.parseInt(room.duration, 10)
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_DURATION

    const participants = Array.isArray(room.participants)
      ? Array.from(new Set(room.participants.filter(p => coerceString(p))))
      : []

    let type = coerceString(room.type).toLowerCase()
    if (!VALID_TYPES.has(type)) type = 'general'

    sanitized.push({
      id,
      name,
      owner_id: ownerId,
      participants,
      time,
      duration: safeDuration,
      location,
      privacy,
      type,
    })
    seenIds.add(id)
  }
  return sanitized
}

export function loadRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return sanitizeRooms(parsed)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

export function saveRooms(rooms) {
  const safeRooms = sanitizeRooms(rooms)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRooms))
  emitRoomsUpdated()
  return safeRooms
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
      type: r.type,
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
