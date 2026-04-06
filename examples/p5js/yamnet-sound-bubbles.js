// ============================================================
// Sound Bubbles — SoundCue YAMNet + p5.js サンプル
// ============================================================
// SoundCue の YAMNet モードで分類された環境音に応じて、
// ラベル付きの泡が画面下から浮かび上がるスケッチ。
// 信頼度が泡のサイズ、分類カテゴリが色を決定します。
//
// SoundCue設定:
//   - モード: YAMNet
//   - OSCポート: 7400（Interplayブリッジ経由）
//
// OSCアドレス（受信）:
//   /yamnet/class        string  Top-1 分類クラス名
//   /yamnet/confidence    float   Top-1 信頼度 (0-1)
// ============================================================

let bubbles = [];
let lastClass = '';
let classHistory = [];
const MAX_BUBBLES = 100;
const MAX_HISTORY = 12;

// カテゴリ別カラーマッピング
// YAMNetの521クラスは多岐にわたるため、キーワードで大分類
const CATEGORY_COLORS = {
  speech:  [255, 150, 200],  // ピンク — 話し声系
  music:   [100, 200, 255],  // 水色 — 音楽系
  animal:  [120, 255, 150],  // 緑 — 動物系
  vehicle: [255, 180, 80],   // オレンジ — 乗り物系
  nature:  [150, 220, 180],  // ミントグリーン — 自然音系
  alarm:   [255, 80, 80],    // 赤 — アラーム系
  tool:    [200, 180, 255],  // 薄紫 — 道具系
  other:   [200, 200, 220],  // グレー — その他
};

// キーワードによる分類
const CATEGORY_KEYWORDS = {
  speech:  ['speech', 'voice', 'talk', 'sing', 'shout', 'whisper', 'laugh', 'cry', 'scream', 'child', 'male', 'female', 'conversation', 'narration', 'crowd'],
  music:   ['music', 'piano', 'guitar', 'drum', 'bass', 'violin', 'flute', 'trumpet', 'organ', 'harmonica', 'accordion', 'strum', 'chord', 'melody', 'beat', 'rhythm', 'jazz', 'rock', 'pop', 'hip hop', 'electronic'],
  animal:  ['dog', 'cat', 'bird', 'animal', 'bark', 'meow', 'chirp', 'rooster', 'cow', 'frog', 'insect', 'cricket', 'bee', 'howl', 'purr', 'quack', 'tweet'],
  vehicle: ['car', 'engine', 'vehicle', 'truck', 'train', 'airplane', 'helicopter', 'motorcycle', 'boat', 'horn', 'siren', 'traffic', 'bus', 'tire'],
  nature:  ['rain', 'wind', 'thunder', 'water', 'wave', 'stream', 'ocean', 'fire', 'crackling', 'rustling', 'drip', 'splash'],
  alarm:   ['alarm', 'bell', 'buzzer', 'ring', 'beep', 'siren', 'telephone', 'doorbell', 'clock', 'alert', 'whistle'],
  tool:    ['hammer', 'saw', 'drill', 'typing', 'keyboard', 'click', 'tap', 'knock', 'door', 'glass', 'metal', 'wood', 'paper', 'zipper', 'scissors'],
};

// 文字列型OSC対応パーサー
function _oscParseExt(buf) {
  var view = new DataView(buf);
  var i = 0;
  var addrEnd = i;
  while (addrEnd < view.byteLength && view.getUint8(addrEnd) !== 0) addrEnd++;
  var address = String.fromCharCode.apply(null, new Uint8Array(buf, i, addrEnd - i));
  i = addrEnd;
  i += 4 - (i % 4);
  if (i >= view.byteLength || view.getUint8(i) !== 44) return null;
  i++;
  var type = String.fromCharCode(view.getUint8(i));
  i++;
  i += 4 - (i % 4);
  var value;
  if (type === 'f' && i + 4 <= view.byteLength) {
    value = view.getFloat32(i);
  } else if (type === 'i' && i + 4 <= view.byteLength) {
    value = view.getInt32(i);
  } else if (type === 's') {
    var strEnd = i;
    while (strEnd < view.byteLength && view.getUint8(strEnd) !== 0) strEnd++;
    value = String.fromCharCode.apply(null, new Uint8Array(buf, i, strEnd - i));
  }
  return { address: address, value: value };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  setupOSC(7401);
  if (oscWs) {
    oscWs.onmessage = function(e) {
      var parsed = _oscParseExt(e.data);
      if (parsed) oscData[parsed.address] = parsed.value;
    };
  }
  textFont('monospace');
}

