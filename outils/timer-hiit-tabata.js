/**
 * Timer HIIT / Tabata — boucles travail / pause, bips, raccourcis mémorisés.
 */
(function () {
  "use strict";

  var PRESETS_KEY = "outils_eps_hiit_presets_v1";
  var DECOMPTE_DEPART_SEC = 3;

  var PRESETS_DEFAUT = [
    { id: "tabata", name: "Tabata", work: 20, rest: 10, reps: 8 },
    { id: "hiit-30-15", name: "30 s / 15 s × 6", work: 30, rest: 15, reps: 6 },
    { id: "hiit-40-20", name: "40 s / 20 s × 5", work: 40, rest: 20, reps: 5 },
    { id: "hiit-20-10-10", name: "20 s / 10 s × 10", work: 20, rest: 10, reps: 10 },
    { id: "hiit-45-15", name: "45 s / 15 s × 6", work: 45, rest: 15, reps: 6 },
    { id: "hiit-15-45", name: "15 s / 45 s × 8", work: 15, rest: 45, reps: 8 },
    { id: "emom-60", name: "60 s / 0 s × 10", work: 60, rest: 0, reps: 10 },
  ];

  var cardEl = document.getElementById("hiit-timer-card");
  var phaseLabel = document.getElementById("hiit-phase-label");
  var timeDisplay = document.getElementById("hiit-time-display");
  var roundLabel = document.getElementById("hiit-round-label");
  var accordionReglages = document.getElementById("accordion-hiit-reglages");
  var presetsGrid = document.getElementById("hiit-presets-grid");
  var travailEl = document.getElementById("travail-sec");
  var pauseEl = document.getElementById("pause-sec");
  var repsEl = document.getElementById("repetitions");
  var optBip = document.getElementById("opt-bip");
  var optVibration = document.getElementById("opt-vibration");
  var wrapVibration = document.getElementById("wrap-vibration");
  var msgEl = document.getElementById("hiit-msg");
  var reglagesLockedMsg = document.getElementById("hiit-reglages-locked-msg");
  var btnStart = document.getElementById("btn-start");
  var btnPause = document.getElementById("btn-pause");
  var btnReset = document.getElementById("btn-reset");
  var btnSavePreset = document.getElementById("btn-save-preset");

  var audioCtx = null;
  var htmlBeepEl = null;
  var htmlBeepUrl = null;
  var audioUnlocked = false;
  var tickId = null;
  var phaseEndsAt = 0;
  var pausedRemainingMs = 0;
  var lastWarnSec = -1;

  var session = {
    running: false,
    paused: false,
    phase: "idle",
    round: 0,
    totalRounds: 0,
    workSec: 20,
    restSec: 10,
    countdownSec: DECOMPTE_DEPART_SEC,
  };

  function montrerMsg(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
  }

  function vibrateSupported() {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }

  function initVibrationOption() {
    if (!wrapVibration || !optVibration) return;
    if (!vibrateSupported()) {
      wrapVibration.hidden = true;
      optVibration.checked = false;
    }
  }

  function audioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function estIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function initIosAudioHint() {
    var hint = document.getElementById("hiit-ios-audio-hint");
    if (hint && estIOS()) hint.hidden = false;
  }

  function unlockAudio() {
    var AC = audioContextClass();
    if (!AC) return Promise.resolve(false);
    if (!audioCtx) audioCtx = new AC();
    return audioCtx
      .resume()
      .then(function () {
        try {
          var buf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
          var src = audioCtx.createBufferSource();
          src.buffer = buf;
          src.connect(audioCtx.destination);
          src.start(0);
        } catch (e) {
          /* ignore */
        }
        audioUnlocked = audioCtx.state === "running";
        if (audioUnlocked) prepareHtmlBeep();
        return audioUnlocked;
      })
      .catch(function () {
        audioUnlocked = false;
        return false;
      });
  }

  function playOscBip(freq, durationMs, gain) {
    if (!audioCtx || audioCtx.state !== "running") return false;
    try {
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      var vol = gain || 0.35;
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = vol;
      osc.connect(g);
      g.connect(audioCtx.destination);
      var t0 = audioCtx.currentTime;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);
      osc.start(t0);
      osc.stop(t0 + durationMs / 1000 + 0.02);
      return true;
    } catch (e) {
      return false;
    }
  }

  function bufferToWav(buffer) {
    var ch = buffer.getChannelData(0);
    var len = ch.length;
    var ab = new ArrayBuffer(44 + len * 2);
    var v = new DataView(ab);
    var o = 0;
    function w16(x) {
      v.setUint16(o, x, true);
      o += 2;
    }
    function w32(x) {
      v.setUint32(o, x, true);
      o += 4;
    }
    function ws(s) {
      var i;
      for (i = 0; i < s.length; i++) v.setUint8(o++, s.charCodeAt(i));
    }
    ws("RIFF");
    w32(36 + len * 2);
    ws("WAVEfmt ");
    w32(16);
    w16(1);
    w16(1);
    w32(buffer.sampleRate);
    w32(buffer.sampleRate * 2);
    w16(2);
    w16(16);
    ws("data");
    w32(len * 2);
    var i;
    for (i = 0; i < len; i++) {
      var s = Math.max(-1, Math.min(1, ch[i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
    return ab;
  }

  function prepareHtmlBeep() {
    if (htmlBeepUrl || !audioContextClass()) return Promise.resolve();
    try {
      var sampleRate = 44100;
      var dur = 0.12;
      var n = Math.floor(sampleRate * dur);
      var freq = 880;
      var data = new Float32Array(n);
      var i;
      for (i = 0; i < n; i++) {
        data[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.35;
      }
      var offline = new OfflineAudioContext(1, n, sampleRate);
      var buf = offline.createBuffer(1, n, sampleRate);
      buf.copyToChannel(data, 0);
      var src = offline.createBufferSource();
      src.buffer = buf;
      src.connect(offline.destination);
      src.start(0);
      return offline.startRendering().then(function (rendered) {
        htmlBeepUrl = URL.createObjectURL(new Blob([bufferToWav(rendered)], { type: "audio/wav" }));
      });
    } catch (e) {
      return Promise.resolve();
    }
  }

  /** Secours iOS : lecture via élément audio */
  function bipHtml() {
    if (!htmlBeepUrl) {
      prepareHtmlBeep().then(function () {
        bipHtml();
      });
      return;
    }
    try {
      if (!htmlBeepEl) {
        htmlBeepEl = new Audio();
        htmlBeepEl.setAttribute("playsinline", "");
        htmlBeepEl.preload = "auto";
      }
      htmlBeepEl.src = htmlBeepUrl;
      htmlBeepEl.currentTime = 0;
      htmlBeepEl.play().catch(function () {
        /* ignore */
      });
    } catch (e) {
      /* ignore */
    }
  }

  function bip(freq, durationMs, gain) {
    if (!optBip || !optBip.checked) return;
    var AC = audioContextClass();
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();

    function jouer() {
      if (playOscBip(freq, durationMs, gain)) return;
      bipHtml();
    }

    if (audioCtx.state === "running") {
      jouer();
      return;
    }
    audioCtx.resume().then(jouer).catch(function () {
      bipHtml();
    });
  }

  function vibrate(pattern) {
    if (!optVibration || !optVibration.checked) return;
    if (!vibrateSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      /* ignore */
    }
  }

  /** 3, 2, 1 avant la fin d’un effort ou d’une pause */
  function bipAvertissement() {
    bip(920, 100, 0.3);
    vibrate(35);
  }

  /** Décompte initial (avant la 1re série) */
  function bipDecompteDepart() {
    bip(780, 130, 0.32);
    vibrate(45);
  }

  /** Fin du décompte initial → début du travail */
  function bipDepart() {
    bip(520, 120, 0.35);
    setTimeout(function () {
      bip(1100, 350, 0.42);
    }, 150);
    vibrate([100, 50, 180]);
  }

  /** Fin de l’effort → pause ou fin de séance */
  function bipFinEffort() {
    bip(380, 420, 0.45);
    setTimeout(function () {
      bip(520, 180, 0.35);
    }, 220);
    vibrate([120, 60, 200]);
  }

  /** Fin de la pause → effort suivant */
  function bipFinPause() {
    bip(620, 160, 0.38);
    setTimeout(function () {
      bip(980, 280, 0.4);
    }, 200);
    vibrate([80, 80, 160]);
  }

  function bipTermine() {
    bip(880, 200, 0.35);
    setTimeout(function () {
      bip(880, 200, 0.35);
    }, 280);
    vibrate([200, 100, 200]);
  }

  function lireEntier(el, min, max, def) {
    if (!el) return def;
    var n = parseInt(el.value, 10);
    if (isNaN(n)) return def;
    return Math.max(min, Math.min(max, n));
  }

  function lireConfig() {
    return {
      work: lireEntier(travailEl, 1, 3600, 20),
      rest: lireEntier(pauseEl, 0, 3600, 10),
      reps: lireEntier(repsEl, 1, 99, 8),
    };
  }

  function configsIdentiques(a, b) {
    return a.work === b.work && a.rest === b.rest && a.reps === b.reps;
  }

  function chargerPresetsPerso() {
    try {
      var raw = localStorage.getItem(PRESETS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function sauverPresetsPerso(liste) {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(liste));
    } catch (e) {
      montrerMsg("Impossible d’enregistrer le raccourci (stockage plein ?).");
    }
  }

  function tousLesPresets() {
    return PRESETS_DEFAUT.concat(chargerPresetsPerso());
  }

  function estPresetPerso(p) {
    if (!p || !p.id) return false;
    var i;
    for (i = 0; i < PRESETS_DEFAUT.length; i++) {
      if (PRESETS_DEFAUT[i].id === p.id) return false;
    }
    return true;
  }

  function retirerPreset(id) {
    if (session.running && session.phase !== "idle" && session.phase !== "done") return;
    var perso = chargerPresetsPerso();
    var reste = perso.filter(function (p) {
      return p.id !== id;
    });
    if (reste.length === perso.length) return;
    if (!window.confirm("Retirer ce raccourci des réglages ?")) return;
    sauverPresetsPerso(reste);
    renderPresets();
    majBoutonMemoriser();
    montrerMsg("Raccourci retiré.");
    setTimeout(function () {
      montrerMsg("");
    }, 2500);
  }

  function appliquerPreset(p) {
    if (session.running && session.phase !== "idle" && session.phase !== "done") return;
    if (travailEl) travailEl.value = String(p.work);
    if (pauseEl) pauseEl.value = String(p.rest);
    if (repsEl) repsEl.value = String(p.reps);
    majBoutonMemoriser();
    montrerMsg("");
  }

  function renderPresets() {
    if (!presetsGrid) return;
    presetsGrid.innerHTML = "";
    tousLesPresets().forEach(function (p) {
      var wrap = document.createElement("div");
      wrap.className = "hiit-preset-item";

      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn--ghost hiit-preset-btn";
      b.textContent = p.name;
      b.setAttribute("data-preset-id", p.id);
      b.addEventListener("click", function () {
        appliquerPreset(p);
      });
      wrap.appendChild(b);

      if (estPresetPerso(p)) {
        var del = document.createElement("button");
        del.type = "button";
        del.className = "btn btn--danger btn--small btn--icon-only hiit-preset-remove";
        del.setAttribute("aria-label", "Retirer le raccourci " + p.name);
        del.textContent = "×";
        del.addEventListener("click", function (e) {
          e.stopPropagation();
          retirerPreset(p.id);
        });
        wrap.appendChild(del);
      }

      presetsGrid.appendChild(wrap);
    });
  }

  function correspondAPresetExistant(cfg) {
    var i;
    var all = tousLesPresets();
    for (i = 0; i < all.length; i++) {
      if (configsIdentiques(cfg, all[i])) return true;
    }
    return false;
  }

  function majBoutonMemoriser() {
    if (!btnSavePreset) return;
    if (session.running && session.phase !== "idle" && session.phase !== "done") {
      btnSavePreset.hidden = true;
      return;
    }
    var cfg = lireConfig();
    btnSavePreset.hidden = correspondAPresetExistant(cfg);
  }

  function memoriserReglage() {
    var cfg = lireConfig();
    if (correspondAPresetExistant(cfg)) {
      majBoutonMemoriser();
      return;
    }
    var nom = window.prompt(
      "Nom du raccourci (ex. Mon circuit 25/10) :",
      cfg.work + " s / " + cfg.rest + " s × " + cfg.reps
    );
    if (nom === null) return;
    nom = (nom || "").trim();
    if (!nom) {
      montrerMsg("Donnez un nom au raccourci.");
      return;
    }
    var perso = chargerPresetsPerso();
    var id = "custom_" + Date.now();
    perso.push({ id: id, name: nom, work: cfg.work, rest: cfg.rest, reps: cfg.reps });
    sauverPresetsPerso(perso);
    renderPresets();
    majBoutonMemoriser();
    montrerMsg("Raccourci enregistré : " + nom);
    setTimeout(function () {
      montrerMsg("");
    }, 3000);
  }

  function formaterTemps(sec) {
    var s = Math.max(0, Math.ceil(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }

  function setCardPhase(phase) {
    if (!cardEl) return;
    cardEl.className =
      "card hiit-timer-card hiit-timer-card--" +
      phase +
      (session.paused ? " hiit-timer-card--paused" : "");
  }

  function majBoutons() {
    if (!btnStart || !btnPause) return;
    var actif = session.running && !session.paused && session.phase !== "idle" && session.phase !== "done";
    btnStart.hidden = actif;
    btnPause.hidden = !session.running || session.phase === "idle" || session.phase === "done";
    var txt = btnPause.querySelector(".btn__text");
    var ic = btnPause.querySelector(".btn__icon");
    if (txt) txt.textContent = session.paused ? "Reprendre" : "Pause";
    if (ic) ic.textContent = session.paused ? "▶" : "⏸";
  }

  function fermerAccordionReglages() {
    if (accordionReglages) accordionReglages.open = false;
  }

  function ouvrirAccordionReglages() {
    if (accordionReglages) accordionReglages.open = true;
  }

  function reglagesSontVerrouilles() {
    return session.running || session.phase !== "idle";
  }

  function messageReglagesVerrouilles() {
    if (session.paused) {
      return "Réglages verrouillés (chrono en pause). Réinitialisez pour modifier les réglages.";
    }
    if (session.running) {
      return "Réglages verrouillés : le chrono tourne. Réinitialisez pour modifier les réglages.";
    }
    if (session.phase === "done") {
      return "Réglages verrouillés : le chrono n’est pas à zéro. Réinitialisez pour modifier les réglages.";
    }
    return "Réglages verrouillés. Réinitialisez pour modifier les réglages.";
  }

  function majEtatReglages() {
    if (!accordionReglages) return;
    var lock = reglagesSontVerrouilles();
    accordionReglages.querySelectorAll("input, select, button").forEach(function (el) {
      el.disabled = lock;
    });
    if (reglagesLockedMsg) {
      if (lock) {
        reglagesLockedMsg.hidden = false;
        reglagesLockedMsg.textContent = messageReglagesVerrouilles();
      } else {
        reglagesLockedMsg.hidden = true;
        reglagesLockedMsg.textContent = "";
      }
    }
    if (lock) {
      if (btnSavePreset) btnSavePreset.hidden = true;
    } else {
      majBoutonMemoriser();
    }
  }

  function resetWarnState() {
    lastWarnSec = -1;
    if (timeDisplay) {
      timeDisplay.classList.remove("hiit-time--warn", "hiit-time--countdown");
    }
  }

  function afficherIdle() {
    session.phase = "idle";
    session.running = false;
    session.paused = false;
    phaseLabel.textContent = "Prêt";
    timeDisplay.textContent = "00:00";
    roundLabel.textContent = "Série 0 / " + (repsEl ? repsEl.value : "0");
    resetWarnState();
    setCardPhase("idle");
    majBoutons();
    ouvrirAccordionReglages();
    majEtatReglages();
    arreterTick();
  }

  function afficherUi() {
    var cfg = session;
    roundLabel.textContent = "Série " + cfg.round + " / " + cfg.totalRounds;

    if (cfg.phase === "countdown") {
      phaseLabel.textContent = "Départ dans…";
      var cLeft = Math.max(1, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      timeDisplay.textContent = String(cLeft);
      timeDisplay.classList.add("hiit-time--countdown");
      timeDisplay.classList.remove("hiit-time--warn");
      setCardPhase("countdown");
    } else if (cfg.phase === "work") {
      phaseLabel.textContent = "Travail";
      var wLeft = Math.max(0, (phaseEndsAt - Date.now()) / 1000);
      timeDisplay.textContent = formaterTemps(wLeft);
      timeDisplay.classList.remove("hiit-time--countdown");
      if (wLeft <= 3 && wLeft > 0) {
        timeDisplay.classList.add("hiit-time--warn");
      } else {
        timeDisplay.classList.remove("hiit-time--warn");
      }
      setCardPhase("work");
    } else if (cfg.phase === "rest") {
      phaseLabel.textContent = "Pause";
      var rLeft = Math.max(0, (phaseEndsAt - Date.now()) / 1000);
      timeDisplay.textContent = formaterTemps(rLeft);
      timeDisplay.classList.remove("hiit-time--countdown");
      if (rLeft <= 3 && rLeft > 0) {
        timeDisplay.classList.add("hiit-time--warn");
      } else {
        timeDisplay.classList.remove("hiit-time--warn");
      }
      setCardPhase("rest");
    } else if (cfg.phase === "done") {
      phaseLabel.textContent = "Terminé !";
      timeDisplay.textContent = "00:00";
      resetWarnState();
      setCardPhase("done");
    }
    majBoutons();
  }

  function demarrerPhase(phase, dureeMs) {
    session.phase = phase;
    phaseEndsAt = Date.now() + dureeMs;
    resetWarnState();
    if (phase === "countdown") {
      lastWarnSec = Math.max(1, Math.ceil(dureeMs / 1000));
      bipDecompteDepart();
    }
    afficherUi();
  }

  function demarrerTravail() {
    demarrerPhase("work", session.workSec * 1000);
  }

  function demarrerPause() {
    if (session.restSec <= 0) {
      serieSuivante();
      return;
    }
    demarrerPhase("rest", session.restSec * 1000);
  }

  function terminer() {
    session.phase = "done";
    session.running = false;
    bipTermine();
    afficherUi();
    majBoutons();
    ouvrirAccordionReglages();
    majEtatReglages();
    arreterTick();
  }

  function serieSuivante() {
    if (session.round >= session.totalRounds) {
      terminer();
      return;
    }
    session.round += 1;
    demarrerTravail();
  }

  function onPhaseTerminee() {
    if (session.phase === "countdown") {
      demarrerTravail();
    } else if (session.phase === "work") {
      if (session.round >= session.totalRounds) {
        terminer();
      } else {
        demarrerPause();
      }
    } else if (session.phase === "rest") {
      serieSuivante();
    }
  }

  function gererBipsTick(secLeft) {
    if (session.phase === "countdown") {
      if (secLeft > 0 && secLeft < lastWarnSec) {
        lastWarnSec = secLeft;
        bipDecompteDepart();
      }
      return;
    }
    if (session.phase === "work" || session.phase === "rest") {
      if (secLeft <= 3 && secLeft > 0 && secLeft !== lastWarnSec) {
        lastWarnSec = secLeft;
        bipAvertissement();
      }
    }
  }

  function tick() {
    if (!session.running || session.paused) return;
    var leftMs = phaseEndsAt - Date.now();
    var secLeft = Math.ceil(leftMs / 1000);

    if (leftMs > 0) {
      gererBipsTick(secLeft);
    }

    afficherUi();

    if (leftMs <= 0) {
      if (session.phase === "countdown") {
        bipDepart();
      } else if (session.phase === "work") {
        bipFinEffort();
      } else if (session.phase === "rest") {
        bipFinPause();
      }
      resetWarnState();
      onPhaseTerminee();
    }
  }

  function demarrerTick() {
    arreterTick();
    tickId = window.setInterval(tick, 100);
  }

  function arreterTick() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function demarrerSession() {
    var cfg = lireConfig();
    session = {
      running: true,
      paused: false,
      phase: "idle",
      round: 1,
      totalRounds: cfg.reps,
      workSec: cfg.work,
      restSec: cfg.rest,
      countdownSec: DECOMPTE_DEPART_SEC,
    };
    fermerAccordionReglages();
    majBoutons();
    demarrerPhase("countdown", DECOMPTE_DEPART_SEC * 1000);
    majEtatReglages();
    demarrerTick();
  }

  function demarrer() {
    montrerMsg("");
    var cfg = lireConfig();
    if (cfg.work < 1) {
      montrerMsg("Le temps de travail doit être d’au moins 1 seconde.");
      return;
    }
    unlockAudio().then(function () {
      demarrerSession();
    });
  }

  function pauseReprendre() {
    if (!session.running || session.phase === "done") return;
    if (!session.paused) {
      session.paused = true;
      pausedRemainingMs = Math.max(0, phaseEndsAt - Date.now());
      arreterTick();
      setCardPhase(session.phase);
      majBoutons();
      majEtatReglages();
    } else {
      unlockAudio().then(function () {
        session.paused = false;
        phaseEndsAt = Date.now() + pausedRemainingMs;
        fermerAccordionReglages();
        demarrerTick();
        afficherUi();
        majEtatReglages();
      });
    }
  }

  function reinitialiser() {
    arreterTick();
    if (vibrateSupported()) {
      try {
        navigator.vibrate(0);
      } catch (e) {
        /* ignore */
      }
    }
    afficherIdle();
  }

  function bindAudioUnlock() {
    var once = function () {
      unlockAudio();
      document.removeEventListener("touchend", once, true);
      document.removeEventListener("click", once, true);
    };
    document.addEventListener("touchend", once, true);
    document.addEventListener("click", once, true);
  }

  if (accordionReglages) {
    accordionReglages.addEventListener("toggle", function () {
      if (accordionReglages.open) majEtatReglages();
    });
  }

  bindAudioUnlock();
  initIosAudioHint();

  if (btnStart) btnStart.addEventListener("click", demarrer);
  if (btnPause) btnPause.addEventListener("click", pauseReprendre);
  if (btnReset) btnReset.addEventListener("click", reinitialiser);
  if (btnSavePreset) btnSavePreset.addEventListener("click", memoriserReglage);

  [travailEl, pauseEl, repsEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", majBoutonMemoriser);
    el.addEventListener("change", majBoutonMemoriser);
  });

  renderPresets();
  initVibrationOption();
  afficherIdle();
})();
