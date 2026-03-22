/* globals chrome */
(function () {
  // ===================== Discord Presence (Localhost) =====================
  const DiscordPresenceModule = {
    DISCORD_PRESENCE_THROTTLE_MS: 1200,
    lastPresence: { line1: '', line2: '', ts: 0 },

    init() {
      // 初期化処理
    },

    // 文字列を正規化
    _normPresence(s, maxLen = 128) {
      const t = (s ?? '').toString().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!t) return '';
      return t.length > maxLen ? (t.slice(0, maxLen - 1) + '…') : t;
    },

    // ライン1を構築
    _buildPresenceLine1(meta) {
      if (!meta) return '';
      const parts = [meta.artist, meta.album, meta.title]
        .map(v => (v ?? '').toString().trim())
        .filter(Boolean);
      return parts.join(' - ');
    },

    // Discordプレゼンス送信
    sendDiscordPresence(meta, lyricLine) {
      try {
        if (!meta) return;
        const line1 = this._normPresence(this._buildPresenceLine1(meta), 128);
        const line2 = this._normPresence(lyricLine || '', 128);
        const now = Date.now();

        // スパム防止：内容が変更された場合、または十分な時間が経過した場合のみ送信
        if (line1 === this.lastPresence.line1 && 
            line2 === this.lastPresence.line2 && 
            (now - this.lastPresence.ts) < this.DISCORD_PRESENCE_THROTTLE_MS) {
          return;
        }
        
        this.lastPresence = { line1, line2, ts: now };

        chrome.runtime.sendMessage({
          type: 'DISCORD_PRESENCE_UPDATE',
          payload: {
            line1,
            line2,
            url: this.getCurrentVideoUrl(),
            meta: {
              title: meta.title || '',
              artist: meta.artist || '',
              album: meta.album || '',
              src: meta.src || null
            }
          }
        });
      } catch (e) {
        // 無視
      }
    },

    // Discordプレゼンスクリア
    clearDiscordPresence() {
      try {
        chrome.runtime.sendMessage({ type: 'DISCORD_PRESENCE_CLEAR' });
      } catch (e) { 
        // 無視
      }
    },

    // 現在の動画URL取得
    getCurrentVideoUrl() {
      try {
        const url = new URL(location.href);
        const vid = url.searchParams.get('v');
        return vid ? `https://youtu.be/${vid}` : location.href;
      } catch (e) {
        console.warn('Failed to get current video url', e);
        return '';
      }
    },

    // 現在の動画ID取得
    getCurrentVideoId() {
      try {
        const url = new URL(location.href);
        return url.searchParams.get('v');
      } catch (e) {
        return null;
      }
    },

    // メタデータ取得
    getMetadata() {
      // MediaSessionメタデータを優先（最も正確）
      if (navigator.mediaSession?.metadata) {
        const { title, artist, album, artwork } = navigator.mediaSession.metadata;
        return {
          title: (title || '').toString(),
          artist: (artist || '').toString(),
          album: (album || '').toString(),
          src: Array.isArray(artwork) && artwork.length ? artwork[artwork.length - 1].src : null
        };
      }

      // フォールバック：プレイヤーバーから読む
      const tEl = document.querySelector('yt-formatted-string.title.style-scope.ytmusic-player-bar');
      const aEl = document.querySelector('.byline.style-scope.ytmusic-player-bar');
      if (!(tEl && aEl)) return null;

      const parts = (aEl.textContent || '')
        .split('•')
        .map(s => (s || '').trim())
        .filter(Boolean);

      return {
        title: (tEl.textContent || '').trim(),
        artist: parts[0] || '',
        album: parts[1] || '',
        src: null
      };
    },

    // 現在表示中の歌詞テキスト取得
    getCurrentRenderedLyricText() {
      if (window.lastActiveIndex >= 0 && Array.isArray(window.lyricsData) && window.lyricsData[window.lastActiveIndex]) {
        const line = window.lyricsData[window.lastActiveIndex];
        const txt = String(line.text || line.rawLine || '').trim();
        if (txt) return txt;
      }
      
      try {
        const activeRow = window.UIRenderingModule?.UIRenderingModule?.ui?.lyrics ? 
          window.UIRenderingModule.UIRenderingModule.ui.lyrics.querySelector('.lyric-line.active .lyric-main, .lyric-line.active') : 
          null;
        return activeRow && activeRow.textContent ? activeRow.textContent.trim() : '';
      } catch (e) {
        return '';
      }
    },

    // 現在表示中の歌詞インデックス取得
    getCurrentRenderedLyricIndex() {
      if (!Array.isArray(window.lyricsData) || !window.lyricsData.length) return -1;
      if (Number.isInteger(window.lastActiveIndex) && window.lastActiveIndex >= 0) {
        let nonEmptyIndex = -1;
        for (let i = 0; i <= Math.min(window.lastActiveIndex, window.lyricsData.length - 1); i++) {
          const txt = String(window.lyricsData[i]?.text || window.lyricsData[i]?.rawLine || '').trim();
          if (txt) nonEmptyIndex += 1;
        }
        return nonEmptyIndex;
      }
      return -1;
    },

    // 再生状態を監視してDiscordプレゼンスを更新
    startPresenceMonitoring() {
      // 定期的な更新ではなく、歌詞の更新時に送信する方式
      setInterval(() => {
        const meta = this.getMetadata();
        if (meta) {
          const lyricText = this.getCurrentRenderedLyricText();
          this.sendDiscordPresence(meta, lyricText);
        }
      }, 1000); // 1秒ごとにチェック
    },

    // プレゼンス手動更新
    updatePresence() {
      const meta = this.getMetadata();
      if (meta) {
        const lyricText = this.getCurrentRenderedLyricText();
        this.sendDiscordPresence(meta, lyricText);
      }
    },

    // プレゼンスリセット
    resetPresence() {
      this.lastPresence = { line1: '', line2: '', ts: 0 };
      this.clearDiscordPresence();
    }
  };

  // Initialize
  DiscordPresenceModule.init();

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DiscordPresenceModule };
  } else {
    window.DiscordPresenceModule = { DiscordPresenceModule };
  }
})();
