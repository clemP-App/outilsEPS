/**
 * Affichage des élèves — nom avant prénom dans les listes.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.EleveDisplay = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  "use strict";

  /**
   * @param {{nom?:string,prenom?:string}|null} eleve
   * @param {string} [fallback]
   */
  function formatEleveListe(eleve, fallback) {
    fallback = fallback === undefined ? "Sans nom" : fallback;
    if (!eleve) return fallback;
    var parts = [eleve.nom, eleve.prenom]
      .map(function (s) {
        return String(s || "").trim();
      })
      .filter(Boolean);
    return parts.join(" ") || fallback;
  }

  return {
    formatEleveListe: formatEleveListe,
  };
});
