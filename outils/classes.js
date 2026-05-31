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
  var importFichierEl = document.getElementById("import-fichier");
  var importStepSource = document.getElementById("import-step-source");
  var importStepMap = document.getElementById("import-step-map");
  var importAEnteteEl = document.getElementById("import-a-entete");
  var importMappingRowsEl = document.getElementById("import-mapping-rows");
  var importPreviewHeadEl = document.getElementById("import-preview-head");
  var importPreviewBodyEl = document.getElementById("import-preview-body");
  var importOrdreWrapEl = document.getElementById("import-ordre-wrap");
  var importOrdreNomEl = document.getElementById("import-ordre-nom");
  var importSourceErreurEl = document.getElementById("import-source-erreur");
  var importMapErreurEl = document.getElementById("import-map-erreur");
  var importMapInfoEl = document.getElementById("import-map-info");

  /** @type {{ lignes: string[][], colonnes: number, delimiteur: string }|null} */
  var importParseState = null;
  /** @type {Record<string, number|string>} */
  var importMappingState = {};

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
    var hay = normaliseRecherche(
      [
        e.nom,
        e.prenom,
        e.commentaire,
        e.niveau,
        e.sexe,
        e.dateNaissance,
        typeof EleveDisplay !== "undefined" && EleveDisplay.formatDateNaissanceFR
          ? EleveDisplay.formatDateNaissanceFR(e.dateNaissance)
          : "",
      ].join(" ")
    );
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
      nom.textContent =
        typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
          ? EleveDisplay.formatEleveListe(e)
          : [e.nom, e.prenom].filter(Boolean).join(" ") || "Sans nom";
      var meta = document.createElement("span");
      meta.className = "classes-eleve-item__meta";
      var parts =
        typeof EleveDisplay !== "undefined" && EleveDisplay.metaEleveParts
          ? EleveDisplay.metaEleveParts(e)
          : [];
      if (!parts.length) {
        if (e.sexe) parts.push(e.sexe);
        var nv = normaliserNiveau(e.niveau);
        if (nv) parts.push("niv. " + nv);
        if (e.commentaire) parts.push(e.commentaire);
      }
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
    var naissanceEl = document.getElementById("eleve-naissance");
    var titre = document.getElementById("dialog-eleve-title");
    if (titre) titre.textContent = editingEleveId ? "Modifier l'élève" : "Ajouter un élève";
    document.getElementById("eleve-nom").value = "";
    document.getElementById("eleve-prenom").value = "";
    document.getElementById("eleve-sexe").value = "";
    document.getElementById("eleve-niveau").value = "";
    document.getElementById("eleve-commentaire").value = "";
    if (naissanceEl) naissanceEl.value = "";
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
        if (naissanceEl) naissanceEl.value = e.dateNaissance || "";
      }
    });
    return fill.then(function () {
      if (dialogEleve && dialogEleve.showModal) dialogEleve.showModal();
    });
  }

  function enregistrerEleve(e) {
    e.preventDefault();
    var naissanceEl = document.getElementById("eleve-naissance");
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
        var naissanceBrut = naissanceEl ? naissanceEl.value : "";
        var dateNaissance = "";
        if (typeof EleveDisplay !== "undefined" && EleveDisplay.normaliserDateNaissance) {
          dateNaissance = EleveDisplay.normaliserDateNaissance(naissanceBrut);
          if (naissanceBrut && dateNaissance === null) {
            montrerErreur("Date de naissance invalide (AAAA-MM-JJ ou laissez vide).");
            return;
          }
          dateNaissance = dateNaissance || "";
        } else {
          dateNaissance = naissanceBrut;
        }
        var eleve = {
          id: editingEleveId || DataManager.genererId("eleve"),
          nom: nom,
          prenom: prenom,
          dateNaissance: dateNaissance,
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

  function montrerErreurImport(el, t) {
    if (!el) return;
    el.hidden = !t;
    el.textContent = t || "";
  }

  function reinitialiserImportDialog() {
    importParseState = null;
    importMappingState = {};
    if (importTexteEl) importTexteEl.value = "";
    if (importFichierEl) importFichierEl.value = "";
    montrerErreurImport(importSourceErreurEl, "");
    montrerErreurImport(importMapErreurEl, "");
    if (importMapInfoEl) importMapInfoEl.hidden = true;
    if (importStepSource) importStepSource.hidden = false;
    if (importStepMap) importStepMap.hidden = true;
  }

  function lireTexteImport() {
    if (importTexteEl && importTexteEl.value.trim()) return importTexteEl.value;
    return null;
  }

  function analyserImport() {
    if (typeof ClasseCsvImport === "undefined") {
      montrerErreurImport(importSourceErreurEl, "Module d'import CSV indisponible.");
      return;
    }
    montrerErreurImport(importSourceErreurEl, "");

    function traiter(texte) {
      var parsed = ClasseCsvImport.parseCsvTexte(texte);
      if (parsed.erreur) {
        montrerErreurImport(importSourceErreurEl, parsed.erreur);
        return;
      }
      if (!parsed.lignes.length) {
        montrerErreurImport(importSourceErreurEl, "Aucune ligne à importer.");
        return;
      }
      importParseState = parsed;
      if (importAEnteteEl) {
        importAEnteteEl.checked = ClasseCsvImport.devinerEntete(parsed.lignes);
      }
      afficherEtapeMapping();
    }

    var texteColle = lireTexteImport();
    if (texteColle) {
      traiter(texteColle);
      return;
    }

    var fichier = importFichierEl && importFichierEl.files && importFichierEl.files[0];
    if (!fichier) {
      montrerErreurImport(importSourceErreurEl, "Choisissez un fichier CSV ou collez le contenu.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      traiter(String(reader.result || ""));
    };
    reader.onerror = function () {
      montrerErreurImport(importSourceErreurEl, "Impossible de lire le fichier.");
    };
    reader.readAsText(fichier, "UTF-8");
  }

  function entetesEtDonnees() {
    if (!importParseState) return { entetes: [], data: [] };
    var lignes = importParseState.lignes;
    var aEntete = importAEnteteEl && importAEnteteEl.checked;
    if (aEntete && lignes.length) {
      return { entetes: lignes[0], data: lignes.slice(1) };
    }
    return { entetes: [], data: lignes.slice() };
  }

  function optionsColonnesMapping(entetes, nbColonnes) {
    var opts = [{ value: "", label: "— Ignorer —" }];
    var i;
    for (i = 0; i < nbColonnes; i++) {
      opts.push({
        value: String(i),
        label: ClasseCsvImport.libelleColonne(i, entetes),
      });
    }
    return opts;
  }

  function majVisibiliteOrdreNomPrenom() {
    if (!importOrdreWrapEl) return;
    var combine =
      importMappingState.nom_et_prenom !== undefined &&
      importMappingState.nom_et_prenom !== "";
    importOrdreWrapEl.hidden = !combine;
  }

  function lireMappingDepuisUi() {
    if (!importMappingRowsEl || typeof ClasseCsvImport === "undefined") return {};
    var mapping = {};
    ClasseCsvImport.CHAMPS.forEach(function (champ) {
      var sel = importMappingRowsEl.querySelector(
        'select[data-champ="' + champ.id + '"]'
      );
      if (!sel || sel.value === "") return;
      mapping[champ.id] = parseInt(sel.value, 10);
    });
    return mapping;
  }

  function majApercuImport() {
    if (!importPreviewHeadEl || !importPreviewBodyEl || !importParseState) return;
    var parts = entetesEtDonnees();
    var entetes = parts.entetes;
    var data = parts.data;
    var nbColonnes = importParseState.colonnes;

    importPreviewHeadEl.innerHTML = "";
    importPreviewBodyEl.innerHTML = "";
    var trHead = document.createElement("tr");
    var c;
    for (c = 0; c < nbColonnes; c++) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = entetes[c] || "Col. " + (c + 1);
      trHead.appendChild(th);
    }
    importPreviewHeadEl.appendChild(trHead);

    var max = Math.min(data.length, 4);
    var r;
    for (r = 0; r < max; r++) {
      var tr = document.createElement("tr");
      for (c = 0; c < nbColonnes; c++) {
        var td = document.createElement("td");
        td.textContent = data[r][c] !== undefined ? data[r][c] : "";
        tr.appendChild(td);
      }
      importPreviewBodyEl.appendChild(tr);
    }

    importMappingState = ClasseCsvImport.devinerMapping(entetes, nbColonnes);
    renderMappingRows(entetes, nbColonnes);
    majInfoImport();
  }

  function renderMappingRows(entetes, nbColonnes) {
    if (!importMappingRowsEl || typeof ClasseCsvImport === "undefined") return;
    importMappingRowsEl.innerHTML = "";
    var opts = optionsColonnesMapping(entetes, nbColonnes);

    ClasseCsvImport.CHAMPS.forEach(function (champ) {
      var row = document.createElement("div");
      row.className = "import-mapping-row";

      var lab = document.createElement("label");
      lab.className = "import-mapping-label";
      lab.setAttribute("for", "import-map-" + champ.id);
      lab.textContent = champ.label + (champ.requis ? " *" : "");

      var sel = document.createElement("select");
      sel.id = "import-map-" + champ.id;
      sel.className = "import-mapping-select";
      sel.setAttribute("data-champ", champ.id);
      opts.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        sel.appendChild(opt);
      });
      var val = importMappingState[champ.id];
      sel.value = val !== undefined && val !== "" ? String(val) : "";

      sel.addEventListener("change", function () {
        importMappingState = lireMappingDepuisUi();
        if (champ.id === "nom_et_prenom" && sel.value) {
          delete importMappingState.nom;
          delete importMappingState.prenom;
          var nomSel = importMappingRowsEl.querySelector('select[data-champ="nom"]');
          var prenomSel = importMappingRowsEl.querySelector('select[data-champ="prenom"]');
          if (nomSel) nomSel.value = "";
          if (prenomSel) prenomSel.value = "";
        } else if ((champ.id === "nom" || champ.id === "prenom") && sel.value) {
          var combineSel = importMappingRowsEl.querySelector('select[data-champ="nom_et_prenom"]');
          if (combineSel) combineSel.value = "";
          delete importMappingState.nom_et_prenom;
        }
        importMappingState = lireMappingDepuisUi();
        majVisibiliteOrdreNomPrenom();
        majInfoImport();
      });

      row.appendChild(lab);
      row.appendChild(sel);
      importMappingRowsEl.appendChild(row);
    });

    majVisibiliteOrdreNomPrenom();
  }

  function majInfoImport() {
    if (!importMapInfoEl || typeof ClasseCsvImport === "undefined" || !importParseState) return;
    var mapping = lireMappingDepuisUi();
    var err = ClasseCsvImport.validerMapping(mapping);
    montrerErreurImport(importMapErreurEl, err || "");
    if (err) {
      importMapInfoEl.hidden = true;
      return;
    }
    var parts = entetesEtDonnees();
    var ordre = importOrdreNomEl ? importOrdreNomEl.value : "nom_prenom";
    var result = ClasseCsvImport.lignesVersEleves(parts.data, mapping, {
      ordreNomPrenom: ordre,
      genererId: function () {
        return DataManager.genererId("eleve");
      },
    });
    importMapInfoEl.hidden = false;
    var msg = result.eleves.length + " élève(s) prêt(s) à importer";
    if (result.invalides) msg += " · " + result.invalides + " ligne(s) ignorée(s)";
    importMapInfoEl.textContent = msg;
  }

  function afficherEtapeMapping() {
    if (!importStepSource || !importStepMap) return;
    importStepSource.hidden = true;
    importStepMap.hidden = false;
    montrerErreurImport(importMapErreurEl, "");
    majApercuImport();
  }

  function retourEtapeSource() {
    if (!importStepSource || !importStepMap) return;
    importStepMap.hidden = true;
    importStepSource.hidden = false;
    montrerErreurImport(importMapErreurEl, "");
  }


  function importerListe(e) {
    e.preventDefault();
    if (typeof ClasseCsvImport === "undefined" || !importParseState) {
      montrerErreurImport(importMapErreurEl, "Analysez d'abord un fichier CSV.");
      return;
    }
    var mapping = lireMappingDepuisUi();
    var errMap = ClasseCsvImport.validerMapping(mapping);
    if (errMap) {
      montrerErreurImport(importMapErreurEl, errMap);
      return;
    }
    var parts = entetesEtDonnees();
    var ordre = importOrdreNomEl ? importOrdreNomEl.value : "nom_prenom";
    var result = ClasseCsvImport.lignesVersEleves(parts.data, mapping, {
      ordreNomPrenom: ordre,
      genererId: function () {
        return DataManager.genererId("eleve");
      },
    });
    if (!result.eleves.length) {
      montrerErreurImport(
        importMapErreurEl,
        "Aucun élève valide. Vérifiez la correspondance des colonnes."
      );
      return;
    }
    run(
      getClasseCourante().then(function (classe) {
        if (!classe) return;
        result.eleves.forEach(function (el) {
          classe.eleves.push(el);
        });
        return sauverClasseCourante(classe).then(function () {
          if (dialogImport) dialogImport.close();
          reinitialiserImportDialog();
          var msg = result.eleves.length + " élève(s) importé(s).";
          if (result.invalides) msg += " " + result.invalides + " ligne(s) ignorée(s).";
          montrerOk(msg);
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
        var lines = ["nom;prenom;dateNaissance;sexe;niveau;commentaire"];
        classe.eleves.forEach(function (e) {
          lines.push(
            [e.nom, e.prenom, e.dateNaissance, e.sexe, e.niveau, e.commentaire]
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
      reinitialiserImportDialog();
      if (dialogImport && dialogImport.showModal) dialogImport.showModal();
    });
  }
  if (document.getElementById("btn-import-analyser")) {
    document.getElementById("btn-import-analyser").addEventListener("click", analyserImport);
  }
  if (document.getElementById("btn-import-retour")) {
    document.getElementById("btn-import-retour").addEventListener("click", retourEtapeSource);
  }
  if (importAEnteteEl) {
    importAEnteteEl.addEventListener("change", function () {
      if (importParseState) majApercuImport();
    });
  }
  if (importOrdreNomEl) {
    importOrdreNomEl.addEventListener("change", majInfoImport);
  }
  if (importFichierEl) {
    importFichierEl.addEventListener("change", function () {
      if (importFichierEl.files && importFichierEl.files[0]) {
        if (importTexteEl) importTexteEl.value = "";
        montrerErreurImport(importSourceErreurEl, "");
      }
    });
  }
  if (importTexteEl) {
    importTexteEl.addEventListener("input", function () {
      if (importTexteEl.value.trim() && importFichierEl) importFichierEl.value = "";
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
      reinitialiserImportDialog();
    });
  }
  if (dialogImport) {
    dialogImport.addEventListener("close", reinitialiserImportDialog);
  }

  run(DataManager.ready.then(renderListeClasses));
})();
