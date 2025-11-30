const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const modeMosaic = document.getElementById("modeMosaic");
const modeEraser = document.getElementById("modeEraser");
const brushSize = document.getElementById("brushSize");
const mosaicStrength = document.getElementById("mosaicStrength");
const mosaicTypeInputs = document.querySelectorAll("input[name='mosaicType']");

const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");

let originalImage = null;
let baseWidth = 0;
let baseHeight = 0;

// 元画像を保持するキャンバス（消しゴムでここから復元）
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const baseCanvas = document.createElement("canvas");
const baseCtx = baseCanvas.getContext("2d");

// 状態
let currentMode = "mosaic";       // "mosaic" or "eraser"
let currentMosaicType = "none";   // "none" | "pixel" | "glass" | "blur"
let isDrawing = false;

const state = {
  // 画像
  originalImage: null,
  baseWidth: 0,
  baseHeight: 0,

  // モード
  toolMode: "brush",   // "brush" | "rect" | "eraser"
  brushShape: "circle",// "circle" | "square" | "heart"
  mosaicType: "none",  // "none" | "pixel" | "glass" | "blur"

  // 描画中フラグ
  isDrawing: false,    // ブラシ描画中
  isSelecting: false,  // 四角選択ドラッグ中

  // 四角選択用座標
  rectStart: null,     // {x, y}
  rectEnd: null,       // {x, y}

  // Undo/Redo
  undoStack: [],
  redoStack: [],
  maxHistory: 20
};



// 画像読み込み
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      originalImage = img;

      // 高解像度保持用：大きすぎる場合だけ縮小（最大1600px）
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));

      baseWidth = Math.round(img.width * scale);
      baseHeight = Math.round(img.height * scale);

      canvas.width = baseWidth;
      canvas.height = baseHeight;
      baseCanvas.width = baseWidth;
      baseCanvas.height = baseHeight;

      // 元画像をベースと画面に描画
      baseCtx.clearRect(0, 0, baseWidth, baseHeight);
      baseCtx.drawImage(img, 0, 0, baseWidth, baseHeight);

      drawBaseToCanvas();
      resetControls();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function drawBaseToCanvas() {
  if (!baseWidth || !baseHeight) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvas, 0, 0, baseWidth, baseHeight);
}

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

// モザイク種類
mosaicTypeInputs.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      currentMosaicType = radio.value;
    }
  });
});

// リセット
resetBtn.addEventListener("click", () => {
  if (!originalImage) return;
  drawBaseToCanvas();
  resetControls();
});

function resetControls() {
  currentMode = "mosaic";
  modeMosaic.classList.add("active");
  modeEraser.classList.remove("active");

  document.querySelector("input[name='mosaicType'][value='none']").checked = true;
  currentMosaicType = "none";

  brushSize.value = 50;
  mosaicStrength.value = 5;
}

