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
