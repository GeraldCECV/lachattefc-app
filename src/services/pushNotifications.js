import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function savePushStatus(uid, subscription, extra = {}) {
  if (!uid) return;

  const subscribed = Boolean(
    subscription?.optedIn && subscription?.id && subscription?.token
  );

  try {
    await updateDoc(doc(db, 'joueurs', uid), {
      pushSubscribed: subscribed,
      pushOneSignalId: subscribed ? subscription.id : null,
      pushCheckedAt: new Date().toISOString(),
      pushSdkLoadFailed: false,
      pushPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
      ...extra,
    });
  } catch (error) {
    console.error('Erreur synchronisation statut OneSignal:', error);
  }
}

function currentSubscription(OneSignal) {
  const push = OneSignal.User?.PushSubscription;
  return {
    id: push?.id || null,
    token: push?.token || null,
    optedIn: push?.optedIn === true,
  };
}

async function waitForSubscription(OneSignal, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let subscription = currentSubscription(OneSignal);

  while (
    Date.now() < deadline &&
    !(subscription.optedIn && subscription.id && subscription.token)
  ) {
    await wait(250);
    subscription = currentSubscription(OneSignal);
  }

  return subscription;
}

// Répare les abonnements devenus obsolètes (notamment Chrome/Android) sans
// afficher de demande de permission intempestive : optIn n'est appelé ici que
// si le joueur avait déjà accordé la permission au navigateur.
export function synchroniserPushAuDemarrage(uid) {
  if (!uid || typeof window === 'undefined') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  let sdkStarted = false;
  const sdkTimeout = window.setTimeout(() => {
    if (!sdkStarted) {
      savePushStatus(uid, null, {
        pushSdkLoadFailed: true,
        pushLastError: window.OneSignalError || 'SDK OneSignal non chargé',
      });
    }
  }, 15000);

  window.OneSignalDeferred.push(async (OneSignal) => {
    sdkStarted = true;
    window.clearTimeout(sdkTimeout);

    try {
      await OneSignal.login(uid);

      const push = OneSignal.User?.PushSubscription;
      const syncCurrentState = (event) =>
        savePushStatus(uid, event?.current || currentSubscription(OneSignal), {
          pushLastError: null,
        });

      // Évite d'empiler des observateurs à chaque restauration de session.
      if (window.__lcfcPushSubscriptionListener && push?.removeEventListener) {
        push.removeEventListener('change', window.__lcfcPushSubscriptionListener);
      }
      window.__lcfcPushSubscriptionListener = syncCurrentState;
      push?.addEventListener?.('change', syncCurrentState);

      let subscription = currentSubscription(OneSignal);
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        !(subscription.optedIn && subscription.id && subscription.token)
      ) {
        await push?.optIn?.();
        subscription = await waitForSubscription(OneSignal);
      }

      await savePushStatus(uid, subscription, { pushLastError: null });
    } catch (error) {
      console.error('Erreur réparation abonnement OneSignal:', error);
      // Une erreur de resynchronisation ne doit pas effacer un abonnement qui
      // était encore valide au moment du contrôle.
      await savePushStatus(uid, currentSubscription(OneSignal), {
        pushLastError: error?.message || 'Erreur OneSignal inconnue',
      });
    }
  });
}
