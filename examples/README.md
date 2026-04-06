# SoundCue Examples

SoundCue の音声解析機能を活用したインタラクティブ作品のサンプル集です。
p5.js（ビジュアル）と Pure Data / plugdata（サウンド）の実装例を含みます。

## 必要なもの

- **SoundCue** - 音声解析＆OSC送信アプリ
- **Interplay** - p5.js + plugdata 統合開発環境（p5.jsサンプル使用時）
- **plugdata** - Pure Data ベースのビジュアルプログラミング環境（Pdサンプル使用時）

## OSC通信の設定

### p5.js サンプルを使う場合

```
SoundCue (port 7400) → Interplay OSCブリッジ → WebSocket → p5.js
```

1. SoundCue の OSC ポートを **7400** に変更
2. Interplay を起動（OSCブリッジが自動起動）
3. p5.js スケッチを Interplay で開く

### Pd サンプルを使う場合

```
SoundCue (port 8000) → plugdata (else/osc.receive 8000)
```

1. SoundCue の OSC ポートは **8000**（デフォルト）のまま
2. plugdata で Pd パッチを開く

---

## p5.js サンプル

### 1. Spectrum Garden（音の庭）

**ファイル:** `p5js/music-spectrum-garden.js`
**SoundCue モード:** Music Info

音楽特徴量からジェネラティブな「花」を描画します。
ピッチで花の位置、クロマで色相、RMSでサイズが変わります。

| OSC アドレス | 値 | 説明 |
|---|---|---|
| `/music/pitch` | float | 検出ピッチ (Hz) — 花の水平位置・高さ |
| `/music/rms` | float (0-1) | RMS音量 — 花のサイズ |
| `/music/centroid` | float | スペクトル重心 (Hz) — 花びらの数 |
| `/music/chroma/{0-11}` | float (0-1) | クロマ 12音階 — 花の色相 |

SoundCue の Music Info タブで **pitch, rms, centroid, chroma** を有効にしてください。

### 2. Sound Bubbles（音の泡）

**ファイル:** `p5js/yamnet-sound-bubbles.js`
**SoundCue モード:** YAMNet

YAMNet で分類された環境音に応じて、ラベル付きの泡が画面下から浮かび上がります。
信頼度が泡のサイズ、カテゴリが色を決定します。

| OSC アドレス | 値 | 説明 |
|---|---|---|
| `/yamnet/class` | string | Top-1 分類クラス名 |
| `/yamnet/confidence` | float (0-1) | Top-1 信頼度 |

カテゴリ色分け:
- **ピンク** — 話し声系 (speech, voice, sing...)
- **水色** — 音楽系 (music, piano, guitar...)
- **緑** — 動物系 (dog, cat, bird...)
- **オレンジ** — 乗り物系 (car, engine, train...)
- **ミントグリーン** — 自然音系 (rain, wind, water...)
- **赤** — アラーム系 (alarm, bell, buzzer...)
- **薄紫** — 道具系 (hammer, typing, door...)

### 3. Text Flow（テキストフロー）

**ファイル:** `p5js/speech-text-flow.js`
**SoundCue モード:** Speech

音声認識されたテキストが画面を横に流れていくタイポグラフィスケッチ。
信頼度でテキストの大きさと色が変化します。

| OSC アドレス | 値 | 説明 |
|---|---|---|
| `/speech/text` | string | 認識テキスト（確定） |
| `/speech/confidence` | float (0-1) | 信頼度 |

日本語・英語どちらでも動作します。SoundCue の Speech タブで言語を設定してください。

---

## Pd サンプル

### 4. Pitch Echo（ピッチエコー）

**ファイル:** `pd/music-pitch-echo.pd`
**SoundCue モード:** Music Info

検出されたピッチでオシレーターの周波数を制御し、ディレイ/エコーをかけます。
RMSで音量、スペクトル重心でフィルター周波数が変化します。

| 音の特徴 | 制御対象 | OSC アドレス |
|---|---|---|
| ピッチ | オシレーター周波数 | `/music/pitch` |
| RMS音量 | 音量 | `/music/rms` |
| スペクトル重心 | フィルター周波数 | `/music/centroid` |

**調整ポイント:**
- `cyclone/scale` の入力範囲を環境に合わせて調整してください
- ディレイタイム（`delread~` の引数）を変更するとエコーの間隔が変わります

### 5. Class Bells（分類ベル）

**ファイル:** `pd/yamnet-class-bells.pd`
**SoundCue モード:** YAMNet

分類クラスが変化するとベル音がランダムに鳴ります。
4つの音程（C5, E5, G5, C6 = C メジャーコード）から選ばれます。
信頼度で全体の音量が変化します。

| OSC アドレス | 用途 |
|---|---|
| `/yamnet/class` | クラス変化の検出 → ベル発音トリガー |
| `/yamnet/confidence` | 信頼度 → 全体音量 |

| 音程 | 周波数 |
|---|---|
| C5 | 523 Hz |
| E5 | 659 Hz |
| G5 | 784 Hz |
| C6 | 1047 Hz |

### 6. Class Drone（分類ドローン）

**ファイル:** `pd/tm-class-drone.pd`
**SoundCue モード:** Teachable Machine

分類クラスに応じて異なるドローンサウンドが鳴ります。
確信度で音量が変化します。

| クラス | サウンド |
|---|---|
| class_1 | 低音ドローン（110Hz サイン波） |
| class_2 | FM変調（165Hz キャリア） |
| class_3 | フィルタードノイズ（330Hz バンドパス） |

**カスタマイズ:**
- `route class_1 class_2 class_3` のクラス名を TM モデルに合わせて変更
- SoundCue の Teachable Machine タブでモデルを読み込んでください

---

## OSC アドレス一覧

### YAMNet モード

```
/yamnet/class             string (Top-1 クラス名)
/yamnet/confidence        float  (Top-1 信頼度 0-1)
/yamnet/prob/{i}          float  (Top-N 各クラス信頼度)
```

### CLAP モード

```
/clap/class               string (Top-1 クラス名)
/clap/confidence          float  (Top-1 信頼度 0-1)
/clap/prob/{i}            float  (各ラベル信頼度)
```

### Teachable Machine モード

```
/tm/class                 string (Top-1 クラス名)
/tm/confidence            float  (確信度 0-1)
/tm/prob/{i}              float  (各クラス確率)
```

### Music Info モード

```
/music/pitch              float  (検出ピッチ Hz)
/music/note               string (音名 e.g. "A4")
/music/rms                float  (RMS音量 0-1)
/music/centroid           float  (スペクトル重心 Hz)
/music/loudness           float  (知覚的音量)
/music/zcr                float  (ゼロクロッシングレート)
/music/flatness           float  (スペクトル平坦度 0-1)
/music/rolloff            float  (スペクトルロールオフ Hz)
/music/spread             float  (スペクトル拡散度)
/music/kurtosis           float  (スペクトル尖度)
/music/skewness           float  (スペクトル歪度)
/music/perceptualSpread   float  (知覚的拡散度)
/music/perceptualSharpness float (知覚的鋭さ)
/music/energy             float  (エネルギー)
/music/mfcc/{i}           float  (MFCC 13係数 i=0-12)
/music/chroma/{i}         float  (クロマ 12音階 i=0-11)
```

### Speech モード

```
/speech/text              string (認識テキスト)
/speech/confidence        float  (信頼度 0-1)
```
