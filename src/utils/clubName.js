const ALIASES = {
  'real madrid': { key: 'real madrid', label: 'Real Madrid' },
  'real de madrid': { key: 'real madrid', label: 'Real Madrid' },
  barcelona: { key: 'barcelona', label: 'FC Barcelone' },
  barcelone: { key: 'barcelona', label: 'FC Barcelone' },
  'fc barcelona': { key: 'barcelona', label: 'FC Barcelone' },
  'fc barcelone': { key: 'barcelona', label: 'FC Barcelone' },
  bayern: { key: 'bayern', label: 'Bayern Munich' },
  'bayern munich': { key: 'bayern', label: 'Bayern Munich' },
  'bayern munchen': { key: 'bayern', label: 'Bayern Munich' },
  'fc bayern munich': { key: 'bayern', label: 'Bayern Munich' },
  'fc bayern munchen': { key: 'bayern', label: 'Bayern Munich' },
  psg: { key: 'psg', label: 'Paris Saint-Germain' },
  paris: { key: 'psg', label: 'Paris Saint-Germain' },
  'paris sg': { key: 'psg', label: 'Paris Saint-Germain' },
  'paris s g': { key: 'psg', label: 'Paris Saint-Germain' },
  'paris saint germain': { key: 'psg', label: 'Paris Saint-Germain' },
  arsenal: { key: 'arsenal', label: 'Arsenal' },
  'arsenal fc': { key: 'arsenal', label: 'Arsenal' },
  'man city': { key: 'manchester city', label: 'Manchester City' },
  'manchester city': { key: 'manchester city', label: 'Manchester City' },
  'man united': { key: 'manchester united', label: 'Manchester United' },
  'manchester united': { key: 'manchester united', label: 'Manchester United' },
};

export function clubKey(value) {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.’'-]/g, ' ').replace(/\s+/g, ' ');
  return ALIASES[key]?.key || key;
}

export function clubLabel(value) {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.’'-]/g, ' ').replace(/\s+/g, ' ');
  return ALIASES[key]?.label || raw;
}
