# SoundCue

リアルタイム音声解析 + OSC送信デスクトップアプリ。マイク入力から音の特徴を抽出し、OSCで外部アプリ（Pure Data, TouchDesigner, Max, Ableton等）に送信します。

[SightCue](https://github.com/affectiveinformationlab/SightCue)（映像版）の音バージョンです。

## Analysis Modes

| Tab | Engine | Description | OSC Addresses |
|-----|--------|-------------|---------------|
| **YAMNet** | TensorFlow.js | 521カテゴリ環境音分類（Google YAMNet） | `/yamnet/class` `/yamnet/confidence` `/yamnet/prob/{i}` |
| **CLAP** | Transformers.js | ゼロショット音声分類（テキストラベルで自由に分類） | `/clap/class` `/clap/confidence` `/clap/prob/{i}` |
| **Teachable Machine** | TensorFlow.js | カスタム音声分類モデル（URL or ZIP読込） | `/tm/class` `/tm/confidence` `/tm/prob/{i}` |
| **Music Info** | Web Audio API | ピッチ検出・RMS・スペクトル重心・波形/スペクトル表示 | `/music/pitch` `/music/note` `/music/rms` `/music/centroid` |
| **Speech** | Whisper (local) | リアルタイム音声認識（オフライン対応、多言語） | `/speech/text` `/speech/confidence` |

## Features

- **5つの解析モード** をタブで切り替え
- **OSC出力** — 解析結果をリアルタイムでUDP送信
- **OSCモニター** — 送信中のアドレスと値をリアルタイム表示
- **マイク選択** — 複数のオーディオ入力デバイスに対応
- **オーディオレベルメーター** — 常時表示
- **CLAPゼロショット分類** — テキストラベルで自由に音を分類、学習不要
- **Whisper音声認識** — ローカル実行（tiny/small/medium選択可）、インターネット不要
- **波形・スペクトル表示** — Music Infoタブでリアルタイム可視化

## Quick Start

```bash
git clone https://github.com/634nakajima/SoundCue.git
cd SoundCue
npm install
npm run dev
```

## Download

[Releases](https://github.com/634nakajima/SoundCue/releases) からビルド済みアプリをダウンロードできます。

## OSC Address Reference

### YAMNet
| Address | Type | Description |
|---------|------|-------------|
| `/yamnet/class` | string | Top-1 分類クラス名 |
| `/yamnet/confidence` | float | Top-1 信頼度 (0-1) |
| `/yamnet/prob/{i}` | float | Top-N の各クラス信頼度 |

### CLAP (Zero-Shot)
| Address | Type | Description |
|---------|------|-------------|
| `/clap/class` | string | Top-1 分類クラス名 |
| `/clap/confidence` | float | Top-1 信頼度 (0-1) |
| `/clap/prob/{i}` | float | 各ラベル信頼度 |

### Teachable Machine
| Address | Type | Description |
|---------|------|-------------|
| `/tm/class` | string | Top-1 分類クラス名 |
| `/tm/confidence` | float | Top-1 信頼度 (0-1) |
| `/tm/prob/{i}` | float | 各クラス信頼度 |

### Music Info
| Address | Type | Description |
|---------|------|-------------|
| `/music/pitch` | float | 検出ピッチ (Hz) |
| `/music/note` | string | 音名 (e.g. "A4") |
| `/music/rms` | float | RMS音量 (0-1) |
| `/music/centroid` | float | スペクトル重心 (Hz) |

### Speech
| Address | Type | Description |
|---------|------|-------------|
| `/speech/text` | string | 認識テキスト（確定） |
| `/speech/confidence` | float | 信頼度 (0-1) |

## Tech Stack

- **Electron** + **React** + **TypeScript** + **electron-vite**
- **TensorFlow.js** — YAMNet / Teachable Machine
- **CLAP** (via @huggingface/transformers) — ゼロショット音声分類
- **Whisper** (via @huggingface/transformers) — ローカル音声認識
- **Web Audio API** — ピッチ検出、スペクトル解析
- **Tailwind CSS** — UI
- **OSC** — UDP送信 (Node.js dgram)

## Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win
```

## License

MIT
