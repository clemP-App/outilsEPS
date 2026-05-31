/**
 * Import CSV de classes — parsing, détection délimiteur, mapping colonnes, séparation nom/prénom.
 */
(function (root, factory) {
  "use strict";
  var api = factory(
    typeof EleveDisplay !== "undefined" ? EleveDisplay : null
  );
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ClasseCsvImport = api;
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this,
  function (EleveDisplay) {
    "use strict";

    var CHAMPS = [
      { id: "nom", label: "Nom", requis: true },
      { id: "prenom", label: "Prénom", requis: true },
      { id: "nom_et_prenom", label: "Nom et prénom (colonne unique)", requis: true },
      { id: "dateNaissance", label: "Date de naissance", requis: false },
      { id: "sexe", label: "Sexe (F/M)", requis: false },
      { id: "niveau", label: "Niveau (1–5)", requis: false },
      { id: "commentaire", label: "Commentaire", requis: false },
    ];

    var ALIAS_ENTETE = {
      nom: [/^(nom|name|lastname|last_name|nom_de_famille|nom_famille|nom\s*de\s*famille|nom\s*élève|nom\s*eleve)$/i],
      prenom: [/^(pr[eé]nom|firstname|first_name|givenname|given_name)$/i],
      nom_et_prenom: [
        /nom.*pr[eé]nom|pr[eé]nom.*nom|nom\s*&\s*pr[eé]nom|nom\s+et\s+pr[eé]nom|identit[eé]|[eé]l[eè]ve|nom\s*complet|full\s*name/i,
      ],
      dateNaissance: [/naissance|date.*naiss|ddn|born|birth|date\s*de\s*naissance/i],
      sexe: [/^(sexe|genre|gender|m\/f|civilite|civilit[eé])$/i],
      niveau: [/^(niveau|niv|level|niveau\s*eps)$/i],
      commentaire: [/comment|remarque|note|observation|info/i],
    };

    function normaliserEntete(s) {
      return String(s || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    function parseCsvLigne(ligne, delim) {
      var out = [];
      var cur = "";
      var inQuotes = false;
      var i;
      for (i = 0; i < ligne.length; i++) {
        var ch = ligne[i];
        if (inQuotes) {
          if (ch === '"') {
            if (ligne[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            cur += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === delim) {
          out.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur.trim());
      return out;
    }

    function detecterDelimiteur(lignes) {
      var candidats = [";", ",", "\t"];
      var scores = { ";": 0, ",": 0, "\t": 0 };
      var n = Math.min(lignes.length, 5);
      var i;
      for (i = 0; i < n; i++) {
        var l = lignes[i];
        if (!l.trim()) continue;
        candidats.forEach(function (d) {
          var parsed = parseCsvLigne(l, d);
          if (parsed.length > 1) scores[d] += parsed.length;
        });
      }
      var best = ";";
      var bestScore = -1;
      candidats.forEach(function (d) {
        if (scores[d] > bestScore) {
          bestScore = scores[d];
          best = d;
        }
      });
      return best;
    }

    function parseCsvTexte(texte) {
      var brut = String(texte || "").replace(/^\uFEFF/, "");
      var lignes = brut.split(/\r?\n/).filter(function (l) {
        return l.trim().length > 0;
      });
      if (!lignes.length) {
        return { delimiteur: ";", lignes: [], colonnes: 0, erreur: "Fichier vide." };
      }
      var delimiteur = detecterDelimiteur(lignes);
      var rows = lignes.map(function (l) {
        return parseCsvLigne(l, delimiteur);
      });
      var colonnes = rows.reduce(function (max, r) {
        return Math.max(max, r.length);
      }, 0);
      return { delimiteur: delimiteur, lignes: rows, colonnes: colonnes, erreur: null };
    }

    function ligneRessembleEntete(cells) {
      if (!cells || !cells.length) return false;
      var hits = 0;
      cells.forEach(function (c) {
        var n = normaliserEntete(c);
        if (!n) return;
        Object.keys(ALIAS_ENTETE).forEach(function (champ) {
          ALIAS_ENTETE[champ].forEach(function (re) {
            if (re.test(n) || re.test(c)) hits++;
          });
        });
        if (/^(nom|prenom|pr[eé]nom|sexe|niveau|date|naissance|commentaire|eleve|[eé]l[eè]ve)/i.test(n)) {
          hits++;
        }
      });
      return hits >= 2 || (cells.length >= 2 && hits >= 1);
    }

    function devinerEntete(lignes) {
      if (!lignes.length) return false;
      return ligneRessembleEntete(lignes[0]);
    }

    function devinerMapping(entetes, nbColonnes) {
      var mapping = {};

      if (entetes && entetes.length) {
        entetes.forEach(function (h, idx) {
          var n = normaliserEntete(h);
          if (!n) return;
          Object.keys(ALIAS_ENTETE).forEach(function (champ) {
            if (mapping[champ] !== undefined && mapping[champ] !== "") return;
            ALIAS_ENTETE[champ].forEach(function (re) {
              if (re.test(n) || re.test(h)) {
                mapping[champ] = idx;
              }
            });
          });
        });
      }

      if (mapping.nom_et_prenom !== undefined && mapping.nom_et_prenom !== "") {
        delete mapping.nom;
        delete mapping.prenom;
      } else if (
        (mapping.nom === undefined || mapping.nom === "") &&
        (mapping.prenom === undefined || mapping.prenom === "")
      ) {
        if (nbColonnes >= 2) {
          mapping.nom = 0;
          mapping.prenom = 1;
        }
      }

      return mapping;
    }

    function estMotNomEnMajuscules(mot) {
      var t = String(mot || "").trim();
      if (t.length < 2) return false;
      var lettres = t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
      return lettres.length >= 2 && lettres === lettres.toUpperCase();
    }

    /**
     * Sépare une colonne « Nom Prénom » ou « Prénom Nom ».
     * @param {string} texte
     * @param {"nom_prenom"|"prenom_nom"} [ordre]
     * @returns {{nom:string,prenom:string}}
     */
    function separerNomPrenom(texte, ordre) {
      ordre = ordre || "nom_prenom";
      var s = String(texte || "").trim();
      if (!s) return { nom: "", prenom: "" };

      if (s.indexOf(",") >= 0) {
        var parties = s.split(",").map(function (p) {
          return p.trim();
        }).filter(Boolean);
        if (parties.length >= 2) {
          if (ordre === "prenom_nom") {
            return { prenom: parties[0], nom: parties.slice(1).join(" ") };
          }
          return { nom: parties[0], prenom: parties.slice(1).join(" ") };
        }
      }

      var mots = s.split(/\s+/).filter(Boolean);
      if (mots.length === 1) {
        return ordre === "prenom_nom" ? { prenom: mots[0], nom: "" } : { nom: mots[0], prenom: "" };
      }

      if (mots.length === 2) {
        if (estMotNomEnMajuscules(mots[0]) && !estMotNomEnMajuscules(mots[1])) {
          return { nom: mots[0], prenom: mots[1] };
        }
        if (!estMotNomEnMajuscules(mots[0]) && estMotNomEnMajuscules(mots[1])) {
          return { prenom: mots[0], nom: mots[1] };
        }
        if (ordre === "prenom_nom") return { prenom: mots[0], nom: mots[1] };
        return { nom: mots[0], prenom: mots[1] };
      }

      var idxMaj = -1;
      for (var i = 0; i < mots.length; i++) {
        if (estMotNomEnMajuscules(mots[i])) {
          idxMaj = i;
          break;
        }
      }
      if (idxMaj === 0) {
        return { nom: mots[0], prenom: mots.slice(1).join(" ") };
      }
      if (idxMaj > 0) {
        return { prenom: mots.slice(0, idxMaj).join(" "), nom: mots.slice(idxMaj).join(" ") };
      }
      if (idxMaj === mots.length - 1 && idxMaj > 0) {
        return { prenom: mots.slice(0, -1).join(" "), nom: mots[mots.length - 1] };
      }

      if (ordre === "prenom_nom") {
        return { prenom: mots.slice(0, -1).join(" "), nom: mots[mots.length - 1] };
      }
      return { nom: mots[0], prenom: mots.slice(1).join(" ") };
    }

    function lireCellule(row, idx) {
      if (idx === undefined || idx === null || idx === "" || idx < 0) return "";
      return row[idx] !== undefined ? String(row[idx]).trim() : "";
    }

    function normaliserNiveau(valeur) {
      if (EleveDisplay && EleveDisplay.normaliserNiveauClasse) {
        return EleveDisplay.normaliserNiveauClasse(valeur);
      }
      var s = String(valeur || "").trim();
      if (!s) return "";
      var n = parseInt(s, 10);
      if (isNaN(n) || n < 1 || n > 5) return null;
      return String(n);
    }

    function normaliserDate(valeur) {
      if (EleveDisplay && EleveDisplay.normaliserDateNaissance) {
        return EleveDisplay.normaliserDateNaissance(valeur);
      }
      return String(valeur || "").trim() || "";
    }

    function normaliserSexe(valeur) {
      var s = String(valeur || "").trim().toUpperCase();
      if (!s) return "";
      if (s === "F" || s === "FEMME" || s === "FILLE" || s === "FÉMININ" || s === "FEMININ") return "F";
      if (s === "M" || s === "H" || s === "HOMME" || s === "GARÇON" || s === "GARCON" || s === "MASCULIN") return "M";
      if (/^[MF]$/.test(s.charAt(0))) return s.charAt(0);
      return "";
    }

    /**
     * @param {string[][]} rows — lignes de données (sans en-tête)
     * @param {object} mapping — { nom: 0, prenom: 1, ... } indices de colonnes
     * @param {{ ordreNomPrenom?: string, genererId?: function }} opts
     */
    function lignesVersEleves(rows, mapping, opts) {
      opts = opts || {};
      var ordre = opts.ordreNomPrenom || "nom_prenom";
      var idFn = opts.genererId;
      var eleves = [];
      var invalides = 0;

      rows.forEach(function (row) {
        if (!row || !row.some(function (c) {
          return String(c || "").trim();
        })) {
          return;
        }

        var nom = "";
        var prenom = "";

        if (mapping.nom_et_prenom !== undefined && mapping.nom_et_prenom !== "") {
          var combine = lireCellule(row, mapping.nom_et_prenom);
          var split = separerNomPrenom(combine, ordre);
          nom = split.nom;
          prenom = split.prenom;
        } else {
          nom = lireCellule(row, mapping.nom);
          prenom = lireCellule(row, mapping.prenom);
        }

        if (!nom && !prenom) {
          invalides++;
          return;
        }
        if (!nom || !prenom) {
          invalides++;
          return;
        }

        var dateBrut = lireCellule(row, mapping.dateNaissance);
        var dateNaissance = normaliserDate(dateBrut);
        if (dateBrut && dateNaissance === null) {
          invalides++;
          return;
        }

        var niveauBrut = lireCellule(row, mapping.niveau);
        var niveau = normaliserNiveau(niveauBrut);
        if (niveauBrut && niveau === null) {
          invalides++;
          return;
        }

        eleves.push({
          id: idFn ? idFn("eleve") : "",
          nom: nom,
          prenom: prenom,
          dateNaissance: dateNaissance || "",
          sexe: normaliserSexe(lireCellule(row, mapping.sexe)),
          niveau: niveau || "",
          commentaire: lireCellule(row, mapping.commentaire),
        });
      });

      return { eleves: eleves, invalides: invalides };
    }

    function validerMapping(mapping) {
      var aNomPrenomSep =
        mapping.nom !== undefined &&
        mapping.nom !== "" &&
        mapping.prenom !== undefined &&
        mapping.prenom !== "";
      var aCombine =
        mapping.nom_et_prenom !== undefined && mapping.nom_et_prenom !== "";
      if (aNomPrenomSep || aCombine) return null;
      return "Indiquez au minimum le nom et le prénom (deux colonnes ou une colonne combinée).";
    }

    function libelleColonne(idx, entetes) {
      if (entetes && entetes[idx]) return "Col. " + (idx + 1) + " — " + entetes[idx];
      return "Colonne " + (idx + 1);
    }

    return {
      CHAMPS: CHAMPS,
      parseCsvTexte: parseCsvTexte,
      parseCsvLigne: parseCsvLigne,
      detecterDelimiteur: detecterDelimiteur,
      devinerEntete: devinerEntete,
      devinerMapping: devinerMapping,
      separerNomPrenom: separerNomPrenom,
      lignesVersEleves: lignesVersEleves,
      validerMapping: validerMapping,
      libelleColonne: libelleColonne,
      ligneRessembleEntete: ligneRessembleEntete,
    };
  }
);
