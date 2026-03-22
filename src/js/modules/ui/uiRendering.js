/* globals chrome */
(function () {
  // ===================== UI & Rendering Module =====================
  const UIRenderingModule = {
    ui: {},
    config: {},
    shareMode: false,
    shareStartIndex: null,
    shareEndIndex: null,
    lastActiveIndex: -1,
    toastTimer: null,

    init() {
      this.ui = {};
      this.setupToastStyles();
    },

    setupToastStyles() {
      if (document.getElementById('ytm-toast-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'ytm-toast-styles';
      style.textContent = `
        #ytm-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        
        #ytm-toast.visible {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    },

    // 要素作成ヘルパー
    createEl(tag, id, cls, html) {
      const el = document.createElement(tag);
      if (id) el.id = id;
      if (cls) el.className = cls;
      if (html !== undefined && html !== null) el.innerHTML = html;
      return el;
    },

    // トースト表示
    showToast(text) {
      if (!text) return;
      let el = document.getElementById('ytm-toast');
      if (!el) {
        el = this.createEl('div', 'ytm-toast', '', '');
        document.body.appendChild(el);
      }
      el.textContent = text;
      el.classList.add('visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        el.classList.remove('visible');
      }, 5000);
    },

    // 歌詞の最適化改行
    optimizeLineBreaks(text) {
      if (!text) return '';

      const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(text));

      let html = '';
      let buffer = '';

      const rules = {
        suffixes: new Set([
          'て', 'に', 'を', 'は', 'が', 'の', 'へ', 'と', 'も', 'で', 'や', 'し', 'から', 'より', 'だけ', 'まで', 'こそ', 'さえ', 'でも', 'など', 'なら', 'くらい', 'ぐらい', 'ばかり',
          'ね', 'よ', 'な', 'さ', 'わ', 'ぞ', 'ぜ', 'かしら', 'かな', 'かも', 'だし', 'もん', 'もの',
          'って', 'けど', 'けれど', 'のに', 'ので', 'から', 'ため', 'よう', 'こと', 'もの', 'わけ', 'ほう', 'ところ', 'とおり',
          'た', 'だ', 'ない', 'たい', 'ます', 'ません', 'う', 'よう', 'れる', 'られる', 'せる', 'させる', 'ん', 'ず',
          'てた', 'てる', 'ちゃう', 'じゃん', 'なきゃ', 'なくちゃ', 'く', 'き', 'けれ', 'れば',
          'った', 'たら', 'たり',
          'か', 'かい', 'だい', 'いる', 'ある', 'くる', 'いく', 'みる', 'おく', 'しまう', 'ほしい', 'あげる', 'くれる', 'もらう',
          '、', '。', '，', '．', '…', '・', '！', '？', '!', '?', '~', '～', '"', '"', '\'', '\'', ')', ']', '}', '」', '』', '】', '）'
        ]),
        isEnglish: (w) => /^[a-zA-Z0-9'\-\.,!?:;]+$/.test(w),
        isSpace: (w) => /^\s+$/.test(w),
        isOpenParen: (w) => /^[\(\[\{「『（【]$/.test(w),
        hasKanji: (w) => /[\u4E00-\u9FFF]/.test(w),
        isHiragana: (w) => /^[\u3040-\u309F\u30FC]+$/.test(w),
        isKatakana: (w) => /^[\u30A0-\u30FF\u30FC]+$/.test(w),
        startsWithSmallKana: (w) => /^[\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u3095\u3096]/.test(w)
      };

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const word = seg.segment;
        const next = segments[i + 1];

        buffer += word;

        if (!next) {
          html += `<span class="lyric-phrase">${buffer}</span>`;
          break;
        }

        const nextWord = next.segment;
        let shouldMerge = false;

        if (rules.startsWithSmallKana(nextWord)) {
          shouldMerge = true;
        }
        else if (rules.suffixes.has(nextWord)) {
           if (!rules.isOpenParen(nextWord)) {
             shouldMerge = true;
           }
        }
        else if (rules.hasKanji(word) && rules.isHiragana(nextWord)) {
          shouldMerge = true;
        }
        else if (rules.isKatakana(word) && rules.isKatakana(nextWord)) {
          shouldMerge = true;
        }
        else if ((rules.isEnglish(word) || rules.isSpace(word)) && 
                 (rules.isEnglish(nextWord) || rules.isSpace(nextWord))) {
          shouldMerge = true;
        }

        if (shouldMerge) {
          continue;
        }

        html += `<span class="lyric-phrase">${buffer}</span>`;
        buffer = '';
      }

      return html;
    },

    // 歌詞のレンダリング
    renderLyrics(data) {
      if (!this.ui || !this.ui.lyrics) {
        this.ui = window.StateModule?.StateManager.getUI() || this.ui || {};
      }
      if (!this.ui.lyrics) return;
      this.ui.lyrics.innerHTML = '';
      this.ui.lyrics.scrollTop = 0;
      const hasData = Array.isArray(data) && data.length > 0;
      const hasTimestamp = window.StateModule?.StateManager.getHasTimestamp() || false;
      document.body.classList.toggle('ytm-no-lyrics', !hasData);
      document.body.classList.toggle('ytm-has-timestamp', hasTimestamp);
      document.body.classList.toggle('ytm-no-timestamp', !hasTimestamp);

      const fragment = document.createDocumentFragment();

      data.forEach((line, index) => {
        const row = this.createEl('div', '', 'lyric-line');

        if (line && line.duetSide === 'right') {
          row.classList.add('sub-vocal');
        } else if (line && line.duetSide === 'left') {
          row.classList.add('main-vocal');
        }

        if (typeof line.time === 'number') {
          row.dataset.startTime = String(line.time);
        }

        const mainSpan = this.createEl('span', '', 'lyric-main');

        // 動的歌詞ハイライト
        let dyn = null;
        
        if (line && line.duetSide === 'right') {
          // サブボーカル用のdynamic lines
          const duetSubDynamicLines = window.StateModule?.StateManager.getDuetSubDynamicLines() || [];
          if (Array.isArray(duetSubDynamicLines) && duetSubDynamicLines.length) {
            if (typeof line.time === 'number') {
               dyn = window.LyricsParserModule?.LyricsParser?.getSubDynamicLineForTime?.(line.time);
            }
          }
        } else {
          // メインボーカル用のdynamic lines
          const dynamicLines = window.StateModule?.StateManager.getDynamicLines() || [];
          if (Array.isArray(dynamicLines) && dynamicLines.length) {
            if (typeof line.time === 'number') {
               dyn = dynamicLines.find(d => d.time === line.time);
            } else {
               const isDuetMode = document.body.classList.contains('ytm-duet-mode');
               if (!isDuetMode) {
                  dyn = dynamicLines[index];
               }
            }
          }
        }
        
        if (dyn && Array.isArray(dyn.chars) && dyn.chars.length) {
          dyn.chars.forEach((ch, ci) => {
            const chSpan = this.createEl('span', '', 'lyric-char');
            const cc = (ch.c === '\t') ? ' ' : ch.c;
            chSpan.textContent = (cc === ' ') ? '\u00A0' : cc;
            chSpan.dataset.charIndex = String(ci);
            if (typeof ch.t === 'number') {
              chSpan.dataset.time = String(ch.t / 1000);
            }
            chSpan.classList.add('char-pending');
            mainSpan.appendChild(chSpan);
          });
        } else {
          const rawText = line ? line.text : '';
          // Use textContent with proper escaping for security
          const textNode = document.createTextNode('');
          const phraseContainer = document.createElement('div');
          phraseContainer.className = 'lyric-phrase';
          phraseContainer.textContent = rawText; // Safe text assignment
          
          // Parse and optimize line breaks safely
          const optimizedHTML = this.optimizeLineBreaks(rawText);
          if (optimizedHTML) {
            // Use a temporary element to parse HTML safely
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = optimizedHTML;
            
            // Extract text content safely
            phraseContainer.textContent = tempDiv.textContent || tempDiv.innerText || rawText;
          }
          
          mainSpan.appendChild(phraseContainer);
        }
        row.appendChild(mainSpan);
        
        if (line && line.translation) {
          const subSpan = this.createEl('span', '', 'lyric-translation', line.translation);
          row.appendChild(subSpan);
          row.classList.add('has-translation');
        }

        row.onclick = () => {
          if (this.shareMode) {
            this.handleShareLineClick(index);
            return;
          }
          const hasTimestamp = window.StateModule?.StateManager.getHasTimestamp() || false;
          if (!hasTimestamp || !line || line.time == null) return;
          const v = document.querySelector('video');
          if (v) v.currentTime = line.time + (window.StateModule?.StateManager.getTimeOffset() || 0);
        };
        fragment.appendChild(row);
      });

      this.ui.lyrics.appendChild(fragment);

      // PiPウィンドウにも同期
      if (window.PipManagerModule?.PipManager?.pipWindow && window.PipManagerModule.PipManager.pipLyricsContainer) {
        window.PipManagerModule.PipManager.pipLyricsContainer.innerHTML = this.ui.lyrics.innerHTML;
        if (window.PipManagerModule.PipManager.pipWindow.document) {
          const hasTs = window.StateModule?.StateManager.getHasTimestamp() || false;
          window.PipManagerModule.PipManager.pipWindow.document.body.classList.toggle('ytm-no-timestamp', !hasTs);
        }
      }

      this.updateShareSelectionHighlight();
    },

    // シェア選択ハイライト更新
    updateShareSelectionHighlight() {
      if (!this.ui.lyrics) return;
      const rows = this.ui.lyrics.querySelectorAll('.lyric-line');
      rows.forEach(r => {
        r.classList.remove('share-select');
        r.classList.remove('share-select-range');
        r.classList.remove('share-select-start');
        r.classList.remove('share-select-end');
      });
      if (!this.shareMode || this.shareStartIndex == null || !window.lyricsData?.length) return;
      const max = window.lyricsData.length ? window.lyricsData.length - 1 : 0;
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

    // シェア行クリック処理
    handleShareLineClick(index) {
      if (!this.shareMode) return;
      if (!window.lyricsData?.length) return;
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

    // シェア選択確定
    async finalizeShareSelection() {
      const info = this.getShareSelectionInfo();
      if (!info || !info.phrase) {
        this.showToast('選択された歌詞が空です');
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
          this.showToast('共有に失敗しました');
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
          this.showToast('共有リンクをコピーしました');
        } else {
          this.showToast('共有リンクの取得に失敗しました');
        }
      } catch (e) {
        console.error('Share register error', e);
        this.showToast('共有に失敗しました');
      } finally {
        this.shareMode = false;
        this.shareStartIndex = null;
        this.shareEndIndex = null;
        document.body.classList.remove('ytm-share-select-mode');
        if (this.ui.shareBtn) this.ui.shareBtn.classList.remove('share-active');
        this.updateShareSelectionHighlight();
      }
    },

    // シェア選択情報取得
    getShareSelectionInfo() {
      if (!window.lyricsData?.length || this.shareStartIndex == null) return null;
      const max = window.lyricsData.length - 1;
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
        if (!window.lyricsData[i]) continue;
        let t = (window.lyricsData[i].text || '').trim();
        if (!t && window.lyricsData[i].translation) {
          t = String(window.lyricsData[i].translation).trim();
        }
        if (t) parts.push(t);
      }
      const phrase = parts.join('\n');
      let timeMs = 0;
      if (window.hasTimestamp && window.lyricsData[s] && typeof window.lyricsData[s].time === 'number') {
        timeMs = Math.round(window.lyricsData[s].time * 1000);
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

    // クリップボードにコピー
    async copyToClipboard(text) {
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return Promise.resolve();
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
      if (navigator.mediaSession?.metadata) {
        const { title, artist, album, artwork } = navigator.mediaSession.metadata;
        return {
          title: (title || '').toString(),
          artist: (artist || '').toString(),
          album: (album || '').toString(),
          src: Array.isArray(artwork) && artwork.length ? artwork[artwork.length - 1].src : null
        };
      }

      // フォールバック: プレイヤーバーから読む
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

    // UI要素のセットアップ
    setupUIElements() {
      this.ui.wrapper = document.getElementById('ytm-custom-wrapper');
      this.ui.bg = document.getElementById('ytm-custom-bg');
      this.ui.lyrics = document.getElementById('my-lyrics-container');
      this.ui.title = document.getElementById('ytm-custom-title');
      this.ui.artist = document.getElementById('ytm-custom-artist');
      this.ui.artwork = document.getElementById('ytm-artwork-container');
      this.ui.btnArea = document.getElementById('ytm-btn-area');
    },

    // メタデータUI更新
    updateMetaUI(meta) {
      if (this.ui.title) this.ui.title.innerText = meta.title;
      if (this.ui.artist) this.ui.artist.innerText = meta.artist;

      if (meta.src && this.ui.artwork) {
        this.ui.artwork.innerHTML = `<img src="${meta.src}" crossorigin="anonymous">`;
        if (this.ui.bg) {
          this.ui.bg.style.backgroundImage = `url(${meta.src})`;
        }
      }
      if (this.ui.lyrics) {
        this.ui.lyrics.innerHTML = '<div class="lyric-loading" style="opacity:0.5; padding:20px;">Loading...</div>';
      }
    },

    // Update lyric highlight - content_original.jsと完全に一致
    updateLyricHighlight(currentTime) {
      const lyricsData = window.StateModule?.StateManager.getLyricsData();
      const hasTimestamp = window.StateModule?.StateManager.getHasTimestamp();
      const ui = window.StateModule?.StateManager.getUI();
      
      if (!lyricsData || !lyricsData.length) return;
      if (!hasTimestamp) return;

      const t = currentTime;

      let idx = -1;
      const lastActiveIndex = window.StateModule?.StateManager.getLastActiveIndex?.() || -1;
      
      // Backward seek protection: if t is behind lastActiveIndex, search from 0
      let startSearch = 0;
      if (lastActiveIndex >= 0 && lastActiveIndex < lyricsData.length) {
        if (lyricsData[lastActiveIndex].time <= t) {
          startSearch = lastActiveIndex;
        }
      }

      for (let i = startSearch; i < lyricsData.length; i++) {
        if (lyricsData[i].time > t) {
          idx = i - 1;
          break;
        }
        if (i === lyricsData.length - 1) idx = i;
      }

      // Discord presence更新 - exactly like content_original.js
      try {
        const metaNow = window.UIManagerModule?.UIManager.getMetadata();
        let lyricText = '';
        if (idx >= 0 && idx < lyricsData.length) {
          lyricText = (lyricsData[idx]?.text || '').trim();
        }
        // Fallback to DOM text
        if (!lyricText && ui.lyrics) {
          const rowsMain = ui.lyrics.querySelectorAll('.lyric-line');
          if (rowsMain && rowsMain.length && idx >= 0 && idx < rowsMain.length) {
            const row = rowsMain[idx];
            const mainEl = row.querySelector('.lyric-main') || row;
            lyricText = (mainEl && mainEl.textContent ? mainEl.textContent : '').trim();
          }
        }
        // sendDiscordPresence - exactly like original
        if (window.DiscordPresenceModule?.DiscordPresence.sendDiscordPresence) {
          window.DiscordPresenceModule.DiscordPresence.sendDiscordPresence(metaNow, lyricText);
        }
      } catch (e) { }

      const targets = [];
      if (ui.lyrics) targets.push(ui.lyrics);
      
      // PIP targets - exactly like content_original.js
      if (window.PipManager?.pipWindow && window.PipManager?.pipLyricsContainer) {
        targets.push(window.PipManager.pipLyricsContainer);
      }

      // 前の行もハイライトするロジック
      const prevIdx = (idx > 0 && idx < lyricsData.length &&
        typeof lyricsData[idx]?.time === 'number' &&
        typeof lyricsData[idx - 1]?.time === 'number' &&
        (lyricsData[idx].time - lyricsData[idx - 1].time) <= 1.0
      ) ? (idx - 1) : -1;

      targets.forEach(container => {
        const rows = container.querySelectorAll('.lyric-line');
        if (rows.length === 0) return;

        rows.forEach((r, i) => {
          const isActive = (i === idx) || (i === prevIdx);
          const isPrimary = (i === idx);

          if (isActive) {
            if (!r.classList.contains('active')) {
              r.classList.add('active');

              if (isPrimary) {
                // スクロール処理 - exactly like content_original.js
                if (container.id === 'my-lyrics-container' || container === ui.lyrics) {
                  // 【通常再生画面】 ブラウザの標準機能で「物理的な中央」に強制配置
                  r.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // ReplayManager.incrementLyricCount() - exactly like original
                  if (window.ReplayManagerModule?.ReplayManager.incrementLyricCount) {
                    window.ReplayManagerModule.ReplayManager.incrementLyricCount();
                  }
                } else {
                  // 【PIP（小窓）】 引き続き Apple Music風に「二行上 (35%の位置)」をキープ
                  const offsetTop = r.offsetTop;
                  const containerHeight = container.clientHeight;
                  const targetScroll = offsetTop - (containerHeight * 0.35) + (r.offsetHeight / 2);
                  container.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }
              }
            }

            // show-translation: exactly like content_original.js
            if (r.classList.contains('has-translation')) {
              r.classList.add('show-translation');
            }

            // Char span animation: exactly like content_original.js
            const charSpans = r.querySelectorAll('.lyric-char');
            if (charSpans.length > 0) {
              charSpans.forEach(sp => {
                const tt = parseFloat(sp.dataset.time || '0');
                if (Number.isFinite(tt) && tt <= t) {
                  sp.classList.add('char-active');
                  sp.classList.remove('char-pending');
                } else {
                  sp.classList.remove('char-active');
                  sp.classList.add('char-pending');
                }
              });
            }
          } else {
            if (r.classList.contains('active')) {
              r.classList.remove('active');
            }
            // Remove show-translation: exactly like content_original.js
            r.classList.remove('show-translation');

            // Reset char spans: exactly like content_original.js
            const charSpans = r.querySelectorAll('.lyric-char');
            if (charSpans.length > 0) {
              charSpans.forEach(sp => {
                sp.classList.remove('char-active');
                sp.classList.add('char-pending');
              });
            }
          }
        });
      });

      // Update lastActiveIndex in StateModule
      if (window.StateModule?.StateManager.setLastActiveIndex) {
        window.StateModule.StateManager.setLastActiveIndex(idx);
      }
    }
  };

  // Initialize
  UIRenderingModule.init();

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIRenderingModule };
  }
  // ALWAYS attach to window in the browser extension environment
  window.UIRenderingModule = { UIRenderingModule };
  // For backward compatibility with events.js and others
  window.UIRendering = UIRenderingModule;
})();
