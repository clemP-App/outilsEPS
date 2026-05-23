/**
 * Course d’orientation — parcours, chronos, balises, classements (séances IndexedDB).
 */
(function () {
  "use strict";

  var SAVE_DELAY_MS = 400;
  var TICK_MS = 1000;

  var state = {
    parcours: [],
    coureurs: [],
    runs: [],
    settings: {
      penaliteFausseSec: 30,
      bonusCorrecteSec: 0,
      retardMinutes: 10,
      allowDeleteTime: false,
      classementCriteres: [
        { key: "parcoursFaits", order: "desc" },
        { key: "tempsMoyen", order: "asc" },
        { key: "tempsTotal", order: "asc" },
        { key: "erreurs", order: "asc" },
        { key: "validations", order: "desc" },
      ],
    },
  };

  var ficheCoureurId = null;
  var ficheParcoursMenuOpen = false;
  var ficheParcoursPickHash = "";
  var saveTimer = null;
  var tickTimer = null;
  var audioCtx = null;
  var vueActive = "course";
  var grilleMap = {};
  var grilleResizeObs = null;
  var navLiee = false;
  var eventsLies = false;
  var GRILLE_GAP_PX = 10;
  var GRILLE_MIN_TOUCH_PX = 60;
  var GRILLE_MIN_FONT_NOM_PX = 11;
  var GRILLE_MAX_FONT_NOM_PX = 17;
  var GRILLE_MAX_FONT_NOM_MOBILE_PX = 12;
  var GRILLE_MAX_FONT_META_MOBILE_PX = 10;
  var GRILLE_BP_MOYEN = 600;
  var GRILLE_BP_GRAND = 900;
  var GRILLE_BP_TRES_GRAND = 1400;

  var msgEl = document.getElementById("orient-msg");
  var grilleEl = document.getElementById("orient-grille");
  var grilleVideEl = document.getElementById("orient-grille-vide");
  var ficheEl = document.getElementById("orient-fiche");
  var partiEl = document.getElementById("orient-parti");
  var arriveeModalEl = document.getElementById("orient-arrivee-modal");
  var arriveeModalVisible = false;

  var CRITERE_LABELS = {
    parcoursFaits: "Parcours réalisés",
    tempsMoyen: "Temps moyen",
    tempsTotal: "Temps total",
    erreurs: "Erreurs (balises fausses)",
    validations: "Validations (balises correctes)",
  };

  function genererId(prefix) {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId(prefix || "orient");
    }
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return (prefix || "o") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function normaliserNom(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function eleveVersNom(e) {
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      return normaliserNom(EleveDisplay.formatEleveListe(e, ""));
    }
    return normaliserNom([e.nom, e.prenom].filter(Boolean).join(" "));
  }

  function montrerMsg(texte, erreur) {
    if (!msgEl) return;
    if (!texte) {
      msgEl.hidden = true;
      msgEl.textContent = "";
      msgEl.classList.remove("msg-ok");
      return;
    }
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.toggle("msg-error", !!erreur);
    msgEl.classList.remove("msg-ok");
  }

  function montrerOk(texte) {
    if (!msgEl) return;
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.remove("msg-error");
    msgEl.classList.add("msg-ok");
    setTimeout(function () {
      montrerMsg("");
    }, 2800);
  }

  function sauverDebounced() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      sauver();
    }, SAVE_DELAY_MS);
  }

  function sauver() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      return Promise.resolve();
    }
    if (!DataManager.saveCourseOrientationForSession) return Promise.resolve();
    return SessionManager.requireSessionId()
      .then(function (sessionId) {
        return DataManager.saveCourseOrientationForSession(sessionId, state);
      })
      .catch(function () {
        montrerMsg("Impossible d’enregistrer les données.", true);
      });
  }

  function charger() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      return Promise.resolve();
    }
    return SessionManager.requireSessionId().then(function (sessionId) {
      return DataManager.getCourseOrientationForSession(sessionId).then(function (data) {
        state = data;
        assurerOrdreCoureurs();
      });
    });
  }

  function getCoureur(id) {
    return state.coureurs.filter(function (c) {
      return c.id === id;
    })[0];
  }

  function prochainOrdreGrille() {
    var max = 0;
    state.coureurs.forEach(function (c) {
      if (typeof c.ordre === "number" && c.ordre > max) max = c.ordre;
    });
    return max + 1;
  }

  function assurerOrdreCoureurs() {
    var sans = state.coureurs.filter(function (c) {
      return typeof c.ordre !== "number";
    });
    if (!sans.length) return;
    var max = 0;
    state.coureurs.forEach(function (c) {
      if (typeof c.ordre === "number" && c.ordre > max) max = c.ordre;
    });
    sans
      .sort(function (a, b) {
        return a.nom.localeCompare(b.nom, "fr");
      })
      .forEach(function (c) {
        max++;
        c.ordre = max;
      });
  }

  function creerCoureur(nom) {
    return {
      id: genererId("coureur"),
      nom: nom,
      ordre: prochainOrdreGrille(),
    };
  }

  function coureursPourGrille() {
    assurerOrdreCoureurs();
    return state.coureurs.slice().sort(function (a, b) {
      return a.ordre - b.ordre;
    });
  }

  function getParcours(id) {
    return state.parcours.filter(function (p) {
      return p.id === id;
    })[0];
  }

  function nomParcours(id) {
    var p = getParcours(id);
    return p ? p.nom : "?";
  }

  function nomCoureur(id) {
    var c = getCoureur(id);
    return c ? c.nom : "?";
  }

  function runsTermines(coureurId) {
    return state.runs.filter(function (r) {
      return r.coureurId === coureurId && r.endAt != null;
    });
  }

  function runActif(coureurId) {
    return state.runs.filter(function (r) {
      return r.coureurId === coureurId && r.endAt == null;
    })[0];
  }

  function parcoursFaitsIds(coureurId) {
    var ids = {};
    runsTermines(coureurId).forEach(function (r) {
      ids[r.parcoursId] = true;
    });
    return ids;
  }

  function parcoursDisponibles(coureurId) {
    var faits = parcoursFaitsIds(coureurId);
    return state.parcours.filter(function (p) {
      return !faits[p.id];
    });
  }

  function tousParcoursFaits(coureurId) {
    if (!state.parcours.length) return false;
    var faits = parcoursFaitsIds(coureurId);
    return state.parcours.every(function (p) {
      return faits[p.id];
    });
  }

  function adjustedMs(run) {
    if (run.adjustedMs != null) return run.adjustedMs;
    if (run.elapsedMs == null) return null;
    var s = state.settings;
    var pen = (run.balisesFaux || 0) * (s.penaliteFausseSec || 0) * 1000;
    var bon = (run.balisesOk || 0) * (s.bonusCorrecteSec || 0) * 1000;
    return Math.max(0, run.elapsedMs + pen - bon);
  }

  function finaliserRun(run) {
    if (!run || run.endAt == null) return;
    if (run.adjustedMs == null) {
      run.adjustedMs = adjustedMs(run);
    }
  }

  function elapsedLive(run) {
    if (!run) return 0;
    if (run.endAt != null && run.elapsedMs != null) return run.elapsedMs;
    return Math.max(0, Date.now() - (run.startAt || Date.now()));
  }

  function formatMs(ms) {
    if (ms == null || isNaN(ms) || ms < 0) return "—";
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return String(m) + ":" + String(s).padStart(2, "0");
  }

  function formatEcartRecord(ms) {
    if (ms == null || isNaN(ms)) return "—";
    if (ms <= 0) return "à égalité avec le record";
    return "+" + formatMs(ms);
  }

  function formatDepuis(ms) {
    if (ms == null || ms < 0) return "—";
    var sec = Math.floor(ms / 1000);
    if (sec < 60) return sec + " s";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + " min";
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + " h" + (m ? " " + m + " min" : "");
  }

  function formatHeureLocale(ts) {
    return new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function instantTousParcoursTermines(coureurId) {
    if (!tousParcoursFaits(coureurId)) return null;
    var maxEnd = 0;
    runsTermines(coureurId).forEach(function (r) {
      if (r.endAt > maxEnd) maxEnd = r.endAt;
    });
    return maxEnd || null;
  }

  function parseTimeInput(str) {
    var t = (str || "").trim();
    if (!t) return null;
    var parts = t.split(":");
    if (parts.length === 1) {
      var sec = parseInt(parts[0], 10);
      return isNaN(sec) ? null : sec * 1000;
    }
    var m = parseInt(parts[0], 10);
    var s = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(s)) return null;
    return (m * 60 + s) * 1000;
  }

  function remplirEditTemps(ms) {
    var minEl = document.getElementById("orient-edit-temps-min");
    var secEl = document.getElementById("orient-edit-temps-sec");
    if (!minEl || !secEl) return;
    if (ms == null || isNaN(ms)) {
      minEl.value = "";
      secEl.value = "";
      return;
    }
    var totalSec = Math.max(0, Math.floor(ms / 1000));
    minEl.value = String(Math.floor(totalSec / 60));
    secEl.value = String(totalSec % 60).padStart(2, "0");
  }

  function lireEditTempsMs() {
    var minEl = document.getElementById("orient-edit-temps-min");
    var secEl = document.getElementById("orient-edit-temps-sec");
    if (!minEl || !secEl) return null;
    var minStr = minEl.value.trim();
    var secStr = secEl.value.trim();
    if (!minStr && !secStr) return null;
    var m = parseInt(minStr, 10);
    var s = secStr === "" ? 0 : parseInt(secStr, 10);
    if (isNaN(m) || m < 0) return null;
    if (isNaN(s) || s < 0 || s > 59) return null;
    return (m * 60 + s) * 1000;
  }

  function normaliserEditTempsSec() {
    var secEl = document.getElementById("orient-edit-temps-sec");
    if (!secEl || secEl.value.trim() === "") return;
    var s = parseInt(secEl.value, 10);
    if (isNaN(s)) {
      secEl.value = "";
      return;
    }
    if (s > 59) s = 59;
    if (s < 0) s = 0;
    secEl.value = String(s).padStart(2, "0");
  }

  function seuilRetardMinutes() {
    var m = parseInt(state.settings.retardMinutes, 10);
    return m > 0 ? m : 10;
  }

  function libelleSeuilRetardLegende() {
    var m = seuilRetardMinutes();
    return m === 1 ? "≥ 1 min" : "≥ " + m + " min";
  }

  function majLegende() {
    var el = document.getElementById("orient-legende-retard");
    if (el) {
      el.textContent = "En retard (" + libelleSeuilRetardLegende() + ")";
    }
  }

  function statutCoureur(coureurId) {
    if (tousParcoursFaits(coureurId)) return "termine";
    var actif = runActif(coureurId);
    if (!actif) return "attente";
    var seuil = seuilRetardMinutes() * 60 * 1000;
    if (Date.now() - actif.startAt >= seuil) return "retard";
    return "course";
  }

  function recordParcours(parcoursId, excludeRunId) {
    var best = null;
    state.runs.forEach(function (r) {
      if (r.parcoursId !== parcoursId || r.endAt == null) return;
      if (excludeRunId && r.id === excludeRunId) return;
      finaliserRun(r);
      var t = adjustedMs(r);
      if (t == null) return;
      if (!best || t < best.ms) {
        best = { ms: t, coureurId: r.coureurId, runId: r.id };
      }
    });
    return best;
  }

  function statsCoureur(coureurId) {
    var termines = runsTermines(coureurId);
    termines.forEach(finaliserRun);
    var total = 0;
    var n = termines.length;
    var err = 0;
    var val = 0;
    var records = 0;
    termines.forEach(function (r) {
      total += adjustedMs(r) || 0;
      err += r.balisesFaux || 0;
      val += r.balisesOk || 0;
      var rec = recordParcours(r.parcoursId);
      if (rec && rec.runId === r.id) records++;
    });
    return {
      parcoursFaits: n,
      tempsTotal: n ? total : null,
      tempsMoyen: n ? total / n : null,
      erreurs: err,
      validations: val,
      records: records,
    };
  }

  function compareParCritere(a, b, key) {
    var sa = statsCoureur(a.id);
    var sb = statsCoureur(b.id);
    var va;
    var vb;
    switch (key) {
      case "parcoursFaits":
        va = sa.parcoursFaits;
        vb = sb.parcoursFaits;
        break;
      case "tempsMoyen":
        va = sa.tempsMoyen == null ? Infinity : sa.tempsMoyen;
        vb = sb.tempsMoyen == null ? Infinity : sb.tempsMoyen;
        break;
      case "tempsTotal":
        va = sa.tempsTotal == null ? Infinity : sa.tempsTotal;
        vb = sb.tempsTotal == null ? Infinity : sb.tempsTotal;
        break;
      case "erreurs":
        va = sa.erreurs;
        vb = sb.erreurs;
        break;
      case "validations":
        va = sa.validations;
        vb = sb.validations;
        break;
      default:
        va = 0;
        vb = 0;
    }
    if (va !== vb) return va < vb ? -1 : 1;
    return 0;
  }

  function classementCoureurs(parcoursId) {
    var liste = state.coureurs.slice();
    if (parcoursId) {
      liste = liste
        .map(function (c) {
          var run = state.runs.filter(function (r) {
            return r.coureurId === c.id && r.parcoursId === parcoursId && r.endAt != null;
          })[0];
          return { coureur: c, run: run };
        })
        .filter(function (x) {
          return x.run;
        })
        .sort(function (a, b) {
          finaliserRun(a.run);
          finaliserRun(b.run);
          var ta = adjustedMs(a.run);
          var tb = adjustedMs(b.run);
          if (ta !== tb) return ta - tb;
          return a.coureur.nom.localeCompare(b.coureur.nom, "fr");
        })
        .map(function (x) {
          return x.coureur;
        });
      return liste;
    }
    var criteres = state.settings.classementCriteres || [];
    liste.sort(function (a, b) {
      var i;
      for (i = 0; i < criteres.length; i++) {
        var c = criteres[i];
        var cmp = compareParCritere(a, b, c.key);
        if (cmp !== 0) return c.order === "desc" ? -cmp : cmp;
      }
      return a.nom.localeCompare(b.nom, "fr");
    });
    return liste;
  }

  function rangGeneral(coureurId) {
    var cl = classementCoureurs(null);
    var i = cl.findIndex(function (c) {
      return c.id === coureurId;
    });
    return i >= 0 ? i + 1 : null;
  }

  function rangParcours(coureurId, parcoursId) {
    var cl = classementCoureurs(parcoursId);
    var i = cl.findIndex(function (c) {
      return c.id === coureurId;
    });
    return i >= 0 ? i + 1 : null;
  }

  function modifierBalisesRun(runId, field, delta) {
    var run = state.runs.filter(function (r) {
      return r.id === runId;
    })[0];
    if (!run || run.endAt == null) return;
    if (runActif(run.coureurId)) return;
    var n = (run[field] || 0) + delta;
    run[field] = Math.max(0, n);
    run.adjustedMs = null;
    finaliserRun(run);
    sauverDebounced();
    renderAll();
  }

  function audioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function unlockAudio() {
    var AC = audioContextClass();
    if (!AC) return Promise.resolve();
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") return audioCtx.resume();
    return Promise.resolve();
  }

  function jouerTone(freq, dureeSec, debut, type, peak) {
    if (!audioCtx) return;
    var vol = peak == null ? 0.22 : peak;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), debut + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + dureeSec);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(debut);
    osc.stop(debut + dureeSec + 0.05);
  }

  function sonDepart() {
    unlockAudio().then(function () {
      if (!audioCtx) return;
      var t0 = audioCtx.currentTime;
      jouerTone(523, 0.1, t0, "triangle");
      jouerTone(784, 0.18, t0 + 0.11, "triangle");
    });
  }

  function sonArrivee() {
    unlockAudio().then(function () {
      if (!audioCtx) return;
      var t0 = audioCtx.currentTime;
      jouerTone(587, 0.14, t0, "sine");
      jouerTone(392, 0.22, t0 + 0.16, "sine");
    });
  }

  function sonFelicitations() {
    unlockAudio().then(function () {
      if (!audioCtx) return;
      var t0 = audioCtx.currentTime + 0.04;
      var fanfare = [
        { f: 523, d: 0.11, dt: 0, type: "triangle", v: 0.32 },
        { f: 659, d: 0.11, dt: 0.07, type: "triangle", v: 0.32 },
        { f: 784, d: 0.11, dt: 0.14, type: "triangle", v: 0.34 },
        { f: 1047, d: 0.13, dt: 0.21, type: "triangle", v: 0.36 },
        { f: 1319, d: 0.14, dt: 0.28, type: "sine", v: 0.36 },
        { f: 1568, d: 0.16, dt: 0.35, type: "sine", v: 0.34 },
        { f: 2093, d: 0.2, dt: 0.43, type: "sine", v: 0.32 },
      ];
      fanfare.forEach(function (n) {
        jouerTone(n.f, n.d, t0 + n.dt, n.type, n.v);
      });
      var chordT = t0 + 0.58;
      [523, 659, 784, 1047, 1319, 1568].forEach(function (f) {
        jouerTone(f, 0.6, chordT, "sine", 0.22);
      });
      [2093, 2637, 3136, 3729].forEach(function (f, i) {
        jouerTone(f, 0.18, chordT + 0.06 + i * 0.055, "triangle", 0.16);
      });
    });
  }

  function demarrerTick() {
    if (tickTimer) return;
    tickTimer = setInterval(function () {
      majGrille();
      majChronoLive();
      majFicheTermineDepuis();
      if (partiEl && !partiEl.hidden) majPartiChrono();
      if (vueActive === "departs") majDepartListeEnCourse();
    }, TICK_MS);
  }

  function arreterTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function aBesoinTick() {
    if (ficheCoureurId && runActif(ficheCoureurId)) return true;
    if (ficheCoureurId && instantTousParcoursTermines(ficheCoureurId)) return true;
    if (partiEl && !partiEl.hidden) return true;
    return state.runs.some(function (r) {
      return r.endAt == null;
    });
  }

  function syncTick() {
    if (aBesoinTick()) demarrerTick();
    else arreterTick();
  }

  function majBoutonGrille(btn, c) {
    var st = statutCoureur(c.id);
    btn.className = "orient-grille__btn orient-grille__btn--" + st;
    var actif = runActif(c.id);
    var nomEl = btn.querySelector(".orient-grille__nom");
    var meta = btn.querySelector(".orient-grille__meta");
    var legacySub = btn.querySelector(".orient-grille__sub");
    if (legacySub) legacySub.remove();
    if (!nomEl) {
      nomEl = document.createElement("span");
      nomEl.className = "orient-grille__nom";
      btn.appendChild(nomEl);
    }
    nomEl.textContent = c.nom;
    if (actif) {
      if (!meta) {
        meta = document.createElement("span");
        meta.className = "orient-grille__meta";
        btn.appendChild(meta);
      }
      meta.textContent = nomParcours(actif.parcoursId) + " – " + formatMs(elapsedLive(actif));
    } else if (meta) {
      meta.remove();
    }
  }

  function colonnesGrillePourEcran() {
    var w = window.innerWidth;
    if (w >= GRILLE_BP_TRES_GRAND) return 6;
    if (w >= GRILLE_BP_GRAND) return 5;
    if (w >= GRILLE_BP_MOYEN) return 4;
    return 3;
  }

  function fontTailleGrille(cellW, cellH) {
    var mobile = window.innerWidth < 500;
    var maxNom = mobile ? GRILLE_MAX_FONT_NOM_MOBILE_PX : GRILLE_MAX_FONT_NOM_PX;
    var maxMeta = mobile ? GRILLE_MAX_FONT_META_MOBILE_PX : 12;
    var nom = Math.min(cellW / 10.5, cellH * 0.2, maxNom);
    var meta = Math.min(cellW / 12.5, cellH * 0.15, maxMeta);
    return {
      nom: Math.round(Math.max(GRILLE_MIN_FONT_NOM_PX, nom)),
      meta: Math.round(Math.max(9, meta)),
    };
  }

  function calculerLayoutGrille(n, width, height) {
    if (n <= 0) {
      return {
        cols: 1,
        rows: 1,
        cell: GRILLE_MIN_TOUCH_PX,
        cellW: width,
        cellH: GRILLE_MIN_TOUCH_PX,
        scroll: false,
      };
    }
    var gap = GRILLE_GAP_PX;
    var minTouch = GRILLE_MIN_TOUCH_PX;
    var colsParLargeur = Math.max(1, Math.floor((width + gap) / (minTouch + gap)));
    var cols = Math.min(n, colonnesGrillePourEcran(), colsParLargeur);
    var rows = Math.ceil(n / cols);
    var cellW = (width - gap * (cols - 1)) / cols;
    var rowsVisibles = Math.max(1, Math.floor((height + gap) / (minTouch + gap)));

    if (rows <= rowsVisibles) {
      var cellH = (height - gap * (rows - 1)) / rows;
      return {
        cols: cols,
        rows: rows,
        cell: Math.max(minTouch, Math.min(cellW, cellH)),
        cellW: cellW,
        cellH: cellH,
        scroll: false,
      };
    }
    var cellHScroll = (height - gap * (rowsVisibles - 1)) / rowsVisibles;
    return {
      cols: cols,
      rows: rows,
      cell: Math.max(minTouch, Math.min(cellW, cellHScroll)),
      cellW: cellW,
      cellH: cellHScroll,
      scroll: true,
    };
  }

  function layoutGrille() {
    if (!grilleEl || grilleEl.hidden) return;
    var n = coureursPourGrille().length;
    if (!n) return;
    var w = grilleEl.clientWidth;
    var h = grilleEl.clientHeight;
    if (w < 20 || h < 20) return;
    var layout = calculerLayoutGrille(n, w, h);
    var fonts = fontTailleGrille(layout.cellW, layout.cellH);
    grilleEl.style.setProperty("--orient-grid-cols", String(layout.cols));
    grilleEl.style.setProperty("--orient-grid-rows", String(layout.rows));
    grilleEl.style.setProperty("--orient-grille-cell", layout.cell.toFixed(1) + "px");
    grilleEl.style.setProperty("--orient-grille-cell-w", layout.cellW.toFixed(1) + "px");
    grilleEl.style.setProperty("--orient-grille-font-nom", fonts.nom + "px");
    grilleEl.style.setProperty("--orient-grille-font-meta", fonts.meta + "px");
    grilleEl.classList.toggle("orient-grille--scroll", layout.scroll);
  }

  function planifierLayoutGrille() {
    requestAnimationFrame(function () {
      layoutGrille();
      requestAnimationFrame(layoutGrille);
    });
  }

  function observGrilleResize() {
    window.addEventListener("resize", function () {
      if (vueActive === "course") planifierLayoutGrille();
    });
    window.addEventListener("orientationchange", function () {
      if (vueActive === "course") {
        window.setTimeout(planifierLayoutGrille, 120);
      }
    });
    if (!grilleEl || typeof ResizeObserver === "undefined") return;
    if (grilleResizeObs) grilleResizeObs.disconnect();
    grilleResizeObs = new ResizeObserver(function () {
      if (vueActive === "course") layoutGrille();
    });
    grilleResizeObs.observe(grilleEl);
  }

  function majGrille() {
    coureursPourGrille().forEach(function (c) {
      var btn = grilleMap[c.id];
      if (btn) majBoutonGrille(btn, c);
    });
  }

  function rebuildGrille() {
    if (!grilleEl) return;
    grilleMap = {};
    OutilsDom.clear(grilleEl);
    if (!state.coureurs.length) {
      if (grilleVideEl) grilleVideEl.hidden = false;
      syncTick();
      return;
    }
    if (grilleVideEl) grilleVideEl.hidden = true;
    coureursPourGrille().forEach(function (c) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "orient-grille__btn";
      btn.dataset.coureurId = c.id;
      var nomSpan = document.createElement("span");
      nomSpan.className = "orient-grille__nom";
      nomSpan.textContent = c.nom;
      btn.appendChild(nomSpan);
      btn.addEventListener("click", function () {
        ouvrirFiche(c.id);
      });
      majBoutonGrille(btn, c);
      grilleMap[c.id] = btn;
      grilleEl.appendChild(btn);
    });
    planifierLayoutGrille();
    syncTick();
  }

  function renderGrille() {
    rebuildGrille();
  }

  function majBadgeAccordeons() {
    var bp = document.getElementById("orient-acc-parcours-count");
    var bc = document.getElementById("orient-acc-coureurs-count");
    var nP = state.parcours.length;
    var nC = state.coureurs.length;
    if (bp) bp.textContent = String(nP);
    if (bc) bc.textContent = String(nC);
  }

  function renderParcoursGestion() {
    var list = document.getElementById("orient-parcours-list");
    if (!list) return;
    majBadgeAccordeons();
    OutilsDom.clear(list);
    state.parcours.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "orient-list__item";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.className = "orient-input orient-list__input";
      inp.value = p.nom;
      inp.maxLength = 60;
      inp.addEventListener("change", function () {
        p.nom = normaliserNom(inp.value) || p.nom;
        inp.value = p.nom;
        sauverDebounced();
        renderAll();
      });
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "orient-btn orient-btn--danger-soft orient-list__action";
      btn.textContent = "Supprimer";
      btn.addEventListener("click", function () {
        if (!confirm("Supprimer ce parcours et tous les temps associés ?")) return;
        state.parcours = state.parcours.filter(function (x) {
          return x.id !== p.id;
        });
        state.runs = state.runs.filter(function (r) {
          return r.parcoursId !== p.id;
        });
        sauverDebounced();
        renderAll();
      });
      li.appendChild(inp);
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function fermerSelectNatif(sel) {
    if (!sel) return;
    window.setTimeout(function () {
      if (document.activeElement === sel) sel.blur();
    }, 120);
  }

  function hashFicheParcoursPicker(coureurId) {
    var actif = runActif(coureurId);
    if (actif) return "a:" + actif.parcoursId;
    if (tousParcoursFaits(coureurId)) return "t:termine";
    return (
      "d:" +
      parcoursDisponibles(coureurId)
        .map(function (p) {
          return p.id;
        })
        .join("|")
    );
  }

  function libelleParcoursFiche(coureurId) {
    if (tousParcoursFaits(coureurId)) return "Terminé";
    if (!state.parcours.length) return "Aucun parcours configuré";
    return "Choisir un parcours";
  }

  function getFicheParcoursBtn() {
    return document.getElementById("orient-fiche-parcours-btn");
  }

  function getFicheParcoursHidden() {
    return document.getElementById("orient-fiche-parcours");
  }

  function getFicheParcoursSelection() {
    var inp = getFicheParcoursHidden();
    return inp && inp.value ? inp.value : "";
  }

  function majAffichageFicheParcours(parcoursId) {
    var valEl = document.getElementById("orient-fiche-parcours-value");
    var inp = getFicheParcoursHidden();
    if (inp) inp.value = parcoursId || "";
    if (valEl) {
      if (parcoursId) {
        var enCours =
          ficheCoureurId &&
          (function () {
            var actif = runActif(ficheCoureurId);
            return actif && actif.parcoursId === parcoursId;
          })();
        valEl.textContent = nomParcours(parcoursId) + (enCours ? " (en cours)" : "");
        valEl.classList.remove("orient-parcours-pick__value--placeholder", "orient-parcours-pick__value--termine");
      } else {
        var libelle = ficheCoureurId ? libelleParcoursFiche(ficheCoureurId) : "Choisir un parcours";
        valEl.textContent = libelle;
        valEl.classList.toggle("orient-parcours-pick__value--placeholder", libelle === "Choisir un parcours");
        valEl.classList.toggle("orient-parcours-pick__value--termine", libelle === "Terminé");
      }
    }
    var menu = document.getElementById("orient-fiche-parcours-menu");
    if (menu) {
      menu.querySelectorAll(".orient-parcours-pick__opt").forEach(function (opt) {
        opt.setAttribute("aria-selected", opt.dataset.parcoursId === parcoursId ? "true" : "false");
      });
    }
  }

  function fermerMenuFicheParcours() {
    var menu = document.getElementById("orient-fiche-parcours-menu");
    var btn = getFicheParcoursBtn();
    ficheParcoursMenuOpen = false;
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function choisirFicheParcours(parcoursId) {
    majAffichageFicheParcours(parcoursId);
    majRecordAffiche(parcoursId || null);
    if (ficheCoureurId) majFicheDepart(ficheCoureurId);
    fermerMenuFicheParcours();
  }

  function toggleMenuFicheParcours() {
    var menu = document.getElementById("orient-fiche-parcours-menu");
    var btn = getFicheParcoursBtn();
    if (!menu || !btn || btn.disabled) return;
    if (ficheParcoursMenuOpen) {
      fermerMenuFicheParcours();
      return;
    }
    ficheParcoursMenuOpen = true;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  }

  function rebuildFicheParcoursPicker(coureurId, force) {
    var menu = document.getElementById("orient-fiche-parcours-menu");
    var btn = getFicheParcoursBtn();
    if (!menu || !btn || !coureurId) return;
    if (ficheParcoursMenuOpen && !force) return;
    var h = hashFicheParcoursPicker(coureurId);
    if (!force && h === ficheParcoursPickHash) {
      majAffichageFicheParcours(getFicheParcoursSelection());
      return;
    }
    ficheParcoursPickHash = h;
    fermerMenuFicheParcours();
    var choixGarde = getFicheParcoursSelection();
    OutilsDom.clear(menu);
    var actif = runActif(coureurId);
    if (actif) {
      btn.disabled = true;
      majAffichageFicheParcours(actif.parcoursId);
      majRecordAffiche(actif.parcoursId);
      return;
    }
    var dispo = parcoursDisponibles(coureurId);
    btn.disabled = dispo.length === 0;
    if (!dispo.length) {
      majAffichageFicheParcours("");
      majRecordAffiche(null);
      if (ficheCoureurId === coureurId) majFicheDepart(coureurId);
      return;
    }
    dispo.forEach(function (p) {
      var li = document.createElement("li");
      var opt = document.createElement("button");
      opt.type = "button";
      opt.className = "orient-parcours-pick__opt";
      opt.setAttribute("role", "option");
      opt.dataset.parcoursId = p.id;
      opt.textContent = p.nom;
      opt.setAttribute("aria-selected", p.id === choixGarde ? "true" : "false");
      opt.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        choisirFicheParcours(p.id);
      });
      li.appendChild(opt);
      menu.appendChild(li);
    });
    var valOk =
      choixGarde &&
      getParcours(choixGarde) &&
      dispo.some(function (p) {
        return p.id === choixGarde;
      });
    majAffichageFicheParcours(valOk ? choixGarde : "");
    if (!valOk) majRecordAffiche(null);
  }

  function majSelectClassementParcours() {
    var selCl = document.getElementById("orient-classement-parcours");
    if (!selCl) return;
    if (document.activeElement === selCl) return;
    var val = selCl.value;
    OutilsDom.clear(selCl);
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Classement général";
    selCl.appendChild(opt0);
    state.parcours.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.nom;
      selCl.appendChild(o);
    });
    if (val && (val === "" || getParcours(val))) selCl.value = val;
  }

  function renderCoureursGestion() {
    var list = document.getElementById("orient-coureurs-gestion");
    var nb = document.getElementById("orient-nb-coureurs");
    majBadgeAccordeons();
    if (nb) {
      var n = state.coureurs.length;
      nb.textContent = n + " coureur" + (n > 1 ? "s" : "");
    }
    if (!list) return;
    OutilsDom.clear(list);
    state.coureurs
      .slice()
      .sort(function (a, b) {
        return a.nom.localeCompare(b.nom, "fr");
      })
      .forEach(function (c) {
        var li = document.createElement("li");
        li.className = "orient-list__item";
        var nom = document.createElement("span");
        nom.className = "orient-list__label";
        nom.textContent = c.nom;
        li.appendChild(nom);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "orient-btn orient-btn--danger-soft orient-list__action";
        btn.textContent = "Retirer";
        btn.addEventListener("click", function () {
          state.coureurs = state.coureurs.filter(function (x) {
            return x.id !== c.id;
          });
          state.runs = state.runs.filter(function (r) {
            return r.coureurId !== c.id;
          });
          sauverDebounced();
          renderAll();
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
  }

  function medailleRang(rang) {
    if (rang === 1) return "🥇";
    if (rang === 2) return "🥈";
    if (rang === 3) return "🥉";
    return String(rang);
  }

  var ICONES_STAT_CLASSEMENT = {
    temps: "⏱️",
    parcours: "🗺️",
    total: "⏱️",
    moyenne: "⏱️",
    ok: "✅",
    err: "❌",
  };

  function ajouterStatClassement(parent, label, value, mod) {
    var stat = document.createElement("span");
    stat.className =
      "orient-leaderboard__stat" + (mod ? " orient-leaderboard__stat--" + mod : "");
    if (mod && ICONES_STAT_CLASSEMENT[mod]) {
      var ico = document.createElement("span");
      ico.className = "orient-leaderboard__stat-ico";
      ico.setAttribute("aria-hidden", "true");
      ico.textContent = ICONES_STAT_CLASSEMENT[mod];
      stat.appendChild(ico);
    }
    var lbl = document.createElement("span");
    lbl.className = "orient-leaderboard__stat-label";
    lbl.textContent = label;
    var valEl = document.createElement("span");
    valEl.className = "orient-leaderboard__stat-val";
    valEl.textContent = value;
    stat.appendChild(lbl);
    stat.appendChild(valEl);
    parent.appendChild(stat);
  }

  function renderClassement() {
    var list = document.getElementById("orient-classement-list");
    var vide = document.getElementById("orient-classement-vide");
    var sel = document.getElementById("orient-classement-parcours");
    if (!list) return;
    var parcoursId = sel && sel.value ? sel.value : null;
    var cl = classementCoureurs(parcoursId);
    OutilsDom.clear(list);
    if (!cl.length) {
      if (vide) vide.hidden = false;
      return;
    }
    if (vide) vide.hidden = true;
    cl.forEach(function (c, idx) {
      var rang = idx + 1;
      var li = document.createElement("li");
      li.className = "orient-leaderboard__item" + (rang <= 3 ? " orient-leaderboard__item--top" + rang : "");
      var badge = document.createElement("span");
      badge.className =
        "orient-leaderboard__rang" + (rang <= 3 ? " orient-leaderboard__rang--top" + rang : "");
      badge.textContent = medailleRang(rang);
      var body = document.createElement("div");
      body.className = "orient-leaderboard__body";
      var nom = document.createElement("span");
      nom.className = "orient-leaderboard__nom";
      nom.textContent = c.nom;
      body.appendChild(nom);
      var stats = document.createElement("div");
      stats.className = "orient-leaderboard__stats";
      if (parcoursId) {
        var r = state.runs.filter(function (x) {
          return x.coureurId === c.id && x.parcoursId === parcoursId && x.endAt;
        })[0];
        finaliserRun(r);
        ajouterStatClassement(stats, "Balises OK", String(r.balisesOk || 0), "ok");
        ajouterStatClassement(stats, "Erreurs", String(r.balisesFaux || 0), "err");
      } else {
        var st = statsCoureur(c.id);
        ajouterStatClassement(stats, "Parcours", String(st.parcoursFaits), "parcours");
        ajouterStatClassement(
          stats,
          "Temps total",
          st.tempsTotal != null ? formatMs(st.tempsTotal) : "—",
          "total"
        );
        ajouterStatClassement(stats, "Balises OK", String(st.validations), "ok");
        ajouterStatClassement(stats, "Erreurs", String(st.erreurs), "err");
      }
      body.appendChild(stats);
      li.appendChild(badge);
      li.appendChild(body);
      if (!parcoursId) {
        var temps = document.createElement("span");
        temps.className = "orient-leaderboard__temps";
        var st2 = statsCoureur(c.id);
        temps.textContent = st2.tempsMoyen != null ? formatMs(st2.tempsMoyen) : "—";
        li.appendChild(temps);
      } else {
        var r2 = state.runs.filter(function (x) {
          return x.coureurId === c.id && x.parcoursId === parcoursId && x.endAt;
        })[0];
        finaliserRun(r2);
        var t2 = document.createElement("span");
        t2.className = "orient-leaderboard__temps";
        t2.textContent = formatMs(adjustedMs(r2));
        li.appendChild(t2);
      }
      li.className += " orient-leaderboard__item--clickable";
      li.setAttribute("role", "button");
      li.tabIndex = 0;
      li.addEventListener("click", function () {
        ouvrirFiche(c.id);
      });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ouvrirFiche(c.id);
        }
      });
      list.appendChild(li);
    });
  }

  function ajouterSectionDepart(list, titre) {
    var li = document.createElement("li");
    li.className = "orient-list__section";
    li.textContent = titre;
    list.appendChild(li);
  }

  function renderLigneDepartEnCourse(c) {
    var actif = runActif(c.id);
    if (!actif) return null;
    var li = document.createElement("li");
    li.className = "orient-list__item orient-list__item--depart orient-list__item--disabled";
    li.setAttribute("aria-disabled", "true");
    var nom = document.createElement("span");
    nom.className = "orient-list__label";
    nom.textContent = c.nom;
    var meta = document.createElement("span");
    meta.className = "orient-list__meta orient-list__meta--course";
    meta.dataset.coureurId = c.id;
    meta.textContent =
      nomParcours(actif.parcoursId) + " · depuis " + formatMs(elapsedLive(actif));
    li.appendChild(nom);
    li.appendChild(meta);
    return li;
  }

  function captureDepartSelection() {
    var saved = {};
    document.querySelectorAll(".orient-depart-chk").forEach(function (chk) {
      var cid = chk.dataset.coureurId;
      if (!cid) return;
      var sel = document.querySelector(
        '.orient-depart-parcours[data-coureur-id="' + cid + '"]'
      );
      saved[cid] = {
        checked: chk.checked,
        parcoursId: sel && sel.value ? sel.value : "",
      };
    });
    return saved;
  }

  function majDepartListeEnCourse() {
    state.coureurs.forEach(function (c) {
      var actif = runActif(c.id);
      if (!actif) return;
      var meta = document.querySelector(
        '.orient-list__meta--course[data-coureur-id="' + c.id + '"]'
      );
      if (meta) {
        meta.textContent =
          nomParcours(actif.parcoursId) + " · depuis " + formatMs(elapsedLive(actif));
      }
    });
  }

  function renderLigneDepartDispo(c, saved) {
    var li = document.createElement("li");
    li.className = "orient-list__item orient-list__item--depart";
    var lab = document.createElement("label");
    lab.className = "orient-list__check";
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "orient-depart-chk";
    chk.dataset.coureurId = c.id;
    var span = document.createElement("span");
    span.className = "orient-list__label";
    span.textContent = c.nom;
    lab.appendChild(chk);
    lab.appendChild(span);
    var sel = document.createElement("select");
    sel.className = "orient-select orient-list__select orient-depart-parcours";
    sel.dataset.coureurId = c.id;
    sel.disabled = true;
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "Choisir un parcours";
    sel.appendChild(ph);
    parcoursDisponibles(c.id).forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.nom;
      sel.appendChild(o);
    });
    chk.addEventListener("change", function () {
      sel.disabled = !chk.checked;
      if (!chk.checked) {
        sel.selectedIndex = 0;
      }
      majDepartGo();
    });
    sel.addEventListener("change", function (e) {
      majDepartGo();
      fermerSelectNatif(e.target);
    });
    if (saved && saved[c.id]) {
      chk.checked = !!saved[c.id].checked;
      if (saved[c.id].checked) {
        sel.disabled = false;
        if (saved[c.id].parcoursId) {
          sel.value = saved[c.id].parcoursId;
        }
      }
    }
    li.appendChild(lab);
    li.appendChild(sel);
    return li;
  }

  function renderDepartListe() {
    var list = document.getElementById("orient-depart-list");
    if (!list) return;
    var saved = captureDepartSelection();
    OutilsDom.clear(list);
    var tri = function (a, b) {
      return a.nom.localeCompare(b.nom, "fr");
    };
    var enCourse = state.coureurs.filter(function (c) {
      return runActif(c.id);
    });
    var dispo = state.coureurs.filter(function (c) {
      return !runActif(c.id) && parcoursDisponibles(c.id).length > 0;
    });
    enCourse.sort(tri);
    dispo.sort(tri);
    if (enCourse.length) {
      ajouterSectionDepart(list, "En course");
      enCourse.forEach(function (c) {
        var li = renderLigneDepartEnCourse(c);
        if (li) list.appendChild(li);
      });
    }
    if (dispo.length) {
      ajouterSectionDepart(list, "Disponibles pour un départ");
      dispo.forEach(function (c) {
        list.appendChild(renderLigneDepartDispo(c, saved));
      });
    }
    if (!enCourse.length && !dispo.length) {
      list.appendChild(OutilsDom.emptyState("Aucun coureur enregistré ou tous les parcours sont terminés."));
    }
    majDepartGo();
  }

  function compteDepartSelection() {
    var checked = 0;
    var ready = 0;
    document.querySelectorAll(".orient-depart-chk:checked").forEach(function (chk) {
      checked++;
      var cid = chk.dataset.coureurId;
      var sel = document.querySelector(
        '.orient-depart-parcours[data-coureur-id="' + cid + '"]'
      );
      if (sel && sel.value) ready++;
    });
    return { checked: checked, ready: ready };
  }

  function libelleDepartGroupe(checked) {
    if (!checked) return "Départ des coureurs sélectionnés";
    if (checked === 1) return "Départ du coureur sélectionné";
    return "Départ des " + checked + " coureurs sélectionnés";
  }

  function majDepartAlertes() {
    document.querySelectorAll(".orient-depart-parcours").forEach(function (sel) {
      var row = sel.closest(".orient-list__item--depart");
      if (!row) {
        sel.classList.remove("orient-depart-parcours--alert");
        return;
      }
      var chk = row.querySelector(".orient-depart-chk");
      var alert = !!(chk && chk.checked && !sel.value);
      sel.classList.toggle("orient-depart-parcours--alert", alert);
    });
  }

  function majDepartGo() {
    var btnGo = document.getElementById("orient-depart-go");
    var labelEl = document.getElementById("orient-depart-go-label");
    if (!btnGo) return;
    var stats = compteDepartSelection();
    if (labelEl) labelEl.textContent = libelleDepartGroupe(stats.checked);
    btnGo.disabled = stats.ready === 0;
    majDepartAlertes();
  }

  function renderCriteres() {
    var ol = document.getElementById("orient-criteres");
    if (!ol) return;
    OutilsDom.clear(ol);
    (state.settings.classementCriteres || []).forEach(function (c, idx) {
      var li = document.createElement("li");
      li.className = "orient-list__item orient-list__item--critere";
      li.dataset.index = String(idx);
      var label = document.createElement("span");
      label.className = "orient-list__label";
      label.textContent = (idx + 1) + ". " + (CRITERE_LABELS[c.key] || c.key);
      var sel = document.createElement("select");
      sel.className = "orient-select orient-list__select";
      sel.dataset.index = String(idx);
      ["asc", "desc"].forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o === "asc" ? "Croissant" : "Décroissant";
        if (c.order === o) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () {
        state.settings.classementCriteres[idx].order = sel.value;
        sauverDebounced();
        renderClassement();
      });
      var actions = document.createElement("div");
      actions.className = "orient-list__actions";
      var up = document.createElement("button");
      up.type = "button";
      up.className = "orient-chip";
      up.textContent = "↑";
      up.disabled = idx === 0;
      up.addEventListener("click", function () {
        var arr = state.settings.classementCriteres;
        var tmp = arr[idx - 1];
        arr[idx - 1] = arr[idx];
        arr[idx] = tmp;
        sauverDebounced();
        renderCriteres();
        renderClassement();
      });
      var down = document.createElement("button");
      down.type = "button";
      down.className = "orient-chip";
      down.textContent = "↓";
      down.disabled = idx === state.settings.classementCriteres.length - 1;
      down.addEventListener("click", function () {
        var arr = state.settings.classementCriteres;
        var tmp = arr[idx + 1];
        arr[idx + 1] = arr[idx];
        arr[idx] = tmp;
        sauverDebounced();
        renderCriteres();
        renderClassement();
      });
      li.appendChild(label);
      li.appendChild(sel);
      actions.appendChild(up);
      actions.appendChild(down);
      li.appendChild(actions);
      ol.appendChild(li);
    });
  }

  function syncReglagesForm() {
    var pen = document.getElementById("orient-penalite");
    var bon = document.getElementById("orient-bonus");
    var ret = document.getElementById("orient-retard");
    var del = document.getElementById("orient-allow-delete");
    if (pen) pen.value = state.settings.penaliteFausseSec;
    if (bon) bon.value = state.settings.bonusCorrecteSec;
    if (ret) ret.value = state.settings.retardMinutes;
    if (del) del.checked = !!state.settings.allowDeleteTime;
  }

  function parcoursAjoutablesEdit(coureurId) {
    var faits = parcoursFaitsIds(coureurId);
    var actif = runActif(coureurId);
    return state.parcours.filter(function (p) {
      if (faits[p.id]) return false;
      if (actif && actif.parcoursId === p.id) return false;
      return true;
    });
  }

  function parseEditParcoursVal(val) {
    if (!val) return null;
    if (val.indexOf("new:") === 0) {
      return { mode: "new", parcoursId: val.slice(4) };
    }
    if (val.indexOf("run:") === 0) {
      return { mode: "run", runId: val.slice(4) };
    }
    return { mode: "run", runId: val };
  }

  function majEditTempsForm() {
    var selR = document.getElementById("orient-edit-run");
    var btnDel = document.getElementById("orient-edit-delete");
    var btnSave = document.getElementById("orient-edit-save");
    if (!selR) return;
    var parsed = parseEditParcoursVal(selR.value);
    if (!parsed) {
      if (btnDel) btnDel.disabled = true;
      if (btnSave) btnSave.disabled = true;
      remplirEditTemps(null);
      return;
    }
    if (parsed.mode === "new") {
      remplirEditTemps(null);
      if (btnDel) btnDel.disabled = true;
      if (btnSave) btnSave.disabled = false;
      return;
    }
    var run = state.runs.filter(function (x) {
      return x.id === parsed.runId;
    })[0];
    if (run) remplirEditTemps(adjustedMs(run));
    else remplirEditTemps(null);
    if (btnDel) btnDel.disabled = !run || run.endAt == null;
    if (btnSave) btnSave.disabled = !run;
  }

  function renderEditTempsSelects() {
    var selC = document.getElementById("orient-edit-coureur");
    var selR = document.getElementById("orient-edit-run");
    if (!selC || !selR) return;
    var cidAvant = selC.value;
    var valAvant = selR.value;
    OutilsDom.clear(selC);
    state.coureurs.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.nom;
      selC.appendChild(o);
    });
    if (cidAvant && getCoureur(cidAvant)) selC.value = cidAvant;
    else if (state.coureurs[0]) selC.value = state.coureurs[0].id;
    var cid = selC.value;
    OutilsDom.clear(selR);
    if (!state.parcours.length) {
      var optVide = document.createElement("option");
      optVide.value = "";
      optVide.textContent = "Aucun parcours configuré";
      selR.appendChild(optVide);
      majEditTempsForm();
      return;
    }
    var termines = runsTermines(cid)
      .slice()
      .sort(function (a, b) {
        return nomParcours(a.parcoursId).localeCompare(nomParcours(b.parcoursId), "fr");
      });
    termines.forEach(function (r) {
      finaliserRun(r);
      var o = document.createElement("option");
      o.value = "run:" + r.id;
      o.textContent = nomParcours(r.parcoursId) + " — " + formatMs(adjustedMs(r));
      selR.appendChild(o);
    });
    var ajoutables = parcoursAjoutablesEdit(cid)
      .slice()
      .sort(function (a, b) {
        return a.nom.localeCompare(b.nom, "fr");
      });
    ajoutables.forEach(function (p) {
      var o = document.createElement("option");
      o.value = "new:" + p.id;
      o.textContent = p.nom + " — (non réalisé)";
      selR.appendChild(o);
    });
    if (!selR.options.length) {
      var optAucun = document.createElement("option");
      optAucun.value = "";
      optAucun.textContent = "Aucun parcours disponible";
      selR.appendChild(optAucun);
    } else if (valAvant) {
      var trouve = false;
      for (var i = 0; i < selR.options.length; i++) {
        if (selR.options[i].value === valAvant) {
          selR.selectedIndex = i;
          trouve = true;
          break;
        }
      }
      if (!trouve) selR.selectedIndex = 0;
    } else {
      selR.selectedIndex = 0;
    }
    majEditTempsForm();
  }

  function enregistrerTempsEdit() {
    var selC = document.getElementById("orient-edit-coureur");
    var selR = document.getElementById("orient-edit-run");
    if (!selC || !selR) return;
    var parsed = parseEditParcoursVal(selR.value);
    if (!parsed) return;
    normaliserEditTempsSec();
    var ms = lireEditTempsMs();
    if (ms == null) {
      montrerMsg("Temps invalide (minutes et secondes 0–59).", true);
      return;
    }
    if (parsed.mode === "new") {
      var cid = selC.value;
      if (!getCoureur(cid) || !getParcours(parsed.parcoursId)) return;
      if (parcoursFaitsIds(cid)[parsed.parcoursId]) {
        montrerMsg("Ce parcours est déjà enregistré pour ce coureur.", true);
        renderEditTempsSelects();
        return;
      }
      var now = Date.now();
      state.runs.push({
        id: genererId("run"),
        coureurId: cid,
        parcoursId: parsed.parcoursId,
        startAt: now - ms,
        endAt: now,
        elapsedMs: ms,
        adjustedMs: ms,
        balisesOk: 0,
        balisesFaux: 0,
      });
      sauverDebounced();
      renderAll();
      montrerOk("Temps ajouté sur un parcours non réalisé.");
      return;
    }
    var run = state.runs.filter(function (x) {
      return x.id === parsed.runId;
    })[0];
    if (!run || run.endAt == null) return;
    run.adjustedMs = ms;
    if (run.elapsedMs == null) run.elapsedMs = ms;
    sauverDebounced();
    renderAll();
    montrerOk("Temps mis à jour.");
  }

  function supprimerTempsEdit() {
    var parsed = parseEditParcoursVal(document.getElementById("orient-edit-run").value);
    if (!parsed || parsed.mode !== "run") return;
    var run = state.runs.filter(function (r) {
      return r.id === parsed.runId;
    })[0];
    if (!run || run.endAt == null) return;
    if (!confirm("Supprimer définitivement ce temps ?")) return;
    state.runs = state.runs.filter(function (x) {
      return x.id !== rid;
    });
    sauverDebounced();
    renderAll();
    montrerOk("Temps supprimé.");
  }

  function majFicheDepart(coureurId) {
    var actif = runActif(coureurId);
    var btnPick = getFicheParcoursBtn();
    var btnStart = document.getElementById("orient-btn-start");
    var attente = document.getElementById("orient-fiche-actions-attente");
    var resultat = document.getElementById("orient-fiche-resultat");
    var toutFait = tousParcoursFaits(coureurId);
    if (actif) {
      if (btnPick) {
        btnPick.classList.remove("orient-select--alert", "orient-parcours-pick__btn--termine");
      }
      return;
    }
    if (btnPick) {
      btnPick.classList.toggle("orient-parcours-pick__btn--termine", toutFait);
      btnPick.classList.remove("orient-select--alert");
    }
    if (toutFait) {
      if (btnStart) btnStart.hidden = true;
      majRecordAffiche(null);
      return;
    }
    var hasSelection = !!getFicheParcoursSelection();
    var attenteVisible = attente && !attente.hidden;
    if (btnPick) btnPick.classList.toggle("orient-select--alert", !hasSelection && attenteVisible);
    if (hasSelection) {
      if (attente) attente.hidden = false;
      if (resultat) resultat.hidden = true;
      if (btnStart) btnStart.hidden = false;
      majRecordAffiche(getFicheParcoursSelection());
    } else {
      if (btnStart) btnStart.hidden = true;
      majRecordAffiche(null);
      var resultVisible = resultat && !resultat.hidden;
      if (attente) attente.hidden = resultVisible;
    }
  }

  function renderAll() {
    majLegende();
    renderGrille();
    renderParcoursGestion();
    majSelectClassementParcours();
    renderCoureursGestion();
    renderClassement();
    if (document.querySelector(".orient-depart-parcours:focus")) {
      majDepartGo();
      majDepartListeEnCourse();
    } else {
      renderDepartListe();
    }
    renderCriteres();
    syncReglagesForm();
    renderEditTempsSelects();
    if (ficheCoureurId) renderFiche(ficheCoureurId);
  }

  function creerControleBalise(runId, field, label, count, editable) {
    var kind = field === "balisesOk" ? "ok" : "faux";
    var ico = kind === "ok" ? "✅" : "❌";
    var wrap = document.createElement("div");
    wrap.className = "orient-hist-balise orient-hist-balise--" + kind;
    var head = document.createElement("div");
    head.className = "orient-hist-balise__head";
    var icoEl = document.createElement("span");
    icoEl.className = "orient-hist-balise__ico";
    icoEl.setAttribute("aria-hidden", "true");
    icoEl.textContent = ico;
    var lbl = document.createElement("span");
    lbl.className = "orient-hist-balise__lbl";
    lbl.textContent = label;
    head.appendChild(icoEl);
    head.appendChild(lbl);
    wrap.appendChild(head);
    var ctrl = document.createElement("div");
    ctrl.className = "orient-hist-balise__ctrl";
    if (editable) {
      var moins = document.createElement("button");
      moins.type = "button";
      moins.className = "orient-hist-balise__btn orient-hist-balise__btn--moins";
      moins.setAttribute("aria-label", "Retirer une balise " + label.toLowerCase());
      moins.textContent = "−";
      moins.addEventListener("click", function () {
        modifierBalisesRun(runId, field, -1);
      });
      ctrl.appendChild(moins);
    }
    var val = document.createElement("span");
    val.className = "orient-hist-balise__val";
    val.textContent = String(count);
    ctrl.appendChild(val);
    if (editable) {
      var plus = document.createElement("button");
      plus.type = "button";
      plus.className = "orient-hist-balise__btn orient-hist-balise__btn--plus";
      plus.setAttribute("aria-label", "Ajouter une balise " + label.toLowerCase());
      plus.textContent = "+";
      plus.addEventListener("click", function () {
        modifierBalisesRun(runId, field, 1);
      });
      ctrl.appendChild(plus);
    }
    wrap.appendChild(ctrl);
    return wrap;
  }

  function renderHistorique(coureurId, editableBalises) {
    var hist = document.getElementById("orient-fiche-historique");
    if (!hist) return;
    OutilsDom.clear(hist);
    var termines = runsTermines(coureurId)
      .slice()
      .sort(function (a, b) {
        return (b.endAt || 0) - (a.endAt || 0);
      });
    if (!termines.length) {
      hist.appendChild(OutilsDom.emptyState("Aucun parcours terminé."));
      return;
    }
    termines.forEach(function (r) {
      finaliserRun(r);
      var rgP = rangParcours(coureurId, r.parcoursId);
      var row = document.createElement("div");
      row.className = "orient-list__item orient-list__item--hist";
      var main = document.createElement("div");
      main.className = "orient-hist-item__main";
      var titre = document.createElement("strong");
      titre.textContent = nomParcours(r.parcoursId);
      var temps = document.createElement("span");
      temps.className = "orient-hist-item__temps";
      temps.textContent =
        formatMs(adjustedMs(r)) + (rgP ? " · " + rgP + "e" : "");
      main.appendChild(titre);
      main.appendChild(temps);
      row.appendChild(main);
      var balises = document.createElement("div");
      balises.className = "orient-hist-balises";
      balises.appendChild(
        creerControleBalise(r.id, "balisesOk", "Correctes", r.balisesOk || 0, editableBalises)
      );
      balises.appendChild(
        creerControleBalise(r.id, "balisesFaux", "Fausses", r.balisesFaux || 0, editableBalises)
      );
      row.appendChild(balises);
      if (state.settings.allowDeleteTime && editableBalises) {
        var del = document.createElement("button");
        del.type = "button";
        del.className = "orient-btn orient-btn--danger-soft orient-hist-del";
        del.textContent = "Supprimer le temps";
        del.addEventListener("click", function () {
          if (!confirm("Supprimer ce temps ?")) return;
          state.runs = state.runs.filter(function (x) {
            return x.id !== r.id;
          });
          sauverDebounced();
          renderAll();
        });
        row.appendChild(del);
      }
      hist.appendChild(row);
    });
  }

  function statsClassementParcours(coureurId, parcoursId) {
    var cl = classementCoureurs(parcoursId);
    var total = cl.length;
    var i = cl.findIndex(function (c) {
      return c.id === coureurId;
    });
    return {
      rang: i >= 0 ? i + 1 : null,
      total: total,
    };
  }

  var ICONES_STAT_FICHE = {
    parcours: "🗺️",
    moyenne: "⏱️",
    rang: "🏅",
    ok: "✅",
    err: "❌",
    rec: "⭐",
  };

  function celluleStatFiche(mod, valeur, libelle) {
    var ico = ICONES_STAT_FICHE[mod] || "";
    return (
      '<div class="orient-stats__cell orient-stats__cell--' +
      mod +
      '">' +
      '<span class="orient-stats__ico" aria-hidden="true">' +
      ico +
      "</span>" +
      "<strong>" +
      valeur +
      "</strong>" +
      "<span>" +
      libelle +
      "</span></div>"
    );
  }

  function remplirClassementModalArrivee(rang, total) {
    var bloc = document.getElementById("orient-arrivee-classement");
    var posEl = document.getElementById("orient-arrivee-rang-pos");
    var nbEl = document.getElementById("orient-arrivee-rang-nb");
    if (!bloc || rang == null || !total) {
      if (bloc) bloc.hidden = true;
      return;
    }
    var rangTxt = rang === 1 ? "1er" : rang + "e";
    bloc.hidden = false;
    if (posEl) {
      posEl.textContent = "🏅 Classement immédiat : " + rangTxt + " / " + total;
    }
    if (nbEl) {
      nbEl.textContent =
        total === 1
          ? "👤 1 coureur a réalisé ce parcours"
          : "👥 " + total + " coureurs ont réalisé ce parcours";
    }
  }

  function ouvrirModalArrivee(run, coureurId) {
    if (!arriveeModalEl || !run || run.endAt == null) return;
    finaliserRun(run);
    var temps = adjustedMs(run);
    var recAvant = recordParcours(run.parcoursId, run.id);
    var estRecord = !recAvant || temps < recAvant.ms;
    var clParcours = statsClassementParcours(coureurId, run.parcoursId);

    var titre = document.getElementById("orient-arrivee-titre");
    var badge = document.getElementById("orient-arrivee-badge");
    var nom = document.getElementById("orient-arrivee-nom");
    var parcours = document.getElementById("orient-arrivee-parcours");
    var tempsEl = document.getElementById("orient-arrivee-temps");
    var recordEl = document.getElementById("orient-arrivee-record");
    var ecartEl = document.getElementById("orient-arrivee-ecart");

    if (nom) nom.textContent = "👤 " + nomCoureur(coureurId);
    if (parcours) parcours.textContent = "🧭 " + nomParcours(run.parcoursId);
    if (tempsEl) tempsEl.textContent = formatMs(temps);
    if (titre) titre.textContent = estRecord ? "Bravo !" : "Arrivée enregistrée";
    if (badge) {
      badge.hidden = !estRecord;
      badge.textContent = estRecord ? "🏆 Record" : "";
    }
    remplirClassementModalArrivee(clParcours.rang, clParcours.total);
    if (recordEl) {
      if (estRecord) {
        recordEl.hidden = false;
        recordEl.textContent = "🎉 Nouveau record sur ce parcours !";
      } else {
        recordEl.hidden = true;
      }
    }
    if (ecartEl) {
      if (!estRecord && recAvant) {
        ecartEl.hidden = false;
        ecartEl.textContent =
          "⭐ Record : " +
          nomCoureur(recAvant.coureurId) +
          " (" +
          formatMs(recAvant.ms) +
          ") · Écart : " +
          formatEcartRecord(temps - recAvant.ms);
      } else {
        ecartEl.hidden = true;
      }
    }

    arriveeModalEl.hidden = false;
    arriveeModalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("orient-arrivee-modal-open");
    arriveeModalVisible = true;
    requestAnimationFrame(function () {
      arriveeModalEl.classList.add("orient-arrivee-modal--visible");
    });
    var btnOk = document.getElementById("orient-arrivee-ok");
    if (btnOk) btnOk.focus();
    if (estRecord) {
      setTimeout(function () {
        sonFelicitations();
      }, 380);
    }
  }

  function fermerModalArrivee() {
    if (!arriveeModalEl || !arriveeModalVisible) return;
    arriveeModalVisible = false;
    arriveeModalEl.classList.remove("orient-arrivee-modal--visible");
    document.body.classList.remove("orient-arrivee-modal-open");
    window.setTimeout(function () {
      if (!arriveeModalVisible) {
        arriveeModalEl.hidden = true;
        arriveeModalEl.setAttribute("aria-hidden", "true");
      }
    }, 300);
    fermerFiche();
    appliquerVue("course");
  }

  function majRecordAffiche(parcoursId) {
    var el = document.getElementById("orient-fiche-record");
    if (!el) return;
    if (!parcoursId) {
      el.hidden = true;
      return;
    }
    var rec = recordParcours(parcoursId);
    if (!rec) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent =
      "🏆 Record à battre : " + formatMs(rec.ms) + " — " + nomCoureur(rec.coureurId);
  }

  function renderFiche(coureurId, opts) {
    opts = opts || {};
    var c = getCoureur(coureurId);
    if (!c) return;
    var nomEl = document.getElementById("orient-fiche-nom");
    if (nomEl) nomEl.textContent = "🏃 " + c.nom;
    var dash = document.getElementById("orient-dash");
    if (dash) {
      var st = statsCoureur(coureurId);
      var rg = rangGeneral(coureurId);
      dash.innerHTML =
        '<div class="orient-stats__grid orient-stats__grid--6 orient-stats--fiche">' +
        celluleStatFiche("parcours", st.parcoursFaits, "parcours") +
        celluleStatFiche("moyenne", st.tempsMoyen != null ? formatMs(st.tempsMoyen) : "—", "moyenne") +
        celluleStatFiche("rang", rg != null ? rg + "e" : "—", "classement") +
        celluleStatFiche("ok", st.validations, "balises OK") +
        celluleStatFiche("err", st.erreurs, "erreurs") +
        celluleStatFiche("rec", st.records, "records") +
        "</div>";
    }
    var actif = runActif(coureurId);
    rebuildFicheParcoursPicker(coureurId, false);
    var attente = document.getElementById("orient-fiche-actions-attente");
    var course = document.getElementById("orient-fiche-actions-course");
    if (attente) attente.hidden = !!actif;
    if (!actif) majFicheDepart(coureurId);
    if (course) course.hidden = !actif;
    if (actif) majChronoLive();
    majFicheTermineDepuis();
    renderHistorique(coureurId, !actif);
    syncTick();
  }

  function majChronoLive() {
    if (!ficheCoureurId) return;
    var actif = runActif(ficheCoureurId);
    var el = document.getElementById("orient-chrono-live");
    if (el && actif) el.textContent = formatMs(elapsedLive(actif));
  }

  function majFicheTermineDepuis() {
    var el = document.getElementById("orient-fiche-termine-depuis");
    if (!el || !ficheCoureurId) return;
    var fin = instantTousParcoursTermines(ficheCoureurId);
    if (!fin) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent =
      "✅ Tous les parcours terminés depuis " +
      formatDepuis(Date.now() - fin) +
      " · à " +
      formatHeureLocale(fin);
  }

  function majPartiChrono() {
    if (!ficheCoureurId) return;
    var actif = runActif(ficheCoureurId);
    var el = document.getElementById("orient-parti-chrono");
    if (el && actif) el.textContent = formatMs(elapsedLive(actif));
  }

  function ouvrirFiche(coureurId) {
    ficheCoureurId = coureurId;
    ficheParcoursPickHash = "";
    fermerMenuFicheParcours();
    majAffichageFicheParcours("");
    if (ficheEl) ficheEl.hidden = false;
    renderFiche(coureurId);
  }

  function fermerFiche() {
    ficheCoureurId = null;
    if (ficheEl) ficheEl.hidden = true;
    renderGrille();
    planifierLayoutGrille();
  }

  function afficherParti(nom) {
    var nEl = document.getElementById("orient-parti-nom");
    var chEl = document.getElementById("orient-parti-chrono");
    if (nEl) nEl.textContent = nom;
    if (chEl) {
      chEl.hidden = (nom || "").indexOf(",") >= 0;
      chEl.textContent = chEl.hidden ? "" : "00:00";
    }
    if (partiEl) partiEl.hidden = false;
    majPartiChrono();
    syncTick();
  }

  function masquerParti() {
    if (partiEl) partiEl.hidden = true;
    fermerFiche();
    appliquerVue("course");
    syncTick();
  }

  function annulerDepart(coureurId) {
    var run = runActif(coureurId);
    if (!run) return;
    if (!confirm("Annuler ce départ ? Le chrono sera effacé.")) return;
    state.runs = state.runs.filter(function (r) {
      return r.id !== run.id;
    });
    sauverDebounced();
    if (partiEl && !partiEl.hidden) {
      var nomEl = document.getElementById("orient-parti-nom");
      var nom = nomCoureur(coureurId);
      if (nomEl && nomEl.textContent.indexOf(nom) >= 0) {
        partiEl.hidden = true;
      }
    }
    renderAll();
    renderFiche(coureurId);
    montrerOk("Départ annulé.");
  }

  function demarrerCourse(coureurId, parcoursId, opts) {
    opts = opts || {};
    if (runActif(coureurId)) return;
    if (!getParcours(parcoursId)) return;
    var faits = parcoursFaitsIds(coureurId);
    if (faits[parcoursId]) return;
    var run = {
      id: genererId("run"),
      coureurId: coureurId,
      parcoursId: parcoursId,
      startAt: Date.now(),
      endAt: null,
      elapsedMs: null,
      adjustedMs: null,
      balisesOk: 0,
      balisesFaux: 0,
    };
    state.runs.push(run);
    sauverDebounced();
    renderAll();
    if (opts.son !== false) sonDepart();
    if (!opts.sansParti) afficherParti(nomCoureur(coureurId));
  }

  function enregistrerArrivee(coureurId) {
    var run = runActif(coureurId);
    if (!run) return;
    run.endAt = Date.now();
    run.elapsedMs = run.endAt - run.startAt;
    finaliserRun(run);
    sauverDebounced();
    renderAll();
    sonArrivee();
    ouvrirModalArrivee(run, coureurId);
  }

  function ajouterParcours() {
    var n = state.parcours.length + 1;
    state.parcours.push({
      id: genererId("parcours"),
      nom: "Parcours " + n,
    });
    sauverDebounced();
    renderAll();
  }

  function validerListeCoureurs() {
    var ta = document.getElementById("orient-liste-brute");
    if (!ta) return;
    var lignes = (ta.value || "").split(/\r?\n/);
    var existants = {};
    state.coureurs.forEach(function (c) {
      existants[c.nom.toLowerCase()] = true;
    });
    var ajouts = 0;
    lignes.forEach(function (line) {
      var nom = normaliserNom(line);
      if (!nom) return;
      var key = nom.toLowerCase();
      if (existants[key]) return;
      existants[key] = true;
      state.coureurs.push(creerCoureur(nom));
      ajouts++;
    });
    ta.value = "";
    if (ajouts) {
      sauverDebounced();
      renderAll();
      montrerOk(ajouts + " coureur(s) ajouté(s).");
    }
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.", true);
      return;
    }
    ClassImport.open({
      onConfirm: function (eleves) {
        var existants = {};
        state.coureurs.forEach(function (c) {
          existants[c.nom.toLowerCase()] = true;
        });
        var ajouts = 0;
        eleves.forEach(function (e) {
          var nom = eleveVersNom(e);
          if (!nom) return;
          var key = nom.toLowerCase();
          if (existants[key]) return;
          existants[key] = true;
          state.coureurs.push(creerCoureur(nom));
          ajouts++;
        });
        if (ajouts) {
          sauverDebounced();
          renderAll();
          montrerOk(ajouts + " coureur(s) importé(s).");
        }
      },
    });
  }

  function getClassementExportData() {
    var sel = document.getElementById("orient-classement-parcours");
    var parcoursId = sel && sel.value ? sel.value : null;
    var titre = parcoursId
      ? "Classement — " + nomParcours(parcoursId)
      : "Classement général";
    var headers;
    var rows = [];
    if (parcoursId) {
      headers = ["Rang", "Coureur", "Temps ajusté", "Balises OK", "Balises fausses"];
      classementCoureurs(parcoursId).forEach(function (c, idx) {
        var r = state.runs.filter(function (x) {
          return x.coureurId === c.id && x.parcoursId === parcoursId && x.endAt;
        })[0];
        finaliserRun(r);
        rows.push([
          String(idx + 1),
          c.nom,
          formatMs(adjustedMs(r)),
          String(r.balisesOk || 0),
          String(r.balisesFaux || 0),
        ]);
      });
    } else {
      headers = [
        "Rang",
        "Coureur",
        "Parcours réalisés",
        "Temps moyen",
        "Temps total",
        "Validations",
        "Erreurs",
      ];
      classementCoureurs(null).forEach(function (c, idx) {
        var st = statsCoureur(c.id);
        rows.push([
          String(idx + 1),
          c.nom,
          String(st.parcoursFaits),
          st.tempsMoyen != null ? formatMs(st.tempsMoyen) : "",
          st.tempsTotal != null ? formatMs(st.tempsTotal) : "",
          String(st.validations),
          String(st.erreurs),
        ]);
      });
    }
    return {
      parcoursId: parcoursId,
      titre: titre,
      headers: headers,
      rows: rows,
      fileBase: parcoursId
        ? "classement-" + nomParcours(parcoursId).replace(/\s+/g, "-")
        : "classement-orientation",
    };
  }

  function exportCsv() {
    var data = getClassementExportData();
    var lignes = [data.headers.join(";")];
    data.rows.forEach(function (row) {
      lignes.push(row.join(";"));
    });
    var blob = new Blob(["\ufeff" + lignes.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = data.fileBase + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    montrerOk("Classement exporté en CSV.");
  }

  function exportPdf() {
    var data = getClassementExportData();
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Export PDF indisponible (jsPDF non chargé).", true);
      return;
    }
    if (!data.rows.length) {
      montrerMsg("Aucun résultat à exporter.", true);
      return;
    }
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    var margin = 14;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 39, 68);
    doc.text("Course d'orientation", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(data.titre, margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString("fr-FR"), margin, y);
    y += 10;
    doc.setTextColor(15, 23, 42);
    var colCount = data.headers.length;
    var colW = (pageW - 2 * margin) / colCount;
    var rowH = 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    data.headers.forEach(function (h, i) {
      doc.text(h, margin + i * colW + 1, y, { maxWidth: colW - 2 });
    });
    y += rowH;
    doc.setFont("helvetica", "normal");
    data.rows.forEach(function (row) {
      if (y > pageH - margin - rowH) {
        doc.addPage();
        y = margin;
      }
      row.forEach(function (cell, i) {
        doc.text(String(cell), margin + i * colW + 1, y, { maxWidth: colW - 2 });
      });
      y += rowH;
    });
    doc.save(data.fileBase + ".pdf");
    montrerOk("Classement exporté en PDF.");
  }

  function departGroupe() {
    var checks = document.querySelectorAll(".orient-depart-chk:checked");
    if (!checks.length) return;
    var noms = [];
    checks.forEach(function (chk) {
      var cid = chk.dataset.coureurId;
      var sel = document.querySelector(
        '.orient-depart-parcours[data-coureur-id="' + cid + '"]'
      );
      if (!sel || !sel.value) return;
      demarrerCourse(cid, sel.value, { son: false, sansParti: true });
      noms.push(nomCoureur(cid));
    });
    if (!noms.length) {
      majDepartAlertes();
      montrerMsg("Cochez des coureurs et choisissez un parcours pour chacun.", true);
      return;
    }
    sonDepart();
    montrerOk("Départ de " + noms.length + " coureur(s).");
    renderDepartListe();
    majDepartGo();
  }

  var VUES_ELEVE = ["course", "classement"];
  var VUES_PRO = ["departs", "gestion", "reglages"];

  function estVueEleve(view) {
    return VUES_ELEVE.indexOf(view) >= 0;
  }

  function appliquerVue(view) {
    vueActive = view;
    var eleve = estVueEleve(view);
    var pro = !eleve;
    var root = document.getElementById("orient-root");
    var shell = document.querySelector(".orient-shell");
    var dock = document.querySelector(".orient-dock--eleve");
    var panels = {
      course: document.getElementById("orient-panel-course"),
      classement: document.getElementById("orient-panel-classement"),
      departs: document.getElementById("orient-panel-departs"),
      gestion: document.getElementById("orient-panel-gestion"),
      reglages: document.getElementById("orient-panel-reglages"),
    };
    document.querySelectorAll(".orient-dock__btn[data-view]").forEach(function (tab) {
      var on = tab.getAttribute("data-view") === view;
      tab.classList.toggle("orient-dock__btn--active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".orient-pro-tabs__btn[data-view]").forEach(function (tab) {
      var on = tab.getAttribute("data-view") === view;
      tab.classList.toggle("orient-pro-tabs__btn--active", on);
    });
    Object.keys(panels).forEach(function (k) {
      var p = panels[k];
      if (p) p.hidden = k !== view;
    });
    if (root) {
      root.classList.toggle("orient-mode-eleve", eleve);
      root.classList.toggle("orient-mode-pro", pro);
    }
    if (shell) {
      shell.classList.toggle("orient-shell--immersive", eleve);
      shell.classList.toggle("orient-shell--pro", pro);
    }
    if (dock) dock.hidden = pro;
    document.querySelectorAll(".orient-pro-only").forEach(function (el) {
      if (el.classList.contains("orient-pro-top")) {
        el.hidden = !pro;
      } else {
        el.hidden = !pro;
      }
    });
    if (view === "departs") renderDepartListe();
    if (view === "classement") renderClassement();
    if (view === "course") renderGrille();
  }

  function initNav() {
    if (navLiee) return;
    navLiee = true;
    document.querySelectorAll(".orient-dock__btn[data-view]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        appliquerVue(tab.getAttribute("data-view"));
      });
    });
    document.querySelectorAll(".orient-pro-tabs__btn[data-view]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        appliquerVue(tab.getAttribute("data-view"));
      });
    });
    var openPro = document.getElementById("orient-open-pro");
    if (openPro) {
      openPro.addEventListener("click", function () {
        appliquerVue("gestion");
      });
    }
    var retour = document.getElementById("orient-retour-eleve");
    if (retour) {
      retour.addEventListener("click", function () {
        appliquerVue("course");
      });
    }
  }

  function bindEvents() {
    if (eventsLies) return;
    eventsLies = true;
    document.getElementById("orient-add-parcours").addEventListener("click", ajouterParcours);
    document.getElementById("orient-valider-liste").addEventListener("click", validerListeCoureurs);
    document.getElementById("orient-import-classe").addEventListener("click", importerClasse);
    document.getElementById("orient-fiche-back").addEventListener("click", fermerFiche);
    document.getElementById("orient-btn-export-csv").addEventListener("click", exportCsv);
    document.getElementById("orient-btn-export-pdf").addEventListener("click", exportPdf);
    document.getElementById("orient-classement-parcours").addEventListener("change", function (e) {
      renderClassement();
      fermerSelectNatif(e.target);
    });
    document.getElementById("orient-depart-go").addEventListener("click", departGroupe);
    document.getElementById("orient-depart-tout").addEventListener("click", function () {
      document.querySelectorAll(".orient-depart-chk").forEach(function (c) {
        c.checked = true;
      });
      majDepartGo();
    });
    document.getElementById("orient-depart-rien").addEventListener("click", function () {
      document.querySelectorAll(".orient-depart-chk").forEach(function (c) {
        c.checked = false;
      });
      majDepartGo();
    });
    document.getElementById("orient-parti-ok").addEventListener("click", masquerParti);
    document.getElementById("orient-btn-start").addEventListener("click", function () {
      if (!ficheCoureurId) return;
      var parcoursId = getFicheParcoursSelection();
      var btnPick = getFicheParcoursBtn();
      if (!parcoursId) {
        if (btnPick) btnPick.classList.add("orient-select--alert");
        montrerMsg("Choisissez un parcours.", true);
        return;
      }
      if (btnPick) btnPick.classList.remove("orient-select--alert");
      demarrerCourse(ficheCoureurId, parcoursId);
      renderFiche(ficheCoureurId);
    });
    document.getElementById("orient-btn-arrivee").addEventListener("click", function () {
      if (ficheCoureurId) enregistrerArrivee(ficheCoureurId);
    });
    document.getElementById("orient-btn-annuler-depart").addEventListener("click", function () {
      if (ficheCoureurId) annulerDepart(ficheCoureurId);
    });
    document.getElementById("orient-arrivee-ok").addEventListener("click", fermerModalArrivee);
    var arriveeBackdrop = document.getElementById("orient-arrivee-backdrop");
    if (arriveeBackdrop) {
      arriveeBackdrop.addEventListener("click", fermerModalArrivee);
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (ficheParcoursMenuOpen) {
        fermerMenuFicheParcours();
        return;
      }
      if (arriveeModalVisible) {
        e.preventDefault();
        fermerModalArrivee();
      }
    });
    var btnFicheParcours = document.getElementById("orient-fiche-parcours-btn");
    if (btnFicheParcours) {
      btnFicheParcours.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleMenuFicheParcours();
      });
    }
    document.addEventListener("click", function (e) {
      if (!ficheParcoursMenuOpen) return;
      var wrap = document.getElementById("orient-fiche-parcours-wrap");
      if (wrap && wrap.contains(e.target)) return;
      fermerMenuFicheParcours();
    });
    ["orient-penalite", "orient-bonus", "orient-retard"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        state.settings.penaliteFausseSec = parseInt(document.getElementById("orient-penalite").value, 10) || 0;
        state.settings.bonusCorrecteSec = parseInt(document.getElementById("orient-bonus").value, 10) || 0;
        state.settings.retardMinutes = parseInt(document.getElementById("orient-retard").value, 10) || 10;
        state.runs.forEach(function (r) {
          if (r.endAt) r.adjustedMs = null;
        });
        sauverDebounced();
        renderAll();
      });
    });
    document.getElementById("orient-allow-delete").addEventListener("change", function () {
      state.settings.allowDeleteTime = document.getElementById("orient-allow-delete").checked;
      sauverDebounced();
      if (ficheCoureurId) renderFiche(ficheCoureurId);
    });
    document.getElementById("orient-edit-coureur").addEventListener("change", renderEditTempsSelects);
    document.getElementById("orient-edit-run").addEventListener("change", majEditTempsForm);
    document.getElementById("orient-edit-delete").addEventListener("click", supprimerTempsEdit);
    document.getElementById("orient-edit-save").addEventListener("click", enregistrerTempsEdit);
    var editSecEl = document.getElementById("orient-edit-temps-sec");
    if (editSecEl) {
      editSecEl.addEventListener("blur", normaliserEditTempsSec);
    }
    document.body.addEventListener(
      "click",
      function () {
        unlockAudio();
      },
      { once: true }
    );
    observGrilleResize();
  }

  function initSession() {
    return charger().then(function () {
      renderAll();
      initNav();
      bindEvents();
      planifierLayoutGrille();
      appliquerVue("gestion");
    });
  }

  if (typeof SessionManager !== "undefined" && typeof DataManager !== "undefined") {
    SessionManager.init({
      toolId: DataManager.SESSION_TOOLS.ORIENTATION,
      toolLabel: "Course d’orientation",
      onSessionReady: initSession,
      onSessionCleared: function () {
        state = {
          parcours: [],
          coureurs: [],
          runs: [],
          settings: {
            penaliteFausseSec: 30,
            bonusCorrecteSec: 0,
            retardMinutes: 10,
            allowDeleteTime: false,
            classementCriteres: [
              { key: "parcoursFaits", order: "desc" },
              { key: "tempsMoyen", order: "asc" },
              { key: "tempsTotal", order: "asc" },
              { key: "erreurs", order: "asc" },
              { key: "validations", order: "desc" },
            ],
          },
        };
        ficheCoureurId = null;
        if (ficheEl) ficheEl.hidden = true;
        renderAll();
      },
    });
  } else {
    initSession();
  }
})();
