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
        else if (ai && bi) {
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
    countPayloadItems: countPayloadItems,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BackupSyncCore = api;
})(typeof window !== "undefined" ? window : global);
