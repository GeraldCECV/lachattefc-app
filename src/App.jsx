import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from './firebase/config'
import Login from './pages/Login'
import AppShell from './components/AppShell'

export const UserContext = createContext(null)
export const useUser = () => useContext(UserContext)

const ONESIGNAL_APP_ID = 'f336f95a-cd06-42cf-9989-5aef9ccc1205'

export default function App() {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const snap = await getDoc(doc(db, 'joueurs', u.uid))
        if (snap.exists()) setProfil({ id: snap.id, ...snap.data() })
      } else {
        setUser(null)
        setProfil(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Initialiser OneSignal et stocker le Player ID dans Firestore
  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined') return

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false }, // pas de bouton flottant OneSignal
      })

      // Demander la permission automatiquement en mode PWA standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      const alreadyAsked = localStorage.getItem('lachattefc_os_asked')
      if (isStandalone && !alreadyAsked) {
        localStorage.setItem('lachattefc_os_asked', '1')
        setTimeout(() => OneSignal.Notifications.requestPermission(), 1200)
      }

      // Stocker le Player ID dans Firestore pour pouvoir envoyer des notifs ciblées
      OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
        const playerId = event.current?.id
        if (playerId && user) {
          try {
            await updateDoc(doc(db, 'joueurs', user.uid), {
              osPlayerIds: arrayUnion(playerId),
              osPlayerId: playerId,
            })
            console.log('✅ OneSignal Player ID enregistré:', playerId)
          } catch(e) {
            console.warn('Erreur enregistrement Player ID:', e.message)
          }
        }
      })

      // Récupérer le Player ID actuel si déjà subscribed
      const currentId = OneSignal.User.PushSubscription.id
      if (currentId && user) {
        try {
          await updateDoc(doc(db, 'joueurs', user.uid), {
            osPlayerIds: arrayUnion(currentId),
            osPlayerId: currentId,
          })
        } catch(e) {}
      }
    })
  }, [user])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
      <div style={{ fontSize: 48 }}>😼</div>
      <div className="spinner" style={{ width: 24, height: 24 }}></div>
    </div>
  )

  return (
    <UserContext.Provider value={{ user, profil }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/*" element={user ? <AppShell /> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  )
}
