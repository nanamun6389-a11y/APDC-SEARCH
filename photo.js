import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
storage.maxUploadRetryTime = 15000;
storage.maxOperationRetryTime = 15000;

const DB_PATH = "photoGallery";
const SPONSOR_DB_PATH = "sponsorInquiries";
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
const adminMediaGrid = document.getElementById("adminMediaGrid");
const adminMediaEmpty = document.getElementById("adminMediaEmpty");
const adminMediaCount = document.getElementById("adminMediaCount");
const sponsorPanel = document.getElementById("sponsorPanel");
const sponsorName = document.getElementById("sponsorName");
const sponsorContact = document.getElementById("sponsorContact");
const sponsorMessage = document.getElementById("sponsorMessage");
const sponsorSubmitMessage = document.getElementById("sponsorSubmitMessage");
const submitSponsor = document.getElementById("submitSponsor");
const adminInquiryList = document.getElementById("adminInquiryList");
const adminInquiryEmpty = document.getElementById("adminInquiryEmpty");
const adminInquiryCount = document.getElementById("adminInquiryCount");
let media = [];
let sponsorInquiries = [];
let sponsorAdminListening = false;

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
  if (sessionStorage.getItem("apdc_gallery_upload") === "1") renderAdminMedia();
}, () => {
  loading.textContent = "사진과 동영상을 불러오지 못했습니다.";
});

