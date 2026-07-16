export const PAYS_FR = {
  'Algeria': 'Algérie', 'Argentina': 'Argentine', 'Australia': 'Australie',
  'Austria': 'Autriche', 'Belgium': 'Belgique', 'Bosnia-H.': 'Bosnie',
  'Bosnia Herzegovina': 'Bosnie-Herzégovine', 'Brazil': 'Brésil',
  'Cape Verde': 'Cap-Vert', 'Cape Verde Islands': 'Cap-Vert', 'Canada': 'Canada',
  'Colombia': 'Colombie', 'Congo DR': 'RD Congo', 'Ivory Coast': "Côte d'Ivoire",
  'Croatia': 'Croatie', 'Curaçao': 'Curaçao', 'Czechia': 'Tchéquie',
  'Netherlands': 'Pays-Bas', 'Ecuador': 'Équateur', 'Egypt': 'Égypte',
  'England': 'Angleterre', 'France': 'France', 'Germany': 'Allemagne',
  'Ghana': 'Ghana', 'Haiti': 'Haïti', 'Iran': 'Iran', 'Iraq': 'Irak',
  'Japan': 'Japon', 'Jordan': 'Jordanie', 'Mexico': 'Mexique',
  'Morocco': 'Maroc', 'New Zealand': 'Nouvelle-Zélande', 'Norway': 'Norvège',
  'Panama': 'Panama', 'Paraguay': 'Paraguay', 'Portugal': 'Portugal',
  'Qatar': 'Qatar', 'Saudi Arabia': 'Arabie Saoudite', 'Scotland': 'Écosse',
  'Senegal': 'Sénégal', 'South Africa': 'Afrique du Sud',
  'Korea Republic': 'Corée du Sud', 'South Korea': 'Corée du Sud',
  'Spain': 'Espagne', 'Sweden': 'Suède', 'Switzerland': 'Suisse',
  'Tunisia': 'Tunisie', 'Turkey': 'Turquie', 'Uruguay': 'Uruguay',
  'USA': 'États-Unis', 'United States': 'États-Unis', 'Uzbekistan': 'Ouzbékistan',
}

export function translateTeam(name) {
  if (!name) return name
  return PAYS_FR[name] || name
}
