// ── Config affiches ─────────────────────────────────────
const events = [
  {
    id:         'bkusa',
    label:      'Assemblée Générale BK USA',
    poster: 'assets/images/posters/bkusa.webp',
    circle:   { cx: 190, cy: 335, r: 159 },
    frameHot: { left: '5.82%', top: '33.02%', width: '59.66%', height: '59.66%' },
    tagline:  "Prenez votre place<br><span>sur l'affiche !</span>",
    desc:     "Montrez que vous serez présent à <strong class=\"artist\">l'Assemblée Générale Bhantal Kankalabé USA</strong>",
    shareText: "Je serai à l'Assemblée Générale Bhantal Kankalabé USA à New York !",
    filename:  'assemblee-generale-bkusa-2026',
    showText:  true,
    theme:     '',
  },
  {
    id:         'jyseraiBK',
    label:      "J'y Serai BK",
    poster: 'assets/images/posters/jyseraiBK.webp',
    circle:   { cx: 291, cy: 298, r: 153 },
    frameHot: { left: '25.89%', top: '27.2%', width: '57.41%', height: '57.41%' },
    tagline:  "Prenez votre place<br><span>sur l'affiche !</span>",
    desc:     "Montrez que vous serez présent à <strong class=\"artist\">l'Assemblée Générale Bhantal Kankalabé USA</strong>",
    shareText: "Je serai à l'Assemblée Générale Bhantal Kankalabé USA à New York !",
    filename:  'jyserai-bkusa-2026',
    showText:  false,
    theme:     'theme-2',
  },
];
let currentEvent = null;

const OVERLAY = {
  text: "J'y Serai",
  font: '31px Anton, Impact, "Arial Black", sans-serif',
  color: '#E0B868',
  strokeColor: '#000000',
  strokeWidth: 2,
};
const NAME_MAX_FONT_SIZE = 18;
const NAME_MIN_FONT_SIZE = 11;

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

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ── Init ──────────────────────────────────────────────────
window.addEventListener('load', () => {
  document.fonts.load('58px Anton').catch(() => {});

  setupPick();
  setupUpload();
  setupCropActions();

  document.getElementById('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.target.blur();
  });

  document.getElementById('changeBtn').addEventListener('click', resetToUpload);
  document.getElementById('downloadBtn').addEventListener('click', downloadResult);
  document.getElementById('whatsappBtn').addEventListener('click', whatsappShare);
  document.getElementById('facebookBtn').addEventListener('click', facebookShare);
  document.getElementById('backToPickBtn').addEventListener('click', goToPick);
  document.getElementById('changePosterBtn').addEventListener('click', goToPick);

  document.getElementById('nameInput').addEventListener('input', debounce(() => {
    if (!document.getElementById('resultSection').hidden && userImg) {
      renderComposite();
    }
  }, 200));
  document.getElementById('cameraBtn').addEventListener('click', () => {
    document.getElementById('cameraInput').click();
  });
  document.getElementById('cameraInput').addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  });
});

// ── Sélection d'affiche ───────────────────────────────────
function setupPick() {
  document.querySelectorAll('.pick-card').forEach((card) => {
    card.addEventListener('click', () => selectEvent(events[parseInt(card.dataset.idx)]));
  });
}

function selectEvent(event) {
  currentEvent = event;

  const posterImgEl  = document.getElementById('posterImgEl');
  const posterLoader = document.getElementById('posterLoader');

  posterImgEl.classList.add('loading');
  posterLoader.classList.remove('hidden');
  posterImgEl.src = event.poster;

  posterImg = new Image();
  posterImg.onload = () => {
    posterImgEl.classList.remove('loading');
    posterLoader.classList.add('hidden');
  };
  posterImg.src = event.poster;

  document.getElementById('taglineTitle').innerHTML = event.tagline;
  document.getElementById('taglineDesc').innerHTML  = event.desc;

  const fh = document.getElementById('frameHot');
  fh.style.left   = event.frameHot.left;
  fh.style.top    = event.frameHot.top;
  fh.style.width  = event.frameHot.width;
  fh.style.height = event.frameHot.height;

  document.querySelector('.name-field').hidden = !event.showText;
  document.getElementById('uploadSection').classList.toggle('no-text', !event.showText);
  document.documentElement.classList.toggle('theme-2', event.theme === 'theme-2');

  document.getElementById('pickSection').hidden   = true;
  document.getElementById('uploadSection').hidden = false;
}

