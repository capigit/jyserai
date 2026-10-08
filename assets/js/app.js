// ── Config affiche ───────────────────────────────────────
const currentEvent = {
  id:         'hirde',
  label:      'HIRDE Kankalabé',
  poster: 'assets/images/posters/hirde.png',
  photoArea: { x: 748, y: 208, w: 330, h: 504, radius: 48 },
  frameHot: { left: '64.88%', top: '14.41%', width: '31.02%', height: '39.09%', radius: '13%' },
  cropRatio: 330 / 504,
  tagline:  "Prenez votre place !",
  desc:     "<strong class=\"artist\">HIRDE KANKALABÉ</strong>",
  shareText: "Je serai au HIRDE Kankalabé le 28 novembre 2026 !",
  filename:  'jyserai-hirde-kankalabe-2026',
};

const OUTPUT_MIME = 'image/png';
const OUTPUT_EXT = 'png';
const INTERMEDIATE_JPEG_QUALITY = 0.98;

let posterImg = null;
let userImg   = null;

// Crop state
let cropState = {
  x: 0, y: 0,       // translation in px (within the wrapper display)
  scale: 1,         // zoom factor
  originX: 0,       // pointer origin for drag
  originY: 0,
  startX: 0,
  startY: 0,
  lastDist: 0,      // pinch distance
  startScale: 1,
  isDragging: false,
  naturalW: 0,
  naturalH: 0,
  wrapperW: 0,
  wrapperH: 0,
};
let initialCropState = null;

// ── Init ──────────────────────────────────────────────────
window.addEventListener('load', () => {
  setupUpload();
  setupCropActions();
  loadPoster();

  document.getElementById('changeBtn').addEventListener('click', resetToUpload);
  document.getElementById('downloadBtn').addEventListener('click', downloadResult);
  document.getElementById('nativeShareBtn').addEventListener('click', nativeShare);
  document.getElementById('whatsappBtn').addEventListener('click', whatsappShare);
  document.getElementById('facebookBtn').addEventListener('click', facebookShare);

  document.getElementById('cameraBtn').addEventListener('click', () => {
    document.getElementById('cameraInput').click();
  });
  document.getElementById('cameraInput').addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  });
});

// ── Affiche ───────────────────────────────────────────────
function loadPoster() {
  const posterImgEl  = document.getElementById('posterImgEl');
  const posterLoader = document.getElementById('posterLoader');

  posterImgEl.classList.add('loading');
  posterLoader.classList.remove('hidden');
  posterImgEl.src = currentEvent.poster;

  const markPosterReady = () => {
    posterImgEl.classList.remove('loading');
    posterLoader.classList.add('hidden');
  };

  if (posterImgEl.complete && posterImgEl.naturalWidth > 0) {
    markPosterReady();
  }

  posterImg = new Image();
  posterImg.onload = markPosterReady;
  posterImg.src = currentEvent.poster;

  document.getElementById('taglineTitle').innerHTML = currentEvent.tagline;
  document.getElementById('taglineDesc').innerHTML  = currentEvent.desc;

  const fh = document.getElementById('frameHot');
  fh.style.left   = currentEvent.frameHot.left;
  fh.style.top    = currentEvent.frameHot.top;
  fh.style.width  = currentEvent.frameHot.width;
  fh.style.height = currentEvent.frameHot.height;
  fh.style.borderRadius = currentEvent.frameHot.radius;

  document.getElementById('uploadSection').hidden = false;
}

