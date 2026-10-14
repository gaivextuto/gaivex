/* GAIVEX — VIDEO HELPERS (videos.html / watch.html / upload-video.html) */

// ⚠️ Cloudinary: নতুন একাউন্টের cloud name + unsigned preset
export const CLOUD = { name: 'eulhhqi0', preset: 'gaivex_upload' };

// Cloudinary ফ্রি প্ল্যানে ভিডিওর সর্বোচ্চ সাইজ ১০০MB (পরে বাড়ালে শুধু এখানে বদলান)
export const MAX_BYTES = 100 * 1024 * 1024;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// থাম্বনেইল: নিজের দেওয়া ছবি, না থাকলে ভিডিওর ২ সেকেন্ডের ফ্রেম
export const thumbOf = (v) => v.thumbURL ||
  (v.videoURL || '').replace('/video/upload/', '/video/upload/so_2,w_640,h_400,c_fill,q_auto/').replace(/\.[a-z0-9]+$/i, '.jpg');

// প্লে করার URL (Cloudinary অটো কোয়ালিটি)
export const srcOf = (u) => (u || '').replace('/video/upload/', '/video/upload/q_auto/');

export function fmtDur(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}

export function fmtNum(n) {
  n = n || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export function ago(ts) {
  if (!ts || !ts.toDate) return 'just now';
  const m = Math.floor((Date.now() - ts.toDate().getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  if (m < 43200) return Math.floor(m / 1440) + 'd ago';
  return ts.toDate().toLocaleDateString();
}

export const initials = (n) => (n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const avatarHtml = (photo, name) => photo ? `<img src="${esc(photo)}" alt="" />` : esc(initials(name));

export function cardHtml(id, v) {
  return `<a class="vd-card" href="watch.html?id=${id}">
    <img src="${esc(thumbOf(v))}" alt="" loading="lazy" />
    <span class="vd-dur">${fmtDur(v.duration)}</span>
    <div class="vd-info">
      <div class="vd-title">${esc(v.title)}</div>
      <div class="vd-meta"><span class="vd-av">${avatarHtml(v.authorPhoto, v.authorName)}</span>
        <span>${esc(v.authorName || 'GAIVEX user')}</span><span>·</span><span>${fmtNum(v.views)} views</span><span>·</span><span>${ago(v.createdAt)}</span></div>
    </div></a>`;
}
