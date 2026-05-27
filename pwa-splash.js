/**
 * Écran de chargement au démarrage de la PWA (page d’accueil uniquement).
 * Placer dans <head> avec l’attribut data-home sur index.html.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var MIN_VISIBLE_MS = 1000;
  var MAX_WAIT_MS = 5000;
  var shownAt = 0;
  var loadDone = false;
  var appReady = false;
  var hidden = false;

  function isStandalonePwa() {
    if (window.navigator.standalone === true) return true;
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    } catch (e) {
      /* matchMedia indisponible */
    }
    return false;
  }

  function isHomePage() {
    if (script && script.hasAttribute("data-home")) return true;
    var path = (location.pathname || "").replace(/\\/g, "/");
    return /(^|\/)index\.html$/i.test(path);
  }

  function assetBase() {
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../";
    if (script && script.src && /\/outils\//i.test(script.src)) return "../";
    return "";
  }

  function themeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    return meta && meta.content ? meta.content : "#1a2744";
  }

  function appLabel() {
    var meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    return meta && meta.content ? meta.content : "Outils EPS";
  }

  function readAppVersion() {
    if (typeof APP_VERSION !== "undefined" && APP_VERSION) return String(APP_VERSION);
    return "";
  }

  if (!isStandalonePwa() || !isHomePage() || document.getElementById("pwa-splash")) {
    document.documentElement.classList.remove("pwa-splash-boot");
    return;
  }

  var color = themeColor();
  var base = assetBase();
  var version = readAppVersion();

  var style = document.createElement("style");
  style.id = "pwa-splash-style";
  style.textContent =
    "html.pwa-splash-active,html.pwa-splash-active body{background-color:" +
    color +
    ";overflow:hidden}" +
    "#pwa-splash{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;" +
    "padding:max(1.5rem,env(safe-area-inset-top)) 1.5rem max(.75rem,env(safe-area-inset-bottom));background:" +
    color +
    ";color:#f8fafc;font-family:ui-sans-serif,\"Segoe UI\",system-ui,-apple-system,sans-serif;" +
    "text-align:center;transition:opacity .28s ease,visibility .28s ease}" +
    "#pwa-splash.pwa-splash--hide{opacity:0;visibility:hidden;pointer-events:none}" +
    "#pwa-splash img{width:5.5rem;height:5.5rem;border-radius:1.25rem;box-shadow:0 12px 40px rgba(0,0,0,.35)}" +
    ".pwa-splash__main{flex:1;display:flex;flex-direction:column;align-items:center;" +
    "justify-content:center;gap:1.25rem;min-height:0}" +
    "#pwa-splash .pwa-splash__title{margin:0;font-size:1.35rem;font-weight:700;letter-spacing:-.02em}" +
    "#pwa-splash .pwa-splash__status{margin:0;font-size:.9rem;opacity:.75}" +
    "#pwa-splash .pwa-splash__version{margin:0;padding-top:.75rem;font-size:.75rem;opacity:.5;" +
    "letter-spacing:.04em}" +
    ".pwa-splash__spinner{width:2rem;height:2rem;border:3px solid rgba(248,250,252,.25);" +
    "border-top-color:#2dd4bf;border-radius:50%;animation:pwa-splash-spin .75s linear infinite}" +
    "@keyframes pwa-splash-spin{to{transform:rotate(360deg)}}" +
    "@media (prefers-reduced-motion:reduce){.pwa-splash__spinner{animation:none;border-top-color:rgba(248,250,252,.6)}}";
  document.documentElement.classList.add("pwa-splash-active");
  document.head.appendChild(style);

  var splash = document.createElement("div");
  splash.id = "pwa-splash";
  splash.setAttribute("role", "status");
  splash.setAttribute("aria-live", "polite");
  splash.setAttribute("aria-busy", "true");
  splash.innerHTML =
    '<div class="pwa-splash__main">' +
    '<img src="' +
    base +
    'assets/icon-192.png" width="88" height="88" alt="" decoding="async" />' +
    '<p class="pwa-splash__title">' +
    appLabel() +
    "</p>" +
    '<p class="pwa-splash__status">Chargement…</p>' +
    '<div class="pwa-splash__spinner" aria-hidden="true"></div>' +
    "</div>" +
    (version ? '<p class="pwa-splash__version">Version ' + version + "</p>" : "");

  function mount() {
    if (splash.parentNode) return;
    if (document.body) document.body.insertBefore(splash, document.body.firstChild);
    else document.documentElement.appendChild(splash);
  }

  shownAt = Date.now();
  mount();
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", mount);
  }

  function hideSplash() {
    if (hidden) return;
    hidden = true;
    splash.setAttribute("aria-busy", "false");
    splash.classList.add("pwa-splash--hide");
    window.setTimeout(function () {
      splash.remove();
      style.remove();
      document.documentElement.classList.remove("pwa-splash-active", "pwa-splash-boot");
    }, 320);
  }

  function tryHideSplash() {
    if (hidden || !loadDone || !appReady) return;
    var elapsed = Date.now() - shownAt;
    var wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.setTimeout(hideSplash, wait);
  }

  function markLoadDone() {
    loadDone = true;
    tryHideSplash();
  }

  function markAppReady() {
    appReady = true;
    tryHideSplash();
  }

  if (document.readyState === "complete") {
    markLoadDone();
  } else {
    window.addEventListener("load", markLoadDone);
  }

  window.addEventListener("outils-eps-home-ready", markAppReady);

  window.setTimeout(function () {
    markAppReady();
    markLoadDone();
  }, MAX_WAIT_MS);

  var versionScript = document.createElement("script");
  versionScript.src = base + "app-version.js";
  versionScript.async = true;
  versionScript.onload = function () {
    if (typeof APP_VERSION !== "undefined" && APP_VERSION) {
      var verEl = splash.querySelector(".pwa-splash__version");
      if (!verEl) {
        verEl = document.createElement("p");
        verEl.className = "pwa-splash__version";
        splash.appendChild(verEl);
      }
      verEl.textContent = "Version " + APP_VERSION;
    }
  };
  document.head.appendChild(versionScript);
})();
