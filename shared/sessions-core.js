/**
 * Logique sessions (sans IndexedDB) — testable en Node.
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.SessionsCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SESSION_TOOLS = {
    COMPOSITION: "composition-equipes",
    TOURNOI: "tournoi-elimination",
    PYRAMIDE: "pyramide-victoires",
    CHAMPIONNAT: "championnat-poule",
    ORIENTATION: "course-orientation",
    DEFI_ATP: "defi-atp",
    PHOTO_FINISH: "photo-finish",
  };

  var TOOL_LABELS = {
    "composition-equipes": "Composition d’équipes",
    "tournoi-elimination": "Tournoi éliminatoire",
    "pyramide-victoires": "Pyramide de victoires",
    "championnat-poule": "Championnat",
    "course-orientation": "Course d’orientation",
    "defi-atp": "Défi ATP",
    "photo-finish": "Photo Finish V1",
  };

  var SESSION_TOOL_IDS = Object.keys(TOOL_LABELS);

  var MIGRATION_FLAG_ID = "migration-sessions-v1";
  var LEGACY_TOURNOI_LS_KEY = "outils_eps_tournoi_elimination_v1";

  function isSessionTool(toolId) {
    return SESSION_TOOL_IDS.indexOf(toolId) >= 0;
  }

  function toolLabel(toolId) {
    return TOOL_LABELS[toolId] || toolId;
  }

  function activeSessionParamId(toolId) {
    return "active-session__" + toolId;
  }

  function compositionDataId(sessionId) {
    return "composition-equipes__" + sessionId;
  }

  function courseOrientationDataId(sessionId) {
    return "course-orientation__" + sessionId;
  }

  function defiAtpDataId(sessionId) {
    return "defi-atp__" + sessionId;
  }

  function legacySessionName(toolId, dateIso) {
    var d = dateIso ? new Date(dateIso) : new Date();
    var label = toolLabel(toolId);
    var str = d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return "Legacy — " + label + " (" + str + ")";
  }

  function normalizeText(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function validateSession(record) {
    if (!record || typeof record !== "object") return "Séance invalide.";
    if (!record.id || typeof record.id !== "string") return "Séance sans identifiant.";
    if (!record.toolId || !isSessionTool(record.toolId)) {
      return "Séance : outil inconnu (« " + record.toolId + " »).";
    }
    if (!normalizeText(record.nomSession)) return "Le nom de la séance est requis.";
    return null;
  }

  function normalizeSession(record, nowIso) {
    var now = nowIso || new Date().toISOString();
    return {
      id: record.id,
      toolId: record.toolId,
      nomSession: normalizeText(record.nomSession) || "Session",
      classeId: record.classeId || null,
      classeNomSnapshot: record.classeNomSnapshot
        ? normalizeText(record.classeNomSnapshot)
        : null,
      createdAt: record.createdAt || now,
      updatedAt: record.updatedAt || now,
      lastOpenedAt: record.lastOpenedAt || now,
      archived: !!record.archived,
    };
  }

  function sortSessionsRecent(a, b) {
    var la = a.lastOpenedAt || a.updatedAt || "";
    var lb = b.lastOpenedAt || b.updatedAt || "";
    return lb.localeCompare(la);
  }

  function filterSessionsForTool(sessions, toolId, opts) {
    opts = opts || {};
    return (sessions || [])
      .filter(function (s) {
        if (!s || s.toolId !== toolId) return false;
        if (!opts.includeArchived && s.archived) return false;
        return true;
      })
      .sort(sortSessionsRecent);
  }

  function deepCloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /** Copie parcours + réglages pour une nouvelle séance CO (sans coureurs ni chronos). */
  function cloneOrientationSessionData(sourceState) {
    var src = sourceState && typeof sourceState === "object" ? sourceState : {};
    return {
      parcours: Array.isArray(src.parcours) ? deepCloneJson(src.parcours) : [],
      coureurs: [],
      runs: [],
      settings:
        src.settings && typeof src.settings === "object"
          ? deepCloneJson(src.settings)
          : null,
    };
  }

  function compareTexteFr(a, b) {
    return String(a || "").localeCompare(String(b || ""), "fr");
  }

  function buildOrientationCoureurs(noms, idFactory) {
    var factory =
      typeof idFactory === "function"
        ? idFactory
        : function (_nom, idx) {
            return "coureur_" + idx;
          };
    var seen = {};
    var liste = (noms || [])
      .map(function (n) {
        return normalizeText(n);
      })
      .filter(function (n) {
        if (!n) return false;
        var key = n.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .sort(compareTexteFr);
    return liste.map(function (nom, idx) {
      return {
        id: factory(nom, idx),
        nom: nom,
        ordre: idx + 1,
      };
    });
  }

  return {
    SESSION_TOOLS: SESSION_TOOLS,
    SESSION_TOOL_IDS: SESSION_TOOL_IDS,
    TOOL_LABELS: TOOL_LABELS,
    MIGRATION_FLAG_ID: MIGRATION_FLAG_ID,
    LEGACY_TOURNOI_LS_KEY: LEGACY_TOURNOI_LS_KEY,
    isSessionTool: isSessionTool,
    toolLabel: toolLabel,
    activeSessionParamId: activeSessionParamId,
    compositionDataId: compositionDataId,
    courseOrientationDataId: courseOrientationDataId,
    defiAtpDataId: defiAtpDataId,
    legacySessionName: legacySessionName,
    validateSession: validateSession,
    normalizeSession: normalizeSession,
    sortSessionsRecent: sortSessionsRecent,
    filterSessionsForTool: filterSessionsForTool,
    cloneOrientationSessionData: cloneOrientationSessionData,
    buildOrientationCoureurs: buildOrientationCoureurs,
  };
});
