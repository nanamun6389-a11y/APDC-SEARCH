import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref as dbRef, push, set, get, remove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const DB_PATH = "photoGallery";
const STORAGE_FOLDER = "apdc-media";
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.86;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const login = document.getElementById("photoLogin");
const dashboard = document.getElementById("photoDashboard");
const email = document.getElementById("photoEmail");
const pass = document.getElementById("photoPassword");
const loginMsg = document.getElementById("photoLoginMessage");
const fileInput = document.getElementById("photoFiles");
const captionInput = document.getElementById("photoCaption");
const uploadBtn = document.getElementById("uploadPhotosBtn");
const selectedInfo = document.getElementById("selectedInfo");
const uploadMsg = document.getElementById("uploadMessage");
const progressWrap = document.getElementById("uploadProgress");
const progressBar = document.getElementById("uploadProgressBar");

await setPersistence(auth, browserLocalPersistence).catch(()=>{});

function setSignedIn(user) {
  login.classList.toggle("hidden", !!user);
  dashboard.classList.toggle("hidden", !user);
  if (user) loadMedia();
}

onAuthStateChanged(auth, setSignedIn);

document.getElementById("photoLoginBtn").onclick = async () => {
  loginMsg.textContent = "SIGNING IN...";
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
    loginMsg.textContent = "";
    pass.value = "";
  } catch (err) {
    console.error(err);
    loginMsg.textContent = "LOGIN FAILED";
  }
};
pass.addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("photoLoginBtn").click();
});
document.getElementById("photoLogoutBtn").onclick = () => signOut(auth);

fileInput.addEventListener("change", () => {
  const files = [...fileInput.files];
  if (!files.length) {
    selectedInfo.textContent = "선택된 파일 없음";
    uploadBtn.disabled = true;
    return;
  }
  const images = files.filter(f => f.type.startsWith("image/")).length;
  const videos = files.filter(f => f.type.startsWith("video/")).length;
  selectedInfo.textContent = `총 ${files.length}개 선택 · 사진 ${images} · 동영상 ${videos}`;
  uploadBtn.disabled = false;
});

function formatDate(ts) {
  try { return new Intl.DateTimeFormat("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(ts)); }
  catch { return ""; }
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function safeName(name) {
  const clean = String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return clean.slice(-100) || "file";
}

async function compressImageToBlob(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    let w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", {alpha:false});
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image compression failed")), "image/jpeg", JPEG_QUALITY));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function uploadToStorage(blob, path, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const target = storageRef(storage, path);
    const task = uploadBytesResumable(target, blob, { contentType });
    task.on("state_changed", snap => {
      const ratio = snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0;
      onProgress?.(ratio);
    }, reject, async () => {
      try {
        resolve({ url: await getDownloadURL(task.snapshot.ref), storagePath: task.snapshot.ref.fullPath });
      } catch (err) { reject(err); }
    });
  });
}

uploadBtn.addEventListener("click", async () => {
  const files = [...fileInput.files];
  if (!files.length || !auth.currentUser) return;
  uploadBtn.disabled = true;
  fileInput.disabled = true;
  uploadMsg.textContent = "업로드 준비 중...";
  progressWrap.classList.remove("hidden");
  progressBar.style.width = "0%";

  let done = 0;
  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      if (isVideo && file.size > MAX_VIDEO_BYTES) throw new Error(`${file.name}: 동영상은 파일당 500MB 이하만 업로드할 수 있습니다.`);

      uploadMsg.textContent = `${index + 1} / ${files.length} · ${isVideo ? "동영상" : "사진"} 업로드 중...`;
      let blob = file;
      let contentType = file.type || (isVideo ? "video/mp4" : "image/jpeg");
      let uploadName = safeName(file.name);
      if (isImage) {
        blob = await compressImageToBlob(file);
        contentType = "image/jpeg";
        uploadName = uploadName.replace(/\.[^.]+$/, "") + ".jpg";
      }

      const token = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
      const path = `${STORAGE_FOLDER}/${Date.now()}_${token}_${uploadName}`;
      const result = await uploadToStorage(blob, path, contentType, ratio => {
        const overall = ((done + ratio) / files.length) * 100;
        progressBar.style.width = `${Math.round(overall)}%`;
      });

      const itemRef = push(dbRef(db, DB_PATH));
      await set(itemRef, {
        mediaType: isVideo ? "video" : "image",
        url: result.url,
        storagePath: result.storagePath,
        caption: captionInput.value.trim(),
        originalName: file.name || (isVideo ? "video.mp4" : "photo.jpg"),
        mimeType: contentType,
        sizeBytes: file.size || 0,
        createdAt: Date.now()
      });
      done++;
      progressBar.style.width = `${Math.round(done / files.length * 100)}%`;
    }
    uploadMsg.textContent = `${done}개의 사진/동영상을 업로드했습니다.`;
    fileInput.value = "";
    captionInput.value = "";
    selectedInfo.textContent = "선택된 파일 없음";
    await loadMedia();
  } catch (err) {
    console.error(err);
    uploadMsg.textContent = err?.message || "업로드에 실패했습니다. Firebase Storage/Database 권한을 확인해 주세요.";
  } finally {
    fileInput.disabled = false;
    uploadBtn.disabled = !fileInput.files.length;
    setTimeout(() => progressWrap.classList.add("hidden"), 1600);
  }
});

