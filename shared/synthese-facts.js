/**
 * Synthèse EPS — faits pédagogiques structurés (headline, metrics, sujet).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SyntheseFacts = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var Identity = typeof SyntheseIdentity !== "undefined" ? SyntheseIdentity : null;

  function teamName(obj, fallback) {
    if (!obj) return fallback || "—";
    return (obj.name || obj.label || obj.nom || fallback || "—").trim();
  }

  function importHeadline(imp) {
    if (!imp) return "Import QR";
    if (typeof ImportsElevesExport !== "undefined" && ImportsElevesExport.humanSummary) {
      return ImportsElevesExport.humanSummary(imp);
    }
    var p = imp.payload || {};
    switch (imp.toolId) {
      case "table-marque": {
        var L = p.teams && p.teams.left;
        var R = p.teams && p.teams.right;
        return (
          teamName(L, "Gauche") +
          " " +
          (L && L.score != null ? L.score : "—") +
          " — " +
          teamName(R, "Droite") +
          " " +
          (R && R.score != null ? R.score : "—")
        );
      }
      case "compteur-ptb": {
        var a = p.teams && p.teams.a;
        var b = p.teams && p.teams.b;
        return (
          teamName(a, "Équipe A") +
          " " +
          (a && a.goals != null ? a.goals : "—") +
          " but · " +
          teamName(b, "Équipe B") +
          " " +
          (b && b.goals != null ? b.goals : "—") +
          " but"
        );
      }
      case "vitesse-plots": {
        var parts = [];
        if (p.label) parts.push(p.label);
        if (p.vitesseMoyenne != null) parts.push("moy. " + p.vitesseMoyenne + " km/h");
        if ((p.passages || []).length) parts.push(p.passages.length + " passage(s)");
        return parts.length ? parts.join(" · ") : "Vitesse aux plots";
      }
      case "questions-debrief":
        return "Débrief QR";
      case "journal-musculation":
        return "Séance musculation partagée";
      default:
        return imp.auteurLabel || imp.toolId || "Import QR";
    }
  }

  function buildImportFact(imp, subjectKind) {
    subjectKind = subjectKind || (Identity ? Identity.importSubjectKind(imp) : "eleve");
    var headline = importHeadline(imp);
    return {
      kind: "import_qr",
      toolId: imp.toolId,
      toolLabel: imp.toolLabel || imp.toolId,
      date: imp.importedAt || imp.createdAt,
      headline: headline,
      subject: {
        kind: subjectKind === "team" ? "team" : "eleve",
        label: imp.auteurLabel || headline,
      },
      source: { store: "importsEleves", id: imp.id || imp.exportId },
      raw: imp,
    };
  }

  function badgeCountDefi(p) {
    if (!p || !p.badges) return 0;
    return Object.keys(p.badges).reduce(function (acc, k) {
      return acc + Number(p.badges[k] || 0);
    }, 0);
  }

  function wrapActiviteFact(a) {
    if (!a) return null;
    if (a.headline) return a;
    var headline = a.resume || "Participation";
    if (a.details && a.details.length) {
      headline = a.resume + " · " + a.details.join(" · ");
    }
    return Object.assign({}, a, {
      kind: "activite_seance",
      headline: headline,
      subject: a.subject || { kind: "eleve", label: a.playerName || "" },
      confidence: a.confidence || "medium",
    });
  }

  function engagementLineFromFact(fact) {
    if (!fact) return "";
    var lbl = fact.toolLabel || fact.toolId || "Activité";
    var line = lbl + " : " + (fact.headline || fact.resume || "—");
    if (fact.sessionNom && fact.headline && fact.headline.indexOf(fact.sessionNom) < 0) {
      line += " (« " + fact.sessionNom + " »)";
    }
    return line + ".";
  }

  function factToTimelineEvent(fact) {
    if (!fact) return null;
    return {
      type: fact.kind === "import_qr" ? "import" : "activite",
      date: fact.date,
      label:
        (fact.toolLabel || fact.toolId || "Activité") +
        (fact.titre ? " — " + fact.titre : fact.sessionNom ? " — " + fact.sessionNom : ""),
      detail: fact.headline || fact.resume || "",
    };
  }

  return {
    importHeadline: importHeadline,
    buildImportFact: buildImportFact,
    badgeCountDefi: badgeCountDefi,
    wrapActiviteFact: wrapActiviteFact,
    engagementLineFromFact: engagementLineFromFact,
    factToTimelineEvent: factToTimelineEvent,
  };
});
