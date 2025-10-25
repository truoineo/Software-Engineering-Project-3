import React from 'react'
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Tornado,
  Thermometer,
  Umbrella,
  Wind,
  Droplets,
} from 'lucide-react'
import useCampusWeather from '../hooks/useWeather'
import { describeDaysAhead, getSeasonalOutlook, isOutdoorLocation } from '../lib/locationMeta'

function computeTargetDateValue({ date, time, dateTime, hasTime }) {
  if (dateTime instanceof Date) return dateTime
  if (typeof dateTime === 'string') return dateTime
  if (!date) return null
  if (!hasTime) return null
  return `${date} ${time}`
}

function formatRangeLabel(daysAhead) {
  if (typeof daysAhead !== 'number' || !Number.isFinite(daysAhead)) return ''
  if (daysAhead <= 0) return 'Today'
  if (daysAhead === 1) return 'Tomorrow'
  if (daysAhead < 7) return `In ${daysAhead} days`
  const weeks = Math.round(daysAhead / 7)
  return weeks <= 1 ? 'In about a week' : `In about ${weeks} weeks`
}

function WeatherSummary({ title, children, tone = 'info', actions }) {
  return (
    <div className={`weather-widget-panel weather-widget-panel--${tone}`}>
      <div className="weather-widget-panel-body">
        <h4>{title}</h4>
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
      {actions ? <div className="weather-widget-panel-actions">{actions}</div> : null}
    </div>
  )
}

function ForecastDetails({ forecast }) {
  if (!forecast) return null
  return (
    <div className="weather-widget-details">
      <div className="weather-stat">
        <span className="weather-stat-icon" aria-hidden="true"><Thermometer size={18} strokeWidth={1.75} /></span>
        <div className="weather-stat-metric">
          <span className="weather-stat-value">{forecast.temperature ?? '—'}°F</span>
          <span className="weather-stat-label">Feels like {forecast.feelsLike ?? '—'}°F</span>
        </div>
      </div>
      <div className="weather-stat">
        <span className="weather-stat-icon" aria-hidden="true"><Umbrella size={18} strokeWidth={1.75} /></span>
        <div className="weather-stat-metric">
          <span className="weather-stat-value">{forecast.precipitationChance ?? '—'}%</span>
          <span className="weather-stat-label">Chance of precipitation</span>
        </div>
      </div>
      <div className="weather-stat">
        <span className="weather-stat-icon" aria-hidden="true"><Wind size={18} strokeWidth={1.75} /></span>
        <div className="weather-stat-metric">
          <span className="weather-stat-value">{forecast.windSpeed ?? '—'} mph</span>
          <span className="weather-stat-label">Wind speed</span>
        </div>
      </div>
      {typeof forecast.humidity === 'number' && (
        <div className="weather-stat">
          <span className="weather-stat-icon" aria-hidden="true"><Droplets size={18} strokeWidth={1.75} /></span>
          <div className="weather-stat-metric">
            <span className="weather-stat-value">{forecast.humidity}%</span>
            <span className="weather-stat-label">Humidity</span>
          </div>
        </div>
      )}
    </div>
  )
}

function WeatherSkeleton() {
  return (
    <div className="weather-widget-skeleton" aria-hidden="true">
      <div className="weather-skeleton-block" />
      <div className="weather-skeleton-block" />
      <div className="weather-skeleton-block" />
    </div>
  )
}

