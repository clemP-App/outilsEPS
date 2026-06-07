/**
 * Rappel du mode d’ouverture (navigateur vs app installée).
 * Safari et PWA iOS ont des stockages séparés — évite la confusion de données.
 */
(function () {
  "use strict";

  var DISMISS_KEY = "outils_eps_context_hint_browser_v1";
  var PWA_INSTALLED_MARK_KEY = "outils_eps_pwa_marked_installed_v1";
  var PWA_NO_INSTALL_KEY = "outils_eps_pwa_no_install_v1";
  var DISMISS_DAYS = 7;
  var DATA_PATH_RE = /donnees-eleves|sauvegarde|classes|synthese-eps/i;

  function isInstalledPwa() {
    if (window.navigator.standalone === true) return true;
    try {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function isMobile() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return true;
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function faqHref() {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    return sw && sw.indexOf("../") === 0 ? "../faq.html#pwa-safari-donnees" : "faq.html#pwa-safari-donnees";
  }

  function readInstalledMark() {
    try {
      return localStorage.getItem(PWA_INSTALLED_MARK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function userDeclinedHavingApp() {
    try {
      return localStorage.getItem(PWA_NO_INSTALL_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markNoInstalledApp() {
    try {
      localStorage.setItem(PWA_NO_INSTALL_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function probeInstalledRelatedApps() {
    if (!navigator.getInstalledRelatedApps) return Promise.resolve(false);
    return navigator
      .getInstalledRelatedApps()
      .then(function (apps) {
        return !!(apps && apps.length);
      })
      .catch(function () {
        return false;
      });
  }

  /** Détection heuristique : pas fiable à 100 % sur iOS Safari. */
  function likelyHasInstalledApp() {
    if (userDeclinedHavingApp()) return Promise.resolve(false);
    if (readInstalledMark()) return Promise.resolve(true);
    return probeInstalledRelatedApps().then(function (found) {
      if (found) {
        try {
          localStorage.setItem(PWA_INSTALLED_MARK_KEY, "1");
        } catch (e) {
          /* ignore */
        }
      }
      return found;
    });
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

  function dismissInstallBanner() {
    document.body.classList.remove("install-banner-open");
    var installBanner = document.querySelector(".install-banner");
    if (installBanner && installBanner.parentNode) {
      installBanner.parentNode.removeChild(installBanner);
    }
  }

  function hideBanner() {
    var banner = document.getElementById("pwa-context-banner");
    if (!banner) return;
    banner.classList.remove("pwa-context-banner--visible");
    document.body.classList.remove("pwa-context-hint-open");
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 280);
  }

  function showBrowserBanner(dataPrefix) {
    if (isDismissed() || document.getElementById("pwa-context-banner")) return;
    dismissInstallBanner();

    var banner = document.createElement("div");
    banner.id = "pwa-context-banner";
    banner.className = "pwa-context-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Rappel mode navigateur");

    var inner = document.createElement("div");
    inner.className = "pwa-context-banner__inner";

    var body = document.createElement("div");
    body.className = "pwa-context-banner__body";

    var title = document.createElement("p");
    title.className = "pwa-context-banner__title";
    title.textContent = isMobile() ? "Ouvrez l’app installée" : "L’application est installée";

    var text = document.createElement("p");
    text.className = "pwa-context-banner__text";
    var msg = isMobile()
      ? "Vous êtes dans le navigateur. Ouvrez l’icône Outils EPS sur l’écran d’accueil : vos classes, imports QR et sauvegardes y sont, pas ici."
      : "Vous êtes dans le navigateur. Ouvrez Outils EPS depuis son icône installée pour retrouver vos données.";
    if (dataPrefix) {
      msg = dataPrefix + " " + msg;
    }
    text.textContent = msg;

    body.appendChild(title);
    body.appendChild(text);

    var actions = document.createElement("div");
    actions.className = "pwa-context-banner__actions";

    var linkFaq = document.createElement("a");
    linkFaq.className = "btn btn--ghost btn--small";
    linkFaq.href = faqHref();
    linkFaq.textContent = "En savoir plus";

    var btnNoApp = document.createElement("button");
    btnNoApp.type = "button";
    btnNoApp.className = "btn btn--ghost btn--small";
    btnNoApp.textContent = "Pas d’app installée";
    btnNoApp.addEventListener("click", function () {
      markNoInstalledApp();
      hideBanner();
    });

    var btnLater = document.createElement("button");
    btnLater.type = "button";
    btnLater.className = "btn btn--ghost btn--small";
    btnLater.textContent = "Plus tard";
    btnLater.addEventListener("click", function () {
      setDismissed(false);
      hideBanner();
    });

    var btnOk = document.createElement("button");
    btnOk.type = "button";
    btnOk.className = "btn btn--primary btn--small";
    btnOk.textContent = "J’ai compris";
    btnOk.addEventListener("click", function () {
      setDismissed(true);
      hideBanner();
    });

    actions.appendChild(linkFaq);
    actions.appendChild(btnNoApp);
    actions.appendChild(btnLater);
    actions.appendChild(btnOk);

    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "pwa-context-banner__close";
    btnClose.setAttribute("aria-label", "Fermer");
    btnClose.textContent = "×";
    btnClose.addEventListener("click", function () {
      setDismissed(false);
      hideBanner();
    });

    inner.appendChild(body);
    inner.appendChild(actions);
    inner.appendChild(btnClose);
    banner.appendChild(inner);
    document.body.appendChild(banner);
    document.body.classList.add("pwa-context-hint-open");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add("pwa-context-banner--visible");
      });
    });
  }

  function dataPrefixLine() {
    if (!DATA_PATH_RE.test(location.pathname || "")) return Promise.resolve(null);
    if (typeof DataManager === "undefined" || !DataManager.ready) return Promise.resolve(null);
    return DataManager.ready
      .then(function () {
        return Promise.all([
          typeof DataManager.getImportedRecords === "function"
            ? DataManager.getImportedRecords({})
            : Promise.resolve([]),
          typeof DataManager.getClasses === "function" ? DataManager.getClasses() : Promise.resolve([]),
        ]);
      })
      .then(function (res) {
        var imports = res[0] || [];
        var classes = res[1] || [];
        if (!imports.length && !classes.length) return null;
        return "Des données sont enregistrées dans ce navigateur.";
      })
      .catch(function () {
        return null;
      });
  }

  function init() {
    if (isInstalledPwa()) return;
    Promise.all([likelyHasInstalledApp(), dataPrefixLine()]).then(function (res) {
      if (!res[0]) return;
      var prefix = res[1];
      setTimeout(
        function () {
          showBrowserBanner(prefix);
        },
        isMobile() ? 500 : 900
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
