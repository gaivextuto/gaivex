// js/push.js — GAIVEX push notifications (FCM) + in-app notification writer
import app, {
  db, doc, setDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp,
} from './firebase-init.js';
import {
  getMessaging, getToken, onMessage,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js';

const VAPID_KEY = 'BKD2mG0Om6A8mqSnd0I62Jd6FpCpIalSnmH-bFeLd9G2pPRV3dQ-kvPQt4QVQ96o9h8kcHOq61Kp0MXZ68B3ex8';

export const pushSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

// 'granted' | 'denied' | 'default' | 'unsupported'
export const pushPermission = () => (pushSupported() ? Notification.permission : 'unsupported');

// Foreground (app open) → small toast. onForeground receives the raw payload.
export const toastFromPayload = (showToast) => (payload) => {
  const n = payload.notification || {};
  showToast([n.title, n.body].filter(Boolean).join(' — '));
};

let listening = false;

async function register(uid, onForeground) {
  const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (token) await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
  if (!listening && onForeground) {
    listening = true;
    onMessage(messaging, onForeground);
  }
}

/** Call on every page after login. Silent: only works if permission was already granted. */
export async function initPush(uid, onForeground) {
  try {
    if (pushPermission() !== 'granted') return;
    await register(uid, onForeground);
  } catch (e) { console.warn('Push init failed', e); }
}

/** Call from a button tap ("Turn on notifications"). Asks permission, then registers. */
export async function askPush(uid, onForeground) {
  try {
    if (!pushSupported()) return 'unsupported';
    const perm = await Notification.requestPermission();
    if (perm === 'granted') await register(uid, onForeground);
    return perm;
  } catch (e) {
    console.warn('Push ask failed', e);
    return 'error';
  }
}

const TITLES = {
  like: 'New like ❤️',
  comment: 'New comment 💬',
  share: 'Your pulse was beamed 🔁',
  message: 'New message ✉️',
  friend_request: 'Friend request ✦',
  friend_accept: 'Friend request accepted ✦',
};

/**
 * Writes a notification doc. The Cloud Function turns it into a phone push.
 * key → makes it one-per-sender-per-item (stops like/unlike spam).
 */
export async function notify({ toUid, fromUid, fromName, type, text, link, key }) {
  try {
    if (!toUid || !fromUid || toUid === fromUid) return;
    const data = {
      toUid, fromUid,
      fromName: fromName || '',
      type,
      title: TITLES[type] || 'GAIVEX',
      body: text || `${fromName || 'Someone'} interacted with you`,
      link: new URL(link || 'notifications.html', location.href).href,
      read: false,
      createdAt: serverTimestamp(),
    };
    if (key) await setDoc(doc(db, 'notifications', `${type}_${key}_${fromUid}`), data);
    else await addDoc(collection(db, 'notifications'), data);
  } catch (e) {
    // With "key", a repeat attempt is expected to be refused by the rules — that's fine.
    console.debug('notify skipped:', e?.code || e);
  }
}
