/**
 * Enregistrement du service worker (PWA) + chargement de la bannière d’installation.
 * Attribut data-sw sur la balise script : chemin vers sw.js (ex. sw.js ou ../sw.js).
 */
(function () {
  "use strict";

  var script = document.currentScript;

  function loadInstallBanner() {
    if (!script || !script.src) return;
    var bannerSrc = script.src.replace(/pwa-register\.js(\?.*)?$/i, "pwa-install-banner.js$1");
    if (bannerSrc === script.src) return;
    var el = document.createElement("script");
    el.src = bannerSrc;
    el.async = true;
    document.body.appendChild(el);
  }

  if ("serviceWorker" in navigator) {
    var swUrl = (script && script.getAttribute("data-sw")) || "sw.js";
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(swUrl).catch(function () {
        /* installation PWA optionnelle */
      });
    });
  }

  if (document.body) {
    loadInstallBanner();
  } else {
    document.addEventListener("DOMContentLoaded", loadInstallBanner);
  }
})();
