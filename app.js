const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// フィルター関連
const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const saturate = document.getElementById("saturate");
const grayscale = document.getElementById("grayscale");
const sepia = document.getElementById("sepia");

const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");
const saturateValue = document.getElementById("saturateValue");

const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");

// モザイク系
const modeMosaic = document.getElementById("modeMosaic");
const modeEraser = document.getElementById("modeEraser");
const brushSize = document.getElementById("brushSize");
const mosaicTypeInputs = document.querySelectorAll("input[name='mosaicType']");

let originalImage = null;
let baseWidth = 0;
let baseHeight = 0;

// フィルター適用後の「基準画像」
const baseCanvas = document.createElement("canvas");
const baseCtx = baseCanvas.getContext("2d");

// 状態
let currentMode = "mosaic";       // "mosaic" or "eraser"
let currentMosaicType = "none";   // "none" | "pixel" | "glass" | "blur"
let isDrawing = false;
let hasMosaic = false;            // モザイク・消しゴムを一度でも使ったか

// 画像読み込み
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      originalImage = img;

      const maxWidth = 800;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;

      baseWidth = img.width * scale;
      baseHeight = img.height * scale;

      canvas.width = baseWidth;
      canvas.height = baseHeight;
      baseCanvas.width = baseWidth;
      baseCanvas.height = baseHeight;

      hasMosaic = false;
      unlockFilters();
      resetControls();
      applyFilters();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// フィルター操作（スマホ対策で input + change）
[brightness, contrast, saturate, grayscale, sepia].forEach((input) => {
  ["input", "change"].forEach((eventName) => {
    input.addEventListener(eventName, () => {
      updateLabels();
      applyFilters();
    });
  });
});

function updateLabels() {
  brightnessValue.textContent = `${brightness.value}%`;
  contrastValue.textContent = `${contrast.value}%`;
  saturateValue.textContent = `${saturate.value}%`;
}

// フィルター適用
function applyFilters() {
  if (!originalImage) return;

  // 一度でもモザイク描いたらフィルターはいじらない
  if (hasMosaic) return;

  canvas.width = baseWidth;
  canvas.height = baseHeight;
  baseCanvas.width = baseWidth;
  baseCanvas.height = baseHeight;

  const filters = [
    `brightness(${brightness.value}%)`,
    `contrast(${contrast.value}%)`,
    `saturate(${saturate.value}%)`,
  ];
  if (grayscale.checked) filters.push("grayscale(1)");
  if (sepia.checked) filters.push("sepia(1)");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);

  ctx.filter = filters.join(" ");
  baseCtx.filter = filters.join(" ");

  ctx.drawImage(originalImage, 0, 0, baseWidth, baseHeight);
  baseCtx.drawImage(originalImage, 0, 0, baseWidth, baseHeight);

  ctx.filter = "none";
  baseCtx.filter = "none";
}

// リセット
resetBtn.addEventListener("click", () => {
  hasMosaic = false;
  unlockFilters();
  resetControls();
  applyFilters();
});

function resetControls() {
  brightness.value = 100;
  contrast.value = 100;
  saturate.value = 100;
  grayscale.checked = false;
  sepia.checked = false;

  // モードとモザイク種類もリセット
  currentMode = "mosaic";
  modeMosaic.classList.add("active");
  modeEraser.classList.remove("active");
  document.querySelector("input[name='mosaicType'][value='none']").checked = true;
  currentMosaicType = "none";

  brushSize.value = 40;
  updateLabels();
}

function lockFilters() {
  [brightness, contrast, saturate, grayscale, sepia].forEach((input) => {
    input.disabled = true;
  });
}
function unlockFilters() {
  [brightness, contrast, saturate, grayscale, sepia].forEach((input) => {
    input.disabled = false;
  });
}

