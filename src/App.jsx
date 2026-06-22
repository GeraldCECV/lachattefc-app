import { useState, useEffect, createContext, useContext } from 'react'
import { useNotifications } from './hooks/useNotifications'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase/config'
import Login from './pages/Login'
import AppShell from './components/AppShell'

export const UserContext = createContext(null)
export const useUser = () => useContext(UserContext)

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
