/**
 * PWA : manifest, service worker, bannière d’installation.
 * Désactivé en file:// et dans le navigateur intégré Cursor/VS Code.
 */
(function () {
  "use strict";

  var script = document.currentScript;

  function canUsePwa() {
    var protocol = location.protocol;
    if (protocol === "file:") return false;
    if (!window.isSecureContext) return false;
    if (protocol !== "http:" && protocol !== "https:") return false;
    var host = (location.hostname || "").toLowerCase();
    if (host.indexOf("vscode") >= 0 || host.indexOf("cursor") >= 0) return false;
    if ((location.search || "").indexOf("vscodeBrowserReqId") >= 0) return false;
    return true;
  }

  function manifestHref() {
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../manifest.webmanifest";
    return "manifest.webmanifest";
  }

  function injectManifest() {
    if (!canUsePwa()) return;
    if (document.querySelector('link[rel="manifest"]')) return;
    var link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestHref();
    document.head.appendChild(link);
  }

  function loadScriptSibling(filename) {
    if (!canUsePwa() || !script || !script.src) return;
    var src = script.src.replace(/pwa-register\.js(\?.*)?$/i, filename + "$1");
    if (src === script.src) return;
    var el = document.createElement("script");
    el.src = src;
    el.async = true;
    document.body.appendChild(el);
  }

  function loadInstallBanner() {
    loadScriptSibling("pwa-install-banner.js");
  }

  function loadContextHint() {
    loadScriptSibling("pwa-context-hint.js");
  }

  function loadForceUpdate() {
    loadScriptSibling("pwa-force-update.js");
  }

  function loadScriptSiblingThen(filename, onLoad) {
    if (!canUsePwa() || !script || !script.src) {
      if (onLoad) onLoad();
      return;
    }
    var src = script.src.replace(/pwa-register\.js(\?.*)?$/i, filename + "$1");
    if (src === script.src) {
      if (onLoad) onLoad();
      return;
    }
    var el = document.createElement("script");
    el.src = src;
    el.onload = function () {
      if (onLoad) onLoad();
    };
    el.onerror = function () {
      if (onLoad) onLoad();
    };
    document.body.appendChild(el);
  }

  function loadMigrationKit() {
    loadScriptSiblingThen("pwa-migration-modal.js", function () {
      loadScriptSibling("pwa-migration-banner.js");
    });
  }

  injectManifest();

  if (canUsePwa() && "serviceWorker" in navigator) {
    var swUrl = (script && script.getAttribute("data-sw")) || "sw.js";
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(swUrl).catch(function () {
        /* installation PWA optionnelle */
      });
    });
  }

  function ensureSiteConfig(onReady) {
    if (window.OutilsEPS && window.OutilsEPS.site) {
      onReady();
      return;
    }
    loadScriptSiblingThen("site-config.js", onReady);
  }

  function loadPwaUi() {
    ensureSiteConfig(function () {
      var legacy =
        window.OutilsEPS &&
        window.OutilsEPS.site &&
        typeof window.OutilsEPS.site.isLegacyHost === "function" &&
        window.OutilsEPS.site.isLegacyHost();
      if (legacy) loadMigrationKit();
      loadInstallBanner();
      loadContextHint();
      loadForceUpdate();
    });
  }


  if (document.body) {
    loadPwaUi();
  } else {
    document.addEventListener("DOMContentLoaded", loadPwaUi);
  }
})();
