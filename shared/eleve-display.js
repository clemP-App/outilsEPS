/**
 * Affichage et champs optionnels communs aux élèves (nom, prénom, date de naissance…).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.EleveDisplay = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  "use strict";

  /**
   * @param {{nom?:string,prenom?:string}|null} eleve
   * @param {string} [fallback]
   */
  function formatEleveListe(eleve, fallback) {
    fallback = fallback === undefined ? "Sans nom" : fallback;
    if (!eleve) return fallback;
    var parts = [eleve.nom, eleve.prenom]
      .map(function (s) {
        return String(s || "").trim();
      })
      .filter(Boolean);
    return parts.join(" ") || fallback;
  }

  function estDateNaissance(s) {
    var t = String(s || "").trim();
    if (!t) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return true;
    return /^\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}$/.test(t);
  }

  function versIsoDate(s) {
    var t = String(s || "").trim();
    if (!t) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    var m = t.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
    if (!m) return "";
    var y = m[3].length === 2 ? parseInt(m[3], 10) : parseInt(m[3], 10);
    if (m[3].length === 2) y = y < 30 ? 2000 + y : 1900 + y;
    var mo = String(parseInt(m[2], 10)).padStart(2, "0");
    var da = String(parseInt(m[1], 10)).padStart(2, "0");
    return y + "-" + mo + "-" + da;
  }

  /**
   * Normalise une date de naissance (optionnelle). Retourne ISO AAAA-MM-JJ ou "".
   * @returns {string|null} null si valeur non vide mais invalide
   */
  function normaliserDateNaissance(valeur) {
    var t = String(valeur === null || valeur === undefined ? "" : valeur).trim();
    if (!t) return "";
    if (estDateNaissance(t)) return versIsoDate(t);
    return null;
  }

  function formatDateNaissanceFR(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    }
    return iso;
  }

  function normaliserNiveauClasse(valeur) {
    var s = (valeur === null || valeur === undefined ? "" : String(valeur)).trim();
    if (!s) return "";
    var n = parseInt(s, 10);
    if (isNaN(n) || n < 1 || n > 5) return null;
    return String(n);
  }

  /**
   * Lignes d’info secondaires pour listes (sexe, niveau, date de naissance, commentaire).
   * @param {object} eleve
   * @returns {string[]}
   */
  function metaEleveParts(eleve) {
    if (!eleve) return [];
    var parts = [];
    var dn = formatDateNaissanceFR(eleve.dateNaissance);
    if (dn) parts.push("né(e) le " + dn);
    if (eleve.sexe) parts.push(eleve.sexe);
    var nv = normaliserNiveauClasse(eleve.niveau);
    if (nv) parts.push("niv. " + nv);
    if (eleve.commentaire) parts.push(eleve.commentaire);
    return parts;
  }

  /**
   * Parse une ligne CSV « classe » : nom;prénom[;date de naissance][;sexe][;niveau][;commentaire]
   * @param {string} ligne
   * @param {{ genererId?: function }} [opts]
   * @returns {object|null}
   */
  function parserLigneImportClasse(ligne, opts) {
    opts = opts || {};
    var s = (ligne || "").trim();
    if (!s) return null;
    var sep = s.indexOf(";") >= 0 ? ";" : ",";
    var parts = s.split(sep).map(function (p) {
      return p.replace(/^"|"$/g, "").trim();
    });
    if (parts.length < 2) return null;

    var nom = parts[0] || "";
    var prenom = parts[1] || "";
    var i = 2;
    var dateNaissance = "";

    if (parts.length > i && estDateNaissance(parts[i])) {
      dateNaissance = versIsoDate(parts[i]);
      i++;
    }

    var sexe = "";
    if (parts.length > i && /^[MF]$/i.test(parts[i])) {
      sexe = parts[i].toUpperCase();
      i++;
    }

    var niveau = "";
    if (parts.length > i) {
      niveau = normaliserNiveauClasse(parts[i]);
      if (parts[i] !== "" && niveau === null) return null;
      i++;
    }

    var commentaire = parts.length > i ? parts.slice(i).join("; ").trim() : "";

    var idFn = opts.genererId;
    return {
      id: idFn ? idFn("eleve") : "",
      nom: nom,
      prenom: prenom,
      dateNaissance: dateNaissance,
      sexe: sexe,
      niveau: niveau || "",
      commentaire: commentaire,
    };
  }

  return {
    formatEleveListe: formatEleveListe,
    normaliserDateNaissance: normaliserDateNaissance,
    formatDateNaissanceFR: formatDateNaissanceFR,
    metaEleveParts: metaEleveParts,
    parserLigneImportClasse: parserLigneImportClasse,
    estDateNaissance: estDateNaissance,
  };
});
