/**
 * Accueil : détecte une nouvelle APP_VERSION (réseau) et purge le cache PWA une fois.
 */
(function () {
  "use strict";

  var VERSION_KEY = "outils_eps_pwa_version";
  var RELOAD_KEY = "outils_eps_pwa_reload";

  function canRun() {
    if (location.protocol === "file:") return false;
    if (!window.isSecureContext) return false;
    return true;
  }

  function parseVersion(text) {
    var match = String(text || "").match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : "";
  }

  function clearCaches() {
    if (!("caches" in window)) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          return caches.delete(key);
        })
      );
    });
  }

  function refreshServiceWorker() {
    if (!("serviceWorker" in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistration().then(function (registration) {
      if (!registration) return;
      return registration.update();
    });
  }

  function applyUpgrade(remoteVersion) {
    try {
      localStorage.setItem(VERSION_KEY, remoteVersion);
      sessionStorage.setItem(RELOAD_KEY, remoteVersion);
    } catch (e) {
      /* stockage indisponible */
    }
    return clearCaches().then(refreshServiceWorker).then(function () {
      window.location.reload();
    });
  }

  if (!canRun()) return;

  fetch("./app-version.js", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("app-version.js");
      return response.text();
    })
    .then(function (text) {
      var remoteVersion = parseVersion(text);
      if (!remoteVersion) return;

      var storedVersion = "";
      var reloadVersion = "";
      try {
        storedVersion = localStorage.getItem(VERSION_KEY) || "";
        reloadVersion = sessionStorage.getItem(RELOAD_KEY) || "";
      } catch (e) {
        /* stockage indisponible */
      }

      if (reloadVersion === remoteVersion) {
        try {
          sessionStorage.removeItem(RELOAD_KEY);
        } catch (e2) {}
        return;
      }

      if (!storedVersion) {
        try {
          localStorage.setItem(VERSION_KEY, remoteVersion);
        } catch (e3) {}
        return;
      }

      if (storedVersion === remoteVersion) return;

      return applyUpgrade(remoteVersion);
    })
    .catch(function () {
      /* hors ligne ou fetch impossible : on garde la version locale */
    });
})();
