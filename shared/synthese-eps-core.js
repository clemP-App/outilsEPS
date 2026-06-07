/**
 * Synthèse EPS — agrégation pure des données IndexedDB (sans DOM).
 * Utilisé par outils/synthese-eps.js et testable en Node.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SyntheseEpsCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SC =
    typeof SessionsCore !== "undefined"
      ? SessionsCore
      : {
          SESSION_TOOL_IDS: [
            "composition-equipes",
            "tournoi-elimination",
            "pyramide-victoires",
            "championnat-poule",
            "course-orientation",
            "defi-atp",
          ],
          toolLabel: function (id) {
            return id;
          },
        };

  var TOOL_LABELS_IMPORT = {
    "table-marque": "Table de marque",
    "compteur-ptb": "Compteur PTB",
    "compteur-bonus": "Compteur bonus",
    "compteur-ratio": "Compteur ratio",
    "vitesse-plots": "Vitesse aux plots",
    "relais-eleve": "Relais",
    "zone-impact": "Zone d'impact",
    "journal-musculation": "Journal de musculation",
    "questions-debrief": "Questions débrief",
  };

  var LONG_DISPENSE_JOURS = 14;
  var OUBLIS_ALERTE_SEUIL = 3;
  var ABSENCE_FREQ_SEUIL = 0.35;
  var ABSENCE_MIN_COLONNES = 3;

  var unknownShapeLogged = {};

  function logUnknown(kind, sample) {
    if (unknownShapeLogged[kind]) return;
    unknownShapeLogged[kind] = true;
    console.warn("[Synthèse EPS] Structure non reconnue — " + kind, sample);
  }

  /** Normalise un nom/prénom pour correspondance tolérante. */
  function normalizeName(value) {
    return String(value === null || value === undefined ? "" : value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function labelEleve(e) {
    if (!e) return "Sans nom";
    var parts = [e.nom, e.prenom]
      .map(function (s) {
        return String(s || "").trim();
      })
      .filter(Boolean);
    return parts.join(" ") || "Sans nom";
  }

  /**
   * Correspondance entre deux fiches élève (id prioritaire, sinon nom+prénom).
   */
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

  function sameClasseLabel(classeNom, label) {
    if (!classeNom || !label) return false;
    return normalizeName(classeNom) === normalizeName(label);
  }

  function parseDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function inPeriod(iso, period) {
    if (!period || (!period.from && !period.to)) return true;
    var d = parseDate(iso);
    if (!d) return true;
    if (period.from) {
      var f = parseDate(period.from);
      if (f && d < f) return false;
    }
    if (period.to) {
      var t = parseDate(period.to);
      if (t) {
        var end = new Date(t.getTime());
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  }

  function emptyData() {
    return {
      classes: [],
      eleves: [],
      dispenses: [],
      oublisMateriel: [],
      radarPerfs: [],
      sessions: [],
      championnats: [],
      tournoisElimination: [],
      parametres: [],
      importsEleves: [],
      tableauxSuivi: [],
      identiteAliases: [],
      asnsData: null,
    };
  }

  function normalizeLoadedData(raw) {
    if (!raw || typeof raw !== "object") return emptyData();
    var out = emptyData();
    Object.keys(out).forEach(function (key) {
      if (key === "asnsData" || key === "identiteAliases") return;
      var v = raw[key];
      out[key] = Array.isArray(v) ? v : [];
    });
    if (typeof SyntheseIdentity !== "undefined") {
      out.identiteAliases = SyntheseIdentity.extractAliasesFromParametres(out.parametres);
    }
    if (typeof SyntheseAsns !== "undefined") {
      out.asnsData = SyntheseAsns.extractAsnsData(out.parametres);
    }
    return out;
  }

  function identityCtxForEleve(data, eleve) {
    if (!eleve) return { aliases: (data && data.identiteAliases) || [] };
    return {
      classeId: eleve.classeId,
      elevesClasse: elevesDeClasse(data, eleve.classeId),
      aliases: (data && data.identiteAliases) || [],
    };
  }

  function getClasseById(data, classeId) {
    if (!classeId || !Array.isArray(data.classes)) return null;
    for (var i = 0; i < data.classes.length; i++) {
      if (data.classes[i] && data.classes[i].id === classeId) return data.classes[i];
    }
    return null;
  }

  function elevesDeClasse(data, classeId) {
    if (!classeId) return [];
    var classe = getClasseById(data, classeId);
    if (classe && Array.isArray(classe.eleves) && classe.eleves.length) {
      return classe.eleves.map(function (e) {
        return Object.assign({ classeId: classeId }, e);
      });
    }
    if (!Array.isArray(data.eleves)) return [];
    return data.eleves.filter(function (e) {
      return e && e.classeId === classeId;
    });
  }

  function getEleveById(data, eleveId, classeId) {
    if (!eleveId) return null;
    var list = classeId ? elevesDeClasse(data, classeId) : data.eleves || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === eleveId) return list[i];
    }
    if (!classeId && Array.isArray(data.eleves)) {
      for (var j = 0; j < data.eleves.length; j++) {
        if (data.eleves[j] && data.eleves[j].id === eleveId) return data.eleves[j];
      }
    }
    return null;
  }

  function matchRecordToEleve(record, eleve, classeNom) {
    if (!record || !eleve) return false;
    if (record.eleveId && eleve.id && record.eleveId === eleve.id) return true;
    if (record.classeId && eleve.classeId && record.classeId === eleve.classeId) {
      if (sameEleve(record, eleve)) return true;
    }
    if (record.classe && classeNom && !sameClasseLabel(classeNom, record.classe)) {
      if (record.classeId && eleve.classeId && record.classeId !== eleve.classeId) return false;
    }
    return sameEleve(record, eleve);
  }

  function matchRecordToClasse(record, classe) {
    if (!record || !classe) return false;
    if (record.classeId && record.classeId === classe.id) return true;
    if (record.classe && sameClasseLabel(classe.nom, record.classe)) return true;
    if (record.classeLabel && sameClasseLabel(classe.nom, record.classeLabel)) return true;
    if (record.classeNomSnapshot && sameClasseLabel(classe.nom, record.classeNomSnapshot)) return true;
    return false;
  }

  /**
   * Retourne toutes les entrées liées à un élève dans les stores bruts.
   */
  function ligneContientDonneesPeriode(ligne, period) {
    if (!period || (!period.from && !period.to)) return true;
    if (ligne.derniereActivite && inPeriod(ligne.derniereActivite, period)) return true;
    if (ligne.presenceStats && ligne.presenceStats.total > 0) return true;
    if (ligne.notes && ligne.notes.length) return true;
    if (
      ligne.colonnesDetail &&
      ligne.colonnesDetail.some(function (c) {
        return c.valeur !== null && c.valeur !== undefined && c.valeur !== "";
      })
    ) {
      return true;
    }
    return false;
  }

  function photoFinishBlocks(data) {
    return (data.tournoisElimination || []).filter(function (b) {
      return b && b.kind === "photo-finish";
    });
  }

  function sessionForPhotoFinishBlock(data, block) {
    if (!block || !block.sessionId || !Array.isArray(data.sessions)) return null;
    for (var i = 0; i < data.sessions.length; i++) {
      if (data.sessions[i] && data.sessions[i].id === block.sessionId) return data.sessions[i];
    }
    return null;
  }

  function photoFinishBlockLinkedToClasse(block, session, classeId, classeNom) {
    if (session) {
      if (classeId && session.classeId && session.classeId === classeId) return true;
      if (classeNom && session.classeNomSnapshot && sameClasseLabel(classeNom, session.classeNomSnapshot)) {
        return true;
      }
    }
    var info = block.sessionInfo || {};
    if (classeNom && info.className && sameClasseLabel(classeNom, info.className)) return true;
    if (
      classeNom &&
      (block.runners || []).some(function (r) {
        return r && r.className && sameClasseLabel(classeNom, r.className);
      })
    ) {
      return true;
    }
    if (
      classeNom &&
      (block.results || []).some(function (r) {
        return r && r.className && sameClasseLabel(classeNom, r.className);
      })
    ) {
      return true;
    }
    return false;
  }

  function photoFinishResultMatchesEleve(result, block, eleve, classeNom, data, period) {
    if (!result || result.isUnassigned) return false;
    var date = result.date || (block && block.updatedAt);
    if (!inPeriod(date, period)) return false;
    var ctx = identityCtxForEleve(data, eleve);
    if (result.runnerId && Array.isArray(block.runners)) {
      for (var i = 0; i < block.runners.length; i++) {
        var runner = block.runners[i];
        if (!runner || runner.id !== result.runnerId) continue;
        if (matchAuteurToEleve(runner.displayName || labelEleve(runner), eleve, ctx)) return true;
        if (sameEleve(runner, eleve)) return true;
      }
    }
    var name = result.runnerName || "";
    if (!name || normalizeName(name) === normalizeName("Non attribue")) return false;
    return matchAuteurToEleve(name, eleve, ctx);
  }

  function formatChronoMs(ms) {
    if (ms == null || isNaN(ms)) return "—";
    var total = Math.max(0, Math.round(Number(ms)));
    var min = Math.floor(total / 60000);
    var sec = (total % 60000) / 1000;
    if (min > 0) {
      return min + ":" + (sec < 10 ? "0" : "") + sec.toFixed(2);
    }
    return sec.toFixed(2) + " s";
  }

  function photoFinishResultLabel(result) {
    if (!result) return "";
    var time = result.formattedTime || formatChronoMs(result.timeMs);
    var extra = [];
    if (result.rank) extra.push(result.rank + "e");
    if (Number(result.seriesNumber || 0) > 1) extra.push("série " + result.seriesNumber);
    if (result.distance) extra.push(result.distance);
    if (result.eventType) extra.push(result.eventType);
    return time + (extra.length ? " (" + extra.join(", ") + ")" : "");
  }

  function collectPhotoFinishForEleve(eleve, data, options) {
    options = options || {};
    if (!eleve) return [];
    var classe = eleve.classeId ? getClasseById(data, eleve.classeId) : null;
    var classeNom = (classe && classe.nom) || eleve.classeNom || "";
    var period = options.period || null;
    var out = [];
    photoFinishBlocks(data).forEach(function (block) {
      var session = sessionForPhotoFinishBlock(data, block);
      if (!photoFinishBlockLinkedToClasse(block, session, eleve.classeId, classeNom)) return;
      (block.results || []).forEach(function (result) {
        if (!photoFinishResultMatchesEleve(result, block, eleve, classeNom, data, period)) return;
        var info = block.sessionInfo || {};
        out.push({
          id: result.id,
          date: result.date || block.updatedAt,
          timeMs: result.timeMs,
          formattedTime: result.formattedTime || formatChronoMs(result.timeMs),
          rank: result.rank,
          seriesNumber: result.seriesNumber,
          sessionName: result.sessionName || (session && session.nomSession) || info.name || "Photo Finish",
          eventType: info.eventType || "",
          distance: info.distance || "",
          comment: result.comment || "",
          runnerName: result.runnerName || "",
          sessionId: block.sessionId,
        });
      });
    });
    out.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    return out;
  }

  function photoFinishProgression(list) {
    if (!Array.isArray(list) || list.length < 2) return null;
    var sorted = list.slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
    var first = sorted[0];
    var last = sorted[sorted.length - 1];
    if (first.timeMs == null || last.timeMs == null) return null;
    var delta = last.timeMs - first.timeMs;
    return {
      premier: first,
      dernier: last,
      deltaMs: delta,
      tendance: delta < -10 ? "progression" : delta > 10 ? "regression" : "stable",
    };
  }

  function findEleveRecords(eleve, data, options) {
    options = options || {};
    if (!eleve) {
      return {
        dispenses: [],
        oublis: [],
        radar: [],
        photoFinish: [],
        imports: [],
        tableauxLignes: [],
        observations: [],
        sessions: [],
      };
    }
    var classe = eleve.classeId ? getClasseById(data, eleve.classeId) : null;
    var classeNom = (classe && classe.nom) || eleve.classeNom || "";
    var period = options.period || null;

    var dispenses = (data.dispenses || []).filter(function (d) {
      return matchRecordToEleve(d, eleve, classeNom) && inPeriod(d.dateDebut || d.createdAt, period);
    });

    var oublis = (data.oublisMateriel || []).filter(function (o) {
      return matchRecordToEleve(o, eleve, classeNom) && inPeriod(o.dateOubli || o.createdAt, period);
    });

    var radar = (data.radarPerfs || []).filter(function (r) {
      return matchRecordToEleve(r, eleve, classeNom) && inPeriod(r.createdAt, period);
    });

    var photoFinish = collectPhotoFinishForEleve(eleve, data, { period: period });

    var idCtx = identityCtxForEleve(data, eleve);
    var imports = (data.importsEleves || []).filter(function (imp) {
      if (!imp) return false;
      if (!inPeriod(imp.importedAt || imp.createdAt, period)) return false;
      if (typeof SyntheseIdentity !== "undefined") {
        return SyntheseIdentity.importConcernsEleve(imp, eleve, classeNom, idCtx);
      }
      if (imp.auteurLabel && matchAuteurToEleve(imp.auteurLabel, eleve)) return true;
      if (imp.classeLabel && classeNom && sameClasseLabel(classeNom, imp.classeLabel) && imp.auteurLabel) {
        return matchAuteurToEleve(imp.auteurLabel, eleve);
      }
      if (imp.payload && typeof imp.payload === "object" && imp.payload.eleve) {
        return sameEleve(imp.payload.eleve, eleve);
      }
      return false;
    });

    var tableauxLignes = [];
    var observations = [];
    (data.tableauxSuivi || []).forEach(function (t) {
      if (!t || !Array.isArray(t.rows)) return;
      t.rows.forEach(function (row) {
        if (!row) return;
        var meta = row.meta || {};
        var rowEleve = {
          id: meta.eleveId || "",
          nom: meta.nom || "",
          prenom: meta.prenom || "",
          classeId: meta.classeId || "",
        };
        if (!rowEleve.nom && !rowEleve.prenom && row.label) {
          var parts = String(row.label).trim().split(/\s+/);
          if (parts.length >= 2) {
            rowEleve.nom = parts[0];
            rowEleve.prenom = parts.slice(1).join(" ");
          } else {
            rowEleve.nom = parts[0] || "";
          }
        }
        if (!sameEleve(rowEleve, eleve) && !matchRecordToEleve(meta, eleve, classeNom)) return;
        var ligne = analyseLigneTableau(t, row);
        if (period && !ligneContientDonneesPeriode(ligne, period)) return;
        tableauxLignes.push({
          tableauId: t.id,
          tableauTitre: t.titre || "Appel / notes",
          row: row,
          stats: ligne,
          colonnesDetail: ligne.colonnesDetail,
        });
      });
    });

    imports.forEach(function (imp) {
      if (imp.toolId === "questions-debrief") {
        observations.push(extractObservationDebrief(imp));
      }
    });

    var sessions = (data.sessions || []).filter(function (s) {
      if (!s) return false;
      if (s.classeId && eleve.classeId && s.classeId === eleve.classeId) {
        return inPeriod(s.lastOpenedAt || s.updatedAt || s.createdAt, period);
      }
      if (s.classeNomSnapshot && classeNom && sameClasseLabel(classeNom, s.classeNomSnapshot)) {
        return inPeriod(s.lastOpenedAt || s.updatedAt || s.createdAt, period);
      }
      return false;
    });

    return {
      dispenses: dispenses,
      oublis: oublis,
      radar: radar,
      photoFinish: photoFinish,
      imports: imports,
      tableauxLignes: tableauxLignes,
      observations: observations.filter(Boolean),
      sessions: sessions,
    };
  }

  function matchAuteurToEleve(auteurLabel, eleve, ctx) {
    if (typeof SyntheseIdentity !== "undefined") {
      return SyntheseIdentity.labelMatchesEleve(auteurLabel, eleve, ctx || {}).match;
    }
    var label = normalizeName(auteurLabel);
    var full = normalizeName(labelEleve(eleve));
    if (!label || !full) return false;
    if (label === full) return true;
    var inv = normalizeName([eleve.prenom, eleve.nom].filter(Boolean).join(" "));
    if (label === inv) return true;
    return false;
  }

  function buildImportFacts(imports, subjectKind) {
    if (typeof SyntheseFacts === "undefined") return [];
    return (imports || []).map(function (imp) {
      var f = SyntheseFacts.buildImportFact(imp, subjectKind);
      f.toolLabel = TOOL_LABELS_IMPORT[imp.toolId] || imp.toolId || f.toolLabel;
      return f;
    });
  }

  function engagementLinesFromFacts(facts) {
    if (!facts || !facts.length) return [];
    if (typeof SyntheseFacts === "undefined") {
      return facts.map(function (f) {
        return (f.toolLabel || "") + " : " + (f.headline || f.resume || "—") + ".";
      });
    }
    return facts.map(function (f) {
      return SyntheseFacts.engagementLineFromFact(f);
    });
  }

  function mergeTimelineFacts(events, facts) {
    var extra = (facts || []).map(function (f) {
      if (typeof SyntheseFacts !== "undefined" && SyntheseFacts.factToTimelineEvent) {
        return SyntheseFacts.factToTimelineEvent(f);
      }
      return null;
    }).filter(Boolean);
    return (events || []).concat(extra).sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }

  /**
   * Lecture d’une cellule — même clé que « Appel et notes » (rowId:colId).
   */
  function getCell(tableau, rowId, colId) {
    if (!tableau.cells || typeof tableau.cells !== "object") return undefined;
    var keyColon = rowId + ":" + colId;
    if (Object.prototype.hasOwnProperty.call(tableau.cells, keyColon)) return tableau.cells[keyColon];
    var keyPipe = rowId + "|" + colId;
    if (Object.prototype.hasOwnProperty.call(tableau.cells, keyPipe)) return tableau.cells[keyPipe];
    if (tableau.cells[rowId] && typeof tableau.cells[rowId] === "object") {
      return tableau.cells[rowId][colId];
    }
    return undefined;
  }

  function valeurCalculeeTableau(t, rowId, col) {
    if (!col || col.type !== "calc" || !t) return null;
    var ids = col.sourceIds || [];
    var vals = [];
    ids.forEach(function (sid) {
      var src = (t.cols || []).filter(function (c) {
        return c && c.id === sid;
      })[0];
      if (!src || src.type !== "number") return;
      var v = getCell(t, rowId, src.id);
      if (typeof v === "number" && !isNaN(v)) vals.push(v);
    });
    if (!vals.length) return null;
    var sum = vals.reduce(function (a, b) {
      return a + b;
    }, 0);
    if (col.calcOp === "avg") return sum / vals.length;
    return sum;
  }

  function estNoteColonne(col) {
    if (!col) return false;
    if (col.type === "number") {
      if (col.estNote === true) return true;
      if (col.estNote === false) return false;
      return col.max > 0;
    }
    if (col.type === "calc") {
      if (col.estNote === true) return true;
      if (col.estNote === false) return false;
      return col.calcOp === "avg";
    }
    return false;
  }

  function baremeColonneTableau(t, col) {
    if (!col || !estNoteColonne(col)) return null;
    if ((col.type === "number" || col.type === "calc") && col.max > 0) return col.max;
    if (col.type === "calc" && col.calcOp === "avg") {
      var maxs = [];
      (col.sourceIds || []).forEach(function (sid) {
        var src = (t.cols || []).filter(function (c) {
          return c && c.id === sid;
        })[0];
        if (src && estNoteColonne(src) && src.max > 0) maxs.push(src.max);
      });
      if (maxs.length && maxs.every(function (m) {
        return m === maxs[0];
      })) {
        return maxs[0];
      }
    }
    return null;
  }

  function affichageCellule(v, type) {
    if (type === "check") {
      if (v === true) return "✓";
      if (v === false) return "✗";
      return "—";
    }
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "number" && !isNaN(v)) {
      var s = Number(v).toFixed(1);
      if (s.indexOf(".0") === s.length - 2) s = String(Math.round(v));
      return s.replace(".", ",");
    }
    return String(v);
  }

  function moyenneNotesListe(entries) {
    var valid = (entries || []).filter(function (e) {
      return e && typeof e.valeur === "number" && !isNaN(e.valeur);
    });
    if (!valid.length) return { moyenne: null, bareme: null };
    var avecBareme = valid.filter(function (e) {
      return e.bareme > 0;
    });
    if (avecBareme.length === valid.length) {
      var ref = avecBareme[0].bareme;
      var sameBareme = avecBareme.every(function (e) {
        return e.bareme === ref;
      });
      if (sameBareme) {
        var sumSame = valid.reduce(function (a, e) {
          return a + e.valeur;
        }, 0);
        return { moyenne: sumSame / valid.length, bareme: ref };
      }
      var ratios = avecBareme.map(function (e) {
        return e.valeur / e.bareme;
      });
      var avgRatio =
        ratios.reduce(function (a, b) {
          return a + b;
        }, 0) / ratios.length;
      return { moyenne: avgRatio * ref, bareme: ref };
    }
    var sumRaw = valid.reduce(function (a, e) {
      return a + e.valeur;
    }, 0);
    return { moyenne: sumRaw / valid.length, bareme: null };
  }

  /** Détail colonne par colonne (titres, présences, notes) pour une ligne d’appel. */
  function extractColonnesLigne(t, row) {
    if (!t || !row || !row.id) return [];
    var out = [];
    (t.cols || []).forEach(function (col) {
      if (!col || !col.id) return;
      if (col.type === "text") return;
      var type = col.type;
      var v =
        type === "calc" ? valeurCalculeeTableau(t, row.id, col) : getCell(t, row.id, col.id);
      var maxBareme = baremeColonneTableau(t, col);
      var entree = {
        id: col.id,
        label: col.label || (type === "check" ? "Présence" : "Colonne"),
        type: type,
        estNote: estNoteColonne(col),
        valeur: v,
        bareme: maxBareme,
        affichage: affichageCellule(v, type === "calc" ? "number" : type),
      };
      if (type === "check") {
        entree.horsSynthese = col.horsSynthese === true;
        entree.present = v === true;
        entree.absent = v === false;
      }
      out.push(entree);
    });
    return out;
  }

  function rowMatchesEleveList(row, eleves, classeNom) {
    if (!row) return false;
    var meta = row.meta || {};
    var rowEleve = {
      id: meta.eleveId || "",
      nom: meta.nom || "",
      prenom: meta.prenom || "",
      classeId: meta.classeId || "",
    };
    if (!rowEleve.nom && !rowEleve.prenom && row.label) {
      var parts = String(row.label).trim().split(/\s+/);
      if (parts.length >= 2) {
        rowEleve.nom = parts[0];
        rowEleve.prenom = parts.slice(1).join(" ");
      } else {
        rowEleve.nom = parts[0] || "";
      }
    }
    for (var i = 0; i < eleves.length; i++) {
      if (sameEleve(rowEleve, eleves[i]) || matchRecordToEleve(meta, eleves[i], classeNom)) {
        return true;
      }
    }
    return false;
  }

  function tableauxPourClasse(data, classeId, classe, eleves) {
    return (data.tableauxSuivi || []).filter(function (t) {
      if (!t) return false;
      if (t.classeId && t.classeId === classeId) return true;
      if (t.titre && classe && sameClasseLabel(classe.nom, t.titre)) return true;
      return (t.rows || []).some(function (row) {
        return rowMatchesEleveList(row, eleves, classe.nom);
      });
    });
  }

  var ICONE_ELEVE_LABELS = {
    pai: "PAI",
    pap: "PAP",
    alert: "Alerte",
  };

  function analyseLigneTableau(t, row) {
    var checkCols = (t.cols || []).filter(function (c) {
      return c && c.type === "check" && c.horsSynthese !== true;
    });
    var numberCols = (t.cols || []).filter(function (c) {
      return c && c.type === "number" && estNoteColonne(c);
    });
    var ok = 0;
    var ko = 0;
    var notes = [];
    var notesParColonne = {};
    checkCols.forEach(function (col) {
      var v = getCell(t, row.id, col.id);
      if (v === true) ok++;
      else if (v === false) ko++;
    });
    numberCols.forEach(function (col) {
      var v = getCell(t, row.id, col.id);
      if (typeof v === "number" && !isNaN(v)) {
        var lbl = col.label || "Note";
        var bareme = col.max > 0 ? col.max : null;
        notes.push({ colonne: lbl, valeur: v, colonneId: col.id, bareme: bareme });
        if (!notesParColonne[lbl]) notesParColonne[lbl] = [];
        notesParColonne[lbl].push(v);
      }
    });
    (t.cols || []).forEach(function (col) {
      if (!col || col.type !== "calc" || !estNoteColonne(col)) return;
      var v = valeurCalculeeTableau(t, row.id, col);
      if (typeof v !== "number" || isNaN(v)) return;
      var lblCalc = col.label || "Calcul";
      var baremeCalc = baremeColonneTableau(t, col);
      notes.push({ colonne: lblCalc, valeur: v, colonneId: col.id, bareme: baremeCalc });
      if (!notesParColonne[lblCalc]) notesParColonne[lblCalc] = [];
      notesParColonne[lblCalc].push(v);
    });
    var total = ok + ko;
    var meta = row.meta || {};
    var icone = meta.icone ? String(meta.icone).trim() : "";
    var colonnesDetail = extractColonnesLigne(t, row);
    return {
      presenceStats: { ok: ok, ko: ko, total: total, ratioAbsence: total ? ko / total : null },
      notes: notes,
      notesParColonne: notesParColonne,
      colonnesDetail: colonnesDetail,
      colonnesPresence: colonnesDetail.filter(function (c) {
        return c.type === "check";
      }),
      colonnesNotes: colonnesDetail.filter(function (c) {
        return c.estNote;
      }),
      icone: icone,
      iconeLabel: ICONE_ELEVE_LABELS[icone] || (icone ? "Repère " + icone : ""),
      derniereActivite: t.updatedAt || t.createdAt || null,
    };
  }

  /** Nombre de colonnes « Appel » (type check) sur les feuilles liées. */
  function countColonnesAppelTableaux(tableaux) {
    var n = 0;
    (tableaux || []).forEach(function (t) {
      if (!t || !Array.isArray(t.cols)) return;
      n += t.cols.filter(function (c) {
        return c && c.type === "check" && c.horsSynthese !== true;
      }).length;
    });
    return n;
  }

  function countColonnesAppelEleve(tableauxLignes) {
    var seen = {};
    var n = 0;
    (tableauxLignes || []).forEach(function (tl) {
      if (!tl) return;
      var tid = tl.tableauId || tl.tableauTitre || "";
      var cols =
        (tl.stats && tl.stats.colonnesPresence) ||
        (tl.colonnesDetail || []).filter(function (c) {
          return c && c.type === "check";
        });
      cols.forEach(function (c) {
        if (c && c.horsSynthese) return;
        var key = tid + ":" + (c.id || c.label);
        if (seen[key]) return;
        seen[key] = true;
        n++;
      });
    });
    return n;
  }

  function countColonnesNoteTableaux(tableaux) {
    var n = 0;
    (tableaux || []).forEach(function (t) {
      if (!t || !Array.isArray(t.cols)) return;
      n += t.cols.filter(function (c) {
        return c && estNoteColonne(c) && c.horsSynthese !== true;
      }).length;
    });
    return n;
  }

  function countColonnesNoteEleve(tableauxLignes) {
    var seen = {};
    var n = 0;
    (tableauxLignes || []).forEach(function (tl) {
      if (!tl) return;
      var tid = tl.tableauId || tl.tableauTitre || "";
      var cols =
        (tl.stats && tl.stats.colonnesNotes) ||
        (tl.colonnesDetail || []).filter(function (c) {
          return c && c.estNote;
        });
      cols.forEach(function (c) {
        if (c && c.horsSynthese) return;
        var key = tid + ":" + (c.id || c.label);
        if (seen[key]) return;
        seen[key] = true;
        n++;
      });
    });
    return n;
  }

  function countColonnesAppelSurTableau(t) {
    if (!t || !Array.isArray(t.cols)) return 0;
    return t.cols.filter(function (c) {
      return c && c.type === "check" && c.horsSynthese !== true;
    }).length;
  }

  function countColonnesNoteSurTableau(t) {
    if (!t || !Array.isArray(t.cols)) return 0;
    return t.cols.filter(function (c) {
      return c && estNoteColonne(c) && c.horsSynthese !== true;
    }).length;
  }

  /**
   * Synthèse « Appel et notes » pour un élève (plusieurs feuilles possibles).
   */
  function agregerAppelEleve(tableauxLignes) {
    var lignes = Array.isArray(tableauxLignes) ? tableauxLignes : [];
    var presence = { ok: 0, ko: 0, total: 0 };
    var toutesNotes = [];
    var parColonne = {};
    var feuilles = {};
    var icones = {};
    var derniere = null;

    var colonnesBaremes = {};
    lignes.forEach(function (tl) {
      if (!tl || !tl.stats) return;
      var titre = tl.tableauTitre || "Feuille";
      feuilles[titre] = true;
      var ps = tl.stats.presenceStats || {};
      presence.ok += ps.ok || 0;
      presence.ko += ps.ko || 0;
      presence.total += ps.total || 0;
      (tl.stats.notes || []).forEach(function (n) {
        toutesNotes.push(n);
        var lbl = n.colonne || "Note";
        if (!parColonne[lbl]) parColonne[lbl] = [];
        parColonne[lbl].push(n.valeur);
        if (n.bareme > 0) colonnesBaremes[lbl] = n.bareme;
      });
      if (tl.stats.icone) {
        var il = tl.stats.iconeLabel || tl.stats.icone;
        icones[il] = (icones[il] || 0) + 1;
      }
      var d = tl.stats.derniereActivite;
      if (d && (!derniere || String(d) > String(derniere))) derniere = d;
    });

    var colonnesResume = Object.keys(parColonne).map(function (lbl) {
      var vals = parColonne[lbl];
      var sum = vals.reduce(function (a, b) {
        return a + b;
      }, 0);
      return {
        colonne: lbl,
        count: vals.length,
        bareme: colonnesBaremes[lbl] || null,
        moyenne: vals.length ? sum / vals.length : null,
        min: vals.length ? Math.min.apply(null, vals) : null,
        max: vals.length ? Math.max.apply(null, vals) : null,
      };
    });

    var moyGlob = moyenneNotesListe(toutesNotes);
    var moyenneGlobale = moyGlob.moyenne;
    var moyenneGlobaleBareme = moyGlob.bareme;

    return {
      nbFeuilles: countColonnesAppelEleve(lignes),
      nbTableaux: Object.keys(feuilles).length,
      nbColonnesNotes: countColonnesNoteEleve(lignes),
      feuillesTitres: Object.keys(feuilles),
      presence: presence,
      pctPresent:
        presence.total > 0 ? Math.round((presence.ok / presence.total) * 100) : null,
      nbNotes: toutesNotes.length,
      moyenneNotes: moyenneGlobale,
      moyenneNotesBareme: moyenneGlobaleBareme,
      colonnesNotes: colonnesResume,
      feuillesDetail: lignes.map(function (tl) {
        return {
          titre: tl.tableauTitre,
          colonnesDetail: (tl.stats && tl.stats.colonnesDetail) || tl.colonnesDetail || [],
          presenceStats: tl.stats && tl.stats.presenceStats,
        };
      }),
      icones: Object.keys(icones).map(function (k) {
        return { label: k, count: icones[k] };
      }),
      derniereMaj: derniere,
    };
  }

  /**
   * Structure complète d’une feuille d’appel pour affichage (titres de colonnes + lignes élèves).
   */
  function buildSyntheseFeuilleAppel(t, eleves, classeNom) {
    if (!t) return null;
    var colonnes = (t.cols || [])
      .filter(function (c) {
        return c && c.type !== "text";
      })
      .map(function (c) {
        return {
          id: c.id,
          label: c.label || "Colonne",
          type: c.type,
          estNote: estNoteColonne(c),
          bareme: c.type === "number" && c.max > 0 ? c.max : baremeColonneTableau(t, c),
        };
      });
    var lignesEleves = [];
    (t.rows || []).forEach(function (row) {
      if (!rowMatchesEleveList(row, eleves, classeNom)) return;
      var st = analyseLigneTableau(t, row);
      lignesEleves.push({
        label: row.label || labelEleve(row.meta || {}),
        stats: st,
        colonnesDetail: st.colonnesDetail,
      });
    });
    return {
      id: t.id,
      titre: t.titre || "Appel / notes",
      colonnes: colonnes,
      lignes: lignesEleves,
      updatedAt: t.updatedAt || t.createdAt,
    };
  }

  /**
   * Synthèse « Appel et notes » au niveau classe (toutes les feuilles liées).
   */
  function agregerAppelClasse(tableaux, eleves, classe) {
    var ts = Array.isArray(tableaux) ? tableaux : [];
    var els = Array.isArray(eleves) ? eleves : [];
    var presence = { ok: 0, ko: 0, total: 0 };
    var nbLignesSuivies = 0;
    var elevesAvecFeuille = {};
    var nbNotes = 0;
    var feuilles = {};

    ts.forEach(function (t) {
      if (!t || !Array.isArray(t.rows)) return;
      feuilles[t.titre || t.id] = true;
      t.rows.forEach(function (row) {
        var meta = row.meta || {};
        var rowEleve = {
          id: meta.eleveId || "",
          nom: meta.nom || "",
          prenom: meta.prenom || "",
        };
        if (!rowEleve.nom && row.label) {
          var parts = String(row.label).trim().split(/\s+/);
          rowEleve.nom = parts[0] || "";
          rowEleve.prenom = parts.slice(1).join(" ");
        }
        var match = els.some(function (e) {
          return sameEleve(rowEleve, e) || matchRecordToEleve(meta, e, classe.nom);
        });
        if (!match) return;
        nbLignesSuivies++;
        var st = analyseLigneTableau(t, row);
        presence.ok += st.presenceStats.ok;
        presence.ko += st.presenceStats.ko;
        presence.total += st.presenceStats.total;
        nbNotes += st.notes.length;
        els.forEach(function (e) {
          if (sameEleve(rowEleve, e) || matchRecordToEleve(meta, e, classe.nom)) {
            elevesAvecFeuille[e.id || labelEleve(e)] = true;
          }
        });
      });
    });

    return {
      nbFeuilles: countColonnesAppelTableaux(ts),
      nbTableaux: Object.keys(feuilles).length,
      nbColonnesNotes: countColonnesNoteTableaux(ts),
      nbLignesSuivies: nbLignesSuivies,
      nbElevesSurFeuilles: Object.keys(elevesAvecFeuille).length,
      presence: presence,
      pctPresent:
        presence.total > 0 ? Math.round((presence.ok / presence.total) * 100) : null,
      nbNotes: nbNotes,
    };
  }

  /** Moyennes par libellé de colonne « note » pour toute la classe (toutes feuilles liées). */
  function computeMoyennesNotesClasse(tableaux, eleves, classeNom) {
    var map = {};
    (tableaux || []).forEach(function (t) {
      (t.rows || []).forEach(function (row) {
        if (!rowMatchesEleveList(row, eleves, classeNom)) return;
        var st = analyseLigneTableau(t, row);
        (st.notes || []).forEach(function (n) {
          var lbl = n.colonne || "Note";
          if (!map[lbl]) map[lbl] = { vals: [], bareme: null };
          map[lbl].vals.push(n.valeur);
          if (n.bareme > 0) map[lbl].bareme = n.bareme;
        });
      });
    });
    var out = {};
    Object.keys(map).forEach(function (lbl) {
      var entry = map[lbl];
      var vals = entry.vals;
      var sum = vals.reduce(function (a, b) {
        return a + b;
      }, 0);
      out[lbl] = { moyenne: sum / vals.length, count: vals.length, bareme: entry.bareme };
    });
    return out;
  }

  /**
   * Résumé par feuille d’appel (sans grille complète) — pour la synthèse classe.
   */
  function buildResumeAppelFeuillesClasse(tableaux, eleves, classe) {
    var res = [];
    (tableaux || []).forEach(function (t) {
      if (!t) return;
      var presence = { ok: 0, ko: 0, total: 0 };
      var parCol = {};
      var parColBareme = {};
      var nbEleves = 0;
      var seen = {};
      (t.rows || []).forEach(function (row) {
        if (!rowMatchesEleveList(row, eleves, classe.nom)) return;
        if (!seen[row.id]) {
          seen[row.id] = true;
          nbEleves++;
        }
        var st = analyseLigneTableau(t, row);
        presence.ok += st.presenceStats.ok;
        presence.ko += st.presenceStats.ko;
        presence.total += st.presenceStats.total;
        (st.notes || []).forEach(function (n) {
          var lbl = n.colonne || "Note";
          if (!parCol[lbl]) parCol[lbl] = [];
          parCol[lbl].push(n.valeur);
          if (n.bareme > 0) parColBareme[lbl] = n.bareme;
        });
      });
      if (!nbEleves) return;
      var colonnesNotes = Object.keys(parCol).map(function (lbl) {
        var vals = parCol[lbl];
        var sum = vals.reduce(function (a, b) {
          return a + b;
        }, 0);
        return {
          label: lbl,
          bareme: parColBareme[lbl] || null,
          moyenneClasse: sum / vals.length,
          nbNotes: vals.length,
          min: Math.min.apply(null, vals),
          max: Math.max.apply(null, vals),
        };
      });
      res.push({
        titre: t.titre || "Feuille",
        updatedAt: t.updatedAt || t.createdAt,
        nbEleves: nbEleves,
        nbColonnesAppel: countColonnesAppelSurTableau(t),
        nbColonnesNotes: countColonnesNoteSurTableau(t),
        pctPresent: presence.total ? Math.round((presence.ok / presence.total) * 100) : null,
        presenceOk: presence.ok,
        presenceKo: presence.ko,
        colonnesNotes: colonnesNotes,
      });
    });
    return res;
  }

  function extractObservationDebrief(imp) {
    if (!imp || !imp.payload) return null;
    var p = imp.payload;
    if (typeof p !== "object") {
      logUnknown("import-debrief-payload", imp);
      return null;
    }
    var reponses = p.reponses || p.answers || p.r || null;
    return {
      id: imp.id,
      date: imp.importedAt || imp.createdAt,
      toolId: imp.toolId,
      classeLabel: imp.classeLabel || "",
      auteurLabel: imp.auteurLabel || "",
      type: p.type || p.mode || "individuel",
      reponses: reponses,
      brut: p,
    };
  }

  function dispenseEstLongue(d) {
    if (!d) return false;
    var jours = d.dureeJours;
    if (typeof jours === "number" && jours >= LONG_DISPENSE_JOURS) return true;
    if (d.dateDebut && d.dateFin) {
      var deb = parseDate(d.dateDebut);
      var fin = parseDate(d.dateFin);
      if (deb && fin) {
        var diff = (fin.getTime() - deb.getTime()) / (86400000);
        if (diff >= LONG_DISPENSE_JOURS) return true;
      }
    }
    return false;
  }

  function dispenseActive(d) {
    if (!d || !d.dateFin) return false;
    var fin = parseDate(d.dateFin);
    if (!fin) return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return fin >= today;
  }

  function countActiviteEleve(records) {
    var n = 0;
    n += records.dispenses.length;
    n += records.oublis.length;
    n += records.radar.length;
    n += records.photoFinish.length;
    n += records.imports.length;
    n += records.tableauxLignes.length;
    n += records.observations.length;
    n += records.sessions.length;
    return n;
  }

  function mergeTimelineActivites(events, activites, importFacts) {
    var extra =
      typeof SyntheseEpsActivites !== "undefined"
        ? SyntheseEpsActivites.activitesVersTimeline(activites)
        : [];
    var merged = mergeTimelineFacts((events || []).concat(extra), importFacts || []);
    return merged.slice(0, 40);
  }

  function buildTimelineEvents(records, classeNom) {
    var events = [];
    records.oublis.forEach(function (o) {
      events.push({
        type: "oubli",
        date: o.dateOubli || o.createdAt,
        label: "Oubli de matériel enregistré",
        detail: o.commentaire || "Sans précision",
      });
    });
    records.dispenses.forEach(function (d) {
      events.push({
        type: "dispense",
        date: d.dateDebut || d.createdAt,
        label: "Dispense / inaptitude" + (d.motif ? " — " + d.motif : ""),
      });
    });
    records.radar.forEach(function (r) {
      events.push({
        type: "radar",
        date: r.createdAt,
        label: "Passage au radar vitesse",
        detail: r.kmh != null ? r.kmh.toFixed(1).replace(".", ",") + " km/h" : "",
      });
    });
    records.photoFinish.forEach(function (r) {
      events.push({
        type: "photo-finish",
        date: r.date,
        label: "Photo Finish — chronométrage",
        detail: photoFinishResultLabel(r),
      });
    });
    records.imports.forEach(function (imp) {
      events.push({
        type: "import",
        date: imp.importedAt || imp.createdAt,
        label: (TOOL_LABELS_IMPORT[imp.toolId] || imp.toolId) + (imp.auteurLabel ? " — " + imp.auteurLabel : ""),
      });
    });
    records.observations.forEach(function (o) {
      events.push({
        type: "observation",
        date: o.date,
        label: "Débrief / observation",
      });
    });
    records.sessions.forEach(function (s) {
      events.push({
        type: "session",
        date: s.lastOpenedAt || s.updatedAt || s.createdAt,
        label: "Séance « " + (s.nomSession || "activité") + " »",
        detail: SC.toolLabel ? SC.toolLabel(s.toolId) : s.toolId,
      });
    });
    events.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    return events.slice(0, 40);
  }

  function radarProgression(radarList) {
    if (!Array.isArray(radarList) || radarList.length < 2) return null;
    var sorted = radarList.slice().sort(function (a, b) {
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
    var first = sorted[0];
    var last = sorted[sorted.length - 1];
    if (first.kmh == null || last.kmh == null) return null;
    var delta = last.kmh - first.kmh;
    return {
      premier: first,
      dernier: last,
      deltaKmh: delta,
      tendance: delta > 0.2 ? "hausse" : delta < -0.2 ? "baisse" : "stable",
    };
  }

  function buildLecturePedagogique(records, syntheseMeta) {
    var lines = {
      engagement: [],
      regularite: [],
      progres: [],
      vigilance: [],
    };
    var appel = (syntheseMeta && syntheseMeta.appel) || agregerAppelEleve(records.tableauxLignes);

    if (appel.nbTableaux > 0) {
      var libelles = (appel.feuillesTitres || []).map(function (t) {
        return "« " + t + " »";
      });
      lines.engagement.push(
        "Données reprises de la feuille d’appel " +
          (libelles.join(", ") || "Appel et notes") +
          " (outil Appel et notes)."
      );
    }
    if (appel.nbColonnesNotes > 0) {
      lines.engagement.push(
        appel.nbColonnesNotes +
          " colonne(s) de note" +
          (appel.moyenneNotes != null
            ? " (moyenne " +
              appel.moyenneNotes.toFixed(1).replace(".", ",") +
              (appel.moyenneNotesBareme > 0 ? "/" + appel.moyenneNotesBareme : "") +
              ")."
            : ".")
      );
    }

    if (records.observations.length) {
      lines.engagement.push(
        records.observations.length +
          " débrief" +
          (records.observations.length > 1 ? "s" : "") +
          " QR."
      );
    }
    var importFacts = (syntheseMeta && syntheseMeta.importFacts) || [];
    if (importFacts.length) {
      engagementLinesFromFacts(importFacts).forEach(function (line) {
        lines.engagement.push(line);
      });
    } else if (records.imports.length > records.observations.length) {
      records.imports.forEach(function (imp) {
        if (imp.toolId === "questions-debrief") return;
        var lbl = TOOL_LABELS_IMPORT[imp.toolId] || imp.toolId;
        if (typeof SyntheseFacts !== "undefined") {
          lines.engagement.push(lbl + " : " + SyntheseFacts.importHeadline(imp) + ".");
        } else if (imp.auteurLabel) {
          lines.engagement.push(lbl + " (" + imp.auteurLabel + ").");
        }
      });
    }
    var activitesEleve = (syntheseMeta && syntheseMeta.activites) || [];
    if (activitesEleve.length) {
      activitesEleve.forEach(function (a) {
        if (typeof SyntheseFacts !== "undefined") {
          lines.engagement.push(SyntheseFacts.engagementLineFromFact(a));
        } else {
          lines.engagement.push((a.toolLabel || "Activité") + " : " + (a.headline || a.resume) + ".");
        }
      });
    } else if (records.sessions.length) {
      lines.engagement.push("Séances d’activités liées à la classe (sans résultat individuel détecté).");
    }

    var absRatio = syntheseMeta && syntheseMeta.absenceRatio;
    if (appel.presence.total > 0) {
      if (appel.pctPresent != null && appel.pctPresent >= 85) {
        lines.regularite.push(
          "Présence sur les feuilles d’appel : " + appel.pctPresent + " % de ✓ (" + appel.presence.ok + "/" + appel.presence.total + ")."
        );
      } else if (appel.pctPresent != null && appel.pctPresent < 65) {
        lines.regularite.push(
          "Assiduité fragile sur l’appel : " + appel.pctPresent + " % de ✓ — " + appel.presence.ko + " ✗ pour " + appel.presence.total + " cases."
        );
        lines.vigilance.push("Relancer sur les absences ou non-rendus (feuilles d’appel).");
      } else if (appel.pctPresent != null) {
        lines.regularite.push(
          "Présence mitigée sur l’appel (" + appel.pctPresent + " % de ✓)."
        );
      }
    } else if (absRatio != null && syntheseMeta.presenceColonnes >= ABSENCE_MIN_COLONNES) {
      if (absRatio <= 0.15) {
        lines.regularite.push("Présence globalement régulière sur les colonnes ✓/✗.");
      } else if (absRatio >= ABSENCE_FREQ_SEUIL) {
        lines.regularite.push(
          "Taux d’absences élevé sur l’appel (" + Math.round(absRatio * 100) + " % de ✗)."
        );
        lines.vigilance.push("Vérifier assiduité et motifs d’absence.");
      } else {
        lines.regularite.push("Présence mitigée sur les feuilles d’appel.");
      }
    }
    if (records.oublis.length === 0 && appel.nbTableaux === 0) {
      lines.regularite.push("Aucun oubli de matériel ni feuille d’appel liée.");
    } else if (records.oublis.length === 0) {
      lines.regularite.push("Aucun oubli de matériel enregistré.");
    } else if (records.oublis.length < OUBLIS_ALERTE_SEUIL) {
      lines.regularite.push(records.oublis.length + " oubli(s) de matériel — suivi possible.");
    }

    appel.colonnesNotes.forEach(function (col) {
      if (col.count >= 2 && col.moyenne != null) {
        lines.progres.push(
          col.colonne +
            " : moyenne " +
            col.moyenne.toFixed(1).replace(".", ",") +
            " (" +
            col.min +
            "–" +
            col.max +
            ")."
        );
      }
    });

    records.observations.forEach(function (obs) {
      if (!obs.reponses || typeof obs.reponses !== "object") return;
      Object.keys(obs.reponses).forEach(function (k) {
        var v = obs.reponses[k];
        if (typeof v === "number" && v >= 4) {
          if (k.indexOf("implication") >= 0 || k === "implication") {
            lines.engagement.push("Implication perçue ≥ 4/5 au débrief.");
          }
          if (k.indexOf("progres") >= 0 && k !== "progres_texte") {
            lines.progres.push("Progrès perçus ≥ 4/5 au débrief.");
          }
        }
      });
    });

    var prog = radarProgression(records.radar);
    if (prog && prog.tendance === "hausse") {
      lines.progres.push(
        "Vitesse (radar, si enregistré) : " +
          prog.premier.kmh.toFixed(1) +
          " → " +
          prog.dernier.kmh.toFixed(1) +
          " km/h."
      );
    } else if (prog && prog.tendance === "baisse") {
      lines.vigilance.push("Baisse des vitesses radar entre les passages enregistrés.");
    }

    var pfProg = photoFinishProgression(records.photoFinish);
    if (pfProg && pfProg.tendance === "progression") {
      lines.progres.push(
        "Photo Finish : " +
          photoFinishResultLabel(pfProg.premier) +
          " → " +
          photoFinishResultLabel(pfProg.dernier) +
          "."
      );
    } else if (pfProg && pfProg.tendance === "regression") {
      lines.vigilance.push("Temps Photo Finish en hausse entre les passages enregistrés.");
    }

    appel.icones.forEach(function (ic) {
      if (ic.label === "PAI" || ic.label === "PAP" || ic.label === "Alerte") {
        lines.vigilance.push("Repère sur feuille d’appel : " + ic.label + ".");
      }
    });

    if (records.oublis.length >= OUBLIS_ALERTE_SEUIL) {
      lines.vigilance.push(
        "Au moins " + OUBLIS_ALERTE_SEUIL + " oublis de matériel — rappel des consignes matériel."
      );
    }
    records.dispenses.filter(dispenseActive).forEach(function () {
      lines.vigilance.push("Dispense ou inaptitude encore en cours.");
    });
    records.dispenses.filter(dispenseEstLongue).forEach(function () {
      lines.vigilance.push("Historique de dispense de longue durée (≥ " + LONG_DISPENSE_JOURS + " jours).");
    });
    if (syntheseMeta && syntheseMeta.sansActivite) {
      lines.vigilance.push("Peu ou pas de données d’activité enregistrées pour cet élève.");
    }

    if (syntheseMeta && syntheseMeta.asns && typeof SyntheseAsns !== "undefined") {
      SyntheseAsns.lectureLines(syntheseMeta.asns).forEach(function (line) {
        if (syntheseMeta.asns.statut === "valide") {
          lines.progres.push(line);
        } else if (syntheseMeta.asns.statut === "non_valide") {
          lines.vigilance.push(line);
        } else {
          lines.engagement.push(line);
        }
      });
    }

    Object.keys(lines).forEach(function (k) {
      if (!lines[k].length) lines[k].push("Non renseigné à partir des données disponibles.");
    });

    return lines;
  }

  function buildResumeEleve(records, eleve, classeNom, meta) {
    meta = meta || {};
    var pointsForts = [];
    var vigilance = [];
    var derniere = null;
    var appel = agregerAppelEleve(records.tableauxLignes);
    var activites = meta.activites || [];

    if (appel.derniereMaj && (!derniere || String(appel.derniereMaj) > String(derniere))) {
      derniere = appel.derniereMaj;
    }
    records.imports.forEach(function (imp) {
      var dt = imp.importedAt || imp.createdAt;
      if (!derniere || String(dt) > String(derniere)) derniere = dt;
    });
    records.radar.forEach(function (r) {
      if (!derniere || String(r.createdAt) > String(derniere)) derniere = r.createdAt;
    });
    records.photoFinish.forEach(function (r) {
      if (!derniere || String(r.date) > String(derniere)) derniere = r.date;
    });

    if (appel.nbTableaux > 0 && appel.pctPresent != null && appel.pctPresent >= 85) {
      pointsForts.push("Bonne assiduité sur l’appel (" + appel.pctPresent + " % de ✓).");
    }
    if (appel.moyenneNotes != null && appel.nbColonnesNotes >= 1) {
      pointsForts.push(
        "Notes suivies (moy. " +
          appel.moyenneNotes.toFixed(1).replace(".", ",") +
          (appel.moyenneNotesBareme > 0 ? "/" + appel.moyenneNotesBareme : "") +
          ")."
      );
    }
    if (records.observations.length) {
      pointsForts.push("Retours débrief disponibles.");
    }
    activites.forEach(function (a) {
      if (a.headline && a.toolLabel) {
        pointsForts.push(a.toolLabel + " : " + a.headline + ".");
      }
    });
    (meta.importFacts || []).forEach(function (f) {
      if (f.headline && f.toolId) {
        var lbl = TOOL_LABELS_IMPORT[f.toolId] || f.toolId;
        pointsForts.push(lbl + " : " + f.headline + ".");
      }
    });

    var prog = radarProgression(records.radar);
    if (prog && prog.tendance === "hausse") {
      pointsForts.push("Progression vitesse (radar, secondaire).");
    }

    var pfProg = photoFinishProgression(records.photoFinish);
    if (pfProg && pfProg.tendance === "progression") {
      pointsForts.push("Progression chronométrage (Photo Finish).");
    } else if (pfProg && pfProg.tendance === "regression") {
      vigilance.push("Temps Photo Finish en hausse entre les passages enregistrés.");
    }

    var asns = meta.asns;
    if (asns) {
      if (asns.statut === "valide") {
        pointsForts.push("ASNS : " + asns.headline + ".");
      } else if (asns.statut === "non_valide") {
        vigilance.push("ASNS : " + asns.headline + ".");
      } else {
        pointsForts.push("ASNS : " + asns.headline + ".");
      }
      if (asns.dateValidation && (!derniere || String(asns.dateValidation) > String(derniere))) {
        derniere = asns.dateValidation;
      }
    }

    if (appel.pctPresent != null && appel.pctPresent < 65 && appel.presence.total >= ABSENCE_MIN_COLONNES) {
      vigilance.push("Assiduité à surveiller sur l’appel (" + appel.pctPresent + " % de ✓).");
    }
    if (records.oublis.length >= OUBLIS_ALERTE_SEUIL) {
      vigilance.push("Nombreux oublis de matériel.");
    }
    if (records.dispenses.some(dispenseActive)) {
      vigilance.push("Dispense en cours.");
    }
    appel.icones.forEach(function (ic) {
      if (ic.label === "Alerte" || ic.label === "PAI") {
        vigilance.push("Repère " + ic.label + " sur feuille d’appel.");
      }
    });

    return {
      pointsForts: pointsForts.length ? pointsForts : ["Aucun indicateur fort particulier."],
      pointsVigilance: vigilance.length ? vigilance : ["Rien de notable dans les alertes automatiques."],
      derniereDonnee: derniere,
      progressionRadar: prog,
      progressionPhotoFinish: pfProg,
      appel: appel,
    };
  }

  /**
   * Synthèse complète d’un élève.
   */
  function buildEleveSynthese(eleveId, data, options) {
    options = options || {};
    var eleve = getEleveById(data, eleveId, options.classeId);
    if (!eleve) {
      return {
        ok: false,
        error: "Élève introuvable.",
        eleveId: eleveId,
      };
    }
    var classe = eleve.classeId ? getClasseById(data, eleve.classeId) : null;
    var classeNom = (classe && classe.nom) || "";
    var records = findEleveRecords(eleve, data, { period: options.period });
    var activites =
      typeof SyntheseEpsActivites !== "undefined"
        ? SyntheseEpsActivites.collectActivitesEleve(eleve, data, { period: options.period })
        : [];
    var importFacts = buildImportFacts(
      records.imports.filter(function (imp) {
        return imp.toolId !== "questions-debrief";
      }),
      "eleve"
    );
    var activite = countActiviteEleve(records) + activites.length;

    var absenceStats = { ok: 0, ko: 0, total: 0 };
    records.tableauxLignes.forEach(function (tl) {
      var ps = tl.stats.presenceStats;
      absenceStats.ok += ps.ok;
      absenceStats.ko += ps.ko;
      absenceStats.total += ps.total;
    });
    var absenceRatio = absenceStats.total ? absenceStats.ko / absenceStats.total : null;

    var identite = {
      id: eleve.id,
      nom: eleve.nom || "Non renseigné",
      prenom: eleve.prenom || "Non renseigné",
      classe: classeNom || "Non renseigné",
      sexe: eleve.sexe || "Non renseigné",
      dateNaissance: eleve.dateNaissance || "",
      commentaire: eleve.commentaire || "",
      niveau: eleve.niveau || "",
      equipe: eleve.equipe || "",
      vma: eleve.vma || "",
    };

    var appel = agregerAppelEleve(records.tableauxLignes);
    var tableauxClasseEleve = tableauxPourClasse(data, eleve.classeId, classe, elevesDeClasse(data, eleve.classeId));
    appel.moyennesClasse = computeMoyennesNotesClasse(tableauxClasseEleve, elevesDeClasse(data, eleve.classeId), classeNom);
    var metaPedago = {
      absenceRatio: absenceRatio,
      presenceColonnes: absenceStats.total,
      sansActivite: activite === 0,
      appel: appel,
      activites: activites,
      importFacts: importFacts,
      facts: activites.concat(importFacts),
      asns: typeof SyntheseAsns !== "undefined" ? SyntheseAsns.resolveForEleve(data, eleve, classeNom) : null,
    };

    return {
      ok: true,
      eleveId: eleve.id,
      identite: identite,
      records: records,
      appelNotes: appel,
      feuillesAppel: records.tableauxLignes.map(function (tl) {
        var st = tl.stats || {};
        return {
          titre: tl.tableauTitre,
          colonnesDetail: tl.colonnesDetail || st.colonnesDetail || [],
          presenceStats: st.presenceStats,
        };
      }),
      stats: {
        nbDispenses: records.dispenses.length,
        nbOublis: records.oublis.length,
        nbFeuillesAppel: appel.nbFeuilles,
        pctPresentAppel: appel.pctPresent,
        nbColonnesNotes: appel.nbColonnesNotes,
        nbNotesAppel: appel.nbColonnesNotes,
        nbRadar: records.radar.length,
        nbPhotoFinish: records.photoFinish.length,
        nbImports: records.imports.length,
        nbObservations: records.observations.length,
        nbSessions: records.sessions.length,
        nbActivites: activites.length,
        activiteTotale: activite,
      },
      timeline: mergeTimelineActivites(buildTimelineEvents(records, classeNom), activites, importFacts),
      activites: activites,
      importFacts: importFacts,
      facts: metaPedago.facts,
      asns: metaPedago.asns,
      resume: buildResumeEleve(records, eleve, classeNom, metaPedago),
      lecturePedagogique: buildLecturePedagogique(records, metaPedago),
      alertes: buildAlertesEleve(records, metaPedago),
      generatedAt: new Date().toISOString(),
    };
  }

  function buildAlertesEleve(records, meta) {
    var alertes = [];
    if (records.oublis.length >= OUBLIS_ALERTE_SEUIL) {
      alertes.push({ niveau: "rouge", code: "oublis", label: records.oublis.length + " oublis matériel" });
    }
    if (meta.absenceRatio != null && meta.presenceColonnes >= ABSENCE_MIN_COLONNES && meta.absenceRatio >= ABSENCE_FREQ_SEUIL) {
      alertes.push({ niveau: "orange", code: "absences", label: "Absences fréquentes (appel)" });
    }
    records.dispenses.filter(dispenseEstLongue).forEach(function () {
      alertes.push({ niveau: "orange", code: "dispense-longue", label: "Dispense longue" });
    });
    if (meta.sansActivite) {
      alertes.push({ niveau: "orange", code: "sans-donnee", label: "Sans donnée d’activité" });
    }
    return alertes;
  }

  function scoreAlerte(alertes) {
    if (!alertes || !alertes.length) return 0;
    return alertes.reduce(function (acc, a) {
      if (a.niveau === "rouge") return acc + 3;
      if (a.niveau === "orange") return acc + 2;
      return acc + 1;
    }, 0);
  }

  function importConcernsClasseOnly(imp, classe, eleves) {
    if (!imp || !classe) return false;
    if (typeof SyntheseIdentity !== "undefined" && SyntheseIdentity.importConcernsClasse(imp, classe)) {
      return true;
    }
    if (imp.classeLabel && sameClasseLabel(classe.nom, imp.classeLabel)) return true;
    if (imp.classeId && imp.classeId === classe.id) return true;
    return false;
  }

  function splitImportsClasse(importsAll, classe, eleves, data, classeId) {
    var equipe = [];
    var individu = [];
    var nonRattaches = [];
    var idCtxBase = { classeId: classeId, elevesClasse: eleves, aliases: (data && data.identiteAliases) || [] };

    (importsAll || []).forEach(function (imp) {
      if (!imp) return;
      var forClasse = importConcernsClasseOnly(imp, classe, eleves);
      if (!forClasse && imp.auteurLabel) {
        var anyMatch = eleves.some(function (e) {
          return typeof SyntheseIdentity !== "undefined"
            ? SyntheseIdentity.importConcernsEleve(imp, e, classe.nom, idCtxBase)
            : matchAuteurToEleve(imp.auteurLabel, e, identityCtxForEleve(data, e));
        });
        if (!anyMatch) {
          nonRattaches.push(imp);
        }
        return;
      }
      if (!forClasse) return;

      if (typeof SyntheseIdentity !== "undefined" && SyntheseIdentity.isTeamImportTool(imp.toolId)) {
        equipe.push(imp);
        return;
      }

      var matched = eleves.some(function (e) {
        return typeof SyntheseIdentity !== "undefined"
          ? SyntheseIdentity.importConcernsEleve(imp, e, classe.nom, idCtxBase)
          : imp.auteurLabel && matchAuteurToEleve(imp.auteurLabel, e, identityCtxForEleve(data, e));
      });
      if (matched || (imp.payload && imp.payload.eleve)) {
        individu.push(imp);
      } else if (imp.auteurLabel) {
        nonRattaches.push(imp);
      } else {
        individu.push(imp);
      }
    });

    return { equipe: equipe, individu: individu, nonRattaches: nonRattaches };
  }

  /**
   * Synthèse globale d’une classe.
   */
  function buildClasseSynthese(classeId, data, options) {
    options = options || {};
    var classe = getClasseById(data, classeId);
    if (!classe) {
      return { ok: false, error: "Classe introuvable.", classeId: classeId };
    }
    var eleves = elevesDeClasse(data, classeId);
    var period = options.period || null;

    var dispensesClasse = (data.dispenses || []).filter(function (d) {
      return matchRecordToClasse(d, classe) || eleves.some(function (e) {
        return matchRecordToEleve(d, e, classe.nom);
      });
    }).filter(function (d) {
      return inPeriod(d.dateDebut || d.createdAt, period);
    });

    var oublisClasse = (data.oublisMateriel || []).filter(function (o) {
      return matchRecordToClasse(o, classe) || eleves.some(function (e) {
        return matchRecordToEleve(o, e, classe.nom);
      });
    }).filter(function (o) {
      return inPeriod(o.dateOubli || o.createdAt, period);
    });

    var elevesAvecDispense = {};
    dispensesClasse.forEach(function (d) {
      eleves.forEach(function (e) {
        if (matchRecordToEleve(d, e, classe.nom)) elevesAvecDispense[e.id || labelEleve(e)] = true;
      });
    });

    var oublisParEleve = {};
    oublisClasse.forEach(function (o) {
      eleves.forEach(function (e) {
        if (matchRecordToEleve(o, e, classe.nom)) {
          var key = e.id || labelEleve(e);
          oublisParEleve[key] = (oublisParEleve[key] || 0) + 1;
        }
      });
    });

    var topOublis = Object.keys(oublisParEleve)
      .map(function (key) {
        var el = eleves.find(function (e) {
          return (e.id || labelEleve(e)) === key;
        });
        return {
          eleveId: el && el.id,
          label: el ? labelEleve(el) : key,
          count: oublisParEleve[key],
        };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, 8);

    var tableauxClasse = tableauxPourClasse(data, classeId, classe, eleves);

    var appelClasse = agregerAppelClasse(tableauxClasse, eleves, classe);

    var radarClasse = (data.radarPerfs || []).filter(function (r) {
      if (r.classeId === classeId) return inPeriod(r.createdAt, period);
      return eleves.some(function (e) {
        return matchRecordToEleve(r, e, classe.nom) && inPeriod(r.createdAt, period);
      });
    });

    var photoFinishClasse = [];
    eleves.forEach(function (e) {
      collectPhotoFinishForEleve(e, data, { period: period }).forEach(function (r) {
        photoFinishClasse.push(Object.assign({ eleveId: e.id, eleveLabel: labelEleve(e) }, r));
      });
    });

    var importsClasseAll = (data.importsEleves || []).filter(function (imp) {
      if (!imp) return false;
      return inPeriod(imp.importedAt || imp.createdAt, period);
    });

    var splitImports = splitImportsClasse(importsClasseAll, classe, eleves, data, classeId);
    var importsClasse = splitImports.individu;
    var importsEquipe = splitImports.equipe;
    var importsNonRattaches = splitImports.nonRattaches;
    var importFactsEquipe = buildImportFacts(importsEquipe, "team");
    var importFactsIndividu = buildImportFacts(importsClasse, "eleve");

    var sessionsClasse =
      typeof SyntheseEpsActivites !== "undefined"
        ? SyntheseEpsActivites.sessionsPourClasse(data, classeId, period)
        : (data.sessions || []).filter(function (s) {
            return s && s.classeId === classeId && inPeriod(s.lastOpenedAt || s.updatedAt || s.createdAt, period);
          });

    var sessionsParOutil = {};
    sessionsClasse.forEach(function (s) {
      var tid = s.toolId || "autre";
      if (!sessionsParOutil[tid]) {
        sessionsParOutil[tid] = { toolId: tid, label: SC.toolLabel ? SC.toolLabel(tid) : tid, sessions: [] };
      }
      sessionsParOutil[tid].sessions.push(s);
    });

    var championnats = (data.championnats || []).filter(function (c) {
      return sessionsClasse.some(function (s) {
        return c && c.sessionId === s.id;
      });
    });
    var tournois = (data.tournoisElimination || []).filter(function (t) {
      return sessionsClasse.some(function (s) {
        return t && t.sessionId === s.id;
      });
    });

    var synthesesEleves = eleves.map(function (e) {
      var syn = buildEleveSynthese(e.id, data, { classeId: classeId, period: period });
      return {
        eleveId: e.id,
        label: labelEleve(e),
        alertes: syn.alertes || [],
        scoreAlerte: scoreAlerte(syn.alertes),
        stats: syn.stats,
      };
    });

    if (options.triAlertes) {
      synthesesEleves.sort(function (a, b) {
        return b.scoreAlerte - a.scoreAlerte;
      });
    } else {
      synthesesEleves.sort(function (a, b) {
        return a.label.localeCompare(b.label, "fr");
      });
    }

    var alertesClasse = [];
    synthesesEleves.forEach(function (se) {
      se.alertes.forEach(function (a) {
        if (a.code === "oublis" && a.niveau === "rouge") {
          alertesClasse.push({ niveau: "rouge", label: se.label + " : " + a.label });
        } else if (a.code === "absences") {
          alertesClasse.push({ niveau: "orange", label: se.label + " : absences fréquentes" });
        } else if (a.code === "sans-donnee") {
          alertesClasse.push({ niveau: "orange", label: se.label + " : sans activité enregistrée" });
        } else if (a.code === "dispense-longue") {
          alertesClasse.push({ niveau: "orange", label: se.label + " : dispense longue" });
        }
      });
    });

    var badge = "vert";
    if (alertesClasse.some(function (a) {
      return a.niveau === "rouge";
    })) {
      badge = "rouge";
    } else if (alertesClasse.length >= 3) {
      badge = "rouge";
    } else if (alertesClasse.length > 0) {
      badge = "orange";
    }

    var eventsRecents = [];
    oublisClasse.forEach(function (o) {
      eventsRecents.push({
        date: o.dateOubli || o.createdAt,
        type: "oubli",
        label: labelEleve(
          eleves.find(function (e) {
            return matchRecordToEleve(o, e, classe.nom);
          })
        ),
        detail: o.commentaire || "Oubli matériel",
      });
    });
    dispensesClasse.forEach(function (d) {
      eventsRecents.push({
        date: d.dateDebut,
        type: "dispense",
        label: [d.prenom, d.nom].filter(Boolean).join(" ") || "Élève",
        detail: d.motif || "Dispense",
      });
    });
    sessionsClasse.forEach(function (s) {
      eventsRecents.push({
        date: s.lastOpenedAt || s.updatedAt,
        type: "session",
        label: SC.toolLabel ? SC.toolLabel(s.toolId) : s.toolId,
        detail: s.nomSession || "",
      });
    });
    eventsRecents.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    eventsRecents = eventsRecents.slice(0, 25);

    var activitesClasse =
      typeof SyntheseEpsActivites !== "undefined"
        ? SyntheseEpsActivites.collectActivitesClasse(classeId, data, { period: period })
        : { parOutil: [] };

    var lectureClasse = buildLecturePedagogiqueClasse({
      eleves: eleves,
      elevesCount: eleves.length,
      dispenses: dispensesClasse,
      oublis: oublisClasse,
      imports: importsClasse,
      importsEquipe: importsEquipe,
      importFactsEquipe: importFactsEquipe,
      radar: radarClasse,
      photoFinish: photoFinishClasse,
      sessions: sessionsClasse,
      synthesesEleves: synthesesEleves,
      appel: appelClasse,
      tableaux: tableauxClasse,
      activitesClasse: activitesClasse,
    });

    return {
      ok: true,
      classeId: classeId,
      classeNom: classe.nom,
      badge: badge,
      stats: {
        nbEleves: eleves.length,
        nbDispenses: dispensesClasse.length,
        nbElevesAvecDispense: Object.keys(elevesAvecDispense).length,
        nbOublis: oublisClasse.length,
        nbFeuillesAppel: appelClasse.nbFeuilles,
        pctPresentAppel: appelClasse.pctPresent,
        nbColonnesNotes: appelClasse.nbColonnesNotes,
        nbNotesAppel: appelClasse.nbColonnesNotes,
        nbElevesSurAppel: appelClasse.nbElevesSurFeuilles,
        nbRadar: radarClasse.length,
        nbPhotoFinish: photoFinishClasse.length,
        nbImports: importsClasse.length + importsEquipe.length,
        nbImportsEquipe: importsEquipe.length,
        nbImportsNonRattaches: importsNonRattaches.length,
        nbTableaux: tableauxClasse.length,
        nbSessions: sessionsClasse.length,
      },
      appelNotes: appelClasse,
      resumeAppelFeuilles: buildResumeAppelFeuillesClasse(tableauxClasse, eleves, classe),
      topOublis: topOublis,
      tableauxSuivi: tableauxClasse,
      radarPerfs: radarClasse,
      photoFinish: photoFinishClasse,
      importsEleves: importsClasse,
      importsEquipe: importsEquipe,
      importFactsEquipe: importFactsEquipe,
      importsNonRattaches: importsNonRattaches,
      sessionsParOutil: activitesClasse.parOutil.length
        ? activitesClasse.parOutil
        : Object.keys(sessionsParOutil).map(function (k) {
            return sessionsParOutil[k];
          }),
      activitesClasse: activitesClasse,
      championnats: championnats,
      tournois: tournois,
      synthesesEleves: synthesesEleves,
      alertes: alertesClasse.slice(0, 30),
      evenementsRecents: eventsRecents,
      lecturePedagogique: lectureClasse,
      generatedAt: new Date().toISOString(),
    };
  }

  function buildLecturePedagogiqueClasse(ctx) {
    var lines = {
      engagement: [],
      regularite: [],
      progres: [],
      vigilance: [],
    };
    var appel = ctx.appel || { nbFeuilles: 0, presence: { total: 0 } };

    if (appel.nbTableaux > 0) {
      lines.engagement.push(
        appel.nbTableaux +
          " feuille(s) d’appel / notes (" +
          appel.nbFeuilles +
          " colonne(s) appel) pour la classe (" +
          appel.nbElevesSurFeuilles +
          " élève(s) repéré(s), " +
          appel.nbColonnesNotes +
          " colonne(s) de note)."
      );
    }
    if (appel.pctPresent != null && appel.presence.total > 0) {
      lines.regularite.push(
        "Présence collective sur l’appel : " + appel.pctPresent + " % de ✓."
      );
    }
    if (ctx.importFactsEquipe && ctx.importFactsEquipe.length) {
      ctx.importFactsEquipe.forEach(function (f) {
        lines.engagement.push(
          (f.toolLabel || "Import équipe") + " : " + (f.headline || "—") + "."
        );
      });
    } else if (ctx.importsEquipe && ctx.importsEquipe.length) {
      lines.engagement.push(ctx.importsEquipe.length + " match(s) ou score(s) d’équipe importé(s) (QR).");
    }
    if (ctx.imports && ctx.imports.length) {
      engagementLinesFromFacts(buildImportFacts(ctx.imports, "eleve")).forEach(function (line) {
        lines.engagement.push(line);
      });
    }
    if (ctx.activitesClasse && ctx.activitesClasse.parOutil && ctx.activitesClasse.parOutil.length) {
      ctx.activitesClasse.parOutil.forEach(function (g) {
        var detail = (g.sessions || [])
          .slice(0, 2)
          .map(function (s) {
            return s.resume;
          })
          .join(" ; ");
        lines.engagement.push(
          g.label + " : " + g.nbSessions + " séance(s)" + (detail ? " — " + detail : "") + "."
        );
      });
    } else if (ctx.sessions.length) {
      lines.engagement.push(ctx.sessions.length + " séance(s) d’outils collectifs liée(s) à cette classe.");
    }
    var avecNotes = (ctx.synthesesEleves || []).filter(function (s) {
      return s.stats && s.stats.nbNotesAppel >= 2;
    }).length;
    if (avecNotes > 0) {
      lines.progres.push(avecNotes + " élève(s) avec au moins 2 colonnes de note sur l’appel.");
    }
    if (ctx.radar.length) {
      lines.progres.push(ctx.radar.length + " passage(s) radar (outil vitesse, si utilisé).");
    }
    if (ctx.photoFinish && ctx.photoFinish.length) {
      lines.progres.push(ctx.photoFinish.length + " chronométrage(s) Photo Finish enregistré(s).");
    }
    var sansAppel = (ctx.synthesesEleves || []).filter(function (s) {
      return s.stats && !s.stats.nbFeuillesAppel;
    }).length;
    if (sansAppel > 0 && ctx.elevesCount > 0) {
      lines.vigilance.push(
        sansAppel + " élève(s) non relié(s) à une feuille d’appel — vérifier l’import depuis « Classes »."
      );
    }
    var sansDonnee = (ctx.synthesesEleves || []).filter(function (s) {
      return s.stats && s.stats.activiteTotale === 0;
    }).length;
    if (sansDonnee > 0) {
      lines.vigilance.push(
        sansDonnee + " élève(s) sans aucune donnée — renseigner l’appel, les oublis ou les imports."
      );
    }
    if (ctx.oublis.length) {
      lines.regularite.push(ctx.oublis.length + " oubli(s) de matériel sur la classe.");
    }
    if (ctx.dispenses.length) {
      lines.vigilance.push(ctx.dispenses.length + " dispense(s) / inaptitude(s) enregistrée(s).");
    }
    Object.keys(lines).forEach(function (k) {
      if (!lines[k].length) lines[k].push("Non renseigné à partir des données disponibles.");
    });
    return lines;
  }

  function buildTexteConseilClasse(syn) {
    if (!syn || !syn.ok) return "";
    var lines = [
      "Synthèse classe — " + syn.classeNom,
      "Élèves : " + syn.stats.nbEleves,
      "Dispenses : " + syn.stats.nbDispenses + " (" + syn.stats.nbElevesAvecDispense + " élèves concernés)",
      "Oublis matériel : " + syn.stats.nbOublis,
    ];
    if (syn.appelNotes && syn.appelNotes.nbTableaux) {
      lines.push(
        "Appel : " +
          syn.appelNotes.nbTableaux +
          " feuille(s), " +
          syn.appelNotes.nbFeuilles +
          " colonne(s) appel, " +
          syn.appelNotes.nbColonnesNotes +
          " colonne(s) de note, " +
          (syn.appelNotes.pctPresent != null ? syn.appelNotes.pctPresent + "% présence" : "présence non calculée")
      );
    }
    if (syn.topOublis.length) {
      lines.push("Top oublis : " + syn.topOublis.map(function (t) {
        return t.label + " (" + t.count + ")";
      }).join(", "));
    }
    if (syn.alertes.length) {
      lines.push("Alertes : " + syn.alertes.slice(0, 8).map(function (a) {
        return a.label;
      }).join(" ; "));
    }
    return lines.join("\n");
  }

  function buildTexteBilanEleve(syn) {
    if (!syn || !syn.ok) return "";
    var id = syn.identite;
    var lines = [
      "Bilan élève — " + id.prenom + " " + id.nom + " (" + id.classe + ")",
      "Appel : " +
        (syn.stats.nbFeuillesAppel || 0) +
        " colonne(s) appel" +
        (syn.stats.pctPresentAppel != null ? ", " + syn.stats.pctPresentAppel + "% présence" : "") +
        ", " +
        (syn.stats.nbColonnesNotes || syn.stats.nbNotesAppel || 0) +
        " colonne(s) de note",
      "Dispenses : " + syn.stats.nbDispenses + " | Oublis : " + syn.stats.nbOublis,
    ];
    if (syn.asns) {
      lines.push("ASNS : " + syn.asns.headline);
      if (syn.asns.commentaires) lines.push("Remarques ASNS : " + syn.asns.commentaires);
    }
    lines.push("Points forts :");
    syn.resume.pointsForts
      .filter(function (p) {
        return p !== "Aucun indicateur fort particulier.";
      })
      .forEach(function (p) {
        lines.push("• " + p);
      });
    lines.push("Vigilance :");
    syn.resume.pointsVigilance
      .filter(function (p) {
        return p !== "Rien de notable dans les alertes automatiques.";
      })
      .forEach(function (p) {
        lines.push("• " + p);
      });
    return lines.join("\n");
  }

  return {
    normalizeName: normalizeName,
    sameEleve: sameEleve,
    normalizeLoadedData: normalizeLoadedData,
    collectPhotoFinishForEleve: collectPhotoFinishForEleve,
    photoFinishResultLabel: photoFinishResultLabel,
    findEleveRecords: findEleveRecords,
    buildEleveSynthese: buildEleveSynthese,
    buildClasseSynthese: buildClasseSynthese,
    buildTexteConseilClasse: buildTexteConseilClasse,
    buildTexteBilanEleve: buildTexteBilanEleve,
    labelEleve: labelEleve,
    elevesDeClasse: elevesDeClasse,
    agregerAppelEleve: agregerAppelEleve,
    agregerAppelClasse: agregerAppelClasse,
    extractColonnesLigne: extractColonnesLigne,
    buildSyntheseFeuilleAppel: buildSyntheseFeuilleAppel,
    buildResumeAppelFeuillesClasse: buildResumeAppelFeuillesClasse,
    computeMoyennesNotesClasse: computeMoyennesNotesClasse,
    tableauxPourClasse: tableauxPourClasse,
    TOOL_LABELS_IMPORT: TOOL_LABELS_IMPORT,
    OUBLIS_ALERTE_SEUIL: OUBLIS_ALERTE_SEUIL,
  };
});
