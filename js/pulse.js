/* =========================================
   GAIVEX PULSE
   Firebase Short Video Feed
========================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================
   FIREBASE CONFIG
========================================= */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBI4GN_MeKm3fwVUeiouO0Opib-5w3-iio",
  authDomain: "gaivexofficial.firebaseapp.com",
  projectId: "gaivexofficial",
  storageBucket: "gaivexofficial.firebasestorage.app",
  messagingSenderId: "908554622906",
  appId: "1:908554622906:web:93df8fa45f7d29afbfef83",
  measurementId: "G-2766CQ56K9
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================
   DOM
========================================= */

const feed =
  document.getElementById("pulseFeed");

const loading =
  document.getElementById("pulseLoading");

const empty =
  document.getElementById("pulseEmpty");


let currentUser = null;

let observer;


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(auth, async user => {

  currentUser = user;

  await loadPulses();

});


/* =========================================
   LOAD PULSES
========================================= */

async function loadPulses() {

  try {

    const pulseQuery = query(

      collection(db, "shortVideos"),

      orderBy("createdAt", "desc"),

      limit(50)

    );


    const snapshot =
      await getDocs(pulseQuery);


    loading.remove();


    if (snapshot.empty) {

      empty.classList.remove("hidden");

      return;
    }


    feed.innerHTML = "";


    snapshot.forEach(docSnap => {

      const data = docSnap.data();

      const item =
        createPulse(docSnap.id, data);

      feed.appendChild(item);

    });


    setupVideoObserver();

  } catch (error) {

    console.error(
      "Pulse loading error:",
      error
    );

    loading.innerHTML = `
      <p>Unable to load Pulses.</p>
      <small>
        Check Firebase configuration.
      </small>
    `;

  }

}


/* =========================================
   CREATE VIDEO CARD
========================================= */

function createPulse(id, data) {

  const item =
    document.createElement("article");

  item.className = "pulse-item";


  const video =
    document.createElement("video");

  video.className = "pulse-video";

  video.src =
    data.videoUrl || "";

  video.loop = true;

  video.muted = true;

  video.playsInline = true;

  video.preload = "metadata";


  /* =====================================
     PLAY BUTTON
  ===================================== */

  const playButton =
    document.createElement("button");

  playButton.className =
    "pulse-play";

  playButton.innerHTML = "▶";


  /* =====================================
     USER
  ===================================== */

  const info =
    document.createElement("div");

  info.className = "pulse-info";


  const avatar =
    data.userPhoto ||
    "https://ui-avatars.com/api/?name=GAIVEX";


  const username =
    escapeHTML(
      data.username ||
      "GAIVEX User"
    );


  const caption =
    escapeHTML(
      data.caption ||
      ""
    );


  info.innerHTML = `

    <div class="pulse-user">

      <img
        class="pulse-avatar"
        src="${avatar}"
        alt=""
      >

      <div>

        <div class="pulse-user-name">
          ${username}

          <button
            class="pulse-follow"
            type="button">
            Follow
          </button>

        </div>

      </div>

    </div>


    ${
      caption
        ? `<div class="pulse-caption">
             ${caption}
           </div>`
        : ""
    }


    <div class="pulse-views">

      ${formatNumber(data.views || 0)}
      views

    </div>

  `;


  /* =====================================
     ACTIONS
  ===================================== */

  const actions =
    document.createElement("div");

  actions.className =
    "pulse-actions";


  const liked =
    currentUser &&
    Array.isArray(data.likedBy) &&
    data.likedBy.includes(currentUser.uid);


  const saved =
    currentUser &&
    Array.isArray(data.savedBy) &&
    data.savedBy.includes(currentUser.uid);


  actions.innerHTML = `

    <button
      class="pulse-action ${
        liked ? "liked" : ""
      }"
      data-action="like">

      <span class="pulse-action-icon">
        ${liked ? "♥" : "♡"}
      </span>

      <span class="pulse-action-count">
        ${formatNumber(data.likes || 0)}
      </span>

    </button>


    <button
      class="pulse-action"
      data-action="comment">

      <span class="pulse-action-icon">
        💬
      </span>

      <span class="pulse-action-count">
        ${formatNumber(data.comments || 0)}
      </span>

    </button>


    <button
      class="pulse-action"
      data-action="share">

      <span class="pulse-action-icon">
        ↗
      </span>

      <span class="pulse-action-count">
        Share
      </span>

    </button>


    <button
      class="pulse-action ${
        saved ? "saved" : ""
      }"
      data-action="save">

      <span class="pulse-action-icon">
        ${saved ? "🔖" : "🔖"}
      </span>

      <span class="pulse-action-count">
        Save
      </span>

    </button>


    <button
      class="pulse-action"
      data-action="more">

      <span class="pulse-action-icon">
        ⋮
      </span>

    </button>

  `;


  /* =====================================
     APPEND
  ===================================== */

  item.appendChild(video);

  item.appendChild(playButton);

  item.appendChild(info);

  item.appendChild(actions);


  /* =====================================
     VIDEO TAP
  ===================================== */

  video.addEventListener(
    "click",
    () => {

      if (video.paused) {

        video.play();

        item.classList.remove(
          "paused"
        );

      } else {

        video.pause();

        item.classList.add(
          "paused"
        );

      }

    }
  );


  playButton.addEventListener(
    "click",
    () => {

      video.play();

      item.classList.remove(
        "paused"
      );

    }
  );


  /* =====================================
     ACTION EVENTS
  ===================================== */

  actions.addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          ".pulse-action"
        );


      if (!button) return;


      const action =
        button.dataset.action;


      if (action === "like") {

        await toggleLike(
          id,
          data,
          button
        );

      }


      if (action === "share") {

        sharePulse(
          data
        );

      }


      if (action === "save") {

        await toggleSave(
          id,
          data,
          button
        );

      }


      if (action === "comment") {

        location.href =
          `post-detail.html?id=${id}&type=pulse`;

      }


      if (action === "more") {

        alert(
          "More options coming soon."
        );

      }

    }
  );


  /* =====================================
     FOLLOW
  ===================================== */

  const follow =
    info.querySelector(
      ".pulse-follow"
    );


  if (follow) {

    follow.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        alert(
          "Follow system will connect with your Friends system."
        );

      }
    );

  }


  return item;

}


