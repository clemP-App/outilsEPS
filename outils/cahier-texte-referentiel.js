/**
 * Pont entre le cahier de texte (cycles c3/c4/lycee/lyceePro) et eps-referentiel-data.js (cycle3/cycle4/lycee/lyceePro).
 */
(function (global) {
  "use strict";

  var MAX = 8;

  function eps() {
    return global.EPS_REFERENTIEL || null;
  }

  function cycleToEps(cycleId) {
    if (cycleId === "c3") return "cycle3";
    if (cycleId === "c4") return "cycle4";
    if (cycleId === "lyceePro") return "lyceePro";
    if (cycleId === "cycle3" || cycleId === "cycle4" || cycleId === "lycee") return cycleId;
    return "lycee";
  }

  function typeToEps(typeId) {
    if (typeId === "reinvestissement") return "reinves";
    return typeId;
  }

  function typeFromEps(typeId) {
    if (typeId === "reinves") return "reinves";
    return typeId;
  }

  function hasReferentiel(cycleId, champId, apsaId) {
    if (!apsaId || apsaId === "autre") return false;
    var ref = eps();
    if (!ref || !ref.APSA[apsaId]) return false;
    var a = ref.APSA[apsaId];
    if (ref.objectifsSequencePourCycle) {
      return ref.objectifsSequencePourCycle(a, cycleToEps(cycleId), null, null).length > 0;
    }
    var objs = a.objectifsSequence;
    return !!(objs && objs.length);
  }

  function getChampsDisponibles(cycleId) {
    var ref = eps();
    if (!ref) {
      var epsCycle = cycleToEps(cycleId);
      return epsCycle === "lycee" || epsCycle === "lyceePro"
        ? ["perf", "adapt", "expr", "coop", "ca5"]
        : ["perf", "adapt", "expr", "coop"];
    }
    return ref.getChampsPourCycle(cycleToEps(cycleId)).map(function (c) {
      return c.id;
    });
  }

  function getApsaDisponibles(cycleId, champId, apsaParChamp) {
    var ref = eps();
    if (!champId) return [];
    if (ref) {
      var fromEps = ref.getApsaPourChamp(cycleToEps(cycleId), champId);
      if (fromEps.length) {
        var local = (apsaParChamp && apsaParChamp[champId]) || [];
        var introById = {};
        local.forEach(function (a) {
          introById[a.id] = a.intro;
        });
        return fromEps.map(function (a) {
          return {
            id: a.id,
            label: a.label,
            intro: introById[a.id] || "Séance de " + a.label.toLowerCase(),
          };
        });
      }
    }
    return (apsaParChamp && apsaParChamp[champId]) || [];
  }

  function paramsEps(ctx) {
    ctx = ctx || {};
    var numero = ctx.numeroSeance || 1;
    var seancesExistantes = [];
    for (var i = 1; i < numero; i++) seancesExistantes.push({});
    return {
      cycleId: cycleToEps(ctx.cycleId),
      champId: ctx.champId,
      apsaId: ctx.apsaId,
      objectifSequenceIds: ctx.objectifSequenceIds,
      typeSeance: typeToEps(ctx.typeSeance),
      seancesExistantes: seancesExistantes,
      athleFamilleIds: ctx.athleFamilleIds || (ctx.athleFamilleId ? [ctx.athleFamilleId] : null),
      familleIds: ctx.athleFamilleIds || ctx.familleIds || null,
    };
  }

  function getObjectifsSequence(ctx) {
    var ref = eps();
    if (!ref || !hasReferentiel(ctx.cycleId, ctx.champId, ctx.apsaId)) return null;
    return ref.getObjectifsSequence(paramsEps(ctx));
  }

  function getObjectifsSeance(ctx) {
    var ref = eps();
    if (!ref || !hasReferentiel(ctx.cycleId, ctx.champId, ctx.apsaId)) return [];
    return ref.getObjectifsSeance(paramsEps(ctx));
  }

  function getContenusSeance(ctx) {
    var ref = eps();
    if (!ref || !hasReferentiel(ctx.cycleId, ctx.champId, ctx.apsaId)) return [];
    return ref.getContenusSeance(paramsEps(ctx));
  }

  function getPointsAttentionSeance(ctx) {
    var ref = eps();
    if (!ref || !hasReferentiel(ctx.cycleId, ctx.champId, ctx.apsaId)) return [];
    return ref.getPointsAttention(paramsEps(ctx));
  }

  function objectifSequenceById(apsaId, propId, cycleId, familleIds) {
    var ref = eps();
    if (!ref || !ref.APSA[apsaId]) return null;
    var a = ref.APSA[apsaId];
    var familles = familleIds
      ? Array.isArray(familleIds)
        ? familleIds
        : [familleIds]
      : null;
    function findIn(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === propId) return list[i];
      }
      return null;
    }
    if (ref.objectifsSequencePourCycle) {
      var hit;
      if (cycleId) {
        hit = findIn(ref.objectifsSequencePourCycle(a, cycleToEps(cycleId), null, familles));
        if (hit) return hit;
      }
      var cycles = ["cycle3", "cycle4", "lycee", "lyceePro"];
      for (var c = 0; c < cycles.length; c++) {
        hit = findIn(ref.objectifsSequencePourCycle(a, cycles[c], null, familles));
        if (hit) return hit;
      }
      return null;
    }
    return findIn(a.objectifsSequence || []);
  }

  function getFamillesApsa(apsaId) {
    var ref = eps();
    if (!ref || !ref.APSA[apsaId] || !ref.APSA[apsaId].familles) return [];
    var fam = ref.APSA[apsaId].familles;
    return Object.keys(fam).map(function (k) {
      var f = fam[k];
      return { id: f.id || k, label: f.label || k };
    });
  }

  function suggestTypeSeance(numeroSeance) {
    var ref = eps();
    if (!ref) return "apprentissage";
    var nb = Math.max(0, (numeroSeance || 1) - 1);
    var fake = [];
    for (var i = 0; i < nb; i++) fake.push({});
    return typeFromEps(ref.suggererTypeSeance(fake));
  }

  function numeroSeanceDansSequence(seq, currentSeanceId) {
    if (!seq || !seq.seances) return 1;
    var ordered = seq.seances.slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
    if (currentSeanceId) {
      for (var i = 0; i < ordered.length; i++) {
        if (ordered[i].id === currentSeanceId) return i + 1;
      }
      return ordered.length + 1;
    }
    return ordered.length + 1;
  }

  function phrasePourCycle(item, cycleId) {
    if (!item) return "";
    if (cycleId === "c3" && item.phraseC3) return item.phraseC3;
    if (cycleId === "c4" && item.phraseC4) return item.phraseC4;
    if (cycleId === "lyceePro" && item.phraseLyceePro) return item.phraseLyceePro;
    if (cycleId === "lycee" && item.phraseLycee) return item.phraseLycee;
    return item.phrase || "";
  }

  var TYPE_SEANCE = [];
  var refInit = eps();
  if (refInit && refInit.TYPES_SEANCE) {
    TYPE_SEANCE = refInit.TYPES_SEANCE.map(function (t) {
      return { id: typeFromEps(t.id), label: t.label };
    });
  }

  global.CahierTexteReferentiel = {
    TYPE_SEANCE: TYPE_SEANCE,
    MAX: MAX,
    hasReferentiel: hasReferentiel,
    getChampsDisponibles: getChampsDisponibles,
    getApsaDisponibles: getApsaDisponibles,
    getObjectifsSequence: getObjectifsSequence,
    getObjectifsSeance: getObjectifsSeance,
    getContenusSeance: getContenusSeance,
    getPointsAttentionSeance: getPointsAttentionSeance,
    objectifSequenceById: objectifSequenceById,
    getFamillesApsa: getFamillesApsa,
    suggestTypeSeance: suggestTypeSeance,
    numeroSeanceDansSequence: numeroSeanceDansSequence,
    phrasePourCycle: phrasePourCycle,
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
