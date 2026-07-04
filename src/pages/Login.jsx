import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { httpsCallable, getFunctions } from 'firebase/functions'
import { auth } from '../firebase/config'
import logo from '../assets/logo-lachattefc.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleReset = async () => {
    if (!email) { setError('Entre ton email ci-dessus'); return }
    setResetting(true)
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'demanderResetMotDePasse')
      await fn({ email })
      setResetSent(true)
      setError('')
    } catch(e) {
      setError('Une erreur est survenue, réessaie')
    }
    setResetting(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Email ou mot de passe incorrect',
        'auth/user-not-found': 'Aucun compte avec cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives — réessaie dans quelques minutes',
      }
      setError(msgs[err.code] || 'Erreur de connexion')
    }
    setLoading(false)
  }

  // Mode réinitialisation mot de passe
  if (resetMode) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(circle at top left, rgba(155,226,45,.12), transparent 32rem), radial-gradient(circle at bottom right, rgba(34,197,94,.08), transparent 28rem), linear-gradient(135deg, #060A07 0%, #0A140E 45%, #050806 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
      }}>
        <img src={logo} alt="La Chatte FC" style={{ width: 120, height: 'auto', marginBottom: 20, filter: 'drop-shadow(0 0 20px rgba(155,226,45,.3))' }} />
        <div style={{ fontFamily: 'var(--D)', fontSize: 32, letterSpacing: '.06em', color: 'var(--tx)', marginBottom: 4, textAlign: 'center' }}>Mot de passe oublié</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 28, textAlign: 'center' }}>Un email de réinitialisation te sera envoyé</div>

        <div style={{ width: '100%', maxWidth: 380 }}>
          {resetSent ? (
            <div className="alert alert-g">
              📧 Email envoyé à <strong>{resetEmail}</strong> ! Vérifie ta boîte mail.
            </div>
          ) : (
            <>
              {error && <div className="alert alert-r">{error}</div>}
              <div style={{ marginBottom: 20 }}>
                <label className="label">Ton email</label>
                <input type="email" className="input" placeholder="prenom@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} autoFocus />
              </div>
              <button className="btn btn-primary" onClick={async () => {
                if (!resetEmail) { setError('Entre ton email'); return }
                setResetting(true)
                try {
                  const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'demanderResetMotDePasse')
                  await fn({ email: resetEmail })
                  setResetSent(true)
                  setError('')
                } catch(e) { setError('Une erreur est survenue, réessaie') }
                setResetting(false)
              }} disabled={resetting || !resetEmail}>
                {resetting ? 'Envoi...' : '📧 Envoyer le lien de réinitialisation'}
              </button>
            </>
          )}
          <button onClick={() => { setResetMode(false); setResetSent(false); setError('') }} style={{ background:'none', border:'none', color:'var(--tx3)', fontSize:13, cursor:'pointer', marginTop:16, width:'100%', textAlign:'center', textDecoration:'underline' }}>
            ← Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(circle at top left, rgba(155,226,45,.12), transparent 32rem), radial-gradient(circle at bottom right, rgba(34,197,94,.08), transparent 28rem), linear-gradient(135deg, #060A07 0%, #0A140E 45%, #050806 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
    }}>
      {/* Logo */}
      <img src={logo} alt="La Chatte FC" style={{
        width: 180, height: 'auto', marginBottom: 24,
        filter: 'drop-shadow(0 0 24px rgba(155,226,45,.35)) drop-shadow(0 0 56px rgba(155,226,45,.18))',
      }} />

      <div style={{ fontFamily: 'var(--D)', fontSize: 40, letterSpacing: '.06em', color: 'var(--tx)', lineHeight: .9, textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>
        La Chatte FC
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--g)', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 32 }}>
        Saison 26/27
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 380 }}>
        {error && <div className="alert alert-r">{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="prenom@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'} className="input"
              placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" required
              style={{ paddingRight: 52 }}
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', fontSize: 18, color: 'var(--tx3)', cursor: 'pointer',
            }}>
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleLogin} disabled={loading || !email || !password}>
          {loading
            ? <><div className="spinner" style={{ width: 18, height: 18, borderTopColor: '#07100C' }}></div> Connexion...</>
            : '🔐 Se connecter'
          }
        </button>

        <button type="button" onClick={() => setResetMode(true)} style={{ background:'none', border:'none', color:'var(--tx3)', fontSize:13, cursor:'pointer', marginTop:12, textDecoration:'underline', width:'100%', textAlign:'center' }}>
          🔑 Mot de passe oublié ?
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6, fontWeight: 700 }}>
          ACCÈS RÉSERVÉ AUX 16 CHATTEUX<br />
          <span style={{ color: 'var(--tx3)', fontWeight: 400 }}>Mot de passe fourni par Gérald</span>
        </div>
      </div>
    </div>
  )
}
