// ===================== Movie Mode Module =====================
(function () {
  const MovieModeModule = {
    moviemode: false,
    movieObserver: null,
    classTargets: [],

    init() {
      // 初期化処理
    },

    // YTM Premiumユーザー判定
    isYTMPremiumUser() {
      const switcher = document.querySelector("ytmusic-av-toggle");
      const requireSignIn = !!document.querySelector('ytmusic-guide-signin-promo-renderer');
      const primarySection = document.querySelector('#mini-guide ytmusic-guide-section-renderer[is-primary] div#items');
      const notPremium = primarySection ? primarySection.childNodes.length >= 4 : false;
      
      if(!requireSignIn && !notPremium){
        if(switcher) switcher.classList.remove('notpremium');
      }
      else {
        if(switcher) switcher.classList.add('notpremium');
      }
      
      return !requireSignIn || !notPremium;
    },

    // 映画モードセットアップ
    setupMovieMode() {
      const switcher = document.querySelector("ytmusic-av-toggle");
      if (!switcher) {
        setTimeout(() => this.setupMovieMode(), 500);
        return;
      }

      const handleMutation = () => {
        const newMoviemode = switcher.getAttribute("playback-mode") === "omv";
        if (this.moviemode === newMoviemode) return;
        
        this.moviemode = newMoviemode;
        this.classTargets = [];
        
        const wrapper = document.querySelector("#ytm-custom-wrapper");
        if (wrapper instanceof Element) {
          this.classTargets.push(...wrapper.querySelectorAll("*"));
        }
        
        const pusher = (element) => {
          if (element instanceof Element) this.classTargets.push(element);
        };
        
        const playerBar = document.querySelector("ytmusic-player-bar");
        pusher(playerBar);
        pusher(switcher);
        const video = document.querySelector("ytmusic-player#player");
        pusher(video);
        const navBar = document.querySelector("ytmusic-nav-bar");
        pusher(navBar);

        this.classTargets.forEach(element => {
          if (this.moviemode) {
            element.classList.add("moviemode");
          } else {
            element.classList.remove("moviemode");
          }
        });

        this.changeUIWithMovieMode(this.moviemode);
      };

      handleMutation();
      this.bringSwitcherOnly();
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "playback-mode") {
            handleMutation();
          }
        });
      });

      observer.observe(switcher, { attributes: true });

      this.movieObserver = {
        stop: () => {
          observer.disconnect();
          this.movieObserver = null;
        }
      };

      return this.movieObserver;
    },

    // スイッチャーのみを前面に持ってくる
    bringSwitcherOnly() {
      const switcher = document.querySelector("ytmusic-av-toggle");
      if (!switcher) return;
      
      // スイッチャーを最前面に保つCSSを注入
      let style = document.getElementById('ytm-movie-mode-switcher-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'ytm-movie-mode-switcher-style';
        style.textContent = `
          ytmusic-av-toggle {
            position: relative !important;
            z-index: 1000 !important;
          }
        `;
        document.head.appendChild(style);
      }
    },

    // 映画モードに合わせてUIを変更
    changeUIWithMovieMode(changed) {
      if (!changed || changed === null) return;
      
      const originParent = document.querySelector("div#main-panel");
      const originTarget = originParent ? originParent.children[2] : null;
      const customParent = document.querySelector("#ytm-custom-wrapper");
      const customSwitcherParent = document.querySelector("#ytm-custom-info-area");
      const switcher = document.querySelector("ytmusic-av-toggle");
      const video = document.querySelector("ytmusic-player#player.style-scope.ytmusic-player-page");

      if (this.moviemode && customParent && video && customSwitcherParent && switcher) {
        customParent.prepend(video);
        customSwitcherParent.appendChild(switcher);
      }
      else if (originParent && originTarget && video) {
        if (!originParent.contains(video)) {
          originParent.insertBefore(video, originTarget);
        }
      }
      
      // リサイズイベントを発火してレイアウトを調整
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 300);
    },

    // 映画モードとIMMERSIONモードの連携
    changeIModeUIWithMovieMode(imodeActive) {
      if (!this.moviemode) return;
      
      // IMMERSIONモードがアクティブなときの映画モード用調整
      if (imodeActive) {
        document.body.classList.add('immersion-movie-mode');
      } else {
        document.body.classList.remove('immersion-movie-mode');
      }
    },

    // 映画モードをトグル
    toggleMovieMode() {
      this.moviemode = !this.moviemode;
      this.applyMovieModeToElements();
    },

    // 要素に映画モードを適用
    applyMovieModeToElements() {
      this.classTargets.forEach(element => {
        if (this.moviemode) {
          element.classList.add("moviemode");
        } else {
          element.classList.remove("moviemode");
        }
      });
    },

    // 映画モード状態を取得
    getMovieModeState() {
      return {
        moviemode: this.moviemode,
        isObserverActive: !!this.movieObserver,
        targetCount: this.classTargets.length
      };
    },

    // 映画モードをクリーンアップ
    cleanup() {
      if (this.movieObserver) {
        this.movieObserver.stop();
      }
      
      // 映画モードクラスを全て除去
      this.classTargets.forEach(element => {
        element.classList.remove("moviemode");
      });
      
      this.moviemode = false;
      this.classTargets = [];
      
      // スタイルを除去
      const style = document.getElementById('ytm-movie-mode-switcher-style');
      if (style) {
        style.remove();
      }
    },

    // 映画モードCSSを注入
    injectMovieModeCSS() {
      if (document.getElementById('ytm-movie-mode-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'ytm-movie-mode-styles';
      style.textContent = `
        /* 映画モード用スタイル */
        .moviemode {
          transition: all 0.3s ease !important;
        }
        
        .moviemode.ytm-custom-wrapper {
          background: #000 !important;
        }
        
        .moviemode #ytm-custom-bg {
          opacity: 0.3 !important;
        }
        
        .moviemode .lyric-line {
          color: #fff !important;
          text-shadow: 0 0 4px rgba(0, 0, 0, 0.8) !important;
        }
        
        .immersion-movie-mode {
          /* IMMERSIONモードと映画モードの組み合わせ用調整 */
        }
        
        ytmusic-av-toggle.notpremium {
          opacity: 0.5 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Initialize
  MovieModeModule.init();
  MovieModeModule.injectMovieModeCSS();

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MovieModeModule };
  } else {
    window.MovieModeModule = { MovieModeModule };
  }
})();
