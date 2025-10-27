import { useEffect, useMemo, useRef, useState } from 'react'
import { CAMPUS_LOCATION } from '../lib/locationMeta'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const CACHE_TTL = 45 * 60 * 1000 // 45 minutes

const forecastCache = new Map()

const initialState = {
  status: 'idle',
  isLoading: false,
  forecast: null,
  daysAhead: null,
  error: null,
}

function parseTargetDate(dateLike) {
  if (!dateLike) return null
  if (dateLike instanceof Date) {
    const copy = new Date(dateLike.getTime())
    if (Number.isNaN(copy.getTime())) return null
    return copy
  }
  if (typeof dateLike === 'number') {
    const parsed = new Date(dateLike)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof dateLike === 'string') {
    const normalized = dateLike.includes('T') || dateLike.includes('Z')
      ? dateLike
      : dateLike.replace(' ', 'T')
    const parsed = new Date(normalized)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

function toCacheKey(lat, lon) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`
}

async function fetchForecast(lat, lon, apiKey, signal) {
  const cacheKey = toCacheKey(lat, lon)
  const cached = forecastCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const searchParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: apiKey,
    units: 'imperial',
  })
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?${searchParams.toString()}`, { signal })
  if (!response.ok) {
    let details = ''
    try {
      const body = await response.json()
      if (body && typeof body.message === 'string' && body.message.trim()) {
        details = body.message.trim()
      }
    } catch (_) {
      // ignore JSON parse errors for non-JSON responses
    }
    const error = new Error(
      details ? `Weather request failed (${response.status}): ${details}` : `Weather request failed (${response.status})`
    )
    error.status = response.status
    if (details) error.details = details
    throw error
  }
  const json = await response.json()
  forecastCache.set(cacheKey, { data: json, timestamp: now })
  return json
}
function pickClosestForecast(list, targetDate) {
  if (!Array.isArray(list) || !targetDate) return null
  const targetTs = targetDate.getTime()
  let best = null
  let bestDiff = Infinity
  list.forEach(entry => {
    if (!entry || typeof entry.dt !== 'number') return
    const entryDate = new Date(entry.dt * 1000)
    const diff = Math.abs(entryDate.getTime() - targetTs)
    if (diff < bestDiff) {
      best = entry
      bestDiff = diff
    }
  })
  return best
}

function mapForecast(entry) {
  if (!entry) return null
  const weather = Array.isArray(entry.weather) && entry.weather.length ? entry.weather[0] : null
  const main = entry.main || {}
  const wind = entry.wind || {}
  return {
    at: new Date(entry.dt * 1000),
    temperature: typeof main.temp === 'number' ? Math.round(main.temp) : null,
    feelsLike: typeof main.feels_like === 'number' ? Math.round(main.feels_like) : null,
    humidity: typeof main.humidity === 'number' ? Math.round(main.humidity) : null,
    condition: weather?.main || 'Unavailable',
    description: weather?.description,
    precipitationChance: typeof entry.pop === 'number' ? Math.round(entry.pop * 100) : null,
    windSpeed: typeof wind.speed === 'number' ? Math.round(wind.speed) : null,
    icon: weather?.icon || null,
  }
}

export function useCampusWeather(targetDateLike, { enabled = true } = {}) {
  const [state, setState] = useState(initialState)

  const targetDate = useMemo(() => parseTargetDate(targetDateLike), [targetDateLike])
  const targetTime = targetDate ? targetDate.getTime() : null
  const abortRef = useRef()

  useEffect(() => {
    if (!enabled) {
      setState(prev => {
        if (prev.status === 'disabled' && !prev.isLoading) return prev
        return { ...initialState, status: 'disabled' }
      })
      if (abortRef.current) abortRef.current.abort()
      return
    }

    if (!targetDate) {
      setState(prev => {
        if (prev.status === 'idle' && !prev.isLoading) return prev
        return initialState
      })
      if (abortRef.current) abortRef.current.abort()
      return
    }

    const now = new Date()
    const diffMs = targetDate.getTime() - now.getTime()
    const diffDays = diffMs / DAY_MS
    const daysAhead = diffDays <= 0 ? 0 : Math.floor(diffDays)

    if (diffMs < -6 * HOUR_MS) {
      setState({ ...initialState, status: 'past', daysAhead })
      return
    }

    if (diffDays > 14) {
      setState({ ...initialState, status: 'long-range', daysAhead })
      return
    }

    if (diffDays > 3) {
      setState({ ...initialState, status: 'medium-range', daysAhead })
      return
    }

    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || import.meta.env.VITE_WEATHER_API_KEY
    if (!apiKey) {
      setState({ ...initialState, status: 'no-key', daysAhead })
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setState(prev => ({
      status: 'short-range',
      isLoading: true,
      forecast: prev.status === 'short-range' ? prev.forecast : null,
      daysAhead,
      error: null,
    }))

    fetchForecast(CAMPUS_LOCATION.latitude, CAMPUS_LOCATION.longitude, apiKey, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return
        const closest = pickClosestForecast(data?.list, targetDate)
        const mapped = mapForecast(closest)
        if (!mapped) {
          setState({ status: 'error', isLoading: false, forecast: null, daysAhead, error: 'Forecast unavailable for the selected time.' })
          return
        }
        setState({ status: 'short-range', isLoading: false, forecast: mapped, daysAhead, error: null })
      })
      .catch(err => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          isLoading: false,
          forecast: null,
          daysAhead,
          error: err?.message || err?.details || 'Unable to load weather.',
        })
      })

    return () => {
      controller.abort()
      abortRef.current = null
    }
  }, [enabled, targetTime])

  return {
    ...state,
    targetDate,
  }
}

export default useCampusWeather
