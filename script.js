/**
 * Page d’accueil — liste des outils EPS, recherche et favoris (localStorage).
 *
 * POUR AJOUTER UN OUTIL :
 * 1. Créez la page HTML dans outils/nom-de-votre-outil.html
 * 2. Ajoutez un objet dans le tableau OUTILS ci-dessous avec :
 *    - id : identifiant unique (chaîne)
 *    - titre, description, icone (emoji ou caractère), href, categorie
 * 3. C’est tout : la liste et la recherche s’adaptent automatiquement.
 */

(function () {
  "use strict";

  var FAVORIS_KEY = "outils_eps_favoris_v1";

  /** @type {Array<{id:string,titre:string,description:string,icone:string,href:string,categorie:string}>} */
  var OUTILS = [
    {
      id: "ecartement-plots",
      titre: "Écartement des plots (demi-fond)",
      description:
        "Calcule la distance entre deux plots pour que 1 km/h corresponde à 1 plot selon la durée du demi-fond.",
      icone: "📐",
      href: "outils/ecartement-plots.html",
      categorie: "Course à pied",
    },
    {
      id: "convertisseur-allure",
      titre: "Convertisseur km/h ↔ min/km",
      description:
        "Passez de la vitesse à l’allure, ou l’inverse, avec des champs dédiés et mise à jour automatique.",
      icone: "⏱️",
      href: "outils/convertisseur-allure.html",
      categorie: "Course à pied",
    },
    {
      id: "vitesse-course",
      titre: "Vitesse de course",
      description:
        "Calculez la vitesse (km/h, m/s) et l’allure (min/km) à partir d’une distance et d’un temps.",
      icone: "🏃",
      href: "outils/vitesse-course.html",
      categorie: "Course à pied",
    },
    {
      id: "timer-hiit-tabata",
      titre: "Timer HIIT / Tabata",
      description:
        "Travail / pause en boucle, raccourcis Tabata et HIIT, bips et décompte au départ.",
      icone: "⏱️",
      href: "outils/timer-hiit-tabata.html",
      categorie: "Course à pied",
    },
    {
      id: "dispenses-eps",
      titre: "Dispenses EPS",
      description:
        "Enregistrez et suivez les dispenses (local), avec filtres, photo et dates de fin calculées.",
      icone: "📋",
      href: "outils/dispenses-eps.html",
      categorie: "Gestion de classe",
    },
    {
      id: "championnat-poule",
      titre: "Championnat à poule unique",
      description:
        "Créer un championnat, gérer les équipes, saisir les résultats et afficher le classement.",
      icone: "🏆",
      href: "outils/championnat-poule.html",
      categorie: "Organisation EPS",
    },
    {
      id: "composition-equipes",
      titre: "Composition d’équipes homogènes",
      description:
        "Liste prénom ou nom (optionnel ;niveau 1–5), boutons pour ajuster les niveaux, équipes équilibrées et déplacements.",
      icone: "⚖️",
      href: "outils/composition-equipes.html",
      categorie: "Organisation EPS",
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
      var hay = normalise([o.titre, o.description, o.categorie, o.id].join(" "));
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
    var sorted = trierAvecFavoris(liste, favoris);

    sorted.forEach(function (o) {
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
      listEl.appendChild(li);
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
})();
