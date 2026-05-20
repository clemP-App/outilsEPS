/**
 * Données élèves — récupération QR et visualisation des imports.
 */
(function () {
  "use strict";

  function init() {
    if (typeof ImportsElevesUI === "undefined" || typeof DataManager === "undefined") {
      return Promise.resolve();
    }
    return DataManager.ready.then(function () {
      return ImportsElevesUI.init();
    });
  }

  init();
})();
