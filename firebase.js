// ─────────────────────────────────────────────────────
//  firebase.js  —  Pause and Place
//  วาง firebaseConfig ของคุณตรง TODO ด้านล่าง
// ─────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBx4RWhFY2sHDFqj_j5Ax9W7sTx0j1Dyvw",
  authDomain:        "pause-and-place.firebaseapp.com",
  projectId:         "pause-and-place",
  storageBucket:     "pause-and-place.firebasestorage.app",
  messagingSenderId: "1026971746492",
  appId:             "1:1026971746492:web:ce62b33a7d71961427d0b9",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ── AUTH ──────────────────────────────────────────────

/** เปิด Google popup แล้ว return user */
export async function loginGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/** ออกจากระบบ */
export async function logout() {
  await signOut(auth);
}

/**
 * subscribe auth state
 * callback(user | null)
 * return unsubscribe fn
 */
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── USER PROFILE (nickname) ───────────────────────────

const profileRef = (uid) => doc(db, "users", uid, "profile", "data");

export async function getProfile(uid) {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? snap.data() : {};
}

export async function saveProfile(uid, data) {
  await setDoc(profileRef(uid), data, { merge: true });
}

// ── WORRIES CRUD ──────────────────────────────────────

const worryRef  = (uid, id) => doc(db, "users", uid, "worries", id);
const worriesCol = (uid)    => collection(db, "users", uid, "worries");

/**
 * บันทึก / อัปเดต worry 1 รายการ
 * worry ต้องมี field  id (string)
 */
export async function saveWorry(uid, worry) {
  await setDoc(worryRef(uid, worry.id), worry, { merge: true });
}

/**
 * โหลด worries ทั้งหมดของ user เรียงจากใหม่ → เก่า
 */
export async function loadWorries(uid) {
  const q    = query(worriesCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * ลบ worry 1 รายการ
 */
export async function deleteWorry(uid, id) {
  await deleteDoc(worryRef(uid, id));
}

/**
 * อัปเดตบาง field ของ worry (เช่น released: true)
 */
export async function patchWorry(uid, id, fields) {
  await updateDoc(worryRef(uid, id), fields);
}

/**
 * ลบ worries ทั้งหมดของ user (ใช้ batch เพื่อ atomic)
 */
export async function clearAllWorries(uid) {
  const snap  = await getDocs(worriesCol(uid));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * migrate: รับ array ของ worries จาก localStorage แล้ว
 * เขียนทั้งหมดขึ้น Firestore ใน 1 batch
 */
export async function migrateLocalToFirestore(uid, worries) {
  if (!worries.length) return;
  const batch = writeBatch(db);
  worries.forEach((w) => {
    batch.set(worryRef(uid, w.id), w, { merge: true });
  });
  await batch.commit();
}
