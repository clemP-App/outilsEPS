/**
 * Partage social — texte copié + visuel prêt à publier (Facebook, X, Instagram).
 */
(function () {
  "use strict";

  var INSTAGRAM_HANDLE = "@clemp_eps2.0";
  var SHARE_IMAGE_BASE = "assets/share/";

  function canonicalShareUrl() {
    if (window.OutilsEPS && window.OutilsEPS.site && window.OutilsEPS.site.canonicalUrl) {
      return window.OutilsEPS.site.canonicalUrl();
    }
    var url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.slice(0, -10) || "/";
    }
    return url.href;
  }

  /** Base des visuels, dérivée du lien favicon (même logique que le reste du site). */
  function shareAssetBase() {
    var icon = document.querySelector('link[rel="icon"][href*="assets/"]');
    if (icon && icon.getAttribute("href")) {
      return icon.getAttribute("href").replace(/[^/]+$/, "share/");
    }
    return SHARE_IMAGE_BASE;
  }

  function candidateImageUrls(filename) {
    var base = shareAssetBase();
    var href = window.location.href;
    var urls = [
      new URL("./" + base + filename, href).href,
      new URL(base + filename, href).href,
    ];

    if (window.OutilsEPS && window.OutilsEPS.site && window.OutilsEPS.site.isLegacyHost()) {
      urls.push(new URL("/outilsEPS/" + SHARE_IMAGE_BASE + filename, href).href);
    }

    var seen = {};
    return urls.filter(function (url) {
      if (seen[url]) return false;
      seen[url] = true;
      return true;
    });
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  function captionFacebook(url) {
    return (
      "Outils EPS — le couteau suisse des professeurs d'EPS\n\n" +
      "40+ outils gratuits pour préparer, enseigner et gagner du temps : classes, évaluation, QR élèves, hors ligne…\n\n" +
      url
    );
  }

  function captionX(url) {
    return (
      "Outils EPS : 40+ outils gratuits pour les profs d'EPS — classes, évaluation, QR élèves, hors ligne, sans pub.\n\n" +
      url
    );
  }

  function captionInstagramStory(url) {
    return (
      "Outils EPS — le couteau suisse des professeurs d'EPS\n\n" +
      "40+ outils gratuits · hors ligne · sans pub\n\n" +
      url + "\n\n" +
      "Merci " + INSTAGRAM_HANDLE + " pour ces outils !"
    );
  }

  function captionInstagramPost(url) {
    return (
      "Outils EPS — le couteau suisse des professeurs d'EPS\n\n" +
      "40+ outils gratuits pour préparer, enseigner et gagner du temps. Profs + élèves, QR codes, hors ligne.\n\n" +
      url + "\n\n" +
      INSTAGRAM_HANDLE + " #EPS #profEPS #education"
    );
  }

  var PLATFORMS = [
    {
      id: "facebook",
      label: "Facebook",
      icon: "📘",
      image: "facebook.png",
      downloadName: "outils-eps-facebook.png",
      caption: captionFacebook,
      feedbackDesktop:
        "Texte copié + image téléchargée. Sur Facebook : nouvelle publication, ajoutez l'image et collez le texte (Ctrl+V).",
      feedbackMobile:
        "Texte copié. Choisissez Facebook dans le menu de partage, ou ajoutez l'image depuis votre galerie.",
    },
    {
      id: "x",
      label: "X",
      icon: "𝕏",
      image: "x.png",
      downloadName: "outils-eps-x.png",
      caption: captionX,
      feedbackDesktop:
        "Texte copié + image téléchargée. Sur X : nouvelle publication, ajoutez l'image et collez le texte (Ctrl+V).",
      feedbackMobile:
        "Texte copié. Choisissez X dans le menu de partage, ou ajoutez l'image depuis votre galerie.",
    },
    {
      id: "instagram-story",
      label: "Story",
      icon: "📷",
      group: "instagram",
      image: "instagram-story.png",
      downloadName: "outils-eps-instagram-story.png",
      caption: captionInstagramStory,
      feedbackDesktop:
        "Légende copiée + image téléchargée. Sur ordinateur, Instagram est limité : ouvrez l'app sur téléphone, nouvelle story, choisissez l'image dans Téléchargements, collez la légende et mentionnez " +
        INSTAGRAM_HANDLE + ".",
      feedbackMobile:
        "Légende copiée. Choisissez Instagram dans le menu, puis Story. Sinon : Instagram → story → image depuis la galerie, collez la légende (" +
        INSTAGRAM_HANDLE + ").",
      feedbackNative:
        "Légende copiée. Choisissez Instagram dans le menu, puis Story ou Publication.",
    },
    {
      id: "instagram-post",
      label: "Publication",
      icon: "📷",
      group: "instagram",
      image: "instagram-post.png",
      downloadName: "outils-eps-instagram-post.png",
      caption: captionInstagramPost,
      feedbackDesktop:
        "Légende copiée + image téléchargée. Sur ordinateur, Instagram est limité : ouvrez l'app sur téléphone, nouvelle publication, choisissez l'image dans Téléchargements, collez la légende (" +
        INSTAGRAM_HANDLE + ").",
      feedbackMobile:
        "Légende copiée. Choisissez Instagram dans le menu, puis Publication. Sinon : Instagram → + → image depuis la galerie, collez la légende (" +
        INSTAGRAM_HANDLE + ").",
      feedbackNative:
        "Légende copiée. Choisissez Instagram dans le menu, puis Publication.",
    },
  ];

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  function isValidImageResponse(response) {
    if (!response || !response.ok) return false;
    var type = (response.headers.get("content-type") || "").toLowerCase();
    if (type.indexOf("image/") === 0) return true;
    if (type.indexOf("text/") !== -1 || type.indexOf("html") !== -1) return false;
    return true;
  }

  function fetchImageBlobFromUrl(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (response) {
      if (!isValidImageResponse(response)) {
        throw new Error("Réponse invalide pour " + url);
      }
      return response.blob();
    });
  }

  function loadImageBlobFromUrl(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          var ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas indisponible"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error("Conversion image impossible"));
          }, "image/png");
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = function () {
        reject(new Error("Chargement image impossible"));
      };
      img.src = url;
    });
  }

  function fetchImageBlob(filename) {
    var urls = candidateImageUrls(filename);
    var i = 0;

    function tryFetch() {
      if (i >= urls.length) return tryImage();
      var url = urls[i++];
      return fetchImageBlobFromUrl(url).catch(function () {
        return tryFetch();
      });
    }

    function tryImage() {
      var j = 0;
      function next() {
        if (j >= urls.length) return Promise.reject(new Error("Image introuvable"));
        return loadImageBlobFromUrl(urls[j++]).catch(next);
      }
      return next();
    }

    return tryFetch();
  }

  function blobToFile(blob, filename) {
    var type = blob.type || "image/png";
    return new File([blob], filename, { type: type });
  }

  function downloadBlob(blob, filename) {
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () {
      URL.revokeObjectURL(blobUrl);
    }, 1500);
  }

  function canNativeShareFile(file, text) {
    if (!navigator.share || !navigator.canShare) return false;
    try {
      return navigator.canShare({ files: [file], text: text });
    } catch (e) {
      return false;
    }
  }

  function nativeShareFile(file, text) {
    return navigator.share({ files: [file], text: text });
  }

  function feedbackFor(platform, usedNativeShare) {
    if (usedNativeShare && platform.feedbackNative) return platform.feedbackNative;
    return isMobileDevice() ? platform.feedbackMobile : platform.feedbackDesktop;
  }

  function sharePlatform(platform, options) {
    var url = canonicalShareUrl();
    var caption = platform.caption(url);
    var onFeedback = options && options.onFeedback;

    function notify(message) {
      if (onFeedback) onFeedback(message, platform);
    }

    return copyToClipboard(caption)
      .catch(function () {
        notify("Copie du texte impossible — copiez-le manuellement après le téléchargement.");
      })
      .then(function () {
        return fetchImageBlob(platform.image);
      })
      .then(function (blob) {
        var file = blobToFile(blob, platform.downloadName);
        if (canNativeShareFile(file, caption)) {
          return nativeShareFile(file, caption)
            .then(function () {
              notify(feedbackFor(platform, true));
            })
            .catch(function (err) {
              if (err && err.name === "AbortError") return;
              downloadBlob(blob, platform.downloadName);
              notify(feedbackFor(platform, false));
            });
        }
        downloadBlob(blob, platform.downloadName);
        notify(feedbackFor(platform, false));
      })
      .catch(function () {
        var fallbackUrl = candidateImageUrls(platform.image)[0];
        notify(
          "Légende copiée. Image non téléchargée automatiquement — ouvrez ce lien, enregistrez l'image (clic droit), puis publiez : " +
            fallbackUrl
        );
      });
  }

  function mount(container, options) {
    if (!container) return;
    options = options || {};
    container.classList.add("social-share");

    var grid = document.createElement("div");
    grid.className = "social-share__grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Partager sur les réseaux sociaux");

    var instagramGroup = document.createElement("div");
    instagramGroup.className = "social-share__instagram";
    var instagramLabel = document.createElement("p");
    instagramLabel.className = "social-share__group-label";
    instagramLabel.textContent = "Instagram";
    instagramGroup.appendChild(instagramLabel);

    var instagramBtns = document.createElement("div");
    instagramBtns.className = "social-share__instagram-btns";
    instagramGroup.appendChild(instagramBtns);

    PLATFORMS.forEach(function (platform) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "social-share__btn";
      btn.dataset.network = platform.id;
      btn.innerHTML =
        '<span class="social-share__icon" aria-hidden="true">' +
        platform.icon +
        "</span>" +
        '<span class="social-share__label">' +
        platform.label +
        "</span>";
      btn.setAttribute("aria-label", "Partager sur " + platform.label);

      btn.addEventListener("click", function () {
        sharePlatform(platform, options);
      });

      if (platform.group === "instagram") {
        instagramBtns.appendChild(btn);
      } else {
        grid.appendChild(btn);
      }
    });

    grid.appendChild(instagramGroup);
    container.appendChild(grid);

    if (options.showHint !== false) {
      var hint = document.createElement("p");
      hint.className = "social-share__hint";
      hint.textContent = isMobileDevice()
        ? "Un clic : la légende est copiée et le menu de partage s'ouvre (Instagram, etc.)."
        : "Un clic : la légende est copiée et l'image est téléchargée. Instagram se publie surtout depuis le téléphone.";
      container.appendChild(hint);
    }
  }

  window.OutilsEPSSocialShare = {
    canonicalShareUrl: canonicalShareUrl,
    candidateImageUrls: candidateImageUrls,
    instagramHandle: function () {
      return INSTAGRAM_HANDLE;
    },
    mount: mount,
    sharePlatform: sharePlatform,
    platforms: PLATFORMS,
  };
})();
