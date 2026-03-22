// カスタムハンドル（丸ポチ）を作成してoverflow:hiddenから逃がす
(function () {
  // Event listener cleanup tracking
  const eventListeners = new Map();

  function createCustomProgressHandle() {
    const waitForPlayerBar = () => {
      const playerBar = document.querySelector('ytmusic-player-bar');
      const progressBar = document.querySelector('tp-yt-paper-slider#progress-bar');
      if (!playerBar || !progressBar) {
        setTimeout(waitForPlayerBar, 500);
        return;
      }

      // カスタムハンドルを作成
      let customHandle = document.getElementById('ytm-custom-progress-handle');
      if (!customHandle) {
        customHandle = document.createElement('div');
        customHandle.id = 'ytm-custom-progress-handle';
        customHandle.style.cssText = `
          position: fixed;
          width: 12px;
          height: 12px;
          background: #ff0000;
          border-radius: 50%;
          pointer-events: none;
          z-index: 10000;
          opacity: 0;
          transform: translate(-50%, -50%);
          transition: opacity 0.1s ease-out;
        `;
        document.body.appendChild(customHandle);
      }

      // 元のハンドルを非表示にするCSS（Shadow DOM内部に適用）
      const style = document.getElementById('ytm-hide-original-handle');
      if (!style) {
        const style = document.createElement('style');
        style.id = 'ytm-hide-original-handle';
        style.textContent = `
          body.ytm-custom-layout ytmusic-player-bar tp-yt-paper-slider#progress-bar::part(knob),
          body.ytm-custom-layout ytmusic-player-bar tp-yt-paper-slider#progress-bar [class*="knob"],
          body.ytm-custom-layout ytmusic-player-bar #sliderKnobInner {
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
      }

      // 表示状態を管理
      let isHovering = false;      // カーソルがバー上にある
      let positionChanged = false; // 位置を変更した（ドラッグした）
      let isDragging = false;      // ドラッグ中かどうか

      // Cleanup previous listeners if they exist
      if (eventListeners.has(progressBar)) {
        const listeners = eventListeners.get(progressBar);
        listeners.forEach(({ type, handler }) => {
          progressBar.removeEventListener(type, handler);
        });
        eventListeners.delete(progressBar);
      }

      // ホバー検出
      const mouseEnterHandler = () => {
        isHovering = true;
      };
      progressBar.addEventListener('mouseenter', mouseEnterHandler);

      const mouseLeaveHandler = () => {
        isHovering = false;
      };
      progressBar.addEventListener('mouseleave', mouseLeaveHandler);

      // ドラッグ（位置変更）検出
      const mouseDownHandler = () => {
        positionChanged = true;
        isDragging = true;
      };
      progressBar.addEventListener('mousedown', mouseDownHandler);

      // マウスアップでドラッグ終了
      const mouseUpHandler = () => {
        isDragging = false;
      };
      document.addEventListener('mouseup', mouseUpHandler);

      // バー以外をクリックしたときのクリーンアップ
      const documentClickHandler = (e) => {
        if (!progressBar.contains(e.target)) {
          positionChanged = false;
        }
      };
      document.addEventListener('click', documentClickHandler, true);

      // Track listeners for cleanup
      eventListeners.set(progressBar, [
        { type: 'mouseenter', handler: mouseEnterHandler },
        { type: 'mouseleave', handler: mouseLeaveHandler },
        { type: 'mousedown', handler: mouseDownHandler }
      ]);
      eventListeners.set(document, [
        { type: 'mouseup', handler: mouseUpHandler },
        { type: 'click', handler: documentClickHandler }
      ]);

      // ハンドルの表示・非表示を制御
      const shouldShowHandle = () => {
        // ホバー中、または位置変更後（バー外クリックまで）
        return isHovering || positionChanged;
      };

      // ハンドルの位置を更新
      const updateHandlePosition = () => {
        if (!document.body.classList.contains('ytm-custom-layout')) {
          if (customHandle) {
            customHandle.style.opacity = '0';
          }
          requestAnimationFrame(updateHandlePosition);
          return;
        }

        // ネイティブのsliderKnobを取得
        const sliderKnob = progressBar.querySelector('#sliderKnob');
        if (!sliderKnob) {
          requestAnimationFrame(updateHandlePosition);
          return;
        }

        // 表示条件をチェック
        if (!shouldShowHandle()) {
          if (customHandle) {
            customHandle.style.opacity = '0';
          }
          requestAnimationFrame(updateHandlePosition);
          return;
        }

        // sliderKnobのrectを取得（ドラッグ中もリアルタイムで更新される）
        const knobRect = sliderKnob.getBoundingClientRect();
        const barRect = progressBar.getBoundingClientRect();

        // knobの中心位置を計算（完全追従）
        const handleX = knobRect.left + knobRect.width / 2;
        const handleY = barRect.top + barRect.height / 2;

        // ハンドルを表示して位置を更新
        if (customHandle) {
          customHandle.style.opacity = '1';
          customHandle.style.left = handleX + 'px';
          customHandle.style.top = handleY + 'px';

          // ドラッグ中は大きく、そうでなければ通常サイズ
          if (isDragging) {
            customHandle.style.width = '16px';
            customHandle.style.height = '16px';
          } else {
            customHandle.style.width = '12px';
            customHandle.style.height = '12px';
          }
        }
        
        requestAnimationFrame(updateHandlePosition);
      };

      requestAnimationFrame(updateHandlePosition);
    };

    // DOMが準備できたら開始
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitForPlayerBar);
    } else {
      waitForPlayerBar();
    }
  }

  // Cleanup function
  function cleanup() {
    eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ type, handler }) => {
        target.removeEventListener(type, handler);
      });
    });
    eventListeners.clear();
    
    const customHandle = document.getElementById('ytm-custom-progress-handle');
    if (customHandle) {
      customHandle.remove();
    }
    
    const style = document.getElementById('ytm-hide-original-handle');
    if (style) {
      style.remove();
    }
  }

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCustomProgressHandle, cleanup };
  } else {
    window.ProgressHandle = { createCustomProgressHandle, cleanup };
  }
})();
