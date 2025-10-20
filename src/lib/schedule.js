import { loadRooms } from './storage'

export const SLOT_MINUTES = 30
export const MAX_DURATION_MIN = 60

const BASE_TYPE_LOCATION_MAP = {
  soccer: ['Soccer Field A', 'Soccer Field B', 'Soccer Field C'],
  football: ['North Field', 'South Field'],
  basketball: ['Gym Court 1', 'Gym Court 2'],
}

const ALL_LOCATIONS = Array.from(new Set(Object.values(BASE_TYPE_LOCATION_MAP).flat()))
const TYPE_LOCATION_MAP = {
  ...BASE_TYPE_LOCATION_MAP,
  general: ALL_LOCATIONS,
}

const TYPE_CAPACITY = {
  soccer: 16,
  football: 22,
  basketball: 10,
  general: 12,
}

export const LOCATION_OPTIONS = ALL_LOCATIONS
export const TYPE_OPTIONS = [
  { value: 'soccer', label: 'Soccer' },
  { value: 'football', label: 'Football' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'general', label: 'General' },
]
export const DEFAULT_TYPE = TYPE_OPTIONS[0]?.value ?? 'general'

export function listLocationsForType(type) {
  const t = type && TYPE_LOCATION_MAP[type] ? type : 'general'
  return [...TYPE_LOCATION_MAP[t]]
}

export function getTypeLabel(type) {
  const match = TYPE_OPTIONS.find(t => t.value === type)
  return match ? match.label : 'General'
}

const TYPE_ICON = {
  soccer: '⚽',
  football: '🏈',
  basketball: '🏀',
  general: '🏟️',
}

export function getTypeIcon(type) {
  return TYPE_ICON[type] || TYPE_ICON.general
}

export function getCapacityForType(type) {
  return TYPE_CAPACITY[type] ?? TYPE_CAPACITY.general
}

export function getRoomCapacity(room) {
  if (!room) return getCapacityForType('general')
  const raw = room.capacity
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return getCapacityForType(room.type)
}

export function calculateOpenSeats(room) {
  const capacity = getRoomCapacity(room)
  const participants = Array.isArray(room?.participants) ? room.participants.length : 0
  return {
    capacity,
    openSeats: Math.max(capacity - participants, 0),
  }
}

export function isNearlyFull(room, threshold = 0.2) {
  const { capacity, openSeats } = calculateOpenSeats(room)
  if (capacity === 0) return false
  return openSeats / capacity <= threshold
}

export function summarizeLocationLoad(rooms) {
  const summary = new Map()
  rooms.forEach(room => {
    const key = (room.location || '').toLowerCase()
    const { capacity, openSeats } = calculateOpenSeats(room)
    if (!summary.has(key)) {
      summary.set(key, {
        location: room.location,
        rooms: 0,
        capacity: 0,
        openSeats: 0,
      })
    }
    const entry = summary.get(key)
    entry.rooms += 1
    entry.capacity += capacity
    entry.openSeats += openSeats
  })
  return Array.from(summary.values())
}

export function timeUntil(date) {
  if (!(date instanceof Date)) return ''
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const absDiff = Math.abs(diffMs)

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absDiff < minute) return formatter.format(Math.round(diffMs / minute), 'minute')
  if (absDiff < hour) return formatter.format(Math.round(diffMs / minute), 'minute')
  if (absDiff < day) return formatter.format(Math.round(diffMs / hour), 'hour')

  return formatter.format(Math.round(diffMs / day), 'day')
}

export function buildSparklineData(rows, days = 7) {
  const today = new Date()
  today.setHours(0,0,0,0)
  const buckets = Array.from({ length: days }, (_, idx) => {
    const d = new Date(today)
    d.setDate(d.getDate() + idx)
    return {
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0,
    }
  })

  const bucketMap = new Map(buckets.map(b => [b.date, b]))
  rows.forEach(room => {
    const datePart = (room.time || '').split(' ')[0]
    const bucket = bucketMap.get(datePart)
    if (bucket) bucket.count += 1
  })

  const peak = Math.max(...buckets.map(b => b.count), 1)
  return buckets.map(b => ({
    ...b,
    ratio: peak === 0 ? 0 : b.count / peak,
  }))
}

export function isValidSlot(date) { return [0,30].includes(date.getMinutes()) && date.getSeconds()===0 && date.getMilliseconds()===0 }

export function ceilToNextSlot(d){
  const x = new Date(d)
  x.setSeconds(0,0)
  const add = (30 - (x.getMinutes() % 30)) % 30
  if (add) x.setMinutes(x.getMinutes()+add)
  return x
}

export function overlaps(start1, dur1, start2, dur2) {
  const end1 = new Date(start1.getTime() + dur1*60000)
  const end2 = new Date(start2.getTime() + dur2*60000)
  return !(end1 <= start2 || end2 <= start1)
}

export function available(location, start, duration, roomsOverride) {
  const rooms = roomsOverride ?? loadRooms()
  return rooms.every(r => {
    if ((r.location||'').toLowerCase() !== (location||'').toLowerCase()) return true
    const rs = new Date(r.time.replace(' ', 'T'))
    const d = parseInt(r.duration||MAX_DURATION_MIN,10)
    return !overlaps(rs, d, start, duration)
  })
}

export function listAvailableDates(days = 7) {
  const today = new Date()
  const res = []
  for (let i=0;i<days;i++){
    const d = new Date(today)
    d.setDate(d.getDate()+i)
    const pad = n=>String(n).padStart(2,'0')
    res.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`)
  }
  return res
}

export function listAllTimes(dateStr) {
  const [y,m,d] = dateStr.split('-').map(Number)
  const start = new Date(y,m-1,d,0,0,0,0)
  const end = new Date(start); end.setDate(end.getDate()+1)
  const out = []
  for (let cur = new Date(start); cur < end; cur = new Date(cur.getTime()+SLOT_MINUTES*60000)) {
    const pad = n=>String(n).padStart(2,'0')
    out.push(`${pad(cur.getHours())}:${pad(cur.getMinutes())}`)
  }
  return out
}
