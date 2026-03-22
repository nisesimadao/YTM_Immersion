/* globals chrome */
(function () {
  // ===================== Daily Replay =====================
  const ReplayManager = {
    HISTORY_KEY: 'ytm_local_history',
    currentVideoId: null,
    hasRecordedCurrent: false,
    currentPlayTime: 0,
    lastSaveTime: 0,

    currentLyricLines: 0,
    recordedLyricLines: 0,

    ui: null,

    init() {
      this.ui = {};
    },

    formatDuration: function (seconds) {
      if (!seconds) return `0${t('unit_second')}`;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const uH = t('unit_hour');
      const uM = t('unit_minute');
      const uS = t('unit_second');
      const sp = window.ConfigModule?.ConfigManager.get('uiLang') === 'ja' ? '' : ' ';
      if (h > 0) return `${h}${uH}${sp}${m}${uM}${sp}${s}${uS}`;
      if (m > 0) return `${m}${uM}${sp}${s}${uS}`;
      return `${s}${uS}`;
    },

    incrementLyricCount: function () {
      this.currentLyricLines++;
    },

    exportHistory: async function () {
      const storage = window.Storage?.storage;
      if (!storage) return;
      
      const history = await storage.get(this.HISTORY_KEY) || [];
      if (history.length === 0) {
        alert('保存する履歴データがありません。');
        return;
      }
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `ytm_history_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    importHistory: function () {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
              if (confirm('履歴を復元しますか？\n[OK] 現在の履歴に結合 (マージ)\n[キャンセル] キャンセル')) {
                const storage = window.Storage?.storage;
                if (!storage) return;
                
                const current = await storage.get(this.HISTORY_KEY) || [];
                const existingIds = new Set(current.map(i => i.id + '_' + i.timestamp));
                const newData = data.filter(i => !existingIds.has(i.id + '_' + i.timestamp));
                const merged = current.concat(newData);
                merged.sort((a, b) => a.timestamp - b.timestamp);
                await storage.set(this.HISTORY_KEY, merged);
                alert('履歴を復元しました！');
                this.renderUI();
              }
            } else {
              alert('無効なファイル形式です。');
            }
          } catch (err) {
            console.error(err);
            alert('ファイルの読み込みに失敗しました。');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    check: async function () {
      const video = document.querySelector('video');
      if (!video) return;
      const vid = window.UIManagerModule?.UIManager?.getCurrentVideoId ? window.UIManagerModule.UIManager.getCurrentVideoId() : null;
      if (!vid) return;

      if (vid !== this.currentVideoId) {
        this.currentVideoId = vid;
        this.hasRecordedCurrent = false;
        this.currentPlayTime = 0;
        this.lastSaveTime = 0;
        this.currentLyricLines = 0;
        this.recordedLyricLines = 0;
        return;
      }

      if (!video.paused) {
        this.currentPlayTime++;
        const isPlayed = this.currentPlayTime > 30 || (video.duration > 10 && this.currentPlayTime / video.duration > 0.4);
        if (isPlayed && !this.hasRecordedCurrent) {
          this.hasRecordedCurrent = true;
          this.lastSaveTime = Date.now();
          await this.saveHistory();
        }
      }
    },

    saveHistory: async function () {
      const storage = window.Storage?.storage;
      if (!storage) return;
      
      const history = await storage.get(this.HISTORY_KEY) || [];
      const now = Date.now();
      const newEntry = {
        id: this.currentVideoId,
        timestamp: now,
        playTime: this.currentPlayTime,
        lyricLines: this.currentLyricLines,
        recordedLyricLines: this.recordedLyricLines
      };
      history.push(newEntry);
      await storage.set(this.HISTORY_KEY, history);
    },

    renderUI: function () {
      // UI rendering would be implemented here
      console.log('ReplayManager UI render called');
    }
  };

  // Export for module system
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReplayManager };
  } else {
    window.ReplayManagerModule = { ReplayManager };
  }

})();
