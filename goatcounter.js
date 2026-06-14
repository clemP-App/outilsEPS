/**
 * GoatCounter — actif uniquement sur outilseps.fr / www.outilseps.fr, pas en local ni sur GitHub Pages.
 */
(function () {
  "use strict";

  var allowedHosts = ["outilseps.fr", "www.outilseps.fr"];
  var host = (window.location.hostname || "").toLowerCase();

  if (allowedHosts.indexOf(host) < 0) {
    console.info("[GoatCounter] Désactivé sur cet environnement :", window.location.hostname);
    return;
  }

  if (document.querySelector("script[data-goatcounter]")) return;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.setAttribute("data-goatcounter", "https://clempapp.goatcounter.com/count");
  document.head.appendChild(script);
})();
