/**
 * Enregistrement du service worker (PWA).
 * Attribut data-sw sur la balise script : chemin vers sw.js (ex. sw.js ou ../sw.js).
 */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;

  var script = document.currentScript;
  var swUrl = (script && script.getAttribute("data-sw")) || "sw.js";

  window.addEventListener("load", function () {
    navigator.serviceWorker.register(swUrl).catch(function () {
      /* installation PWA optionnelle */
    });
  });
})();
