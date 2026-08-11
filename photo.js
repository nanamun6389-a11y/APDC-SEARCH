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
const SPONSOR_EMAIL = "nanamun6389@gmail.com";
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
const selectAllMediaBtn = document.getElementById("selectAllMedia");
const clearMediaSelectionBtn = document.getElementById("clearMediaSelection");
const deleteSelectedMediaBtn = document.getElementById("deleteSelectedMedia");
const selectedMediaCount = document.getElementById("selectedMediaCount");
const bulkDeleteMessage = document.getElementById("bulkDeleteMessage");
const sponsorPanel = document.getElementById("sponsorPanel");
const sponsorName = document.getElementById("sponsorName");
const sponsorContact = document.getElementById("sponsorContact");
const sponsorMessage = document.getElementById("sponsorMessage");
const sponsorSubmitMessage = document.getElementById("sponsorSubmitMessage");
const sponsorRotator = document.getElementById("sponsorRotator");
const adminSponsorList = document.getElementById("adminSponsorList");
const addSponsorNameBtn = document.getElementById("addSponsorName");
const saveSponsorNamesBtn = document.getElementById("saveSponsorNames");
const sponsorAdminMessage = document.getElementById("sponsorAdminMessage");
const DEFAULT_SPONSORS = ["TOP DREAM DANCE", "RAEL", "M PROJECT", "PARK JI WOO DANCE STUDIO", "DANCEFILL ACADEMY"];
let sponsorNames = [...DEFAULT_SPONSORS];
let sponsorSlideIndex = 0;
let sponsorTimer = null;

const submitSponsor = document.getElementById("submitSponsor");
let media = [];
const selectedMediaIds = new Set();

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function mediaUrl(item) { return item.url || item.dataUrl || ""; }
function mediaKind(item) { return item.mediaType || (item.mimeType?.startsWith("video/") ? "video" : "image"); }

