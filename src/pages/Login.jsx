import { useState } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
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

  const handleReset = async () => {
    if (!email) { setError('Entre ton email ci-dessus'); return }
    setResetting(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
      setError('')
    } catch(e) {
      setError('Email introuvable — vérifie l'adresse saisie')
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

        {resetSent && (
          <div className="alert alert-g" style={{ marginTop:12 }}>
            📧 Email envoyé ! Vérifie ta boîte mail pour réinitialiser ton mot de passe.
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          style={{
            background: 'none', border: 'none', color: 'var(--tx3)',
            fontSize: 13, cursor: 'pointer', marginTop: 12,
            textDecoration: 'underline', width: '100%', textAlign: 'center',
          }}
        >
          {resetting ? 'Envoi...' : '🔑 Mot de passe oublié ?'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6, fontWeight: 700 }}>
          ACCÈS RÉSERVÉ AUX 16 CHATTEUX<br />
          <span style={{ color: 'var(--tx3)', fontWeight: 400 }}>Mot de passe fourni par Gérald</span>
        </div>
      </div>
    </div>
  )
}
