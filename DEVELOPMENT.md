# YTM Immersion Development Guide

`content_original.js` は、以前は多くの機能を一つのファイルにまとめていました。
現在は、保守性と可読性を上げるため、役割ごとにモジュールへ分割しています。
この文書では、各機能の移動先とモジュール間の連携方法を説明します。

## 構成

モジュールは `src/js/modules/` 配下にあり、次のカテゴリに分かれています。

- **core**：状態管理、イベントループ、設定管理など、アプリケーションの基盤。
- **lyrics**：歌詞の取得、解析、読み込み。
- **ui**：画面描画、レイアウト管理、ハイライト処理。
- **features**：PiP、共有、Discord 連携などの個別機能。
- **services**：翻訳、ストレージ、i18n などの外部連携と共通サービス。

### モジュール間の連携

モジュール間の連携には、主に次の二つを使います。

1. **StateModule（StateManager）**：現在の曲、歌詞データ、設定などの共有状態を管理します。
   状態の取得と更新は、原則として StateManager を経由します。
2. **`window` オブジェクト**：各モジュールは `window.ModuleName`（例：`window.PipManager`、`window.UIRendering`）として自身を公開します。
   他のモジュールから関数を直接呼ぶ場合に使用します。

## 機能マッピング

`content_original.js` にあった主な機能の移動先は次の通りです。

| 機能または関数 | 移動先ファイル | 説明 |
| :--- | :--- | :--- |
| `renderLyrics`, `updateLyricHighlight` | [uiRendering.js](src/js/modules/ui/uiRendering.js) | 歌詞の生成、色付け、スクロール |
| `PipManager` | [pipManager.js](src/js/modules/features/pipManager.js) | Picture-in-Picture ウィンドウの制御 |
| `parseBaseLRC`, `extractTimestamps` | [lyricsParser.js](src/js/modules/lyrics/lyricsParser.js) | LRC 形式と文字列からのタイムスタンプ解析 |
| `loadLyrics`, `applyLyricsText` | [lyricsLoader.js](src/js/modules/lyrics/lyricsLoader.js) | 歌詞データの取得と適用 |
| `tick`, `mainLoop`, `EventsManager` | [events.js](src/js/modules/core/events.js) | 実行ループとイベント監視 |
| `StateManager` | [state.js](src/js/modules/core/state.js) | `lyricsData`、`hasTimestamp` などの状態管理 |
| `initLayout`, `updateMetaUI` | [uiManager.js](src/js/modules/ui/uiManager.js) | プレイヤー周辺の DOM 構築と UI 更新 |
| `syncNow`, `fetchCloud` | [cloudSync.js](src/js/modules/services/cloudSync.js) | Google Apps Script（GAS）との同期 |

## 新しいモジュールの追加

1. `src/js/modules/features/` など、役割に合うディレクトリへ新しい `.js` ファイルを作成します。
2. 次の形式でモジュールを定義し、`window` へ公開します。

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

3. `manifest.json` の `content_scripts` → `js` 配列へファイルパスを追加します。
   `core/state.js` や `core/constants.js` など先に読み込む必要があるモジュールは、依存するファイルより前に配置してください。

## 開発時の注意

- **共有状態は StateManager 経由で変更する**：`window.lyricsData` などを直接書き換えず、`window.StateModule.StateManager.setLyricsData()` などを使用します。
- **PiP 側の表示も更新する**：歌詞描画を変更する場合は、`window.PipManager.pipLyricsContainer` も更新対象になります。
  実装例は `uiRendering.js` を参照してください。

## 旧実装の確認

分割前の挙動を確認する場合は、`src/js/content_original.js` を参照してください。
