(function () {
  "use strict";

  var CATALOG_URL = "../shared/evaluation-rubrics-catalog.json";
  var rubrics = [];

  var statusEl = document.getElementById("eval-catalog-status");
  var searchEl = document.getElementById("eval-catalog-search");
  var cycleEl = document.getElementById("eval-catalog-cycle");
  var sortEl = document.getElementById("eval-catalog-sort");
  var countEl = document.getElementById("eval-catalog-count");
  var emptyEl = document.getElementById("eval-catalog-empty");
  var listEl = document.getElementById("eval-catalog-list");

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cycleLabel(cycle) {
    var c = norm(cycle);
    if (c === "3" || c === "cycle 3") return "Cycle 3";
    if (c === "4" || c === "cycle 4") return "Cycle 4";
    if (c === "lycee" || c === "lycée") return "Lycée";
    return cycle || "";
  }

  function isSupabaseGridId(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(id || "")
    );
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  function normalizeRubric(r) {
    r = r && typeof r === "object" ? r : {};
    var gridId = r.catalogGridId || r.id || "";
    return {
      id: gridId,
      catalogGridId: gridId,
      title: r.title || "Grille sans titre",
      apsa: r.apsa || r.activity || "",
      cycle: r.cycle || "",
      niveau: r.niveau || r.level || "",
      author: r.author || r.author_name || "",
      updatedAt: r.updatedAt || r.updated_at || "",
      levels: Array.isArray(r.levels) ? r.levels : [],
      items: Array.isArray(r.items) ? r.items : [],
      upvotes: Number(r.upvotes != null ? r.upvotes : 0),
      downvotes: Number(r.downvotes != null ? r.downvotes : 0),
      status: r.status || "published",
      canVote: isSupabaseGridId(r.catalogGridId || r.id),
    };
  }

  function voteWeight(r) {
    return r.upvotes - r.downvotes * 0.5;
  }

  function filteredRubrics() {
    var q = norm(searchEl ? searchEl.value : "");
    var cycle = cycleEl ? cycleEl.value : "";
    var list = rubrics.filter(function (r) {
      if (r.status && r.status !== "published") return false;
      if (cycle && norm(r.cycle) !== cycle) return false;
      if (!q) return true;
      var hay = norm([r.title, r.apsa, r.niveau, cycleLabel(r.cycle), r.author].join(" "));
      return hay.indexOf(q) !== -1;
    });
    var sort = sortEl ? sortEl.value : "votes";
    list.sort(function (a, b) {
      if (sort === "title") return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
      if (sort === "recent") return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      return voteWeight(b) - voteWeight(a) || a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    });
    return list;
  }

  function updateCardVotes(card, r) {
    var upEl = card.querySelector("[data-vote-up-count]");
    var downEl = card.querySelector("[data-vote-down-count]");
    if (upEl) upEl.textContent = String(r.upvotes);
    if (downEl) downEl.textContent = String(r.downvotes);
    var upBtn = card.querySelector("[data-vote-up]");
    var downBtn = card.querySelector("[data-vote-down]");
    var local =
      window.OutilsEPS &&
      window.OutilsEPS.catalog &&
      window.OutilsEPS.catalog.getLocalVoteForGrid
        ? window.OutilsEPS.catalog.getLocalVoteForGrid(r.id)
        : null;
    if (upBtn) upBtn.classList.toggle("is-active", local === "up");
    if (downBtn) downBtn.classList.toggle("is-active", local === "down");
  }

  function onVoteClick(r, card, voteType) {
    if (
      !r.canVote ||
      !window.OutilsEPS ||
      !window.OutilsEPS.catalog ||
      !window.OutilsEPS.catalog.voteCatalogGrid
    ) {
      setStatus("warn", "Les votes en ligne nécessitent Supabase et une grille publiée.");
      return;
    }
    window.OutilsEPS.catalog
      .voteCatalogGrid(r.catalogGridId, voteType)
      .then(function (result) {
        if (!result) return;
        r.upvotes = Number(result.upvotes || 0);
        r.downvotes = Number(result.downvotes || 0);
        if (result.status === "archived") {
          rubrics = rubrics.filter(function (item) {
            return item.id !== r.id;
          });
          if (card.parentNode) card.parentNode.removeChild(card);
          render();
          setStatus("info", "Cette grille a été retirée du catalogue (avis négatifs).");
          return;
        }
        updateCardVotes(card, r);
      })
      .catch(function (err) {
        setStatus("error", (err && err.message) || "Vote impossible.");
      });
  }

  function renderRubric(r) {
    var card = document.createElement("article");
    card.className = "eval-catalog-card";
    card.dataset.gridId = r.id;

    var top = document.createElement("div");
    top.className = "eval-catalog-card__top";
    var title = document.createElement("h2");
    title.textContent = r.title;
    var meta = document.createElement("span");
    meta.className = "eval-catalog-card__badge";
    meta.textContent = cycleLabel(r.cycle);
    top.appendChild(title);
    top.appendChild(meta);
    card.appendChild(top);

    var info = document.createElement("p");
    info.className = "eval-catalog-card__meta";
    var dateStr = formatDate(r.updatedAt);
    info.textContent = [r.apsa, r.niveau, r.author ? "par " + r.author : "", dateStr]
      .filter(Boolean)
      .join(" · ");
    card.appendChild(info);

    var votes = document.createElement("p");
    votes.className = "eval-catalog-card__votes";
    votes.innerHTML =
      '<span class="eval-catalog-votes__counts">' +
      '<span aria-hidden="true">👍</span> <span data-vote-up-count>' +
      r.upvotes +
      '</span> · <span aria-hidden="true">👎</span> <span data-vote-down-count>' +
      r.downvotes +
      "</span></span>";
    card.appendChild(votes);

    var detail = document.createElement("p");
    detail.className = "eval-catalog-card__detail";
    detail.textContent = r.items.length + " items · " + r.levels.length + " niveaux";
    card.appendChild(detail);

    var sample = document.createElement("ul");
    sample.className = "eval-catalog-card__items";
    r.items.slice(0, 3).forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item.label || "Item";
      sample.appendChild(li);
    });
    card.appendChild(sample);

    var actions = document.createElement("div");
    actions.className = "eval-catalog-card__actions eval-catalog-card__actions--votes";
    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "btn btn--ghost btn--small eval-catalog-vote-btn";
    upBtn.setAttribute("data-vote-up", "");
    upBtn.textContent = "Utile";
    var downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "btn btn--ghost btn--small eval-catalog-vote-btn";
    downBtn.setAttribute("data-vote-down", "");
    downBtn.textContent = "Pas utile";
    if (!r.canVote) {
      upBtn.disabled = true;
      downBtn.disabled = true;
    }
    upBtn.addEventListener("click", function () {
      onVoteClick(r, card, "up");
    });
    downBtn.addEventListener("click", function () {
      onVoteClick(r, card, "down");
    });
    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    card.appendChild(actions);
    updateCardVotes(card, r);
    return card;
  }

  function render() {
    if (!listEl) return;
    var list = filteredRubrics();
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = list.length > 0;
    if (countEl) {
      countEl.textContent =
        list.length + " grille" + (list.length > 1 ? "s" : "") + " affichée" + (list.length > 1 ? "s" : "");
    }
    list.forEach(function (r) {
      listEl.appendChild(renderRubric(r));
    });
  }

  function setStatus(kind, text) {
    if (!statusEl) return;
    statusEl.className = "eval-catalog-status eval-catalog-status--" + kind;
    statusEl.textContent = text;
  }

  function loadCatalog() {
    if (navigator && navigator.onLine === false) {
      setStatus("error", "Catalogue non disponible hors ligne. Cette page nécessite une connexion.");
      render();
      return;
    }
    setStatus("warn", "Chargement du catalogue...");
    var loader =
      window.OutilsEPS &&
      window.OutilsEPS.catalog &&
      window.OutilsEPS.catalog.loadCatalogWithLegacyFallback
        ? window.OutilsEPS.catalog.loadCatalogWithLegacyFallback(CATALOG_URL)
        : fetch(CATALOG_URL, { cache: "no-store" })
            .then(function (res) {
              if (!res.ok) throw new Error("catalog");
              return res.json();
            })
            .then(function (data) {
              return Array.isArray(data) ? data : data.rubrics || [];
            });

    loader
      .then(function (list) {
        rubrics = (list || []).map(normalizeRubric).filter(function (r) {
          return !r.status || r.status === "published";
        });
        if (window.OutilsEPS && window.OutilsEPS.isSupabaseConfigured && window.OutilsEPS.isSupabaseConfigured()) {
          setStatus("ok", "Catalogue collaboratif chargé. Un vote par navigateur et par grille.");
        } else if (rubrics.length) {
          setStatus("ok", "Catalogue chargé (mode lecture). Configurez Supabase pour les votes et les propositions.");
        } else {
          setStatus("warn", "Catalogue vide ou non configuré.");
        }
        render();
      })
      .catch(function () {
        rubrics = [];
        setStatus("error", "Impossible de charger le catalogue en ligne. Connexion nécessaire.");
        render();
      });
  }

  [searchEl, cycleEl, sortEl].forEach(function (el) {
    if (el) el.addEventListener("input", render);
    if (el) el.addEventListener("change", render);
  });

  window.addEventListener("online", loadCatalog);
  window.addEventListener("offline", function () {
    setStatus("error", "Catalogue non disponible hors ligne. Cette page nécessite une connexion.");
  });

  var propose = document.createElement("a");
  propose.className = "btn btn--primary eval-catalog-propose";
  propose.href = "grilles-evaluation.html";
  propose.textContent = "Proposer une grille";
  var toolbar = document.querySelector(".eval-catalog-toolbar");
  if (toolbar) toolbar.appendChild(propose);

  loadCatalog();
})();
