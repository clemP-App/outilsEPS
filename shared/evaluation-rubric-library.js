/**
 * Bibliothèque personnelle de grilles (IndexedDB) + aperçu lecture seule.
 */
(function (global) {
  "use strict";

  var ns = global.OutilsEPS || (global.OutilsEPS = {});
  var lib = ns.rubricLibrary || (ns.rubricLibrary = {});
  var PARAM_ID = "tableau-suivi-rubriques-v1";
  var MAX_NOTE = 20;
  var COLORS = ["#fb7185", "#fdba74", "#fde68a", "#bbf7d0", "#bfdbfe", "#ddd6fe"];

  function nowIso() {
    return new Date().toISOString();
  }

  function id(prefix) {
    if (global.crypto && crypto.randomUUID) return prefix + "_" + crypto.randomUUID();
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function cleanName(s) {
    return String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatPointsDisplay(val) {
    if (val === null || val === undefined || val === "" || isNaN(val)) return "—";
    var n = Number(val);
    var s = n.toFixed(1);
    if (s.indexOf(".0") === s.length - 2) s = String(Math.round(n));
    return s.replace(".", ",") + " pt";
  }

  function normalizeCycle(cycle) {
    var c = cleanName(cycle).toLowerCase();
    if (c === "3" || c === "cycle 3") return "3";
    if (c === "4" || c === "cycle 4") return "4";
    if (c === "lycee" || c === "lycée") return "lycee";
    return c || "4";
  }

  lib.normalizeRubric = function (rubric) {
    var r = rubric && typeof rubric === "object" ? clone(rubric) : {};
    var gridData = r.grid_data && typeof r.grid_data === "object" ? r.grid_data : null;
    if (gridData) {
      r = Object.assign({}, gridData, {
        title: r.title || gridData.title,
        apsa: r.activity || r.apsa || gridData.apsa,
        niveau: r.level || r.niveau || gridData.niveau,
        cycle: gridData.cycle || r.cycle,
        author: r.author_name || r.author || gridData.author,
      });
    }
    r.id = r.id || id("rubric");
    r.title = cleanName(r.title || r.label || "Grille d'évaluation");
    r.apsa = cleanName(r.apsa || r.activity || "");
    r.cycle = normalizeCycle(r.cycle);
    r.niveau = cleanName(r.niveau || r.level || "");
    r.source = "local";
    r.author = cleanName(r.author || r.auteur || "");
    r.createdAt = r.createdAt || nowIso();
    r.updatedAt = r.updatedAt || r.createdAt;
    r.max = MAX_NOTE;
    r.levels = Array.isArray(r.levels) ? clone(r.levels) : [];
    if (!r.levels.length) {
      r.levels = [
        { id: "l1", label: "Insuffisant", color: COLORS[0] },
        { id: "l2", label: "Fragile", color: COLORS[1] },
        { id: "l3", label: "Satisfaisant", color: COLORS[2] },
        { id: "l4", label: "Excellent", color: COLORS[3] },
      ];
    }
    r.items = Array.isArray(r.items) ? clone(r.items) : [];
    return r;
  };

  /** Aperçu lecture seule dans un conteneur. */
  lib.renderRubricPreview = function (container, rubric, options) {
    options = options || {};
    if (!container) return;
    var r = lib.normalizeRubric(rubric);
    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "tab-suivi-rubric-grid-wrap eval-rubric-preview-wrap";
    var table = document.createElement("table");
    table.className = "tab-suivi-rubric-grid eval-rubric-preview-grid";
    var thead = document.createElement("thead");
    var head = document.createElement("tr");
    var corner = document.createElement("th");
    corner.textContent = options.cornerLabel || r.title || "Items";
    head.appendChild(corner);
    r.levels.forEach(function (level) {
      var th = document.createElement("th");
      th.textContent = level.label;
      if (level.color) th.style.setProperty("--rubric-level", level.color);
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    r.items.forEach(function (item) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = item.label;
      tr.appendChild(th);
      r.levels.forEach(function (level, index) {
        var td = document.createElement("td");
        var cell = item.cells && item.cells[index] ? item.cells[index] : {};
        var text = cleanName(cell.text || level.label || "");
        var pts = cell.points != null ? cell.points : index;
        var block = document.createElement("div");
        block.className = "tab-suivi-rubric-option tab-suivi-rubric-option--readonly";
        if (level.color) block.style.setProperty("--rubric-level", level.color);
        var textSpan = document.createElement("span");
        textSpan.className = "tab-suivi-rubric-option__text";
        textSpan.textContent = text || "—";
        var ptsSpan = document.createElement("span");
        ptsSpan.className = "tab-suivi-rubric-option__points";
        ptsSpan.textContent = formatPointsDisplay(pts);
        block.appendChild(textSpan);
        block.appendChild(ptsSpan);
        td.appendChild(block);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  };

  lib.importRubricToLibrary = function (rubric, options) {
    options = options || {};
    if (typeof DataManager === "undefined" || !DataManager.getParametre || !DataManager.saveParametre) {
      return Promise.reject(new Error("Stockage local indisponible."));
    }
    var incoming = lib.normalizeRubric(rubric);
    incoming.id = id("rubric");
    incoming.source = "local";
    incoming.importedFromCatalog = true;
    incoming.catalogSourceId = options.catalogSourceId || rubric.catalogGridId || rubric.id || "";
    incoming.createdAt = nowIso();
    incoming.updatedAt = incoming.createdAt;
    if (options.titleSuffix !== false) {
      var suffix = options.titleSuffix || "";
      if (!suffix && incoming.title.indexOf("(catalogue)") === -1) {
        incoming.title = cleanName(incoming.title + " (catalogue)");
      } else if (suffix) {
        incoming.title = cleanName(incoming.title + " " + suffix);
      }
    }

    return DataManager.ready
      .then(function () {
        return DataManager.getParametre(PARAM_ID);
      })
      .then(function (rec) {
        var list = rec && Array.isArray(rec.rubrics) ? rec.rubrics.map(lib.normalizeRubric) : [];
        if (incoming.catalogSourceId) {
          var dup = list.filter(function (item) {
            return item.catalogSourceId === incoming.catalogSourceId;
          })[0];
          if (dup) {
            var err = new Error("Cette grille est déjà dans votre bibliothèque.");
            err.duplicate = true;
            err.existingId = dup.id;
            throw err;
          }
        }
        list.push(incoming);
        return DataManager.saveParametre({
          id: PARAM_ID,
          rubrics: list,
          updatedAt: nowIso(),
        }).then(function () {
          return { rubric: incoming, count: list.length };
        });
      });
  };

  lib.PARAM_ID = PARAM_ID;
})(typeof window !== "undefined" ? window : global);
