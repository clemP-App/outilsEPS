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
    if (script && script.getAttribute("data-no-manifest") === "true") return;
    if (document.querySelector('link[rel="manifest"]')) return;
    var link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestHref();
    document.head.appendChild(link);
  }

  function loadInstallBanner() {
    if (!canUsePwa()) return;
    if (script && script.getAttribute("data-no-manifest") === "true") return;
    if (!script || !script.src) return;
    var bannerSrc = script.src.replace(/pwa-register\.js(\?.*)?$/i, "pwa-install-banner.js$1");
    if (bannerSrc === script.src) return;
    var el = document.createElement("script");
    el.src = bannerSrc;
    el.async = true;
    document.body.appendChild(el);
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

  if (document.body) {
    loadInstallBanner();
  } else {
    document.addEventListener("DOMContentLoaded", loadInstallBanner);
  }
})();
