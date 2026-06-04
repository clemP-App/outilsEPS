/**
 * Photo finish — capture slit-scan, chrono, lecture par barre glissante.
 */
(function () {
  "use strict";

  var CAPTURE_INTERVAL_MS = 33;
  var MAX_COLUMNS = 4500;
  var STRIP_MAX_HEIGHT = 400;

  var videoEl = document.getElementById("pf-video");
  var stageEl = document.getElementById("pf-stage");
  var slitGuideEl = document.getElementById("pf-slit-guide");
  var slitInput = document.getElementById("pf-slit");
  var slitValEl = document.getElementById("pf-slit-val");
  var mirrorCheckbox = document.getElementById("pf-mirror");
  var chronoLiveEl = document.getElementById("pf-chrono-live");
  var statusEl = document.getElementById("pf-status");
  var msgEl = document.getElementById("pf-msg");
  var sectionPrepare = document.getElementById("pf-section-prepare");
  var sectionCapture = document.getElementById("pf-section-capture");
  var sectionReview = document.getElementById("pf-section-review");
  var btnCamera = document.getElementById("pf-btn-camera");
  var btnFlip = document.getElementById("pf-btn-flip");
  var btnStart = document.getElementById("pf-btn-start");
  var btnStop = document.getElementById("pf-btn-stop");
  var btnImport = document.getElementById("btn-import-classe-pf");
  var classeInfoEl = document.getElementById("pf-classe-info");
  var resultCanvas = document.getElementById("pf-result");
  var imageWrapEl = document.getElementById("pf-image-wrap");
  var scrollEl = document.getElementById("pf-scroll");
  var barEl = document.getElementById("pf-bar");
  var barTimeEl = document.getElementById("pf-bar-time");
  var eleveWrapEl = document.getElementById("pf-eleve-wrap");
  var eleveSelectEl = document.getElementById("pf-eleve-select");
  var nomManuelEl = document.getElementById("pf-nom-manuel");
  var btnMarquer = document.getElementById("pf-btn-marquer");
  var classementEl = document.getElementById("pf-classement");
  var classementVideEl = document.getElementById("pf-classement-vide");
  var btnExport = document.getElementById("pf-btn-export");
  var btnNouvelle = document.getElementById("pf-btn-nouvelle");

  var captureCanvas = document.createElement("canvas");
  var captureCtx = captureCanvas.getContext("2d", { alpha: false });
  var compositeCtx =
    resultCanvas && resultCanvas.getContext("2d", { alpha: false });

  var stream = null;
  var facingMode = "environment";
  var mirror = false;
  var cameraReady = false;

  var etat = "idle";
  var captureTimerId = null;
  var chronoTickId = null;
  var chronoStartMs = 0;
  var columnIndex = 0;
  var columnTimes = [];
  var stripHeight = STRIP_MAX_HEIGHT;
  var passages = [];
  var session = { classeId: "", classeNom: "", eleves: [] };

  var barColumn = 0;
  var draggingBar = false;

  function montrerMsg(texte) {
    if (!msgEl) return;
    msgEl.hidden = !texte;
    msgEl.textContent = texte || "";
  }

  function setStatus(texte) {
    if (statusEl) statusEl.textContent = texte || "";
  }

  function slitRatio() {
    if (!slitInput) return 0.5;
    return Number(slitInput.value) / 100;
  }

  function majSlitGuide() {
    if (!slitGuideEl) return;
    var pct = slitRatio() * 100;
    slitGuideEl.style.left = pct + "%";
    if (slitValEl) slitValEl.textContent = String(Math.round(pct));
  }

  function formaterTemps(ms) {
    if (!isFinite(ms) || ms < 0) return "—";
    var totalSec = ms / 1000;
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    var ss =
      sec < 10 && min > 0
        ? "0" + sec.toFixed(2)
        : min > 0
          ? sec.toFixed(2)
          : sec.toFixed(2);
    if (min > 0) {
      var mm = min < 10 ? "0" + min : String(min);
      return mm + ":" + ss;
    }
    return ss + " s";
  }

  function formatEleve(e) {
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      return EleveDisplay.formatEleveListe(e);
    }
    return [e.nom, e.prenom].filter(Boolean).join(" ").trim() || "Sans nom";
  }

  function majClasseInfo() {
    if (!classeInfoEl) return;
    if (session.eleves.length) {
      classeInfoEl.textContent =
        session.eleves.length +
        " élève(s) — " +
        (session.classeNom || "classe importée") +
        ".";
    } else {
      classeInfoEl.textContent =
        "Aucune classe importée — vous pourrez saisir les noms après la course.";
    }
  }

  function remplirSelectEleves() {
    if (!eleveSelectEl) return;
    eleveSelectEl.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Choisir un élève —";
    eleveSelectEl.appendChild(opt0);
    session.eleves.forEach(function (e) {
      var opt = document.createElement("option");
      opt.value = e.id || "";
      opt.textContent = formatEleve(e);
      eleveSelectEl.appendChild(opt);
    });
    if (eleveWrapEl) eleveWrapEl.hidden = !session.eleves.length;
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

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
    cameraReady = false;
  }

  function stopCaptureLoop() {
    if (captureTimerId) {
      clearInterval(captureTimerId);
      captureTimerId = null;
    }
  }

  function stopChronoTick() {
    if (chronoTickId) {
      clearInterval(chronoTickId);
      chronoTickId = null;
    }
  }

  function elapsedMs() {
    if (etat !== "capturing" && etat !== "review") return 0;
    if (etat === "review" && columnTimes.length) {
      return columnTimes[columnTimes.length - 1];
    }
    return Date.now() - chronoStartMs;
  }

  function majChronoLive() {
    if (chronoLiveEl) chronoLiveEl.textContent = formaterTemps(elapsedMs());
  }

  function captureStrip() {
    if (!videoEl || !compositeCtx || !resultCanvas) return;
    var vw = videoEl.videoWidth;
    var vh = videoEl.videoHeight;
    if (!vw || !vh || columnIndex >= MAX_COLUMNS) return;

    var slitX = Math.min(vw - 1, Math.max(0, Math.round(slitRatio() * vw)));
    var sh = Math.min(vh, STRIP_MAX_HEIGHT);
    stripHeight = sh;

    captureCanvas.width = 1;
    captureCanvas.height = sh;

    captureCtx.save();
    if (mirror) {
      captureCtx.translate(1, 0);
      captureCtx.scale(-1, 1);
      captureCtx.drawImage(videoEl, vw - slitX - 1, 0, 1, vh, 0, 0, 1, sh);
    } else {
      captureCtx.drawImage(videoEl, slitX, 0, 1, vh, 0, 0, 1, sh);
    }
    captureCtx.restore();

    compositeCtx.drawImage(captureCanvas, 0, 0, 1, sh, columnIndex, 0, 1, sh);
    columnTimes.push(Date.now() - chronoStartMs);
    columnIndex++;
  }

  function initComposite() {
    columnIndex = 0;
    columnTimes = [];
    if (!resultCanvas || !compositeCtx) return;
    resultCanvas.width = MAX_COLUMNS;
    resultCanvas.height = STRIP_MAX_HEIGHT;
    compositeCtx.fillStyle = "#1a1a1a";
    compositeCtx.fillRect(0, 0, MAX_COLUMNS, STRIP_MAX_HEIGHT);
  }

  function finaliserComposite() {
    if (!resultCanvas || !compositeCtx || columnIndex === 0) return;
    var w = columnIndex;
    var h = stripHeight;
    var data = compositeCtx.getImageData(0, 0, w, h);
    resultCanvas.width = w;
    resultCanvas.height = h;
    compositeCtx.putImageData(data, 0, 0);
  }

  function tempsPourColonne(col) {
    if (!columnTimes.length) return 0;
    var c = Math.max(0, Math.min(columnTimes.length - 1, Math.round(col)));
    return columnTimes[c];
  }

  function largeurImageAffichee() {
    if (!resultCanvas) return 1;
    return resultCanvas.getBoundingClientRect().width || 1;
  }

  function majBarreAffichage() {
    if (!barEl || !resultCanvas) return;
    var w = resultCanvas.width;
    if (!w) return;
    var dw = largeurImageAffichee();
    var leftPx = (barColumn / Math.max(1, w - 1)) * dw;
    barEl.style.left = leftPx + "px";
    if (barTimeEl) barTimeEl.textContent = formaterTemps(tempsPourColonne(barColumn));
    barEl.setAttribute("aria-valuenow", String(Math.round((barColumn / w) * 100)));
    barEl.setAttribute("aria-valuetext", formaterTemps(tempsPourColonne(barColumn)));
  }

  function colonneDepuisClientX(clientX) {
    if (!resultCanvas) return 0;
    var rect = resultCanvas.getBoundingClientRect();
    var w = resultCanvas.width;
    if (!rect.width || !w) return 0;
    var x = clientX - rect.left;
    var ratio = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(ratio * (w - 1));
  }

  function demarrerCamera() {
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
        cameraReady = true;
        if (stageEl) stageEl.hidden = false;
        if (sectionCapture) sectionCapture.hidden = false;
        if (btnFlip) btnFlip.hidden = false;
        if (btnCamera) {
          btnCamera.querySelector(".btn__text").textContent = "Caméra active";
        }
        setStatus("Prêt — démarrez le chrono au signal de départ.");
        majSlitGuide();
      })
      .catch(function (err) {
        var msg = "Impossible d’accéder à la caméra.";
        if (err && err.name === "NotAllowedError") {
          msg = "Autorisez la caméra, puis réessayez.";
        } else if (err && err.name === "NotFoundError") {
          msg = "Aucune caméra détectée.";
        }
        montrerMsg(msg);
        setStatus("");
      });
  }

  function flipCamera() {
    facingMode = facingMode === "environment" ? "user" : "environment";
    if (cameraReady) demarrerCamera();
  }

  function demarrerCapture() {
    if (!cameraReady) {
      montrerMsg("Activez d’abord la caméra.");
      return;
    }
    etat = "capturing";
    chronoStartMs = Date.now();
    initComposite();
    majChronoLive();
    stopChronoTick();
    chronoTickId = setInterval(majChronoLive, 50);
    stopCaptureLoop();
    captureStrip();
    captureTimerId = setInterval(captureStrip, CAPTURE_INTERVAL_MS);
    if (btnStart) btnStart.hidden = true;
    if (btnStop) btnStop.hidden = false;
    if (slitInput) slitInput.disabled = true;
    if (btnCamera) btnCamera.disabled = true;
    if (btnFlip) btnFlip.disabled = true;
    setStatus("Enregistrement… faites passer les coureurs devant le téléphone.");
    montrerMsg("");
  }

  function arreterCapture() {
    if (etat !== "capturing") return;
    stopCaptureLoop();
    stopChronoTick();
    etat = "review";
    finaliserComposite();
    if (columnIndex === 0) {
      montrerMsg("Aucune image capturée — réessayez une course plus longue.");
      etat = "idle";
      if (btnStart) btnStart.hidden = false;
      if (btnStop) btnStop.hidden = true;
      if (slitInput) slitInput.disabled = false;
      if (btnCamera) btnCamera.disabled = false;
      if (btnFlip) btnFlip.disabled = false;
      return;
    }
    barColumn = Math.floor(columnIndex / 2);
    if (stageEl) stageEl.hidden = true;
    if (sectionCapture) sectionCapture.hidden = true;
    if (sectionPrepare) sectionPrepare.hidden = true;
    if (sectionReview) sectionReview.hidden = false;
    stopStream();
    majBarreAffichage();
    if (scrollEl && resultCanvas) {
      scrollEl.scrollLeft = Math.max(0, barColumn - scrollEl.clientWidth / 2);
    }
    setStatus("");
    montrerMsg("");
  }

  function renderClassement() {
    if (!classementEl) return;
    var sorted = passages.slice().sort(function (a, b) {
      return a.tempsMs - b.tempsMs;
    });
    classementEl.innerHTML = "";
    if (classementVideEl) classementVideEl.hidden = sorted.length > 0;
    sorted.forEach(function (p, i) {
      var li = document.createElement("li");
      li.className = "photo-finish-classement__item";
      li.innerHTML =
        "<span class=\"photo-finish-classement__rang\">" +
        (i + 1) +
        "</span>" +
        "<span class=\"photo-finish-classement__nom\">" +
        escapeHtml(p.nom) +
        "</span>" +
        "<span class=\"photo-finish-classement__temps\">" +
        formaterTemps(p.tempsMs) +
        "</span>";
      classementEl.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function labelPassage() {
    if (eleveSelectEl && eleveSelectEl.value && session.eleves.length) {
      for (var i = 0; i < session.eleves.length; i++) {
        if (session.eleves[i].id === eleveSelectEl.value) {
          return {
            eleveId: session.eleves[i].id,
            nom: formatEleve(session.eleves[i]),
            classe: session.classeNom || "",
          };
        }
      }
    }
    var manuel = nomManuelEl ? nomManuelEl.value.trim().replace(/\s+/g, " ") : "";
    if (manuel) {
      return { eleveId: "", nom: manuel, classe: session.classeNom || "" };
    }
    return null;
  }

  function dejaPasse(eleveId, nom) {
    var cle = (eleveId || nom || "").toLowerCase();
    if (!cle) return false;
    return passages.some(function (p) {
      if (eleveId && p.eleveId === eleveId) return true;
      return (p.nom || "").toLowerCase() === cle;
    });
  }

  function marquerPassage() {
    var label = labelPassage();
    if (!label) {
      montrerMsg("Choisissez un élève ou saisissez un nom.");
      return;
    }
    if (dejaPasse(label.eleveId, label.nom)) {
      montrerMsg("Ce coureur a déjà un temps enregistré.");
      return;
    }
    var t = tempsPourColonne(barColumn);
    passages.push({
      eleveId: label.eleveId,
      nom: label.nom,
      classe: label.classe,
      tempsMs: t,
      colonne: barColumn,
    });
    renderClassement();
    montrerMsg("");
    if (nomManuelEl) nomManuelEl.value = "";
    if (eleveSelectEl) eleveSelectEl.value = "";
  }

  function exporterCsv() {
    if (!passages.length) {
      montrerMsg("Aucun passage à exporter.");
      return;
    }
    var sorted = passages.slice().sort(function (a, b) {
      return a.tempsMs - b.tempsMs;
    });
    var lignes = ["Rang;Nom;Temps (s);Classe"];
    sorted.forEach(function (p, i) {
      lignes.push(
        [i + 1, p.nom, (p.tempsMs / 1000).toFixed(3), p.classe || ""].join(";")
      );
    });
    var blob = new Blob(["\ufeff" + lignes.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "photo-finish-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    montrerMsg("");
  }

  function nouvelleCourse() {
    if (
      passages.length &&
      !confirm("Recommencer une nouvelle course ? Les temps enregistrés seront effacés.")
    ) {
      return;
    }
    stopCaptureLoop();
    stopChronoTick();
    etat = "idle";
    passages = [];
    columnIndex = 0;
    columnTimes = [];
    barColumn = 0;
    if (sectionReview) sectionReview.hidden = true;
    if (sectionPrepare) sectionPrepare.hidden = false;
    if (sectionCapture) sectionCapture.hidden = !cameraReady;
    if (stageEl) stageEl.hidden = !cameraReady;
    if (btnStart) btnStart.hidden = false;
    if (btnStop) btnStop.hidden = true;
    if (slitInput) slitInput.disabled = false;
    if (btnCamera) btnCamera.disabled = false;
    if (btnFlip) btnFlip.disabled = false;
    renderClassement();
    majChronoLive();
    setStatus(cameraReady ? "Prêt — démarrez le chrono au signal de départ." : "");
    if (!cameraReady) demarrerCamera();
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.");
      return;
    }
    ClassImport.open({
      title: "Importer depuis une classe",
      hint: "Cochez les coureurs de la course.",
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
        majClasseInfo();
        montrerMsg("");
      },
    });
  }

  function onBarPointerDown(e) {
    if (etat !== "review") return;
    draggingBar = true;
    barColumn = colonneDepuisClientX(e.clientX);
    majBarreAffichage();
    if (barEl && barEl.setPointerCapture && e.pointerId != null) {
      try {
        barEl.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    }
    e.preventDefault();
  }

  function onBarPointerMove(e) {
    if (!draggingBar) return;
    barColumn = colonneDepuisClientX(e.clientX);
    majBarreAffichage();
  }

  function onBarPointerUp() {
    draggingBar = false;
  }

  function onBarKeydown(e) {
    if (etat !== "review" || !resultCanvas) return;
    var w = resultCanvas.width;
    var step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") {
      barColumn = Math.max(0, barColumn - step);
      majBarreAffichage();
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      barColumn = Math.min(w - 1, barColumn + step);
      majBarreAffichage();
      e.preventDefault();
    }
  }

  if (slitInput) {
    slitInput.addEventListener("input", majSlitGuide);
  }
  if (mirrorCheckbox) {
    mirrorCheckbox.addEventListener("change", function () {
      mirror = mirrorCheckbox.checked;
    });
  }
  if (btnCamera) btnCamera.addEventListener("click", demarrerCamera);
  if (btnFlip) btnFlip.addEventListener("click", flipCamera);
  if (btnStart) btnStart.addEventListener("click", demarrerCapture);
  if (btnStop) btnStop.addEventListener("click", arreterCapture);
  if (btnImport) btnImport.addEventListener("click", importerClasse);
  if (btnMarquer) btnMarquer.addEventListener("click", marquerPassage);
  if (btnExport) btnExport.addEventListener("click", exporterCsv);
  if (btnNouvelle) btnNouvelle.addEventListener("click", nouvelleCourse);

  if (barEl) {
    barEl.addEventListener("pointerdown", onBarPointerDown);
    barEl.addEventListener("pointermove", onBarPointerMove);
    barEl.addEventListener("pointerup", onBarPointerUp);
    barEl.addEventListener("pointercancel", onBarPointerUp);
    barEl.addEventListener("keydown", onBarKeydown);
  }
  if (imageWrapEl) {
    imageWrapEl.addEventListener("click", function (e) {
      if (etat !== "review" || e.target === barEl) return;
      barColumn = colonneDepuisClientX(e.clientX);
      majBarreAffichage();
    });
  }
  window.addEventListener("resize", function () {
    majSlitGuide();
    if (etat === "review") majBarreAffichage();
  });

  majSlitGuide();
  majClasseInfo();
  renderClassement();
  majChronoLive();
})();
