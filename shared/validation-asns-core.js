/**
 * Validation ASNS — modèle de données, persistance IndexedDB (parametres).
 */
var ValidationAsnsCore = (function () {
  "use strict";

  var DATA_ID = "validation-asns-data";
  var SETTINGS_ID = "validation-asns-settings";
  var DATA_VERSION = 2;
  var OFFICIAL_TEXT_URL =
    "https://www.education.gouv.fr/bo/15/Hebdo30/MENE1514345A.htm";

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

  /** Étapes validables par élève (parcours officiel + connaissances). */
  var ETAPES = [
    {
      id: "p1",
      section: "parcours",
      label: "Entrer dans l'eau en chute arrière (depuis le bord de la piscine)",
    },
    {
      id: "p2",
      section: "parcours",
      label: "Se déplacer sur 3,5 m en direction d'un obstacle",
    },
    {
      id: "p3",
      section: "parcours",
      label: "Franchir l'obstacle en immersion complète sur 1,5 m",
    },
    {
      id: "p4",
      section: "parcours",
      label: "Se déplacer sur le ventre sur 15 m",
    },
    {
      id: "p5",
      section: "parcours",
      label:
        "Sur 15 m ventral : au signal, surplace vertical 15 s puis terminer les 15 m",
    },
    {
      id: "p6",
      section: "parcours",
      label: "Demi-tour sans appui, passage ventral → dorsal",
    },
    {
      id: "p7",
      section: "parcours",
      label: "Se déplacer sur le dos sur 15 m",
    },
    {
      id: "p8",
      section: "parcours",
      label:
        "Sur 15 m dorsal : au signal, surplace dorsale 15 s puis terminer les 15 m",
    },
    {
      id: "p9",
      section: "parcours",
      label: "Retour sur le ventre et franchir l'obstacle en immersion complète",
    },
    {
      id: "p10",
      section: "parcours",
      label: "Se déplacer sur le ventre pour revenir au point de départ",
    },
    {
      id: "k1",
      section: "connaissances",
      label:
        "Identifier la personne responsable de la surveillance à alerter en cas de problème",
    },
    {
      id: "k2",
      section: "connaissances",
      label:
        "Connaître les règles d'hygiène et de sécurité (établissement de bains ou espace surveillé)",
    },
    {
      id: "k3",
      section: "connaissances",
      label:
        "Identifier les environnements et circonstances adaptés à la maîtrise du savoir-nager",
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
    d.version = DATA_VERSION;
    if (!Array.isArray(d.classes)) d.classes = [];
    if (!Array.isArray(d.eleves)) d.eleves = [];
    d.eleves = d.eleves.map(normaliserEleve);
    return d;
  }

  function normaliserEleve(e) {
    if (!e || typeof e !== "object") return null;
    var legacy = e.etapes || e.competences || {};
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
    OFFICIAL_TEXT_URL: OFFICIAL_TEXT_URL,
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
