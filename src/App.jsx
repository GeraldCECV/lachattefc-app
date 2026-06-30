import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase/config'
import { useNotifications } from './hooks/useNotifications'
import Login from './pages/Login'
import AppShell from './components/AppShell'

export const UserContext = createContext(null)
export const useUser = () => useContext(UserContext)

export default function App() {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const { requestPermission, permission } = useNotifications(user?.uid) // Active onMessage partout dans l'app
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

  // Demander la permission notifications automatiquement au premier lancement en mode PWA installée
  useEffect(() => {
    if (!user) return
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (!isStandalone) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'default') return // déjà répondu (granted ou denied)
    const alreadyAsked = localStorage.getItem('lachattefc_notif_asked')
    if (alreadyAsked) return
    localStorage.setItem('lachattefc_notif_asked', '1')
    // Petit délai pour laisser l'app se charger avant de demander
    const t = setTimeout(() => { requestPermission() }, 1200)
    return () => clearTimeout(t)
  }, [user, requestPermission])

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

