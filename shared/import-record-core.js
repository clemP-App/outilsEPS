/**
 * Normalisation des enregistrements imports élèves (IndexedDB).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ImportRecordCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function genererId(prefix) {
    var p = prefix || "import";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return p + "_" + crypto.randomUUID();
    }
    return p + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function buildStoredImport(record, genererIdFn) {
    if (!record || typeof record !== "object") {
      return { error: "Enregistrement d'import invalide." };
    }
    if (!record.exportId || !record.toolId || !record.payload) {
      return { error: "Import incomplet (exportId, toolId ou payload manquant)." };
    }
    var gen = genererIdFn || genererId;
    return {
      item: {
        id: record.id || gen("import"),
        exportId: String(record.exportId),
        toolId: String(record.toolId),
        createdAt: record.createdAt || new Date().toISOString(),
        importedAt: record.importedAt || new Date().toISOString(),
        classeLabel: (record.classeLabel || "").trim(),
        groupeLabel: (record.groupeLabel || "").trim(),
        auteurLabel: (record.auteurLabel || "").trim(),
        checksum: record.checksum || "",
        payload: record.payload,
      },
    };
  }

  function matchesFilters(item, filters) {
    if (!item) return false;
    filters = filters || {};
    if (filters.toolId && item.toolId !== filters.toolId) return false;
    if (filters.classeLabel) {
      var cl = String(filters.classeLabel).trim().toLowerCase();
      if ((item.classeLabel || "").toLowerCase().indexOf(cl) < 0) return false;
    }
    if (filters.groupeLabel) {
      var gl = String(filters.groupeLabel).trim().toLowerCase();
      if ((item.groupeLabel || "").toLowerCase().indexOf(gl) < 0) return false;
    }
    if (filters.auteurLabel) {
      var al = String(filters.auteurLabel).trim().toLowerCase();
      if ((item.auteurLabel || "").toLowerCase().indexOf(al) < 0) return false;
    }
    if (filters.dateFrom) {
      if (new Date(item.importedAt || item.createdAt).getTime() < new Date(filters.dateFrom).getTime()) {
        return false;
      }
    }
    if (filters.dateTo) {
      if (new Date(item.importedAt || item.createdAt).getTime() > new Date(filters.dateTo).getTime()) {
        return false;
      }
    }
    return true;
  }

  function sortImportsNewestFirst(list) {
    return (list || []).slice().sort(function (a, b) {
      return (
        new Date(b.importedAt || b.createdAt).getTime() -
        new Date(a.importedAt || a.createdAt).getTime()
      );
    });
  }

  return {
    buildStoredImport: buildStoredImport,
    matchesFilters: matchesFilters,
    sortImportsNewestFirst: sortImportsNewestFirst,
  };
});
