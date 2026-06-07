/**
 * Fusion deterministe de deux sauvegardes Outils EPS pour la synchronisation A/B.
 */
(function (root) {
  "use strict";

  var STORE_NAMES = [
    "classes",
    "eleves",
    "dispenses",
    "oublisMateriel",
    "radarPerfs",
    "sessions",
    "championnats",
    "tournoisElimination",
    "parametres",
    "importsEleves",
    "tableauxSuivi",
    "localStorageData",
  ];

  var STORE_LABELS = {
    classes: "Classes",
    eleves: "Eleves",
    dispenses: "Dispenses / inaptitudes",
    oublisMateriel: "Oublis de materiel",
    radarPerfs: "Radar vitesse",
    sessions: "Seances",
    championnats: "Championnats",
    tournoisElimination: "Tournois / pyramides",
    parametres: "Reglages et donnees d'outils",
    importsEleves: "Imports eleves QR",
    tableauxSuivi: "Tableaux de suivi",
    localStorageData: "Donnees locales complementaires",
  };

  var STORE_PREFIXES = {
    classes: "classe",
    eleves: "eleve",
    dispenses: "dispense",
    oublisMateriel: "oubli",
    radarPerfs: "radar",
    sessions: "session",
    championnats: "championnat",
    tournoisElimination: "tournoi",
    parametres: "parametre",
    importsEleves: "import",
    tableauxSuivi: "tableau",
    localStorageData: "local",
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(function (key) {
          return JSON.stringify(key) + ":" + stableStringify(value[key]);
        })
        .join(",") +
      "}"
    );
  }

  function sameStoredData(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  function shortHash(value) {
    var str = String(value || "");
    var h = 2166136261;
    var i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return ("0000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function normalizeBackup(data) {
    data = data || {};
    var out = {};
    STORE_NAMES.forEach(function (storeName) {
      out[storeName] = Array.isArray(data[storeName]) ? clone(data[storeName]) : [];
    });
    return out;
  }

  function countPayloadItems(payload) {
    payload = payload || {};
    return STORE_NAMES.reduce(function (total, storeName) {
      return total + ((payload[storeName] || []).length || 0);
    }, 0);
  }

  function indexById(list) {
    var index = {};
    (list || []).forEach(function (item) {
      if (item && item.id) index[item.id] = item;
    });
    return index;
  }

  function conflictKey(storeName, id) {
    return storeName + "|" + id;
  }

  function parseTimestamp(value) {
    if (!value) return 0;
    var ms = Date.parse(value);
    return isNaN(ms) ? 0 : ms;
  }

  function isEmptyCellValue(value) {
    return value === null || value === undefined || value === "";
  }

  function mergeTableauSuiviMetaObjects(baseMeta, otherMeta) {
    baseMeta = baseMeta && typeof baseMeta === "object" ? clone(baseMeta) : {};
    otherMeta = otherMeta && typeof otherMeta === "object" ? otherMeta : {};
    Object.keys(otherMeta).forEach(function (key) {
      var val = otherMeta[key];
      if (val !== null && val !== undefined && val !== "") {
        baseMeta[key] = clone(val);
      }
    });
    return baseMeta;
  }

  /**
   * Fusionne deux feuilles Appel et notes partageant le meme identifiant :
   * union des colonnes, des lignes et des cellules (valeur non vide prioritaire).
   */
  function mergeTableauSuivi(a, b) {
    var left = clone(a);
    var right = clone(b);
    if (!left || !right) return clone(a || b);
    var aTime = Math.max(parseTimestamp(left.updatedAt), parseTimestamp(left.createdAt));
    var bTime = Math.max(parseTimestamp(right.updatedAt), parseTimestamp(right.createdAt));
    var base = aTime >= bTime ? left : right;
    var other = aTime >= bTime ? right : left;
    var preferOther = bTime > aTime;
    var merged = clone(base);

    merged.rows = Array.isArray(merged.rows) ? merged.rows : [];
    merged.cols = Array.isArray(merged.cols) ? merged.cols : [];
    merged.cells = merged.cells && typeof merged.cells === "object" ? clone(merged.cells) : {};

    var colIndex = indexById(merged.cols);
    (other.cols || []).forEach(function (col) {
      if (!col || !col.id) return;
      if (!colIndex[col.id]) {
        var addCol = clone(col);
        merged.cols.push(addCol);
        colIndex[col.id] = addCol;
        return;
      }
      if (!sameStoredData(colIndex[col.id], col) && preferOther) {
        for (var ci = 0; ci < merged.cols.length; ci++) {
          if (merged.cols[ci] && merged.cols[ci].id === col.id) {
            merged.cols[ci] = clone(col);
            colIndex[col.id] = merged.cols[ci];
            break;
          }
        }
      }
    });

    var rowIndex = indexById(merged.rows);
    (other.rows || []).forEach(function (row) {
      if (!row || !row.id) return;
      if (!rowIndex[row.id]) {
        var addRow = clone(row);
        merged.rows.push(addRow);
        rowIndex[row.id] = addRow;
        return;
      }
      if (sameStoredData(rowIndex[row.id], row)) return;
      var mergedRow = clone(rowIndex[row.id]);
      if (row.label && row.label !== "Sans nom") mergedRow.label = row.label;
      mergedRow.meta = mergeTableauSuiviMetaObjects(mergedRow.meta, row.meta);
      for (var ri = 0; ri < merged.rows.length; ri++) {
        if (merged.rows[ri] && merged.rows[ri].id === row.id) {
          merged.rows[ri] = mergedRow;
          rowIndex[row.id] = mergedRow;
          break;
        }
      }
    });

    var cellKeys = {};
    Object.keys(left.cells || {}).forEach(function (key) {
      cellKeys[key] = true;
    });
    Object.keys(right.cells || {}).forEach(function (key) {
      cellKeys[key] = true;
    });
    Object.keys(cellKeys).forEach(function (key) {
      var va = left.cells ? left.cells[key] : undefined;
      var vb = right.cells ? right.cells[key] : undefined;
      if (sameStoredData(va, vb)) {
        if (!isEmptyCellValue(va)) merged.cells[key] = clone(va);
        else delete merged.cells[key];
        return;
      }
      if (isEmptyCellValue(va)) {
        if (!isEmptyCellValue(vb)) merged.cells[key] = clone(vb);
        else delete merged.cells[key];
        return;
      }
      if (isEmptyCellValue(vb)) {
        merged.cells[key] = clone(va);
        return;
      }
      merged.cells[key] = preferOther ? clone(vb) : clone(va);
    });

    merged.id = left.id || right.id;
    merged.titre = preferOther && right.titre ? right.titre : merged.titre || left.titre || right.titre;
    merged.classeId = merged.classeId || left.classeId || right.classeId;
    merged.updatedAt = new Date(Math.max(aTime, bTime, Date.now())).toISOString();
    if (!merged.createdAt) {
      merged.createdAt = left.createdAt || right.createdAt || merged.updatedAt;
    }
    return merged;
  }

  function canAutoMergeTableauSuivi(a, b) {
    return !!(a && b && a.id && b.id && a.id === b.id);
  }

  function uniqueCopyId(storeName, oldId, item, used) {
    var prefix = STORE_PREFIXES[storeName] || "sync";
    var base = prefix + "_sync_" + shortHash(storeName + "|" + oldId + "|" + stableStringify(item));
    var id = base;
    var n = 2;
    while (used[id]) {
      id = base + "_" + n;
      n += 1;
    }
    used[id] = true;
    return id;
  }

  function compareBackups(a, b) {
    var left = normalizeBackup(a);
    var right = normalizeBackup(b);
    var stores = [];
    var conflicts = [];
    var summary = {
      aTotal: countPayloadItems(left),
      bTotal: countPayloadItems(right),
      identical: 0,
      onlyA: 0,
      onlyB: 0,
      conflicts: 0,
    };

    STORE_NAMES.forEach(function (storeName) {
      var aItems = left[storeName] || [];
      var bItems = right[storeName] || [];
      var aIndex = indexById(aItems);
      var bIndex = indexById(bItems);
      var ids = {};
      var stats = { storeName: storeName, label: STORE_LABELS[storeName] || storeName, a: aItems.length, b: bItems.length, identical: 0, onlyA: 0, onlyB: 0, conflicts: 0 };

      aItems.forEach(function (item) {
        if (item && item.id) ids[item.id] = true;
      });
      bItems.forEach(function (item) {
        if (item && item.id) ids[item.id] = true;
      });

      Object.keys(ids).forEach(function (id) {
        var ai = aIndex[id];
        var bi = bIndex[id];
        if (ai && bi && sameStoredData(ai, bi)) stats.identical += 1;
        else if (ai && bi && storeName === "tableauxSuivi" && canAutoMergeTableauSuivi(ai, bi)) {
          /* fusion automatique des colonnes a l'application */
        } else if (ai && bi) {
          stats.conflicts += 1;
          conflicts.push({ key: conflictKey(storeName, id), storeName: storeName, label: stats.label, id: id, a: clone(ai), b: clone(bi) });
        } else if (ai) stats.onlyA += 1;
        else if (bi) stats.onlyB += 1;
      });

      summary.identical += stats.identical;
      summary.onlyA += stats.onlyA;
      summary.onlyB += stats.onlyB;
      summary.conflicts += stats.conflicts;
      stores.push(stats);
    });

    return { summary: summary, stores: stores, conflicts: conflicts };
  }

  function mergeBackups(a, b, decisions) {
    var left = normalizeBackup(a);
    var right = normalizeBackup(b);
    var merged = {};
    var conflicts = compareBackups(left, right).conflicts;
    var unresolved = [];

    decisions = decisions || {};
    STORE_NAMES.forEach(function (storeName) {
      merged[storeName] = clone(left[storeName] || []);
    });

    STORE_NAMES.forEach(function (storeName) {
      var byId = indexById(merged[storeName]);
      var used = {};
      merged[storeName].forEach(function (item) {
        if (item && item.id) used[item.id] = true;
      });

      (right[storeName] || []).forEach(function (item) {
        if (!item || !item.id) return;
        var existing = byId[item.id];
        if (!existing) {
          var add = clone(item);
          merged[storeName].push(add);
          byId[add.id] = add;
          used[add.id] = true;
          return;
        }
        if (sameStoredData(existing, item)) return;

        if (storeName === "tableauxSuivi" && canAutoMergeTableauSuivi(existing, item)) {
          var mergedTableau = mergeTableauSuivi(existing, item);
          for (var ti = 0; ti < merged[storeName].length; ti++) {
            if (merged[storeName][ti] && merged[storeName][ti].id === item.id) {
              merged[storeName][ti] = mergedTableau;
              byId[item.id] = mergedTableau;
              break;
            }
          }
          return;
        }

        var key = conflictKey(storeName, item.id);
        var choice = decisions[key];
        if (!choice) {
          unresolved.push(key);
          return;
        }
        if (choice === "b") {
          var replacement = clone(item);
          var i;
          for (i = 0; i < merged[storeName].length; i++) {
            if (merged[storeName][i] && merged[storeName][i].id === item.id) {
              merged[storeName][i] = replacement;
              byId[item.id] = replacement;
              break;
            }
          }
        } else if (choice === "both") {
          var copy = clone(item);
          copy.id = uniqueCopyId(storeName, item.id, item, used);
          merged[storeName].push(copy);
          byId[copy.id] = copy;
        }
      });
    });

    return {
      payload: merged,
      metadata: {
        app: "OutilsEPS",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        synchronizedAt: new Date().toISOString(),
      },
      conflicts: conflicts,
      unresolved: unresolved,
      total: countPayloadItems(merged),
    };
  }

  var api = {
    STORE_NAMES: STORE_NAMES,
    STORE_LABELS: STORE_LABELS,
    stableStringify: stableStringify,
    shortHash: shortHash,
    normalizeBackup: normalizeBackup,
    compareBackups: compareBackups,
    mergeBackups: mergeBackups,
    mergeTableauSuivi: mergeTableauSuivi,
    countPayloadItems: countPayloadItems,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BackupSyncCore = api;
})(typeof window !== "undefined" ? window : global);
