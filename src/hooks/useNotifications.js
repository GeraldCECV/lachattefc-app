import { useState, useCallback } from 'react'

export function useNotifications(userId) {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')

  // Demande la permission via OneSignal (déjà initialisé dans App.jsx).
  // Le Subscription ID est stocké automatiquement dans Firestore par le
  // listener OneSignal.User.PushSubscription "change" mis en place dans App.jsx —
  // pas besoin de token FCM ni d'écriture manuelle ici.
  const requestPermission = useCallback(async () => {
    if (!userId) return false
    if (typeof window === 'undefined') return false
    try {
      return await new Promise((resolve) => {
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async function(OneSignal) {
          try {
            await OneSignal.Notifications.requestPermission()
            const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default'
            setPermission(perm)
            resolve(perm === 'granted')
          } catch (e) {
            resolve(false)
          }
        })
      })
    } catch (e) {
      return false
    }
  }, [userId])

  return { permission, token: null, requestPermission }
}
