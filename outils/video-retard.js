/**
 * Vidéo avec retard — tampon d’images pour afficher la caméra avec décalage.
 */
(function () {
  "use strict";

  var CAPTURE_INTERVAL_MS = 100;
  var CAPTURE_MAX_WIDTH = 640;

  var videoEl = document.getElementById("video-retard-src");
  var canvasEl = document.getElementById("video-retard-canvas");
  var statusEl = document.getElementById("video-retard-status");
  var bufferEl = document.getElementById("video-retard-buffer");
  var delayInput = document.getElementById("video-retard-delay");
  var delayValEl = document.getElementById("video-retard-delay-val");
  var btnStart = document.getElementById("video-retard-start");
  var btnFlip = document.getElementById("video-retard-flip");
  var btnMirror = document.getElementById("video-retard-mirror");
  var fillCheckbox = document.getElementById("video-retard-fill");
  var msgEl = document.getElementById("video-retard-msg");
  var adviceEl = document.getElementById("video-retard-advice");
  var warnEl = document.getElementById("video-retard-warn");

  var capaciteAppareil = null;

  var displayCtx = canvasEl && canvasEl.getContext("2d", { alpha: false });
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

  function resizeCanvas() {
    if (!canvasEl) return;
    var stage = canvasEl.parentElement;
    var w = stage ? stage.clientWidth : window.innerWidth;
    var h = stage ? stage.clientHeight : Math.max(200, window.innerHeight * 0.55);
    canvasEl.width = Math.max(1, Math.floor(w));
    canvasEl.height = Math.max(1, Math.floor(h));
  }

  function setupCaptureSize() {
    if (!videoEl || !videoEl.videoWidth) return;
    var vw = videoEl.videoWidth;
    var vh = videoEl.videoHeight;
    var scale = Math.min(1, CAPTURE_MAX_WIDTH / vw);
    captureCanvas.width = Math.max(1, Math.floor(vw * scale));
    captureCanvas.height = Math.max(1, Math.floor(vh * scale));
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
    var cw = canvasEl.width;
    var ch = canvasEl.height;
    var bw = bitmap.width;
    var bh = bitmap.height;
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

    displayCtx.fillStyle = "#0a0a0a";
    displayCtx.fillRect(0, 0, cw, ch);
    displayCtx.drawImage(bitmap, dx, dy, dw, dh);
  }

  function renderLoop() {
    if (!running) return;
    renderId = requestAnimationFrame(renderLoop);

    var now = performance.now();
    var elapsed = now - startedAt;
    var remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 1000));

    if (elapsed < delayMs) {
      setBufferInfo("Tampon en cours… " + remaining + " s", true);
      setStatus("Enregistrement en cours — image retardée bientôt visible.");
      return;
    }

    setBufferInfo("", false);
    setStatus("Image retardée de " + (delayMs / 1000) + " s");

    var frame = pickDelayedFrame(now);
    if (frame && frame.bitmap) drawBitmapCover(frame.bitmap);
  }

  function setControlsActive(active) {
    if (btnFlip) btnFlip.disabled = !active;
    if (btnMirror) btnMirror.disabled = !active;
    if (fillCheckbox) fillCheckbox.disabled = !active;
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
    setControlsActive(false);
    updateStartButton();
    setBufferInfo("", false);
    setStatus("Appuyez sur Démarrer pour activer la caméra.");
    if (displayCtx && canvasEl) {
      displayCtx.fillStyle = "#0a0a0a";
      displayCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    }
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

  if (delayInput) {
    delayInput.addEventListener("input", syncDelayLabel);
  }
  if (btnStart) btnStart.addEventListener("click", toggle);
  if (btnFlip) btnFlip.addEventListener("click", flipCamera);
  if (btnMirror) btnMirror.addEventListener("click", toggleMirror);
  if (fillCheckbox) fillCheckbox.addEventListener("change", function () {});

  window.addEventListener("resize", function () {
    if (running) resizeCanvas();
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
})();
