/**
 * Relais — chronométrage 3 zones (Z1, ZT, Z2) côté élève.
 * Enregistrement vidéo optionnel de la zone de transmission.
 */
(function () {
  "use strict";

  var TOOL_ID = "relais-eleve";
  var LS_SETTINGS_KEY = "outils_eps_relais_settings_v1";

  var labelEl = document.getElementById("relais-label");
  var reglagesEl = document.getElementById("relais-reglages");
  var distZ1El = document.getElementById("relais-dist-z1");
  var distZTEl = document.getElementById("relais-dist-zt");
  var distZ2El = document.getElementById("relais-dist-z2");
  var totalDistEl = document.getElementById("relais-total-dist");
  var filmZTEl = document.getElementById("relais-film-zt");
  var filmHintEl = document.getElementById("relais-film-hint");
  var trackZ1El = document.getElementById("relais-track-z1");
  var trackZTEl = document.getElementById("relais-track-zt");
  var trackZ2El = document.getElementById("relais-track-z2");
  var donneurEl = document.getElementById("relais-donneur");
  var receveurEl = document.getElementById("relais-receveur");
  var cameraWrapEl = document.getElementById("relais-camera-wrap");
  var cameraPreviewEl = document.getElementById("relais-camera-preview");
  var cameraBadgeEl = document.getElementById("relais-camera-badge");
  var chronoEl = document.getElementById("relais-chrono");
  var liveZ1El = document.getElementById("relais-live-z1");
  var liveZTEl = document.getElementById("relais-live-zt");
  var liveZ2El = document.getElementById("relais-live-z2");
  var liveSpeedZ1El = document.getElementById("relais-live-speed-z1");
  var liveSpeedZTEl = document.getElementById("relais-live-speed-zt");
  var liveSpeedZ2El = document.getElementById("relais-live-speed-z2");
  var livePctZ1El = document.getElementById("relais-live-pct-z1");
  var livePctZTEl = document.getElementById("relais-live-pct-zt");
  var livePctZ2El = document.getElementById("relais-live-pct-z2");
  var msgEl = document.getElementById("relais-msg");
  var btnDepart = document.getElementById("relais-btn-depart");
  var btnEntree = document.getElementById("relais-btn-entree");
  var btnSortie = document.getElementById("relais-btn-sortie");
  var btnArrivee = document.getElementById("relais-btn-arrivee");
  var btnReset = document.getElementById("relais-btn-reset");
  var bilanCardEl = document.getElementById("relais-bilan");
  var bilanTotalEl = document.getElementById("relais-bilan-total");
  var bilanZ1El = document.getElementById("relais-bilan-z1");
  var bilanZTEl = document.getElementById("relais-bilan-zt");
  var bilanZ2El = document.getElementById("relais-bilan-z2");
  var bilanV1El = document.getElementById("relais-bilan-v1");
  var bilanVZTEl = document.getElementById("relais-bilan-vzt");
  var bilanV2El = document.getElementById("relais-bilan-v2");
  var bilanPctZ1El = document.getElementById("relais-bilan-pct-z1");
  var bilanPctZTEl = document.getElementById("relais-bilan-pct-zt");
  var bilanPctZ2El = document.getElementById("relais-bilan-pct-z2");
  var replayWrapEl = document.getElementById("relais-replay");
  var replayVideoEl = document.getElementById("relais-replay-video");
  var bilanEffEl = document.getElementById("relais-bilan-eff");
  var bilanEffNote10El = document.getElementById("relais-bilan-eff-note10");
  var bilanEffRefEl = document.getElementById("relais-bilan-eff-ref");
  var bilanEffDetailEl = document.getElementById("relais-bilan-eff-detail");
  var bilanEffNoteEl = document.getElementById("relais-bilan-eff-note");
  var bilanEffVerdictEl = document.getElementById("relais-bilan-eff-verdict");
  var bilanEffToggleEl = document.getElementById("relais-bilan-eff-toggle");
  var bilanEffExplainEl = document.getElementById("relais-bilan-eff-explain");

  var historiqueSauvePourCourse = false;
  var resultsHistory = null;

  /** @type {'pret'|'z1'|'zt'|'z2'|'fini'} */
  var phase = "pret";
  var tickId = null;
  var startedAt = 0;
  var elapsedCs = 0;
  var markZ1Cs = 0;
  var markZTEndCs = 0;
  var markZ2Cs = 0;
  var audioCtx = null;

  var cameraStream = null;
  var mediaRecorder = null;
  var recordedChunks = [];
  var replayUrl = null;

  var resultat = {
    totalCs: 0,
    z1Cs: 0,
    ztCs: 0,
    z2Cs: 0,
    v1: null,
    vzt: null,
    v2: null,
  };

  function montrerMsg(msg) {
    if (!msgEl) return;
    msgEl.hidden = !msg;
    msgEl.textContent = msg || "";
  }

  function lireDistance(el) {
    var n = parseInt(el && el.value, 10);
    return isFinite(n) && n > 0 ? n : NaN;
  }

  function lireReglages() {
    var z1 = lireDistance(distZ1El);
    var zt = lireDistance(distZTEl);
    var z2 = lireDistance(distZ2El);
    return {
      z1: z1,
      zt: zt,
      z2: z2,
      total: isFinite(z1) && isFinite(zt) && isFinite(z2) ? z1 + zt + z2 : NaN,
      filmZT: !!(filmZTEl && filmZTEl.checked),
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

  function majDistancesAffichees() {
    var reg = lireReglages();
    if (trackZ1El) trackZ1El.textContent = isFinite(reg.z1) ? String(reg.z1) : "—";
    if (trackZTEl) trackZTEl.textContent = isFinite(reg.zt) ? String(reg.zt) : "—";
    if (trackZ2El) trackZ2El.textContent = isFinite(reg.z2) ? String(reg.z2) : "—";
    if (totalDistEl) totalDistEl.textContent = isFinite(reg.total) ? String(reg.total) : "—";
  }

  function majRunner(pos) {
    document.querySelectorAll(".relais-scene [data-zone]").forEach(function (el) {
      var z = el.getAttribute("data-zone");
      var active = pos === z || (pos === "depart" && z === "z1");
      el.classList.toggle("is-active", active);
    });
    document.querySelectorAll(".relais-table [data-zone]").forEach(function (el) {
      var z = el.getAttribute("data-zone");
      el.classList.toggle("is-active", pos === z);
    });

    if (!donneurEl || !receveurEl) return;

    donneurEl.hidden = false;
    receveurEl.hidden = false;

    if (pos === "depart") {
      donneurEl.setAttribute("data-pos", "depart");
      receveurEl.hidden = true;
      return;
    }
    if (pos === "z1") {
      donneurEl.setAttribute("data-pos", "z1");
      receveurEl.hidden = true;
      return;
    }
    if (pos === "zt") {
      donneurEl.setAttribute("data-pos", "zt-pass");
      donneurEl.setAttribute("data-pose", "pass");
      receveurEl.setAttribute("data-pos", "zt-recv");
      receveurEl.setAttribute("data-pose", "recv");
      return;
    }
    donneurEl.setAttribute("data-pose", "sprint");
    receveurEl.setAttribute("data-pose", "sprint");
    if (pos === "z2") {
      donneurEl.hidden = true;
      receveurEl.setAttribute("data-pos", "z2");
      return;
    }
    if (pos === "arrivee") {
      donneurEl.hidden = true;
      receveurEl.setAttribute("data-pos", "arrivee");
    }
  }

  function calculerEfficaciteZT() {
    var reg = lireReglages();
    var v2 = resultat.v2;
    var vzt = resultat.vzt;
    var v1 = resultat.v1;
    if (!isFinite(v2) || v2 <= 0 || !isFinite(vzt) || vzt <= 0 || !resultat.ztCs || !reg.zt) {
      return null;
    }
    var ratio = vzt / v2;
    var note10 = Math.round(ratio * 100) / 10;
    var tZtReel = resultat.ztCs / 100;
    var tZtRef = (reg.zt * 3.6) / v2;
    var tempsPerdu = Math.round((tZtReel - tZtRef) * 100) / 100;
    var ratioZ1Z2 = isFinite(v1) && v1 > 0 ? Math.round((v1 / v2) * 100) : null;
    return {
      note10: note10,
      coefficient: Math.round(ratio * 100),
      coef: Math.round(ratio * 100),
      v1: isFinite(v1) ? Math.round(v1 * 10) / 10 : null,
      v2: Math.round(v2 * 10) / 10,
      vzt: Math.round(vzt * 10) / 10,
      tempsPerdu: tempsPerdu,
      tempsPerduLabel: (tempsPerdu > 0 ? "+" : "") + tempsPerdu.toFixed(2) + " s",
      ratioZ1Z2: ratioZ1Z2,
    };
  }

  function niveauEfficacite(note10) {
    if (note10 >= 9) {
      return { cls: "is-excellent", label: "Excellente transmission" };
    }
    if (note10 >= 8) {
      return { cls: "is-good", label: "Bonne transmission" };
    }
    if (note10 >= 7) {
      return { cls: "is-medium", label: "Transmission correcte" };
    }
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

  function texteEfficacite(eff) {
    if (!eff) return { ref: "", detail: "", note: "" };
    var detail;
    if (Math.abs(eff.tempsPerdu) < 0.05) {
      detail = "Temps ZT au même rythme qu’en Z2";
    } else if (eff.tempsPerdu > 0) {
      detail = "Temps perdu en ZT vs rythme Z2 : " + eff.tempsPerduLabel;
    } else {
      detail = "Gain en ZT vs rythme Z2 : " + Math.abs(eff.tempsPerdu).toFixed(2) + " s";
    }
    var note = "";
    if (eff.ratioZ1Z2 != null && eff.v1 != null) {
      note =
        "Z1 à " +
        eff.v1 +
        " km/h (" +
        eff.ratioZ1Z2 +
        " % de la Z2) : plus lent au départ arrêté, c’est normal.";
    }
    return {
      ref: "Référence Z2 : " + eff.v2 + " km/h · ZT mesurée : " + eff.vzt + " km/h",
      detail: detail,
      note: note,
    };
  }

  function fermerExplicationsEfficacite() {
    if (bilanEffExplainEl) bilanEffExplainEl.hidden = true;
    if (bilanEffToggleEl) {
      bilanEffToggleEl.setAttribute("aria-expanded", "false");
      bilanEffToggleEl.textContent = "Comprendre la note";
    }
  }

  function majEfficaciteZT() {
    var eff = calculerEfficaciteZT();
    if (!bilanEffEl) return;
    if (!eff) {
      bilanEffEl.hidden = true;
      fermerExplicationsEfficacite();
      return;
    }
    var texte = texteEfficacite(eff);
    var niv = niveauEfficacite(eff.note10);
    bilanEffEl.hidden = false;
    bilanEffEl.className = "relais-eff-zt relais-eff-zt--bilan " + niv.cls;
    if (bilanEffNote10El) bilanEffNote10El.textContent = formaterNote10(eff.note10);
    if (bilanEffRefEl) bilanEffRefEl.textContent = texte.ref;
    if (bilanEffDetailEl) bilanEffDetailEl.textContent = texte.detail;
    if (bilanEffNoteEl) bilanEffNoteEl.textContent = texte.note;
    if (bilanEffVerdictEl) bilanEffVerdictEl.textContent = niv.label;
  }

  function buildHistorySnapshot() {
    calculerResultat();
    var payload = buildExportPayload();
    payload.savedPhase = phase;
    return payload;
  }

  function archiverCourseHistorique() {
    if (historiqueSauvePourCourse || !resultsHistory || phase !== "fini") return;
    var snap = buildHistorySnapshot();
    if (!snap.temps || !snap.temps.total) return;
    resultsHistory.addEntry(snap);
    historiqueSauvePourCourse = true;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderHistoriqueView(entry, container) {
    var p = entry.data || {};
    var wrap = document.createElement("div");
    wrap.className = "import-preview import-preview--relais page-outil--relais-eleve";
    if (p.label) {
      var titre = document.createElement("p");
      titre.className = "import-preview__title";
      titre.textContent = p.label;
      wrap.appendChild(titre);
    }
    var temps = p.temps || {};
    var vitesses = p.vitesses || {};
    var pcts = p.tempsPct || {};
    if (temps.total) {
      var hero = document.createElement("div");
      hero.className = "relais-bilan-hero relais-bilan-hero--compact";
      hero.innerHTML =
        '<span class="relais-bilan-hero__label">Temps total</span><strong class="relais-bilan-hero__value">' +
        escapeHtml(temps.total) +
        "</strong>";
      wrap.appendChild(hero);
    }
    var strip = document.createElement("div");
    strip.className = "relais-bilan-strip";
    function zoneBloc(cls, badge, time, speed, pct) {
      var art = document.createElement("article");
      art.className = "relais-bilan-zone " + cls;
      art.innerHTML =
        '<div class="relais-bilan-zone__head"><span class="relais-bilan-zone__badge">' +
        escapeHtml(badge) +
        "</span></div><strong class=\"relais-bilan-zone__time\">" +
        escapeHtml(time || "—") +
        '</strong><div class="relais-bilan-zone__meta"><span class="relais-bilan-zone__speed">' +
        escapeHtml(speed != null ? speed + " km/h" : "—") +
        '</span><span class="relais-bilan-zone__pct">' +
        escapeHtml(pct != null ? pct + " % du temps" : "—") +
        "</span></div>";
      strip.appendChild(art);
    }
    zoneBloc("relais-bilan-zone--z1", "Z1", temps.z1, vitesses.z1, pcts.z1);
    zoneBloc("relais-bilan-zone--zt", "ZT", temps.zt, vitesses.zt, pcts.zt);
    zoneBloc("relais-bilan-zone--z2", "Z2", temps.z2, vitesses.z2, pcts.z2);
    wrap.appendChild(strip);
    if (p.efficaciteZT && (p.efficaciteZT.note10 != null || p.efficaciteZT.coefficient != null)) {
      var eff = p.efficaciteZT;
      var note10 = eff.note10 != null ? eff.note10 : (eff.coefficient || 0) / 10;
      var effBox = document.createElement("div");
      effBox.className = "relais-eff-zt relais-eff-zt--bilan";
      if (note10 >= 9) effBox.classList.add("is-excellent");
      else if (note10 >= 8) effBox.classList.add("is-good");
      else if (note10 >= 7) effBox.classList.add("is-medium");
      else effBox.classList.add("is-low");
      effBox.innerHTML =
        '<div class="relais-eff-zt__head"><span class="relais-eff-zt__title">Note transmission</span><strong class="relais-eff-zt__note10">' +
        escapeHtml(note10.toFixed(1).replace(".", ",") + " / 10") +
        "</strong></div>";
      if (eff.verdict) {
        var v = document.createElement("p");
        v.className = "relais-eff-zt__verdict";
        v.textContent = eff.verdict;
        effBox.appendChild(v);
      }
      wrap.appendChild(effBox);
    }
    container.appendChild(wrap);
  }

  function masquerEfficaciteZT() {
    if (bilanEffEl) bilanEffEl.hidden = true;
    fermerExplicationsEfficacite();
  }

  function elapsedDepuisDepart() {
    if (phase === "pret" || phase === "fini") return elapsedCs;
    return elapsedCs + Math.round((Date.now() - startedAt) / 10);
  }

  function majChrono() {
    if (!chronoEl) return;
    chronoEl.textContent = formaterTemps(elapsedDepuisDepart());
  }

  function clearTick() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function freezeTick() {
    clearTick();
    if (phase !== "pret" && phase !== "fini" && startedAt > 0) {
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
    if (btnDepart) btnDepart.hidden = phase !== "pret";
    if (btnEntree) btnEntree.hidden = phase !== "z1";
    if (btnSortie) btnSortie.hidden = phase !== "zt";
    if (btnArrivee) btnArrivee.hidden = phase !== "z2";
    if (btnReset) btnReset.hidden = phase !== "fini";

    var courseEnCours = phase !== "pret" && phase !== "fini";
    [distZ1El, distZ2El, distZTEl, filmZTEl, labelEl].forEach(function (el) {
      if (el) el.disabled = courseEnCours;
    });
    if (reglagesEl && courseEnCours) reglagesEl.open = false;
  }

  function majLiveZone(z1Cs, ztCs, z2Cs) {
    var reg = lireReglages();
    var total = z1Cs + ztCs + z2Cs;
    if (liveZ1El) liveZ1El.textContent = formaterTemps(z1Cs);
    if (liveZTEl) liveZTEl.textContent = formaterTemps(ztCs);
    if (liveZ2El) liveZ2El.textContent = formaterTemps(z2Cs);
    if (liveSpeedZ1El) liveSpeedZ1El.textContent = formaterVitesse(vitesseKmh(reg.z1, z1Cs), z1Cs === 0);
    if (liveSpeedZTEl) liveSpeedZTEl.textContent = formaterVitesse(vitesseKmh(reg.zt, ztCs), ztCs === 0);
    if (liveSpeedZ2El) liveSpeedZ2El.textContent = formaterVitesse(vitesseKmh(reg.z2, z2Cs), z2Cs === 0);
    if (livePctZ1El) livePctZ1El.textContent = formaterPctTemps(z1Cs, total);
    if (livePctZTEl) livePctZTEl.textContent = formaterPctTemps(ztCs, total);
    if (livePctZ2El) livePctZ2El.textContent = formaterPctTemps(z2Cs, total);
  }

  function mimeTypeEnregistrement() {
    if (typeof MediaRecorder === "undefined") return "";
    var types = [
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "";
  }

  function arreterCamera() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (e) {
        /* ignore */
      }
    }
    mediaRecorder = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (t) {
        t.stop();
      });
      cameraStream = null;
    }
    if (cameraPreviewEl) cameraPreviewEl.srcObject = null;
    if (cameraWrapEl) cameraWrapEl.hidden = true;
    if (cameraBadgeEl) cameraBadgeEl.hidden = true;
  }

  function demarrerCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      montrerMsg("Caméra non disponible sur cet appareil.");
      return Promise.resolve(false);
    }
    return navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then(function (stream) {
        cameraStream = stream;
        if (cameraPreviewEl) {
          cameraPreviewEl.srcObject = stream;
        }
        if (cameraWrapEl) cameraWrapEl.hidden = false;
        return true;
      })
      .catch(function () {
        montrerMsg("Accès à la caméra refusé. Décochez l’option film ou autorisez la caméra.");
        if (filmZTEl) filmZTEl.checked = false;
        return false;
      });
  }

  function demarrerEnregistrement() {
    if (!cameraStream || typeof MediaRecorder === "undefined") return;
    recordedChunks = [];
    var mime = mimeTypeEnregistrement();
    try {
      mediaRecorder = mime
        ? new MediaRecorder(cameraStream, { mimeType: mime })
        : new MediaRecorder(cameraStream);
    } catch (e) {
      montrerMsg("Enregistrement vidéo impossible sur cet appareil.");
      return;
    }
    mediaRecorder.ondataavailable = function (ev) {
      if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
    };
    mediaRecorder.start(200);
    if (cameraBadgeEl) cameraBadgeEl.hidden = false;
  }

  function arreterEnregistrement() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return Promise.resolve();
    return new Promise(function (resolve) {
      mediaRecorder.onstop = function () {
        if (replayUrl) URL.revokeObjectURL(replayUrl);
        if (recordedChunks.length) {
          var blob = new Blob(recordedChunks, { type: recordedChunks[0].type || "video/webm" });
          replayUrl = URL.createObjectURL(blob);
          if (replayVideoEl) replayVideoEl.src = replayUrl;
          if (replayWrapEl) replayWrapEl.hidden = false;
        }
        recordedChunks = [];
        resolve();
      };
      try {
        mediaRecorder.stop();
      } catch (e) {
        resolve();
      }
      if (cameraBadgeEl) cameraBadgeEl.hidden = true;
    });
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

  function afficherBilan() {
    calculerResultat();
    var total = resultat.totalCs;
    if (bilanTotalEl) bilanTotalEl.textContent = formaterTemps(total);
    if (bilanZ1El) bilanZ1El.textContent = formaterTemps(resultat.z1Cs);
    if (bilanZTEl) bilanZTEl.textContent = formaterTemps(resultat.ztCs);
    if (bilanZ2El) bilanZ2El.textContent = formaterTemps(resultat.z2Cs);
    if (bilanV1El) bilanV1El.textContent = formaterVitesse(resultat.v1, true);
    if (bilanVZTEl) bilanVZTEl.textContent = formaterVitesse(resultat.vzt, true);
    if (bilanV2El) bilanV2El.textContent = formaterVitesse(resultat.v2, true);
    if (bilanPctZ1El) bilanPctZ1El.textContent = formaterPctTemps(resultat.z1Cs, total);
    if (bilanPctZTEl) bilanPctZTEl.textContent = formaterPctTemps(resultat.ztCs, total);
    if (bilanPctZ2El) bilanPctZ2El.textContent = formaterPctTemps(resultat.z2Cs, total);
    majEfficaciteZT();
    if (bilanCardEl) {
      bilanCardEl.hidden = false;
      bilanCardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function onDepart() {
    var reg = lireReglages();
    if (!reg.valid) {
      montrerMsg("Vérifiez les distances (entre 1 et 99 m).");
      return;
    }
    montrerMsg("");
    clearTick();
    elapsedCs = 0;
    markZ1Cs = 0;
    markZTEndCs = 0;
    markZ2Cs = 0;
    startedAt = 0;
    phase = "z1";
    majRunner("z1");
    majChrono();
    majLiveZone(0, 0, 0);
    if (replayUrl) {
      URL.revokeObjectURL(replayUrl);
      replayUrl = null;
    }
    if (replayVideoEl) replayVideoEl.removeAttribute("src");
    if (replayWrapEl) replayWrapEl.hidden = true;
    if (bilanCardEl) bilanCardEl.hidden = true;
    masquerEfficaciteZT();
    historiqueSauvePourCourse = false;
    sireneDepart();
    startTick();
    majBoutons();

    if (reg.filmZT) {
      demarrerCamera();
    }
  }

  function onEntreeZT() {
    freezeTick();
    markZ1Cs = elapsedCs;
    var reg = lireReglages();
    majLiveZone(markZ1Cs, 0, 0);
    phase = "zt";
    majRunner("zt");
    beep(720, 0.1);
    startTick();

    if (reg.filmZT && cameraStream) {
      demarrerEnregistrement();
    } else if (reg.filmZT && !cameraStream) {
      demarrerCamera().then(function (ok) {
        if (ok) demarrerEnregistrement();
      });
    }
    majBoutons();
  }

  function onSortieZT() {
    var reg = lireReglages();
    freezeTick();
    markZTEndCs = elapsedCs;
    majLiveZone(markZ1Cs, markZTEndCs - markZ1Cs, 0);
    phase = "z2";
    majRunner("z2");
    beep(720, 0.1);

    if (reg.filmZT) {
      arreterEnregistrement().then(function () {
        arreterCamera();
      });
    }
    startTick();
    majBoutons();
  }

  function onArrivee() {
    freezeTick();
    markZ2Cs = elapsedCs;
    majLiveZone(markZ1Cs, markZTEndCs - markZ1Cs, markZ2Cs - markZTEndCs);
    phase = "fini";
    majRunner("arrivee");
    beep(480, 0.45);
    setTimeout(function () {
      beep(480, 0.45);
    }, 500);
    arreterCamera();
    calculerResultat();
    afficherBilan();
    archiverCourseHistorique();
    majBoutons();
  }

  function resetCourse() {
    clearTick();
    arreterCamera();
    phase = "pret";
    elapsedCs = 0;
    markZ1Cs = 0;
    markZTEndCs = 0;
    markZ2Cs = 0;
    startedAt = 0;
    majRunner("depart");
    majChrono();
    majLiveZone(0, 0, 0);
    if (bilanCardEl) bilanCardEl.hidden = true;
    masquerEfficaciteZT();
    historiqueSauvePourCourse = false;
    montrerMsg("");
    majBoutons();
  }

  function persisterReglages() {
    try {
      localStorage.setItem(
        LS_SETTINGS_KEY,
        JSON.stringify({
          z1: lireDistance(distZ1El),
          zt: lireDistance(distZTEl),
          z2: lireDistance(distZ2El),
          filmZT: !!(filmZTEl && filmZTEl.checked),
        })
      );
    } catch (e) {
      /* ignore */
    }
  }

  function chargerReglages() {
    try {
      var raw = localStorage.getItem(LS_SETTINGS_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (distZ1El && s.z1) distZ1El.value = String(s.z1);
      if (distZTEl && s.zt) distZTEl.value = String(s.zt);
      if (distZ2El && s.z2) distZ2El.value = String(s.z2);
      if (filmZTEl && s.filmZT) filmZTEl.checked = true;
    } catch (e) {
      /* ignore */
    }
  }

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
    calculerResultat();
    var reg = lireReglages();
    return {
      label: labelEl ? labelEl.value.trim() : "",
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
      tempsPct: {
        z1: pctTempsZone(resultat.z1Cs, resultat.totalCs),
        zt: pctTempsZone(resultat.ztCs, resultat.totalCs),
        z2: pctTempsZone(resultat.z2Cs, resultat.totalCs),
      },
      filmZT: reg.filmZT,
      videoEnregistree: !!(replayUrl || (replayVideoEl && replayVideoEl.src)),
      efficaciteZT: (function () {
        var eff = calculerEfficaciteZT();
        if (!eff) return null;
        var niv = niveauEfficacite(eff.note10);
        var txt = texteEfficacite(eff);
        return {
          note10: eff.note10,
          coefficient: eff.coef,
          vitesseZ2: eff.v2,
          vitesseZT: eff.vzt,
          vitesseZ1: eff.v1,
          ratioZ1Z2: eff.ratioZ1Z2,
          tempsPerduSec: eff.tempsPerdu,
          verdict: niv.label,
          detail: txt.detail,
          noteZ1: txt.note,
        };
      })(),
    };
  }

  function majFilmHint() {
    if (!filmHintEl || !filmZTEl) return;
    filmHintEl.hidden = !filmZTEl.checked;
  }

  if (btnDepart) btnDepart.addEventListener("click", onDepart);
  if (btnEntree) btnEntree.addEventListener("click", onEntreeZT);
  if (btnSortie) btnSortie.addEventListener("click", onSortieZT);
  if (btnArrivee) btnArrivee.addEventListener("click", onArrivee);
  if (btnReset) btnReset.addEventListener("click", resetCourse);

  if (bilanEffToggleEl && bilanEffExplainEl) {
    bilanEffToggleEl.addEventListener("click", function () {
      var open = bilanEffExplainEl.hidden;
      bilanEffExplainEl.hidden = !open;
      bilanEffToggleEl.setAttribute("aria-expanded", open ? "true" : "false");
      bilanEffToggleEl.textContent = open ? "Masquer les explications" : "Comprendre la note";
    });
  }

  [distZ1El, distZ2El, distZTEl].forEach(function (el) {
    if (el) {
      el.addEventListener("input", function () {
        majDistancesAffichees();
        persisterReglages();
      });
    }
  });

  if (filmZTEl) {
    filmZTEl.addEventListener("change", function () {
      majFilmHint();
      persisterReglages();
    });
  }

  if (labelEl) {
    labelEl.addEventListener("input", persisterLabel);
    labelEl.addEventListener("change", persisterLabel);
  }

  chargerReglages();
  chargerLabel();
  majDistancesAffichees();
  majFilmHint();
  majRunner("depart");
  majBoutons();
  majChrono();

  if (typeof ToolResultsHistory !== "undefined") {
    resultsHistory = ToolResultsHistory.mount({
      toolId: TOOL_ID,
      mountEl: document.querySelector(".page-outil--relais-eleve"),
      buildTitle: function (snap) {
        var label = snap.label || "Relais";
        return label + " — " + (snap.temps && snap.temps.total ? snap.temps.total : "course");
      },
      buildSummary: function (snap) {
        var parts = [];
        if (snap.temps && snap.temps.total) parts.push(snap.temps.total);
        if (snap.vitesses && snap.vitesses.z2 != null) parts.push("Z2 " + snap.vitesses.z2 + " km/h");
        if (snap.efficaciteZT && snap.efficaciteZT.note10 != null) {
          parts.push("trans. " + snap.efficaciteZT.note10.toFixed(1).replace(".", ",") + "/10");
        } else if (snap.efficaciteZT && snap.efficaciteZT.coefficient != null) {
          parts.push("trans. " + (snap.efficaciteZT.coefficient / 10).toFixed(1).replace(".", ",") + "/10");
        }
        return parts.join(" · ");
      },
      getSharePayload: function (entry) {
        return entry.data;
      },
      getShareParticipantLabel: function (entry) {
        return (entry.data && entry.data.label) || entry.title;
      },
      renderView: renderHistoriqueView,
    });
  }

  if (typeof EleveQrShare !== "undefined") {
    EleveQrShare.mountButton(document.getElementById("eleve-share-bar"), {
      toolId: TOOL_ID,
      getParticipantLabel: function () {
        return labelEl ? labelEl.value.trim() : "";
      },
      getPayload: buildExportPayload,
      validateBeforeShare: function () {
        if (phase !== "fini") return "Terminez la course et ouvrez le bilan avant de partager.";
        return null;
      },
    });
  }
})();
