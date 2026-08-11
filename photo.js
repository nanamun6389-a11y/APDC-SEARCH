import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
storage.maxUploadRetryTime = 15000;
storage.maxOperationRetryTime = 15000;

const DB_PATH = "photoGallery";
const STORAGE_FOLDER = "apdc-media";
const UPLOAD_PASSWORD = "fill0070";
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.86;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const grid = document.getElementById("publicPhotoGrid");
const loading = document.getElementById("galleryLoading");
const empty = document.getElementById("galleryEmpty");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxVideo = document.getElementById("lightboxVideo");
const lightboxCaption = document.getElementById("lightboxCaption");
const uploadPanel = document.getElementById("uploadPanel");
const passwordGate = document.getElementById("uploadPasswordGate");
const uploadControls = document.getElementById("uploadControls");
const passwordInput = document.getElementById("galleryPassword");
const passwordMessage = document.getElementById("passwordMessage");
const fileInput = document.getElementById("galleryFiles");
const captionInput = document.getElementById("galleryCaption");
const uploadBtn = document.getElementById("galleryUploadBtn");
const selectedInfo = document.getElementById("selectedInfo");
const uploadMsg = document.getElementById("uploadMessage");
const progressWrap = document.getElementById("uploadProgress");
const progressBar = document.getElementById("uploadProgressBar");
const selectionBar = document.getElementById("selectionBar");
const selectedCount = document.getElementById("selectedCount");

let media = [];
const selectedIds = new Set();

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function mediaUrl(item) { return item.url || item.dataUrl || ""; }
function mediaKind(item) { return item.mediaType || (item.mimeType?.startsWith("video/") ? "video" : "image"); }

onValue(ref(db, DB_PATH), snap => {
  loading.classList.add("hidden");
  const raw = snap.val() || {};
  media = Object.entries(raw).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  empty.classList.toggle("hidden", media.length !== 0);
  renderGallery();
}, () => {
  loading.textContent = "사진과 동영상을 불러오지 못했습니다.";
});

function renderGallery() {
  grid.innerHTML = media.map((item,i) => {
    const kind = mediaKind(item);
    const src = mediaUrl(item);
    const checked = selectedIds.has(item.id) ? "checked" : "";
    const selector = kind === "image" ? `
      <label class="photo-select" title="다운로드할 사진 선택">
        <input type="checkbox" data-select-id="${escapeHtml(item.id)}" ${checked}>
        <span></span>
      </label>` : "";
    if (kind === "video") {
      return `<article class="public-photo-card-wrap">
        <button class="public-photo-card video-card" type="button" data-index="${i}" aria-label="동영상 크게 보기">
          <video src="${escapeHtml(src)}" preload="metadata" muted playsinline></video>
          <span class="play-badge" aria-hidden="true">▶</span>
          ${item.caption ? `<span class="card-caption">${escapeHtml(item.caption)}</span>` : ""}
        </button>
      </article>`;
    }
    return `<article class="public-photo-card-wrap ${checked ? "is-selected" : ""}">
      ${selector}
      <button class="public-photo-card" type="button" data-index="${i}" aria-label="사진 크게 보기">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(item.caption || "APDC photo")}" loading="lazy">
        ${item.caption ? `<span class="card-caption">${escapeHtml(item.caption)}</span>` : ""}
      </button>
    </article>`;
  }).join("");

  grid.querySelectorAll(".public-photo-card").forEach(el => {
    el.onclick = () => openLightbox(media[Number(el.dataset.index)]);
  });
  grid.querySelectorAll("input[data-select-id]").forEach(cb => {
    cb.onchange = e => {
      e.stopPropagation();
      const id = cb.dataset.selectId;
      cb.checked ? selectedIds.add(id) : selectedIds.delete(id);
      cb.closest(".public-photo-card-wrap")?.classList.toggle("is-selected", cb.checked);
      updateSelectionBar();
    };
    cb.onclick = e => e.stopPropagation();
  });
  updateSelectionBar();
}

function updateSelectionBar() {
  selectedCount.textContent = selectedIds.size;
  selectionBar.classList.toggle("hidden", selectedIds.size === 0);
}
document.getElementById("clearSelection").onclick = () => {
  selectedIds.clear();
  renderGallery();
};

