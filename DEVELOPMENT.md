# YTM Immersion Development Guide

元々一つの巨大なファイルだった `content_original.js` を、メンテナンス性と可読性を向上させるために役割ごとにモジュール分割しました。
どの機能がどこに行ったかなどをここに書いておきます。

## 構成の概要

全てのモジュールは `src/js/modules/` 配下にあり、大きく以下のカテゴリに分かれています：

- **core**: アプリケーションの基盤（状態管理、イベントループ、設定管理）
- **lyrics**: 歌詞の取得、解析、読み込み
- **ui**: 画面描画、レイアウト管理、ハイライト処理
- **features**: 特定の機能（PiP, Share, Discord連携, etc.）
- **services**: 外部連携や共通サービス（翻訳, ストレージ, i18n）

### モジュール間の連携

モジュール間は以下の2つの方法で連携します：

1.  **StateModule (StateManager)**: グローバルな状態（現在の曲のキー、歌詞データ、設定など）を一括管理します。状態の取得・更新はこれを通じで行っています。
2.  **window オブジェクト経由**: 各モジュールは `window.ModuleName`（例: `window.PipManager`, `window.UIRendering`）として自分自身をグローバルに公開しています。他のモジュールから直接関数を呼び出す際に使用します。

---

## 機能マッピング表

`content_original.js` にあった主要な機能がどこに移動したかの対応表です。

| 機能 / 関数の種類 | 移動先ファイル | 説明 |
| :--- | :--- | :--- |
| `renderLyrics`, `updateLyricHighlight` | [uiRendering.js](src/js/modules/ui/uiRendering.js) | 歌詞の生成と動的な色付け・スクロール |
| `PipManager` オブジェクト | [pipManager.js](src/js/modules/features/pipManager.js) | Picture-in-Pictureウィンドウの制御 |
| `parseBaseLRC`, `extractTimestamps` | [lyricsParser.js](src/js/modules/lyrics/lyricsParser.js) | LRC形式や文字列からのタイムスタンプ解析 |
| `loadLyrics`, `applyLyricsText` | [lyricsLoader.js](src/js/modules/lyrics/lyricsLoader.js) | 歌詞データの取得と適用 |
| `tick`, `mainLoop`, `EventsManager` | [events.js](src/js/modules/core/events.js) | 全体の実行ループとイベント監視 |
| `StateManager` (global vars) | [state.js](src/js/modules/core/state.js) | `lyricsData`, `hasTimestamp` などの状態管理 |
| `initLayout`, `updateMetaUI` | [uiManager.js](src/js/modules/ui/uiManager.js) | プレイヤー周りのDOM構築と基本UI更新 |
| `syncNow`, `fetchCloud` | [cloudSync.js](src/js/modules/services/cloudSync.js) | Google Apps Script (GAS) との同期 |

---

## 新しいモジュールの追加方法

1.  **ファイルの作成**: `src/js/modules/features/` などに新しい `.js` ファイルを作成します。
2.  **ボイラープレートの記述**: 以下の形式で記述し、グローバル（`window`）に公開します。

```javascript
(function () {
  'use strict';

  const MyNewModule = {
    init() {
      // 初期化処理
    },
    doSomething() {
      // StateModuleから状態を取得
      const lyrics = window.StateModule?.StateManager.getLyricsData();
      console.log('Doing something with', lyrics);
    }
  };

  // グローバルに公開
  window.MyNewModule = MyNewModule;
})();
```

3.  **manifest.json への登録**: `manifest.json` の `content_scripts` -> `js` 配列に、依存関係を考慮してファイルパスを追加します。
    - ※ `core/state.js` や `core/constants.js` は先に読み込まれる必要があるため、配列の前方に配置してください。

---

## 開発の注意点

- **グローバル変数の直接参照を避ける**: `window.lyricsData` などを直接書き換えず、`window.StateModule.StateManager.setLyricsData()` を使用してください。
- **PiPへの配慮**: 歌詞の描画ロジックを修正する場合、`window.PipManager.pipLyricsContainer` も更新対象に含める必要があります（`uiRendering.js` を参照）。

---

## お困りの場合
原本の挙動を確認したい場合は、jsディレクトリ配下の `content_original.js` を参照してください。