/* =========================================
   VIDEO OBSERVER
========================================= */

function setupVideoObserver() {

  if (observer) {

    observer.disconnect();

  }


  observer =
    new IntersectionObserver(

      entries => {

        entries.forEach(entry => {

          const video =
            entry.target
              .querySelector(
                ".pulse-video"
              );


          if (!video) return;


          if (entry.isIntersecting) {

            video
              .play()
              .catch(() => {});


            entry.target
              .classList
              .remove("paused");


            increaseView(
              entry.target
            );

          } else {

            video.pause();

          }

        });

      },

      {
        threshold: 0.75
      }

    );


  document
    .querySelectorAll(
      ".pulse-item"
    )
    .forEach(item => {

      observer.observe(item);

    });

}


/* =========================================
   VIEW COUNT
========================================= */

const viewedVideos =
  new Set();


async function increaseView(item) {

  const videoId =
    item.querySelector(
      "[data-action='like']"
    )?.closest(
      ".pulse-item"
    );


  if (!videoId) return;


  /*
    View counting can be connected
    after adding the video id to
    the DOM dataset.
  */

}


/* =========================================
   LIKE
========================================= */

async function toggleLike(
  id,
  data,
  button
) {

  if (!currentUser) {

    alert(
      "Please login first."
    );

    return;

  }


  const userId =
    currentUser.uid;


  const alreadyLiked =
    Array.isArray(data.likedBy) &&
    data.likedBy.includes(userId);


  const ref =
    doc(
      db,
      "shortVideos",
      id
    );


  try {

    if (alreadyLiked) {

      await updateDoc(
        ref,
        {
          likes: increment(-1),
          likedBy: arrayRemove(userId)
        }
      );


      data.likes =
        Math.max(
          0,
          (data.likes || 0) - 1
        );


      data.likedBy =
        data.likedBy.filter(
          uid => uid !== userId
        );


      button.classList.remove(
        "liked"
      );


      button.querySelector(
        ".pulse-action-icon"
      ).textContent = "♡";


    } else {

      await updateDoc(
        ref,
        {
          likes: increment(1),
          likedBy: arrayUnion(userId)
        }
      );


      data.likes =
        (data.likes || 0) + 1;


      data.likedBy =
        [
          ...(data.likedBy || []),
          userId
        ];


      button.classList.add(
        "liked"
      );


      button.querySelector(
        ".pulse-action-icon"
      ).textContent = "♥";

    }


    button.querySelector(
      ".pulse-action-count"
    ).textContent =
      formatNumber(
        data.likes
      );


  } catch (error) {

    console.error(
      "Like error:",
      error
    );

  }

}


/* =========================================
   SAVE
========================================= */

async function toggleSave(
  id,
  data,
  button
) {

  if (!currentUser) {

    alert(
      "Please login first."
    );

    return;

  }


  const userId =
    currentUser.uid;


  const saved =
    Array.isArray(data.savedBy) &&
    data.savedBy.includes(userId);


  const ref =
    doc(
      db,
      "shortVideos",
      id
    );


  try {

    if (saved) {

      await updateDoc(
        ref,
        {
          savedBy:
            arrayRemove(userId)
        }
      );


      data.savedBy =
        data.savedBy.filter(
          uid => uid !== userId
        );


      button.classList.remove(
        "saved"
      );


    } else {

      await updateDoc(
        ref,
        {
          savedBy:
            arrayUnion(userId)
        }
      );


      data.savedBy =
        [
          ...(data.savedBy || []),
          userId
        ];


      button.classList.add(
        "saved"
      );

    }

  } catch (error) {

    console.error(
      "Save error:",
      error
    );

  }

}


/* =========================================
   SHARE
========================================= */

async function sharePulse(data) {

  const url =
    location.origin +
    location.pathname +
    "?pulse=" +
    encodeURIComponent(
      data.videoId || ""
    );


  if (
    navigator.share
  ) {

    try {

      await navigator.share({

        title:
          "GAIVEX Pulse",

        text:
          data.caption ||
          "Check this Pulse on GAIVEX",

        url

      });

    } catch {}

  } else {

    alert(
      "Share link:\n\n" +
      url
    );

  }

}


/* =========================================
   HELPERS
========================================= */

function formatNumber(number) {

  number =
    Number(number) || 0;


  if (number >= 1000000) {

    return (
      (number / 1000000)
        .toFixed(1)
        .replace(".0", "") +
      "M"
    );

  }


  if (number >= 1000) {

    return (
      (number / 1000)
        .toFixed(1)
        .replace(".0", "") +
      "K"
    );

  }


  return number.toString();

}


function escapeHTML(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}
