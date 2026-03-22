// ===================== State Management Module =====================
// Manages global state - extracted from original content.js

(function () {
  'use strict';

  // Global state variables - exactly as in original
  let currentKey = null;
  let currentLyricsOperation = null;
  let lyricsData = [];
  let hasTimestamp = false;
  let dynamicLines = null;
  let duetSubDynamicLines = null;
  let duetSubLyricsRaw = '';
  let _duetExcludedTimes = new Set();
  let lyricsCandidates = null;
  let selectedCandidateId = null;
  let lyricsRequests = null;
  let lyricsConfig = null;
  let lastRawLyricsText = '';
  let lastVideoUrl = '';
  let dynamicLyricsCache = new Map();
  let duetSubCache = new Map();
  let communityRemainingCache = { ts: 0, data: null, error: null };
  let communityRemainingTimer = null;
  let sharedTransBeforeFast = null;
  let moviemode = false;
  let movieObserver = null;
  let classTargets = [];
  let shareMode = false;
  let shareStartIndex = null;
  let shareEndIndex = null;
  let toastTimer = null;
  
  // Missing variables from original - add them
  let lastActiveIndex = -1;
  let lastTimeForChars = -1;
  let timeOffset = 0;
  let isFirstSongDetected = true;
  let hideTimer = null;
  let uploadMenuGlobalSetup = false;
  let deleteDialogGlobalSetup = false;
  let settingsOutsideClickSetup = false;
  let isFallbackLyrics = false;

  // RAF loop state
  let isRafLoopActive = false;
  let cleanupScheduled = false;
  let cachedVideoElement = null;
  let lastVideoCheckTime = 0;
  let lyricRafId = null;
  const VIDEO_CHECK_INTERVAL = 1000; // Check video element every second

  // UI state - exactly as in original
  const ui = {
    bg: null,
    wrapper: null,
    title: null, artist: null, artwork: null,
    lyrics: null, input: null, settings: null,
    btnArea: null, uploadMenu: null, deleteDialog: null,
    replayPanel: null,
    queuePanel: null,
    settingsBtn: null,
    lyricsBtn: null,
    shareBtn: null
  };

  // State management API
  const StateManager = {
    // Get current key
    getCurrentKey: () => currentKey,
    
    // Set current key
    setCurrentKey: (key) => {
      currentKey = key;
    },

    // Get lyrics operation ID
    getCurrentLyricsOperation: () => currentLyricsOperation,
    
    // Set lyrics operation ID
    setCurrentLyricsOperation: (id) => {
      currentLyricsOperation = id;
    },

    // Get lyrics data
    getLyricsData: () => lyricsData,
    
    // Set lyrics data
    setLyricsData: (data) => {
      lyricsData = data;
    },

    // Get timestamp status
    getHasTimestamp: () => hasTimestamp,
    
    // Set timestamp status
    setHasTimestamp: (status) => {
      hasTimestamp = status;
    },

    // Get UI state
    getUI: () => ui,

    // RAF loop state management
    getRafState: () => ({
      isRafLoopActive,
      cleanupScheduled,
      cachedVideoElement,
      lastVideoCheckTime,
      lyricRafId
    }),

    setRafState: (updates) => {
      Object.assign({
        isRafLoopActive,
        cleanupScheduled,
        cachedVideoElement,
        lastVideoCheckTime,
        lyricRafId
      }, updates);
    },

    // Cache management
    getDynamicLyricsCache: () => dynamicLyricsCache,
    getDuetSubCache: () => duetSubCache,

    // Share mode state
    getShareState: () => ({
      shareMode,
      shareStartIndex,
      shareEndIndex
    }),

    setShareState: (updates) => {
      Object.assign({
        shareMode,
        shareStartIndex,
        shareEndIndex
      }, updates);
    },

    // Lyrics processing state - exactly like original
    setFallbackLyrics: (value) => { isFallbackLyrics = value; },
    setDynamicLines: (value) => { dynamicLines = value; },
    setDuetSubDynamicLines: (value) => { duetSubDynamicLines = value; },
    setDuetExcludedTimes: (value) => { _duetExcludedTimes = value; },
    setDuetSubLyricsRaw: (value) => { duetSubLyricsRaw = value; },
    setLyricsCandidates: (value) => { lyricsCandidates = value; },
    setSelectedCandidateId: (value) => { selectedCandidateId = value; },
    setLyricsRequests: (value) => { lyricsRequests = value; },
    setLyricsConfig: (value) => { lyricsConfig = value; },

    // Getter methods for lyrics processing
    getFallbackLyrics: () => isFallbackLyrics,
    getDynamicLines: () => dynamicLines,
    getDuetSubDynamicLines: () => duetSubDynamicLines,
    getDuetExcludedTimes: () => _duetExcludedTimes,
    getDuetSubLyricsRaw: () => duetSubLyricsRaw,
    getLyricsCandidates: () => lyricsCandidates,
    getSelectedCandidateId: () => selectedCandidateId,
    getLyricsRequests: () => lyricsRequests,
    getLyricsConfig: () => lyricsConfig,

    // Additional state methods needed by Events module
    setLyricsData: (data) => { lyricsData = data; },
    // setHasTimestamp is defined above (L98) - do not redefine here

    // Getter/setter methods for newly added variables
    getLastActiveIndex: () => lastActiveIndex,
    setLastActiveIndex: (index) => { lastActiveIndex = index; },
    
    getLastTimeForChars: () => lastTimeForChars,
    setLastTimeForChars: (time) => { lastTimeForChars = time; },
    
    getTimeOffset: () => timeOffset,
    setTimeOffset: (offset) => { timeOffset = offset; },
    
    getIsFirstSongDetected: () => isFirstSongDetected,
    setIsFirstSongDetected: (detected) => { isFirstSongDetected = detected; },
    
    getHideTimer: () => hideTimer,
    setHideTimer: (timer) => { hideTimer = timer; },
    
    getUploadMenuGlobalSetup: () => uploadMenuGlobalSetup,
    setUploadMenuGlobalSetup: (setup) => { uploadMenuGlobalSetup = setup; },
    
    getDeleteDialogGlobalSetup: () => deleteDialogGlobalSetup,
    setDeleteDialogGlobalSetup: (setup) => { deleteDialogGlobalSetup = setup; },
    
    getSettingsOutsideClickSetup: () => settingsOutsideClickSetup,
    setSettingsOutsideClickSetup: (setup) => { settingsOutsideClickSetup = setup; },

    // Community remaining state
    getCommunityRemainingCache: () => communityRemainingCache,
    setCommunityRemainingCache: (cache) => {
      communityRemainingCache = cache;
    },

    // Movie mode state
    getMovieMode: () => moviemode,
    setMovieMode: (mode) => {
      moviemode = mode;
    },

    // Duet excluded times
    getDuetExcludedTimes: () => _duetExcludedTimes,
    resetDuetExcludedTimes: () => {
      _duetExcludedTimes = new Set();
    },

    // Initialize state
    initialize: () => {
      // Reset all state to initial values
      currentKey = null;
      currentLyricsOperation = null;
      lyricsData = [];
      hasTimestamp = false;
      shareMode = false;
      shareStartIndex = null;
      shareEndIndex = null;
      isRafLoopActive = false;
      cleanupScheduled = false;
      lyricRafId = null;
      cachedVideoElement = null;
    }
  };

  // Export for module system
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateManager };
  } else {
    window.StateModule = { StateManager };
  }

})();
