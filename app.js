// 要素取得
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

// 画像情報
let originalImage = null;
let baseWidth = 0;
let baseHeight = 0;

// 元画像を保持するキャンバス（消しゴムでここから復元）
const baseCanvas = document.createElement("canvas");
const baseCtx = baseCanvas.getContext("2d");

// 状態
let currentMode = "mosaic";       // "mosaic" or "eraser"
let currentMosaicType = "none";   // "none" | "pixel" | "glass" | "blur"
let isDrawing = false;

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
      baseCtx.drawImage(
