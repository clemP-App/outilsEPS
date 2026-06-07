/**
 * Bannière d’installation PWA en bas de page (Android, iPhone, ordinateur).
 */
(function () {
  "use strict";

  var DISMISS_KEY = "outils_eps_install_banner_v1";
  var DISMISS_DAYS = 14;

  var deferredPrompt = null;
  var bannerEl = null;
  var shown = false;

  function assetUrl(path) {
    var script = document.querySelector('script[data-sw]');
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

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove("install-banner--visible");
    document.body.classList.remove("install-banner-open");
    setTimeout(function () {
      if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
      bannerEl = null;
    }, 320);
  }

  var CONTENT = {
    chromium: {
      title: "Installer Outils EPS",
      text: "Ajoutez l’application sur votre appareil pour y accéder en un clic. Utilisez ensuite toujours l’icône installée : les données du navigateur et de l’app sont séparées.",
      primary: "Installer",
      showInstall: true,
    },
    "ios-safari": {
      title: "Ajouter à l’écran d’accueil",
      text: "Sur iPhone : Partager → « Sur l’écran d’accueil ». Ensuite ouvrez toujours l’icône Outils EPS (pas Safari) : classes et imports QR ne sont pas partagés entre les deux.",
      primary: "J’ai compris",
      showInstall: false,
    },
    "ios-other": {
      title: "Installer sur iPhone",
      text: "Pour installer l’application, ouvrez cette page dans Safari (copiez le lien dans Safari).",
      primary: "J’ai compris",
      showInstall: false,
    },
    "android-manual": {
      title: "Installer Outils EPS",
      text: "Menu (⋮) → « Installer l’application ». Puis utilisez toujours l’icône installée : les données ne sont pas les mêmes que dans Chrome.",
      primary: "J’ai compris",
      showInstall: false,
    },
    desktop: {
      title: "Installer Outils EPS",
      text: "Installez l’app puis ouvrez-la depuis son icône. Navigateur et app installée stockent des données séparées.",
      primary: "Installer",
      showInstall: true,
    },
  };

  function showBanner(mode) {
    if (shown || isInstalled() || isDismissed()) return;
    var cfg = CONTENT[mode];
    if (!cfg) return;

    shown = true;
    bannerEl = document.createElement("div");
    bannerEl.className = "install-banner";
    bannerEl.setAttribute("role", "region");
    bannerEl.setAttribute("aria-label", "Proposer l’installation de l’application");

    var inner = document.createElement("div");
    inner.className = "install-banner__inner";

    var icon = document.createElement("img");
    icon.className = "install-banner__icon";
    icon.src = assetUrl("assets/icon-192.png");
    icon.alt = "";
    icon.width = 48;
    icon.height = 48;

    var body = document.createElement("div");
    body.className = "install-banner__body";

    var title = document.createElement("p");
    title.className = "install-banner__title";
    title.textContent = cfg.title;

    var text = document.createElement("p");
    text.className = "install-banner__text";
    text.textContent = cfg.text;

    body.appendChild(title);
    body.appendChild(text);

    var actions = document.createElement("div");
    actions.className = "install-banner__actions";

    var btnPrimary = document.createElement("button");
    btnPrimary.type = "button";
    btnPrimary.className = "btn btn--primary btn--small install-banner__btn-install";
    btnPrimary.textContent = cfg.primary;

    btnPrimary.addEventListener("click", function () {
      if (cfg.showInstall && deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
          hideBanner();
        });
      } else {
        hideBanner();
        setDismissed(true);
      }
    });

    var btnLater = document.createElement("button");
    btnLater.type = "button";
    btnLater.className = "btn btn--ghost btn--small install-banner__btn-later";
    btnLater.textContent = "Plus tard";

    btnLater.addEventListener("click", function () {
      setDismissed(false);
      hideBanner();
    });

    actions.appendChild(btnPrimary);
    actions.appendChild(btnLater);

    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "install-banner__close";
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
    document.body.classList.add("install-banner-open");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (bannerEl) bannerEl.classList.add("install-banner--visible");
      });
    });
  }

  function tryShowForPlatform() {
    if (isInstalled() || isDismissed()) return;

    var platform = getPlatform();

    if (platform === "ios") {
      if (isIOSSafari()) {
        setTimeout(function () {
          if (!deferredPrompt) showBanner("ios-safari");
        }, 1200);
      } else {
        setTimeout(function () {
          showBanner("ios-other");
        }, 1200);
      }
      return;
    }

    if (platform === "android") {
      setTimeout(function () {
        if (!deferredPrompt && !isInstalled() && !isDismissed()) {
          showBanner("android-manual");
        }
      }, 3500);
      return;
    }

    setTimeout(function () {
      if (!deferredPrompt && !isInstalled() && !isDismissed()) {
        showBanner("desktop");
      }
    }, 2500);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showBanner("chromium");
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideBanner();
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
