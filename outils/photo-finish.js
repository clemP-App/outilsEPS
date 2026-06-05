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

  var $ = function (id) {
    return document.getElementById(id);
  };

  var els = {
    msg: $("pf-msg"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".photo-finish-tab")),
    screens: Array.prototype.slice.call(document.querySelectorAll(".photo-finish-screen")),
    video: $("pf-video"),
    stage: $("pf-stage"),
    slitGuide: $("pf-slit-guide"),
    chronoLive: $("pf-chrono-live"),
    status: $("pf-status"),
    cameraMeta: $("pf-camera-meta"),
    btnCamera: $("pf-btn-camera"),
    btnQualityTest: $("pf-btn-quality-test"),
    btnRunQualityTest: $("pf-btn-run-quality-test"),
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
    btnSaveSession: $("pf-btn-save-session"),
    btnExportImage: $("pf-btn-export-image"),
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
  };

  var inputs = {
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
    filterClass: $("pf-filter-class"),
    filterRunner: $("pf-filter-runner"),
    filterAssigned: $("pf-filter-assigned"),
    sortResults: $("pf-sort-results"),
    runnerName: $("pf-runner-name"),
    runnerClass: $("pf-runner-class"),
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
    activeImageDataUrl: "",
    currentSessionId: "",
    currentResultDraft: null,
    settings: defaultSettings(),
    sessionInfo: defaultSessionInfo(),
    runners: [],
    sessions: [],
    results: [],
    strips: [],
    debugStats: defaultDebugStats(),
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
      debugEnabled: true,
      highContrast: false,
      captureHeight: "full",
      renderHeight: "sprint",
      qualityPatchVersion: 3,
    };
  }

  function defaultSessionInfo() {
    return {
      name: "Photo Finish " + new Date().toLocaleDateString("fr-FR"),
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
    var millis = Math.floor(ms % 1000);
    var ss = seconds < 10 ? "0" + seconds : String(seconds);
    var mmm = String(millis).padStart(3, "0");
    return minutes > 0 ? minutes + ":" + ss + "." + mmm : seconds + "." + mmm + " s";
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
    if (value === "max" || value === "highFps" || value === "performance") return value;
    return "balancedEPS";
  }

  function go(screen) {
    state.screen = screen;
    els.tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", tab.dataset.screen === screen);
    });
    els.screens.forEach(function (panel) {
      panel.classList.toggle("is-active", panel.id === "pf-screen-" + screen);
    });
    if (screen === "analysis") {
      updateViewerPadding();
      updateCursorReadout();
    }
    if (screen === "results") renderResults();
    if (screen === "runners") renderRunners();
  }

  function readSettingsFromUi() {
    var delayValue = inputs.delay.value;
    var delayMs =
      delayValue === "custom"
        ? Math.max(0, Number(inputs.delayCustom.value || 0) * 1000)
        : Number(delayValue || 0);
    state.settings = {
      captureDelayMs: delayMs,
      autoStopEnabled: inputs.autoStopEnabled.checked,
      autoStopMs: Math.max(1000, Number(inputs.autoStop.value || 15) * 1000),
      direction: normalizeDirection(inputs.direction.value),
      stripWidth: Math.max(1, Math.min(8, Number(inputs.stripWidth.value || 4))),
      finishLineXRatio: Number(inputs.finishRatio.value || 50) / 100,
      preferredCamera: inputs.cameraFacing.value,
      qualityMode: normalizeQuality(inputs.quality.value),
      startTriggerMode: inputs.startMode.value,
      className: inputs.sessionClass.value.trim(),
      debugEnabled: inputs.debugEnabled.checked,
      highContrast: inputs.highContrast.checked,
      captureHeight: inputs.captureHeight.value,
      renderHeight: inputs.renderHeight.value,
      qualityPatchVersion: 3,
    };
    state.sessionInfo = {
      name: inputs.sessionName.value.trim() || defaultSessionInfo().name,
      date: state.sessionInfo.date || new Date().toISOString(),
      className: inputs.sessionClass.value.trim(),
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
    inputs.quality.value = state.settings.qualityMode;
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
  }

  function saveLocalShell() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: state.settings,
          sessionInfo: state.sessionInfo,
          runners: state.runners,
          results: state.results,
          sessions: state.sessions.map(function (s) {
            return Object.assign({}, s, { imageDataUrl: "" });
          }),
        })
      );
    } catch (err) {
      showMsg("Sauvegarde locale impossible : espace insuffisant.");
    }
  }

  function restoreSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      state.settings = Object.assign(defaultSettings(), data.settings || {});
      if (!data.settings || data.settings.qualityPatchVersion !== 3) {
        state.settings.stripWidth = 4;
        state.settings.qualityMode = "balancedEPS";
        state.settings.startTriggerMode = "release";
        state.settings.captureHeight = "full";
        state.settings.renderHeight = "sprint";
        state.settings.debugEnabled = true;
        state.settings.direction = normalizeDirection(state.settings.direction);
        state.settings.qualityPatchVersion = 3;
      }
      state.sessionInfo = Object.assign(defaultSessionInfo(), data.sessionInfo || {});
      state.runners = Array.isArray(data.runners) ? data.runners : [];
      state.results = Array.isArray(data.results) ? data.results : [];
      state.sessions = Array.isArray(data.sessions) ? data.sessions : [];
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

  function cameraProfiles() {
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

  function requestCameraWithProfiles(profiles, index) {
    if (index >= profiles.length) return Promise.reject(new Error("Aucun profil camera accepte."));
    return navigator.mediaDevices.getUserMedia(profiles[index].constraints).then(function (stream) {
      stream._photoFinishProfile = profiles[index];
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
  }

  function startCamera() {
    readSettingsFromUi();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMsg("Ce navigateur ne permet pas d'acceder a la camera.");
      return;
    }
    setStatus("Demande d'acces a la camera...");
    requestCameraWithProfiles(cameraProfiles(), 0)
      .then(function (stream) {
        stopCamera();
        state.stream = stream;
        els.video.srcObject = stream;
        return waitForVideoMetadata().then(function () {
          return els.video.play();
        });
      })
      .then(function () {
        showMsg("");
        updateCameraMeta();
        setStatus("Pret. Placez la ligne rouge sur l'arrivee.");
        go("capture");
      })
      .catch(function (err) {
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
      els.cameraMeta.textContent = w && h
        ? "Camera : " + w + " x " + h + ", " + (settings.frameRate || "?") + " fps obtenus."
        : "Camera active, attente des metadonnees video.";
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
    els.btnStart.disabled = true;
    els.btnStop.disabled = false;
    setStatus("Chrono lance. Capture en attente du delai choisi.");
  }

  function stopTimer() {
    if (state.timerState !== "running") return;
    state.stopTime = performance.now();
    state.timerState = "stopped";
    stopCapture();
    cancelAnimationFrame(state.rafId);
    finalizeImage();
    stopCamera();
    els.btnStart.disabled = false;
    els.btnStop.disabled = true;
    go("analysis");
    setStatus("Capture terminee.");
    if (!state.qualityTestMode) saveSession();
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
    state.strips = [];
    state.debugStats = Object.assign(defaultDebugStats(), cameraStats);
    state.activeImageDataUrl = "";
    state.zoom = 1;
    state.displayScaleX = 1;
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

  function outputRenderHeight(sourceHeight) {
    var mode = state.settings.renderHeight || "sprint";
    if (mode === "native") return sourceHeight;
    if (mode === "sprint") {
      return Math.max(160, Math.min(260, Math.round(sourceHeight * 0.28)));
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
    var stripWidth = state.settings.stripWidth;
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
    state.debugStats.pixelsPerSecond = state.debugStats.averageFps * state.settings.stripWidth;
    state.debugStats.densityLabel = densityLabel(state.debugStats.pixelsPerSecond);
    if (delta > 0) {
      state.debugStats.minFrameDeltaMs = state.debugStats.minFrameDeltaMs
        ? Math.min(state.debugStats.minFrameDeltaMs, delta)
        : delta;
      state.debugStats.maxFrameDeltaMs = Math.max(state.debugStats.maxFrameDeltaMs, delta);
    }
    state.debugStats.stripWidth = state.settings.stripWidth;
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
    if (stats.stripWidth >= 7) warnings.push("Slices trop larges : le coureur risque d'etre etire.");
    if (stats.renderHeight > 480) warnings.push("Image trop haute : utilisez Bande SprintTimer pour un rendu plus lisible.");
    if (stats.imageWidth > 12000) warnings.push("Image tres large : risque de ralentissement sur mobile.");
    if (stats.cameraWidth && stats.cameraWidth < 1280) warnings.push("Resolution faible : rapprochez moins la camera ou augmentez la qualite.");
    if (stats.pixelsPerSecond && stats.pixelsPerSecond < 160) warnings.push("Densite temporelle faible : augmentez le fps ou utilisez 4 px.");
    if (stats.pixelsPerSecond > 320) warnings.push("Densite temporelle elevee : image large, surveillez la memoire.");
    if (!warnings.length) warnings.push("Densite temporelle correcte : le compromis EPS est bon.");
    return warnings;
  }

  function renderDiagnostic() {
    if (!els.diagnosticPanel || !els.diagnosticList) return;
    var stats = state.debugStats;
    els.diagnosticPanel.hidden = false;
    var rows = {
      "Duree capturee": formatTime(stats.captureDurationMs),
      "Nombre de strips": stats.stripCount,
      "FPS moyen reel": stats.averageFps.toFixed(1),
      "Delta min/max": stats.minFrameDeltaMs.toFixed(1) + " / " + stats.maxFrameDeltaMs.toFixed(1) + " ms",
      "Largeur strip": stats.stripWidth + " px natifs",
      "Pixels par seconde": stats.pixelsPerSecond.toFixed(1),
      "Pixels/s visuels": stats.visualPixelsPerSecond.toFixed(1),
      "Scale visuel X": stats.displayScaleX.toFixed(2),
      "Densite temporelle": stats.densityLabel,
      "Resolution video": stats.cameraWidth + " x " + stats.cameraHeight,
      "Hauteur source strip": stats.sourceStripHeight + " px natifs",
      "Hauteur rendu": stats.renderHeight + " px",
      "Image finale": stats.imageWidth + " x " + stats.imageHeight,
      "Image affichee": Math.round(stats.imageWidth * stats.displayScaleX) + " x " + stats.imageHeight,
      "Mode qualite": stats.qualityMode,
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
    var visualWidth = els.resultCanvas.width * state.displayScaleX;
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
    els.resultCanvas.width = width;
    els.resultCanvas.height = height;
    resultCtx.imageSmoothingEnabled = false;
    resultCtx.drawImage(compositeCanvas, 0, 0, width, height, 0, 0, width, height);
    state.activeImageDataUrl = els.resultCanvas.toDataURL("image/png");
    state.zoom = 1;
    state.displayScaleX = computeDisplayScaleX();
    state.debugStats.displayScaleX = state.displayScaleX;
    state.debugStats.visualPixelsPerSecond =
      state.debugStats.pixelsPerSecond * state.displayScaleX;
    applyZoom();
    updateViewerPadding();
    els.scroll.scrollLeft = 0;
    updateCursorReadout();
    renderMarkers();
    renderDiagnostic();
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
    var raw = els.scroll.scrollLeft / Math.max(0.1, state.zoom * state.displayScaleX);
    var max = state.strips[state.strips.length - 1].imageXEnd;
    return Math.max(0, Math.min(max, raw));
  }

  function getTimeAtViewportCursor() {
    return imageXToTime(viewportCursorToImageX());
  }

  function updateViewerPadding() {
    if (!els.viewer || !els.imageWrap) return;
    var half = Math.max(0, Math.round(els.viewer.clientWidth / 2));
    els.imageWrap.style.setProperty("--pf-viewer-pad", half + "px");
    updateSliderFromScroll();
  }

  function applyZoom() {
    if (!els.resultCanvas) return;
    var width = els.resultCanvas.width * state.zoom * state.displayScaleX;
    els.resultCanvas.style.width = width + "px";
    els.resultCanvas.style.height = "auto";
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
    els.scroll.scrollLeft = Math.max(0, imageX * state.zoom * state.displayScaleX);
    updateCursorReadout();
  }

  function nudgeBy(ms) {
    var current = getTimeAtViewportCursor();
    scrollToImageX(timeToImageX(Math.max(0, current + ms)));
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
        marker.style.left = timeToImageX(r.timeMs) * state.zoom * state.displayScaleX + "px";
        marker.innerHTML =
          "<span>" + escapeHtml(r.runnerName || "Non attribue") + "</span><strong>" + escapeHtml(r.formattedTime) + "</strong>";
        marker.addEventListener("click", function () {
          scrollToImageX(timeToImageX(r.timeMs));
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
    els.runnerSelect.innerHTML = "<option value=\"\">Temps non attribue</option>";
    state.runners
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

  function addRunner(name, className, persist) {
    var clean = String(name || "").trim().replace(/\s+/g, " ");
    if (!clean) return null;
    var parts = clean.split(" ");
    var runner = {
      id: uid("runner"),
      firstName: parts.length > 1 ? parts[0] : "",
      lastName: parts.length > 1 ? parts.slice(1).join(" ") : clean,
      displayName: clean,
      className: className || inputs.runnerClass.value.trim() || state.sessionInfo.className || "",
      active: true,
    };
    state.runners.push(runner);
    if (persist !== false) {
      saveLocalShell();
      renderRunners();
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
    var list = state.results.filter(function (r) {
      if (classQ && String(r.className || "").toLowerCase().indexOf(classQ) < 0) return false;
      if (runnerQ && String(r.runnerName || "").toLowerCase().indexOf(runnerQ) < 0) return false;
      if (assigned === "assigned" && r.isUnassigned) return false;
      if (assigned === "unassigned" && !r.isUnassigned) return false;
      return true;
    });
    var sort = inputs.sortResults.value;
    list.sort(function (a, b) {
      if (sort === "time-desc") return b.timeMs - a.timeMs;
      if (sort === "name") return String(a.runnerName).localeCompare(String(b.runnerName));
      if (sort === "date") return String(b.date).localeCompare(String(a.date));
      if (sort === "session") return String(a.sessionName).localeCompare(String(b.sessionName));
      return a.timeMs - b.timeMs;
    });
    return list;
  }

  function renderResults() {
    var list = filteredResults();
    els.resultsList.innerHTML = "";
    els.resultsEmpty.hidden = list.length > 0;
    list.forEach(function (r, index) {
      var li = document.createElement("li");
      li.className = "photo-finish-result-item";
      li.innerHTML =
        "<span class=\"photo-finish-classement__rang\">" +
        (r.rank || index + 1) +
        "</span><span class=\"photo-finish-result-main\"><strong>" +
        escapeHtml(r.runnerName) +
        "</strong><small>" +
        escapeHtml([r.className, r.sessionName, r.comment].filter(Boolean).join(" - ")) +
        "</small></span><span class=\"photo-finish-classement__temps\">" +
        escapeHtml(r.formattedTime) +
        "</span><button type=\"button\" class=\"btn btn--ghost\">Supprimer</button>";
      li.querySelector("button").addEventListener("click", function () {
        state.results = state.results.filter(function (item) {
          return item.id !== r.id;
        });
        rankResults();
        saveLocalShell();
        renderResults();
        renderMarkers();
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

  function exportImage() {
    if (!els.resultCanvas.width) {
      showMsg("Aucune image a exporter.");
      return;
    }
    var exportCanvas = els.resultCanvas;
    if (state.displayScaleX > 1.01) {
      exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.round(els.resultCanvas.width * state.displayScaleX);
      exportCanvas.height = els.resultCanvas.height;
      var exportCtx = exportCanvas.getContext("2d", { alpha: false });
      exportCtx.imageSmoothingEnabled = true;
      exportCtx.imageSmoothingQuality = "high";
      exportCtx.drawImage(els.resultCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
    }
    var a = document.createElement("a");
    a.href = exportCanvas.toDataURL("image/png");
    a.download = "photo-finish-" + new Date().toISOString().slice(0, 10) + ".png";
    a.click();
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
      "Largeur bandeau": stats.stripWidth,
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
        eleves.forEach(function (eleve) {
          var name =
            typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
              ? EleveDisplay.formatEleveListe(eleve)
              : [eleve.prenom, eleve.nom].filter(Boolean).join(" ");
          addRunner(name, classe && classe.nom ? classe.nom : "", false);
        });
        saveLocalShell();
        renderRunners();
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
    Object.keys(inputs).forEach(function (key) {
      var input = inputs[key];
      if (!input) return;
      input.addEventListener("input", readSettingsFromUi);
      input.addEventListener("change", readSettingsFromUi);
    });
    inputs.delay.addEventListener("change", function () {
      inputs.delayCustomWrap.hidden = inputs.delay.value !== "custom";
    });
    els.btnCamera.addEventListener("click", startCamera);
    if (els.btnQualityTest) els.btnQualityTest.addEventListener("click", function () {
      go("quality");
    });
    if (els.btnRunQualityTest) els.btnRunQualityTest.addEventListener("click", startQualityTest);
    document.querySelectorAll("[data-strip-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
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
      if (state.settings.startTriggerMode === "press" && state.timerState !== "running") {
        startTimer(performance.now());
      } else if (state.settings.startTriggerMode === "release") {
        els.btnStart.classList.add("is-armed");
        els.btnStart.querySelector(".btn__text").textContent = "Relachez pour demarrer";
      }
    });
    els.btnStart.addEventListener("pointerup", function () {
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
    document.querySelectorAll("[data-nudge]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        nudgeBy(Number(btn.dataset.nudge));
      });
    });
    $("pf-zoom-out").addEventListener("click", function () {
      state.zoom = Math.max(0.5, state.zoom / 1.25);
      applyZoom();
    });
    $("pf-zoom-in").addEventListener("click", function () {
      state.zoom = Math.min(6, state.zoom * 1.25);
      applyZoom();
    });
    $("pf-zoom-reset").addEventListener("click", function () {
      state.zoom = 1;
      applyZoom();
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
    els.btnSaveSession.addEventListener("click", function () {
      saveSession();
      showMsg("Session sauvegardee.");
    });
    els.btnExportImage.addEventListener("click", exportImage);
    $("pf-btn-export-csv").addEventListener("click", exportCsv);
    $("pf-btn-copy-results").addEventListener("click", copyResults);
    [inputs.filterClass, inputs.filterRunner, inputs.filterAssigned, inputs.sortResults].forEach(function (input) {
      input.addEventListener("input", renderResults);
      input.addEventListener("change", renderResults);
    });
    $("pf-btn-add-runner").addEventListener("click", function () {
      addRunner(inputs.runnerName.value, inputs.runnerClass.value);
      inputs.runnerName.value = "";
    });
    $("pf-btn-import-text").addEventListener("click", function () {
      var className = inputs.runnerClass.value.trim() || state.sessionInfo.className;
      inputs.importText.value
        .split(/\r?\n/)
        .map(function (line) {
          return line.trim();
        })
        .filter(Boolean)
        .forEach(function (line) {
          addRunner(line, className, false);
        });
      inputs.importText.value = "";
      saveLocalShell();
      renderRunners();
    });
    $("btn-import-classe-pf").addEventListener("click", importClassFromTool);
    window.addEventListener("resize", function () {
      updateViewerPadding();
      applyZoom();
      updateFinishGuide();
    });
  }

  restoreSession();
  writeSettingsToUi();
  if (els.imageWrap) {
    els.imageWrap.classList.toggle("is-reversed", state.settings.direction === "rightToLeft");
  }
  wireEvents();
  renderRunners();
  renderResults();
  els.btnStop.disabled = true;
  updateLiveStats();

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
