/**
 * Appel et notes — liste d’élèves + colonnes (nombre, ✓/✗), export CSV/PDF.
 */
(function () {
  "use strict";

  var ACTIF_KEY = "outils_eps_tableau_suivi_actif_v1";
  var SAVE_DELAY_MS = 400;
  var tableaux = [];
  var actifId = null;
  var saveTimer = null;
  var pret = false;

  var msgEl = document.getElementById("tab-suivi-msg");
  var okEl = document.getElementById("tab-suivi-ok");
  var selectEl = document.getElementById("select-tableau");
  var titreEl = document.getElementById("titre-tableau");
  var listeBruteEl = document.getElementById("liste-brute-tab");
  var nbElevesEl = document.getElementById("tab-suivi-nb-eleves");
  var scrollEl = document.getElementById("tab-suivi-scroll");
  var theadEl = document.getElementById("tab-suivi-thead");
  var tbodyEl = document.getElementById("tab-suivi-tbody");
  var emptyEl = document.getElementById("tab-suivi-empty");
  var dialogGestion = document.getElementById("dialog-tab-suivi-gestion");
  var dialogTri = document.getElementById("dialog-tab-suivi-tri");
  var dlgTriPar = document.getElementById("dlg-tri-par");
  var dlgTriColonne = document.getElementById("dlg-tri-colonne");
  var dlgTriColonneWrap = document.getElementById("dlg-tri-colonne-wrap");
  var dlgTriColonneEmpty = document.getElementById("dlg-tri-colonne-empty");
  var btnTriSens = document.getElementById("btn-tri-sens");
  var triSensDesc = false;
  var dialogCalc = document.getElementById("dialog-tab-suivi-calc");
  var dlgCalcSources = document.getElementById("dlg-calc-sources");
  var dlgCalcSourcesEmpty = document.getElementById("dlg-calc-sources-empty");
  var dialogColonne = document.getElementById("dialog-tab-suivi-colonne");
  var dlgColTitre = document.getElementById("dlg-col-titre");
  var dlgColTypeHint = document.getElementById("dlg-col-type-hint");
  var dlgColNom = document.getElementById("dlg-col-nom");
  var dlgColRemplirSection = document.getElementById("dlg-col-remplir-section");
  var dlgColRemplirBody = document.getElementById("dlg-col-remplir-body");
  var dlgColCalcHint = document.getElementById("dlg-col-calc-hint");
  var btnColGauche = document.getElementById("btn-col-gauche");
  var btnColDroite = document.getElementById("btn-col-droite");
  var btnColSupprimer = document.getElementById("btn-col-supprimer");
  var colonneDialogId = null;
  var dialogEleves = document.getElementById("dialog-tab-suivi-eleves");
  var dlgElevesSelect = document.getElementById("dlg-eleves-select");
  var dlgElevesDetail = document.getElementById("dlg-eleves-detail");
  var dlgElevesNom = document.getElementById("dlg-eleves-nom");
  var dlgElevesPrenom = document.getElementById("dlg-eleves-prenom");
  var btnElevesRetirer = document.getElementById("btn-eleves-retirer");
  var dlgElevesEmpty = document.getElementById("dlg-eleves-empty");
  var elevesDialogRowId = null;
  var dialogOubli = document.getElementById("dialog-tab-suivi-oubli");
  var dlgOubliEleve = document.getElementById("dlg-oubli-eleve");
  var dlgOubliIntro = document.getElementById("dlg-oubli-intro");
  var dlgOubliCount = document.getElementById("dlg-oubli-count");
  var dlgOubliList = document.getElementById("dlg-oubli-list");
  var dlgOubliEmpty = document.getElementById("dlg-oubli-empty");
  var dialogIcone = document.getElementById("dialog-tab-suivi-icone");
  var oubliRowId = null;
  var dlgIconeGrid = document.getElementById("dlg-icone-grid");
  var dlgIconeTitre = document.getElementById("dlg-icone-titre");
  var iconeEleveRowId = null;

  var ICONES_ELEVE = [
    { id: "", glyph: "·", label: "Aucune", cls: "vide" },
    { id: "pai", glyph: "💊", label: "PAI", cls: "pai" },
    { id: "pap", glyph: "✏️", label: "PAP", cls: "pap" },
    { id: "alert", glyph: "⚠", label: "Alerte", cls: "alert" },
    { id: "1", glyph: "1", label: "Repère 1", cls: "num" },
    { id: "2", glyph: "2", label: "Repère 2", cls: "num" },
    { id: "3", glyph: "3", label: "Repère 3", cls: "num" },
    { id: "4", glyph: "4", label: "Repère 4", cls: "num" },
    { id: "5", glyph: "5", label: "Repère 5", cls: "num" },
  ];

  function genererId(prefix) {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId(prefix);
    }
    return (prefix || "id") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function maintenant() {
    return new Date().toISOString();
  }

  function dateDuJourLabel() {
    return new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function labelColonneDefaut(t) {
    var base = dateDuJourLabel();
    var existe = t.cols.some(function (c) {
      return c.label === base;
    });
    if (!existe) return base;
    var n = 2;
    while (
      t.cols.some(function (c) {
        return c.label === base + " (" + n + ")";
      })
    ) {
      n++;
    }
    return base + " (" + n + ")";
  }

  function montrerMsg(texte) {
    if (okEl) okEl.hidden = true;
    if (!msgEl) return;
    if (!texte) {
      msgEl.hidden = true;
      msgEl.textContent = "";
      return;
    }
    msgEl.textContent = texte;
    msgEl.hidden = false;
  }

  function montrerOk(texte) {
    if (msgEl) msgEl.hidden = true;
    if (!okEl) return;
    if (!texte) {
      okEl.hidden = true;
      okEl.textContent = "";
      return;
    }
    okEl.textContent = texte;
    okEl.hidden = false;
  }

  function normaliserNom(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function eleveVersLabel(e) {
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
      eleveId: e.id || "",
    };
  }

  function aujourdhuiIso() {
    var d = new Date();
    var mo = String(d.getMonth() + 1).padStart(2, "0");
    var da = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mo + "-" + da;
  }

  function genererIdOubli() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "om_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function cleEleveOubli(o) {
    if (o.eleveId) return "id:" + o.eleveId;
    return [o.classe, o.nom, o.prenom]
      .join("|")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function numeroOubliApresAjout(liste, entree) {
    var key = cleEleveOubli(entree);
    var n = 0;
    liste.forEach(function (o) {
      if (cleEleveOubli(o) === key) n++;
    });
    return n;
  }

  function isoVersFr(iso) {
    if (!iso || typeof iso !== "string") return "";
    var p = iso.split("-");
    if (p.length !== 3) return iso;
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function labelEleveRow(row) {
    var noms = nomsDepuisRow(row);
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      return EleveDisplay.formatEleveListe(
        { nom: noms.nom, prenom: noms.prenom },
        row.label || "Sans nom"
      );
    }
    return row.label || "Sans nom";
  }

  function synchroniserLabelRow(row, nom, prenom) {
    if (!row.meta) row.meta = {};
    row.meta.nom = normaliserNom(nom);
    row.meta.prenom = normaliserNom(prenom);
    row.label = labelEleveRow(row);
  }

  function oublisPourRow(liste, row) {
    var noms = nomsDepuisRow(row);
    var eleveId = row.meta && row.meta.eleveId ? row.meta.eleveId : "";
    return (liste || [])
      .filter(function (o) {
        if (!o) return false;
        if (eleveId && o.eleveId) return o.eleveId === eleveId;
        return (
          normaliserNom(o.nom).toLowerCase() === noms.nom.toLowerCase() &&
          normaliserNom(o.prenom).toLowerCase() === noms.prenom.toLowerCase()
        );
      })
      .sort(function (a, b) {
        if (a.dateOubli !== b.dateOubli) return a.dateOubli < b.dateOubli ? -1 : 1;
        return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
      });
  }

  function supprimerRowDuTableau(t, rowId) {
    t.rows = t.rows.filter(function (r) {
      return r.id !== rowId;
    });
    Object.keys(t.cells).forEach(function (k) {
      if (k.indexOf(rowId + ":") === 0) delete t.cells[k];
    });
  }

  function creerEnteteEleve() {
    var th = document.createElement("th");
    th.className = "tab-suivi-th tab-suivi-th--nom tab-suivi-th--eleve-label";
    th.scope = "col";
    var wrap = document.createElement("div");
    wrap.className = "tab-suivi-eleve-head";
    var label = document.createElement("span");
    label.className = "tab-suivi-eleve-head__label";
    label.textContent = "Élève";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-suivi-eleve-params";
    btn.setAttribute("aria-label", "Paramètres des élèves (noms, suppression)");
    btn.title = "Paramètres élèves";
    btn.innerHTML = '<span aria-hidden="true">⚙</span>';
    btn.addEventListener("click", ouvrirDialogEleves);
    wrap.appendChild(label);
    wrap.appendChild(btn);
    th.appendChild(wrap);
    return th;
  }

  function getRowParId(t, rowId) {
    if (!t || !rowId) return null;
    return (
      t.rows.filter(function (r) {
        return r.id === rowId;
      })[0] || null
    );
  }

  function sauverEleveDialogCourant() {
    var t = getActif();
    if (!t || !elevesDialogRowId || !dlgElevesNom || !dlgElevesPrenom) return;
    var row = getRowParId(t, elevesDialogRowId);
    if (!row) return;
    synchroniserLabelRow(row, dlgElevesNom.value, dlgElevesPrenom.value);
  }

  function remplirDetailEleve(row) {
    if (!row || !dlgElevesDetail) return;
    var noms = nomsDepuisRow(row);
    if (dlgElevesNom) dlgElevesNom.value = noms.nom;
    if (dlgElevesPrenom) dlgElevesPrenom.value = noms.prenom;
    var titre = document.getElementById("dlg-eleves-detail-title");
    if (titre) titre.textContent = labelEleveRow(row);
    dlgElevesDetail.hidden = false;
  }

  function selectionnerEleveDialog(rowId, options) {
    var t = getActif();
    if (!t || !rowId) return;
    options = options || {};
    if (!options.skipSave && elevesDialogRowId && elevesDialogRowId !== rowId) {
      sauverEleveDialogCourant();
    }
    var row = getRowParId(t, rowId);
    if (!row) return;
    elevesDialogRowId = rowId;
    if (dlgElevesSelect) dlgElevesSelect.value = rowId;
    remplirDetailEleve(row);
    if (!options.skipSave) planifierSauvegarde();
  }

  function initDialogEleves() {
    var t = getActif();
    var selectWrap = document.querySelector(".tab-suivi-eleves-dlg__select-wrap");
    if (!t || !t.rows.length) {
      if (dlgElevesEmpty) dlgElevesEmpty.hidden = false;
      if (selectWrap) selectWrap.hidden = true;
      if (dlgElevesDetail) dlgElevesDetail.hidden = true;
      elevesDialogRowId = null;
      return;
    }
    if (dlgElevesEmpty) dlgElevesEmpty.hidden = true;
    if (selectWrap) selectWrap.hidden = false;

    if (dlgElevesSelect) {
      dlgElevesSelect.innerHTML = "";
      t.rows.forEach(function (row) {
        var opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = labelEleveRow(row);
        dlgElevesSelect.appendChild(opt);
      });
    }

    var cible =
      elevesDialogRowId && getRowParId(t, elevesDialogRowId)
        ? elevesDialogRowId
        : t.rows[0].id;
    selectionnerEleveDialog(cible, { skipSave: true });
  }

  function retirerEleveDialog() {
    var t = getActif();
    if (!t || !elevesDialogRowId) return;
    var row = getRowParId(t, elevesDialogRowId);
    if (!row) return;
    if (!confirm("Retirer « " + (row.label || "") + " » de cette feuille ?")) return;
    var idx = t.rows.findIndex(function (r) {
      return r.id === elevesDialogRowId;
    });
    supprimerRowDuTableau(t, elevesDialogRowId);
    elevesDialogRowId = null;
    rendreGrille();
    planifierSauvegarde();
    if (!t.rows.length) {
      fermerDialogEleves();
      return;
    }
    var next = t.rows[Math.min(idx, t.rows.length - 1)];
    initDialogEleves();
    if (next) selectionnerEleveDialog(next.id, { skipSave: true });
  }

  function ouvrirDialogEleves() {
    var t = getActif();
    if (!t || !dialogEleves || !dialogEleves.showModal) return;
    if (!t.rows.length) {
      montrerMsg("Ajoutez des élèves avant d’ouvrir les paramètres.");
      return;
    }
    montrerMsg("");
    elevesDialogRowId = null;
    initDialogEleves();
    dialogEleves.showModal();
  }

  function fermerDialogEleves() {
    if (dialogEleves && dialogEleves.open) {
      sauverEleveDialogCourant();
      elevesDialogRowId = null;
      dialogEleves.close();
      rendreGrille();
      planifierSauvegarde();
    }
  }

  function libelleNbOublisMateriel(n) {
    if (n === 0) return "Aucun oubli de matériel";
    if (n === 1) return "1 oubli de matériel";
    return n + " oublis de matériel";
  }

  function majCompteurOubliPopup(n) {
    var numEl = dlgOubliCount ? dlgOubliCount.querySelector(".tab-suivi-oubli-stat__num") : null;
    var lblEl = dlgOubliCount ? dlgOubliCount.querySelector(".tab-suivi-oubli-stat__lbl") : null;
    if (numEl) numEl.textContent = String(n);
    if (lblEl) lblEl.textContent = n === 1 ? "oubli de matériel" : "oublis de matériel";
    if (dlgOubliCount) {
      dlgOubliCount.setAttribute("aria-label", libelleNbOublisMateriel(n));
      dlgOubliCount.classList.toggle("tab-suivi-oubli-stat--zero", n === 0);
    }
    if (dlgOubliIntro) {
      dlgOubliIntro.textContent =
        n === 0
          ? "Aucun oubli enregistré pour cet élève. Vous pouvez en ajouter un premier."
          : n === 1
            ? "1 oubli enregistré. Le prochain sera le n°2."
            : n + " oublis enregistrés. Le prochain sera le n°" + (n + 1) + ".";
    }
  }

  function rendreListeDialogOubli(oublis) {
    if (!dlgOubliList) return;
    dlgOubliList.innerHTML = "";
    var n = oublis.length;
    majCompteurOubliPopup(n);
    if (!n) {
      if (dlgOubliEmpty) dlgOubliEmpty.hidden = false;
      if (dlgOubliList) dlgOubliList.hidden = true;
      return;
    }
    if (dlgOubliEmpty) dlgOubliEmpty.hidden = true;
    dlgOubliList.hidden = false;

    var numeros = {};
    oublis.forEach(function (o, i) {
      numeros[o.id] = i + 1;
    });

    oublis
      .slice()
      .reverse()
      .forEach(function (o, index) {
        var num = numeros[o.id] || "?";
        var li = document.createElement("li");
        li.className = "tab-suivi-oubli-card";
        li.setAttribute("role", "listitem");
        li.style.animationDelay = index * 50 + "ms";

        var indexEl = document.createElement("span");
        indexEl.className = "tab-suivi-oubli-card__index";
        indexEl.setAttribute("aria-hidden", "true");
        indexEl.textContent = String(num);

        var main = document.createElement("div");
        main.className = "tab-suivi-oubli-card__main";

        var row = document.createElement("div");
        row.className = "tab-suivi-oubli-card__row";
        var icon = document.createElement("span");
        icon.className = "tab-suivi-oubli-card__emoji";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "👟";
        var date = document.createElement("time");
        date.className = "tab-suivi-oubli-card__date";
        date.dateTime = o.dateOubli || "";
        date.textContent = isoVersFr(o.dateOubli);
        row.appendChild(icon);
        row.appendChild(date);
        if (o.classe) {
          var classe = document.createElement("span");
          classe.className = "tab-suivi-oubli-card__classe";
          classe.textContent = o.classe;
          row.appendChild(classe);
        }
        main.appendChild(row);

        var type = document.createElement("p");
        type.className = "tab-suivi-oubli-card__type";
        type.textContent = o.commentaire ? o.commentaire : "Tenue";
        main.appendChild(type);

        li.appendChild(indexEl);
        li.appendChild(main);
        dlgOubliList.appendChild(li);
      });
  }

  function ouvrirDialogOubliTenue(row) {
    if (!row || !dialogOubli || !dialogOubli.showModal) return;
    var noms = nomsDepuisRow(row);
    if (!noms.nom) {
      montrerMsg("Nom de l’élève requis.");
      return;
    }
    if (!noms.prenom) {
      montrerMsg("Prénom requis : utilisez les paramètres élèves (⚙) ou importez une classe.");
      return;
    }
    oubliRowId = row.id;
    if (dlgOubliEleve) dlgOubliEleve.textContent = labelEleveRow(row);
    majCompteurOubliPopup(0);
    montrerMsg("");
    if (typeof DataManager === "undefined" || !DataManager.getOublisMateriel) {
      rendreListeDialogOubli([]);
      dialogOubli.showModal();
      return;
    }
    DataManager.getOublisMateriel()
      .then(function (liste) {
        rendreListeDialogOubli(oublisPourRow(liste, row));
        dialogOubli.showModal();
      })
      .catch(function () {
        rendreListeDialogOubli([]);
        dialogOubli.showModal();
      });
  }

  function fermerDialogOubli() {
    oubliRowId = null;
    if (dialogOubli && dialogOubli.open) dialogOubli.close();
  }

  function getRowOubliActive() {
    if (!oubliRowId) return null;
    var t = getActif();
    if (!t) return null;
    return (
      t.rows.filter(function (r) {
        return r.id === oubliRowId;
      })[0] || null
    );
  }

  function rafraichirDialogOubli() {
    var row = getRowOubliActive();
    if (!row || !dialogOubli || !dialogOubli.open) return;
    if (typeof DataManager === "undefined" || !DataManager.getOublisMateriel) return;
    DataManager.getOublisMateriel().then(function (liste) {
      rendreListeDialogOubli(oublisPourRow(liste, row));
    });
  }

  function enregistrerOubliTenue(row) {
    if (!pret || typeof DataManager === "undefined" || !DataManager.getOublisMateriel) {
      montrerMsg("Enregistrement des oublis indisponible.");
      return Promise.resolve();
    }
    var noms = nomsDepuisRow(row);
    if (!noms.nom) {
      montrerMsg("Saisissez le nom de l’élève.");
      return Promise.resolve();
    }
    if (!noms.prenom) {
      montrerMsg(
        "Prénom requis pour l’oubli : utilisez « Nom Prénom » ou importez depuis une classe."
      );
      return Promise.resolve();
    }
    var meta = row.meta || {};
    var classe = (meta.classe || "").trim();
    if (!classe) {
      var t = getActif();
      classe = t && t.titre ? normaliserNom(t.titre) : "";
    }
    if (!classe) {
      montrerMsg(
        "Classe requise : importez depuis une classe ou donnez un nom de classe à la feuille."
      );
      return Promise.resolve();
    }

    var now = new Date().toISOString();
    var entree = {
      id: genererIdOubli(),
      eleveId: meta.eleveId || "",
      classeId: meta.classeId || "",
      nom: noms.nom,
      prenom: noms.prenom,
      classe: classe,
      dateOubli: aujourdhuiIso(),
      commentaire: "Tenue",
      createdAt: now,
      updatedAt: now,
    };

    return DataManager.getOublisMateriel()
      .then(function (liste) {
        var arr = Array.isArray(liste) ? liste.slice() : [];
        arr.push(entree);
        return DataManager.saveOublisMateriel(arr).then(function () {
          return numeroOubliApresAjout(arr, entree);
        });
      })
      .then(function (num) {
        var label = labelEleveRow(row);
        if (dialogOubli && dialogOubli.open) {
          rafraichirDialogOubli();
          montrerMsg("");
          montrerOk("Oubli n°" + num + " enregistré pour " + label + ".");
          return;
        }
        montrerMsg("");
        montrerOk(
          "Oubli de tenue enregistré pour " +
            label +
            " (oubli n°" +
            num +
            "). Consultez l’outil Oubli de matériel."
        );
      })
      .catch(function (err) {
        montrerMsg((err && err.message) || "Impossible d’enregistrer l’oubli de tenue.");
      });
  }

  function creerBoutonOubliTenue(row) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-suivi-row-oubli";
    btn.setAttribute(
      "aria-label",
      "Oubli de tenue pour " + (row.label || "cet élève")
    );
    btn.title = "Oubli de tenue";
    btn.innerHTML = '<span class="tab-suivi-row-oubli__icon" aria-hidden="true">👟</span>';
    btn.addEventListener("click", function () {
      ouvrirDialogOubliTenue(row);
    });
    return btn;
  }

  function nomsDepuisRow(row) {
    if (row.meta && (row.meta.nom || row.meta.prenom)) {
      return {
        nom: normaliserNom(row.meta.nom),
        prenom: normaliserNom(row.meta.prenom),
      };
    }
    var parts = normaliserNom(row.label).split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return { nom: parts[0], prenom: parts.slice(1).join(" ") };
    }
    return { nom: parts[0] || "", prenom: "" };
  }

  function libelleNbEleves(n) {
    var nb = n || 0;
    return nb <= 1 ? nb + " élève" : nb + " élèves";
  }

  function suffixeNbElevesSelect(nb) {
    nb = nb || 0;
    if (nb >= 30) return " (" + nb + " élèves)";
    if (nb <= 1) return " (" + nb + " élève)";
    return " (" + nb + " élèves)";
  }

  function chargerActifIdLocal() {
    try {
      return localStorage.getItem(ACTIF_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function sauverActifIdLocal(id) {
    try {
      if (id) localStorage.setItem(ACTIF_KEY, id);
      else localStorage.removeItem(ACTIF_KEY);
    } catch (e) {
      /* quota */
    }
  }

  function getActif() {
    if (!actifId) return null;
    for (var i = 0; i < tableaux.length; i++) {
      if (tableaux[i].id === actifId) return tableaux[i];
    }
    return null;
  }

  function normaliserTableau(t) {
    if (!t) return null;
    if (!Array.isArray(t.rows)) t.rows = [];
    if (!Array.isArray(t.cols)) t.cols = [];
    if (!t.cells || typeof t.cells !== "object") t.cells = {};
    t.rows.forEach(function (r) {
      if (!r.id) r.id = genererId("row");
      if (!r.label) r.label = "Sans nom";
      if (!r.meta) r.meta = {};
      r.meta.icone = normaliserIconeEleve(r.meta.icone);
    });
    t.cols.forEach(function (c) {
      if (!c.id) c.id = genererId("col");
      if (!c.label) c.label = "Colonne";
      if (c.type === "text") c.type = "number";
      if (c.type === "calc") {
        if (c.calcOp !== "sum" && c.calcOp !== "avg") c.calcOp = "sum";
        if (!Array.isArray(c.sourceIds)) c.sourceIds = [];
        c.sourceIds = c.sourceIds.filter(function (sid) {
          return t.cols.some(function (x) {
            return x.id === sid && x.type === "number";
          });
        });
      } else if (c.type !== "check" && c.type !== "number") {
        c.type = "number";
      }
    });
    return t;
  }

  function colonnesNombreSources(t) {
    return t.cols.filter(function (c) {
      return c.type === "number";
    });
  }

  function valeurCalculee(t, rowId, col) {
    if (!col || col.type !== "calc") return null;
    var ids = col.sourceIds || [];
    var vals = [];
    ids.forEach(function (sid) {
      var src = t.cols.filter(function (c) {
        return c.id === sid;
      })[0];
      if (!src || src.type !== "number") return;
      var v = getCell(t, rowId, src.id);
      if (typeof v === "number" && !isNaN(v)) vals.push(v);
    });
    if (!vals.length) return null;
    var sum = vals.reduce(function (a, b) {
      return a + b;
    }, 0);
    if (col.calcOp === "avg") return sum / vals.length;
    return sum;
  }

  function valeurCellule(t, rowId, col) {
    if (col.type === "calc") return valeurCalculee(t, rowId, col);
    return getCell(t, rowId, col.id);
  }

  function demanderNomColonne(col) {
    if (!col || (col.type !== "number" && col.type !== "calc")) return;
    var def = col.label || "";
    var rep = window.prompt("Nom de la colonne :", def);
    if (rep === null) {
      montrerOk("Colonne « " + def + " » ajoutée.");
      return;
    }
    var l = normaliserNom(rep);
    if (!l) {
      montrerOk("Colonne « " + def + " » ajoutée.");
      return;
    }
    col.label = l;
    rendreGrille(true);
    planifierSauvegarde();
    montrerOk("Colonne « " + l + " » ajoutée.");
  }

  function labelColonneCalcDefaut(t, calcOp, sourceIds) {
    var noms = [];
    sourceIds.forEach(function (sid) {
      var c = t.cols.filter(function (x) {
        return x.id === sid;
      })[0];
      if (c && c.label) noms.push(c.label);
    });
    var base = (calcOp === "avg" ? "Moy. " : "Σ ") + (noms.join(" + ") || "Calcul");
    if (base.length <= 24) return base;
    return (calcOp === "avg" ? "Moy. " : "Σ ") + noms.length + " col.";
  }

  function creerTableauVide(titre) {
    var now = maintenant();
    return {
      id: genererId("tab"),
      titre: titre || "Nouvel appel",
      createdAt: now,
      updatedAt: now,
      rows: [],
      cols: [],
      cells: {},
    };
  }

  function cellKey(rowId, colId) {
    return rowId + ":" + colId;
  }

  function getCell(t, rowId, colId) {
    return t.cells[cellKey(rowId, colId)];
  }

  function setCell(t, rowId, colId, val) {
    var k = cellKey(rowId, colId);
    if (val === null || val === undefined || val === "") {
      delete t.cells[k];
    } else {
      t.cells[k] = val;
    }
  }

  function normaliserIconeEleve(id) {
    var s = String(id == null ? "" : id);
    for (var i = 0; i < ICONES_ELEVE.length; i++) {
      if (ICONES_ELEVE[i].id === s) return s;
    }
    return "";
  }

  function iconeEleveDef(id) {
    var sid = normaliserIconeEleve(id);
    for (var i = 0; i < ICONES_ELEVE.length; i++) {
      if (ICONES_ELEVE[i].id === sid) return ICONES_ELEVE[i];
    }
    return ICONES_ELEVE[0];
  }

  function iconeEleveId(row) {
    return row && row.meta ? normaliserIconeEleve(row.meta.icone) : "";
  }

  function labelEleveAvecIcone(row, pourPdf) {
    var def = iconeEleveDef(iconeEleveId(row));
    var label = row.label || "";
    if (!def.id) return label;
    if (pourPdf) {
      var tag = def.id === "pai" ? "PAI" : def.id === "pap" ? "PAP" : def.id === "alert" ? "!" : def.glyph;
      return "[" + tag + "] " + label;
    }
    return def.glyph + " " + label;
  }

  function valeurVersTexte(t, rowId, col, pourPdf) {
    var v = valeurCellule(t, rowId, col);
    if (col.type === "check") {
      if (pourPdf) {
        if (v === true) return "Oui";
        if (v === false) return "Non";
        return "—";
      }
      if (v === true) return "✓";
      if (v === false) return "✗";
      return "";
    }
    if (v === null || v === undefined || v === "") return "";
    return String(v).replace(".", ",");
  }

  function ouvrirDialogIcone(rowId) {
    var t = getActif();
    if (!t || !dialogIcone || !dlgIconeGrid) return;
    var row = t.rows.filter(function (r) {
      return r.id === rowId;
    })[0];
    if (!row) return;
    iconeEleveRowId = rowId;
    if (dlgIconeTitre) dlgIconeTitre.textContent = "Icône — " + (row.label || "élève");
    dlgIconeGrid.innerHTML = "";
    ICONES_ELEVE.forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab-suivi-icone-opt";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", opt.label);
      var g = document.createElement("span");
      g.className = "tab-suivi-icone-opt__glyph";
      g.textContent = opt.glyph;
      g.setAttribute("aria-hidden", "true");
      var lab = document.createElement("span");
      lab.className = "tab-suivi-icone-opt__label";
      lab.textContent = opt.label;
      b.appendChild(g);
      b.appendChild(lab);
      b.addEventListener("click", function () {
        if (!row.meta) row.meta = {};
        row.meta.icone = opt.id;
        if (dialogIcone.open) dialogIcone.close();
        iconeEleveRowId = null;
        rendreGrille();
        planifierSauvegarde();
      });
      dlgIconeGrid.appendChild(b);
    });
    dialogIcone.showModal();
  }

  function creerBoutonIconeEleve(t, row) {
    var def = iconeEleveDef(iconeEleveId(row));
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tab-suivi-row-icone tab-suivi-row-icone--" + (def.cls || "vide");
    btn.setAttribute("aria-label", "Changer l’icône (« " + def.label + " » actuellement)");
    btn.textContent = def.glyph;
    btn.addEventListener("click", function () {
      ouvrirDialogIcone(row.id);
    });
    return btn;
  }

  function parseValeurNombre(raw) {
    var s = (raw || "").trim().replace(",", ".");
    if (!s) return null;
    var parsed = parseFloat(s);
    return isNaN(parsed) ? null : parsed;
  }

  function majStatsColonneDom(colId, texte) {
    if (!scrollEl || !colId) return;
    var th = scrollEl.querySelector(
      '.tab-suivi-head-stats .tab-suivi-th--col[data-col-id="' + colId + '"]'
    );
    if (th) th.textContent = texte;
  }

  function majToutesStatsDom(t) {
    t.cols.forEach(function (col) {
      majStatsColonneDom(col.id, syntheseColonne(t, col));
    });
  }

  function rafraichirColonnesCalcLiees(t, sourceColId) {
    t.cols.forEach(function (col) {
      if (col.type !== "calc" || !col.sourceIds || col.sourceIds.indexOf(sourceColId) < 0) return;
      majStatsColonneDom(col.id, syntheseColonne(t, col));
      if (!tbodyEl) return;
      t.rows.forEach(function (row) {
        var el = tbodyEl.querySelector(
          'tr[data-row-id="' +
            row.id +
            '"] td[data-col-id="' +
            col.id +
            '"] .tab-suivi-cell-calc'
        );
        if (!el) return;
        var cv = valeurCalculee(t, row.id, col);
        el.textContent =
          cv === null || cv === undefined || isNaN(cv) ? "—" : String(cv).replace(".", ",");
      });
    });
  }

  function appliquerValeurDepuisInput(num, t, row, col) {
    setCell(t, row.id, col.id, parseValeurNombre(num.value));
    majStatsColonneDom(col.id, syntheseColonne(t, col));
    rafraichirColonnesCalcLiees(t, col.id);
    planifierSauvegarde();
  }

  function focusCelluleNombre(rowIndex, colId) {
    if (!tbodyEl || rowIndex < 0) return;
    var t = getActif();
    if (!t || rowIndex >= t.rows.length) return;
    var rowId = t.rows[rowIndex].id;
    var sel =
      'tr[data-row-id="' +
      rowId +
      '"] input.tab-suivi-cell-input[data-col-id="' +
      colId +
      '"]';
    var next = tbodyEl.querySelector(sel);
    if (next) {
      next.focus();
      next.select();
    }
  }

  function syntheseColonne(t, col) {
    if (!t.rows.length) return "—";
    if (col.type === "check") {
      var ok = 0;
      t.rows.forEach(function (row) {
        if (getCell(t, row.id, col.id) === true) ok++;
      });
      return ok + " ✓";
    }
    var sum = 0;
    var n = 0;
    t.rows.forEach(function (row) {
      var v = valeurCellule(t, row.id, col);
      if (typeof v === "number" && !isNaN(v)) {
        sum += v;
        n++;
      }
    });
    if (!n) return "—";
    var moy = sum / n;
    var s = moy.toFixed(1);
    if (s.indexOf(".0") === s.length - 2) s = String(Math.round(moy));
    return s.replace(".", ",");
  }

  function planifierSauvegarde() {
    if (!pret) return;
    var t = getActif();
    if (t) t.updatedAt = maintenant();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persisterTableaux, SAVE_DELAY_MS);
  }

  function persisterTableaux() {
    if (typeof DataManager === "undefined" || !DataManager.saveTableauxSuivi) return;
    return DataManager.saveTableauxSuivi(tableaux).catch(function (err) {
      montrerMsg(err && err.message ? err.message : "Impossible d’enregistrer le tableau.");
    });
  }

  function contientLabel(t, label) {
    var n = normaliserNom(label).toLowerCase();
    return t.rows.some(function (r) {
      return normaliserNom(r.label).toLowerCase() === n;
    });
  }

  function ajouterLignes(t, entrees) {
    var ajoutes = 0;
    entrees.forEach(function (ent) {
      var label = typeof ent === "string" ? ent : ent.label;
      var meta = typeof ent === "string" ? {} : ent.meta || {};
      var l = normaliserNom(label);
      if (!l || contientLabel(t, l)) return;
      t.rows.push({
        id: genererId("row"),
        label: l,
        meta: meta,
      });
      ajoutes++;
    });
    return ajoutes;
  }

  function parserTextarea() {
    if (!listeBruteEl) return [];
    return listeBruteEl.value
      .split(/\r?\n/)
      .map(normaliserNom)
      .filter(Boolean);
  }

  function majSelectTableaux() {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    tableaux.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.id;
      var nb = (t.rows && t.rows.length) || 0;
      opt.textContent = (t.titre || "Sans titre") + suffixeNbElevesSelect(nb);
      selectEl.appendChild(opt);
    });
    if (actifId) selectEl.value = actifId;
    var btnSup = document.getElementById("btn-supprimer-tableau");
    if (btnSup) btnSup.disabled = tableaux.length <= 1;
  }

  function defilerVersColonne(colId) {
    if (!scrollEl || !colId) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var el = scrollEl.querySelector('.tab-suivi-th--col[data-col-id="' + colId + '"]');
        if (el) {
          el.scrollIntoView({ inline: "end", block: "nearest", behavior: "smooth" });
        }
      });
    });
  }

  function comparateurTexte(a, b) {
    return String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base" });
  }

  function trierLignes(t, mode, sensDesc) {
    if (!mode || mode === "ordre") return;
    var rows = t.rows.slice();
    var inv = sensDesc ? -1 : 1;

    if (mode === "prenom") {
      rows.sort(function (a, b) {
        var na = nomsDepuisRow(a);
        var nb = nomsDepuisRow(b);
        var c = comparateurTexte(na.prenom, nb.prenom);
        return inv * (c !== 0 ? c : comparateurTexte(na.nom, nb.nom));
      });
    } else if (mode === "nom") {
      rows.sort(function (a, b) {
        var na = nomsDepuisRow(a);
        var nb = nomsDepuisRow(b);
        var c = comparateurTexte(na.nom, nb.nom);
        return inv * (c !== 0 ? c : comparateurTexte(na.prenom, nb.prenom));
      });
    } else if (mode === "label") {
      rows.sort(function (a, b) {
        return comparateurTexte(a.label, b.label);
      });
    } else if (mode.indexOf("col:") === 0) {
      var parts = mode.split(":");
      var colId = parts[1];
      var sens = sensDesc ? -1 : 1;
      if (parts[2] === "desc") sens = -1;
      else if (parts[2] === "asc") sens = 1;
      var col = t.cols.filter(function (c) {
        return c.id === colId;
      })[0];
      if (!col) return;
      rows.sort(function (a, b) {
        var va = valeurCellule(t, a.id, col);
        var vb = valeurCellule(t, b.id, col);
        if (col.type === "check") {
          var score = function (v) {
            if (v === true) return 2;
            if (v === false) return 1;
            return 0;
          };
          return sens * (score(va) - score(vb));
        }
        var na = typeof va === "number" && !isNaN(va) ? va : -Infinity;
        var nb = typeof vb === "number" && !isNaN(vb) ? vb : -Infinity;
        if (na === nb) return comparateurTexte(a.label, b.label);
        return sens * (na - nb);
      });
    }

    t.rows = rows;
  }

  function rendreGrille(scrollVersColId) {
    var t = getActif();
    if (!t) return;

    if (titreEl) titreEl.value = t.titre || "";
    if (nbElevesEl) nbElevesEl.textContent = libelleNbEleves(t.rows.length);

    var hasGrid = t.rows.length > 0 || t.cols.length > 0;
    if (emptyEl) emptyEl.hidden = hasGrid;
    if (scrollEl) scrollEl.hidden = !hasGrid;
    if (!theadEl || !tbodyEl) return;

    theadEl.innerHTML = "";
    tbodyEl.innerHTML = "";

    if (!hasGrid) return;

    if (!t.cols.length) {
      var trSeul = document.createElement("tr");
      trSeul.className = "tab-suivi-head-labels";
      trSeul.appendChild(creerEnteteEleve());
      theadEl.appendChild(trSeul);
    }

    if (t.cols.length) {
      var trHead = document.createElement("tr");
      trHead.className = "tab-suivi-head-main";

      trHead.appendChild(creerEnteteEleve());

      t.cols.forEach(function (col) {
        var th = document.createElement("th");
        th.className =
          "tab-suivi-th tab-suivi-th--col" + (col.type === "calc" ? " tab-suivi-th--calc" : "");
        th.scope = "col";
        th.setAttribute("data-col-id", col.id);

        var stack = document.createElement("div");
        stack.className = "tab-suivi-col-head";

        var btnFill = document.createElement("button");
        btnFill.type = "button";
        btnFill.className = "tab-suivi-col-fill";
        btnFill.setAttribute("aria-label", "Modifier la colonne « " + (col.label || "") + " »");
        btnFill.textContent = "▼";
        btnFill.addEventListener("click", function () {
          ouvrirDialogColonne(col.id);
        });
        stack.appendChild(btnFill);

        var span = document.createElement("span");
        span.className = "tab-suivi-col-title";
        span.textContent = col.label || "";
        stack.appendChild(span);

        th.appendChild(stack);
        trHead.appendChild(th);
      });

      theadEl.appendChild(trHead);

      var trStats = document.createElement("tr");
      trStats.className = "tab-suivi-head-stats";

      var thStatNom = document.createElement("th");
      thStatNom.className = "tab-suivi-th tab-suivi-th--nom tab-suivi-th--stats tab-suivi-th--nom-vide";
      thStatNom.scope = "col";
      trStats.appendChild(thStatNom);

      t.cols.forEach(function (col) {
        var thS = document.createElement("th");
        thS.className = "tab-suivi-th tab-suivi-th--col tab-suivi-th--stats";
        thS.scope = "col";
        thS.setAttribute("data-col-id", col.id);
        thS.textContent = syntheseColonne(t, col);
        trStats.appendChild(thS);
      });

      theadEl.appendChild(trStats);
    }

    t.rows.forEach(function (row, rowIndex) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-row-id", row.id);

      var tdNom = document.createElement("td");
      tdNom.className = "tab-suivi-td tab-suivi-td--nom";

      var nomWrap = document.createElement("div");
      nomWrap.className = "tab-suivi-nom-wrap";

      nomWrap.appendChild(creerBoutonIconeEleve(t, row));
      nomWrap.appendChild(creerBoutonOubliTenue(row));

      var nomLabel = document.createElement("span");
      nomLabel.className = "tab-suivi-nom-label";
      nomLabel.textContent = labelEleveRow(row);
      nomWrap.appendChild(nomLabel);

      tdNom.appendChild(nomWrap);
      tr.appendChild(tdNom);

      t.cols.forEach(function (col) {
        var td = document.createElement("td");
        td.className = "tab-suivi-td tab-suivi-td--cell";
        td.setAttribute("data-col-id", col.id);

        if (col.type === "calc") {
          var spanCalc = document.createElement("span");
          spanCalc.className = "tab-suivi-cell-calc";
          var cv = valeurCalculee(t, row.id, col);
          spanCalc.textContent =
            cv === null || cv === undefined || isNaN(cv)
              ? "—"
              : String(cv).replace(".", ",");
          td.appendChild(spanCalc);
        } else if (col.type === "check") {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tab-suivi-check";
          var val = getCell(t, row.id, col.id);
          if (val === true) {
            btn.classList.add("tab-suivi-check--ok");
            btn.textContent = "✓";
          } else if (val === false) {
            btn.classList.add("tab-suivi-check--ko");
            btn.textContent = "✗";
          } else {
            btn.classList.add("tab-suivi-check--vide");
            btn.textContent = "·";
          }
          btn.addEventListener("click", function () {
            var cur = getCell(t, row.id, col.id);
            var next;
            if (cur === true) next = false;
            else if (cur === false) next = null;
            else next = true;
            setCell(t, row.id, col.id, next);
            majStatsColonneDom(col.id, syntheseColonne(t, col));
            if (next === true) {
              btn.className = "tab-suivi-check tab-suivi-check--ok";
              btn.textContent = "✓";
            } else if (next === false) {
              btn.className = "tab-suivi-check tab-suivi-check--ko";
              btn.textContent = "✗";
            } else {
              btn.className = "tab-suivi-check tab-suivi-check--vide";
              btn.textContent = "·";
            }
            planifierSauvegarde();
          });
          td.appendChild(btn);
        } else {
          var num = document.createElement("input");
          num.type = "number";
          num.className = "tab-suivi-cell-input";
          num.inputMode = "decimal";
          num.setAttribute("data-col-id", col.id);
          var nv = getCell(t, row.id, col.id);
          num.value = nv === null || nv === undefined || nv === "" ? "" : String(nv);
          num.addEventListener("change", function () {
            appliquerValeurDepuisInput(num, t, row, col);
          });
          num.addEventListener("keydown", function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            appliquerValeurDepuisInput(num, t, row, col);
            focusCelluleNombre(rowIndex + 1, col.id);
          });
          td.appendChild(num);
        }

        tr.appendChild(td);
      });

      tbodyEl.appendChild(tr);
    });

    if (scrollVersColId) defilerVersColonne(scrollVersColId);
  }

  function toutRafraichir() {
    majSelectTableaux();
    rendreGrille();
  }

  function definirActif(id) {
    actifId = id;
    sauverActifIdLocal(id);
    toutRafraichir();
  }

  function ajouterColonne(type, scrollTo, options) {
    var t = getActif();
    if (!t) return null;
    options = options || {};
    if (type !== "check" && type !== "number" && type !== "calc") return null;
    var col = {
      id: genererId("col"),
      label: labelColonneDefaut(t),
      type: type,
    };
    if (type === "calc") {
      col.calcOp = options.calcOp === "avg" ? "avg" : "sum";
      col.sourceIds = (options.sourceIds || []).slice();
      col.label = labelColonneCalcDefaut(t, col.calcOp, col.sourceIds);
    }
    t.cols.push(col);
    rendreGrille(scrollTo ? col.id : null);
    planifierSauvegarde();
    return col;
  }

  function supprimerColonne(t, colId) {
    t.cols = t.cols.filter(function (c) {
      return c.id !== colId;
    });
    t.cols.forEach(function (c) {
      if (c.type === "calc" && Array.isArray(c.sourceIds)) {
        c.sourceIds = c.sourceIds.filter(function (sid) {
          return sid !== colId;
        });
      }
    });
    t.cols = t.cols.filter(function (c) {
      return c.type !== "calc" || (c.sourceIds && c.sourceIds.length > 0);
    });
    Object.keys(t.cells).forEach(function (k) {
      if (k.slice(-(colId.length + 1)) === ":" + colId) delete t.cells[k];
    });
  }

  function remplirColonneEntiere(colId, valeur) {
    var t = getActif();
    if (!t) return;
    var col = t.cols.filter(function (c) {
      return c.id === colId;
    })[0];
    if (!col) return;
    t.rows.forEach(function (row) {
      if (col.type === "check") {
        setCell(t, row.id, col.id, valeur);
      } else {
        setCell(t, row.id, col.id, valeur);
      }
    });
    rendreGrille();
    t.cols.forEach(function (c) {
      if (c.type === "calc") majStatsColonneDom(c.id, syntheseColonne(t, c));
    });
    planifierSauvegarde();
    montrerOk("Colonne « " + (col.label || "") + " » mise à jour pour tous les élèves.");
  }

  function fermerDialogGestionSansPrompt() {
    if (dialogGestion && dialogGestion.open) dialogGestion.close();
    rendreGrille();
    planifierSauvegarde();
  }

  function libelleTriSens(par, desc) {
    if (par === "colonne") {
      return desc ? "Décroissant (↓)" : "Croissant (↑)";
    }
    return desc ? "Décroissant (Z → A)" : "Croissant (A → Z)";
  }

  function majAffichageDialogTri() {
    var t = getActif();
    if (!t) return;
    var par = dlgTriPar ? dlgTriPar.value : "nom";
    var parColonne = par === "colonne";

    if (dlgTriColonneWrap) dlgTriColonneWrap.hidden = !parColonne;
    if (dlgTriColonne) {
      dlgTriColonne.innerHTML = "";
      t.cols.forEach(function (col) {
        var opt = document.createElement("option");
        opt.value = col.id;
        opt.textContent = col.label || "Colonne";
        dlgTriColonne.appendChild(opt);
      });
      var sansCol = !t.cols.length;
      if (dlgTriColonne) dlgTriColonne.hidden = sansCol;
      if (dlgTriColonneEmpty) dlgTriColonneEmpty.hidden = !sansCol;
    }

    if (btnTriSens) {
      btnTriSens.textContent = libelleTriSens(par, triSensDesc);
    }

    var btnAppliquer = document.getElementById("btn-tri-appliquer");
    if (btnAppliquer) btnAppliquer.disabled = parColonne && !t.cols.length;
  }

  function ouvrirDialogTri() {
    if (!dialogTri || !dialogTri.showModal) {
      montrerMsg("Fenêtre de tri indisponible sur ce navigateur.");
      return;
    }
    triSensDesc = false;
    if (dlgTriPar) dlgTriPar.value = "nom";
    majAffichageDialogTri();
    dialogTri.showModal();
  }

  function appliquerTriDialog() {
    var t = getActif();
    if (!t || !dlgTriPar) return;
    var par = dlgTriPar.value;
    if (par === "colonne") {
      if (!t.cols.length) {
        montrerMsg("Ajoutez une colonne avant de trier par colonne.");
        return;
      }
      if (!dlgTriColonne || !dlgTriColonne.value) return;
      trierLignes(t, "col:" + dlgTriColonne.value, triSensDesc);
    } else {
      trierLignes(t, par, triSensDesc);
    }
    if (dialogTri && dialogTri.open) dialogTri.close();
    rendreGrille();
    planifierSauvegarde();
    montrerOk("Tri appliqué.");
  }

  function ouvrirDialogCalc() {
    var t = getActif();
    if (!t || !dialogCalc || !dlgCalcSources) return;
    var sources = colonnesNombreSources(t);
    dlgCalcSources.innerHTML = "";
    if (dlgCalcSourcesEmpty) dlgCalcSourcesEmpty.hidden = sources.length > 0;
    var btnVal = document.getElementById("btn-calc-valider");
    if (btnVal) btnVal.disabled = !sources.length;

    sources.forEach(function (col) {
      var lab = document.createElement("label");
      lab.className = "tab-suivi-calc-source";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = col.id;
      cb.name = "calc-source";
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(col.label || "Colonne"));
      dlgCalcSources.appendChild(lab);
    });

    var sumRadio = dialogCalc.querySelector('input[name="calc-op"][value="sum"]');
    if (sumRadio) sumRadio.checked = true;
    dialogCalc.showModal();
  }

  function creerColonneCalc() {
    var t = getActif();
    if (!t || !dialogCalc || !dlgCalcSources) return null;
    var opEl = dialogCalc.querySelector('input[name="calc-op"]:checked');
    var calcOp = opEl && opEl.value === "avg" ? "avg" : "sum";
    var sourceIds = [];
    dlgCalcSources.querySelectorAll('input[name="calc-source"]:checked').forEach(function (cb) {
      if (cb.value) sourceIds.push(cb.value);
    });
    if (!sourceIds.length) {
      montrerMsg("Cochez au moins une colonne chiffre à inclure dans le calcul.");
      return null;
    }
    dialogCalc.close();
    fermerDialogGestionSansPrompt();
    var col = ajouterColonne("calc", true, { calcOp: calcOp, sourceIds: sourceIds });
    if (col) {
      setTimeout(function () {
        demanderNomColonne(col);
      }, 80);
    }
    return col;
  }

  function indexColonne(t, colId) {
    for (var i = 0; i < t.cols.length; i++) {
      if (t.cols[i].id === colId) return i;
    }
    return -1;
  }

  function deplacerColonne(t, colId, delta) {
    var idx = indexColonne(t, colId);
    if (idx < 0) return false;
    var next = idx + delta;
    if (next < 0 || next >= t.cols.length) return false;
    var tmp = t.cols[idx];
    t.cols[idx] = t.cols[next];
    t.cols[next] = tmp;
    rendreGrille(colId);
    planifierSauvegarde();
    return true;
  }

  function majBoutonsDialogColonne(t, colId) {
    var idx = indexColonne(t, colId);
    if (btnColGauche) btnColGauche.disabled = idx <= 0;
    if (btnColDroite) btnColDroite.disabled = idx < 0 || idx >= t.cols.length - 1;
  }

  function typeColonneLabel(col) {
    if (col.type === "check") return "Présence / rendu (✓ et ✗)";
    if (col.type === "calc") {
      return (col.calcOp === "avg" ? "Moyenne" : "Somme") + " calculée automatiquement";
    }
    return "Note / nombre";
  }

  function rendreRemplirDialogColonne(t, col) {
    if (!dlgColRemplirBody) return;
    dlgColRemplirBody.innerHTML = "";
    if (col.type === "check") {
      [
        { label: "Tout marquer ✓", val: true, cls: "tab-suivi-remplir-ok" },
        { label: "Tout marquer ✗", val: false, cls: "tab-suivi-remplir-ko" },
        { label: "Tout effacer", val: null, cls: "" },
      ].forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn--ghost tab-suivi-remplir-opt " + opt.cls;
        b.textContent = opt.label;
        b.addEventListener("click", function () {
          remplirColonneEntiere(col.id, opt.val);
        });
        dlgColRemplirBody.appendChild(b);
      });
      return;
    }
    if (col.type === "number") {
      var fg = document.createElement("div");
      fg.className = "field-group";
      var lbl = document.createElement("label");
      lbl.className = "field-label";
      lbl.setAttribute("for", "dlg-col-remplir-valeur");
      lbl.textContent = "Valeur pour tous les élèves";
      var inp = document.createElement("input");
      inp.type = "number";
      inp.id = "dlg-col-remplir-valeur";
      inp.className = "tab-suivi-remplir-input";
      inp.inputMode = "decimal";
      var btnAppliquer = document.createElement("button");
      btnAppliquer.type = "button";
      btnAppliquer.className = "btn btn--primary";
      btnAppliquer.textContent = "Appliquer à tous";
      btnAppliquer.addEventListener("click", function () {
        remplirColonneEntiere(col.id, parseValeurNombre(inp.value));
      });
      fg.appendChild(lbl);
      fg.appendChild(inp);
      dlgColRemplirBody.appendChild(fg);
      dlgColRemplirBody.appendChild(btnAppliquer);
    }
  }

  function ouvrirDialogColonne(colId) {
    var t = getActif();
    if (!t || !dialogColonne) return;
    var col = t.cols.filter(function (c) {
      return c.id === colId;
    })[0];
    if (!col) return;

    colonneDialogId = colId;
    if (dlgColTitre) dlgColTitre.textContent = "Colonne « " + (col.label || "") + " »";
    if (dlgColTypeHint) dlgColTypeHint.textContent = typeColonneLabel(col);
    if (dlgColNom) dlgColNom.value = col.label || "";

    var peutRemplir = col.type !== "calc" && t.rows.length > 0;
    if (dlgColRemplirSection) dlgColRemplirSection.hidden = !peutRemplir;
    if (dlgColCalcHint) dlgColCalcHint.hidden = col.type !== "calc";
    if (col.type === "calc" && dlgColCalcHint && !t.rows.length) {
      dlgColCalcHint.textContent =
        "Colonne calculée automatiquement. Ajoutez des élèves pour voir les résultats.";
    } else if (dlgColCalcHint && col.type === "calc") {
      dlgColCalcHint.textContent =
        "Colonne calculée automatiquement — les valeurs ne peuvent pas être remplies à la main.";
    }
    if (!peutRemplir && col.type !== "calc" && dlgColRemplirSection) {
      if (dlgColRemplirBody) {
        dlgColRemplirBody.innerHTML = "";
        var p = document.createElement("p");
        p.className = "tab-suivi-dialog__empty";
        p.textContent = "Ajoutez des élèves pour remplir cette colonne.";
        dlgColRemplirSection.hidden = false;
        dlgColRemplirBody.appendChild(p);
      }
    } else if (peutRemplir) {
      rendreRemplirDialogColonne(t, col);
    }

    majBoutonsDialogColonne(t, colId);
    dialogColonne.showModal();
    if (dlgColNom) {
      setTimeout(function () {
        dlgColNom.focus();
        dlgColNom.select();
      }, 50);
    }
  }

  function enregistrerDialogColonne() {
    var t = getActif();
    if (!t || !colonneDialogId) return;
    var col = t.cols.filter(function (c) {
      return c.id === colonneDialogId;
    })[0];
    if (col && dlgColNom) {
      col.label = normaliserNom(dlgColNom.value) || col.label;
    }
    if (dialogColonne && dialogColonne.open) dialogColonne.close();
    colonneDialogId = null;
    rendreGrille();
    planifierSauvegarde();
    montrerOk("Colonne mise à jour.");
  }

  function ouvrirDialogGestion() {
    if (!dialogGestion || !dialogGestion.showModal) {
      montrerMsg("Fenêtre indisponible sur ce navigateur.");
      return;
    }
    dialogGestion.showModal();
  }

  function fermerDialogGestion() {
    if (dialogGestion && dialogGestion.open) dialogGestion.close();
  }

  function csvEscapeCell(val) {
    var s = String(val == null ? "" : val);
    if (/[;\r\n"]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function telechargerBlob(filename, blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function nomFichierExport(ext) {
    var t = getActif();
    var base = (t && t.titre ? t.titre : "appel-et-notes")
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);
    var d = new Date();
    var y = d.getFullYear();
    var mo = d.getMonth() + 1;
    var day = d.getDate();
    var m = mo < 10 ? "0" + mo : String(mo);
    var da = day < 10 ? "0" + day : String(day);
    return base + "-" + y + "-" + m + "-" + da + "." + ext;
  }

  function donneesExport() {
    var t = getActif();
    if (!t) return null;
    if (!t.rows.length && !t.cols.length) {
      montrerMsg("Rien à exporter : ajoutez des élèves ou des colonnes.");
      return null;
    }
    return t;
  }

  function exporterCsv() {
    var t = donneesExport();
    if (!t) return;
    montrerMsg("");

    var header = ["Élève"];
    t.cols.forEach(function (col) {
      header.push(col.label || "");
    });
    var lines = [header.map(csvEscapeCell).join(";")];

    t.rows.forEach(function (row) {
      var line = [labelEleveAvecIcone(row, false)];
      t.cols.forEach(function (col) {
        line.push(valeurVersTexte(t, row.id, col, false));
      });
      lines.push(line.map(csvEscapeCell).join(";"));
    });

    var synth = [""];
    t.cols.forEach(function (col) {
      synth.push(syntheseColonne(t, col));
    });
    lines.push(synth.map(csvEscapeCell).join(";"));

    var bom = "\uFEFF";
    var blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    telechargerBlob(nomFichierExport("csv"), blob);
    montrerOk("Export CSV téléchargé.");
  }

  function exporterPdf() {
    var t = donneesExport();
    if (!t) return;
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Impossible de charger jsPDF. Réessayez ou exportez en CSV.");
      return;
    }
    montrerMsg("");

    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    var margin = 14;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - 2 * margin;
    var headerH = 22;
    var rowH = 6.5;
    var wNom = Math.min(58, contentW * 0.32);
    var wColMin = 13;
    var maxColsPage = Math.max(1, Math.floor((contentW - wNom) / wColMin));
    var colChunks = [];
    var ci;
    for (ci = 0; ci < t.cols.length; ci += maxColsPage) {
      colChunks.push(t.cols.slice(ci, ci + maxColsPage));
    }
    if (!colChunks.length) colChunks.push([]);

    var tableX = margin;
    var y = margin;

    function rgb(c) {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setTextColor(c[0], c[1], c[2]);
    }

    function drawPageHeader(suiteLabel) {
      rgb([15, 118, 110]);
      doc.rect(0, 0, pageW, headerH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(suiteLabel ? 13 : 15);
      doc.text((t.titre || "Appel et notes").slice(0, 65), margin, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      var meta =
        new Date().toLocaleString("fr-FR") +
        "  ·  " +
        libelleNbEleves(t.rows.length) +
        (suiteLabel ? "  ·  " + suiteLabel : "");
      doc.text(meta, margin, 16);
      y = headerH + 7;
    }

    function newPage(suiteLabel) {
      doc.addPage();
      drawPageHeader(suiteLabel);
    }

    function drawTableRow(cells, style, rowIndex, wCol) {
      var x = tableX;
      var tableW = wNom + wCol * Math.max(0, cells.length - 1);
      var bg;
      if (style === "head") bg = [15, 118, 110];
      else if (style === "stats") bg = [204, 251, 241];
      else bg = rowIndex % 2 === 0 ? [255, 255, 255] : [248, 250, 252];

      rgb(bg);
      doc.rect(tableX, y - rowH + 2.2, tableW, rowH, "F");
      rgb([226, 232, 240]);
      doc.setLineWidth(0.12);
      doc.rect(tableX, y - rowH + 2.2, tableW, rowH, "S");

      if (style === "head") doc.setTextColor(255, 255, 255);
      else if (style === "stats") doc.setTextColor(15, 118, 110);
      else doc.setTextColor(15, 23, 42);

      doc.setFont("helvetica", style === "head" || style === "stats" ? "bold" : "normal");
      doc.setFontSize(style === "head" ? 8 : 7.5);

      var maxNom = Math.floor(wNom / 2.1);
      var maxCol = Math.max(3, Math.floor(wCol / 2.1));
      doc.text(String(cells[0] || "").slice(0, maxNom), x + 2, y);
      x += wNom;
      for (var i = 1; i < cells.length; i++) {
        var txt = String(cells[i] || "");
        doc.text(txt.slice(0, maxCol), x + wCol / 2, y, { align: "center" });
        x += wCol;
      }
      y += rowH;
    }

    function dessinerEnteteTable(cols, wCol) {
      var head = ["Élève"];
      cols.forEach(function (col) {
        head.push(col.label || "");
      });
      drawTableRow(head, "head", 0, wCol);
      var syn = [""];
      cols.forEach(function (col) {
        syn.push(syntheseColonne(t, col));
      });
      drawTableRow(syn, "stats", 0, wCol);
      y += 0.5;
    }

    function drawBlocColonnes(cols, pageIdx, totalPages) {
      var n = Math.max(cols.length, 1);
      var wCol = (contentW - wNom) / n;
      var suiteCols =
        totalPages > 1 ? "colonnes " + (pageIdx + 1) + "/" + totalPages : "";
      if (pageIdx === 0 && y < headerH + 5) drawPageHeader(suiteCols);
      else newPage(suiteCols);

      dessinerEnteteTable(cols, wCol);

      t.rows.forEach(function (row, ri) {
        if (y + rowH > pageH - margin - 9) {
          newPage(suiteCols + " (suite)");
          dessinerEnteteTable(cols, wCol);
        }
        var cells = [labelEleveAvecIcone(row, true)];
        cols.forEach(function (col) {
          cells.push(valeurVersTexte(t, row.id, col, true));
        });
        drawTableRow(cells, "body", ri, wCol);
      });
      y += 3;
    }

    colChunks.forEach(function (chunk, idx) {
      drawBlocColonnes(chunk, idx, colChunks.length);
    });

    var total = doc.internal.getNumberOfPages();
    for (var p = 1; p <= total; p++) {
      doc.setPage(p);
      rgb([148, 163, 184]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Outils EPS — Appel et notes", margin, pageH - 6);
      doc.text("Page " + p + " / " + total, pageW - margin, pageH - 6, { align: "right" });
    }

    try {
      telechargerBlob(nomFichierExport("pdf"), doc.output("blob"));
      montrerOk("Export PDF téléchargé.");
    } catch (err) {
      montrerMsg("Export PDF impossible. Utilisez l’export CSV.");
    }
  }

  function validerListeManuelle() {
    var t = getActif();
    if (!t) return;
    var lignes = parserTextarea();
    if (!lignes.length) {
      montrerMsg("Saisissez au moins un nom (un par ligne).");
      return;
    }
    var ajoutes = ajouterLignes(t, lignes);
    if (listeBruteEl) listeBruteEl.value = "";
    rendreGrille();
    planifierSauvegarde();
    montrerMsg("");
    if (ajoutes) montrerOk(ajoutes + " élève(s) ajouté(s).");
    else montrerMsg("Aucun nouveau nom (doublons ignorés).");
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.");
      return;
    }
    var t = getActif();
    if (!t) return;
    ClassImport.open({
      title: "Importer des élèves",
      hint: "Choisissez une classe puis cochez les élèves à ajouter au tableau.",
      onConfirm: function (eleves, classe) {
        var entrees = [];
        eleves.forEach(function (e) {
          var l = eleveVersLabel(e);
          if (l) entrees.push({ label: l, meta: metaDepuisEleve(e, classe.nom, classe.id) });
        });
        var ajoutes = ajouterLignes(t, entrees);
        rendreGrille();
        planifierSauvegarde();
        if (ajoutes) {
          montrerOk(ajoutes + " élève(s) importé(s) depuis « " + classe.nom + " ».");
        } else {
          montrerMsg("Aucun nouvel élève (doublons ignorés).");
        }
      },
    });
  }

  function nouveauTableau() {
    var tab = creerTableauVide("Nouvel appel");
    tableaux.unshift(tab);
    definirActif(tab.id);
    planifierSauvegarde();
    montrerOk("Nouvelle feuille créée.");
  }

  function supprimerTableauActif() {
    if (tableaux.length <= 1) {
      montrerMsg("Il doit rester au moins une feuille.");
      return;
    }
    var t = getActif();
    if (!t) return;
    if (!confirm("Supprimer la feuille « " + (t.titre || "") + " » ?")) return;
    tableaux = tableaux.filter(function (x) {
      return x.id !== t.id;
    });
    actifId = tableaux[0].id;
    sauverActifIdLocal(actifId);
    persisterTableaux();
    toutRafraichir();
    montrerOk("Feuille supprimée.");
  }

  function onTitreChange() {
    var t = getActif();
    if (!t || !titreEl) return;
    t.titre = normaliserNom(titreEl.value) || t.titre;
    majSelectTableaux();
    planifierSauvegarde();
  }

  function onSelectChange() {
    if (!selectEl) return;
    var id = selectEl.value;
    if (!id || id === actifId) return;
    persisterTableaux();
    definirActif(id);
    montrerMsg("");
    montrerOk("");
  }

  function init() {
    if (typeof DataManager === "undefined") {
      montrerMsg("Enregistrement indisponible sur cet appareil.");
      return;
    }

    DataManager.ready
      .then(function () {
        return DataManager.getTableauxSuivi();
      })
      .then(function (liste) {
        tableaux = (liste || []).map(normaliserTableau).filter(Boolean);
        if (!tableaux.length) {
          tableaux.push(creerTableauVide("Mon appel"));
        }
        var saved = chargerActifIdLocal();
        var found = tableaux.some(function (t) {
          return t.id === saved;
        });
        actifId = found ? saved : tableaux[0].id;
        sauverActifIdLocal(actifId);
        pret = true;
        toutRafraichir();
        return DataManager.saveTableauxSuivi(tableaux);
      })
      .catch(function (err) {
        montrerMsg(err && err.message ? err.message : "Impossible de charger les tableaux.");
      });
  }

  document.querySelectorAll("[data-dlg-col-type]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var type = btn.getAttribute("data-dlg-col-type");
      if (type === "calc") {
        if (dialogGestion && dialogGestion.open) dialogGestion.close();
        ouvrirDialogCalc();
        return;
      }
      var col = ajouterColonne(type, true);
      if (!col) return;
      fermerDialogGestionSansPrompt();
      if (type === "number") {
        setTimeout(function () {
          demanderNomColonne(col);
        }, 80);
      } else {
        montrerOk("Colonne « " + col.label + " » ajoutée.");
      }
    });
  });

  var btnGestion = document.getElementById("btn-gestion-cols");
  if (btnGestion) btnGestion.addEventListener("click", ouvrirDialogGestion);

  var btnDialogGestionClose = document.getElementById("btn-dialog-gestion-close");
  if (btnDialogGestionClose) {
    btnDialogGestionClose.addEventListener("click", fermerDialogGestion);
  }

  var btnDialogColonneClose = document.getElementById("btn-dialog-colonne-close");
  if (btnDialogColonneClose && dialogColonne) {
    btnDialogColonneClose.addEventListener("click", function () {
      colonneDialogId = null;
      dialogColonne.close();
    });
  }

  var formDlg = document.getElementById("form-tab-suivi-gestion");
  if (formDlg) {
    formDlg.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  var btnTriEleves = document.getElementById("btn-tri-eleves");
  if (btnTriEleves) btnTriEleves.addEventListener("click", ouvrirDialogTri);

  var btnDialogTriClose = document.getElementById("btn-dialog-tri-close");
  if (btnDialogTriClose && dialogTri) {
    btnDialogTriClose.addEventListener("click", function () {
      dialogTri.close();
    });
  }

  var btnTriAnnuler = document.getElementById("btn-tri-annuler");
  if (btnTriAnnuler && dialogTri) {
    btnTriAnnuler.addEventListener("click", function () {
      dialogTri.close();
    });
  }

  if (dlgTriPar) {
    dlgTriPar.addEventListener("change", majAffichageDialogTri);
  }

  if (btnTriSens) {
    btnTriSens.addEventListener("click", function () {
      triSensDesc = !triSensDesc;
      var par = dlgTriPar ? dlgTriPar.value : "nom";
      btnTriSens.textContent = libelleTriSens(par, triSensDesc);
    });
  }

  var formTri = document.getElementById("form-tab-suivi-tri");
  if (formTri) {
    formTri.addEventListener("submit", function (e) {
      e.preventDefault();
      appliquerTriDialog();
    });
  }

  var btnDialogCalcClose = document.getElementById("btn-dialog-calc-close");
  if (btnDialogCalcClose && dialogCalc) {
    btnDialogCalcClose.addEventListener("click", function () {
      dialogCalc.close();
    });
  }

  var btnCalcAnnuler = document.getElementById("btn-calc-annuler");
  if (btnCalcAnnuler && dialogCalc) {
    btnCalcAnnuler.addEventListener("click", function () {
      dialogCalc.close();
    });
  }

  var formCalc = document.getElementById("form-tab-suivi-calc");
  if (formCalc) {
    formCalc.addEventListener("submit", function (e) {
      e.preventDefault();
      creerColonneCalc();
    });
  }

  var btnColAnnuler = document.getElementById("btn-col-annuler");
  if (btnColAnnuler && dialogColonne) {
    btnColAnnuler.addEventListener("click", function () {
      colonneDialogId = null;
      dialogColonne.close();
    });
  }

  var formColonne = document.getElementById("form-tab-suivi-colonne");
  if (formColonne) {
    formColonne.addEventListener("submit", function (e) {
      e.preventDefault();
      enregistrerDialogColonne();
    });
  }

  if (btnColGauche) {
    btnColGauche.addEventListener("click", function () {
      var t = getActif();
      if (!t || !colonneDialogId) return;
      if (deplacerColonne(t, colonneDialogId, -1)) {
        majBoutonsDialogColonne(t, colonneDialogId);
        var col = t.cols.filter(function (c) {
          return c.id === colonneDialogId;
        })[0];
        if (col && dlgColTitre) dlgColTitre.textContent = "Colonne « " + (col.label || "") + " »";
      }
    });
  }

  if (btnColDroite) {
    btnColDroite.addEventListener("click", function () {
      var t = getActif();
      if (!t || !colonneDialogId) return;
      if (deplacerColonne(t, colonneDialogId, 1)) {
        majBoutonsDialogColonne(t, colonneDialogId);
        var col = t.cols.filter(function (c) {
          return c.id === colonneDialogId;
        })[0];
        if (col && dlgColTitre) dlgColTitre.textContent = "Colonne « " + (col.label || "") + " »";
      }
    });
  }

  var btnDialogIconeClose = document.getElementById("btn-dialog-icone-close");
  if (btnDialogIconeClose && dialogIcone) {
    btnDialogIconeClose.addEventListener("click", function () {
      iconeEleveRowId = null;
      dialogIcone.close();
    });
  }

  var btnIconeAnnuler = document.getElementById("btn-icone-annuler");
  if (btnIconeAnnuler && dialogIcone) {
    btnIconeAnnuler.addEventListener("click", function () {
      iconeEleveRowId = null;
      dialogIcone.close();
    });
  }

  var formIcone = document.getElementById("form-tab-suivi-icone");
  if (formIcone) {
    formIcone.addEventListener("submit", function (e) {
      e.preventDefault();
      if (dialogIcone && dialogIcone.open) dialogIcone.close();
    });
  }

  var btnDialogElevesClose = document.getElementById("btn-dialog-eleves-close");
  if (btnDialogElevesClose) btnDialogElevesClose.addEventListener("click", fermerDialogEleves);

  var btnElevesFermer = document.getElementById("btn-eleves-fermer");
  if (btnElevesFermer) btnElevesFermer.addEventListener("click", fermerDialogEleves);

  function rafraichirLibellesEleveCourant() {
    var t = getActif();
    if (!t || !elevesDialogRowId) return;
    var row = getRowParId(t, elevesDialogRowId);
    if (!row || !dlgElevesNom || !dlgElevesPrenom) return;
    synchroniserLabelRow(row, dlgElevesNom.value, dlgElevesPrenom.value);
    var label = labelEleveRow(row);
    if (dlgElevesSelect) {
      var opt = null;
      var opts = dlgElevesSelect.options;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].value === elevesDialogRowId) {
          opt = opts[i];
          break;
        }
      }
      if (opt) opt.textContent = label;
    }
    var titre = document.getElementById("dlg-eleves-detail-title");
    if (titre) titre.textContent = label;
    planifierSauvegarde();
  }

  if (dlgElevesSelect) {
    dlgElevesSelect.addEventListener("change", function () {
      if (dlgElevesSelect.value) selectionnerEleveDialog(dlgElevesSelect.value);
    });
  }

  if (dlgElevesNom) dlgElevesNom.addEventListener("change", rafraichirLibellesEleveCourant);
  if (dlgElevesPrenom) dlgElevesPrenom.addEventListener("change", rafraichirLibellesEleveCourant);

  if (btnElevesRetirer) {
    btnElevesRetirer.addEventListener("click", retirerEleveDialog);
  }

  var formEleves = document.getElementById("form-tab-suivi-eleves");
  if (formEleves) {
    formEleves.addEventListener("submit", function (e) {
      e.preventDefault();
      fermerDialogEleves();
    });
  }

  var btnDialogOubliClose = document.getElementById("btn-dialog-oubli-close");
  if (btnDialogOubliClose) btnDialogOubliClose.addEventListener("click", fermerDialogOubli);

  var btnOubliAnnuler = document.getElementById("btn-oubli-annuler");
  if (btnOubliAnnuler) btnOubliAnnuler.addEventListener("click", fermerDialogOubli);

  var btnOubliAjouter = document.getElementById("btn-oubli-ajouter");
  if (btnOubliAjouter) {
    btnOubliAjouter.addEventListener("click", function () {
      var row = getRowOubliActive();
      if (!row) return;
      btnOubliAjouter.disabled = true;
      enregistrerOubliTenue(row).then(
        function () {
          btnOubliAjouter.disabled = false;
        },
        function () {
          btnOubliAjouter.disabled = false;
        }
      );
    });
  }

  var formOubli = document.getElementById("form-tab-suivi-oubli");
  if (formOubli) {
    formOubli.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  if (btnColSupprimer) {
    btnColSupprimer.addEventListener("click", function () {
      var t = getActif();
      if (!t || !colonneDialogId) return;
      var col = t.cols.filter(function (c) {
        return c.id === colonneDialogId;
      })[0];
      if (!col) return;
      if (!confirm("Supprimer la colonne « " + (col.label || "") + " » ?")) return;
      supprimerColonne(t, colonneDialogId);
      colonneDialogId = null;
      if (dialogColonne && dialogColonne.open) dialogColonne.close();
      rendreGrille();
      planifierSauvegarde();
      montrerOk("Colonne supprimée.");
    });
  }

  var btnCsv = document.getElementById("btn-export-csv-tab");
  if (btnCsv) btnCsv.addEventListener("click", exporterCsv);

  var btnPdf = document.getElementById("btn-export-pdf-tab");
  if (btnPdf) btnPdf.addEventListener("click", exporterPdf);

  var btnImport = document.getElementById("btn-import-classe-tab");
  if (btnImport) btnImport.addEventListener("click", importerClasse);

  var btnValider = document.getElementById("btn-valider-liste-tab");
  if (btnValider) btnValider.addEventListener("click", validerListeManuelle);

  var btnNouveau = document.getElementById("btn-nouveau-tableau");
  if (btnNouveau) btnNouveau.addEventListener("click", nouveauTableau);

  var btnSup = document.getElementById("btn-supprimer-tableau");
  if (btnSup) btnSup.addEventListener("click", supprimerTableauActif);

  if (titreEl) titreEl.addEventListener("change", onTitreChange);
  if (selectEl) selectEl.addEventListener("change", onSelectChange);

  init();
})();
