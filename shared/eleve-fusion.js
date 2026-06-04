/**
 * Fusion d’élèves à l’import (réimport CSV ou classe) : ajout + mise à jour des champs non vides.
 */
(function (root) {
  "use strict";

  var CHAMPS_FUSION_ELEVE = [
    "dateNaissance",
    "sexe",
    "niveau",
    "vma",
    "commentaire",
    "equipe",
    "equipeCouleur",
  ];

  /** Champs fusionnables mappés depuis un CSV (hors identité). */
  var CHAMPS_FUSION_IMPORT_CSV = [
    "dateNaissance",
    "sexe",
    "niveau",
    "vma",
    "commentaire",
    "equipe",
  ];

  var LIBELLES_CHAMP = {
    dateNaissance: "Date de naissance",
    sexe: "Sexe",
    niveau: "Niveau",
    vma: "VMA (km/h)",
    commentaire: "Commentaire",
    equipe: "Équipe",
    equipeCouleur: "Couleur d’équipe",
  };

  function normaliserClePart(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function cleEleveIdentite(nom, prenom) {
    return normaliserClePart(nom) + "|" + normaliserClePart(prenom);
  }

  function valeurNonVide(v) {
    return v !== undefined && v !== null && String(v).trim() !== "";
  }

  function normaliserValeurFusion(v) {
    return String(v === null || v === undefined ? "" : v)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function valeursDifferentes(a, b) {
    return normaliserValeurFusion(a) !== normaliserValeurFusion(b);
  }

  function copierChampsNonVides(cible, source, champs) {
    var champsListe = champs || CHAMPS_FUSION_ELEVE;
    champsListe.forEach(function (k) {
      if (valeurNonVide(source[k])) {
        cible[k] = typeof source[k] === "string" ? source[k].trim() : source[k];
      }
    });
  }

  /**
   * Champs CSV mappés (colonne associée dans le fichier).
   * @param {Record<string, number|string>} mapping
   * @returns {string[]}
   */
  function champsImportActifs(mapping) {
    if (!mapping || typeof mapping !== "object") return [];
    return CHAMPS_FUSION_IMPORT_CSV.filter(function (id) {
      var v = mapping[id];
      return v !== undefined && v !== null && v !== "";
    });
  }

  /**
   * Conflits par colonne : élève existant et CSV ont tous deux une valeur différente.
   * @returns {Array<{ champ: string, label: string, count: number, exemples: Array<object> }>}
   */
  function detecterConflitsColonnes(liste, imports, champsActifs) {
    if (!Array.isArray(liste) || !Array.isArray(imports) || !champsActifs || !champsActifs.length) {
      return [];
    }
    var index = {};
    liste.forEach(function (e, i) {
      if (!e) return;
      index[cleEleveIdentite(e.nom, e.prenom)] = i;
    });

    var conflits = [];
    champsActifs.forEach(function (champ) {
      if (champ === "equipeCouleur") return;
      var count = 0;
      var exemples = [];
      imports.forEach(function (n) {
        if (!n || (!n.nom && !n.prenom)) return;
        var idx = index[cleEleveIdentite(n.nom, n.prenom)];
        if (idx === undefined) return;
        var existant = liste[idx];
        var vCsv = n[champ];
        var vEps = existant[champ];
        if (
          valeurNonVide(vCsv) &&
          valeurNonVide(vEps) &&
          valeursDifferentes(vCsv, vEps)
        ) {
          count++;
          if (exemples.length < 3) {
            exemples.push({
              nom: existant.nom,
              prenom: existant.prenom,
              eps: vEps,
              csv: vCsv,
            });
          }
        }
      });
      if (count > 0) {
        conflits.push({
          champ: champ,
          label: LIBELLES_CHAMP[champ] || champ,
          count: count,
          exemples: exemples,
        });
      }
    });
    return conflits;
  }

  function fusionnerChamp(cible, source, champ, priorite) {
    var vCsv = source[champ];
    var vEps = cible[champ];
    var csvNv = valeurNonVide(vCsv);
    var epsNv = valeurNonVide(vEps);
    if (!csvNv) return;
    if (!epsNv) {
      cible[champ] = typeof vCsv === "string" ? vCsv.trim() : vCsv;
      return;
    }
    if (!valeursDifferentes(vCsv, vEps)) return;
    if (priorite === "eps") return;
    if (priorite === "csv") {
      cible[champ] = typeof vCsv === "string" ? vCsv.trim() : vCsv;
    }
  }

  function fusionnerEleveExistant(cible, source, options) {
    var champsActifs = options && options.champsActifs;
    var priorites = (options && options.priorites) || {};

    CHAMPS_FUSION_IMPORT_CSV.forEach(function (k) {
      if (champsActifs && champsActifs.indexOf(k) === -1) return;
      if (priorites[k]) {
        fusionnerChamp(cible, source, k, priorites[k]);
      } else if (valeurNonVide(source[k])) {
        cible[k] = typeof source[k] === "string" ? source[k].trim() : source[k];
      }
    });

    if (!champsActifs || champsActifs.indexOf("equipe") !== -1) {
      if (priorites.equipe === "csv" && valeurNonVide(source.equipeCouleur)) {
        cible.equipeCouleur = String(source.equipeCouleur).trim();
      } else if (!priorites.equipe && valeurNonVide(source.equipeCouleur)) {
        copierChampsNonVides(cible, source, ["equipeCouleur"]);
      }
    }
  }

  /**
   * @param {Array<object>} liste — élèves existants (modifiés sur place)
   * @param {Array<object>} imports — nouveaux élèves CSV / autre
   * @param {{ priorites?: Record<string, 'csv'|'eps'>, champsActifs?: string[] }} [options]
   * @returns {{ ajoutes: number, maj: number }}
   */
  function fusionnerElevesDansListe(liste, imports, options) {
    if (!Array.isArray(liste) || !Array.isArray(imports)) {
      return { ajoutes: 0, maj: 0 };
    }
    var index = {};
    liste.forEach(function (e, i) {
      if (!e) return;
      index[cleEleveIdentite(e.nom, e.prenom)] = i;
    });
    var ajoutes = 0;
    var maj = 0;
    imports.forEach(function (n) {
      if (!n || (!n.nom && !n.prenom)) return;
      var cle = cleEleveIdentite(n.nom, n.prenom);
      if (index[cle] !== undefined) {
        if (
          options &&
          options.priorites &&
          Object.keys(options.priorites).length > 0
        ) {
          fusionnerEleveExistant(liste[index[cle]], n, options);
        } else {
          copierChampsNonVides(liste[index[cle]], n);
        }
        maj++;
      } else {
        liste.push(n);
        index[cle] = liste.length - 1;
        ajoutes++;
      }
    });
    return { ajoutes: ajoutes, maj: maj };
  }

  function fusionnerMetaRow(cible, source) {
    if (!cible.meta) cible.meta = {};
    if (!source || typeof source !== "object") return;
    var champs = [
      "classe",
      "classeId",
      "nom",
      "prenom",
      "dateNaissance",
      "eleveId",
      "equipe",
      "equipeCouleur",
      "niveau",
      "sexe",
      "vma",
    ];
    champs.forEach(function (k) {
      if (valeurNonVide(source[k])) {
        cible.meta[k] = typeof source[k] === "string" ? source[k].trim() : source[k];
      }
    });
    if (source.nom !== undefined || source.prenom !== undefined) {
      if (typeof cible.label === "string" && cible.meta.nom && cible.meta.prenom) {
        /* label recalculé par l’appelant si besoin */
      }
    }
  }

  var api = {
    CHAMPS_FUSION_ELEVE: CHAMPS_FUSION_ELEVE,
    CHAMPS_FUSION_IMPORT_CSV: CHAMPS_FUSION_IMPORT_CSV,
    LIBELLES_CHAMP: LIBELLES_CHAMP,
    cleEleveIdentite: cleEleveIdentite,
    copierChampsNonVides: copierChampsNonVides,
    champsImportActifs: champsImportActifs,
    detecterConflitsColonnes: detecterConflitsColonnes,
    valeursDifferentes: valeursDifferentes,
    fusionnerElevesDansListe: fusionnerElevesDansListe,
    fusionnerMetaRow: fusionnerMetaRow,
    valeurNonVide: valeurNonVide,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.EleveFusion = api;
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
