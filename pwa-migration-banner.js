/**
 * Bannière de migration (ancienne adresse GitHub Pages → outilseps.fr).
 * Affichée uniquement sur l’hébergement legacy ; pas de redirection automatique.
 */
(function () {
  "use strict";

  var DISMISS_KEY = "outils_eps_migration_banner_v1";
  var DISMISS_DAYS = 3;
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

  function assetUrl(path) {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../" + path;
    return path;
  }

  function getDismissState() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function isDismissed() {
    var s = getDismissState();
    if (!s) return false;
    if (s.permanent) return true;
    if (s.until && Date.now() < s.until) return true;
    return false;
  }

  function setDismissed(permanent) {
    try {
      var data = { permanent: !!permanent };
      if (!permanent) {
        data.until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      }
      localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
    } catch (e) {
      /* ignore */
    }
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove("migration-banner--visible");
    document.body.classList.remove("migration-banner-open");
    setTimeout(function () {
      if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
      bannerEl = null;
    }, 320);
  }

  function openGuide() {
    if (window.OutilsEPS && typeof window.OutilsEPS.openMigrationGuide === "function") {
      window.OutilsEPS.openMigrationGuide();
      return;
    }
    var evt = new CustomEvent("outils-eps-open-migration-guide");
    document.dispatchEvent(evt);
  }

  function showBanner() {
    if (!isLegacy() || isDismissed() || bannerEl || document.getElementById("migration-domain-banner")) return;

    bannerEl = document.createElement("div");
    bannerEl.id = "migration-domain-banner";
    bannerEl.className = "migration-banner";
    bannerEl.setAttribute("role", "region");
    bannerEl.setAttribute("aria-label", "Changement d’adresse Outils EPS");

    var inner = document.createElement("div");
    inner.className = "migration-banner__inner";

    var icon = document.createElement("img");
    icon.className = "migration-banner__icon";
    icon.src = assetUrl("assets/migration/logo-vert.png");
    icon.alt = "Nouveau logo vert Outils EPS";
    icon.width = 52;
    icon.height = 52;

    var body = document.createElement("div");
    body.className = "migration-banner__body";

    var title = document.createElement("p");
    title.className = "migration-banner__title";
    title.textContent = "Outils EPS change d’adresse";

    var line1 = document.createElement("p");
    line1.className = "migration-banner__text";
    line1.innerHTML =
      'La nouvelle adresse officielle est maintenant <strong><a href="' +
      newSiteUrl() +
      '" target="_blank" rel="noopener noreferrer" class="migration-banner__link">outilseps.fr</a></strong>.';

    var line2 = document.createElement("p");
    line2.className = "migration-banner__text";
    line2.textContent =
      "Pour continuer à recevoir les mises à jour, installez la nouvelle PWA depuis cette adresse.";

    var line3 = document.createElement("p");
    line3.className = "migration-banner__note";
    line3.textContent =
      "Sur outilseps.fr, l’icône de l’application est verte (ici elle reste bleue).";

    body.appendChild(title);
    body.appendChild(line1);
    body.appendChild(line2);
    body.appendChild(line3);

    var actions = document.createElement("div");
    actions.className = "migration-banner__actions";

    var btnOpen = document.createElement("a");
    btnOpen.className = "btn btn--primary btn--small";
    btnOpen.href = newSiteUrl();
    btnOpen.target = "_blank";
    btnOpen.rel = "noopener noreferrer";
    btnOpen.textContent = "Ouvrir la nouvelle version";

    var btnGuide = document.createElement("button");
    btnGuide.type = "button";
    btnGuide.className = "btn btn--ghost btn--small";
    btnGuide.textContent = "Guide pas à pas";
    btnGuide.addEventListener("click", openGuide);

    var btnLater = document.createElement("button");
    btnLater.type = "button";
    btnLater.className = "btn btn--ghost btn--small migration-banner__btn-later";
    btnLater.textContent = "Plus tard";
    btnLater.addEventListener("click", function () {
      setDismissed(false);
      hideBanner();
    });

    actions.appendChild(btnOpen);
    actions.appendChild(btnGuide);
    actions.appendChild(btnLater);

    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "migration-banner__close";
    btnClose.setAttribute("aria-label", "Fermer");
    btnClose.textContent = "×";
    btnClose.addEventListener("click", function () {
      setDismissed(false);
      hideBanner();
    });

    inner.appendChild(icon);
    inner.appendChild(body);
    inner.appendChild(actions);
    inner.appendChild(btnClose);
    bannerEl.appendChild(inner);
    document.body.appendChild(bannerEl);
    document.body.classList.add("migration-banner-open");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (bannerEl) bannerEl.classList.add("migration-banner--visible");
      });
    });
  }

  function init() {
    if (!isLegacy()) return;
    showBanner();
  }

  document.addEventListener("outils-eps-open-migration-guide", function () {
    if (window.OutilsEPS && typeof window.OutilsEPS.openMigrationGuide === "function") {
      window.OutilsEPS.openMigrationGuide();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