function draw() {
  background(15, 12, 25, 25);

  // OSCデータ取得
  let cls = oscData['/yamnet/class'];
  let conf = oscData['/yamnet/confidence'];

  if (cls !== undefined && cls !== lastClass) {
    lastClass = cls;
    let confidence = conf !== undefined ? conf : 0.5;

    // 新しい泡を生成
    spawnBubble(String(cls), confidence);

    // 履歴に追加
    classHistory.unshift({ text: String(cls), confidence: confidence, time: frameCount });
    if (classHistory.length > MAX_HISTORY) classHistory.pop();
  }

  // 泡の更新・描画
  updateBubbles();

  // UI表示
  drawUI();
}

function getCategory(className) {
  let lower = className.toLowerCase();
  for (let [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (let kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return 'other';
}

function spawnBubble(className, confidence) {
  let category = getCategory(className);
  let col = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  let sz = map(confidence, 0, 1, 30, 120);

  bubbles.push({
    x: random(80, width - 80),
    y: height + sz,
    vy: random(-1.5, -0.5),
    vx: random(-0.3, 0.3),
    size: sz,
    color: col,
    alpha: 220,
    label: className,
    confidence: confidence,
    category: category,
    wobblePhase: random(TWO_PI),
    wobbleSpeed: random(0.02, 0.05),
  });

  while (bubbles.length > MAX_BUBBLES) bubbles.shift();
}

function updateBubbles() {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];

    // 上昇 + ゆらゆら
    b.y += b.vy;
    b.x += b.vx + sin(frameCount * b.wobbleSpeed + b.wobblePhase) * 0.5;
    b.wobblePhase += 0.01;

    // 上に行くほどフェードアウト
    if (b.y < height * 0.15) {
      b.alpha -= 2;
    }

    if (b.alpha <= 0 || b.y < -b.size) {
      bubbles.splice(i, 1);
      continue;
    }

    // 泡の描画
    let wobble = sin(frameCount * b.wobbleSpeed + b.wobblePhase) * 3;

    // グロー
    noStroke();
    fill(b.color[0], b.color[1], b.color[2], b.alpha * 0.1);
    circle(b.x, b.y, b.size * 1.5);

    // 外枠
    stroke(b.color[0], b.color[1], b.color[2], b.alpha * 0.6);
    strokeWeight(1.5);
    noFill();
    ellipse(b.x + wobble, b.y, b.size, b.size * 0.95);

    // 内側のハイライト
    noStroke();
    fill(b.color[0], b.color[1], b.color[2], b.alpha * 0.15);
    circle(b.x + wobble, b.y, b.size * 0.8);

    // 光の反射
    fill(255, 255, 255, b.alpha * 0.3);
    circle(b.x - b.size * 0.15 + wobble, b.y - b.size * 0.2, b.size * 0.2);

    // ラベル表示
    noStroke();
    fill(255, 255, 255, b.alpha * 0.9);
    textAlign(CENTER, CENTER);
    let labelSize = constrain(b.size * 0.14, 8, 14);
    textSize(labelSize);
    text(b.label, b.x + wobble, b.y);

    // 信頼度
    textSize(labelSize * 0.75);
    fill(b.color[0], b.color[1], b.color[2], b.alpha * 0.7);
    text((b.confidence * 100).toFixed(0) + '%', b.x + wobble, b.y + labelSize + 2);
  }
}

function drawUI() {
  // ヘッダー
  fill(255, 180);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text('Sound Bubbles — SoundCue YAMNet', 20, 30);

  // カテゴリ凡例
  textSize(9);
  let y = 55;
  for (let [cat, col] of Object.entries(CATEGORY_COLORS)) {
    fill(...col, 180);
    circle(28, y - 3, 8);
    fill(150);
    text(cat, 40, y);
    y += 16;
  }

  // 分類履歴
  textAlign(LEFT);
  textSize(10);
  let histX = width - 250;
  fill(255, 150);
  text('Recent:', histX, 30);
  for (let i = 0; i < classHistory.length; i++) {
    let h = classHistory[i];
    let age = frameCount - h.time;
    let alpha = map(age, 0, 600, 200, 30);
    if (alpha <= 0) continue;

    let cat = getCategory(h.text);
    let col = CATEGORY_COLORS[cat];
    fill(...col, alpha);
    textSize(i === 0 ? 11 : 9);
    text(`${h.text} (${(h.confidence * 100).toFixed(0)}%)`, histX, 50 + i * 16);
  }

  // 泡の数
  fill(100);
  textSize(9);
  textAlign(RIGHT);
  text(`bubbles: ${bubbles.length}`, width - 20, height - 20);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
