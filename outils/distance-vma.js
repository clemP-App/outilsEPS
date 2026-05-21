/**
 * Distance VMA — convertisseur distance/temps (VMA + %) et temps de passages.
 */
(function () {
  "use strict";

  var vmaBaseEl = document.getElementById("vma-base");
  var vmaPourcentEl = document.getElementById("vma-pourcent");
  var vmaDistanceEl = document.getElementById("vma-distance");
  var vmaTempsEl = document.getElementById("vma-temps");
  var bubbleVmaEl = document.getElementById("bubble-vma");
  var bubblePourcentEl = document.getElementById("bubble-pourcent");
  var bubbleDistanceEl = document.getElementById("bubble-distance");
  var bubbleTempsEl = document.getElementById("bubble-temps");
  var resultatVitesseEl = document.getElementById("resultat-vitesse");
  var tabReglagesEl = document.getElementById("tab-reglages");
  var tabPassagesEl = document.getElementById("tab-passages");
  var passagesRecapEl = document.getElementById("passages-recap");
  var baliseEl = document.getElementById("balise-distance");
  var passagesTbodyEl = document.getElementById("passages-tbody");
  var chronoDisplayEl = document.getElementById("chrono-display");
  var chronoStartEl = document.getElementById("chrono-start");
  var chronoPauseEl = document.getElementById("chrono-pause");
  var chronoStopEl = document.getElementById("chrono-stop");
  var chronoResetEl = document.getElementById("chrono-reset");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".distance-vma-tabs .vma-tab"));

  var chronoInterval = null;
  var chronoStartMs = 0;
  var chronoElapsedMs = 0;
  var chronoState = "idle";
  var highlightedRowIndex = -1;
  var audioCtx = null;

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

  function lireVitesseResultante() {
    return parseFloat(vmaBaseEl.value) * (parseFloat(vmaPourcentEl.value) / 100);
  }

  function vitesseMs() {
    var v = lireVitesseResultante() * 1000 / 3600;
    return v < 0.01 ? 0.01 : v;
  }

  function formaterTemps(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.round(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function formaterTempsChrono(ms) {
    var totalSec = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSec / 60);
    var seconds = totalSec % 60;
    var tenths = Math.floor((ms % 1000) / 100);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds + "." + tenths;
  }

  function formaterNombre(n, decimales) {
    var f = Math.pow(10, decimales);
    return String(Math.round(n * f) / f).replace(".", ",");
  }

  function parseTempsTable(str) {
    var parts = String(str || "").split(":");
    var m = parseInt(parts[0], 10) || 0;
    var s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }

  function ongletPassagesVisible() {
    return tabPassagesEl && !tabPassagesEl.hidden;
  }

  function majVitesse() {
    var base = parseFloat(vmaBaseEl.value);
    var pct = parseFloat(vmaPourcentEl.value);
    var res = lireVitesseResultante();
    if (bubbleVmaEl) bubbleVmaEl.textContent = base.toFixed(1) + " km/h";
    if (bubblePourcentEl) bubblePourcentEl.textContent = pct + "%";
    if (resultatVitesseEl) {
      resultatVitesseEl.innerHTML =
        'Vitesse résultante : <strong>' + formaterNombre(res, 1) + "</strong> km/h";
    }
    majDistanceTemps("speed");
  }

  function majDistanceTemps(changed) {
    var v = vitesseMs();

    if (changed === "distance" || changed === "speed") {
      var d = parseFloat(vmaDistanceEl.value);
      var t = d / v;
      if (t < 10) {
        t = 10;
        vmaDistanceEl.value = Math.round(v * 10);
      }
      if (t > 1200) {
        t = 1200;
        vmaDistanceEl.value = Math.round(v * 1200);
      }
      vmaTempsEl.value = Math.round(t);
    } else if (changed === "time") {
      var t2 = parseFloat(vmaTempsEl.value);
      var d2 = v * t2;
      if (d2 < 10) {
        d2 = 10;
        vmaTempsEl.value = Math.round(10 / v);
      }
      if (d2 > 5000) {
        d2 = 5000;
        vmaTempsEl.value = Math.round(5000 / v);
      }
      vmaDistanceEl.value = Math.round(d2);
    }

    if (bubbleDistanceEl) bubbleDistanceEl.textContent = Math.round(parseFloat(vmaDistanceEl.value)) + " m";
    if (bubbleTempsEl) bubbleTempsEl.textContent = formaterTemps(parseFloat(vmaTempsEl.value));
    majTableauPassages();
  }

  function retirerSurbrillance() {
    if (!passagesTbodyEl) return;
    var row = passagesTbodyEl.querySelector(".is-next-passage");
    if (row) row.classList.remove("is-next-passage");
    highlightedRowIndex = -1;
  }

  function surlignerProchainPassage(currentMs) {
    if (!passagesTbodyEl) return;
    var rowActuelle = passagesTbodyEl.querySelector(".is-next-passage");
    if (rowActuelle) rowActuelle.classList.remove("is-next-passage");

    var currentSec = currentMs / 1000;
    var rows = passagesTbodyEl.querySelectorAll("tr");
    var newIndex = -1;
    for (var i = 0; i < rows.length; i++) {
      var timeCell = rows[i].children[1];
      if (!timeCell) continue;
      if (parseTempsTable(timeCell.textContent) > currentSec) {
        newIndex = i;
        rows[i].classList.add("is-next-passage");
        break;
      }
    }

    if (
      chronoState === "running" &&
      newIndex > highlightedRowIndex &&
      highlightedRowIndex >= 0
    ) {
      beep(false);
    }
    highlightedRowIndex = newIndex;
  }

  function majTableauPassages() {
    if (!ongletPassagesVisible() || !passagesTbodyEl) return;

    retirerSurbrillance();
    var v = vitesseMs();
    var distTot = parseFloat(vmaDistanceEl.value);
    var bal = parseFloat(baliseEl && baliseEl.value) || 25;
    if (bal < 1) bal = 1;

    passagesTbodyEl.innerHTML = "";
    if (passagesRecapEl) {
      passagesRecapEl.textContent =
        "Vitesse : " +
        lireVitesseResultante().toFixed(1) +
        " km/h | Distance : " +
        Math.round(distTot) +
        " m | Temps : " +
        formaterTemps(parseFloat(vmaTempsEl.value));
    }

    var hasFinalRow = false;
    for (var d = bal; d <= distTot; d += bal) {
      var tr = document.createElement("tr");
      var tdDist = document.createElement("td");
      var tdTime = document.createElement("td");
      tdDist.textContent = String(d);
      tdTime.textContent = formaterTemps(d / v);
      tr.appendChild(tdDist);
      tr.appendChild(tdTime);
      passagesTbodyEl.appendChild(tr);
      if (d === distTot) hasFinalRow = true;
    }

    if (!hasFinalRow && distTot > 0) {
      var trFinal = document.createElement("tr");
      trFinal.className = "distance-vma-passages-table__final";
      var tdDistFinal = document.createElement("td");
      var tdTimeFinal = document.createElement("td");
      tdDistFinal.textContent = String(Math.round(distTot));
      tdTimeFinal.textContent = formaterTemps(distTot / v);
      trFinal.appendChild(tdDistFinal);
      trFinal.appendChild(tdTimeFinal);
      passagesTbodyEl.appendChild(trFinal);
    }

    if (chronoState === "running") surlignerProchainPassage(chronoElapsedMs);
  }

  function ajusterCurseur(targetId, step) {
    var el = document.getElementById(targetId);
    if (!el) return;
    var val = parseFloat(el.value) + step;
    var min = parseFloat(el.min);
    var max = parseFloat(el.max);
    if (val < min) val = min;
    if (val > max) val = max;
    el.value = val;
    if (targetId === "vma-base" || targetId === "vma-pourcent") majVitesse();
    else if (targetId === "vma-distance") majDistanceTemps("distance");
    else if (targetId === "vma-temps") majDistanceTemps("time");
  }

  function majBoutonsChrono(state) {
    if (!chronoStartEl) return;
    chronoStartEl.hidden = true;
    if (chronoPauseEl) chronoPauseEl.hidden = true;
    if (chronoStopEl) chronoStopEl.hidden = true;
    if (chronoResetEl) chronoResetEl.hidden = true;

    if (state === "idle") {
      chronoStartEl.hidden = false;
      chronoStartEl.querySelector(".btn__text").textContent = "Démarrer";
    } else if (state === "running") {
      if (chronoPauseEl) chronoPauseEl.hidden = false;
      if (chronoStopEl) chronoStopEl.hidden = false;
    } else if (state === "paused") {
      chronoStartEl.hidden = false;
      chronoStartEl.querySelector(".btn__text").textContent = "Reprendre";
      if (chronoResetEl) chronoResetEl.hidden = false;
    } else if (state === "stopped") {
      chronoStartEl.hidden = false;
      chronoStartEl.querySelector(".btn__text").textContent = "Démarrer";
      if (chronoResetEl) chronoResetEl.hidden = false;
    }
  }

  function tickChrono() {
    chronoElapsedMs = Date.now() - chronoStartMs;
    if (chronoDisplayEl) chronoDisplayEl.textContent = formaterTempsChrono(chronoElapsedMs);
    surlignerProchainPassage(chronoElapsedMs);
  }

  function demarrerChrono() {
    unlockAudio();
    if (chronoState === "idle" || chronoState === "stopped") {
      chronoElapsedMs = 0;
      highlightedRowIndex = -1;
    }
    chronoStartMs = Date.now() - chronoElapsedMs;
    if (chronoInterval) clearInterval(chronoInterval);
    chronoInterval = setInterval(tickChrono, 100);
    chronoState = "running";
    majBoutonsChrono("running");
    tickChrono();
  }

  function pauseChrono() {
    if (chronoInterval) clearInterval(chronoInterval);
    chronoInterval = null;
    chronoElapsedMs = Date.now() - chronoStartMs;
    chronoState = "paused";
    majBoutonsChrono("paused");
  }

  function stopChrono() {
    if (chronoInterval) clearInterval(chronoInterval);
    chronoInterval = null;
    chronoElapsedMs = Date.now() - chronoStartMs;
    chronoState = "stopped";
    majBoutonsChrono("stopped");
    surlignerProchainPassage(chronoElapsedMs);
  }

  function resetChrono() {
    if (chronoInterval) clearInterval(chronoInterval);
    chronoInterval = null;
    chronoElapsedMs = 0;
    chronoState = "idle";
    if (chronoDisplayEl) chronoDisplayEl.textContent = "0:00.0";
    majBoutonsChrono("idle");
    retirerSurbrillance();
  }

  function activerOnglet(tabId) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-tab") === tabId;
      tab.classList.toggle("is-active", active);
    });
    if (tabReglagesEl) tabReglagesEl.hidden = tabId !== "reglages";
    if (tabPassagesEl) tabPassagesEl.hidden = tabId !== "passages";
    if (tabId === "passages") majTableauPassages();
    if (tabId !== "passages" && chronoState !== "idle") resetChrono();
  }

  if (vmaBaseEl) vmaBaseEl.addEventListener("input", majVitesse);
  if (vmaPourcentEl) vmaPourcentEl.addEventListener("input", majVitesse);
  if (vmaDistanceEl) vmaDistanceEl.addEventListener("input", function () {
    majDistanceTemps("distance");
  });
  if (vmaTempsEl) vmaTempsEl.addEventListener("input", function () {
    majDistanceTemps("time");
  });
  if (baliseEl) baliseEl.addEventListener("input", majTableauPassages);

  Array.prototype.forEach.call(document.querySelectorAll(".distance-vma-step"), function (btn) {
    btn.addEventListener("click", function () {
      ajusterCurseur(btn.getAttribute("data-target"), parseFloat(btn.getAttribute("data-step")));
    });
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activerOnglet(tab.getAttribute("data-tab"));
    });
  });

  if (chronoStartEl) chronoStartEl.addEventListener("click", demarrerChrono);
  if (chronoPauseEl) chronoPauseEl.addEventListener("click", pauseChrono);
  if (chronoStopEl) chronoStopEl.addEventListener("click", stopChrono);
  if (chronoResetEl) chronoResetEl.addEventListener("click", resetChrono);
  majVitesse();
  majBoutonsChrono("idle");
})();
