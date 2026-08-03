import * as Sentry from '@sentry/react';

// Erreurs de transport sans intérêt : elles décrivent une connexion
// interrompue, pas un défaut de l'application. Firestore maintient une
// connexion longue durée qui se coupe dès que l'onglet est fermé, que la
// navigation change de page ou que le réseau vacille — chaque coupure
// produit alors une exception non gérée.
//
// Les laisser remonter noie les vraies erreurs : une alerte qui se déclenche
// pour du bruit finit par être ignorée le jour où elle signale un problème.
//
// Volontairement absents de cette liste : les FirebaseError de permission,
// qui traduisent une règle Firestore mal réglée et doivent toujours alerter.
const BRUIT_RESEAU = [
  'AbortError',
  'The connection was closed',
  'Failed to fetch',
  'NetworkError when attempting to fetch resource',
  'Load failed',
  'The operation was aborted',
  // Avertissement de rendu émis par certains navigateurs, sans conséquence
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
];

export const initSentry = () => {
  Sentry.init({
    dsn: 'https://61f0adc9aaa1d53df0934c63dee418e4@o4511785221357568.ingest.de.sentry.io/4511785230467152',
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1, // 10% des transactions (pour perfs)
    ignoreErrors: BRUIT_RESEAU,
  });
};

export default Sentry;
