/**
 * Bannière permanente sur GitHub Pages : cette adresse n’est plus mise à jour.
 */
(function () {
  "use strict";

  var bannerEl = null;

  function site() {
    return (window.OutilsEPS && window.OutilsEPS.site) || null;
  }

  function isLegacy() {
    var s = site();
    return s ? s.isLegacyHost() : false;
  }

  function newSiteUrl() {
    var s = site();
    return (s && s.NEW_SITE_URL) || "https://outilseps.fr/";
  }

  function landingPageHref() {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../passer-sur-outilseps.html";
    return "passer-sur-outilseps.html";
  }

  function showPermanentBanner() {
    if (!isLegacy() || bannerEl || document.getElementById("migration-domain-banner")) return;

    bannerEl = document.createElement("div");
    bannerEl.id = "migration-domain-banner";
    bannerEl.className = "migration-banner migration-banner--permanent";
    bannerEl.setAttribute("role", "region");
    bannerEl.setAttribute("aria-label", "Adresse obsolète — passer sur outilseps.fr");

    var inner = document.createElement("div");
    inner.className = "migration-banner__inner migration-banner__inner--permanent";

    var body = document.createElement("div");
    body.className = "migration-banner__body";

    var title = document.createElement("p");
    title.className = "migration-banner__title";
    title.textContent = "Cette adresse n’est plus mise à jour";

    var line1 = document.createElement("p");
    line1.className = "migration-banner__text";
    line1.innerHTML =
      'Passez sur la version officielle <strong><a href="' +
      newSiteUrl() +
      '" class="migration-banner__link">outilseps.fr</a></strong> pour continuer à recevoir les nouveautés.';

    body.appendChild(title);
    body.appendChild(line1);

    var actions = document.createElement("div");
    actions.className = "migration-banner__actions";

    var btnOpen = document.createElement("a");
    btnOpen.className = "btn btn--primary btn--small";
    btnOpen.href = newSiteUrl();
    btnOpen.target = "_blank";
    btnOpen.rel = "noopener noreferrer";
    btnOpen.textContent = "Aller sur outilseps.fr";

    var btnGuide = document.createElement("a");
    btnGuide.className = "btn btn--ghost btn--small";
    btnGuide.href = landingPageHref();
    btnGuide.textContent = "Guide pas à pas";

    actions.appendChild(btnOpen);
    actions.appendChild(btnGuide);

    inner.appendChild(body);
    inner.appendChild(actions);
    bannerEl.appendChild(inner);
    document.body.appendChild(bannerEl);
    document.body.classList.add("migration-banner-open", "migration-banner-open--permanent");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (bannerEl) bannerEl.classList.add("migration-banner--visible");
      });
    });
  }

  function init() {
    if (!isLegacy()) return;
    showPermanentBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
