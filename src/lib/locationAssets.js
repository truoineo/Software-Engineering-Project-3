const RAW_PREVIEWS = [
  {
    names: ['Tennis Courts'],
    image: '/assets/locations/Tennis.png',
    address: 'Armington Complex, 1267 Beall Ave',
    facts: ['Outdoor hard courts', 'Night lighting', 'Bleacher seating'],
    description: 'Six resurfaced courts with new LED lighting, perfect for matches or skill drills any time of day.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=College+of+Wooster+Tennis+Courts',
  },
  {
    names: ['Armington Physical Education Center* ∆', 'Armington Physical Education Center'],
    image: '/assets/locations/Basketball2.png',
    address: '1267 Beall Ave, Wooster, OH',
    facts: ['Indoor multipurpose', 'Training studio', 'Locker rooms'],
    description: 'A flexible training space that supports intramurals, conditioning sessions, and team meetings under one roof.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Armington+Physical+Education+Center',
  },
  {
    names: ['L.C. Boles Golf Course', 'LC Boles Golf Course'],
    image: '/assets/locations/Golf.png',
    address: '901 Gasche St, Wooster, OH',
    facts: ['18-hole course', 'Practice range', 'Clubhouse access'],
    description: 'Tree-lined fairways and a challenging back nine make this course ideal for team practices or weekend rounds.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=L.C.+Boles+Golf+Course',
  },
  {
    names: ['Cindy Barr Field'],
    image: '/assets/locations/CindyBarr.jpeg',
    address: '1101 Beall Ave, Wooster, OH',
    facts: ['Synthetic turf', 'Press box', 'Covered seating'],
    description: 'Premier turf field with permanent seating and a full press box—great for lacrosse, soccer, and field events.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Cindy+Barr+Field',
  },
  {
    names: ['Carl W. Dale Soccer Field', 'Carl Dale Soccer Field'],
    image: '/assets/locations/CindyBarr.jpeg',
    address: 'Highland Ave & Wayne Ave, Wooster, OH',
    facts: ['Natural grass', 'Regulation size', 'Nearby parking'],
    description: 'Turn-key natural surface with permanent goals and convenient spectator viewing along the east touchline.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Carl+W.+Dale+Soccer+Field',
  },
  {
    names: ['Murray Baseball Field'],
    image: '/assets/locations/Baseball.png',
    address: '1189 Beall Ave, Wooster, OH',
    facts: ['Bullpen mounds', 'Press box', 'Home/visitor dugouts'],
    description: 'A top-notch diamond with full bullpens, covered dugouts, and batting tunnels just beyond the outfield fence.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Murray+Baseball+Field',
  },
  {
    names: ['Papp Stadium* ∆', 'Papp Stadium'],
    image: '/assets/locations/Papp.png',
    address: '1189 Beall Ave, Wooster, OH',
    facts: ['Full stadium seating', 'Press level', 'Field turf'],
    description: 'Flagship venue with elevated sight lines, broadcast-ready press facilities, and a durable FieldTurf playing surface.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Papp+Stadium',
  },
  {
    names: ['Scot Center* ∆', 'Scot Center'],
    image: '/assets/locations/Basketball1.png',
    address: '1267 Beall Ave, Wooster, OH',
    facts: ['Four-court arena', 'Indoor track', 'Fitness loft'],
    description: 'Modern recreation hub featuring multiple basketball/volleyball courts, cardio loft, and a 200-meter indoor track.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Scot+Center',
  },
  {
    names: ['Softball Diamond'],
    image: '/assets/locations/SoftballDiamond.png',
    address: '1189 Beall Ave, Wooster, OH',
    facts: ['Clay infield', 'Batting cage', 'LED lighting'],
    description: 'Recently refreshed softball complex with collegiate dimensions, movable cages, and newly installed lighting.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=College+of+Wooster+Softball+Diamond',
  },
  {
    names: ['Timken Gymnasium*', 'Timken Gymnasium'],
    image: null,
    address: '1267 Beall Ave, Wooster, OH',
    facts: ['Historic hardwood', 'Mezzanine seating', 'Scoreboard'],
    description: 'Classic hardwood floor and original bleachers create a throwback atmosphere ideal for tournaments and showcases.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Timken+Gymnasium',
  },
]

const LOCATION_PREVIEWS = RAW_PREVIEWS.reduce((acc, entry) => {
  const { names, ...meta } = entry
  if (!Array.isArray(names) || names.length === 0) return acc
  const payload = {
    name: names[0],
    ...meta,
  }
  for (const candidate of names) {
    if (!candidate) continue
    acc[normalizeKey(candidate)] = payload
  }
  return acc
}, {})

function normalizeKey(location) {
  return (location || '').trim().toLowerCase()
}

export function getLocationPreview(location) {
  if (!location) return null
  return LOCATION_PREVIEWS[normalizeKey(location)] || null
}

export function listKnownLocations() {
  return Object.values(LOCATION_PREVIEWS).map(entry => entry.name)
}

export function hasPreview(location) {
  return Boolean(getLocationPreview(location))
}
