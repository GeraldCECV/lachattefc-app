export const LIVE_ORDER = {
  CHRONOLOGIQUE: 'chronologique',
  A_JOUER: 'a_jouer',
}

export function horaireMatch(match) {
  if (typeof match?.utcDate?.toMillis === 'function') return match.utcDate.toMillis()
  if (match?.utcDate?.seconds) return match.utcDate.seconds * 1000
  const timestamp = Date.parse(match?.utcDate || '')
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

export function trierMatchsLive(matchs, resultats = {}, ordre = LIVE_ORDER.A_JOUER) {
  return [...matchs].sort((a, b) => {
    if (ordre === LIVE_ORDER.A_JOUER) {
      const aTermine = resultats?.[a.key]?.status === 'FINISHED'
      const bTermine = resultats?.[b.key]?.status === 'FINISHED'
      if (aTermine !== bTermine) return aTermine ? 1 : -1
    }
    return horaireMatch(a) - horaireMatch(b) || a.ordreInitial - b.ordreInitial
  })
}
