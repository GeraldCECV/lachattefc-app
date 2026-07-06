import { translateTeam } from '../utils/teamName'

// Couleurs (maillot domicile, simplifié en 2 tons) par club/sélection.
// Approximation stylisée volontaire (silhouette générique, pas de
// reproduction de logo/sponsor/design réel) — juste les couleurs
// emblématiques du club. Clés en minuscules, matching par inclusion de
// sous-chaîne (voir getColors), donc le nom complet OU un alias court
// fonctionnent tous les deux.
const CLUB_COLORS = {
  // ── Ligue 1 2026/27 (les 18 clubs, vérifiés un par un) ──
  'angers sco': { bg: '#000000', trim: '#FFFFFF' },        // noir et blanc
  'aj auxerre': { bg: '#1C3F94', trim: '#FFFFFF' },        // bleu et blanc
  'stade brestois 29': { bg: '#DA291C', trim: '#FFFFFF' }, // rouge et blanc
  'le havre ac': { bg: '#00447C', trim: '#7EC0E8' },       // bleu marine et bleu ciel
  'le mans fc': { bg: '#FFFFFF', trim: '#003DA5' },        // blanc et bleu
  'rc lens': { bg: '#FFD100', trim: '#C8102E' },           // sang et or
  'losc lille': { bg: '#C8102E', trim: '#FFFFFF' },        // rouge et blanc
  'fc lorient': { bg: '#F57F17', trim: '#000000' },        // orange et noir
  'olympique lyonnais': { bg: '#FFFFFF', trim: '#C8102E' },// blanc et rouge
  'olympique de marseille': { bg: '#2FA0DB', trim: '#FFFFFF' }, // bleu ciel et blanc
  'as monaco': { bg: '#E8112D', trim: '#FFFFFF' },         // rouge et blanc
  'ogc nice': { bg: '#C8102E', trim: '#000000' },          // rouge et noir
  'paris fc': { bg: '#004B87', trim: '#FFFFFF' },          // bleu et blanc
  'paris saint-germain': { bg: '#004170', trim: '#DA291C' }, // bleu marine et rouge
  'stade rennais fc': { bg: '#E8112D', trim: '#000000' },  // rouge et noir
  'rc strasbourg': { bg: '#0072CE', trim: '#FFFFFF' },     // bleu et blanc
  'toulouse fc': { bg: '#6A0DAD', trim: '#FFFFFF' },       // violet et blanc
  'estac troyes': { bg: '#0072CE', trim: '#DA291C' },      // bleu et rouge

  // ── Alias courts (au cas où, et pour compat avec d'anciens usages) ──
  'angers': { bg: '#000000', trim: '#FFFFFF' },
  'auxerre': { bg: '#1C3F94', trim: '#FFFFFF' },
  'brest': { bg: '#DA291C', trim: '#FFFFFF' },
  'le havre': { bg: '#00447C', trim: '#7EC0E8' },
  'le mans': { bg: '#FFFFFF', trim: '#003DA5' },
  'lens': { bg: '#FFD100', trim: '#C8102E' },
  'lille': { bg: '#C8102E', trim: '#FFFFFF' },
  'lorient': { bg: '#F57F17', trim: '#000000' },
  'lyon': { bg: '#FFFFFF', trim: '#C8102E' },
  'marseille': { bg: '#2FA0DB', trim: '#FFFFFF' },
  'monaco': { bg: '#E8112D', trim: '#FFFFFF' },
  'nice': { bg: '#C8102E', trim: '#000000' },
  'psg': { bg: '#004170', trim: '#DA291C' },
  'rennes': { bg: '#E8112D', trim: '#000000' },
  'strasbourg': { bg: '#0072CE', trim: '#FFFFFF' },
  'toulouse': { bg: '#6A0DAD', trim: '#FFFFFF' },
  'troyes': { bg: '#0072CE', trim: '#DA291C' },

  // ── Autres clubs français (historique L1/L2) ──
  'metz': { bg: '#8B1538', trim: '#FFFFFF' },
  'nantes': { bg: '#FFC72C', trim: '#00843D' },
  'reims': { bg: '#E8112D', trim: '#FFFFFF' },
  'montpellier': { bg: '#F5811F', trim: '#003DA5' },
  'saint-etienne': { bg: '#00843D', trim: '#FFFFFF' },
  'saint-étienne': { bg: '#00843D', trim: '#FFFFFF' },

  // ── Premier League ──
  'arsenal': { bg: '#EF0107', trim: '#FFFFFF' },
  'chelsea': { bg: '#034694', trim: '#FFFFFF' },
  'liverpool': { bg: '#C8102E', trim: '#00B2A9' },
  'manchester city': { bg: '#6CABDD', trim: '#FFFFFF' },
  'manchester united': { bg: '#DA291C', trim: '#FFE500' },
  'tottenham': { bg: '#FFFFFF', trim: '#132257' },
  'newcastle': { bg: '#241F20', trim: '#FFFFFF' },
  'aston villa': { bg: '#670E36', trim: '#95BFE5' },

  // ── La Liga ──
  'real madrid': { bg: '#FFFFFF', trim: '#FEBE10' },
  'barcelona': { bg: '#A50044', trim: '#004D98' },
  'atletico madrid': { bg: '#CB3524', trim: '#FFFFFF' },
  'sevilla': { bg: '#FFFFFF', trim: '#D2001C' },

  // ── Bundesliga ──
  'bayern': { bg: '#DC052D', trim: '#FFFFFF' },
  'dortmund': { bg: '#FDE100', trim: '#000000' },
  'leverkusen': { bg: '#E32221', trim: '#000000' },

  // ── Serie A ──
  'juventus': { bg: '#FFFFFF', trim: '#000000' },
  'inter': { bg: '#0068A8', trim: '#000000' },
  'milan': { bg: '#FB090B', trim: '#000000' },
  'napoli': { bg: '#12A0D7', trim: '#FFFFFF' },

  // ── Sélections nationales (CDM 2026) ──
  'argentina': { bg: '#75AADB', trim: '#FFFFFF' },
  'brazil': { bg: '#FFDF00', trim: '#009739' },
  'france': { bg: '#002654', trim: '#ED2939' },
  'england': { bg: '#FFFFFF', trim: '#CE1124' },
  'spain': { bg: '#DA291C', trim: '#FFC400' },
  'portugal': { bg: '#DA291C', trim: '#046A38' },
  'germany': { bg: '#FFFFFF', trim: '#000000' },
  'netherlands': { bg: '#FF6C0E', trim: '#FFFFFF' },
  'belgium': { bg: '#DA291C', trim: '#000000' },
  'croatia': { bg: '#FFFFFF', trim: '#FF0000' },
  'morocco': { bg: '#C1272D', trim: '#006233' },
  'colombia': { bg: '#FFCD00', trim: '#003893' },
  'uruguay': { bg: '#7EBEE5', trim: '#FFFFFF' },
  'mexico': { bg: '#006341', trim: '#FFFFFF' },
  'united states': { bg: '#FFFFFF', trim: '#B31942' },
  'canada': { bg: '#FF0000', trim: '#FFFFFF' },
  'switzerland': { bg: '#FF0000', trim: '#FFFFFF' },
  'senegal': { bg: '#00853F', trim: '#FDEF42' },
  'ghana': { bg: '#FFFFFF', trim: '#CE1126' },
  'egypt': { bg: '#CE1126', trim: '#000000' },
  'japan': { bg: '#FFFFFF', trim: '#0033A0' },
  'norway': { bg: '#EF2B2D', trim: '#FFFFFF' },
  'italy': { bg: '#0066CC', trim: '#FFFFFF' },
  'paraguay': { bg: '#FFFFFF', trim: '#D52B1E' },
}

