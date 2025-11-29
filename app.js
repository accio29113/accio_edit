const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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

let originalImage = null;   // 元画像データ
let baseWidth = 0;
let baseHeight = 0;

// 画像を読み込む
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      originalImage = img;

      // キャンバスサイズを自動調整（最大幅 800px）
      const maxWidth = 800;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;

      baseWidth = img.width * scale;
      baseHeight = img.height * scale;

      canvas.width = baseWidth;
      canvas.height = baseHeight;

      resetControls();
      applyFilters(); // 初期状態で一回描画
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// スライダー値が変わったらフィルター適用
[brightness, contrast, saturate, grayscale, sepia].forEach(input => {
  input.addEventListener("input", () => {
    updateLabels();
    applyFilters();
  });
});

// ラベルを更新
function updateLabels() {
  brightnessValue.textContent = `${brightness.value}%`;
  contrastValue.textContent = `${contrast.value}%`;
  saturateValue.textContent = `${saturate.value}%`;
}

// フィルターを適用して描画
function applyFilters() {
  if (!originalImage) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const filters = [
    `brightness(${brightness.value}%)`,
    `contrast(${contrast.value}%)`,
    `saturate(${saturate.value}%)`
  ];

  if (grayscale.checked) {
    filters.push("grayscale(1)");
  }
  if (sepia.checked) {
    filters.push("sepia(1)");
  }

  ctx.filter = filters.join(" ");
  ctx.drawImage(originalImage, 0, 0, baseWidth, baseHeight);
}

// リセットボタン
resetBtn.addEventListener("click", () => {
  resetControls();
  applyFilters();
});

function resetControls() {
  brightness.value = 100;
  contrast.value = 100;
  saturate.value = 100;
  grayscale.checked = false;
  sepia.checked = false;
  updateLabels();
}

// ダウンロードボタン
downloadBtn.addEventListener("click", () => {
  if (!originalImage) {
    alert("先に画像を読み込んでね！");
    return;
  }
  const link = document.createElement("a");
  link.download = "edited-image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// 初期ラベル
updateLabels();
