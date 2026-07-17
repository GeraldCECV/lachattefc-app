import { useState } from 'react'
import { translateTeam } from '../utils/teamName'

// Logos locaux (public/logos/) + fallback Wikipedia pour les clubs européens
const LOCAL_LOGOS = {
  // Ligue 1 — fichiers locaux
  'angers': '/logos/angers.svg',
  'angers sco': '/logos/angers.svg',
  'monaco': '/logos/monaco.svg',
  'as monaco': '/logos/monaco.svg',
  'auxerre': '/logos/auxerre.svg',
  'aj auxerre': '/logos/auxerre.svg',
  'brest': '/logos/brest.svg',
  'stade brestois': '/logos/brest.svg',
  'metz': '/logos/metz.svg',
  'fc metz': '/logos/metz.svg',
  'le havre': '/logos/le-havre.svg',
  'le havre ac': '/logos/le-havre.svg',
  'lille': '/logos/lille.svg',
  'losc': '/logos/lille.svg',
  'losc lille': '/logos/lille.svg',
  'lorient': '/logos/lorient.svg',
  'fc lorient': '/logos/lorient.svg',
  'lyon': '/logos/lyon.svg',
  'ol': '/logos/lyon.svg',
  'olympique lyonnais': '/logos/lyon.svg',
  'olympique lyon': '/logos/lyon.svg',
  'marseille': '/logos/marseille.svg',
  'om': '/logos/marseille.svg',
  'olympique de marseille': '/logos/marseille.svg',
  'nantes': '/logos/nantes.svg',
  'fc nantes': '/logos/nantes.svg',
  'nice': '/logos/nice.svg',
  'ogc nice': '/logos/nice.svg',
  'paris fc': '/logos/paris-fc.svg',
  'psg': '/logos/psg.svg',
  'paris saint-germain': '/logos/psg.svg',
  'paris s-g': '/logos/psg.svg',
  'paris sg': '/logos/psg.svg',
  'lens': '/logos/lens.svg',
  'rc lens': '/logos/lens.svg',
  'strasbourg': '/logos/strasbourg.svg',
  'rc strasbourg': '/logos/strasbourg.svg',
  'rennes': '/logos/rennes.svg',
  'stade rennais': '/logos/rennes.svg',
  'toulouse': '/logos/toulouse.svg',
  'toulouse fc': '/logos/toulouse.svg',
  'troyes': '/logos/troyes.svg',
  'estac troyes': '/logos/troyes.svg',
  'estac': '/logos/troyes.svg',
  'le mans': '/logos/le-mans.svg',
  'le mans fc': '/logos/le-mans.svg',
  // Clubs sans logo local — Wikipedia
  'reims': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Stade_de_Reims_logo.svg',
  'stade de reims': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Stade_de_Reims_logo.svg',
  'montpellier': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Montpellier_HSC_logo.svg',
  'montpellier hsc': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Montpellier_HSC_logo.svg',
  'saint-etienne': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/AS_Saint-Etienne.svg',
  'as saint-étienne': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/AS_Saint-Etienne.svg',
  // Premier League
  'arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  'chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  'liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  'manchester city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'man. city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'manchester united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'man. united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'newcastle': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
  'aston villa': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg',
  // La Liga
  'real madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  'barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'fc barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'atletico madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_de_madrid_2017_logo.svg',
  'sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
  // Bundesliga
  'bayern': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  'bayern munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  'dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'borussia dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'leverkusen': 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
  // Serie A
  'juventus': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_icon_%28black%29.svg',
  'inter': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'inter milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  'ac milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  'napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli.svg',
}

function normalize(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || ''
}

function getLogo(name) {
  if (!name) return null
  const n = normalize(name)
  if (LOCAL_LOGOS[n]) return LOCAL_LOGOS[n]
  for (const [key, url] of Object.entries(LOCAL_LOGOS)) {
    if (n.includes(key) || key.includes(n)) return url
  }
  return null
}

export default function TeamLogo({ name, size = 28 }) {
  const [error, setError] = useState(false)
  const displayName = translateTeam(name)
  const logo = getLogo(name)

  if (!logo || error) {
    const initials = displayName?.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase() || '?'
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
