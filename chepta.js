/* chepta® shared core — Firebase + Local Notifications + helpers */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, increment, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA00b2pKX1nYFPQd_Ev7twn0W-XYeU_6v8",
  authDomain: "chepta-6097c.firebaseapp.com",
  projectId: "chepta-6097c",
  storageBucket: "chepta-6097c.firebasestorage.app",
  messagingSenderId: "530068154946",
  appId: "1:530068154946:web:83b1ec53d0aa41da92dbdb",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query,
  where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
  increment, writeBatch, signOut, updateProfile, onAuthStateChanged,
};

/* ---------- tiny dom helpers ---------- */
export const $ = (id) => document.getElementById(id);
export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let toastTimer;
export function toast(text) {
  let t = $("toast");
  if (!t) { t = el("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = text; t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 2400);
}

export function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d >= today) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}
export const clock = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/* ---------- avatar ---------- */
export function avatar(user, cls = "") {
  const size = `av ${cls}`;
  let photo = user?.photoB64 || user?.avatarUrl || user?.profilePic;
  
  if (!photo && user?.uid) {
    try { photo = localStorage.getItem("chepta:avatar:" + user.uid); } catch {}
  }

  if (photo && photo.startsWith("data:image")) {
    return `<img class="${size}" src="${photo}" alt="${esc(user?.username || user?.displayName || "user")}" />`;
  }
  const letter = ((user && (user.username || user.displayName)) || "?").charAt(0).toUpperCase();
  return `<div class="${size} avph">${esc(letter)}</div>`;
}

/* ---------- global preference appliers (Theme, Font, Contrast, Motion) ---------- */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  localStorage.setItem("chepta:theme", theme || "dark");
}

export function applyFontScale(scale) {
  document.documentElement.setAttribute("data-font", scale || "md");
  localStorage.setItem("chepta:font", scale || "md");
}

export function applyContrast(enabled) {
  if (enabled) {
    document.documentElement.setAttribute("data-contrast", "true");
  } else {
    document.documentElement.removeAttribute("data-contrast");
  }
  localStorage.setItem("chepta:contrast", enabled ? "true" : "false");
}

export function applyMotion(reduce) {
  if (reduce) {
    document.documentElement.setAttribute("data-motion", "reduce");
  } else {
    document.documentElement.removeAttribute("data-motion");
  }
  localStorage.setItem("chepta:motion", reduce ? "reduce" : "no-reduce");
}

// Auto-run stored preferences instantly on script load so every page picks them up right away
applyTheme(localStorage.getItem("chepta:theme") || "dark");
applyFontScale(localStorage.getItem("chepta:font") || "md");
applyContrast(localStorage.getItem("chepta:contrast") === "true");
applyMotion(localStorage.getItem("chepta:motion") === "reduce");

/* ---------- local notifications helper (free native android status bar popups) ---------- */
export async function requestNotificationPermission() {
  const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
  if (LocalNotifications) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === "prompt") {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.warn("Local notification permission error:", e);
    }
  } else if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

export async function sendSystemNotification(title, body, chatId) {
  const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
  
  if (LocalNotifications) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title || "Chepta",
            body: body || "New message received",
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 100) },
            extra: { chatId: chatId || "" }
          }
        ]
      });
      return;
    } catch (e) {
      console.warn("Native notification error:", e);
    }
  }

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(title || "Chepta", {
        body: body || "Sent you a message",
        icon: "favicon.ico",
        badge: "favicon.ico",
        vibrate: [200, 100, 200],
        tag: chatId || "chepta_msg"
      });

      notif.onclick = () => {
        window.focus();
        if (chatId) {
          location.href = `chat.html?c=${chatId}`;
        }
        notif.close();
      };
    } catch (e) {
      console.warn("Web notification error:", e);
    }
  }
}

/* ---------- session with strict UID cache validation & suspension routing ---------- */
export let ME = null;      // firebase user
export let PROFILE = null; // firestore doc