async function deleteStorageObject(path) {
  if (!path) return;
  const bucket = firebaseConfig.storageBucket;
  const endpoint = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(endpoint, { method: "DELETE", signal: controller.signal, cache: "no-store" });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      let detail = text;
      try { detail = JSON.parse(text)?.error?.message || text; } catch {}
      throw new Error(`Storage 삭제 실패 (${response.status}): ${String(detail).slice(0, 180)}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function renderAdminMedia() {
  if (!adminMediaGrid) return;
  adminMediaCount.textContent = String(media.length);
  adminMediaEmpty.classList.toggle("hidden", media.length !== 0);
  adminMediaGrid.innerHTML = media.map(item => {
    const kind = mediaKind(item);
    const src = mediaUrl(item);
    const preview = kind === "video"
      ? `<video src="${escapeHtml(src)}" preload="metadata" muted playsinline></video>`
      : `<img src="${escapeHtml(src)}" alt="APDC photo" loading="lazy">`;
    return `<article class="admin-media-item">
      <div class="admin-media-thumb">${preview}<span>${kind === "video" ? "VIDEO" : "PHOTO"}</span></div>
      <button class="admin-delete-btn" type="button" data-delete-id="${escapeHtml(item.id)}">DELETE</button>
    </article>`;
  }).join("");

  adminMediaGrid.querySelectorAll(".admin-delete-btn").forEach(btn => {
    btn.onclick = async () => {
      const item = media.find(v => v.id === btn.dataset.deleteId);
      if (!item) return;
      const label = mediaKind(item) === "video" ? "이 동영상을 삭제할까요?" : "이 사진을 삭제할까요?";
      if (!confirm(label)) return;
      btn.disabled = true;
      btn.textContent = "DELETING...";
      try {
        await deleteStorageObject(item.storagePath);
        await remove(ref(db, `${DB_PATH}/${item.id}`));
      } catch (err) {
        console.error(err);
        alert(err?.message || "삭제에 실패했습니다.");
        btn.disabled = false;
        btn.textContent = "DELETE";
      }
    };
  });
}

function formatInquiryDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    }).format(new Date(value));
  } catch { return ""; }
}

function renderSponsorInquiries() {
  if (!adminInquiryList) return;
  adminInquiryCount.textContent = String(sponsorInquiries.length);
  adminInquiryEmpty.classList.toggle("hidden", sponsorInquiries.length !== 0);
  adminInquiryList.innerHTML = sponsorInquiries.map(item => `
    <article class="admin-inquiry-item">
      <div class="admin-inquiry-top">
        <div class="admin-inquiry-name">${escapeHtml(item.name || "-")}<span class="admin-inquiry-new">NEW</span></div>
        <div class="admin-inquiry-date">${escapeHtml(formatInquiryDate(item.createdAt))}</div>
      </div>
      <div class="admin-inquiry-contact">${escapeHtml(item.contact || "-")}</div>
      ${item.message ? `<div class="admin-inquiry-message">${escapeHtml(item.message)}</div>` : ""}
      <div class="admin-inquiry-actions"><button class="admin-inquiry-delete" type="button" data-inquiry-delete="${escapeHtml(item.id)}">DELETE</button></div>
    </article>`).join("");
  adminInquiryList.querySelectorAll("[data-inquiry-delete]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("이 문의를 삭제할까요?")) return;
      btn.disabled = true;
      try {
        await remove(ref(db, `${SPONSOR_DB_PATH}/${btn.dataset.inquiryDelete}`));
      } catch (err) {
        console.error(err);
        alert("문의 삭제에 실패했습니다.");
        btn.disabled = false;
      }
    };
  });
}

function startSponsorAdminListener() {
  if (sponsorAdminListening) return;
  sponsorAdminListening = true;
  onValue(ref(db, SPONSOR_DB_PATH), snap => {
    const raw = snap.val() || {};
    sponsorInquiries = Object.entries(raw)
      .map(([id, value]) => ({ id, ...value }))
      .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderSponsorInquiries();
  }, err => {
    console.error("Sponsor inquiry load failed", err);
    if (adminInquiryEmpty) {
      adminInquiryEmpty.classList.remove("hidden");
      adminInquiryEmpty.textContent = "문의 내역을 불러오지 못했습니다.";
    }
  });
}

function openSponsor() {
  sponsorPanel.classList.remove("hidden");
  sponsorSubmitMessage.textContent = "";
  sponsorSubmitMessage.className = "message";
  document.body.style.overflow = "hidden";
  setTimeout(() => sponsorName.focus(), 50);
}
function closeSponsor() {
  sponsorPanel.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("openSponsor").onclick = openSponsor;
document.getElementById("closeSponsor").onclick = closeSponsor;
sponsorPanel.addEventListener("click", e => { if (e.target === sponsorPanel) closeSponsor(); });

submitSponsor.onclick = async () => {
  const name = sponsorName.value.trim();
  const contact = sponsorContact.value.trim();
  const message = sponsorMessage.value.trim();
  sponsorSubmitMessage.className = "message";
  if (!name || !contact) {
    sponsorSubmitMessage.textContent = "이름과 연락처를 모두 입력해 주세요.";
    sponsorSubmitMessage.classList.add("sponsor-error");
    return;
  }
  submitSponsor.disabled = true;
  sponsorSubmitMessage.textContent = "보내는 중...";
  try {
    const itemRef = push(ref(db, SPONSOR_DB_PATH));
    await set(itemRef, {
      name,
      contact,
      message,
      createdAt: Date.now()
    });
    sponsorName.value = "";
    sponsorContact.value = "";
    sponsorMessage.value = "";
    sponsorSubmitMessage.textContent = "문의가 접수되었습니다. 감사합니다.";
    sponsorSubmitMessage.classList.add("sponsor-success");
  } catch (err) {
    console.error("Sponsor inquiry submit failed", err);
    sponsorSubmitMessage.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    sponsorSubmitMessage.classList.add("sponsor-error");
  } finally {
    submitSponsor.disabled = false;
  }
};

function renderGallery() {
  grid.innerHTML = media.map((item,i) => {
    const kind = mediaKind(item);
    const src = mediaUrl(item);
    if (kind === "video") {
      return `<article class="public-photo-card-wrap">
        <button class="public-photo-card video-card" type="button" data-index="${i}" aria-label="동영상 크게 보기">
          <video src="${escapeHtml(src)}" preload="metadata" muted playsinline></video>
          <span class="play-badge" aria-hidden="true">▶</span>
          ${item.caption ? `<span class="card-caption">${escapeHtml(item.caption)}</span>` : ""}
        </button>
      </article>`;
    }
    return `<article class="public-photo-card-wrap">
      <button class="public-photo-card" type="button" data-index="${i}" aria-label="사진 크게 보기">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(item.caption || "APDC photo")}" loading="lazy">
        ${item.caption ? `<span class="card-caption">${escapeHtml(item.caption)}</span>` : ""}
      </button>
    </article>`;
  }).join("");

  grid.querySelectorAll(".public-photo-card").forEach(el => {
    el.onclick = () => openLightbox(media[Number(el.dataset.index)]);
  });
}

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
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeLightbox(); closeUpload(); closeSponsor(); } });

function openUpload() {
  uploadPanel.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (sessionStorage.getItem("apdc_gallery_upload") === "1") {
    passwordGate.classList.add("hidden");
    uploadControls.classList.remove("hidden");
    renderAdminMedia();
    startSponsorAdminListener();
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
    renderAdminMedia();
    startSponsorAdminListener();
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

    // APDC watermark: use only the supplied official APDC logo image.
    const watermark = await new Promise((resolve, reject) => {
      const mark = new Image();
      mark.onload = () => resolve(mark);
      mark.onerror = () => reject(new Error("APDC watermark logo could not be loaded"));
      mark.src = "./apdc-watermark.png";
    });
    const minSide = Math.min(w, h);
    const margin = Math.max(18, Math.round(minSide * 0.035));
    const maxMarkW = Math.round(w * 0.22);
    const maxMarkH = Math.round(h * 0.16);
    const markScale = Math.min(maxMarkW / watermark.naturalWidth, maxMarkH / watermark.naturalHeight, 1);
    const markW = Math.max(1, Math.round(watermark.naturalWidth * markScale));
    const markH = Math.max(1, Math.round(watermark.naturalHeight * markScale));
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(watermark, w - margin - markW, h - margin - markH, markW, markH);
    ctx.restore();

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
