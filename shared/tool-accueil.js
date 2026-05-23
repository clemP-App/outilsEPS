/**
 * Lien « Accueil » des outils : retour vers index.html ou eleves.html
 * selon la page d’accueil d’où l’utilisateur a ouvert l’outil.
 */
(function () {
  "use strict";

  var KEY = "outils_eps_accueil_v1";
  var HREF = {
    index: "../index.html",
    eleves: "../eleves.html",
  };

  function setAccueil(mode) {
    try {
      sessionStorage.setItem(KEY, mode === "eleves" ? "eleves" : "index");
    } catch (e) {}
  }

  function getAccueil() {
    try {
      var v = sessionStorage.getItem(KEY);
      return v === "eleves" ? "eleves" : "index";
    } catch (e) {
      return "index";
    }
  }

  function applyToolBack() {
    var back = document.querySelector(".tool-back");
    if (!back) return;
    var mode = getAccueil();
    back.href = mode === "eleves" ? HREF.eleves : HREF.index;
    back.setAttribute("data-accueil", mode);
  }

  window.OutilsAccueil = {
    KEY: KEY,
    setAccueil: setAccueil,
    getAccueil: getAccueil,
    applyToolBack: applyToolBack,
  };

  applyToolBack();
})();