function goToPick() {
  userImg      = null;
  hasCounted   = false;
  posterImg    = null;
  currentEvent = null;
  document.getElementById('resultSection').hidden  = true;
  document.getElementById('resultActions').hidden  = true;
  document.getElementById('cropSection').hidden    = true;
  document.getElementById('uploadSection').hidden  = true;
  document.getElementById('pickSection').hidden    = false;
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
  if (!file.type.startsWith('image/')) return;

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
      img.src = urlEvent.target.result;
    };
    urlReader.readAsDataURL(file);
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
  out.src = canvas.toDataURL('image/jpeg', 0.92);
  return out;
}

function setUploadLoading(isLoading) {
  document.getElementById('uploadSection').classList.toggle('is-loading', isLoading);
}

function resizeAndShowCrop(img) {
  const MAX = 2000;
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
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

  const resized = new Image();
  resized.onload = () => showCropUI(resized.src, resized);
  resized.src = canvas.toDataURL('image/jpeg', 0.92);
}

// ── Crop UI ───────────────────────────────────────────────
function showCropUI(dataURL, img) {
  const cropImg   = document.getElementById('cropImg');
  const wrapper   = document.getElementById('cropWrapper');

  document.getElementById('uploadSection').hidden = true;
  document.getElementById('resultSection').hidden = true;
  document.getElementById('cropSection').hidden   = false;

  // Init state
  const wW = wrapper.clientWidth;
  const wH = wrapper.clientHeight;
  const imgRatio  = img.naturalWidth / img.naturalHeight;
  const cropRatio = 1;

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

  cropImg.src = dataURL;
  userImg = img;

  applyCropTransform();
  setupCropDrag(wrapper);

  // Overlay d'indication gestuelle, adapté au type d'entrée
  const hint = document.getElementById('cropGestureHint');
  const text = document.getElementById('cropGestureText');
  hint.classList.remove('fade-out');
  text.textContent = navigator.maxTouchPoints > 1
    ? 'Glisse · Pince pour zoomer'
    : 'Glisse · Molette pour zoomer';
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
    renderComposite();
  });

  document.getElementById('cropCancel').addEventListener('click', () => {
    document.getElementById('cropSection').hidden = true;
    document.getElementById('uploadSection').hidden = false;
    userImg = null;
  });

  document.getElementById('rotateCCW').addEventListener('click', () => rotateCropImage(-90));
  document.getElementById('rotateCW').addEventListener('click',  () => rotateCropImage(90));
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
  rotated.src = canvas.toDataURL('image/jpeg', 0.92);
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

    ctx.drawImage(posterImg, 0, 0);

    const { cx, cy, r } = currentEvent.circle;
    const x = cx - r;
    const y = cy - r;
    const size = r * 2;

    ctx.save();
    circlePath(ctx, cx, cy, r);
    ctx.clip();
    drawCoverCropped(ctx, userImg, x, y, size, size);
    ctx.restore();

    drawOverlay(ctx);
    hideLoading();
  };

  if (posterImg.complete && posterImg.naturalWidth > 0) draw();
  else posterImg.onload = draw;
}

