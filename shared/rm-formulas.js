/**
 * Estimation du 1RM (Epley, Brzycki) — partagé journal / calculateur.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.RmFormulas = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var FORMULA_EPLEY = "epley";
  var FORMULA_BRZYCKI = "brzycki";
  var MAX_REPS_BRZYCKI = 36;
  var MAX_REPS_ESTIMATE = 30;

  function estimate1rmEpley(weightKg, reps) {
    return weightKg * (1 + reps / 30);
  }

  function estimate1rmBrzycki(weightKg, reps) {
    return weightKg * (36 / (37 - reps));
  }

  function canEstimate(reps, formula) {
    if (!reps || reps < 1) return false;
    if (formula === FORMULA_BRZYCKI && reps >= MAX_REPS_BRZYCKI) return false;
    if (reps > MAX_REPS_ESTIMATE) return false;
    return true;
  }

  function estimate1rm(weightKg, reps, formula) {
    weightKg = parseFloat(weightKg);
    reps = parseInt(reps, 10);
    if (!weightKg || weightKg <= 0 || !canEstimate(reps, formula)) return null;
    if (formula === FORMULA_BRZYCKI) return estimate1rmBrzycki(weightKg, reps);
    return estimate1rmEpley(weightKg, reps);
  }

  function formatKg(n) {
    if (n == null || !isFinite(n)) return "—";
    var arrondi = Math.round(n * 10) / 10;
    var texte = arrondi.toFixed(1);
    if (texte.indexOf(".0") === texte.length - 2) return String(Math.round(arrondi));
    return texte.replace(".", ",");
  }

  function formulaLabel(formula) {
    return formula === FORMULA_BRZYCKI ? "Brzycki" : "Epley";
  }

  return {
    FORMULA_EPLEY: FORMULA_EPLEY,
    FORMULA_BRZYCKI: FORMULA_BRZYCKI,
    MAX_REPS_ESTIMATE: MAX_REPS_ESTIMATE,
    estimate1rmEpley: estimate1rmEpley,
    estimate1rmBrzycki: estimate1rmBrzycki,
    estimate1rm: estimate1rm,
    canEstimate: canEstimate,
    formatKg: formatKg,
    formulaLabel: formulaLabel,
  };
});