// ── Upload ────────────────────────────────────────────────
function setupUpload() {
  const zone     = document.getElementById('uploadZone');
  const input    = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectBtn');

  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
    input.value = '';
  });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Choisissez une image.');
    return;
  }

  setUploadLoading(true);

  // Read ArrayBuffer first to extract EXIF orientation
  const abReader = new FileReader();
  abReader.onload = (abEvent) => {
    const orientation = getExifOrientation(abEvent.target.result);

    const urlReader = new FileReader();
    urlReader.onload = (urlEvent) => {
      const img = new Image();
      img.onload = () => {
        setUploadLoading(false);
        if (orientation <= 1) {
          resizeAndShowCrop(img);
        } else {
          const fixed = applyOrientation(img, orientation);
          fixed.onload = () => resizeAndShowCrop(fixed);
        }
      };
      img.onerror = () => {
        setUploadLoading(false);
        showToast('Image illisible.');
      };
      img.src = urlEvent.target.result;
    };
    urlReader.onerror = () => {
      setUploadLoading(false);
      showToast('Lecture impossible.');
    };
    urlReader.readAsDataURL(file);
  };
  abReader.onerror = () => {
    setUploadLoading(false);
    showToast('Lecture impossible.');
  };
  abReader.readAsArrayBuffer(file);
}

// Parse EXIF orientation tag from JPEG ArrayBuffer
function getExifOrientation(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) return 1;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    const segLen  = view.getUint16(offset + 2, false);

    if (marker === 0xFFE1) {
      if (view.getUint32(offset + 4, false) !== 0x45786966) break; // not "Exif"
      const tiff   = offset + 10;
      const little = view.getUint16(tiff, false) === 0x4949;
      const ifd0   = tiff + view.getUint32(tiff + 4, little);
      const nTags  = view.getUint16(ifd0, little);
      for (let i = 0; i < nTags; i++) {
        const t = ifd0 + 2 + i * 12;
        if (t + 12 > view.byteLength) break;
        if (view.getUint16(t, little) === 0x0112) {
          return view.getUint16(t + 8, little);
        }
      }
      break;
    }
    if ((marker & 0xFF00) !== 0xFF00) break;
    offset += 2 + segLen;
  }
  return 1;
}

// Draw the image onto a corrected canvas and return a new Image
function applyOrientation(img, orientation) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const swap = orientation >= 5;

  canvas.width  = swap ? h : w;
  canvas.height = swap ? w : h;

  switch (orientation) {
    case 2: ctx.transform(-1,  0,  0,  1, w, 0); break;
    case 3: ctx.transform(-1,  0,  0, -1, w, h); break;
    case 4: ctx.transform( 1,  0,  0, -1, 0, h); break;
    case 5: ctx.transform( 0,  1,  1,  0, 0, 0); break;
    case 6: ctx.transform( 0,  1, -1,  0, h, 0); break;
    case 7: ctx.transform( 0, -1, -1,  0, h, w); break;
    case 8: ctx.transform( 0, -1,  1,  0, 0, w); break;
  }
  ctx.drawImage(img, 0, 0);

  const out = new Image();
  out.src = canvas.toDataURL('image/jpeg', INTERMEDIATE_JPEG_QUALITY);
  return out;
}

function setUploadLoading(isLoading) {
  document.getElementById('uploadSection').classList.toggle('is-loading', isLoading);
  document.getElementById('processingOverlay').classList.toggle('hidden', !isLoading);
  document.getElementById('selectBtn').disabled = isLoading;
  document.getElementById('cameraBtn').disabled = isLoading;
}

function focusSection(id) {
  requestAnimationFrame(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id).scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  });
}

function resizeAndShowCrop(img) {
  const MAX = 3000;
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (w <= MAX && h <= MAX) {
    showCropUI(img.src, img);
    return;
  }

  const scale  = MAX / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const resized = new Image();
  resized.onload = () => showCropUI(resized.src, resized);
  resized.src = canvas.toDataURL('image/jpeg', INTERMEDIATE_JPEG_QUALITY);
}

