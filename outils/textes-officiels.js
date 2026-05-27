/**
 * Textes Officiels EPS — répertoire de liens officiels (sans contenu réglementaire inventé).
 * Données : textes-officiels-resources.json (source) → textes-officiels-resources.js (chargé par script)
 */
(function () {
  "use strict";

  var FAVORIS_KEY = "outils_eps_textes_officiels_favoris_v1";
  var DATA_URL = "textes-officiels-resources.json";
  var DATA_GLOBAL = "TEXTES_OFFICIELS_EPS_DATA";
  var PLACEHOLDER_URL = "LIEN_OFFICIEL_A_COMPLETER";

  var CATEGORIES = [
    {
      id: "programmes",
      label: "Programmes EPS",
      icon: "📘",
      match: "Programmes EPS",
      filterTag: "eduscol",
    },
    {
      id: "referentiels",
      label: "Référentiels et examens",
      icon: "🎓",
      match: "Référentiels et examens",
      filterTag: "examens",
    },
    {
      id: "socle",
      label: "Socle commun et compétences",
      icon: "🧭",
      match: "Socle commun et compétences",
      filterTag: "eduscol",
    },
    {
      id: "eduscol",
      label: "Ressources Eduscol",
      icon: "📚",
      match: "Ressources Eduscol",
      filterTag: "eduscol",
    },
    {
      id: "unss",
      label: "UNSS",
      icon: "🏅",
      match: "UNSS",
      filterTag: "UNSS",
    },
    {
      id: "securite",
      label: "Sécurité et réglementation",
      icon: "🛡️",
      match: "Sécurité et réglementation",
      filterTag: "sécurité",
    },
    {
      id: "concours",
      label: "Concours et formation",
      icon: "🎯",
      match: "Concours et formation",
      filterTag: "concours",
    },
  ];

  var FILTER_CHIPS = [
    { id: "college", label: "Collège", match: function (r) { return tagMatch(r, "collège") || levelMatch(r, "Collège"); } },
    { id: "lycee", label: "Lycée", match: function (r) { return tagMatch(r, "lycée") || levelMatch(r, "Lycée"); } },
    {
      id: "lycee-pro",
      label: "Lycée professionnel",
      match: function (r) {
        return tagMatch(r, "lycée professionnel") || levelMatch(r, "Lycée professionnel");
      },
    },
    { id: "examens", label: "Examens", match: function (r) { return tagMatch(r, "examens"); } },
    { id: "unss", label: "UNSS", match: function (r) { return tagMatch(r, "UNSS") || r.category === "UNSS"; } },
    { id: "securite", label: "Sécurité", match: function (r) { return tagMatch(r, "sécurité") || r.category === "Sécurité et réglementation"; } },
    { id: "concours", label: "Concours", match: function (r) { return tagMatch(r, "concours") || r.category === "Concours et formation"; } },
    { id: "eduscol", label: "Eduscol", match: function (r) { return sourceMatch(r, "Eduscol") || tagMatch(r, "eduscol"); } },
    { id: "bo", label: "Bulletin officiel", match: function (r) { return sourceMatch(r, "Bulletin officiel") || tagMatch(r, "bulletin officiel"); } },
    { id: "ministere", label: "Ministère", match: function (r) { return sourceMatch(r, "Ministère") || tagMatch(r, "ministère"); } },
    { id: "academie", label: "Académie", match: function (r) { return sourceMatch(r, "Académie") || tagMatch(r, "académie"); } },
  ];

  var state = {
    resources: [],
    query: "",
    activeCategory: null,
    activeFilters: Object.create(null),
    favoris: loadFavoris(),
  };

  var els = {};

  function tagMatch(r, needle) {
    return (r.tags || []).some(function (t) {
      return String(t).toLowerCase().indexOf(needle.toLowerCase()) >= 0;
    });
  }

  function levelMatch(r, level) {
    return String(r.level || "").toLowerCase() === level.toLowerCase();
  }

  function sourceMatch(r, source) {
    return String(r.source || "").toLowerCase() === source.toLowerCase();
  }

  function loadFavoris() {
    try {
      var raw = localStorage.getItem(FAVORIS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavoris() {
    try {
      localStorage.setItem(FAVORIS_KEY, JSON.stringify(state.favoris));
    } catch (e) {}
  }

  function isFavori(id) {
    return state.favoris.some(function (f) {
      return f.id === id;
    });
  }

  function urlIsReady(url) {
    return url && url !== PLACEHOLDER_URL;
  }

  /** @returns {HTMLElement} */
  function createLastCheckedBadge(verifiedAt) {
    var span = document.createElement("span");
    span.className = "toeps-badge";
    if (!verifiedAt) {
      span.classList.add("toeps-badge--pending");
      span.textContent = "Lien non vérifié";
    } else {
      span.classList.add("toeps-badge--ok");
      span.textContent = "Vérifié le " + formatDateFr(verifiedAt);
    }
    return span;
  }

  function formatDateFr(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  /** @returns {HTMLButtonElement} */
  function createFavoriteButton(resource) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--small toeps-btn-fav";
    var on = isFavori(resource.id);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Retirer des favoris" : "Ajouter aux favoris";
    btn.addEventListener("click", function () {
      toggleFavori(resource);
      renderAll();
    });
    return btn;
  }

  function toggleFavori(resource) {
    var idx = state.favoris.findIndex(function (f) {
      return f.id === resource.id;
    });
    if (idx >= 0) {
      state.favoris.splice(idx, 1);
    } else {
      state.favoris.push({
        id: resource.id,
        title: resource.title,
        category: resource.category,
        level: resource.level,
        source: resource.source,
        url: resource.url,
        verifiedAt: resource.verifiedAt || null,
      });
    }
    saveFavoris();
  }

  /** @returns {HTMLElement} */
  function createResourceCard(resource, opts) {
    opts = opts || {};
    var li = document.createElement("article");
    li.className = "toeps-card";
    li.setAttribute("role", "listitem");
    li.dataset.id = resource.id;

    var head = document.createElement("div");
    head.className = "toeps-card__head";
    var h3 = document.createElement("h3");
    h3.className = "toeps-card__title";
    h3.textContent = resource.title;
    head.appendChild(h3);
    head.appendChild(createLastCheckedBadge(resource.verifiedAt));
    li.appendChild(head);

    var meta = document.createElement("dl");
    meta.className = "toeps-card__meta";
    appendMeta(meta, "Catégorie", resource.category + (resource.subsection ? " — " + resource.subsection : ""));
    appendMeta(meta, "Niveau", resource.level || "—");
    appendMeta(meta, "Source", resource.source || "—");
    li.appendChild(meta);

    if (resource.description) {
      var desc = document.createElement("p");
      desc.className = "toeps-card__desc hint";
      desc.textContent = resource.description;
      li.appendChild(desc);
    }

    var actions = document.createElement("div");
    actions.className = "toeps-card__actions";

    if (urlIsReady(resource.url)) {
      var open = document.createElement("a");
      open.className = "btn btn--primary btn--small";
      open.href = resource.url;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "Ouvrir la ressource";
      if (!navigator.onLine) {
        open.addEventListener("click", function (e) {
          e.preventDefault();
          window.alert("Connexion Internet requise pour ouvrir ce lien.");
        });
      }
      actions.appendChild(open);
    } else {
      var pending = document.createElement("span");
      pending.className = "toeps-card__pending";
      pending.textContent = "Lien officiel à compléter dans resources.json";
      actions.appendChild(pending);
    }

    if (!opts.hideFav) {
      actions.appendChild(createFavoriteButton(resource));
    }

    li.appendChild(actions);
    return li;
  }

  function appendMeta(dl, label, value) {
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  /** @returns {HTMLElement} */
  function createResourceList(resources, opts) {
    var wrap = document.createDocumentFragment();
    if (!resources.length) {
      var empty = document.createElement("p");
      empty.className = "hint toeps-empty";
      empty.textContent = opts && opts.emptyText ? opts.emptyText : "Aucune ressource à afficher.";
      wrap.appendChild(empty);
      return wrap;
    }
    resources.forEach(function (r) {
      wrap.appendChild(createResourceCard(r, opts));
    });
    return wrap;
  }

  /** @returns {HTMLElement} */
  function createSearchBar(onInput) {
    var wrap = document.createElement("div");
    wrap.className = "toeps-search card";

    var label = document.createElement("label");
    label.className = "field-label";
    label.setAttribute("for", "toeps-search-input");
    label.textContent = "Rechercher une ressource";

    var input = document.createElement("input");
    input.type = "search";
    input.id = "toeps-search-input";
    input.className = "toeps-search__input";
    input.placeholder = "Mot-clé, niveau, catégorie, source…";
    input.autocomplete = "off";
    input.addEventListener("input", function () {
      onInput(input.value.trim());
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    return wrap;
  }

  /** @returns {HTMLElement} */
  function createCategoryGrid(onSelect) {
    var grid = document.createElement("div");
    grid.className = "toeps-category-grid";
    CATEGORIES.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toeps-category-btn";
      if (state.activeCategory === cat.match) {
        btn.classList.add("toeps-category-btn--active");
      }
      btn.innerHTML =
        '<span class="toeps-category-btn__icon" aria-hidden="true">' +
        cat.icon +
        "</span><span class=\"toeps-category-btn__label\">" +
        escapeHtml(cat.label) +
        "</span>";
      btn.addEventListener("click", function () {
        onSelect(cat.match === state.activeCategory ? null : cat.match);
      });
      grid.appendChild(btn);
    });
    return grid;
  }

  /** @returns {HTMLElement} */
  function createFilterPanel(activeFilters, onToggle) {
    var panel = document.createElement("div");
    panel.className = "toeps-filter-panel card";
    var title = document.createElement("p");
    title.className = "field-label";
    title.textContent = "Filtres";
    panel.appendChild(title);

    var chips = document.createElement("div");
    chips.className = "toeps-filter-chips";
    FILTER_CHIPS.forEach(function (chip) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toeps-filter-chip";
      if (activeFilters[chip.id]) {
        btn.classList.add("toeps-filter-chip--on");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.setAttribute("aria-pressed", "false");
      }
      btn.textContent = chip.label;
      btn.addEventListener("click", function () {
        onToggle(chip.id);
      });
      chips.appendChild(btn);
    });
    panel.appendChild(chips);
    return panel;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function matchesQuery(r, q) {
    if (!q) return true;
    var hay = normalize(
      [
        r.title,
        r.category,
        r.subsection,
        r.level,
        r.source,
        r.description,
        (r.tags || []).join(" "),
      ].join(" ")
    );
    return hay.indexOf(normalize(q)) >= 0;
  }

  function matchesCategory(r, cat) {
    if (!cat) return true;
    return r.category === cat;
  }

  function matchesFilters(r) {
    var active = FILTER_CHIPS.filter(function (c) {
      return state.activeFilters[c.id];
    });
    if (!active.length) return true;
    return active.every(function (c) {
      return c.match(r);
    });
  }

  function getFilteredResources() {
    return state.resources.filter(function (r) {
      return matchesQuery(r, state.query) && matchesCategory(r, state.activeCategory) && matchesFilters(r);
    });
  }

  function getRecentResources() {
    return state.resources
      .filter(function (r) {
        return r.verifiedAt;
      })
      .sort(function (a, b) {
        return String(b.verifiedAt).localeCompare(String(a.verifiedAt));
      })
      .slice(0, 6);
  }

  function getFavoriResources() {
    return state.favoris.map(function (f) {
      var full = state.resources.find(function (r) {
        return r.id === f.id;
      });
      return full || f;
    });
  }

  function hasActiveView() {
    return (
      !!state.query ||
      !!state.activeCategory ||
      FILTER_CHIPS.some(function (c) {
        return state.activeFilters[c.id];
      })
    );
  }

  function renderFavoris() {
    var list = getFavoriResources();
    els.favorisSection.hidden = list.length === 0;
    els.favorisList.innerHTML = "";
    els.favorisList.appendChild(
      createResourceList(list, { emptyText: "Aucun favori.", hideFav: false })
    );
  }

  function renderRecent() {
    els.recentList.innerHTML = "";
    els.recentList.appendChild(createResourceList(getRecentResources(), { hideFav: false }));
  }

  function renderCategories() {
    els.categoriesMount.innerHTML = "";
    els.categoriesMount.appendChild(
      createCategoryGrid(function (cat) {
        state.activeCategory = cat;
        updateView();
      })
    );
  }

  function renderFilters() {
    var anyFilter = FILTER_CHIPS.some(function (c) {
      return state.activeFilters[c.id];
    });
    els.filtersMount.hidden = !hasActiveView() && !anyFilter;
    els.filtersMount.innerHTML = "";
    els.filtersMount.appendChild(
      createFilterPanel(state.activeFilters, function (id) {
        state.activeFilters[id] = !state.activeFilters[id];
        updateView();
      })
    );
  }

  function renderResults() {
    var filtered = getFilteredResources();
    var show = hasActiveView();
    els.resultsSection.hidden = !show;
    els.categoriesSection.hidden = show;
    els.recentSection.hidden = show;

    if (!show) return;

    els.resultsCount.textContent =
      filtered.length === 1 ? "1 ressource" : filtered.length + " ressources";
    els.resultsList.innerHTML = "";
    els.resultsList.appendChild(
      createResourceList(filtered, { emptyText: "Aucun résultat pour cette recherche." })
    );
  }

  function updateView() {
    renderFilters();
    renderCategories();
    renderResults();
    renderFavoris();
  }

  function renderAll() {
    renderFavoris();
    renderRecent();
    renderCategories();
    renderFilters();
    renderResults();
    updateOfflineBanner();
  }

  function updateOfflineBanner() {
    var offline = !navigator.onLine;
    els.offlineBanner.hidden = !offline;
    els.onlineHint.hidden = offline;
  }

  function bindInfoDialog() {
    var btn = document.getElementById("btn-info-textes-officiels");
    var dialog = document.getElementById("dialog-info-textes-officiels");
    if (btn && dialog) {
      btn.addEventListener("click", function () {
        dialog.showModal();
      });
    }
  }

  function bindClearView() {
    els.btnClearView.addEventListener("click", function () {
      state.query = "";
      state.activeCategory = null;
      state.activeFilters = Object.create(null);
      var input = document.getElementById("toeps-search-input");
      if (input) input.value = "";
      updateView();
    });
  }

  function cacheDom() {
    els.offlineBanner = document.getElementById("toeps-offline-banner");
    els.onlineHint = document.getElementById("toeps-online-hint");
    els.searchMount = document.getElementById("toeps-search-mount");
    els.filtersMount = document.getElementById("toeps-filters-mount");
    els.favorisSection = document.getElementById("toeps-section-favoris");
    els.favorisList = document.getElementById("toeps-favoris-list");
    els.recentSection = document.getElementById("toeps-section-recent");
    els.recentList = document.getElementById("toeps-recent-list");
    els.categoriesSection = document.getElementById("toeps-section-categories");
    els.categoriesMount = document.getElementById("toeps-categories-mount");
    els.resultsSection = document.getElementById("toeps-section-results");
    els.resultsList = document.getElementById("toeps-results-list");
    els.resultsCount = document.getElementById("toeps-results-count");
    els.btnClearView = document.getElementById("toeps-btn-clear-view");
  }

  function applyData(data) {
    state.resources = data && Array.isArray(data.resources) ? data.resources : [];
  }

  function loadDataFromGlobal() {
    var data = window[DATA_GLOBAL];
    if (!data) return false;
    applyData(data);
    return true;
  }

  function loadData() {
    if (loadDataFromGlobal()) {
      return Promise.resolve();
    }
    if (window.location.protocol === "file:") {
      return Promise.reject(new Error("Données non chargées (file://)"));
    }
    return fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Chargement impossible");
        return res.json();
      })
      .then(function (data) {
        applyData(data);
      });
  }

  function init() {
    cacheDom();
    bindInfoDialog();
    bindClearView();

    els.searchMount.appendChild(
      createSearchBar(function (q) {
        state.query = q;
        updateView();
      })
    );

    window.addEventListener("online", updateOfflineBanner);
    window.addEventListener("offline", updateOfflineBanner);

    loadData()
      .then(renderAll)
      .catch(function () {
        state.resources = [];
        if (!state.favoris.length) {
          els.searchMount.insertAdjacentHTML(
            "afterend",
            '<p class="msg-error" role="alert">Impossible de charger le répertoire. Vérifiez votre connexion et rechargez la page.</p>'
          );
        }
        renderAll();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
