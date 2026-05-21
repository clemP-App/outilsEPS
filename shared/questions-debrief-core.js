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

  /** Questions fixes — valables pour toute activité EPS. */
  var QUESTIONS_INDIVIDUEL = [
    {
      id: "ressenti",
      theme: "Ressenti",
      question: "Comment vous êtes-vous senti(e) pendant cette séance ?",
    },
    {
      id: "reussite",
      theme: "Réussites",
      question: "Qu’avez-vous réussi ou progressé aujourd’hui ?",
    },
    {
      id: "difficulte",
      theme: "Difficultés",
      question: "Quelle difficulté avez-vous rencontrée ?",
    },
    {
      id: "amelioration",
      theme: "Pistes",
      question: "Que voulez-vous améliorer à la prochaine séance ?",
    },
    {
      id: "objectif",
      theme: "Objectif",
      question: "Quel objectif ou consigne retenez-vous pour la suite ?",
    },
  ];

  var QUESTIONS_EQUIPE = [
    {
      id: "cooperation",
      theme: "Coopération",
      question: "Comment le groupe a-t-il fonctionné pendant la séance ?",
    },
    {
      id: "positif",
      theme: "Points positifs",
      question: "Qu’est-ce qui a bien marché dans la coopération ?",
    },
    {
      id: "difficulte",
      theme: "Difficultés",
      question: "Quelle difficulté l’équipe a-t-elle rencontrée ?",
    },
    {
      id: "collectif",
      theme: "Collectif",
      question: "Qu’allez-vous améliorer ensemble à la prochaine séance ?",
    },
    {
      id: "objectif",
      theme: "Objectif",
      question: "Quel objectif le groupe fixe-t-il pour la suite ?",
    },
  ];

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
        return x.id === q.id;
      });
      return {
        id: q.id,
        listeId: q.id,
        listeNom: q.theme,
        question: q.question,
        reponse: old ? String(old.reponse || "") : "",
      };
    });
  }

  function isCompactPayload(payload) {
    return payload && payload.c === COMPACT_VERSION && Array.isArray(payload.a);
  }

  /** Payload minimal pour QR : réponses seules (questions connues côté prof). */
  function buildCompactSharePayload(seance) {
    if (!seance) return { c: COMPACT_VERSION, p: "i", t: "", d: "", a: [] };
    return {
      c: COMPACT_VERSION,
      p: porteeCode(seance.portee),
      t: String(seance.title || "").trim().slice(0, 80),
      d: seance.dateIso || "",
      a: (seance.items || []).map(function (it) {
        return String(it.reponse || "").trim();
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
            question: q.question,
            reponse: answers[i] != null ? String(answers[i]) : "",
          };
        }),
      };
    }
    return Object.assign({ compact: false }, payload, {
      reponses: payload.reponses || [],
    });
  }

  return {
    TOOL_ID: TOOL_ID,
    COMPACT_VERSION: COMPACT_VERSION,
    QUESTIONS_INDIVIDUEL: QUESTIONS_INDIVIDUEL,
    QUESTIONS_EQUIPE: QUESTIONS_EQUIPE,
    questionsForPortee: questionsForPortee,
    porteeLabel: porteeLabel,
    porteeCode: porteeCode,
    porteeFromCode: porteeFromCode,
    buildItemsForPortee: buildItemsForPortee,
    buildCompactSharePayload: buildCompactSharePayload,
    isCompactPayload: isCompactPayload,
    expandPayload: expandPayload,
  };
});
