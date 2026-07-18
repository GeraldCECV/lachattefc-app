import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import Login from './pages/Login';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';

export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

export default function App() {
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const snap = await getDoc(doc(db, 'joueurs', u.uid));
          if (snap.exists()) setProfil({ id: snap.id, ...snap.data() });
          setAuthError(null);
        } catch (e) {
          console.error('Erreur chargement profil:', e);
          setAuthError('Impossible de charger ton profil. Vérifie ta connexion et réessaie.');
        }
        // Lie l'abonnement push OneSignal à l'UID Firebase, pour pouvoir
        // cibler des notifications individuelles plus tard (missile reçu,
        // rappel deadline personnel, etc.) plutôt que du broadcast uniquement.
        try {
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async (OneSignal) => {
            await OneSignal.login(u.uid);
          });
        } catch (e) {
          console.error('Erreur liaison OneSignal:', e);
        }
      } else {
        setUser(null);
        setProfil(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading)
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--bg)',
        }}
      >
        <div style={{ fontSize: 48 }}>😼</div>
        <div className='spinner' style={{ width: 24, height: 24 }}></div>
      </div>
    );

  if (authError)
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--bg)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48 }}>😿</div>
        <div style={{ fontSize: 14, color: 'var(--tx3)', maxWidth: 300, lineHeight: 1.5 }}>
          {authError}
        </div>
        <button className='btn btn-primary' onClick={() => window.location.reload()}>
          🔄 Réessayer
        </button>
      </div>
    );

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <UserContext.Provider value={{ user, profil }}>
        <BrowserRouter>
          <Routes>
            <Route path='/login' element={!user ? <Login /> : <Navigate to='/' replace />} />
            <Route path='/*' element={user ? <AppShell /> : <Navigate to='/login' replace />} />
          </Routes>
        </BrowserRouter>
      </UserContext.Provider>
    </ErrorBoundary>
  );
}
