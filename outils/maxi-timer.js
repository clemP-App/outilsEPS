/**
 * Maxi timer — chrono descendant / croissant plein écran.
 */
(function () {
  "use strict";

  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".maxi-mode__btn"));
  var settingsEl = document.getElementById("maxi-settings");
  var minEl = document.getElementById("maxi-min");
  var secEl = document.getElementById("maxi-sec");
  var labelEl = document.getElementById("maxi-label");
  var timeEl = document.getElementById("maxi-time");
  var btnMain = document.getElementById("maxi-main");
  var btnReset = document.getElementById("maxi-reset");
  var msgEl = document.getElementById("maxi-msg");

  var mode = "down";
  var running = false;
  var paused = false;
  var tickId = null;
  var startedAt = 0;
  var targetEndsAt = 0;
  var pausedRemainingMs = 0;
  var elapsedBeforePauseMs = 0;
  var lastWarnSec = -1;
  var audioCtx = null;
  var wakeLockSentinel = null;

  function montrerMsg(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
  }

  function audioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function unlockAudio() {
    var AC = audioContextClass();
    if (!AC) return Promise.resolve(false);
    if (!audioCtx) audioCtx = new AC();
    return audioCtx.resume().catch(function () {
      return false;
    });
  }

  function beep(longBeep) {
    var AC = audioContextClass();
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var now = audioCtx.currentTime;
    osc.frequency.value = longBeep ? 900 : 700;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (longBeep ? 0.6 : 0.18));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + (longBeep ? 0.65 : 0.22));
  }

  function activerWakeLock() {
    if (!("wakeLock" in navigator) || wakeLockSentinel) return Promise.resolve(false);
    return navigator.wakeLock
      .request("screen")
      .then(function (sentinel) {
        wakeLockSentinel = sentinel;
        sentinel.addEventListener("release", function () {
          if (wakeLockSentinel === sentinel) wakeLockSentinel = null;
        });
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function libererWakeLock() {
    if (!wakeLockSentinel) return;
    var sentinel = wakeLockSentinel;
    wakeLockSentinel = null;
    try {
      sentinel.release();
    } catch (e) {
      /* ignore */
    }
  }

  function majWakeLock() {
    if (running && !paused) activerWakeLock();
    else libererWakeLock();
  }

  function lireDureeMs() {
    var min = parseInt(minEl.value, 10);
    var sec = parseInt(secEl.value, 10);
    if (isNaN(min) || min < 0) min = 0;
    if (isNaN(sec) || sec < 0) sec = 0;
    if (sec > 59) sec = 59;
    return (min * 60 + sec) * 1000;
  }

  function formatTime(ms) {
    var totalSec = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var mm = (m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    if (h > 0) return h + ":" + mm + ":" + ss;
    return mm + ":" + ss;
  }

  function formatElapsedTime(ms) {
    var totalSec = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var mm = (m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    if (h > 0) return h + ":" + mm + ":" + ss;
    return mm + ":" + ss;
  }

  function setMainButton(label, icon) {
    if (!btnMain) return;
    var text = btnMain.querySelector(".btn__text");
    var iconEl = btnMain.querySelector(".btn__icon");
    if (text) text.textContent = label;
    if (iconEl) iconEl.textContent = icon;
  }

  function majAffichage() {
    var displayMs;
    if (mode === "down") {
      displayMs = running ? Math.max(0, targetEndsAt - Date.now()) : lireDureeMs();
      if (labelEl) labelEl.textContent = paused ? "En pause" : running ? "Temps restant" : "Prêt";
    } else {
      displayMs = running ? elapsedBeforePauseMs + (paused ? 0 : Date.now() - startedAt) : 0;
      if (labelEl) labelEl.textContent = paused ? "En pause" : running ? "Temps écoulé" : "Prêt";
    }
    if (timeEl) timeEl.textContent = mode === "up" ? formatElapsedTime(displayMs) : formatTime(displayMs);
    if (settingsEl) settingsEl.hidden = mode !== "down" || running;
    if (!running) setMainButton("Démarrer", "▶");
    else setMainButton(paused ? "Reprendre" : "Pause", paused ? "▶" : "⏸");
  }

  function tick() {
    if (!running || paused) return;
    if (mode === "down") {
      var leftMs = Math.max(0, targetEndsAt - Date.now());
      var secLeft = Math.ceil(leftMs / 1000);
      if (secLeft <= 3 && secLeft > 0 && secLeft !== lastWarnSec) {
        lastWarnSec = secLeft;
        beep(false);
      }
      if (leftMs <= 0) {
        beep(true);
        reset(false);
        montrerMsg("Temps terminé.");
        return;
      }
    }
    majAffichage();
  }

  function startTick() {
    stopTick();
    tickId = setInterval(tick, 100);
  }

  function stopTick() {
    if (tickId) clearInterval(tickId);
    tickId = null;
  }

  function demarrer() {
    montrerMsg("");
    var duration = lireDureeMs();
    if (mode === "down" && duration <= 0) {
      montrerMsg("Réglez une durée supérieure à zéro.");
      return;
    }
    unlockAudio().then(function () {
      running = true;
      paused = false;
      elapsedBeforePauseMs = 0;
      startedAt = Date.now();
      targetEndsAt = Date.now() + duration;
      pausedRemainingMs = duration;
      lastWarnSec = -1;
      majAffichage();
      beep(false);
      startTick();
      majWakeLock();
    });
  }

  function pauseReprendre() {
    if (!running) return;
    if (!paused) {
      paused = true;
      stopTick();
      if (mode === "down") pausedRemainingMs = Math.max(0, targetEndsAt - Date.now());
      else elapsedBeforePauseMs += Date.now() - startedAt;
    } else {
      paused = false;
      startedAt = Date.now();
      if (mode === "down") targetEndsAt = Date.now() + pausedRemainingMs;
      startTick();
    }
    majAffichage();
    majWakeLock();
  }

  function actionPrincipale() {
    if (running) pauseReprendre();
    else demarrer();
  }

  function reset(clearMessage) {
    running = false;
    paused = false;
    stopTick();
    elapsedBeforePauseMs = 0;
    pausedRemainingMs = 0;
    lastWarnSec = -1;
    if (clearMessage !== false) montrerMsg("");
    majAffichage();
    majWakeLock();
  }

  function choisirMode(nextMode) {
    if (running && !confirm("Changer de mode remet le chronomètre à zéro. Continuer ?")) return;
    mode = nextMode === "up" ? "up" : "down";
    modeButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-mode") === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    reset();
  }

  modeButtons.forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.classList.contains("is-active") ? "true" : "false");
    btn.addEventListener("click", function () {
      choisirMode(btn.getAttribute("data-mode"));
    });
  });

  [minEl, secEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", function () {
      if (!running) majAffichage();
    });
    el.addEventListener("change", function () {
      if (!running) majAffichage();
    });
  });

  if (btnMain) btnMain.addEventListener("click", actionPrincipale);
  if (btnReset) btnReset.addEventListener("click", reset);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") majWakeLock();
  });

  majAffichage();
})();
