/**
 * Import d’élèves : détection des doublons et messages utilisateur.
 */
(function (root) {
  "use strict";

  function labelEleveImport(e) {
    if (!e) return "";
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      return String(EleveDisplay.formatEleveListe(e, "")).trim().replace(/\s+/g, " ");
    }
    return [e.nom, e.prenom].filter(Boolean).join(" ").trim().replace(/\s+/g, " ");
  }

  /**
   * Vérifie si un élève est déjà dans une liste (par id fiche ou nom affiché).
   * @param {Array} liste — chaînes ou objets { name|nom, eleveId? }
   * @param {object} e — fiche élève
   * @param {{ champNom?: string }} [opts]
   */
  function eleveEstDansListe(liste, e, opts) {
    if (!e || !Array.isArray(liste)) return false;
    opts = opts || {};
    var champ = opts.champNom || "name";
    var cle = labelEleveImport(e).toLowerCase();
    var id = e.id || "";
    var i;
    for (i = 0; i < liste.length; i++) {
      var it = liste[i];
      if (typeof it === "string") {
        if (it.trim().replace(/\s+/g, " ").toLowerCase() === cle) return true;
        continue;
      }
      if (!it || typeof it !== "object") continue;
      if (id && it.eleveId && it.eleveId === id) return true;
      var n = String(it[champ] || it.name || it.nom || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
      if (n && cle && n === cle) return true;
    }
    return false;
  }

  function filtrerElevesImport(eleves, estDejaPresent) {
    var aImporter = [];
    var ignores = 0;
    if (!Array.isArray(eleves)) {
      return { aImporter: aImporter, ignores: ignores };
    }
    var deja = typeof estDejaPresent === "function" ? estDejaPresent : function () {
      return false;
    };
    eleves.forEach(function (e) {
      if (!e) return;
      if (deja(e)) {
        ignores++;
      } else {
        aImporter.push(e);
      }
    });
    return { aImporter: aImporter, ignores: ignores };
  }

  /**
   * @param {{ ajoutes?: number, maj?: number, ignores?: number, contexte?: string }} stats
   * @returns {string}
   */
  function messageImportEleves(stats) {
    stats = stats || {};
    var parts = [];
    var a = stats.ajoutes || 0;
    var m = stats.maj || 0;
    var i = stats.ignores || 0;
    if (a) parts.push(a + " ajouté" + (a > 1 ? "s" : ""));
    if (m) parts.push(m + " mis à jour");
    if (i) {
      parts.push(
        i +
          " déjà présent" +
          (i > 1 ? "s" : "") +
          " (non importé" +
          (i > 1 ? "s" : "") +
          ")"
      );
    }
    if (!parts.length) return "Aucun changement.";
    var msg = parts.join(" · ");
    if (stats.contexte) msg += " — " + stats.contexte;
    return msg;
  }

  root.ImportElevePresence = {
    labelEleveImport: labelEleveImport,
    eleveEstDansListe: eleveEstDansListe,
    filtrerElevesImport: filtrerElevesImport,
    messageImportEleves: messageImportEleves,
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
