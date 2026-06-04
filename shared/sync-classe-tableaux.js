/**
 * Propagation des élèves d’une classe vers les feuilles Appel et notes liées.
 */
(function (root) {
  "use strict";

  function normaliserNom(s) {
    return String(s || "").trim().replace(/\s+/g, " ");
  }

  function labelDepuisEleve(e) {
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      return normaliserNom(EleveDisplay.formatEleveListe(e, ""));
    }
    return normaliserNom([e.nom, e.prenom].filter(Boolean).join(" "));
  }

  function metaDepuisEleve(e, classeNom, classeId) {
    return {
      classe: classeNom || "",
      classeId: classeId || "",
      nom: (e.nom || "").trim(),
      prenom: (e.prenom || "").trim(),
      dateNaissance: (e.dateNaissance || "").trim(),
      eleveId: e.id || "",
      equipe: (e.equipe || "").trim(),
      equipeCouleur: (e.equipeCouleur || "").trim(),
      niveau: e.niveau !== undefined && e.niveau !== null ? String(e.niveau).trim() : "",
      sexe: (e.sexe || "").trim(),
      vma: (e.vma || "").trim(),
    };
  }

  function genererRowId() {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId("row");
    }
    return "row_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function feuilleLieeAuClasse(tab, classeId) {
    if (!tab || !classeId) return false;
    if (tab.classeId === classeId) return true;
    if (!Array.isArray(tab.rows)) return false;
    return tab.rows.some(function (r) {
      return r.meta && r.meta.classeId === classeId;
    });
  }

  function trouverRowParEleveId(tab, eleveId) {
    if (!eleveId || !tab.rows) return null;
    for (var i = 0; i < tab.rows.length; i++) {
      if (tab.rows[i].meta && tab.rows[i].meta.eleveId === eleveId) {
        return tab.rows[i];
      }
    }
    return null;
  }

  function fusionnerMetaRow(row, meta) {
    if (typeof EleveFusion !== "undefined" && EleveFusion.fusionnerMetaRow) {
      EleveFusion.fusionnerMetaRow(row, meta);
      return;
    }
    if (!row.meta) row.meta = {};
    Object.keys(meta).forEach(function (k) {
      var v = meta[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        row.meta[k] = typeof v === "string" ? v.trim() : v;
      }
    });
  }

  function labelEleveRow(row) {
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe && row.meta) {
      return EleveDisplay.formatEleveListe(
        { nom: row.meta.nom, prenom: row.meta.prenom },
        row.label || "Sans nom"
      );
    }
    return row.label || "Sans nom";
  }

  /**
   * Ajoute les élèves manquants et met à jour les fiches déjà liées sur les tableaux concernés.
   * @param {string} classeId
   * @returns {Promise<{ ajoutes: number, maj: number, feuilles: number }|void>}
   */
  function apresMiseAJourClasse(classeId) {
    if (typeof DataManager === "undefined" || !classeId) {
      return Promise.resolve({ ajoutes: 0, maj: 0, feuilles: 0 });
    }
    return DataManager.getClasseById(classeId)
      .then(function (classe) {
        if (!classe || !Array.isArray(classe.eleves)) {
          return { ajoutes: 0, maj: 0, feuilles: 0 };
        }
        return DataManager.getTableauxSuivi().then(function (tableaux) {
          if (!Array.isArray(tableaux)) {
            return { ajoutes: 0, maj: 0, feuilles: 0 };
          }
          var totalAjoutes = 0;
          var totalMaj = 0;
          var feuillesTouchees = 0;
          var dirty = false;
          var nomClasse = classe.nom || "";

          tableaux.forEach(function (tab) {
            if (!feuilleLieeAuClasse(tab, classeId)) return;
            if (!tab.classeId) tab.classeId = classeId;
            var ajoutesFeuille = 0;
            var majFeuille = 0;

            classe.eleves.forEach(function (e) {
              if (!e || !e.id) return;
              var meta = metaDepuisEleve(e, nomClasse, classeId);
              var row = trouverRowParEleveId(tab, e.id);
              if (row) {
                fusionnerMetaRow(row, meta);
                row.label = labelEleveRow(row);
                majFeuille++;
                return;
              }
              var label = labelDepuisEleve(e);
              if (!label) return;
              if (!Array.isArray(tab.rows)) tab.rows = [];
              tab.rows.push({
                id: genererRowId(),
                label: label,
                meta: meta,
              });
              ajoutesFeuille++;
            });

            if (ajoutesFeuille || majFeuille) {
              feuillesTouchees++;
              totalAjoutes += ajoutesFeuille;
              totalMaj += majFeuille;
              dirty = true;
            }
          });

          if (!dirty || !DataManager.saveTableauxSuivi) {
            return { ajoutes: totalAjoutes, maj: totalMaj, feuilles: feuillesTouchees };
          }
          return DataManager.saveTableauxSuivi(tableaux).then(function () {
            return { ajoutes: totalAjoutes, maj: totalMaj, feuilles: feuillesTouchees };
          });
        });
      })
      .catch(function () {
        return { ajoutes: 0, maj: 0, feuilles: 0 };
      });
  }

  root.SyncClasseTableaux = {
    apresMiseAJourClasse: apresMiseAJourClasse,
    feuilleLieeAuClasse: feuilleLieeAuClasse,
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
