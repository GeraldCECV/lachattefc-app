import { useState } from 'react'

// Logos via thesportsdb.com - accès public gratuit
const TEAM_LOGOS = {
  'psg': 'https://www.thesportsdb.com/images/media/team/badge/vuqwrr1487159754.png',
  'paris saint-germain': 'https://www.thesportsdb.com/images/media/team/badge/vuqwrr1487159754.png',
  'paris fc': 'https://www.thesportsdb.com/images/media/team/badge/vuqwrr1487159754.png',
  'marseille': 'https://www.thesportsdb.com/images/media/team/badge/ssywve1421853422.png',
  'om': 'https://www.thesportsdb.com/images/media/team/badge/ssywve1421853422.png',
  'olympique de marseille': 'https://www.thesportsdb.com/images/media/team/badge/ssywve1421853422.png',
  'monaco': 'https://www.thesportsdb.com/images/media/team/badge/lhqacu1472051811.png',
  'as monaco': 'https://www.thesportsdb.com/images/media/team/badge/lhqacu1472051811.png',
  'lyon': 'https://www.thesportsdb.com/images/media/team/badge/f3llln1473774151.png',
  'ol': 'https://www.thesportsdb.com/images/media/team/badge/f3llln1473774151.png',
  'olympique lyonnais': 'https://www.thesportsdb.com/images/media/team/badge/f3llln1473774151.png',
  'olympique lyon': 'https://www.thesportsdb.com/images/media/team/badge/f3llln1473774151.png',
  'lille': 'https://www.thesportsdb.com/images/media/team/badge/j0dpqr1523040393.png',
  'losc': 'https://www.thesportsdb.com/images/media/team/badge/j0dpqr1523040393.png',
  'lens': 'https://www.thesportsdb.com/images/media/team/badge/rwy1np1594886068.png',
  'rc lens': 'https://www.thesportsdb.com/images/media/team/badge/rwy1np1594886068.png',
  'nice': 'https://www.thesportsdb.com/images/media/team/badge/qurtxu1473773346.png',
  'ogc nice': 'https://www.thesportsdb.com/images/media/team/badge/qurtxu1473773346.png',
  'rennes': 'https://www.thesportsdb.com/images/media/team/badge/rrttxu1473775171.png',
  'stade rennais': 'https://www.thesportsdb.com/images/media/team/badge/rrttxu1473775171.png',
  'strasbourg': 'https://www.thesportsdb.com/images/media/team/badge/wwttxu1473775090.png',
  'rc strasbourg': 'https://www.thesportsdb.com/images/media/team/badge/wwttxu1473775090.png',
  'nantes': 'https://www.thesportsdb.com/images/media/team/badge/wwttuu1473773238.png',
  'fc nantes': 'https://www.thesportsdb.com/images/media/team/badge/wwttuu1473773238.png',
  'toulouse': 'https://www.thesportsdb.com/images/media/team/badge/qwvusr1524072564.png',
  'toulouse fc': 'https://www.thesportsdb.com/images/media/team/badge/qwvusr1524072564.png',
  'brest': 'https://www.thesportsdb.com/images/media/team/badge/trsuqv1524073046.png',
  'stade brestois': 'https://www.thesportsdb.com/images/media/team/badge/trsuqv1524073046.png',
  'reims': 'https://www.thesportsdb.com/images/media/team/badge/xwtsqr1524072707.png',
  'stade de reims': 'https://www.thesportsdb.com/images/media/team/badge/xwtsqr1524072707.png',
  'montpellier': 'https://www.thesportsdb.com/images/media/team/badge/ttvwrr1521547872.png',
  'angers': 'https://www.thesportsdb.com/images/media/team/badge/0rrttx1524072630.png',
  'angers sco': 'https://www.thesportsdb.com/images/media/team/badge/0rrttx1524072630.png',
  'le havre': 'https://www.thesportsdb.com/images/media/team/badge/3wwusr1594886068.png',
  'le havre ac': 'https://www.thesportsdb.com/images/media/team/badge/3wwusr1594886068.png',
  'auxerre': 'https://www.thesportsdb.com/images/media/team/badge/twssrr1524072782.png',
  'aj auxerre': 'https://www.thesportsdb.com/images/media/team/badge/twssrr1524072782.png',
  'saint-etienne': 'https://www.thesportsdb.com/images/media/team/badge/vuurqw1473773406.png',
  'asse': 'https://www.thesportsdb.com/images/media/team/badge/vuurqw1473773406.png',
  'lorient': 'https://www.thesportsdb.com/images/media/team/badge/xvtsqr1524072782.png',
  'metz': 'https://www.thesportsdb.com/images/media/team/badge/vvstqr1524072934.png',
  // Premier League
  'arsenal': 'https://www.thesportsdb.com/images/media/team/badge/vrtrtu1448813215.png',
  'chelsea': 'https://www.thesportsdb.com/images/media/team/badge/wwvvtr1448811215.png',
  'liverpool': 'https://www.thesportsdb.com/images/media/team/badge/uvuswv1421604657.png',
  'manchester city': 'https://www.thesportsdb.com/images/media/team/badge/vwwvpt1473771010.png',
  'manchester united': 'https://www.thesportsdb.com/images/media/team/badge/ttttvr1448813189.png',
  'man united': 'https://www.thesportsdb.com/images/media/team/badge/ttttvr1448813189.png',
  'tottenham': 'https://www.thesportsdb.com/images/media/team/badge/vwwwss1448813264.png',
  // La Liga
  'real madrid': 'https://www.thesportsdb.com/images/media/team/badge/vwpvry1419040005.png',
  'barcelona': 'https://www.thesportsdb.com/images/media/team/badge/8by44w1508329366.png',
  'atletico madrid': 'https://www.thesportsdb.com/images/media/team/badge/a1af5w1557993001.png',
  // Bundesliga
  'bayern': 'https://www.thesportsdb.com/images/media/team/badge/uvrwrr1473760614.png',
  'bayern munich': 'https://www.thesportsdb.com/images/media/team/badge/uvrwrr1473760614.png',
  'dortmund': 'https://www.thesportsdb.com/images/media/team/badge/tuvxsr1421435251.png',
  'borussia dortmund': 'https://www.thesportsdb.com/images/media/team/badge/tuvxsr1421435251.png',
  // Serie A
  'juventus': 'https://www.thesportsdb.com/images/media/team/badge/xvuqwt1421678625.png',
  'inter': 'https://www.thesportsdb.com/images/media/team/badge/vwwvpt1421680214.png',
  'inter milan': 'https://www.thesportsdb.com/images/media/team/badge/vwwvpt1421680214.png',
  'milan': 'https://www.thesportsdb.com/images/media/team/badge/usvwwu1421427979.png',
  'ac milan': 'https://www.thesportsdb.com/images/media/team/badge/usvwwu1421427979.png',
}

function normalize(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || ''
}

function getLogo(name) {
  if (!name) return null
  const n = normalize(name)
  if (TEAM_LOGOS[n]) return TEAM_LOGOS[n]
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
