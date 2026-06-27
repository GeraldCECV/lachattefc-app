import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, VAPID_KEY } from '../firebase/config'
import { getMessaging } from 'firebase/messaging'
import app from '../firebase/config'

export function useNotifications(userId) {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const [token, setToken] = useState(null)

  // Enregistrer onMessage dès que l'app est chargée et que la permission est accordée
  useEffect(() => {
    // Sur iOS PWA, le SW gère toutes les notifications
    // onMessage foreground désactivé pour éviter le double
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
