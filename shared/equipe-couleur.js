/**
 * Couleur d’équipe déduite du libellé (ex. « Rouge », « Bleus ») pour pastilles dans Classes.
 */
(function (root) {
  "use strict";

  var COULEURS_NOM = {
    rouge: "#ef4444",
    rouges: "#ef4444",
    bleu: "#2563eb",
    bleus: "#2563eb",
    bleue: "#2563eb",
    bleues: "#2563eb",
    vert: "#16a34a",
    verts: "#16a34a",
    verte: "#16a34a",
    vertes: "#16a34a",
    jaune: "#ca8a04",
    jaunes: "#ca8a04",
    orange: "#ea580c",
    oranges: "#ea580c",
    violet: "#9333ea",
    violets: "#9333ea",
    violette: "#9333ea",
    violettes: "#9333ea",
    rose: "#db2777",
    roses: "#db2777",
    noir: "#1e293b",
    noirs: "#1e293b",
    noire: "#1e293b",
    noires: "#1e293b",
    blanc: "#e2e8f0",
    blancs: "#e2e8f0",
    blanche: "#e2e8f0",
    blanches: "#e2e8f0",
    gris: "#64748b",
    grise: "#64748b",
    grises: "#64748b",
    grisbleu: "#64748b",
    marron: "#92400e",
    marrons: "#92400e",
    brun: "#92400e",
    brune: "#92400e",
    bruns: "#92400e",
    cyan: "#0891b2",
    turquoise: "#0d9488",
    indigo: "#4f46e5",
    magenta: "#c026d3",
    kaki: "#84cc16",
    beige: "#d6d3a8",
    bordeaux: "#991b1b",
    marine: "#1e3a8a",
    corail: "#f97316",
    dore: "#d97706",
    doree: "#d97706",
    or: "#ca8a04",
    argent: "#94a3b8",
    argentee: "#94a3b8",
    pourpre: "#7c3aed",
    lilas: "#a78bfa",
    saumon: "#fb7185",
  };

  function normaliserLibelle(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['']/g, "")
      .replace(/\s+/g, " ");
  }

  function estCouleurHex(v) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(v || "").trim());
  }

  /**
   * @param {string} nom — libellé équipe saisi à la main
   * @returns {string} hex ou ""
   */
  function couleurDepuisLibelleEquipe(nom) {
    var brut = String(nom || "").trim();
    if (!brut) return "";
    if (estCouleurHex(brut)) return brut.toLowerCase();

    var s = normaliserLibelle(brut);
    if (!s) return "";

    if (COULEURS_NOM[s]) return COULEURS_NOM[s];

    var mots = s.split(/\s+/).filter(Boolean);
    var i;
    for (i = 0; i < mots.length; i++) {
      if (COULEURS_NOM[mots[i]]) return COULEURS_NOM[mots[i]];
    }

    for (i = 0; i < mots.length; i++) {
      var joint = mots[i];
      if (i + 1 < mots.length) {
        var deux = mots[i] + mots[i + 1];
        if (COULEURS_NOM[deux]) return COULEURS_NOM[deux];
      }
      if (COULEURS_NOM[joint]) return COULEURS_NOM[joint];
    }

    return "";
  }

  /**
   * Met à jour eleve.equipeCouleur si le nom d’équipe évoque une couleur.
   * @param {{ equipe?: string, equipeCouleur?: string }} eleve
   */
  function syncEleveEquipeCouleur(eleve) {
    if (!eleve) return;
    var derived = couleurDepuisLibelleEquipe(eleve.equipe);
    if (derived) {
      eleve.equipeCouleur = derived;
      return;
    }
    if (!String(eleve.equipe || "").trim()) {
      eleve.equipeCouleur = "";
    }
  }

  /**
   * Couleur à afficher (enregistrée ou déduite du libellé).
   * @param {{ equipe?: string, equipeCouleur?: string }} eleve
   * @returns {string}
   */
  function couleurAffichageEquipe(eleve) {
    if (!eleve) return "";
    var derived = couleurDepuisLibelleEquipe(eleve.equipe);
    if (derived) return derived;
    var c = String(eleve.equipeCouleur || "").trim();
    if (estCouleurHex(c)) return c;
    return "";
  }

  root.EquipeCouleur = {
    couleurDepuisLibelleEquipe: couleurDepuisLibelleEquipe,
    syncEleveEquipeCouleur: syncEleveEquipeCouleur,
    couleurAffichageEquipe: couleurAffichageEquipe,
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
