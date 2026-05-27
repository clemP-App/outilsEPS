/**
 * Ressources EPS — liens officiels + ressources personnelles + favoris.
 */
(function () {
  "use strict";

  var FAVORIS_KEY = "outils_eps_ressources_favoris_v1";
  var CUSTOM_KEY = "outils_eps_ressources_custom_v1";
  var LEGACY_FAVORIS_KEY = "outils_eps_textes_officiels_favoris_v1";

  var state = {
    groups: [],
    builtIn: [],
    custom: [],
    favoris: [],
    query: "",
  };

  var els = {};

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      var data = raw ? JSON.parse(raw) : fallback;
      return Array.isArray(data) ? data : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function migrateLegacyFavoris() {
    if (loadJson(FAVORIS_KEY, []).length) return;
    var legacy = loadJson(LEGACY_FAVORIS_KEY, []);
    if (!legacy.length) return;
    var ids = legacy.map(function (f) {
      return typeof f === "string" ? f : f.id;
    });
    saveJson(FAVORIS_KEY, ids.filter(Boolean));
  }

  function loadBuiltIn() {
    var data = window.RESSOURCES_EPS_DATA;
    if (!data) return;
    state.groups = Array.isArray(data.groups) ? data.groups : [];
    state.builtIn = Array.isArray(data.resources) ? data.resources.slice() : [];
  }

  function loadCustom() {
    state.custom = loadJson(CUSTOM_KEY, []);
  }

  function loadFavoris() {
    migrateLegacyFavoris();
    state.favoris = loadJson(FAVORIS_KEY, []);
  }

  function saveFavoris() {
    saveJson(FAVORIS_KEY, state.favoris);
  }

  function saveCustom() {
    saveJson(CUSTOM_KEY, state.custom);
  }

  function allResources() {
    return state.builtIn.concat(state.custom);
  }

  function getResource(id) {
    return allResources().find(function (r) {
      return r.id === id;
    });
  }

  function isFavori(id) {
    return state.favoris.indexOf(id) >= 0;
  }

  function toggleFavori(id) {
    var i = state.favoris.indexOf(id);
    if (i >= 0) state.favoris.splice(i, 1);
    else state.favoris.push(id);
    saveFavoris();
    render();
  }

  function groupFor(resource) {
    return state.groups.find(function (g) {
      return g.id === resource.groupId;
    });
  }

  function matchesQuery(r, q) {
    if (!q) return true;
    var g = groupFor(r);
    var hay = normalize(
      [r.title, r.source, r.note, g && g.title, g && g.subtitle].join(" ")
    );
    return hay.indexOf(normalize(q)) >= 0;
  }

  function filteredResources() {
    return allResources().filter(function (r) {
      return matchesQuery(r, state.query);
    });
  }

  function sourceInitial(source) {
    var s = String(source || "?").trim();
    return s.charAt(0).toUpperCase();
  }

  function openLink(url) {
    if (!navigator.onLine) {
      window.alert("Connexion Internet requise pour ouvrir ce lien.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function createFavButton(resource) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reps-tile__fav";
    var on = isFavori(resource.id);
    btn.classList.toggle("reps-tile__fav--on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Retirer des favoris" : "Ajouter aux favoris");
    btn.innerHTML = on ? "★" : "☆";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFavori(resource.id);
    });
    return btn;
  }

  function createTile(resource, opts) {
    opts = opts || {};
    var g = groupFor(resource);
    var isCustom = resource.custom === true;

    var tile = document.createElement("article");
    tile.className = "reps-tile";
    if (opts.compact) tile.classList.add("reps-tile--compact");
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", resource.title + " — ouvrir");

    var accent = (g && g.accent) || "#0d9488";
    tile.style.setProperty("--reps-accent", accent);

    var avatar = document.createElement("span");
    avatar.className = "reps-tile__avatar";
    avatar.textContent = sourceInitial(resource.source);
    avatar.setAttribute("aria-hidden", "true");

    var body = document.createElement("div");
    body.className = "reps-tile__body";

    var title = document.createElement("h3");
    title.className = "reps-tile__title";
    title.textContent = resource.title;

    var meta = document.createElement("p");
    meta.className = "reps-tile__meta";
    meta.textContent = resource.source || (isCustom ? "Lien personnel" : "");

    body.appendChild(title);
    if (resource.note) {
      var note = document.createElement("p");
      note.className = "reps-tile__note";
      note.textContent = resource.note;
      body.appendChild(note);
    }
    body.appendChild(meta);

    var arrow = document.createElement("span");
    arrow.className = "reps-tile__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    tile.appendChild(avatar);
    tile.appendChild(body);
    tile.appendChild(createFavButton(resource));
    tile.appendChild(arrow);

    function activate() {
      openLink(resource.url);
    }

    tile.addEventListener("click", function (e) {
      if (e.target.closest(".reps-tile__fav")) return;
      activate();
    });
    tile.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    if (isCustom) {
      var del = document.createElement("button");
      del.type = "button";
      del.className = "reps-tile__delete";
      del.setAttribute("aria-label", "Supprimer cette ressource");
      del.textContent = "×";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!window.confirm("Supprimer cette ressource personnelle ?")) return;
        state.custom = state.custom.filter(function (r) {
          return r.id !== resource.id;
        });
        state.favoris = state.favoris.filter(function (id) {
          return id !== resource.id;
        });
        saveCustom();
        saveFavoris();
        render();
      });
      tile.appendChild(del);
    }

    return tile;
  }

  function renderFavoris(filtered) {
    var favResources = state.favoris
      .map(getResource)
      .filter(Boolean)
      .filter(function (r) {
        return !filtered || matchesQuery(r, state.query);
      });

    els.favorisSection.hidden = favResources.length === 0;
    els.favorisGrid.innerHTML = "";
    favResources.forEach(function (r) {
      var wrap = createTile(r, { compact: true });
      els.favorisGrid.appendChild(wrap);
    });
  }

  function renderGroups() {
    var filtered = filteredResources();
    var byGroup = Object.create(null);

    filtered.forEach(function (r) {
      var gid = r.groupId || "perso";
      if (!byGroup[gid]) byGroup[gid] = [];
      byGroup[gid].push(r);
    });

    els.main.innerHTML = "";
    var any = false;

    state.groups.forEach(function (g) {
      var items = byGroup[g.id];
      if (!items || !items.length) return;
      any = true;

      var section = document.createElement("section");
      section.className = "reps-group";
      section.style.setProperty("--reps-group-accent", g.accent || "#0d9488");

      var head = document.createElement("header");
      head.className = "reps-group__head";
      head.innerHTML =
        '<span class="reps-group__icon" aria-hidden="true">' +
        escapeHtml(g.icon || "📁") +
        "</span>" +
        '<div class="reps-group__titles">' +
        "<h2>" +
        escapeHtml(g.title) +
        "</h2>" +
        (g.subtitle ? "<p>" + escapeHtml(g.subtitle) + "</p>" : "") +
        "</div>";

      var grid = document.createElement("div");
      grid.className = "reps-tiles";
      items.forEach(function (r) {
        grid.appendChild(createTile(r));
      });

      section.appendChild(head);
      section.appendChild(grid);
      els.main.appendChild(section);
    });

    els.empty.hidden = any;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    renderFavoris(true);
    renderGroups();
    updateOffline();
  }

  function updateOffline() {
    els.offline.hidden = navigator.onLine;
  }

  function addCustomResource(title, url, note) {
    var id = "custom-" + Date.now().toString(36);
    state.custom.push({
      id: id,
      groupId: "perso",
      title: title.trim(),
      url: url.trim(),
      source: "Personnel",
      note: note ? note.trim() : "",
      custom: true,
    });
    saveCustom();
    render();
  }

  function bindAddDialog() {
    els.btnAdd.addEventListener("click", function () {
      els.formAdd.reset();
      els.addError.hidden = true;
      els.dialogAdd.showModal();
      setTimeout(function () {
        document.getElementById("reps-add-title").focus();
      }, 50);
    });

    els.addCancel.addEventListener("click", function () {
      els.dialogAdd.close();
    });

    els.formAdd.addEventListener("submit", function (e) {
      e.preventDefault();
      var title = document.getElementById("reps-add-title").value.trim();
      var url = document.getElementById("reps-add-url").value.trim();
      var note = document.getElementById("reps-add-note").value.trim();

      if (!title) {
        els.addError.textContent = "Indiquez un titre.";
        els.addError.hidden = false;
        return;
      }
      if (!/^https?:\/\//i.test(url)) {
        els.addError.textContent = "L’adresse doit commencer par http:// ou https://";
        els.addError.hidden = false;
        return;
      }

      addCustomResource(title, url, note);
      els.dialogAdd.close();
    });
  }

  function cacheDom() {
    els.search = document.getElementById("reps-search-input");
    els.offline = document.getElementById("reps-offline");
    els.favorisSection = document.getElementById("reps-favoris");
    els.favorisGrid = document.getElementById("reps-favoris-grid");
    els.main = document.getElementById("reps-main");
    els.empty = document.getElementById("reps-empty");
    els.btnAdd = document.getElementById("reps-btn-add");
    els.dialogAdd = document.getElementById("dialog-reps-add");
    els.formAdd = document.getElementById("form-reps-add");
    els.addCancel = document.getElementById("reps-add-cancel");
    els.addError = document.getElementById("reps-add-error");
  }

  function init() {
    cacheDom();
    loadBuiltIn();
    loadCustom();
    loadFavoris();

    els.search.addEventListener("input", function () {
      state.query = els.search.value.trim();
      render();
    });

    bindAddDialog();
    window.addEventListener("online", updateOffline);
    window.addEventListener("offline", updateOffline);

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
