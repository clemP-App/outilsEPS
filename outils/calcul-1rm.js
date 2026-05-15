/**
 * Calcul du 1RM — formules d’Epley et de Brzycki.
 */
(function () {
  "use strict";

  var FORMULE_KEY = "outils_eps_1rm_formule_v1";

  var poidsEl = document.getElementById("poids");
  var repsEl = document.getElementById("reps");
  var msgEl = document.getElementById("rm-msg");
  var sectionResultat = document.getElementById("section-resultat");
  var resultatEl = document.getElementById("resultat-1rm");
  var detailEl = document.getElementById("rm-detail");
  var fieldsetFormule = document.getElementById("fieldset-formule");

  function montrerMsg(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
  }

  function lireFormule() {
    if (!fieldsetFormule) return "epley";
    var checked = fieldsetFormule.querySelector('input[name="formule"]:checked');
    return checked && checked.value === "brzycki" ? "brzycki" : "epley";
  }

  function sauverFormule(formule) {
    try {
      localStorage.setItem(FORMULE_KEY, formule);
    } catch (e) {
      /* ignore */
    }
  }

  function chargerFormule() {
    try {
      var v = localStorage.getItem(FORMULE_KEY);
      if (v !== "epley" && v !== "brzycki") return;
      var input = fieldsetFormule.querySelector('input[name="formule"][value="' + v + '"]');
      if (input) input.checked = true;
    } catch (e) {
      /* ignore */
    }
  }

  function calculer1rmEpley(poids, reps) {
    return poids * (1 + reps / 30);
  }

  function calculer1rmBrzycki(poids, reps) {
    return poids * (36 / (37 - reps));
  }

  function formaterKg(n) {
    if (!isFinite(n)) return "—";
    var arrondi = Math.round(n * 10) / 10;
    var texte = arrondi.toFixed(1);
    if (texte.indexOf(".0") === texte.length - 2) {
      return String(Math.round(arrondi));
    }
    return texte.replace(".", ",");
  }

  function majCalcul() {
    if (!poidsEl || !repsEl) return;

    var poids = parseFloat(String(poidsEl.value).replace(",", "."));
    var reps = parseInt(repsEl.value, 10);
    var formule = lireFormule();

    if (!poidsEl.value.trim() && !repsEl.value.trim()) {
      montrerMsg("");
      if (sectionResultat) sectionResultat.hidden = true;
      return;
    }

    if (!poids || poids <= 0) {
      montrerMsg("Indiquez un poids strictement positif (en kg).");
      if (sectionResultat) sectionResultat.hidden = true;
      return;
    }

    if (!reps || reps < 1) {
      montrerMsg("Indiquez au moins 1 répétition.");
      if (sectionResultat) sectionResultat.hidden = true;
      return;
    }

    if (formule === "brzycki" && reps >= 37) {
      montrerMsg("La formule de Brzycki ne convient pas au-delà de 36 répétitions. Choisissez Epley ou réduisez le nombre de répétitions.");
      if (sectionResultat) sectionResultat.hidden = true;
      return;
    }

    montrerMsg("");

    var rm;
    var nomFormule;
    if (formule === "brzycki") {
      rm = calculer1rmBrzycki(poids, reps);
      nomFormule = "Brzycki";
    } else {
      rm = calculer1rmEpley(poids, reps);
      nomFormule = "Epley";
    }

    if (sectionResultat) sectionResultat.hidden = false;
    if (resultatEl) resultatEl.textContent = formaterKg(rm);
    if (detailEl) {
      detailEl.textContent =
        "À partir de " +
        formaterKg(poids) +
        " kg × " +
        reps +
        " répétition" +
        (reps > 1 ? "s" : "") +
        ", formule " +
        nomFormule +
        ".";
    }
  }

  if (fieldsetFormule) {
    fieldsetFormule.addEventListener("change", function () {
      sauverFormule(lireFormule());
      majCalcul();
    });
  }

  [poidsEl, repsEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", majCalcul);
    el.addEventListener("change", majCalcul);
  });

  chargerFormule();
  majCalcul();
})();
