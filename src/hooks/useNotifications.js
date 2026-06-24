import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, VAPID_KEY } from '../firebase/config'
import { getMessaging } from 'firebase/messaging'
import app from '../firebase/config'

export function useNotifications(userId) {
  const [permission, setPermission] = useState(Notification.permission)
  const [token, setToken] = useState(null)

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

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {}
        if (title) {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          })
        }
      })

      return true
    } catch(e) {
      // console.log('Notifications error:', e.message)
      return false
    }
  }, [userId])

  return { permission, token, requestPermission }
}