export function requireAuth(cb) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { location.replace("index.html"); return; }
    ME = user;
    
    let profile = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        profile = snap.data();
      }
    } catch (e) {
      console.warn("Firestore fetch error, checking local cache");
    }

    const cachedAvatar = localStorage.getItem("chepta:avatar:" + user.uid) || "";

    if (!profile) {
      try {
        const cached = localStorage.getItem("chepta:me");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.uid === user.uid) {
            profile = {
              uid: user.uid,
              username: parsed.username || user.displayName || "user",
              email: user.email,
              photoB64: parsed.photoB64 || cachedAvatar,
              avatarUrl: parsed.photoB64 || cachedAvatar
            };
          }
        }
      } catch {}
    }

    if (!profile) {
      profile = {
        uid: user.uid,
        username: user.displayName || "user",
        email: user.email,
        photoB64: cachedAvatar,
        avatarUrl: cachedAvatar
      };
    }

    // SUSPENSION ROUTING
    const isSuspended = profile && (profile.suspended === true || profile.suspended === "true");
    const isBlockedPage = window.location.pathname.includes("blocked.html");

    if (isSuspended && !isBlockedPage) {
      window.location.replace("blocked.html");
      return;
    }

    if (!isSuspended && isBlockedPage) {
      window.location.replace("dashboard.html");
      return;
    }

    if (!profile.photoB64 && !profile.avatarUrl && cachedAvatar) {
      profile.photoB64 = cachedAvatar;
      profile.avatarUrl = cachedAvatar;
    }

    PROFILE = profile;
    
    // Apply global user profile preferences across all pages
    applyTheme(PROFILE.theme || localStorage.getItem("chepta:theme") || "dark");
    applyFontScale(PROFILE.fontScale || "md");
    applyContrast(PROFILE.highContrast === true);
    applyMotion(PROFILE.reduceMotion === true);

    setPresence(!isSuspended);
    requestNotificationPermission();
    cb(user, PROFILE);
  });
}

export async function setPresence(online) {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { 
      online, 
      isOnline: online,
      lastSeen: serverTimestamp() 
    });
  } catch { /* offline */ }
}

window.addEventListener("pagehide", () => { try { setPresence(false); } catch {} });
document.addEventListener("visibilitychange", () => setPresence(!document.hidden));

setInterval(() => {
  if (document.visibilityState === "visible" && auth.currentUser) {
    setPresence(true);
  }
}, 30000);

export async function logout() {
  const currentUid = auth.currentUser?.uid;
  await setPresence(false);
  await signOut(auth);
  sessionStorage.clear();
  
  localStorage.removeItem("chepta:me");
  localStorage.removeItem("chepta:chats_v2");
  if (currentUid) {
    localStorage.removeItem("chepta:avatar:" + currentUid);
  }
  
  location.replace("index.html");
}

/* ---------- users cache ---------- */
const userCache = new Map();
export async function getUser(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  const s = await getDoc(doc(db, "users", uid));
  const d = s.exists() ? s.data() : { uid, username: "unknown" };
  userCache.set(uid, d);
  return d;
}

/* ---------- chat ids ---------- */
export const dmId = (a, b) => [a, b].sort().join("__");

/* ---------- media helpers ---------- */
export function fileToImageB64(file, max = 300, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width: w, height: h } = img;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
export const blobToB64 = (blob) =>
  new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => res(r.result); r.readAsDataURL(blob); });

/* ---------- drawer + nav ---------- */
export function mountShell(active, profile) {
  const d = $("drawer"), s = $("scrim");
  const open = () => { d.classList.add("on"); s.classList.add("on"); };
  const close = () => { d.classList.remove("on"); s.classList.remove("on"); };
  $("menuBtn")?.addEventListener("click", open);
  s?.addEventListener("click", close);
  const box = $("drawerUser");
  if (box && profile) {
    box.innerHTML = `${avatar(profile)}<div class="grow"><div class="name">${esc(profile.username || profile.displayName)}</div>
      <div class="sub">${esc(profile.email || "")}</div></div>`;
  }
  $("logoutBtn")?.addEventListener("click", logout);
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.nav === active) a.classList.add("on");
  });
}

/* ---------- admin ---------- */
export const isAdmin = (p) => p && p.role === "admin";
