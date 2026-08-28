import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import Login from './pages/Login';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import { synchroniserPushAuDemarrage } from './services/pushNotifications';


export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Au réveil d'une PWA mobile, Firebase Auth peut restaurer la session avant
// que le réseau soit réellement disponible. On laisse à Firestore quelques
// secondes pour se reconnecter, puis on utilise le cache local s'il existe.
async function chargerProfil(uid) {
  const profilRef = doc(db, 'joueurs', uid);
  let derniereErreur = null;

  for (const delai of [0, 500, 1200]) {
    if (delai) await attendre(delai);
    try {
      return await getDoc(profilRef);
    } catch (error) {
      derniereErreur = error;
    }
  }

  try {
    return await getDocFromCache(profilRef);
  } catch {
    throw derniereErreur || new Error('Profil indisponible');
  }
}

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
          const snap = await chargerProfil(u.uid);
          if (snap.exists()) setProfil({ id: snap.id, ...snap.data() });
          setAuthError(null);
        } catch (e) {
          console.error('Erreur chargement profil:', e);
          setAuthError('Impossible de charger ton profil. Vérifie ta connexion et réessaie.');
        }
        // Relie l'appareil au bon joueur et répare automatiquement les anciens
        // abonnements Chrome/Android lorsque la permission est déjà accordée.
        synchroniserPushAuDemarrage(u.uid);
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
        <img
          src="/icon-512.png"
          alt="La Chatte FC"
          style={{ width: 120, height: 'auto' }}
        />
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
