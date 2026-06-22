import { useState, useEffect } from 'react'

// Map des équipes L1 + grands championnats vers leur ID football-data.org
const TEAM_IDS = {
  // Ligue 1
  'psg': 524, 'paris': 524, 'paris saint-germain': 524,
  'om': 516, 'marseille': 516, 'olympique de marseille': 516,
  'monaco': 548, 'as monaco': 548,
  'lyon': 523, 'ol': 523, 'olympique lyonnais': 523,
  'lille': 521, 'losc': 521,
  'nice': 522, 'ogc nice': 522,
  'lens': 546, 'rc lens': 546,
  'rennes': 529, 'stade rennais': 529,
  'strasbourg': 576, 'rc strasbourg': 576,
  'nantes': 543, 'fc nantes': 543,
  'toulouse': 573, 'toulouse fc': 573,
  'brest': 3006, 'stade brestois': 3006,
  'auxerre': 532, 'aj auxerre': 532,
  'angers': 531, 'angers sco': 531,
  'le havre': 539, 'le havre ac': 539,
  'reims': 547, 'stade de reims': 547,
  'montpellier': 541,
  'saint-etienne': 527, 'asse': 527,
  // Premier League
  'arsenal': 57, 'chelsea': 61, 'liverpool': 64, 'manchester city': 65,
  'manchester united': 66, 'tottenham': 73, 'newcastle': 67,
  'aston villa': 58, 'west ham': 563, 'brighton': 397,
  // La Liga
  'real madrid': 86, 'barcelona': 81, 'atletico madrid': 78,
  'sevilla': 559, 'villarreal': 94, 'real sociedad': 92,
  'athletic club': 77, 'valencia': 95, 'betis': 90,
  // Bundesliga
  'bayern': 5, 'bayern munich': 5, 'dortmund': 4, 'borussia dortmund': 4,
  'leipzig': 721, 'leverkusen': 3, 'bayer leverkusen': 3,
  'frankfurt': 19, 'wolfsburg': 11, 'freiburg': 17,
  // Serie A
  'juventus': 109, 'inter': 108, 'inter milan': 108,
  'milan': 98, 'ac milan': 98, 'napoli': 113, 'roma': 100,
  'lazio': 110, 'atalanta': 102, 'fiorentina': 99,
}

const API_KEY = '9823b9cd729441f9a1d8808b7b41ad29'
const cache = {}

function normalize(name) {
  return name?.toLowerCase().trim() || ''
}

function getTeamId(name) {
  const n = normalize(name)
  // Direct match
  if (TEAM_IDS[n]) return TEAM_IDS[n]
  // Partial match
  for (const [key, id] of Object.entries(TEAM_IDS)) {
    if (n.includes(key) || key.includes(n)) return id
  }
  return null
}

export default function TeamLogo({ name, size = 28 }) {
  const [logo, setLogo] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const id = getTeamId(name)
    if (!id) { setError(true); return }

    // Check cache
    if (cache[id]) { setLogo(cache[id]); return }

    // Fetch from API
    fetch(`https://api.football-data.org/v4/teams/${id}`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
      .then(r => r.json())
      .then(d => {
        if (d.crest) {
          cache[id] = d.crest
          setLogo(d.crest)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [name])

  if (error || !logo) {
    // Fallback — initiales colorées
    const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase() || '?'
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: 'rgba(155,226,45,.1)', border: '1px solid rgba(155,226,45,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32, fontWeight: 900, color: 'var(--g)',
        flexShrink: 0,
      }}>
        {initials}
      </div>
    )
  }

  return (
    <img
      src={logo}
      alt={name}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setError(true)}
    />
  )
}
