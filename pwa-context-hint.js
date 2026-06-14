/**
 * Rappel du mode d’ouverture (navigateur vs application installée).
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

  function isOfficialHost() {
    return (
      window.OutilsEPS &&
      window.OutilsEPS.site &&
      typeof window.OutilsEPS.site.isOfficialHost === "function" &&
      window.OutilsEPS.site.isOfficialHost()
    );
  }

  function isIndexPage() {
    var path = location.pathname || "";
    if (/(^|\/)index\.html$/i.test(path)) return true;
    if (/\/$/.test(path) && path.indexOf("/outils/") < 0) return true;
    return false;
  }

  function useContextModal() {
    return isOfficialHost() && isIndexPage();
  }

  function assetUrl(path) {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../" + path;
    return path;
  }

  function getPlatform() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      return "ios";
    }
    return "desktop";
  }

  function contextVisual() {
    var platform = getPlatform();
    if (platform === "ios") {
      return { src: "assets/migration/install-iphone.png", alt: "Ouvrir l’application sur iPhone" };
    }
    if (platform === "android") {
      return { src: "assets/migration/install-android.png", alt: "Ouvrir l’application sur Android" };
    }
    return { src: "assets/migration/logo-vert.png", alt: "Icône verte Outils EPS", compact: true };
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

  function dismissInstallPrompt() {
    document.body.classList.remove("install-banner-open");
    var installBanner = document.querySelector(".install-banner");
    if (installBanner && installBanner.parentNode) {
      installBanner.parentNode.removeChild(installBanner);
    }
    var installDialog = document.getElementById("dialog-install-app");
    if (installDialog && installDialog.close) installDialog.close();
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

  function showBrowserModal(dataPrefix) {
    if (isDismissed() || document.getElementById("dialog-context-app")) return;
    dismissInstallPrompt();

    var visual = contextVisual();
    var dlg = document.createElement("dialog");
    dlg.className = "info-dialog card install-app-dialog";
    dlg.id = "dialog-context-app";
    dlg.setAttribute("aria-labelledby", "context-app-dialog-title");

    var form = document.createElement("form");
    form.method = "dialog";
    form.className = "info-dialog__form install-app-dialog__form";

    var title = document.createElement("h2");
    title.id = "context-app-dialog-title";
    title.className = "info-dialog__title";
    title.textContent = "Passez par l’application";

    var lead = document.createElement("p");
    lead.className = "install-app-dialog__lead";
    var msg = isMobile()
      ? "Vous êtes dans le navigateur. Ouvrez l’icône verte Outils EPS : vos données y sont, pas ici."
      : "Vous êtes dans le navigateur. Lancez Outils EPS depuis son icône installée pour retrouver vos données.";
    if (dataPrefix) msg = dataPrefix + " " + msg;
    lead.textContent = msg;

    var visualWrap = document.createElement("div");
    visualWrap.className = "install-app-dialog__visual";
    var img = document.createElement("img");
    img.src = assetUrl(visual.src);
    img.alt = visual.alt;
    img.loading = "lazy";
    if (visual.compact) img.className = "install-app-dialog__logo";
    visualWrap.appendChild(img);

    var steps = document.createElement("ol");
    steps.className = "info-dialog__list install-app-dialog__steps";
    var li = document.createElement("li");
    li.textContent = isMobile()
      ? "Sur l’écran d’accueil, touchez l’icône verte Outils EPS"
      : "Ouvrez Outils EPS depuis le menu Démarrer ou le bureau";
    steps.appendChild(li);

    var actions = document.createElement("div");
    actions.className = "field-row install-app-dialog__actions";

    var btnOk = document.createElement("button");
    btnOk.type = "submit";
    btnOk.className = "btn btn--primary";
    btnOk.textContent = "J’ai compris";
    btnOk.addEventListener("click", function () {
      setDismissed(true);
    });

    var btnLater = document.createElement("button");
    btnLater.type = "submit";
    btnLater.className = "btn btn--ghost";
    btnLater.textContent = "Plus tard";
    btnLater.addEventListener("click", function () {
      setDismissed(false);
    });

    var btnNoApp = document.createElement("button");
    btnNoApp.type = "button";
    btnNoApp.className = "btn btn--ghost";
    btnNoApp.textContent = "Pas d’application installée";
    btnNoApp.addEventListener("click", function () {
      markNoInstalledApp();
      dlg.close();
    });

    actions.appendChild(btnOk);
    actions.appendChild(btnLater);
    actions.appendChild(btnNoApp);

    form.appendChild(title);
    form.appendChild(lead);
    form.appendChild(visualWrap);
    form.appendChild(steps);
    form.appendChild(actions);
    dlg.appendChild(form);
    document.body.appendChild(dlg);
    if (dlg.showModal) dlg.showModal();
  }

  function showBrowserBanner(dataPrefix) {
    if (isDismissed() || document.getElementById("pwa-context-banner")) return;
    dismissInstallPrompt();

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
    title.textContent = isMobile() ? "Ouvrez l’application installée" : "L’application est installée";

    var text = document.createElement("p");
    text.className = "pwa-context-banner__text";
    var msg = isMobile()
      ? "Vous êtes dans le navigateur. Ouvrez l’icône Outils EPS sur l’écran d’accueil : vos classes, imports QR et sauvegardes y sont, pas ici."
      : "Vous êtes dans le navigateur. Ouvrez Outils EPS depuis son icône installée pour retrouver vos données.";
    if (dataPrefix) msg = dataPrefix + " " + msg;
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
    btnNoApp.textContent = "Pas d’application installée";
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

  function showContextHint(dataPrefix) {
    if (useContextModal()) showBrowserModal(dataPrefix);
    else showBrowserBanner(dataPrefix);
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
          showContextHint(prefix);
        },
        useContextModal() ? 400 : isMobile() ? 500 : 900
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
