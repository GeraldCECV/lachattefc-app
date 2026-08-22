function normaliserEquipe(nom = '') {
  return String(nom)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bpsg\b|\bparis sg\b/g, 'paris saint germain')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function proximiteEquipes(a, b) {
  const equipeA = normaliserEquipe(a)
  const equipeB = normaliserEquipe(b)
  if (!equipeA || !equipeB) return 0
  if (equipeA === equipeB || equipeA.includes(equipeB) || equipeB.includes(equipeA)) return 100

  const motsA = new Set(equipeA.split(' ').filter(mot => mot.length > 2))
  return equipeB.split(' ').filter(mot => mot.length > 2 && motsA.has(mot)).length
}

export function coteEvenement(equipe, domicile, exterieur) {
  const scoreDomicile = proximiteEquipes(equipe, domicile)
  const scoreExterieur = proximiteEquipes(equipe, exterieur)
  if (scoreDomicile === 0 && scoreExterieur === 0) return null
  return scoreDomicile >= scoreExterieur ? 'domicile' : 'exterieur'
}

export function libelleMinuteEvenement(evenement) {
  if (evenement?.minute === null || evenement?.minute === undefined) return ''
  return `${evenement.minute}${evenement.injuryTime ? `+${evenement.injuryTime}` : ''}’`
}
