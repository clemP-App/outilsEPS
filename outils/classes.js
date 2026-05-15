/**
 * Classes et groupes — listes d'élèves réutilisables (DataManager / IndexedDB).
 */
(function () {
  "use strict";

  var selectedId = null;
  var editingEleveId = null;

  var msgEl = document.getElementById("classes-msg");
  var okEl = document.getElementById("classes-ok");
  var listEl = document.getElementById("classes-list");
  var listEmptyEl = document.getElementById("classes-list-empty");
  var detailEl = document.getElementById("classes-detail");
  var hintEl = document.getElementById("classes-select-hint");
  var nomEditEl = document.getElementById("classe-nom-edit");
  var rechercheEl = document.getElementById("recherche-eleve");
  var elevesListEl = document.getElementById("eleves-list");
  var elevesEmptyEl = document.getElementById("eleves-list-empty");
  var dialogEleve = document.getElementById("dialog-eleve");
  var dialogImport = document.getElementById("dialog-import");
  var formEleve = document.getElementById("form-eleve");
  var importTexteEl = document.getElementById("import-texte");

  function onError(e) {
    montrerErreur(e && e.message ? e.message : "Erreur lors de l'enregistrement.");
  }

  function run(promise) {
    promise.catch(onError);
  }

  function montrerErreur(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
    if (t && okEl) okEl.hidden = true;
  }

  function montrerOk(t) {
    if (!okEl) return;
    okEl.hidden = !t;
    okEl.textContent = t || "";
    if (t) {
      montrerErreur("");
      setTimeout(function () {
        okEl.hidden = true;
      }, 2800);
    }
  }

  function getClasseCourante() {
    if (!selectedId) return Promise.resolve(null);
    return DataManager.getClasseById(selectedId);
  }

  function sauverClasseCourante(classe) {
    return DataManager.updateClasse(classe.id, { nom: classe.nom, eleves: classe.eleves });
  }

  function renderListeClasses() {
    if (!listEl) return Promise.resolve();
    return DataManager.getClasses().then(function (classes) {
      listEl.innerHTML = "";
      if (!classes.length) {
        if (listEmptyEl) listEmptyEl.hidden = false;
        selectedId = null;
        if (detailEl) detailEl.hidden = true;
        if (hintEl) hintEl.hidden = false;
        return;
      }
      if (listEmptyEl) listEmptyEl.hidden = true;
      var found = classes.some(function (c) {
        return c.id === selectedId;
      });
      if (!selectedId || !found) selectedId = classes[0].id;
      classes.forEach(function (c) {
        var li = document.createElement("li");
        li.className = "classes-list__item" + (c.id === selectedId ? " classes-list__item--active" : "");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "classes-list__btn";
        btn.textContent = c.nom + " (" + libelleNbEleves(c.eleves ? c.eleves.length : 0) + ")";
        btn.addEventListener("click", function () {
          selectedId = c.id;
          run(renderListeClasses());
        });
        li.appendChild(btn);
        listEl.appendChild(li);
      });
      return renderDetail();
    });
  }

  function normaliserNiveau(valeur) {
    var s = (valeur === null || valeur === undefined ? "" : String(valeur)).trim();
    if (!s) return "";
    var n = parseInt(s, 10);
    if (isNaN(n) || n < 1 || n > 5) return null;
    return String(n);
  }

  function libelleNbEleves(n) {
    var nb = n || 0;
    return nb <= 1 ? nb + " élève" : nb + " élèves";
  }

  function normaliseRecherche(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function eleveCorrespondRecherche(e, q) {
    if (!q) return true;
    var hay = normaliseRecherche([e.nom, e.prenom, e.commentaire, e.niveau, e.sexe].join(" "));
    return hay.indexOf(q) !== -1;
  }

  function renderEleves(classe) {
    if (!elevesListEl) return;
    elevesListEl.innerHTML = "";
    if (!classe) return;
    var q = normaliseRecherche(rechercheEl ? rechercheEl.value : "").trim();
    var filtres = classe.eleves.filter(function (e) {
      return eleveCorrespondRecherche(e, q);
    });
    if (!filtres.length) {
      elevesEmptyEl.hidden = false;
      elevesEmptyEl.textContent = q
        ? "Aucun élève ne correspond à la recherche."
        : "Aucun élève dans cette classe.";
      return;
    }
    elevesEmptyEl.hidden = true;
    filtres.forEach(function (e) {
      var li = document.createElement("li");
      li.className = "classes-eleve-item";
      var main = document.createElement("div");
      main.className = "classes-eleve-item__main";
      var nom = document.createElement("span");
      nom.className = "classes-eleve-item__nom";
      nom.textContent = [e.prenom, e.nom].filter(Boolean).join(" ") || "Sans nom";
      var meta = document.createElement("span");
      meta.className = "classes-eleve-item__meta";
      var parts = [];
      if (e.sexe) parts.push(e.sexe);
      var nv = normaliserNiveau(e.niveau);
      if (nv) parts.push("niv. " + nv);
      if (e.commentaire) parts.push(e.commentaire);
      meta.textContent = parts.join(" · ");
      main.appendChild(nom);
      if (parts.length) main.appendChild(meta);
      var actions = document.createElement("div");
      actions.className = "classes-eleve-item__actions";
      var bEdit = document.createElement("button");
      bEdit.type = "button";
      bEdit.className = "btn btn--ghost btn--small btn--icon-only";
      bEdit.setAttribute("aria-label", "Modifier");
      bEdit.textContent = "✎";
      bEdit.addEventListener("click", function () {
        run(ouvrirDialogEleve(e.id));
      });
      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--small btn--icon-only";
      bDel.setAttribute("aria-label", "Supprimer");
      bDel.textContent = "×";
      bDel.addEventListener("click", function () {
        if (!confirm("Supprimer cet élève de la classe ?")) return;
        classe.eleves = classe.eleves.filter(function (x) {
          return x.id !== e.id;
        });
        run(
          sauverClasseCourante(classe).then(function () {
            montrerOk("Élève supprimé.");
            return renderListeClasses();
          })
        );
      });
      actions.appendChild(bEdit);
      actions.appendChild(bDel);
      li.appendChild(main);
      li.appendChild(actions);
      elevesListEl.appendChild(li);
    });
  }

  function renderDetail() {
    return getClasseCourante().then(function (classe) {
      if (!classe) {
        if (detailEl) detailEl.hidden = true;
        if (hintEl) hintEl.hidden = false;
        return;
      }
      if (detailEl) detailEl.hidden = false;
      if (hintEl) hintEl.hidden = true;
      if (nomEditEl) nomEditEl.value = classe.nom;
      renderEleves(classe);
    });
  }

  function nouvelleClasse() {
    var nom = prompt("Nom de la classe ou du groupe :", "6eA");
    if (nom === null) return;
    nom = (nom || "").trim();
    if (!nom) {
      montrerErreur("Indiquez un nom.");
      return;
    }
    run(
      DataManager.addClasse({ nom: nom, eleves: [] }).then(function (id) {
        selectedId = id;
        montrerOk("Classe créée.");
        return renderListeClasses();
      })
    );
  }

  function supprimerClasse() {
    run(
      getClasseCourante().then(function (classe) {
        if (!classe) return;
        if (!confirm('Supprimer la classe « ' + classe.nom + ' » et tous ses élèves ?')) return;
        return DataManager.deleteClasse(classe.id).then(function () {
          selectedId = null;
          montrerOk("Classe supprimée.");
          return renderListeClasses();
        });
      })
    );
  }

  function sauverNomClasse() {
    run(
      getClasseCourante().then(function (classe) {
        if (!classe || !nomEditEl) return;
        var nom = nomEditEl.value.trim();
        if (!nom) {
          nomEditEl.value = classe.nom;
          return;
        }
        if (nom === classe.nom) return;
        classe.nom = nom;
        return sauverClasseCourante(classe).then(function () {
          return renderListeClasses();
        });
      })
    );
  }

  function ouvrirDialogEleve(eleveId) {
    editingEleveId = eleveId || null;
    var titre = document.getElementById("dialog-eleve-title");
    if (titre) titre.textContent = editingEleveId ? "Modifier l'élève" : "Ajouter un élève";
    document.getElementById("eleve-nom").value = "";
    document.getElementById("eleve-prenom").value = "";
    document.getElementById("eleve-sexe").value = "";
    document.getElementById("eleve-niveau").value = "";
    document.getElementById("eleve-commentaire").value = "";
    var fill = getClasseCourante().then(function (classe) {
      if (!editingEleveId || !classe) return;
      var e = null;
      var j;
      for (j = 0; j < classe.eleves.length; j++) {
        if (classe.eleves[j].id === editingEleveId) {
          e = classe.eleves[j];
          break;
        }
      }
      if (e) {
        document.getElementById("eleve-nom").value = e.nom || "";
        document.getElementById("eleve-prenom").value = e.prenom || "";
        document.getElementById("eleve-sexe").value = e.sexe || "";
        document.getElementById("eleve-niveau").value = e.niveau || "";
        document.getElementById("eleve-commentaire").value = e.commentaire || "";
      }
    });
    return fill.then(function () {
      if (dialogEleve && dialogEleve.showModal) dialogEleve.showModal();
    });
  }

  function enregistrerEleve(e) {
    e.preventDefault();
    run(
      getClasseCourante().then(function (classe) {
        if (!classe) return;
        var nom = document.getElementById("eleve-nom").value.trim();
        var prenom = document.getElementById("eleve-prenom").value.trim();
        if (!nom || !prenom) {
          montrerErreur("Nom et prénom sont obligatoires.");
          return;
        }
        var niveauBrut = document.getElementById("eleve-niveau").value;
        var niveau = normaliserNiveau(niveauBrut);
        if (niveauBrut !== "" && niveau === null) {
          montrerErreur("Le niveau doit être un nombre entre 1 et 5 (ou laissé vide).");
          return;
        }
        var eleve = {
          id: editingEleveId || DataManager.genererId("eleve"),
          nom: nom,
          prenom: prenom,
          sexe: document.getElementById("eleve-sexe").value || "",
          niveau: niveau,
          commentaire: document.getElementById("eleve-commentaire").value.trim() || "",
        };
        if (editingEleveId) {
          classe.eleves = classe.eleves.map(function (x) {
            return x.id === editingEleveId ? eleve : x;
          });
          montrerOk("Élève modifié.");
        } else {
          classe.eleves.push(eleve);
          montrerOk("Élève ajouté.");
        }
        return sauverClasseCourante(classe).then(function () {
          if (dialogEleve) dialogEleve.close();
          montrerErreur("");
          return renderListeClasses();
        });
      })
    );
  }

  function parserLigneImport(ligne) {
    var s = (ligne || "").trim();
    if (!s) return null;
    var sep = s.indexOf(";") >= 0 ? ";" : ",";
    var parts = s.split(sep).map(function (p) {
      return p.trim();
    });
    if (parts.length < 2) return null;
    var niveau = parts.length > 3 ? normaliserNiveau(parts[3]) : "";
    if (parts.length > 3 && parts[3] !== "" && niveau === null) return null;
    return {
      id: DataManager.genererId("eleve"),
      nom: parts[0] || "",
      prenom: parts[1] || "",
      sexe: parts[2] || "",
      niveau: niveau,
      commentaire: parts[4] || "",
    };
  }

  function importerListe(e) {
    e.preventDefault();
    run(
      getClasseCourante().then(function (classe) {
        if (!classe || !importTexteEl) return;
        var lignes = importTexteEl.value.split(/\r?\n/);
        var ajoutes = 0;
        var i;
        for (i = 0; i < lignes.length; i++) {
          if (/^nom\s*[;,]/i.test(lignes[i].trim())) continue;
          var el = parserLigneImport(lignes[i]);
          if (el && el.nom && el.prenom) {
            classe.eleves.push(el);
            ajoutes++;
          }
        }
        if (!ajoutes) {
          montrerErreur("Aucune ligne valide (nom;prénom minimum).");
          return;
        }
        return sauverClasseCourante(classe).then(function () {
          if (dialogImport) dialogImport.close();
          importTexteEl.value = "";
          montrerOk(ajoutes + " élève(s) importé(s).");
          montrerErreur("");
          return renderListeClasses();
        });
      })
    );
  }

  function exporterCsv() {
    run(
      getClasseCourante().then(function (classe) {
        if (!classe) return;
        var lines = ["nom;prenom;sexe;niveau;commentaire"];
        classe.eleves.forEach(function (e) {
          lines.push(
            [e.nom, e.prenom, e.sexe, e.niveau, e.commentaire]
              .map(function (c) {
                var s = String(c || "");
                return /[;\r\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
              })
              .join(";")
          );
        });
        var bom = "\uFEFF";
        var blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "classe-" + classe.nom.replace(/[^\w\-]+/g, "_") + ".csv";
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
        }, 0);
        montrerOk("Export CSV téléchargé.");
      })
    );
  }

  if (document.getElementById("btn-nouvelle-classe")) {
    document.getElementById("btn-nouvelle-classe").addEventListener("click", nouvelleClasse);
  }
  if (document.getElementById("btn-supprimer-classe")) {
    document.getElementById("btn-supprimer-classe").addEventListener("click", supprimerClasse);
  }
  if (nomEditEl) {
    nomEditEl.addEventListener("change", sauverNomClasse);
    nomEditEl.addEventListener("blur", sauverNomClasse);
  }
  if (rechercheEl) {
    rechercheEl.addEventListener("input", function () {
      run(renderDetail());
    });
  }
  if (document.getElementById("btn-ajouter-eleve")) {
    document.getElementById("btn-ajouter-eleve").addEventListener("click", function () {
      run(ouvrirDialogEleve(null));
    });
  }
  if (document.getElementById("btn-importer-liste")) {
    document.getElementById("btn-importer-liste").addEventListener("click", function () {
      if (importTexteEl) importTexteEl.value = "";
      if (dialogImport && dialogImport.showModal) dialogImport.showModal();
    });
  }
  if (document.getElementById("btn-exporter-csv")) {
    document.getElementById("btn-exporter-csv").addEventListener("click", exporterCsv);
  }
  if (formEleve) formEleve.addEventListener("submit", enregistrerEleve);
  if (document.getElementById("btn-annuler-eleve")) {
    document.getElementById("btn-annuler-eleve").addEventListener("click", function () {
      if (dialogEleve) dialogEleve.close();
    });
  }
  if (document.getElementById("form-import")) {
    document.getElementById("form-import").addEventListener("submit", importerListe);
  }
  if (document.getElementById("btn-annuler-import")) {
    document.getElementById("btn-annuler-import").addEventListener("click", function () {
      if (dialogImport) dialogImport.close();
    });
  }

  run(DataManager.ready.then(renderListeClasses));
})();
