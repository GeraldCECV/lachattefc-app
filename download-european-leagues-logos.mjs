/**
 * Downloader logos des grands championnats européens depuis football-logos.cc
 *
 * Championnats inclus :
 * - Premier League
 * - Liga
 * - Serie A
 * - Bundesliga
 * - Ligue 1
 *
 * Usage :
 *   node download-european-leagues-logos.mjs
 *
 * Sortie :
 *   ./public/logos/<championnat>/<club>.svg
 *   ./public/logos/<championnat>/<club>.png
 *   ./public/logos/<championnat>/manifest.json
 *
 * Note : les URLs du site peuvent évoluer. Si une page est introuvable,
 * modifie le slug dans la liste TEAMS ci-dessous.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_OUT_DIR = './public/logos';
const PNG_SIZE = 512;
const WAIT_MS = 350;

const LEAGUES = {
  premierLeague: {
    label: 'Premier League',
    dir: 'premier-league',
    countryPath: 'england',
    teams: [
      ['Arsenal', 'arsenal'],
      ['Aston Villa', 'aston-villa'],
      ['Bournemouth', 'bournemouth'],
      ['Brentford', 'brentford'],
      ['Brighton', 'brighton'],
      ['Chelsea', 'chelsea'],
      ['Crystal Palace', 'crystal-palace'],
      ['Everton', 'everton'],
      ['Fulham', 'fulham'],
      ['Leeds United', 'leeds-united'],
      ['Liverpool FC', 'liverpool-fc'],
      ['Manchester City', 'manchester-city'],
      ['Manchester United', 'manchester-united'],
      ['Newcastle', 'newcastle'],
      ['Nottingham Forest', 'nottingham-forest'],
      ['Sunderland', 'sunderland'],
      ['Tottenham', 'tottenham'],
      ['West Ham', 'west-ham'],
      ['Wolverhampton', 'wolverhampton'],
      ['Burnley', 'burnley'],
    ],
  },

  liga: {
    label: 'Liga',
    dir: 'liga',
    countryPath: 'spain',
    teams: [
      ['Athletic Bilbao', 'athletic-bilbao'],
      ['Atletico Madrid', 'atletico-madrid'],
      ['Barcelona', 'barcelona'],
      ['Celta Vigo', 'celta-vigo'],
      ['Espanyol', 'espanyol'],
      ['Getafe', 'getafe'],
      ['Girona', 'girona'],
      ['Levante', 'levante'],
      ['Mallorca', 'mallorca'],
      ['Osasuna', 'osasuna'],
      ['Rayo Vallecano', 'rayo-vallecano'],
      ['Real Betis', 'real-betis'],
      ['Real Madrid', 'real-madrid'],
      ['Real Oviedo', 'real-oviedo'],
      ['Real Sociedad', 'real-sociedad'],
      ['Sevilla', 'sevilla'],
      ['Valencia', 'valencia'],
      ['Villarreal', 'villarreal'],
      ['Alaves', 'alaves'],
      ['Elche', 'elche'],
    ],
  },

  serieA: {
    label: 'Serie A',
    dir: 'serie-a',
    countryPath: 'italy',
    teams: [
      ['Atalanta', 'atalanta'],
      ['Bologna', 'bologna'],
      ['Cagliari', 'cagliari'],
      ['Como', 'como'],
      ['Cremonese', 'cremonese'],
      ['Fiorentina', 'fiorentina'],
      ['Genoa', 'genoa'],
      ['Hellas Verona', 'hellas-verona'],
      ['Inter Milan', 'inter-milan'],
      ['Juventus', 'juventus'],
      ['Lazio', 'lazio'],
      ['Lecce', 'lecce'],
      ['AC Milan', 'ac-milan'],
      ['Napoli', 'napoli'],
      ['Parma', 'parma'],
      ['Pisa', 'pisa'],
      ['AS Roma', 'as-roma'],
      ['Sassuolo', 'sassuolo'],
      ['Torino', 'torino'],
      ['Udinese', 'udinese'],
    ],
  },

  bundesliga: {
    label: 'Bundesliga',
    dir: 'bundesliga',
    countryPath: 'germany',
    teams: [
      ['Augsburg', 'augsburg'],
      ['Bayer Leverkusen', 'bayer-leverkusen'],
      ['Bayern Munich', 'bayern-munich'],
      ['Borussia Dortmund', 'borussia-dortmund'],
      ['Borussia Monchengladbach', 'borussia-monchengladbach'],
      ['Eintracht Frankfurt', 'eintracht-frankfurt'],
      ['Freiburg', 'freiburg'],
      ['Hamburger SV', 'hamburger-sv'],
      ['Heidenheim', 'heidenheim'],
      ['Hoffenheim', 'hoffenheim'],
      ['Koln', 'koln'],
      ['Mainz', 'mainz'],
      ['RB Leipzig', 'rb-leipzig'],
      ['St Pauli', 'st-pauli'],
      ['Stuttgart', 'stuttgart'],
      ['Union Berlin', 'union-berlin'],
      ['Werder Bremen', 'werder-bremen'],
      ['Wolfsburg', 'wolfsburg'],
    ],
  },

  ligue1: {
    label: 'Ligue 1',
    dir: 'ligue-1',
    countryPath: 'france',
    teams: [
      ['Angers', 'angers'],
      ['Auxerre', 'auxerre'],
      ['Brest', 'brest'],
      ['Le Havre', 'le-havre'],
      ['Lens', 'lens'],
      ['Lille', 'lille'],
      ['Lorient', 'lorient'],
      ['Lyon', 'lyon'],
      ['Marseille', 'marseille'],
      ['Metz', 'metz'],
      ['Monaco', 'monaco'],
      ['Nantes', 'nantes'],
      ['Nice', 'nice'],
      ['Paris FC', 'paris-fc'],
      ['Paris Saint-Germain', 'paris-saint-germain'],
      ['Rennes', 'rennes'],
      ['Strasbourg', 'strasbourg'],
      ['Toulouse', 'toulouse'],
    ],
  },
};

function absUrl(url, base) {
  return new URL(url, base).toString();
}

function pickLogoUrl(html, pageUrl, type) {
  const urls = [];
  const re = /(href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) urls.push(absUrl(match[2], pageUrl));

  const lower = u => u.toLowerCase();

  if (type === 'svg') {
    return urls.find(u => lower(u).includes('.svg')) || null;
  }

  return (
    urls.find(u => lower(u).includes(`${PNG_SIZE}x${PNG_SIZE}`) && lower(u).includes('.png')) ||
    urls.find(u => lower(u).includes('.png') && lower(u).includes('logo')) ||
    urls.find(u => lower(u).includes('.png')) ||
    null
  );
}

async function downloadFile(url, dest) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 Logo downloader for personal project' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buffer);
}

async function fetchPage(url) {
  return fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 Logo downloader for personal project' },
  });
}

async function downloadLeague(leagueKey, league) {
  const outDir = path.join(BASE_OUT_DIR, league.dir);
  await fs.mkdir(outDir, { recursive: true });

  console.log(`\n==============================`);
  console.log(`${league.label}`);
  console.log(`==============================`);

  const manifest = [];

  for (const [name, slug] of league.teams) {
    const pageUrl = `https://football-logos.cc/${league.countryPath}/${slug}/`;
    console.log(`\n${name}`);

    const item = {
      league: leagueKey,
      leagueLabel: league.label,
      name,
      slug,
      pageUrl,
      svg: null,
      png: null,
      status: 'pending',
    };

    try {
      const page = await fetchPage(pageUrl);
      if (!page.ok) {
        item.status = `page introuvable : ${page.status}`;
        console.log(`  ❌ ${item.status}`);
        manifest.push(item);
        continue;
      }

      const html = await page.text();
      const svgUrl = pickLogoUrl(html, pageUrl, 'svg');
      const pngUrl = pickLogoUrl(html, pageUrl, 'png');

      if (svgUrl) {
        await downloadFile(svgUrl, path.join(outDir, `${slug}.svg`));
        item.svg = `/logos/${league.dir}/${slug}.svg`;
        console.log(`  ✅ SVG`);
      } else {
        console.log(`  ⚠️ SVG non trouvé`);
      }

      if (pngUrl) {
        await downloadFile(pngUrl, path.join(outDir, `${slug}.png`));
        item.png = `/logos/${league.dir}/${slug}.png`;
        console.log(`  ✅ PNG`);
      } else {
        console.log(`  ⚠️ PNG non trouvé`);
      }

      item.status = item.svg || item.png ? 'ok' : 'logo non trouvé automatiquement';
    } catch (err) {
      item.status = `erreur : ${err.message}`;
      console.log(`  ❌ ${item.status}`);
    }

    manifest.push(item);
    await new Promise(r => setTimeout(r, WAIT_MS));
  }

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

async function main() {
  await fs.mkdir(BASE_OUT_DIR, { recursive: true });
  const fullManifest = {};

  for (const [leagueKey, league] of Object.entries(LEAGUES)) {
    fullManifest[leagueKey] = await downloadLeague(leagueKey, league);
  }

  await fs.writeFile(path.join(BASE_OUT_DIR, 'manifest-europe.json'), JSON.stringify(fullManifest, null, 2), 'utf8');
  console.log(`\nTerminé. Dossier : ${BASE_OUT_DIR}`);
}

main().catch(err => {
  console.error('\nErreur générale :', err.message);
  process.exit(1);
});
