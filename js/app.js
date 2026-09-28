/* =====================================================================
   GAIVEX — GLOBAL APP LOGIC
   প্রতিটা ভেতরের পেজে (home.html, spaces.html, community.html, ...)
   এই ফাইলটা import করবেন:

   <script type="module">
     import { requireAuth, logout, setActiveNav, showToast } from './js/app.js';
     requireAuth(); // লগইন না থাকলে auth.html এ পাঠিয়ে দেবে
     setActiveNav('home'); // বটম ন্যাভে সঠিক আইকন হাইলাইট করবে
   </script>

   ============================ নতুন পেজ টেমপ্লেট ========================
   নতুন কোনো পেজ (যেমন community.html) বানানোর সময় নিচের কাঠামো কপি করুন —
   index.html বা এই ফাইলে কোনো পরিবর্তন লাগবে না:

   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
     <title>GAIVEX — Community</title>
     <link rel="stylesheet" href="css/style.css">
   </head>
   <body>
     <div class="bg-cosmic"></div>
     <header class="top-bar"> ... </header>
     <main class="page"> ... </main>
     <nav class="bottom-nav"> ... </nav>

     <script type="module">
       import { requireAuth, setActiveNav } from './js/app.js';
       requireAuth();
       setActiveNav('community');
     </script>
   </body>
   </html>
   ===================================================================== */

import { auth, onAuthStateChanged, signOut } from './firebase-init.js';

const ONBOARDING_KEY = 'gaivex_onboarded';
const AUTH_PAGE = 'auth.html';
const HOME_PAGE = 'home.html';
const ONBOARDING_PAGE = 'onboarding.html';

/** Resolve once we know the current Firebase auth state (null or user). */
export function getAuthState() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

/** Call at the top of any protected page. Redirects to auth.html if not logged in. */
export async function requireAuth() {
  const user = await getAuthState();
  if (!user) {
    window.location.replace(AUTH_PAGE);
    return null;
  }
  return user;
}

/** Call at the top of auth.html / onboarding.html to bounce already-logged-in users home. */
export async function redirectIfLoggedIn() {
  const user = await getAuthState();
  if (user) {
    window.location.replace(HOME_PAGE);
  }
  return user;
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function hasOnboarded() {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export async function logout() {
  await signOut(auth);
  window.location.replace(ONBOARDING_PAGE);
}

/** Highlights the matching link in .bottom-nav by data-page attribute. */
export function setActiveNav(pageName) {
  document.querySelectorAll('.bottom-nav [data-page]').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === pageName);
  });
}

/** Lightweight toast, no markup needed on the page. */
export function showToast(message, duration = 2600) {
  let host = document.getElementById('gx-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'gx-toast-host';
    host.style.cssText = `
      position:fixed; left:50%; bottom:calc(var(--nav-height) + var(--safe-bottom) + 16px);
      transform:translateX(-50%); z-index:999; display:flex; flex-direction:column; gap:8px;
      align-items:center; pointer-events:none;
    `;
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    background:rgba(16,20,44,0.95); border:1px solid rgba(255,255,255,0.12);
    color:#f4f5ff; padding:10px 18px; border-radius:999px; font-size:13px;
    box-shadow:0 8px 24px rgba(0,0,0,0.4); backdrop-filter:blur(10px);
    opacity:0; transition:opacity .2s ease;
  `;
  host.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

export { ONBOARDING_KEY, AUTH_PAGE, HOME_PAGE, ONBOARDING_PAGE };
