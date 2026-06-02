/**
 * Page d’accueil — liste des outils EPS, recherche et favoris (localStorage).
 *
 * POUR AJOUTER UN OUTIL : voir shared/outils-catalog.js
 * Pages d’accueil : index.html (prof) · eleves.html (élèves uniquement, data-audience="eleve")
 */

(function () {
  "use strict";

  if (typeof OutilsDom === "undefined") {
    window.OutilsDom = {
      clear: function (node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
      },
    };
  }

  var FAVORIS_KEY = "outils_eps_favoris_v1";
  var VIEW_KEY = "outils_eps_view_v1";
  var PROF_VIEW_KEY = "outils_eps_prof_view_v1";
  var MAX_OUTILS_PAR_SECTION = 5;
  var MAX_ICONES_AUTRE_ECRAN = 6;
  var AUDIENCE = (document.body && document.body.dataset.audience) || "all";
  var OUTILS_ALL =
    window.OutilsEPS && window.OutilsEPS.OUTILS ? window.OutilsEPS.OUTILS : [];
  if (!OUTILS_ALL.length) {
    console.error("Outils EPS : chargez shared/outils-catalog.js avant script.js.");
  }
  var OUTILS =
    AUDIENCE === "eleve"
      ? OUTILS_ALL.filter(function (o) {
          return o.publicCible === "eleve";
        })
      : AUDIENCE === "prof"
        ? OUTILS_ALL.filter(function (o) {
            return o.publicCible === "prof";
          })
        : OUTILS_ALL.slice();

  var sectionsOuvertes = { prof: false, eleve: AUDIENCE === "eleve" };
  var viewMode = chargerModeOutils();


  var listEl = document.getElementById("tools-list");
  var emptyEl = document.getElementById("tools-empty");
  var searchInput = document.getElementById("search-outils");
  var countEl = document.getElementById("outils-count");

  function normalise(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function filtreOutils(query) {
    var q = normalise(query).trim();
    if (!q) return OUTILS.slice();
    return OUTILS.filter(function (o) {
      var publicLabel = o.publicCible === "eleve" ? "élève eleve" : "prof professeur enseignant";
      var hay = normalise([o.titre, o.description, o.categorie, o.id, publicLabel].join(" "));
      return hay.indexOf(q) !== -1;
    });
  }

  function categoriesProf() {
    return window.OutilsEPS && window.OutilsEPS.ACCUEIL_CATEGORIES_PROF
      ? window.OutilsEPS.ACCUEIL_CATEGORIES_PROF
      : [];
  }

  function grouperOutilsProf(outils, favoris) {
    var schema = categoriesProf();
    if (!schema.length) return null;

    var groupes = [];
    var deja = new Set();

    schema.forEach(function (cat) {
      var bloc = outils.filter(function (o) {
        return o.categorie === cat.label;
      });
      bloc = trierAvecFavoris(bloc, favoris);
      bloc.forEach(function (o) {
        deja.add(o.id);
      });
      if (bloc.length) {
        groupes.push({ label: cat.label, outils: bloc });
      }
    });

    var reste = outils.filter(function (o) {
      return !deja.has(o.id);
    });
    if (reste.length) {
      groupes.push({ label: "Autres", outils: trierAvecFavoris(reste, favoris) });
    }

    return groupes.length ? groupes : null;
  }

  function chargerFavoris() {
    try {
      var raw = localStorage.getItem(FAVORIS_KEY);
      if (!raw) return new Set();
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set();
      return new Set(
        arr.filter(function (x) {
          return typeof x === "string";
        })
      );
    } catch (e) {
      return new Set();
    }
  }

  function sauverFavoris(set) {
    try {
      localStorage.setItem(FAVORIS_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      /* quota ou mode privé strict */
    }
  }

  function chargerModeOutils() {
    try {
      var saved = localStorage.getItem(VIEW_KEY) || localStorage.getItem(PROF_VIEW_KEY);
      return saved === "icons" ? "icons" : "cards";
    } catch (e) {
      return "cards";
    }
  }

  function sauverModeOutils(mode) {
    viewMode = mode === "icons" ? "icons" : "cards";
    try {
      localStorage.setItem(VIEW_KEY, viewMode);
    } catch (e) {
      /* quota ou mode privé strict */
    }
  }

  function affichageQuatreColonnesOuPlus() {
    return (
      viewMode === "icons" &&
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 900px)").matches
    );
  }

  function limiteVisibleParSection() {
    if (affichageQuatreColonnesOuPlus()) {
      return Number.MAX_SAFE_INTEGER;
    }
    if (viewMode !== "icons") return MAX_OUTILS_PAR_SECTION;
    return MAX_ICONES_AUTRE_ECRAN;
  }

  /**
   * Favoris d’abord, en conservant l’ordre d’origine dans chaque groupe.
   * @param {typeof OUTILS} liste
   * @param {Set<string>} favoris
   */
  function trierAvecFavoris(liste, favoris) {
    var favs = [];
    var autres = [];
    liste.forEach(function (o) {
      if (favoris.has(o.id)) favs.push(o);
      else autres.push(o);
    });
    return favs.concat(autres);
  }

  function basculerFavori(id) {
    var set = chargerFavoris();
    if (set.has(id)) set.delete(id);
    else set.add(id);
    sauverFavoris(set);
  }

  function publicLabel(publicCible) {
    if (AUDIENCE === "eleve") return "Outils de séance";
    return publicCible === "eleve" ? "Outils pour les élèves" : "Outils pour le prof";
  }

  function publicDescription(publicCible) {
    if (AUDIENCE === "eleve") {
      return "À utiliser en cours, en autonomie ou par binôme.";
    }
    return publicCible === "eleve"
      ? "À utiliser directement par les élèves ou en autonomie."
      : "Pour organiser, gérer ou piloter la séance.";
  }

  function creerEnteteSection(publicCible, count) {
    var li = document.createElement("li");
    li.className = "tools-list__section";
    li.setAttribute("role", "presentation");

    var top = document.createElement("div");
    top.className = "tools-list__section-top";

    var title = document.createElement("h2");
    title.className = "tools-list__section-title";
    title.textContent = publicLabel(publicCible);
    top.appendChild(title);

    top.appendChild(creerSelecteurVueOutils(publicCible));

    var meta = document.createElement("p");
    meta.className = "tools-list__section-desc";
    meta.textContent = publicDescription(publicCible) + " · " + count + " outil" + (count > 1 ? "s" : "");

    li.appendChild(top);
    li.appendChild(meta);
    return li;
  }

  function creerSelecteurVueOutils(publicCible) {
    var wrap = document.createElement("div");
    wrap.className = "tools-view-toggle";
    wrap.setAttribute("aria-label", "Affichage " + publicLabel(publicCible).toLowerCase());

    [
      { mode: "cards", label: "Cartes", icon: "▤" },
      { mode: "icons", label: "Icônes", icon: "▦" },
    ].forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tools-view-toggle__btn" + (viewMode === opt.mode ? " is-active" : "");
      btn.setAttribute("aria-label", "Afficher " + publicLabel(publicCible).toLowerCase() + " en mode " + opt.label.toLowerCase());
      btn.setAttribute("aria-pressed", viewMode === opt.mode ? "true" : "false");
      btn.textContent = opt.icon;
      btn.addEventListener("click", function () {
        if (viewMode === opt.mode) return;
        sauverModeOutils(opt.mode);
        renderListe(filtreOutils(searchInput ? searchInput.value : ""));
      });
      wrap.appendChild(btn);
    });

    return wrap;
  }

  function creerEnteteCategorie(label) {
    var li = document.createElement("li");
    li.className = "tools-list__category";
    li.setAttribute("role", "presentation");

    var title = document.createElement("h3");
    title.className = "tools-list__category-title";
    title.textContent = label;
    li.appendChild(title);
    return li;
  }

  function creerBoutonVoirPlus(publicCible, restants) {
    var li = document.createElement("li");
    li.className = "tools-list__more";
    li.setAttribute("role", "presentation");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost tools-list__more-btn";
    btn.textContent = "Voir plus (" + restants + ")";
    btn.addEventListener("click", function () {
      sectionsOuvertes[publicCible] = true;
      renderListe(filtreOutils(searchInput ? searchInput.value : ""));
    });

    li.appendChild(btn);
    return li;
  }

  function creerItemOutil(o, favoris, options) {
    options = options || {};
    var isFav = favoris.has(o.id);
    var li = document.createElement("li");
    li.className = "tool-list__item" + (isFav ? " tool-list__item--fav" : "");
    li.setAttribute("data-public", o.publicCible);
    li.setAttribute("role", "listitem");

    var link = document.createElement("a");
    link.className = "tool-list__link";
    link.href = o.href;
    link.setAttribute("data-tool-id", o.id);

    var icon = document.createElement("span");
    icon.className = "tool-list__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = o.icone;

    var main = document.createElement("span");
    main.className = "tool-list__main";

    var title = document.createElement("span");
    title.className = "tool-list__title";
    title.textContent = o.titre;

    var meta = document.createElement("span");
    meta.className = "tool-list__meta";
    meta.textContent = options.metaDescriptionOnly
      ? o.description
      : o.categorie + " — " + o.description;

    main.appendChild(title);
    main.appendChild(meta);
    link.appendChild(icon);
    link.appendChild(main);

    var btnFav = document.createElement("button");
    btnFav.type = "button";
    btnFav.className = "tool-list__fav" + (isFav ? " tool-list__fav--on" : "");
    btnFav.setAttribute("aria-pressed", isFav ? "true" : "false");
    btnFav.setAttribute(
      "aria-label",
      isFav ? "Retirer des favoris : " + o.titre : "Mettre en favori : " + o.titre
    );
    btnFav.setAttribute("data-fav-id", o.id);
    var spanIcon = document.createElement("span");
    spanIcon.className = "tool-list__fav-icon";
    spanIcon.setAttribute("aria-hidden", "true");
    spanIcon.textContent = isFav ? "★" : "☆";
    btnFav.appendChild(spanIcon);

    btnFav.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      basculerFavori(o.id);
      renderListe(filtreOutils(searchInput ? searchInput.value : ""));
    });

    li.appendChild(link);
    li.appendChild(btnFav);
    return li;
  }

  function renderBlocPublic(publicCible, groupe, favoris) {
    if (!groupe.length) return;

    var isSearch = !!(searchInput && normalise(searchInput.value).trim());
    var groupesProf =
      publicCible === "prof" && !isSearch ? grouperOutilsProf(groupe, favoris) : null;
    var itemOptions = groupesProf ? { metaDescriptionOnly: true } : {};

    listEl.appendChild(creerEnteteSection(publicCible, groupe.length));

    if (groupesProf) {
      groupesProf.forEach(function (cat) {
        listEl.appendChild(creerEnteteCategorie(cat.label));
        cat.outils.forEach(function (o) {
          listEl.appendChild(creerItemOutil(o, favoris, itemOptions));
        });
      });
      return;
    }

    var sorted = trierAvecFavoris(groupe, favoris);
    var ouvert = sectionsOuvertes[publicCible] || isSearch;
    var limite = limiteVisibleParSection();
    var visibles = ouvert ? sorted : sorted.slice(0, limite);
    visibles.forEach(function (o) {
      listEl.appendChild(creerItemOutil(o, favoris, itemOptions));
    });
    if (!ouvert && sorted.length > limite) {
      listEl.appendChild(creerBoutonVoirPlus(publicCible, sorted.length - limite));
    }
  }

  function renderListe(liste) {
    if (!listEl || !emptyEl) return;
    OutilsDom.clear(listEl);
    listEl.classList.toggle("tools-list--icons", viewMode === "icons");

    if (liste.length === 0) {
      emptyEl.hidden = false;
      listEl.hidden = true;
      if (countEl) countEl.textContent = "0 outil affiché";
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;

    var favoris = chargerFavoris();
    var publicCibles =
      AUDIENCE === "eleve"
        ? ["eleve"]
        : AUDIENCE === "prof"
          ? ["prof"]
          : ["prof", "eleve"];
    publicCibles.forEach(function (publicCible) {
      var groupe = liste.filter(function (o) {
        return o.publicCible === publicCible;
      });
      renderBlocPublic(publicCible, groupe, favoris);
    });

    if (countEl) {
      countEl.textContent =
        liste.length === OUTILS.length
          ? liste.length + " outils"
          : liste.length +
            " outil" +
            (liste.length > 1 ? "s" : "") +
            " sur " +
            OUTILS.length;
    }
  }

  function onSearch() {
    renderListe(filtreOutils(searchInput ? searchInput.value : ""));
  }

  renderListe(OUTILS);
  window.dispatchEvent(new Event("outils-eps-home-ready"));
  if (searchInput) {
    searchInput.addEventListener("input", onSearch);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("resize", function () {
      renderListe(filtreOutils(searchInput ? searchInput.value : ""));
    });
  }

  var btnInfo = document.getElementById("btn-info-app");
  var dialogInfo = document.getElementById("dialog-info-app");
  if (btnInfo && dialogInfo && dialogInfo.showModal) {
    btnInfo.addEventListener("click", function () {
      dialogInfo.showModal();
    });
  }

  var HOME_NEW_YEAR_HIDE_KEY = "outils_eps_home_new_year_hide_v1";
  var dialogNewYearHome = document.getElementById("dialog-nouvelle-annee-home");
  var hideNewYearHomeEl = document.getElementById("home-nouvelle-annee-never");
  var isIndexPage =
    typeof window !== "undefined" &&
    window.location &&
    /(^|\/)index\.html$/i.test(window.location.pathname);
  if (isIndexPage && dialogNewYearHome && dialogNewYearHome.showModal) {
    var hideNewYearHome = false;
    try {
      hideNewYearHome = localStorage.getItem(HOME_NEW_YEAR_HIDE_KEY) === "1";
    } catch (e) {}
    if (!hideNewYearHome) {
      setTimeout(function () {
        dialogNewYearHome.showModal();
      }, 350);
    }
    dialogNewYearHome.addEventListener("close", function () {
      try {
        localStorage.setItem(
          HOME_NEW_YEAR_HIDE_KEY,
          hideNewYearHomeEl && hideNewYearHomeEl.checked ? "1" : "0"
        );
      } catch (e) {}
    });
  }

  var btnShare = document.getElementById("btn-share-app");
  var dialogShare = document.getElementById("dialog-share-app");
  var shareLink = document.getElementById("share-link");
  var shareQr = document.getElementById("share-qr-code");
  var shareLinkEleves = document.getElementById("share-link-eleves");
  var shareQrEleves = document.getElementById("share-qr-eleves");
  var btnCopyShare = document.getElementById("btn-copy-share-link");
  var btnCopyShareEleves = document.getElementById("btn-copy-share-link-eleves");
  var btnNativeShareApp = document.getElementById("btn-native-share-app");
  var btnNativeShareEleves = document.getElementById("btn-native-share-eleves");
  var shareMsg = document.getElementById("share-msg");
  var shareDual = !!(shareLinkEleves && shareQrEleves);

  function normalizeBasePath(pathname) {
    if (pathname.endsWith("/index.html")) return pathname.slice(0, -10) || "/";
    if (pathname.endsWith("/eleves.html")) return pathname.slice(0, -11) || "/";
    return pathname;
  }

  function shareUrlApp() {
    var url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    url.pathname = normalizeBasePath(url.pathname);
    return url.href;
  }

  function shareUrlEleves() {
    var url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    var base = normalizeBasePath(url.pathname);
    if (!base.endsWith("/")) base += "/";
    url.pathname = base + "eleves.html";
    return url.href;
  }

  function shareUrl() {
    return AUDIENCE === "eleve" ? shareUrlEleves() : shareUrlApp();
  }

  function qrCodeSrc(targetUrl) {
    return (
      "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
      encodeURIComponent(targetUrl)
    );
  }

  function shareMetaForTarget(target) {
    var body = document.body;
    if (target === "eleve") {
      return {
        title: (body && body.dataset.shareTitle) || "Outils EPS — Élèves",
        text:
          (body && body.dataset.shareText) ||
          "Outils EPS : outils de séance pour les cours d’EPS (élèves).",
        url: shareUrlEleves(),
      };
    }
    return {
      title: "Outils EPS",
      text: "Outils EPS : petits outils pratiques pour les cours d’EPS.",
      url: shareUrlApp(),
    };
  }

  function setShareMsg(text) {
    if (!shareMsg) return;
    shareMsg.hidden = !text;
    shareMsg.textContent = text || "";
  }

  function prepareShareDialog() {
    var appUrl = shareUrlApp();
    var elevesUrl = shareUrlEleves();
    if (shareDual) {
      if (shareLink) shareLink.value = appUrl;
      if (shareQr) shareQr.src = qrCodeSrc(appUrl);
      if (shareLinkEleves) shareLinkEleves.value = elevesUrl;
      if (shareQrEleves) shareQrEleves.src = qrCodeSrc(elevesUrl);
    } else {
      var url = shareUrl();
      if (shareLink) shareLink.value = url;
      if (shareQr) shareQr.src = qrCodeSrc(url);
    }
    var canShare = !!navigator.share;
    if (btnNativeShareApp) btnNativeShareApp.hidden = !canShare;
    if (btnNativeShareEleves) btnNativeShareEleves.hidden = !canShare;
    setShareMsg("");
  }

  function nativeShareTarget(target) {
    var meta = shareMetaForTarget(target);
    if (!navigator.share) return Promise.reject(new Error("Partage natif indisponible"));
    return navigator.share({
      title: meta.title,
      text: meta.text,
      url: meta.url,
    });
  }

  function copyShareLink(url, inputEl, successLabel) {
    function onSuccess() {
      setShareMsg(successLabel || "Lien copié.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(onSuccess);
      return;
    }
    if (!inputEl) return;
    inputEl.focus();
    inputEl.select();
    try {
      document.execCommand("copy");
      onSuccess();
    } catch (e) {
      setShareMsg("Copie impossible : sélectionnez le lien.");
    }
  }

  if (dialogShare) {
    dialogShare.querySelectorAll(".share-dialog__dismiss").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dialogShare.close();
      });
    });
  }

  if (btnShare) {
    btnShare.addEventListener("click", function () {
      prepareShareDialog();
      if (dialogShare && dialogShare.showModal) {
        dialogShare.showModal();
      } else {
        nativeShareTarget(AUDIENCE === "eleve" ? "eleve" : "app").catch(function () {
          copyShareLink(shareUrl(), shareLink, "Lien copié");
        });
      }
    });
  }
  if (btnNativeShareApp) {
    btnNativeShareApp.addEventListener("click", function () {
      nativeShareTarget("app").catch(function () {});
    });
  }
  if (btnNativeShareEleves) {
    btnNativeShareEleves.addEventListener("click", function () {
      nativeShareTarget("eleve").catch(function () {});
    });
  }
  if (btnCopyShare) {
    btnCopyShare.addEventListener("click", function () {
      copyShareLink(shareUrlApp(), shareLink, "Lien application complète copié");
    });
  }
  if (btnCopyShareEleves) {
    btnCopyShareEleves.addEventListener("click", function () {
      copyShareLink(
        shareUrlEleves(),
        shareLinkEleves,
        "Lien page élèves copié"
      );
    });
  }

  if (window.OutilsAccueil) {
    OutilsAccueil.setAccueil(AUDIENCE === "eleve" ? "eleves" : "index");
    if (listEl) {
      listEl.addEventListener("click", function (e) {
        if (!e.target.closest("a.tool-list__link")) return;
        OutilsAccueil.setAccueil(AUDIENCE === "eleve" ? "eleves" : "index");
      });
    }
  }
})();
