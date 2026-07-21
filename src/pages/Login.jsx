import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: `
        radial-gradient(circle at top left, rgba(155,226,45,.12), transparent 32rem),
        radial-gradient(circle at bottom right, rgba(34,197,94,.08), transparent 28rem),
        linear-gradient(135deg, #060A07 0%, #0A140E 45%, #050806 100%)
      `,
    }}>
      {/* Logo sans fond noir */}
      <img
        src="/icon-512-transparent.png"
        alt="La Chatte FC"
        style={{
          width: 200,
          height: 200,
          marginBottom: 40,
          filter: 'drop-shadow(0 0 24px rgba(155,226,45,.18))',
        }}
      />

      {/* Titre */}
      <h1 style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 36,
        letterSpacing: '0.045em',
        color: '#F2F7EF',
        textTransform: 'uppercase',
        textShadow: '0 0 14px rgba(155,226,45,.12)',
        marginBottom: 40,
        margin: 0,
      }}>
        La Chatte FC
      </h1>

      {/* Form Card */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))',
        border: '1px solid rgba(155,226,45,.12)',
        boxShadow: '0 18px 45px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.04)',
        backdropFilter: 'blur(10px)',
        borderRadius: 16,
        padding: 28,
        width: '100%',
        maxWidth: 340,
      }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="input"
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'rgba(255,255,255,.045)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 10,
              color: '#F2F7EF',
              fontSize: 16,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(155,226,45,.28)';
              e.target.style.boxShadow = '0 0 0 4px rgba(155,226,45,.085)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,.1)';
              e.target.style.boxShadow = 'none';
            }}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="input"
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'rgba(255,255,255,.045)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 10,
              color: '#F2F7EF',
              fontSize: 16,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(155,226,45,.28)';
              e.target.style.boxShadow = '0 0 0 4px rgba(155,226,45,.085)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,.1)';
              e.target.style.boxShadow = 'none';
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 28px',
              marginTop: 10,
              background: loading ? 'rgba(155,226,45,.3)' : 'linear-gradient(180deg, #B9F84F, #75B91D)',
              color: '#07100C',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              boxShadow: loading ? 'none' : '0 0 0 1px rgba(155,226,45,.22), 0 10px 18px rgba(155,226,45,.17)',
              transition: 'all 0.16s ease',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Bouton mot de passe oublié */}
          <button
            type="button"
            onClick={() => {
              // TODO: implémenter réinitialisation mot de passe
              alert('Contacte Gérald pour réinitialiser ton mot de passe');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(155,226,45,.6)',
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 12,
              textDecoration: 'underline',
              width: '100%',
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
              transition: 'color 0.16s',
            }}
            onMouseEnter={(e) => e.target.style.color = 'rgba(155,226,45,.8)'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(155,226,45,.6)'}
          >
            🔑 Mot de passe oublié ?
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(248,113,113,.12)',
            border: '1px solid rgba(248,113,113,.3)',
            borderRadius: 8,
            color: '#FCA5A5',
            fontSize: 13,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Message d'accès réservé */}
        <div style={{
          marginTop: 24,
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(242,247,239,.5)',
          lineHeight: 1.6,
          fontWeight: 700,
          letterSpacing: '0.01em',
        }}>
          ACCÈS RÉSERVÉ AUX 16 CHATTEUX<br />
          <span style={{ color: 'rgba(242,247,239,.4)', fontWeight: 400 }}>Mot de passe fourni par Gérald</span>
        </div>
      </div>
    </div>
  );
}
