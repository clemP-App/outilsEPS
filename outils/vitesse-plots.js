/**
 * Vitesse aux plots — suivi du rythme passage par passage.
 */
(function () {
  "use strict";

  var TOOL_ID = "vitesse-plots";
  var labelEl = document.getElementById("vitesse-plots-label");
  var reglagesEl = document.getElementById("vitesse-plots-reglages");
  var vitesseObjectifEl = document.getElementById("vitesse-objectif");
  var distancePlotEl = document.getElementById("distance-plot");
  var modeEl = document.getElementById("mode-chrono");
  var reglageMinuteurEl = document.getElementById("reglage-minuteur");
  var minuteurMinEl = document.getElementById("minuteur-min");
  var minuteurSecEl = document.getElementById("minuteur-sec");
  var tempsObjectifEl = document.getElementById("temps-objectif-plot");
  var msgEl = document.getElementById("vitesse-plots-msg");
  var btnDemarrer = document.getElementById("btn-demarrer");
  var btnReset = document.getElementById("btn-reset");
  var btnPassage = document.getElementById("btn-passage");
  var btnAnnuler = document.getElementById("btn-annuler");
  var chronoLabelEl = document.querySelector(".vitesse-plots-chrono-label");
  var chronoEl = document.getElementById("chrono");
  var resultatDernier = document.getElementById("resultat-dernier");
  var resultatDistance = document.getElementById("resultat-distance");
  var resultatMoyenne = document.getElementById("resultat-moyenne");
  var resultatEcart = document.getElementById("resultat-ecart");
  var sectionHistorique = document.getElementById("section-historique");
  var historiqueEl = document.getElementById("historique-passages");
  var graphCanvas = document.getElementById("vitesse-graph");

  var etat = "pret"; // pret | actif | pause
  var startTime = 0;
  var elapsedBeforeRunMs = 0;
  var lastPassageElapsedMs = 0;
  var timerDurationMs = 0;
  var tickId = null;
  var passages = [];
  var audioCtx = null;

  function lireNombre(el) {
    var raw = (el.value || "").replace(",", ".").trim();
    if (raw === "") return NaN;
    return parseFloat(raw);
  }

  function montrerMsg(msg) {
    if (!msgEl) return;
    msgEl.hidden = !msg;
    msgEl.textContent = msg || "";
  }

  function formaterNombre(n, decimales) {
    if (!isFinite(n)) return "—";
    var f = Math.pow(10, decimales);
    return String(Math.round(n * f) / f);
  }

  function formaterDuree(ms) {
    if (!isFinite(ms) || ms < 0) return "—";
    var dixiemes = Math.round(ms / 100);
    var totalSecondes = Math.floor(dixiemes / 10);
    var d = dixiemes % 10;
    var minutes = Math.floor(totalSecondes / 60);
    var secondes = totalSecondes % 60;
    return (minutes < 10 ? "0" : "") + minutes + ":" + (secondes < 10 ? "0" : "") + secondes + "." + d;
  }

  function modeChrono() {
    return modeEl && modeEl.value === "minuteur" ? "minuteur" : "chrono";
  }

  function lireDureeMinuteurMs() {
    var mi = parseInt(minuteurMinEl.value, 10);
    var se = parseInt(minuteurSecEl.value, 10);
    if (minuteurMinEl.value === "" && minuteurSecEl.value === "") return NaN;
    if (isNaN(mi)) mi = 0;
    if (isNaN(se)) se = 0;
    if (mi < 0 || se < 0 || se >= 60) return NaN;
    var total = (mi * 60 + se) * 1000;
    return total > 0 ? total : NaN;
  }

  function lireReglages() {
    var vitesseObjectif = lireNombre(vitesseObjectifEl);
    var distancePlot = lireNombre(distancePlotEl);
    var dureeMinuteurMs = modeChrono() === "minuteur" ? lireDureeMinuteurMs() : 0;
    return {
      vitesseObjectif: vitesseObjectif,
      distancePlot: distancePlot,
      dureeMinuteurMs: dureeMinuteurMs,
      valid:
        isFinite(vitesseObjectif) &&
        vitesseObjectif > 0 &&
        isFinite(distancePlot) &&
        distancePlot > 0 &&
        (modeChrono() !== "minuteur" || (isFinite(dureeMinuteurMs) && dureeMinuteurMs > 0)),
    };
  }

  function vitesseKmh(distanceM, dureeMs) {
    if (!isFinite(distanceM) || !isFinite(dureeMs) || distanceM <= 0 || dureeMs <= 0) return NaN;
    return (distanceM / (dureeMs / 1000)) * 3.6;
  }

  function audioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function beep(longBeep) {
    var AC = audioContextClass();
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var now = audioCtx.currentTime;
    osc.frequency.value = longBeep ? 520 : 820;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (longBeep ? 0.55 : 0.18));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + (longBeep ? 0.6 : 0.22));
  }

  function elapsedMs() {
    if (etat === "actif") return elapsedBeforeRunMs + (Date.now() - startTime);
    return elapsedBeforeRunMs;
  }

  function affichageMs() {
    var elapsed = elapsedMs();
    if (modeChrono() === "minuteur") return Math.max(0, timerDurationMs - elapsed);
    return elapsed;
  }

  function majTempsObjectif() {
    var reglages = lireReglages();
    if (!tempsObjectifEl) return;
    if (!isFinite(reglages.vitesseObjectif) || reglages.vitesseObjectif <= 0 || !isFinite(reglages.distancePlot) || reglages.distancePlot <= 0) {
      tempsObjectifEl.textContent = "—";
      return;
    }
    var secondes = (reglages.distancePlot * 3.6) / reglages.vitesseObjectif;
    tempsObjectifEl.textContent = formaterNombre(secondes, 1) + " s";
  }

  function setMainButton(label, icon) {
    if (!btnDemarrer) return;
    var text = btnDemarrer.querySelector(".btn__text");
    var iconEl = btnDemarrer.querySelector(".btn__icon");
    if (text) text.textContent = label;
    if (iconEl) iconEl.textContent = icon;
  }

  function majBoutons() {
    var actif = etat === "actif";
    var pause = etat === "pause";
    if (actif) setMainButton("Pause", "⏸");
    else if (pause) setMainButton("Reprendre", "▶");
    else setMainButton("Démarrer", "▶");

    if (btnReset) btnReset.hidden = !pause;
    if (btnPassage) btnPassage.disabled = !actif;
    if (btnAnnuler) btnAnnuler.disabled = passages.length === 0;

    [vitesseObjectifEl, distancePlotEl, modeEl, minuteurMinEl, minuteurSecEl].forEach(function (el) {
      if (el) el.disabled = etat !== "pret";
    });
    if (reglagesEl && actif) reglagesEl.open = false;
  }

  function majMode() {
    var minuteur = modeChrono() === "minuteur";
    if (reglageMinuteurEl) reglageMinuteurEl.hidden = !minuteur;
    if (chronoLabelEl) chronoLabelEl.textContent = minuteur ? "Temps restant" : "Chrono";
    if (etat === "pret") timerDurationMs = minuteur ? lireDureeMinuteurMs() || 0 : 0;
    majChrono();
  }

  function majChrono() {
    if (!chronoEl) return;
    chronoEl.textContent = formaterDuree(affichageMs());
    if (etat === "actif" && modeChrono() === "minuteur" && elapsedMs() >= timerDurationMs) {
      elapsedBeforeRunMs = timerDurationMs;
      etat = "pause";
      stopTick();
      beep(true);
      montrerMsg("Minuteur terminé.");
      majBoutons();
      majChrono();
    }
  }

  function startTick() {
    stopTick();
    tickId = setInterval(majChrono, 100);
  }

  function stopTick() {
    if (tickId) clearInterval(tickId);
    tickId = null;
  }

  function resetAffichage() {
    if (chronoEl) chronoEl.textContent = "00:00.0";
    if (resultatDernier) resultatDernier.textContent = "—";
    if (resultatDistance) resultatDistance.textContent = "0";
    if (resultatMoyenne) resultatMoyenne.textContent = "—";
    if (resultatEcart) {
      resultatEcart.hidden = true;
      resultatEcart.textContent = "";
      resultatEcart.className = "vitesse-plots-ecart";
    }
    renderHistorique();
    dessinerGraphique();
  }

  function demarrerDepuisZero(reglages) {
    passages = [];
    elapsedBeforeRunMs = 0;
    lastPassageElapsedMs = 0;
    timerDurationMs = modeChrono() === "minuteur" ? reglages.dureeMinuteurMs : 0;
    resetAffichage();
    etat = "actif";
    startTime = Date.now();
    beep(false);
    startTick();
  }

  function basculerStartPause() {
    var reglages = lireReglages();
    montrerMsg("");
    if (etat === "actif") {
      elapsedBeforeRunMs = elapsedMs();
      etat = "pause";
      stopTick();
      majBoutons();
      majChrono();
      return;
    }
    if (!reglages.valid) {
      montrerMsg(
        modeChrono() === "minuteur"
          ? "Indique une vitesse objectif, une distance entre plots et une durée de minuteur valides."
          : "Indique une vitesse objectif et une distance entre plots strictement positives."
      );
      return;
    }
    if (etat === "pause") {
      etat = "actif";
      startTime = Date.now();
      beep(false);
      startTick();
    } else {
      demarrerDepuisZero(reglages);
    }
    majBoutons();
    majChrono();
  }

  function reset() {
    passages = [];
    etat = "pret";
    startTime = 0;
    elapsedBeforeRunMs = 0;
    lastPassageElapsedMs = 0;
    timerDurationMs = 0;
    stopTick();
    resetAffichage();
    montrerMsg("");
    majTempsObjectif();
    majMode();
    majBoutons();
    if (reglagesEl) reglagesEl.open = true;
  }

  function majEcart(vitesseDernier, vitesseObjectif) {
    if (!resultatEcart || !isFinite(vitesseDernier) || !isFinite(vitesseObjectif)) return;
    var ecart = vitesseDernier - vitesseObjectif;
    var abs = Math.abs(ecart);
    resultatEcart.hidden = false;
    resultatEcart.className = "vitesse-plots-ecart";
    if (abs < 0.1) {
      resultatEcart.textContent = "Pile sur l’objectif.";
      resultatEcart.classList.add("is-ok");
    } else if (ecart > 0) {
      resultatEcart.textContent = "+" + formaterNombre(abs, 1) + " km/h par rapport à l’objectif.";
      resultatEcart.classList.add("is-fast");
    } else {
      resultatEcart.textContent = "-" + formaterNombre(abs, 1) + " km/h par rapport à l’objectif.";
      resultatEcart.classList.add("is-slow");
    }
  }

  function majResultatsDepuisDernierPassage() {
    var dernier = passages[passages.length - 1];
    if (!dernier) {
      if (resultatDernier) resultatDernier.textContent = "—";
      if (resultatDistance) resultatDistance.textContent = "0";
      if (resultatMoyenne) resultatMoyenne.textContent = "—";
      if (resultatEcart) {
        resultatEcart.hidden = true;
        resultatEcart.textContent = "";
        resultatEcart.className = "vitesse-plots-ecart";
      }
      lastPassageElapsedMs = 0;
      return;
    }
    if (resultatDernier) resultatDernier.textContent = formaterNombre(dernier.vitesseDernier, 2);
    if (resultatDistance) resultatDistance.textContent = formaterNombre(dernier.distanceTotale, 1);
    if (resultatMoyenne) resultatMoyenne.textContent = formaterNombre(dernier.vitesseMoyenne, 2);
    lastPassageElapsedMs = dernier.tempsTotalMs;
    majEcart(dernier.vitesseDernier, lireReglages().vitesseObjectif);
  }

  function renderHistorique() {
    if (!historiqueEl) return;
    historiqueEl.innerHTML = "";
    passages
      .slice()
      .reverse()
      .forEach(function (passage) {
        var tr = document.createElement("tr");
        [
          passage.numero,
          formaterDuree(passage.tempsTotalMs),
          formaterDuree(passage.intervalleMs),
          formaterNombre(passage.vitesseDernier, 2),
          formaterNombre(passage.vitesseMoyenne, 2),
        ].forEach(function (valeur) {
          var td = document.createElement("td");
          td.textContent = String(valeur);
          tr.appendChild(td);
        });
        historiqueEl.appendChild(tr);
      });
    if (sectionHistorique) sectionHistorique.hidden = passages.length === 0;
  }

  function passagePlot() {
    if (etat !== "actif") return;
    var reglages = lireReglages();
    if (!reglages.valid) return;

    var nowElapsed = elapsedMs();
    var intervalleMs = nowElapsed - lastPassageElapsedMs;
    if (intervalleMs < 150) return;

    beep(false);
    var numero = passages.length + 1;
    var distanceTotale = numero * reglages.distancePlot;
    var vitesseDernier = vitesseKmh(reglages.distancePlot, intervalleMs);
    var vitesseMoyenne = vitesseKmh(distanceTotale, nowElapsed);
    passages.push({
      numero: numero,
      intervalleMs: intervalleMs,
      tempsTotalMs: nowElapsed,
      distanceTotale: distanceTotale,
      vitesseDernier: vitesseDernier,
      vitesseMoyenne: vitesseMoyenne,
    });

    majResultatsDepuisDernierPassage();
    renderHistorique();
    dessinerGraphique();
    majBoutons();
    majChrono();
  }

  function annulerDernierPassage() {
    if (!passages.length) return;
    passages.pop();
    majResultatsDepuisDernierPassage();
    renderHistorique();
    dessinerGraphique();
    majBoutons();
  }

  function dessinerGraphique() {
    if (!graphCanvas || !graphCanvas.getContext) return;
    var ctx = graphCanvas.getContext("2d");
    var width = graphCanvas.width;
    var height = graphCanvas.height;
    var pad = 34;
    var reglages = lireReglages();
    var objectif = reglages.vitesseObjectif;
    var valeurs = passages.map(function (p) {
      return p.vitesseDernier;
    });
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.stroke();

    if (!valeurs.length || !isFinite(objectif)) {
      ctx.fillStyle = "#64748b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Les vitesses apparaîtront après les passages aux plots.", width / 2, height / 2);
      return;
    }

    var max = Math.max(objectif, Math.max.apply(null, valeurs)) * 1.15;
    var min = 0;
    var plotW = width - pad * 2;
    var plotH = height - pad * 2;
    function x(i) {
      return pad + (valeurs.length === 1 ? plotW / 2 : (i / (valeurs.length - 1)) * plotW);
    }
    function y(v) {
      return height - pad - ((v - min) / (max - min || 1)) * plotH;
    }

    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad, y(objectif));
    ctx.lineTo(width - pad, y(objectif));
    ctx.stroke();
    ctx.fillStyle = "#15803d";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Objectif " + formaterNombre(objectif, 1) + " km/h", pad + 6, Math.max(16, y(objectif) - 7));

    ctx.strokeStyle = "#0d9488";
    ctx.lineWidth = 4;
    ctx.beginPath();
    valeurs.forEach(function (v, i) {
      if (i === 0) ctx.moveTo(x(i), y(v));
      else ctx.lineTo(x(i), y(v));
    });
    ctx.stroke();

    valeurs.forEach(function (v, i) {
      ctx.beginPath();
      ctx.fillStyle = "#0f7668";
      ctx.arc(x(i), y(v), 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (btnDemarrer) btnDemarrer.addEventListener("click", basculerStartPause);
  if (btnReset) btnReset.addEventListener("click", reset);
  if (btnPassage) btnPassage.addEventListener("click", passagePlot);
  if (btnAnnuler) btnAnnuler.addEventListener("click", annulerDernierPassage);
  [vitesseObjectifEl, distancePlotEl, minuteurMinEl, minuteurSecEl].forEach(function (el) {
    if (el) el.addEventListener("input", function () {
      majTempsObjectif();
      dessinerGraphique();
    });
  });
  if (modeEl) modeEl.addEventListener("change", majMode);

  function persisterLabel() {
    if (typeof EleveLabels === "undefined" || !labelEl) return;
    EleveLabels.saveToolLabels(TOOL_ID, { label: labelEl.value.trim() });
  }

  function chargerLabel() {
    if (typeof EleveLabels === "undefined" || !labelEl) return;
    var saved = EleveLabels.getToolLabels(TOOL_ID);
    if (saved.label) labelEl.value = saved.label;
  }

  function buildExportPayload() {
    var reg = lireReglages();
    var dernier = passages[passages.length - 1];
    return {
      label: labelEl ? labelEl.value.trim() : "",
      vitesseMoyenne: dernier ? dernier.vitesseMoyenne : null,
      vitesseDernier: dernier ? dernier.vitesseDernier : null,
      config: {
        vitesseObjectif: reg.vitesseObjectif,
        distancePlot: reg.distancePlot,
        mode: modeChrono(),
      },
      passages: passages.map(function (p) {
        return {
          numero: p.numero,
          vitesseDernier: p.vitesseDernier,
          vitesseMoyenne: p.vitesseMoyenne,
          intervalLabel: formaterDuree(p.intervalleMs),
          tempsTotalLabel: formaterDuree(p.tempsTotalMs),
        };
      }),
    };
  }

  if (labelEl) {
    labelEl.addEventListener("input", persisterLabel);
    labelEl.addEventListener("change", persisterLabel);
  }

  chargerLabel();
  majTempsObjectif();
  majMode();
  majBoutons();
  dessinerGraphique();

  if (typeof EleveQrShare !== "undefined") {
    EleveQrShare.mountButton(document.getElementById("eleve-share-bar"), {
      toolId: TOOL_ID,
      getParticipantLabel: function () {
        return labelEl ? labelEl.value.trim() : "";
      },
      getPayload: buildExportPayload,
      validateBeforeShare: function () {
        if (!passages.length) return "Enregistrez au moins un passage au plot avant de partager.";
        return null;
      },
    });
  }
})();