// ── Crop UI ───────────────────────────────────────────────
function showCropUI(dataURL, img) {
  const cropImg   = document.getElementById('cropImg');
  const wrapper   = document.getElementById('cropWrapper');

  document.getElementById('uploadSection').hidden = true;
  document.getElementById('resultSection').hidden = true;
  document.getElementById('cropSection').hidden   = false;
  focusSection('cropSection');

  // Init state
  wrapper.style.aspectRatio = String(currentEvent.cropRatio || 1);
  wrapper.style.borderRadius = currentEvent.photoArea ? '12%' : '50%';
  const wW = wrapper.clientWidth;
  const wH = wrapper.clientHeight;
  const imgRatio  = img.naturalWidth / img.naturalHeight;
  const cropRatio = currentEvent.cropRatio || 1;

  // Initial scale: cover the wrapper (same logic as drawCover)
  let initScale;
  if (imgRatio > cropRatio) {
    initScale = wH / img.naturalHeight;
  } else {
    initScale = wW / img.naturalWidth;
  }

  cropState = {
    x: (wW - img.naturalWidth  * initScale) / 2,
    y: (wH - img.naturalHeight * initScale) / 2,
    scale:     initScale,
    startX:    0, startY:    0,
    originX:   0, originY:   0,
    lastDist:  0, startScale: initScale,
    isDragging: false,
    naturalW:  img.naturalWidth,
    naturalH:  img.naturalHeight,
    wrapperW:  wW,
    wrapperH:  wH,
  };
  initialCropState = { ...cropState };

  cropImg.src = dataURL;
  userImg = img;

  applyCropTransform();
  setupCropDrag(wrapper);
  const visibleCropImg = document.getElementById('cropImg');
  visibleCropImg.classList.remove('photo-enter');
  requestAnimationFrame(() => visibleCropImg.classList.add('photo-enter'));

  // Overlay d'indication gestuelle, adapté au type d'entrée
  const hint = document.getElementById('cropGestureHint');
  const text = document.getElementById('cropGestureText');
  hint.classList.remove('fade-out');
  text.textContent = 'Glisse · Zoome si besoin';
  setTimeout(() => hint.classList.add('fade-out'), 2200);
}