function circlePath(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
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

function drawOverlay(ctx) {
  if (!currentEvent.showText) return;
  const { cx, cy, r } = currentEvent.circle;
  const x = cx - r;
  const w = r * 2;
  const name    = document.getElementById('nameInput').value.trim().toUpperCase();

  ctx.save();
  circlePath(ctx, cx, cy, r);
  ctx.clip();

  const gradientTop = cy + r * 0.36;
  const grad = ctx.createLinearGradient(cx, gradientTop, cx, cy + r);
  grad.addColorStop(0,   'rgba(0,0,0,0)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1,   'rgba(0,0,0,0.74)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, gradientTop, w, cy + r - gradientTop);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin     = 'round';

  if (name) {
    // Prénom en blanc au-dessus
    const nameY = cy + r * 0.6;
    ctx.font        = fitCanvasText(ctx, name, w * 0.84, NAME_MAX_FONT_SIZE, NAME_MIN_FONT_SIZE);
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 3;
    ctx.strokeText(name, cx, nameY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, cx, nameY);

    // "J'y Serai" en doré en dessous
    const jyY = cy + r * 0.8;
    ctx.font          = OVERLAY.font;
    ctx.letterSpacing = '1px';
    ctx.strokeStyle   = OVERLAY.strokeColor;
    ctx.lineWidth     = OVERLAY.strokeWidth * 2;
    ctx.strokeText(OVERLAY.text, cx, jyY);
    ctx.fillStyle = OVERLAY.color;
    ctx.fillText(OVERLAY.text, cx, jyY);
    ctx.letterSpacing = '0px';
  } else {
    // Juste "J'y Serai" centré
    const textY = cy + r * 0.76;
    ctx.font          = OVERLAY.font;
    ctx.letterSpacing = '1px';
    ctx.strokeStyle   = OVERLAY.strokeColor;
    ctx.lineWidth     = OVERLAY.strokeWidth * 2;
    ctx.strokeText(OVERLAY.text, cx, textY);
    ctx.fillStyle = OVERLAY.color;
    ctx.fillText(OVERLAY.text, cx, textY);
    ctx.letterSpacing = '0px';
  }

  ctx.restore();
}

function fitCanvasText(ctx, text, maxWidth, maxFontSize, minFontSize) {
  for (let size = maxFontSize; size >= minFontSize; size--) {
    const font = `${size}px Anton, Impact, "Arial Black", sans-serif`;
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) return font;
  }
  return `${minFontSize}px Anton, Impact, "Arial Black", sans-serif`;
}

// ── Navigation ────────────────────────────────────────────
function showResult() {
  document.getElementById('loadingText').textContent = 'Génération en cours…';
  document.getElementById('uploadSection').hidden    = true;
  document.getElementById('cropSection').hidden      = true;
  document.getElementById('resultSection').hidden    = false;
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
  document.getElementById('resultActions').hidden = false;
}

function resetToUpload() {
  userImg = null;
  document.getElementById('resultSection').hidden  = true;
  document.getElementById('resultActions').hidden  = true;
  document.getElementById('cropSection').hidden    = true;
  document.getElementById('uploadSection').hidden  = false;
  document.getElementById('loadingText').textContent = 'En attente d\'une image…';
  const canvas = document.getElementById('canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ── WhatsApp ──────────────────────────────────────────────
async function whatsappShare() {
  const canvas   = document.getElementById('canvas');
  const isMobile = navigator.maxTouchPoints > 1 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], `${currentEvent.filename}.jpg`, { type: 'image/jpeg' });

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Mobile : partage natif (WhatsApp en tête de liste)
      try {
        await navigator.share({
          files: [file],
          title: "J'y Serai - BK USA 2026",
          text: currentEvent.shareText,
        });
        showToast('Partagé avec succès !');
        resetToUpload();
      } catch (err) {
        if (err.name !== 'AbortError') downloadFallback(blob);
      }
    } else {
      // Desktop : télécharger + ouvrir WhatsApp Web avec texte pré-rempli
      downloadFallback(blob);
      const text = encodeURIComponent(currentEvent.shareText);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  }, 'image/jpeg', 0.92);
}

// ── Facebook ──────────────────────────────────────────────
async function facebookShare() {
  const canvas   = document.getElementById('canvas');
  const isMobile = navigator.maxTouchPoints > 1 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], `${currentEvent.filename}.jpg`, { type: 'image/jpeg' });

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "J'y Serai - BK USA 2026",
          text: currentEvent.shareText,
        });
        showToast('Partagé avec succès !');
        resetToUpload();
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
  }, 'image/jpeg', 0.92);
}

// ── Téléchargement ────────────────────────────────────────
function downloadResult() {
  const canvas = document.getElementById('canvas');
  canvas.toBlob((blob) => downloadFallback(blob), 'image/jpeg', 0.92);
}

function downloadFallback(blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${currentEvent.filename}.jpg`;
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