// ダウンロード（スマホ対応）
downloadBtn.addEventListener("click", () => {
  if (!originalImage) {
    alert("先に画像を読み込んでね！");
    return;
  }
  const dataUrl = canvas.toDataURL("image/png");
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  if (isIOS) {
    window.open(dataUrl, "_blank");
    alert("画像が開いたら、長押しして『写真に追加』か『画像を保存』を選んでね！");
  } else {
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

// 初期ラベル
updateLabels();

//
// ===== モザイク＆消しゴム =====
//

// モード切り替え
modeMosaic.addEventListener("click", () => {
  currentMode = "mosaic";
  modeMosaic.classList.add("active");
  modeEraser.classList.remove("active");
});

modeEraser.addEventListener("click", () => {
  currentMode = "eraser";
  modeEraser.classList.add("active");
  modeMosaic.classList.remove("active");
});

// モザイク種類（「モザイクなし」含む）
mosaicTypeInputs.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      currentMosaicType = radio.value;
    }
  });
});

// キャンバス座標取得
function getCanvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (evt.touches && evt.touches[0]) {
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  } else {
    clientX = evt.clientX;
    clientY = evt.clientY;
  }

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

// 描画開始
function startDraw(evt) {
  if (!originalImage) return;
  isDrawing = true;
  const pos = getCanvasPos(evt);
  paintAt(pos.x, pos.y);
  evt.preventDefault();
}

// 描画中
function moveDraw(evt) {
  if (!isDrawing) return;
  const pos = getCanvasPos(evt);
  paintAt(pos.x, pos.y);
  evt.preventDefault();
}

// 描画終了
function endDraw(evt) {
  isDrawing = false;
  evt && evt.preventDefault();
}

// PC用
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);

// スマホ用
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", moveDraw, { passive: false });
canvas.addEventListener("touchend", endDraw, { passive: false });
canvas.addEventListener("touchcancel", endDraw, { passive: false });

// 実際に塗る処理
function paintAt(x, y) {
  if (!originalImage) return;

  const size = parseInt(brushSize.value, 10);
  const half = size / 2;

  let sx = Math.floor(x - half);
  let sy = Math.floor(y - half);
  let sw = size;
  let sh = size;

  // キャンバス外補正
  if (sx < 0) { sw += sx; sx = 0; }
  if (sy < 0) { sh += sy; sy = 0; }
  if (sx + sw > baseCanvas.width)  sw = baseCanvas.width - sx;
  if (sy + sh > baseCanvas.height) sh = baseCanvas.height - sy;
  if (sw <= 0 || sh <= 0) return;

  // 初回モザイク／消しゴム → フィルター固定
  if (!hasMosaic) {
    hasMosaic = true;
    lockFilters();
  }

  // === 消しゴムモード ===
  if (currentMode === "eraser") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(baseCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();
    return;
  }

  // === モザイクモード ===
  if (currentMosaicType === "none") {
    // 「モザイクなし」のときは何もしない（OFF）
    return;
  }

  if (currentMosaicType === "pixel") {
    applyPixelMosaic(sx, sy, sw, sh);
  } else if (currentMosaicType === "glass") {
    applyBlurMosaic(x, y, size, 3);  // すりガラスっぽく
  } else if (currentMosaicType === "blur") {
    applyBlurMosaic(x, y, size, 8);  // 強めぼかし
  }
}

// ドット（ピクセル）モザイク
function applyPixelMosaic(sx, sy, sw, sh) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const blockCount = 8; // 大きいほど細かく、小さいほど荒い
  const w = Math.max(1, blockCount);
  const h = Math.max(1, Math.round(blockCount * (sh / sw)));

  tempCanvas.width = w;
  tempCanvas.height = h;

  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(sx, sy, sw, sh);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, w, h, sx, sy, sw, sh);
  ctx.restore();

  ctx.imageSmoothingEnabled = true;
}

// すりガラス／ぼかしモザイク
function applyBlurMosaic(centerX, centerY, size, blurRadius) {
  const radius = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(
    baseCanvas,
    0,
    0,
    baseCanvas.width,
    baseCanvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.filter = "none";

  ctx.restore();
}

