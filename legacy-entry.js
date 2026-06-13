/**
 * Redirection vers la page d’accueil migration (GitHub Pages uniquement).
 * Inclure dans index.html et eleves.html : <script src="legacy-entry.js" data-legacy-landing></script>
 */
(function () {
  "use strict";

  var SKIP_KEY = "outils_eps_legacy_skip_landing_v1";
  var LANDING_PAGE = "passer-sur-outilseps.html";

  function isLegacyHost() {
    return (
      window.OutilsEPS &&
      window.OutilsEPS.site &&
      typeof window.OutilsEPS.site.isLegacyHost === "function" &&
      window.OutilsEPS.site.isLegacyHost()
    );
  }

  function isOfficialHost() {
    return (
      window.OutilsEPS &&
      window.OutilsEPS.site &&
      typeof window.OutilsEPS.site.isOfficialHost === "function" &&
      window.OutilsEPS.site.isOfficialHost()
    );
  }

  function shouldSkipLanding() {
    try {
      return localStorage.getItem(SKIP_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  var script = document.currentScript;
  var isLandingScript = script && script.hasAttribute("data-legacy-landing-page");
  var isEntryScript = script && script.hasAttribute("data-legacy-landing");

  if (isLandingScript && isOfficialHost()) {
    location.replace("index.html");
    return;
  }

  if (isEntryScript && isLegacyHost() && !shouldSkipLanding()) {
    var path = location.pathname || "";
    if (/(^|\/)passer-sur-outilseps\.html$/i.test(path)) return;
    if (/(^|\/)index\.html$/i.test(path) || /(^|\/)eleves\.html$/i.test(path) || /\/outilsEPS\/?$/i.test(path)) {
      location.replace(LANDING_PAGE);
    }
  }

  window.OutilsEPS = window.OutilsEPS || {};
  window.OutilsEPS.legacyLanding = {
    SKIP_KEY: SKIP_KEY,
    LANDING_PAGE: LANDING_PAGE,
    continueOnLegacy: function (target) {
      try {
        localStorage.setItem(SKIP_KEY, "1");
      } catch (e) {
        /* ignore */
      }
      location.href = target || "index.html";
    },
  };
})();
