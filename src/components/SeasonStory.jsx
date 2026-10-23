import { useEffect, useMemo, useRef, useState } from 'react';
import JerseyAvatar from './JerseyAvatar';
import { translateTeam } from '../utils/teamName';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function messageFor(item, previous) {
  if (!previous) return 'Le début de l’histoire';
  const places = previous.rang - item.rang;
  if (places >= 3) return `Remontée spectaculaire · +${places} places`;
  if (places > 0) return `La progression continue · +${places} place${places > 1 ? 's' : ''}`;
  if (places < 0) return `Un week-end difficile · ${places} place${places < -1 ? 's' : ''}`;
  if (item.gainJournee > 0) return `Dans les gains · +${item.gainJournee.toFixed(2).replace('.', ',')} €`;
  return 'Il conserve sa position';
}

export default function SeasonStory({ data, player, club, onClose }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [intro, setIntro] = useState(true);
  const [impact, setImpact] = useState(0);
  const runRef = useRef(0);
  const firstName = player?.nom?.split(' ')[0] || player?.initiales || 'Joueur';
  const current = data[index] || data[0];
  const previous = data[Math.max(0, index - 1)];
  const maxRank = Math.max(16, ...data.map(item => item.rang || 1));

  const points = useMemo(() => data.map((item, i) => ({
    x: data.length === 1 ? 50 : 5 + (i * 90) / (data.length - 1),
    y: 8 + (((item.rang || maxRank) - 1) * 82) / Math.max(1, maxRank - 1),
  })), [data, maxRank]);
  const path = points.slice(0, index + 1).map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');

  useEffect(() => {
    if (!playing || !data.length) return undefined;
    const run = ++runRef.current;
    const play = async () => {
      setIntro(true);
      setIndex(0);
      await wait(2300);
      if (run !== runRef.current) return;
      setIntro(false);
      for (let i = 0; i < data.length; i += 1) {
        if (run !== runRef.current) return;
        setIndex(i);
        setImpact(value => value + 1);
        await wait(1400);
      }
      if (run === runRef.current) setPlaying(false);
    };
    play();
    return () => { runRef.current += 1; };
  }, [playing, data.length]);

  if (!current) return null;

  const replay = () => {
    runRef.current += 1;
    setPlaying(false);
    requestAnimationFrame(() => setPlaying(true));
  };

  return (
    <div className="season-story-modal" role="dialog" aria-modal="true" aria-label={`Film de la saison de ${firstName}`}>
      <style>{`
        .season-story-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:12px;background:rgba(0,5,2,.92);backdrop-filter:blur(14px)}
        .season-story{position:relative;width:min(100%,430px);max-height:calc(100dvh - 24px);overflow:hidden;border:1px solid rgba(219,190,111,.38);border-radius:28px;background:#050d09;color:#f8f3e8;box-shadow:0 35px 110px #000;isolation:isolate}
        .season-story:after{content:"";position:absolute;inset:0;z-index:30;pointer-events:none;box-shadow:inset 0 0 85px rgba(0,0,0,.75);border-radius:inherit}
        .ss-close{position:absolute;right:14px;top:14px;z-index:40;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(5,13,9,.72);color:#fff;font-size:20px}
        .ss-grain{position:absolute;inset:-50%;z-index:29;pointer-events:none;opacity:.045;background:repeating-radial-gradient(circle at 17% 22%,#fff 0 1px,transparent 1px 4px);background-size:7px 7px;animation:ss-grain .22s steps(2) infinite}
        .ss-intro{position:absolute;inset:0;z-index:25;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at 50% 42%,#1a3a28,#030805 70%);transition:opacity .65s,visibility .65s}
        .ss-intro.hidden{opacity:0;visibility:hidden}.ss-intro-shirt{animation:ss-shirt 1.2s cubic-bezier(.15,.8,.2,1) both;filter:drop-shadow(0 20px 24px #000)}
        .ss-intro h2{margin:14px 0 3px;font-size:34px;animation:ss-rise .7s .3s both}.ss-intro p{margin:0;color:#d9bd72;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;animation:ss-rise .7s .5s both}
        .ss-hero{position:relative;height:238px;padding:22px;overflow:hidden;background:radial-gradient(circle at 75% 44%,rgba(30,94,145,.3),transparent 27%),radial-gradient(circle at 82% 46%,rgba(206,35,53,.18),transparent 42%),linear-gradient(155deg,#10271b,#06100b 70%)}
        .ss-hero:before,.ss-hero:after{content:"";position:absolute;top:-25%;width:45%;height:120%;background:linear-gradient(rgba(239,217,142,.16),transparent 72%);filter:blur(9px)}.ss-hero:before{left:-10%;transform:rotate(-18deg);animation:ss-beam 5s infinite alternate}.ss-hero:after{right:-10%;transform:rotate(18deg);animation:ss-beam 5.6s 1s infinite alternate-reverse}
        .ss-brand{position:relative;z-index:2;color:#d9bd72;font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.ss-copy{position:absolute;left:22px;bottom:22px;z-index:2;max-width:58%}.ss-copy small{color:#84938a;text-transform:uppercase;letter-spacing:.12em;font-size:9px;font-weight:900}.ss-copy h2{margin:5px 0 8px;font-size:27px;line-height:1}.ss-copy p{margin:0;color:#d9bd72;font-size:11px;font-weight:800}
        .ss-shirt{position:absolute;right:12px;bottom:5px;z-index:2;animation:ss-float 3.2s ease-in-out infinite;filter:drop-shadow(0 17px 18px #000)}
        .ss-body{padding:18px 21px 16px;background:linear-gradient(rgba(14,31,21,.93),#050d09)}.ss-head{display:flex;justify-content:space-between;align-items:flex-start}.ss-kicker{color:#d9bd72;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.ss-rank{font-family:Impact,Haettenschweiler,sans-serif;font-size:66px;line-height:.88;animation:ss-impact .58s cubic-bezier(.15,.8,.2,1)}.ss-message{max-width:155px;margin-top:6px;color:#94d88d;font-size:12px;font-weight:900}.ss-j{padding:8px 10px;border:1px solid rgba(217,189,114,.25);border-radius:13px;color:#d9bd72;font-size:18px;font-weight:900;background:rgba(217,189,114,.07)}
        .ss-chart{height:112px;margin-top:10px}.ss-chart svg{width:100%;height:100%;overflow:visible}.ss-grid{stroke:rgba(255,255,255,.07);stroke-dasharray:2 4}.ss-glow{fill:none;stroke:rgba(217,189,114,.16);stroke-width:8;stroke-linecap:round;stroke-linejoin:round}.ss-line{fill:none;stroke:#e6ca7a;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(217,189,114,.55));transition:d .65s cubic-bezier(.2,.8,.2,1)}.ss-dot{fill:#f4dd90;stroke:#fff2bd;stroke-width:1.5;filter:drop-shadow(0 0 5px #d9bd72)}
        .ss-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:14px}.ss-stat{padding:10px 8px;border:1px solid rgba(255,255,255,.06);border-radius:13px;background:#0d1c13;animation:ss-card .55s cubic-bezier(.15,.8,.2,1) both}.ss-stat:nth-child(2){animation-delay:.05s}.ss-stat:nth-child(3){animation-delay:.1s}.ss-stat small{display:block;color:#748178;font-size:8px;text-transform:uppercase;white-space:nowrap}.ss-stat strong{display:block;margin-top:4px;font-size:16px}.ss-stat .gold{color:#d9bd72}
        .ss-controls{display:flex;gap:10px;align-items:center;padding:0 21px 18px}.ss-controls button{min-height:42px;padding:0 15px;border:1px solid #edd68c;border-radius:13px;background:linear-gradient(135deg,#ead181,#b88b3a);color:#0b110c;font-weight:900}.ss-track{height:5px;flex:1;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.ss-fill{height:100%;background:linear-gradient(90deg,#b88b3a,#f1dc91);transition:width .7s cubic-bezier(.2,.8,.2,1)}.ss-count{color:#85938a;font-size:10px}.ss-live{padding:7px;text-align:center;color:#526158;font-size:8px;text-transform:uppercase;letter-spacing:.1em}
        @keyframes ss-grain{to{transform:translate(2%,-2%)}}@keyframes ss-shirt{0%{opacity:0;transform:scale(.5) translateY(35px) rotate(-8deg)}75%{transform:scale(1.08) translateY(-4px)}100%{opacity:1;transform:none}}@keyframes ss-rise{from{opacity:0;transform:translateY(18px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}@keyframes ss-float{50%{transform:translateY(-8px) rotate(-1.5deg)}}@keyframes ss-beam{to{transform:rotate(6deg) translateX(35px);opacity:.18}}@keyframes ss-impact{0%{opacity:0;transform:translateY(25px) scale(.72);filter:blur(8px)}70%{transform:translateY(-3px) scale(1.07)}100%{opacity:1;transform:none;filter:none}}@keyframes ss-card{from{opacity:0;transform:translateY(15px) rotateX(20deg)}to{opacity:1;transform:none}}
        @media(max-width:390px){.season-story-modal{padding:5px}.season-story{border-radius:21px}.ss-hero{height:220px}.ss-body{padding-left:17px;padding-right:17px}.ss-controls{padding-left:17px;padding-right:17px}.ss-rank{font-size:58px}}
        @media(prefers-reduced-motion:reduce){.season-story-modal *{animation:none!important;transition:none!important}}
      `}</style>
      <section className="season-story">
        <div className="ss-grain" />
        <button className="ss-close" type="button" onClick={onClose} aria-label="Fermer">×</button>
        <div className={`ss-intro ${intro ? '' : 'hidden'}`}>
          <div><div className="ss-intro-shirt"><JerseyAvatar club={club} initials={player?.initiales} size={180} /></div><h2>{firstName}</h2><p>Le film de sa saison</p></div>
        </div>
        <header className="ss-hero">
          <div className="ss-brand">La Chatte FC · Saison 26/27</div>
          <div className="ss-copy"><small>Progression du joueur</small><h2>{player?.nom}</h2><p>{translateTeam(club) || 'La Chatte FC'}</p></div>
          <div className="ss-shirt"><JerseyAvatar club={club} initials={player?.initiales} size={150} /></div>
        </header>
        <main className="ss-body">
          <div className="ss-head"><div><div className="ss-kicker">Après la journée {current.numero}</div><div className="ss-rank" key={`rank-${impact}`}>{current.rang ? `${current.rang}e` : '—'}</div><div className="ss-message">{messageFor(current, previous)}</div></div><div className="ss-j">J{current.numero}</div></div>
          <div className="ss-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Courbe d'évolution du classement"><line className="ss-grid" x1="3" y1="10" x2="97" y2="10"/><line className="ss-grid" x1="3" y1="50" x2="97" y2="50"/><line className="ss-grid" x1="3" y1="90" x2="97" y2="90"/><path className="ss-glow" d={path}/><path className="ss-line" d={path}/>{points.slice(0,index+1).map((point,i)=><circle className="ss-dot" key={i} cx={point.x} cy={point.y} r={i===index?2.2:1.2}/>)}</svg></div>
          <div className="ss-stats" key={`stats-${impact}`}><div className="ss-stat"><small>Points cumulés</small><strong>{current.points}</strong></div><div className="ss-stat"><small>Gains cumulés</small><strong className="gold">{current.gain.toFixed(2).replace('.', ',')} €</strong></div><div className="ss-stat"><small>Cette journée</small><strong>+{current.pointsJournee} pts</strong></div></div>
        </main>
        <footer className="ss-controls"><button type="button" onClick={replay}>▶ Rejouer</button><div className="ss-track"><div className="ss-fill" style={{width:`${((index+1)/data.length)*100}%`}}/></div><span className="ss-count">{index+1}/{data.length}</span></footer>
        <div className="ss-live">Données officielles synchronisées avec Firebase</div>
      </section>
    </div>
  );
}