document.getElementById("downloadSelected").onclick = async () => {
  const btn = document.getElementById("downloadSelected");
  const chosen = media.filter(item => selectedIds.has(item.id) && mediaKind(item) === "image");
  if (!chosen.length) return;

  btn.disabled = true;
  const original = btn.textContent;
  try {
    if (!window.JSZip) throw new Error("ZIP library unavailable");
    const zip = new JSZip();
    for (let i = 0; i < chosen.length; i++) {
      btn.textContent = `다운로드 준비 ${i+1}/${chosen.length}`;
      const item = chosen[i];
      const response = await fetch(mediaUrl(item));
      if (!response.ok) throw new Error("사진 다운로드 실패");
      const blob = await response.blob();
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg","jpg").split("+")[0];
      const base = (item.originalName || `APDC_${i+1}`).replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
      zip.file(`${String(i+1).padStart(3,"0")}_${base}.${ext}`, blob);
    }
    btn.textContent = "ZIP 만드는 중...";
    const content = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `APDC_SELECTED_PHOTOS_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    console.error(err);
    alert("선택한 사진을 다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
};

function openLightbox(item) {
  const kind = mediaKind(item);
  const src = mediaUrl(item);
  lightboxImage.classList.add("hidden");
  lightboxVideo.classList.add("hidden");
  if (kind === "video") {
    lightboxVideo.src = src;
    lightboxVideo.classList.remove("hidden");
  } else {
    lightboxImage.src = src;
    lightboxImage.classList.remove("hidden");
  }
  lightboxCaption.textContent = item.caption || "";
  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxImage.src = "";
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();
  document.body.style.overflow = "";
}
document.getElementById("lightboxClose").onclick = closeLightbox;
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeLightbox(); closeUpload(); } });

function openUpload() {
  uploadPanel.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (sessionStorage.getItem("apdc_gallery_upload") === "1") {
    passwordGate.classList.add("hidden");
    uploadControls.classList.remove("hidden");
  } else {
    passwordGate.classList.remove("hidden");
    uploadControls.classList.add("hidden");
    setTimeout(() => passwordInput.focus(), 50);
  }
}
function closeUpload() {
  uploadPanel.classList.add("hidden");
  document.body.style.overflow = "";
  history.replaceState(null, "", location.pathname);
}
document.getElementById("openUpload").onclick = openUpload;
document.getElementById("scrollTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
document.getElementById("closeUpload").onclick = closeUpload;

function unlockUpload() {
  if (passwordInput.value === UPLOAD_PASSWORD) {
    sessionStorage.setItem("apdc_gallery_upload", "1");
    passwordInput.value = "";
    passwordMessage.textContent = "";
    passwordGate.classList.add("hidden");
    uploadControls.classList.remove("hidden");
  } else {
    passwordMessage.textContent = "비밀번호가 올바르지 않습니다.";
    passwordInput.value = "";
    passwordInput.focus();
  }
}
document.getElementById("unlockUpload").onclick = unlockUpload;
passwordInput.addEventListener("keydown", e => { if (e.key === "Enter") unlockUpload(); });

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

function safeName(name) {
  return (String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-100) || "file");
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
    return await new Promise((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image compression failed")), "image/jpeg", JPEG_QUALITY)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function uploadToStorage(blob, path, contentType, onProgress) {
  // Use the Firebase Storage REST upload endpoint directly here.
  // This avoids the Web SDK's long automatic retry loop in some mobile/in-app browsers.
  const bucket = firebaseConfig.storageBucket;
  const endpoint = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  onProgress?.(0.05);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": contentType || "application/octet-stream" },
      body: blob,
      signal: controller.signal,
      cache: "no-store"
    });
    const text = await response.text();
    let meta = {};
    try { meta = text ? JSON.parse(text) : {}; } catch {}

    if (!response.ok) {
      const detail = meta?.error?.message || text || `HTTP ${response.status}`;
      throw new Error(`Firebase Storage HTTP ${response.status}: ${String(detail).slice(0, 260)}`);
    }

    onProgress?.(0.9);
    const tokenRaw = meta.downloadTokens || meta.downloadToken || "";
    const token = String(tokenRaw).split(",")[0].trim();
    const encodedPath = encodeURIComponent(meta.name || path);
    const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodedPath}?alt=media`;
    const url = token ? `${baseUrl}&token=${encodeURIComponent(token)}` : baseUrl;
    onProgress?.(1);
    return { url, storagePath: meta.name || path };
  } catch (err) {
    console.error("Firebase Storage REST upload failed", err);
    if (err?.name === "AbortError") {
      throw new Error("Firebase Storage: 30초 동안 서버 응답이 없습니다. Storage 활성화/버킷 연결 상태를 확인해 주세요.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

uploadBtn.addEventListener("click", async () => {
  const files = [...fileInput.files];
  if (!files.length || sessionStorage.getItem("apdc_gallery_upload") !== "1") return;
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

      const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const path = `${STORAGE_FOLDER}/${Date.now()}_${token}_${uploadName}`;
      const result = await uploadToStorage(blob, path, contentType, ratio => {
        progressBar.style.width = `${Math.round(((done + ratio) / files.length) * 100)}%`;
      });

      const itemRef = push(ref(db, DB_PATH));
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
    uploadMsg.textContent = `${done}개 업로드 완료`;
    fileInput.value = "";
    captionInput.value = "";
    selectedInfo.textContent = "선택된 파일 없음";
  } catch (err) {
    console.error(err);
    uploadMsg.textContent = err?.message || "업로드에 실패했습니다.";
  } finally {
    fileInput.disabled = false;
    uploadBtn.disabled = !fileInput.files.length;
    setTimeout(() => progressWrap.classList.add("hidden"), 1600);
  }
});

if (location.hash === "#upload") openUpload();
