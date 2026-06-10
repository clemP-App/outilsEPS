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
  var HOME_MODE_KEY = "outilseps.homeMode";
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

  function creerBoutonPartagePageEleves() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--sm tools-list__share-eleves-btn";
    btn.setAttribute("aria-label", "Partager la page élèves");
    btn.appendChild(creerIcone("📱", "tools-list__share-eleves-icon"));
    var label = document.createElement("span");
    label.className = "tools-list__share-eleves-label";
    label.textContent = "Partager la page élèves";
    btn.appendChild(label);
    btn.addEventListener("click", ouvrirPartagePageEleves);
    return btn;
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

    var sectionActions = document.createElement("div");
    sectionActions.className = "tools-list__section-actions";
    if (publicCible === "eleve" && AUDIENCE !== "eleve") {
      sectionActions.appendChild(creerBoutonPartagePageEleves());
    }
    sectionActions.appendChild(creerSelecteurVueOutils(publicCible));
    top.appendChild(sectionActions);

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

    var iconWrap = document.createElement("span");
    iconWrap.className = "tool-list__icon-wrap";

    var icon = document.createElement("span");
    icon.className = "tool-list__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = o.icone;

    iconWrap.appendChild(icon);
    if (isFav) {
      var star = document.createElement("span");
      star.className = "tool-list__fav-star";
      star.setAttribute("aria-hidden", "true");
      star.textContent = "★";
      iconWrap.appendChild(star);
    }
    if (o.badge) {
      var badge = document.createElement("span");
      badge.className = "tool-list__badge";
      badge.textContent = o.badge;
      iconWrap.appendChild(badge);
    }

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
    link.appendChild(iconWrap);
    link.appendChild(main);

    li.appendChild(link);
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

  function chargerModeAccueil() {
    try {
      var saved = localStorage.getItem(HOME_MODE_KEY);
      return saved === "catalog" ? "catalog" : "guided";
    } catch (e) {
      return "guided";
    }
  }

  function sauverModeAccueil(mode) {
    try {
      localStorage.setItem(HOME_MODE_KEY, mode === "catalog" ? "catalog" : "guided");
    } catch (e) {
      /* quota ou mode privé strict */
    }
  }

  function actionLabel(action) {
    return action.displayAs || action.label;
  }

  function creerIcone(icone, className) {
    var span = document.createElement("span");
    span.className = className || "home-icon";
    span.setAttribute("aria-hidden", "true");
    span.textContent = icone || "•";
    return span;
  }

  function creerLienAction(action) {
    var link = document.createElement("a");
    link.className = "home-action" + (action.primary ? " home-action--primary" : "");
    link.href = action.href;
    if (action.icon) {
      link.appendChild(creerIcone(action.icon, "home-icon home-icon--action"));
    }
    var text = document.createElement("span");
    text.className = "home-action__text";
    text.textContent = actionLabel(action);
    link.appendChild(text);
    return link;
  }

  function creerListeActions(actions, options) {
    options = options || {};
    var list = document.createElement("div");
    list.className = "home-actions";
    if (options.variant) {
      list.classList.add("home-actions--" + options.variant);
    }
    (actions || []).forEach(function (action) {
      list.appendChild(creerLienAction(action));
    });
    return list;
  }

  function creerBlocConfiance(items) {
    var wrap = document.createElement("div");
    wrap.className = "home-trust";
    wrap.setAttribute("role", "list");
    if (!Array.isArray(items)) {
      var fallback = document.createElement("p");
      fallback.className = "home-trust__text";
      fallback.textContent = items;
      wrap.appendChild(fallback);
      return wrap;
    }
    items.forEach(function (item) {
      var pill = document.createElement("span");
      pill.className = "home-trust__pill";
      pill.setAttribute("role", "listitem");
      if (item.icon) {
        pill.appendChild(creerIcone(item.icon, "home-icon home-icon--trust"));
      }
      var text = document.createElement("span");
      text.textContent = item.text;
      pill.appendChild(text);
      wrap.appendChild(pill);
    });
    return wrap;
  }

  function creerFlecheFlow() {
    var arrow = document.createElement("span");
    arrow.className = "home-flow__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    return arrow;
  }

  function flowStepLabel(step) {
    return typeof step === "string" ? step : step.label || "";
  }

  function creerFlowVisuel(steps) {
    if (!steps || !steps.length) return null;
    var wrap = document.createElement("div");
    wrap.className = "home-flow";
    steps.forEach(function (step, index) {
      var chip = document.createElement("span");
      chip.className = "home-flow__step";
      if (step && typeof step === "object" && step.icon) {
        chip.appendChild(creerIcone(step.icon, "home-icon home-icon--flow"));
      }
      var label = document.createElement("span");
      label.className = "home-flow__label";
      label.textContent = flowStepLabel(step);
      chip.appendChild(label);
      wrap.appendChild(chip);
      if (index < steps.length - 1) {
        wrap.appendChild(creerFlecheFlow());
      }
    });
    return wrap;
  }

  function creerBlocPartageEleves(partage) {
    partage = partage || {};
    var block = document.createElement("div");
    block.className = "home-qr-share";

    if (partage.titre) {
      var shareTitle = document.createElement("h3");
      shareTitle.className = "home-qr-share__title";
      shareTitle.textContent = partage.titre;
      block.appendChild(shareTitle);
    }

    var wrap = document.createElement("div");
    wrap.className = "home-qr-share__qr-wrap";

    var img = document.createElement("img");
    img.className = "home-qr-share__qr";
    img.id = "home-qr-eleves-inline";
    img.alt = "Qr Code — page élèves Outils EPS";
    img.width = 168;
    img.height = 168;
    img.decoding = "async";
    img.loading = "lazy";
    wrap.appendChild(img);
    block.appendChild(wrap);

    var actions = document.createElement("div");
    actions.className = "home-qr-share__actions home-actions home-actions--qr";

    if (partage.ouvrir) {
      actions.appendChild(creerLienAction(partage.ouvrir));
    }

    var copyLabel =
      partage.copier && partage.copier.label
        ? partage.copier.label
        : "Copier le lien de la page élève";
    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn--ghost btn--sm home-qr-copy";
    copyBtn.id = "btn-copy-eleves-home";
    copyBtn.appendChild(creerIcone("🔗", "home-icon home-icon--action"));
    var copyText = document.createElement("span");
    copyText.className = "home-qr-copy__text";
    copyText.textContent = copyLabel;
    copyBtn.appendChild(copyText);
    actions.appendChild(copyBtn);
    block.appendChild(actions);

    return block;
  }

  function renderQrInto(hostEl, targetUrl, size) {
    if (!hostEl || !targetUrl) return;
    size = size || 200;
    if (typeof QRCode === "undefined") {
      if (hostEl.tagName === "IMG") {
        hostEl.removeAttribute("src");
        hostEl.alt = "Qr Code indisponible";
      }
      return;
    }

    var sandbox = document.createElement("div");
    sandbox.setAttribute("aria-hidden", "true");
    sandbox.style.cssText =
      "position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);";
    document.body.appendChild(sandbox);
    try {
      new QRCode(sandbox, {
        text: targetUrl,
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel.L,
      });
      var generated = sandbox.querySelector("img");
      var canvas = sandbox.querySelector("canvas");
      var dataUrl = "";
      if (generated && generated.src) {
        dataUrl = generated.src;
      } else if (canvas && canvas.toDataURL) {
        dataUrl = canvas.toDataURL("image/png");
      }
      if (hostEl.tagName === "IMG") {
        if (dataUrl) hostEl.src = dataUrl;
      } else {
        hostEl.textContent = "";
        if (dataUrl) {
          var out = document.createElement("img");
          out.src = dataUrl;
          out.alt = "Qr Code";
          out.width = size;
          out.height = size;
          hostEl.appendChild(out);
        } else {
          new QRCode(hostEl, {
            text: targetUrl,
            width: size,
            height: size,
            correctLevel: QRCode.CorrectLevel.L,
          });
        }
      }
    } finally {
      document.body.removeChild(sandbox);
    }
  }

  function actualiserQrElevesAccueil() {
    var img = document.getElementById("home-qr-eleves-inline");
    if (!img || typeof shareUrlEleves !== "function") return;
    renderQrInto(img, shareUrlEleves(), 168);
  }

  function creerTitreZone(texte, options) {
    options = options || {};
    var title = document.createElement("h2");
    title.className = "home-zone__title" + (options.modifier ? " " + options.modifier : "");
    if (options.icon) {
      title.appendChild(creerIcone(options.icon, "home-icon home-icon--zone"));
      title.appendChild(document.createTextNode(" "));
    }
    title.appendChild(document.createTextNode(texte));
    return title;
  }

  function creerCarteEntree(entree) {
    var card = document.createElement("article");
    card.className = "home-entree";

    var head = document.createElement("div");
    head.className = "home-entree__head";
    if (entree.icone) {
      head.appendChild(creerIcone(entree.icone, "home-icon home-icon--entree"));
    }

    var text = document.createElement("div");
    text.className = "home-entree__text";

    var title = document.createElement("h3");
    title.className = "home-entree__title";
    title.textContent = entree.titre;
    text.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "home-entree__desc";
    desc.textContent = entree.description;
    text.appendChild(desc);

    head.appendChild(text);
    card.appendChild(head);
    card.appendChild(creerListeActions(entree.actions, { variant: "entree" }));
    return card;
  }

  function creerCarteRapide(parcours) {
    var card = document.createElement("article");
    card.className = "home-rapide";

    var head = document.createElement("div");
    head.className = "home-rapide__head";
    if (parcours.icone) {
      head.appendChild(creerIcone(parcours.icone, "home-icon home-icon--rapide"));
    }

    var text = document.createElement("div");
    text.className = "home-rapide__text";

    var title = document.createElement("h3");
    title.className = "home-rapide__title";
    title.textContent = parcours.titre;
    text.appendChild(title);

    if (parcours.description) {
      var desc = document.createElement("p");
      desc.className = "home-rapide__desc";
      desc.textContent = parcours.description;
      text.appendChild(desc);
    }

    head.appendChild(text);
    card.appendChild(head);
    card.appendChild(creerListeActions(parcours.actions));
    return card;
  }

  function renderBarreConfiance() {
    var bar = document.getElementById("home-trust-bar");
    if (!bar) return;
    var guided =
      window.OutilsEPS && window.OutilsEPS.HOME_GUIDED ? window.OutilsEPS.HOME_GUIDED : null;
    OutilsDom.clear(bar);
    if (!guided || !guided.confiance) {
      bar.hidden = true;
      return;
    }
    bar.appendChild(creerBlocConfiance(guided.confiance));
    bar.hidden = false;
  }

  function renderParcoursGuide() {
    var container = document.getElementById("home-guided-content");
    if (!container) return;
    var guided =
      window.OutilsEPS && window.OutilsEPS.HOME_GUIDED ? window.OutilsEPS.HOME_GUIDED : null;
    if (!guided) return;

    renderBarreConfiance();
    OutilsDom.clear(container);

    var zoneEntrees = document.createElement("section");
    zoneEntrees.className = "home-zone home-zone--entrees";
    zoneEntrees.appendChild(
      creerTitreZone("Choisir mon point de départ", { icon: "🎯" })
    );

    var grilleEntrees = document.createElement("div");
    grilleEntrees.className = "home-entrees";
    (guided.entrees || []).forEach(function (entree) {
      grilleEntrees.appendChild(creerCarteEntree(entree));
    });
    zoneEntrees.appendChild(grilleEntrees);
    container.appendChild(zoneEntrees);

    if (guided.qrBloc) {
      var qr = guided.qrBloc;
      var zoneQr = document.createElement("section");
      zoneQr.className = "home-zone home-zone--qr";

      zoneQr.appendChild(
        creerTitreZone(qr.titre, {
          modifier: "home-zone__title--qr",
          icon: qr.icone || "📲",
        })
      );

      if (qr.intro) {
        var introQr = document.createElement("p");
        introQr.className = "home-zone__intro";
        introQr.textContent = qr.intro;
        zoneQr.appendChild(introQr);
      }

      zoneQr.appendChild(creerBlocPartageEleves(qr.partage));

      if (qr.reception) {
        var reception = document.createElement("div");
        reception.className = "home-qr-reception";

        if (qr.reception.titre) {
          var receptionTitle = document.createElement("h3");
          receptionTitle.className = "home-qr-reception__title";
          receptionTitle.textContent = qr.reception.titre;
          reception.appendChild(receptionTitle);
        }

        var receptionActions = creerListeActions(qr.reception.actions);
        receptionActions.classList.add("home-actions--qr");
        reception.appendChild(receptionActions);
        zoneQr.appendChild(reception);
      }

      container.appendChild(zoneQr);
    }

    if (guided.parcoursRapides && guided.parcoursRapides.length) {
      var zoneRapides = document.createElement("section");
      zoneRapides.className = "home-zone home-zone--rapides";

      zoneRapides.appendChild(
        creerTitreZone(guided.parcoursRapidesTitre || "Selon mon besoin", { icon: "🧭" })
      );

      var grilleRapides = document.createElement("div");
      grilleRapides.className = "home-rapides";
      guided.parcoursRapides.forEach(function (p) {
        grilleRapides.appendChild(creerCarteRapide(p));
      });
      zoneRapides.appendChild(grilleRapides);
      container.appendChild(zoneRapides);
    }

    actualiserQrElevesAccueil();
  }

  function appliquerModeAccueil(mode) {
    var guided = document.getElementById("home-guided");
    var catalog = document.getElementById("home-catalog");
    var btnGuided = document.getElementById("home-mode-guided");
    var btnCatalog = document.getElementById("home-mode-catalog");
    if (!guided || !catalog) return;

    var isGuided = mode !== "catalog";
    guided.hidden = !isGuided;
    catalog.hidden = isGuided;

    if (btnGuided) {
      btnGuided.classList.toggle("is-active", isGuided);
      btnGuided.setAttribute("aria-selected", isGuided ? "true" : "false");
    }
    if (btnCatalog) {
      btnCatalog.classList.toggle("is-active", !isGuided);
      btnCatalog.setAttribute("aria-selected", !isGuided ? "true" : "false");
    }

    document.body.classList.toggle("app--home-guided", isGuided);
    document.body.classList.toggle("app--home-catalog", !isGuided);

    var trustBar = document.getElementById("home-trust-bar");
    if (trustBar) {
      trustBar.hidden = !isGuided || !trustBar.childElementCount;
    }
  }

  function basculerModeAccueil(mode) {
    var next = mode === "catalog" ? "catalog" : "guided";
    sauverModeAccueil(next);
    appliquerModeAccueil(next);
  }

  function initAccueilGuide() {
    var toggle = document.getElementById("home-mode-toggle");
    if (!toggle || AUDIENCE === "eleve") return;

    renderParcoursGuide();
    appliquerModeAccueil(chargerModeAccueil());

    toggle.querySelectorAll("[data-home-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        basculerModeAccueil(btn.getAttribute("data-home-mode"));
      });
    });

    var btnShowCatalog = document.getElementById("btn-show-catalog");
    if (btnShowCatalog) {
      btnShowCatalog.addEventListener("click", function () {
        basculerModeAccueil("catalog");
      });
    }

    var guidedContent = document.getElementById("home-guided-content");
    if (guidedContent && window.OutilsAccueil) {
      guidedContent.addEventListener("click", function (e) {
        if (!e.target.closest("a.home-action")) return;
        OutilsAccueil.setAccueil("index");
      });
    }

    var btnCopyElevesHome = document.getElementById("btn-copy-eleves-home");
    if (btnCopyElevesHome) {
      var copyLabelEl = btnCopyElevesHome.querySelector(".home-qr-copy__text");
      var copyLabelDefault =
        copyLabelEl && copyLabelEl.textContent
          ? copyLabelEl.textContent
          : "Copier le lien de la page élève";
      btnCopyElevesHome.addEventListener("click", function () {
        var url = shareUrlEleves();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            if (copyLabelEl) copyLabelEl.textContent = "Lien copié";
            setTimeout(function () {
              if (copyLabelEl) copyLabelEl.textContent = copyLabelDefault;
            }, 2000);
          });
          return;
        }
        window.prompt("Copiez le lien de la page élève :", url);
      });
    }
  }

  renderListe(OUTILS);
  initAccueilGuide();
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

  var btnSiteMenu = document.getElementById("btn-site-menu");
  var siteSidebar = document.getElementById("site-sidebar");
  var siteSidebarBackdrop = document.getElementById("site-sidebar-backdrop");
  var btnSiteSidebarClose = document.getElementById("btn-site-sidebar-close");
  function openSiteSidebar() {
    if (!siteSidebar) return;
    siteSidebar.classList.add("is-open");
    if (siteSidebarBackdrop) {
      siteSidebarBackdrop.hidden = false;
      siteSidebarBackdrop.classList.add("is-visible");
    }
    if (btnSiteMenu) btnSiteMenu.setAttribute("aria-expanded", "true");
    document.body.classList.add("site-sidebar-open");
  }

  function closeSiteSidebar() {
    if (!siteSidebar) return;
    siteSidebar.classList.remove("is-open");
    if (siteSidebarBackdrop) {
      siteSidebarBackdrop.hidden = true;
      siteSidebarBackdrop.classList.remove("is-visible");
    }
    if (btnSiteMenu) btnSiteMenu.setAttribute("aria-expanded", "false");
    document.body.classList.remove("site-sidebar-open");
  }

  if (btnSiteMenu && siteSidebar) {
    btnSiteMenu.addEventListener("click", function () {
      if (siteSidebar.classList.contains("is-open")) {
        closeSiteSidebar();
      } else {
        openSiteSidebar();
      }
    });
  }
  if (btnSiteSidebarClose) {
    btnSiteSidebarClose.addEventListener("click", closeSiteSidebar);
  }
  if (siteSidebarBackdrop) {
    siteSidebarBackdrop.addEventListener("click", closeSiteSidebar);
  }
  if (siteSidebar) {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && siteSidebar.classList.contains("is-open")) {
        closeSiteSidebar();
      }
    });
    siteSidebar.querySelectorAll("[data-menu-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-menu-action");
        closeSiteSidebar();
        if (action === "info" && dialogInfo && dialogInfo.showModal) {
          dialogInfo.showModal();
        } else if (action === "share") {
          var shareTrigger = document.getElementById("btn-share-app");
          if (shareTrigger) shareTrigger.click();
        }
      });
    });
    siteSidebar.querySelectorAll("a.site-menu__link").forEach(function (link) {
      link.addEventListener("click", function () {
        closeSiteSidebar();
      });
    });
  }

  var btnFavoris = document.getElementById("btn-favoris");
  var dialogFavoris = document.getElementById("dialog-favoris");
  var favorisListEl = document.getElementById("favoris-dialog-list");

  function renderFavorisDialog() {
    if (!favorisListEl) return;
    OutilsDom.clear(favorisListEl);
    var favoris = chargerFavoris();
    var groupes =
      AUDIENCE === "eleve"
        ? [{ label: "Outils de séance", outils: OUTILS }]
        : (function () {
            var prof = OUTILS.filter(function (o) {
              return o.publicCible === "prof";
            });
            var eleve = OUTILS.filter(function (o) {
              return o.publicCible === "eleve";
            });
            var g = [];
            if (prof.length) g.push({ label: "Outils prof", outils: prof });
            if (eleve.length) g.push({ label: "Outils élèves", outils: eleve });
            return g;
          })();

    groupes.forEach(function (groupe) {
      var section = document.createElement("section");
      section.className = "favoris-dialog__section";

      var heading = document.createElement("h3");
      heading.className = "favoris-dialog__section-title";
      heading.textContent = groupe.label;
      section.appendChild(heading);

      var list = document.createElement("ul");
      list.className = "favoris-dialog__tools";
      groupe.outils.forEach(function (o) {
        var li = document.createElement("li");
        var label = document.createElement("label");
        label.className = "favoris-dialog__tool" + (favoris.has(o.id) ? " is-fav" : "");

        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = favoris.has(o.id);
        input.setAttribute("data-fav-id", o.id);

        var icon = document.createElement("span");
        icon.className = "favoris-dialog__tool-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = o.icone;

        var text = document.createElement("span");
        text.className = "favoris-dialog__tool-text";
        text.textContent = o.titre;

        label.appendChild(input);
        label.appendChild(icon);
        label.appendChild(text);
        li.appendChild(label);
        list.appendChild(li);
      });
      section.appendChild(list);
      favorisListEl.appendChild(section);
    });
  }

  if (favorisListEl) {
    favorisListEl.addEventListener("change", function (e) {
      var input = e.target;
      if (!input || input.type !== "checkbox" || !input.hasAttribute("data-fav-id")) return;
      var id = input.getAttribute("data-fav-id");
      var set = chargerFavoris();
      if (input.checked) set.add(id);
      else set.delete(id);
      sauverFavoris(set);
      var label = input.closest(".favoris-dialog__tool");
      if (label) label.classList.toggle("is-fav", input.checked);
      renderListe(filtreOutils(searchInput ? searchInput.value : ""));
      if (btnFavoris) {
        var count = set.size;
        btnFavoris.classList.toggle("search-wrap__fav-btn--active", count > 0);
        btnFavoris.setAttribute("aria-label", count ? count + " favori" + (count > 1 ? "s" : "") : "Gérer mes favoris");
      }
    });
  }

  if (btnFavoris && dialogFavoris && dialogFavoris.showModal) {
    var favSet = chargerFavoris();
    if (favSet.size) btnFavoris.classList.add("search-wrap__fav-btn--active");
    btnFavoris.addEventListener("click", function () {
      renderFavorisDialog();
      dialogFavoris.showModal();
    });
  }

  var HOME_NEW_YEAR_POPUP_ENABLED = false; /* réactiver en septembre */
  var HOME_NEW_YEAR_HIDE_KEY = "outils_eps_home_new_year_hide_v1";
  var dialogNewYearHome = document.getElementById("dialog-nouvelle-annee-home");
  var hideNewYearHomeEl = document.getElementById("home-nouvelle-annee-never");
  var isIndexPage =
    typeof window !== "undefined" &&
    window.location &&
    /(^|\/)index\.html$/i.test(window.location.pathname);
  if (HOME_NEW_YEAR_POPUP_ENABLED && isIndexPage && dialogNewYearHome && dialogNewYearHome.showModal) {
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
      if (shareQr) renderQrInto(shareQr, appUrl, 200);
      if (shareLinkEleves) shareLinkEleves.value = elevesUrl;
      if (shareQrEleves) renderQrInto(shareQrEleves, elevesUrl, 200);
    } else {
      var url = shareUrl();
      if (shareLink) shareLink.value = url;
      if (shareQr) renderQrInto(shareQr, url, 200);
    }
    var canShare = !!navigator.share;
    if (btnNativeShareApp) btnNativeShareApp.hidden = !canShare;
    if (btnNativeShareEleves) btnNativeShareEleves.hidden = !canShare;
    setShareMsg("");
  }

  function ouvrirPartagePageEleves() {
    prepareShareDialog();
    if (!dialogShare || !dialogShare.showModal) {
      nativeShareTarget("eleve").catch(function () {
        copyShareLink(shareUrlEleves(), shareLinkEleves, "Lien page élèves copié");
      });
      return;
    }
    dialogShare.classList.add("share-dialog--focus-eleves");
    dialogShare.showModal();
    var blockEleves = dialogShare.querySelector(".share-dialog__block--eleves");
    if (blockEleves) {
      window.requestAnimationFrame(function () {
        blockEleves.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
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
    dialogShare.addEventListener("close", function () {
      dialogShare.classList.remove("share-dialog--focus-eleves");
    });
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
