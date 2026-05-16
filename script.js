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

  var FAVORIS_KEY = "outils_eps_favoris_v1";
  var MAX_OUTILS_PAR_SECTION = 5;
  var sectionsOuvertes = { prof: false, eleve: false };

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
      titre: "Écartement des plots (demi-fond)",
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

    var title = document.createElement("h2");
    title.className = "tools-list__section-title";
    title.textContent = publicLabel(publicCible);

    var meta = document.createElement("p");
    meta.className = "tools-list__section-desc";
    meta.textContent = publicDescription(publicCible) + " · " + count + " outil" + (count > 1 ? "s" : "");

    li.appendChild(title);
    li.appendChild(meta);
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

  function creerItemOutil(o, favoris) {
    var isFav = favoris.has(o.id);
    var li = document.createElement("li");
    li.className = "tool-list__item" + (isFav ? " tool-list__item--fav" : "");
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
    listEl.innerHTML = "";

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
      var visibles = ouvert ? sorted : sorted.slice(0, MAX_OUTILS_PAR_SECTION);
      visibles.forEach(function (o) {
        listEl.appendChild(creerItemOutil(o, favoris));
      });
      if (!ouvert && sorted.length > MAX_OUTILS_PAR_SECTION) {
        listEl.appendChild(creerBoutonVoirPlus(publicCible, sorted.length - MAX_OUTILS_PAR_SECTION));
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

  var btnInfo = document.getElementById("btn-info-app");
  var dialogInfo = document.getElementById("dialog-info-app");
  if (btnInfo && dialogInfo && dialogInfo.showModal) {
    btnInfo.addEventListener("click", function () {
      dialogInfo.showModal();
    });
  }
})();
