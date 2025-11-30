// ==== デバッグ表示（ここが出たら script はちゃんと動いとる）====
console.log("app.js 読み込みOK");

// 要素取得
const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const modeMosaic = document.getElementById("modeMosaic");
const modeEraser = document.getElementById("modeEraser");
const brushSize = document.getElementById("brushSize");
const mosaicTypeInputs = document.querySelectorAll("input[name='mosaicType']");
const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");

// ここで canvas と ctx が null じゃないかチェック
if (!canvas || !ctx) {
  alert("canvas が見つかってない or getContext できてないよ！");
}

// ページ読み込み直後にテスト用のピンク四角を描く
window.addEventListener("load", () => {
  ctx.fillStyle = "#ffcccc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#444";
  ctx.font = "20px sans-serif";
  ctx.fillText("テスト表示", 20, 40);
});

// ===== ここから本番ロジック =====
let originalImage = null;
let baseWidth = 0;
let baseHeight = 0;

const baseCanvas = document.createElement("canvas");
const baseCtx = baseCanvas.getContext("2d");

let currentMode = "mosaic";      // "mosaic" or "eraser"
let currentMosaicType = "none";  // "none" | "pixel" | "glass" | "blur"
let isDrawing = false;

// 画像読み込み
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      console.log("画像読み込みOK", img.width, img.height);
      originalImage = img;

      const maxWidth = 600;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;

      baseWidth = img.width * scale;
      baseHeight = img.height * scale;

      canvas.width = baseWidth;
      canvas.height = baseHeight;
      baseCanvas.width = baseWidth;
      baseCanvas.height = baseHeight;

      baseCtx.clearRect(0, 0, baseWidth, baseHeight);
      baseCtx.drawImage(originalImage, 0, 0, baseWidth, baseHeight);

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

  brushSize.value = 40;
}

// ダウンロード
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

// ===== マウスでの描画処理 =====

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

  if (sx < 0) { sw += sx; sx = 0; }
  if (sy < 0) { sh += sy; sy = 0; }
  if (sx + sw > baseCanvas.width)  sw = baseCanvas.width - sx;
  if (sy + sh > baseCanvas.height) sh = baseCanvas.height - sy;
  if (sw <= 0 || sh <= 0) return;

  if (currentMode === "eraser") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(baseCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();
    return;
  }

  if (currentMosaicType === "none") {
    return;
  }

  if (currentMosaicType === "pixel") {
    applyPixelMosaic(sx, sy, sw, sh);
  } else if (currentMosaicType === "glass") {
    applyBlurMosaic(x, y, size, 3);
  } else if (currentMosaicType === "blur") {
    applyBlurMosaic(x, y, size, 8);
  }
}

// ドットモザイク
function applyPixelMosaic(sx, sy, sw, sh) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const blockCount = 8;
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

// すりガラス／ぼかし
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