export default function WeatherWidget({ date, time, dateTime, location, className = '', variant = 'default' }) {
  const isOutdoor = isOutdoorLocation(location)
  const hasDate = Boolean(date || dateTime)
  const hasTime = Boolean(time || (dateTime instanceof Date))
  const targetDate = React.useMemo(() => computeTargetDateValue({ date, time, dateTime, hasTime }), [date, time, dateTime, hasTime])
  const weather = useCampusWeather(targetDate, { enabled: isOutdoor && Boolean(targetDate) })

  if (!location || !isOutdoor) {
    return null
  }

  const wrapperClass = ['weather-widget', `weather-widget--${variant}`, className].filter(Boolean).join(' ')

  return (
    <section className={wrapperClass} aria-live="polite">
      <header className="weather-widget-header">
        <span className="weather-widget-badge" aria-hidden="true"><Sun size={24} strokeWidth={1.75} /></span>
        <div className="weather-widget-titles">
          <h3>Campus Weather Outlook</h3>
          <p>{location} · {formatRangeLabel(weather.daysAhead)}</p>
        </div>
      </header>
      {!hasDate && (
        <WeatherSummary title="Pick a date" tone="info">
          Choose a date to preview the forecast for this outdoor space.
        </WeatherSummary>
      )}
      {hasDate && !hasTime && (
        <WeatherSummary title="Select a start time" tone="info">
          Set a start time to get an hour-by-hour forecast for your session.
        </WeatherSummary>
      )}
      {hasDate && hasTime && weather.isLoading && <WeatherSkeleton />}
      {hasDate && hasTime && !weather.isLoading && weather.status === 'short-range' && weather.forecast && (
        <div className="weather-widget-forecast">
          <div className="weather-conditions">
            <div className="weather-condition-icon" role="img" aria-label={weather.forecast.condition || 'Weather condition'}>
              {lookupConditionIcon(weather.forecast.condition)}
            </div>
            <div className="weather-condition-text">
              <span className="weather-temperature">{weather.forecast.temperature ?? '—'}°F</span>
              <span className="weather-description">{weather.forecast.description || weather.forecast.condition}</span>
            </div>
          </div>
          <ForecastDetails forecast={weather.forecast} />
        </div>
      )}
      {hasDate && hasTime && !weather.isLoading && weather.status === 'medium-range' && (
        <SeasonalOutlookBlock targetDate={weather.targetDate} daysAhead={weather.daysAhead} tone="info" />
      )}
      {hasDate && hasTime && !weather.isLoading && weather.status === 'long-range' && (
        <SeasonalOutlookBlock targetDate={weather.targetDate} daysAhead={weather.daysAhead} tone="muted" emphasizeReminder />
      )}
      {hasDate && hasTime && !weather.isLoading && weather.status === 'no-key' && (
        <WeatherSummary title="Weather preview unavailable" tone="muted">
          Add a weather API key to enable forecasts for outdoor locations.
        </WeatherSummary>
      )}
      {hasDate && hasTime && !weather.isLoading && weather.status === 'error' && (
        <WeatherSummary title="We hit a snag" tone="warn">
          {weather.error || 'Unable to load the forecast right now. Try again soon.'}
        </WeatherSummary>
      )}
      {hasDate && hasTime && !weather.isLoading && weather.status === 'past' && (
        <WeatherSummary title="This session already happened" tone="muted">
          Weather outlook is only available for upcoming bookings.
        </WeatherSummary>
      )}
    </section>
  )
}

function lookupConditionIcon(condition) {
  const iconMap = {
    Thunderstorm: CloudLightning,
    Drizzle: CloudDrizzle,
    Rain: CloudRain,
    Snow: CloudSnow,
    Mist: CloudFog,
    Smoke: CloudFog,
    Haze: CloudFog,
    Dust: Wind,
    Fog: CloudFog,
    Sand: Wind,
    Ash: CloudFog,
    Squall: CloudLightning,
    Tornado: Tornado,
    Clear: Sun,
    Clouds: Cloud,
  }
  const IconComponent = iconMap[condition] || CloudSun
  return <IconComponent size={40} strokeWidth={1.6} aria-hidden="true" />
}

function SeasonalOutlookBlock({ targetDate, daysAhead, tone = 'info', emphasizeReminder = false }) {
  const outlook = React.useMemo(() => getSeasonalOutlook(targetDate), [targetDate])
  const descriptor = describeDaysAhead(daysAhead)
  return (
    <WeatherSummary
      title={`${outlook.name} outlook ${descriptor ? `· ${descriptor}` : ''}`.trim()}
      tone={tone}
    >
      <ul className="weather-outlook-list">
        <li><strong>{outlook.headline}</strong></li>
        <li>{outlook.temperature}</li>
        <li>{outlook.precipitation}</li>
        {emphasizeReminder && (
          <li className="weather-outlook-note">We will refresh the detailed forecast within five days of your booking.</li>
        )}
      </ul>
    </WeatherSummary>
  )
}
