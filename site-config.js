/**
 * Configuration du site selon l’hébergement (GitHub Pages legacy vs outilseps.fr).
 * Une seule base de code : le comportement s’adapte au domaine.
 */
(function () {
  "use strict";

  var NEW_SITE_URL = "https://outilseps.fr/";
  var LEGACY_SITE_URL = "https://clemp-app.github.io/outilsEPS/";
  var NEW_THEME_COLOR = "#16a34a";
  var LEGACY_THEME_COLOR = "#1a2744";

  function hostname() {
    return (location.hostname || "").toLowerCase();
  }

  function isLegacyHost() {
    var host = hostname();
    if (host === "clemp-app.github.io") return true;
    return host.endsWith(".github.io") && (location.pathname || "").indexOf("/outilsEPS") >= 0;
  }

  function isOfficialHost() {
    var host = hostname();
    return host === "outilseps.fr" || host === "www.outilseps.fr";
  }

  function canonicalUrl() {
    if (isOfficialHost()) return NEW_SITE_URL;
    if (isLegacyHost()) return LEGACY_SITE_URL;
    return location.origin + "/";
  }

  function themeColor() {
    return isOfficialHost() ? NEW_THEME_COLOR : LEGACY_THEME_COLOR;
  }

  function applyDocumentMeta() {
    var url = canonicalUrl();
    var selectors = [
      { sel: 'link[rel="canonical"]', attr: "href", val: url },
      { sel: 'meta[property="og:url"]', attr: "content", val: url },
    ];
    selectors.forEach(function (item) {
      var el = document.querySelector(item.sel);
      if (el) el.setAttribute(item.attr, item.val);
    });
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", themeColor());
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (node) {
      try {
        var data = JSON.parse(node.textContent || "");
        if (data && (data["@type"] === "WebSite" || data["@type"] === "SoftwareApplication") && data.url) {
          data.url = url;
          node.textContent = JSON.stringify(data);
        }
      } catch (e) {
        /* ignore */
      }
    });
  }

  window.OutilsEPS = window.OutilsEPS || {};
  window.OutilsEPS.site = {
    NEW_SITE_URL: NEW_SITE_URL,
    LEGACY_SITE_URL: LEGACY_SITE_URL,
    isLegacyHost: isLegacyHost,
    isOfficialHost: isOfficialHost,
    canonicalUrl: canonicalUrl,
    themeColor: themeColor,
    applyDocumentMeta: applyDocumentMeta,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDocumentMeta);
  } else {
    applyDocumentMeta();
  }
})();
