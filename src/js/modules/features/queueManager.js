/* globals chrome */
(function () {
  // ===================== Queue Manager =====================
  const QueueManager = {
    observer: null,

    // ===== Next-song lyrics prefetch (always) =====
    _prefetchLastAt: new Map(),
    _prefetchInFlight: new Set(),
    PREFETCH_DEDUP_MS: 6000,

    init() {
      // Initialize queue manager
      console.log('[YTM Immersion] QueueManager initialized');
    },

    _extractVideoIdFromQueueItem: function (queueItem) {
      try {
        const a =
          queueItem.querySelector('a[href*="watch"]') ||
          queueItem.querySelector('a[href*="youtu"]') ||
          queueItem.querySelector('a');
        const href = a ? (a.href || a.getAttribute('href')) : null;
        if (!href) return null;
        const u = new URL(href, location.origin);
        // /watch?v=...
        const v = u.searchParams.get('v');
        if (v) return v;
        // youtu.be/<id>
        if (u.hostname.includes('youtu.be')) {
          const parts = (u.pathname || '').split('/').filter(Boolean);
          return parts[0] || null;
        }
      } catch (e) { }
      return null;
    },

    _prefetchLyrics: function (meta) {
      const title = (meta && meta.title) ? String(meta.title).trim() : '';
      const artist = (meta && meta.artist) ? String(meta.artist).trim() : '';
      if (!title) return;

      const key = `${title}///${artist}`;
      const now = Date.now();

      const last = this._prefetchLastAt.get(key) || 0;
      if (now - last < this.PREFETCH_DEDUP_MS) return;
      if (this._prefetchInFlight.has(key)) return;

      this._prefetchLastAt.set(key, now);
      this._prefetchInFlight.add(key);

      const videoId = meta && meta.videoId ? meta.videoId : null;
      const youtubeUrl = meta && meta.youtubeUrl ? meta.youtubeUrl : (videoId ? `https://youtu.be/${videoId}` : null);

      console.log('[Queue] Prefetch(next) lyrics:', title, '/', artist);

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'GET_LYRICS',
          payload: {
            track: title,
            artist: artist,
            youtube_url: youtubeUrl,
            video_id: videoId,
          }
        }, (res) => {
          this._prefetchInFlight.delete(key);

          // Don't overwrite existing good cache on transient failures
          if (!res || !res.success) return;

          const lyr = (res.lyrics || '');
          if (typeof lyr === 'string' && lyr.trim()) {
            const storage = window.Storage?.storage;
            if (storage) {
              storage.set(key, {
                lyrics: lyr,
                dynamicLines: res.dynamicLines || null,
                candidates: res.candidates || null,
                fetchedAt: Date.now(),
              }).then(() => {
                // Refresh highlight instantly if the panel is open
                const ui = window.StateModule?.StateManager.getUI();
                if (ui.queuePanel && ui.queuePanel.classList.contains('visible')) {
                  this.syncQueue();
                }
              });
            }
          } else {
            // Remember "no lyrics" result so Up Next can show an orange hint.
            // But don't overwrite already cached real lyrics.
            const storage = window.Storage?.storage;
            if (storage) {
              storage.get(key).then((cached0) => {
                const existing = cached0 && typeof cached0.lyrics === 'string' ? cached0.lyrics : '';
                const hasReal = existing && existing.trim() && existing !== '__NO_LYRICS__';
                if (hasReal) return;
                return storage.set(key, {
                  lyrics: '__NO_LYRICS__',
                  dynamicLines: null,
                  candidates: res.candidates || null,
                  noLyrics: true,
                  fetchedAt: Date.now(),
                });
              }).then(() => {
                // Refresh highlight instantly if the panel is open
                const ui = window.StateModule?.StateManager.getUI();
                if (ui.queuePanel && ui.queuePanel.classList.contains('visible')) {
                  this.syncQueue();
                }
              });
            }
          }
        });
      }
    },

    syncQueue: function () {
      // Queue synchronization would be implemented here
      console.log('QueueManager syncQueue called');
    },

    onSongChanged: function () {
      // Called when song changes - prefetch next lyrics
      this._prefetchNextIfPossible();
    },

    _prefetchNextIfPossible: function () {
      // Prefetch next song in queue
      const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
      if (queueItems.length > 1) {
        const nextItem = queueItems[1]; // Second item is usually next
        const videoId = this._extractVideoIdFromQueueItem(nextItem);
        if (videoId) {
          // Extract metadata from queue item
          const titleEl = nextItem.querySelector('.song-title');
          const artistEl = nextItem.querySelector('.byline');
          
          const title = titleEl ? titleEl.textContent.trim() : '';
          const artist = artistEl ? artistEl.textContent.trim() : '';
          
          if (title) {
            this._prefetchLyrics({
              title: title,
              artist: artist,
              videoId: videoId,
              youtubeUrl: `https://youtu.be/${videoId}`
            });
          }
        }
      }
    }
  };

  // Export for module system
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QueueManager };
  } else {
    window.QueueManagerModule = { QueueManager };
  }

})();
