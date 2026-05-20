/**
 * Page d’accueil — liste des outils EPS, recherche et favoris (localStorage).
 *
 * POUR AJOUTER UN OUTIL :
 * 1. Créez la page HTML dans outils/nom-de-votre-outil.html
 * 2. Ajoutez un objet dans le tableau OUTILS ci-dessous avec :
 *    - id : identifiant unique (chaîne)
 *    - titre, description, icone (emoji ou caractère), href, categorie, publicCible
 * 3. C’est tout : la liste et la recherche s’adaptent automatiquement.
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
  var MAX_ICONES_GRAND_ECRAN = 8;
  var MAX_ICONES_AUTRE_ECRAN = 6;
  var sectionsOuvertes = { prof: false, eleve: false };
  var viewMode = chargerModeOutils();

  /** @type {Array<{id:string,titre:string,description:string,icone:string,href:string,categorie:string,publicCible:'prof'|'eleve'}>} */
  /** Du plus au moins utilisé au quotidien (hors sauvegarde, accessible via l’en-tête). */
  var OUTILS = [
    {
      id: "classes",
      titre: "Classes et groupes",
      description:
        "Créer des classes, groupes et listes d'élèves réutilisables dans tous les outils.",
      icone: "👥",
      href: "outils/classes.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "recuperation-donnees",
      titre: "Récupération de données",
      description:
        "Scannez le QR affiché par un élève pour importer ses résultats, sans connexion internet.",
      icone: "📲",
      href: "outils/recuperation-donnees.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "visualisation-donnees",
      titre: "Visualisation des données",
      description:
        "Consultez les remontées élèves : filtres par outil, classe, date et détail des statistiques.",
      icone: "📊",
      href: "outils/visualisation-donnees.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "dispenses-eps",
      titre: "Dispenses / Inaptitudes",
      description:
        "Enregistrez et suivez les dispenses, avec filtres et dates de fin calculées.",
      icone: "📋",
      href: "outils/dispenses-eps.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "oubli-materiel",
      titre: "Oubli de matériel",
      description:
        "Notez les oublis d’affaires et retrouvez automatiquement l’oubli n°1, n°2, etc. par élève.",
      icone: "👟",
      href: "outils/oubli-materiel.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "composition-equipes",
      titre: "Composition d’équipes homogènes",
      description:
        "Liste prénom ou nom (optionnel ;niveau 1–5), équipes équilibrées par niveau et déplacements manuels.",
      icone: "⚖️",
      href: "outils/composition-equipes.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "championnat-poule",
      titre: "Championnat à poule unique",
      description:
        "Créer un championnat, gérer les équipes, saisir les résultats et afficher le classement.",
      icone: "🏆",
      href: "outils/championnat-poule.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "tournoi-elimination",
      titre: "Tournoi éliminatoire",
      description:
        "Créer un tableau type tennis : quarts, demies, finale, avec progression automatique des gagnants.",
      icone: "🎾",
      href: "outils/tournoi-elimination.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "pyramide-victoires",
      titre: "Pyramide de victoires",
      description:
        "Tournoi par paliers : une victoire fait monter, une défaite ne fait pas descendre. Classement et matchs entre joueurs du même palier.",
      icone: "📶",
      href: "outils/pyramide-victoires.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "timer-hiit-tabata",
      titre: "Timer HIIT / Tabata",
      description:
        "Travail / pause en boucle, raccourcis Tabata et HIIT, bips et décompte au départ.",
      icone: "⏱️",
      href: "outils/timer-hiit-tabata.html",
      categorie: "Course à pied",
      publicCible: "prof",
    },
    {
      id: "maxi-timer",
      titre: "Maxi timer",
      description:
        "Grand chrono descendant ou croissant, lisible de loin, avec bips de fin.",
      icone: "⏲️",
      href: "outils/maxi-timer.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "tirage-au-sort",
      titre: "Tirage au sort",
      description:
        "Importez une classe ou saisissez une liste, puis tirez un nom au hasard parmi les participants.",
      icone: "🎲",
      href: "outils/tirage-au-sort.html",
      categorie: "Organisation EPS",
      publicCible: "prof",
    },
    {
      id: "inducteur-danse",
      titre: "Inducteur danse",
      description:
        "Tirez au hasard des inducteurs (espace, objet, contraintes corporelles…) pour l’improvisation ou la composition en danse APSA.",
      icone: "💃",
      href: "outils/inducteur-danse.html",
      categorie: "Danse APSA",
      publicCible: "prof",
    },
    {
      id: "test-vma",
      titre: "Test VMA",
      description:
        "Chronomètre avec bips, voix, paliers et repères plots pour Gacon, Luc Léger, VAMEVAL et demi-Cooper.",
      icone: "📣",
      href: "outils/test-vma.html",
      categorie: "Course à pied",
      publicCible: "prof",
    },
    {
      id: "table-marque",
      titre: "Table de marque",
      description:
        "Deux scores, timer de match, noms et couleurs d’équipes personnalisables.",
      icone: "🏀",
      href: "outils/table-marque.html",
      categorie: "Sports collectifs",
      publicCible: "eleve",
    },
    {
      id: "compteur-ptb",
      titre: "Compteur PTB",
      description:
        "Observer pertes, tirs et buts pour deux équipes, avec statistiques comparatives en direct.",
      icone: "🧮",
      href: "outils/compteur-ptb.html",
      categorie: "Sports collectifs",
      publicCible: "eleve",
    },
    {
      id: "compteur-bonus",
      titre: "Compteur bonus",
      description:
        "Deux joueurs en direct : bonus, points et malus en un clic, score et pourcentages par type d’action.",
      icone: "👍",
      href: "outils/compteur-bonus.html",
      categorie: "Organisation EPS",
      publicCible: "eleve",
    },
    {
      id: "vitesse-plots",
      titre: "Vitesse aux plots",
      description:
        "Chronométrez les passages aux plots pour connaître la vitesse du dernier intervalle et la moyenne.",
      icone: "📍",
      href: "outils/vitesse-plots.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "compteur-ratio",
      titre: "Compteur ratio",
      description:
        "Deux compteurs réussite/échec avec total de tentatives et ratio de réussite.",
      icone: "📊",
      href: "outils/compteur-ratio.html",
      categorie: "Observation",
      publicCible: "eleve",
    },
    {
      id: "questions-debrief",
      titre: "Questions débrief",
      description:
        "Choisissez un bilan individuel ou d’équipe, puis tirez des questions pour faire le point sur la séance.",
      icone: "💬",
      href: "outils/questions-debrief.html",
      categorie: "Réflexion",
      publicCible: "eleve",
    },
    {
      id: "zone-impact",
      titre: "Zone d’impact",
      description:
        "Cliquez les zones visées ou touchées selon l’activité : badminton, tennis de table, volley ou boxe.",
      icone: "⭕",
      href: "outils/impact-badminton.html",
      categorie: "Observation",
      publicCible: "eleve",
    },
    {
      id: "convertisseur-allure",
      titre: "Convertisseur km/h ↔ min/km",
      description:
        "Passez de la vitesse à l’allure, ou l’inverse, avec des champs dédiés et mise à jour automatique.",
      icone: "⏱️",
      href: "outils/convertisseur-allure.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "distance-vma",
      titre: "Distance VMA",
      description:
        "Calculez la distance objectif selon la durée de course, la VMA et le pourcentage demandé.",
      icone: "🎯",
      href: "outils/distance-vma.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "calcul-1rm",
      titre: "Calcul du 1RM",
      description:
        "Estimez votre charge max (1RM) à partir du poids et du nombre de répétitions, formules Epley ou Brzycki.",
      icone: "🏋️",
      href: "outils/calcul-1rm.html",
      categorie: "Musculation",
      publicCible: "eleve",
    },
    {
      id: "vitesse-course",
      titre: "Vitesse de course",
      description:
        "Calculez la vitesse (km/h, m/s) et l’allure (min/km) à partir d’une distance et d’un temps.",
      icone: "🏃",
      href: "outils/vitesse-course.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "ecartement-plots",
      titre: "Écartement des plots",
      description:
        "Calcule la distance entre deux plots pour que 1 km/h corresponde à 1 plot selon la durée du demi-fond.",
      icone: "📐",
      href: "outils/ecartement-plots.html",
      categorie: "Course à pied",
      publicCible: "prof",
    },
  ];

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

  function limiteVisibleParSection() {
    if (viewMode !== "icons") return MAX_OUTILS_PAR_SECTION;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches) {
      return MAX_ICONES_GRAND_ECRAN;
    }
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
    return publicCible === "eleve" ? "Outils pour les élèves" : "Outils pour le prof";
  }

  function publicDescription(publicCible) {
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

  function creerItemOutil(o, favoris) {
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
    meta.textContent = o.categorie + " — " + o.description;

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
    ["prof", "eleve"].forEach(function (publicCible) {
      var groupe = liste.filter(function (o) {
        return o.publicCible === publicCible;
      });
      if (!groupe.length) return;

      var sorted = trierAvecFavoris(groupe, favoris);
      listEl.appendChild(creerEnteteSection(publicCible, sorted.length));
      var isSearch = !!(searchInput && normalise(searchInput.value).trim());
      var ouvert = sectionsOuvertes[publicCible] || isSearch;
      var limite = limiteVisibleParSection();
      var visibles = ouvert ? sorted : sorted.slice(0, limite);
      visibles.forEach(function (o) {
        listEl.appendChild(creerItemOutil(o, favoris));
      });
      if (!ouvert && sorted.length > limite) {
        listEl.appendChild(creerBoutonVoirPlus(publicCible, sorted.length - limite));
      }
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
  if (searchInput) {
    searchInput.addEventListener("input", onSearch);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("resize", function () {
      if (viewMode === "icons") renderListe(filtreOutils(searchInput ? searchInput.value : ""));
    });
  }

  var btnInfo = document.getElementById("btn-info-app");
  var dialogInfo = document.getElementById("dialog-info-app");
  if (btnInfo && dialogInfo && dialogInfo.showModal) {
    btnInfo.addEventListener("click", function () {
      dialogInfo.showModal();
    });
  }

  var btnShare = document.getElementById("btn-share-app");
  var dialogShare = document.getElementById("dialog-share-app");
  var shareLink = document.getElementById("share-link");
  var shareQr = document.getElementById("share-qr-code");
  var btnCopyShare = document.getElementById("btn-copy-share-link");
  var btnNativeShare = document.getElementById("btn-native-share");
  var shareMsg = document.getElementById("share-msg");

  function shareUrl() {
    var url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.slice(0, -10);
    }
    return url.href;
  }

  function setShareMsg(text) {
    if (!shareMsg) return;
    shareMsg.hidden = !text;
    shareMsg.textContent = text || "";
  }

  function prepareShareDialog() {
    var url = shareUrl();
    if (shareLink) shareLink.value = url;
    if (shareQr) {
      shareQr.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" +
        encodeURIComponent(url);
    }
    if (btnNativeShare) btnNativeShare.hidden = !navigator.share;
    setShareMsg("");
  }

  function nativeShare() {
    var data = {
      title: "Outils EPS",
      text: "Outils EPS : petits outils pratiques pour les cours d’EPS.",
      url: shareUrl(),
    };
    if (!navigator.share) return Promise.reject(new Error("Partage natif indisponible"));
    return navigator.share(data);
  }

  function copyShareLink() {
    var url = shareUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        setShareMsg("Lien copié.");
      });
      return;
    }
    if (!shareLink) return;
    shareLink.focus();
    shareLink.select();
    try {
      document.execCommand("copy");
      setShareMsg("Lien copié.");
    } catch (e) {
      setShareMsg("Copie impossible : sélectionnez le lien.");
    }
  }

  if (btnShare) {
    btnShare.addEventListener("click", function () {
      prepareShareDialog();
      if (dialogShare && dialogShare.showModal) {
        dialogShare.showModal();
      } else {
        nativeShare().catch(copyShareLink);
      }
    });
  }
  if (btnNativeShare) {
    btnNativeShare.addEventListener("click", function () {
      nativeShare().catch(function () {});
    });
  }
  if (btnCopyShare) btnCopyShare.addEventListener("click", copyShareLink);
})();
