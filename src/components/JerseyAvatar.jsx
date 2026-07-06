import { useState } from 'react'
import { translateTeam } from '../utils/teamName'

// Noms de fichiers candidats par club — plusieurs variantes tolérées
// (underscore, sans séparateur, tiret) pour ne pas être trop strict sur
// la convention de nommage. Cherche dans /public/maillot/{slug}.png.
const FILE_SLUGS = {
  'angers sco': ['angers'],
  'aj auxerre': ['auxerre'],
  'stade brestois 29': ['brest'],
  'le havre ac': ['le_havre', 'lehavre', 'le-havre'],
  'le mans fc': ['lemans', 'le_mans', 'le-mans'],
  'rc lens': ['lens'],
  'losc lille': ['lille'],
  'fc lorient': ['lorient'],
  'olympique lyonnais': ['lyon'],
  'olympique de marseille': ['marseille'],
  'as monaco': ['monaco'],
  'ogc nice': ['nice'],
  'paris fc': ['paris_fc', 'parisfc', 'paris-fc'],
  'paris saint-germain': ['psg', 'paris_sg', 'parissg'],
  'stade rennais fc': ['rennes'],
  'rc strasbourg': ['strasbourg'],
  'toulouse fc': ['toulouse'],
  'estac troyes': ['troyes'],
}

function normalize(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || ''
}

function getFileCandidates(name) {
  if (!name) return []
  const n = normalize(name)
  const slugs = FILE_SLUGS[n] || Object.entries(FILE_SLUGS).find(([key]) => n.includes(key) || key.includes(n))?.[1]
  if (!slugs) return []
  // Cherche d'abord sur GitHub Raw (fiable sur tous les deployments),
  // puis fallback sur les chemins locaux
  const githubBase = 'https://raw.githubusercontent.com/GeraldCECV/lachattefc-app/main/public'
  return slugs.flatMap(s => [
    `${githubBase}/maillot/${s}.png`,
    `${githubBase}/maillots/${s}.png`,
    `/maillots/${s}.png`,
    `/maillot/${s}.png`
  ])
}

// Avatar maillot. Cherche un fichier uploadé dans /public/maillot/ ou via GitHub Raw.
// À défaut, affiche les initiales.
export default function JerseyAvatar({ club, initials, size = 40 }) {
  const candidates = getFileCandidates(club)
  const [candidateIdx, setCandidateIdx] = useState(0)
  const [allFilesFailed, setAllFilesFailed] = useState(candidates.length === 0)

  if (!allFilesFailed && candidates[candidateIdx]) {
    console.log(`[JerseyAvatar] Trying ${club}:`, candidates[candidateIdx])
    return (
      <img
        src={candidates[candidateIdx]}
        alt={translateTeam(club)}
        title={translateTeam(club)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
        onError={() => {
          console.log(`[JerseyAvatar] Failed to load ${candidates[candidateIdx]}, trying next...`)
          if (candidateIdx + 1 < candidates.length) setCandidateIdx(i => i + 1)
          else {
            console.log(`[JerseyAvatar] All candidates failed for ${club}`)
            setAllFilesFailed(true)
          }
        }}
      />
    )
  }

  // À défaut : initiales uniquement
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(155,226,45,.12)', border: '1px solid rgba(155,226,45,.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 900, color: 'var(--g)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}