function mediaUrl(item) { return item.url || item.dataUrl || ""; }
function mediaKind(item) { return item.mediaType || (item.mimeType?.startsWith("video/") ? "video" : "image"); }

async function loadMedia() {
  const grid = document.getElementById("adminPhotoGrid");
  const empty = document.getElementById("adminEmpty");
  grid.innerHTML = '<div class="empty-state">불러오는 중...</div>';
  try {
    const snap = await get(dbRef(db, DB_PATH));
    const raw = snap.val() || {};
    const media = Object.entries(raw).map(([id, v]) => ({id, ...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    document.getElementById("photoCount").textContent = media.length;
    grid.innerHTML = "";
    empty.classList.toggle("hidden", media.length !== 0);
    media.forEach(item => {
      const kind = mediaKind(item);
      const src = mediaUrl(item);
      const card = document.createElement("article");
      card.className = "admin-photo-card";
      const preview = kind === "video"
        ? `<video src="${escapeHtml(src)}" preload="metadata" muted playsinline controls></video>`
        : `<img src="${escapeHtml(src)}" alt="APDC photo" loading="lazy">`;
      card.innerHTML = `
        <div class="admin-media-preview">${preview}<span class="media-badge">${kind === "video" ? "VIDEO" : "PHOTO"}</span></div>
        <div class="admin-photo-meta">
          <strong>${escapeHtml(item.caption || item.originalName || (kind === "video" ? "APDC VIDEO" : "APDC PHOTO"))}</strong>
          <small>${escapeHtml(formatDate(item.createdAt))}</small>
          <button type="button" class="delete-photo" data-id="${item.id}">DELETE</button>
        </div>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll(".delete-photo").forEach(btn => {
      btn.onclick = async () => {
        const item = media.find(v => v.id === btn.dataset.id);
        if (!item || !confirm(`${mediaKind(item) === "video" ? "이 동영상을" : "이 사진을"} 삭제할까요?`)) return;
        btn.disabled = true;
        try {
          if (item.storagePath) {
            try { await deleteObject(storageRef(storage, item.storagePath)); }
            catch (storageErr) { console.warn("Storage delete warning:", storageErr); }
          }
          await remove(dbRef(db, `${DB_PATH}/${btn.dataset.id}`));
          await loadMedia();
        } catch (err) {
          console.error(err);
          alert("삭제에 실패했습니다. Firebase 권한을 확인해 주세요.");
          btn.disabled = false;
        }
      };
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="empty-state">사진/동영상 목록을 불러오지 못했습니다.</div>';
  }
}

document.getElementById("refreshPhotos").onclick = loadMedia;
