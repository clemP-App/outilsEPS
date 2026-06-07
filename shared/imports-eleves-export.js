/**
 * Export lisible des imports élèves (CSV Excel / PDF).
 * — CSV : tableau synthèse ; si un seul outil est filtré, colonnes adaptées à cet outil.
 * — PDF : liste courte, une phrase-résultat par import.
 */
(function (root, factory) {
  "use strict";
  var api = factory(getToolTitle());
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ImportsElevesExport = api;
  }

  function getToolTitle() {
    if (typeof module !== "undefined" && module.exports) {
      try {
        return require("./qr-exchange-core.js").toolTitle;
      } catch (e) {
        return function (id) {
          return id;
        };
      }
    }
    return typeof QrExchangeCore !== "undefined"
      ? QrExchangeCore.toolTitle
      : function (id) {
          return id;
        };
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function (
  toolTitleFn
) {
  "use strict";

  function toolTitle(toolId) {
    return toolTitleFn(toolId) || toolId;
  }

  function journalCore() {
    if (typeof JournalMusculationCore !== "undefined") return JournalMusculationCore;
    if (typeof globalThis !== "undefined" && globalThis.JournalMusculationCore) {
      return globalThis.JournalMusculationCore;
    }
    if (typeof module !== "undefined" && module.exports) {
      try {
        return require("./journal-musculation-core.js");
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch (e) {
      return iso;
    }
  }

  function escCsv(val) {
    var s = val == null ? "" : String(val);
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function csvRow(cells) {
    return cells.map(escCsv).join(";");
  }

  function teamName(team, fallback) {
    return (team && team.name && String(team.name).trim()) || fallback;
  }

  function championnatEntries(payload) {
    return Array.isArray(payload && payload.entries) ? payload.entries : [];
  }

  function championnatPouleName(payload) {
    return (
      (payload && payload.source && payload.source.pouleName) ||
      (payload && payload.pouleName) ||
      "Poule"
    );
  }

  function championnatParticipantCount(entries) {
    var seen = {};
    (entries || []).forEach(function (match) {
      [match.homeName, match.awayName].forEach(function (name) {
        var key = name && String(name).trim().toLowerCase();
        if (key) seen[key] = true;
      });
    });
    return Object.keys(seen).length;
  }

  function championnatScoreLabel(match) {
    if (!match) return "—";
    var home = match.homeName || "Participant";
    var away = match.awayName || "Participant";
    var hs = match.homeScore != null ? match.homeScore : "—";
    var as = match.awayScore != null ? match.awayScore : "—";
    return home + " " + hs + " - " + as + " " + away;
  }

  function humanSummary(rec) {
    var p = rec.payload || {};
    switch (rec.toolId) {
      case "table-marque": {
        var L = p.teams && p.teams.left;
        var R = p.teams && p.teams.right;
        var left = teamName(L, "Gauche") + " " + (L && L.score != null ? L.score : "—");
        var right = teamName(R, "Droite") + " " + (R && R.score != null ? R.score : "—");
        return left + " — " + right;
      }
      case "compteur-ptb": {
        var a = p.teams && p.teams.a;
        var b = p.teams && p.teams.b;
        var sa = a && a.goals != null ? a.goals : "—";
        var sb = b && b.goals != null ? b.goals : "—";
        return (
          teamName(a, "Équipe A") +
          " " +
          sa +
          " but · " +
          teamName(b, "Équipe B") +
          " " +
          sb +
          " but" +
          (p.finished ? " (match terminé)" : "")
        );
      }
      case "compteur-bonus": {
        var pa = p.players && p.players.A;
        var pb = p.players && p.players.B;
        return (
          teamName(pa, "A") +
          " " +
          (pa && pa.score != null ? pa.score : "—") +
          " pt · " +
          teamName(pb, "B") +
          " " +
          (pb && pb.score != null ? pb.score : "—") +
          " pt"
        );
      }
      case "compteur-ratio": {
        var ra = p.students && p.students.a;
        var rb = p.students && p.students.b;
        return (
          teamName(ra, "A") +
          " " +
          (ra && ra.ratio != null ? ra.ratio : "—") +
          " % · " +
          teamName(rb, "B") +
          " " +
          (rb && rb.ratio != null ? rb.ratio : "—") +
          " %"
        );
      }
      case "vitesse-plots": {
        var parts = [];
        if (p.label) parts.push(p.label);
        if (p.vitesseMoyenne != null) parts.push("moy. " + p.vitesseMoyenne + " km/h");
        if ((p.passages || []).length) parts.push((p.passages || []).length + " passage(s)");
        return parts.length ? parts.join(" · ") : "—";
      }
      case "relais-eleve": {
        var rp = [];
        if (p.label) rp.push(p.label);
        if (p.temps && p.temps.total) rp.push(p.temps.total);
        if (p.vitesses && p.vitesses.zt != null) rp.push("ZT " + p.vitesses.zt + " km/h");
        if (p.efficaciteZT && p.efficaciteZT.note10 != null) {
          rp.push("trans. " + String(p.efficaciteZT.note10).replace(".", ",") + "/10");
        } else if (p.efficaciteZT && p.efficaciteZT.coefficient != null) {
          rp.push("trans. " + (p.efficaciteZT.coefficient / 10).toFixed(1).replace(".", ",") + "/10");
        }
        return rp.length ? rp.join(" · ") : "—";
      }
      case "zone-impact": {
        var z = [];
        if (p.activityLabel || p.activity) z.push(p.activityLabel || p.activity);
        if (p.total != null) z.push(p.total + " impact(s)");
        if (p.mainZone) z.push("zone " + p.mainZone);
        return z.length ? z.join(" · ") : "—";
      }
      case "journal-musculation": {
        var sess = p;
        var JM = journalCore();
        if (JM && JM.expandSharePayload) {
          sess = JM.expandSharePayload(p);
        } else if (p.session) {
          sess = p.session;
        }
        var exoN = (sess.exercises || []).length;
        var sum = sess.summary || {};
        return (
          (sess.title || "Séance") +
          " · " +
          (exoN || sum.exerciseCount != null ? exoN || sum.exerciseCount : "—") +
          " exo." +
          (sum.setCount != null ? " · " + sum.setCount + " séries" : "") +
          (sum.volumeKg ? " · " + sum.volumeKg + " kg" : "")
        );
      }
      case "questions-debrief": {
        var exp =
          typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.expandPayload
            ? QuestionsDebriefCore.expandPayload(p)
            : p;
        var reps = exp.reponses || [];
        var nb = reps.filter(function (r) {
          return r.reponse && String(r.reponse).trim();
        }).length;
        var label = exp.seanceTitle || exp.titre || exp.porteeLabel || "Débrief";
        if (exp.dateLabel) label += " · " + exp.dateLabel;
        return label + " · " + nb + " réponse(s)";
      }
      case "championnat-poule-unique": {
        var entriesChamp = championnatEntries(p);
        return championnatPouleName(p) + " · " + entriesChamp.length + " match(s) transmis";
      }
      default:
        return "—";
    }
  }

  /** Lignes complémentaires pour le PDF (stats détaillées, sans métadonnées dupliquées). */
  function humanDetailLines(rec) {
    var p = rec.payload || {};
    var lines = [];
    switch (rec.toolId) {
      case "compteur-ptb":
        ["a", "b"].forEach(function (id) {
          var t = p.teams && p.teams[id];
          if (!t) return;
          var poss =
            t.possessions != null ? t.possessions : (t.losses || 0) + (t.shots || 0);
          var bits = [
            poss + " poss.",
            (t.losses != null ? t.losses : "—") + " pertes",
            (t.shots != null ? t.shots : "—") + " tirs",
            (t.goals != null ? t.goals : "—") + " buts",
          ];
          if (t.efficiency != null) bits.push("eff. tir " + t.efficiency + " %");
          if (t.shotsPerPossession != null) bits.push("tirs/poss. " + t.shotsPerPossession + " %");
          if (t.lossesPerPossession != null) bits.push("pertes/poss. " + t.lossesPerPossession + " %");
          if (t.possessionLabel) bits.push("temps " + t.possessionLabel);
          lines.push(teamName(t, "Équipe " + id.toUpperCase()) + " : " + bits.join(", "));
        });
        if (p.timer && p.timer.displayLabel) {
          lines.push(
            "Chrono : " +
              [p.timer.statusLabel, p.timer.displayLabel, p.timer.durationLabel]
                .filter(Boolean)
                .join(" · ")
          );
        }
        break;
      case "compteur-bonus":
        ["A", "B"].forEach(function (id) {
          var pl = p.players && p.players[id];
          if (!pl || !pl.counts) return;
          lines.push(
            teamName(pl, "Joueur " + id) +
              " : " +
              (pl.score != null ? pl.score + " pt" : "—") +
              " (bonus " +
              pl.counts.bonus +
              ", points " +
              pl.counts.normal +
              ", malus " +
              pl.counts.malus +
              ")"
          );
        });
        break;
      case "compteur-ratio":
        ["a", "b"].forEach(function (id) {
          var s = p.students && p.students[id];
          if (!s) return;
          lines.push(
            teamName(s, "Équipe " + id.toUpperCase()) +
              " : " +
              (s.plus != null ? s.plus : "—") +
              " réussites, " +
              (s.minus != null ? s.minus : "—") +
              " échecs, ratio " +
              (s.ratio != null ? s.ratio + " %" : "—")
          );
        });
        break;
      case "vitesse-plots":
        (p.passages || []).slice(0, 12).forEach(function (pass) {
          lines.push(
            "Plot " +
              pass.numero +
              " : " +
              (pass.vitesseDernier != null ? pass.vitesseDernier + " km/h" : "—") +
              (pass.intervalLabel ? " (" + pass.intervalLabel + ")" : "")
          );
        });
        if ((p.passages || []).length > 12) {
          lines.push("… et " + ((p.passages || []).length - 12) + " autre(s) passage(s)");
        }
        break;
      case "relais-eleve":
        if (p.temps) {
          lines.push("Total : " + (p.temps.total || "—"));
          lines.push("Z1 : " + (p.temps.z1 || "—") + (p.vitesses && p.vitesses.z1 != null ? " (" + p.vitesses.z1 + " km/h)" : ""));
          lines.push("ZT : " + (p.temps.zt || "—") + (p.vitesses && p.vitesses.zt != null ? " (" + p.vitesses.zt + " km/h)" : ""));
          lines.push("Z2 : " + (p.temps.z2 || "—") + (p.vitesses && p.vitesses.z2 != null ? " (" + p.vitesses.z2 + " km/h)" : ""));
        }
        if (p.distances && p.distances.total) {
          lines.push("Distances : " + p.distances.z1 + " + " + p.distances.zt + " + " + p.distances.z2 + " = " + p.distances.total + " m");
        }
        if (p.efficaciteZT) {
          var effR = p.efficaciteZT;
          if (effR.note10 != null) {
            lines.push("Note transmission : " + String(effR.note10).replace(".", ",") + "/10");
          }
          if (effR.itIdeal != null && effR.itReel != null) {
            lines.push("IT idéal " + effR.itIdeal + " % · IT réel " + effR.itReel + " %");
          }
          if (effR.penaliteLabel) lines.push("Incident : " + effR.penaliteLabel);
          else if (effR.verdict) lines.push(effR.verdict);
        }
        break;
      case "zone-impact":
        (p.zones || []).forEach(function (z) {
          lines.push(z.label + " : " + z.count + " (" + z.percent + " %)");
        });
        break;
      case "journal-musculation": {
        var sess = p;
        var JM = journalCore();
        if (JM && JM.expandSharePayload) {
          sess = JM.expandSharePayload(p);
        } else if (p.session) {
          sess = p.session;
        }
        (sess.exercises || []).forEach(function (ex) {
          var rpeLabel =
            JM && JM.formatRpeListLabel
              ? JM.formatRpeListLabel(ex.rpes || (ex.sets || []).map(function (set) { return set.rpe; }))
              : "";
          var rpeSuffix = rpeLabel ? " (" + rpeLabel + ")" : "";
          if (ex.setMode === "uniform" && ex.setsLabel) {
            lines.push((ex.name || "Exercice") + " : " + ex.setsLabel + rpeSuffix);
            return;
          }
          var bits = (ex.sets || []).map(function (set, i) {
            return (
              "S" +
              (i + 1) +
              " " +
              (set.reps != null ? set.reps : "—") +
              "×" +
              (set.weightKg != null ? set.weightKg + "kg" : "—")
            );
          });
          lines.push((ex.name || "Exercice") + " : " + (bits.length ? bits.join(", ") : "—") + rpeSuffix);
        });
        if (sess.notes) lines.push("Notes : " + sess.notes);
        break;
      }
      case "questions-debrief": {
        var expLines =
          typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.expandPayload
            ? QuestionsDebriefCore.expandPayload(p)
            : p;
        (expLines.reponses || []).forEach(function (row, i) {
          var q = row.question || "—";
          var def =
            typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.questionDef
              ? QuestionsDebriefCore.questionDef(row, expLines.portee)
              : null;
          var r =
            typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.formatReponseLabel
              ? QuestionsDebriefCore.formatReponseLabel(row.reponse, def)
              : row.reponse && String(row.reponse).trim()
                ? row.reponse
                : "—";
          var theme = row.theme ? "[" + row.theme + "] " : "";
          lines.push(theme + (i + 1) + ". " + q);
          lines.push("→ " + r);
        });
        break;
      }
      case "championnat-poule-unique": {
        var entriesLines = championnatEntries(p);
        lines.push(championnatPouleName(p) + " : " + entriesLines.length + " match(s) transmis");
        entriesLines.slice(0, 12).forEach(function (match) {
          lines.push(championnatScoreLabel(match));
        });
        if (entriesLines.length > 12) {
          lines.push("… et " + (entriesLines.length - 12) + " autre(s) match(s)");
        }
        break;
      }
      case "table-marque":
        if (p.timer && (p.timer.displayLabel || p.timer.durationLabel)) {
          lines.push(
            "Timer : " + (p.timer.displayLabel || "—") +
              (p.timer.durationLabel ? " (réglé " + p.timer.durationLabel + ")" : "")
          );
        }
        break;
      default:
        break;
    }
    return lines;
  }

  function recordHeading(rec) {
    var parts = [toolTitle(rec.toolId)];
    if (rec.classeLabel) parts.push(rec.classeLabel);
    if (rec.auteurLabel) parts.push(rec.auteurLabel);
    parts.push(fmtDate(rec.importedAt || rec.createdAt));
    return parts.filter(Boolean).join(" · ");
  }

  function buildSummaryTable(records) {
    return (records || []).map(function (rec) {
      return {
        importedAt: fmtDate(rec.importedAt),
        tool: toolTitle(rec.toolId),
        classe: rec.classeLabel || "",
        participant: rec.auteurLabel || "",
        summary: humanSummary(rec),
      };
    });
  }

  function baseMeta(rec) {
    return [fmtDate(rec.importedAt), rec.classeLabel || "", rec.auteurLabel || ""];
  }

  function cell(val) {
    return val == null || val === "" ? "—" : String(val);
  }

  function headersForTool(toolId) {
    switch (toolId) {
      case "table-marque":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Équipe gauche",
          "Score G",
          "Équipe droite",
          "Score D",
          "Timer",
        ];
      case "compteur-ptb":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Équipe A",
          "Score A",
          "Poss. est. A",
          "Pertes A",
          "Tirs A",
          "Buts A",
          "Eff. tir A (%)",
          "Équipe B",
          "Score B",
          "Poss. est. B",
          "Pertes B",
          "Tirs B",
          "Buts B",
          "Eff. tir B (%)",
          "Match terminé",
        ];
      case "compteur-bonus":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Joueur A",
          "Points A",
          "Bonus A",
          "Points norm. A",
          "Malus A",
          "Joueur B",
          "Points B",
          "Bonus B",
          "Points norm. B",
          "Malus B",
        ];
      case "compteur-ratio":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Équipe A",
          "Réussites A",
          "Échecs A",
          "Ratio A (%)",
          "Équipe B",
          "Réussites B",
          "Échecs B",
          "Ratio B (%)",
        ];
      case "vitesse-plots":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Libellé",
          "Vitesse moy. (km/h)",
          "Nb passages",
          "Dernier plot (km/h)",
        ];
      case "relais-eleve":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Libellé",
          "Temps total",
          "Z1 (temps)",
          "ZT (temps)",
          "Z2 (temps)",
          "Vitesse Z1 (km/h)",
          "Vitesse ZT (km/h)",
          "Vitesse Z2 (km/h)",
          "Note transmission (/10)",
        ];
      case "zone-impact":
        return [
          "Date import",
          "Classe",
          "Joueur / Équipe",
          "Activité",
          "Total impacts",
          "Zone principale",
          "Zones touchées",
        ];
      case "journal-musculation":
        return [
          "Date import",
          "Classe",
          "Séance / élève",
          "Titre séance",
          "Date séance",
          "Exercices",
          "Séries",
          "Répétitions",
          "Volume (kg)",
        ];
      case "questions-debrief":
        return [
          "Date import",
          "Classe",
          "Élève / groupe",
          "Séance",
          "Date séance",
          "Type de bilan",
          "Réponses renseignées",
          "Total questions",
        ];
      case "championnat-poule-unique":
        return [
          "Date import",
          "Classe",
          "Participant",
          "Poule",
          "Matchs transmis",
          "Participants concernés",
          "Dernier score",
        ];
      default:
        return ["Date import", "Classe", "Joueur / Équipe", "Résultat"];
    }
  }

  function recordCells(toolId, rec) {
    var p = rec.payload || {};
    var L, R, a, b, pa, pb, ra, rb, last;
    switch (toolId) {
      case "table-marque":
        L = p.teams && p.teams.left;
        R = p.teams && p.teams.right;
        return baseMeta(rec).concat([
          cell(teamName(L, "—")),
          cell(L && L.score != null ? L.score : null),
          cell(teamName(R, "—")),
          cell(R && R.score != null ? R.score : null),
          cell(p.timer ? p.timer.displayLabel || p.timer.durationLabel : null),
        ]);
      case "compteur-ptb":
        a = p.teams && p.teams.a;
        b = p.teams && p.teams.b;
        function ptbPoss(team) {
          if (!team) return null;
          if (team.possessions != null) return team.possessions;
          return (team.losses || 0) + (team.shots || 0);
        }
        return baseMeta(rec).concat([
          cell(teamName(a, "—")),
          cell(a && a.goals != null ? a.goals : null),
          cell(ptbPoss(a)),
          cell(a && a.losses != null ? a.losses : null),
          cell(a && a.shots != null ? a.shots : null),
          cell(a && a.goals != null ? a.goals : null),
          cell(a && a.efficiency != null ? a.efficiency : null),
          cell(teamName(b, "—")),
          cell(b && b.goals != null ? b.goals : null),
          cell(ptbPoss(b)),
          cell(b && b.losses != null ? b.losses : null),
          cell(b && b.shots != null ? b.shots : null),
          cell(b && b.goals != null ? b.goals : null),
          cell(b && b.efficiency != null ? b.efficiency : null),
          cell(p.finished ? "Oui" : "Non"),
        ]);
      case "compteur-bonus":
        pa = p.players && p.players.A;
        pb = p.players && p.players.B;
        return baseMeta(rec).concat([
          cell(teamName(pa, "—")),
          cell(pa && pa.score != null ? pa.score : null),
          cell(pa && pa.counts ? pa.counts.bonus : null),
          cell(pa && pa.counts ? pa.counts.normal : null),
          cell(pa && pa.counts ? pa.counts.malus : null),
          cell(teamName(pb, "—")),
          cell(pb && pb.score != null ? pb.score : null),
          cell(pb && pb.counts ? pb.counts.bonus : null),
          cell(pb && pb.counts ? pb.counts.normal : null),
          cell(pb && pb.counts ? pb.counts.malus : null),
        ]);
      case "compteur-ratio":
        ra = p.students && p.students.a;
        rb = p.students && p.students.b;
        return baseMeta(rec).concat([
          cell(teamName(ra, "—")),
          cell(ra && ra.plus != null ? ra.plus : null),
          cell(ra && ra.minus != null ? ra.minus : null),
          cell(ra && ra.ratio != null ? ra.ratio : null),
          cell(teamName(rb, "—")),
          cell(rb && rb.plus != null ? rb.plus : null),
          cell(rb && rb.minus != null ? rb.minus : null),
          cell(rb && rb.ratio != null ? rb.ratio : null),
        ]);
      case "vitesse-plots":
        last = (p.passages || [])[(p.passages || []).length - 1];
        return baseMeta(rec).concat([
          cell(p.label),
          cell(p.vitesseMoyenne != null ? p.vitesseMoyenne : null),
          cell((p.passages || []).length),
          cell(last && last.vitesseDernier != null ? last.vitesseDernier : null),
        ]);
      case "relais-eleve":
        return baseMeta(rec).concat([
          cell(p.label),
          cell(p.temps && p.temps.total),
          cell(p.temps && p.temps.z1),
          cell(p.temps && p.temps.zt),
          cell(p.temps && p.temps.z2),
          cell(p.vitesses && p.vitesses.z1 != null ? p.vitesses.z1 : null),
          cell(p.vitesses && p.vitesses.zt != null ? p.vitesses.zt : null),
          cell(p.vitesses && p.vitesses.z2 != null ? p.vitesses.z2 : null),
          cell(
            p.efficaciteZT && p.efficaciteZT.note10 != null
              ? p.efficaciteZT.note10
              : p.efficaciteZT && p.efficaciteZT.coefficient != null
                ? p.efficaciteZT.coefficient / 10
                : null
          ),
        ]);
      case "zone-impact":
        return baseMeta(rec).concat([
          cell(p.activityLabel || p.activity),
          cell(p.total != null ? p.total : null),
          cell(p.mainZone),
          cell(p.coverage),
        ]);
      case "journal-musculation": {
        var sess = p;
        var JM = journalCore();
        if (JM && JM.expandSharePayload) {
          sess = JM.expandSharePayload(p);
        } else if (p.session) {
          sess = p.session;
        }
        var sum = sess.summary || {};
        return baseMeta(rec).concat([
          cell(sess.title),
          cell(sess.dateLabel || sess.dateIso),
          cell(sum.exerciseCount),
          cell(sum.setCount),
          cell(sum.repCount),
          cell(sum.volumeKg),
        ]);
      }
      case "questions-debrief": {
        var expCells =
          typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.expandPayload
            ? QuestionsDebriefCore.expandPayload(p)
            : p;
        var repsDebrief = expCells.reponses || [];
        var nbDebrief = repsDebrief.filter(function (r) {
          return r.reponse && String(r.reponse).trim();
        }).length;
        return baseMeta(rec).concat([
          cell(expCells.seanceTitle || expCells.titre),
          cell(expCells.dateLabel || expCells.dateIso),
          cell(expCells.porteeLabel || expCells.portee),
          cell(nbDebrief),
          cell(repsDebrief.length),
        ]);
      }
      case "championnat-poule-unique": {
        var entriesUnique = championnatEntries(p);
        return baseMeta(rec).concat([
          cell(championnatPouleName(p)),
          cell(entriesUnique.length),
          cell(championnatParticipantCount(entriesUnique)),
          cell(championnatScoreLabel(entriesUnique[entriesUnique.length - 1])),
        ]);
      }
      default:
        return baseMeta(rec).concat([cell(humanSummary(rec))]);
    }
  }

  function buildTableModel(toolId, records) {
    return {
      headers: headersForTool(toolId),
      rows: (records || []).map(function (rec) {
        return { id: rec.id, cells: recordCells(toolId, rec) };
      }),
    };
  }

  function buildCsv(toolId, records) {
    if (!toolId) return "\ufeff";
    var lines = ["\ufeff", csvRow(headersForTool(toolId))];
    (records || []).forEach(function (rec) {
      lines.push(csvRow(recordCells(toolId, rec)));
    });
    return lines.join("\r\n");
  }

  function buildPdf(records) {
    return (records || []).map(function (rec) {
      return {
        heading: recordHeading(rec),
        summary: humanSummary(rec),
        details: humanDetailLines(rec),
      };
    });
  }

  return {
    humanSummary: humanSummary,
    humanDetailLines: humanDetailLines,
    buildSummaryTable: buildSummaryTable,
    buildTableModel: buildTableModel,
    headersForTool: headersForTool,
    recordCells: recordCells,
    buildCsv: buildCsv,
    buildPdf: buildPdf,
    toolTitle: toolTitle,
    fmtDate: fmtDate,
  };
});