// ダウンロード（高解像度：canvasサイズそのままPNG）
downloadBtn.addEventListener("click", () => {
  if (!originalImage) {
    alert("先に画像を読み込んでね！");
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "mosaic-image.png";
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ===== マウスでの描画処理（PC専用） =====

function getCanvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
  const y = (evt.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function startDraw(evt) {
  if (!originalImage) return;
  isDrawing = true;
  const pos = getCanvasPos(evt);
  paintAt(pos.x, pos.y);
}

function moveDraw(evt) {
  if (!isDrawing) return;
  const pos = getCanvasPos(evt);
  paintAt(pos.x, pos.y);
}
if (state.toolMode === "eraser") {
  // クリップしてから baseCanvas を貼り付け
  ctx.save();
  clipBrushShape(state.brushShape, x, y, size);
  ctx.clip();
  ctx.drawImage(baseCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.restore();
  return;
}

// モザイク
if (state.toolMode === "brush") {
  if (state.mosaicType === "pixel") {
    // いつものピクセルモザイクだけど、描画前に clipBrushShape をつかう
  }
}
if (state.toolMode === "rect") {
  state.isSelecting = true;
  state.rectStart = getCanvasPos(evt); // {x, y}
  state.rectEnd = { ...state.rectStart };
}
if (state.toolMode === "rect" && state.isSelecting) {
  state.rectEnd = getCanvasPos(evt);
  drawBaseToCanvas();            // 元の画像＋モザイク済みの状態を描いて
  drawSelectionPreview();        // その上に選択枠だけ描く
}
if (state.toolMode === "rect" && state.isSelecting) {
  state.isSelecting = false;
  applyMosaicToRect(state.rectStart, state.rectEnd);
  pushHistory();  // 履歴に保存
}
function drawSelectionPreview() {
  if (!state.rectStart || !state.rectEnd) return;

  const x1 = state.rectStart.x;
  const y1 = state.rectStart.y;
  const x2 = state.rectEnd.x;
  const y2 = state.rectEnd.y;

  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 120, 180, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]); // 点線
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
function applyMosaicToRect(start, end) {
  const x1 = Math.min(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x);
  const y2 = Math.max(start.y, end.y);

  const sx = Math.floor(x1);
  const sy = Math.floor(y1);
  const sw = Math.floor(x2 - x1);
  const sh = Math.floor(y2 - y1);

  if (sw <= 0 || sh <= 0) return;

  if (state.mosaicType === "pixel") {
    applyPixelMosaic(sx, sy, sw, sh);
  } else if (state.mosaicType === "glass") {
    applyBlurRect(sx, sy, sw, sh, false);
  } else if (state.mosaicType === "blur") {
    applyBlurRect(sx, sy, sw, sh, true);
  }
}


function endDraw() {
  isDrawing = false;
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);

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

  // 消しゴムモード
  if (currentMode === "eraser") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(baseCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();
    return;
  }

  // モザイクモード
  if (currentMosaicType === "none") {
    // モザイクOFF
    return;
  }

  if (currentMosaicType === "pixel") {
    applyPixelMosaic(sx, sy, sw, sh);
  } else if (currentMosaicType === "glass") {
    applyBlurMosaic(x, y, size, false);
  } else if (currentMosaicType === "blur") {
    applyBlurMosaic(x, y, size, true);
  }
}

function clipBrushShape(shape, x, y, size) {
  const r = size / 2;
  ctx.beginPath();

  if (shape === "circle") {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  } else if (shape === "square") {
    ctx.rect(x - r, y - r, size, size);
  } else if (shape === "heart") {
    // 簡易ハート（上下2つの丸＋下の三角）
    const topY = y - r * 0.25;
    const leftX = x - r * 0.5;
    const rightX = x + r * 0.5;

    ctx.moveTo(x, y + r * 0.6);
    ctx.bezierCurveTo(x + r, y, x + r, y - r * 0.7, x, topY - r * 0.3);
    ctx.bezierCurveTo(x - r, y - r * 0.7, x - r, y, x, y + r * 0.6);
  }

  ctx.closePath();
}


// ドット（ピクセル）モザイク（強さでブロックサイズ変更）
function applyPixelMosaic(sx, sy, sw, sh) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const strength = parseInt(mosaicStrength.value, 10); // 1〜10
  // 強さが大きいほどブロック大きく（＝荒く隠れる）
  const blockSize = 4 + (strength - 1) * 8; // 4〜76px くらい
  const w = Math.max(1, Math.round(sw / blockSize));
  const h = Math.max(1, Math.round(sh / blockSize));

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

// すりガラス／ぼかしモザイク（強さでぼかし量変更）
function applyBlurMosaic(centerX, centerY, size, isStrongBlur) {
  const radius = size / 2;
  const strength = parseInt(mosaicStrength.value, 10); // 1〜10

  // すりガラス：弱〜中、ぼかし：中〜強
  const base = isStrongBlur ? 2.0 : 0.8;
  const blurRadius = base * strength; // px

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

function pushHistory() {
  const dataUrl = canvas.toDataURL("image/png");
  state.undoStack.push(dataUrl);
  if (state.undoStack.length > state.maxHistory) {
    state.undoStack.shift(); // 古いのから消す
  }
  state.redoStack = []; // 新しい操作したら Redo はクリア
}

function restoreFromDataUrl(dataUrl) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}

function undo() {
  if (state.undoStack.length === 0) return;
  const current = canvas.toDataURL("image/png");
  state.redoStack.push(current);

  const last = state.undoStack.pop();
  restoreFromDataUrl(last);
}

function redo() {
  if (state.redoStack.length === 0) return;
  const current = canvas.toDataURL("image/png");
  state.undoStack.push(current);

  const next = state.redoStack.pop();
  restoreFromDataUrl(next);
}

