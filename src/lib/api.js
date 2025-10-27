const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function buildUrl(path) {
  const base = API_BASE || ''
  if (path.startsWith('http')) return path
  return `${base}${path}`
}

async function request(path, options = {}) {
  const url = buildUrl(`/api${path}`)
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }
  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body)
  }

  const res = await fetch(url, config)
  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (err) {
      data = { message: text }
    }
  }

  if (!res.ok) {
    const message = data?.message || res.statusText || 'Request failed'
    const error = new Error(message)
    error.status = res.status
    error.payload = data
    throw error
  }

  return data
}

export async function fetchRoomsFromApi(studentId, signal) {
  const params = new URLSearchParams()
  if (studentId) params.append('student_id', studentId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await request(`/rooms${suffix}`, { method: 'GET', signal })
  return data?.rooms || []
}

export async function createRoomApi(payload) {
  const data = await request('/rooms', {
    method: 'POST',
    body: payload,
  })
  return data?.room
}

export async function updateAttendanceApi(roomId, studentId, action, { accessCode } = {}) {
  const body = { student_id: studentId, action }
  if (accessCode) body.access_code = accessCode
  const data = await request(`/rooms/${roomId}/attendees`, {
    method: 'POST',
    body,
  })
  return data?.room
}

export async function deleteRoomApi(roomId, studentId) {
  await request(`/rooms/${roomId}?${new URLSearchParams({ student_id: studentId })}`, {
    method: 'DELETE',
  })
}

export async function lookupPrivateRoom(accessCode) {
  const data = await request('/rooms/private-access', {
    method: 'POST',
    body: { access_code: accessCode },
  })
  return data?.room
}

export async function fetchProfileApi(studentId) {
  const data = await request(`/profile/${encodeURIComponent(studentId)}`, { method: 'GET' })
  return {
    owned: data?.owned || [],
    joined: data?.joined || [],
  }
}

export async function fetchAvailabilityTimes(location, date, duration) {
  const params = new URLSearchParams()
  if (location) params.append('location', location)
  if (date) params.append('date', date)
  if (duration) params.append('duration', duration)
  const data = await request(`/availability/times?${params.toString()}`, { method: 'GET' })
  return data?.times || []
}

export async function fetchAvailabilityDates(days) {
  const params = days ? `?days=${encodeURIComponent(days)}` : ''
  const data = await request(`/availability/dates${params}`, { method: 'GET' })
  return data?.dates || []
}

export async function healthCheck() {
  return request('/health', { method: 'GET' })
}
