/**
 * Validation et empreinte des grilles avant envoi au catalogue en ligne.
 */
(function (global) {
  "use strict";

  var ns = global.OutilsEPS || (global.OutilsEPS = {});
  var catalog = ns.catalog || (ns.catalog = {});

  var MAX_GRID_JSON_BYTES = 50000;
  var MIN_ROWS = 3;
  var MIN_COLS = 3;
  catalog.MIN_NON_EMPTY_CELLS = 6;

  /** Mots interdits (insensible à la casse, sans accents pour la détection). À compléter si besoin. */
  catalog.FORBIDDEN_WORDS = [
    "pute",
    "putain",
    "merde",
    "connard",
    "encul",
    "nazi",
    "hitler",
    "porn",
    "sexe",
    "fuck",
    "shit",
  ];

  function cleanName(s) {
    return String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .trim();
  }

  function norm(s) {
    return cleanName(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function gridFromInput(grid) {
    var g = grid && typeof grid === "object" ? grid : {};
    return {
      title: cleanName(g.title || g.label || ""),
      apsa: cleanName(g.apsa || g.activity || ""),
      cycle: cleanName(g.cycle || ""),
      niveau: cleanName(g.niveau || g.level || ""),
      levels: Array.isArray(g.levels) ? g.levels : [],
      items: Array.isArray(g.items) ? g.items : [],
    };
  }

  function meaningfulText(s) {
    return cleanName(s).length >= 2;
  }

  /**
   * Parcourt titre, activité, niveau, libellés d'items et textes de cellules.
   */
  catalog.containsForbiddenContent = function (grid) {
    var g = gridFromInput(grid);
    var errors = [];
    var haystack = [];

    haystack.push(g.title, g.apsa, g.niveau, g.cycle);
    g.items.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      haystack.push(item.label);
      var cells = Array.isArray(item.cells) ? item.cells : [];
      cells.forEach(function (cell) {
        if (cell && typeof cell === "object") haystack.push(cell.text);
      });
    });

    var normalizedHay = norm(haystack.join(" "));
    catalog.FORBIDDEN_WORDS.forEach(function (word) {
      var w = norm(word);
      if (!w) return;
      if (normalizedHay.indexOf(w) !== -1) {
        errors.push("La grille contient un mot interdit.");
      }
    });

    var nonEmpty = 0;
    g.items.forEach(function (item) {
      if (meaningfulText(item.label)) nonEmpty++;
      (item.cells || []).forEach(function (cell) {
        if (cell && meaningfulText(cell.text)) nonEmpty++;
      });
    });
    if (nonEmpty < catalog.MIN_NON_EMPTY_CELLS) {
      errors.push(
        "La grille doit contenir au moins " +
          catalog.MIN_NON_EMPTY_CELLS +
          " cellules ou libellés renseignés."
      );
    }

    return { forbidden: errors.length > 0, errors: errors };
  };

  /**
   * Objet canonique pour le hash (ignore id, dates, auteur, votes, source).
   */
  catalog.canonicalGridForHash = function (grid) {
    var g = gridFromInput(grid);
    var levels = g.levels
      .map(function (level, index) {
        level = level && typeof level === "object" ? level : {};
        return {
          label: norm(level.label || "niveau " + (index + 1)),
          cellsOrder: index,
        };
      })
      .sort(function (a, b) {
        return a.label.localeCompare(b.label, "fr");
      });

    var items = g.items
      .map(function (item, rowIndex) {
        item = item && typeof item === "object" ? item : {};
        var cells = Array.isArray(item.cells) ? item.cells : [];
        return {
          label: norm(item.label || "item " + (rowIndex + 1)),
          cells: cells.map(function (cell, colIndex) {
            cell = cell && typeof cell === "object" ? cell : {};
            var pts = parseFloat(String(cell.points == null ? colIndex : cell.points).replace(",", "."));
            return {
              text: norm(cell.text || ""),
              points: isNaN(pts) ? colIndex : pts,
            };
          }),
        };
      })
      .sort(function (a, b) {
        return a.label.localeCompare(b.label, "fr");
      });

    return {
      title: norm(g.title),
      activity: norm(g.apsa),
      level: norm(g.niveau || g.cycle),
      levels: levels,
      items: items,
    };
  };

  catalog.generateGridHash = function (grid) {
    var canonical = catalog.canonicalGridForHash(grid);
    var payload = JSON.stringify(canonical);
    if (!global.crypto || !crypto.subtle || !crypto.subtle.digest) {
      return Promise.reject(
        new Error("Empreinte impossible : contexte non sécurisé (HTTPS requis).")
      );
    }
    var enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(payload)).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  };

  catalog.validateGridForCatalog = function (grid, options) {
    options = options || {};
    var errors = [];
    var g = gridFromInput(grid);
    var rows = g.items.length;
    var cols = g.levels.length;

    if (!g.title) errors.push("Le titre est obligatoire.");
    if (!g.apsa) errors.push("L'activité (APSA) est obligatoire.");
    if (!g.niveau && !g.cycle) errors.push("Le niveau ou le cycle est obligatoire.");
    if (!rows || !cols) errors.push("Le contenu de la grille est vide.");
    if (rows < MIN_ROWS) errors.push("La grille doit contenir au moins 3 lignes.");
    if (cols < MIN_COLS) errors.push("La grille doit contenir au moins 3 colonnes.");

    var jsonSize = new Blob([JSON.stringify(grid)]).size;
    if (jsonSize > MAX_GRID_JSON_BYTES) {
      errors.push("La grille est trop volumineuse (maximum 50 Ko).");
    }

    var forbidden = catalog.containsForbiddenContent(grid);
    forbidden.errors.forEach(function (e) {
      if (errors.indexOf(e) === -1) errors.push(e);
    });

    if (options.knownHashes && options.knownHashes.length) {
      /* le hash async est vérifié à l'insertion ; doublon local optionnel après calcul */
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      rowsCount: rows,
      columnsCount: cols,
      levelText: cleanName(g.niveau || g.cycle),
    };
  };

  catalog.MAX_GRID_JSON_BYTES = MAX_GRID_JSON_BYTES;
  catalog.MIN_ROWS = MIN_ROWS;
  catalog.MIN_COLS = MIN_COLS;
})(typeof window !== "undefined" ? window : global);