function applyCropTransform() {
  const cropImg = document.getElementById('cropImg');
  cropImg.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale})`;
  cropImg.style.transformOrigin = '0 0';
}

function setupCropDrag(wrapper) {
  // Remove previous listeners by cloning
  const fresh = wrapper.cloneNode(true);
  wrapper.parentNode.replaceChild(fresh, wrapper);
  const el = document.getElementById('cropWrapper');

  // Mouse
  el.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);

  // Wheel zoom (desktop)
  el.addEventListener('wheel', onWheelZoom, { passive: false });

  // Touch
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove',  onTouchMove,  { passive: false });
  el.addEventListener('touchend',   onTouchEnd);
}

function onDragStart(e) {
  e.preventDefault();
  cropState.isDragging = true;
  cropState.originX = e.clientX;
  cropState.originY = e.clientY;
  cropState.startX  = cropState.x;
  cropState.startY  = cropState.y;
}

function onDragMove(e) {
  if (!cropState.isDragging) return;
  cropState.x = cropState.startX + (e.clientX - cropState.originX);
  cropState.y = cropState.startY + (e.clientY - cropState.originY);
  clampCrop();
  applyCropTransform();
}

function onDragEnd() {
  cropState.isDragging = false;
}

function onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    cropState.isDragging = true;
    cropState.originX = e.touches[0].clientX;
    cropState.originY = e.touches[0].clientY;
    cropState.startX  = cropState.x;
    cropState.startY  = cropState.y;
  } else if (e.touches.length === 2) {
    cropState.isDragging = false;
    cropState.lastDist   = pinchDist(e.touches);
    cropState.startScale = cropState.scale;
    cropState.originX    = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    cropState.originY    = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    cropState.startX     = cropState.x;
    cropState.startY     = cropState.y;
  }
}

function onTouchMove(e) {
  e.preventDefault();
  const wrapper = document.getElementById('cropWrapper');
  const rect    = wrapper.getBoundingClientRect();

  if (e.touches.length === 1 && cropState.isDragging) {
    cropState.x = cropState.startX + (e.touches[0].clientX - cropState.originX);
    cropState.y = cropState.startY + (e.touches[0].clientY - cropState.originY);
  } else if (e.touches.length === 2) {
    const dist  = pinchDist(e.touches);
    const ratio = dist / cropState.lastDist;
    const newScale = Math.max(
      Math.max(cropState.wrapperW / cropState.naturalW, cropState.wrapperH / cropState.naturalH),
      Math.min(cropState.startScale * ratio, 6)
    );

    // Zoom around pinch center (relative to wrapper)
    const cx = cropState.originX - rect.left;
    const cy = cropState.originY - rect.top;
    const scaleDelta = newScale / cropState.scale;
    cropState.x = cx - scaleDelta * (cx - cropState.x);
    cropState.y = cy - scaleDelta * (cy - cropState.y);
    cropState.scale = newScale;
  }

  clampCrop();
  applyCropTransform();
}

function onTouchEnd(e) {
  if (e.touches.length === 0) cropState.isDragging = false;
}

function onWheelZoom(e) {
  e.preventDefault();
  const wrapper = document.getElementById('cropWrapper');
  const rect    = wrapper.getBoundingClientRect();

  const factor   = e.deltaY < 0 ? 1.1 : 0.9;
  const minScale = Math.max(
    cropState.wrapperW / cropState.naturalW,
    cropState.wrapperH / cropState.naturalH
  );
  const newScale = Math.max(minScale, Math.min(cropState.scale * factor, 6));

  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const delta = newScale / cropState.scale;
  cropState.x = cx - delta * (cx - cropState.x);
  cropState.y = cy - delta * (cy - cropState.y);
  cropState.scale = newScale;

  clampCrop();
  applyCropTransform();
}

function zoomCrop(factor) {
  const minScale = Math.max(
    cropState.wrapperW / cropState.naturalW,
    cropState.wrapperH / cropState.naturalH
  );
  const newScale = Math.max(minScale, Math.min(cropState.scale * factor, 6));
  const cx = cropState.wrapperW / 2;
  const cy = cropState.wrapperH / 2;
  const delta = newScale / cropState.scale;
  cropState.x = cx - delta * (cx - cropState.x);
  cropState.y = cy - delta * (cy - cropState.y);
  cropState.scale = newScale;
  clampCrop();
  applyCropTransform();
}

function resetCropView() {
  if (!initialCropState) return;
  cropState = { ...initialCropState };
  applyCropTransform();
}

function pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampCrop() {
  const { scale, naturalW, naturalH, wrapperW, wrapperH } = cropState;
  const imgW = naturalW * scale;
  const imgH = naturalH * scale;
  // Image must cover the wrapper entirely
  cropState.x = Math.min(0, Math.max(wrapperW - imgW, cropState.x));
  cropState.y = Math.min(0, Math.max(wrapperH - imgH, cropState.y));
}

function setupCropActions() {
  document.getElementById('cropConfirm').addEventListener('click', () => {
    document.getElementById('cropSection').hidden = true;
    showResult();
    requestAnimationFrame(() => requestAnimationFrame(renderComposite));
  });

  document.getElementById('cropCancel').addEventListener('click', () => {
    document.getElementById('cropSection').hidden = true;
    document.getElementById('uploadSection').hidden = false;
    userImg = null;
    focusSection('uploadSection');
  });

  document.getElementById('rotateCCW').addEventListener('click', () => rotateCropImage(-90));
  document.getElementById('rotateCW').addEventListener('click',  () => rotateCropImage(90));
  document.getElementById('zoomOut').addEventListener('click', () => zoomCrop(0.9));
  document.getElementById('zoomIn').addEventListener('click', () => zoomCrop(1.12));
  document.getElementById('cropReset').addEventListener('click', resetCropView);
}

function rotateCropImage(deg) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const w = userImg.naturalWidth;
  const h = userImg.naturalHeight;

  canvas.width  = h;
  canvas.height = w;

  ctx.translate(h / 2, w / 2);
  ctx.rotate(deg * Math.PI / 180);
  ctx.drawImage(userImg, -w / 2, -h / 2);

  const rotated = new Image();
  rotated.onload = () => {
    userImg = rotated;
    showCropUI(rotated.src, rotated);
  };
  rotated.src = canvas.toDataURL('image/jpeg', INTERMEDIATE_JPEG_QUALITY);
}

// Returns the source rect in the original image coords based on crop state
function getCropSourceRect() {
  const { x, y, scale, wrapperW, wrapperH } = cropState;
  // Wrapper coords → image coords
  const srcX = -x / scale;
  const srcY = -y / scale;
  const srcW =  wrapperW / scale;
  const srcH =  wrapperH / scale;
  return { sx: srcX, sy: srcY, sw: srcW, sh: srcH };
}

// ── Rendu Canvas ──────────────────────────────────────────
function renderComposite() {
  const canvas = document.getElementById('canvas');
  const ctx    = canvas.getContext('2d');

  const draw = () => {
    canvas.width  = posterImg.naturalWidth;
    canvas.height = posterImg.naturalHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(posterImg, 0, 0);

    const area = currentEvent.photoArea;

    ctx.save();
    clipPosterPhotoArea(ctx, area);
    ctx.clip();
    drawCoverCropped(ctx, userImg, area.x, area.y, area.w, area.h);
    ctx.restore();

    hideLoading();
  };

  if (posterImg.complete && posterImg.naturalWidth > 0) draw();
  else posterImg.onload = draw;
}

function clipPosterPhotoArea(ctx, area) {
  roundedRectPath(ctx, area.x, area.y, area.w, area.h, area.radius || 0);
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Draw with crop offset from cropState
function drawCoverCropped(ctx, img, dx, dy, dw, dh) {
  const { sx, sy, sw, sh } = getCropSourceRect();
  // Map wrapper crop rect to the photo area dimensions
  const wrapperRatio = cropState.wrapperW / cropState.wrapperH;
  const areaRatio    = dw / dh;

  if (Math.abs(wrapperRatio - areaRatio) < 0.01) {
    // Same ratio - direct mapping
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  } else {
    // Fall back to cover if ratios diverge (shouldn't happen with correct wrapper aspect-ratio)
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

// ── Navigation ────────────────────────────────────────────
function showResult() {
  const result = document.getElementById('resultSection');
  result.classList.remove('is-ready');
  result.classList.add('is-generating');
  document.getElementById('loadingText').textContent = 'Génération en cours…';
  document.getElementById('uploadSection').hidden    = true;
  document.getElementById('cropSection').hidden      = true;
  document.getElementById('resultSection').hidden    = false;
  document.getElementById('loadingOverlay').classList.remove('hidden');
  focusSection('resultSection');
}

function hideLoading() {
  const result = document.getElementById('resultSection');
  result.classList.remove('is-generating');
  result.classList.add('is-ready');
  document.getElementById('loadingOverlay').classList.add('hidden');
  document.getElementById('resultActions').hidden = false;
  updateNativeShareAvailability();
}

function setResultBusy(isBusy, message = 'Préparation de l’image…') {
  const overlay = document.getElementById('loadingOverlay');
  const actions = document.getElementById('resultActions');
  document.getElementById('loadingText').textContent = message;
  overlay.classList.toggle('hidden', !isBusy);
  actions.classList.toggle('is-busy', isBusy);
  actions.querySelectorAll('button').forEach((button) => {
    button.disabled = isBusy;
  });
}

function resetToUpload() {
  userImg = null;
  document.getElementById('resultSection').hidden  = true;
  document.getElementById('resultActions').hidden  = true;
  document.getElementById('cropSection').hidden    = true;
  document.getElementById('uploadSection').hidden  = false;
  setResultBusy(false);
  document.getElementById('loadingText').textContent = 'En attente d\'une image…';
  const canvas = document.getElementById('canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  focusSection('uploadSection');
}

function flashAction(id) {
  const button = document.getElementById(id);
  button.classList.remove('is-confirmed');
  void button.offsetWidth;
  button.classList.add('is-confirmed');
}

function canvasToOutputBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), OUTPUT_MIME);
  });
}

function updateNativeShareAvailability() {
  const button = document.getElementById('nativeShareBtn');
  const canShare = typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    window.File;
  button.hidden = !canShare;
}

async function getOutputFile() {
  const canvas = document.getElementById('canvas');
  const blob = await canvasToOutputBlob(canvas);
  if (!blob) return null;
  return new File([blob], `${currentEvent.filename}.${OUTPUT_EXT}`, { type: OUTPUT_MIME });
}

async function nativeShare() {
  setResultBusy(true, 'Préparation du partage…');
  try {
    const file = await getOutputFile();
    if (!file) {
      showToast('Préparation impossible.');
      return;
    }

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "J'y Serai - HIRDE Kankalabé 2026",
        text: currentEvent.shareText,
      });
      flashAction('nativeShareBtn');
      showToast('Partagé avec succès !');
    } else {
      downloadFallback(file);
      showToast('Image téléchargée.');
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('Partage impossible.');
  } finally {
    setResultBusy(false);
  }
}

// ── WhatsApp ──────────────────────────────────────────────
async function whatsappShare() {
  const canvas   = document.getElementById('canvas');
  const isMobile = navigator.maxTouchPoints > 1 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  setResultBusy(true, 'Préparation du partage…');
  try {
    const blob = await canvasToOutputBlob(canvas);
    if (!blob) {
      showToast('Préparation impossible.');
      return;
    }

    const file = new File([blob], `${currentEvent.filename}.${OUTPUT_EXT}`, { type: OUTPUT_MIME });

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Mobile : partage natif (WhatsApp en tête de liste)
      try {
        await navigator.share({
          files: [file],
          title: "J'y Serai - HIRDE Kankalabé 2026",
          text: currentEvent.shareText,
        });
        flashAction('whatsappBtn');
        showToast('Partagé avec succès !');
      } catch (err) {
        if (err.name !== 'AbortError') downloadFallback(blob);
      }
    } else {
      // Desktop : télécharger + ouvrir WhatsApp Web avec texte pré-rempli
      downloadFallback(blob);
      const text = encodeURIComponent(currentEvent.shareText);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  } finally {
    setResultBusy(false);
  }
}

// ── Facebook ──────────────────────────────────────────────
async function facebookShare() {
  const canvas   = document.getElementById('canvas');
  const isMobile = navigator.maxTouchPoints > 1 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  setResultBusy(true, 'Préparation du partage…');
  try {
    const blob = await canvasToOutputBlob(canvas);
    if (!blob) {
      showToast('Préparation impossible.');
      return;
    }

    const file = new File([blob], `${currentEvent.filename}.${OUTPUT_EXT}`, { type: OUTPUT_MIME });

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "J'y Serai - HIRDE Kankalabé 2026",
          text: currentEvent.shareText,
        });
        flashAction('facebookBtn');
        showToast('Partagé avec succès !');
      } catch (err) {
        if (err.name !== 'AbortError') {
          downloadFallback(blob);
          showToast('Image téléchargée ! Postez-la sur Facebook.');
        }
      }
    } else {
      downloadFallback(blob);
      window.open('https://www.facebook.com', '_blank');
    }
  } finally {
    setResultBusy(false);
  }
}

// ── Téléchargement ────────────────────────────────────────
async function downloadResult() {
  const canvas = document.getElementById('canvas');
  setResultBusy(true, 'Préparation du téléchargement…');
  try {
    const blob = await canvasToOutputBlob(canvas);
    if (!blob) {
      showToast('Téléchargement impossible.');
      return;
    }

    downloadFallback(blob);
    flashAction('downloadBtn');
  } finally {
    setResultBusy(false);
  }
}

function downloadFallback(blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${currentEvent.filename}.${OUTPUT_EXT}`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Téléchargement réussi !');
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
