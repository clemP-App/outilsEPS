/**
 * Invitation à utiliser l’application web installée (modal sur l’accueil outilseps.fr).
 */
(function () {
  "use strict";

  var DISMISS_KEY = "outils_eps_install_banner_v1";
  var PWA_INSTALLED_MARK_KEY = "outils_eps_pwa_marked_installed_v1";
  var DISMISS_DAYS = 14;

  var deferredPrompt = null;
  var promptEl = null;
  var shown = false;

  function markPwaInstalled() {
    try {
      localStorage.setItem(PWA_INSTALLED_MARK_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function readInstalledMark() {
    try {
      return localStorage.getItem(PWA_INSTALLED_MARK_KEY) === "1";
    } catch (e) {
      return false;
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
    if (readInstalledMark()) return Promise.resolve(true);
    return probeInstalledRelatedApps().then(function (found) {
      if (found) markPwaInstalled();
      return found;
    });
  }

  function assetUrl(path) {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../" + path;
    return path;
  }

  function isInstalled() {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.navigator.standalone === true) return true;
    if (document.referrer && document.referrer.indexOf("android-app://") === 0) return true;
    return false;
  }

  function isOfficialHost() {
    return (
      window.OutilsEPS &&
      window.OutilsEPS.site &&
      typeof window.OutilsEPS.site.isOfficialHost === "function" &&
      window.OutilsEPS.site.isOfficialHost()
    );
  }

  function isLegacyMigrationHost() {
    return (
      window.OutilsEPS &&
      window.OutilsEPS.site &&
      typeof window.OutilsEPS.site.isLegacyHost === "function" &&
      window.OutilsEPS.site.isLegacyHost()
    );
  }

  function isIndexPage() {
    var path = location.pathname || "";
    if (/(^|\/)index\.html$/i.test(path)) return true;
    if (/\/$/.test(path) && path.indexOf("/outils/") < 0) return true;
    return false;
  }

  function useInstallModal() {
    return isOfficialHost() && isIndexPage();
  }

  function getPlatform() {
    var ua = navigator.userAgent || "";
    var isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
  }

  function isIOSSafari() {
    var ua = navigator.userAgent || "";
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!ios) return false;
    return /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/i.test(ua);
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

  function hidePrompt() {
    if (!promptEl) return;
    if (promptEl.tagName === "DIALOG" && promptEl.close) {
      promptEl.close();
    } else {
      promptEl.classList.remove("install-banner--visible");
      document.body.classList.remove("install-banner-open");
      setTimeout(function () {
        if (promptEl && promptEl.parentNode) promptEl.parentNode.removeChild(promptEl);
      }, 320);
    }
    promptEl = null;
  }

  function panelForMode(mode) {
    var platform = getPlatform();
    if (mode === "ios-other") {
      return {
        title: "Installer sur iPhone",
        lead: "Ouvrez cette page dans Safari pour ajouter Outils EPS à votre écran d’accueil.",
        image: "assets/migration/install-iphone.png",
        imageAlt: "Installer l’application sur iPhone",
        steps: ["Copier l’adresse outilseps.fr", "Coller dans Safari", "Partager → Sur l’écran d’accueil"],
        primary: "J’ai compris",
        showInstall: false,
        markInstalledOnClose: false,
      };
    }
    if (mode === "ios-safari" || platform === "ios") {
      return {
        title: "Ajoutez Outils EPS à votre écran d’accueil",
        lead: "Vos données sont enregistrées dans l’application installée, pas dans Safari.",
        image: "assets/migration/install-iphone.png",
        imageAlt: "Étapes sur iPhone : Partager, Sur l’écran d’accueil",
        steps: ["Partager", "Sur l’écran d’accueil", "Ouvrir l’icône verte"],
        primary: "J’ai compris",
        showInstall: false,
        markInstalledOnClose: true,
      };
    }
    if (mode === "android-manual" || platform === "android") {
      return {
        title: "Installez l’application Outils EPS",
        lead: "Utilisez ensuite toujours l’icône installée : le navigateur et l’application ne partagent pas les mêmes données.",
        image: "assets/migration/install-android.png",
        imageAlt: "Étapes sur Android : Menu, Installer l’application",
        steps: ["Menu Chrome (⋮)", "Installer l’application", "Ouvrir l’icône verte"],
        primary: mode === "chromium" && deferredPrompt ? "Installer" : "J’ai compris",
        showInstall: mode === "chromium" && !!deferredPrompt,
        markInstalledOnClose: mode !== "chromium",
      };
    }
    return {
      title: "Installez l’application sur votre ordinateur",
      lead: "Ouvrez ensuite Outils EPS depuis son icône : navigateur et application stockent des données séparées.",
      image: "assets/migration/logo-vert.png",
      imageAlt: "Icône verte Outils EPS",
      imageCompact: true,
      steps: ["Dans Chrome ou Edge : icône Installer", "Lancer Outils EPS depuis le menu ou le bureau"],
      primary: mode === "chromium" && deferredPrompt ? "Installer" : "J’ai compris",
      showInstall: mode === "chromium" && !!deferredPrompt,
      markInstalledOnClose: mode !== "chromium",
    };
  }

  function showInstallModal(mode) {
    if (shown || isInstalled() || isDismissed() || readInstalledMark()) return;
    var panel = panelForMode(mode);
    if (!panel) return;

    shown = true;
    var dlg = document.createElement("dialog");
    dlg.className = "info-dialog card install-app-dialog";
    dlg.id = "dialog-install-app";
    dlg.setAttribute("aria-labelledby", "install-app-dialog-title");

    var form = document.createElement("form");
    form.method = "dialog";
    form.className = "info-dialog__form install-app-dialog__form";

    var title = document.createElement("h2");
    title.id = "install-app-dialog-title";
    title.className = "info-dialog__title";
    title.textContent = panel.title;

    var lead = document.createElement("p");
    lead.className = "install-app-dialog__lead";
    lead.textContent = panel.lead;

    var visual = document.createElement("div");
    visual.className = "install-app-dialog__visual";
    if (panel.image) {
      var img = document.createElement("img");
      img.src = assetUrl(panel.image);
      img.alt = panel.imageAlt || "";
      img.loading = "lazy";
      img.decoding = "async";
      if (panel.imageCompact) img.className = "install-app-dialog__logo";
      visual.appendChild(img);
    }

    var steps = document.createElement("ol");
    steps.className = "info-dialog__list install-app-dialog__steps";
    panel.steps.forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      steps.appendChild(li);
    });

    var actions = document.createElement("div");
    actions.className = "field-row install-app-dialog__actions";

    var btnPrimary = document.createElement("button");
    btnPrimary.type = "button";
    btnPrimary.className = "btn btn--primary";
    btnPrimary.textContent = panel.primary;

    var btnLater = document.createElement("button");
    btnLater.type = "submit";
    btnLater.className = "btn btn--ghost";
    btnLater.textContent = "Plus tard";
    btnLater.value = "later";

    btnPrimary.addEventListener("click", function () {
      if (panel.showInstall && deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice && choice.outcome === "accepted") markPwaInstalled();
          deferredPrompt = null;
          setDismissed(true);
          dlg.close();
        });
        return;
      }
      if (panel.markInstalledOnClose) markPwaInstalled();
      setDismissed(true);
      dlg.close();
    });

    btnLater.addEventListener("click", function () {
      setDismissed(false);
    });

    actions.appendChild(btnPrimary);
    actions.appendChild(btnLater);

    form.appendChild(title);
    form.appendChild(lead);
    form.appendChild(visual);
    form.appendChild(steps);
    form.appendChild(actions);
    dlg.appendChild(form);
    dlg.addEventListener("close", function () {
      promptEl = null;
      shown = false;
    });

    document.body.appendChild(dlg);
    promptEl = dlg;
    if (dlg.showModal) dlg.showModal();
  }

  function showInstallBanner(mode) {
    if (shown || isInstalled() || isDismissed() || readInstalledMark()) return;
    var panel = panelForMode(mode);
    if (!panel) return;

    shown = true;
    var banner = document.createElement("div");
    banner.className = "install-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Installer l’application");

    var inner = document.createElement("div");
    inner.className = "install-banner__inner";

    var body = document.createElement("div");
    body.className = "install-banner__body";

    var title = document.createElement("p");
    title.className = "install-banner__title";
    title.textContent = panel.title;

    var text = document.createElement("p");
    text.className = "install-banner__text";
    text.textContent = panel.lead;

    body.appendChild(title);
    body.appendChild(text);

    var actions = document.createElement("div");
    actions.className = "install-banner__actions";

    var btnPrimary = document.createElement("button");
    btnPrimary.type = "button";
    btnPrimary.className = "btn btn--primary btn--small";
    btnPrimary.textContent = panel.primary;

    btnPrimary.addEventListener("click", function () {
      if (panel.showInstall && deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice && choice.outcome === "accepted") markPwaInstalled();
          deferredPrompt = null;
          hidePrompt();
        });
      } else {
        hidePrompt();
        setDismissed(true);
        if (panel.markInstalledOnClose) markPwaInstalled();
      }
    });

    var btnLater = document.createElement("button");
    btnLater.type = "button";
    btnLater.className = "btn btn--ghost btn--small";
    btnLater.textContent = "Plus tard";
    btnLater.addEventListener("click", function () {
      setDismissed(false);
      hidePrompt();
    });

    actions.appendChild(btnPrimary);
    actions.appendChild(btnLater);

    inner.appendChild(body);
    inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);
    promptEl = banner;
    document.body.classList.add("install-banner-open");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (banner) banner.classList.add("install-banner--visible");
      });
    });
  }

  function showPrompt(mode) {
    if (useInstallModal()) showInstallModal(mode);
    else showInstallBanner(mode);
  }

  function tryShowForPlatform() {
    if (isLegacyMigrationHost() || isInstalled() || isDismissed()) return;

    likelyHasInstalledApp().then(function (hasInstalled) {
      if (hasInstalled) return;

      var platform = getPlatform();

      if (platform === "ios") {
        setTimeout(function () {
          if (!deferredPrompt) showPrompt(isIOSSafari() ? "ios-safari" : "ios-other");
        }, useInstallModal() ? 600 : 1200);
        return;
      }

      if (platform === "android") {
        setTimeout(function () {
          if (!deferredPrompt && !isInstalled() && !isDismissed() && !readInstalledMark()) {
            showPrompt("android-manual");
          }
        }, useInstallModal() ? 800 : 3500);
        return;
      }

      setTimeout(function () {
        if (!deferredPrompt && !isInstalled() && !isDismissed() && !readInstalledMark()) {
          showPrompt("desktop");
        }
      }, useInstallModal() ? 800 : 2500);
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    if (isLegacyMigrationHost() || readInstalledMark()) return;
    e.preventDefault();
    likelyHasInstalledApp().then(function (hasInstalled) {
      if (hasInstalled) return;
      deferredPrompt = e;
      showPrompt("chromium");
    });
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hidePrompt();
    markPwaInstalled();
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ permanent: true }));
    } catch (err) {
      /* ignore */
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryShowForPlatform);
  } else {
    tryShowForPlatform();
  }
})();
