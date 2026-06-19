import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

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
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 24px',
    }}>
      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 }}>
        <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 0 24px rgba(34,197,94,.3))' }}>😼</div>
        <div style={{ fontFamily: 'var(--D)', fontSize: 52, letterSpacing: '.05em', color: 'var(--tx)', lineHeight: 1, textAlign: 'center', marginBottom: 6 }}>
          LA CHATTE FC
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx3)', marginBottom: 8 }}>Saison 25/26</div>
        <div style={{
          display: 'flex', gap: 6, padding: '5px 14px',
          background: 'var(--g-dim)', border: '1px solid var(--g-b)',
          borderRadius: 999, fontSize: 12, fontWeight: 600, color: 'var(--g)'
        }}>
          ⚽ Concours de pronos
        </div>
      </div>

      {/* Form */}
      <div style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
        {error && (
          <div className="alert alert-r" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="prenom@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ paddingRight: 48 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--tx3)' }}
            >
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleLogin}
          disabled={loading || !email || !password}
        >
          {loading
            ? <><div className="spinner" style={{ width: 18, height: 18, borderTopColor: '#000' }}></div> Connexion...</>
            : '🔐 Se connecter'
          }
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6 }}>
          Accès réservé aux 14 chatteux<br />
          Mot de passe fourni par Gérald
        </div>
      </div>
    </div>
  )
}
