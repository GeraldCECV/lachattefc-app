import { useEffect } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, messaging, VAPID_KEY } from '../firebase/config'

export function useNotifications(userId) {
  useEffect(() => {
    if (!userId || !messaging) return

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Get FCM token
        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (!token) return

        // Save token to Firestore
        await updateDoc(doc(db, 'joueurs', userId), {
          fcmToken: token,
          fcmUpdatedAt: new Date(),
        })

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {}
          if (title && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            })
          }
        })
      } catch(e) {
        console.log('Notifications non disponibles:', e.message)
      }
    }

    // Demander après 3 secondes pour ne pas être intrusif
    const timer = setTimeout(requestPermission, 3000)
    return () => clearTimeout(timer)
  }, [userId])
}
