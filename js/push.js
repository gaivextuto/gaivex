/* =====================================================================
   GAIVEX — PUSH (js/push.js)
   - initPush(user): asks permission (button), saves FCM token, shows in-app alerts
   - notify(payload): asks the Cloudflare Worker to send a push
   - notifyNewPost(id, col): notifies friends/followers (pages through recipients)
   - removePushToken(): call on logout
   ===================================================================== */
import app, { auth, db, doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from './firebase-init.js';
import {
  getMessaging, getToken, deleteToken, onMessage, isSupported,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js';

const WORKER_URL = 'https://gaivex-push.gaivex.workers.dev';
const VAPID_KEY = 'BKD2mG0Om6A8mqSnd0I62Jd6FpCpIalSnmH-bFeLd9G2pPRV3dQ-kvPQt4QVQ96o9h8kcHOq61Kp0MXZ68B3ex8';

let messaging = null;
let fgBound = false;

const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

async function getMsg() {
  if (messaging) return messaging;
  if (!(await isSupported())) return null;
  messaging = getMessaging(app);
  return messaging;
}

async function saveToken(user) {
  const m = await getMsg();
  if (!m) return false;
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return false;
  const key = 'gx_fcm_' + user.uid;
  if (ls.get(key) !== token) {
    await setDoc(doc(db, 'fcmTokens', user.uid), { tokens: arrayUnion(token), updatedAt: serverTimestamp() }, { merge: true });
    ls.set(key, token);
  }
  return true;
}

export async function removePushToken() {
  try {
    const u = auth.currentUser;
    const m = await getMsg();
    if (!u || !m) return;
    const token = ls.get('gx_fcm_' + u.uid);
    if (token) {
      await setDoc(doc(db, 'fcmTokens', u.uid), { tokens: arrayRemove(token) }, { merge: true });
      ls.del('gx_fcm_' + u.uid);
    }
    await deleteToken(m);
  } catch (e) { console.warn('removePushToken', e); }
}

/* ---------- Worker calls ---------- */
export async function notify(payload) {
  try {
    const u = auth.currentUser;
    if (!u) return null;
    const idToken = await u.getIdToken();
    const r = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idToken }),
    });
    return await r.json();
  } catch (e) {
    console.warn('notify failed', e);
    return null;
  }
}

export async function notifyNewPost(postId, col = 'posts') {
  for (let page = 0; page < 10; page++) {
    const r = await notify({ type: 'newpost', postId, col, page });
    if (!r || r.next == null) break;
  }
}

/* ---------- Permission banner + init ---------- */
function showAsk(user) {
  if (document.getElementById('gxPushAsk')) return;
  const el = document.createElement('div');
  el.id = 'gxPushAsk';
  el.style.cssText = 'position:fixed;left:12px;right:12px;max-width:536px;margin:0 auto;z-index:900;' +
    'bottom:calc(var(--nav-height,64px) + var(--safe-bottom,0px) + 12px);display:flex;gap:10px;align-items:center;' +
    'padding:12px 14px;border-radius:16px;background:rgba(16,20,44,.97);border:1px solid rgba(255,255,255,.14);' +
    'color:#f4f5ff;font:500 13px Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)';
  const t = document.createElement('span');
  t.style.flex = '1';
  t.textContent = '🔔 Get notified about calls, messages, likes, comments & new videos';
  const on = document.createElement('button');
  on.textContent = 'Enable';
  on.style.cssText = 'padding:8px 14px;border-radius:999px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;border:none';
  const x = document.createElement('button');
  x.textContent = '✕';
  x.setAttribute('aria-label', 'Dismiss');
  x.style.cssText = 'color:#9ca3af;font-size:16px;background:none;border:none;padding:4px 6px';
  on.onclick = async () => {
    try {
      const p = await Notification.requestPermission();
      if (p === 'granted') await saveToken(user);
    } catch (e) { console.warn(e); }
    el.remove();
  };
  x.onclick = () => { ls.set('gx_push_dismiss', '1'); el.remove(); };
  el.append(t, on, x);
  document.body.appendChild(el);
}

function inApp(d) {
  document.getElementById('gxInApp')?.remove();
  const el = document.createElement('div');
  el.id = 'gxInApp';
  el.style.cssText = 'position:fixed;left:12px;right:12px;max-width:536px;margin:0 auto;z-index:3000;' +
    'top:calc(10px + env(safe-area-inset-top,0px));display:flex;gap:10px;align-items:center;padding:12px 14px;' +
    'border-radius:16px;background:rgba(16,20,44,.97);border:1px solid rgba(255,255,255,.14);color:#f4f5ff;' +
    'font:500 13.5px Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)';
  const box = document.createElement('div');
  box.style.cssText = 'flex:1;min-width:0';
  const b = document.createElement('b');
  b.style.display = 'block';
  b.textContent = d.title || '';
  const s = document.createElement('span');
  s.style.cssText = 'opacity:.75;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  s.textContent = d.body || '';
  box.append(b, s);
  el.append(box);
  const go = () => { location.href = d.link || '/home.html'; };

  if (d.type === 'call') {
    const ok = document.createElement('button');
    ok.textContent = '📞';
    ok.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#22c55e;border:none;font-size:18px';
    ok.onclick = go;
    const no = document.createElement('button');
    no.textContent = '✖';
    no.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#ef4444;border:none;color:#fff;font-size:16px';
    no.onclick = () => el.remove();
    el.append(ok, no);
    try { navigator.vibrate && navigator.vibrate([400, 200, 400]); } catch {}
    setTimeout(() => el.remove(), 30000);
  } else {
    el.style.cursor = 'pointer';
    el.onclick = go;
    setTimeout(() => el.remove(), 6000);
  }
  document.body.appendChild(el);
}

async function bindForeground() {
  if (fgBound) return;
  const m = await getMsg();
  if (!m) return;
  fgBound = true;
  onMessage(m, (payload) => {
    const d = payload.data || {};
    if (d.type === 'callend') { document.getElementById('gxInApp')?.remove(); return; }
    // calls.js already shows the ringing screen on the messages page
    if (location.pathname.endsWith('messages.html') && (d.type === 'call' || d.type === 'message')) return;
    inApp(d);
  });
}

export async function initPush(user) {
  try {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    await bindForeground();
    if (Notification.permission === 'granted') {
      await saveToken(user);
    } else if (Notification.permission === 'default' && ls.get('gx_push_dismiss') !== '1') {
      showAsk(user);
    }
  } catch (e) {
    console.warn('initPush', e);
  }
}
