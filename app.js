console.log("app.js 読み込みテスト：ここまで来たよ");

// ページが読み込まれたらキャンバスにテスト描画
window.addEventListener("load", () => {
  const canvas = document.getElementById("canvas");
  if (!canvas) {
    console.log("キャンバスが見つからん…");
    return;
  }

  const ctx = canvas.getContext("2d");
  canvas.width = 400;
  canvas.height = 200;

  ctx.fillStyle = "#ffcccc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#444";
  ctx.font = "20px sans-serif";
  ctx.fillText("テスト表示", 20, 40);
});
