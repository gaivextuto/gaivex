// js/stories.js — Facebook/Instagram-style stories for GAIVEX Home
// Firestore collection: `stories` { uid, authorName, authorPhoto, type:'image'|'video'|'text', mediaURL, text, bg, createdAt }
import { db, doc, collection, query, orderBy, where, limit, onSnapshot, addDoc, deleteDoc, serverTimestamp } from './firebase-init.js';
import { showToast, uploadToCloudinary } from './app.js';

const DAY = 864e5, SLIDE = 5000;
const BGS = ['linear-gradient(135deg,#7c3aed,#ec4899)', 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'linear-gradient(135deg,#f97316,#ef4444)', 'linear-gradient(135deg,#10b981,#0ea5e9)', 'linear-gradient(135deg,#1f2937,#4b5563)'];
const $ = (s) => document.querySelector(s);
const esc = (s) => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };
const ini = (n) => (n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const av = (u, n) => u ? `<img src="${esc(u)}" alt="" draggable="false" />` : ini(n);
const ms = (ts) => (ts && ts.toMillis ? ts.toMillis() : Date.now());
const ago = (ts) => { const m = Math.floor((Date.now() - ms(ts)) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h'; };
const cld = (u, t) => u && u.includes('res.cloudinary.com') && u.includes('/upload/') && !u.includes('/upload/' + t) ? u.replace('/upload/', '/upload/' + t + '/') : u;
const seenSet = () => { try { return new Set(JSON.parse(localStorage.getItem('gaivex_seen_stories') || '[]')); } catch { return new Set(); } };
const markSeen = (id) => { try { const s = seenSet(); s.add(id); localStorage.setItem('gaivex_seen_stories', JSON.stringify([...s].slice(-300))); } catch {} };

const CSS = `
.stories{align-items:flex-start}
.story,.story *{animation:none!important}
.story{position:relative;cursor:pointer}
.story-ring{transform:none!important}
.story-ring.seen{background:var(--line-strong)}
.story-ring.none{background:rgba(255,255,255,.06);border:1px dashed var(--line-strong)}
.story-plus{position:absolute;top:40px;right:4px;width:22px;height:22px;border-radius:50%;background:var(--grad-brand);color:#fff;font-size:15px;font-weight:700;line-height:1;border:2px solid var(--bg-void,#07060d);display:flex;align-items:center;justify-content:center}
.sc,.sv{position:fixed;inset:0;z-index:3000;background:#000;color:#fff;display:none;flex-direction:column}
.sc.open,.sv.open{display:flex}
.sc input,.sc textarea{-webkit-user-select:text;user-select:text}
.sc-top{display:flex;align-items:center;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 10px}
.sc-top button{color:#fff;font-size:20px;padding:4px 8px}
.sc-share{background:var(--grad-brand);border-radius:999px;font-size:13.5px!important;font-weight:700;padding:8px 18px!important}
.sc-share[disabled]{opacity:.45;pointer-events:none}
.sc-stage{flex:1;min-height:0;position:relative;margin:4px auto;width:min(100%,420px);border-radius:16px;overflow:hidden;background:#111;display:flex;align-items:center;justify-content:center}
.sc-stage img,.sc-stage video{width:100%;height:100%;object-fit:contain}
.sc-stage textarea{position:absolute;inset:0;width:100%;height:100%;padding:24px;background:transparent;border:0;outline:0;resize:none;color:#fff;font:700 24px/1.35 Sora,sans-serif;text-align:center;display:flex;padding-top:40%}
.sc-bottom{padding:10px 16px calc(14px + env(safe-area-inset-bottom,0px));width:min(100%,420px);margin:0 auto}
.sc-bottom input{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:11px 16px;color:#fff;font-size:14px;outline:0}
.sc-bgs{display:flex;gap:10px;justify-content:center}
.sc-bgs i{width:30px;height:30px;border-radius:50%;border:2px solid transparent}
.sc-bgs i.on{border-color:#fff}
.sc-err{color:#fda4af;font-size:12.5px;text-align:center;margin-top:8px;display:none}
.sc-pick{position:fixed;inset:0;z-index:2900;background:rgba(0,0,0,.55);display:none;align-items:flex-end}
.sc-pick.open{display:flex}
.sc-pick-box{width:100%;max-width:560px;margin:0 auto;background:var(--bg-surface,#14121f);border-radius:18px 18px 0 0;padding:12px 12px calc(14px + env(safe-area-inset-bottom,0px))}
.sc-pick-box button{display:block;width:100%;text-align:left;padding:15px 12px;font-size:15px;font-weight:600;color:var(--text-primary);border-radius:12px}
.sc-pick-box button:active{background:rgba(255,255,255,.06)}
.sc-pick-box .mut{color:var(--text-muted)}
.sv-bars{display:flex;gap:4px;padding:calc(10px + env(safe-area-inset-top,0px)) 10px 0;position:relative;z-index:4}
.sv-bar{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.3);overflow:hidden}
.sv-bar i{display:block;height:100%;width:0;background:#fff}
.sv-head{display:flex;align-items:center;gap:10px;padding:10px 12px;position:relative;z-index:4}
.sv-head .pulse-avatar{width:36px;height:36px}
.sv-head a{color:#fff;text-decoration:none}
.sv-head b{font-size:14px;display:block}
.sv-head span{font-size:11.5px;opacity:.7}
.sv-head .sv-sp{flex:1}
.sv-head button{color:#fff;font-size:20px;padding:4px 8px}
.sv-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.sv-stage img,.sv-stage video{width:100%;height:100%;object-fit:contain}
.sv-text{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center;font:700 26px/1.35 Sora,sans-serif;word-break:break-word}
.sv-cap{position:absolute;left:0;right:0;bottom:0;padding:40px 18px calc(22px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,rgba(0,0,0,.75));font-size:14.5px;text-align:center;z-index:4;pointer-events:none}
.sv-tap{position:absolute;top:80px;bottom:0;z-index:3}
.sv-tap.l{left:0;width:30%}.sv-tap.r{right:0;width:70%}`;

let uid = null, user = null, me = {}, docs = [], G = [], VG = [], gi = 0, si = 0, timer = null, cs = {}, started = false;

function groups() {
  const blocked = me.blocked || [], cut = Date.now() - DAY, m = new Map(), seen = seenSet();
  for (const d of docs) {
    const p = d.data;
    if (!p.uid || blocked.includes(p.uid) || ms(p.createdAt) < cut) continue;
    if (!m.has(p.uid)) m.set(p.uid, { uid: p.uid, name: p.authorName, photo: p.authorPhoto, items: [] });
    m.get(p.uid).items.push(d);
  }
  const arr = [...m.values()];
  arr.forEach((g) => { g.unseen = g.items.some((i) => !seen.has(i.id)); g.last = ms(g.items[g.items.length - 1].data.createdAt); });
  return arr.sort((a, b) => ((b.uid === uid) - (a.uid === uid)) || (b.unseen - a.unseen) || (b.last - a.last));
}

function render() {
  G = groups();
  const el = $('#stories'); if (!el) return;
  const mine = G.find((g) => g.uid === uid);
  const ring = (g) => !g ? 'none' : g.unseen ? '' : 'seen';
  let h = `<div class="story" data-uid="${esc(uid)}"><div class="story-ring ${ring(mine)}"><div class="story-avatar">${av(user.photoURL, user.displayName || user.email)}</div></div><button class="story-plus" type="button" aria-label="Add story">+</button><span class="story-name">Your Story</span></div>`;
  G.filter((g) => g.uid !== uid).forEach((g) => {
    h += `<div class="story" data-uid="${esc(g.uid)}"><div class="story-ring ${ring(g)}"><div class="story-avatar">${av(g.photo, g.name)}</div></div><span class="story-name">${esc(g.name || 'User')}</span></div>`;
  });
  el.innerHTML = h;
}

/* ---------- Composer ---------- */
function openComp(kind, file) {
  cs = { kind, file: file || null, bg: 0 };
  const isVid = file && file.type.startsWith('video/');
  cs.type = kind === 'text' ? 'text' : isVid ? 'video' : 'image';
  const img = $('#scImg'), vid = $('#scVid'), tx = $('#scText');
  img.style.display = vid.style.display = tx.style.display = 'none';
  $('#scErr').style.display = 'none';
  tx.value = ''; $('#scCap').value = '';
  $('#scStage').style.background = '#111';
  $('#scBgs').style.display = kind === 'text' ? 'flex' : 'none';
  $('#scCap').style.display = kind === 'text' ? 'none' : 'block';
  if (kind === 'text') { tx.style.display = 'block'; setBg(0); }
  else {
    cs.url = URL.createObjectURL(file);
    if (isVid) { vid.src = cs.url; vid.style.display = 'block'; vid.play().catch(() => {}); }
    else { img.src = cs.url; img.style.display = 'block'; }
  }
  $('#scShare').disabled = kind === 'text';
  $('#scShare').textContent = 'Share';
  $('#stComp').classList.add('open');
}
function setBg(i) {
  cs.bg = i; $('#scStage').style.background = BGS[i];
  [...$('#scBgs').children].forEach((c, k) => c.classList.toggle('on', k === i));
}
function closeComp() {
  $('#stComp').classList.remove('open');
  $('#scVid').pause(); $('#scVid').removeAttribute('src');
  if (cs.url) URL.revokeObjectURL(cs.url);
  cs = {};
}
async function share() {
  const btn = $('#scShare'); btn.disabled = true; btn.textContent = 'Sharing…';
  try {
    let mediaURL = '';
    if (cs.file) mediaURL = await uploadToCloudinary(cs.file, 'gaivex/stories', 90000);
    await addDoc(collection(db, 'stories'), {
      uid, authorName: user.displayName || user.email.split('@')[0], authorPhoto: user.photoURL || '',
      type: cs.type, mediaURL,
      text: cs.kind === 'text' ? $('#scText').value.trim() : $('#scCap').value.trim(),
      bg: cs.kind === 'text' ? cs.bg : 0, createdAt: serverTimestamp(),
    });
    closeComp(); showToast('Story shared ✦');
  } catch (err) {
    console.error(err);
    const e = $('#scErr'); e.textContent = String(err?.message || 'Could not share. Try again.'); e.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Share';
  }
}

/* ---------- Viewer ---------- */
function openView(u) {
  VG = G; gi = VG.findIndex((g) => g.uid === u); if (gi < 0) return;
  const seen = seenSet(), f = VG[gi].items.findIndex((i) => !seen.has(i.id));
  si = f < 0 ? 0 : f;
  $('#stView').classList.add('open'); document.body.style.overflow = 'hidden'; show();
}
function closeView() {
  clearTimeout(timer); $('#svStage').innerHTML = '';
  $('#stView').classList.remove('open'); document.body.style.overflow = ''; render();
}
function next() { const g = VG[gi]; if (si < g.items.length - 1) { si++; show(); } else if (gi < VG.length - 1) { gi++; si = 0; show(); } else closeView(); }
function prev() { if (si > 0) { si--; show(); } else if (gi > 0) { gi--; si = 0; show(); } else show(); }
function show() {
  clearTimeout(timer);
  const g = VG[gi], it = g.items[si], p = it.data, own = g.uid === uid; markSeen(it.id);
  $('#svBars').innerHTML = g.items.map((_, i) => `<div class="sv-bar"><i style="width:${i < si ? 100 : 0}%"></i></div>`).join('');
  const fill = $('#svBars').children[si].firstElementChild;
  $('#svAv').innerHTML = av(g.photo, g.name); $('#svAv').href = $('#svName').href = `profile.html?uid=${encodeURIComponent(g.uid)}`;
  $('#svName').textContent = own ? 'Your Story' : (g.name || 'User'); $('#svTime').textContent = ago(p.createdAt);
  $('#svMenu').style.display = own ? 'block' : 'none';
  const st = $('#svStage'); st.innerHTML = '';
  const type = p.type || (p.mediaURL ? 'image' : 'text');
  const runTimer = () => {
    fill.style.transition = `width ${SLIDE}ms linear`;
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = '100%'; }));
    timer = setTimeout(next, SLIDE);
  };
  if (type === 'video') {
    const v = document.createElement('video');
    v.src = cld(p.mediaURL, 'f_auto,q_auto:eco,w_720'); v.playsInline = true; v.autoplay = true;
    v.ontimeupdate = () => { if (v.duration) fill.style.width = (v.currentTime / v.duration * 100) + '%'; };
    v.onended = next; v.onerror = () => { timer = setTimeout(next, 1500); };
    st.appendChild(v); v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  } else if (type === 'image') {
    const im = document.createElement('img'); im.src = cld(p.mediaURL, 'f_auto,q_auto,w_900'); im.draggable = false; st.appendChild(im); runTimer();
  } else {
    st.innerHTML = `<div class="sv-text" style="background:${BGS[p.bg] || BGS[0]}">${esc(p.text)}</div>`; runTimer();
  }
  const cap = $('#svCap'); cap.textContent = type === 'text' ? '' : (p.text || ''); cap.style.display = cap.textContent ? 'block' : 'none';
}
async function delStory() {
  const g = VG[gi], it = g.items[si];
  if (!confirm('Delete this story?')) return;
  clearTimeout(timer);
  try {
    await deleteDoc(doc(db, 'stories', it.id)); showToast('Story deleted');
    g.items.splice(si, 1);
    if (!g.items.length) { VG.splice(gi, 1); if (gi >= VG.length) return closeView(); si = 0; }
    else if (si >= g.items.length) si = g.items.length - 1;
    show();
  } catch (err) { console.error(err); showToast('Could not delete'); show(); }
}

