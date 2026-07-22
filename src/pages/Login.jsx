import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { auth } from '../firebase/config';

// Importer les polices stylées
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Orbitron:wght@900&display=swap';
fontLink.rel = 'stylesheet';
if (document.head && !document.head.querySelector('link[href*="Orbitron"]')) {
  document.head.appendChild(fontLink);
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetMessage({ type: 'error', text: 'Entrez votre email' });
      return;
    }
    setResetLoading(true);
    setResetMessage('');
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const demanderReset = httpsCallable(functions, 'demanderResetMotDePasse');
      await demanderReset({ email: resetEmail });
      setResetMessage({ type: 'ok', text: '✅ Email envoyé ! Vérifie ta boîte (y compris spam).' });
      setResetEmail('');
      setTimeout(() => setShowResetForm(false), 3000);
    } catch (err) {
      setResetMessage({ type: 'error', text: '❌ Erreur : ' + (err.message || 'Erreur réseau') });
    }
    setResetLoading(false);
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
      {/* Logo sans fond noir - WebP + fallback PNG */}
      <picture>
        <source srcSet="/icon-512-transparent.webp" type="image/webp" />
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
      </picture>

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
            onClick={() => setShowResetForm(true)}
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

      {/* Modal réinitialisation mot de passe */}
      {showResetForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0F2818 0%, #0A1F14 100%)',
            border: '1px solid rgba(155,226,45,.2)',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 340,
            boxShadow: '0 20px 40px rgba(0,0,0,.3)',
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#9BE22D' }}>
              🔑 Réinitialiser ton mot de passe
            </h2>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                placeholder="Ton email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid rgba(155,226,45,.2)',
                  borderRadius: 8,
                  color: '#F2F7EF',
                  fontSize: 14,
                  fontFamily: 'Inter',
                  outline: 'none',
                }}
              />
              {resetMessage && (
                <div style={{
                  padding: 10,
                  background: resetMessage.type === 'ok' ? 'rgba(34,197,94,.12)' : 'rgba(248,113,113,.12)',
                  border: `1px solid ${resetMessage.type === 'ok' ? 'rgba(34,197,94,.3)' : 'rgba(248,113,113,.3)'}`,
                  borderRadius: 6,
                  color: resetMessage.type === 'ok' ? '#86EFAC' : '#FCA5A5',
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                  {resetMessage.text}
                </div>
              )}
              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  padding: '10px 16px',
                  background: '#9BE22D',
                  border: 'none',
                  borderRadius: 8,
                  color: '#060A07',
                  fontWeight: 700,
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  opacity: resetLoading ? 0.6 : 1,
                }}
              >
                {resetLoading ? '⏳ Envoi...' : '📧 Envoyer un lien'}
              </button>
              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 8,
                  color: '#A9B8A7',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
