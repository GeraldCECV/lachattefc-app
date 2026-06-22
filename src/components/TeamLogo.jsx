import { useState } from 'react'

// Logos via Wikipedia CDN - 100% fiable, pas de CORS
const TEAM_LOGOS = {
  'psg': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'paris saint-germain': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'paris fc': 'https://upload.wikimedia.org/wikipedia/fr/9/9e/Logo_Paris_FC_2019.svg',
  'marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
  'om': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
  'olympique de marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
  'monaco': 'https://upload.wikimedia.org/wikipedia/en/e/ea/AS_Monaco_FC.svg',
  'as monaco': 'https://upload.wikimedia.org/wikipedia/en/e/ea/AS_Monaco_FC.svg',
  'lyon': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais.svg',
  'ol': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais.svg',
  'olympique lyonnais': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais.svg',
  'olympique lyon': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais.svg',
  'lille': 'https://upload.wikimedia.org/wikipedia/commons/0/00/Logo_LOSC.svg',
  'losc': 'https://upload.wikimedia.org/wikipedia/commons/0/00/Logo_LOSC.svg',
  'lens': 'https://upload.wikimedia.org/wikipedia/commons/5/54/Logo_RC_Lens_2022.svg',
  'rc lens': 'https://upload.wikimedia.org/wikipedia/commons/5/54/Logo_RC_Lens_2022.svg',
  'nice': 'https://upload.wikimedia.org/wikipedia/en/e/ed/OGC_Nice_logo.svg',
  'ogc nice': 'https://upload.wikimedia.org/wikipedia/en/e/ed/OGC_Nice_logo.svg',
  'rennes': 'https://upload.wikimedia.org/wikipedia/en/4/4e/Stade_rennais_FC.svg',
  'stade rennais': 'https://upload.wikimedia.org/wikipedia/en/4/4e/Stade_rennais_FC.svg',
  'strasbourg': 'https://upload.wikimedia.org/wikipedia/commons/9/98/RC_Strasbourg_Alsace_logo.svg',
  'rc strasbourg': 'https://upload.wikimedia.org/wikipedia/commons/9/98/RC_Strasbourg_Alsace_logo.svg',
  'nantes': 'https://upload.wikimedia.org/wikipedia/en/f/fb/FC_Nantes_%28logo%29.svg',
  'fc nantes': 'https://upload.wikimedia.org/wikipedia/en/f/fb/FC_Nantes_%28logo%29.svg',
  'toulouse': 'https://upload.wikimedia.org/wikipedia/en/6/6e/Toulouse_FC_new_logo.svg',
  'toulouse fc': 'https://upload.wikimedia.org/wikipedia/en/6/6e/Toulouse_FC_new_logo.svg',
  'brest': 'https://upload.wikimedia.org/wikipedia/en/0/05/Stade_Brestois_29_logo.svg',
  'stade brestois': 'https://upload.wikimedia.org/wikipedia/en/0/05/Stade_Brestois_29_logo.svg',
  'reims': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Stade_de_Reims_logo.svg',
  'stade de reims': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Stade_de_Reims_logo.svg',
  'montpellier': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Montpellier_HSC_logo.svg',
  'mhsc': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Montpellier_HSC_logo.svg',
  'angers': 'https://upload.wikimedia.org/wikipedia/commons/3/34/SCO_Angers_logo.svg',
  'angers sco': 'https://upload.wikimedia.org/wikipedia/commons/3/34/SCO_Angers_logo.svg',
  'le havre': 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Le_Havre_AC_logo.svg',
  'le havre ac': 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Le_Havre_AC_logo.svg',
  'auxerre': 'https://upload.wikimedia.org/wikipedia/commons/0/05/AJ_Auxerre_logo.svg',
  'aj auxerre': 'https://upload.wikimedia.org/wikipedia/commons/0/05/AJ_Auxerre_logo.svg',
  'saint-etienne': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/AS_Saint-Etienne.svg',
  'asse': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/AS_Saint-Etienne.svg',
  'lorient': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/FC_Lorient_logo.svg',
  'fc lorient': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/FC_Lorient_logo.svg',
  'metz': 'https://upload.wikimedia.org/wikipedia/commons/b/b0/FC_Metz_logo.svg',
  'fc metz': 'https://upload.wikimedia.org/wikipedia/commons/b/b0/FC_Metz_logo.svg',
  // Premier League
  'arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  'chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  'liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  'manchester city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'manchester united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'man united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'man u': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'newcastle': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
  'aston villa': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg',
  // La Liga
  'real madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  'barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'fc barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'atletico madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_de_madrid_2017_logo.svg',
  'sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
  'villarreal': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg',
  // Bundesliga
  'bayern': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  'bayern munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  'dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'borussia dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'leverkusen': 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
  'bayer leverkusen': 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
  // Serie A
  'juventus': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_icon_%28black%29.svg',
  'inter': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'inter milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  'ac milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  'napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli.svg',
  'roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
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
