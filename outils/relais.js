/**
 * Relais — chronométrage 3 zones côté professeur.
 * Séance, import classe, association donneur/receveur, résultats agrégés, export CSV/PDF (passages inclus).
 */
(function () {
  "use strict";

  var TOOL_ID = "relais";
  var TOOL_LABEL = "Relais (prof)";
  var managerSessionId = null;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var els = {
    msg: $("rl-msg"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".relais-nav .dispense-nav__btn[data-screen]")),
    screens: Array.prototype.slice.call(document.querySelectorAll(".dispense-view[data-screen]")),
    accRunnersBadge: $("rl-acc-runners-badge"),
    runnersList: $("rl-runners-list"),
    importText: $("rl-import-text"),
    resultsWrap: $("rl-results-wrap"),
    resultsEmpty: $("rl-results-empty"),
    runsList: $("rl-runs-list"),
    runsEmpty: $("rl-runs-empty"),
    saveDialog: $("rl-save-dialog"),
    dialogTime: $("rl-dialog-time"),
    donneurSelect: $("rl-donneur-select"),
    receveurSelect: $("rl-receveur-select"),
    dialogPenalHorsZoneEl: $("rl-dialog-penal-hors-zone"),
    dialogPenalTemoinEl: $("rl-dialog-penal-temoin"),
    sortResults: $("rl-sort-results"),
    reglagesEl: $("relais-reglages"),
    distZ1El: $("relais-dist-z1"),
    distZTEl: $("relais-dist-zt"),
    distZ2El: $("relais-dist-z2"),
    totalDistEl: $("relais-total-dist"),
    trackZ1El: $("relais-track-z1"),
    trackZTEl: $("relais-track-zt"),
    trackZ2El: $("relais-track-z2"),
    donneurEl: $("relais-donneur"),
    receveurEl: $("relais-receveur"),
    transmissionEl: $("relais-transmission"),
    chronoEl: $("relais-chrono"),
    liveZ1El: $("relais-live-z1"),
    liveZTEl: $("relais-live-zt"),
    liveZ2El: $("relais-live-z2"),
    liveSpeedZ1El: $("relais-live-speed-z1"),
    liveSpeedZTEl: $("relais-live-speed-zt"),
    liveSpeedZ2El: $("relais-live-speed-z2"),
    livePctZ1El: $("relais-live-pct-z1"),
    livePctZTEl: $("relais-live-pct-zt"),
    livePctZ2El: $("relais-live-pct-z2"),
    courseMsgEl: $("relais-msg"),
    btnDepart: $("relais-btn-depart"),
    btnEntree: $("relais-btn-entree"),
    btnSortie: $("relais-btn-sortie"),
    btnArrivee: $("relais-btn-arrivee"),
    btnReset: $("relais-btn-reset"),
    effEl: $("relais-eff"),
    effNote10El: $("relais-eff-note10"),
    effVerdictEl: $("relais-eff-verdict"),
  };

  var state = {
    screen: "home",
    settings: { z1: 20, zt: 20, z2: 20 },
    runners: [],
    results: [],
    resultsSort: "best",
    expandedRunnerId: "",
  };

  /** @type {'pret'|'z1'|'zt'|'z2'|'fini'|'attente-save'} */
  var phase = "pret";
  var tickId = null;
  var startedAt = 0;
  var elapsedCs = 0;
  var markZ1Cs = 0;
  var markZTEndCs = 0;
  var markZ2Cs = 0;
  var audioCtx = null;
  var pendingRun = null;

  var resultat = {
    totalCs: 0,
    z1Cs: 0,
    ztCs: 0,
    z2Cs: 0,
    v1: null,
    vzt: null,
    v2: null,
  };

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function montrerMsg(msg, isError) {
    if (!els.msg) return;
    els.msg.hidden = !msg;
    els.msg.textContent = msg || "";
    if (isError !== undefined) els.msg.classList.toggle("msg-error", !!isError);
  }

  function montrerCourseMsg(msg) {
    if (!els.courseMsgEl) return;
    els.courseMsgEl.hidden = !msg;
    els.courseMsgEl.textContent = msg || "";
  }

  function lireDistance(el) {
    var n = parseInt(el && el.value, 10);
    return isFinite(n) && n > 0 ? n : NaN;
  }

  function lireReglages() {
    var z1 = lireDistance(els.distZ1El);
    var zt = lireDistance(els.distZTEl);
    var z2 = lireDistance(els.distZ2El);
    return {
      z1: z1,
      zt: zt,
      z2: z2,
      total: isFinite(z1) && isFinite(zt) && isFinite(z2) ? z1 + zt + z2 : NaN,
      valid: isFinite(z1) && isFinite(zt) && isFinite(z2),
    };
  }

  function formaterTemps(cs) {
    if (!isFinite(cs) || cs < 0) return "—";
    return (Math.round(cs) / 100).toFixed(2) + " sec";
  }

  function formaterVitesse(kmh, zeroParDefaut) {
    if (!isFinite(kmh) || kmh <= 0) return zeroParDefaut ? "0.0 km/h" : "— km/h";
    return (Math.round(kmh * 10) / 10).toFixed(1) + " km/h";
  }

  function vitesseKmh(distanceM, cs) {
    if (!isFinite(distanceM) || !isFinite(cs) || distanceM <= 0 || cs <= 0) return NaN;
    return (distanceM / (cs / 100)) * 3.6;
  }

  function audioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function beep(freq, duree) {
    var AC = audioContextClass();
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var now = audioCtx.currentTime;
    osc.frequency.value = freq || 820;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (duree || 0.18));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + (duree || 0.22));
  }

  function sireneDepart() {
    beep(520, 0.12);
    setTimeout(function () {
      beep(880, 0.35);
    }, 140);
  }

  function runnerDisplayName(runner) {
    if (!runner) return "";
    if (runner.displayName) return runner.displayName;
    return [runner.prenom, runner.nom].filter(Boolean).join(" ") || runner.nom || "";
  }

  function serializeShell() {
    return {
      settings: Object.assign({}, state.settings),
      runners: state.runners.slice(),
      results: state.results.slice(),
    };
  }

  function applyShellPayload(payload) {
    payload = payload || {};
    state.settings = Object.assign({ z1: 20, zt: 20, z2: 20 }, payload.settings || {});
    state.runners = Array.isArray(payload.runners) ? payload.runners.slice() : [];
    state.results = Array.isArray(payload.results) ? payload.results.slice() : [];
  }

  function resetShellForManagerSession() {
    state.settings = { z1: 20, zt: 20, z2: 20 };
    state.runners = [];
    state.results = [];
  }

  function writeSettingsToUi() {
    if (els.distZ1El) els.distZ1El.value = String(state.settings.z1 || 20);
    if (els.distZTEl) els.distZTEl.value = String(state.settings.zt || 20);
    if (els.distZ2El) els.distZ2El.value = String(state.settings.z2 || 20);
    majDistancesAffichees();
  }

  function readSettingsFromUi() {
    var reg = lireReglages();
    state.settings = { z1: reg.z1, zt: reg.zt, z2: reg.z2 };
  }

  function saveSessionData() {
    if (!managerSessionId || typeof DataManager === "undefined" || !DataManager.saveRelaisForSession) {
      return Promise.resolve();
    }
    readSettingsFromUi();
    return DataManager.saveRelaisForSession(managerSessionId, serializeShell());
  }

  function loadManagerSession(session) {
    managerSessionId = session.id;
    return DataManager.getRelaisForSession(session.id)
      .then(function (payload) {
        if (payload) applyShellPayload(payload);
        else resetShellForManagerSession();
        writeSettingsToUi();
        renderRunners();
        renderResults();
        resetCourse();
        montrerMsg("");
      })
      .catch(function () {
        montrerMsg("Impossible de charger cette séance.", true);
      });
  }

  function clearManagerSession() {
    managerSessionId = null;
    resetShellForManagerSession();
    writeSettingsToUi();
    renderRunners();
    renderResults();
    resetCourse();
  }

  function bootWithoutSessionManager() {
    writeSettingsToUi();
    renderRunners();
    renderResults();
    resetCourse();
    var gated = document.querySelector(".tool-session-gated");
    if (gated) gated.hidden = false;
  }

  function setScreen(screen) {
    state.screen = screen;
    els.tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-screen") === screen;
      tab.classList.toggle("dispense-nav__btn--active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });
    els.screens.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-screen") !== screen;
    });
    if (screen === "results") renderResults();
    if (screen === "home") renderRunners();
  }

  function addRunner(name, className, eleveId, persist) {
    var clean = String(name || "").trim().replace(/\s+/g, " ");
    if (!clean) return null;
    var parts = clean.split(" ");
    var runner = {
      id: uid("runner"),
      eleveId: eleveId || "",
      nom: parts.length > 1 ? parts.slice(1).join(" ") : clean,
      prenom: parts.length > 1 ? parts[0] : "",
      displayName: clean,
      className: className || "",
    };
    state.runners.push(runner);
    if (persist !== false) {
      saveSessionData().then(function () {
        renderRunners();
      });
    }
    return runner;
  }

  function renderRunners() {
    if (els.accRunnersBadge) els.accRunnersBadge.textContent = String(state.runners.length);
    if (!els.runnersList) return;
    els.runnersList.innerHTML = "";
    if (!state.runners.length) {
      els.runnersList.innerHTML = "<li class=\"hint\">Aucun coureur. Importez une classe ou ajoutez une liste.</li>";
      return;
    }
    state.runners.forEach(function (runner) {
      var li = document.createElement("li");
      li.className = "photo-finish-runner";
      li.innerHTML =
        "<span><strong>" +
        escapeHtml(runnerDisplayName(runner)) +
        "</strong><small>" +
        escapeHtml(runner.className || "Sans classe") +
        "</small></span><button type=\"button\" class=\"btn btn--ghost\">Supprimer</button>";
      li.querySelector("button").addEventListener("click", function () {
        state.runners = state.runners.filter(function (r) {
          return r.id !== runner.id;
        });
        state.results = state.results.filter(function (res) {
          return res.donneurId !== runner.id && res.receveurId !== runner.id;
        });
        saveSessionData().then(function () {
          renderRunners();
          renderResults();
        });
      });
      els.runnersList.appendChild(li);
    });
  }

  function importClassFromTool() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.", true);
      return;
    }
    ClassImport.open({
      title: "Importer depuis une classe",
      hint: "Cochez les coureurs à ajouter.",
      onConfirm: function (eleves, classe) {
        var className = classe && classe.nom ? classe.nom : "";
        eleves.forEach(function (eleve) {
          var name =
            typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
              ? EleveDisplay.formatEleveListe(eleve)
              : [eleve.prenom, eleve.nom].filter(Boolean).join(" ");
          addRunner(name, className, eleve.id || "", false);
        });
        saveSessionData().then(function () {
          renderRunners();
          montrerMsg("");
        });
      },
    });
  }

  function validerListeManuelle() {
    if (!els.importText) return;
    var lines = els.importText.value.split(/\r?\n/);
    var added = 0;
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(";");
      var nom = "";
      var prenom = "";
      var className = "";
      if (parts.length >= 3) {
        nom = parts[0].trim();
        prenom = parts[1].trim();
        className = parts[2].trim();
      } else if (parts.length === 2) {
        nom = parts[0].trim();
        prenom = parts[1].trim();
      } else {
        var sp = line.split(/\s+/);
        if (sp.length > 1) {
          prenom = sp[0];
          nom = sp.slice(1).join(" ");
        } else {
          nom = line;
        }
      }
      var display = [prenom, nom].filter(Boolean).join(" ");
      if (addRunner(display, className, "", false)) added++;
    });
    if (!added) {
      montrerMsg("Aucun coureur valide dans la liste.", true);
      return;
    }
    els.importText.value = "";
    saveSessionData().then(function () {
      renderRunners();
      montrerMsg(added + " coureur" + (added > 1 ? "s" : "") + " ajouté" + (added > 1 ? "s" : "") + ".");
    });
  }

  function majDistancesAffichees() {
    var reg = lireReglages();
    if (els.trackZ1El) els.trackZ1El.textContent = isFinite(reg.z1) ? String(reg.z1) : "—";
    if (els.trackZTEl) els.trackZTEl.textContent = isFinite(reg.zt) ? String(reg.zt) : "—";
    if (els.trackZ2El) els.trackZ2El.textContent = isFinite(reg.z2) ? String(reg.z2) : "—";
    if (els.totalDistEl) els.totalDistEl.textContent = isFinite(reg.total) ? String(reg.total) : "—";
  }

  function majRunner(pos) {
    document.querySelectorAll(".relais-scene [data-zone]").forEach(function (el) {
      var z = el.getAttribute("data-zone");
      el.classList.toggle("is-active", pos === z || (pos === "depart" && z === "z1"));
    });
    document.querySelectorAll(".relais-table [data-zone]").forEach(function (el) {
      el.classList.toggle("is-active", pos === el.getAttribute("data-zone"));
    });
    if (!els.donneurEl || !els.receveurEl) return;
    if (els.transmissionEl) els.transmissionEl.hidden = pos !== "zt";
    els.donneurEl.hidden = false;
    els.receveurEl.hidden = false;
    if (pos === "depart") {
      els.donneurEl.setAttribute("data-pos", "depart");
      els.receveurEl.hidden = true;
      return;
    }
    if (pos === "z1") {
      els.donneurEl.setAttribute("data-pos", "z1");
      els.receveurEl.hidden = true;
      return;
    }
    if (pos === "zt") {
      els.donneurEl.hidden = true;
      els.receveurEl.hidden = true;
      return;
    }
    if (pos === "z2") {
      els.donneurEl.hidden = true;
      els.receveurEl.setAttribute("data-pos", "z2");
      return;
    }
    if (pos === "arrivee") {
      els.donneurEl.hidden = true;
      els.receveurEl.setAttribute("data-pos", "arrivee");
    }
  }

  function noteDepuisIT(itReel, itIdeal) {
    var note = 10 - (itReel - itIdeal) / 2;
    return Math.max(0, Math.min(10, Math.round(note * 10) / 10));
  }

  function lirePenalitesDialog() {
    return {
      horsZone: !!(els.dialogPenalHorsZoneEl && els.dialogPenalHorsZoneEl.checked),
      temoinTombe: !!(els.dialogPenalTemoinEl && els.dialogPenalTemoinEl.checked),
    };
  }

  function libellePenalite(penal) {
    if (penal.horsZone && penal.temoinTombe) return "Transmission hors zone et témoin tombé";
    if (penal.horsZone) return "Transmission hors zone";
    if (penal.temoinTombe) return "Témoin tombé";
    return "";
  }

  function reinitialiserPenalites() {
    if (els.dialogPenalHorsZoneEl) els.dialogPenalHorsZoneEl.checked = false;
    if (els.dialogPenalTemoinEl) els.dialogPenalTemoinEl.checked = false;
  }

  function calculerEfficaciteZT(penalOverride) {
    var reg = lireReglages();
    var totalCs = resultat.totalCs;
    if (!resultat.ztCs || !reg.zt || !reg.total || reg.total <= 0 || !totalCs || totalCs <= 0) {
      return null;
    }
    var itIdeal = (reg.zt / reg.total) * 100;
    var itReel = (resultat.ztCs / totalCs) * 100;
    var noteBrute = noteDepuisIT(itReel, itIdeal);
    var penal = penalOverride || lirePenalitesDialog();
    var penalite = penal.horsZone || penal.temoinTombe;
    var note10 = penalite ? 0 : noteBrute;
    return {
      note10: note10,
      noteBrute: noteBrute,
      penalite: penalite,
      penaliteLabel: libellePenalite(penal),
      penaliteHorsZone: penal.horsZone,
      penaliteTemoinTombe: penal.temoinTombe,
      verdict: penalite
        ? libellePenalite(penal)
        : note10 >= 9
          ? "Excellente transmission"
          : note10 >= 8
            ? "Bonne transmission"
            : note10 >= 7
              ? "Transmission correcte"
              : "Transmission à améliorer",
    };
  }

  function niveauEfficacite(eff) {
    if (eff && eff.penalite) {
      return { cls: "is-low", label: eff.penaliteLabel || "Note nulle (incident)" };
    }
    var note10 = eff ? eff.note10 : NaN;
    if (note10 >= 9) return { cls: "is-excellent", label: "Excellente transmission" };
    if (note10 >= 8) return { cls: "is-good", label: "Bonne transmission" };
    if (note10 >= 7) return { cls: "is-medium", label: "Transmission correcte" };
    return { cls: "is-low", label: "Transmission à améliorer" };
  }

  function formaterNote10(note10) {
    if (!isFinite(note10)) return "— / 10";
    return note10.toFixed(1).replace(".", ",") + " / 10";
  }

  function pctTempsZone(cs, totalCs) {
    if (!isFinite(cs) || !isFinite(totalCs) || totalCs <= 0) return 0;
    return Math.round((cs / totalCs) * 100);
  }

  function formaterPctTemps(cs, totalCs) {
    return pctTempsZone(cs, totalCs) + " % du temps";
  }

  function majEfficaciteZT() {
    var eff = calculerEfficaciteZT();
    if (!els.effEl) return;
    if (!eff || (phase !== "fini" && phase !== "attente-save")) {
      els.effEl.hidden = true;
      return;
    }
    var niv = niveauEfficacite(eff);
    els.effEl.hidden = false;
    els.effEl.className = "relais-eff-zt relais-eff-zt--live " + niv.cls;
    if (els.effNote10El) els.effNote10El.textContent = formaterNote10(eff.note10);
    if (els.effVerdictEl) els.effVerdictEl.textContent = niv.label;
  }

  function elapsedDepuisDepart() {
    if (phase === "pret" || phase === "fini" || phase === "attente-save") return elapsedCs;
    return elapsedCs + Math.round((Date.now() - startedAt) / 10);
  }

  function majChrono() {
    if (els.chronoEl) els.chronoEl.textContent = formaterTemps(elapsedDepuisDepart());
  }

  function clearTick() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function freezeTick() {
    clearTick();
    if (phase !== "pret" && phase !== "fini" && phase !== "attente-save" && startedAt > 0) {
      elapsedCs += Math.round((Date.now() - startedAt) / 10);
      startedAt = 0;
    }
  }

  function startTick() {
    clearTick();
    startedAt = Date.now();
    tickId = setInterval(majChrono, 10);
    majChrono();
  }

  function majBoutons() {
    var liveCard = document.querySelector(".relais-live-card");
    if (liveCard) {
      liveCard.classList.toggle("is-racing", phase === "z1" || phase === "zt" || phase === "z2");
    }
    if (els.btnDepart) els.btnDepart.hidden = phase !== "pret";
    if (els.btnEntree) els.btnEntree.hidden = phase !== "z1";
    if (els.btnSortie) els.btnSortie.hidden = phase !== "zt";
    if (els.btnArrivee) els.btnArrivee.hidden = phase !== "z2";
    if (els.btnReset) els.btnReset.hidden = phase !== "fini" && phase !== "attente-save";
    var courseEnCours = phase !== "pret" && phase !== "fini" && phase !== "attente-save";
    [els.distZ1El, els.distZ2El, els.distZTEl].forEach(function (el) {
      if (el) el.disabled = courseEnCours;
    });
    if (els.reglagesEl && courseEnCours) els.reglagesEl.open = false;
  }

  function majLiveZone(z1Cs, ztCs, z2Cs) {
    var reg = lireReglages();
    var total = z1Cs + ztCs + z2Cs;
    if (els.liveZ1El) els.liveZ1El.textContent = formaterTemps(z1Cs);
    if (els.liveZTEl) els.liveZTEl.textContent = formaterTemps(ztCs);
    if (els.liveZ2El) els.liveZ2El.textContent = formaterTemps(z2Cs);
    if (els.liveSpeedZ1El) els.liveSpeedZ1El.textContent = formaterVitesse(vitesseKmh(reg.z1, z1Cs), z1Cs === 0);
    if (els.liveSpeedZTEl) els.liveSpeedZTEl.textContent = formaterVitesse(vitesseKmh(reg.zt, ztCs), ztCs === 0);
    if (els.liveSpeedZ2El) els.liveSpeedZ2El.textContent = formaterVitesse(vitesseKmh(reg.z2, z2Cs), z2Cs === 0);
    if (els.livePctZ1El) els.livePctZ1El.textContent = formaterPctTemps(z1Cs, total);
    if (els.livePctZTEl) els.livePctZTEl.textContent = formaterPctTemps(ztCs, total);
    if (els.livePctZ2El) els.livePctZ2El.textContent = formaterPctTemps(z2Cs, total);
  }

  function calculerResultat() {
    var reg = lireReglages();
    resultat = {
      totalCs: markZ2Cs,
      z1Cs: markZ1Cs,
      ztCs: markZTEndCs - markZ1Cs,
      z2Cs: markZ2Cs - markZTEndCs,
      v1: vitesseKmh(reg.z1, markZ1Cs),
      vzt: vitesseKmh(reg.zt, markZTEndCs - markZ1Cs),
      v2: vitesseKmh(reg.z2, markZ2Cs - markZTEndCs),
    };
  }

  function buildRunPayload(penalOverride) {
    calculerResultat();
    var reg = lireReglages();
    var eff = calculerEfficaciteZT(penalOverride);
    return {
      totalCs: resultat.totalCs,
      formattedTotal: formaterTemps(resultat.totalCs),
      distances: { z1: reg.z1, zt: reg.zt, z2: reg.z2, total: reg.total },
      temps: {
        total: formaterTemps(resultat.totalCs),
        z1: formaterTemps(resultat.z1Cs),
        zt: formaterTemps(resultat.ztCs),
        z2: formaterTemps(resultat.z2Cs),
      },
      vitesses: {
        z1: isFinite(resultat.v1) ? Math.round(resultat.v1 * 10) / 10 : null,
        zt: isFinite(resultat.vzt) ? Math.round(resultat.vzt * 10) / 10 : null,
        z2: isFinite(resultat.v2) ? Math.round(resultat.v2 * 10) / 10 : null,
      },
      efficaciteZT: eff
        ? {
            note10: eff.note10,
            verdict: eff.verdict,
            penalite: eff.penalite,
            penaliteLabel: eff.penaliteLabel,
            penaliteHorsZone: eff.penaliteHorsZone,
            penaliteTemoinTombe: eff.penaliteTemoinTombe,
          }
        : null,
    };
  }

  function remplirSelectCoureurs(selectEl, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choisir…";
    selectEl.appendChild(placeholder);
    state.runners.forEach(function (runner) {
      var opt = document.createElement("option");
      opt.value = runner.id;
      opt.textContent =
        runnerDisplayName(runner) + (runner.className ? " (" + runner.className + ")" : "");
      if (selectedId === runner.id) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function ouvrirDialogEnregistrement() {
    reinitialiserPenalites();
    pendingRun = buildRunPayload(lirePenalitesDialog());
    if (els.dialogTime) els.dialogTime.textContent = pendingRun.formattedTotal;
    remplirSelectCoureurs(els.donneurSelect, "");
    remplirSelectCoureurs(els.receveurSelect, "");
    if (els.saveDialog && typeof els.saveDialog.showModal === "function") els.saveDialog.showModal();
  }

  function fermerDialogEnregistrement() {
    if (els.saveDialog && typeof els.saveDialog.close === "function") els.saveDialog.close();
  }

  function enregistrerPassage() {
    if (!pendingRun) return;
    var donneurId = els.donneurSelect ? els.donneurSelect.value : "";
    var receveurId = els.receveurSelect ? els.receveurSelect.value : "";
    if (!donneurId || !receveurId) {
      montrerCourseMsg("Choisissez le donneur et le receveur.");
      return;
    }
    if (donneurId === receveurId) {
      montrerCourseMsg("Le donneur et le receveur doivent être différents.");
      return;
    }
    var donneur = state.runners.filter(function (r) {
      return r.id === donneurId;
    })[0];
    var receveur = state.runners.filter(function (r) {
      return r.id === receveurId;
    })[0];
    if (!donneur || !receveur) {
      montrerCourseMsg("Coureurs invalides.");
      return;
    }
    var penal = lirePenalitesDialog();
    var payload = buildRunPayload(penal);
    var valid = !(penal.horsZone || penal.temoinTombe);
    state.results.push({
      id: uid("run"),
      date: new Date().toISOString(),
      donneurId: donneurId,
      receveurId: receveurId,
      donneurNom: runnerDisplayName(donneur),
      receveurNom: runnerDisplayName(receveur),
      donneurClasse: donneur.className || "",
      receveurClasse: receveur.className || "",
      totalCs: payload.totalCs,
      formattedTotal: payload.formattedTotal,
      temps: payload.temps,
      vitesses: payload.vitesses,
      distances: payload.distances,
      efficaciteZT: payload.efficaciteZT,
      valid: valid,
      penaliteHorsZone: penal.horsZone,
      penaliteTemoinTombe: penal.temoinTombe,
      penaliteLabel: libellePenalite(penal),
    });
    pendingRun = null;
    fermerDialogEnregistrement();
    montrerCourseMsg("");
    phase = "fini";
    majBoutons();
    saveSessionData().then(function () {
      renderResults();
      montrerMsg("Passage enregistré.");
    });
  }

  function onDepart() {
    var reg = lireReglages();
    if (!reg.valid) {
      montrerCourseMsg("Vérifiez les distances (entre 1 et 99 m).");
      return;
    }
    if (!state.runners.length) {
      montrerCourseMsg("Importez des coureurs dans l’onglet Séance avant de chronométrer.");
      return;
    }
    montrerCourseMsg("");
    clearTick();
    elapsedCs = 0;
    markZ1Cs = 0;
    markZTEndCs = 0;
    markZ2Cs = 0;
    startedAt = 0;
    pendingRun = null;
    phase = "z1";
    majRunner("z1");
    majChrono();
    majLiveZone(0, 0, 0);
    if (els.effEl) els.effEl.hidden = true;
    sireneDepart();
    startTick();
    majBoutons();
  }

  function onEntreeZT() {
    freezeTick();
    markZ1Cs = elapsedCs;
    majLiveZone(markZ1Cs, 0, 0);
    phase = "zt";
    majRunner("zt");
    beep(720, 0.1);
    startTick();
    majBoutons();
  }

  function onSortieZT() {
    freezeTick();
    markZTEndCs = elapsedCs;
    majLiveZone(markZ1Cs, markZTEndCs - markZ1Cs, 0);
    phase = "z2";
    majRunner("z2");
    beep(720, 0.1);
    startTick();
    majBoutons();
  }

  function onArrivee() {
    freezeTick();
    markZ2Cs = elapsedCs;
    majLiveZone(markZ1Cs, markZTEndCs - markZ1Cs, markZ2Cs - markZTEndCs);
    phase = "attente-save";
    majRunner("arrivee");
    beep(480, 0.45);
    setTimeout(function () {
      beep(480, 0.45);
    }, 500);
    calculerResultat();
    majEfficaciteZT();
    majBoutons();
    ouvrirDialogEnregistrement();
  }

  function resetCourse() {
    clearTick();
    fermerDialogEnregistrement();
    phase = "pret";
    elapsedCs = 0;
    markZ1Cs = 0;
    markZTEndCs = 0;
    markZ2Cs = 0;
    startedAt = 0;
    pendingRun = null;
    majRunner("depart");
    majChrono();
    majLiveZone(0, 0, 0);
    reinitialiserPenalites();
    if (els.effEl) els.effEl.hidden = true;
    montrerCourseMsg("");
    majBoutons();
  }

  function onDialogPenaliteChange() {
    if (pendingRun) pendingRun = buildRunPayload(lirePenalitesDialog());
    if (phase === "fini" || phase === "attente-save") majEfficaciteZT();
  }

  function getRunnerById(id) {
    return state.runners.filter(function (r) {
      return r.id === id;
    })[0];
  }

  function runIsValid(run) {
    if (!run) return false;
    if (run.valid === false) return false;
    if (run.penaliteHorsZone || run.penaliteTemoinTombe) return false;
    if (run.efficaciteZT && run.efficaciteZT.penalite) return false;
    return true;
  }

  function runInvalidLabel(run) {
    if (runIsValid(run)) return "";
    if (run.penaliteLabel) return run.penaliteLabel;
    if (run.efficaciteZT && run.efficaciteZT.penaliteLabel) return run.efficaciteZT.penaliteLabel;
    return "Non valable";
  }

  function getRunsForRunner(runnerId) {
    return state.results
      .filter(function (run) {
        return run.donneurId === runnerId || run.receveurId === runnerId;
      })
      .slice()
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
  }

  function roleDansRun(run, runnerId) {
    if (run.donneurId === runnerId && run.receveurId === runnerId) return "donneur & receveur";
    if (run.donneurId === runnerId) return "donneur";
    if (run.receveurId === runnerId) return "receveur";
    return "";
  }

  function partenaireDansRun(run, runnerId) {
    if (run.donneurId === runnerId) return run.receveurNom;
    if (run.receveurId === runnerId) return run.donneurNom;
    return "";
  }

  function meilleurePerfPourCoureur(runnerId, role) {
    var best = null;
    state.results.forEach(function (run) {
      if (!runIsValid(run)) return;
      var match =
        role === "donneur"
          ? run.donneurId === runnerId
          : role === "receveur"
            ? run.receveurId === runnerId
            : run.donneurId === runnerId || run.receveurId === runnerId;
      if (!match) return;
      if (!best || run.totalCs < best.totalCs) best = run;
    });
    return best;
  }

  function moyenneDonneurReceveur(row) {
    var parts = [];
    if (row.bestDonneur) parts.push(row.bestDonneur.totalCs);
    if (row.bestReceveur) parts.push(row.bestReceveur.totalCs);
    if (!parts.length) return null;
    var avg = parts.reduce(function (sum, cs) {
      return sum + cs;
    }, 0) / parts.length;
    return { totalCs: avg, formattedTotal: formaterTemps(avg) };
  }

  function runIncidentHorsZoneOuTemoin(run) {
    if (!run) return false;
    if (run.penaliteHorsZone || run.penaliteTemoinTombe) return true;
    return run.valid === false;
  }

  function invalidesResumePourCoureur(runnerId, row) {
    var seen = {};
    var list = [];
    getRunsForRunner(runnerId).forEach(function (run) {
      if (seen[run.id] || !runIncidentHorsZoneOuTemoin(run) || runIsValid(run)) return;
      var keep = false;
      if (!row.bestDonneur && run.donneurId === runnerId) keep = true;
      if (!row.bestReceveur && run.receveurId === runnerId) keep = true;
      if (!keep) return;
      seen[run.id] = true;
      list.push(run);
    });
    return list;
  }

  function compterInvalidesResumePourCoureur(runnerId, row) {
    return invalidesResumePourCoureur(runnerId, row).length;
  }

  function libelleInvalidesResumePourCoureur(runnerId, row) {
    var invalides = invalidesResumePourCoureur(runnerId, row);
    if (!invalides.length) return "—";
    if (invalides.length === 1) return runInvalidLabel(invalides[0]);
    return invalides.length + " passages non valables";
  }

  function getClassementCoureurs() {
    var ids = {};
    state.runners.forEach(function (r) {
      ids[r.id] = true;
    });
    state.results.forEach(function (run) {
      ids[run.donneurId] = true;
      ids[run.receveurId] = true;
    });
    return Object.keys(ids).map(function (runnerId) {
      var runner = getRunnerById(runnerId);
      var row = {
        runnerId: runnerId,
        nom: runner ? runnerDisplayName(runner) : "Coureur inconnu",
        classe: runner ? runner.className || "" : "",
        bestGlobal: meilleurePerfPourCoureur(runnerId, "all"),
        bestDonneur: meilleurePerfPourCoureur(runnerId, "donneur"),
        bestReceveur: meilleurePerfPourCoureur(runnerId, "receveur"),
        runs: getRunsForRunner(runnerId),
      };
      row.invalidCount = compterInvalidesResumePourCoureur(runnerId, row);
      row.invalidLabel = libelleInvalidesResumePourCoureur(runnerId, row);
      row.avgDonReceveur = moyenneDonneurReceveur(row);
      return row;
    });
  }

  function trierLignesResultats(rows) {
    var sortKey = state.resultsSort || "best";
    rows = rows.slice();
    rows.sort(function (a, b) {
      if (sortKey === "alpha") return String(a.nom).localeCompare(String(b.nom), "fr");
      if (sortKey === "class") {
        var cls = String(a.classe || "").localeCompare(String(b.classe || ""), "fr");
        return cls || String(a.nom).localeCompare(String(b.nom), "fr");
      }
      if (sortKey === "invalid") {
        if (b.invalidCount !== a.invalidCount) return b.invalidCount - a.invalidCount;
        return String(a.nom).localeCompare(String(b.nom), "fr");
      }
      var ta = a.bestGlobal ? a.bestGlobal.totalCs : Infinity;
      var tb = b.bestGlobal ? b.bestGlobal.totalCs : Infinity;
      if (ta !== tb) return ta - tb;
      var ma = a.avgDonReceveur ? a.avgDonReceveur.totalCs : Infinity;
      var mb = b.avgDonReceveur ? b.avgDonReceveur.totalCs : Infinity;
      if (ma !== mb) return ma - mb;
      return String(a.nom).localeCompare(String(b.nom), "fr");
    });
    return rows;
  }

  function renderPerfCell(run) {
    if (!run) return "<span class=\"relais-results-perf is-empty\">—</span>";
    return (
      "<span class=\"relais-results-perf\">" +
      escapeHtml(run.formattedTotal || formaterTemps(run.totalCs)) +
      "</span>"
    );
  }

  function htmlDetailCoureur(row) {
    if (!row.runs.length) {
      return "<p class=\"hint\">Aucun passage enregistré.</p>";
    }
    var items = row.runs
      .map(function (run) {
        var role = roleDansRun(run, row.runnerId);
        var partner = partenaireDansRun(run, row.runnerId);
        var valid = runIsValid(run);
        var invalidHtml = valid
          ? ""
          : " · <span class=\"relais-results-invalid\">" + escapeHtml(runInvalidLabel(run)) + "</span>";
        return (
          "<li class=\"relais-results-detail__item\">" +
          "<span><strong>" +
          escapeHtml(run.formattedTotal) +
          "</strong> · " +
          escapeHtml(role) +
          (partner ? " avec " + escapeHtml(partner) : "") +
          invalidHtml +
          "</span>" +
          "<span class=\"relais-results-detail__meta\">" +
          escapeHtml(new Date(run.date).toLocaleString("fr-FR")) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
    return (
      "<div class=\"relais-results-detail\">" +
      "<p class=\"relais-results-detail__title\">Tous les passages</p>" +
      "<ul class=\"relais-results-detail__list\">" +
      items +
      "</ul></div>"
    );
  }

  function toggleRunnerDetail(runnerId) {
    state.expandedRunnerId = state.expandedRunnerId === runnerId ? "" : runnerId;
    renderResults();
  }

  function renderResults() {
    var rows = trierLignesResultats(
      getClassementCoureurs().filter(function (row) {
        return row.runs.length;
      })
    );
    if (els.resultsEmpty) els.resultsEmpty.hidden = !!rows.length;
    if (els.resultsWrap) {
      if (!rows.length) {
        els.resultsWrap.innerHTML = "";
      } else {
        var html =
          "<table class=\"relais-results-table\"><thead><tr>" +
          "<th scope=\"col\">Coureur</th><th scope=\"col\">Classe</th>" +
          "<th scope=\"col\">Meilleure perf.</th><th scope=\"col\">Meilleure donneur</th><th scope=\"col\">Meilleure receveur</th>" +
          "<th scope=\"col\">Moy. don./rec.</th><th scope=\"col\">Non valable</th>" +
          "</tr></thead><tbody>";
        rows.forEach(function (row) {
          var expanded = state.expandedRunnerId === row.runnerId;
          html +=
            "<tr class=\"relais-results-row" +
            (expanded ? " is-expanded" : "") +
            "\"><td><button type=\"button\" class=\"relais-results-runner-btn\" data-runner-id=\"" +
            escapeHtml(row.runnerId) +
            "\" aria-expanded=\"" +
            (expanded ? "true" : "false") +
            "\"><span class=\"relais-results-runner-btn__chev\" aria-hidden=\"true\">" +
            (expanded ? "▾" : "▸") +
            "</span>" +
            escapeHtml(row.nom) +
            "</button></td><td>" +
            escapeHtml(row.classe || "—") +
            "</td><td>" +
            renderPerfCell(row.bestGlobal) +
            "</td><td>" +
            renderPerfCell(row.bestDonneur) +
            "</td><td>" +
            renderPerfCell(row.bestReceveur) +
            "</td><td>" +
            renderPerfCell(row.avgDonReceveur) +
            "</td><td><span class=\"relais-results-invalid" +
            (row.invalidCount ? "" : " is-none") +
            "\">" +
            escapeHtml(row.invalidLabel) +
            "</span></td></tr>";
          if (expanded) {
            html +=
              "<tr class=\"relais-results-detail-row\"><td colspan=\"7\">" +
              htmlDetailCoureur(row) +
              "</td></tr>";
          }
        });
        html += "</tbody></table>";
        els.resultsWrap.innerHTML = html;
        els.resultsWrap.querySelectorAll(".relais-results-runner-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            toggleRunnerDetail(btn.getAttribute("data-runner-id"));
          });
        });
      }
    }
    if (els.runsList) {
      els.runsList.innerHTML = "";
      var runs = state.results.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
      if (els.runsEmpty) els.runsEmpty.hidden = !!runs.length;
      runs.forEach(function (run) {
        var li = document.createElement("li");
        li.className = "photo-finish-result-item";
        var note =
          run.efficaciteZT && run.efficaciteZT.note10 != null
            ? " · trans. " + run.efficaciteZT.note10.toFixed(1).replace(".", ",") + "/10"
            : "";
        var invalid =
          !runIsValid(run)
            ? " · <span class=\"relais-results-invalid\">" + escapeHtml(runInvalidLabel(run)) + "</span>"
            : "";
        li.innerHTML =
          "<span class=\"photo-finish-result-main\"><strong>" +
          escapeHtml(run.donneurNom) +
          " → " +
          escapeHtml(run.receveurNom) +
          "</strong><small>" +
          escapeHtml(new Date(run.date).toLocaleString("fr-FR")) +
          note +
          invalid +
          "</small></span><span class=\"photo-finish-classement__temps" +
          (!runIsValid(run) ? " relais-results-perf is-invalid" : "") +
          "\">" +
          escapeHtml(run.formattedTotal) +
          "</span><button type=\"button\" class=\"btn btn--ghost\">Supprimer</button>";
        li.querySelector("button").addEventListener("click", function () {
          state.results = state.results.filter(function (r) {
            return r.id !== run.id;
          });
          saveSessionData().then(function () {
            renderResults();
          });
        });
        els.runsList.appendChild(li);
      });
    }
  }

  function csvQuote(cell) {
    return "\"" + String(cell == null ? "" : cell).replace(/"/g, "\"\"") + "\"";
  }

  function formatTransmissionExport(run) {
    if (!run.efficaciteZT || run.efficaciteZT.note10 == null) return "";
    var note = run.efficaciteZT.note10.toFixed(1).replace(".", ",");
    var verdict = run.efficaciteZT.verdict || "";
    return verdict ? note + "/10 — " + verdict : note + "/10";
  }

  function passageExportRow(run) {
    return [
      run.donneurNom,
      run.receveurNom,
      run.formattedTotal || formaterTemps(run.totalCs),
      new Date(run.date).toLocaleString("fr-FR"),
      formatTransmissionExport(run),
      runIsValid(run) ? "Oui" : "Non",
      runIsValid(run) ? "" : runInvalidLabel(run),
      run.temps ? run.temps.z1 || "" : "",
      run.temps ? run.temps.zt || "" : "",
      run.temps ? run.temps.z2 || "" : "",
    ];
  }

  function getExportData() {
    var rows = trierLignesResultats(
      getClassementCoureurs().filter(function (row) {
        return row.runs.length;
      })
    );
    var passages = state.results
      .slice()
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      })
      .map(passageExportRow);
    return {
      summaryHeaders: [
        "rang",
        "nom",
        "classe",
        "meilleure_perf",
        "meilleure_donneur",
        "meilleure_receveur",
        "moyenne_donneur_receveur",
        "non_valable",
      ],
      summaryRows: rows.map(function (row, index) {
        return [
          index + 1,
          row.nom,
          row.classe,
          row.bestGlobal ? row.bestGlobal.formattedTotal : "",
          row.bestDonneur ? row.bestDonneur.formattedTotal : "",
          row.bestReceveur ? row.bestReceveur.formattedTotal : "",
          row.avgDonReceveur ? row.avgDonReceveur.formattedTotal : "",
          row.invalidLabel === "—" ? "" : row.invalidLabel,
        ];
      }),
      passageHeaders: [
        "donneur",
        "receveur",
        "temps",
        "date",
        "transmission",
        "valide",
        "penalite",
        "z1",
        "zt",
        "z2",
      ],
      passageRows: passages,
      runnerDetails: rows.map(function (row) {
        return {
          nom: row.nom,
          classe: row.classe,
          passages: row.runs.map(function (run) {
            var role = roleDansRun(run, row.runnerId);
            var partner = partenaireDansRun(run, row.runnerId);
            return {
              temps: run.formattedTotal || formaterTemps(run.totalCs),
              role: role,
              partenaire: partner,
              date: new Date(run.date).toLocaleString("fr-FR"),
              transmission: formatTransmissionExport(run),
              valide: runIsValid(run),
              penalite: runIsValid(run) ? "" : runInvalidLabel(run),
            };
          }),
        };
      }),
      stats: {
        coureurs: rows.length,
        passages: passages.length,
      },
      titre: "Résultats par coureur et liste des passages",
      fileBase: "relais-resultats-" + new Date().toISOString().slice(0, 10),
    };
  }

  function exportCsv() {
    var data = getExportData();
    if (!data.summaryRows.length) {
      montrerMsg("Aucun résultat à exporter.", true);
      return;
    }
    var lignes = [
      csvQuote(TOOL_LABEL + " — résultats par coureur"),
      data.summaryHeaders.join(";"),
    ];
    data.summaryRows.forEach(function (row) {
      lignes.push(row.map(csvQuote).join(";"));
    });
    lignes.push("");
    lignes.push(csvQuote(TOOL_LABEL + " — tous les passages"));
    lignes.push(data.passageHeaders.join(";"));
    data.passageRows.forEach(function (row) {
      lignes.push(row.map(csvQuote).join(";"));
    });
    lignes.push("");
    lignes.push(csvQuote(TOOL_LABEL + " — passages par coureur"));
    lignes.push(["coureur", "classe", "temps", "role", "partenaire", "date", "transmission", "valide", "penalite"].join(";"));
    data.runnerDetails.forEach(function (runner) {
      runner.passages.forEach(function (pass) {
        lignes.push(
          [
            runner.nom,
            runner.classe,
            pass.temps,
            pass.role,
            pass.partenaire,
            pass.date,
            pass.transmission,
            pass.valide ? "Oui" : "Non",
            pass.penalite,
          ]
            .map(csvQuote)
            .join(";")
        );
      });
    });
    var blob = new Blob(["\ufeff" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = data.fileBase + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    montrerMsg("Export CSV téléchargé.");
  }

  function exportPdf() {
    var data = getExportData();
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Export PDF indisponible (jsPDF non chargé).", true);
      return;
    }
    if (!data.summaryRows.length) {
      montrerMsg("Aucun résultat à exporter.", true);
      return;
    }

    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    var margin = 14;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - 2 * margin;
    var headerH = 24;
    var y = headerH + 8;

    var C = {
      primary: [15, 118, 110],
      primaryDark: [17, 94, 89],
      ink: [15, 23, 42],
      slate: [100, 116, 139],
      soft: [240, 253, 250],
      rowAlt: [248, 250, 252],
      border: [226, 232, 240],
      invalid: [185, 28, 28],
      white: [255, 255, 255],
    };

    function rgb(c) {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setTextColor(c[0], c[1], c[2]);
    }

    function ensureSpace(h) {
      if (y + h > pageH - 16) {
        doc.addPage();
        y = margin;
      }
    }

    function drawPageHeader() {
      rgb(C.primary);
      doc.rect(0, 0, pageW, headerH, "F");
      rgb(C.primaryDark);
      doc.rect(0, headerH - 2, pageW, 2, "F");
      doc.setTextColor(C.white[0], C.white[1], C.white[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(TOOL_LABEL, margin, 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      var meta =
        data.stats.coureurs +
        " coureur" +
        (data.stats.coureurs > 1 ? "s" : "") +
        " · " +
        data.stats.passages +
        " passage" +
        (data.stats.passages > 1 ? "s" : "") +
        " · " +
        new Date().toLocaleString("fr-FR");
      doc.text(doc.splitTextToSize(meta, contentW)[0], margin, 18);
    }

    function drawSection(title) {
      ensureSpace(12);
      rgb(C.soft);
      doc.rect(margin, y - 3, contentW, 8, "F");
      rgb(C.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(String(title || "").toUpperCase(), margin + 2, y + 2);
      y += 10;
    }

    function drawTable(columns, rows, getCell, getColor) {
      var minRowH = 7;
      var fontSize = 8.2;
      var tableHeaderH = 8;

      function colX(index) {
        var x = margin;
        var i;
        for (i = 0; i < index; i++) x += columns[i].w;
        return x;
      }

      function cellText(row, colIndex) {
        if (getCell) return String(getCell(row, colIndex) == null ? "" : getCell(row, colIndex));
        return String(row[colIndex] == null ? "" : row[colIndex]);
      }

      function drawHeader() {
        ensureSpace(tableHeaderH + 4);
        rgb(C.primary);
        doc.rect(margin, y, contentW, tableHeaderH, "F");
        doc.setTextColor(C.white[0], C.white[1], C.white[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        columns.forEach(function (col, i) {
          var tx =
            colX(i) + (col.align === "right" ? col.w - 2 : col.align === "center" ? col.w / 2 : 2);
          doc.text(col.label, tx, y + 5.5, { align: col.align || "left", maxWidth: col.w - 4 });
        });
        y += tableHeaderH;
      }

      drawHeader();
      rows.forEach(function (row, rowIndex) {
        var heights = columns.map(function (col, colIndex) {
          var lines = doc.splitTextToSize(cellText(row, colIndex), col.w - 4);
          return Math.max(minRowH, lines.length * 3.6 + 3);
        });
        var rowH = Math.max.apply(null, heights);
        if (y + rowH > pageH - 16) {
          doc.addPage();
          y = margin;
          drawHeader();
        }
        rgb(rowIndex % 2 === 0 ? C.white : C.rowAlt);
        doc.rect(margin, y, contentW, rowH, "F");
        rgb(C.border);
        doc.setLineWidth(0.12);
        doc.rect(margin, y, contentW, rowH, "S");
        columns.forEach(function (col, colIndex) {
          var tx = colX(colIndex);
          rgb(C.border);
          doc.line(tx, y, tx, y + rowH);
          var lines = doc.splitTextToSize(cellText(row, colIndex), col.w - 4);
          rgb(getColor ? getColor(row, colIndex) : C.ink);
          doc.setFont(
            "helvetica",
            colIndex === 0 && columns[0].label === "Rang" ? "bold" : "normal"
          );
          doc.setFontSize(fontSize);
          var textX =
            col.align === "right"
              ? tx + col.w - 2
              : col.align === "center"
                ? tx + col.w / 2
                : tx + 2;
          doc.text(lines, textX, y + 4.2, { align: col.align || "left", maxWidth: col.w - 4 });
        });
        rgb(C.border);
        doc.line(margin + contentW, y, margin + contentW, y + rowH);
        y += rowH;
      });
      y += 6;
    }

    drawPageHeader();

    drawSection("Classement par coureur");
    drawTable(
      [
        { label: "Rang", w: 9, align: "center" },
        { label: "Coureur", w: 34, align: "left" },
        { label: "Cl.", w: 12, align: "left" },
        { label: "Meill.", w: 17, align: "right" },
        { label: "Don.", w: 17, align: "right" },
        { label: "Rec.", w: 17, align: "right" },
        { label: "Moy.", w: 17, align: "right" },
        { label: "Non val.", w: 39, align: "left" },
      ],
      data.summaryRows
    );

    drawSection("Tous les passages");
    var passageTableRows = data.passageRows.map(function (row) {
      var valid = row[5] === "Oui";
      return {
        cells: [row[0], row[1], row[2], row[3], row[4], valid ? "Valide" : row[6] || "Non valable"],
        invalid: !valid,
      };
    });
    drawTable(
      [
        { label: "Donneur", w: 32, align: "left" },
        { label: "Receveur", w: 32, align: "left" },
        { label: "Temps", w: 20, align: "right" },
        { label: "Date", w: 38, align: "left" },
        { label: "Trans.", w: 28, align: "left" },
        { label: "Statut", w: 32, align: "left" },
      ],
      passageTableRows,
      function (row, colIndex) {
        return row.cells[colIndex];
      },
      function (row, colIndex) {
        return colIndex === 5 && row.invalid ? C.invalid : C.ink;
      }
    );

    var total = doc.internal.getNumberOfPages();
    var p;
    for (p = 1; p <= total; p++) {
      doc.setPage(p);
      rgb(C.slate);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Outils EPS — " + TOOL_LABEL + " · page " + p + " / " + total, pageW / 2, pageH - 8, {
        align: "center",
      });
    }

    doc.save(data.fileBase + ".pdf");
    montrerMsg("Export PDF téléchargé.");
  }

  els.tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setScreen(tab.getAttribute("data-screen"));
    });
  });

  if ($("rl-btn-import-classe")) $("rl-btn-import-classe").addEventListener("click", importClassFromTool);
  if ($("rl-btn-valider-liste")) $("rl-btn-valider-liste").addEventListener("click", validerListeManuelle);
  if ($("rl-btn-export-csv")) $("rl-btn-export-csv").addEventListener("click", exportCsv);
  if ($("rl-btn-export-pdf")) $("rl-btn-export-pdf").addEventListener("click", exportPdf);
  if (els.sortResults) {
    els.sortResults.addEventListener("change", function () {
      state.resultsSort = els.sortResults.value || "best";
      renderResults();
    });
  }
  if ($("rl-dialog-cancel")) {
    $("rl-dialog-cancel").addEventListener("click", function () {
      fermerDialogEnregistrement();
      phase = "fini";
      majBoutons();
    });
  }
  if ($("rl-dialog-save")) $("rl-dialog-save").addEventListener("click", enregistrerPassage);

  if (els.btnDepart) els.btnDepart.addEventListener("click", onDepart);
  if (els.btnEntree) els.btnEntree.addEventListener("click", onEntreeZT);
  if (els.btnSortie) els.btnSortie.addEventListener("click", onSortieZT);
  if (els.btnArrivee) els.btnArrivee.addEventListener("click", onArrivee);
  if (els.btnReset) els.btnReset.addEventListener("click", resetCourse);

  [els.distZ1El, els.distZ2El, els.distZTEl].forEach(function (el) {
    if (el) {
      el.addEventListener("input", function () {
        majDistancesAffichees();
        readSettingsFromUi();
        saveSessionData();
      });
    }
  });

  [els.dialogPenalHorsZoneEl, els.dialogPenalTemoinEl].forEach(function (el) {
    if (el) el.addEventListener("change", onDialogPenaliteChange);
  });

  if (typeof ListeManuellePanel !== "undefined" && els.importText) {
    ListeManuellePanel.bind({
      toggleBtnId: "rl-btn-ajouter-manuel",
      panelId: "rl-liste-manuelle-panel",
      textareaEl: els.importText,
    });
  }

  writeSettingsToUi();
  majRunner("depart");
  majBoutons();
  majChrono();
  setScreen("home");

  if (typeof SessionManager !== "undefined" && typeof DataManager !== "undefined") {
    SessionManager.init({
      toolId: DataManager.SESSION_TOOLS.RELAIS,
      toolLabel: TOOL_LABEL,
      onSessionReady: loadManagerSession,
      onSessionCleared: clearManagerSession,
    });
  } else {
    bootWithoutSessionManager();
  }
})();
