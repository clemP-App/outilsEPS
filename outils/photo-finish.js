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
    rafId: 0,
    videoFrameId: 0,
    fallbackCaptureId: 0,
    lastFrameNow: 0,
    lastStopTap: 0,
    zoom: 1,
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
      direction: "left-to-right",
      stripWidth: 2,
      finishLineXRatio: 0.5,
      preferredCamera: "environment",
      qualityMode: "max",
      startTriggerMode: "press",
      className: "",
      debugEnabled: false,
      highContrast: false,
      captureHeight: "720",
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
      stripWidth: 0,
      qualityMode: "max",
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
      direction: inputs.direction.value,
      stripWidth: Math.max(1, Math.min(12, Number(inputs.stripWidth.value || 2))),
      finishLineXRatio: Number(inputs.finishRatio.value || 50) / 100,
      preferredCamera: inputs.cameraFacing.value,
      qualityMode: inputs.quality.value,
      startTriggerMode: inputs.startMode.value,
      className: inputs.sessionClass.value.trim(),
      debugEnabled: inputs.debugEnabled.checked,
      highContrast: inputs.highContrast.checked,
      captureHeight: inputs.captureHeight.value,
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
    inputs.quality.value = state.settings.qualityMode;
    inputs.stripWidth.value = state.settings.stripWidth;
    inputs.finishRatio.value = Math.round(state.settings.finishLineXRatio * 100);
    inputs.captureHeight.value = state.settings.captureHeight;
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

  function cameraConstraints() {
    var quality = state.settings.qualityMode;
    var video = {
      facingMode: { ideal: state.settings.preferredCamera },
      width: { ideal: quality === "max" ? 3840 : quality === "balanced" ? 1920 : 1280 },
      height: { ideal: quality === "max" ? 2160 : quality === "balanced" ? 1080 : 720 },
      frameRate: { ideal: quality === "performance" ? 30 : 60 },
    };
    return { audio: false, video: video };
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
    navigator.mediaDevices
      .getUserMedia(cameraConstraints())
      .then(function (stream) {
        stopCamera();
        state.stream = stream;
        els.video.srcObject = stream;
        return els.video.play();
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

  function updateCameraMeta() {
    var w = els.video.videoWidth || 0;
    var h = els.video.videoHeight || 0;
    state.debugStats.cameraWidth = w;
    state.debugStats.cameraHeight = h;
    if (els.cameraMeta) {
      els.cameraMeta.textContent = w && h ? "Resolution obtenue : " + w + " x " + h + "." : "Camera active.";
    }
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
    saveSession();
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
    state.currentSessionId = uid("session");
    state.strips = [];
    state.debugStats = defaultDebugStats();
    state.activeImageDataUrl = "";
    state.zoom = 1;
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
    if (state.timerState !== "running" || !els.video.videoWidth) return;
    var now = performance.now();
    var elapsed = now - state.startTime;
    if (elapsed < state.settings.captureDelayMs) return;
    if (!state.captureStarted) startCapture();

    var vw = els.video.videoWidth;
    var vh = els.video.videoHeight;
    var stripWidth = state.settings.stripWidth;
    var height = captureHeight(vh);
    var y = Math.max(0, Math.round((vh - height) / 2));
    var centerX = Math.round(vw * state.settings.finishLineXRatio);
    var sx = Math.max(0, Math.min(vw - stripWidth, centerX - Math.floor(stripWidth / 2)));
    var imageXStart = state.strips.length ? state.strips[state.strips.length - 1].imageXEnd : 0;
    var imageXEnd = imageXStart + stripWidth;

    if (imageXEnd > MAX_IMAGE_WIDTH) {
      showMsg("Capture trop longue : l'image atteint la limite de securite.");
      stopTimer();
      return;
    }

    stripCanvas.width = stripWidth;
    stripCanvas.height = height;
    stripCtx.imageSmoothingEnabled = false;
    stripCtx.drawImage(els.video, sx, y, stripWidth, height, 0, 0, stripWidth, height);
    appendStripToPhotoFinish(stripCanvas, imageXStart, imageXEnd, height);

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
      height: height,
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
    if (delta > 0) {
      state.debugStats.minFrameDeltaMs = state.debugStats.minFrameDeltaMs
        ? Math.min(state.debugStats.minFrameDeltaMs, delta)
        : delta;
      state.debugStats.maxFrameDeltaMs = Math.max(state.debugStats.maxFrameDeltaMs, delta);
    }
    state.debugStats.stripWidth = state.settings.stripWidth;
    state.debugStats.qualityMode = state.settings.qualityMode;
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
    applyZoom();
    updateViewerPadding();
    els.scroll.scrollLeft = 0;
    updateCursorReadout();
    renderMarkers();
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
    var raw = els.scroll.scrollLeft / Math.max(0.1, state.zoom);
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
    var width = els.resultCanvas.width * state.zoom;
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
    els.scroll.scrollLeft = Math.max(0, imageX * state.zoom);
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
        marker.style.left = timeToImageX(r.timeMs) * state.zoom + "px";
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
    var a = document.createElement("a");
    a.href = els.resultCanvas.toDataURL("image/png");
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
      "Delta min/max": stats.minFrameDeltaMs.toFixed(1) + " / " + stats.maxFrameDeltaMs.toFixed(1) + " ms",
      "Camera": stats.cameraWidth + " x " + stats.cameraHeight,
      "Largeur bandeau": stats.stripWidth,
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
        state.settings.direction === "left-to-right" ? "right-to-left" : "left-to-right";
      inputs.direction.value = state.settings.direction;
      els.imageWrap.classList.toggle("is-reversed", state.settings.direction === "right-to-left");
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
