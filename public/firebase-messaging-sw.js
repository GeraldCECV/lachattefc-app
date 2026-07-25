// Ce service worker Firebase Cloud Messaging n'est plus utilisé — le projet
// est passé à OneSignal (voir OneSignalSDKWorker.js). Ce fichier se contente
// de se désenregistrer lui-même et de vider ses caches, pour nettoyer les
// installations existantes sur les téléphones qui l'avaient enregistré avant
// la migration.

self.addEventListener('install', () => {
  try {
    self.skipWaiting()
  } catch (e) {
    console.error('FCM SW install error:', e)
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Vider les caches en douceur (ne pas échouer si pas de caches)
        if (typeof caches !== 'undefined') {
          try {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})))
          } catch (cacheError) {
            console.debug('Cache cleanup skipped:', cacheError)
          }
        }

        // Désenregistrer le SW
        try {
          await self.registration.unregister()
        } catch (unregError) {
          console.debug('Unregister error (normal on Safari):', unregError)
        }

        // Naviguer les clients en douceur (Safari peut pas supporter ça)
        try {
          const allClients = await clients.matchAll({ type: 'window' })
          allClients.forEach((client) => {
            try {
              if (client.navigate) {
                client.navigate(client.url)
              }
            } catch (navError) {
              console.debug('Client navigate error:', navError)
            }
          })
        } catch (clientError) {
          console.debug('Client matchAll error:', clientError)
        }
      } catch (e) {
        console.error('FCM SW activate error:', e)
        // Même si ça échoue, l'activation continue
      }
    })()
  )
})
