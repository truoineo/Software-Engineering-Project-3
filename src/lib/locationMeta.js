const OUTDOOR_LOCATIONS = [
  'Tennis Courts',
  'L.C. Boles Golf Course',
  'Cindy Barr Field',
  'Carl W. Dale Soccer Field',
  'Murray Baseball Field',
  'Papp Stadium',
  'Papp Stadium* ∆',
  'Softball Diamond',
]

const NORMALIZED_OUTDOOR = new Set(OUTDOOR_LOCATIONS.map(normalizeLocation))

export const CAMPUS_LOCATION = {
  name: 'College of Wooster Campus',
  latitude: 40.8126,
  longitude: -81.9353,
}

const SEASONAL_OUTLOOKS = [
  {
    name: 'Winter',
    months: [11, 0, 1],
    headline: 'Cold with a chance of snow. Bundle up!',
    temperature: 'Typical highs mid 30s°F, lows low 20s°F',
    precipitation: 'Snow and wintry mix are common; winds can feel brisk.',
  },
  {
    name: 'Spring',
    months: [2, 3, 4],
    headline: 'Cool and breezy with on-and-off showers.',
    temperature: 'Typical highs mid 50s°F, lows upper 30s°F',
    precipitation: 'Expect scattered rain showers; fields may be damp.',
  },
  {
    name: 'Summer',
    months: [5, 6, 7],
    headline: 'Warm and humid with occasional pop-up storms.',
    temperature: 'Typical highs low 80s°F, lows mid 60s°F',
    precipitation: 'Watch for afternoon thunderstorms; hydration recommended.',
  },
  {
    name: 'Fall',
    months: [8, 9, 10],
    headline: 'Mild days and crisp evenings—prime outdoor conditions.',
    temperature: 'Typical highs upper 60s°F, lows upper 40s°F',
    precipitation: 'Light rain possible, but outdoor play is usually comfortable.',
  },
]

function normalizeLocation(name) {
  return (name || '').trim().toLowerCase()
}

export function isOutdoorLocation(name) {
  return NORMALIZED_OUTDOOR.has(normalizeLocation(name))
}

export function getSeasonalOutlook(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (Number.isNaN(date.getTime())) {
    return {
      name: 'Typical Conditions',
      headline: 'Seasonal outlook unavailable.',
      temperature: 'Expect moderate temperatures.',
      precipitation: 'Check back closer to the event for specifics.',
    }
  }
  const month = date.getMonth()
  const match = SEASONAL_OUTLOOKS.find(entry => entry.months.includes(month))
  return match || {
    name: 'Typical Conditions',
    headline: 'Comfortable outdoor weather is common.',
    temperature: 'Expect moderate temperatures.',
    precipitation: 'Light precipitation possible—monitor closer to your date.',
  }
}

export function describeDaysAhead(daysAhead) {
  if (typeof daysAhead !== 'number' || !Number.isFinite(daysAhead)) return 'Upcoming'
  if (daysAhead <= 0) return 'Today'
  if (daysAhead === 1) return 'Tomorrow'
  if (daysAhead < 7) return `In ${daysAhead} days`
  const weeks = Math.round(daysAhead / 7)
  return weeks <= 1 ? 'In about a week' : `In about ${weeks} weeks`
}

export { OUTDOOR_LOCATIONS }
