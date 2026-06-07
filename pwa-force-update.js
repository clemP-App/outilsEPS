/**
 * Mise à jour PWA : détection auto de version + bouton « Mettre à jour » dans le footer.
 */
(function () {
  "use strict";

  var VERSION_KEY = "outils_eps_pwa_version";
  var RELOAD_KEY = "outils_eps_pwa_reload";
  var forceRunning = false;

  function canRun() {
    if (location.protocol === "file:") return false;
    if (!window.isSecureContext) return false;
    return true;
  }

  function rootPrefix() {
    var path = location.pathname || "";
    return /\/outils\//i.test(path) ? "../" : "./";
  }

  function parseVersion(text) {
    var match = String(text || "").match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : "";
  }

  function fetchRemoteVersion() {
    return fetch(rootPrefix() + "app-version.js", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("app-version.js");
        return response.text();
      })
      .then(parseVersion);
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

  function unregisterServiceWorkers() {
    if (!("serviceWorker" in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations().then(function (registrations) {
      return Promise.all(
        registrations.map(function (registration) {
          return registration.unregister();
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

  function persistVersion(remoteVersion, reloadPending) {
    try {
      if (remoteVersion) localStorage.setItem(VERSION_KEY, remoteVersion);
      if (reloadPending && remoteVersion) sessionStorage.setItem(RELOAD_KEY, remoteVersion);
      else sessionStorage.removeItem(RELOAD_KEY);
    } catch (e) {
      /* stockage indisponible */
    }
  }

  function reloadPage() {
    window.location.reload();
  }

  function applyUpgrade(remoteVersion) {
    persistVersion(remoteVersion, true);
    return clearCaches().then(refreshServiceWorker).then(reloadPage);
  }

  function forcePwaUpdate(triggerEl) {
    if (!canRun() || forceRunning) return Promise.resolve();
    forceRunning = true;
    if (triggerEl) {
      triggerEl.disabled = true;
      triggerEl.setAttribute("aria-busy", "true");
      triggerEl.textContent = "Mise à jour…";
    }

    return fetchRemoteVersion()
      .then(function (remoteVersion) {
        return clearCaches()
          .then(unregisterServiceWorkers)
          .then(function () {
            try {
              localStorage.removeItem(VERSION_KEY);
              sessionStorage.removeItem(RELOAD_KEY);
            } catch (e) {
              /* ignore */
            }
            persistVersion(remoteVersion, false);
          })
          .then(reloadPage);
      })
      .catch(function () {
        forceRunning = false;
        if (triggerEl) {
          triggerEl.disabled = false;
          triggerEl.removeAttribute("aria-busy");
          triggerEl.textContent = "🔄 Mettre à jour l\u2019app";
        }
        window.alert("Mise à jour impossible. Vérifiez votre connexion puis réessayez.");
      });
  }

  function wireTrigger(el) {
    if (!el || el.dataset.pwaForceUpdateBound === "1") return;
    el.dataset.pwaForceUpdateBound = "1";
    el.addEventListener("click", function (event) {
      event.preventDefault();
      forcePwaUpdate(el);
    });
  }

  function injectFooterControl() {
    var footerP = document.querySelector(".site-footer p");
    if (!footerP) return;

    var versionEl = footerP.querySelector("[data-pwa-app-version]");
    if (!versionEl) {
      versionEl = document.createElement("span");
      versionEl.className = "site-footer__version";
      versionEl.setAttribute("data-pwa-app-version", "");
      versionEl.setAttribute("aria-label", "Version de l\u2019application");
      footerP.appendChild(versionEl);
    }

    var trigger = footerP.querySelector("[data-pwa-force-update]");
    if (!trigger) {
      trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "site-footer__link-btn";
      trigger.setAttribute("data-pwa-force-update", "");
      trigger.textContent = "🔄 Mettre à jour l\u2019app";
      footerP.appendChild(trigger);
    }

    wireTrigger(trigger);

    fetchRemoteVersion()
      .then(function (remoteVersion) {
        if (!remoteVersion || !versionEl) return;
        var storedVersion = "";
        try {
          storedVersion = localStorage.getItem(VERSION_KEY) || "";
        } catch (e) {
          /* ignore */
        }
        var label = "v" + remoteVersion;
        if (storedVersion && storedVersion !== remoteVersion) {
          label += " (installée : v" + storedVersion + ")";
        }
        versionEl.textContent = label;
      })
      .catch(function () {
        /* hors ligne */
      });
  }

  function runAutoVersionCheck() {
    return fetchRemoteVersion()
      .then(function (remoteVersion) {
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
          persistVersion(remoteVersion, false);
          return;
        }

        if (storedVersion === remoteVersion) return;

        return applyUpgrade(remoteVersion);
      })
      .catch(function () {
        /* hors ligne ou fetch impossible */
      });
  }

  function init() {
    if (!canRun()) return;
    document.querySelectorAll("[data-pwa-force-update]").forEach(wireTrigger);
    injectFooterControl();
    runAutoVersionCheck();
  }

  window.OutilsEPS = window.OutilsEPS || {};
  window.OutilsEPS.forcePwaUpdate = forcePwaUpdate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