onValue(ref(db, DB_PATH), snap => {
  loading.classList.add("hidden");
  const raw = snap.val() || {};
  const sponsorConfig = raw._sponsors;
  sponsorNames = Array.isArray(sponsorConfig?.names) && sponsorConfig.names.length
    ? sponsorConfig.names.map(v => String(v || "").trim()).filter(Boolean)
    : [...DEFAULT_SPONSORS];
  media = Object.entries(raw)
    .filter(([id,v]) => id !== "_sponsors" && v?.kind !== "sponsorConfig")
    .map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  empty.classList.toggle("hidden", media.length !== 0);
  renderSponsorRotator();
  renderGallery();
  if (sessionStorage.getItem("apdc_gallery_upload") === "1") { renderAdminMedia(); renderAdminSponsors(); }
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

function renderSponsorRotator() {
  if (!sponsorRotator) return;
  const sponsorHtml = sponsorNames.map((name,i) => `
    <div class="sponsor-slide ${i === 0 ? "active" : ""}" aria-label="${escapeHtml(name)} sponsor">
      <span class="floating-sponsor-label">SPONSOR</span>
      <strong>${escapeHtml(name)}</strong>
      <small>APDC 2026</small>
    </div>`).join("");
  sponsorRotator.innerHTML = sponsorHtml + `
    <button id="openSponsor" class="sponsor-slide sponsor-inquiry-slide ${sponsorNames.length === 0 ? "active" : ""}" type="button" aria-label="Sponsor advertising inquiry">
      <span class="floating-sponsor-label">SPONSOR AD</span>
      <strong>ADVERTISING INQUIRY</strong>
      <small>Name · Contact</small>
    </button>`;
  document.getElementById("openSponsor").onclick = openSponsor;
    sponsorSlideIndex = 0;
  clearInterval(sponsorTimer);
  const slides = Array.from(sponsorRotator.querySelectorAll(".sponsor-slide"));
  if (slides.length > 1) {
    sponsorTimer = setInterval(() => {
      slides[sponsorSlideIndex]?.classList.remove("active");
      sponsorSlideIndex = (sponsorSlideIndex + 1) % slides.length;
      slides[sponsorSlideIndex]?.classList.add("active");
    }, 3200);
  }
}

function renderAdminSponsors() {
  if (!adminSponsorList) return;
  adminSponsorList.innerHTML = sponsorNames.map((name,i) => `
    <div class="admin-sponsor-row">
      <input type="text" maxlength="60" value="${escapeHtml(name)}" data-sponsor-index="${i}" aria-label="Sponsor name ${i+1}">
      <button type="button" class="admin-sponsor-remove" data-sponsor-remove="${i}">REMOVE</button>
    </div>`).join("");
  adminSponsorList.querySelectorAll("[data-sponsor-remove]").forEach(btn => {
    btn.onclick = () => {
      sponsorNames.splice(Number(btn.dataset.sponsorRemove), 1);
      renderAdminSponsors();
    };
  });
}

if (addSponsorNameBtn) addSponsorNameBtn.onclick = () => {
  sponsorNames.push("NEW SPONSOR");
  renderAdminSponsors();
  const inputs = adminSponsorList.querySelectorAll("input");
  const last = inputs[inputs.length - 1];
  if (last) { last.focus(); last.select(); }
};

if (saveSponsorNamesBtn) saveSponsorNamesBtn.onclick = async () => {
  const names = Array.from(adminSponsorList.querySelectorAll("input"))
    .map(input => input.value.trim().toUpperCase())
    .filter(Boolean);
  sponsorAdminMessage.textContent = "저장 중...";
  saveSponsorNamesBtn.disabled = true;
  try {
    await set(ref(db, `${DB_PATH}/_sponsors`), { kind: "sponsorConfig", names, updatedAt: Date.now() });
    sponsorNames = names;
    renderSponsorRotator();
    renderAdminSponsors();
    sponsorAdminMessage.textContent = "스폰서 목록을 저장했습니다.";
  } catch (err) {
    console.error(err);
    sponsorAdminMessage.textContent = "저장에 실패했습니다. 다시 시도해 주세요.";
  } finally {
    saveSponsorNamesBtn.disabled = false;
  }
};

function updateBulkDeleteUI() {
  const count = selectedMediaIds.size;
  if (selectedMediaCount) selectedMediaCount.textContent = `${count} SELECTED`;
  if (deleteSelectedMediaBtn) {
    deleteSelectedMediaBtn.disabled = count === 0;
    deleteSelectedMediaBtn.textContent = `DELETE SELECTED (${count})`;
  }
}

function renderAdminMedia() {
  if (!adminMediaGrid) return;
  // Remove ids that no longer exist.
  const validIds = new Set(media.map(v => v.id));
  for (const id of [...selectedMediaIds]) if (!validIds.has(id)) selectedMediaIds.delete(id);

  adminMediaCount.textContent = String(media.length);
  adminMediaEmpty.classList.toggle("hidden", media.length !== 0);
  adminMediaGrid.innerHTML = media.map(item => {
    const kind = mediaKind(item);
    const src = mediaUrl(item);
    const isSelected = selectedMediaIds.has(item.id);
    const preview = kind === "video"
      ? `<video src="${escapeHtml(src)}" preload="metadata" muted playsinline></video>`
      : `<img src="${escapeHtml(src)}" alt="APDC photo" loading="lazy">`;
    return `<button class="admin-media-item admin-selectable-media ${isSelected ? "selected" : ""}" type="button" data-media-id="${escapeHtml(item.id)}" aria-pressed="${isSelected}">
      <div class="admin-media-thumb">${preview}<span class="media-kind-badge">${kind === "video" ? "VIDEO" : "PHOTO"}</span><span class="admin-select-mark">✓</span></div>
    </button>`;
  }).join("");

  adminMediaGrid.querySelectorAll("[data-media-id]").forEach(card => {
    card.onclick = () => {
      const id = card.dataset.mediaId;
      if (selectedMediaIds.has(id)) selectedMediaIds.delete(id); else selectedMediaIds.add(id);
      card.classList.toggle("selected", selectedMediaIds.has(id));
      card.setAttribute("aria-pressed", selectedMediaIds.has(id) ? "true" : "false");
      updateBulkDeleteUI();
    };
  });
  updateBulkDeleteUI();
}

if (selectAllMediaBtn) selectAllMediaBtn.onclick = () => {
  media.forEach(item => selectedMediaIds.add(item.id));
  renderAdminMedia();
};

if (clearMediaSelectionBtn) clearMediaSelectionBtn.onclick = () => {
  selectedMediaIds.clear();
  renderAdminMedia();
};

if (deleteSelectedMediaBtn) deleteSelectedMediaBtn.onclick = async () => {
  const ids = [...selectedMediaIds];
  if (!ids.length) return;
  if (!confirm(`선택한 ${ids.length}개의 사진/동영상을 삭제할까요?`)) return;

  deleteSelectedMediaBtn.disabled = true;
  selectAllMediaBtn && (selectAllMediaBtn.disabled = true);
  clearMediaSelectionBtn && (clearMediaSelectionBtn.disabled = true);
  if (bulkDeleteMessage) bulkDeleteMessage.textContent = `0 / ${ids.length} 삭제 중...`;

  let done = 0;
  let failed = 0;
  for (const id of ids) {
    const item = media.find(v => v.id === id);
    if (!item) { selectedMediaIds.delete(id); continue; }
    try {
      await deleteStorageObject(item.storagePath);
      await remove(ref(db, `${DB_PATH}/${item.id}`));
      selectedMediaIds.delete(id);
      done++;
    } catch (err) {
      console.error("Bulk delete failed:", item.id, err);
      failed++;
    }
    if (bulkDeleteMessage) bulkDeleteMessage.textContent = `${done + failed} / ${ids.length} 삭제 중...`;
  }

  selectAllMediaBtn && (selectAllMediaBtn.disabled = false);
  clearMediaSelectionBtn && (clearMediaSelectionBtn.disabled = false);
  updateBulkDeleteUI();
  if (bulkDeleteMessage) bulkDeleteMessage.textContent = failed
    ? `${done}개 삭제 완료 · ${failed}개 실패`
    : `${done}개 삭제 완료`;
};

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

document.getElementById("closeSponsor").onclick = closeSponsor;
sponsorPanel.addEventListener("click", e => { if (e.target === sponsorPanel) closeSponsor(); });

submitSponsor.onclick = () => {
  const name = sponsorName.value.trim();
  const contact = sponsorContact.value.trim();
  const message = sponsorMessage.value.trim();
  sponsorSubmitMessage.className = "message";
  if (!name || !contact) {
    sponsorSubmitMessage.textContent = "이름과 연락처를 모두 입력해 주세요.";
    sponsorSubmitMessage.classList.add("sponsor-error");
    return;
  }

  const subject = `[APDC SPONSOR AD] ${name}`;
  const body = [
    "APDC 스폰서 광고 문의",
    "",
    `이름: ${name}`,
    `연락처: ${contact}`,
    `문의내용: ${message || "-"}`
  ].join("\n");

  sponsorSubmitMessage.textContent = "이메일 작성 화면을 여는 중입니다.";
  sponsorSubmitMessage.classList.add("sponsor-success");
  window.location.href = `mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
    renderAdminSponsors();
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
    renderAdminSponsors();
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
