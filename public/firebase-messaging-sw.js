// Ce service worker Firebase Cloud Messaging n'est plus utilisé — le projet
// est passé à OneSignal (voir OneSignalSDKWorker.js). Ce fichier se contente
// de se désenregistrer lui-même et de vider ses caches, pour nettoyer les
// installations existantes sur les téléphones qui l'avaient enregistré avant
// la migration.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
      const allClients = await clients.matchAll({ type: 'window' })
      allClients.forEach((client) => client.navigate(client.url))
    })()
  )
})
