/**
 * Photo Finish - slit-scan chronometer for EPS.
 * The timer truth is performance.now(); display loops only repaint derived values.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "outilseps.photoFinish.v1";
  var DB_NAME = "outilseps-photo-finish";
  var DB_VERSION = 1;
  var MAX_IMAGE_WIDTH = 18000;
  var managerSessionId = null;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var els = {
    msg: $("pf-msg"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".dispense-nav__btn[data-screen]")),
    screens: Array.prototype.slice.call(document.querySelectorAll(".dispense-view[data-screen]")),
    video: $("pf-video"),
    stage: $("pf-stage"),
    slitGuide: $("pf-slit-guide"),
    chronoLive: $("pf-chrono-live"),
    status: $("pf-status"),
    cameraMeta: $("pf-camera-meta"),
    btnCamera: $("pf-btn-camera"),
    btnQualityTest: $("pf-btn-quality-test"),
    btnRunQualityTest: $("pf-btn-run-quality-test"),
    btnResetAdvanced: $("pf-btn-reset-advanced"),
    btnFlip: $("pf-btn-flip"),
    btnStart: $("pf-btn-start"),
    btnStop: $("pf-btn-stop"),
    btnFullscreen: $("pf-btn-fullscreen"),
    delayState: $("pf-delay-state"),
    stripState: $("pf-strip-state"),
    fpsState: $("pf-fps-state"),
    resultCanvas: $("pf-result"),
    viewer: $("pf-viewer"),
    scroll: $("pf-scroll"),
    imageWrap: $("pf-image-wrap"),
    markers: $("pf-markers"),
    cursorTime: $("pf-cursor-time"),
    cursorTimeFloating: $("pf-cursor-time-floating"),
    scrollSlider: $("pf-scroll-slider"),
    btnAddResult: $("pf-btn-add-result"),
    btnInvert: $("pf-btn-invert"),
    btnExportImage: $("pf-btn-export-image"),
    btnSaveGallery: $("pf-btn-save-gallery"),
    debugPanel: $("pf-debug-panel"),
    debugList: $("pf-debug-list"),
    diagnosticPanel: $("pf-diagnostic-panel"),
    diagnosticList: $("pf-diagnostic-list"),
    diagnosticWarnings: $("pf-diagnostic-warnings"),
    qualityResult: $("pf-quality-result"),
    qualityReport: $("pf-quality-report"),
    resultDialog: $("pf-result-dialog"),
    dialogTime: $("pf-dialog-time"),
    runnerSearch: $("pf-runner-search"),
    runnerSelect: $("pf-runner-select"),
    unassigned: $("pf-unassigned"),
    resultComment: $("pf-result-comment"),
    dialogCancel: $("pf-dialog-cancel"),
    dialogSave: $("pf-dialog-save"),
    resultsList: $("pf-results-list"),
    resultsEmpty: $("pf-results-empty"),
    runnersList: $("pf-runners-list"),
    homeRunners: $("pf-home-runners"),
    accRunners: $("pf-acc-runners"),
    accSettings: $("pf-acc-settings"),
  };

  var inputs = {
    homeClassSelect: $("pf-home-class-select"),
    sessionName: $("pf-session-name"),
    sessionClass: $("pf-session-class"),
    eventType: $("pf-event-type"),
    distance: $("pf-distance"),
    comment: $("pf-comment"),
    startMode: $("pf-start-mode"),
    delay: $("pf-delay"),
    delayCustomWrap: $("pf-delay-custom-wrap"),
    delayCustom: $("pf-delay-custom"),
    autoStopEnabled: $("pf-auto-stop-enabled"),
    autoStop: $("pf-auto-stop"),
    cameraFacing: $("pf-camera-facing"),
    quality: $("pf-quality"),
    stripWidth: $("pf-strip-width"),
    finishRatio: $("pf-finish-ratio"),
    finishRatioVal: $("pf-finish-ratio-val"),
    captureHeight: $("pf-capture-height"),
    renderHeight: $("pf-render-height"),
    direction: $("pf-direction"),
    highContrast: $("pf-high-contrast"),
    debugEnabled: $("pf-debug-enabled"),
    autoOptimize: $("pf-auto-optimize"),
    filterClass: $("pf-filter-class"),
    filterRunner: $("pf-filter-runner"),
    filterAssigned: $("pf-filter-assigned"),
    filterSeries: $("pf-filter-series"),
    sortResults: $("pf-sort-results"),
    importText: $("pf-import-text"),
  };

  var nativeStripCanvas = document.createElement("canvas");
  var nativeStripCtx = nativeStripCanvas.getContext("2d", { alpha: false });
  var stripCanvas = document.createElement("canvas");
  var stripCtx = stripCanvas.getContext("2d", { alpha: false });
  var compositeCanvas = document.createElement("canvas");
  var compositeCtx = compositeCanvas.getContext("2d", { alpha: false });
  var resultCtx = els.resultCanvas.getContext("2d", { alpha: false });

  var state = {
    screen: "home",
    stream: null,
    cameraStarting: false,
    timerState: "idle",
    startTime: 0,
    stopTime: 0,
    captureStarted: false,
    qualityTestMode: false,
    qualityTestStopId: 0,
    rafId: 0,
    videoFrameId: 0,
    fallbackCaptureId: 0,
    lastFrameNow: 0,
    lastStopTap: 0,
    zoom: 1,
    displayScaleX: 1,
    viewerPixelScale: 1,
    effectiveStripWidth: 4,
    activeImageDataUrl: "",
    probedCameraFps: 0,
    autoOptimizeSummary: "",
    currentSessionId: "",
    currentSeriesNumber: 0,
    seriesCounter: 0,
    currentResultDraft: null,
    settings: defaultSettings(),
    sessionInfo: defaultSessionInfo(),
    runners: [],
    selectedRunnerIds: [],
    sessions: [],
    results: [],
    strips: [],
    debugStats: defaultDebugStats(),
    hasStoredData: false,
  };

  function defaultSettings() {
    return {
      captureDelayMs: 0,
      autoStopEnabled: false,
      autoStopMs: 15000,
      direction: "leftToRight",
      stripWidth: 4,
      finishLineXRatio: 0.5,
      preferredCamera: "environment",
      qualityMode: "balancedEPS",
      startTriggerMode: "release",
      className: "",
      debugEnabled: false,
      highContrast: false,
      captureHeight: "full",
      renderHeight: "sprint",
      autoOptimize: true,
      qualityPatchVersion: 5,
    };
  }

  function defaultSessionInfo() {
    return {
      name: "Photo Finish V1 " + new Date().toLocaleDateString("fr-FR"),
      date: new Date().toISOString(),
      className: "",
      eventType: "Sprint",
      distance: "",
      comment: "",
    };
  }

  function defaultDebugStats() {
    return {
      stripCount: 0,
      imageWidth: 0,
      imageHeight: 0,
      firstStripTimeMs: 0,
      lastStripTimeMs: 0,
      captureDurationMs: 0,
      averageFps: 0,
      minFrameDeltaMs: 0,
      maxFrameDeltaMs: 0,
      cameraWidth: 0,
      cameraHeight: 0,
      cameraFrameRate: 0,
      requestedFrameRate: 0,
      cameraFacingMode: "",
      cameraDeviceId: "",
      cameraLabel: "",
      stripWidth: 0,
      effectiveStripWidth: 0,
      sourceStripHeight: 0,
      renderHeight: 0,
      qualityMode: "balancedEPS",
      pixelsPerSecond: 0,
      visualPixelsPerSecond: 0,
      displayScaleX: 1,
      densityLabel: "",
    };
  }

  function uid(prefix) {
    return (
      prefix +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function showMsg(text) {
    if (!els.msg) return;
    els.msg.hidden = !text;
    els.msg.textContent = text || "";
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text || "";
  }

  function formatTime(ms) {
    if (!isFinite(ms) || ms < 0) return "-";
    var minutes = Math.floor(ms / 60000);
    var seconds = Math.floor((ms % 60000) / 1000);
    var centis = Math.floor((ms % 1000) / 10);
    var ss = seconds < 10 ? "0" + seconds : String(seconds);
    var cc = String(centis).padStart(2, "0");
    return minutes > 0 ? minutes + ":" + ss + "." + cc : seconds + "." + cc + " s";
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeDirection(value) {
    if (value === "right-to-left") return "rightToLeft";
    if (value === "left-to-right") return "leftToRight";
    return value === "rightToLeft" ? "rightToLeft" : "leftToRight";
  }

  function normalizeQuality(value) {
    if (value === "balanced") return "balancedEPS";
    if (value === "auto" || value === "max" || value === "highFps" || value === "performance") return value;
    return "balancedEPS";
  }

  var AUTO_TARGET_PPS = 240;
  var suppressAutoDisable = false;

  function isAutoOptimizeEnabled() {
    return state.settings.autoOptimize !== false;
  }

  function disableAutoOptimize() {
    if (!state.settings.autoOptimize) return;
    state.settings.autoOptimize = false;
    if (state.settings.qualityMode === "auto") state.settings.qualityMode = "balancedEPS";
    if (inputs.autoOptimize) inputs.autoOptimize.checked = false;
    if (inputs.quality) inputs.quality.value = state.settings.qualityMode;
    saveLocalShell();
  }

  function renderHeightLabel(value) {
    if (value === "sprint") return "bande compacte";
    if (value === "320") return "320 px";
    if (value === "480") return "480 px";
    if (value === "native") return "native";
    return value || "bande compacte";
  }

  function formatAutoOptimizeSummary(optimal, fps) {
    optimal = optimal || {};
    fps = fps || optimal.fps || 0;
    return (
      "Auto : " +
      Math.round(fps) +
      " fps, bandeau " +
      (optimal.stripWidth || state.settings.stripWidth) +
      " px, " +
      (optimal.captureHeight || state.settings.captureHeight) +
      ", rendu " +
      renderHeightLabel(optimal.renderHeight || state.settings.renderHeight) +
      "."
    );
  }

  function computeOptimalSettings(stats, measuredFps) {
    stats = stats || {};
    var fps = Math.max(1, measuredFps || stats.cameraFrameRate || stats.averageFps || 30);
    var w = stats.cameraWidth || 0;
    var h = stats.cameraHeight || 0;
    var longEdge = Math.max(w, h);
    var stripWidth = Math.round(AUTO_TARGET_PPS / fps);
    stripWidth = Math.max(2, Math.min(6, stripWidth));
    if (fps >= 110) stripWidth = Math.min(6, Math.max(4, stripWidth));
    else if (fps >= 55) stripWidth = Math.min(5, Math.max(3, stripWidth));
    else if (fps >= 40) stripWidth = Math.min(4, Math.max(2, stripWidth));
    else stripWidth = 2;

    var captureHeight = "full";
    if (fps < 28 || longEdge < 900) captureHeight = "480";
    else if (fps < 48 || longEdge >= 1600) captureHeight = "720";
    if (fps >= 58 && longEdge >= 1080) captureHeight = "full";

    var renderHeight = "sprint";
    if (fps < 28) renderHeight = "320";
    else if (fps >= 90 && longEdge >= 1080) renderHeight = "480";

    var qualityMode = "balancedEPS";
    if (fps >= 110) qualityMode = "highFps";
    else if (fps >= 50) qualityMode = "balancedEPS";
    else if (fps >= 34) qualityMode = "max";
    else qualityMode = "performance";

    return {
      stripWidth: stripWidth,
      captureHeight: captureHeight,
      renderHeight: renderHeight,
      qualityMode: qualityMode,
      fps: fps,
    };
  }

  function applyAutoOptimization(stats, measuredFps) {
    if (!isAutoOptimizeEnabled()) return "";
    var optimal = computeOptimalSettings(stats, measuredFps);
    state.settings.stripWidth = optimal.stripWidth;
    state.settings.captureHeight = optimal.captureHeight;
    state.settings.renderHeight = optimal.renderHeight;
    state.settings.qualityMode = "auto";
    state.probedCameraFps = optimal.fps;
    state.autoOptimizeSummary = formatAutoOptimizeSummary(optimal, optimal.fps);
    writeSettingsToUi();
    saveLocalShell();
    return state.autoOptimizeSummary;
  }

  function refineAutoOptimizationFromCapture() {
    if (!isAutoOptimizeEnabled()) return;
    var stats = state.debugStats;
    var measured = stats.averageFps;
    if (!measured || measured < 8) return;
    var optimal = computeOptimalSettings(stats, measured);
    if (state.probedCameraFps && measured < state.probedCameraFps * 0.72) {
      optimal.stripWidth = Math.max(2, optimal.stripWidth - 1);
      if (measured < 26) optimal.captureHeight = "480";
      if (measured < 22) optimal.renderHeight = "320";
    }
    if (stats.pixelsPerSecond && stats.pixelsPerSecond < 150) {
      optimal.stripWidth = Math.max(2, optimal.stripWidth - 1);
    }
    if (stats.pixelsPerSecond && stats.pixelsPerSecond > 340) {
      optimal.stripWidth = Math.max(2, optimal.stripWidth - 1);
    }
    state.settings.stripWidth = optimal.stripWidth;
    state.settings.captureHeight = optimal.captureHeight;
    state.settings.renderHeight = optimal.renderHeight;
    state.autoOptimizeSummary = formatAutoOptimizeSummary(optimal, measured);
    writeSettingsToUi();
    saveLocalShell();
  }

  function probeCameraFps(maxFrames, maxMs) {
    maxFrames = maxFrames || 24;
    maxMs = maxMs || 450;
    return new Promise(function (resolve) {
      var fallback = currentCameraDebugStats().cameraFrameRate || 30;
      if (!state.stream || !els.video || !("requestVideoFrameCallback" in HTMLVideoElement.prototype)) {
        resolve(fallback);
        return;
      }
      var times = [];
      var start = 0;
      function onFrame(now) {
        if (!start) start = now;
        times.push(now);
        if (times.length >= maxFrames || now - start > maxMs) {
          var elapsed = times.length > 1 ? times[times.length - 1] - times[0] : 0;
          var fps = elapsed > 0 ? ((times.length - 1) / elapsed) * 1000 : fallback;
          resolve(fps > 0 ? fps : fallback);
          return;
        }
        els.video.requestVideoFrameCallback(onFrame);
      }
      els.video.requestVideoFrameCallback(onFrame);
    });
  }

  function go(screen) {
    state.screen = screen;
    els.tabs.forEach(function (tab) {
      var active = tab.dataset.screen === screen;
      tab.classList.toggle("dispense-nav__btn--active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });
    els.screens.forEach(function (panel) {
      var active = panel.dataset.screen === screen;
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });
    if (screen === "capture" && !state.stream && !state.cameraStarting) {
      startCamera();
    }
    if (screen === "capture" || screen === "analysis") {
      schedulePhotoFinishLayout();
    }
    if (screen === "results") renderResults();
    if (screen === "runners") renderRunners();
    if (screen === "home") renderHomeSetup();
  }

  function activeManagerSessionName() {
    if (typeof SessionManager !== "undefined" && SessionManager.getActiveSession) {
      var s = SessionManager.getActiveSession();
      if (s && s.nomSession) return s.nomSession;
    }
    return state.sessionInfo.name || defaultSessionInfo().name;
  }

  function applyQualityPatchIfNeeded() {
    if (state.settings.qualityPatchVersion >= 5) return;
    if (state.settings.qualityPatchVersion !== 4) {
      state.settings.stripWidth = 4;
      state.settings.qualityMode = "balancedEPS";
      state.settings.startTriggerMode = "release";
      state.settings.captureHeight = "full";
      state.settings.renderHeight = "sprint";
      state.settings.debugEnabled = false;
      state.settings.direction = normalizeDirection(state.settings.direction);
    }
    if (state.settings.autoOptimize === undefined) state.settings.autoOptimize = true;
    state.settings.qualityPatchVersion = 5;
  }

  function serializeShell() {
    return {
      settings: state.settings,
      sessionInfo: {
        eventType: state.sessionInfo.eventType,
        distance: state.sessionInfo.distance,
        comment: state.sessionInfo.comment,
        className: state.sessionInfo.className,
        date: state.sessionInfo.date,
      },
      runners: state.runners,
      selectedRunnerIds: state.selectedRunnerIds,
      seriesCounter: state.seriesCounter,
      results: state.results,
      sessions: state.sessions.map(function (s) {
        return Object.assign({}, s, { imageDataUrl: "" });
      }),
    };
  }

  function applyShellPayload(payload) {
    payload = payload || {};
    state.settings = Object.assign(defaultSettings(), payload.settings || {});
    applyQualityPatchIfNeeded();
    state.sessionInfo = Object.assign(defaultSessionInfo(), payload.sessionInfo || {});
    state.sessionInfo.name = activeManagerSessionName();
    state.runners = Array.isArray(payload.runners) ? payload.runners : [];
    state.selectedRunnerIds = Array.isArray(payload.selectedRunnerIds)
      ? payload.selectedRunnerIds
      : [];
    state.seriesCounter = Number(payload.seriesCounter || 0);
    state.results = Array.isArray(payload.results) ? payload.results : [];
    state.sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    if (!state.seriesCounter && state.results.length) {
      state.seriesCounter = state.results.reduce(function (max, result) {
        return Math.max(max, Number(result.seriesNumber || 0));
      }, 0);
    }
    state.hasStoredData = !!(state.runners.length || state.results.length || state.sessions.length);
  }

  function resetShellForManagerSession(session) {
    state.settings = defaultSettings();
    state.sessionInfo = defaultSessionInfo();
    state.sessionInfo.name = (session && session.nomSession) || defaultSessionInfo().name;
    state.sessionInfo.className = (session && session.classeNomSnapshot) || "";
    state.runners = [];
    state.selectedRunnerIds = [];
    state.seriesCounter = 0;
    state.results = [];
    state.sessions = [];
    state.hasStoredData = false;
  }

  function syncSessionInfoFromManager(session) {
    if (!session) return;
    state.sessionInfo.name = session.nomSession || state.sessionInfo.name;
    if (session.classeNomSnapshot) state.sessionInfo.className = session.classeNomSnapshot;
  }

  function migrateLegacyToSession(sessionId) {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw || typeof DataManager === "undefined" || !DataManager.savePhotoFinishForSession) {
        return Promise.resolve(false);
      }
      var data = JSON.parse(raw);
      return DataManager.savePhotoFinishForSession(sessionId, {
        settings: data.settings,
        sessionInfo: data.sessionInfo,
        runners: data.runners,
        selectedRunnerIds: data.selectedRunnerIds,
        seriesCounter: data.seriesCounter,
        results: data.results,
        sessions: data.sessions,
      }).then(function () {
        localStorage.removeItem(STORAGE_KEY);
        return true;
      });
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  function loadManagerSession(session) {
    managerSessionId = session.id;
    syncSessionInfoFromManager(session);
    return migrateLegacyToSession(session.id)
      .then(function () {
        return DataManager.getPhotoFinishForSession(session.id);
      })
      .then(function (payload) {
        if (payload) applyShellPayload(payload);
        else resetShellForManagerSession(session);
        writeSettingsToUi();
        setupHomeAccordions();
        renderHomeSetup();
        renderRunners();
        renderResults();
        updateLiveStats();
        refreshPhotoFinishUiAfterLoad();
        showMsg("");
      })
      .catch(function () {
        showMsg("Impossible de charger cette séance.");
      });
  }

  function clearManagerSession() {
    managerSessionId = null;
    resetShellForManagerSession(null);
    writeSettingsToUi();
    setupHomeAccordions();
    renderHomeSetup();
    renderRunners();
    renderResults();
    refreshPhotoFinishUiAfterLoad();
  }

  function bootWithoutSessionManager() {
    restoreSession();
    writeSettingsToUi();
    setupHomeAccordions();
    renderHomeSetup();
    renderRunners();
    renderResults();
    updateLiveStats();
    refreshPhotoFinishUiAfterLoad();
    var gated = document.querySelector(".tool-session-gated");
    if (gated) gated.hidden = false;
  }

  function readSettingsFromUi() {
    var delayValue = inputs.delay.value;
    var delayMs =
      delayValue === "custom"
        ? Math.max(0, Number(inputs.delayCustom.value || 0) * 1000)
        : Number(delayValue || 0);
    var autoOptimize = inputs.autoOptimize ? inputs.autoOptimize.checked : state.settings.autoOptimize !== false;
    state.settings = {
      captureDelayMs: delayMs,
      autoStopEnabled: inputs.autoStopEnabled.checked,
      autoStopMs: Math.max(1000, Number(inputs.autoStop.value || 15) * 1000),
      direction: normalizeDirection(inputs.direction.value),
      stripWidth: Math.max(1, Math.min(8, Number(inputs.stripWidth.value || 4))),
      finishLineXRatio: Number(inputs.finishRatio.value || 50) / 100,
      preferredCamera: inputs.cameraFacing.value,
      qualityMode: autoOptimize ? "auto" : normalizeQuality(inputs.quality.value),
      startTriggerMode: inputs.startMode.value,
      className: (inputs.homeClassSelect && inputs.homeClassSelect.value) || inputs.sessionClass.value.trim(),
      debugEnabled: inputs.debugEnabled.checked,
      highContrast: inputs.highContrast.checked,
      captureHeight: inputs.captureHeight.value,
      renderHeight: inputs.renderHeight.value,
      autoOptimize: autoOptimize,
      qualityPatchVersion: 5,
    };
    state.sessionInfo = {
      name: activeManagerSessionName(),
      date: state.sessionInfo.date || new Date().toISOString(),
      className: (inputs.homeClassSelect && inputs.homeClassSelect.value) || inputs.sessionClass.value.trim(),
      eventType: inputs.eventType.value.trim(),
      distance: inputs.distance.value.trim(),
      comment: inputs.comment.value.trim(),
    };
    document.body.classList.toggle("photo-finish-contrast", state.settings.highContrast);
    if (els.debugPanel) els.debugPanel.hidden = !state.settings.debugEnabled;
    saveLocalShell();
    updateFinishGuide();
  }

  function writeSettingsToUi() {
    suppressAutoDisable = true;
    inputs.sessionName.value = state.sessionInfo.name || "";
    inputs.sessionClass.value = state.sessionInfo.className || "";
    inputs.eventType.value = state.sessionInfo.eventType || "";
    inputs.distance.value = state.sessionInfo.distance || "";
    inputs.comment.value = state.sessionInfo.comment || "";
    inputs.startMode.value = state.settings.startTriggerMode;
    inputs.autoStopEnabled.checked = state.settings.autoStopEnabled;
    inputs.autoStop.value = Math.round(state.settings.autoStopMs / 1000);
    inputs.cameraFacing.value = state.settings.preferredCamera;
    state.settings.direction = normalizeDirection(state.settings.direction);
    state.settings.qualityMode = normalizeQuality(state.settings.qualityMode);
    if (inputs.autoOptimize) inputs.autoOptimize.checked = isAutoOptimizeEnabled();
    inputs.quality.value = isAutoOptimizeEnabled() ? "auto" : state.settings.qualityMode;
    inputs.stripWidth.value = state.settings.stripWidth;
    inputs.finishRatio.value = Math.round(state.settings.finishLineXRatio * 100);
    inputs.captureHeight.value = state.settings.captureHeight;
    inputs.renderHeight.value = state.settings.renderHeight || "sprint";
    inputs.direction.value = state.settings.direction;
    inputs.debugEnabled.checked = state.settings.debugEnabled;
    inputs.highContrast.checked = state.settings.highContrast;
    var knownDelay = ["0", "3000", "5000", "10000", "20000"];
    var delayString = String(state.settings.captureDelayMs);
    inputs.delay.value = knownDelay.indexOf(delayString) >= 0 ? delayString : "custom";
    inputs.delayCustom.value = state.settings.captureDelayMs / 1000;
    inputs.delayCustomWrap.hidden = inputs.delay.value !== "custom";
    document.body.classList.toggle("photo-finish-contrast", state.settings.highContrast);
    updateFinishGuide();
    suppressAutoDisable = false;
  }

  function saveLocalShell() {
    if (
      managerSessionId &&
      typeof DataManager !== "undefined" &&
      DataManager.savePhotoFinishForSession
    ) {
      if (typeof SessionManager !== "undefined" && SessionManager.getActiveSession) {
        syncSessionInfoFromManager(SessionManager.getActiveSession());
      }
      DataManager.savePhotoFinishForSession(managerSessionId, serializeShell()).catch(function () {
        showMsg("Impossible d'enregistrer la séance.");
      });
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeShell()));
    } catch (err) {
      showMsg("Sauvegarde locale impossible : espace insuffisant.");
    }
  }

  function restoreSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      applyShellPayload(JSON.parse(raw));
    } catch (err) {
      showMsg("Les anciennes donnees Photo Finish n'ont pas pu etre relues.");
    }
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponible."));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function saveIndexedSession(session) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("sessions", "readwrite");
        tx.objectStore("sessions").put(session);
        tx.oncomplete = function () {
          db.close();
          resolve();
        };
        tx.onerror = function () {
          db.close();
          reject(tx.error);
        };
      });
    });
  }

  function classNames() {
    var names = {};
    state.runners.forEach(function (runner) {
      if (runner.className) names[runner.className] = true;
    });
    if (state.sessionInfo.className) names[state.sessionInfo.className] = true;
    return Object.keys(names).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function runnersForCurrentClass() {
    var className = inputs.homeClassSelect ? inputs.homeClassSelect.value : state.sessionInfo.className;
    return state.runners.filter(function (runner) {
      if (runner.active === false) return false;
      return !className || runner.className === className;
    });
  }

  function renderHomeSetup() {
    if (inputs.homeClassSelect) {
      var current = state.sessionInfo.className || inputs.homeClassSelect.value || "";
      inputs.homeClassSelect.innerHTML = "<option value=\"\">Sans classe</option>";
      classNames().forEach(function (name) {
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        inputs.homeClassSelect.appendChild(option);
      });
      inputs.homeClassSelect.value = classNames().indexOf(current) >= 0 ? current : "";
    }
    if (!els.homeRunners) return;
    var badge = $("pf-acc-runners-badge");
    var allRunners = runnersForCurrentClass();
    if (badge) {
      badge.textContent = String(allRunners.length);
      badge.hidden = !allRunners.length;
    }
    var runners = allRunners;
    state.selectedRunnerIds = state.selectedRunnerIds.filter(function (id) {
      return runners.some(function (runner) {
        return runner.id === id;
      });
    });
    if (!runners.length) {
      els.homeRunners.innerHTML = "<p class=\"hint\">Aucun coureur selectionne. Vous pourrez quand meme enregistrer des temps non attribues.</p>";
      return;
    }
    var visibleRunners = state.selectedRunnerIds.length
      ? runners.filter(function (runner) {
          return state.selectedRunnerIds.indexOf(runner.id) >= 0;
        })
      : runners;
    els.homeRunners.innerHTML =
      "<p class=\"field-label\">Eleves de la seance</p>" +
      "<ul class=\"photo-finish-session-player-list\">" +
      visibleRunners.map(function (runner) {
        return (
          "<li class=\"photo-finish-session-player\"><span><strong>" +
          escapeHtml(runner.displayName) +
          "</strong><small>" +
          escapeHtml(runner.className || "Sans classe") +
          "</small></span><button type=\"button\" class=\"btn btn--ghost\" data-remove-runner=\"" +
          escapeHtml(runner.id) +
          "\">Retirer</button></li>"
        );
      }).join("") +
      "</ul>" +
      (state.selectedRunnerIds.length
        ? "<button type=\"button\" class=\"btn btn--ghost\" id=\"pf-btn-restore-runners\">Remettre tous</button>"
        : "");
    var restore = $("pf-btn-restore-runners");
    if (restore) {
      restore.addEventListener("click", function () {
        state.selectedRunnerIds = [];
        saveLocalShell();
        renderHomeSetup();
      });
    }
    els.homeRunners.querySelectorAll("[data-remove-runner]").forEach(function (button) {
      button.addEventListener("click", function () {
        var currentIds = state.selectedRunnerIds.length
          ? state.selectedRunnerIds.slice()
          : runners.map(function (runner) {
              return runner.id;
            });
        state.selectedRunnerIds = currentIds.filter(function (id) {
          return id !== button.dataset.removeRunner;
        });
        saveLocalShell();
        renderHomeSetup();
      });
    });
  }

  function setupHomeAccordions() {
    if (!els.accRunners || !els.accSettings) return;
    els.accRunners.open = !state.hasStoredData;
    els.accSettings.open = state.hasStoredData;
  }

  function refreshPhotoFinishUiAfterLoad() {
    if (els.imageWrap) {
      els.imageWrap.classList.toggle("is-reversed", state.settings.direction === "rightToLeft");
    }
    updateCaptureButton();
  }

  function resultDialogRunners() {
    var classRunners = runnersForCurrentClass();
    if (state.selectedRunnerIds.length) {
      return classRunners.filter(function (runner) {
        return state.selectedRunnerIds.indexOf(runner.id) >= 0;
      });
    }
    return classRunners.length ? classRunners : state.runners.filter(function (runner) {
      return runner.active !== false;
    });
  }

  function cameraProfiles() {
    if (isAutoOptimizeEnabled()) return autoCameraProfiles();
    var facing = { ideal: state.settings.preferredCamera };
    var profiles = [];
    if (state.settings.qualityMode === "highFps") {
      profiles.push({ width: 1280, height: 720, frameRate: 240, label: "720p 240 fps" });
      profiles.push({ width: 1280, height: 720, frameRate: 120, label: "720p 120 fps" });
    }
    profiles = profiles.concat([
      { width: 1920, height: 1080, frameRate: 60, label: "1080p 60 fps" },
      { width: 1280, height: 720, frameRate: 60, label: "720p 60 fps" },
      { width: 1920, height: 1080, frameRate: 30, label: "1080p 30 fps" },
      { width: 1280, height: 720, frameRate: 30, label: "720p 30 fps" },
    ]);
    if (state.settings.qualityMode === "performance") {
      profiles = [
        { width: 1280, height: 720, frameRate: 30, label: "720p 30 fps" },
        { width: 960, height: 540, frameRate: 30, label: "540p 30 fps" },
      ];
    }
    profiles.push({ label: "defaut" });
    return profiles.map(function (profile) {
      var video = { facingMode: facing };
      if (profile.width) video.width = { ideal: profile.width };
      if (profile.height) video.height = { ideal: profile.height };
      if (profile.frameRate) video.frameRate = { ideal: profile.frameRate };
      return { label: profile.label, requestedFrameRate: profile.frameRate || 0, constraints: { audio: false, video: video } };
    });
  }

  function autoCameraProfiles() {
    var facing = { ideal: state.settings.preferredCamera };
    var profiles = [
      { width: 1920, height: 1080, frameRate: 60, label: "1080p 60 fps" },
      { width: 1280, height: 720, frameRate: 60, label: "720p 60 fps" },
      { width: 1920, height: 1080, frameRate: 120, label: "1080p 120 fps" },
      { width: 1280, height: 720, frameRate: 120, label: "720p 120 fps" },
      { width: 1920, height: 1080, frameRate: 30, label: "1080p 30 fps" },
      { width: 1280, height: 720, frameRate: 30, label: "720p 30 fps" },
      { width: 960, height: 540, frameRate: 30, label: "540p 30 fps" },
      { label: "defaut" },
    ];
    return profiles.map(function (profile) {
      var video = { facingMode: facing };
      if (profile.width) video.width = { ideal: profile.width };
      if (profile.height) video.height = { ideal: profile.height };
      if (profile.frameRate) video.frameRate = { ideal: profile.frameRate };
      return {
        label: profile.label,
        requestedFrameRate: profile.frameRate || 0,
        constraints: { audio: false, video: video },
      };
    });
  }

  function requestCameraWithProfiles(profiles, index) {
    if (index >= profiles.length) return Promise.reject(new Error("Aucun profil camera accepte."));
    return navigator.mediaDevices.getUserMedia(profiles[index].constraints).then(function (stream) {
      stream._photoFinishProfile = profiles[index];
      var track = stream.getVideoTracks && stream.getVideoTracks()[0];
      var settings = track && track.getSettings ? track.getSettings() : {};
      if (
        profiles[index].requestedFrameRate >= 60 &&
        settings.frameRate &&
        settings.frameRate < 50 &&
        index < profiles.length - 1
      ) {
        stream.getTracks().forEach(function (t) {
          t.stop();
        });
        return requestCameraWithProfiles(profiles, index + 1);
      }
      return stream;
    }).catch(function (err) {
      if (index === profiles.length - 1) throw err;
      return requestCameraWithProfiles(profiles, index + 1);
    });
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach(function (track) {
        track.stop();
      });
      state.stream = null;
    }
    els.video.srcObject = null;
    state.cameraStarting = false;
  }

  function startCamera() {
    readSettingsFromUi();
    if (state.stream || state.cameraStarting) {
      go("capture");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMsg("Ce navigateur ne permet pas d'acceder a la camera.");
      return;
    }
    state.cameraStarting = true;
    setStatus("Demande d'acces a la camera...");
    requestCameraWithProfiles(cameraProfiles(), 0)
      .then(function (stream) {
        stopCamera();
        state.stream = stream;
        els.video.srcObject = stream;
        return waitForVideoMetadata().then(function () {
          return els.video.play();
        }).then(function () {
          return probeCameraFps();
        });
      })
      .then(function (probedFps) {
        state.probedCameraFps = probedFps;
        if (isAutoOptimizeEnabled()) applyAutoOptimization(currentCameraDebugStats(), probedFps);
        state.cameraStarting = false;
        showMsg("");
        updateCameraMeta();
        setStatus("Pret. Placez la ligne rouge sur l'arrivee.");
        go("capture");
      })
      .catch(function (err) {
        state.cameraStarting = false;
        var msg = "Impossible d'acceder a la camera.";
        if (err && err.name === "NotAllowedError") msg = "Autorisez la camera, puis reessayez.";
        if (err && err.name === "NotFoundError") msg = "Aucune camera detectee.";
        showMsg(msg);
        setStatus("Camera inactive.");
      });
  }

  function waitForVideoMetadata() {
    if (els.video.videoWidth && els.video.videoHeight) return Promise.resolve();
    return new Promise(function (resolve) {
      var done = function () {
        els.video.removeEventListener("loadedmetadata", done);
        resolve();
      };
      els.video.addEventListener("loadedmetadata", done);
    });
  }

  function updateCameraMeta() {
    var track = state.stream && state.stream.getVideoTracks ? state.stream.getVideoTracks()[0] : null;
    var settings = track && track.getSettings ? track.getSettings() : {};
    var profile = state.stream && state.stream._photoFinishProfile;
    var w = settings.width || els.video.videoWidth || 0;
    var h = settings.height || els.video.videoHeight || 0;
    state.debugStats.cameraWidth = w;
    state.debugStats.cameraHeight = h;
    state.debugStats.cameraFrameRate = settings.frameRate || 0;
    state.debugStats.requestedFrameRate = profile ? profile.requestedFrameRate : 0;
    state.debugStats.cameraFacingMode = settings.facingMode || state.settings.preferredCamera || "";
    state.debugStats.cameraDeviceId = settings.deviceId || "";
    state.debugStats.cameraLabel = track && track.label ? track.label : profile && profile.label ? profile.label : "";
    if (els.cameraMeta) {
      var text = w && h
        ? "Camera : " + w + " x " + h + ", " + (settings.frameRate || "?") + " fps obtenus."
        : "Camera active, attente des metadonnees video.";
      if (isAutoOptimizeEnabled() && state.autoOptimizeSummary) text += " " + state.autoOptimizeSummary;
      els.cameraMeta.textContent = text;
    }
  }

  function currentCameraDebugStats() {
    var track = state.stream && state.stream.getVideoTracks ? state.stream.getVideoTracks()[0] : null;
    var settings = track && track.getSettings ? track.getSettings() : {};
    var profile = state.stream && state.stream._photoFinishProfile;
    return {
      cameraWidth: settings.width || els.video.videoWidth || state.debugStats.cameraWidth || 0,
      cameraHeight: settings.height || els.video.videoHeight || state.debugStats.cameraHeight || 0,
      cameraFrameRate: settings.frameRate || state.debugStats.cameraFrameRate || 0,
      requestedFrameRate: profile ? profile.requestedFrameRate : state.debugStats.requestedFrameRate || 0,
      cameraFacingMode: settings.facingMode || state.settings.preferredCamera || state.debugStats.cameraFacingMode || "",
      cameraDeviceId: settings.deviceId || state.debugStats.cameraDeviceId || "",
      cameraLabel: track && track.label ? track.label : state.debugStats.cameraLabel || (profile && profile.label) || "",
    };
  }

  function updateFinishGuide() {
    var pct = Number(inputs.finishRatio.value || 50);
    if (inputs.finishRatioVal) inputs.finishRatioVal.textContent = String(Math.round(pct));
    if (els.slitGuide) els.slitGuide.style.left = pct + "%";
  }

  function startTimer(eventNow) {
    if (!state.stream) {
      showMsg("Activez d'abord la camera.");
      return;
    }
    if (!els.video.videoWidth || !els.video.videoHeight) {
      showMsg("La camera n'a pas encore transmis sa resolution native. Patientez une seconde puis relancez.");
      return;
    }
    readSettingsFromUi();
    showMsg("");
    state.timerState = "running";
    state.startTime = eventNow || performance.now();
    state.stopTime = 0;
    state.captureStarted = false;
    state.lastFrameNow = 0;
    initComposite();
    startDisplayLoop();
    scheduleCaptureLoop();
    updateCaptureButton();
    setStatus("Chrono lance. Capture en attente du delai choisi.");
  }

  function stopTimer() {
    if (state.timerState !== "running") return;
    state.stopTime = performance.now();
    state.timerState = "stopped";
    stopCapture();
    cancelAnimationFrame(state.rafId);
    finalizeImage();
    updateCaptureButton();
    go("analysis");
    setStatus("Capture terminee.");
    if (!state.qualityTestMode) saveSession();
  }

  function updateCaptureButton() {
    if (!els.btnStart) return;
    var text = els.btnStart.querySelector(".btn__text");
    var icon = els.btnStart.querySelector(".btn__icon");
    var running = state.timerState === "running";
    els.btnStart.disabled = false;
    els.btnStart.classList.toggle("is-stop", running);
    if (text) text.textContent = running ? "Stop" : "Demarrer le chrono";
    if (icon) icon.textContent = running ? "\u25a0" : "\u25b6";
  }

  function getElapsedMs() {
    if (!state.startTime) return 0;
    var now = state.timerState === "stopped" && state.stopTime ? state.stopTime : performance.now();
    return Math.max(0, now - state.startTime);
  }

  function startDisplayLoop() {
    cancelAnimationFrame(state.rafId);
    function tick() {
      var elapsed = getElapsedMs();
      els.chronoLive.textContent = formatTime(elapsed);
      if (state.timerState === "running") {
        var remainingDelay = Math.max(0, state.settings.captureDelayMs - elapsed);
        els.delayState.textContent = state.captureStarted
          ? "Capture : en cours"
          : "Capture dans " + formatTime(remainingDelay);
        if (state.settings.autoStopEnabled && elapsed >= state.settings.autoStopMs) {
          stopTimer();
          return;
        }
      }
      updateLiveStats();
      state.rafId = requestAnimationFrame(tick);
    }
    tick();
  }

  function scheduleCaptureLoop() {
    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
      var onFrame = function () {
        if (state.timerState !== "running") return;
        captureStrip();
        state.videoFrameId = els.video.requestVideoFrameCallback(onFrame);
      };
      state.videoFrameId = els.video.requestVideoFrameCallback(onFrame);
    } else {
      var fallback = function () {
        if (state.timerState !== "running") return;
        captureStrip();
        state.fallbackCaptureId = requestAnimationFrame(fallback);
      };
      state.fallbackCaptureId = requestAnimationFrame(fallback);
    }
  }

  function startCapture() {
    state.captureStarted = true;
    setStatus("Capture en cours : les bandeaux sont assembles en photo finish.");
  }

  function stopCapture() {
    if (state.videoFrameId && "cancelVideoFrameCallback" in HTMLVideoElement.prototype) {
      els.video.cancelVideoFrameCallback(state.videoFrameId);
    }
    cancelAnimationFrame(state.fallbackCaptureId);
    state.videoFrameId = 0;
    state.fallbackCaptureId = 0;
  }

  function initComposite() {
    var cameraStats = currentCameraDebugStats();
    state.currentSessionId = uid("session");
    state.seriesCounter += 1;
    state.currentSeriesNumber = state.seriesCounter;
    state.strips = [];
    state.debugStats = Object.assign(defaultDebugStats(), cameraStats);
    state.activeImageDataUrl = "";
    state.zoom = 1;
    state.displayScaleX = 1;
    state.viewerPixelScale = 1;
    state.effectiveStripWidth = chooseEffectiveStripWidth(cameraStats.cameraFrameRate);
    compositeCanvas.width = 1;
    compositeCanvas.height = 1;
    compositeCtx.fillStyle = "#111";
    compositeCtx.fillRect(0, 0, 1, 1);
    resultCtx.clearRect(0, 0, els.resultCanvas.width, els.resultCanvas.height);
  }

  function captureHeight(videoHeight) {
    if (state.settings.captureHeight === "full") return videoHeight;
    return Math.min(videoHeight, Number(state.settings.captureHeight || 720));
  }

  function chooseEffectiveStripWidth(cameraFrameRate) {
    var fps = state.probedCameraFps || cameraFrameRate || 30;
    if (isAutoOptimizeEnabled()) {
      return computeOptimalSettings(currentCameraDebugStats(), fps).stripWidth;
    }
    var configured = Math.max(1, Math.min(8, state.settings.stripWidth || 4));
    if (cameraFrameRate && cameraFrameRate < 45 && configured > 2) return 2;
    return configured;
  }

  function outputRenderHeight(sourceHeight) {
    var mode = state.settings.renderHeight || "sprint";
    if (mode === "native") return sourceHeight;
    if (mode === "sprint") {
      return Math.max(180, Math.min(320, Math.round(sourceHeight * 0.36)));
    }
    return Math.min(sourceHeight, Math.max(120, Number(mode || 240)));
  }

  function ensureCompositeSize(width, height) {
    if (compositeCanvas.height !== height) {
      var old = document.createElement("canvas");
      old.width = compositeCanvas.width;
      old.height = compositeCanvas.height;
      old.getContext("2d").drawImage(compositeCanvas, 0, 0);
      compositeCanvas.height = height;
      compositeCtx.fillStyle = "#111";
      compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
      compositeCtx.drawImage(old, 0, 0, old.width, old.height, 0, 0, old.width, height);
    }
    if (width > compositeCanvas.width) {
      var copy = document.createElement("canvas");
      copy.width = compositeCanvas.width;
      copy.height = compositeCanvas.height;
      copy.getContext("2d").drawImage(compositeCanvas, 0, 0);
      compositeCanvas.width = Math.min(MAX_IMAGE_WIDTH, Math.max(width, compositeCanvas.width * 2));
      compositeCanvas.height = height;
      compositeCtx.fillStyle = "#111";
      compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
      compositeCtx.drawImage(copy, 0, 0);
    }
  }

  function captureStrip() {
    if (state.timerState !== "running") return;
    var sourceWidth = els.video.videoWidth;
    var sourceHeight = els.video.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      setStatus("Attente des metadonnees video natives...");
      return;
    }
    var now = performance.now();
    var elapsed = now - state.startTime;
    if (elapsed < state.settings.captureDelayMs) return;
    if (!state.captureStarted) startCapture();

    // Capture critique : toutes les coordonnees sont en pixels natifs video.
    // Ne jamais utiliser clientWidth/clientHeight/getBoundingClientRect ici.
    var vw = sourceWidth;
    var vh = sourceHeight;
    var stripWidth = state.effectiveStripWidth || state.settings.stripWidth;
    var sourceStripHeight = captureHeight(vh);
    var renderHeight = outputRenderHeight(sourceStripHeight);
    var y = Math.max(0, Math.round((vh - sourceStripHeight) / 2));
    var centerX = Math.round(vw * state.settings.finishLineXRatio);
    var sx = Math.max(0, Math.min(vw - stripWidth, centerX - Math.floor(stripWidth / 2)));
    var imageXStart = state.strips.length ? state.strips[state.strips.length - 1].imageXEnd : 0;
    var imageXEnd = imageXStart + stripWidth;

    if (imageXEnd > MAX_IMAGE_WIDTH) {
      showMsg("Capture trop longue : l'image atteint la limite de securite.");
      stopTimer();
      return;
    }

    // Plus le bandeau est large, plus l'image est lisible mais moins elle ressemble
    // a une vraie photo finish. Plus il est fin, plus le rendu est realiste, mais
    // il faut un bon fps et une bonne resolution.
    nativeStripCanvas.width = stripWidth;
    nativeStripCanvas.height = sourceStripHeight;
    nativeStripCtx.imageSmoothingEnabled = false;
    nativeStripCtx.drawImage(
      els.video,
      sx,
      y,
      stripWidth,
      sourceStripHeight,
      0,
      0,
      stripWidth,
      sourceStripHeight
    );

    stripCanvas.width = stripWidth;
    stripCanvas.height = renderHeight;
    stripCtx.imageSmoothingEnabled = renderHeight !== sourceStripHeight;
    stripCtx.imageSmoothingQuality = "high";
    stripCtx.drawImage(nativeStripCanvas, 0, 0, stripWidth, sourceStripHeight, 0, 0, stripWidth, renderHeight);
    appendStripToPhotoFinish(stripCanvas, imageXStart, imageXEnd, renderHeight);

    var delta = state.lastFrameNow ? now - state.lastFrameNow : 0;
    state.lastFrameNow = now;
    var strip = {
      id: uid("strip"),
      index: state.strips.length,
      elapsedTimeMs: elapsed,
      timestampNow: now,
      sourceVideoTime: els.video.currentTime || 0,
      imageXStart: imageXStart,
      imageXEnd: imageXEnd,
      width: stripWidth,
      height: renderHeight,
      sourceHeight: sourceStripHeight,
    };
    state.strips.push(strip);
    updateDebugStats(delta);
  }

  function appendStripToPhotoFinish(canvas, imageXStart, imageXEnd, height) {
    // The composite canvas stores only the useful vertical bands, never full frames.
    ensureCompositeSize(imageXEnd, height);
    compositeCtx.imageSmoothingEnabled = false;
    compositeCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, imageXStart, 0, canvas.width, height);
  }

  function updateDebugStats(delta) {
    var first = state.strips[0];
    var last = state.strips[state.strips.length - 1];
    state.debugStats.stripCount = state.strips.length;
    state.debugStats.imageWidth = last ? last.imageXEnd : 0;
    state.debugStats.imageHeight = last ? last.height : 0;
    state.debugStats.firstStripTimeMs = first ? first.elapsedTimeMs : 0;
    state.debugStats.lastStripTimeMs = last ? last.elapsedTimeMs : 0;
    state.debugStats.captureDurationMs =
      state.debugStats.lastStripTimeMs - state.debugStats.firstStripTimeMs;
    state.debugStats.averageFps =
      state.debugStats.captureDurationMs > 0
        ? (state.debugStats.stripCount / state.debugStats.captureDurationMs) * 1000
        : 0;
    state.debugStats.pixelsPerSecond = state.debugStats.averageFps * (state.effectiveStripWidth || state.settings.stripWidth);
    state.debugStats.densityLabel = densityLabel(state.debugStats.pixelsPerSecond);
    if (delta > 0) {
      state.debugStats.minFrameDeltaMs = state.debugStats.minFrameDeltaMs
        ? Math.min(state.debugStats.minFrameDeltaMs, delta)
        : delta;
      state.debugStats.maxFrameDeltaMs = Math.max(state.debugStats.maxFrameDeltaMs, delta);
    }
    state.debugStats.stripWidth = state.settings.stripWidth;
    state.debugStats.effectiveStripWidth = state.effectiveStripWidth || state.settings.stripWidth;
    state.debugStats.sourceStripHeight = last && last.sourceHeight ? last.sourceHeight : 0;
    state.debugStats.renderHeight = last ? last.height : 0;
    state.debugStats.displayScaleX = state.displayScaleX || 1;
    state.debugStats.visualPixelsPerSecond = state.debugStats.pixelsPerSecond * state.debugStats.displayScaleX;
    state.debugStats.qualityMode = state.settings.qualityMode;
  }

  function densityLabel(pixelsPerSecond) {
    if (!pixelsPerSecond) return "en attente";
    if (pixelsPerSecond < 160) return "faible";
    if (pixelsPerSecond <= 320) return "correcte";
    return "excessive";
  }

  function computeDisplayScaleX() {
    var pps = state.debugStats.pixelsPerSecond || 0;
    if (!pps) return 1;
    return Math.max(1, Math.min(3, 240 / pps));
  }

  function qualityWarnings() {
    var stats = state.debugStats;
    var warnings = [];
    if (stats.averageFps && stats.averageFps < 35) warnings.push("FPS faible : le rendu sera moins fluide.");
    if (stats.effectiveStripWidth >= 7) warnings.push("Slices trop larges : le coureur risque d'etre etire.");
    if (stats.cameraFrameRate && stats.cameraFrameRate < 45 && stats.stripWidth !== stats.effectiveStripWidth) {
      warnings.push("Mode 30 fps : bandeaux automatiquement affines pour reduire l'effet mosaique.");
    }
    if (isAutoOptimizeEnabled()) {
      warnings.unshift("Optimisation automatique active : reglages ajustes pour ~" + AUTO_TARGET_PPS + " px/s.");
    }
    if (stats.renderHeight > 480) warnings.push("Image trop haute : utilisez le rendu Bande compacte pour plus de lisibilite.");
    if (stats.imageWidth > 12000) warnings.push("Image tres large : risque de ralentissement sur mobile.");
    if (stats.cameraWidth && stats.cameraHeight && Math.max(stats.cameraWidth, stats.cameraHeight) < 1280) {
      warnings.push("Resolution faible : rapprochez moins la camera ou augmentez la qualite.");
    }
    if (stats.pixelsPerSecond && stats.pixelsPerSecond < 160) warnings.push("Densite temporelle brute faible : cherchez 60 fps si possible.");
    if (stats.pixelsPerSecond > 320) warnings.push("Densite temporelle elevee : image large, surveillez la memoire.");
    if (!warnings.length) warnings.push("Densite temporelle correcte : le compromis EPS est bon.");
    return warnings;
  }

  function renderDiagnostic() {
    if (!els.diagnosticPanel || !els.diagnosticList) return;
    if (!state.settings.debugEnabled) {
      els.diagnosticPanel.hidden = true;
      return;
    }
    var stats = state.debugStats;
    els.diagnosticPanel.hidden = false;
    var rows = {
      "Duree capturee": formatTime(stats.captureDurationMs),
      "Nombre de strips": stats.stripCount,
      "FPS moyen reel": stats.averageFps.toFixed(1),
      "Delta min/max": stats.minFrameDeltaMs.toFixed(1) + " / " + stats.maxFrameDeltaMs.toFixed(1) + " ms",
      "Largeur reglee": stats.stripWidth + " px natifs",
      "Largeur utilisee": stats.effectiveStripWidth + " px natifs",
      "Pixels par seconde": stats.pixelsPerSecond.toFixed(1),
      "Pixels/s visuels": stats.visualPixelsPerSecond.toFixed(1),
      "Scale visuel X": stats.displayScaleX.toFixed(2),
      "Densite temporelle": stats.densityLabel,
      "Resolution video": stats.cameraWidth + " x " + stats.cameraHeight,
      "Hauteur source strip": stats.sourceStripHeight + " px natifs",
      "Hauteur rendu": stats.renderHeight + " px",
      "Image finale": stats.imageWidth + " x " + stats.imageHeight,
      "Image affichee": Math.round(stats.imageWidth * stats.displayScaleX) + " x " + stats.imageHeight,
      "Mode qualite": isAutoOptimizeEnabled() ? "auto" : stats.qualityMode,
    };
    els.diagnosticList.innerHTML = Object.keys(rows).map(function (key) {
      return "<dt>" + escapeHtml(key) + "</dt><dd>" + escapeHtml(rows[key]) + "</dd>";
    }).join("");
    if (els.diagnosticWarnings) {
      els.diagnosticWarnings.innerHTML = qualityWarnings().map(function (warning) {
        return "<li>" + escapeHtml(warning) + "</li>";
      }).join("");
    }
  }

  function copyResultToQualityPreview() {
    if (!els.qualityResult || !els.resultCanvas.width) return;
    var maxWidth = 900;
    var visualWidth = els.resultCanvas.width;
    var scale = Math.min(1, maxWidth / Math.max(1, visualWidth));
    els.qualityResult.width = Math.max(1, Math.round(visualWidth * scale));
    els.qualityResult.height = Math.max(1, Math.round(els.resultCanvas.height * scale));
    var ctx = els.qualityResult.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = scale < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(els.resultCanvas, 0, 0, els.qualityResult.width, els.qualityResult.height);
  }

  function renderQualityReport() {
    if (!els.qualityReport) return;
    var stats = state.debugStats;
    els.qualityReport.innerHTML =
      "<strong>Test termine.</strong> " +
      escapeHtml(stats.cameraWidth + " x " + stats.cameraHeight + ", " + stats.averageFps.toFixed(1) + " fps, " + stats.stripWidth + " px, densite " + stats.densityLabel + ".") +
      "<ul>" +
      qualityWarnings().map(function (warning) {
        return "<li>" + escapeHtml(warning) + "</li>";
      }).join("") +
      "<li>Si le corps est trop etire ou double, essayez Plus precis.</li>" +
      "<li>Si le corps est trop compresse ou coupe, essayez Plus lisible.</li>" +
      "<li>Si le mouvement semble partir dans le mauvais sens, utilisez Inverser le sens en analyse.</li>" +
      "<li>Si l'image est floue, augmentez la lumiere et stabilisez le telephone.</li>" +
      "</ul>";
  }

  function startQualityTest() {
    if (!state.stream) {
      startCamera();
      go("quality");
      showMsg("Camera activee : relancez le test quand l'image apparait.");
      return;
    }
    state.qualityTestMode = true;
    go("capture");
    startTimer(performance.now());
    clearTimeout(state.qualityTestStopId);
    state.qualityTestStopId = setTimeout(function () {
      if (state.timerState === "running") stopTimer();
      state.qualityTestMode = false;
      copyResultToQualityPreview();
      renderQualityReport();
      go("quality");
    }, 3000);
  }

  function finalizeImage() {
    if (!state.strips.length) {
      showMsg("Aucun bandeau capture. Reessayez avec une course plus longue ou un delai plus court.");
      return;
    }
    var width = state.strips[state.strips.length - 1].imageXEnd;
    var height = state.strips[state.strips.length - 1].height;
    state.zoom = 1;
    state.displayScaleX = computeDisplayScaleX();
    state.debugStats.displayScaleX = state.displayScaleX;
    state.debugStats.visualPixelsPerSecond =
      state.debugStats.pixelsPerSecond * state.displayScaleX;
    var visualWidth = Math.max(1, Math.round(width * state.displayScaleX));
    els.resultCanvas.width = visualWidth;
    els.resultCanvas.height = height;
    resultCtx.imageSmoothingEnabled = state.displayScaleX > 1.01;
    resultCtx.imageSmoothingQuality = "high";
    resultCtx.drawImage(compositeCanvas, 0, 0, width, height, 0, 0, visualWidth, height);
    state.activeImageDataUrl = els.resultCanvas.toDataURL("image/png");
    schedulePhotoFinishLayout();
    els.scroll.scrollLeft = 0;
    renderMarkers();
    renderDiagnostic();
    refineAutoOptimizationFromCapture();
    if (isAutoOptimizeEnabled()) updateCameraMeta();
  }

  function imageXToTime(imageX) {
    // Mapping source of truth: image x -> neighboring strip timestamps -> interpolated real time.
    if (!state.strips.length) return 0;
    var x = Math.max(0, Math.min(imageX, state.strips[state.strips.length - 1].imageXEnd));
    var low = 0;
    var high = state.strips.length - 1;
    while (low <= high) {
      var mid = Math.floor((low + high) / 2);
      var strip = state.strips[mid];
      if (x < strip.imageXStart) high = mid - 1;
      else if (x > strip.imageXEnd) low = mid + 1;
      else {
        var next = state.strips[Math.min(mid + 1, state.strips.length - 1)];
        var local = (x - strip.imageXStart) / Math.max(1, strip.width);
        return strip.elapsedTimeMs + (next.elapsedTimeMs - strip.elapsedTimeMs) * local;
      }
    }
    return state.strips[state.strips.length - 1].elapsedTimeMs;
  }

  function timeToImageX(timeMs) {
    // Reverse mapping keeps markers stable after zoom, scroll or direction changes.
    if (!state.strips.length) return 0;
    var t = Math.max(0, timeMs);
    for (var i = 0; i < state.strips.length - 1; i++) {
      var a = state.strips[i];
      var b = state.strips[i + 1];
      if (t >= a.elapsedTimeMs && t <= b.elapsedTimeMs) {
        var ratio = (t - a.elapsedTimeMs) / Math.max(1, b.elapsedTimeMs - a.elapsedTimeMs);
        return a.imageXStart + ratio * a.width;
      }
    }
    return state.strips[state.strips.length - 1].imageXEnd;
  }

  function viewportCursorToImageX() {
    // The scroll area has half-viewport padding before and after the image.
    // Therefore scrollLeft 0 puts imageX 0 exactly below the fixed central cursor.
    if (!els.scroll || !state.strips.length) return 0;
    var raw = els.scroll.scrollLeft / Math.max(0.1, state.viewerPixelScale || state.zoom * state.displayScaleX);
    var max = state.strips[state.strips.length - 1].imageXEnd;
    return Math.max(0, Math.min(max, raw));
  }

  function getTimeAtViewportCursor() {
    return imageXToTime(viewportCursorToImageX());
  }

  function analysisHeightLimits() {
    var vh = window.innerHeight;
    var landscape = window.innerWidth > vh;
    var root = document.querySelector(".page-outil--photo-finish");
    var custom = root ? parseFloat(getComputedStyle(root).getPropertyValue("--pf-image-area-h")) : 0;
    if (custom > 0) {
      return { maxH: Math.round(custom), minH: Math.round(custom) };
    }
    if (landscape) {
      return {
        maxH: Math.min(Math.round(vh * 0.82), Math.max(160, vh - 88)),
        minH: Math.min(Math.round(vh * 0.82), Math.max(160, vh - 88)),
      };
    }
    return {
      maxH: Math.min(Math.round(vh * 0.62), 520),
      minH: Math.min(Math.round(vh * 0.62), 520),
    };
  }

  function analysisPanelChromeHeight() {
    var card = document.querySelector(".photo-finish-analysis-card");
    if (!card) return 110;
    var total = 16;
    var head = card.querySelector(".photo-finish-analysis-head");
    var actions = card.querySelector(".champ-gestion-actions");
    if (head) total += head.getBoundingClientRect().height;
    if (els.scrollSlider) total += els.scrollSlider.getBoundingClientRect().height + 8;
    if (actions) total += actions.getBoundingClientRect().height;
    return Math.round(total);
  }

  function updatePhotoFinishImageArea() {
    var root = document.querySelector(".page-outil--photo-finish");
    var gated = document.querySelector(".tool-session-gated");
    if (!root || !gated || gated.hidden) return;
    if (state.screen !== "capture" && state.screen !== "analysis") return;
    var vh = window.innerHeight;
    var chromeTop = 0;
    var header = root.querySelector(".page-outil__header");
    var session = document.getElementById("session-manager-mount");
    var nav = root.querySelector(".photo-finish-nav");
    if (header) chromeTop += header.getBoundingClientRect().height;
    if (session) chromeTop += session.getBoundingClientRect().height;
    if (nav) chromeTop += nav.getBoundingClientRect().height;
    var landscape = window.innerWidth > vh;
    var reserved = 8;
    if (state.screen === "capture") {
      if (!landscape) {
        var statsCard = document.querySelector("#pf-panel-capture > .card");
        if (statsCard) reserved += statsCard.getBoundingClientRect().height + 6;
      }
    } else if (state.screen === "analysis") {
      reserved += analysisPanelChromeHeight();
    }
    var available = Math.round(vh - chromeTop - reserved);
    if (state.screen === "capture" && landscape) {
      available = Math.max(200, available);
      available = Math.min(Math.round(vh - 32), Math.round(available * 1.34));
    } else {
      available = Math.max(landscape ? 140 : 168, available);
    }
    root.style.setProperty("--pf-image-area-h", available + "px");
  }

  function viewerDisplayMetrics() {
    var cw = els.resultCanvas ? els.resultCanvas.width : 0;
    var ch = els.resultCanvas ? els.resultCanvas.height : 0;
    if (!cw || !ch) return { width: 0, height: 0, scale: 1 };
    var targetH = analysisHeightLimits().maxH;
    var displayH = Math.max(1, Math.round(targetH));
    var baseW = cw * (targetH / ch);
    var displayW = Math.max(1, Math.round(baseW * state.zoom));
    var scale = state.displayScaleX * (displayW / cw);
    return { width: displayW, height: displayH, scale: scale };
  }

  function schedulePhotoFinishLayout() {
    requestAnimationFrame(function () {
      updatePhotoFinishImageArea();
      if (state.screen !== "analysis") return;
      requestAnimationFrame(function () {
        updateViewerPadding(0);
        applyZoom();
        updateViewerPadding(0);
        updateCursorReadout();
      });
    });
  }

  function updateViewerPadding(retry) {
    if (!els.viewer || !els.imageWrap) return;
    var viewerW = els.viewer.clientWidth;
    if (viewerW <= 0 && state.screen === "analysis" && (retry || 0) < 8) {
      requestAnimationFrame(function () {
        updateViewerPadding((retry || 0) + 1);
      });
      return;
    }
    if (viewerW <= 0) return;
    var half = Math.max(0, Math.round(viewerW / 2));
    els.imageWrap.style.setProperty("--pf-viewer-pad", half + "px");
    syncViewerHeight();
    updateSliderFromScroll();
  }

  function syncViewerHeight(displayHeight) {
    if (!els.imageWrap || !els.resultCanvas) return;
    var h =
      displayHeight ||
      (state.screen === "analysis" ? analysisHeightLimits().maxH : 0) ||
      parseFloat(els.resultCanvas.style.height) ||
      els.resultCanvas.offsetHeight ||
      0;
    if (h > 0) {
      els.imageWrap.style.minHeight = h + "px";
      if (els.scroll) {
        els.scroll.style.minHeight = h + "px";
        els.scroll.style.height = h + "px";
      }
      if (els.viewer) {
        els.viewer.style.height = h + "px";
        els.viewer.style.minHeight = h + "px";
        els.viewer.style.maxHeight = h + "px";
      }
    }
  }

  function applyZoom() {
    if (!els.resultCanvas || !els.resultCanvas.width) return;
    var metrics = viewerDisplayMetrics();
    if (metrics.width > 0 && metrics.height > 0) {
      els.resultCanvas.style.width = metrics.width + "px";
      els.resultCanvas.style.height = metrics.height + "px";
      state.viewerPixelScale = metrics.scale;
      syncViewerHeight(metrics.height);
    }
    renderMarkers();
    updateSliderFromScroll();
    updateCursorReadout();
  }

  function updateCursorReadout() {
    var time = getTimeAtViewportCursor();
    var text = formatTime(time);
    if (els.cursorTime) els.cursorTime.textContent = text;
    if (els.cursorTimeFloating) els.cursorTimeFloating.textContent = text;
    renderDebug();
  }

  function updateSliderFromScroll() {
    if (!els.scroll || !els.scrollSlider) return;
    var max = Math.max(1, els.scroll.scrollWidth - els.scroll.clientWidth);
    els.scrollSlider.value = Math.round((els.scroll.scrollLeft / max) * 1000);
  }

  function scrollToImageX(imageX) {
    if (!els.scroll) return;
    els.scroll.scrollLeft = Math.max(0, imageX * (state.viewerPixelScale || state.zoom * state.displayScaleX));
    updateCursorReadout();
  }

  function setZoomKeepingCursor(nextZoom) {
    var time = getTimeAtViewportCursor();
    state.zoom = nextZoom;
    applyZoom();
    scrollToImageX(timeToImageX(time));
  }

  function renderMarkers() {
    if (!els.markers) return;
    els.markers.innerHTML = "";
    state.results
      .filter(function (r) {
        return r.sessionId === state.currentSessionId;
      })
      .forEach(function (r) {
        var marker = document.createElement("button");
        marker.type = "button";
        marker.className = "photo-finish-marker";
        marker.style.left =
          timeToImageX(r.timeMs) * (state.viewerPixelScale || state.zoom * state.displayScaleX) + "px";
        marker.innerHTML =
          "<span>" +
          escapeHtml(r.runnerName || "Non attribue") +
          "</span><strong>" +
          escapeHtml(r.formattedTime) +
          "</strong><em title=\"Supprimer\">x</em>";
        marker.addEventListener("click", function () {
          scrollToImageX(timeToImageX(r.timeMs));
        });
        marker.querySelector("em").addEventListener("click", function (event) {
          event.stopPropagation();
          deleteResult(r.id);
        });
        els.markers.appendChild(marker);
      });
  }

  function openResultDialog() {
    var time = getTimeAtViewportCursor();
    state.currentResultDraft = { timeMs: time, imageX: viewportCursorToImageX() };
    els.dialogTime.textContent = formatTime(time);
    els.runnerSearch.value = "";
    els.resultComment.value = "";
    els.unassigned.checked = false;
    fillRunnerSelect();
    if (typeof els.resultDialog.showModal === "function") els.resultDialog.showModal();
    else els.resultDialog.setAttribute("open", "open");
  }

  function closeResultDialog() {
    if (typeof els.resultDialog.close === "function") els.resultDialog.close();
    else els.resultDialog.removeAttribute("open");
  }

  function saveResultFromDialog() {
    var draft = state.currentResultDraft;
    if (!draft) return;
    var selected = state.runners.filter(function (r) {
      return r.id === els.runnerSelect.value;
    })[0];
    var typed = els.runnerSearch.value.trim();
    if (!els.unassigned.checked && !selected && typed) {
      selected = addRunner(typed, state.sessionInfo.className, false);
    }
    var isUnassigned = els.unassigned.checked || !selected;
    var result = {
      id: uid("result"),
      runnerId: selected ? selected.id : "",
      runnerName: selected ? selected.displayName : "Non attribue",
      className: selected ? selected.className : state.sessionInfo.className,
      sessionId: state.currentSessionId,
      sessionName: state.sessionInfo.name,
      seriesNumber: state.currentSeriesNumber || state.seriesCounter || 1,
      timeMs: draft.timeMs,
      formattedTime: formatTime(draft.timeMs),
      imageX: draft.imageX,
      date: new Date().toISOString(),
      rank: 0,
      comment: els.resultComment.value.trim(),
      isUnassigned: isUnassigned,
    };
    state.results.push(result);
    rankResults();
    saveLocalShell();
    renderMarkers();
    renderResults();
    closeResultDialog();
    showMsg("");
  }

  function deleteResult(resultId) {
    state.results = state.results.filter(function (result) {
      return result.id !== resultId;
    });
    rankResults();
    saveLocalShell();
    renderMarkers();
    renderResults();
  }

  function rankResults() {
    var bySession = {};
    state.results.forEach(function (r) {
      bySession[r.sessionId] = bySession[r.sessionId] || [];
      bySession[r.sessionId].push(r);
    });
    Object.keys(bySession).forEach(function (sessionId) {
      bySession[sessionId]
        .sort(function (a, b) {
          return a.timeMs - b.timeMs;
        })
        .forEach(function (r, index, arr) {
          r.rank = index > 0 && r.timeMs === arr[index - 1].timeMs ? arr[index - 1].rank : index + 1;
        });
    });
  }

  function fillRunnerSelect() {
    var query = (els.runnerSearch.value || "").toLowerCase();
    var runners = resultDialogRunners();
    els.runnerSelect.innerHTML = "<option value=\"\">Temps non attribue</option>";
    runners
      .filter(function (r) {
        return r.active !== false && (!query || r.displayName.toLowerCase().indexOf(query) >= 0);
      })
      .forEach(function (runner) {
        var option = document.createElement("option");
        option.value = runner.id;
        option.textContent = runner.displayName + (runner.className ? " - " + runner.className : "");
        els.runnerSelect.appendChild(option);
      });
  }

  function parseRunnerLine(line, defaultClassName) {
    line = String(line || "").trim();
    if (!line) return null;
    defaultClassName = defaultClassName || state.sessionInfo.className || "";
    if (line.indexOf(";") >= 0) {
      var parts = line
        .split(";")
        .map(function (p) {
          return p.trim();
        })
        .filter(Boolean);
      if (parts.length >= 3) {
        return { name: parts[0] + " " + parts[1], className: parts[2] };
      }
      if (parts.length === 2) {
        return { name: parts[0] + " " + parts[1], className: defaultClassName };
      }
      return { name: parts[0], className: defaultClassName };
    }
    return { name: line.replace(/\s+/g, " "), className: defaultClassName };
  }

  function importRunnersFromText() {
    if (!inputs.importText) return;
    var defaultClass =
      (inputs.homeClassSelect && inputs.homeClassSelect.value) || state.sessionInfo.className || "";
    var lines = inputs.importText.value.split(/\r?\n/);
    var added = 0;
    lines.forEach(function (line) {
      var parsed = parseRunnerLine(line, defaultClass);
      if (!parsed || !parsed.name) return;
      if (addRunner(parsed.name, parsed.className, false)) added += 1;
    });
    if (!added) {
      showMsg("Saisissez au moins un coureur (un par ligne).");
      return;
    }
    inputs.importText.value = "";
    saveLocalShell();
    renderRunners();
    renderHomeSetup();
    showMsg(added + " coureur" + (added > 1 ? "s" : "") + " ajoute" + (added > 1 ? "s" : "") + ".");
  }

  function addRunner(name, className, persist) {
    var clean = String(name || "").trim().replace(/\s+/g, " ");
    if (!clean) return null;
    var parts = clean.split(" ");
    var runner = {
      id: uid("runner"),
      firstName: parts.length > 1 ? parts[0] : "",
      lastName: parts.length > 1 ? parts.slice(1).join(" ") : clean,
      displayName: clean,
      className: className || state.sessionInfo.className || "",
      active: true,
    };
    state.runners.push(runner);
    if (persist !== false) {
      saveLocalShell();
      renderRunners();
      renderHomeSetup();
    }
    return runner;
  }

  function renderRunners() {
    if (!els.runnersList) return;
    els.runnersList.innerHTML = "";
    if (!state.runners.length) {
      els.runnersList.innerHTML = "<li class=\"hint\">Aucun coureur. Ajoutez une classe ou collez une liste.</li>";
      return;
    }
    state.runners.forEach(function (runner) {
      var li = document.createElement("li");
      li.className = "photo-finish-runner";
      li.innerHTML =
        "<span><strong>" +
        escapeHtml(runner.displayName) +
        "</strong><small>" +
        escapeHtml(runner.className || "Sans classe") +
        "</small></span><button type=\"button\" class=\"btn btn--ghost\">Supprimer</button>";
      li.querySelector("button").addEventListener("click", function () {
        runner.active = false;
        state.runners = state.runners.filter(function (r) {
          return r.id !== runner.id;
        });
        saveLocalShell();
        renderRunners();
      });
      els.runnersList.appendChild(li);
    });
  }

  function filteredResults() {
    var classQ = inputs.filterClass.value.trim().toLowerCase();
    var runnerQ = inputs.filterRunner.value.trim().toLowerCase();
    var assigned = inputs.filterAssigned.value;
    var series = inputs.filterSeries ? inputs.filterSeries.value : "all";
    var list = state.results.filter(function (r) {
      if (classQ && String(r.className || "").toLowerCase().indexOf(classQ) < 0) return false;
      if (runnerQ && String(r.runnerName || "").toLowerCase().indexOf(runnerQ) < 0) return false;
      if (assigned === "assigned" && r.isUnassigned) return false;
      if (assigned === "unassigned" && !r.isUnassigned) return false;
      if (series !== "all" && String(r.seriesNumber || 1) !== series) return false;
      return true;
    });
    var sort = inputs.sortResults.value;
    list.sort(function (a, b) {
      if (sort === "time-desc") return b.timeMs - a.timeMs;
      if (sort === "alpha") return String(a.runnerName).localeCompare(String(b.runnerName)) || a.timeMs - b.timeMs;
      if (sort === "date") return String(b.date).localeCompare(String(a.date));
      if (sort === "series") return Number(a.seriesNumber || 1) - Number(b.seriesNumber || 1) || a.timeMs - b.timeMs;
      return a.timeMs - b.timeMs;
    });
    return list;
  }

  function refreshSeriesFilter() {
    if (!inputs.filterSeries) return;
    var current = inputs.filterSeries.value || "all";
    var series = {};
    state.results.forEach(function (result) {
      series[result.seriesNumber || 1] = true;
    });
    inputs.filterSeries.innerHTML = "<option value=\"all\">Toutes</option>" +
      Object.keys(series)
        .sort(function (a, b) {
          return Number(a) - Number(b);
        })
        .map(function (number) {
          return "<option value=\"" + escapeHtml(number) + "\">Serie " + escapeHtml(number) + "</option>";
        })
        .join("");
    inputs.filterSeries.value = series[current] ? current : "all";
  }

  function renderResults() {
    refreshSeriesFilter();
    var list = filteredResults();
    els.resultsList.innerHTML = "";
    els.resultsEmpty.hidden = list.length > 0;
    var groups = {};
    list.forEach(function (result) {
      var key = result.runnerId || result.runnerName || "unassigned";
      groups[key] = groups[key] || [];
      groups[key].push(result);
    });
    var grouped = Object.keys(groups).map(function (key) {
      var performances = groups[key].sort(function (a, b) {
        return a.timeMs - b.timeMs;
      });
      return { key: key, best: performances[0], performances: performances };
    });
    var sort = inputs.sortResults.value;
    grouped.sort(function (a, b) {
      if (sort === "alpha") return String(a.best.runnerName).localeCompare(String(b.best.runnerName));
      if (sort === "series") return Number(a.best.seriesNumber || 1) - Number(b.best.seriesNumber || 1) || a.best.timeMs - b.best.timeMs;
      if (sort === "time-desc") return b.best.timeMs - a.best.timeMs;
      if (sort === "date") return String(b.best.date).localeCompare(String(a.best.date));
      return a.best.timeMs - b.best.timeMs;
    });
    grouped.forEach(function (group) {
      var li = document.createElement("li");
      li.className = "photo-finish-result-group";
      li.innerHTML =
        "<div class=\"photo-finish-result-group__head\"><span><strong>" +
        escapeHtml(group.best.runnerName) +
        "</strong><small>" +
        escapeHtml(group.best.className || "Sans classe") +
        "</small></span><span class=\"photo-finish-classement__temps\">" +
        escapeHtml(group.best.formattedTime) +
        "</span></div><ol></ol>";
      var inner = li.querySelector("ol");
      group.performances.forEach(function (r) {
        var row = document.createElement("li");
        row.className = "photo-finish-result-item";
        row.innerHTML =
          "<span class=\"photo-finish-result-series\"><small>Serie</small><strong>" +
          escapeHtml(r.seriesNumber || 1) +
          "</strong></span><span class=\"photo-finish-result-main\"><small>" +
          escapeHtml([r.sessionName, r.comment].filter(Boolean).join(" - ")) +
          "</small></span><span class=\"photo-finish-classement__temps\">" +
          escapeHtml(r.formattedTime) +
          "</span><button type=\"button\" class=\"btn btn--ghost\">Supprimer</button>";
        row.querySelector("button").addEventListener("click", function () {
          deleteResult(r.id);
        });
        inner.appendChild(row);
      });
      els.resultsList.appendChild(li);
    });
  }

  function resultsToCsv(list) {
    var rows = ["rang;nom;classe;temps;temps_ms;session;epreuve;distance;date;commentaire"];
    list.forEach(function (r, index) {
      rows.push(
        [
          r.rank || index + 1,
          r.runnerName,
          r.className,
          r.formattedTime,
          Math.round(r.timeMs),
          r.sessionName,
          state.sessionInfo.eventType,
          state.sessionInfo.distance,
          r.date,
          r.comment || "",
        ]
          .map(function (cell) {
            return "\"" + String(cell || "").replace(/"/g, "\"\"") + "\"";
          })
          .join(";")
      );
    });
    return rows.join("\n");
  }

  function exportCsv() {
    var list = filteredResults();
    if (!list.length) {
      showMsg("Aucun resultat a exporter.");
      return;
    }
    var blob = new Blob(["\ufeff" + resultsToCsv(list)], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "photo-finish-resultats-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copyResults() {
    var csv = resultsToCsv(filteredResults());
    if (!navigator.clipboard) {
      showMsg("Presse-papiers indisponible sur ce navigateur.");
      return;
    }
    navigator.clipboard.writeText(csv).then(function () {
      showMsg("Resultats copies.");
    });
  }

  function saveSession() {
    var session = {
      id: state.currentSessionId || uid("session"),
      name: state.sessionInfo.name,
      date: state.sessionInfo.date,
      className: state.sessionInfo.className,
      eventType: state.sessionInfo.eventType,
      distance: state.sessionInfo.distance,
      settings: Object.assign({}, state.settings),
      seriesNumber: state.currentSeriesNumber || state.seriesCounter || 1,
      imageDataRef: state.currentSessionId,
      imageDataUrl: state.activeImageDataUrl,
      imageWidth: els.resultCanvas.width || 0,
      imageHeight: els.resultCanvas.height || 0,
      strips: state.strips,
      results: state.results.filter(function (r) {
        return r.sessionId === state.currentSessionId;
      }),
      debugStats: state.debugStats,
    };
    state.sessions = state.sessions.filter(function (s) {
      return s.id !== session.id;
    });
    state.sessions.push(session);
    saveLocalShell();
    if (session.imageDataUrl) {
      saveIndexedSession(session).catch(function () {
        showMsg("Session sauvegardee sans l'image lourde : IndexedDB indisponible.");
      });
    }
  }

  function exportImage(silent) {
    if (!els.resultCanvas.width) {
      showMsg("Aucune image a exporter.");
      return;
    }
    var fname = "photo-finish-" + new Date().toISOString().slice(0, 10) + ".png";
    var a = document.createElement("a");
    a.href = els.resultCanvas.toDataURL("image/png");
    a.download = fname;
    a.click();
    if (!silent) showMsg("Image exportee.");
  }

  function saveImageToGallery() {
    if (!els.resultCanvas.width) {
      showMsg("Aucune image a enregistrer.");
      return;
    }
    var fname = "photo-finish-" + new Date().toISOString().slice(0, 10) + ".png";
    function downloadFallback(message) {
      exportImage(true);
      showMsg(message || "Partage indisponible : image telechargee.");
    }
    if (!els.resultCanvas.toBlob) {
      downloadFallback();
      return;
    }
    els.resultCanvas.toBlob(function (blob) {
      if (!blob) {
        showMsg("Impossible de preparer l'image.");
        return;
      }
      try {
        var file = new File([blob], fname, { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator
            .share({
              files: [file],
              title: "Photo Finish V1",
              text: fname,
            })
            .then(function () {
              showMsg("Choisissez « Enregistrer l'image » ou « Photos » dans le menu.");
            })
            .catch(function (err) {
              if (err && err.name === "AbortError") return;
              downloadFallback();
            });
          return;
        }
      } catch (err) {
        /* navigateurs sans File / canShare */
      }
      downloadFallback();
    }, "image/png");
  }

  function renderDebug() {
    if (!state.settings.debugEnabled || !els.debugList) return;
    var stats = state.debugStats;
    var data = {
      "Bandeaux": stats.stripCount,
      "Image": stats.imageWidth + " x " + stats.imageHeight,
      "Premier temps": formatTime(stats.firstStripTimeMs),
      "Dernier temps": formatTime(stats.lastStripTimeMs),
      "FPS moyen": stats.averageFps.toFixed(1),
      "FPS demande / obtenu": (stats.requestedFrameRate || "?") + " / " + (stats.cameraFrameRate || "?"),
      "Delta min/max": stats.minFrameDeltaMs.toFixed(1) + " / " + stats.maxFrameDeltaMs.toFixed(1) + " ms",
      "Camera": stats.cameraWidth + " x " + stats.cameraHeight,
      "Facing mode": stats.cameraFacingMode || "-",
      "Device id": stats.cameraDeviceId || "-",
      "Camera utilisee": stats.cameraLabel || "-",
      "Largeur reglee": stats.stripWidth,
      "Largeur utilisee": stats.effectiveStripWidth || stats.stripWidth,
      "Hauteur source": stats.sourceStripHeight || "-",
      "Hauteur rendu": stats.renderHeight || "-",
      "Pixels par seconde": stats.pixelsPerSecond.toFixed(1),
      "Pixels/s visuels": stats.visualPixelsPerSecond.toFixed(1),
      "Scale visuel X": stats.displayScaleX.toFixed(2),
      "Densite": stats.densityLabel,
      "Qualite": stats.qualityMode,
      "Demarrage": state.settings.startTriggerMode === "press" ? "appui" : "relachement",
      "Scroll": els.scroll ? Math.round(els.scroll.scrollLeft) : 0,
      "Zoom": state.zoom.toFixed(2),
      "ImageX curseur": viewportCursorToImageX().toFixed(2),
      "Temps curseur": formatTime(getTimeAtViewportCursor()),
    };
    els.debugList.innerHTML = Object.keys(data)
      .map(function (key) {
        return "<dt>" + escapeHtml(key) + "</dt><dd>" + escapeHtml(data[key]) + "</dd>";
      })
      .join("");
  }

  function updateLiveStats() {
    if (els.stripState) els.stripState.textContent = state.strips.length + " bandeau(x)";
    if (els.fpsState) els.fpsState.textContent = "FPS : " + (state.debugStats.averageFps || 0).toFixed(1);
    renderDebug();
  }

  function importClassFromTool() {
    if (typeof ClassImport === "undefined") {
      showMsg("Import de classe indisponible.");
      return;
    }
    ClassImport.open({
      title: "Importer depuis une classe",
      hint: "Cochez les coureurs a ajouter.",
      onConfirm: function (eleves, classe) {
        if (classe && classe.nom) {
          state.sessionInfo.className = classe.nom;
          if (inputs.sessionClass) inputs.sessionClass.value = classe.nom;
        }
        eleves.forEach(function (eleve) {
          var name =
            typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
              ? EleveDisplay.formatEleveListe(eleve)
              : [eleve.prenom, eleve.nom].filter(Boolean).join(" ");
          addRunner(name, classe && classe.nom ? classe.nom : "", false);
        });
        saveLocalShell();
        renderRunners();
        renderHomeSetup();
        showMsg("");
      },
    });
  }

  function wireEvents() {
    els.tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        go(tab.dataset.screen);
      });
    });
    document.querySelectorAll("[data-go]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        go(btn.dataset.go);
      });
    });
    var manualCaptureKeys = {
      quality: true,
      stripWidth: true,
      captureHeight: true,
      renderHeight: true,
    };
    function onManualCaptureSettingChange() {
      if (suppressAutoDisable) return;
      disableAutoOptimize();
      readSettingsFromUi();
    }
    Object.keys(inputs).forEach(function (key) {
      var input = inputs[key];
      if (!input || key === "autoOptimize") return;
      if (manualCaptureKeys[key]) {
        input.addEventListener("input", onManualCaptureSettingChange);
        input.addEventListener("change", onManualCaptureSettingChange);
        return;
      }
      input.addEventListener("input", readSettingsFromUi);
      input.addEventListener("change", readSettingsFromUi);
    });
    if (inputs.autoOptimize) {
      inputs.autoOptimize.addEventListener("change", function () {
        state.settings.autoOptimize = inputs.autoOptimize.checked;
        if (isAutoOptimizeEnabled()) {
          inputs.quality.value = "auto";
          state.settings.qualityMode = "auto";
        }
        readSettingsFromUi();
        if (!isAutoOptimizeEnabled()) return;
        if (state.stream) {
          probeCameraFps().then(function (fps) {
            applyAutoOptimization(currentCameraDebugStats(), fps);
            updateCameraMeta();
          });
        }
      });
    }
    if (inputs.homeClassSelect) {
      inputs.homeClassSelect.addEventListener("change", function () {
        state.sessionInfo.className = inputs.homeClassSelect.value;
        state.selectedRunnerIds = [];
        readSettingsFromUi();
        renderHomeSetup();
      });
    }
    inputs.delay.addEventListener("change", function () {
      inputs.delayCustomWrap.hidden = inputs.delay.value !== "custom";
    });
    els.btnCamera.addEventListener("click", startCamera);
    if (els.btnResetAdvanced) {
      els.btnResetAdvanced.addEventListener("click", function () {
        var keepName = state.sessionInfo.name;
        var keepClass = state.sessionInfo.className;
        state.settings = defaultSettings();
        state.sessionInfo.name = keepName;
        state.sessionInfo.className = keepClass;
        writeSettingsToUi();
        saveLocalShell();
        showMsg("Reglages avances remis par defaut.");
      });
    }
    if (els.btnQualityTest) els.btnQualityTest.addEventListener("click", function () {
      go("quality");
    });
    if (els.btnRunQualityTest) els.btnRunQualityTest.addEventListener("click", startQualityTest);
    document.querySelectorAll("[data-strip-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        disableAutoOptimize();
        inputs.stripWidth.value = btn.dataset.stripPreset;
        readSettingsFromUi();
        showMsg("Largeur de bandeau reglee a " + btn.dataset.stripPreset + " px natifs.");
      });
    });
    els.btnFlip.addEventListener("click", function () {
      inputs.cameraFacing.value = inputs.cameraFacing.value === "environment" ? "user" : "environment";
      readSettingsFromUi();
      startCamera();
    });
    els.btnFullscreen.addEventListener("click", function () {
      var target = document.documentElement;
      if (target.requestFullscreen) target.requestFullscreen();
    });

    // Pointer events give the start timestamp at the exact requested gesture moment.
    els.btnStart.addEventListener("pointerdown", function () {
      if (state.timerState === "running") {
        state.lastStopTap = performance.now();
        stopTimer();
        return;
      }
      if (state.settings.startTriggerMode === "press" && state.timerState !== "running") {
        startTimer(performance.now());
      } else if (state.settings.startTriggerMode === "release") {
        els.btnStart.classList.add("is-armed");
        els.btnStart.querySelector(".btn__text").textContent = "Relachez pour demarrer";
      }
    });
    els.btnStart.addEventListener("pointerup", function () {
      if (state.timerState === "running" || performance.now() - state.lastStopTap < 600) return;
      if (state.settings.startTriggerMode === "release" && state.timerState !== "running") {
        els.btnStart.classList.remove("is-armed");
        els.btnStart.querySelector(".btn__text").textContent = "Demarrer le chrono";
        startTimer(performance.now());
      }
    });
    els.btnStart.addEventListener("click", function () {
      if (!window.PointerEvent && state.timerState !== "running") startTimer(performance.now());
    });
    els.btnStop.addEventListener("click", function () {
      var now = performance.now();
      if (now - state.startTime < 500) return;
      if (now - state.lastStopTap < 1200) stopTimer();
      else {
        state.lastStopTap = now;
        setStatus("Appuyez encore sur Stop pour confirmer.");
      }
    });
    els.chronoLive.addEventListener("click", stopTimer);
    els.scroll.addEventListener("scroll", function () {
      updateSliderFromScroll();
      updateCursorReadout();
    });
    els.scrollSlider.addEventListener("input", function () {
      var max = Math.max(0, els.scroll.scrollWidth - els.scroll.clientWidth);
      els.scroll.scrollLeft = (Number(els.scrollSlider.value) / 1000) * max;
    });
    $("pf-zoom-out").addEventListener("click", function () {
      setZoomKeepingCursor(Math.max(0.5, state.zoom / 1.25));
    });
    $("pf-zoom-in").addEventListener("click", function () {
      setZoomKeepingCursor(Math.min(6, state.zoom * 1.25));
    });
    $("pf-zoom-reset").addEventListener("click", function () {
      setZoomKeepingCursor(1);
    });
    els.btnInvert.addEventListener("click", function () {
      state.settings.direction =
        state.settings.direction === "leftToRight" ? "rightToLeft" : "leftToRight";
      inputs.direction.value = state.settings.direction;
      els.imageWrap.classList.toggle("is-reversed", state.settings.direction === "rightToLeft");
      saveLocalShell();
      updateCursorReadout();
    });
    els.btnAddResult.addEventListener("click", openResultDialog);
    els.dialogCancel.addEventListener("click", closeResultDialog);
    els.dialogSave.addEventListener("click", saveResultFromDialog);
    els.runnerSearch.addEventListener("input", fillRunnerSelect);
    els.btnExportImage.addEventListener("click", exportImage);
    if (els.btnSaveGallery) els.btnSaveGallery.addEventListener("click", saveImageToGallery);
    $("pf-btn-export-csv").addEventListener("click", exportCsv);
    $("pf-btn-copy-results").addEventListener("click", copyResults);
    [inputs.filterClass, inputs.filterRunner, inputs.filterAssigned, inputs.filterSeries, inputs.sortResults].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", renderResults);
      input.addEventListener("change", renderResults);
    });
    var btnValiderListe = $("pf-btn-valider-liste");
    if (btnValiderListe) btnValiderListe.addEventListener("click", importRunnersFromText);
    var importBtn = $("btn-import-classe-pf");
    if (importBtn) importBtn.addEventListener("click", importClassFromTool);
    window.addEventListener("resize", onViewerLayoutChange);
    window.addEventListener("orientationchange", onViewerLayoutChange);
  }

  function onViewerLayoutChange() {
    window.setTimeout(schedulePhotoFinishLayout, 120);
  }

  wireEvents();
  if (typeof ListeManuellePanel !== "undefined" && inputs.importText) {
    ListeManuellePanel.bind({
      toggleBtnId: "btn-ajouter-manuel-pf",
      panelId: "liste-manuelle-panel-pf",
      textareaEl: inputs.importText,
    });
  }
  if (els.btnStop) els.btnStop.disabled = true;

  if (typeof SessionManager !== "undefined" && typeof DataManager !== "undefined") {
    SessionManager.init({
      toolId: DataManager.SESSION_TOOLS.PHOTO_FINISH,
      toolLabel: "Photo Finish V1",
      onSessionReady: loadManagerSession,
      onSessionCleared: clearManagerSession,
    });
  } else {
    bootWithoutSessionManager();
  }

  window.PhotoFinishApp = {
    startTimer: startTimer,
    stopTimer: stopTimer,
    startCapture: startCapture,
    stopCapture: stopCapture,
    captureStrip: captureStrip,
    appendStripToPhotoFinish: appendStripToPhotoFinish,
    imageXToTime: imageXToTime,
    timeToImageX: timeToImageX,
    viewportCursorToImageX: viewportCursorToImageX,
    getTimeAtViewportCursor: getTimeAtViewportCursor,
    formatTime: formatTime,
    saveSession: saveSession,
    restoreSession: restoreSession,
  };
})();
