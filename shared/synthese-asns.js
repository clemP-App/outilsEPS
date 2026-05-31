/**
 * Synthèse — agrégation Validation ASNS (savoir-nager).
 * N’expose rien si aucune donnée de validation pour l’élève.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SyntheseAsns = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DATA_ID = "validation-asns-data";

  function asnsCore() {
    return typeof ValidationAsnsCore !== "undefined" ? ValidationAsnsCore : null;
  }

  function normalizeName(value) {
    return String(value === null || value === undefined ? "" : value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function sameEleve(a, b) {
    if (!a || !b) return false;
    var nomA = normalizeName(a.nom);
    var nomB = normalizeName(b.nom);
    var prenomA = normalizeName(a.prenom);
    var prenomB = normalizeName(b.prenom);
    if (!nomA || !prenomA || !nomB || !prenomB) return false;
    return nomA === nomB && prenomA === prenomB;
  }

  function sameClasseLabel(a, b) {
    return normalizeName(a) === normalizeName(b);
  }

  function extractAsnsData(parametres) {
    var raw = null;
    (parametres || []).forEach(function (p) {
      if (p && p.id === DATA_ID) raw = p;
    });
    if (!raw) return null;
    var Core = asnsCore();
    if (Core && Core.normaliserEleve) {
      return {
        classes: Array.isArray(raw.classes) ? raw.classes.slice() : [],
        eleves: (raw.eleves || []).map(Core.normaliserEleve).filter(Boolean),
      };
    }
    return {
      classes: Array.isArray(raw.classes) ? raw.classes.slice() : [],
      eleves: Array.isArray(raw.eleves) ? raw.eleves.slice() : [],
    };
  }

  function getAsnsClasse(asnsData, classeId) {
    if (!asnsData || !classeId) return null;
    for (var i = 0; i < (asnsData.classes || []).length; i++) {
      var c = asnsData.classes[i];
      if (c && c.id === classeId) return c;
    }
    return null;
  }

  function findAsnsEleve(asnsData, eleve, classeNom) {
    if (!asnsData || !eleve || !asnsData.eleves || !asnsData.eleves.length) return null;
    var matches = asnsData.eleves.filter(function (ae) {
      return sameEleve(ae, eleve);
    });
    if (!matches.length) return null;
    if (classeNom && asnsData.classes && asnsData.classes.length) {
      var byClasse = matches.filter(function (ae) {
        var c = getAsnsClasse(asnsData, ae.classeId);
        return c && sameClasseLabel(c.nom, classeNom);
      });
      if (byClasse.length) return byClasse[0];
    }
    return matches[0];
  }

  function eleveHasAsnsData(asnsEleve) {
    if (!asnsEleve) return false;
    var Core = asnsCore();
    if (Core) {
      var prog = Core.progressionEleve(asnsEleve);
      if (prog && prog.commence) return true;
      var st = asnsEleve.statut || Core.STATUT_ELEVE.NON_COMMENCE;
      if (st && st !== Core.STATUT_ELEVE.NON_COMMENCE) return true;
    } else {
      var etapes = asnsEleve.etapes || {};
      var keys = Object.keys(etapes);
      for (var i = 0; i < keys.length; i++) {
        if (etapes[keys[i]]) return true;
      }
      if (asnsEleve.statut && asnsEleve.statut !== "non_commence") return true;
    }
    if (String(asnsEleve.commentaires || "").trim()) return true;
    if (asnsEleve.dateValidation) return true;
    if (Array.isArray(asnsEleve.historique) && asnsEleve.historique.length) return true;
    return false;
  }

  function buildSummary(asnsEleve) {
    if (!asnsEleve || !eleveHasAsnsData(asnsEleve)) return null;
    var Core = asnsCore();
    var prog = Core
      ? Core.progressionEleve(asnsEleve)
      : { valides: 0, total: 13, pct: 0, commence: true };
    var statut = Core ? Core.calculerStatutGlobal(asnsEleve) : asnsEleve.statut || "en_cours";
    var statutLabel = Core && Core.STATUT_LABELS ? Core.STATUT_LABELS[statut] || statut : statut;
    var headline =
      statutLabel +
      " — " +
      prog.valides +
      "/" +
      prog.total +
      " étape(s) validée(s)" +
      (prog.pct != null ? " (" + prog.pct + " %)" : "");
    return {
      statut: statut,
      statutLabel: statutLabel,
      valides: prog.valides,
      total: prog.total,
      pct: prog.pct,
      headline: headline,
      commentaires: String(asnsEleve.commentaires || "").trim(),
      dateValidation: asnsEleve.dateValidation || null,
    };
  }

  function resolveForEleve(data, eleve, classeNom) {
    var asnsData = data && data.asnsData;
    if (!asnsData) {
      asnsData = extractAsnsData(data && data.parametres);
    }
    var match = findAsnsEleve(asnsData, eleve, classeNom);
    return buildSummary(match);
  }

  function lectureLines(asns) {
    if (!asns) return [];
    var lines = [asns.headline + "."];
    if (asns.commentaires) lines.push("Remarques ASNS : " + asns.commentaires + ".");
    if (asns.dateValidation) {
      try {
        lines.push(
          "Date de validation : " +
            new Date(asns.dateValidation).toLocaleDateString("fr-FR") +
            "."
        );
      } catch (e) {
        lines.push("Date de validation enregistrée.");
      }
    }
    return lines;
  }

  return {
    DATA_ID: DATA_ID,
    extractAsnsData: extractAsnsData,
    findAsnsEleve: findAsnsEleve,
    eleveHasAsnsData: eleveHasAsnsData,
    buildSummary: buildSummary,
    resolveForEleve: resolveForEleve,
    lectureLines: lectureLines,
  };
});
