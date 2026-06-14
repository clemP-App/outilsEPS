(function () {
  "use strict";

  var PARAM_ID = "tableau-suivi-rubriques-v1";
  var EXAMPLE_RUBRIC_ID = "local-basket-4e-exemple";
  var HANDOFF_KEY = "outils_eps_rubric_edit_handoff_v1";
  var exampleDismissed = false;
  var MAX_NOTE = 20;
  var COLORS = ["#fb7185", "#fdba74", "#fde68a", "#bbf7d0", "#bfdbfe", "#ddd6fe"];

  var localRubrics = [];
  var draft = null;
  var editingId = null;
  var columnEdit = null;
  var testValue = { selected: {}, points: 0, note: null };
  var currentTestRubric = null;

  var statusEl = document.getElementById("ge-status");
  var searchEl = document.getElementById("ge-search");
  var cycleFilterEl = document.getElementById("ge-cycle");
  var countEl = document.getElementById("ge-count");
  var emptyEl = document.getElementById("ge-empty");
  var listEl = document.getElementById("ge-list");
  var modeEl = document.getElementById("ge-editor-mode");
  var titleEl = document.getElementById("ge-title");
  var apsaEl = document.getElementById("ge-apsa");
  var cycleEl = document.getElementById("ge-cycle-edit");
  var niveauEl = document.getElementById("ge-niveau");
  var editorEl = document.getElementById("ge-editor");
  var shareEl = document.getElementById("ge-share");
  var shareWrapEl = document.getElementById("ge-share-wrap");
  var shareReasonEl = document.getElementById("ge-share-reason");
  var shareUpdateTimer = null;
  var importCsvEl = document.getElementById("ge-import-csv");
  var testDialog = document.getElementById("ge-test-dialog");
  var testTitleEl = document.getElementById("ge-test-title");
  var testMetaEl = document.getElementById("ge-test-meta");
  var testScoreEl = document.getElementById("ge-test-score");
  var testGridEl = document.getElementById("ge-test-grid");

  function nowIso() {
    return new Date().toISOString();
  }

  function id(prefix) {
    if (window.crypto && crypto.randomUUID) return prefix + "_" + crypto.randomUUID();
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function cleanName(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  function norm(s) {
    return cleanName(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function shortId(prefix, index) {
    return prefix + (index + 1);
  }

  function normalizeCycle(cycle) {
    var c = norm(cycle);
    if (c === "3" || c === "cycle 3") return "3";
    if (c === "4" || c === "cycle 4") return "4";
    if (c === "lycee" || c === "lycee general" || c === "lycée") return "lycee";
    return c || "4";
  }

  function cycleLabel(cycle) {
    var c = normalizeCycle(cycle);
    if (c === "3") return "Cycle 3";
    if (c === "4") return "Cycle 4";
    if (c === "lycee") return "Lycée";
    return c;
  }

  function normalizeRubric(rubric) {
    var r = rubric && typeof rubric === "object" ? clone(rubric) : {};
    r.id = r.id || id("rubric");
    r.title = cleanName(r.title || r.label || "Grille d'évaluation");
    r.apsa = cleanName(r.apsa || "");
    r.cycle = normalizeCycle(r.cycle);
    r.niveau = cleanName(r.niveau || "");
    r.source = r.source || "local";
    r.author = cleanName(r.author || r.auteur || "");
    r.createdAt = r.createdAt || nowIso();
    r.updatedAt = r.updatedAt || r.createdAt;
    r.rating = r.rating && typeof r.rating === "object" ? r.rating : {};
    r.rating.score = Number(r.rating.score || 0);
    r.rating.votes = Number(r.rating.votes || 0);
    r.max = MAX_NOTE;
    r.levels = Array.isArray(r.levels) ? r.levels : [];
    r.levels = r.levels
      .map(function (level, index) {
        level = level && typeof level === "object" ? level : {};
        return {
          id: level.id || shortId("l", index),
          label: cleanName(level.label || "Niveau " + (index + 1)),
          color: level.color || COLORS[index % COLORS.length],
        };
      })
      .filter(function (level) {
        return !!level.label;
      });
    if (!r.levels.length) {
      r.levels = [
        { id: "l1", label: "Insuffisant", color: COLORS[0] },
        { id: "l2", label: "Fragile", color: COLORS[1] },
        { id: "l3", label: "Satisfaisant", color: COLORS[2] },
        { id: "l4", label: "Excellent", color: COLORS[3] },
      ];
    }
    r.items = Array.isArray(r.items) ? r.items : [];
    r.items = r.items
      .map(function (item, itemIndex) {
        item = item && typeof item === "object" ? item : {};
        var cells = Array.isArray(item.cells) ? item.cells : [];
        return {
          id: item.id || shortId("i", itemIndex),
          label: cleanName(item.label || "Item " + (itemIndex + 1)),
          cells: r.levels.map(function (_, levelIndex) {
            var cell = cells[levelIndex] && typeof cells[levelIndex] === "object" ? cells[levelIndex] : {};
            var raw = cell.points == null ? levelIndex : cell.points;
            var points = parseFloat(String(raw).replace(",", "."));
            return {
              text: cleanName(cell.text || ""),
              points: !isNaN(points) ? points : levelIndex,
            };
          }),
        };
      })
      .filter(function (item) {
        return !!item.label;
      });
    if (!r.items.length) {
      r.items = [
        {
          id: "i1",
          label: "Item 1",
          cells: r.levels.map(function (_, i) {
            return { text: "", points: i };
          }),
        },
      ];
    }
    if (r.id === EXAMPLE_RUBRIC_ID) r.isExample = true;
    else if (r.isExample !== false) r.isExample = !!r.isExample;
    if (isExampleRubric(r)) {
      r.catalogVisible = false;
      r.isExample = true;
    } else {
      r.catalogVisible = !!r.catalogVisible;
    }
    return r;
  }

  function isExampleRubric(r) {
    return !!(r && (r.isExample || r.id === EXAMPLE_RUBRIC_ID));
  }

  function badgeLabel(r) {
    if (isExampleRubric(r)) return "Exemple";
    if (r.importedFromCatalog) return "Importée";
    return "Mes grilles";
  }

  function blankRubric() {
    return normalizeRubric({
      id: id("rubric"),
      title: "Nouvelle grille",
      apsa: "",
      cycle: "4",
      niveau: "",
      source: "local",
      levels: [
        { id: "l1", label: "Insuffisant", color: COLORS[0] },
        { id: "l2", label: "Fragile", color: COLORS[1] },
        { id: "l3", label: "Satisfaisant", color: COLORS[2] },
        { id: "l4", label: "Excellent", color: COLORS[3] },
      ],
      items: [
        {
          id: "i1",
          label: "Item 1",
          cells: [
            { text: "", points: 0 },
            { text: "", points: 1 },
            { text: "", points: 2 },
            { text: "", points: 3 },
          ],
        },
      ],
    });
  }

  function defaultBasketRubric() {
    return normalizeRubric({
      id: EXAMPLE_RUBRIC_ID,
      title: "Basket-ball 4e - jouer vite et juste",
      apsa: "Basket-ball",
      cycle: "4",
      niveau: "4e",
      source: "local",
      author: "Outils EPS",
      isExample: true,
      catalogVisible: false,
      levels: [
        { id: "l1", label: "A consolider", color: COLORS[0] },
        { id: "l2", label: "En progres", color: COLORS[1] },
        { id: "l3", label: "Maitrise", color: COLORS[2] },
        { id: "l4", label: "Tres maitrise", color: COLORS[3] },
      ],
      items: [
        {
          id: "i1",
          label: "Se demarquer",
          cells: [
            { text: "Reste souvent arrete ou cache par un defenseur.", points: 0 },
            { text: "Propose parfois une solution mais sans timing regulier.", points: 1 },
            { text: "Se rend disponible dans un espace utile.", points: 2 },
            { text: "Enchaine appels, replacements et aide au porteur.", points: 3 },
          ],
        },
        {
          id: "i2",
          label: "Choisir passer, dribbler ou tirer",
          cells: [
            { text: "Choix souvent precipites ou peu adaptes.", points: 0 },
            { text: "Quelques choix pertinents avec du temps.", points: 1 },
            { text: "Choisit une action adaptee a la situation.", points: 2 },
            { text: "Lit vite le jeu et cree un avantage pour l'equipe.", points: 3 },
          ],
        },
        {
          id: "i3",
          label: "Defendre",
          cells: [
            { text: "Suit peu son adversaire ou oublie le repli.", points: 0 },
            { text: "Gene par moments mais se replace tardivement.", points: 1 },
            { text: "Se replace, gene le porteur et protege le panier.", points: 2 },
            { text: "Anticipe, aide et recupere des ballons sans faute.", points: 3 },
          ],
        },
        {
          id: "i4",
          label: "Cooperer",
          cells: [
            { text: "Joue surtout seul ou se demobilise.", points: 0 },
            { text: "Participe avec des partenaires proches.", points: 1 },
            { text: "Communique et respecte l'organisation collective.", points: 2 },
            { text: "Encourage, organise et rend ses partenaires efficaces.", points: 3 },
          ],
        },
      ],
    });
  }

  function setStatus(kind, text) {
    if (!statusEl) return;
    if (!text) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.className = "ge-status";
      return;
    }
    statusEl.hidden = false;
    statusEl.className = "ge-status ge-status--" + (kind || "info");
    statusEl.textContent = text;
  }

  function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return "";
    return Math.round(Number(n) * 100) / 100 + "";
  }

  function metaText(r) {
    return [r.apsa, cycleLabel(r.cycle), r.niveau].filter(Boolean).join(" · ");
  }

  function loadLocal() {
    if (typeof DataManager === "undefined" || !DataManager.ready) {
      localRubrics = [];
      return Promise.resolve([]);
    }
    return DataManager.ready
      .then(function () {
        return DataManager.getParametre(PARAM_ID);
      })
      .then(function (rec) {
        exampleDismissed = !!(rec && rec.exampleDismissed);
        if (rec && Array.isArray(rec.rubrics)) {
          localRubrics = rec.rubrics.map(normalizeRubric);
        } else {
          exampleDismissed = false;
          localRubrics = [defaultBasketRubric()];
          return saveLocal().then(function () {
            return localRubrics;
          });
        }
        localRubrics.forEach(function (r) {
          r.source = "local";
        });
        return localRubrics;
      })
      .catch(function () {
        localRubrics = [];
        return localRubrics;
      });
  }

  function saveLocal() {
    if (typeof DataManager === "undefined" || !DataManager.saveParametre) return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_ID,
      rubrics: localRubrics.map(normalizeRubric),
      exampleDismissed: exampleDismissed,
      updatedAt: nowIso(),
    });
  }

  function cellKey(rowId, colId) {
    return rowId + ":" + colId;
  }

  function getCell(tableau, rowId, colId) {
    return tableau && tableau.cells ? tableau.cells[cellKey(rowId, colId)] : undefined;
  }

  function setCell(tableau, rowId, colId, value) {
    if (!tableau.cells) tableau.cells = {};
    var key = cellKey(rowId, colId);
    if (value === null || value === undefined || value === "") delete tableau.cells[key];
    else tableau.cells[key] = value;
  }

  function normalizeSelection(raw) {
    if (!raw || typeof raw !== "object") return { selected: {}, points: 0, note: null };
    return {
      selected: raw.selected && typeof raw.selected === "object" ? Object.assign({}, raw.selected) : {},
      points: typeof raw.points === "number" && !isNaN(raw.points) ? raw.points : 0,
      note: typeof raw.note === "number" && !isNaN(raw.note) ? raw.note : null,
    };
  }

  function recalcColumnCells(tableau, col) {
    if (!tableau || !col || !Array.isArray(tableau.rows)) return;
    tableau.rows.forEach(function (row) {
      var raw = normalizeSelection(getCell(tableau, row.id, col.id));
      if (!Object.keys(raw.selected || {}).length) {
        setCell(tableau, row.id, col.id, null);
        return;
      }
      var score = scoreRubric(col.rubric, raw);
      if (!score.selectedCount) {
        setCell(tableau, row.id, col.id, null);
      } else {
        setCell(tableau, row.id, col.id, {
          selected: score.selected,
          points: score.points,
          note: score.note,
        });
      }
    });
  }

  function updateSourceColumn(rubric) {
    if (!columnEdit || typeof DataManager === "undefined" || !DataManager.getTableauxSuivi) {
      return Promise.resolve(false);
    }
    var r = normalizeRubric(rubric);
    return DataManager.getTableauxSuivi().then(function (tables) {
      tables = Array.isArray(tables) ? tables : [];
      var updated = false;
      tables.forEach(function (tableau) {
        if (!tableau || tableau.id !== columnEdit.tableId || !Array.isArray(tableau.cols)) return;
        tableau.cols.forEach(function (col) {
          if (!col || col.id !== columnEdit.colId || col.type !== "rubric") return;
          var oldTitle = columnEdit.rubric && columnEdit.rubric.title ? columnEdit.rubric.title : "";
          var oldLabel = columnEdit.colLabel || "";
          col.rubric = r;
          col.estNote = true;
          col.max = MAX_NOTE;
          if (!col.label || col.label === oldLabel || col.label === oldTitle) col.label = r.title;
          recalcColumnCells(tableau, col);
          tableau.updatedAt = nowIso();
          updated = true;
        });
      });
      if (!updated || !DataManager.saveTableauxSuivi) return false;
      return DataManager.saveTableauxSuivi(tables).then(function () {
        return true;
      });
    });
  }

  function updateShareCatalogOption() {
    if (!shareEl || !shareWrapEl) return;
    var rubric = readEditor();
    if (isExampleRubric(rubric)) {
      shareEl.checked = false;
      shareEl.disabled = true;
      shareWrapEl.classList.add("ge-share-wrap--disabled");
      if (shareReasonEl) {
        shareReasonEl.textContent =
          "La grille exemple reste locale. Dupliquez-la pour adapter le contenu et la publier au catalogue.";
      }
      return;
    }
    var reasons = [];
    if (
      !window.OutilsEPS ||
      !window.OutilsEPS.isOnlineCatalogConfigured ||
      !window.OutilsEPS.isOnlineCatalogConfigured()
    ) {
      reasons.push("Le catalogue en ligne n'est pas configuré sur ce site.");
    } else if (
      window.OutilsEPS.catalog &&
      window.OutilsEPS.catalog.validateGridForCatalog
    ) {
      var validation = window.OutilsEPS.catalog.validateGridForCatalog(rubric);
      if (!validation.valid) reasons = validation.errors;
    }
    if (reasons.length) {
      shareEl.checked = false;
      shareEl.disabled = true;
      shareWrapEl.classList.add("ge-share-wrap--disabled");
      if (shareReasonEl) {
        shareReasonEl.textContent =
          reasons.length > 1
            ? reasons[0] + " (" + (reasons.length - 1) + " autre(s) critère(s))."
            : reasons[0];
      }
    } else {
      shareEl.disabled = false;
      shareWrapEl.classList.remove("ge-share-wrap--disabled");
      if (shareReasonEl) shareReasonEl.textContent = "";
    }
  }

  function scheduleShareCatalogUpdate() {
    if (shareUpdateTimer) clearTimeout(shareUpdateTimer);
    shareUpdateTimer = setTimeout(updateShareCatalogOption, 100);
  }

  function proposeToCatalog(rubric, options) {
    options = options || {};
    var share = options.shareToCatalog !== false;
    if (!share) return Promise.resolve({ submitted: false, skipped: true });
    if (isExampleRubric(normalizeRubric(rubric))) {
      return Promise.resolve({ submitted: false, skipped: true, message: "" });
    }
    if (
      !window.OutilsEPS ||
      !window.OutilsEPS.catalog ||
      !window.OutilsEPS.catalog.submitGridToCatalog
    ) {
      setStatus("warn", "Catalogue en ligne indisponible.");
      return Promise.resolve({ submitted: false });
    }
    return window.OutilsEPS.catalog
      .submitGridToCatalog(normalizeRubric(rubric), {
        shareToCatalog: true,
        source: options.source || "teacher",
      })
      .then(function (res) {
        if (res && res.message) {
          setStatus(
            res.submitted ? "ok" : res.duplicate ? "warn" : res.skipped ? "info" : "warn",
            res.message
          );
        }
        return res;
      });
  }

  function filteredRubrics() {
    var q = norm(searchEl ? searchEl.value : "");
    var cycle = cycleFilterEl ? cycleFilterEl.value : "";
    var list = localRubrics.map(function (r) {
      var x = normalizeRubric(r);
      x.source = "local";
      return x;
    });
    list = list.filter(function (r) {
      if (cycle && normalizeCycle(r.cycle) !== cycle) return false;
      if (!q) return true;
      var hay = norm([r.title, r.apsa, cycleLabel(r.cycle), r.niveau, r.author].join(" "));
      return hay.indexOf(q) !== -1;
    });
    list.sort(function (a, b) {
      return (
        String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) ||
        a.title.localeCompare(b.title, "fr", { sensitivity: "base" })
      );
    });
    return list;
  }

  function renderCard(r) {
    var card = document.createElement("article");
    card.className = "ge-card ge-card--" + r.source;

    var top = document.createElement("div");
    top.className = "ge-card__top";
    var title = document.createElement("h3");
    title.textContent = r.title;
    var badge = document.createElement("span");
    badge.className = "ge-card__badge";
    badge.textContent = badgeLabel(r);
    if (isExampleRubric(r)) badge.className = "ge-card__badge ge-card__badge--example";
    top.appendChild(title);
    top.appendChild(badge);
    card.appendChild(top);

    var meta = document.createElement("p");
    meta.className = "ge-card__meta";
    meta.textContent = metaText(r) || "Sans metadata";
    card.appendChild(meta);

    var detail = document.createElement("p");
    detail.className = "ge-card__detail";
    detail.textContent =
      r.items.length +
      " item" +
      (r.items.length > 1 ? "s" : "") +
      " · " +
      r.levels.length +
      " niveau" +
      (r.levels.length > 1 ? "x" : "");
    card.appendChild(detail);

    var actions = document.createElement("div");
    actions.className = "ge-card__actions";
    actions.appendChild(actionButton("Modifier", function () {
      setDraft(r, r.id);
    }));
    actions.appendChild(actionButton("Dupliquer", function () {
      duplicateRubric(r, true);
    }));
    actions.appendChild(actionButton("Tester", function () {
      openTest(r);
    }));
    actions.appendChild(actionButton("Supprimer", function () {
      deleteRubric(r.id);
    }, "danger"));
    card.appendChild(actions);
    return card;
  }

  function actionButton(label, handler, tone) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--small " + (tone === "danger" ? "btn--danger" : "btn--ghost");
    btn.textContent = label;
    btn.addEventListener("click", handler);
    return btn;
  }

  function renderList() {
    if (!listEl) return;
    var list = filteredRubrics();
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = list.length > 0;
    if (countEl) countEl.textContent = list.length + " grille" + (list.length > 1 ? "s" : "");
    list.forEach(function (r) {
      listEl.appendChild(renderCard(r));
    });
  }

  function applyMetaToDraft(r) {
    r = normalizeRubric(r || draft || blankRubric());
    r.title = cleanName(titleEl ? titleEl.value : r.title) || "Grille d'évaluation";
    r.apsa = cleanName(apsaEl ? apsaEl.value : r.apsa);
    r.cycle = normalizeCycle(cycleEl ? cycleEl.value : r.cycle);
    r.niveau = cleanName(niveauEl ? niveauEl.value : r.niveau);
    return r;
  }

  function readEditor() {
    var base = applyMetaToDraft(draft || blankRubric());
    if (!editorEl) return base;
    var levels = [];
    editorEl.querySelectorAll("[data-level-id]").forEach(function (th, index) {
      var levelId = th.getAttribute("data-level-id") || shortId("l", index);
      var input = th.querySelector("[data-level-label]");
      levels.push({
        id: levelId,
        label: cleanName(input ? input.value : "") || "Niveau " + (index + 1),
        color: COLORS[index % COLORS.length],
      });
    });
    if (!levels.length) levels = base.levels;
    var items = [];
    editorEl.querySelectorAll("[data-item-id]").forEach(function (tr, rowIndex) {
      var itemId = tr.getAttribute("data-item-id") || shortId("i", rowIndex);
      var itemInput = tr.querySelector("[data-item-label]");
      var item = {
        id: itemId,
        label: cleanName(itemInput ? itemInput.value : "") || "Item " + (rowIndex + 1),
        cells: [],
      };
      tr.querySelectorAll("[data-cell-level]").forEach(function (td, colIndex) {
        var text = td.querySelector("[data-cell-text]");
        var points = td.querySelector("[data-cell-points]");
        var parsed = parseFloat(String(points ? points.value : colIndex).replace(",", "."));
        item.cells.push({
          text: cleanName(text ? text.value : ""),
          points: !isNaN(parsed) ? parsed : colIndex,
        });
      });
      items.push(item);
    });
    base.levels = levels;
    base.items = items;
    draft = normalizeRubric(base);
    return draft;
  }

  function renderEditor() {
    if (!editorEl) return;
    var r = normalizeRubric(draft || blankRubric());
    draft = r;
    editorEl.innerHTML = "";
    var table = document.createElement("table");
    table.className = "ge-edit-table";
    var thead = document.createElement("thead");
    var head = document.createElement("tr");
    var corner = document.createElement("th");
    corner.textContent = "Items";
    head.appendChild(corner);
    r.levels.forEach(function (level, index) {
      var th = document.createElement("th");
      th.setAttribute("data-level-id", level.id);
      var input = document.createElement("input");
      input.type = "text";
      input.value = level.label;
      input.setAttribute("data-level-label", "");
      th.appendChild(input);
      if (r.levels.length > 1) {
        var del = smallDeleteButton(function () {
          readEditor();
          draft.levels.splice(index, 1);
          draft.items.forEach(function (item) {
            item.cells.splice(index, 1);
          });
          renderEditor();
        });
        th.appendChild(del);
      }
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    r.items.forEach(function (item, rowIndex) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-item-id", item.id);
      var th = document.createElement("th");
      var input = document.createElement("input");
      input.type = "text";
      input.value = item.label;
      input.setAttribute("data-item-label", "");
      th.appendChild(input);
      if (r.items.length > 1) {
        th.appendChild(
          smallDeleteButton(function () {
            readEditor();
            draft.items.splice(rowIndex, 1);
            renderEditor();
          })
        );
      }
      tr.appendChild(th);
      r.levels.forEach(function (level, levelIndex) {
        var cell = item.cells[levelIndex] || {};
        var td = document.createElement("td");
        td.setAttribute("data-cell-level", level.id);
        var textarea = document.createElement("textarea");
        textarea.value = cell.text || "";
        textarea.placeholder = "Description";
        textarea.setAttribute("data-cell-text", "");
        var points = document.createElement("input");
        points.type = "number";
        points.step = "0.5";
        points.value = cell.points == null ? levelIndex : cell.points;
        points.setAttribute("data-cell-points", "");
        points.setAttribute("aria-label", "Points");
        td.appendChild(textarea);
        td.appendChild(points);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    editorEl.appendChild(table);
    scheduleShareCatalogUpdate();
  }

  function smallDeleteButton(handler) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ge-edit-del";
    btn.textContent = "×";
    btn.addEventListener("click", handler);
    return btn;
  }

  function setDraft(rubric, localId) {
    draft = normalizeRubric(rubric || blankRubric());
    editingId = localId || null;
    if (titleEl) titleEl.value = draft.title;
    if (apsaEl) {
      if (window.OutilsEPS && window.OutilsEPS.fillApsaSelect) {
        window.OutilsEPS.fillApsaSelect(apsaEl, { selected: draft.apsa });
      } else {
        apsaEl.value = draft.apsa;
      }
    }
    if (cycleEl) cycleEl.value = normalizeCycle(draft.cycle);
    if (niveauEl) niveauEl.value = draft.niveau;
    if (shareEl) shareEl.checked = isExampleRubric(draft) ? false : !!draft.catalogVisible;
    if (modeEl) {
      modeEl.textContent = isExampleRubric(draft)
        ? "Grille exemple (bibliothèque locale)"
        : editingId
          ? "Modification d'une grille personnelle"
          : "Nouvelle grille";
    }
    renderEditor();
    updateShareCatalogOption();
  }

  function consumeColumnHandoff() {
    var raw = "";
    try {
      raw = sessionStorage.getItem(HANDOFF_KEY) || "";
      if (raw) sessionStorage.removeItem(HANDOFF_KEY);
    } catch (e) {
      raw = "";
    }
    if (!raw) return false;
    try {
      var handoff = JSON.parse(raw);
      if (!handoff || !handoff.tableId || !handoff.colId || !handoff.rubric) return false;
      columnEdit = {
        tableId: handoff.tableId,
        colId: handoff.colId,
        colLabel: cleanName(handoff.colLabel || ""),
        rubric: normalizeRubric(handoff.rubric),
      };
      var existing = localRubrics.filter(function (r) {
        return r.id === columnEdit.rubric.id;
      })[0];
      setDraft(columnEdit.rubric, existing ? existing.id : null);
      if (modeEl) modeEl.textContent = "Modification d'une grille utilisée dans Appel et notes";
      setStatus("info", "Grille ouverte depuis Appel et notes. Enregistrer mettra aussi à jour la colonne.");
      return true;
    } catch (e) {
      return false;
    }
  }

  function duplicateRubric(rubric, editAfter) {
    var r = normalizeRubric(rubric);
    r.id = id("rubric");
    r.title = cleanName(r.title + " copie");
    r.source = "local";
    r.catalogVisible = false;
    delete r.isExample;
    delete r.importedFromCatalog;
    delete r.catalogSourceId;
    r.createdAt = nowIso();
    r.updatedAt = r.createdAt;
    localRubrics.push(r);
    saveLocal().then(function () {
      renderList();
      setStatus("ok", "Grille dupliquée dans Mes grilles.");
      if (editAfter) setDraft(r, r.id);
    });
  }

  function deleteRubric(rubricId) {
    var r = localRubrics.filter(function (item) {
      return item.id === rubricId;
    })[0];
    if (!r) return;
    if (!confirm("Supprimer la grille « " + r.title + " » ?")) return;
    if (rubricId === EXAMPLE_RUBRIC_ID) exampleDismissed = true;
    localRubrics = localRubrics.filter(function (item) {
      return item.id !== rubricId;
    });
    if (editingId === rubricId) setDraft(blankRubric(), null);
    saveLocal().then(function () {
      renderList();
      setStatus("ok", "Grille supprimée.");
    });
  }

  function saveDraft(copy) {
    var r = readEditor();
    r.source = "local";
    var isExample = isExampleRubric(r) || editingId === EXAMPLE_RUBRIC_ID;
    r.catalogVisible = isExample ? false : !!(shareEl && shareEl.checked);
    r.updatedAt = nowIso();
    if (copy || !editingId) {
      r.id = copy || !r.id ? id("rubric") : r.id;
      if (copy || r.id !== EXAMPLE_RUBRIC_ID) {
        delete r.isExample;
      }
      r.createdAt = r.createdAt || nowIso();
      localRubrics.push(r);
      editingId = r.id;
    } else {
      localRubrics = localRubrics.filter(function (item) {
        return item.id !== editingId;
      });
      r.id = editingId;
      localRubrics.push(r);
    }
    saveLocal().then(function () {
      setDraft(r, r.id);
      renderList();
      if (columnEdit && !copy) {
        updateSourceColumn(r).then(function (updated) {
          if (updated) setStatus("ok", "Grille enregistrée et colonne Appel et notes mise à jour.");
        });
      }
      setStatus("ok", "Grille enregistrée. Elle est disponible dans Appel et notes.");
      if (r.catalogVisible && !isExampleRubric(r)) {
        proposeToCatalog(r, { shareToCatalog: true });
      }
    });
  }

  function addRow() {
    readEditor();
    draft.items.push({
      id: id("i"),
      label: "Item " + (draft.items.length + 1),
      cells: draft.levels.map(function (_, index) {
        return { text: "", points: index };
      }),
    });
    renderEditor();
  }

  function addCol() {
    readEditor();
    var index = draft.levels.length;
    draft.levels.push({
      id: id("l"),
      label: "Niveau " + (index + 1),
      color: COLORS[index % COLORS.length],
    });
    draft.items.forEach(function (item) {
      item.cells.push({ text: "", points: index });
    });
    renderEditor();
  }

  function parseCsvLine(line) {
    var cells = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        if (inQuotes && line.charAt(i + 1) === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === ";" || ch === ",") && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  function importCsvText(text, filename) {
    var lines = String(text || "")
      .split(/\r?\n/)
      .filter(function (line) {
        return cleanName(line);
      });
    if (lines.length < 2) throw new Error("CSV incomplet.");
    var head = parseCsvLine(lines[0]);
    var levels = head.slice(1).map(function (label, index) {
      return { id: shortId("l", index), label: cleanName(label) || "Niveau " + (index + 1), color: COLORS[index % COLORS.length] };
    });
    var items = lines.slice(1).map(function (line, rowIndex) {
      var row = parseCsvLine(line);
      return {
        id: shortId("i", rowIndex),
        label: cleanName(row[0]) || "Item " + (rowIndex + 1),
        cells: levels.map(function (_, levelIndex) {
          var raw = row[levelIndex + 1] || "";
          var match = raw.match(/\(([-+]?\d+(?:[\.,]\d+)?)\s*pts?\)\s*$/i);
          var points = match ? parseFloat(match[1].replace(",", ".")) : levelIndex;
          var cellText = match ? cleanName(raw.replace(match[0], "")) : cleanName(raw);
          return { text: cellText, points: !isNaN(points) ? points : levelIndex };
        }),
      };
    });
    var title = cleanName(filename || "").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    setDraft(
      normalizeRubric({
        id: id("rubric"),
        title: title || "Grille importée",
        apsa: apsaEl ? apsaEl.value : "",
        cycle: cycleEl ? cycleEl.value : "4",
        niveau: niveauEl ? niveauEl.value : "",
        levels: levels,
        items: items,
      }),
      null
    );
    setStatus("ok", "CSV importé dans l'éditeur. Pensez à enregistrer la grille.");
  }

  function totalPoints(rubric) {
    var r = normalizeRubric(rubric);
    return r.items.reduce(function (sum, item) {
      var max = item.cells.reduce(function (m, cell) {
        var p = parseFloat(cell.points);
        return !isNaN(p) && p > m ? p : m;
      }, 0);
      return sum + max;
    }, 0);
  }

  function scoreRubric(rubric, value) {
    var r = normalizeRubric(rubric);
    var selected = value && value.selected ? value.selected : {};
    var clean = {};
    var points = 0;
    var count = 0;
    r.items.forEach(function (item) {
      var levelId = selected[item.id];
      if (!levelId) return;
      var idx = r.levels.findIndex(function (level) {
        return level.id === levelId;
      });
      if (idx < 0) return;
      var p = parseFloat((item.cells[idx] || {}).points);
      points += !isNaN(p) ? p : 0;
      clean[item.id] = levelId;
      count++;
    });
    var total = totalPoints(r);
    return {
      selected: clean,
      points: points,
      total: total,
      selectedCount: count,
      itemCount: r.items.length,
      note: count && total > 0 ? Math.round((points / total) * MAX_NOTE * 100) / 100 : null,
    };
  }

  function renderTest(rubric) {
    var r = normalizeRubric(rubric);
    if (!testGridEl || !testScoreEl) return;
    testGridEl.innerHTML = "";
    var score = scoreRubric(r, testValue);
    testValue = { selected: score.selected, points: score.points, note: score.note };
    testScoreEl.innerHTML =
      '<span class="tab-suivi-rubric-score__note">' +
      (score.note === null ? "—" : formatNumber(score.note) + "/20") +
      '</span><span class="tab-suivi-rubric-score__detail">' +
      formatNumber(score.points) +
      " / " +
      formatNumber(score.total) +
      " points · " +
      score.selectedCount +
      " / " +
      score.itemCount +
      " items</span>";

    var table = document.createElement("table");
    table.className = "tab-suivi-rubric-grid";
    var thead = document.createElement("thead");
    var head = document.createElement("tr");
    var corner = document.createElement("th");
    corner.textContent = r.title;
    head.appendChild(corner);
    r.levels.forEach(function (level) {
      var th = document.createElement("th");
      th.textContent = level.label;
      th.style.setProperty("--rubric-level", level.color);
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    r.items.forEach(function (item) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.textContent = item.label;
      tr.appendChild(th);
      r.levels.forEach(function (level, index) {
        var td = document.createElement("td");
        var btn = document.createElement("button");
        var selected = testValue.selected[item.id] === level.id;
        btn.type = "button";
        btn.className = "tab-suivi-rubric-option" + (selected ? " is-selected" : "");
        btn.style.setProperty("--rubric-level", level.color);
        btn.innerHTML =
          '<span class="tab-suivi-rubric-option__text"></span><span class="tab-suivi-rubric-option__points"></span>';
        btn.querySelector(".tab-suivi-rubric-option__text").textContent =
          (item.cells[index] && item.cells[index].text) || level.label;
        btn.querySelector(".tab-suivi-rubric-option__points").textContent =
          formatNumber((item.cells[index] || {}).points) + " pt";
        btn.addEventListener("click", function () {
          if (testValue.selected[item.id] === level.id) delete testValue.selected[item.id];
          else testValue.selected[item.id] = level.id;
          renderTest(r);
        });
        td.appendChild(btn);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    testGridEl.appendChild(table);
  }

  function openTest(rubric) {
    var r = normalizeRubric(rubric || readEditor());
    currentTestRubric = r;
    testValue = { selected: {}, points: 0, note: null };
    if (testTitleEl) testTitleEl.textContent = "Test · " + r.title;
    if (testMetaEl) testMetaEl.textContent = metaText(r);
    renderTest(r);
    if (testDialog && testDialog.showModal) testDialog.showModal();
  }

  function closeTest() {
    if (testDialog && testDialog.open) testDialog.close();
  }

  function initEvents() {
    [searchEl, cycleFilterEl].forEach(function (el) {
      if (!el) return;
      el.addEventListener("input", renderList);
      el.addEventListener("change", renderList);
    });
    document.getElementById("ge-new").addEventListener("click", function () {
      setDraft(blankRubric(), null);
    });
    document.getElementById("ge-add-row").addEventListener("click", addRow);
    document.getElementById("ge-add-col").addEventListener("click", addCol);
    document.getElementById("ge-save").addEventListener("click", function () {
      saveDraft(false);
    });
    document.getElementById("ge-save-copy").addEventListener("click", function () {
      saveDraft(true);
    });
    document.getElementById("ge-test").addEventListener("click", function () {
      openTest(readEditor());
    });
    if (importCsvEl) {
      importCsvEl.addEventListener("change", function () {
        var file = importCsvEl.files && importCsvEl.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            importCsvText(reader.result || "", file.name);
          } catch (err) {
            setStatus("error", err && err.message ? err.message : "CSV invalide.");
          }
        };
        reader.readAsText(file, "UTF-8");
        importCsvEl.value = "";
      });
    }
    ["ge-title", "ge-apsa", "ge-cycle-edit", "ge-niveau"].forEach(function (idAttr) {
      var el = document.getElementById(idAttr);
      if (!el) return;
      el.addEventListener("input", scheduleShareCatalogUpdate);
      el.addEventListener("change", function () {
        if (draft) draft = applyMetaToDraft(readEditor());
        scheduleShareCatalogUpdate();
      });
    });
    if (editorEl) {
      editorEl.addEventListener("input", scheduleShareCatalogUpdate);
      editorEl.addEventListener("change", scheduleShareCatalogUpdate);
    }
    document.getElementById("ge-test-close").addEventListener("click", closeTest);
    document.getElementById("ge-test-close-x").addEventListener("click", closeTest);
    document.getElementById("ge-test-clear").addEventListener("click", function () {
      testValue = { selected: {}, points: 0, note: null };
      renderTest(currentTestRubric || readEditor());
    });
  }

  function initApsaSelect() {
    if (apsaEl && window.OutilsEPS && window.OutilsEPS.fillApsaSelect) {
      window.OutilsEPS.fillApsaSelect(apsaEl);
    }
  }

  function init() {
    initApsaSelect();
    initEvents();
    setDraft(blankRubric(), null);
    loadLocal().then(function () {
      var openedFromTable = consumeColumnHandoff();
      renderList();
      if (openedFromTable) return;
      var params = new URLSearchParams(window.location.search || "");
      if (params.get("imported") === "1") {
        setStatus("ok", "Grille importée dans votre bibliothèque.");
      } else if (!localRubrics.length) {
        setStatus("info", "Créez votre première grille ou parcourez le catalogue en ligne.");
      } else {
        setStatus();
      }
    });
  }

  init();
})();
