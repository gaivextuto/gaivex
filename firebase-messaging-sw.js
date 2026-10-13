// Put this file next to index.html (same folder as your pages).
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBI4GN_MeKm3fwVUeiouO0Opib-5w3-iio",
  authDomain: "gaivexofficial.firebaseapp.com",
  projectId: "gaivexofficial",
  storageBucket: "gaivexofficial.firebasestorage.app",
  messagingSenderId: "908554622906",
  appId: "1:908554622906:web:93df8fa45f7d29afbfef83",
});

// Background messages that carry a "notification" payload are shown by the browser
// automatically; tapping one opens webpush.fcmOptions.link (set by the Cloud Function).
firebase.messaging();
