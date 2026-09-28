/* =====================================================================
   GAIVEX — FIREBASE INIT
   এই ফাইলটাও একবারই লেখা — নতুন পেজে শুধু এভাবে ইমপোর্ট করবেন:

   <script type="module">
     import { auth, db, storage } from './js/firebase-init.js';
   </script>

   কখনো এই ফাইলে হাত দেওয়া লাগবে না, যতক্ষণ না আপনি Firebase প্রজেক্ট বদলান।
   ===================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

// আপনার আসল Firebase কনফিগ
const firebaseConfig = {
  apiKey: "AIzaSyBI4GN_MeKm3fwVUeiouO0Opib-5w3-iio",
  authDomain: "gaivexofficial.firebaseapp.com",
  projectId: "gaivexofficial",
  storageBucket: "gaivexofficial.firebasestorage.app",
  messagingSenderId: "908554622906",
  appId: "1:908554622906:web:93df8fa45f7d29afbfef83",
  measurementId: "G-2766CQ56K9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  deleteUser,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  storageRef,
  uploadBytes,
  getDownloadURL,
};

export default app;
