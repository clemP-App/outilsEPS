/**
 * Compteur bonus — 2 joueurs, bonus / point / malus, annulation, pourcentages.
 */
(function () {
  "use strict";

  var PARAM_ID = "compteur-bonus-settings";

  var ptsBonusEl = document.getElementById("pts-bonus");
  var ptsNormalEl = document.getElementById("pts-normal");
  var ptsMalusEl = document.getElementById("pts-malus");
  var scoreAEl = document.getElementById("score-a");
  var scoreBEl = document.getElementById("score-b");
  var playEl = document.querySelector(".bonus-play");
  var btnUndo = document.getElementById("btn-undo");
  var btnReset = document.getElementById("btn-reset-partie");

  var settings = { ptsBonus: 2, ptsNormal: 1, ptsMalus: -1 };
  /** @type {Array<{joueur:'A'|'B',type:'bonus'|'normal'|'malus'}>} */
  var history = [];
  var saveTimer = null;

  function ptsPourType(type) {
    if (type === "bonus") return settings.ptsBonus;
    if (type === "normal") return settings.ptsNormal;
    return settings.ptsMalus;
  }

  function lireReglagesDepuisChamps() {
    settings.ptsBonus = parseFloat(ptsBonusEl.value);
    settings.ptsNormal = parseFloat(ptsNormalEl.value);
    settings.ptsMalus = parseFloat(ptsMalusEl.value);
    if (isNaN(settings.ptsBonus)) settings.ptsBonus = 0;
    if (isNaN(settings.ptsNormal)) settings.ptsNormal = 0;
    if (isNaN(settings.ptsMalus)) settings.ptsMalus = 0;
  }

  function appliquerReglagesAuxChamps() {
    ptsBonusEl.value = String(settings.ptsBonus);
    ptsNormalEl.value = String(settings.ptsNormal);
    ptsMalusEl.value = String(settings.ptsMalus);
  }

  function sauverReglages() {
    if (typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_ID,
      ptsBonus: settings.ptsBonus,
      ptsNormal: settings.ptsNormal,
      ptsMalus: settings.ptsMalus,
    });
  }

  function sauverReglagesDebounced() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      sauverReglages();
    }, 400);
  }

  function compterClics(joueur) {
    var c = { bonus: 0, normal: 0, malus: 0 };
    history.forEach(function (h) {
      if (h.joueur !== joueur) return;
      c[h.type]++;
    });
    return c;
  }

  function scoreJoueur(joueur) {
    var total = 0;
    history.forEach(function (h) {
      if (h.joueur !== joueur) return;
      total += ptsPourType(h.type);
    });
    return total;
  }

  function pointsParType(joueur) {
    var pts = { bonus: 0, normal: 0, malus: 0 };
    history.forEach(function (h) {
      if (h.joueur !== joueur) return;
      pts[h.type] += ptsPourType(h.type);
    });
    return pts;
  }

  function formatPts(n) {
    if (n > 0) return "+" + n;
    return String(n);
  }

  function detailTexte(joueur, type) {
    var clics = compterClics(joueur);
    var totalClics = clics.bonus + clics.normal + clics.malus;
    var pts = pointsParType(joueur);
    if (!totalClics) return "0x · 0%";
    var pct = Math.round((clics[type] / totalClics) * 100);
    return clics[type] + "x · " + pct + "% · " + formatPts(pts[type]);
  }

  function renderJoueur(joueur) {
    if (!playEl) return;
    playEl.querySelectorAll('.bonus-btn[data-joueur="' + joueur + '"]').forEach(function (btn) {
      var type = btn.getAttribute("data-type");
      if (type !== "bonus" && type !== "normal" && type !== "malus") return;
      var detail = btn.querySelector(".bonus-btn__detail");
      if (detail) detail.textContent = detailTexte(joueur, type);
    });
  }

  function render() {
    var scoreA = scoreJoueur("A");
    var scoreB = scoreJoueur("B");
    if (scoreAEl) scoreAEl.textContent = String(scoreA);
    if (scoreBEl) scoreBEl.textContent = String(scoreB);
    renderJoueur("A");
    renderJoueur("B");
    if (btnUndo) btnUndo.disabled = history.length === 0;
  }

  function ajouterClic(joueur, type) {
    lireReglagesDepuisChamps();
    history.push({ joueur: joueur, type: type });
    render();
  }

  function annulerDernier() {
    if (!history.length) return;
    history.pop();
    render();
  }

  function resetPartie() {
    if (history.length && !confirm("Remettre les scores des deux joueurs à zéro ?")) return;
    history = [];
    render();
  }

  document.querySelectorAll(".bonus-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var joueur = btn.getAttribute("data-joueur");
      var type = btn.getAttribute("data-type");
      if (joueur !== "A" && joueur !== "B") return;
      if (type !== "bonus" && type !== "normal" && type !== "malus") return;
      ajouterClic(joueur, type);
    });
  });

  if (btnUndo) btnUndo.addEventListener("click", annulerDernier);
  if (btnReset) btnReset.addEventListener("click", resetPartie);

  [ptsBonusEl, ptsNormalEl, ptsMalusEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("change", function () {
      lireReglagesDepuisChamps();
      sauverReglagesDebounced();
      render();
    });
  });

  function init() {
    var p = Promise.resolve();
    if (typeof DataManager !== "undefined") {
      p = DataManager.ready.then(function () {
        return DataManager.getParametre(PARAM_ID);
      });
    }
    p.then(function (saved) {
      if (saved) {
        if (typeof saved.ptsBonus === "number") settings.ptsBonus = saved.ptsBonus;
        if (typeof saved.ptsNormal === "number") settings.ptsNormal = saved.ptsNormal;
        if (typeof saved.ptsMalus === "number") settings.ptsMalus = saved.ptsMalus;
      }
      appliquerReglagesAuxChamps();
      render();
    });
  }

  init();
})();
