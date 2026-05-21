/**
 * Vidéo avec retard — tampon d’images, aperçu direct, plein écran et annotations.
 */
(function () {
  "use strict";

  var CAPTURE_INTERVAL_MS = 100;
  var CAPTURE_MAX_WIDTH = 640;
  var PIP_WIDTH = 140;

  var videoEl = document.getElementById("video-retard-src");
  var stageEl = document.getElementById("video-retard-stage");
  var canvasEl = document.getElementById("video-retard-canvas");
  var overlayEl = document.getElementById("video-retard-overlay");
  var pipWrapEl = document.getElementById("video-retard-pip");
  var pipCanvasEl = document.getElementById("video-retard-pip-canvas");
  var statusEl = document.getElementById("video-retard-status");
  var bufferEl = document.getElementById("video-retard-buffer");
  var delayInput = document.getElementById("video-retard-delay");
  var delayValEl = document.getElementById("video-retard-delay-val");
  var btnStart = document.getElementById("video-retard-start");
  var btnFlip = document.getElementById("video-retard-flip");
  var btnMirror = document.getElementById("video-retard-mirror");
  var btnFullscreen = document.getElementById("video-retard-fullscreen");
  var btnFsExit = document.getElementById("video-retard-fs-exit");
  var btnDrawLine = document.getElementById("video-retard-draw-line");
  var btnDrawCircle = document.getElementById("video-retard-draw-circle");
  var btnDrawClear = document.getElementById("video-retard-draw-clear");
  var drawHintEl = document.getElementById("video-retard-draw-hint");
  var fillCheckbox = document.getElementById("video-retard-fill");
  var pipShowCheckbox = document.getElementById("video-retard-pip-show");
  var msgEl = document.getElementById("video-retard-msg");
  var adviceEl = document.getElementById("video-retard-advice");
  var warnEl = document.getElementById("video-retard-warn");

  var capaciteAppareil = null;

  var displayCtx = canvasEl && canvasEl.getContext("2d", { alpha: false });
  var overlayCtx = overlayEl && overlayEl.getContext("2d");
  var pipCtx = pipCanvasEl && pipCanvasEl.getContext("2d", { alpha: false });
  var captureCanvas = document.createElement("canvas");
  var captureCtx = captureCanvas.getContext("2d", { alpha: false });

  var stream = null;
  var facingMode = "environment";
  var mirror = false;
  var running = false;
  var captureTimerId = null;
  var renderId = null;
  var frames = [];
  var startedAt = 0;
  var delayMs = 20000;
  var lastVideoRect = null;
  var drawTool = null;
  var annotations = [];
  var draftAnnotation = null;
  var lineFirstPoint = null;
  var pointerDown = false;

  function montrerMsg(texte) {
    if (!msgEl) return;
    msgEl.hidden = !texte;
    msgEl.textContent = texte || "";
  }

  function setStatus(texte) {
    if (statusEl) statusEl.textContent = texte;
  }

  function setBufferInfo(texte, visible) {
    if (!bufferEl) return;
    bufferEl.hidden = !visible;
    bufferEl.textContent = texte || "";
  }

  function setDrawHint(texte, visible) {
    if (!drawHintEl) return;
    drawHintEl.hidden = !visible;
    drawHintEl.textContent = texte || "";
  }

  function delayFromInput() {
    if (!delayInput) return delayMs;
    return Number(delayInput.value) * 1000;
  }

  function arrondirRetardConseille(sec) {
    return Math.max(5, Math.min(60, Math.round(sec / 5) * 5));
  }

  function estimerMemoireMo(delaySec) {
    var images = Math.ceil((delaySec * 1000) / CAPTURE_INTERVAL_MS);
    var pixels = CAPTURE_MAX_WIDTH * 360;
    return Math.max(1, Math.round((images * pixels * 4) / (1024 * 1024) * 0.45));
  }

  function evaluerCapaciteAppareil() {
    var nav = navigator;
    var ramGo = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
    var cores = nav.hardwareConcurrency || 0;
    var ua = nav.userAgent || "";
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    var ipad = /iPad/i.test(ua);
    var conseille = 20;
    var confiance = "faible";
    var source = "";

    if (ramGo !== null) {
      confiance = "bonne";
      source = "mémoire annoncée par le navigateur (" + ramGo + " Go)";
      if (ramGo >= 8) conseille = 60;
      else if (ramGo >= 4) conseille = 45;
      else if (ramGo >= 2) conseille = 20;
      else conseille = 10;
    } else if (mobile) {
      confiance = "faible";
      source = "appareil mobile (estimation sans donnée mémoire)";
      conseille = ipad ? 25 : 15;
    } else {
      confiance = "moyenne";
      source = "ordinateur (estimation sans donnée mémoire)";
      conseille = 30;
    }

    if (cores > 0 && cores <= 2 && conseille > 15) {
      conseille -= 5;
      source += ", processeur limité";
    }

    conseille = arrondirRetardConseille(conseille);

    return {
      conseille: conseille,
      confiance: confiance,
      source: source,
      ramGo: ramGo,
      memoireMaxMo: estimerMemoireMo(conseille),
    };
  }

  function niveauAvertissementRetard(delaySec, cap) {
    if (!cap) return "ok";
    var conseille = cap.conseille;
    if (delaySec >= 60 && conseille < 45) return "critique";
    if (delaySec > conseille + 15) return "critique";
    if (delaySec > conseille) return "alerte";
    if (delaySec >= 45 && cap.confiance !== "bonne") return "alerte";
    return "ok";
  }

  function majAvertissementsCapacite() {
    if (!capaciteAppareil) capaciteAppareil = evaluerCapaciteAppareil();

    var cap = capaciteAppareil;
    var delaySec = delayInput ? Number(delayInput.value) : delayMs / 1000;
    var memoireChoisie = estimerMemoireMo(delaySec);
    var niveau = niveauAvertissementRetard(delaySec, cap);

    if (adviceEl) {
      var confianceTxt =
        cap.confiance === "bonne"
          ? "estimation fiable"
          : cap.confiance === "moyenne"
            ? "estimation approximative"
            : "estimation prudente";
      adviceEl.innerHTML =
        "<strong>Retard conseillé sur cet appareil : " +
        cap.conseille +
        " s</strong> (" +
        confianceTxt +
        "). Tampon d’environ <strong>~" +
        estimerMemoireMo(cap.conseille) +
        " Mo</strong> à ce réglage. Source : " +
        cap.source +
        ".";
    }

    if (!warnEl) return;

    if (niveau === "ok") {
      warnEl.hidden = true;
      warnEl.textContent = "";
      warnEl.classList.remove("stockage-alert--critical");
      warnEl.classList.add("stockage-alert--warning");
      return;
    }

    warnEl.hidden = false;
    warnEl.classList.toggle("stockage-alert--critical", niveau === "critique");
    warnEl.classList.toggle("stockage-alert--warning", niveau !== "critique");

    if (niveau === "critique") {
      warnEl.textContent =
        "Attention : " +
        delaySec +
        " s demande environ ~" +
        memoireChoisie +
        " Mo en mémoire. Sur cet appareil (conseillé ≤ " +
        cap.conseille +
        " s), l’image peut se figer ou l’onglet planter. Testez avant le cours ou baissez le retard.";
    } else {
      warnEl.textContent =
        "Retard élevé : ~" +
        memoireChoisie +
        " Mo estimés pour " +
        delaySec +
        " s. Au-delà de " +
        cap.conseille +
        " s conseillés, des ralentissements sont possibles.";
    }
  }

  function syncDelayLabel() {
    if (delayValEl && delayInput) delayValEl.textContent = String(delayInput.value);
    delayMs = delayFromInput();
    pruneFrames();
    majAvertissementsCapacite();
  }

  function maxFrameCount() {
    return Math.ceil(delayMs / CAPTURE_INTERVAL_MS) + 10;
  }

  function pruneFrames() {
    var max = maxFrameCount();
    while (frames.length > max) {
      var old = frames.shift();
      if (old && old.bitmap && old.bitmap.close) old.bitmap.close();
    }
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
  }

  function clearFrames() {
    frames.forEach(function (f) {
      if (f.bitmap && f.bitmap.close) f.bitmap.close();
    });
    frames = [];
  }

  function stopCaptureLoop() {
    if (captureTimerId) {
      clearInterval(captureTimerId);
      captureTimerId = null;
    }
  }

  function stopRenderLoop() {
    if (renderId) {
      cancelAnimationFrame(renderId);
      renderId = null;
    }
  }

  function stageHeight() {
    if (!stageEl) return Math.max(200, window.innerHeight * 0.55);
    if (isFullscreenActif() || stageEl.classList.contains("is-fullscreen-fallback")) {
      return window.innerHeight;
    }
    return Math.max(200, stageEl.clientHeight || window.innerHeight * 0.55);
  }

  function isFullscreenActif() {
    var el = document.fullscreenElement || document.webkitFullscreenElement;
    return !!el && (el === stageEl || (stageEl && el.contains && el.contains(stageEl)));
  }

  function resizeCanvas() {
    if (!canvasEl || !stageEl) return;
    var w = stageEl.clientWidth || window.innerWidth;
    var h = stageHeight();
    canvasEl.width = Math.max(1, Math.floor(w));
    canvasEl.height = Math.max(1, Math.floor(h));
    if (overlayEl) {
      overlayEl.width = canvasEl.width;
      overlayEl.height = canvasEl.height;
    }
  }

  function setupCaptureSize() {
    if (!videoEl || !videoEl.videoWidth) return;
    var vw = videoEl.videoWidth;
    var vh = videoEl.videoHeight;
    var scale = Math.min(1, CAPTURE_MAX_WIDTH / vw);
    captureCanvas.width = Math.max(1, Math.floor(vw * scale));
    captureCanvas.height = Math.max(1, Math.floor(vh * scale));
  }

  function computeVideoRect(bw, bh) {
    if (!canvasEl) return null;
    var cw = canvasEl.width;
    var ch = canvasEl.height;
    var fill = fillCheckbox && fillCheckbox.checked;
    var scale;
    var dw;
    var dh;
    var dx;
    var dy;

    if (fill) {
      scale = Math.max(cw / bw, ch / bh);
      dw = bw * scale;
      dh = bh * scale;
      dx = (cw - dw) / 2;
      dy = (ch - dh) / 2;
    } else {
      scale = Math.min(cw / bw, ch / bh);
      dw = bw * scale;
      dh = bh * scale;
      dx = (cw - dw) / 2;
      dy = (ch - dh) / 2;
    }

    lastVideoRect = { dx: dx, dy: dy, dw: dw, dh: dh };
    return lastVideoRect;
  }

  function normDansVideo(nx, ny) {
    return nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
  }

  function normVersCanvas(nx, ny) {
    var v = lastVideoRect;
    if (!v) return { x: 0, y: 0 };
    return { x: v.dx + nx * v.dw, y: v.dy + ny * v.dh };
  }

  function pointerVersNorm(clientX, clientY) {
    if (!canvasEl) return null;
    var r = canvasEl.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var x = (clientX - r.left) * (canvasEl.width / r.width);
    var y = (clientY - r.top) * (canvasEl.height / r.height);
    var v = lastVideoRect;
    if (!v || v.dw <= 0 || v.dh <= 0) return null;
    return { x: (x - v.dx) / v.dw, y: (y - v.dy) / v.dh };
  }

  function traceForme(ctx, forme) {
    if (!forme || !lastVideoRect) return;
    var p1 = normVersCanvas(forme.x1, forme.y1);
    var p2 = normVersCanvas(forme.x2, forme.y2);

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = Math.max(2, Math.min(5, lastVideoRect.dw * 0.006));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (forme.type === "line") {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      return;
    }

    if (forme.type === "circle") {
      var cx = p1.x;
      var cy = p1.y;
      var rayon = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      ctx.beginPath();
      ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function redrawOverlay() {
    if (!overlayCtx || !overlayEl) return;
    overlayCtx.clearRect(0, 0, overlayEl.width, overlayEl.height);
    if (!lastVideoRect) return;
    annotations.forEach(function (a) {
      traceForme(overlayCtx, a);
    });
    if (draftAnnotation) traceForme(overlayCtx, draftAnnotation);
  }

  function resetDraft() {
    draftAnnotation = null;
    lineFirstPoint = null;
    pointerDown = false;
    redrawOverlay();
  }

  function setDrawTool(tool) {
    drawTool = drawTool === tool ? null : tool;
    resetDraft();
    if (btnDrawLine) btnDrawLine.classList.toggle("is-active", drawTool === "line");
    if (btnDrawCircle) btnDrawCircle.classList.toggle("is-active", drawTool === "circle");
    if (overlayEl) {
      overlayEl.classList.toggle("video-retard-overlay--draw", !!drawTool);
    }
    if (drawTool === "line") {
      setDrawHint("Touchez le début du trait, puis la fin (sur l’image).", true);
    } else if (drawTool === "circle") {
      setDrawHint("Maintenez du centre vers le bord pour dimensionner le cercle.", true);
    } else {
      setDrawHint("", false);
    }
  }

  function effacerAnnotations() {
    annotations = [];
    resetDraft();
  }

  function onOverlayPointerDown(e) {
    if (!drawTool || !running) return;
    var p = pointerVersNorm(e.clientX, e.clientY);
    if (!p || !normDansVideo(p.x, p.y)) return;
    e.preventDefault();

    if (drawTool === "line") {
      if (!lineFirstPoint) {
        lineFirstPoint = p;
        draftAnnotation = { type: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        if (overlayEl.setPointerCapture) overlayEl.setPointerCapture(e.pointerId);
        redrawOverlay();
        return;
      }
      if (!normDansVideo(p.x, p.y)) return;
      annotations.push({
        type: "line",
        x1: lineFirstPoint.x,
        y1: lineFirstPoint.y,
        x2: p.x,
        y2: p.y,
      });
      resetDraft();
      return;
    }

    if (drawTool === "circle") {
      pointerDown = true;
      draftAnnotation = { type: "circle", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
      if (overlayEl.setPointerCapture) overlayEl.setPointerCapture(e.pointerId);
      redrawOverlay();
    }
  }

  function onOverlayPointerMove(e) {
    if (!drawTool || !running) return;
    var p = pointerVersNorm(e.clientX, e.clientY);
    if (!p) return;

    if (drawTool === "line" && lineFirstPoint && draftAnnotation) {
      draftAnnotation.x2 = Math.max(0, Math.min(1, p.x));
      draftAnnotation.y2 = Math.max(0, Math.min(1, p.y));
      redrawOverlay();
      return;
    }

    if (drawTool === "circle" && pointerDown && draftAnnotation) {
      draftAnnotation.x2 = p.x;
      draftAnnotation.y2 = p.y;
      redrawOverlay();
    }
  }

  function onOverlayPointerUp(e) {
    if (drawTool !== "circle" || !pointerDown || !draftAnnotation) return;
    pointerDown = false;
    var p = pointerVersNorm(e.clientX, e.clientY);
    if (!p) {
      resetDraft();
      return;
    }
    draftAnnotation.x2 = p.x;
    draftAnnotation.y2 = p.y;
    var rayon = Math.hypot(draftAnnotation.x2 - draftAnnotation.x1, draftAnnotation.y2 - draftAnnotation.y1);
    if (rayon > 0.01) {
      annotations.push({
        type: "circle",
        x1: draftAnnotation.x1,
        y1: draftAnnotation.y1,
        x2: draftAnnotation.x2,
        y2: draftAnnotation.y2,
      });
    }
    resetDraft();
  }

  function drawLiveToCtx(ctx, w, h) {
    if (!videoEl || videoEl.readyState < 2 || !ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);
    var vw = videoEl.videoWidth;
    var vh = videoEl.videoHeight;
    if (!vw || !vh) return;
    var scale = Math.min(w / vw, h / vh);
    var dw = vw * scale;
    var dh = vh * scale;
    var dx = (w - dw) / 2;
    var dy = (h - dh) / 2;
    ctx.save();
    if (mirror) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, dw, dh);
    } else {
      ctx.drawImage(videoEl, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  function pipAffichee() {
    return pipShowCheckbox ? pipShowCheckbox.checked : false;
  }

  function majVisibilitePip() {
    if (!pipWrapEl) return;
    pipWrapEl.hidden = !running || !pipAffichee();
  }

  function drawPipPreview() {
    if (!pipCtx || !pipCanvasEl || !pipWrapEl || pipWrapEl.hidden) return;
    var ratio = 16 / 9;
    if (videoEl && videoEl.videoWidth) {
      ratio = videoEl.videoWidth / videoEl.videoHeight;
    }
    pipCanvasEl.width = PIP_WIDTH;
    pipCanvasEl.height = Math.max(1, Math.round(PIP_WIDTH / ratio));
    drawLiveToCtx(pipCtx, pipCanvasEl.width, pipCanvasEl.height);
  }

  function captureFrame() {
    if (!running || !videoEl || videoEl.readyState < 2 || !captureCtx) return;
    setupCaptureSize();
    captureCtx.save();
    if (mirror) {
      captureCtx.translate(captureCanvas.width, 0);
      captureCtx.scale(-1, 1);
    }
    captureCtx.drawImage(videoEl, 0, 0, captureCanvas.width, captureCanvas.height);
    captureCtx.restore();

    var t = performance.now();
    if (typeof createImageBitmap === "function") {
      createImageBitmap(captureCanvas)
        .then(function (bitmap) {
          if (!running) {
            bitmap.close();
            return;
          }
          frames.push({ t: t, bitmap: bitmap });
          pruneFrames();
        })
        .catch(function () {});
    }
  }

  function pickDelayedFrame(now) {
    var target = now - delayMs;
    if (!frames.length || target < frames[0].t) return null;
    var chosen = frames[0];
    for (var i = 1; i < frames.length; i++) {
      if (frames[i].t <= target) chosen = frames[i];
      else break;
    }
    return chosen;
  }

  function drawBitmapCover(bitmap) {
    if (!displayCtx || !canvasEl) return;
    var rect = computeVideoRect(bitmap.width, bitmap.height);
    displayCtx.fillStyle = "#0a0a0a";
    displayCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    displayCtx.drawImage(bitmap, rect.dx, rect.dy, rect.dw, rect.dh);
    redrawOverlay();
  }

  function renderLoop() {
    if (!running) return;
    renderId = requestAnimationFrame(renderLoop);

    var now = performance.now();
    var elapsed = now - startedAt;
    var remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 1000));

    drawPipPreview();

    if (elapsed < delayMs) {
      setBufferInfo("Tampon en cours… " + remaining + " s", true);
      setStatus("Remplissage du tampon — l’image retardée apparaîtra dans " + remaining + " s.");
      if (displayCtx && canvasEl) {
        displayCtx.fillStyle = "#0a0a0a";
        displayCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        lastVideoRect = null;
        redrawOverlay();
      }
      return;
    }

    setBufferInfo("", false);
    setStatus("Image retardée de " + (delayMs / 1000) + " s");

    var frame = pickDelayedFrame(now);
    if (frame && frame.bitmap) drawBitmapCover(frame.bitmap);
  }

  function syncFullscreenUi() {
    var actif = isFullscreenActif() || (stageEl && stageEl.classList.contains("is-fullscreen-fallback"));
    if (btnFsExit) btnFsExit.hidden = !actif;
    if (btnFullscreen) {
      var txt = btnFullscreen.querySelector(".btn__text");
      if (txt) txt.textContent = actif ? "Quitter plein écran" : "Plein écran";
      btnFullscreen.classList.toggle("is-active", actif);
    }
    if (actif) {
      document.body.classList.add("video-retard-body-fs");
    } else {
      document.body.classList.remove("video-retard-body-fs");
    }
    resizeCanvas();
  }

  function quitterPleinEcran() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
    if (stageEl) stageEl.classList.remove("is-fullscreen-fallback");
    syncFullscreenUi();
  }

  function entrerPleinEcran() {
    if (!stageEl) return;
    if (isFullscreenActif() || stageEl.classList.contains("is-fullscreen-fallback")) {
      quitterPleinEcran();
      return;
    }
    var req = stageEl.requestFullscreen || stageEl.webkitRequestFullscreen;
    if (req) {
      Promise.resolve(req.call(stageEl))
        .then(syncFullscreenUi)
        .catch(function () {
          stageEl.classList.add("is-fullscreen-fallback");
          syncFullscreenUi();
        });
    } else {
      stageEl.classList.add("is-fullscreen-fallback");
      syncFullscreenUi();
    }
  }

  function setControlsActive(active) {
    if (btnFlip) btnFlip.disabled = !active;
    if (btnMirror) btnMirror.disabled = !active;
    if (btnFullscreen) btnFullscreen.disabled = !active;
    if (btnDrawLine) btnDrawLine.disabled = !active;
    if (btnDrawCircle) btnDrawCircle.disabled = !active;
    if (btnDrawClear) btnDrawClear.disabled = !active;
    if (fillCheckbox) fillCheckbox.disabled = !active;
    majVisibilitePip();
    if (!active) {
      setDrawTool(null);
      quitterPleinEcran();
    }
  }

  function updateStartButton() {
    if (!btnStart) return;
    var icon = btnStart.querySelector(".btn__icon");
    var text = btnStart.querySelector(".btn__text");
    if (running) {
      if (icon) icon.textContent = "■";
      if (text) text.textContent = "Arrêter";
      btnStart.classList.remove("btn--primary");
      btnStart.classList.add("btn--ghost");
    } else {
      if (icon) icon.textContent = "▶";
      if (text) text.textContent = "Démarrer";
      btnStart.classList.add("btn--primary");
      btnStart.classList.remove("btn--ghost");
    }
  }

  function arret() {
    running = false;
    stopCaptureLoop();
    stopRenderLoop();
    stopStream();
    clearFrames();
    effacerAnnotations();
    setControlsActive(false);
    updateStartButton();
    setBufferInfo("", false);
    setStatus("Appuyez sur Démarrer pour activer la caméra.");
    if (displayCtx && canvasEl) {
      displayCtx.fillStyle = "#0a0a0a";
      displayCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    }
    if (overlayCtx && overlayEl) {
      overlayCtx.clearRect(0, 0, overlayEl.width, overlayEl.height);
    }
    lastVideoRect = null;
  }

  function demarrerCapture() {
    startedAt = performance.now();
    running = true;
    setControlsActive(true);
    updateStartButton();
    montrerMsg("");
    resizeCanvas();
    captureFrame();
    captureTimerId = setInterval(captureFrame, CAPTURE_INTERVAL_MS);
    renderLoop();
  }

  function constraints() {
    return {
      audio: false,
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }

  function demarrer() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      montrerMsg("Votre navigateur ne permet pas d’accéder à la caméra.");
      return;
    }

    montrerMsg("");
    setStatus("Demande d’accès à la caméra…");

    navigator.mediaDevices
      .getUserMedia(constraints())
      .then(function (s) {
        stopStream();
        stream = s;
        videoEl.srcObject = stream;
        return videoEl.play();
      })
      .then(function () {
        demarrerCapture();
      })
      .catch(function (err) {
        var msg = "Impossible d’accéder à la caméra.";
        if (err && err.name === "NotAllowedError") {
          msg = "Autorisez la caméra dans les réglages du navigateur, puis réessayez.";
        } else if (err && err.name === "NotFoundError") {
          msg = "Aucune caméra détectée sur cet appareil.";
        }
        montrerMsg(msg);
        setStatus(msg);
        arret();
      });
  }

  function toggle() {
    if (running) {
      arret();
      return;
    }
    syncDelayLabel();
    demarrer();
  }

  function flipCamera() {
    if (!running) return;
    facingMode = facingMode === "environment" ? "user" : "environment";
    stopCaptureLoop();
    stopRenderLoop();
    clearFrames();
    stopStream();
    demarrer();
  }

  function toggleMirror() {
    mirror = !mirror;
    if (btnMirror) btnMirror.classList.toggle("is-active", mirror);
  }

  if (delayInput) delayInput.addEventListener("input", syncDelayLabel);
  if (btnStart) btnStart.addEventListener("click", toggle);
  if (btnFlip) btnFlip.addEventListener("click", flipCamera);
  if (btnMirror) btnMirror.addEventListener("click", toggleMirror);
  if (btnFullscreen) btnFullscreen.addEventListener("click", entrerPleinEcran);
  if (btnFsExit) btnFsExit.addEventListener("click", quitterPleinEcran);
  if (btnDrawLine) btnDrawLine.addEventListener("click", function () { setDrawTool("line"); });
  if (btnDrawCircle) btnDrawCircle.addEventListener("click", function () { setDrawTool("circle"); });
  if (btnDrawClear) btnDrawClear.addEventListener("click", effacerAnnotations);
  if (fillCheckbox) fillCheckbox.addEventListener("change", function () { redrawOverlay(); });
  if (pipShowCheckbox) pipShowCheckbox.addEventListener("change", majVisibilitePip);

  if (overlayEl) {
    overlayEl.addEventListener("pointerdown", onOverlayPointerDown);
    overlayEl.addEventListener("pointermove", onOverlayPointerMove);
    overlayEl.addEventListener("pointerup", onOverlayPointerUp);
    overlayEl.addEventListener("pointercancel", onOverlayPointerUp);
  }

  document.addEventListener("fullscreenchange", syncFullscreenUi);
  document.addEventListener("webkitfullscreenchange", syncFullscreenUi);

  window.addEventListener("resize", function () {
    if (running || isFullscreenActif()) resizeCanvas();
  });

  window.addEventListener("pagehide", arret);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && running) arret();
  });

  capaciteAppareil = evaluerCapaciteAppareil();
  if (delayInput && Number(delayInput.value) > capaciteAppareil.conseille) {
    delayInput.value = String(capaciteAppareil.conseille);
  }
  syncDelayLabel();
  resizeCanvas();
  updateStartButton();
  majVisibilitePip();
})();
