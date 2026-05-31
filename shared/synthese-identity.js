/**
 * Synthèse EPS — résolution d’identité (élève, équipe, prénom seul, alias).
 * Compatible données legacy (nom texte) et enrichissements futurs (eleveId).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SyntheseIdentity = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ALIASES_PARAM_ID = "synthese-identite-aliases";

  /** Imports QR centrés équipe — jamais rattachés à une fiche élève sans eleveId explicite. */
  var TEAM_IMPORT_TOOLS = ["table-marque"];

  /** Compteurs à deux joueurs : association élève par slot (A/B ou a/b). */
  var DUAL_PLAYER_IMPORT_TOOLS = ["compteur-ptb", "compteur-bonus", "compteur-ratio"];

  function normalizeName(value) {
    return String(value === null || value === undefined ? "" : value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function labelEleve(e) {
    if (!e) return "";
    return [e.nom, e.prenom]
      .map(function (s) {
        return String(s || "").trim();
      })
      .filter(Boolean)
      .join(" ");
  }

  function sameEleve(a, b) {
    if (!a || !b) return false;
    var idA = a.id || a.eleveId || "";
    var idB = b.id || b.eleveId || "";
    if (idA && idB && idA === idB) return true;
    var nomA = normalizeName(a.nom);
    var nomB = normalizeName(b.nom);
    var prenomA = normalizeName(a.prenom);
    var prenomB = normalizeName(b.prenom);
    if (!nomA || !prenomA || !nomB || !prenomB) return false;
    return nomA === nomB && prenomA === prenomB;
  }

  function participantFromName(name) {
    var s = String(name || "").trim();
    if (!s) return { nom: "", prenom: "", label: "" };
    var parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return { nom: parts[0], prenom: parts.slice(1).join(" "), label: s };
    }
    return { nom: parts[0] || "", prenom: "", label: s };
  }

  function extractAliasesFromParametres(parametres) {
    var list = parametres || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === ALIASES_PARAM_ID && Array.isArray(list[i].aliases)) {
        return list[i].aliases.slice();
      }
    }
    return [];
  }

  function findAliasEleveId(label, classeId, aliases) {
    if (!label || !classeId || !aliases || !aliases.length) return null;
    var norm = normalizeName(label);
    for (var i = 0; i < aliases.length; i++) {
      var a = aliases[i];
      if (a && a.classeId === classeId && a.labelNorm === norm && a.eleveId) {
        return a.eleveId;
      }
    }
    return null;
  }

  function elevesWithPrenom(eleves, prenomNorm) {
    return (eleves || []).filter(function (e) {
      return e && normalizeName(e.prenom) === prenomNorm;
    });
  }

  /**
   * @returns {{ match: boolean, confidence: 'high'|'medium'|'low'|null }}
   */
  function labelMatchesEleve(label, eleve, ctx) {
    ctx = ctx || {};
    if (!label || !eleve) return { match: false, confidence: null };

    if (ctx.eleveId && eleve.id && ctx.eleveId === eleve.id) {
      return { match: true, confidence: "high" };
    }

    var aliases = ctx.aliases || [];
    var classeId = ctx.classeId || eleve.classeId;
    var aliasId = findAliasEleveId(label, classeId, aliases);
    if (aliasId && eleve.id === aliasId) {
      return { match: true, confidence: "high" };
    }

    var norm = normalizeName(label);
    var full = normalizeName(labelEleve(eleve));
    if (norm && full && norm === full) {
      return { match: true, confidence: "high" };
    }
    var inv = normalizeName([eleve.prenom, eleve.nom].filter(Boolean).join(" "));
    if (norm && inv && norm === inv) {
      return { match: true, confidence: "high" };
    }

    var p = participantFromName(label);
    if (sameEleve(p, eleve)) {
      return { match: true, confidence: "medium" };
    }

    var eleves = ctx.elevesClasse || [];
    if (norm && !norm.match(/\s/) && eleves.length) {
      var prenomOnly = elevesWithPrenom(eleves, norm);
      if (prenomOnly.length === 1 && prenomOnly[0].id === eleve.id) {
        return { match: true, confidence: "medium" };
      }
      if (prenomOnly.length > 1) {
        return { match: false, confidence: null };
      }
    }

    return { match: false, confidence: null };
  }

  function isTeamImportTool(toolId) {
    return TEAM_IMPORT_TOOLS.indexOf(toolId) >= 0;
  }

  function isDualPlayerImportTool(toolId) {
    return DUAL_PLAYER_IMPORT_TOOLS.indexOf(toolId) >= 0;
  }

  function teamNameFromPayload(obj, fallback) {
    if (!obj) return fallback || "—";
    return String(obj.name || obj.label || obj.nom || fallback || "—").trim();
  }

  /**
   * Slots joueur d’un import compteur (libellé saisi dans l’outil source).
   * @returns {Array<{ slot: string, label: string }>}
   */
  function getImportPlayerSlots(record) {
    if (!record || !record.payload || !isDualPlayerImportTool(record.toolId)) return [];
    var p = record.payload;
    switch (record.toolId) {
      case "compteur-ptb":
        return ["a", "b"].map(function (id) {
          var t = p.teams && p.teams[id];
          return { slot: id, label: teamNameFromPayload(t, "Équipe " + id.toUpperCase()) };
        });
      case "compteur-bonus":
        return ["A", "B"].map(function (id) {
          var pl = p.players && p.players[id];
          return { slot: id, label: teamNameFromPayload(pl, "Joueur " + id) };
        });
      case "compteur-ratio":
        return ["a", "b"].map(function (id) {
          var s = (p.students || p.eleves) && (p.students || p.eleves)[id];
          return { slot: id, label: teamNameFromPayload(s, "Équipe " + id.toUpperCase()) };
        });
      default:
        return [];
    }
  }

  function importSubjectKind(imp) {
    if (!imp) return "unknown";
    if (isTeamImportTool(imp.toolId)) return "team";
    if (imp.payload && (imp.payload.eleveId || imp.payload.eleve)) return "eleve";
    if (imp.auteurLabel) return "eleve";
    return "unknown";
  }

  function importConcernsEleve(imp, eleve, classeNom, ctx) {
    if (!imp || !eleve) return false;
    ctx = ctx || {};
    ctx.classeId = ctx.classeId || eleve.classeId;
    ctx.elevesClasse = ctx.elevesClasse || [];

    if (isTeamImportTool(imp.toolId)) {
      if (imp.payload && imp.payload.eleveId && eleve.id === imp.payload.eleveId) return true;
      if (imp.payload && imp.payload.eleve && sameEleve(imp.payload.eleve, eleve)) return true;
      return false;
    }

    if (isDualPlayerImportTool(imp.toolId)) {
      var assoc = imp.playerAssociations || {};
      var slots = getImportPlayerSlots(imp);
      var si;
      for (si = 0; si < slots.length; si++) {
        var slotKey = slots[si].slot;
        var stored = assoc[slotKey];
        if (stored && stored.eleveId && eleve.id === stored.eleveId) return true;
      }
      for (si = 0; si < slots.length; si++) {
        var slotLabel = slots[si].label;
        if (slotLabel && labelMatchesEleve(slotLabel, eleve, ctx).match) return true;
      }
      return false;
    }

    if (imp.payload && imp.payload.eleveId && eleve.id === imp.payload.eleveId) return true;
    if (imp.payload && imp.payload.eleve && sameEleve(imp.payload.eleve, eleve)) return true;

    if (imp.auteurLabel) {
      var m = labelMatchesEleve(imp.auteurLabel, eleve, ctx);
      if (m.match) return true;
    }

    if (
      imp.classeLabel &&
      classeNom &&
      normalizeName(imp.classeLabel) === normalizeName(classeNom) &&
      imp.auteurLabel
    ) {
      return labelMatchesEleve(imp.auteurLabel, eleve, ctx).match;
    }

    return false;
  }

  function importConcernsClasse(imp, classe) {
    if (!imp || !classe) return false;
    if (imp.classeLabel && normalizeName(imp.classeLabel) === normalizeName(classe.nom)) return true;
    if (imp.classeId && imp.classeId === classe.id) return true;
    return false;
  }

  function nameMatchesEleve(name, eleve, ctx) {
    return labelMatchesEleve(name, eleve, ctx).match;
  }

  return {
    ALIASES_PARAM_ID: ALIASES_PARAM_ID,
    TEAM_IMPORT_TOOLS: TEAM_IMPORT_TOOLS,
    DUAL_PLAYER_IMPORT_TOOLS: DUAL_PLAYER_IMPORT_TOOLS,
    normalizeName: normalizeName,
    labelEleve: labelEleve,
    sameEleve: sameEleve,
    participantFromName: participantFromName,
    extractAliasesFromParametres: extractAliasesFromParametres,
    findAliasEleveId: findAliasEleveId,
    labelMatchesEleve: labelMatchesEleve,
    nameMatchesEleve: nameMatchesEleve,
    isTeamImportTool: isTeamImportTool,
    isDualPlayerImportTool: isDualPlayerImportTool,
    getImportPlayerSlots: getImportPlayerSlots,
    importSubjectKind: importSubjectKind,
    importConcernsEleve: importConcernsEleve,
    importConcernsClasse: importConcernsClasse,
  };
});
