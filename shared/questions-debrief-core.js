/**
 * Questions débrief — questions canoniques (partagées élève / prof) et payload QR compact.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.QuestionsDebriefCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var TOOL_ID = "questions-debrief";
  var COMPACT_VERSION = 1;
  var SCALE_MIN = 1;
  var SCALE_MAX = 5;
  var TEXTE_MAX_LENGTH = 120;

  /** Questions fixes — 4 notes (1 à 5) puis 3 réponses texte. */
  var QUESTIONS_INDIVIDUEL = [
    {
      id: "implication",
      theme: "Implication",
      type: "echelle",
      question: "J’évalue mon implication dans la séance",
    },
    {
      id: "concentration",
      theme: "Concentration",
      type: "echelle",
      question: "J’évalue ma concentration",
    },
    {
      id: "progres",
      theme: "Progrès",
      type: "echelle",
      question: "J’évalue mes progrès",
    },
    {
      id: "effort",
      theme: "Effort",
      type: "echelle",
      question: "J’évalue mon effort",
    },
    {
      id: "difficulte",
      theme: "Difficulté",
      type: "texte",
      question: "Qu’est-ce qui vous a le plus freiné ou bloqué ?",
    },
    {
      id: "progres_texte",
      theme: "Progrès",
      type: "texte",
      question: "Quels progrès retenez-vous ?",
    },
    {
      id: "amelioration",
      theme: "À travailler",
      type: "texte",
      question: "Sur quoi voulez-vous progresser à la prochaine séance ?",
    },
  ];

  var QUESTIONS_EQUIPE = [
    {
      id: "implication",
      theme: "Implication",
      type: "echelle",
      question: "J’évalue l’implication de l’équipe",
    },
    {
      id: "concentration",
      theme: "Concentration",
      type: "echelle",
      question: "J’évalue la concentration du groupe",
    },
    {
      id: "progres",
      theme: "Progrès",
      type: "echelle",
      question: "J’évalue les progrès collectifs",
    },
    {
      id: "cooperation",
      theme: "Coopération",
      type: "echelle",
      question: "J’évalue la coopération dans l’équipe",
    },
    {
      id: "difficulte",
      theme: "Difficulté",
      type: "texte",
      question: "Quel obstacle le groupe a-t-il rencontré ?",
    },
    {
      id: "progres_texte",
      theme: "Progrès",
      type: "texte",
      question: "Quels progrès collectifs retenez-vous ?",
    },
    {
      id: "amelioration",
      theme: "À améliorer",
      type: "texte",
      question: "Que doit travailler l’équipe à la prochaine séance ?",
    },
  ];

  function questionDef(itemOrId, portee) {
    var id =
      typeof itemOrId === "string"
        ? itemOrId
        : itemOrId && (itemOrId.id || itemOrId.listeId);
    if (!id) return null;
    var list = questionsForPortee(portee || "individuel");
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function itemIsEchelle(item, portee) {
    if (!item) return false;
    if (item.type === "echelle") return true;
    if (item.type === "texte") return false;
    var def = questionDef(item, portee);
    return def ? isEchelle(def) : false;
  }

  function itemIsTexte(item, portee) {
    if (!item) return false;
    if (item.type === "texte") return true;
    if (item.type === "echelle") return false;
    var def = questionDef(item, portee);
    return def ? isTexte(def) : true;
  }

  function isEchelle(def) {
    return !!(def && def.type === "echelle");
  }

  function isTexte(def) {
    return !!(def && def.type === "texte");
  }

  function normalizeTexteReponse(value) {
    return String(value || "")
      .trim()
      .slice(0, TEXTE_MAX_LENGTH);
  }

  function normalizeEchelleReponse(value) {
    var n = parseInt(String(value || "").trim(), 10);
    if (isNaN(n) || n < SCALE_MIN || n > SCALE_MAX) return "";
    return String(n);
  }

  function normalizeReponse(value, def) {
    if (def && isEchelle(def)) return normalizeEchelleReponse(value);
    if (def && isTexte(def)) return normalizeTexteReponse(value);
    return normalizeTexteReponse(value);
  }

  function isReponseValide(value, def) {
    if (def && isEchelle(def)) return normalizeEchelleReponse(value) !== "";
    return normalizeTexteReponse(value).length > 0;
  }

  function questionsEchelle(portee) {
    return questionsForPortee(portee).filter(isEchelle);
  }

  function formatReponseLabel(value, def) {
    var norm = normalizeReponse(value, def);
    if (!norm) return "—";
    if (def && isEchelle(def)) return norm + " / " + SCALE_MAX;
    return norm;
  }

  function questionsForPortee(portee) {
    return portee === "equipe" ? QUESTIONS_EQUIPE : QUESTIONS_INDIVIDUEL;
  }

  function porteeLabel(portee) {
    return portee === "equipe" ? "Bilan d’équipe" : "Bilan individuel";
  }

  function porteeCode(portee) {
    return portee === "equipe" ? "e" : "i";
  }

  function porteeFromCode(code) {
    return code === "e" ? "equipe" : "individuel";
  }

  function buildItemsForPortee(portee, previousItems) {
    var prev = previousItems || [];
    return questionsForPortee(portee).map(function (q) {
      var old = prev.find(function (x) {
        return x.id === q.id || x.listeId === q.id;
      });
      return {
        id: q.id,
        listeId: q.id,
        listeNom: q.theme,
        type: q.type,
        question: q.question,
        reponse: old ? normalizeReponse(old.reponse, q) : "",
      };
    });
  }

  function isCompactPayload(payload) {
    return payload && payload.c === COMPACT_VERSION && Array.isArray(payload.a);
  }

  /** Payload minimal pour QR : notes 1–5 (questions connues côté prof). */
  function buildCompactSharePayload(seance) {
    if (!seance) return { c: COMPACT_VERSION, p: "i", t: "", d: "", a: [] };
    var portee = seance.portee === "equipe" ? "equipe" : "individuel";
    return {
      c: COMPACT_VERSION,
      p: porteeCode(portee),
      t: String(seance.title || "").trim().slice(0, 80),
      d: seance.dateIso || "",
      a: (seance.items || []).map(function (it) {
        return normalizeReponse(it.reponse, questionDef(it, portee));
      }),
    };
  }

  function expandPayload(payload) {
    if (!payload || typeof payload !== "object") {
      return { portee: "individuel", porteeLabel: porteeLabel("individuel"), reponses: [] };
    }
    if (isCompactPayload(payload)) {
      var portee = porteeFromCode(payload.p);
      var canon = questionsForPortee(portee);
      var answers = payload.a || [];
      return {
        compact: true,
        seanceTitle: payload.t || "",
        dateIso: payload.d || "",
        dateLabel: payload.d || "",
        portee: portee,
        porteeLabel: porteeLabel(portee),
        titre: porteeLabel(portee),
        reponses: canon.map(function (q, i) {
          return {
            id: q.id,
            theme: q.theme,
            type: q.type,
            question: q.question,
            reponse: normalizeReponse(answers[i] != null ? answers[i] : "", q),
          };
        }),
      };
    }
    return Object.assign({ compact: false }, payload, {
      reponses: payload.reponses || [],
    });
  }

  function seancePretPourPartage(seance) {
    if (!seance || !seance.items || !seance.items.length) return false;
    var portee = seance.portee === "equipe" ? "equipe" : "individuel";
    return questionsEchelle(portee).every(function (q) {
      var it = (seance.items || []).find(function (x) {
        return x.id === q.id;
      });
      return it && isReponseValide(it.reponse, q);
    });
  }

  return {
    TOOL_ID: TOOL_ID,
    COMPACT_VERSION: COMPACT_VERSION,
    SCALE_MIN: SCALE_MIN,
    SCALE_MAX: SCALE_MAX,
    TEXTE_MAX_LENGTH: TEXTE_MAX_LENGTH,
    QUESTIONS_INDIVIDUEL: QUESTIONS_INDIVIDUEL,
    QUESTIONS_EQUIPE: QUESTIONS_EQUIPE,
    questionsForPortee: questionsForPortee,
    porteeLabel: porteeLabel,
    porteeCode: porteeCode,
    porteeFromCode: porteeFromCode,
    questionDef: questionDef,
    itemIsEchelle: itemIsEchelle,
    itemIsTexte: itemIsTexte,
    isEchelle: isEchelle,
    isTexte: isTexte,
    questionsEchelle: questionsEchelle,
    normalizeReponse: normalizeReponse,
    isReponseValide: isReponseValide,
    formatReponseLabel: formatReponseLabel,
    buildItemsForPortee: buildItemsForPortee,
    buildCompactSharePayload: buildCompactSharePayload,
    isCompactPayload: isCompactPayload,
    expandPayload: expandPayload,
    seancePretPourPartage: seancePretPourPartage,
  };
});
