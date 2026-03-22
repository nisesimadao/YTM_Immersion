/* globals chrome */
(function () {
  // ===================== CloudSync: Daily Replay クラウド同期 =====================
const CloudSync = (() => {
  // Check if extension API is available
  if (!chrome || !chrome.runtime) {
    return {
      init() { },
      syncNow() { },
      openPanel() { }
    };
  }

  let statusEl = null;
  let tokenInputEl = null;
  let syncButtonEl = null;
  let panelRoot = null;

  function setStatus(text) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.title = text;
    }
  }

  function createPanel() {
    const existing = document.getElementById('dr-cloud-sync-panel');
    if (existing) {
      panelRoot = existing;
      statusEl = document.querySelector('#dr-cloud-sync-panel-status');
      tokenInputEl = document.querySelector('#dr-cloud-sync-token-input');
      syncButtonEl = document.querySelector('#dr-cloud-sync-sync-btn');
      return;
    }

    const root = document.createElement('div');
    root.id = 'dr-cloud-sync-panel';
    panelRoot = root;
    root.style.position = 'fixed';
    root.style.zIndex = '2147483647';
    root.style.right = '16px';
    root.style.bottom = '16px';
    root.style.width = '280px';
    root.style.maxWidth = '90vw';
    root.style.borderRadius = '12px';
    root.style.background = 'rgba(10, 10, 15, 0.96)';
    root.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    root.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.6)';
    root.style.color = '#f5f5ff';
    root.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    root.style.fontSize = '12px';
    root.style.padding = '10px 12px';

    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.justifyContent = 'space-between';
    titleRow.style.marginBottom = '6px';

    const title = document.createElement('div');
    title.textContent = 'Daily Replay クラウド同期';
    title.style.fontSize = '13px';
    title.style.fontWeight = '600';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#aaa';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.Padding = '0 4px';
    closeBtn.addEventListener('click', () => {
      root.style.display = 'none';
    });

    titleRow.appendChild(title);
    titleRow.appendChild(closeBtn);

    const desc = document.createElement('div');
    desc.textContent =
      '「復活の呪文」を使って履歴をサーバーと同期します。';
    desc.style.marginBottom = '6px';
    desc.style.color = '#b0b4d0';
    desc.style.lineHeight = '1.4';

    const tokenLabel = document.createElement('div');
    tokenLabel.textContent = '復活の呪文（ID）';
    tokenLabel.style.fontSize = '11px';
    tokenLabel.style.marginBottom = '2px';
    tokenLabel.style.color = '#d0d4ff';

    const tokenInput = document.createElement('input');
    tokenInput.id = 'dr-cloud-sync-token-input';
    tokenInput.type = 'text';
    tokenInput.placeholder = '例: dr_XXXXXXXXXXXXXXXX';
    tokenInput.style.width = '100%';
    tokenInput.style.boxSizing = 'border-box';
    tokenInput.style.borderRadius = '6px';
    tokenInput.style.border = '1px solid rgba(255,255,255,0.2)';
    tokenInput.style.background = 'rgba(5,5,10,0.9)';
    tokenInput.style.color = '#f5f5ff';
    tokenInput.style.padding = '4px 6px';
    tokenInput.style.fontSize = '12px';
    tokenInput.style.marginBottom = '4px';

    const tokenHelpRow = document.createElement('div');
    tokenHelpRow.style.display = 'flex';
    tokenHelpRow.style.justifyContent = 'space-between';
    tokenHelpRow.style.alignItems = 'center';
    tokenHelpRow.style.marginBottom = '6px';

    const tokenHelp = document.createElement('div');
    tokenHelp.textContent =
      '※ Discord ログイン後に表示される復活の呪文を入力。';
    tokenHelp.style.fontSize = '10px';
    tokenHelp.style.color = '#8f93b8';
    tokenHelp.style.marginRight = '4px';

    const loginLinkBtn = document.createElement('button');
    loginLinkBtn.textContent = 'ログインページ';
    loginLinkBtn.style.fontSize = '10px';
    loginLinkBtn.style.borderRadius = '999px';
    loginLinkBtn.style.border = 'none';
    loginLinkBtn.style.padding = '4px 8px';
    loginLinkBtn.style.cursor = 'pointer';
    loginLinkBtn.style.background = '#5865F2';
    loginLinkBtn.style.color = '#fff';
    loginLinkBtn.addEventListener('click', () => {
      openLoginPage();
    });

    tokenHelpRow.appendChild(tokenHelp);
    tokenHelpRow.appendChild(loginLinkBtn);

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '6px';
    buttonRow.style.marginBottom = '4px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '復活の呪文を保存';
    saveBtn.style.flex = '1';
    saveBtn.style.borderRadius = '999px';
    saveBtn.style.border = 'none';
    saveBtn.style.padding = '5px 8px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.background = '#4f8bff';
    saveBtn.style.color = '#fff';
    saveBtn.style.fontSize = '11px';
    saveBtn.style.fontWeight = '600';

    const syncBtn = document.createElement('button');
    syncBtn.id = 'dr-cloud-sync-sync-btn';
    syncBtn.textContent = '今すぐ同期';
    syncBtn.style.flex = '0 0 auto';
    syncBtn.style.borderRadius = '999px';
    syncBtn.style.border = 'none';
    syncBtn.style.padding = '5px 10px';
    syncBtn.style.cursor = 'pointer';
    syncBtn.style.background = '#1db954';
    syncBtn.style.color = '#fff';
    syncBtn.style.fontSize = '11px';
    syncBtn.style.fontWeight = '600';
    syncBtn.disabled = true;
    syncBtn.style.opacity = '0.5';

    saveBtn.addEventListener('click', () => {
      const token = tokenInput.value.trim();
      if (!token) {
        setStatus('復活の呪文を入力してください。');
        return;
      }
      saveRecoveryToken(token);
    });

    syncBtn.addEventListener('click', () => {
      syncBtn.disabled = true;
      syncBtn.style.opacity = '0.5';
      setStatus('同期中...');
      syncNow().finally(() => {
        syncBtn.disabled = false;
        syncBtn.style.opacity = '1';
      });
    });

    const status = document.createElement('div');
    status.id = 'dr-cloud-sync-panel-status';
    status.textContent = '状態: 復活の呪文が未設定です。';
    status.style.fontSize = '10px';
    status.style.color = '#b0b4d0';
    status.style.marginTop = '2px';
    status.style.whiteSpace = 'pre-wrap';

    root.appendChild(titleRow);
    root.appendChild(desc);
    root.appendChild(tokenLabel);
    root.appendChild(tokenInput);
    root.appendChild(tokenHelpRow);
    buttonRow.appendChild(saveBtn);
    buttonRow.appendChild(syncBtn);
    root.appendChild(buttonRow);
    root.appendChild(status);
    document.body.appendChild(root);

    statusEl = status;
    tokenInputEl = tokenInput;
    syncButtonEl = syncBtn;

    // Load initial state
    loadInitialState();
  }

  function saveRecoveryToken(token) {
    chrome.runtime.sendMessage(
      {
        type: 'SAVE_RECOVERY_TOKEN',
        token,
      },
      (resp) => {
        if (!resp || !resp.ok) {
          const errMsg = resp && resp.error ? resp.error : '保存に失敗しました。';
          setStatus('復活の呪文の保存に失敗: ' + errMsg);
          return;
        }
        setStatus('復活の呪文を保存しました。このIDに紐づいてクラウド同期されます。');
        if (syncButtonEl) {
          syncButtonEl.disabled = false;
          syncButtonEl.style.opacity = '1';
        }
      }
    );
  }

  function openLoginPage() {
    chrome.runtime.sendMessage({ type: 'OPEN_LOGIN_PAGE' }, (resp) => {
      if (!resp || !resp.ok) {
        const errMsg = resp && resp.error ? resp.error : 'ログインページを開けませんでした。';
        setStatus('ログインページの起動エラー: ' + errMsg);
        return;
      }
      setStatus(
        'ブラウザでログインページを開きました。ログイン後に復活の呪文をここに貼り付けてください。'
      );
    });
  }

  function getLocalHistory() {
    return new Promise((resolve) => {
      if (!chrome.storage || !chrome.storage.local) {
        resolve([]);
        return;
      }
      chrome.storage.local.get('replay_history', (items) => {
        const value = items && items['replay_history'];
        if (Array.isArray(value)) {
          resolve(value);
        } else {
          resolve([]);
        }
      });
    });
  }

  function setLocalHistory(history) {
    return new Promise((resolve) => {
      if (!chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ 'replay_history': history }, () => resolve());
    });
  }

  async function syncNow() {
    try {
      const history = await getLocalHistory();
      const resp = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SYNC_HISTORY',
            history,
          },
          (response) => resolve(response)
        );
      });

      if (!resp || !resp.ok) {
        const errMsg = resp && resp.error ? resp.error : '同期エラー';
        setStatus('同期に失敗しました: ' + errMsg);
        return { ok: false, error: errMsg, raw: resp || null };
      }

      const mergedHistory = Array.isArray(resp.mergedHistory)
        ? resp.mergedHistory
        : Array.isArray(resp.history)
          ? resp.history
          : null;

      if (mergedHistory) {
        await setLocalHistory(mergedHistory);
      }

      const lastSyncAtMs = resp.lastSyncAt || Date.now();
      const lastSyncDate = new Date(lastSyncAtMs);
      const serverCount =
        mergedHistory && Array.isArray(mergedHistory)
          ? mergedHistory.length
          : resp.serverCount || '?';

      setStatus(
        `同期完了: ローカル ${history.length} 件 → サーバー ${serverCount} 件\n最終同期: ${lastSyncDate.toLocaleString()}`
      );

      return {
        ok: true,
        mergedHistory: mergedHistory || null,
        lastSyncAt: lastSyncAtMs,
        serverCount,
      };
    } catch (e) {
      console.error('[DailyReplay Cloud] sync error', e);
      const msg = e && e.message ? e.message : String(e);
      setStatus(
        '同期中にエラーが発生しました: ' + msg
      );
      return { ok: false, error: msg, raw: null };
    }
  }

  function loadInitialState() {
    chrome.runtime.sendMessage({ type: 'GET_CLOUD_STATE' }, (resp) => {
      if (!resp || !resp.ok || !resp.state) {
        setStatus(
          '状態の取得に失敗しました。復活の呪文を設定すると同期できます。'
        );
        return;
      }
      const state = resp.state;
      if (tokenInputEl && state.recoveryToken) {
        tokenInputEl.value = state.recoveryToken;
      }

      if (syncButtonEl) {
        const hasToken = !!state.recoveryToken;
        syncButtonEl.disabled = !hasToken;
        syncButtonEl.style.opacity = hasToken ? '1' : '0.5';
      }

      const lastSyncAt = state.lastSyncAt ? new Date(state.lastSyncAt) : null;
      const lastSyncText = lastSyncAt ? lastSyncAt.toLocaleString() : '未同期';

      setStatus(
        state.recoveryToken
          ? `状態: 復活の呪文が設定されています。\n最終同期: ${lastSyncText}`
          : '状態: 復活の呪文が未設定です。ログインして発行されたIDを入力してください。'
      );
    });
  }

  // Auto sync on init - quiet background sync
  function init() {
    if (window.__drCloudSyncInitialized) return;
    window.__drCloudSyncInitialized = true;

    const startAutoSync = () => {
      // Auto sync on startup (no toast if no token)
      syncNow()
        .then((result) => {
          if (!result || !result.ok) return;
          // Show toast only on successful sync
          if (typeof showToast === 'function') {
            showToast('Daily Replay のクラウド同期が完了しました');
          }
        })
        .catch((e) => {
          console.warn('[DailyReplay Cloud] auto sync failed', e);
        });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startAutoSync);
    } else {
      startAutoSync();
    }
  }

  // Open panel only when called from Cloud button
  function openPanel() {
    createPanel();
    if (panelRoot) {
      panelRoot.style.display = 'block';
    }
  }

  return { init, openPanel, syncNow };
})();

// Module exports
window.CloudSyncModule = {
  CloudSync
};

})();
