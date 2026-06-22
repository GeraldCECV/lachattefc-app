import { useState } from 'react'

// IDs des équipes sur api-football (logo via thesportsdb ou sofascore)
const TEAM_LOGOS = {
  // Ligue 1 - logos via API-Football CDN
  'psg': 'https://media.api-sports.io/football/teams/85.png',
  'paris saint-germain': 'https://media.api-sports.io/football/teams/85.png',
  'paris fc': 'https://media.api-sports.io/football/teams/85.png',
  'marseille': 'https://media.api-sports.io/football/teams/81.png',
  'om': 'https://media.api-sports.io/football/teams/81.png',
  'olympique de marseille': 'https://media.api-sports.io/football/teams/81.png',
  'monaco': 'https://media.api-sports.io/football/teams/91.png',
  'as monaco': 'https://media.api-sports.io/football/teams/91.png',
  'lyon': 'https://media.api-sports.io/football/teams/80.png',
  'ol': 'https://media.api-sports.io/football/teams/80.png',
  'olympique lyonnais': 'https://media.api-sports.io/football/teams/80.png',
  'olympique lyon': 'https://media.api-sports.io/football/teams/80.png',
  'lille': 'https://media.api-sports.io/football/teams/79.png',
  'losc': 'https://media.api-sports.io/football/teams/79.png',
  'rc lens': 'https://media.api-sports.io/football/teams/116.png',
  'lens': 'https://media.api-sports.io/football/teams/116.png',
  'nice': 'https://media.api-sports.io/football/teams/84.png',
  'ogc nice': 'https://media.api-sports.io/football/teams/84.png',
  'rennes': 'https://media.api-sports.io/football/teams/94.png',
  'stade rennais': 'https://media.api-sports.io/football/teams/94.png',
  'strasbourg': 'https://media.api-sports.io/football/teams/95.png',
  'rc strasbourg': 'https://media.api-sports.io/football/teams/95.png',
  'nantes': 'https://media.api-sports.io/football/teams/83.png',
  'fc nantes': 'https://media.api-sports.io/football/teams/83.png',
  'toulouse': 'https://media.api-sports.io/football/teams/96.png',
  'toulouse fc': 'https://media.api-sports.io/football/teams/96.png',
  'brest': 'https://media.api-sports.io/football/teams/113.png',
  'stade brestois': 'https://media.api-sports.io/football/teams/113.png',
  'auxerre': 'https://media.api-sports.io/football/teams/778.png',
  'aj auxerre': 'https://media.api-sports.io/football/teams/778.png',
  'angers': 'https://media.api-sports.io/football/teams/77.png',
  'angers sco': 'https://media.api-sports.io/football/teams/77.png',
  'le havre': 'https://media.api-sports.io/football/teams/1074.png',
  'le havre ac': 'https://media.api-sports.io/football/teams/1074.png',
  'reims': 'https://media.api-sports.io/football/teams/93.png',
  'stade de reims': 'https://media.api-sports.io/football/teams/93.png',
  'montpellier': 'https://media.api-sports.io/football/teams/82.png',
  'mhsc': 'https://media.api-sports.io/football/teams/82.png',
  'saint-etienne': 'https://media.api-sports.io/football/teams/92.png',
  'asse': 'https://media.api-sports.io/football/teams/92.png',
  'lorient': 'https://media.api-sports.io/football/teams/1104.png',
  'fc lorient': 'https://media.api-sports.io/football/teams/1104.png',
  'metz': 'https://media.api-sports.io/football/teams/112.png',
  'fc metz': 'https://media.api-sports.io/football/teams/112.png',
  // Premier League
  'arsenal': 'https://media.api-sports.io/football/teams/42.png',
  'chelsea': 'https://media.api-sports.io/football/teams/49.png',
  'liverpool': 'https://media.api-sports.io/football/teams/40.png',
  'manchester city': 'https://media.api-sports.io/football/teams/50.png',
  'manchester united': 'https://media.api-sports.io/football/teams/33.png',
  'man united': 'https://media.api-sports.io/football/teams/33.png',
  'man u': 'https://media.api-sports.io/football/teams/33.png',
  'tottenham': 'https://media.api-sports.io/football/teams/47.png',
  'newcastle': 'https://media.api-sports.io/football/teams/34.png',
  'aston villa': 'https://media.api-sports.io/football/teams/66.png',
  // La Liga
  'real madrid': 'https://media.api-sports.io/football/teams/541.png',
  'barcelona': 'https://media.api-sports.io/football/teams/529.png',
  'fc barcelona': 'https://media.api-sports.io/football/teams/529.png',
  'atletico madrid': 'https://media.api-sports.io/football/teams/530.png',
  'sevilla': 'https://media.api-sports.io/football/teams/536.png',
  'real sociedad': 'https://media.api-sports.io/football/teams/548.png',
  'athletic club': 'https://media.api-sports.io/football/teams/531.png',
  'villarreal': 'https://media.api-sports.io/football/teams/533.png',
  // Bundesliga
  'bayern': 'https://media.api-sports.io/football/teams/157.png',
  'bayern munich': 'https://media.api-sports.io/football/teams/157.png',
  'dortmund': 'https://media.api-sports.io/football/teams/165.png',
  'borussia dortmund': 'https://media.api-sports.io/football/teams/165.png',
  'leverkusen': 'https://media.api-sports.io/football/teams/168.png',
  'bayer leverkusen': 'https://media.api-sports.io/football/teams/168.png',
  'leipzig': 'https://media.api-sports.io/football/teams/173.png',
  // Serie A
  'juventus': 'https://media.api-sports.io/football/teams/496.png',
  'inter': 'https://media.api-sports.io/football/teams/505.png',
  'inter milan': 'https://media.api-sports.io/football/teams/505.png',
  'milan': 'https://media.api-sports.io/football/teams/489.png',
  'ac milan': 'https://media.api-sports.io/football/teams/489.png',
  'napoli': 'https://media.api-sports.io/football/teams/492.png',
  'roma': 'https://media.api-sports.io/football/teams/497.png',
}

function normalize(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || ''
}

function getLogo(name) {
  if (!name) return null
  const n = normalize(name)
  if (TEAM_LOGOS[n]) return TEAM_LOGOS[n]
  // Partial match
  for (const [key, url] of Object.entries(TEAM_LOGOS)) {
    if (n.includes(key) || key.includes(n)) return url
  }
  return null
}

export default function TeamLogo({ name, size = 28 }) {
  const [error, setError] = useState(false)
  const logo = getLogo(name)

  if (!logo || error) {
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
