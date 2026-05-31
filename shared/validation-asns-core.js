/**
 * Validation ASNS — modèle de données, persistance IndexedDB (parametres).
 */
var ValidationAsnsCore = (function () {
  "use strict";

  var DATA_ID = "validation-asns-data";
  var SETTINGS_ID = "validation-asns-settings";
  var DATA_VERSION = 3;
  var OFFICIAL_PAGE_URL =
    "https://eduscol.education.gouv.fr/5709/savoir-nager-en-securite-de-la-maternelle-au-lycee";
  var OFFICIAL_ARRATE_URL =
    "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045348378";
  var OFFICIAL_VIDEO_URL = "https://www.youtube.com/watch?v=4D-ekJs-2QYs";
  /** @deprecated utiliser OFFICIAL_PAGE_URL */
  var OFFICIAL_TEXT_URL = OFFICIAL_PAGE_URL;

  var STATUT_ELEVE = {
    NON_COMMENCE: "non_commence",
    EN_COURS: "en_cours",
    VALIDE: "valide",
    NON_VALIDE: "non_valide",
  };

  var STATUT_COMP = {
    VALIDE: "valide",
    NON_VALIDE: "non_valide",
    A_REVOIR: "a_revoir",
    ABSENT: "absent",
  };

  /** Étapes validables — grille ASNS 2022/2025 (10 parcours + 3 connaissances). */
  var ETAPES = [
    {
      id: "p1",
      section: "parcours",
      label: "À partir du bord de la piscine, entrer dans l'eau en chute arrière",
    },
    {
      id: "p2",
      section: "parcours",
      label: "Se déplacer sur 3,5 m en direction d'un obstacle",
    },
    {
      id: "p3",
      section: "parcours",
      label:
        "Franchir en immersion complète l'obstacle sur 1,5 m (tapis si possible ; repères extérieurs en dernier recours)",
    },
    {
      id: "p4",
      section: "parcours",
      label:
        "Se déplacer sur le ventre sur 20 m ; au signal, surplace vertical 15 s puis terminer les 20 m",
    },
    {
      id: "p5",
      section: "parcours",
      label:
        "Faire demi-tour sans reprise d'appuis et passer d'une position ventrale à dorsale",
    },
    {
      id: "p6",
      section: "parcours",
      label: "Se déplacer sur le dos sur une distance de 20 m",
    },
    {
      id: "p7",
      section: "parcours",
      label:
        "Au cours des 20 m dorsaux : au signal, surplace horizontale dorsale 15 s puis terminer les 20 m",
    },
    {
      id: "p8",
      section: "parcours",
      label:
        "Se retourner sur le ventre et franchir à nouveau l'obstacle en immersion complète",
    },
    {
      id: "p9",
      section: "parcours",
      label: "Se déplacer sur le ventre pour revenir au point de départ",
    },
    {
      id: "p10",
      section: "parcours",
      label:
        "S'ancrer de manière sécurisée sur un élément fixe et stable (en piscine : échelle acceptable)",
    },
    {
      id: "k1",
      section: "connaissances",
      label:
        "Savoir identifier la personne responsable de la surveillance à alerter en cas de problème",
    },
    {
      id: "k2",
      section: "connaissances",
      label:
        "Connaître et respecter les règles de base d'hygiène et de sécurité (établissement de bains ou espace surveillé)",
    },
    {
      id: "k3",
      section: "connaissances",
      label:
        "Savoir identifier les environnements et circonstances pour lesquels l'ASNS permet d'évoluer en sécurité",
    },
  ];

  var STATUT_LABELS = {
    non_commence: "Non commencé",
    en_cours: "En cours",
    valide: "Validé",
    non_valide: "Non validé",
  };

  var COMP_LABELS = {
    valide: "Validé",
    non_valide: "Non validé",
    a_revoir: "À revoir",
    absent: "Absent",
  };

  function genererId(prefix) {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId(prefix || "asns");
    }
    return (prefix || "asns") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function etapesVides() {
    var o = {};
    ETAPES.forEach(function (e) {
      o[e.id] = "";
    });
    return o;
  }

  function etapesParSection(section) {
    return ETAPES.filter(function (e) {
      return e.section === section;
    });
  }

  function fusionnerStatutEtape(a, b) {
    if (a === STATUT_COMP.VALIDE && b === STATUT_COMP.VALIDE) return STATUT_COMP.VALIDE;
    if (!a && !b) return "";
    if (a === STATUT_COMP.NON_VALIDE || b === STATUT_COMP.NON_VALIDE) {
      return STATUT_COMP.NON_VALIDE;
    }
    if (a === STATUT_COMP.A_REVOIR || b === STATUT_COMP.A_REVOIR) return STATUT_COMP.A_REVOIR;
    if (a === STATUT_COMP.ABSENT || b === STATUT_COMP.ABSENT) return STATUT_COMP.ABSENT;
    if (a === STATUT_COMP.VALIDE || b === STATUT_COMP.VALIDE) return STATUT_COMP.A_REVOIR;
    return a || b || "";
  }

  /** Migration grille ASSN 2015 (13 étapes, 15 m) → ASNS 2022/2025 (13 étapes, 20 m + ancrage). */
  function migrerEtapesV2(legacy) {
    legacy = legacy && typeof legacy === "object" ? legacy : {};
    var o = etapesVides();
    o.p1 = legacy.p1 || "";
    o.p2 = legacy.p2 || "";
    o.p3 = legacy.p3 || "";
    o.p4 = fusionnerStatutEtape(legacy.p4, legacy.p5);
    o.p5 = legacy.p6 || "";
    o.p6 = legacy.p7 || "";
    o.p7 = legacy.p8 || "";
    o.p8 = legacy.p9 || "";
    o.p9 = legacy.p10 || "";
    o.p10 = "";
    o.k1 = legacy.k1 || "";
    o.k2 = legacy.k2 || "";
    o.k3 = legacy.k3 || "";
    return o;
  }

  function migrerHistoriqueEtapes(historique) {
    if (!Array.isArray(historique)) return historique;
    return historique.map(function (h) {
      if (!h || !h.etapes) return h;
      return Object.assign({}, h, { etapes: migrerEtapesV2(h.etapes) });
    });
  }

  function defaultData() {
    return {
      id: DATA_ID,
      version: DATA_VERSION,
      classes: [],
      eleves: [],
      updatedAt: new Date().toISOString(),
    };
  }

  function defaultSettings() {
    return {
      id: SETTINGS_ID,
      academie: "",
      etablissement: "",
      enseignant: "",
      profil: "eps",
      signaturePng: null,
      classeActiveId: null,
    };
  }

  function normaliserData(raw) {
    var d = raw && typeof raw === "object" ? raw : defaultData();
    if (!d.id) d.id = DATA_ID;
    var sourceVersion = typeof d.version === "number" ? d.version : 1;
    var needsMigrate = sourceVersion < DATA_VERSION;
    if (!Array.isArray(d.classes)) d.classes = [];
    if (!Array.isArray(d.eleves)) d.eleves = [];
    d.eleves = d.eleves.map(function (el) {
      var e = normaliserEleve(el, needsMigrate);
      if (needsMigrate && e && e.historique) {
        e.historique = migrerHistoriqueEtapes(e.historique);
      }
      return e;
    });
    d.version = DATA_VERSION;
    return d;
  }

  function normaliserEleve(e, needsMigrate) {
    if (!e || typeof e !== "object") return null;
    var legacy = e.etapes || e.competences || {};
    if (needsMigrate) legacy = migrerEtapesV2(legacy);
    return {
      id: e.id || genererId("eleve"),
      classeId: e.classeId || "",
      nom: (e.nom || "").trim(),
      prenom: (e.prenom || "").trim(),
      dateNaissance: e.dateNaissance || "",
      photo: e.photo || null,
      groupe: e.groupe || "",
      niveau: e.niveau || "",
      statut: e.statut || STATUT_ELEVE.NON_COMMENCE,
      commentaires: e.commentaires || "",
      etapes: Object.assign(etapesVides(), legacy),
      historique: Array.isArray(e.historique) ? e.historique.slice() : [],
      dateValidation: e.dateValidation || null,
    };
  }

  function normaliserSettings(raw) {
    var s = raw && typeof raw === "object" ? raw : defaultSettings();
    if (!s.id) s.id = SETTINGS_ID;
    if (!s.profil) s.profil = "eps";
    if (s.classeActiveId === undefined) s.classeActiveId = null;
    delete s.pinHash;
    return s;
  }

  function loadData() {
    if (typeof DataManager === "undefined") {
      return Promise.resolve(defaultData());
    }
    return DataManager.ready
      .then(function () {
        return DataManager.getParametre(DATA_ID);
      })
      .then(function (rec) {
        return normaliserData(rec || defaultData());
      });
  }

  function saveData(data) {
    data.updatedAt = new Date().toISOString();
    if (typeof DataManager === "undefined") {
      return Promise.reject(new Error("DataManager indisponible."));
    }
    return DataManager.ready.then(function () {
      return DataManager.saveParametre(normaliserData(data));
    });
  }

  function loadSettings() {
    if (typeof DataManager === "undefined") {
      return Promise.resolve(defaultSettings());
    }
    return DataManager.ready
      .then(function () {
        return DataManager.getParametre(SETTINGS_ID);
      })
      .then(function (rec) {
        return normaliserSettings(rec || defaultSettings());
      });
  }

  function saveSettings(settings) {
    if (typeof DataManager === "undefined") {
      return Promise.reject(new Error("DataManager indisponible."));
    }
    return DataManager.ready.then(function () {
      return DataManager.saveParametre(normaliserSettings(settings));
    });
  }

  function getClasse(data, classeId) {
    if (!data || !classeId) return null;
    for (var i = 0; i < data.classes.length; i++) {
      if (data.classes[i].id === classeId) return data.classes[i];
    }
    return null;
  }

  function getEleve(data, eleveId) {
    if (!data || !eleveId) return null;
    for (var i = 0; i < data.eleves.length; i++) {
      if (data.eleves[i].id === eleveId) return data.eleves[i];
    }
    return null;
  }

  function elevesDeClasse(data, classeId) {
    return (data.eleves || []).filter(function (e) {
      return e.classeId === classeId;
    });
  }

  function progressionEleve(eleve) {
    if (!eleve || !eleve.etapes) {
      return { valides: 0, total: ETAPES.length, pct: 0, commence: false };
    }
    var valides = 0;
    var commence = false;
    ETAPES.forEach(function (ep) {
      var v = eleve.etapes[ep.id];
      if (v) commence = true;
      if (v === STATUT_COMP.VALIDE) valides++;
    });
    var total = ETAPES.length;
    return {
      valides: valides,
      total: total,
      pct: total ? Math.round((valides / total) * 100) : 0,
      commence: commence,
    };
  }

  function compterParStatut(eleves) {
    var c = { valide: 0, en_cours: 0, non_commence: 0, non_valide: 0 };
    (eleves || []).forEach(function (e) {
      var s = e.statut || STATUT_ELEVE.NON_COMMENCE;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }

  function calculerStatutGlobal(eleve) {
    if (!eleve) return STATUT_ELEVE.NON_COMMENCE;
    var vals = ETAPES.map(function (ep) {
      return eleve.etapes[ep.id];
    }).filter(Boolean);
    if (!vals.length) return STATUT_ELEVE.NON_COMMENCE;
    if (
      vals.every(function (v) {
        return v === STATUT_COMP.VALIDE;
      })
    ) {
      return STATUT_ELEVE.VALIDE;
    }
    if (
      vals.some(function (v) {
        return v === STATUT_COMP.NON_VALIDE;
      })
    ) {
      return STATUT_ELEVE.NON_VALIDE;
    }
    return STATUT_ELEVE.EN_COURS;
  }

  function ajouterHistorique(eleve, entree) {
    if (!eleve.historique) eleve.historique = [];
    eleve.historique.unshift({
      id: genererId("pass"),
      date: entree.date || new Date().toISOString(),
      resultat: entree.resultat || eleve.statut,
      etapes: Object.assign({}, eleve.etapes),
      observations: entree.observations || "",
      enseignant: entree.enseignant || "",
    });
    if (eleve.historique.length > 50) {
      eleve.historique = eleve.historique.slice(0, 50);
    }
  }

  function formatDateFr(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR");
  }

  function formatNaissance(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length === 3) {
      return parts[2] + " / " + parts[1] + " / " + parts[0];
    }
    return iso;
  }

  function parserLigneCsv(ligne) {
    var s = (ligne || "").trim();
    if (!s || s.charAt(0) === "#") return null;
    var sep = s.indexOf(";") >= 0 ? ";" : ",";
    var parts = s.split(sep).map(function (p) {
      return p.replace(/^"|"$/g, "").trim();
    });
    if (parts.length < 2) return null;
    return {
      nom: parts[0] || "",
      prenom: parts[1] || "",
      dateNaissance: parts[2] || "",
      groupe: parts[3] || "",
      niveau: parts[4] || "",
    };
  }

  function exporterCsv(data, classeId) {
    var eleves = classeId ? elevesDeClasse(data, classeId) : data.eleves;
    var lignes = [
      "Nom;Prénom;Date naissance;Groupe;Niveau;Statut;Avancement;Date validation;Commentaires",
    ];
    eleves.forEach(function (e) {
      var prog = progressionEleve(e);
      lignes.push(
        [
          e.nom,
          e.prenom,
          e.dateNaissance,
          e.groupe,
          e.niveau,
          STATUT_LABELS[e.statut] || e.statut,
          prog.valides + "/" + prog.total,
          e.dateValidation ? formatDateFr(e.dateValidation) : "",
          (e.commentaires || "").replace(/;/g, ","),
        ].join(";")
      );
    });
    return "\uFEFF" + lignes.join("\r\n");
  }

  return {
    DATA_ID: DATA_ID,
    SETTINGS_ID: SETTINGS_ID,
    DATA_VERSION: DATA_VERSION,
    OFFICIAL_PAGE_URL: OFFICIAL_PAGE_URL,
    OFFICIAL_ARRATE_URL: OFFICIAL_ARRATE_URL,
    OFFICIAL_VIDEO_URL: OFFICIAL_VIDEO_URL,
    OFFICIAL_TEXT_URL: OFFICIAL_TEXT_URL,
    migrerEtapesV2: migrerEtapesV2,
    STATUT_ELEVE: STATUT_ELEVE,
    STATUT_COMP: STATUT_COMP,
    ETAPES: ETAPES,
    STATUT_LABELS: STATUT_LABELS,
    COMP_LABELS: COMP_LABELS,
    genererId: genererId,
    etapesVides: etapesVides,
    etapesParSection: etapesParSection,
    defaultData: defaultData,
    defaultSettings: defaultSettings,
    loadData: loadData,
    saveData: saveData,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    getClasse: getClasse,
    getEleve: getEleve,
    elevesDeClasse: elevesDeClasse,
    progressionEleve: progressionEleve,
    compterParStatut: compterParStatut,
    calculerStatutGlobal: calculerStatutGlobal,
    ajouterHistorique: ajouterHistorique,
    formatDateFr: formatDateFr,
    formatNaissance: formatNaissance,
    parserLigneCsv: parserLigneCsv,
    exporterCsv: exporterCsv,
    normaliserEleve: normaliserEleve,
  };
})(typeof window !== "undefined" ? window : globalThis);
