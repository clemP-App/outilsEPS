/**
 * Table de marque — deux scores, annulation du dernier point et timer.
 */
(function () {
  "use strict";

  var minEl = document.getElementById("table-min");
  var secEl = document.getElementById("table-sec");
  var scoreLeftEl = document.getElementById("score-left");
  var scoreRightEl = document.getElementById("score-right");
  var nameLeftEl = document.getElementById("team-left-name");
  var nameRightEl = document.getElementById("team-right-name");
  var colorLeftEl = document.getElementById("team-left-color");
  var colorRightEl = document.getElementById("team-right-color");
  var timeEl = document.getElementById("table-time");
  var labelEl = document.getElementById("table-timer-label");
  var msgEl = document.getElementById("table-msg");
  var btnTimer = document.getElementById("table-timer-main");
  var btnResetTimer = document.getElementById("table-reset-timer");
  var btnResetScores = document.getElementById("table-reset-scores");
  var reglagesEl = document.getElementById("table-reglages");

  var scores = { left: 0, right: 0 };
  var running = false;
  var paused = false;
  var tickId = null;
  var endsAt = 0;
  var pausedRemainingMs = 0;
  var wakeLockSentinel = null;
  var lastWarnSec = -1;
  var audioCtx = null;

  function montrerMsg(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
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

  function setTimerButton(label, icon) {
    if (!btnTimer) return;
    var txt = btnTimer.querySelector(".btn__text");
    var ic = btnTimer.querySelector(".btn__icon");
    if (txt) txt.textContent = label;
    if (ic) ic.textContent = icon;
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

  function beep(kind) {
    var AC = audioContextClass();
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var now = audioCtx.currentTime;
    var duration = kind === "final" ? 0.65 : kind === "start" ? 0.3 : 0.2;
    osc.frequency.value = kind === "final" ? 920 : kind === "start" ? 520 : 700;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
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

  function render() {
    if (scoreLeftEl) scoreLeftEl.textContent = String(scores.left);
    if (scoreRightEl) scoreRightEl.textContent = String(scores.right);
    appliquerCouleur("left");
    appliquerCouleur("right");

    var leftMs = running ? Math.max(0, endsAt - Date.now()) : lireDureeMs();
    if (timeEl) timeEl.textContent = formatTime(paused ? pausedRemainingMs : leftMs);
    if (labelEl) labelEl.textContent = paused ? "En pause" : running ? "Temps restant" : "Prêt";
    setTimerButton(running ? (paused ? "Reprendre" : "Pause") : "Démarrer", running && !paused ? "⏸" : "▶");
  }

  function couleurPour(team) {
    var el = team === "left" ? colorLeftEl : colorRightEl;
    return el && el.value ? el.value : team === "left" ? "#0d9488" : "#6366f1";
  }

  function appliquerCouleur(team) {
    var card = document.querySelector('[data-team-card="' + team + '"]');
    if (!card) return;
    card.style.setProperty("--team-color", couleurPour(team));
  }

  function tick() {
    if (!running || paused) return;
    var leftMs = Math.max(0, endsAt - Date.now());
    var secLeft = Math.ceil(leftMs / 1000);
    render();
    if (secLeft <= 3 && secLeft > 0 && secLeft !== lastWarnSec) {
      lastWarnSec = secLeft;
      beep("warn");
    }
    if (leftMs <= 0) {
      beep("final");
      running = false;
      paused = false;
      stopTick();
      montrerMsg("Temps terminé.");
      render();
      majWakeLock();
    }
  }

  function startTick() {
    stopTick();
    tickId = setInterval(tick, 100);
  }

  function stopTick() {
    if (tickId) clearInterval(tickId);
    tickId = null;
  }

  function demarrerTimer() {
    montrerMsg("");
    var duree = lireDureeMs();
    if (duree <= 0) {
      montrerMsg("Réglez une durée supérieure à zéro.");
      return;
    }
    unlockAudio().then(function () {
      running = true;
      paused = false;
      endsAt = Date.now() + duree;
      pausedRemainingMs = duree;
      lastWarnSec = -1;
      if (reglagesEl) reglagesEl.open = false;
      render();
      beep("start");
      startTick();
      majWakeLock();
    });
  }

  function pauseReprendreTimer() {
    if (!running) return;
    if (!paused) {
      paused = true;
      pausedRemainingMs = Math.max(0, endsAt - Date.now());
      stopTick();
    } else {
      paused = false;
      endsAt = Date.now() + pausedRemainingMs;
      lastWarnSec = -1;
      startTick();
    }
    render();
    majWakeLock();
  }

  function actionTimer() {
    if (running) pauseReprendreTimer();
    else demarrerTimer();
  }

  function ajouterPoint(team) {
    if (team !== "left" && team !== "right") return;
    scores[team]++;
    render();
  }

  function retirerPoint(team) {
    if (team !== "left" && team !== "right") return;
    scores[team] = Math.max(0, scores[team] - 1);
    render();
  }

  function remiseAZeroTimer() {
    running = false;
    paused = false;
    pausedRemainingMs = 0;
    lastWarnSec = -1;
    stopTick();
    montrerMsg("");
    render();
    majWakeLock();
  }

  function effacerScores() {
    if ((scores.left || scores.right) && !confirm("Effacer les scores des deux équipes ?")) return;
    scores.left = 0;
    scores.right = 0;
    render();
  }

  document.querySelectorAll(".table-score-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      ajouterPoint(btn.getAttribute("data-team"));
    });
  });

  document.querySelectorAll(".table-minus-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      retirerPoint(btn.getAttribute("data-team"));
    });
  });

  [colorLeftEl, colorRightEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  [minEl, secEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", function () {
      if (!running) render();
    });
    el.addEventListener("change", function () {
      if (!running) render();
    });
  });

  if (btnTimer) btnTimer.addEventListener("click", actionTimer);
  if (btnResetTimer) btnResetTimer.addEventListener("click", remiseAZeroTimer);
  if (btnResetScores) btnResetScores.addEventListener("click", effacerScores);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") majWakeLock();
  });

  render();
})();
