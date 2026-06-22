export default function Reglement() {
  const PALMARES = [
    { s:'2014-2015', or:'Jérémie GALLOYER', pb:'Thibaut PLET' },
    { s:'2015-2016', or:'Frédéric BOURRIER', pb:'Thibaut PLET' },
    { s:'2016-2017', or:'Karim MENLAIKHAF', pb:'Christophe TIZON' },
    { s:'2017-2018', or:'Michaël DAIGNEAU', pb:'Simon GALLOYER' },
    { s:'2018-2019', or:'Rafaël SORTAIS', pb:'Frédéric BOURRIER' },
    { s:'2019-2020', or:'Karim MENLAIKHAF', pb:'Jérémie GALLOYER' },
    { s:'2020-2021', or:'Baptiste CLAIRE', pb:'Michaël DAIGNEAU' },
    { s:'2021-2022', or:'Clem GUT', pb:'Raf SORTAIS' },
    { s:'2022-2023', or:'Baptiste CLAIRE', pb:'Jérémie GALLOYER' },
    { s:'2023-2024', or:'Rafael SORTAIS', pb:'Simon GALLOYER' },
    { s:'2024-2025', or:'Kamel MENLAIKHAF', pb:'Simon GALLOYER' },
    { s:'2025-2026', or:'Simon GALLOYER', pb:'Jérémie GALLOYER' },
  ]

  const Section = ({ num, title, children }) => (
    <div style={{ margin:'0 16px 16px' }}>
      <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.04em', color:'var(--g)', textTransform:'uppercase', marginBottom:10, textShadow:'0 0 10px rgba(155,226,45,.2)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:11, background:'var(--g-dim)', border:'1px solid var(--g-b)', borderRadius:999, padding:'2px 8px', color:'var(--g-tx)', fontFamily:'var(--F)', fontWeight:900, letterSpacing:'.08em' }}>ART.{num}</span>
        {title}
      </div>
      <div style={{ background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--R)', padding:16, boxShadow:'var(--shadow)', fontSize:13, color:'var(--tx2)', lineHeight:1.7 }}>
        {children}
      </div>
    </div>
  )

  const Li = ({ children }) => (
    <div style={{ display:'flex', gap:8, marginBottom:6 }}>
      <span style={{ color:'var(--g)', flexShrink:0, marginTop:2 }}>▸</span>
      <span>{children}</span>
    </div>
  )

  const Strong = ({ children }) => <span style={{ color:'var(--tx)', fontWeight:900 }}>{children}</span>

  return (
    <div className="scroll-area">
      {/* Header */}
      <div style={{ padding:'16px 20px 8px' }}>
        <div className="page-title">Règlement</div>
        <div className="page-sub">LA CHATTE A SES RÈGLES · Saison 26/27</div>
      </div>

      {/* Bureau */}
      <div style={{ margin:'8px 16px 16px', background:'linear-gradient(135deg, rgba(155,226,45,.08), rgba(155,226,45,.03))', border:'1px solid var(--g-b)', borderRadius:'var(--R)', padding:16, boxShadow:'var(--shadow)' }}>
        <div style={{ fontSize:10, fontWeight:900, color:'var(--g)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:10 }}>🏛️ Bureau 26/27</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { role:'Président', nom:'Kamel MENLAIKHAF' },
            { role:'Vice-Président', nom:'Mathieu PLET' },
            { role:'Administrateur', nom:'Baptiste CLAIRE' },
    { role:'Administrateur', nom:'Gérald DURAND-DESGRANGES' },
          ].map(b => (
            <div key={b.role} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'var(--tx3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', fontSize:11 }}>{b.role}</span>
              <span style={{ color:'var(--tx)', fontWeight:900 }}>{b.nom}</span>
            </div>
          ))}
        </div>
      </div>

      <Section num="1" title="Présentation">
        <p style={{ marginBottom:10 }}>LA CHATTE est un jeu de pronostics entre amis sur le Championnat de France de Ligue 1 saison 2026/2027. Nous sommes <Strong>16 participants</Strong> cette année. <Strong>10ème saison</Strong> entre copains ! 🥳</p>
        <p style={{ marginBottom:10 }}>Le concours est composé de :</p>
        <Li>Des pronostics sur les 34 journées de championnat — 1 match à scorer, 1 affiche européenne et 8 matchs à pronostiquer</Li>
        <Li><Strong>Particularité :</Strong> les journées 17 et 34 sont à scorer en intégralité</Li>
        <Li>Un Tableau Annexe de Paris sur les 3 premiers du championnat, gagnants LDC et Europa, meilleur buteur et passeur L1</Li>
      </Section>

      <Section num="3" title="Pronostics">
        <p style={{ marginBottom:10 }}>Chaque joueur mise <Strong>5€ par journée</Strong>.</p>
        <Li>8 matchs L1 : victoire dom. (1), nul (N) ou victoire ext. (2)</Li>
        <Li>1 match à scorer choisi par le bureau</Li>
        <Li>1 affiche européenne (1N2) choisie par le bureau</Li>
        <div style={{ margin:'12px 0', padding:'12px', background:'rgba(155,226,45,.06)', border:'1px solid var(--g-b)', borderRadius:'var(--Rs)' }}>
          <div style={{ fontWeight:900, color:'var(--g)', marginBottom:6, fontSize:12, textTransform:'uppercase', letterSpacing:'.05em' }}>🕵 Règle des SURPRISES</div>
          <p>Si le résultat est trouvé par <Strong>moins de 25%</Strong> des participants → <Strong>2 points</Strong> au lieu de 1.</p>
        </div>
        <div style={{ margin:'10px 0', padding:'12px', background:'rgba(96,165,250,.06)', border:'1px solid var(--b-b)', borderRadius:'var(--Rs)' }}>
          <div style={{ fontWeight:900, color:'#93C5FD', marginBottom:6, fontSize:12, textTransform:'uppercase', letterSpacing:'.05em' }}>🎯 Match à scorer</div>
          <Li>Bon score = <Strong>3 pts</Strong></Li>
          <Li>Bon écart = <Strong>2 pts</Strong></Li>
          <Li>Bonne issue seulement = <Strong>1 pt</Strong></Li>
          <Li>Si -25% trouvent la bonne issue = <Strong>2 pts</Strong></Li>
          <Li style={{ color:'var(--r)' }}>Maximum = <Strong>3 pts</Strong></Li>
        </div>
        <p style={{ marginTop:8, fontSize:12, color:'var(--tx3)' }}>⚠️ Si un match est reporté ou arrêté → déclaré perdant pour tous les participants.</p>
      </Section>

      <Section num="4" title="Bonus">
        <p style={{ marginBottom:12, fontSize:12, color:'var(--tx3)' }}>Les bonus ne peuvent pas être posés sur le match à scorer. Possible de cumuler les 3 types sur la même journée, mais pas deux fois le même type.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { ico:'🎯', title:'Missile', qty:'×5 / saison', color:'var(--r)', dim:'var(--r-dim)', b:'var(--r-b)', desc:"Le plus puissant — prévaut sur tous les autres bonus. Change le prono d'un adversaire que tu détermines, sur le match de ton choix." },
            { ico:'🎰', title:'Jackpot', qty:'×3 / saison', color:'var(--a)', dim:'var(--a-dim)', b:'var(--a-b)', desc:"Double tes points sur le match de ton choix." },
            { ico:'2️⃣', title:'Double Chance', qty:'×4 / saison', color:'var(--p)', dim:'var(--p-dim)', b:'var(--p-b)', desc:"Joue 2 résultats sur 1 match (1/N, 1/2 ou N/2). Si l'un est bon → 1pt." },
          ].map(b => (
            <div key={b.title} style={{ background:b.dim, border:`1px solid ${b.b}`, borderRadius:'var(--Rs)', padding:'10px 12px', display:'flex', gap:10 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{b.ico}</span>
              <div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontWeight:900, color:b.color, fontSize:13, textTransform:'uppercase', letterSpacing:'.04em' }}>{b.title}</span>
                  <span style={{ fontSize:10, fontWeight:900, color:b.color, opacity:.7 }}>{b.qty}</span>
                </div>
                <p style={{ fontSize:12 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section num="6" title="Déroulement d'une journée">
        <Li>Dimanche/lundi soir → annonce de la journée via l'app</Li>
        <Li>Match à scorer + match européen communiqués par le bureau</Li>
        <Li><Strong>Deadline : jeudi 23h00</Strong> — tout prono non envoyé = ABS → <Strong>−1pt</Strong> journée suivante</Li>
        <Li>Vendredi → pronos révélés à tous les chatteux</Li>
        <Li>Week-end → scores mis à jour <Strong>en live toutes les 5 min</Strong> automatiquement 🆕</Li>
      </Section>

      <Section num="8" title="Gains">
        <div style={{ marginBottom:12 }}>
          <div style={{ fontWeight:900, color:'var(--g)', marginBottom:8, fontSize:12, textTransform:'uppercase', letterSpacing:'.05em' }}>Gains par journée — Pot : 80€</div>
          {[[1,'🥇','24€'],[2,'🥈','18€'],[3,'🥉','14€'],[4,'4e','11€'],[5,'5e','8€'],[6,'6e','5€']].map(([r,m,g]) => (
            <div key={r} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(155,226,45,.06)', fontSize:13 }}>
              <span>{m} pronostiqueur</span>
              <span style={{ fontWeight:900, color:'var(--g)' }}>{g}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize:12, color:'var(--tx3)', marginBottom:6 }}>En cas d'égalité → partage des gains.</p>
        <div style={{ background:'rgba(251,191,36,.08)', border:'1px solid var(--a-b)', borderRadius:'var(--Rs)', padding:'10px 12px', fontSize:13 }}>
          🏆 Si un joueur a <Strong>tout bon</Strong> (bon score + au moins 1pt partout) → il rafle les <Strong>80€</Strong> !
        </div>
        <p style={{ fontSize:12, color:'var(--tx3)', marginTop:10 }}>Mise totale par joueur : <Strong>177€</Strong> (5€ × 34 journées + 7€ tableau final) · Pot journée : <Strong>80€</Strong></p>
      </Section>

      <Section num="10" title="Soirée de clôture">
        <p>Celui qui termine <Strong>dernier</Strong> de la saison devra tous nous recevoir pour la soirée de clôture avec remise des récompenses. 💩</p>
      </Section>

      {/* Palmarès */}
      <div className="section-lbl">🏆 Palmarès</div>
      <div style={{ margin:'0 16px 32px', background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--R)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
        {PALMARES.map((p, i) => (
          <div key={p.s} style={{ padding:'10px 16px', borderBottom: i < PALMARES.length-1 ? '1px solid rgba(155,226,45,.08)' : 'none' }}>
            <div style={{ fontSize:10, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{p.s}</div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
              <div style={{ fontSize:12 }}>🏆 <span style={{ color:'var(--g)', fontWeight:700 }}>{p.or}</span></div>
              <div style={{ fontSize:12 }}>💩 <span style={{ color:'var(--r)', fontWeight:700 }}>{p.pb}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
