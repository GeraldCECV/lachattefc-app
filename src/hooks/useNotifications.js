import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, VAPID_KEY } from '../firebase/config'
import { getMessaging } from 'firebase/messaging'
import app from '../firebase/config'

export function useNotifications(userId) {
  const [permission, setPermission] = useState(Notification.permission)
  const [token, setToken] = useState(null)

  // Enregistrer onMessage dès que l'app est chargée et que la permission est accordée
  useEffect(() => {
    if (Notification.permission !== 'granted') return
    try {
      const messaging = getMessaging(app)
      const unsub = onMessage(messaging, (payload) => {
        console.log('📬 payload complet:', JSON.stringify(payload))
        const title = payload.data?.title || payload.notification?.title || 'La Chatte FC'
        const body = payload.data?.body || payload.notification?.body || ''
        if (title) {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          })
        }
      })
      return () => unsub()
    } catch(e) {
      console.log('onMessage init error:', e.message)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!userId) return false
    try {
      const messaging = getMessaging(app)
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY })
      if (!fcmToken) return false
      setToken(fcmToken)

      await updateDoc(doc(db, 'joueurs', userId), {
        fcmToken,
        fcmUpdatedAt: new Date(),
      })

      return true
    } catch(e) {
      return false
    }
  }, [userId])

  return { permission, token, requestPermission }
}
