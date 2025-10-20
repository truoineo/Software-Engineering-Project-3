import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { TYPE_OPTIONS, listLocationsForType, getTypeLabel, DEFAULT_TYPE, available, listAllTimes } from '../lib/schedule'
import { useRooms } from '../lib/rooms'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfCalendar(date) {
  const start = startOfMonth(date)
  const day = start.getDay()
  const calendarStart = new Date(start)
  calendarStart.setDate(start.getDate() - day)
  calendarStart.setHours(0, 0, 0, 0)
  return calendarStart
}

function generateCalendarDays(monthDate) {
  const start = startOfCalendar(monthDate)
  const days = []
  for (let i = 0; i < 42; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    days.push(day)
  }
  return days
}

function isPastDay(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const candidate = new Date(date)
  candidate.setHours(0, 0, 0, 0)
  return candidate < today
}

function isSameDay(date, dateStr) {
  return formatDate(date) === dateStr
}

function combineDateAndTime(date, time) {
  const [hh, mm] = time.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm, 0, 0)
}

function isToday(date) {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export default function Create() {
  const { studentId } = useAuth()
  const { rooms, setRooms } = useRooms()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [privacy, setPrivacy] = useState('Public')
  const [sportType, setSportType] = useState(DEFAULT_TYPE)
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('60')
  const [time, setTime] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()))
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [touched, setTouched] = useState({ name: false, location: false, time: false })
  const [calendarOpen, setCalendarOpen] = useState(false)

  const calendarRef = useRef(null)
  const dateTriggerRef = useRef(null)

  const calendarDays = useMemo(
    () => generateCalendarDays(currentMonth),
    [currentMonth]
  )

  const locationOptions = useMemo(
    () => listLocationsForType(sportType),
    [sportType]
  )

  useEffect(() => {
    if (!locationOptions.includes(location)) {
      setLocation('')
    }
  }, [locationOptions, location])

  const timeChoices = useMemo(() => {
    if (!selectedDate) return []
    const baseDate = parseDate(selectedDate)
    const now = new Date()
    const durationMinutes = Number(duration) || 0
    return listAllTimes(selectedDate).filter(t => {
      const candidate = combineDateAndTime(baseDate, t)
      if (candidate < now) return false
      if (location && !available(location, candidate, durationMinutes, rooms)) return false
      return true
    })
  }, [selectedDate, location, duration, rooms])

  const selectedDateInvalid = useMemo(() => {
    if (!selectedDate || !location || !time) return false
    const start = combineDateAndTime(parseDate(selectedDate), time)
    return !available(location, start, Number(duration), rooms)
  }, [selectedDate, location, time, duration, rooms])

  const isNameValid = name.trim().length > 0
  const isLocationValid = locationOptions.includes(location)
  const isTimeValid = Boolean(time)
  const canSubmit =
    isNameValid && isLocationValid && Boolean(selectedDate) && isTimeValid && !selectedDateInvalid

  const showNameError = touched.name && !isNameValid
  const showLocationError = touched.location && !isLocationValid
  const showTimeError = touched.time && !isTimeValid
  const showConflict = !showTimeError && selectedDateInvalid

  const monthLabel = useMemo(
    () => currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    [currentMonth]
  )

  const displayDateLabel = useMemo(() => {
    if (!selectedDate) return 'Select date…'
    const date = parseDate(selectedDate)
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [selectedDate])

  useEffect(() => {
    if (!calendarOpen) return undefined

    function handleClick(event) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        dateTriggerRef.current &&
        !dateTriggerRef.current.contains(event.target)
      ) {
        setCalendarOpen(false)
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') setCalendarOpen(false)
    }

    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [calendarOpen])

  function moveMonth(offset) {
    setCurrentMonth(prev => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + offset)
      return startOfMonth(next)
    })
  }

  function pickDate(day) {
    const dayStr = formatDate(day)
    setSelectedDate(dayStr)
    setCurrentMonth(startOfMonth(day))
    setCalendarOpen(false)
  }

  function markTouched(field) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  function clearErrorStatus() {
    setStatus(prev => (prev.type === 'error' ? { type: '', message: '' } : prev))
  }

  function setError(message) {
    setStatus({ type: 'error', message })
  }

  function setSuccess(message) {
    setStatus({ type: 'success', message })
  }

  function submit(e) {
    e?.preventDefault()
    markTouched('name')
    markTouched('location')
    markTouched('time')

    if (!studentId) return setError('Please log in first.')
    if (!isNameValid) return setError('Room name is required.')
    if (!isLocationValid) return setError('Please select a valid location.')
    if (!selectedDate) return setError('Pick a date.')
    if (!isTimeValid) return setError('Pick a time.')

    const durationMinutes = Number(duration)
    const start = combineDateAndTime(parseDate(selectedDate), time)
    if (!available(location, start, durationMinutes, rooms)) {
      return setError('This location is already booked for the selected slot.')
    }

    const when = `${selectedDate} ${time}`
    const room = {
      id: crypto.randomUUID(),
      name: name.trim(),
      owner_id: studentId,
      participants: [studentId],
      time: when,
      duration: durationMinutes,
      location,
      privacy: (privacy || 'public').toLowerCase(),
      type: sportType,
    }

    let conflict = false
    setRooms(prev => {
      if (!available(location, start, durationMinutes, prev)) {
        conflict = true
        return prev
      }
      return [...prev, room]
    })

    if (conflict) return setError('This location is already booked for the selected slot.')

    const typeLabel = getTypeLabel(sportType)
    setSuccess(`Created ${privacy} ${typeLabel} room '${room.name}' on ${selectedDate} at ${time} (${durationMinutes}m).`)
    setTimeout(() => nav('/join'), 600)
  }

  const nameHintId = showNameError ? 'room-name-hint' : undefined
  const locationHintId = showLocationError ? 'room-location-hint' : undefined
  const timeHintId = showTimeError || showConflict ? 'room-time-hint' : undefined

  return (
    <div className="page">
      <h2>Create a Room</h2>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <label htmlFor="room-name">Room Name</label>
          <div className="field">
            <input
              id="room-name"
              value={name}
              onChange={e => {
                setName(e.target.value)
                clearErrorStatus()
              }}
              onBlur={() => markTouched('name')}
              placeholder="e.g., Soccer Field A"
              aria-invalid={showNameError}
              aria-describedby={nameHintId}
            />
            {showNameError && (
              <p id="room-name-hint" className="field-hint error">
                Room name is required.
              </p>
            )}
          </div>
        </div>
        <div className="row">
          <label htmlFor="room-visibility">Visibility</label>
          <div className="field">
            <select
              className="select"
              id="room-visibility"
              value={privacy}
              onChange={e => {
                setPrivacy(e.target.value)
                clearErrorStatus()
              }}
            >
              <option>Public</option>
              <option>Private</option>
            </select>
          </div>
        </div>
        <div className="row">
          <label htmlFor="room-type">Type</label>
          <div className="field">
            <select
              className="select"
              id="room-type"
              value={sportType}
              onChange={e => {
                setSportType(e.target.value)
                clearErrorStatus()
              }}
            >
              {TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <label htmlFor="room-location">Location</label>
          <div className="field">
            <select
              className="select select-lg"
              id="room-location"
              value={location}
              onChange={e => {
                setLocation(e.target.value)
                clearErrorStatus()
              }}
              onBlur={() => markTouched('location')}
              aria-invalid={showLocationError}
              aria-describedby={locationHintId}
            >
              <option value="">Select a location…</option>
              {locationOptions.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {showLocationError && (
              <p id="room-location-hint" className="field-hint error">
                Please select a location.
              </p>
            )}
          </div>
        </div>
        <div className="row">
          <label htmlFor="room-date">Date</label>
          <div className="field date-field" ref={dateTriggerRef}>
            <button
              id="room-date"
              type="button"
              className="date-trigger"
              onClick={() => setCalendarOpen(open => !open)}
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
            >
              {displayDateLabel}
              <span aria-hidden="true">▾</span>
            </button>
            {calendarOpen && (
              <div className="calendar-popover" role="dialog" ref={calendarRef}>
                <div className="calendar">
                  <div className="calendar-header">
                    <button
                      type="button"
                      className="calendar-nav"
                      onClick={() => moveMonth(-1)}
                      aria-label="Previous month"
                    >
                      ‹
                    </button>
                    <div className="calendar-month">{monthLabel}</div>
                    <button
                      type="button"
                      className="calendar-nav"
                      onClick={() => moveMonth(1)}
                      aria-label="Next month"
                    >
                      ›
                    </button>
                  </div>
                  <div className="calendar-grid calendar-weekdays">
                    {DAY_NAMES.map(day => (
                      <div key={day} className="calendar-weekday">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {calendarDays.map(day => {
                      const dayStr = formatDate(day)
                      const disabled =
                        isPastDay(day) ||
                        (location && time && !available(location, combineDateAndTime(day, time), Number(duration), rooms))
                      const outside = day.getMonth() !== currentMonth.getMonth()
                      const selected = selectedDate && isSameDay(day, selectedDate)
                      const classNames = [
                        'calendar-day',
                        outside ? 'outside' : '',
                        selected ? 'selected' : '',
                        disabled ? 'disabled' : '',
                        isToday(day) ? 'today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => !disabled && pickDate(day)}
                          className={classNames}
                          disabled={disabled}
                        >
                          {day.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="row multi time-row">
          <div className="field">
            <label htmlFor="room-time">Time</label>
            <select
              className="select select-lg"
              id="room-time"
              value={time}
              onChange={e => {
                setTime(e.target.value)
                clearErrorStatus()
              }}
              onBlur={() => markTouched('time')}
              aria-invalid={showTimeError || showConflict}
              aria-describedby={timeHintId}
            >
              <option value="">Select time…</option>
              {timeChoices.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {showTimeError && (
              <p id="room-time-hint" className="field-hint error">
                Please select a start time.
              </p>
            )}
            {!showTimeError && showConflict && (
              <p id="room-time-hint" className="field-hint error">
                That slot is already booked. Pick another time.
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="room-duration">Duration</label>
            <select
              className="select"
              id="room-duration"
              value={duration}
              onChange={e => {
                setDuration(e.target.value)
                clearErrorStatus()
              }}
            >
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
        <div className="row end">
          <button type="submit" className="btn btn-primary btn-lg" disabled={!canSubmit}>
            Save
          </button>
        </div>
        {status.message && (
          <div className={`status ${status.type === 'error' ? 'error' : 'success'}`}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  )
}
