// ============================================================
// Spectrum Garden — SoundCue Music Info + p5.js サンプル
// ============================================================
// SoundCue の Music Info モードで抽出した音楽特徴量を使い、
// ピッチで花の高さ、クロマで色相、RMSでサイズが変わる
// ジェネラティブな「音の庭」を描画します。
//
// SoundCue設定:
//   - モード: Music Info
//   - OSCポート: 7400（Interplayブリッジ経由）
//   - 有効にする特徴量: pitch, rms, centroid, chroma (0-11)
//
// OSCアドレス（受信）:
//   /music/pitch       float  検出ピッチ (Hz)
//   /music/rms         float  RMS音量 (0-1)
//   /music/centroid     float  スペクトル重心 (Hz)
//   /music/chroma/0    float  クロマ C  (0-1)
//   /music/chroma/1    float  クロマ C# (0-1)
//   ...
//   /music/chroma/11   float  クロマ B  (0-1)
// ============================================================

let flowers = [];
const MAX_FLOWERS = 150;

// クロマ配列 (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
let chromaValues = new Array(12).fill(0);
let smoothPitch = 0;
let smoothRms = 0;
let smoothCentroid = 0;

// 音名と色相のマッピング（12音 → 色相環）
const NOTE_HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  setupOSC(7401);
  colorMode(HSB, 360, 100, 100, 100);
  background(220, 30, 8);
  textFont('monospace');
}

function draw() {
  // OSCデータ取得・スムージング
  let pitch = oscData['/music/pitch'];
  let rms = oscData['/music/rms'];
  let centroid = oscData['/music/centroid'];

  if (pitch !== undefined) smoothPitch = lerp(smoothPitch, pitch, 0.15);
  if (rms !== undefined) smoothRms = lerp(smoothRms, rms, 0.12);
  if (centroid !== undefined) smoothCentroid = lerp(smoothCentroid, centroid, 0.1);

  for (let i = 0; i < 12; i++) {
    let val = oscData[`/music/chroma/${i}`];
    if (val !== undefined) chromaValues[i] = lerp(chromaValues[i], val, 0.15);
  }

  // フェード（残像）
  background(220, 30, 8, 5);

  // 最も強いクロマを特定
  let maxChroma = 0;
  let maxChromaIdx = 0;
  for (let i = 0; i < 12; i++) {
    if (chromaValues[i] > maxChroma) {
      maxChroma = chromaValues[i];
      maxChromaIdx = i;
    }
  }

  // RMSが一定以上なら花を生成
  if (smoothRms > 0.01 && frameCount % 3 === 0) {
    let hue = NOTE_HUES[maxChromaIdx];
    let x = map(smoothPitch, 80, 1000, 50, width - 50, true);
    let sz = map(smoothRms, 0, 0.5, 5, 50, true);
    let petalCount = floor(map(smoothCentroid, 200, 4000, 3, 10, true));

    flowers.push({
      x: x + random(-30, 30),
      y: height - random(20, 60),
      targetY: map(smoothPitch, 80, 1000, height * 0.8, height * 0.1, true),
      size: sz,
      hue: hue + random(-15, 15),
      saturation: map(maxChroma, 0, 1, 30, 90),
      petals: petalCount,
      rotation: random(TWO_PI),
      rotSpeed: random(-0.01, 0.01),
      growProgress: 0,
      alpha: 90,
      stemSway: random(-0.02, 0.02),
    });

    while (flowers.length > MAX_FLOWERS) flowers.shift();
  }

  // 花の描画
  for (let i = flowers.length - 1; i >= 0; i--) {
    let f = flowers[i];

    // 成長アニメーション
    f.growProgress = min(f.growProgress + 0.02, 1);
    let currentY = lerp(f.y, f.targetY, f.growProgress);
    f.rotation += f.rotSpeed;

    // フェードアウト
    f.alpha -= 0.3;
    if (f.alpha <= 0) {
      flowers.splice(i, 1);
      continue;
    }

    let progress = f.growProgress;
    let sz = f.size * progress;

    // 茎
    stroke(120, 50, 40, f.alpha * 0.6);
    strokeWeight(1.5);
    let stemX = f.x + sin(frameCount * f.stemSway) * 5;
    line(stemX, f.y, stemX, currentY);

    // 花びら
    push();
    translate(stemX, currentY);
    rotate(f.rotation);
    noStroke();

    for (let p = 0; p < f.petals; p++) {
      let angle = (TWO_PI / f.petals) * p;
      let px = cos(angle) * sz * 0.6;
      let py = sin(angle) * sz * 0.6;
      fill(f.hue, f.saturation, 80, f.alpha * 0.7);
      ellipse(px, py, sz * 0.7, sz * 0.4);
    }

    // 花の中心
    fill(f.hue + 30, 30, 95, f.alpha);
    circle(0, 0, sz * 0.35);
    pop();
  }

  // クロマバー表示
  drawChromaDisplay();

  // UI表示
  drawUI();
}

function drawChromaDisplay() {
  let barW = 20;
  let barMaxH = 80;
  let startX = width - 280;
  let startY = height - 30;

  for (let i = 0; i < 12; i++) {
    let x = startX + i * (barW + 2);
    let h = chromaValues[i] * barMaxH;
    let hue = NOTE_HUES[i];

    // バー背景
    noStroke();
    fill(0, 0, 20, 40);
    rect(x, startY - barMaxH, barW, barMaxH, 2);

    // バー値
    fill(hue, 70, 80, 70);
    rect(x, startY - h, barW, h, 2);

    // 音名
    fill(0, 0, 70, 60);
    textSize(8);
    textAlign(CENTER);
    text(NOTE_NAMES[i], x + barW / 2, startY + 12);
  }
}

function drawUI() {
  colorMode(RGB, 255);

  fill(255, 180);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text('Spectrum Garden — SoundCue Music Info', 20, 30);

  textSize(10);
  fill(180);
  text(`pitch: ${smoothPitch.toFixed(1)} Hz`, 20, 55);
  text(`rms: ${smoothRms.toFixed(3)}`, 20, 70);
  text(`centroid: ${smoothCentroid.toFixed(0)} Hz`, 20, 85);
  text(`flowers: ${flowers.length}`, 20, 100);

  colorMode(HSB, 360, 100, 100, 100);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(220, 30, 8);
}
