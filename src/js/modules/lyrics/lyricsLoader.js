// ===================== Lyrics Loader Module =====================
// Handles lyrics loading and processing - extracted from original content.js

(function () {
  'use strict';

  // Get current video URL
  const getCurrentVideoUrl = () => {
    try {
      const url = new URL(location.href);
      const vid = url.searchParams.get('v');
      return vid ? `https://youtu.be/${vid}` : location.href;
    } catch (e) {
      console.warn('Failed to get current video url', e);
      return '';
    }
  };

  // Get current video ID
  const getCurrentVideoId = () => {
    try {
      const url = new URL(location.href);
      return url.searchParams.get('v');
    } catch (e) {
      return null;
    }
  };

  // Apply lyrics text - async function from original
  const applyLyricsText = async (rawLyrics) => {
    const thisOperationId = Date.now() + Math.random(); // Generate unique operation ID
    window.StateModule?.StateManager.setCurrentLyricsOperation(thisOperationId);
    
    const keyAtStart = window.StateModule?.StateManager.getCurrentKey();
    if (!rawLyrics || typeof rawLyrics !== 'string' || !rawLyrics.trim()) {
      if (window.StateModule?.StateManager.getCurrentLyricsOperation() !== thisOperationId) return;
      window.StateModule?.StateManager.setLyricsData([]);
      window.StateModule?.StateManager.setHasTimestamp(false);
      
      // Use UIManager.renderLyrics instead of UIRendering
      if (window.UIManagerModule?.UIManager.renderLyrics) {
        window.UIManagerModule.UIManager.renderLyrics([]);
      }
      window.StateModule?.StateManager.setCurrentLyricsOperation(null);
      return;
    }
    
    // Check if operation was cancelled
    if (window.StateModule?.StateManager.getCurrentLyricsOperation() !== thisOperationId) {
      console.log('[YTM Immersion] Lyrics operation cancelled');
      return;
    }

    try {
      // Parse lyrics using LyricsParser
      let parsed = [];
      let hasTs = false;
      if (window.LyricsParserModule?.LyricsParser.parseBaseLRC) {
        const parseResult = window.LyricsParserModule.LyricsParser.parseBaseLRC(rawLyrics);
        parsed = parseResult.lines || [];
        hasTs = parseResult.hasTs || false;
      } else {
        // Fallback: simple line parsing
        parsed = rawLyrics.split('\n').filter(line => line.trim()).map(line => ({
          text: line.trim(),
          time: null
        }));
      }
      
      window.StateModule?.StateManager.setHasTimestamp(hasTs);
      
      const videoUrl = getCurrentVideoUrl();

      // Handle duet mode
      let baseLines = parsed;
      let hasDuetSub = false;
      
      // Reset duet excluded times
      window.StateModule?.StateManager.setDuetExcludedTimes(new Set());
      
      const duetSubLyricsRaw = window.StateModule?.StateManager.getDuetSubLyricsRaw();
      if (typeof duetSubLyricsRaw === 'string' && duetSubLyricsRaw.trim()) {
        if (window.LyricsParserModule?.LyricsParser.parseSubLRC) {
          const subObj = window.LyricsParserModule.LyricsParser.parseSubLRC(duetSubLyricsRaw);
          const subLines = subObj.lines || [];
          hasDuetSub = !!subObj.hasTs && subLines.some(l => typeof l?.time === 'number');
          if (hasDuetSub) {
            window.StateModule?.StateManager.setHasTimestamp(true);
            if (window.LyricsParserModule?.LyricsParser.mergeDuetLines) {
              baseLines = window.LyricsParserModule.LyricsParser.mergeDuetLines(parsed, subLines);
            }
          }
        }
      }
      document.body.classList.toggle('ytm-duet-mode', hasDuetSub);

      let finalLines = baseLines;
      const config = window.ConfigModule?.ConfigManager.getAll();
      if (config?.useTrans) {
        // Apply translations if available
        console.log('[YTM Immersion] Translation would be applied here');
      }
      
      if (window.StateModule?.StateManager.getCurrentLyricsOperation() !== thisOperationId) return;

      // Handle dynamic lines normalization
      try {
        const dynamicLines = window.StateModule?.StateManager.getDynamicLines();
        if (Array.isArray(dynamicLines) && dynamicLines.length) {
          console.log('[YTM Immersion] Dynamic lines normalization would happen here');
        }
      } catch (e) { }

      window.StateModule?.StateManager.setLyricsData(finalLines);
      
      // Render lyrics using UIManager
      if (window.UIManagerModule?.UIManager.renderLyrics) {
        window.UIManagerModule.UIManager.renderLyrics(finalLines);
      }
      
      window.StateModule?.StateManager.setCurrentLyricsOperation(null);
    } catch (error) {
      console.error('[YTM Immersion] Error in applyLyricsText:', error);
      window.StateModule?.StateManager.setCurrentLyricsOperation(null);
    }
  };

  // Load lyrics - exactly like content_original.js
  const loadLyrics = async (meta) => {
    // Load ALL configuration from storage exactly like original
    if (!window.ConfigModule?.ConfigManager.get('deepLKey')) {
      const deepLKey = await window.Storage?.storage.get('ytm_deepl_key');
      if (deepLKey) window.ConfigModule?.ConfigManager.set('deepLKey', deepLKey);
    }
    
    const cachedTrans = await window.Storage?.storage.get('ytm_trans_enabled');
    if (cachedTrans !== null && cachedTrans !== undefined) {
      window.ConfigModule?.ConfigManager.set('useTrans', cachedTrans);
    }

    const cachedSharedTrans = await window.Storage?.storage.get('ytm_shared_trans_enabled');
    if (cachedSharedTrans !== null && cachedSharedTrans !== undefined) {
      window.ConfigModule?.ConfigManager.set('useSharedTranslateApi', cachedSharedTrans);
    }
    
    const mainLangStored = await window.Storage?.storage.get('ytm_main_lang');
    if (mainLangStored) window.ConfigModule?.ConfigManager.set('mainLang', mainLangStored);
    
    const subLangStored = await window.Storage?.storage.get('ytm_sub_lang');
    if (subLangStored !== null && subLangStored !== undefined) {
      window.ConfigModule?.ConfigManager.set('subLang', subLangStored);
    }
    
    const uiLangStored = await window.Storage?.storage.get('ytm_ui_lang');
    if (uiLangStored) window.ConfigModule?.ConfigManager.set('uiLang', uiLangStored);

    const thisKey = `${meta.title}///${meta.artist}`;
    if (window.StateModule?.StateManager.getCurrentKey() !== thisKey) return;
    
    // Reset global variables exactly like original
    window.StateModule?.StateManager.setFallbackLyrics(false);
    window.StateModule?.StateManager.setDynamicLines(null);
    window.StateModule?.StateManager.setDuetSubDynamicLines(null);
    window.StateModule?.StateManager.setDuetExcludedTimes(new Set());
    window.StateModule?.StateManager.setDuetSubLyricsRaw('');
    window.StateModule?.StateManager.setLyricsCandidates(null);
    window.StateModule?.StateManager.setSelectedCandidateId(null);
    window.StateModule?.StateManager.setLyricsRequests(null);
    window.StateModule?.StateManager.setLyricsConfig(null);

    // Check cache first
    let cached = null;
    try {
      cached = await window.Storage?.storage.get(thisKey);
    } catch (e) {
      console.warn('[YTM Immersion] Failed to check cache:', e);
    }

    let data = null;
    let noLyricsCached = false;

    if (cached !== null && cached !== undefined) {
      if (cached === '__NO_LYRICS__') {
        noLyricsCached = true;
      } else if (typeof cached === 'string') {
        data = cached;
      } else if (typeof cached === 'object') {
        if (typeof cached.lyrics === 'string') data = cached.lyrics;
        if (Array.isArray(cached.dynamicLines)) {
          window.StateModule?.StateManager.setDynamicLines(cached.dynamicLines);
        }
        if (typeof cached.subLyrics === 'string') {
          window.StateModule?.StateManager.setDuetSubLyricsRaw(cached.subLyrics);
        }
        if (cached.noLyrics) noLyricsCached = true;
        if (cached.githubFallback) {
          window.StateModule?.StateManager.setFallbackLyrics(true);
        }
        if (Array.isArray(cached.candidates)) {
          window.StateModule?.StateManager.setLyricsCandidates(cached.candidates);
        }
        if (Array.isArray(cached.requests)) {
          window.StateModule?.StateManager.setLyricsRequests(cached.requests);
        }
        if (cached.config) {
          window.StateModule?.StateManager.setLyricsConfig(cached.config);
        }
      }
    }

    if (!data && noLyricsCached) {
      if (window.StateModule?.StateManager.getCurrentKey() === thisKey) {
        if (window.UIRendering) {
          window.UIRendering.renderLyrics([]);
        }
      }
      return;
    }

    if (!data && !noLyricsCached) {
      let gotLyrics = false;

      // Get config for fast mode
      const config = window.ConfigModule?.ConfigManager.getAll();

      // Fast mode: GitHub fetching
      if (config.fastMode) {
        console.log('🚀 Fast Mode: Fetching from GitHub for', meta.title);

        const video_id_fast = getCurrentVideoId();
        if (video_id_fast) {
          const GH_BASE = `https://raw.githubusercontent.com/LRCHub/${video_id_fast}/main`;
          const __cacheBusterFast = (1000 + Math.floor(Math.random() * 9000));

          const withRandomCacheBusterFast = (url) => {
            const v = String(__cacheBusterFast);
            try {
              const u = new URL(url);
              u.searchParams.set('v', v);
              return u.toString();
            } catch (e) {
              const sep = url.includes('?') ? '&' : '?';
              return url + sep + 'v=' + v;
            }
          };

          const safeFetchText = async (url) => {
            try {
              const r = await fetch(withRandomCacheBusterFast(url), { cache: 'no-store' });
              if (!r.ok) return '';
              return (await r.text()) || '';
            } catch (e) {
              return '';
            }
          };

          try {
            // Try dynamic lyrics first
            const dynText = await safeFetchText(`${GH_BASE}/Dynamic.lrc`);
            if (dynText && dynText.trim()) {
              data = dynText;
              gotLyrics = true;
              console.log('[YTM Immersion] Got dynamic lyrics from GitHub');
            } else {
              // Try README.md
              const readme = await safeFetchText(`${GH_BASE}/README.md`);
              const extractLyricsFromReadme = (text) => {
                if (!text) return '';
                const m = text.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/);
                let body = m ? m[1] : text;
                
                return body
                  .split('\n')
                  .filter(line => !line.trim().startsWith('#'))
                  .filter(line => !line.trim().startsWith('>'))
                  .filter(line => !line.trim().startsWith('```'))
                  .filter(line => !line.includes('歌詞登録ステータス'))
                  .join('\n')
                  .trim();
              };
              
              const lyricsText = extractLyricsFromReadme(readme);
              if (lyricsText) {
                data = lyricsText;
                gotLyrics = true;
                console.log('[YTM Immersion] Got lyrics from GitHub README');
              }
            }

            // Cache the result
            if (gotLyrics && window.StateModule?.StateManager.getCurrentKey() === thisKey) {
              await window.Storage?.storage.set(thisKey, {
                lyrics: data,
                dynamicLines: null,
                noLyrics: false,
                githubFallback: true
              });
            }
          } catch (e) {
            console.error('[YTM Immersion] Fast mode GitHub error:', e);
          }
        }
      }

      // Normal mode: Chrome extension API - exactly like original
      if (!gotLyrics) {
        try {
          const track = meta.title.replace(/\s*[\(-\[].*?[\)-]].*/, '');
          const artist = meta.artist;
          const youtube_url = getCurrentVideoUrl();
          const video_id = getCurrentVideoId();
          
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            const res = await new Promise(resolve => {
              chrome.runtime.sendMessage(
                { type: 'GET_LYRICS', payload: { track, artist, youtube_url, video_id } },
                resolve
              );
            });
            
            console.log('[YTM Immersion] GET_LYRICS response:', res);
            
            // Set global variables exactly like original
            window.StateModule?.StateManager.setLyricsRequests(Array.isArray(res?.requests) ? res.requests : null);
            window.StateModule?.StateManager.setLyricsConfig(res?.config || null);
            window.StateModule?.StateManager.setLyricsCandidates(Array.isArray(res?.candidates) ? res.candidates : null);
            
            // Call refresh functions
            if (window.UIManagerModule?.UIManager.refreshCandidateMenu) {
              window.UIManagerModule.UIManager.refreshCandidateMenu();
            }
            if (window.UIManagerModule?.UIManager.refreshLockMenu) {
              window.UIManagerModule.UIManager.refreshLockMenu();
            }
            
            window.StateModule?.StateManager.setFallbackLyrics(!!res?.githubFallback);
            if (typeof res?.subLyrics === 'string' && res.subLyrics.trim()) {
              window.StateModule?.StateManager.setDuetSubLyricsRaw(res.subLyrics);
            }
            
            if (res?.success && typeof res.lyrics === 'string' && res.lyrics.trim()) {
              data = res.lyrics;
              gotLyrics = true;
              
              if (Array.isArray(res.dynamicLines) && res.dynamicLines.length) {
                window.StateModule?.StateManager.setDynamicLines(res.dynamicLines);
              }
              
              if (window.StateModule?.StateManager.getCurrentKey() === thisKey) {
                await window.Storage?.storage.set(thisKey, {
                  lyrics: data,
                  dynamicLines: window.StateModule?.StateManager.getDynamicLines() || null,
                  noLyrics: false,
                  githubFallback: window.StateModule?.StateManager.getFallbackLyrics(),
                  subLyrics: (typeof window.StateModule?.StateManager.getDuetSubLyricsRaw() === 'string' ? window.StateModule?.StateManager.getDuetSubLyricsRaw() : ''),
                  candidates: window.StateModule?.StateManager.getLyricsCandidates() || null,
                  requests: window.StateModule?.StateManager.getLyricsRequests() || null,
                  config: window.StateModule?.StateManager.getLyricsConfig() || null
                });
              }
            }
          }
        } catch (e) {
          console.error('[YTM Immersion] GET_LYRICS failed', e);
        }
        
        // Cache no lyrics sentinel
        if (!gotLyrics && window.StateModule?.StateManager.getCurrentKey() === thisKey) {
          await window.Storage?.storage.set(thisKey, '__NO_LYRICS__');
          noLyricsCached = true;
        }
      }
    }

    // Apply lyrics - exactly like original
    if (window.StateModule?.StateManager.getCurrentKey() !== thisKey) return;
    if (!data) {
      if (window.UIManagerModule?.UIManager.renderLyrics) {
        window.UIManagerModule.UIManager.renderLyrics([]);
      }
      if (window.UIManagerModule?.UIManager.refreshCandidateMenu) {
        window.UIManagerModule.UIManager.refreshCandidateMenu();
      }
      if (window.UIManagerModule?.UIManager.refreshLockMenu) {
        window.UIManagerModule.UIManager.refreshLockMenu();
      }
      return;
    }
    
    await applyLyricsText(data);
  };

  // RAF loop functions
  const startLyricRafLoop = () => {
    const rafState = window.StateModule?.StateManager.getRafState();
    if (rafState.isRafLoopActive) {
      console.warn('[YTM Immersion] RAF loop already active, skipping');
      return;
    }
    
    rafState.isRafLoopActive = true;
    rafState.cleanupScheduled = false;

    const loop = () => {
      if (!rafState.isRafLoopActive || rafState.cleanupScheduled) {
        console.log('[YTM Immersion] RAF loop stopping due to state change');
        rafState.isRafLoopActive = false;
        rafState.lyricRafId = null;
        return;
      }
      
      if (rafState.cachedVideoElement && !document.contains(rafState.cachedVideoElement)) {
        console.log('[YTM Immersion] Video element removed, stopping RAF loop');
        rafState.isRafLoopActive = false;
        rafState.lyricRafId = null;
        rafState.cachedVideoElement = null;
        return;
      }

      try {
        const v = document.querySelector('video');
        if (!v) {
          if (rafState.isRafLoopActive && !rafState.cleanupScheduled) {
            if (window.PipManager?.pipWindow) {
              rafState.lyricRafId = window.PipManager.pipWindow.requestAnimationFrame(loop);
            } else {
              rafState.lyricRafId = requestAnimationFrame(loop);
            }
          }
          return;
        }

        if (window.PipManager?.pipWindow) {
          if (typeof window.PipManager.updatePlayState === 'function') {
            window.PipManager.updatePlayState(v.paused);
          }
        }

        if (v.readyState > 0 && !v.ended) {
          let t = v.currentTime;
          const duration = v.duration || 1;
          const timeOffset = window.StateModule?.StateManager.getTimeOffset() || 0;
          const config = window.ConfigModule?.ConfigManager.getAll() || {};
          
          if (timeOffset > 0 && t < timeOffset) {
            window.StateModule?.StateManager.setTimeOffset(0);
          }
          t = Math.max(0, t - timeOffset);
          t = Math.min(Math.max(0, t + ((config.syncOffset || 0) / 1000)), v.duration);

          // Update highlight if playing OR if it's the first few frames of a seek
          if (!v.paused || (v.seeking)) {
            const lyricsData = window.StateModule?.StateManager.getLyricsData();
            const hasTimestamp = window.StateModule?.StateManager.getHasTimestamp();
            if (lyricsData && lyricsData.length && hasTimestamp) {
              if (window.UIRendering?.updateLyricHighlight) {
                window.UIRendering.updateLyricHighlight(t);
              }
            }
          }

          // Update progress ring in PiP
          if (window.PipManager?.pipWindow && window.PipManager?.progressRing) {
             const radius = 32; // This might need to match the actual ring radius
             const circumference = radius * 2 * Math.PI;
             const progress = t / duration;
             const offset = circumference - (progress * circumference);
             window.PipManager.progressRing.style.strokeDashoffset = offset;
          }
        }

      } catch (e) {
        console.error('[YTM Immersion] RAF loop error:', e);
      }

      if (rafState.isRafLoopActive && !rafState.cleanupScheduled) {
        if (window.PipManager?.pipWindow) {
          rafState.lyricRafId = window.PipManager.pipWindow.requestAnimationFrame(loop);
        } else {
          rafState.lyricRafId = requestAnimationFrame(loop);
        }
      }
    };
    
    if (window.PipManager?.pipWindow) {
      rafState.lyricRafId = window.PipManager.pipWindow.requestAnimationFrame(loop);
    } else {
      rafState.lyricRafId = requestAnimationFrame(loop);
    }
    console.log('[YTM Immersion] RAF loop started');
  };

  // Module exports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LyricsLoader };
  }
  // ALWAYS attach to window in the browser extension environment
  window.LyricsLoaderModule = {
    LyricsLoader: {
      loadLyrics,
      startLyricRafLoop,
      getCurrentVideoUrl,
      getCurrentVideoId
    }
  };

})();