function normalize(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || ''
}

function getColors(name) {
  if (!name) return null
  const n = normalize(name)
  if (CLUB_COLORS[n]) return CLUB_COLORS[n]
  for (const [key, colors] of Object.entries(CLUB_COLORS)) {
    if (n.includes(key) || key.includes(n)) return colors
  }
  return null
}

// Avatar maillot stylisé, colorié aux couleurs du club choisi. Si aucun
// club n'est renseigné (ou non reconnu), retombe sur un rond avec les
// initiales — même comportement que l'ancien avatar par défaut.
export default function JerseyAvatar({ club, initials, size = 40 }) {
  const colors = getColors(club)

  if (!colors) {
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

  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative' }} title={translateTeam(club)}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* Silhouette de maillot stylisée (manches courtes + col en V) */}
        <path
          d="M 30 8
             L 42 4
             Q 50 12 58 4
             L 70 8
             L 88 26
             L 76 40
             L 68 32
             L 68 92
             Q 50 96 32 92
             L 32 32
             L 24 40
             L 12 26
             Z"
          fill={colors.bg}
          stroke={colors.trim}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Col */}
        <path d="M 42 4 Q 50 14 58 4 Q 50 20 42 4 Z" fill={colors.trim} />
      </svg>
    </div>
  )
}
