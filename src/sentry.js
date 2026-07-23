import * as Sentry from '@sentry/react';

export const initSentry = () => {
  Sentry.init({
    dsn: 'https://61f0adc9aaa1d53df0934c63dee418e4@o4511785221357568.ingest.de.sentry.io/4511785230467152',
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1, // 10% des transactions (pour perfs)
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreurs
  });
};

export default Sentry;
