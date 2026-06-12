/**
 * GoatCounter — actif uniquement sur le site publié (GitHub Pages), pas en local.
 */
(function () {
  "use strict";

  var host = (location.hostname || "").toLowerCase();
  if (location.protocol === "file:") return;
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "[::1]") return;
  if (host.indexOf("github.io") < 0 && host !== "outilseps.fr" && host !== "www.outilseps.fr") return;

  if (document.querySelector("script[data-goatcounter]")) return;

  var s = document.createElement("script");
  s.defer = true;
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://clempapp.goatcounter.com/count");
  document.head.appendChild(s);
})();
