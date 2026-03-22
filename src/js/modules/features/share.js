/* globals chrome */
(function () {
  // ===================== Share Functionality Module =====================
  const ShareModule = {
    shareMode: false,
    shareStartIndex: null,
    shareEndIndex: null,

    init() {
      // 初期化処理
    },

    // シェアボタンのクリック処理
    onShareButtonClick() {
      const lyricsData = window.StateModule?.StateManager.getLyricsData() || [];
      if (!lyricsData.length) {
        window.UIRenderingModule?.UIRenderingModule?.showToast?.('共有できる歌詞がありません');
        return;
      }
      
      this.shareMode = !this.shareMode;
      this.shareStartIndex = null;
      this.shareEndIndex = null;
      
      if (this.shareMode) {
        document.body.classList.add('ytm-share-select-mode');
        if (window.UIRenderingModule?.UIRenderingModule?.ui?.shareBtn) {
          window.UIRenderingModule.UIRenderingModule.ui.shareBtn.classList.add('share-active');
        }
        window.UIRenderingModule?.UIRenderingModule?.showToast?.('共有したい歌詞の開始行と終了行をクリックしてください');
      } else {
        document.body.classList.remove('ytm-share-select-mode');
        if (window.UIRenderingModule?.UIRenderingModule?.ui?.shareBtn) {
          window.UIRenderingModule.UIRenderingModule.ui.shareBtn.classList.remove('share-active');
        }
      }
      
      this.updateShareSelectionHighlight();
    },

    // シェア行クリック処理
    handleShareLineClick(index) {
      if (!this.shareMode) return;
      
      const lyricsData = window.StateModule?.StateManager.getLyricsData() || [];
      if (!lyricsData.length) return;
      
      if (this.shareStartIndex == null) {
        this.shareStartIndex = index;
        this.shareEndIndex = null;
        this.updateShareSelectionHighlight();
        return;
      }
      
      if (this.shareEndIndex == null) {
        this.shareEndIndex = index;
        this.updateShareSelectionHighlight();
        this.finalizeShareSelection();
        return;
      }
      
      this.shareStartIndex = index;
      this.shareEndIndex = null;
      this.updateShareSelectionHighlight();
    },

    // シェア選択ハイライト更新
    updateShareSelectionHighlight() {
      const lyricsContainer = window.UIRenderingModule?.UIRenderingModule?.ui?.lyrics;
      if (!lyricsContainer) return;
      
      const rows = lyricsContainer.querySelectorAll('.lyric-line');
      rows.forEach(r => {
        r.classList.remove('share-select');
        r.classList.remove('share-select-range');
        r.classList.remove('share-select-start');
        r.classList.remove('share-select-end');
      });
      
      if (!this.shareMode || this.shareStartIndex == null) return;
      
      const lyricsData = window.StateModule?.StateManager.getLyricsData() || [];
      if (!lyricsData.length) return;
      
      const max = lyricsData.length ? lyricsData.length - 1 : 0;
      let s, e;
      
      if (this.shareEndIndex == null) {
        const idx = Math.max(0, Math.min(this.shareStartIndex, max));
        s = idx;
        e = idx;
      } else {
        const minIdx = Math.min(this.shareStartIndex, this.shareEndIndex);
        const maxIdx = Math.max(this.shareStartIndex, this.shareEndIndex);
        s = Math.max(0, Math.min(minIdx, max));
        e = Math.max(0, Math.min(maxIdx, max));
      }
      
      for (let i = s; i <= e && i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        row.classList.add('share-select-range');
        if (i === s) row.classList.add('share-select-start');
        if (i === e) row.classList.add('share-select-end');
      }
    },

    // シェア選択情報取得
    getShareSelectionInfo() {
      const lyricsData = window.StateModule?.StateManager.getLyricsData() || [];
      if (!lyricsData.length || this.shareStartIndex == null) return null;
      
      const max = lyricsData.length - 1;
      let s, e;
      
      if (this.shareEndIndex == null) {
        const idx = Math.max(0, Math.min(this.shareStartIndex, max));
        s = idx;
        e = idx;
      } else {
        const minIdx = Math.min(this.shareStartIndex, this.shareEndIndex);
        const maxIdx = Math.max(this.shareStartIndex, this.shareEndIndex);
        s = Math.max(0, Math.min(minIdx, max));
        e = Math.max(0, Math.min(maxIdx, max));
      }
      
      const parts = [];
      for (let i = s; i <= e; i++) {
        if (!lyricsData[i]) continue;
        let t = (lyricsData[i].text || '').trim();
        if (!t && lyricsData[i].translation) {
          t = String(lyricsData[i].translation).trim();
        }
        if (t) parts.push(t);
      }
      
      const phrase = parts.join('\n');
      let timeMs = 0;
      
      const hasTs = window.StateModule?.StateManager.getHasTimestamp() || false;
      if (hasTs && lyricsData[s] && typeof lyricsData[s].time === 'number') {
        timeMs = Math.round(lyricsData[s].time * 1000);
      } else {
        const v = document.querySelector('video');
        if (v && typeof v.currentTime === 'number') {
          timeMs = Math.round(v.currentTime * 1000);
        }
      }
      
      return { phrase, timeMs };
    },

    // HTTPSに正規化
    normalizeToHttps(url) {
      if (!url) return url;
      try {
        const u = new URL(url, 'https://lrchub.coreone.work');
        u.protocol = 'https:';
        return u.toString();
      } catch (e) {
        if (url.startsWith('http://')) {
          return 'https://' + url.slice(7);
        }
        return url;
      }
    },

    // クリップボードにコピー（改善版）
    async copyToClipboard(text) {
      if (!text) {
        console.warn('[ShareModule] Empty text provided to clipboard');
        return false;
      }

      // Method 1: Modern Clipboard API with fallback
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          console.log('[ShareModule] Text copied using modern clipboard API');
          return true;
        } catch (e) {
          console.warn('[ShareModule] Modern clipboard API failed, trying fallback:', e);
          // Continue to fallback methods
        }
      }

      // Method 2: Fallback using document.execCommand
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = `
          position: fixed;
          top: -9999px;
          left: -9999px;
          opacity: 0;
          pointer-events: none;
          width: 1px;
          height: 1px;
        `;
        
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length); // Ensure full selection
        
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        
        if (success) {
          console.log('[ShareModule] Text copied using execCommand fallback');
          return true;
        } else {
          console.warn('[ShareModule] execCommand copy failed');
        }
      } catch (e) {
        console.error('[ShareModule] execCommand fallback error:', e);
      }

      // Method 3: Final fallback - prompt user to copy manually
      try {
        const isSecureContext = window.isSecureContext;
        if (isSecureContext) {
          // In secure context, we can show a temporary button
          const button = document.createElement('button');
          button.textContent = 'クリップボードにコピー';
          button.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            padding: 10px 20px;
            background: #333;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          `;
          
          button.onclick = () => {
            navigator.clipboard.writeText(text).then(() => {
              document.body.removeChild(button);
              console.log('[ShareModule] Text copied after user interaction');
            }).catch(err => {
              console.error('[ShareModule] Final clipboard attempt failed:', err);
            });
          };
          
          document.body.appendChild(button);
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            if (document.body.contains(button)) {
              document.body.removeChild(button);
            }
          }, 5000);
          
          console.log('[ShareModule] Showing manual copy button');
          return false;
        } else {
          // In non-secure context, use alert
          alert('以下のテキストをクリップボードにコピーしてください:\n\n' + text);
          console.log('[ShareModule] Showed manual copy dialog');
          return false;
        }
      } catch (e) {
        console.error('[ShareModule] Final fallback error:', e);
      }
      
      return false;
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

    // シェア選択確定
    async finalizeShareSelection() {
      const info = this.getShareSelectionInfo();
      if (!info || !info.phrase) {
        window.UIRenderingModule?.UIRenderingModule?.showToast?.('選択された歌詞が空です');
        return;
      }
      
      const youtube_url = this.getCurrentVideoUrl();
      const video_id = this.getCurrentVideoId();
      const lang = (window.config?.mainLang && window.config.mainLang !== 'original') ? window.config.mainLang : 'ja';
      
      try {
        const res = await new Promise(resolve => {
          chrome.runtime.sendMessage(
            { type: 'SHARE_REGISTER', payload: { youtube_url, video_id, phrase: info.phrase, lang, time_ms: info.timeMs } },
            resolve
          );
        });
        
        if (!res || !res.success) {
          console.error('Share register failed:', res && res.error);
          window.UIRenderingModule?.UIRenderingModule?.showToast?.('共有に失敗しました');
          return;
        }
        
        let shareUrl = (res.data && res.data.share_url) || '';
        shareUrl = this.normalizeToHttps(shareUrl);
        
        if (!shareUrl && video_id) {
          const sec = Math.round((info.timeMs || 0) / 1000);
          shareUrl = `https://lrchub.coreone.work/s/${video_id}/${sec}`;
        }
        
        if (shareUrl) {
          await this.copyToClipboard(shareUrl);
          window.UIRenderingModule?.UIRenderingModule?.showToast?.('共有リンクをコピーしました');
        } else {
          window.UIRenderingModule?.UIRenderingModule?.showToast?.('共有リンクの取得に失敗しました');
        }
      } catch (e) {
        console.error('Share register error', e);
        window.UIRenderingModule?.UIRenderingModule?.showToast?.('共有に失敗しました');
      } finally {
        this.shareMode = false;
        this.shareStartIndex = null;
        this.shareEndIndex = null;
        document.body.classList.remove('ytm-share-select-mode');
        if (window.UIRenderingModule?.UIRenderingModule?.ui?.shareBtn) {
          window.UIRenderingModule.UIRenderingModule.ui.shareBtn.classList.remove('share-active');
        }
        this.updateShareSelectionHighlight();
      }
    },

    // シェアモードをリセット
    resetShareMode() {
      this.shareMode = false;
      this.shareStartIndex = null;
      this.shareEndIndex = null;
      document.body.classList.remove('ytm-share-select-mode');
      if (window.UIRenderingModule?.UIRenderingModule?.ui?.shareBtn) {
        window.UIRenderingModule.UIRenderingModule.ui.shareBtn.classList.remove('share-active');
      }
      this.updateShareSelectionHighlight();
    },

    // シェア状態を取得
    getShareState() {
      return {
        shareMode: this.shareMode,
        shareStartIndex: this.shareStartIndex,
        shareEndIndex: this.shareEndIndex
      };
    }
  };

  // Initialize
  ShareModule.init();

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShareModule };
  } else {
    window.ShareModule = { ShareModule };
  }
})();
