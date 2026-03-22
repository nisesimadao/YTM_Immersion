// ===================== Events Module =====================
// Manages event handling and main loop - extracted from original content.js

(function () {
  'use strict';

  // Global error handling
  const errorHandler = {
    handleError: (error, context = 'Unknown') => {
      console.error(`[YTM Immersion Error] ${context}:`, error);
      if (window.errorReporting) {
        window.errorReporting.report(error, context);
      }
    },

    handleAsyncError: (error, context = 'Unknown') => {
      console.error(`[YTM Immersion Async Error] ${context}:`, error);
    },

    wrapAsyncFunction: (fn, context) => {
      return async (...args) => {
        try {
          return await fn.apply(this, args);
        } catch (error) {
          errorHandler.handleAsyncError(error, context);
          throw error;
        }
      };
    },

    wrapFunction: (fn, context) => {
      return (...args) => {
        try {
          return fn.apply(this, args);
        } catch (error) {
          errorHandler.handleError(error, context);
          throw error;
        }
      };
    }
  };

  // Setup global error handlers
  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error, 'Global Window Error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleAsyncError(event.reason, 'Unhandled Promise Rejection');
  });

  // Cleanup management
  const cleanupManager = {
    cleanupFunctions: new Set(),
    
    register: (cleanupFn, name) => {
      cleanupManager.cleanupFunctions.add({ fn: cleanupFn, name });
    },
    
    unregister: (name) => {
      for (const item of cleanupManager.cleanupFunctions) {
        if (item.name === name) {
          cleanupManager.cleanupFunctions.delete(item);
          break;
        }
      }
    },
    
    cleanupAll: () => {
      console.log('[YTM Immersion] Running cleanup for all registered functions...');
      for (const item of cleanupManager.cleanupFunctions) {
        try {
          if (typeof item.fn === 'function') {
            item.fn();
            console.log(`[YTM Immersion] Cleaned up: ${item.name}`);
          }
        } catch (e) {
          console.error(`[YTM Immersion] Error during cleanup of ${item.name}:`, e);
        }
      }
      cleanupManager.cleanupFunctions.clear();
    }
  };

  // Register cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cleanupManager.cleanupAll();
  });

  // Cleanup on extension disable/uninstall
  if (window.ConstantsModule?.Constants.chrome?.runtime?.onConnect) {
    window.ConstantsModule.Constants.chrome.runtime.onConnect.addListener(() => {
      // Extension is still active
    });
  }

  // Main tick function - exactly as in original
  const tick = async () => {
    // Check for ads - from original
    if (document.querySelector('.ad-interrupting') || document.querySelector('.ad-showing')) return;

    // IMMERSION toggle button - exactly as original
    let toggleBtn = document.getElementById('my-mode-toggle');

    if (!toggleBtn) {
      const rc = document.querySelector('.right-controls-buttons');
      if (rc) {
        toggleBtn = window.UIManagerModule?.UIManager.createEl('button', 'my-mode-toggle', '', 'IMMERSION');

        const config = window.ConfigModule?.ConfigManager.getAll();
        if (config?.mode) toggleBtn.classList.add('active');

        toggleBtn.onclick = () => {
          const currentConfig = window.ConfigModule?.ConfigManager;
          const currentMode = currentConfig?.get('mode') || false;
          currentConfig?.set('mode', !currentMode);
          document.body.classList.toggle('ytm-custom-layout', !currentMode);
          
          // isYTMPremiumUser() and changeIModeUIWithMovieMode() would need to be implemented
          // if (isYTMPremiumUser()) changeIModeUIWithMovieMode(!currentMode);

          toggleBtn.classList.toggle('active', !currentMode);
        };
        rc.prepend(toggleBtn);
      }
    } else {
      const config = window.ConfigModule?.ConfigManager.getAll();
      const isActive = toggleBtn.classList.contains('active');
      if (config?.mode && !isActive) toggleBtn.classList.add('active');
      else if (!config?.mode && isActive) toggleBtn.classList.remove('active');
    }

    // Main logic - from original
    const config = window.ConfigModule?.ConfigManager.getAll();
    const ui = window.UIManagerModule?.UIManager.getUI();
    
    // Check if player is open - exactly as original
    const layout = document.querySelector('ytmusic-app-layout');
    const isPlayerOpen = layout?.hasAttribute('player-page-open');
    
    // Toggle mode based on player state and config
    if (!config?.mode || !isPlayerOpen) {
      document.body.classList.remove('ytm-custom-layout');
      // Discord presence: clear when not in player-page
      if (window.DiscordPresence && typeof window.DiscordPresence.clearDiscordPresence === 'function') {
        window.DiscordPresence.clearDiscordPresence();
      }
      return;
    }
    
    document.body.classList.add('ytm-custom-layout');
    window.UIManagerModule?.UIManager.initLayout();

    // Setup player bar blank click guard - commented out for now
    // const setupPlayerBarBlankClickGuard = () => {
    //   console.log('Player bar click guard setup needed');
    // };
    // setupPlayerBarBlankClickGuard();
    
    // Slider patch - exactly as original
    (function patchSliders() {
      const sliders = document.querySelectorAll('ytmusic-player-bar .middle-controls tp-yt-paper-slider');
      sliders.forEach(s => {
        try {
          s.style.boxSizing = 'border-box';
          s.style.paddingLeft = '20px';
          s.style.paddingRight = '20px';
          s.style.minWidth = '0';
          s.style.cursor = 'pointer';
        } catch (e) { }
      });
    })();
    
    // Update UI rendering module references
    if (window.UIRendering) {
      window.UIRendering.ui = ui;
    }

    const meta = window.UIManagerModule?.UIManager.getMetadata();
    if (!meta) return;
    const key = `${meta.title}///${meta.artist}`;

    const currentKey = window.StateModule?.StateManager.getCurrentKey();
    
    if (currentKey !== key) {
      // Cloud sync - exactly like original
      if (currentKey !== null && window.CloudSync && typeof window.CloudSync.syncNow === 'function') {
        window.CloudSync.syncNow();
      }

      // Time offset calculation - exactly like original
      const v = document.querySelector('video');
      const currentTime = v ? v.currentTime : 0;
      const duration = v ? v.duration : 0;
      const config = window.ConfigModule?.ConfigManager.getAll();
      
      let timeOffset = 0;
      if (currentTime < 5 || (duration > 0 && Math.abs(duration - currentTime) < 5)) {
        timeOffset = 0;
      } else {
        timeOffset = currentTime;
      }

      // Handle sync offset - exactly like original
      if (!config.saveSyncOffset) {
        // Reset sync offset logic would go here
        console.log('[YTM Immersion] Sync offset reset needed');
      }

      // Set current key and reset global variables - exactly like original
      window.StateModule?.StateManager.setCurrentKey(key);
      window.StateModule?.StateManager.setLyricsData([]);
      window.StateModule?.StateManager.setLastActiveIndex(-1);
      window.StateModule?.StateManager.setHasTimestamp(false);
      window.StateModule?.StateManager.setDynamicLines(null);
      window.StateModule?.StateManager.setDuetSubDynamicLines(null);
      window.StateModule?.StateManager.setDuetExcludedTimes(new Set());
      window.StateModule?.StateManager.setLyricsCandidates(null);
      window.StateModule?.StateManager.setSelectedCandidateId(null);
      window.StateModule?.StateManager.setLyricsRequests(null);
      window.StateModule?.StateManager.setLyricsConfig(null);
      
      // Reset share mode - exactly like original
      window.StateModule?.StateManager.setShareState({
        shareMode: false,
        shareStartIndex: null,
        shareEndIndex: null
      });
      document.body.classList.remove('ytm-share-select-mode');
      if (ui.shareBtn) ui.shareBtn.classList.remove('share-active');

      // Update UI - exactly like original
      window.UIManagerModule?.UIManager.updateMetaUI(meta, ui);

      // PIP manager update - exactly like original
      if (window.PipManager && typeof window.PipManager.updateMeta === 'function') {
        window.PipManager.updateMeta(meta.title, meta.artist);
        if (typeof window.PipManager.resetLyrics === 'function') {
          window.PipManager.resetLyrics();
        }
      }

      // Discord presence - exactly like original
      if (window.DiscordPresence && typeof window.DiscordPresence.sendDiscordPresence === 'function') {
        window.DiscordPresence.sendDiscordPresence(meta, '');
      }

      // Refresh menus - exactly like original
      if (window.UIManagerModule?.UIManager.refreshCandidateMenu) {
        window.UIManagerModule.UIManager.refreshCandidateMenu();
      }
      if (window.UIManagerModule?.UIManager.refreshLockMenu) {
        window.UIManagerModule.UIManager.refreshLockMenu();
      }
      
      if (ui.lyrics) ui.lyrics.scrollTop = 0;

      // Load lyrics - exactly like original
      window.LyricsLoaderModule?.LyricsLoader.loadLyrics(meta);
    } else {
      // Lyric highlighting is now handled by the dedicated RAF loop in lyricsLoader.js
      // which is started in EventsManager.start()
    }
  };
  const startMainLoop = () => {
    // Start RAF-based main loop
    const mainLoop = () => {
      tick();
      requestAnimationFrame(mainLoop);
    };
    
    requestAnimationFrame(mainLoop);
    console.log('[YTM Immersion] Main loop started');
  };

  // Events API
  const EventsManager = {
    // Start the application
    start: () => {
      startMainLoop();
      if (window.LyricsLoaderModule?.LyricsLoader.startLyricRafLoop) {
        window.LyricsLoaderModule.LyricsLoader.startLyricRafLoop();
      }
    },
    
    // Error handling
    errorHandler,
    
    // Cleanup management
    cleanupManager,
    
    // Manual tick for testing
    tick
  };

  // Export for module system
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventsManager };
  } else {
    window.EventsModule = { EventsManager };
  }

})();
