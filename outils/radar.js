/**
 * Radar — chronomètre distance → vitesse (km/h, min/km, m/s), performances par élève.
 */
(function () {
  "use strict";

  var PARAM_SESSION = "radar-session";
  var PARAM_DISTANCE = "radar-settings";
  var LS_PERFS_KEY = "outils_eps_radar_perfs_v1";
  var LS_DISTANCE_KEY = "outils_eps_radar_distance_v1";

  var distanceEl = document.getElementById("radar-distance");
  var uniteEl = document.getElementById("radar-unite");
  var selectWrapEl = document.getElementById("radar-select-wrap");
  var selectEl = document.getElementById("radar-eleve-select");
  var eleveIdEl = document.getElementById("radar-eleve-id");
  var classeIdEl = document.getElementById("radar-classe-id");
  var chronoLabelEl = document.getElementById("radar-chrono-label");
  var chronoTimeEl = document.getElementById("radar-chrono-time");
  var btnStart = document.getElementById("radar-btn-start");
  var btnArrivee = document.getElementById("radar-btn-arrivee");
  var btnReset = document.getElementById("radar-btn-reset");
  var msgEl = document.getElementById("radar-msg");
  var sectionApresChrono = document.getElementById("radar-section-apres-chrono");
  var resultKmh = document.getElementById("radar-result-kmh");
  var resultAllure = document.getElementById("radar-result-allure");
  var resultMs = document.getElementById("radar-result-ms");
  var resultMeta = document.getElementById("radar-result-meta");
  var btnEnregistrer = document.getElementById("radar-btn-enregistrer");
  var listePerfsEl = document.getElementById("radar-liste-perfs");
  var filtreEl = document.getElementById("radar-filtre");
  var feedbackEl = document.getElementById("radar-feedback");
  var tabChrono = document.getElementById("tab-chrono");
  var tabHistorique = document.getElementById("tab-historique");
  var panelChrono = document.getElementById("radar-panel-chrono");
  var panelHistorique = document.getElementById("radar-panel-historique");

  var running = false;
  var tickId = null;
  var startedAt = 0;
  var elapsedMs = 0;
  var dernierResultat = null;
  var listePerfs = [];
  var session = { classeId: "", classeNom: "", eleves: [] };
  var dbReady = false;

  function genererId(prefix) {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId(prefix || "radar");
    }
    return (prefix || "radar") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  }

  function montrerMsg(msg) {
    if (!msgEl) return;
    msgEl.hidden = !msg;
    msgEl.textContent = msg || "";
  }

  function montrerFeedback(msg, isError) {
    if (!feedbackEl || !msg) return;
    feedbackEl.textContent = msg;
    feedbackEl.className =
      "dispense-feedback" + (isError ? " dispense-feedback--error" : " dispense-feedback--ok");
    feedbackEl.hidden = false;
    if (montrerFeedback._timer) clearTimeout(montrerFeedback._timer);
    montrerFeedback._timer = setTimeout(function () {
      feedbackEl.hidden = true;
    }, 4000);
  }

  function normalise(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatEleve(e) {
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      return EleveDisplay.formatEleveListe(e);
    }
    return [e.nom, e.prenom].filter(Boolean).join(" ").trim() || "Sans nom";
  }

  function cleMeilleurePerf(p) {
    var eleve = p.eleveId || normalise([p.nom, p.prenom, p.classe].join("|"));
    return eleve + "|" + String(p.distanceM || 0);
  }

  function cleElevePerf(p) {
    return p.eleveId || normalise([p.nom, p.prenom, p.classe].join("|"));
  }

  function distancePerfEgale(a, b) {
    return Math.abs((a || 0) - (b || 0)) < 0.001;
  }

  function meilleursTempsParEleve(distanceM) {
    var map = {};
    if (!isFinite(distanceM) || distanceM <= 0) return map;
    listePerfs.forEach(function (p) {
      if (!distancePerfEgale(p.distanceM, distanceM)) return;
      var key = cleElevePerf(p);
      if (!map[key] || p.tempsMs < map[key].tempsMs) map[key] = p;
    });
    return map;
  }

  function idsMeilleuresPerfs(liste) {
    var best = {};
    (liste || []).forEach(function (p) {
      var k = cleMeilleurePerf(p);
      if (!best[k] || p.kmh > best[k].kmh) best[k] = p;
    });
    var ids = {};
    Object.keys(best).forEach(function (k) {
      ids[best[k].id] = true;
    });
    return ids;
  }

  function lireDistanceMetres() {
    var raw = (distanceEl.value || "").replace(",", ".").trim();
    if (raw === "") return NaN;
    var v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return NaN;
    if (uniteEl && uniteEl.value === "km") return v * 1000;
    return v;
  }

  function formaterAllure(totalMin) {
    if (!isFinite(totalMin) || totalMin <= 0) return "—";
    var whole = Math.floor(totalMin + 1e-9);
    var secs = Math.round((totalMin - whole) * 60);
    if (secs === 60) {
      whole += 1;
      secs = 0;
    }
    return whole + " min " + (secs < 10 ? "0" : "") + secs + " s";
  }

  function formaterNombre(n, decimales) {
    if (!isFinite(n)) return "—";
    var f = Math.pow(10, decimales);
    return String(Math.round(n * f) / f);
  }

  function formaterTemps(ms) {
    var totalSec = ms / 1000;
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    var ss = sec.toFixed(1);
    if (sec < 10) ss = "0" + ss;
    var mm = (min < 10 ? "0" : "") + min;
    return mm + ":" + ss;
  }

  function formaterDistance(m) {
    if (m >= 1000 && m % 1000 === 0) return m / 1000 + " km";
    if (m >= 1000) return formaterNombre(m / 1000, 2) + " km";
    return formaterNombre(m, m < 10 ? 1 : 0) + " m";
  }

  function calculerVitesses(distM, tempsMs) {
    var tempsS = tempsMs / 1000;
    var distKm = distM / 1000;
    var kmh = distKm / (tempsS / 3600);
    var allureMin = 60 / kmh;
    var ms = distM / tempsS;
    return { kmh: kmh, allureMin: allureMin, ms: ms, tempsMs: tempsMs, distanceM: distM };
  }

  function getEleveSelectionne() {
    if (!selectEl || !session.eleves.length) return null;
    var id = selectEl.value;
    if (!id) return null;
    for (var i = 0; i < session.eleves.length; i++) {
      if (session.eleves[i].id === id) return session.eleves[i];
    }
    return null;
  }

  function majChampsEleve() {
    var e = getEleveSelectionne();
    if (eleveIdEl) eleveIdEl.value = e ? e.id || "" : "";
    if (classeIdEl) classeIdEl.value = session.classeId || "";
  }

  function libelleEleveSelect(e, bests, distM) {
    var label = formatEleve(e);
    if (!isFinite(distM) || distM <= 0) return label;
    var best = bests[e.id];
    if (best) return label + " — " + formaterTemps(best.tempsMs);
    return label + " — —";
  }

  function remplirSelectEleves() {
    if (!selectEl || !selectWrapEl) return;
    var prev = selectEl.value;
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(selectEl);
    } else {
      while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    }
    if (!session.eleves.length) {
      selectWrapEl.hidden = true;
      majChampsEleve();
      return;
    }
    selectWrapEl.hidden = false;
    var distM = lireDistanceMetres();
    var bests = meilleursTempsParEleve(distM);
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Choisir un élève —";
    selectEl.appendChild(opt0);
    session.eleves.forEach(function (e) {
      var opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = libelleEleveSelect(e, bests, distM);
      selectEl.appendChild(opt);
    });
    if (prev && session.eleves.some(function (e) {
      return e.id === prev;
    })) {
      selectEl.value = prev;
    } else {
      selectEl.value = "";
    }
    majChampsEleve();
  }

  function appliquerDistanceSauvegardee(rec) {
    if (!rec) return;
    if (distanceEl && rec.distance != null && rec.distance !== "") {
      distanceEl.value = String(rec.distance);
    }
    if (uniteEl && (rec.unite === "m" || rec.unite === "km")) {
      uniteEl.value = rec.unite;
    }
  }

  function lireDistanceSauvegardee() {
    var out = { distance: "", unite: "m" };
    try {
      var raw = localStorage.getItem(LS_DISTANCE_KEY);
      if (raw) {
        var ls = JSON.parse(raw);
        if (ls && typeof ls === "object") {
          if (ls.distance != null) out.distance = String(ls.distance);
          if (ls.unite === "m" || ls.unite === "km") out.unite = ls.unite;
        }
      }
    } catch (e) {
      /* ignore */
    }
    return out;
  }

  function sauverDistance() {
    var rec = {
      distance: distanceEl ? distanceEl.value : "",
      unite: uniteEl && uniteEl.value === "km" ? "km" : "m",
    };
    try {
      localStorage.setItem(LS_DISTANCE_KEY, JSON.stringify(rec));
    } catch (e) {
      /* ignore */
    }
    if (!dbReady || typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_DISTANCE,
      distance: rec.distance,
      unite: rec.unite,
    });
  }

  function chargerDistance() {
    appliquerDistanceSauvegardee(lireDistanceSauvegardee());
    if (!dbReady || typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.getParametre(PARAM_DISTANCE).then(function (rec) {
      if (rec) appliquerDistanceSauvegardee(rec);
    });
  }

  function sauverSession() {
    if (!dbReady || typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_SESSION,
      classeId: session.classeId,
      classeNom: session.classeNom,
      eleveIds: session.eleves.map(function (e) {
        return e.id;
      }),
    });
  }

  function chargerSession() {
    if (!dbReady || typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.getParametre(PARAM_SESSION).then(function (rec) {
      if (!rec || !rec.classeId || !rec.eleveIds || !rec.eleveIds.length) {
        session = { classeId: "", classeNom: "", eleves: [] };
        remplirSelectEleves();
        return;
      }
      return DataManager.getClasseById(rec.classeId).then(function (classe) {
        if (!classe) {
          session = { classeId: "", classeNom: "", eleves: [] };
          remplirSelectEleves();
          return;
        }
        var ids = rec.eleveIds;
        session = {
          classeId: classe.id,
          classeNom: rec.classeNom || classe.nom || "",
          eleves: classe.eleves.filter(function (e) {
            return ids.indexOf(e.id) !== -1;
          }),
        };
        remplirSelectEleves();
      });
    });
  }

  function lirePerfsLocalStorage() {
    try {
      var raw = localStorage.getItem(LS_PERFS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function sauverPerfsLocalStorage() {
    try {
      localStorage.setItem(LS_PERFS_KEY, JSON.stringify(listePerfs));
      return true;
    } catch (e) {
      return false;
    }
  }

  function sauverPerfs() {
    listePerfs = Array.isArray(listePerfs) ? listePerfs.slice() : [];
    sauverPerfsLocalStorage();
    if (!dbReady || typeof DataManager === "undefined" || !DataManager.saveRadarPerfs) {
      return Promise.resolve();
    }
    return DataManager.saveRadarPerfs(listePerfs);
  }

  function chargerPerfs() {
    if (dbReady && typeof DataManager !== "undefined" && DataManager.getRadarPerfs) {
      return DataManager.getRadarPerfs().then(function (arr) {
        listePerfs = Array.isArray(arr) ? arr : [];
        sauverPerfsLocalStorage();
        return listePerfs;
      });
    }
    listePerfs = lirePerfsLocalStorage();
    return Promise.resolve(listePerfs);
  }

  function messageErreurStockage(err) {
    if (typeof DataManager !== "undefined" && DataManager.storageErrorMessage) {
      return DataManager.storageErrorMessage(err);
    }
    return (err && err.message) || "Stockage indisponible.";
  }

  function champsDistanceVerrouilles(verrou) {
    if (distanceEl) distanceEl.disabled = verrou;
    if (uniteEl) uniteEl.disabled = verrou;
  }

  function masquerApresChrono() {
    dernierResultat = null;
    if (sectionApresChrono) sectionApresChrono.hidden = true;
    if (resultKmh) resultKmh.textContent = "—";
    if (resultAllure) resultAllure.textContent = "—";
    if (resultMs) resultMs.textContent = "—";
    if (resultMeta) resultMeta.textContent = "";
    if (selectEl) selectEl.value = "";
    majChampsEleve();
  }

  function afficherApresChrono() {
    if (sectionApresChrono) sectionApresChrono.hidden = false;
  }

  function majAffichageChrono() {
    var displayMs = running ? Date.now() - startedAt : elapsedMs;
    if (chronoTimeEl) chronoTimeEl.textContent = formaterTemps(displayMs);
    if (chronoLabelEl) {
      chronoLabelEl.textContent = running ? "En course…" : elapsedMs > 0 ? "Temps final" : "Prêt";
    }
    if (btnStart) btnStart.disabled = running;
    if (btnArrivee) btnArrivee.disabled = !running;
    if (btnReset) btnReset.disabled = running;
    champsDistanceVerrouilles(running);
  }

  function stopTick() {
    if (tickId) {
      cancelAnimationFrame(tickId);
      tickId = null;
    }
  }

  function tick() {
    majAffichageChrono();
    if (running) tickId = requestAnimationFrame(tick);
  }

  function demarrer() {
    montrerMsg("");
    var distM = lireDistanceMetres();
    if (isNaN(distM)) {
      montrerMsg("Indiquez une distance strictement positive avant le départ.");
      return;
    }
    masquerApresChrono();
    running = true;
    startedAt = Date.now();
    elapsedMs = 0;
    majAffichageChrono();
    tickId = requestAnimationFrame(tick);
  }

  function arrivee() {
    if (!running) return;
    running = false;
    stopTick();
    elapsedMs = Date.now() - startedAt;
    majAffichageChrono();

    var distM = lireDistanceMetres();
    if (isNaN(distM) || elapsedMs <= 0) {
      montrerMsg("Chronométrage invalide.");
      return;
    }

    var vit = calculerVitesses(distM, elapsedMs);
    dernierResultat = {
      distanceM: distM,
      tempsMs: elapsedMs,
      kmh: vit.kmh,
      allureMin: vit.allureMin,
      ms: vit.ms,
    };

    afficherApresChrono();
    if (resultKmh) resultKmh.textContent = formaterNombre(vit.kmh, 2);
    if (resultAllure) resultAllure.textContent = formaterAllure(vit.allureMin);
    if (resultMs) resultMs.textContent = formaterNombre(vit.ms, 2);
    if (resultMeta) {
      resultMeta.textContent = formaterDistance(distM) + " en " + formaterTemps(elapsedMs);
    }
    remplirSelectEleves();
    if (selectEl) selectEl.value = "";
    majChampsEleve();
    montrerMsg("");
    if (sectionApresChrono && sectionApresChrono.scrollIntoView) {
      sectionApresChrono.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function reinitialiser() {
    if (running) return;
    stopTick();
    running = false;
    elapsedMs = 0;
    masquerApresChrono();
    montrerMsg("");
    majAffichageChrono();
  }

  function enregistrerPerf() {
    if (!dernierResultat) {
      montrerMsg("Chronométrez d’abord un passage (Départ puis Arrivée).");
      return;
    }
    var e = getEleveSelectionne();
    if (!e) {
      montrerMsg("Importez une classe et choisissez l’élève concerné.");
      return;
    }

    var entree = {
      id: genererId("radar"),
      eleveId: e.id || "",
      classeId: session.classeId || "",
      nom: e.nom || "",
      prenom: e.prenom || "",
      classe: session.classeNom || "",
      distanceM: dernierResultat.distanceM,
      tempsMs: dernierResultat.tempsMs,
      kmh: dernierResultat.kmh,
      allureMin: dernierResultat.allureMin,
      ms: dernierResultat.ms,
      createdAt: new Date().toISOString(),
    };

    listePerfs.push(entree);
    sauverPerfs()
      .then(function () {
        renderHistorique();
        remplirSelectEleves();
        montrerFeedback("Performance enregistrée.", false);
        reinitialiser();
      })
      .catch(function (err) {
        listePerfs.pop();
        montrerMsg(messageErreurStockage(err));
      });
  }

  function supprimerPerf(id) {
    if (!confirm("Supprimer cette performance ?")) return;
    listePerfs = listePerfs.filter(function (p) {
      return p.id !== id;
    });
    sauverPerfs()
      .then(function () {
        renderHistorique();
        montrerFeedback("Performance supprimée.", false);
      })
      .catch(function (err) {
        montrerMsg(messageErreurStockage(err));
      });
  }

  function filtrerPerfs(liste, q) {
    q = normalise(q);
    if (!q) return liste;
    return liste.filter(function (p) {
      var blob = normalise(
        [p.nom, p.prenom, p.classe, formatEleve(p), String(p.kmh)].join(" ")
      );
      return blob.indexOf(q) >= 0;
    });
  }

  function formatDateHeure(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  function renderHistorique() {
    if (!listePerfsEl) return;
    var q = filtreEl ? filtreEl.value : "";
    var brute = listePerfs.slice();
    var liste = filtrerPerfs(brute, q);
    var meilleures = idsMeilleuresPerfs(brute);

    liste.sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(listePerfsEl);
    } else {
      listePerfsEl.innerHTML = "";
    }

    if (liste.length === 0) {
      var p = document.createElement("p");
      p.className = "empty-state";
      p.textContent =
        brute.length === 0
          ? "Aucune performance enregistrée pour le moment."
          : "Aucune performance ne correspond au filtre.";
      listePerfsEl.appendChild(p);
      return;
    }

    liste.forEach(function (perf) {
      var estMeilleure = !!meilleures[perf.id];
      var article = document.createElement("article");
      article.className =
        "dispense-item dispense-item--active radar-item" +
        (estMeilleure ? " radar-item--best" : "");

      var head = document.createElement("div");
      head.className = "dispense-item__head";

      var left = document.createElement("div");
      left.className = "dispense-item__main";
      var h3 = document.createElement("h3");
      h3.className = "dispense-item__title" + (estMeilleure ? " radar-item__title--best" : "");
      h3.textContent = formatEleve(perf);
      var meta = document.createElement("p");
      meta.className = "radar-item__meta";
      meta.textContent =
        (perf.classe || "Sans classe") +
        " · " +
        formaterDistance(perf.distanceM) +
        " · " +
        formaterTemps(perf.tempsMs) +
        " · " +
        formatDateHeure(perf.createdAt) +
        (estMeilleure ? " · Meilleure perf." : "");
      left.appendChild(h3);
      left.appendChild(meta);

      var badge = document.createElement("div");
      badge.className = "dispense-item__days dispense-item__days--active radar-item__vitesse";
      var num = document.createElement("span");
      num.className =
        "dispense-item__days-num" + (estMeilleure ? " radar-item__vitesse-num--best" : "");
      num.textContent = formaterNombre(perf.kmh, 1);
      var lbl = document.createElement("span");
      lbl.className = "dispense-item__days-label";
      lbl.textContent = "km/h";
      badge.appendChild(num);
      badge.appendChild(lbl);

      var actions = document.createElement("div");
      actions.className = "dispense-actions";
      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--small btn--icon-only";
      bDel.setAttribute("aria-label", "Supprimer la performance de " + formatEleve(perf));
      bDel.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">🗑️</span>';
      bDel.addEventListener("click", function () {
        supprimerPerf(perf.id);
      });
      actions.appendChild(bDel);

      head.appendChild(left);
      head.appendChild(badge);
      head.appendChild(actions);
      article.appendChild(head);

      var detail = document.createElement("p");
      detail.className = "radar-item__allure" + (estMeilleure ? " radar-item__allure--best" : "");
      detail.textContent =
        "Allure : " +
        formaterAllure(perf.allureMin) +
        " · " +
        formaterNombre(perf.ms, 2) +
        " m/s";
      article.appendChild(detail);

      listePerfsEl.appendChild(article);
    });
  }

  function afficherVue(mode) {
    var isChrono = mode === "chrono";
    if (panelChrono) {
      panelChrono.hidden = !isChrono;
      panelChrono.setAttribute("aria-hidden", isChrono ? "false" : "true");
    }
    if (panelHistorique) {
      panelHistorique.hidden = isChrono;
      panelHistorique.setAttribute("aria-hidden", isChrono ? "true" : "false");
    }
    if (tabChrono) {
      tabChrono.setAttribute("aria-selected", isChrono ? "true" : "false");
      tabChrono.classList.toggle("dispense-nav__btn--active", isChrono);
      tabChrono.tabIndex = isChrono ? 0 : -1;
    }
    if (tabHistorique) {
      tabHistorique.setAttribute("aria-selected", isChrono ? "false" : "true");
      tabHistorique.classList.toggle("dispense-nav__btn--active", !isChrono);
      tabHistorique.tabIndex = isChrono ? -1 : 0;
    }
    if (!isChrono) renderHistorique();
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.");
      return;
    }
    ClassImport.open({
      title: "Importer une classe",
      hint: "Cochez les élèves de la classe (ou tout cocher).",
      onConfirm: function (eleves, classe) {
        if (!eleves.length) {
          montrerMsg("Aucun élève sélectionné.");
          return;
        }
        session = {
          classeId: classe.id,
          classeNom: classe.nom || "",
          eleves: eleves.slice(),
        };
        remplirSelectEleves();
        sauverSession()
          .then(function () {
            montrerFeedback(
              eleves.length + " élève(s) importé(s) depuis « " + classe.nom + " ».",
              false
            );
            montrerMsg("");
            if (selectEl && selectEl.focus) selectEl.focus();
          })
          .catch(function () {
            montrerMsg("Impossible de mémoriser la classe.");
          });
      },
    });
  }

  if (btnStart) btnStart.addEventListener("click", demarrer);
  if (btnArrivee) btnArrivee.addEventListener("click", arrivee);
  if (btnReset) btnReset.addEventListener("click", reinitialiser);
  if (btnEnregistrer) btnEnregistrer.addEventListener("click", enregistrerPerf);
  if (selectEl) selectEl.addEventListener("change", majChampsEleve);
  if (filtreEl) filtreEl.addEventListener("input", renderHistorique);
  if (distanceEl) {
    distanceEl.addEventListener("input", function () {
      sauverDistance();
      remplirSelectEleves();
    });
    distanceEl.addEventListener("change", function () {
      sauverDistance();
      remplirSelectEleves();
    });
  }
  if (uniteEl) {
    uniteEl.addEventListener("change", function () {
      sauverDistance();
      remplirSelectEleves();
    });
  }

  var btnImport = document.getElementById("btn-import-classe-radar");
  if (btnImport) btnImport.addEventListener("click", importerClasse);

  if (tabChrono) {
    tabChrono.addEventListener("click", function () {
      afficherVue("chrono");
    });
  }
  if (tabHistorique) {
    tabHistorique.addEventListener("click", function () {
      afficherVue("historique");
    });
  }

  majAffichageChrono();
  masquerApresChrono();

  listePerfs = lirePerfsLocalStorage();
  appliquerDistanceSauvegardee(lireDistanceSauvegardee());

  if (typeof DataManager !== "undefined") {
    DataManager.ready
      .then(function () {
        dbReady = typeof DataManager.getRadarPerfs === "function";
        return chargerDistance();
      })
      .then(function () {
        return chargerPerfs();
      })
      .then(function () {
        return chargerSession();
      })
      .then(function () {
        afficherVue("chrono");
        renderHistorique();
      })
      .catch(function () {
        afficherVue("chrono");
        renderHistorique();
      });
  } else {
    afficherVue("chrono");
    renderHistorique();
  }
})();
