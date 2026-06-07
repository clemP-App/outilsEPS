/**
 * Camera tools fallback for iPadOS standalone web apps.
 *
 * iPadOS can keep getUserMedia tracks live but muted inside standalone PWAs.
 * These tools must run in Safari when that container is detected.
 */
(function () {
  "use strict";

  function isAppleTouchDevice() {
    var ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalonePwa() {
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

  function installBanner() {
    if (!isAppleTouchDevice() || !isStandalonePwa()) return;
    if (document.getElementById("pwa-camera-browser")) return;

    var style = document.createElement("style");
    style.textContent =
      "#pwa-camera-browser{position:sticky;top:0;z-index:2147483000;margin:0;padding:.8rem 1rem;background:#fff7ed;color:#7c2d12;border-bottom:1px solid #fdba74;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 18px rgba(15,23,42,.12)}" +
      "#pwa-camera-browser strong{display:block;margin-bottom:.25rem;color:#9a3412}" +
      "#pwa-camera-browser p{margin:0 0 .55rem;line-height:1.35;font-size:.92rem}" +
      "#pwa-camera-browser a{display:inline-flex;align-items:center;justify-content:center;min-height:2.5rem;padding:.45rem .8rem;border-radius:.5rem;background:#0f766e;color:#fff;text-decoration:none;font-weight:800}";
    document.head.appendChild(style);

    var box = document.createElement("div");
    box.id = "pwa-camera-browser";

    var title = document.createElement("strong");
    title.textContent = "Camera iPad : ouvrir dans Safari";

    var text = document.createElement("p");
    text.textContent =
      "Le mode PWA de l'iPad bloque parfois les images camera. Cet outil doit etre ouvert dans Safari.";

    var link = document.createElement("a");
    link.href = window.location.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Ouvrir dans Safari";

    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(link);

    if (document.body) document.body.insertBefore(box, document.body.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installBanner);
  } else {
    installBanner();
  }
})();
