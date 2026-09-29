import { db } from './firebase-init.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

const reelsFeed = document.getElementById('reelsFeed');

// 1. Fetch Videos from Firestore
async function loadReels() {
  try {
    const q = query(collection(db, "reels"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    reelsFeed.innerHTML = ''; // Clear container

    querySnapshot.forEach((doc) => {
      const reel = doc.data();
      const reelElement = createReelElement(reel, doc.id);
      reelsFeed.appendChild(reelElement);
    });

    setupIntersectionObserver();
  } catch (error) {
    console.error("Error loading reels:", error);
  }
}

// 2. Render HTML for Each Reel
function createReelElement(data, id) {
  const div = document.createElement('div');
  div.className = 'reel-card';
  div.innerHTML = `
    <video class="reel-video" src="${data.videoUrl}" loop playsinline></video>
    <div class="reel-overlay">
      <div class="reel-user">
        <img src="${data.userPhoto || 'https://via.placeholder.com/40'}" alt="User">
        <strong>${data.userName || 'Anonymous'}</strong>
      </div>
      <p>${data.caption || ''}</p>
    </div>
    <div class="reel-actions">
      <button class="action-btn">❤️ <span>${data.likes || 0}</span></button>
      <button class="action-btn">💬 <span>${data.commentsCount || 0}</span></button>
    </div>
  `;

  // Tap to Pause/Play Toggle
  const video = div.querySelector('video');
  video.addEventListener('click', () => {
    if (video.paused) video.play();
    else video.pause();
  });

  return div;
}

// 3. Auto-Play Video on Scroll
function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('video');
      if (video) {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, { threshold: 0.8 });

  document.querySelectorAll('.reel-card').forEach(card => {
    observer.observe(card);
  });
}

// Initialize
loadReels();
