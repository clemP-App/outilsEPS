/**
 * Test VMA — Gacon 45/15, Luc Léger, VAMEVAL et demi-Cooper.
 */
(function () {
  "use strict";

  var TESTS = {
    gacon: {
      label: "45-15 Gacon",
      kind: "interval",
      startSpeed: 8,
      speedStep: 0.5,
      periodSec: 45,
      restSec: 15,
      phaseLabel: "Course",
      distanceLabel: "Début",
      text:
        "Le Gacon 45-15 alterne 45 secondes de course et 15 secondes de récupération. À chaque palier, la vitesse augmente de 0,5 km/h. Le test se fait en aller-retour.",
      points: [
        "Placez une ligne de départ, puis les plots à la distance indiquée par l’outil.",
        "À 8 km/h, le plot est à 100 m. Chaque +0,5 km/h ajoute 6,25 m : 106,25 m, 112,5 m, 118,75 m, etc.",
        "Les élèves font des allers-retours : au bip de fin des 45 s, ils doivent atteindre le plot du palier, puis récupèrent 15 s avant de repartir dans l’autre sens.",
        "Aide placement : si vous n’avez pas toute la longueur, gardez le principe aller-retour et matérialisez clairement les zones de retournement.",
      ],
    },
    navette: {
      label: "Navette Luc Léger",
      kind: "shuttle",
      startSpeed: 8,
      speedStep: 0.5,
      levelSec: 60,
      shuttleMeters: 20,
      phaseLabel: "Navette",
      distanceLabel: "Distance",
      text:
        "Le Luc Léger navette se fait sur 20 m. Les élèves partent au bip, changent de ligne à chaque bip et la vitesse augmente à chaque palier.",
      points: [
        "Placez deux lignes distantes de 20 m.",
        "Le chrono indique le temps restant avant le prochain demi-tour.",
        "La durée réelle du palier dépend du nombre entier de navettes à réaliser : elle peut donc être légèrement différente d’1 minute.",
      ],
    },
    progressif: {
      label: "Progressif Luc Léger",
      kind: "progressive",
      startSpeed: 7,
      speedStep: 1,
      periodSec: 120,
      plotMeters: 50,
      phaseLabel: "Palier progressif",
      distanceLabel: "Plots",
      text:
        "Le test progressif Luc Léger se fait avec des plots tous les 50 m. La vitesse augmente de 1 km/h à chaque nouveau palier.",
      points: [
        "Le chrono principal indique le temps restant dans le palier. Sa durée est calculée avec un nombre entier de plots de 50 m : elle peut donc être légèrement différente de 2 minutes.",
        "Le chrono “prochain plot” indique le temps restant pour rejoindre le prochain plot de 50 m : c’est le repère le plus important pendant le test.",
        "Modifiez la vitesse de départ si votre protocole commence à un autre palier.",
      ],
    },
    vameval: {
      label: "VAMEVAL",
      kind: "plot",
      startSpeed: 8,
      speedStep: 0.5,
      levelSec: 60,
      plotMeters: 20,
      phaseLabel: "Palier VAMEVAL",
      distanceLabel: "Plots",
      text:
        "Le VAMEVAL est un test progressif continu avec des plots placés tous les 20 m. Les élèves doivent être au plot au moment du bip.",
      points: [
        "Placez les plots tous les 20 m sur la piste ou le parcours.",
        "La vitesse augmente progressivement, ici de 0,5 km/h par minute.",
        "Le chrono “prochain plot” donne le temps restant avant le prochain passage au plot.",
      ],
    },
    "demi-cooper": {
      label: "Demi-Cooper",
      kind: "cooper",
      startSpeed: 10,
      speedStep: 0,
      periodSec: 360,
      phaseLabel: "Course 6 minutes",
      distanceLabel: "Correspondance",
      text:
        "Le demi-Cooper consiste à courir la plus grande distance possible en 6 minutes. La VMA estimée correspond simplement à la distance parcourue divisée par 100.",
      points: [
        "Exemple : 1500 m en 6 minutes correspond à environ 15 km/h de VMA.",
        "Saisissez directement la distance réalisée en 6 minutes pour obtenir la correspondance.",
        "Formule : VMA (km/h) = distance en mètres ÷ 100.",
      ],
    },
  };

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".vma-tab"));
  var explicationEl = document.getElementById("vma-explication");
  var titreExplication = document.getElementById("vma-explication-titre");
  var texteExplication = document.getElementById("vma-explication-texte");
  var pointsExplication = document.getElementById("vma-explication-points");
  var vitesseDepartEl = document.getElementById("vma-vitesse-depart");
  var reglagesHintEl = document.getElementById("vma-reglages-hint");
  var reglagesChronoEl = document.getElementById("vma-reglages-chrono");
  var reglagesDemiCooperEl = document.getElementById("vma-reglages-demi-cooper");
  var distanceDemiCooperEl = document.getElementById("vma-distance-demi-cooper");
  var resultatDemiCooperEl = document.getElementById("vma-demi-cooper-resultat");
  var chronoSectionEl = document.getElementById("vma-chrono-section");
  var infosSectionEl = document.getElementById("vma-infos-section");
  var phaseEl = document.getElementById("vma-phase");
  var timeLabelEl = document.getElementById("vma-time-label");
  var timeEl = document.getElementById("vma-time");
  var plotTimerEl = document.getElementById("vma-plot-timer");
  var plotTimeEl = document.getElementById("vma-plot-time");
  var palierEl = document.getElementById("vma-palier");
  var vitesseEl = document.getElementById("vma-vitesse");
  var distanceLabelEl = document.getElementById("vma-distance-label");
  var distanceEl = document.getElementById("vma-distance");
  var consigneLabelEl = document.getElementById("vma-consigne-label");
  var consigneEl = document.getElementById("vma-consigne");
  var msgEl = document.getElementById("vma-msg");
  var btnStart = document.getElementById("vma-start");
  var btnReset = document.getElementById("vma-reset");

  var currentTest = "gacon";
  var tickId = null;
  var phaseEndsAt = 0;
  var levelEndsAt = 0;
  var pausedRemainingMs = 0;
  var pausedLevelRemainingMs = 0;
  var lastBeepSecond = -1;
  var lastAnnouncedPalier = null;
  var wakeLockSentinel = null;
  var audioCtx = null;

  var state = {
    running: false,
    paused: false,
    phase: "idle",
    palier: 1,
    elapsedInLevel: 0,
    shuttle: 1,
    plot: 1,
    reperesRestants: 0,
  };

  function montrerMsg(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
  }

  function formatSpeed(v) {
    var rounded = Math.round(v * 10) / 10;
    return String(rounded).replace(".", ",");
  }

  function formatDistance(m) {
    var rounded = Math.round(m * 100) / 100;
    var text = rounded % 1 === 0 ? String(rounded) : String(rounded).replace(".", ",");
    return text + " m";
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.ceil(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
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
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var now = audioCtx.currentTime;
    osc.frequency.value = longBeep ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (longBeep ? 0.45 : 0.18));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + (longBeep ? 0.5 : 0.2));
  }

  function annoncerPalier() {
    if (!("speechSynthesis" in window)) return;
    if (lastAnnouncedPalier === state.palier && state.phase !== "idle") return;
    lastAnnouncedPalier = state.palier;
    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(
        "Palier " + state.palier + ", " + formatSpeed(vitessePourPalier(state.palier)) + " kilomètres heure"
      );
      utterance.lang = "fr-FR";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      /* ignore */
    }
  }

  function chronoActifPourVeille() {
    return state.running && !state.paused;
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
    if (chronoActifPourVeille()) {
      activerWakeLock();
    } else {
      libererWakeLock();
    }
  }

  function setStartButton(label, icon) {
    if (!btnStart) return;
    var text = btnStart.querySelector(".btn__text");
    var iconEl = btnStart.querySelector(".btn__icon");
    if (text) text.textContent = label;
    if (iconEl) iconEl.textContent = icon;
  }

  function lireVitesseDepart() {
    var cfg = TESTS[currentTest];
    var value = parseFloat(String(vitesseDepartEl.value).replace(",", "."));
    if (!value || value <= 0) return cfg.startSpeed;
    return value;
  }

  function lirePalierDepart() {
    return 1;
  }

  function vitessePourPalier(palier) {
    var cfg = TESTS[currentTest];
    return lireVitesseDepart() + (palier - 1) * cfg.speedStep;
  }

  function distanceGacon(speed) {
    return (speed * 1000 * 45) / 3600;
  }

  function palierInfos() {
    if (currentTest === "gacon" && state.phase === "rest") return state.palier + 1;
    return state.palier;
  }

  function plotGacon(palier) {
    var distance = formatDistance(distanceGacon(vitessePourPalier(palier)));
    if (palier % 2 === 0) {
      return {
        debut: "Plot " + palier + " (" + distance + ")",
        arrivee: "Plot 0 (départ)",
      };
    }
    return {
      debut: "Plot 0 (départ)",
      arrivee: "Plot " + palier + " (" + distance + ")",
    };
  }

  function distanceProgressif(speed) {
    return (speed * 1000 * 120) / 3600;
  }

  function dureePlot(speed, meters) {
    return (meters / (speed * 1000)) * 3600;
  }

  function dureeNavette(speed) {
    return (TESTS.navette.shuttleMeters / (speed * 1000)) * 3600;
  }

  function dureeReperePalier(palier) {
    var speed = vitessePourPalier(palier);
    if (currentTest === "navette") return dureeNavette(speed);
    if (currentTest === "progressif") return dureePlot(speed, TESTS.progressif.plotMeters);
    if (currentTest === "vameval") return dureePlot(speed, TESTS.vameval.plotMeters);
    return dureePhaseCourante();
  }

  function dureeNominalePalier() {
    if (currentTest === "navette") return TESTS.navette.levelSec;
    if (currentTest === "progressif") return TESTS.progressif.periodSec;
    if (currentTest === "vameval") return TESTS.vameval.levelSec;
    return dureePhaseCourante();
  }

  function totalReperesPourPalier(palier) {
    var unitSec = dureeReperePalier(palier);
    if (!unitSec) return 0;
    return Math.max(1, Math.round(dureeNominalePalier() / unitSec));
  }

  function dureeReellePalier(palier) {
    return totalReperesPourPalier(palier) * dureeReperePalier(palier);
  }

  function totalReperesPalier() {
    return totalReperesPourPalier(state.palier);
  }

  function reperesRestantsPalier() {
    if (!state.running) return totalReperesPalier();
    return Math.max(0, state.reperesRestants);
  }

  function progressionReperesPalier(typeSingulier, typePluriel) {
    var total = totalReperesPalier();
    var restants = reperesRestantsPalier();
    var label = total > 1 ? typePluriel : typeSingulier;
    return restants + " sur " + total + " " + label;
  }

  function dureePhaseCourante() {
    var cfg = TESTS[currentTest];
    var speed = vitessePourPalier(state.palier);
    if (currentTest === "demi-cooper" && distanceDemiCooperEl && distanceDemiCooperEl.value) {
      var distanceCooper = parseFloat(String(distanceDemiCooperEl.value).replace(",", "."));
      if (distanceCooper > 0) speed = distanceCooper / 100;
    }
    if (currentTest === "navette") return dureeNavette(speed);
    if (currentTest === "progressif" || currentTest === "vameval") return dureeReperePalier(state.palier);
    if (cfg.kind === "plot") return dureePlot(speed, cfg.plotMeters);
    if (currentTest === "gacon" && state.phase === "rest") return cfg.restSec;
    return cfg.periodSec;
  }

  function consigneCourante(speed) {
    if (currentTest === "gacon") {
      if (state.phase === "rest") return "Récupération 15 s";
      return plotGacon(palierInfos()).arrivee;
    }
    if (currentTest === "navette") {
      return progressionReperesPalier("navette", "navettes");
    }
    if (currentTest === "progressif") {
      return progressionReperesPalier("plot", "plots");
    }
    if (currentTest === "vameval") {
      return progressionReperesPalier("plot", "plots");
    }
    if (currentTest === "demi-cooper") {
      return "Courir 6 min puis noter la distance";
    }
    return "Tenir l’allure pendant 2 min";
  }

  function majInfos() {
    var cfg = TESTS[currentTest];
    var infoPalier = palierInfos();
    var speed = vitessePourPalier(infoPalier);
    var distanceText;
    if (currentTest === "gacon") {
      distanceText = plotGacon(infoPalier).debut;
    } else if (currentTest === "navette") {
      distanceText = "20 m";
    } else if (currentTest === "progressif") {
      distanceText = "50 m · plot " + state.plot;
    } else if (currentTest === "vameval") {
      distanceText = "20 m · plot " + state.plot;
    } else if (currentTest === "demi-cooper") {
      distanceText = distanceDemiCooperEl && distanceDemiCooperEl.value ? vmaDemiCooperTexte() : "Distance ÷ 100";
    } else {
      distanceText = formatDistance(distanceProgressif(speed));
    }

    if (palierEl) palierEl.textContent = String(infoPalier);
    if (vitesseEl) {
      vitesseEl.textContent =
        currentTest === "demi-cooper" && (!distanceDemiCooperEl || !distanceDemiCooperEl.value)
          ? "—"
          : formatSpeed(speed);
    }
    if (distanceLabelEl) distanceLabelEl.textContent = cfg.distanceLabel;
    if (consigneLabelEl) {
      consigneLabelEl.textContent =
        currentTest === "gacon"
          ? "Arrivée"
          : currentTest === "navette" || currentTest === "progressif" || currentTest === "vameval"
            ? "Restants sur ce palier"
            : "À faire";
    }
    if (distanceEl) distanceEl.textContent = distanceText;
    if (consigneEl) consigneEl.textContent = consigneCourante(speed);
  }

  function majChronoAffichage(remainingSec) {
    var cfg = TESTS[currentTest];
    var label = cfg.phaseLabel;
    if (currentTest === "gacon" && state.phase === "rest") label = "Récupération";
    if (phaseEl) phaseEl.textContent = label;
    if (timeLabelEl) {
      timeLabelEl.textContent =
        currentTest === "progressif" || currentTest === "vameval"
          ? "Temps restant du palier"
          : "Temps restant";
    }
    if (timeEl) timeEl.textContent = formatTime(remainingSec);
  }

  function majPlotTimer() {
    var cfg = TESTS[currentTest];
    var show = state.running && !state.paused && (currentTest === "progressif" || cfg.kind === "plot");
    if (plotTimerEl) plotTimerEl.hidden = !show;
    if (!show || !plotTimeEl) return;
    var endAt = levelEndsAt ? Math.min(phaseEndsAt, levelEndsAt) : phaseEndsAt;
    plotTimeEl.textContent = formatTime(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
  }

  function majChronos(phaseRemainingSec) {
    if (currentTest === "progressif" || currentTest === "vameval") {
      majChronoAffichage(Math.max(0, Math.ceil((levelEndsAt - Date.now()) / 1000)));
    } else {
      majChronoAffichage(phaseRemainingSec);
    }
    majPlotTimer();
  }

  function majExplication() {
    var cfg = TESTS[currentTest];
    if (titreExplication) titreExplication.textContent = cfg.label;
    if (texteExplication) texteExplication.textContent = cfg.text;
    if (pointsExplication) {
      pointsExplication.innerHTML = "";
      cfg.points.forEach(function (point) {
        var li = document.createElement("li");
        li.textContent = point;
        pointsExplication.appendChild(li);
      });
    }
    if (reglagesHintEl) {
      if (cfg.kind === "cooper") {
        reglagesHintEl.textContent = "";
      } else {
        reglagesHintEl.textContent =
          "Valeur par défaut : " +
          formatSpeed(cfg.startSpeed) +
          " km/h, puis +" +
          formatSpeed(cfg.speedStep) +
          " km/h par palier.";
      }
    }
    if (reglagesChronoEl) reglagesChronoEl.hidden = cfg.kind === "cooper";
    if (reglagesDemiCooperEl) reglagesDemiCooperEl.hidden = cfg.kind !== "cooper";
    if (chronoSectionEl) chronoSectionEl.hidden = cfg.kind === "cooper";
    if (infosSectionEl) infosSectionEl.hidden = cfg.kind === "cooper";
  }

  function resetState() {
    arreterTick();
    state.running = false;
    state.paused = false;
    state.phase = "idle";
    state.palier = lirePalierDepart();
    state.elapsedInLevel = 0;
    state.shuttle = 1;
    state.plot = 1;
    state.reperesRestants = totalReperesPalier();
    pausedRemainingMs = 0;
    pausedLevelRemainingMs = 0;
    levelEndsAt = 0;
    lastBeepSecond = -1;
    lastAnnouncedPalier = null;
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.hidden = false;
      setStartButton("Démarrer", "▶");
    }
    if (currentTest === "progressif") {
      majChronoAffichage(dureeReellePalier(state.palier));
    } else if (currentTest === "vameval") {
      majChronoAffichage(dureeReellePalier(state.palier));
    } else {
      majChronoAffichage(dureePhaseCourante());
    }
    majPlotTimer();
    majInfos();
    majWakeLock();
  }

  function demarrerPhase(durationSec) {
    phaseEndsAt = Date.now() + durationSec * 1000;
    lastBeepSecond = -1;
    majChronos(durationSec);
    majInfos();
    demarrerTick();
  }

  function demarrerPhaseDepuisEcheance(durationSec) {
    phaseEndsAt += durationSec * 1000;
    if ((currentTest === "progressif" || currentTest === "vameval") && levelEndsAt) {
      phaseEndsAt = Math.min(phaseEndsAt, levelEndsAt);
    }
    lastBeepSecond = -1;
    majChronos(durationSec);
    majInfos();
    demarrerTick();
  }

  function phaseSuivante() {
    beep(true);
    if (currentTest === "gacon") {
      if (state.phase === "run") {
        state.phase = "rest";
        demarrerPhase(TESTS.gacon.restSec);
      } else {
        state.phase = "run";
        state.palier++;
        annoncerPalier();
        demarrerPhase(TESTS.gacon.periodSec);
      }
      return;
    }

    if (currentTest === "navette") {
      state.reperesRestants--;
      if (state.reperesRestants <= 0) {
        state.palier++;
        state.shuttle = 1;
        state.reperesRestants = totalReperesPalier();
        levelEndsAt = phaseEndsAt + dureeReellePalier(state.palier) * 1000;
        annoncerPalier();
      } else {
        state.shuttle++;
      }
      demarrerPhaseDepuisEcheance(dureeReperePalier(state.palier));
      return;
    }

    if (currentTest === "progressif") {
      state.reperesRestants--;
      if (state.reperesRestants <= 0) {
        state.palier++;
        state.plot = 1;
        state.reperesRestants = totalReperesPalier();
        levelEndsAt = phaseEndsAt + dureeReellePalier(state.palier) * 1000;
        annoncerPalier();
      } else {
        state.plot++;
      }
      demarrerPhaseDepuisEcheance(dureeReperePalier(state.palier));
      return;
    }

    if (currentTest === "vameval") {
      state.reperesRestants--;
      if (state.reperesRestants <= 0) {
        state.palier++;
        state.plot = 1;
        state.reperesRestants = totalReperesPalier();
        levelEndsAt = phaseEndsAt + dureeReellePalier(state.palier) * 1000;
        annoncerPalier();
      } else {
        state.plot++;
      }
      demarrerPhaseDepuisEcheance(dureeReperePalier(state.palier));
      return;
    }

    if (currentTest === "demi-cooper") {
      resetState();
      montrerMsg("Test terminé : saisissez la distance parcourue pour obtenir la VMA.");
      return;
    }

    state.palier++;
    annoncerPalier();
    demarrerPhase(TESTS.progressif.periodSec);
  }

  function tick() {
    var remainingMs = Math.max(0, phaseEndsAt - Date.now());
    var remainingSec = Math.ceil(remainingMs / 1000);
    majChronos(remainingSec);
    majInfos();

    if (remainingSec <= 3 && remainingSec > 0 && remainingSec !== lastBeepSecond) {
      lastBeepSecond = remainingSec;
      beep(false);
    }

    if (remainingMs <= 0) {
      phaseSuivante();
    }
  }

  function demarrerTick() {
    arreterTick();
    tickId = setInterval(tick, 200);
  }

  function arreterTick() {
    if (tickId) clearInterval(tickId);
    tickId = null;
  }

  function demarrer() {
    montrerMsg("");
    unlockAudio().then(function () {
      if (explicationEl) explicationEl.open = false;
      state.running = true;
      state.paused = false;
      state.phase = currentTest === "gacon" ? "run" : "work";
      state.palier = lirePalierDepart();
      state.elapsedInLevel = 0;
      state.shuttle = 1;
      state.plot = 1;
      lastAnnouncedPalier = null;
      state.reperesRestants = totalReperesPalier();
      if (currentTest === "navette" || currentTest === "progressif" || currentTest === "vameval") {
        levelEndsAt = Date.now() + dureeReellePalier(state.palier) * 1000;
      } else {
        levelEndsAt = 0;
      }
      if (btnStart) setStartButton("Pause", "⏸");
      annoncerPalier();
      demarrerPhase(dureePhaseCourante());
      majWakeLock();
    });
  }

  function pauseReprendre() {
    if (!state.running || !btnStart) return;
    if (!state.paused) {
      pausedRemainingMs = Math.max(0, phaseEndsAt - Date.now());
      pausedLevelRemainingMs = Math.max(0, levelEndsAt - Date.now());
      state.paused = true;
      arreterTick();
      setStartButton("Reprendre", "▶");
    } else {
      state.paused = false;
      phaseEndsAt = Date.now() + pausedRemainingMs;
      if (currentTest === "navette" || currentTest === "progressif" || currentTest === "vameval") {
        levelEndsAt = Date.now() + pausedLevelRemainingMs;
      }
      lastBeepSecond = -1;
      demarrerTick();
      setStartButton("Pause", "⏸");
    }
    majWakeLock();
  }

  function actionPrincipale() {
    if (state.running) {
      pauseReprendre();
      return;
    }
    demarrer();
  }

  function choisirTest(id) {
    if (!TESTS[id]) return;
    if (state.running && !window.confirm("Changer de test arrête le chronomètre en cours. Continuer ?")) {
      return;
    }
    currentTest = id;
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-test") === id;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", active ? "true" : "false");
    });
    vitesseDepartEl.value = String(TESTS[id].startSpeed);
    majExplication();
    resetState();
  }

  tabs.forEach(function (tab) {
    tab.setAttribute("aria-pressed", tab.classList.contains("is-active") ? "true" : "false");
    tab.addEventListener("click", function () {
      choisirTest(tab.getAttribute("data-test"));
    });
  });

  function vmaDemiCooperTexte() {
    if (!distanceDemiCooperEl) return "—";
    var distance = parseFloat(String(distanceDemiCooperEl.value).replace(",", "."));
    if (!distance || distance <= 0) return "Distance ÷ 100";
    return formatSpeed(distance / 100) + " km/h";
  }

  function majDemiCooper() {
    var txt = vmaDemiCooperTexte();
    if (resultatDemiCooperEl) {
      var valueEl = resultatDemiCooperEl.querySelector(".vma-demi-result__value");
      var hintEl = resultatDemiCooperEl.querySelector(".vma-demi-result__hint");
      if (valueEl) valueEl.textContent = txt === "Distance ÷ 100" ? "—" : txt;
      if (hintEl) {
        hintEl.textContent =
          txt === "Distance ÷ 100"
            ? "Saisissez une distance pour obtenir la VMA correspondante."
            : "Formule : distance en mètres ÷ 100.";
      }
    }
    majInfos();
  }

  [vitesseDepartEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", function () {
      if (!state.running) resetState();
      else majInfos();
    });
    el.addEventListener("change", function () {
      if (!state.running) resetState();
      else majInfos();
    });
  });

  if (btnStart) btnStart.addEventListener("click", actionPrincipale);
  if (btnReset) btnReset.addEventListener("click", resetState);
  if (distanceDemiCooperEl) {
    distanceDemiCooperEl.addEventListener("input", majDemiCooper);
    distanceDemiCooperEl.addEventListener("change", majDemiCooper);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") majWakeLock();
  });

  function unlockOnce() {
    unlockAudio();
    document.removeEventListener("click", unlockOnce, true);
    document.removeEventListener("touchend", unlockOnce, true);
  }

  document.addEventListener("click", unlockOnce, true);
  document.addEventListener("touchend", unlockOnce, true);

  majExplication();
  resetState();
})();
