// GAIVEX — Push service worker. Put this file in the ROOT of the site (next to index.html).
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBI4GN_MeKm3fwVUeiouO0Opib-5w3-iio',
  authDomain: 'gaivexofficial.firebaseapp.com',
  projectId: 'gaivexofficial',
  messagingSenderId: '908554622906',
  appId: '1:908554622906:web:93df8fa45f7d29afbfef83',
});

const messaging = firebase.messaging();
const ICON = '/icon-192.png'; // optional: add a 192x192 logo at this path

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Data-only pushes arrive here when the site is not in the foreground
messaging.onBackgroundMessage(async (payload) => {
  const d = payload.data || {};
  const link = d.link || '/home.html';

  // Caller hung up / no answer
  if (d.type === 'callend') {
    if (d.missed === '1') {
      return self.registration.showNotification(d.title || 'Missed call', {
        body: d.body || '', tag: 'call', icon: ICON, badge: ICON, data: { link },
      });
    }
    await self.registration.showNotification('Call ended', { tag: 'call', silent: true });
    const open = await self.registration.getNotifications({ tag: 'call' });
    open.forEach((n) => n.close());
    return;
  }

  const opts = {
    body: d.body || '',
    tag: d.tag || d.type || 'gaivex',
    icon: ICON,
    badge: ICON,
    data: { link, type: d.type },
  };

  if (d.type === 'call') {
    Object.assign(opts, {
      requireInteraction: true,
      renotify: true,
      vibrate: [600, 300, 600, 300, 600, 300, 600, 300, 600],
      actions: [
        { action: 'answer', title: '📞 Answer' },
        { action: 'decline', title: '✖ Decline' },
      ],
    });
  } else if (d.type === 'message') {
    Object.assign(opts, { renotify: true, vibrate: [200, 100, 200] });
  } else {
    opts.vibrate = [120];
  }

  return self.registration.showNotification(d.title || 'GAIVEX', opts);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'decline') return;
  const link = (event.notification.data && event.notification.data.link) || '/home.html';
  const url = new URL(link, self.location.origin).href;

  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (!c.url.startsWith(self.location.origin)) continue;
      try {
        const nc = await c.navigate(url);
        if (nc) return nc.focus();
      } catch (_) { /* fall through to openWindow */ }
    }
    return self.clients.openWindow(url);
  })());
});
