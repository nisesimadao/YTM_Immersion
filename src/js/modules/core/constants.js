// ===================== Constants Module =====================
// All constants and static values - extracted from original content.js

(function () {
  'use strict';

  // Extension API
  const EXT =
    typeof globalThis.chrome !== 'undefined'
      ? globalThis.chrome
      : (typeof globalThis.browser !== 'undefined' ? globalThis.browser : null);

  // Remote texts URL - from original
  const REMOTE_TEXTS_URL =
    'https://raw.githubusercontent.com/naikaku1/YTM-Modern-UI/main/src/lang/ui.json';

  // Sentinel values
  const NO_LYRICS_SENTINEL = '__NO_LYRICS__';

  // Video check interval
  const VIDEO_CHECK_INTERVAL = 1000; // Check video element every second

  // Fallback language texts - from original
  const LOCAL_FALLBACK_TEXTS = {
    ja: {
      unit_hour: "時間",
      unit_minute: "分",
      unit_second: "秒",
      replay_playTime: "総再生時間",
      replay_plays: "回再生",
      replay_topSong: "トップソング",
      replay_topArtist: "トップアーティスト",
      replay_obsession: "ヘビロテ中",
      replay_ranking: "再生数ランキング",
      replay_today: "今日",
      replay_week: "今週",
      replay_all: "全期間",
      replay_empty: "まだ再生データがありません...",
      replay_no_data_sub: "曲を聴くとここに表示されます",
      replay_reset_confirm: "本当に再生履歴を全て削除しますか？\nこの操作は取り消せません。",
      replay_vibe: "あなたの雰囲気",
      replay_lyrics_heard: "累計行数",
      settings_title: "設定",
      settings_ui_lang: "UI言語 / Language",
      settings_trans: "歌詞翻訳機能を使う",
      settings_shared_trans: "共有翻訳を使う（APIキー不要）",
      settings_main_lang: "メイン言語 (大きく表示)",
      settings_sub_lang: "サブ言語 (小さく表示)",
      settings_save: "保存",
      settings_reset: "リセット",
      settings_saved: "設定を保存しました",
      settings_sync_offset: "歌詞同期オフセット",
      settings_sync_offset_save: "曲が切り替わったときにオフセットをリセットしない",
      settings_fast_mode: "高速読み込みモード (既にデータベースにある曲のみ取得出来ます。自動登録は無効です。)"
    },
    en: {
      unit_hour: "hours",
      unit_minute: "minutes",
      unit_second: "seconds",
      replay_playTime: "Total play time",
      replay_plays: "Plays",
      replay_topSong: "Top song",
      replay_topArtist: "Top artist",
      replay_obsession: "On repeat",
      replay_ranking: "Play count ranking",
      replay_today: "Today",
      replay_week: "This week",
      replay_all: "All time",
      replay_empty: "No play data yet...",
      replay_no_data_sub: "Play some songs to see them here",
      replay_reset_confirm: "Are you sure you want to delete all play history?\nThis action can't be undone.",
      replay_vibe: "Your vibe",
      replay_lyrics_heard: "Total lines"
    }
  };

  // Constants API
  const Constants = {
    // Get extension API
    get EXT() {
      return EXT;
    },

    // Get remote texts URL
    get REMOTE_TEXTS_URL() {
      return REMOTE_TEXTS_URL;
    },

    // Get sentinel values
    get NO_LYRICS_SENTINEL() {
      return NO_LYRICS_SENTINEL;
    },

    // Get video check interval
    get VIDEO_CHECK_INTERVAL() {
      return VIDEO_CHECK_INTERVAL;
    },

    // Get fallback texts
    get LOCAL_FALLBACK_TEXTS() {
      return LOCAL_FALLBACK_TEXTS;
    },

    // Get chrome API alias
    get chrome() {
      return EXT;
    }
  };

  // Export for module system
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Constants };
  } else {
    window.ConstantsModule = { Constants };
  }

})();
