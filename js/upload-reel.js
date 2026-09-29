import { db, storage } from './firebase-init.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

export async function uploadReel(file, caption, currentUser) {
  if (!file) return;

  // 1. Upload Video File to Firebase Storage
  const storageRef = ref(storage, `reels/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const videoUrl = await getDownloadURL(storageRef);

  // 2. Save Reel Info in Firestore
  await addDoc(collection(db, "reels"), {
    videoUrl: videoUrl,
    caption: caption,
    userId: currentUser.uid,
    userName: currentUser.displayName,
    userPhoto: currentUser.photoURL,
    likes: 0,
    commentsCount: 0,
    createdAt: serverTimestamp()
  });

  alert("Reel uploaded successfully!");
}