/* ---------- Init ---------- */
export function initStories(u) {
  if (started || !u) return; started = true;
  user = u; uid = u.uid;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', `
<input type="file" id="stFile" accept="image/*,video/*" hidden />
<div class="sc-pick" id="stPick"><div class="sc-pick-box">
  <button data-k="media">🖼️  Photo / Video</button><button data-k="text">Aa  Text story</button><button data-k="x" class="mut">Cancel</button></div></div>
<div class="sc" id="stComp">
  <div class="sc-top"><button id="scClose" aria-label="Close">✕</button><b>New Story</b><button id="scShare" class="sc-share" disabled>Share</button></div>
  <div class="sc-stage" id="scStage"><img id="scImg" alt="" /><video id="scVid" muted loop playsinline></video><textarea id="scText" maxlength="160" placeholder="Type something…"></textarea></div>
  <div class="sc-bottom"><input id="scCap" maxlength="120" placeholder="Add a caption…" />
    <div class="sc-bgs" id="scBgs">${BGS.map((b) => `<i style="background:${b}"></i>`).join('')}</div><p class="sc-err" id="scErr"></p></div>
</div>
<div class="sv" id="stView">
  <div class="sv-bars" id="svBars"></div>
  <div class="sv-head"><a class="pulse-avatar" id="svAv"></a><div><a id="svName"><b></b></a><span id="svTime"></span></div><div class="sv-sp"></div>
    <button id="svMenu" aria-label="Delete story">🗑</button><button id="svClose" aria-label="Close">✕</button></div>
  <div class="sv-stage" id="svStage"></div><div class="sv-cap" id="svCap"></div>
  <div class="sv-tap l" id="svPrev"></div><div class="sv-tap r" id="svNext"></div>
</div>`);

  const pick = $('#stPick');
  $('#stories').addEventListener('click', (e) => {
    const s = e.target.closest('.story'); if (!s) return;
    const mine = s.dataset.uid === uid, has = G.some((g) => g.uid === uid);
    if (mine && (e.target.closest('.story-plus') || !has)) pick.classList.add('open');
    else openView(s.dataset.uid);
  });
  pick.addEventListener('click', (e) => {
    const k = e.target.closest('button')?.dataset.k;
    if (e.target === pick || k) pick.classList.remove('open');
    if (k === 'media') $('#stFile').click(); else if (k === 'text') openComp('text');
  });
  $('#stFile').addEventListener('change', (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!/^(image|video)\//.test(f.type)) return showToast('Choose a photo or video');
    if (f.type.startsWith('video/') && f.size > 60 * 1024 * 1024) showToast('That video is quite large — try one under 60MB.');
    openComp('media', f);
  });
  $('#scClose').addEventListener('click', closeComp);
  $('#scShare').addEventListener('click', share);
  $('#scText').addEventListener('input', (e) => { $('#scShare').disabled = !e.target.value.trim(); });
  $('#scBgs').addEventListener('click', (e) => { const i = [...$('#scBgs').children].indexOf(e.target); if (i >= 0) setBg(i); });
  $('#svClose').addEventListener('click', closeView);
  $('#svMenu').addEventListener('click', delStory);
  $('#svNext').addEventListener('click', next);
  $('#svPrev').addEventListener('click', prev);
  document.addEventListener('keydown', (e) => {
    if (!$('#stView').classList.contains('open')) return;
    if (e.key === 'Escape') closeView(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev();
  });

  render();
  onSnapshot(doc(db, 'users', uid), (s) => { me = s.exists() ? s.data() : {}; if (!$('#stView').classList.contains('open')) render(); }, () => {});
  onSnapshot(query(collection(db, 'stories'), where('createdAt', '>=', new Date(Date.now() - DAY)), orderBy('createdAt', 'asc'), limit(100)),
    (snap) => { docs = snap.docs.map((d) => ({ id: d.id, data: d.data() })); if (!$('#stView').classList.contains('open')) render(); },
    (err) => console.warn('Stories error:', err));
}
