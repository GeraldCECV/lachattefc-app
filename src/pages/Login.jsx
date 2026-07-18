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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 20,
        fontFamily: 'system-ui',
      }}
    >
      <h1>🏈 La Chatte FC</h1>
      <form
        onSubmit={handleLogin}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 15,
          width: 300,
        }}
      >
        <input
          type='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 4,
            border: '1px solid #ccc',
            fontSize: 14,
          }}
        />
        <input
          type='password'
          placeholder='Mot de passe'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 4,
            border: '1px solid #ccc',
            fontSize: 14,
          }}
        />
        <button
          type='submit'
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#007AFF',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
      {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
    </div>
  );
}
