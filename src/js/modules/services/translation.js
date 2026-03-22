/* globals chrome */
(function () {
  // ===================== Translation Module =====================
  const TranslationModule = {
    EXT: null,

    init() {
      this.EXT = typeof globalThis.chrome !== 'undefined'
        ? globalThis.chrome
        : (typeof globalThis.browser !== 'undefined' ? globalThis.browser : null);
    },

    // 文字列の正規化
    normalizeStr(s) {
      return (s || '').replace(/\s+/g, '').trim();
    },

    // 混合言語の検出
    isMixedLang(s) {
      if (!s) return false;
      const hasLatin = /[A-Za-z]/.test(s);
      const hasCJK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(s);
      const hasHangul = /[\uAC00-\uD7AF]/.test(s);
      let kinds = 0;
      if (hasLatin) kinds++;
      if (hasCJK) kinds++;
      if (hasHangul) kinds++;
      return kinds >= 2;
    },

    // 文字のスクリプト検出
    detectCharScript(ch) {
      if (!ch) return 'OTHER';
      if (/[A-Za-z]/.test(ch)) return 'LATIN';
      if (/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(ch)) return 'CJK';
      if (/[\uAC00-\uD7AF]/.test(ch)) return 'HANGUL';
      return 'OTHER';
    },

    // スクリプトでセグメント化
    segmentByScript(s) {
      const result = [];
      if (!s) return result;
      let currentScript = null;
      let buf = '';
      for (const ch of s) {
        const script = this.detectCharScript(ch);
        if (currentScript === null) {
          currentScript = script;
          buf = ch;
        } else if (script === currentScript) {
          buf += ch;
        } else {
          result.push({ script: currentScript, text: buf });
          currentScript = script;
          buf = ch;
        }
      }
      if (buf) {
        result.push({ script: currentScript, text: buf });
      }
      return result;
    },

    // セグメントを翻訳するかどうか
    shouldTranslateSegment(script, langCode) {
      const lang = (langCode || '').toLowerCase();
      if (script === 'OTHER') return false;
      switch (lang) {
        case 'ja': return script === 'LATIN' || script === 'HANGUL';
        case 'en': return script === 'CJK' || script === 'HANGUL';
        case 'ko': return script === 'LATIN' || script === 'CJK';
        default: return script !== 'LATIN';
      }
    },

    // DeepLターゲット言語の解決
    resolveDeepLTargetLang(langCode) {
      const lang = (langCode || '').toLowerCase();
      const mapping = {
        'ja': 'JA',
        'en': 'EN',
        'ko': 'KO',
        'zh': 'ZH'
      };
      return mapping[lang] || 'EN';
    },

    // 混合セグメントの翻訳
    async translateMixedSegments(lines, indexes, langCode, targetLang) {
      try {
        const segmentsToTranslate = [];
        const perLineSegments = {};
        indexes.forEach(idx => {
          const line = lines[idx];
          const text = (line && line.text) || '';
          const segs = this.segmentByScript(text);
          const segMeta = [];
          segs.forEach(seg => {
            if (this.shouldTranslateSegment(seg.script, langCode)) {
              const translateIndex = segmentsToTranslate.length;
              segmentsToTranslate.push(seg.text);
              segMeta.push({ original: seg.text, translateIndex });
            } else {
              segMeta.push({ original: seg.text, translateIndex: null });
            }
          });
          perLineSegments[idx] = segMeta;
        });
        
        if (!segmentsToTranslate.length) return null;
        
        const res = await new Promise(resolve => {
          if (!this.EXT || !this.EXT.runtime) {
            resolve(null);
            return;
          }
          this.EXT.runtime.sendMessage(
            { 
              type: 'TRANSLATE', 
              payload: { 
                text: segmentsToTranslate, 
                apiKey: window.config?.deepLKey, 
                targetLang, 
                useSharedTranslateApi: (window.config?.useSharedTranslateApi && !window.config?.fastMode) 
              } 
            },
            resolve
          );
        });
        
        if (!res?.success || !Array.isArray(res.translations) || res.translations.length !== segmentsToTranslate.length) {
          return null;
        }
        
        const segTranslations = res.translations.map(t => t.text || '');
        const result = {};
        Object.keys(perLineSegments).forEach(key => {
          const lineIdx = Number(key);
          const segMeta = perLineSegments[lineIdx];
          let rebuilt = '';
          segMeta.forEach(seg => {
            if (seg.translateIndex == null) {
              rebuilt += seg.original;
            } else {
              rebuilt += segTranslations[seg.translateIndex] ?? seg.original;
            }
          });
          result[lineIdx] = rebuilt;
        });
        
        return result;
      } catch (e) {
        console.error('DeepL mixed-line fallback failed', e);
        return null;
      }
    },

    // プライマリ/セカンダリの重複を除去
    dedupePrimarySecondary(lines) {
      if (!Array.isArray(lines)) return lines;
      lines.forEach(l => {
        if (!l.translation) return;
        const src = this.normalizeStr(l.text);
        const trn = this.normalizeStr(l.translation);
        if (src === trn && !this.isMixedLang(l.text)) {
          delete l.translation;
        }
      });
      return lines;
    },

    // 翻訳実行
    async translateTo(lines, langCode) {
      if ((!window.config?.deepLKey && !(window.config?.useSharedTranslateApi && !window.config?.fastMode)) || !lines.length) return null;
      
      const targetLang = this.resolveDeepLTargetLang(langCode);
      
      try {
        const baseTexts = lines.map(l => (l && l.text !== undefined && l.text !== null) ? String(l.text) : '');
        
        // 空行は翻訳APIへ送らず、行数だけ保持してタイムスタンプのズレを防ぐ
        const mapIdx = [];
        const requestTexts = [];
        for (let i = 0; i < baseTexts.length; i++) {
          const t = baseTexts[i];
          if ((t || '').trim()) {
            mapIdx.push(i);
            requestTexts.push(t);
          }
        }

        let translated = new Array(lines.length).fill('');

        if (requestTexts.length) {
          const res = await new Promise(resolve => {
            if (!this.EXT || !this.EXT.runtime) {
              resolve(null);
              return;
            }
            this.EXT.runtime.sendMessage(
              { 
                type: 'TRANSLATE', 
                payload: { 
                  text: requestTexts, 
                  apiKey: window.config?.deepLKey, 
                  targetLang, 
                  useSharedTranslateApi: (window.config?.useSharedTranslateApi && !window.config?.fastMode) 
                } 
              },
              resolve
            );
          });

          if (!res?.success || !Array.isArray(res.translations) || res.translations.length !== requestTexts.length) {
            return null;
          }

          for (let i = 0; i < mapIdx.length; i++) {
            const tr = res.translations[i];
            translated[mapIdx[i]] = (tr && tr.text) ? tr.text : '';
          }
        }

        // 混合言語のフォールバック処理
        const fallbackIndexes = [];
        for (let i = 0; i < lines.length; i++) {
          const src = baseTexts[i];
          const trn = translated[i];
          if (!src) continue;
          if (this.normalizeStr(src) === this.normalizeStr(trn) && this.isMixedLang(src)) {
            fallbackIndexes.push(i);
          }
        }
        
        if (fallbackIndexes.length) {
          const mixedFallback = await this.translateMixedSegments(lines, fallbackIndexes, langCode, targetLang);
          if (mixedFallback) {
            fallbackIndexes.forEach(i => {
              if (mixedFallback[i]) translated[i] = mixedFallback[i];
            });
          }
        }
        
        return translated;
      } catch (e) {
        console.error('DeepL failed', e);
      }
      return null;
    },

    // 翻訳の適用
    async applyTranslations(baseLines, youtubeUrl) {
      if (!window.config?.useTrans || !Array.isArray(baseLines) || !baseLines.length) return baseLines;
      
      // 設定を取得
      const mainLang = window.config?.mainLang || 'original';
      const subLang = window.config?.subLang || '';
      const langsToFetch = [];
      
      if (mainLang && mainLang !== 'original') langsToFetch.push(mainLang);
      if (subLang && subLang !== 'original' && subLang !== mainLang && subLang) langsToFetch.push(subLang);
      
      if (!langsToFetch.length) return baseLines;

      let lrcMap = {};
      try {
        const res = await new Promise(resolve => {
          if (!this.EXT || !this.EXT.runtime) {
            resolve(null);
            return;
          }
          this.EXT.runtime.sendMessage({
            type: 'GET_TRANSLATION',
            payload: { youtube_url: youtubeUrl, langs: langsToFetch }
          }, resolve);
        });
        
        if (res?.success && res.lrcMap) lrcMap = res.lrcMap;
      } catch (e) {
        console.warn('GET_TRANSLATION failed', e);
      }

      const transLinesByLang = {};
      const needDeepL = [];

      langsToFetch.forEach(lang => {
        const lrc = (lrcMap && lrcMap[lang]) || '';
        if (lrc) {
          const parsed = window.LyricsParserModule?.LyricsParser?.parseLRC(lrc);
          transLinesByLang[lang] = parsed ? parsed.lines : [];
        } else {
          needDeepL.push(lang);
        }
      });

      if (needDeepL.length && (window.config?.deepLKey || (window.config?.useSharedTranslateApi && !window.config?.fastMode))) {
        for (const lang of needDeepL) {
          const translatedTexts = await this.translateTo(baseLines, lang);
          if (translatedTexts && translatedTexts.length === baseLines.length) {
            const lines = baseLines.map((l, i) => ({
              time: l.time,
              text: translatedTexts[i]
            }));
            transLinesByLang[lang] = lines;
            
            const plain = translatedTexts.join('\n');
            if (plain.trim()) {
              // 翻訳結果を登録
              if (this.EXT && this.EXT.runtime) {
                this.EXT.runtime.sendMessage({
                  type: 'REGISTER_TRANSLATION',
                  payload: { youtube_url: youtubeUrl, lang, lyrics: plain }
                }, (res) => {
                  console.log('[CS] REGISTER_TRANSLATION', lang, res);
                });
              }
            }
          }
        }
      }

      // 翻訳の整列と適用
      const alignedMap = this.buildAlignedTranslations(baseLines, transLinesByLang);
      const final = baseLines.map(l => ({ ...l }));
      
      const getLangTextAt = (langCode, index, baseText) => {
        if (!langCode || langCode === 'original') return baseText;
        const arr = alignedMap[langCode];
        if (!arr) return baseText;
        const v = arr[index];
        return (v === null || v === undefined) ? baseText : v;
      };

      for (let i = 0; i < final.length; i++) {
        const baseText = final[i].text;
        let primary = getLangTextAt(mainLang, i, baseText);
        let secondary = null;
        
        if (subLang && subLang !== mainLang) {
          secondary = getLangTextAt(subLang, i, baseText);
        } else if (!subLang && mainLang !== 'original') {
          if (this.normalizeStr(primary) !== this.normalizeStr(baseText)) {
            secondary = baseText;
          }
        }
        
        if (secondary && this.normalizeStr(primary) === this.normalizeStr(secondary)) {
          if (!this.isMixedLang(baseText)) secondary = null;
        }
        
        final[i].text = primary;
        if (secondary) final[i].translation = secondary;
        else delete final[i].translation;
      }
      
      this.dedupePrimarySecondary(final);
      return final;
    },

    // 翻訳の整列
    buildAlignedTranslations(baseLines, transLinesByLang) {
      const alignedMap = {};
      const TOL = 0.15;
      
      Object.keys(transLinesByLang).forEach(lang => {
        const arr = transLinesByLang[lang];
        const res = new Array(baseLines.length).fill(null);
        
        if (!Array.isArray(arr) || !arr.length) {
          alignedMap[lang] = res;
          return;
        }
        
        const hasAnyTime = arr.some(x => x && typeof x.time === 'number');
        if (!hasAnyTime) {
          // タイムスタンプ無しの翻訳は「空行を消費しない」方式で合わせる
          let k = 0;
          for (let i = 0; i < baseLines.length; i++) {
            const baseTextRaw = (baseLines[i]?.text ?? '');
            const isEmptyBaseLine = typeof baseTextRaw === 'string' && baseTextRaw.trim() === '';
            if (isEmptyBaseLine) { 
              res[i] = ''; 
              continue; 
            }
            const cand = arr[k];
            if (cand && typeof cand.text === 'string') {
              const trimmed = cand.text.trim();
              res[i] = trimmed === '' ? '' : trimmed;
            } else {
              res[i] = '';
            }
            k++;
          }
          alignedMap[lang] = res;
          return;
        }
        
        let j = 0;
        for (let i = 0; i < baseLines.length; i++) {
          const baseLine = baseLines[i] || {};
          const tBase = baseLine.time;
          const baseTextRaw = (baseLine.text ?? '');
          const isEmptyBaseLine = typeof baseTextRaw === 'string' && baseTextRaw.trim() === '';
          
          if (isEmptyBaseLine) {
            res[i] = '';
            continue;
          }
          
          if (typeof tBase !== 'number') {
            const cand = arr[i];
            if (cand && typeof cand.text === 'string') {
              const raw = cand.text;
              const trimmed = raw.trim();
              res[i] = trimmed === '' ? '' : trimmed;
            }
            continue;
          }
          
          while (j < arr.length && typeof arr[j].time === 'number' && arr[j].time < tBase - TOL) {
            j++;
          }
          
          if (j < arr.length && typeof arr[j].time === 'number' && Math.abs(arr[j].time - tBase) <= TOL) {
            const raw = (arr[j].text ?? '');
            const trimmed = raw.trim();
            res[i] = trimmed === '' ? '' : trimmed;
            j++;
          }
        }
        alignedMap[lang] = res;
      });
      
      return alignedMap;
    }
  };

  // Initialize
  TranslationModule.init();

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TranslationModule };
  } else {
    window.TranslationModule = { TranslationModule };
  }
})();
