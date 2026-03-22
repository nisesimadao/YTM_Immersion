/* globals chrome, browser */
(function () {
  const EXT =
    typeof globalThis.chrome !== 'undefined'
      ? globalThis.chrome
      : (typeof globalThis.browser !== 'undefined' ? globalThis.browser : null);

  const storage = {
    _api: chrome?.storage?.local,
    _isContextValid: true,

    // Check if extension context is still valid
    _checkContext: function() {
      try {
        // Try to access chrome.runtime - this will throw if context is invalid
        return chrome?.runtime?.id !== undefined;
      } catch (e) {
        this._isContextValid = false;
        console.warn('[Storage] Extension context invalidated:', e.message);
        return false;
      }
    },

    // Safe API call with context validation
    _safeApiCall: function(method, ...args) {
      if (!this._checkContext()) {
        console.error(`[Storage] Cannot call ${method}: Extension context invalid`);
        return Promise.reject(new Error('Extension context invalidated'));
      }
      
      if (!this._api) {
        console.error(`[Storage] Chrome storage API not available for ${method}`);
        return Promise.reject(new Error('Chrome storage API not available'));
      }

      return new Promise((resolve, reject) => {
        try {
          this._api[method](...args, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    },

    get: (k) => storage._safeApiCall('get', [k]).then(res => res[k]),
    set: (k, v) => storage._safeApiCall('set', { [k]: v }),
    remove: (k) => storage._safeApiCall('remove', k),
    clear: () => {
      if (confirm('全データを削除しますか？') && storage._api) {
        return storage._safeApiCall('clear').then(() => location.reload());
      }
      return Promise.resolve();
    },

    // Fallback methods for when extension context is invalid
    getFallback: function(k) {
      try {
        return localStorage.getItem(`ytm_${k}`);
      } catch (e) {
        console.warn('[Storage] Fallback get failed:', e);
        return null;
      }
    },

    setFallback: function(k, v) {
      try {
        localStorage.setItem(`ytm_${k}`, JSON.stringify(v));
        return Promise.resolve();
      } catch (e) {
        console.warn('[Storage] Fallback set failed:', e);
        return Promise.reject(e);
      }
    }
  };

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { storage, EXT };
  } else {
    window.Storage = { storage, EXT };
  }
})();
