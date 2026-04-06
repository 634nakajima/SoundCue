// ============================================================
// Text Flow — SoundCue Speech + p5.js サンプル
// ============================================================
// SoundCue の Speech モードで認識されたテキストが
// 画面を横に流れていくタイポグラフィスケッチ。
// 認識の信頼度でテキストの大きさと不透明度が変化します。
//
// SoundCue設定:
//   - モード: Speech
//   - OSCポート: 7400（Interplayブリッジ経由）
//   - 言語: 任意（日本語、英語など）
//
// OSCアドレス（受信）:
//   /speech/text         string  認識テキスト（確定）
//   /speech/confidence   float   信頼度 (0-1)
// ============================================================

let textLines = [];
let lastText = '';
const MAX_LINES = 30;

// カラーパレット（信頼度に応じてグラデーション）
const COLORS = {
  high:   [255, 240, 200],  // 暖かい白 — 高信頼度
  mid:    [150, 200, 255],  // 水色 — 中信頼度
  low:    [200, 150, 255],  // 薄紫 — 低信頼度
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
  background(10, 8, 18);
}

function draw() {
  background(10, 8, 18, 15);

  // OSCデータ取得
  let txt = oscData['/speech/text'];
  let conf = oscData['/speech/confidence'];
  let confidence = conf !== undefined ? conf : 0.5;

  // 新しいテキストが来たら行を生成
  if (txt !== undefined && txt !== lastText && String(txt).length > 0) {
    lastText = txt;
    spawnTextLine(String(txt), confidence);
  }

  // テキスト行の更新・描画
  updateTextLines();

  // 背景エフェクト：波打つライン
  drawBackgroundWaves();

  // UI表示
  drawUI(confidence);
}

function spawnTextLine(text, confidence) {
  // 信頼度に応じた色を選択
  let col;
  if (confidence > 0.7) {
    col = [...COLORS.high];
  } else if (confidence > 0.4) {
    col = [...COLORS.mid];
  } else {
    col = [...COLORS.low];
  }

  let sz = map(confidence, 0, 1, 18, 48);
  let yPos = random(height * 0.15, height * 0.85);
  let speed = map(sz, 18, 48, 0.8, 2.0);

  // テキストの流れる方向をランダムに（左→右 or 右→左）
  let direction = random() > 0.5 ? 1 : -1;
  let startX = direction > 0 ? -textWidth(text) - 100 : width + 100;

  textLines.push({
    text: text,
    x: startX,
    y: yPos,
    vx: speed * direction,
    size: sz,
    color: col,
    alpha: 240,
    confidence: confidence,
    wobblePhase: random(TWO_PI),
    // 文字ごとに少しずつ遅延表示するためのオフセット
    charDelays: text.split('').map((_, idx) => idx * 2),
    spawnFrame: frameCount,
  });

  while (textLines.length > MAX_LINES) textLines.shift();
}

function updateTextLines() {
  for (let i = textLines.length - 1; i >= 0; i--) {
    let line = textLines[i];
    line.x += line.vx;

    // ゆらゆら
    let wobbleY = sin(frameCount * 0.02 + line.wobblePhase) * 3;

    // 画面外に出たらフェードアウト
    if ((line.vx > 0 && line.x > width + 200) ||
        (line.vx < 0 && line.x < -width)) {
      line.alpha -= 5;
    }

    if (line.alpha <= 0) {
      textLines.splice(i, 1);
      continue;
    }

    // 文字ごとに描画（波打ちエフェクト）
    let chars = line.text.split('');
    let curX = line.x;
    textSize(line.size);

    for (let c = 0; c < chars.length; c++) {
      let elapsed = frameCount - line.spawnFrame;
      let delay = line.charDelays[c];

      // ディレイ前はまだ表示しない
      if (elapsed < delay) continue;

      let charAge = elapsed - delay;
      let fadeIn = min(charAge / 10, 1);

      // 各文字の上下ゆらぎ
      let charWobble = sin(frameCount * 0.03 + c * 0.3 + line.wobblePhase) * 5;

      let a = line.alpha * fadeIn;
      fill(line.color[0], line.color[1], line.color[2], a);
      noStroke();
      textAlign(LEFT, CENTER);
      text(chars[c], curX, line.y + wobbleY + charWobble);

      // 影（グロー効果）
      fill(line.color[0], line.color[1], line.color[2], a * 0.15);
      textSize(line.size * 1.1);
      text(chars[c], curX - 1, line.y + wobbleY + charWobble + 1);
      textSize(line.size);

      curX += textWidth(chars[c]);
    }
  }
}

function drawBackgroundWaves() {
  // 背景に薄いウェーブライン
  noFill();
  for (let w = 0; w < 3; w++) {
    stroke(80, 100, 150, 15);
    strokeWeight(0.5);
    beginShape();
    for (let x = 0; x < width; x += 20) {
      let y = height * (0.3 + w * 0.2) +
              sin(x * 0.005 + frameCount * 0.01 + w) * 30;
      vertex(x, y);
    }
    endShape();
  }
}

function drawUI(confidence) {
  fill(255, 150);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  textFont('monospace');
  text('Text Flow — SoundCue Speech', 20, 30);

  textSize(10);
  fill(120);
  text(`confidence: ${(confidence * 100).toFixed(0)}%`, 20, 50);
  text(`lines: ${textLines.length}`, 20, 65);

  // 信頼度バー
  fill(40);
  rect(20, 75, 120, 8, 3);
  let barCol = confidence > 0.7 ? COLORS.high :
               confidence > 0.4 ? COLORS.mid : COLORS.low;
  fill(...barCol, 180);
  rect(20, 75, 120 * confidence, 8, 3);

  // 直近テキスト
  if (lastText) {
    fill(200, 200, 220, 120);
    textSize(9);
    textAlign(LEFT);
    let displayText = lastText.length > 40 ? lastText.substring(0, 40) + '...' : lastText;
    text(`latest: "${displayText}"`, 20, 100);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(10, 8, 18);
}
