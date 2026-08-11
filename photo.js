import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const grid = document.getElementById("publicPhotoGrid");
const loading = document.getElementById("galleryLoading");
const empty = document.getElementById("galleryEmpty");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxVideo = document.getElementById("lightboxVideo");
const lightboxCaption = document.getElementById("lightboxCaption");

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function mediaUrl(item) { return item.url || item.dataUrl || ""; }
function mediaKind(item) { return item.mediaType || (item.mimeType?.startsWith("video/") ? "video" : "image"); }

onValue(ref(db, "photoGallery"), snap => {
  loading.classList.add("hidden");
  const raw = snap.val() || {};
  const media = Object.entries(raw).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  empty.classList.toggle("hidden", media.length !== 0);
  grid.innerHTML = media.map((item,i) => {
    const kind = mediaKind(item);
    const src = mediaUrl(item);
    if (kind === "video") {
      return `<button class="public-photo-card video-card" type="button" data-index="${i}" aria-label="동영상 크게 보기">
        <video src="${escapeHtml(src)}" preload="metadata" muted playsinline></video>
        <span class="play-badge" aria-hidden="true">▶</span>
        ${item.caption ? `<span class="card-caption">${escapeHtml(item.caption)}</span>` : ""}
      </button>`;
    }
    return `<button class="public-photo-card" type="button" data-index="${i}" aria-label="사진 크게 보기">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(item.caption || "APDC photo")}" loading="lazy">
      ${item.caption ? `<span class="card-caption">${escapeHtml(item.caption)}</span>` : ""}
    </button>`;
  }).join("");

  [...grid.querySelectorAll(".public-photo-card")].forEach((el,i) => {
    el.onclick = () => openLightbox(media[i]);
  });
}, () => {
  loading.textContent = "사진과 동영상을 불러오지 못했습니다.";
});

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
document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });
