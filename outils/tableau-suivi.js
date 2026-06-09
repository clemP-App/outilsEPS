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
  var cacheElevesParId = null;

  var INFO_ELEVE_CHAMPS = [
    { id: "equipe", label: "Équipe" },
    { id: "niveau", label: "Niveau" },
    { id: "sexe", label: "Sexe" },
    { id: "vma", label: "VMA (km/h)" },
  ];

  var EQUIPE_COULEURS_FALLBACK = [
    "#ef4444",
    "#2563eb",
    "#16a34a",
    "#ca8a04",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#db2777",
    "#64748b",
    "#0d9488",
  ];

  var msgEl = document.getElementById("tab-suivi-msg");
  var okEl = document.getElementById("tab-suivi-ok");
  var selectEl = document.getElementById("select-tableau");
  var titreEl = document.getElementById("titre-tableau");
  var listeBruteEl = document.getElementById("liste-brute-tab");
  var nbElevesEl = document.getElementById("tab-suivi-nb-eleves");

  var listeSaisieMeta =
    typeof ListeSaisieUi !== "undefined" && listeBruteEl
      ? ListeSaisieUi.bind({
          metaEl: document.getElementById("liste-brute-tab-meta"),
          textareaEl: listeBruteEl,
          getSessionCount: function () {
            var t = getActif();
            return t && t.rows ? t.rows.length : 0;
          },
          sessionSingular: "élève",
          sessionPlural: "élèves",
        })
      : null;

  if (typeof ListeManuellePanel !== "undefined" && listeBruteEl) {
    ListeManuellePanel.bind({
      toggleBtnId: "btn-ajouter-manuel-tab",
      panelId: "liste-manuelle-panel-tab",
      textareaEl: listeBruteEl,
    });
  }

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
  var dialogRubricCatalog = document.getElementById("dialog-tab-suivi-rubric-catalog");
  var dlgRubricDialogTitle = document.getElementById("dlg-rubric-dialog-title");
  var dlgRubricDialogIntro = document.getElementById("dlg-rubric-dialog-intro");
  var dlgRubricOnlineStatus = document.getElementById("dlg-rubric-online-status");
  var dlgRubricSearchWrap = document.getElementById("dlg-rubric-search-wrap");
  var dlgRubricSearch = document.getElementById("dlg-rubric-search");
  var dlgRubricPageLink = document.getElementById("dlg-rubric-page-link");
  var dlgRubricCatalogSection = document.getElementById("dlg-rubric-catalog-section");
  var dlgRubricEditorSection = document.getElementById("dlg-rubric-editor-section");
  var dlgRubricEditorSectionTitle = document.getElementById("dlg-rubric-editor-section-title");
  var dlgRubricCatalogList = document.getElementById("dlg-rubric-catalog-list");
  var dlgRubricCatalogEmpty = document.getElementById("dlg-rubric-catalog-empty");
  var dlgRubricTitle = document.getElementById("dlg-rubric-title");
  var dlgRubricApsa = document.getElementById("dlg-rubric-apsa");
  var dlgRubricCycle = document.getElementById("dlg-rubric-cycle");
  var dlgRubricNiveau = document.getElementById("dlg-rubric-niveau");
  var dlgRubricEditor = document.getElementById("dlg-rubric-editor");
  var dlgRubricFile = document.getElementById("dlg-rubric-file");
  var btnRubricAddRow = document.getElementById("btn-rubric-add-row");
  var btnRubricAddCol = document.getElementById("btn-rubric-add-col");
  var dlgRubricShare = document.getElementById("dlg-rubric-share");
  var dlgRubricShareWrap = document.getElementById("dlg-rubric-share-wrap");
  var dlgRubricShareReason = document.getElementById("dlg-rubric-share-reason");
  var dlgRubricShareTimer = null;
  var dialogRubricCell = document.getElementById("dialog-tab-suivi-rubric-cell");
  var dlgRubricCellTitle = document.getElementById("dlg-rubric-cell-title");
  var dlgRubricCellMeta = document.getElementById("dlg-rubric-cell-meta");
  var dlgRubricScore = document.getElementById("dlg-rubric-score");
  var dlgRubricGrid = document.getElementById("dlg-rubric-grid");
  var dlgRubricNav = document.getElementById("dlg-rubric-nav");
  var dlgRubricNavCount = document.getElementById("dlg-rubric-nav-count");
  var rubricCellRowId = null;
  var rubricCellColId = null;
  var rubricCellTest = null;
  var rubriquesPersonnelles = [];
  var rubriquesEnLigne = [];
  var rubriqueEdition = null;
  var rubriqueEditionMode = "create";
  var rubriqueEditionColonneId = null;
  var rubriqueEditionInitiale = null;
  var dialogColonne = document.getElementById("dialog-tab-suivi-colonne");
  var dlgColTitre = document.getElementById("dlg-col-titre");
  var dlgColTypeHint = document.getElementById("dlg-col-type-hint");
  var dlgColNom = document.getElementById("dlg-col-nom");
  var dlgColNoteWrap = document.getElementById("dlg-col-note-wrap");
  var dlgColEstNote = document.getElementById("dlg-col-est-note");
  var dlgColMaxWrap = document.getElementById("dlg-col-max-wrap");
  var dlgColMax = document.getElementById("dlg-col-max");
  var dlgColCheckWrap = document.getElementById("dlg-col-check-wrap");
  var dlgColHorsSynthese = document.getElementById("dlg-col-hors-synthese");
  var dlgColRubricWrap = document.getElementById("dlg-col-rubric-wrap");
  var dlgColInfoWrap = document.getElementById("dlg-col-info-wrap");
  var dlgColInfoChamp = document.getElementById("dlg-col-info-champ");
  var dlgColInfoEditable = document.getElementById("dlg-col-info-editable");
  var dlgColInfoHint = document.getElementById("dlg-col-info-hint");
  var dialogInfoEleve = document.getElementById("dialog-tab-suivi-info-eleve");
  var dlgInfoEleveChamp = document.getElementById("dlg-info-eleve-champ");
  var btnColRubricTest = document.getElementById("btn-col-rubric-test");
  var btnColRubricEdit = document.getElementById("btn-col-rubric-edit");
  var btnColRubricPdf = document.getElementById("btn-col-rubric-pdf");
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
  var dlgElevesNaissance = document.getElementById("dlg-eleves-naissance");
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
  var filtreColonnes = "all";
  var colFiltreEl = document.getElementById("tab-suivi-col-filtre");

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

  var PRESENCE_RETARD = "retard";
  var PRESENCE_JUSTIFIE = "justifie";
  var PRESENCE_ATTITUDE = "attitude";
  var PRESENCE_LONG_PRESS_MS = 500;
  var PRESENCE_STATUTS = [
    { id: true, label: "Présent", glyph: "✓", exportGlyph: "✓", cls: "tab-suivi-check--ok" },
    {
      id: PRESENCE_RETARD,
      label: "En retard",
      glyphKind: "clock",
      exportGlyph: "⏱",
      cls: "tab-suivi-check--retard",
    },
    {
      id: PRESENCE_ATTITUDE,
      label: "Souci d’attitude",
      glyph: "!",
      exportGlyph: "!",
      cls: "tab-suivi-check--attitude",
    },
    {
      id: PRESENCE_JUSTIFIE,
      label: "Absent justifié",
      glyphKind: "cross-j",
      exportGlyph: "✗J",
      cls: "tab-suivi-check--justifie",
    },
    { id: false, label: "Absent non justifié", glyph: "✗", exportGlyph: "✗", cls: "tab-suivi-check--ko" },
    { id: null, label: "Effacer", glyph: "·", exportGlyph: "", cls: "tab-suivi-check--vide" },
  ];
  var presenceMenuEl = null;
  var presenceMenuAnchor = null;

  var RUBRIQUES_PARAM_ID = "tableau-suivi-rubriques-v1";
  var RUBRIQUES_CATALOG_URL = "../shared/evaluation-rubrics-catalog.json";
  var RUBRIQUES_SUBMIT_MAIL = "mailto:clement.pignet@gmail.com";
  var RUBRIQUE_MAX_DEFAUT = 20;
  var RUBRIQUE_COULEURS = ["#fb7185", "#fdba74", "#fde68a", "#bbf7d0", "#bfdbfe", "#ddd6fe"];
  var RUBRIQUES_EXEMPLES = [
    {
      id: "ex-cv-lycee",
      title: "CV - presentation orale et ecrite",
      apsa: "Accompagnement personnalise",
      cycle: "lycee",
      niveau: "2de / 1re",
      source: "exemple",
      levels: [
        { id: "l1", label: "Insuffisant", color: "#fb7185" },
        { id: "l2", label: "Fragile", color: "#fdba74" },
        { id: "l3", label: "Satisfaisant", color: "#fde68a" },
        { id: "l4", label: "Excellent", color: "#bbf7d0" },
      ],
      items: [
        {
          id: "i1",
          label: "Mise en page et presentation",
          cells: [
            { text: "Le CV est mal structure et difficile a lire.", points: 0 },
            { text: "La mise en page est basique, certains elements sont difficiles a reperer.", points: 1 },
            { text: "La mise en page est propre et organisee.", points: 2 },
            { text: "La mise en page est esthetique, claire et attire l'attention positivement.", points: 3 },
          ],
        },
        {
          id: "i2",
          label: "Informations personnelles",
          cells: [
            { text: "Des informations essentielles sont manquantes ou inexactes.", points: 0 },
            { text: "Les informations sont presentes mais a preciser.", points: 1 },
            { text: "Les informations necessaires sont correctes et completes.", points: 2 },
            { text: "Les informations sont completes, precises et adaptees.", points: 3 },
          ],
        },
        {
          id: "i3",
          label: "Scolarite",
          cells: [
            { text: "Des informations importantes sont manquantes ou incorrectes.", points: 0 },
            { text: "Les informations sont presentes mais peu detaillees.", points: 1 },
            { text: "Les details sont presents mais peuvent etre ameliores.", points: 2 },
            { text: "Le cursus scolaire est clairement presente avec des details pertinents.", points: 3 },
          ],
        },
        {
          id: "i4",
          label: "Elements presents",
          cells: [
            { text: "Plusieurs elements attendus sont absents.", points: 0 },
            { text: "Tous les elements sont presents mais pas toujours pertinents.", points: 1 },
            { text: "Complet avec des details pertinents.", points: 2 },
            { text: "Complet, pertinent, organise et coherent.", points: 3 },
          ],
        },
      ],
    },
    {
      id: "ex-badminton-c4",
      title: "Badminton - construire le point",
      apsa: "Badminton",
      cycle: "4",
      niveau: "4e / 3e",
      source: "exemple",
      levels: [
        { id: "l1", label: "A consolider", color: "#fb7185" },
        { id: "l2", label: "En progres", color: "#fdba74" },
        { id: "l3", label: "Maitrise", color: "#fde68a" },
        { id: "l4", label: "Tres maitrise", color: "#bbf7d0" },
      ],
      items: [
        {
          id: "i1",
          label: "Servir et engager",
          cells: [
            { text: "Le service est irregulier ou non reglementaire.", points: 0 },
            { text: "Le service met l'echange en jeu mais reste previsible.", points: 1 },
            { text: "Le service est regulier et place.", points: 2 },
            { text: "Le service est varie et met l'adversaire en difficulte.", points: 3 },
          ],
        },
        {
          id: "i2",
          label: "Se deplacer",
          cells: [
            { text: "Les deplacements sont tardifs ou desorganises.", points: 0 },
            { text: "Les deplacements permettent de renvoyer mais sans replacement stable.", points: 1 },
            { text: "Les deplacements et replacements sont efficaces.", points: 2 },
            { text: "Les deplacements anticipent les trajectoires et preparent l'attaque.", points: 3 },
          ],
        },
        {
          id: "i3",
          label: "Varier les trajectoires",
          cells: [
            { text: "Les renvois sont peu controles.", points: 0 },
            { text: "Quelques zones sont recherchees.", points: 1 },
            { text: "Les trajectoires sont variees pour deplacer l'adversaire.", points: 2 },
            { text: "Les choix de trajectoires construisent clairement la rupture.", points: 3 },
          ],
        },
        {
          id: "i4",
          label: "Role d'arbitre",
          cells: [
            { text: "Les regles essentielles ne sont pas stabilisees.", points: 0 },
            { text: "Les regles principales sont appliquees avec aide.", points: 1 },
            { text: "L'arbitrage est fiable et calme.", points: 2 },
            { text: "L'arbitrage est autonome, precis et explique les decisions.", points: 3 },
          ],
        },
      ],
    },
    {
      id: "ex-danse-c3",
      title: "Danse - composer et presenter",
      apsa: "Danse",
      cycle: "3",
      niveau: "CM2 / 6e",
      source: "exemple",
      levels: [
        { id: "l1", label: "Debutant", color: "#fb7185" },
        { id: "l2", label: "En cours", color: "#fdba74" },
        { id: "l3", label: "Reussi", color: "#fde68a" },
        { id: "l4", label: "Tres reussi", color: "#bbf7d0" },
      ],
      items: [
        {
          id: "i1",
          label: "Presence scenique",
          cells: [
            { text: "L'eleve se montre hesitant et peu engage.", points: 0 },
            { text: "L'eleve s'engage par moments.", points: 1 },
            { text: "L'eleve est present et concentre.", points: 2 },
            { text: "L'eleve capte l'attention et assume son role.", points: 3 },
          ],
        },
        {
          id: "i2",
          label: "Relation au groupe",
          cells: [
            { text: "Les reperes collectifs sont peu respectes.", points: 0 },
            { text: "Les reperes sont suivis avec quelques decalages.", points: 1 },
            { text: "Les actions sont coordonnees avec le groupe.", points: 2 },
            { text: "L'eleve enrichit la composition collective.", points: 3 },
          ],
        },
        {
          id: "i3",
          label: "Utilisation de l'espace",
          cells: [
            { text: "L'espace est peu exploite.", points: 0 },
            { text: "Quelques directions ou niveaux sont utilises.", points: 1 },
            { text: "L'espace est varie et lisible.", points: 2 },
            { text: "Les choix d'espace renforcent l'intention.", points: 3 },
          ],
        },
      ],
    },
    {
      id: "ex-musculation-lycee",
      title: "Musculation - projet d'entrainement",
      apsa: "Musculation",
      cycle: "lycee",
      niveau: "Lycee",
      source: "exemple",
      levels: [
        { id: "l1", label: "Insuffisant", color: "#fb7185" },
        { id: "l2", label: "Fragile", color: "#fdba74" },
        { id: "l3", label: "Satisfaisant", color: "#fde68a" },
        { id: "l4", label: "Tres satisfaisant", color: "#bbf7d0" },
      ],
      items: [
        {
          id: "i1",
          label: "Projet personnel",
          cells: [
            { text: "Le projet n'est pas relie a un objectif clair.", points: 0 },
            { text: "L'objectif est identifie mais peu justifie.", points: 1 },
            { text: "Le projet est coherent avec l'objectif choisi.", points: 2 },
            { text: "Le projet est precis, argumente et ajustable.", points: 3 },
          ],
        },
        {
          id: "i2",
          label: "Parametres de charge",
          cells: [
            { text: "Les charges, series ou recuperations sont inadaptees.", points: 0 },
            { text: "Les parametres sont partiellement adaptes.", points: 1 },
            { text: "Les parametres sont adaptes et suivis.", points: 2 },
            { text: "Les parametres sont pilotes avec finesse selon les ressentis.", points: 3 },
          ],
        },
        {
          id: "i3",
          label: "Securite et posture",
          cells: [
            { text: "Les placements mettent en difficulte la securite.", points: 0 },
            { text: "Les placements sont securises avec rappels.", points: 1 },
            { text: "Les placements sont maitrises sur les exercices.", points: 2 },
            { text: "L'eleve anticipe, pare et conseille de facon fiable.", points: 3 },
          ],
        },
        {
          id: "i4",
          label: "Analyse de la seance",
          cells: [
            { text: "Le bilan est absent ou tres descriptif.", points: 0 },
            { text: "Le bilan repere quelques sensations.", points: 1 },
            { text: "Le bilan relie sensations, charges et objectif.", points: 2 },
            { text: "Le bilan permet d'ajuster precisement la seance suivante.", points: 3 },
          ],
        },
      ],
    },
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

  function normaliserRechercheRubrique(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clonerObjet(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function idCourt(prefix, index) {
    return (prefix || "id") + String(index + 1);
  }

  function normaliserCycleRubrique(cycle) {
    var s = String(cycle || "").toLowerCase().trim();
    if (s === "3" || s === "cycle 3") return "3";
    if (s === "4" || s === "cycle 4") return "4";
    if (s === "lycee" || s === "lycée" || s === "lycÃ©e") return "lycee";
    return s || "4";
  }

  function labelCycleRubrique(cycle) {
    var c = normaliserCycleRubrique(cycle);
    if (c === "3") return "Cycle 3";
    if (c === "4") return "Cycle 4";
    if (c === "lycee") return "Lycee";
    return c;
  }

  function normaliserRubrique(rubrique) {
    var r = rubrique && typeof rubrique === "object" ? clonerObjet(rubrique) : {};
    r.id = r.id || genererId("rubric");
    r.title = normaliserNom(r.title || r.label || "Grille d'evaluation");
    r.apsa = normaliserNom(r.apsa || "");
    r.cycle = normaliserCycleRubrique(r.cycle);
    r.niveau = normaliserNom(r.niveau || "");
    r.source = r.source || "local";
    r.author = normaliserNom(r.author || r.auteur || "");
    r.rating = r.rating && typeof r.rating === "object" ? r.rating : {};
    r.rating.score = typeof r.rating.score === "number" && !isNaN(r.rating.score) ? r.rating.score : 0;
    r.rating.votes = typeof r.rating.votes === "number" && !isNaN(r.rating.votes) ? r.rating.votes : 0;
    r.max = RUBRIQUE_MAX_DEFAUT;
    r.levels = Array.isArray(r.levels) ? r.levels : [];
    r.levels = r.levels
      .map(function (level, index) {
        var l = level && typeof level === "object" ? level : {};
        return {
          id: l.id || idCourt("l", index),
          label: normaliserNom(l.label || "Niveau " + (index + 1)),
          color: l.color || RUBRIQUE_COULEURS[index % RUBRIQUE_COULEURS.length],
        };
      })
      .filter(function (l) {
        return !!l.label;
      });
    if (!r.levels.length) {
      r.levels = [
        { id: "l1", label: "Insuffisant", color: RUBRIQUE_COULEURS[0] },
        { id: "l2", label: "Fragile", color: RUBRIQUE_COULEURS[1] },
        { id: "l3", label: "Satisfaisant", color: RUBRIQUE_COULEURS[2] },
        { id: "l4", label: "Excellent", color: RUBRIQUE_COULEURS[3] },
      ];
    }
    r.items = Array.isArray(r.items) ? r.items : [];
    r.items = r.items
      .map(function (item, itemIndex) {
        var it = item && typeof item === "object" ? item : {};
        var cells = Array.isArray(it.cells) ? it.cells : [];
        return {
          id: it.id || idCourt("i", itemIndex),
          label: normaliserNom(it.label || "Item " + (itemIndex + 1)),
          cells: r.levels.map(function (level, levelIndex) {
            var cell = cells[levelIndex] && typeof cells[levelIndex] === "object" ? cells[levelIndex] : {};
            var rawPoints = cell.points;
            var points = parseFloat(String(rawPoints == null ? levelIndex : rawPoints).replace(",", "."));
            return {
              text: normaliserNom(cell.text || ""),
              points: !isNaN(points) ? points : levelIndex,
            };
          }),
        };
      })
      .filter(function (it) {
        return !!it.label;
      });
    if (!r.items.length) {
      r.items = [
        {
          id: "i1",
          label: "Item 1",
          cells: r.levels.map(function (_, i) {
            return { text: "", points: i };
          }),
        },
      ];
    }
    return r;
  }

  function grilleBasket4eExemple() {
    return {
      id: "local-basket-4e-exemple",
      title: "Basket-ball 4e - jouer vite et juste",
      apsa: "Basket-ball",
      cycle: "4",
      niveau: "4e",
      source: "local",
      author: "Outils EPS",
      levels: [
        { id: "l1", label: "A consolider", color: "#fb7185" },
        { id: "l2", label: "En progres", color: "#fdba74" },
        { id: "l3", label: "Maitrise", color: "#fde68a" },
        { id: "l4", label: "Tres maitrise", color: "#bbf7d0" },
      ],
      items: [
        {
          id: "i1",
          label: "Se demarquer",
          cells: [
            { text: "Reste souvent arrete ou cache par un defenseur.", points: 0 },
            { text: "Propose parfois une solution mais sans timing regulier.", points: 1 },
            { text: "Se rend disponible dans un espace utile.", points: 2 },
            { text: "Enchaine appels, replacements et aide au porteur.", points: 3 },
          ],
        },
        {
          id: "i2",
          label: "Choisir passer, dribbler ou tirer",
          cells: [
            { text: "Choix souvent precipites ou peu adaptes.", points: 0 },
            { text: "Quelques choix pertinents avec du temps.", points: 1 },
            { text: "Choisit une action adaptee a la situation.", points: 2 },
            { text: "Lit vite le jeu et cree un avantage pour l'equipe.", points: 3 },
          ],
        },
        {
          id: "i3",
          label: "Defendre",
          cells: [
            { text: "Suit peu son adversaire ou oublie le repli.", points: 0 },
            { text: "Gene par moments mais se replace tardivement.", points: 1 },
            { text: "Se replace, gene le porteur et protege le panier.", points: 2 },
            { text: "Anticipe, aide et recupere des ballons sans faute.", points: 3 },
          ],
        },
        {
          id: "i4",
          label: "Cooperer",
          cells: [
            { text: "Joue surtout seul ou se demobilise.", points: 0 },
            { text: "Participe avec des partenaires proches.", points: 1 },
            { text: "Communique et respecte l'organisation collective.", points: 2 },
            { text: "Encourage, organise et rend ses partenaires efficaces.", points: 3 },
          ],
        },
      ],
    };
  }

  function rubriquesCatalogue() {
    var seen = {};
    var list = RUBRIQUES_EXEMPLES.map(normaliserRubrique)
      .concat(rubriquesEnLigne.map(normaliserRubrique))
      .concat(rubriquesPersonnelles.map(normaliserRubrique))
      .filter(function (rubrique) {
        if (!rubrique.id || seen[rubrique.id]) return false;
        seen[rubrique.id] = true;
        return true;
      });
    return list.sort(function (a, b) {
      var sa = (a.rating.score || 0) * Math.log((a.rating.votes || 0) + 1);
      var sb = (b.rating.score || 0) * Math.log((b.rating.votes || 0) + 1);
      if (sb !== sa) return sb - sa;
      return String(a.title || "").localeCompare(String(b.title || ""), "fr", { sensitivity: "base" });
    });
  }

  function totalPointsRubrique(rubrique) {
    var r = normaliserRubrique(rubrique);
    return r.items.reduce(function (sum, item) {
      var maxItem = item.cells.reduce(function (m, cell) {
        var p = parseFloat(cell.points);
        return !isNaN(p) && p > m ? p : m;
      }, 0);
      return sum + maxItem;
    }, 0);
  }

  function normaliserSelectionRubrique(raw) {
    if (!raw || typeof raw !== "object") return { selected: {}, points: 0, note: null };
    return {
      selected: raw.selected && typeof raw.selected === "object" ? Object.assign({}, raw.selected) : {},
      points: typeof raw.points === "number" && !isNaN(raw.points) ? raw.points : 0,
      note: typeof raw.note === "number" && !isNaN(raw.note) ? raw.note : null,
    };
  }

  function calculerScoreRubrique(rubrique, rawCell) {
    var r = normaliserRubrique(rubrique);
    var cell = normaliserSelectionRubrique(rawCell);
    var selected = {};
    var points = 0;
    var selectedCount = 0;
    r.items.forEach(function (item) {
      var levelId = cell.selected[item.id];
      if (!levelId) return;
      var idx = r.levels.findIndex(function (level) {
        return level.id === levelId;
      });
      if (idx < 0) return;
      var rubCell = item.cells[idx] || {};
      var p = parseFloat(rubCell.points);
      points += !isNaN(p) ? p : 0;
      selected[item.id] = levelId;
      selectedCount++;
    });
    var total = totalPointsRubrique(r);
    var note = selectedCount && total > 0 ? (points / total) * RUBRIQUE_MAX_DEFAUT : null;
    return {
      selected: selected,
      points: points,
      total: total,
      note: note === null ? null : Math.round(note * 100) / 100,
      selectedCount: selectedCount,
      itemCount: r.items.length,
    };
  }

  function formatNoteRubrique(score) {
    if (!score || score.note === null || score.note === undefined || isNaN(score.note)) return "";
    return formatNombreAffiche(score.note);
  }

  function parseCsvLineRubrique(line) {
    var cells = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        if (inQuotes && line.charAt(i + 1) === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === ";" || ch === ",") && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  function splitTextePoints(raw, fallbackPoints) {
    var s = String(raw || "").trim();
    var idx = s.lastIndexOf("|");
    if (idx < 0) return { text: s, points: fallbackPoints };
    var txt = s.slice(0, idx).trim();
    var p = parseFloat(s.slice(idx + 1).trim().replace(",", "."));
    return { text: txt, points: !isNaN(p) ? p : fallbackPoints };
  }

  function parseRubriqueCsv(csv, meta) {
    var lines = String(csv || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (lines.length < 2) throw new Error("Ajoutez au moins une ligne de niveaux et une ligne d'item.");
    var header = parseCsvLineRubrique(lines[0]);
    if (header.length < 3) throw new Error("La premiere ligne doit contenir Item + au moins deux niveaux.");
    var levels = header.slice(1).map(function (raw, index) {
      var p = splitTextePoints(raw, index);
      return {
        id: idCourt("l", index),
        label: p.text || "Niveau " + (index + 1),
        color: RUBRIQUE_COULEURS[index % RUBRIQUE_COULEURS.length],
        defaultPoints: p.points,
      };
    });
    var items = lines.slice(1).map(function (line, itemIndex) {
      var parts = parseCsvLineRubrique(line);
      var label = parts[0] || "Item " + (itemIndex + 1);
      var cells = levels.map(function (level, levelIndex) {
        var p = splitTextePoints(parts[levelIndex + 1] || "", level.defaultPoints);
        return { text: p.text, points: p.points };
      });
      return { id: idCourt("i", itemIndex), label: label, cells: cells };
    });
    return normaliserRubrique({
      id: genererId("rubric"),
      title: meta && meta.title ? meta.title : "Grille importee",
      apsa: meta && meta.apsa ? meta.apsa : "",
      cycle: meta && meta.cycle ? meta.cycle : "4",
      niveau: meta && meta.niveau ? meta.niveau : "",
      source: "local",
      levels: levels,
      items: items,
    });
  }

  function rubriqueVierge(meta) {
    return normaliserRubrique({
      id: genererId("rubric"),
      title: meta && meta.title ? meta.title : "Nouvelle grille",
      apsa: meta && meta.apsa ? meta.apsa : "",
      cycle: meta && meta.cycle ? meta.cycle : "4",
      niveau: meta && meta.niveau ? meta.niveau : "",
      source: "local",
      levels: [
        { id: "l1", label: "Insuffisant", color: RUBRIQUE_COULEURS[0] },
        { id: "l2", label: "Fragile", color: RUBRIQUE_COULEURS[1] },
        { id: "l3", label: "Satisfaisant", color: RUBRIQUE_COULEURS[2] },
        { id: "l4", label: "Excellent", color: RUBRIQUE_COULEURS[3] },
      ],
      items: [
        {
          id: "i1",
          label: "Item 1",
          cells: [
            { text: "", points: 0 },
            { text: "", points: 1 },
            { text: "", points: 2 },
            { text: "", points: 3 },
          ],
        },
      ],
    });
  }

  function metaRubriqueEdition() {
    return {
      title: normaliserNom(dlgRubricTitle && dlgRubricTitle.value) || "Nouvelle grille",
      apsa: normaliserNom(dlgRubricApsa && dlgRubricApsa.value),
      cycle: dlgRubricCycle ? dlgRubricCycle.value : "4",
      niveau: normaliserNom(dlgRubricNiveau && dlgRubricNiveau.value),
    };
  }

  function appliquerMetaRubriqueEdition(rubrique) {
    var meta = metaRubriqueEdition();
    var r = normaliserRubrique(rubrique || rubriqueEdition || rubriqueVierge(meta));
    r.title = meta.title;
    r.apsa = meta.apsa;
    r.cycle = meta.cycle;
    r.niveau = meta.niveau;
    return r;
  }

  function lireRubriqueDepuisEditeur() {
    if (!dlgRubricEditor) return appliquerMetaRubriqueEdition(rubriqueEdition);
    var base = normaliserRubrique(rubriqueEdition || rubriqueVierge(metaRubriqueEdition()));
    var levels = [];
    dlgRubricEditor.querySelectorAll("[data-rubric-level]").forEach(function (col) {
      var levelId = col.getAttribute("data-rubric-level");
      var idx = levels.length;
      var labelInput = col.querySelector("[data-rubric-level-label]");
      levels.push({
        id: levelId || idCourt("l", idx),
        label: normaliserNom(labelInput ? labelInput.value : "") || "Niveau " + (idx + 1),
        color: RUBRIQUE_COULEURS[idx % RUBRIQUE_COULEURS.length],
      });
    });
    var items = [];
    dlgRubricEditor.querySelectorAll("[data-rubric-row]").forEach(function (row) {
      var itemId = row.getAttribute("data-rubric-row") || idCourt("i", items.length);
      var itemInput = row.querySelector("[data-rubric-item-label]");
      var cells = [];
      row.querySelectorAll("[data-rubric-cell]").forEach(function (cellWrap, index) {
        var txt = cellWrap.querySelector("[data-rubric-cell-text]");
        var pts = cellWrap.querySelector("[data-rubric-cell-points]");
        var parsed = parseFloat(String(pts && pts.value ? pts.value : index).replace(",", "."));
        cells.push({
          text: normaliserNom(txt ? txt.value : ""),
          points: !isNaN(parsed) ? parsed : index,
        });
      });
      items.push({
        id: itemId,
        label: normaliserNom(itemInput ? itemInput.value : "") || "Item " + (items.length + 1),
        cells: cells,
      });
    });
    base.levels = levels.length ? levels : base.levels;
    base.items = items.length ? items : base.items;
    rubriqueEdition = appliquerMetaRubriqueEdition(base);
    return normaliserRubrique(rubriqueEdition);
  }

  function mettreAJourPartageCatalogueRubrique() {
    if (!dlgRubricShare || !dlgRubricShareWrap) return;
    var rubric = lireRubriqueDepuisEditeur();
    var reasons = [];
    if (
      !window.OutilsEPS ||
      !window.OutilsEPS.isSupabaseConfigured ||
      !window.OutilsEPS.isSupabaseConfigured()
    ) {
      reasons.push("Le catalogue en ligne n'est pas configuré sur ce site.");
    } else if (
      window.OutilsEPS.catalog &&
      window.OutilsEPS.catalog.validateGridForCatalog
    ) {
      var validation = window.OutilsEPS.catalog.validateGridForCatalog(rubric);
      if (!validation.valid) reasons = validation.errors;
    }
    if (reasons.length) {
      dlgRubricShare.checked = false;
      dlgRubricShare.disabled = true;
      dlgRubricShareWrap.classList.add("ge-share-wrap--disabled");
      if (dlgRubricShareReason) {
        dlgRubricShareReason.textContent =
          reasons.length > 1
            ? reasons[0] + " (" + (reasons.length - 1) + " autre(s) critère(s))."
            : reasons[0];
      }
    } else {
      dlgRubricShare.disabled = false;
      dlgRubricShareWrap.classList.remove("ge-share-wrap--disabled");
      if (dlgRubricShareReason) dlgRubricShareReason.textContent = "";
    }
  }

  function planifierMajPartageCatalogueRubrique() {
    if (dlgRubricShareTimer) clearTimeout(dlgRubricShareTimer);
    dlgRubricShareTimer = setTimeout(mettreAJourPartageCatalogueRubrique, 100);
  }

  function rendreEditeurRubrique() {
    if (!dlgRubricEditor) return;
    var r = normaliserRubrique(rubriqueEdition || rubriqueVierge(metaRubriqueEdition()));
    rubriqueEdition = r;
    dlgRubricEditor.innerHTML = "";
    var table = document.createElement("table");
    table.className = "tab-suivi-rubric-edit-table";

    var thead = document.createElement("thead");
    var trHead = document.createElement("tr");
    var thItem = document.createElement("th");
    thItem.textContent = "Item";
    trHead.appendChild(thItem);
    r.levels.forEach(function (level, levelIndex) {
      var th = document.createElement("th");
      th.setAttribute("data-rubric-level", level.id);
      var levelInput = document.createElement("input");
      levelInput.type = "text";
      levelInput.value = level.label;
      levelInput.setAttribute("data-rubric-level-label", "");
      levelInput.setAttribute("aria-label", "Nom du niveau " + (levelIndex + 1));
      th.appendChild(levelInput);
      if (r.levels.length > 2) {
        var del = document.createElement("button");
        del.type = "button";
        del.className = "tab-suivi-rubric-edit-del";
        del.textContent = "×";
        del.setAttribute("aria-label", "Supprimer ce niveau");
        del.addEventListener("click", function () {
          var draft = lireRubriqueDepuisEditeur();
          draft.levels.splice(levelIndex, 1);
          draft.items.forEach(function (item) {
            item.cells.splice(levelIndex, 1);
          });
          rubriqueEdition = normaliserRubrique(draft);
          rendreEditeurRubrique();
        });
        th.appendChild(del);
      }
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    r.items.forEach(function (item, itemIndex) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-rubric-row", item.id);
      var th = document.createElement("th");
      var itemInput = document.createElement("input");
      itemInput.type = "text";
      itemInput.value = item.label;
      itemInput.setAttribute("data-rubric-item-label", "");
      itemInput.setAttribute("aria-label", "Nom de l'item " + (itemIndex + 1));
      th.appendChild(itemInput);
      if (r.items.length > 1) {
        var delRow = document.createElement("button");
        delRow.type = "button";
        delRow.className = "tab-suivi-rubric-edit-del";
        delRow.textContent = "×";
        delRow.setAttribute("aria-label", "Supprimer cette ligne");
        delRow.addEventListener("click", function () {
          var draft = lireRubriqueDepuisEditeur();
          draft.items.splice(itemIndex, 1);
          rubriqueEdition = normaliserRubrique(draft);
          rendreEditeurRubrique();
        });
        th.appendChild(delRow);
      }
      tr.appendChild(th);
      r.levels.forEach(function (level, levelIndex) {
        var td = document.createElement("td");
        td.setAttribute("data-rubric-cell", level.id);
        var cell = item.cells[levelIndex] || { text: "", points: levelIndex };
        var text = document.createElement("textarea");
        text.rows = 3;
        text.value = cell.text || "";
        text.setAttribute("data-rubric-cell-text", "");
        text.setAttribute("aria-label", item.label + " - " + level.label);
        var points = document.createElement("input");
        points.type = "number";
        points.step = "0.5";
        points.value = cell.points == null ? levelIndex : cell.points;
        points.setAttribute("data-rubric-cell-points", "");
        points.setAttribute("aria-label", "Points");
        td.appendChild(text);
        td.appendChild(points);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    dlgRubricEditor.appendChild(table);
    planifierMajPartageCatalogueRubrique();
  }

  function ajouterLigneRubriqueEdition() {
    var draft = lireRubriqueDepuisEditeur();
    var idx = draft.items.length;
    draft.items.push({
      id: idCourt("i", idx),
      label: "Item " + (idx + 1),
      cells: draft.levels.map(function (_, levelIndex) {
        return { text: "", points: levelIndex };
      }),
    });
    rubriqueEdition = normaliserRubrique(draft);
    rendreEditeurRubrique();
  }

  function ajouterColonneRubriqueEdition() {
    var draft = lireRubriqueDepuisEditeur();
    var idx = draft.levels.length;
    var level = {
      id: idCourt("l", idx),
      label: "Niveau " + (idx + 1),
      color: RUBRIQUE_COULEURS[idx % RUBRIQUE_COULEURS.length],
    };
    draft.levels.push(level);
    draft.items.forEach(function (item) {
      item.cells.push({ text: "", points: idx });
    });
    rubriqueEdition = normaliserRubrique(draft);
    rendreEditeurRubrique();
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
      dateNaissance: (e.dateNaissance || "").trim(),
      eleveId: e.id || "",
      equipe: (e.equipe || "").trim(),
      equipeCouleur: (e.equipeCouleur || "").trim(),
      niveau: e.niveau !== undefined && e.niveau !== null ? String(e.niveau).trim() : "",
      sexe: (e.sexe || "").trim(),
      vma: (e.vma || "").trim(),
    };
  }

  function libelleChampInfoEleve(champId) {
    var i;
    for (i = 0; i < INFO_ELEVE_CHAMPS.length; i++) {
      if (INFO_ELEVE_CHAMPS[i].id === champId) return INFO_ELEVE_CHAMPS[i].label;
    }
    return champId || "Info";
  }

  function normaliserChampInfoEleve(champId) {
    var ids = INFO_ELEVE_CHAMPS.map(function (x) {
      return x.id;
    });
    return ids.indexOf(champId) >= 0 ? champId : "equipe";
  }

  function metaEleveFusionnee(row) {
    if (!row) return {};
    if (!row.meta) row.meta = {};
    var m = row.meta;
    var eid = m.eleveId;
    if (eid && cacheElevesParId && cacheElevesParId[eid]) {
      var el = cacheElevesParId[eid];
      return {
        equipe: (el.equipe || m.equipe || "").trim(),
        equipeCouleur: (el.equipeCouleur || m.equipeCouleur || "").trim(),
        niveau: el.niveau !== undefined && el.niveau !== null ? String(el.niveau).trim() : String(m.niveau || "").trim(),
        sexe: (el.sexe || m.sexe || "").trim(),
        vma: (el.vma || m.vma || "").trim(),
      };
    }
    return {
      equipe: (m.equipe || "").trim(),
      equipeCouleur: (m.equipeCouleur || "").trim(),
      niveau: m.niveau !== undefined && m.niveau !== null ? String(m.niveau).trim() : "",
      sexe: (m.sexe || "").trim(),
      vma: (m.vma || "").trim(),
    };
  }

  function valeurBruteInfoEleve(row, champ) {
    var m = metaEleveFusionnee(row);
    return m[champ] != null ? String(m[champ]).trim() : "";
  }

  function texteAfficheInfoEleve(row, champ) {
    var v = valeurBruteInfoEleve(row, champ);
    if (!v) return "";
    if (champ === "vma" && typeof EleveDisplay !== "undefined" && EleveDisplay.formatVma) {
      return EleveDisplay.formatVma(v) || v;
    }
    if (champ === "sexe") {
      var s = v.toUpperCase();
      if (s === "F" || s === "M") return s;
    }
    return v;
  }

  function invaliderCacheEleves() {
    cacheElevesParId = null;
  }

  function chargerCacheEleves(force) {
    if (!force && cacheElevesParId) return Promise.resolve(cacheElevesParId);
    if (typeof DataManager === "undefined" || !DataManager.getAll) {
      cacheElevesParId = {};
      return Promise.resolve(cacheElevesParId);
    }
    return DataManager.getAll("eleves").then(function (all) {
      cacheElevesParId = {};
      (all || []).forEach(function (e) {
        if (e && e.id) cacheElevesParId[e.id] = e;
      });
      return cacheElevesParId;
    });
  }

  function couleurEquipeFallback(label) {
    var s = String(label || "").trim();
    if (!s) return "";
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h + s.charCodeAt(i) * (i + 1)) % EQUIPE_COULEURS_FALLBACK.length;
    }
    return EQUIPE_COULEURS_FALLBACK[h];
  }

  function couleurEquipeAffichage(row) {
    if (!row) return "";
    var m = metaEleveFusionnee(row);
    if (typeof EquipeCouleur !== "undefined" && EquipeCouleur.couleurAffichageEquipe) {
      return EquipeCouleur.couleurAffichageEquipe({
        equipe: m.equipe,
        equipeCouleur: m.equipeCouleur,
      });
    }
    var c = m.equipeCouleur;
    if (c && /^#[0-9a-fA-F]{6}$/i.test(String(c))) return String(c);
    return "";
  }

  function couleurEquipeRow(row) {
    var c = couleurEquipeAffichage(row);
    if (c) return c;
    var eq = row && row.meta && (row.meta.equipe || "").trim();
    return eq ? couleurEquipeFallback(eq) : "";
  }

  function libelleEquipeRow(row) {
    return valeurBruteInfoEleve(row, "equipe");
  }

  function normaliserValeurInfoEleveSaisie(champ, brut) {
    var v = String(brut === null || brut === undefined ? "" : brut).trim();
    if (champ === "sexe") {
      if (!v) return "";
      var s = v.toUpperCase();
      if (s === "F" || s === "M") return s;
      return null;
    }
    if (champ === "niveau") {
      if (!v) return "";
      var n = parseInt(v, 10);
      if (isNaN(n) || n < 1 || n > 5) return null;
      return String(n);
    }
    if (champ === "vma") {
      if (!v) return "";
      if (typeof EleveDisplay !== "undefined" && EleveDisplay.normaliserVma) {
        var vma = EleveDisplay.normaliserVma(v);
        return vma === null ? null : vma;
      }
      return v;
    }
    if (champ === "equipe") {
      return v;
    }
    return v;
  }

  function persisterInfoEleveLigne(row, champ, valeur) {
    if (!row.meta) row.meta = {};
    row.meta[champ] = valeur;
    if (champ === "equipe") {
      if (typeof EquipeCouleur !== "undefined") {
        var stub = { equipe: valeur };
        EquipeCouleur.syncEleveEquipeCouleur(stub);
        row.meta.equipeCouleur = stub.equipeCouleur || "";
      } else {
        row.meta.equipeCouleur = "";
      }
    }
    var eid = row.meta.eleveId;
    if (eid && cacheElevesParId && cacheElevesParId[eid]) {
      cacheElevesParId[eid][champ] = valeur;
      if (champ === "equipe") {
        cacheElevesParId[eid].equipeCouleur = row.meta.equipeCouleur || "";
      }
    }
    if (!eid || typeof DataManager === "undefined" || !DataManager.updateEleve) {
      return Promise.resolve({ fiche: false });
    }
    var patch = {};
    patch[champ] = valeur;
    if (champ === "equipe") patch.equipeCouleur = row.meta.equipeCouleur || "";
    return DataManager.updateEleve(eid, patch).then(function (ok) {
      return { fiche: !!ok };
    });
  }

  function appliquerInfoEleveDepuisInput(t, row, col, inputEl) {
    var champ = normaliserChampInfoEleve(col.infoChamp);
    var norm = normaliserValeurInfoEleveSaisie(champ, inputEl.value);
    if (norm === null) {
      montrerMsg(
        "Valeur invalide pour « " +
          libelleChampInfoEleve(champ) +
          " »." +
          (champ === "vma" ? " (ex. 12.5 km/h)" : champ === "niveau" ? " (1 à 5)" : "")
      );
      inputEl.value = valeurBruteInfoEleve(row, champ);
      return;
    }
    persisterInfoEleveLigne(row, champ, norm).then(function (res) {
      planifierSauvegarde();
      if (!res.fiche) {
        montrerOk("Enregistré sur cette feuille (élève non lié à une fiche Classes).");
      }
    });
  }

  function creerInputInfoEleve(t, row, col, champ, rowIndex) {
    var inp;
    var val = valeurBruteInfoEleve(row, champ);
    var cls = "tab-suivi-cell-info-input";
    if (champ === "niveau" || champ === "sexe") {
      cls += " tab-suivi-cell-input";
    }
    if (champ === "sexe") {
      inp = document.createElement("select");
      inp.className = cls;
      ["", "F", "M"].forEach(function (opt) {
        var o = document.createElement("option");
        o.value = opt;
        o.textContent = opt || "—";
        if (val === opt) o.selected = true;
        inp.appendChild(o);
      });
    } else {
      inp = document.createElement("input");
      inp.className = cls;
      if (champ === "niveau") {
        inp.type = "text";
        inp.inputMode = "numeric";
        inp.pattern = "[1-5]";
        inp.maxLength = 1;
        inp.title = "Niveau de 1 à 5";
      } else if (champ === "vma") {
        inp.type = "text";
        inp.inputMode = "decimal";
        inp.placeholder = "km/h";
      } else if (champ === "equipe") {
        inp.type = "text";
        inp.maxLength = 80;
        cls += " tab-suivi-cell-info-input--equipe";
        inp.className = cls;
      } else {
        inp.type = "text";
        inp.maxLength = 80;
      }
      inp.setAttribute("value", val);
      inp.value = val;
    }
    inp.setAttribute("data-col-id", col.id);
    inp.setAttribute("aria-label", libelleChampInfoEleve(champ) + " — " + labelEleveRow(row));
    var commit = function () {
      appliquerInfoEleveDepuisInput(t, row, col, inp);
    };
    inp.addEventListener("change", commit);
    inp.addEventListener("blur", commit);
    inp.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      commit();
      focusCelluleSaisie(rowIndex + 1, col.id);
    });
    return inp;
  }

  function creerCelluleInfoEleve(t, row, col, rowIndex) {
    var wrap = document.createElement("div");
    var champ = normaliserChampInfoEleve(col.infoChamp);
    var editable = col.infoEditable === true;
    wrap.className = "tab-suivi-cell-info";
    if (editable) {
      wrap.classList.add("tab-suivi-cell-info--edit");
      if (champ === "equipe") wrap.classList.add("tab-suivi-cell-info--edit-equipe");
    }

    if (editable) {
      wrap.appendChild(creerInputInfoEleve(t, row, col, champ, rowIndex));
      return wrap;
    }

    if (champ === "equipe") {
      var badge = creerBadgeEquipe(row, true);
      if (badge) {
        wrap.appendChild(badge);
      } else {
        var txtEq = texteAfficheInfoEleve(row, "equipe");
        if (txtEq) {
          var sp = document.createElement("span");
          sp.textContent = txtEq;
          wrap.appendChild(sp);
        } else {
          wrap.textContent = "—";
          wrap.classList.add("tab-suivi-cell-info--vide");
        }
      }
    } else {
      var txt = texteAfficheInfoEleve(row, champ);
      wrap.textContent = txt || "—";
      if (!txt) wrap.classList.add("tab-suivi-cell-info--vide");
    }
    return wrap;
  }

  function majDialogColonneInfoUi(col) {
    if (!col || col.type !== "eleveInfo") return;
    if (dlgColInfoEditable) dlgColInfoEditable.checked = col.infoEditable === true;
    if (dlgColInfoHint) {
      dlgColInfoHint.textContent = col.infoEditable
        ? "Les modifications dans le tableau mettent à jour la fiche élève dans Classes (élèves importés depuis une classe)."
        : "Lecture seule : donnée issue de la fiche élève (Classes). Utilisez « Tri » pour ordonner selon cette colonne.";
    }
  }

  function hydraterEquipesFeuilleSync(t) {
    if (!t || !t.rows || !cacheElevesParId) return false;
    var changed = false;
    t.rows.forEach(function (row) {
      if (!row.meta) row.meta = {};
      var eid = row.meta.eleveId;
      if (!eid || !cacheElevesParId[eid]) return;
      var el = cacheElevesParId[eid];
      var champs = [
        ["equipe", el.equipe],
        ["equipeCouleur", el.equipeCouleur],
        ["niveau", el.niveau !== undefined && el.niveau !== null ? String(el.niveau) : ""],
        ["sexe", el.sexe],
        ["vma", el.vma],
      ];
      champs.forEach(function (pair) {
        var k = pair[0];
        var v = String(pair[1] == null ? "" : pair[1]).trim();
        if (v && row.meta[k] !== v) {
          row.meta[k] = v;
          changed = true;
        }
      });
    });
    return changed;
  }

  function hydraterEquipesFeuille(t) {
    return chargerCacheEleves().then(function () {
      return hydraterEquipesFeuilleSync(t);
    });
  }

  function creerBadgeEquipe(row, avecCouleur) {
    var eq = libelleEquipeRow(row);
    if (!eq) return null;
    var badge = document.createElement("span");
    badge.className = "tab-suivi-equipe-badge";
    badge.textContent = eq;
    badge.title = "Équipe : " + eq;
    if (avecCouleur) {
      var col = couleurEquipeAffichage(row);
      if (col) {
        badge.style.setProperty("--equipe-couleur", col);
        badge.style.backgroundColor = col;
        badge.style.borderColor = col;
      } else {
        badge.classList.add("tab-suivi-equipe-badge--sans-couleur");
      }
    } else {
      badge.classList.add("tab-suivi-equipe-badge--sans-couleur");
    }
    return badge;
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

  function synchroniserLabelRow(row, nom, prenom, dateNaissance) {
    if (!row.meta) row.meta = {};
    row.meta.nom = normaliserNom(nom);
    row.meta.prenom = normaliserNom(prenom);
    if (dateNaissance !== undefined) {
      if (typeof EleveDisplay !== "undefined" && EleveDisplay.normaliserDateNaissance) {
        var dn = EleveDisplay.normaliserDateNaissance(dateNaissance);
        row.meta.dateNaissance = dn === null ? row.meta.dateNaissance || "" : dn || "";
      } else {
        row.meta.dateNaissance = String(dateNaissance || "").trim();
      }
    }
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
    synchroniserLabelRow(
      row,
      dlgElevesNom.value,
      dlgElevesPrenom.value,
      dlgElevesNaissance ? dlgElevesNaissance.value : undefined
    );
  }

  function remplirDetailEleve(row) {
    if (!row || !dlgElevesDetail) return;
    var noms = nomsDepuisRow(row);
    if (dlgElevesNom) dlgElevesNom.value = noms.nom;
    if (dlgElevesPrenom) dlgElevesPrenom.value = noms.prenom;
    if (dlgElevesNaissance) {
      dlgElevesNaissance.value =
        row.meta && row.meta.dateNaissance ? row.meta.dateNaissance : "";
    }
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
      montrerMsg("Prénom requis : utilisez les paramètres élèves (⚙) ou importez depuis une classe.");
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
    t.affichageTriEquipe = t.affichageTriEquipe === true;
    if (!t.classeId) t.classeId = "";
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
      if (c.type === "check") {
        c.horsSynthese = c.horsSynthese === true;
      } else {
        delete c.horsSynthese;
      }
      if (c.type === "number") {
        if (c.estNote !== true && c.estNote !== false) {
          c.estNote = c.max > 0;
        }
        if (!c.estNote) {
          c.max = null;
        } else if (c.max != null && c.max !== "") {
          var parsedMax = parseFloat(String(c.max).replace(",", "."));
          c.max = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : null;
        } else {
          c.max = null;
        }
      } else if (c.type === "calc") {
        if (c.calcOp !== "sum" && c.calcOp !== "avg") c.calcOp = "sum";
        if (!Array.isArray(c.sourceIds)) c.sourceIds = [];
        c.sourceIds = c.sourceIds.filter(function (sid) {
          return t.cols.some(function (x) {
            return x.id === sid && x.type === "number";
          });
        });
        if (c.estNote !== true && c.estNote !== false) {
          c.estNote = c.calcOp === "avg";
        }
        if (!c.estNote) {
          c.max = null;
        } else if (c.max != null && c.max !== "") {
          var parsedMaxCalc = parseFloat(String(c.max).replace(",", "."));
          c.max = !isNaN(parsedMaxCalc) && parsedMaxCalc > 0 ? parsedMaxCalc : null;
        } else {
          c.max = null;
        }
      } else if (c.type === "rubric") {
        c.rubric = normaliserRubrique(c.rubric || { title: c.label || "Grille d'evaluation" });
        c.estNote = true;
        c.max = RUBRIQUE_MAX_DEFAUT;
      } else if (c.type === "eleveInfo") {
        c.infoChamp = normaliserChampInfoEleve(c.infoChamp);
        c.infoEditable = c.infoEditable === true;
        delete c.estNote;
        delete c.max;
        delete c.calcOp;
        delete c.sourceIds;
        delete c.rubric;
        delete c.horsSynthese;
      } else {
        delete c.estNote;
        delete c.max;
      }
      if (
        c.type !== "check" &&
        c.type !== "number" &&
        c.type !== "calc" &&
        c.type !== "rubric" &&
        c.type !== "eleveInfo"
      ) {
        c.type = "number";
      }
    });
    return t;
  }

  function colonneEstNote(col) {
    if (!col) return false;
    if (col.type === "number" || col.type === "calc") return col.estNote === true;
    if (col.type === "rubric") return true;
    return false;
  }

  function colonnesNombreSources(t) {
    return t.cols.filter(function (c) {
      return c.type === "number";
    });
  }

  function colonneNoteOuCalc(col) {
    return colonneEstNote(col);
  }

  function colonneAppel(col) {
    return col.type === "check";
  }

  function colonneAppelSynthese(col) {
    return col.type === "check" && col.horsSynthese !== true;
  }

  function colonneInfoEleve(col) {
    return col.type === "eleveInfo";
  }

  function colonneAutre(col) {
    if (col.type === "eleveInfo") return true;
    if (col.type === "number" || col.type === "calc") return col.estNote !== true;
    return false;
  }

  function colonnesVisibles(t) {
    if (!t || !t.cols) return [];
    if (filtreColonnes === "check") {
      return t.cols.filter(function (c) {
        return colonneAppel(c);
      });
    }
    if (filtreColonnes === "note") {
      return t.cols.filter(function (c) {
        return colonneNoteOuCalc(c);
      });
    }
    if (filtreColonnes === "autre") {
      return t.cols.filter(function (c) {
        return colonneAutre(c);
      });
    }
    return t.cols;
  }

  function baremeColonne(t, col) {
    if (!col || !colonneEstNote(col)) return null;
    if (col.type === "rubric") return RUBRIQUE_MAX_DEFAUT;
    if ((col.type === "number" || col.type === "calc") && col.max > 0) return col.max;
    if (col.type === "calc" && col.calcOp === "avg") {
      var maxs = [];
      (col.sourceIds || []).forEach(function (sid) {
        var src = t.cols.filter(function (c) {
          return c.id === sid;
        })[0];
        if (src && colonneEstNote(src) && src.max > 0) maxs.push(src.max);
      });
      if (maxs.length && maxs.every(function (m) {
        return m === maxs[0];
      })) {
        return maxs[0];
      }
    }
    return null;
  }

  function formatNombreAffiche(val) {
    if (val === null || val === undefined || val === "" || isNaN(val)) return "";
    var n = Number(val);
    var s = n.toFixed(1);
    if (s.indexOf(".0") === s.length - 2) s = String(Math.round(n));
    return s.replace(".", ",");
  }

  function formatNombreAvecBareme(val, max) {
    var base = formatNombreAffiche(val);
    if (!base) return "";
    return max > 0 ? base + "/" + max : base;
  }

  function majFiltreColonnesUi(t) {
    if (!colFiltreEl) return;
    var hasCheck = t && t.cols.some(colonneAppel);
    var hasNotes = t && t.cols.some(colonneNoteOuCalc);
    var hasAutre = t && t.cols.some(colonneAutre);
    var nbTypes = (hasCheck ? 1 : 0) + (hasNotes ? 1 : 0) + (hasAutre ? 1 : 0);
    colFiltreEl.hidden = nbTypes < 2;
    colFiltreEl.querySelectorAll("[data-col-filtre]").forEach(function (btn) {
      var mode = btn.getAttribute("data-col-filtre");
      btn.classList.toggle("is-active", mode === filtreColonnes);
      btn.setAttribute("aria-pressed", mode === filtreColonnes ? "true" : "false");
    });
  }

  function definirFiltreColonnes(mode) {
    if (mode !== "all" && mode !== "check" && mode !== "note" && mode !== "autre") return;
    filtreColonnes = mode;
    var t = getActif();
    majFiltreColonnesUi(t);
    rendreGrille();
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
    if (col.type === "rubric") {
      var score = calculerScoreRubrique(col.rubric, getCell(t, rowId, col.id));
      return score.note;
    }
    if (col.type === "eleveInfo") {
      var row = t.rows.filter(function (r) {
        return r.id === rowId;
      })[0];
      if (!row) return "";
      var champ = normaliserChampInfoEleve(col.infoChamp);
      if (champ === "niveau" || champ === "vma") {
        var nv = valeurBruteInfoEleve(row, champ);
        if (!nv) return "";
        var n = parseFloat(String(nv).replace(",", "."));
        return isNaN(n) ? nv : n;
      }
      return texteAfficheInfoEleve(row, champ);
    }
    return getCell(t, rowId, col.id);
  }

  function demanderNomColonne(col) {
    if (!col) return;
    ouvrirDialogColonne(col.id);
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
      affichageTriEquipe: false,
      classeId: "",
    };
  }

  function eleveDejaSurFeuille(t, e) {
    if (!t || !e) return false;
    return !!trouverRowPourImport(t, {
      label:
        typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
          ? EleveDisplay.formatEleveListe(e, "")
          : [e.nom, e.prenom].filter(Boolean).join(" "),
      meta: { eleveId: e.id || "" },
    });
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

  function statutPresenceDef(val) {
    for (var i = 0; i < PRESENCE_STATUTS.length; i++) {
      if (PRESENCE_STATUTS[i].id === val) return PRESENCE_STATUTS[i];
    }
    return PRESENCE_STATUTS[PRESENCE_STATUTS.length - 1];
  }

  function remplirGlyphPresence(el, st) {
    el.textContent = "";
    if (st.glyphKind === "clock") {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "tab-suivi-check__clock");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "8");
      circle.setAttribute("cy", "8");
      circle.setAttribute("r", "6.25");
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "currentColor");
      circle.setAttribute("stroke-width", "1.35");
      var hand = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hand.setAttribute("d", "M8 4.25V8l2.25 1.35");
      hand.setAttribute("fill", "none");
      hand.setAttribute("stroke", "currentColor");
      hand.setAttribute("stroke-width", "1.35");
      hand.setAttribute("stroke-linecap", "round");
      svg.appendChild(circle);
      svg.appendChild(hand);
      el.appendChild(svg);
      return;
    }
    if (st.glyphKind === "cross-j") {
      var combo = document.createElement("span");
      combo.className = "tab-suivi-check__combo";
      var main = document.createElement("span");
      main.className = "tab-suivi-check__combo-main";
      main.textContent = "✗";
      var sub = document.createElement("span");
      sub.className = "tab-suivi-check__combo-sub";
      sub.textContent = "J";
      combo.appendChild(main);
      combo.appendChild(sub);
      el.appendChild(combo);
      return;
    }
    el.textContent = st.glyph || "·";
  }

  function appliquerStyleBoutonCheck(btn, val) {
    var def = statutPresenceDef(val);
    btn.className = "tab-suivi-check " + def.cls;
    remplirGlyphPresence(btn, def);
    btn.setAttribute("aria-label", def.label);
  }

  function scoreTriPresence(v) {
    if (v === true) return 5;
    if (v === PRESENCE_RETARD) return 4;
    if (v === PRESENCE_ATTITUDE) return 4;
    if (v === PRESENCE_JUSTIFIE) return 2;
    if (v === false) return 1;
    return 0;
  }

  function fermerMenuPresence(e) {
    if (!presenceMenuEl || presenceMenuEl.hidden) return;
    if (e && e.target && presenceMenuEl.contains(e.target)) return;
    presenceMenuEl.hidden = true;
    presenceMenuAnchor = null;
  }

  function positionnerMenuPresence(anchorBtn) {
    if (!presenceMenuEl) return;
    presenceMenuEl.hidden = false;
    var rect = anchorBtn.getBoundingClientRect();
    var menuW = presenceMenuEl.offsetWidth;
    var menuH = presenceMenuEl.offsetHeight;
    var left = rect.right + 6;
    if (left + menuW > window.innerWidth - 8) {
      left = rect.left - menuW - 6;
    }
    if (left < 8) left = 8;
    var top = rect.top + (rect.height - menuH) / 2;
    if (top + menuH > window.innerHeight - 8) top = window.innerHeight - menuH - 8;
    if (top < 8) top = 8;
    presenceMenuEl.style.left = left + "px";
    presenceMenuEl.style.top = top + "px";
  }

  function getPresenceMenu() {
    if (!presenceMenuEl) {
      presenceMenuEl = document.createElement("div");
      presenceMenuEl.className = "tab-suivi-presence-menu";
      presenceMenuEl.setAttribute("role", "menu");
      presenceMenuEl.hidden = true;
      document.body.appendChild(presenceMenuEl);
      document.addEventListener("pointerdown", fermerMenuPresence, true);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") fermerMenuPresence();
      });
      window.addEventListener("scroll", fermerMenuPresence, true);
      window.addEventListener("resize", fermerMenuPresence);
    }
    return presenceMenuEl;
  }

  function ouvrirMenuPresence(anchorBtn, onSelect) {
    var menu = getPresenceMenu();
    presenceMenuAnchor = anchorBtn;
    menu.innerHTML = "";
    PRESENCE_STATUTS.forEach(function (st) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "tab-suivi-presence-menu__item " + st.cls;
      item.setAttribute("role", "menuitem");
      var glyph = document.createElement("span");
      glyph.className = "tab-suivi-presence-menu__glyph " + st.cls;
      remplirGlyphPresence(glyph, st);
      glyph.setAttribute("aria-hidden", "true");
      var lab = document.createElement("span");
      lab.className = "tab-suivi-presence-menu__label";
      lab.textContent = st.label;
      item.appendChild(glyph);
      item.appendChild(lab);
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        onSelect(st.id);
        fermerMenuPresence();
      });
      menu.appendChild(item);
    });
    positionnerMenuPresence(anchorBtn);
  }

  function lierLongPressPresence(btn, onLongPress) {
    var timer = null;
    var fired = false;
    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
    btn.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      fired = false;
      clearTimer();
      timer = setTimeout(function () {
        fired = true;
        timer = null;
        if (typeof navigator.vibrate === "function") navigator.vibrate(12);
        onLongPress();
      }, PRESENCE_LONG_PRESS_MS);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      btn.addEventListener(ev, clearTimer);
    });
    btn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      fired = true;
      onLongPress();
    });
    return function () {
      return fired;
    };
  }

  function glypheTextePresencePdf(v) {
    if (v === null || v === undefined) return "—";
    var def = statutPresenceDef(v);
    return def.exportGlyph != null ? def.exportGlyph : def.glyph || "—";
  }

  function reinitialiserStyleTextePdf(doc) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.12);
  }

  function dessinerCheckPdf(doc, cx, cy, couleur) {
    doc.setDrawColor(couleur[0], couleur[1], couleur[2]);
    doc.setLineWidth(0.38);
    doc.line(cx - 1.15, cy + 0.05, cx - 0.35, cy + 0.85);
    doc.line(cx - 0.35, cy + 0.85, cx + 1.2, cy - 0.95);
  }

  function dessinerCroixPdf(doc, cx, cy, rayon, couleur) {
    doc.setDrawColor(couleur[0], couleur[1], couleur[2]);
    doc.setLineWidth(0.34);
    doc.line(cx - rayon, cy - rayon, cx + rayon, cy + rayon);
    doc.line(cx + rayon, cy - rayon, cx - rayon, cy + rayon);
  }

  function dessinerStatutPresencePdf(doc, val, cx, y) {
    var cy = y - 2.1;
    if (val === true) {
      dessinerCheckPdf(doc, cx, cy, [4, 120, 87]);
    } else if (val === false) {
      dessinerCroixPdf(doc, cx, cy, 1.1, [185, 28, 28]);
    } else if (val === PRESENCE_RETARD) {
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.22);
      doc.circle(cx, cy, 1.75, "S");
      doc.line(cx, cy, cx, cy - 1.05);
      doc.line(cx, cy, cx + 0.95, cy + 0.35);
    } else if (val === PRESENCE_ATTITUDE) {
      doc.setTextColor(109, 40, 217);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("!", cx, y, { align: "center" });
    } else if (val === PRESENCE_JUSTIFIE) {
      dessinerCroixPdf(doc, cx - 0.15, cy, 0.95, [29, 78, 216]);
      doc.setTextColor(29, 78, 216);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.8);
      doc.text("J", cx + 1.55, y + 0.55, { align: "center" });
    } else {
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("·", cx, y, { align: "center" });
    }
    reinitialiserStyleTextePdf(doc);
  }

  function valeurVersTexte(t, rowId, col, pourPdf) {
    var v = valeurCellule(t, rowId, col);
    if (col.type === "check") {
      if (pourPdf) return glypheTextePresencePdf(v);
      var def = statutPresenceDef(v);
      return def.exportGlyph != null ? def.exportGlyph : def.glyph || "";
    }
    if (col.type === "rubric") {
      return v === null || v === undefined || isNaN(v) ? "" : formatNombreAffiche(v);
    }
    if (col.type === "eleveInfo") {
      return v === null || v === undefined ? "" : String(v);
    }
    if (v === null || v === undefined || v === "") return "";
    return formatNombreAffiche(v);
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

  function compterPresentsColonneAppel(t, col) {
    var n = 0;
    t.rows.forEach(function (row) {
      var v = getCell(t, row.id, col.id);
      if (v === true || v === PRESENCE_RETARD || v === PRESENCE_ATTITUDE) n++;
    });
    return n;
  }

  function syntheseColonneAppelTexte(t, col) {
    return compterPresentsColonneAppel(t, col) + " él.";
  }

  function majStatsColonneDom(t, col) {
    if (!scrollEl || !col || !col.id) return;
    var th = scrollEl.querySelector(
      '.tab-suivi-head-stats .tab-suivi-th--col[data-col-id="' + col.id + '"]'
    );
    if (!th) return;
    if (col.type === "check" && !col.horsSynthese) {
      th.textContent = syntheseColonneAppelTexte(t, col);
      return;
    }
    th.textContent = syntheseColonne(t, col);
  }

  function majToutesStatsDom(t) {
    t.cols.forEach(function (col) {
      majStatsColonneDom(t, col);
    });
  }

  function rafraichirColonnesCalcLiees(t, sourceColId) {
    t.cols.forEach(function (col) {
      if (col.type !== "calc" || !col.sourceIds || col.sourceIds.indexOf(sourceColId) < 0) return;
      majStatsColonneDom(t, col);
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
          cv === null || cv === undefined || isNaN(cv)
            ? "—"
            : formatNombreAffiche(cv) || "—";
      });
    });
  }

  function appliquerValeurDepuisInput(num, t, row, col) {
    setCell(t, row.id, col.id, parseValeurNombre(num.value));
    majStatsColonneDom(t, col);
    rafraichirColonnesCalcLiees(t, col.id);
    planifierSauvegarde();
  }

  function classeScoreRubrique(score) {
    if (!score || score.note === null || score.note === undefined || isNaN(score.note)) {
      return "tab-suivi-rubric-cell-btn--empty";
    }
    if (score.note >= 16) return "tab-suivi-rubric-cell-btn--high";
    if (score.note >= 10) return "tab-suivi-rubric-cell-btn--mid";
    return "tab-suivi-rubric-cell-btn--low";
  }

  function libelleScoreRubrique(score) {
    if (!score || score.note === null || score.note === undefined || isNaN(score.note)) {
      return "·";
    }
    return formatNombreAffiche(score.note);
  }

  function majBoutonRubriqueCellule(t, rowId, col) {
    if (!tbodyEl || !t || !col) return;
    var btn = tbodyEl.querySelector(
      'tr[data-row-id="' +
        rowId +
        '"] td[data-col-id="' +
        col.id +
        '"] .tab-suivi-rubric-cell-btn'
    );
    if (!btn) return;
    var score = calculerScoreRubrique(col.rubric, getCell(t, rowId, col.id));
    btn.className = "tab-suivi-rubric-cell-btn " + classeScoreRubrique(score);
    btn.textContent = libelleScoreRubrique(score);
    btn.setAttribute("aria-label", "Ouvrir la grille " + (col.label || "") + " : " + btn.textContent);
  }

  function metaRubriqueTexte(rubrique) {
    var r = normaliserRubrique(rubrique);
    return [r.apsa, labelCycleRubrique(r.cycle), r.niveau].filter(Boolean).join(" · ");
  }

  function obtenirContexteRubriqueActif() {
    if (rubricCellTest) return rubricCellTest;
    var t = getActif();
    if (!t || !rubricCellRowId || !rubricCellColId) return null;
    var row = getRowParId(t, rubricCellRowId);
    var col = t.cols.filter(function (c) {
      return c.id === rubricCellColId;
    })[0];
    if (!row || !col || col.type !== "rubric") return null;
    return {
      mode: "cell",
      tableau: t,
      row: row,
      col: col,
      rubrique: normaliserRubrique(col.rubric),
      value: normaliserSelectionRubrique(getCell(t, row.id, col.id)),
    };
  }

  function majScoreDialogRubrique(ctx) {
    if (!dlgRubricScore || !ctx) return;
    var score = calculerScoreRubrique(ctx.rubrique, ctx.value);
    var note = score.note === null ? "—" : formatNombreAffiche(score.note) + "/20";
    dlgRubricScore.innerHTML =
      '<span class="tab-suivi-rubric-score__note">' +
      note +
      '</span><span class="tab-suivi-rubric-score__detail">' +
      formatNombreAffiche(score.points) +
      " / " +
      formatNombreAffiche(score.total) +
      " points · " +
      score.selectedCount +
      " / " +
      score.itemCount +
      " items</span>";
  }

  function enregistrerSelectionRubrique(ctx) {
    var score = calculerScoreRubrique(ctx.rubrique, ctx.value);
    ctx.value = { selected: score.selected, points: score.points, note: score.note };
    if (ctx.mode === "test") {
      rubricCellTest.value = ctx.value;
      majScoreDialogRubrique(ctx);
      return;
    }
    setCell(ctx.tableau, ctx.row.id, ctx.col.id, ctx.value);
    majStatsColonneDom(ctx.tableau, ctx.col);
    majBoutonRubriqueCellule(ctx.tableau, ctx.row.id, ctx.col);
    planifierSauvegarde();
    majScoreDialogRubrique(ctx);
  }

  function rendreGrilleRubriqueDialog(ctx) {
    if (!dlgRubricGrid || !ctx) return;
    var r = ctx.rubrique;
    dlgRubricGrid.innerHTML = "";
    var table = document.createElement("table");
    table.className = "tab-suivi-rubric-grid";
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    var thItem = document.createElement("th");
    thItem.textContent = r.title;
    headRow.appendChild(thItem);
    r.levels.forEach(function (level) {
      var th = document.createElement("th");
      th.textContent = level.label;
      th.style.setProperty("--rubric-level", level.color);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    r.items.forEach(function (item) {
      var tr = document.createElement("tr");
      var rowHead = document.createElement("th");
      rowHead.scope = "row";
      rowHead.textContent = item.label;
      tr.appendChild(rowHead);
      r.levels.forEach(function (level, levelIndex) {
        var td = document.createElement("td");
        var cell = item.cells[levelIndex] || {};
        var selected = ctx.value.selected[item.id] === level.id;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tab-suivi-rubric-option" + (selected ? " is-selected" : "");
        btn.style.setProperty("--rubric-level", level.color);
        btn.innerHTML =
          '<span class="tab-suivi-rubric-option__text"></span><span class="tab-suivi-rubric-option__points"></span>';
        btn.querySelector(".tab-suivi-rubric-option__text").textContent = cell.text || level.label;
        btn.querySelector(".tab-suivi-rubric-option__points").textContent =
          formatNombreAffiche(cell.points) + " pt";
        btn.addEventListener("click", function () {
          if (ctx.value.selected[item.id] === level.id) {
            delete ctx.value.selected[item.id];
          } else {
            ctx.value.selected[item.id] = level.id;
          }
          enregistrerSelectionRubrique(ctx);
          rendreGrilleRubriqueDialog(ctx);
        });
        td.appendChild(btn);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    dlgRubricGrid.appendChild(table);
    majScoreDialogRubrique(ctx);
  }

  function indexEleveRubriqueActif(t) {
    if (!t || !rubricCellRowId) return -1;
    for (var i = 0; i < t.rows.length; i++) {
      if (t.rows[i].id === rubricCellRowId) return i;
    }
    return -1;
  }

  function majNavigationRubriqueCellule() {
    var t = getActif();
    var isTest = !!rubricCellTest;
    var idx = indexEleveRubriqueActif(t);
    var total = t && t.rows ? t.rows.length : 0;
    var showNav = !isTest && idx >= 0 && total > 1;
    var btnPrev = document.getElementById("btn-rubric-cell-prev");
    var btnNext = document.getElementById("btn-rubric-cell-next");
    if (dlgRubricNav) dlgRubricNav.hidden = !showNav;
    if (dlgRubricNavCount) dlgRubricNavCount.textContent = showNav ? idx + 1 + " / " + total : "";
    if (btnPrev) btnPrev.disabled = !showNav || idx <= 0;
    if (btnNext) btnNext.disabled = !showNav || idx >= total - 1;
  }

  function naviguerRubriqueEleve(delta) {
    var t = getActif();
    if (!t || !rubricCellColId || rubricCellTest) return;
    var idx = indexEleveRubriqueActif(t);
    if (idx < 0) return;
    var next = idx + delta;
    if (next < 0 || next >= t.rows.length) return;
    ouvrirDialogRubriqueCellule(t.rows[next].id, rubricCellColId);
  }

  function ouvrirDialogRubriqueCellule(rowId, colId) {
    var t = getActif();
    if (!t || !dialogRubricCell || !dialogRubricCell.showModal) return;
    var row = getRowParId(t, rowId);
    var col = t.cols.filter(function (c) {
      return c.id === colId;
    })[0];
    if (!row || !col || col.type !== "rubric") return;
    rubricCellTest = null;
    rubricCellRowId = rowId;
    rubricCellColId = colId;
    var rubrique = normaliserRubrique(col.rubric);
    if (dlgRubricCellTitle) dlgRubricCellTitle.textContent = (col.label || rubrique.title) + " · " + labelEleveRow(row);
    if (dlgRubricCellMeta) dlgRubricCellMeta.textContent = metaRubriqueTexte(rubrique);
    rendreGrilleRubriqueDialog(obtenirContexteRubriqueActif());
    majNavigationRubriqueCellule();
    if (!dialogRubricCell.open) dialogRubricCell.showModal();
  }

  function ouvrirDialogRubriqueTest(rubrique) {
    if (!dialogRubricCell || !dialogRubricCell.showModal) return;
    rubricCellRowId = null;
    rubricCellColId = null;
    rubricCellTest = {
      mode: "test",
      rubrique: normaliserRubrique(rubrique),
      value: { selected: {}, points: 0, note: null },
    };
    if (dlgRubricCellTitle) dlgRubricCellTitle.textContent = "Test · " + rubricCellTest.rubrique.title;
    if (dlgRubricCellMeta) dlgRubricCellMeta.textContent = metaRubriqueTexte(rubricCellTest.rubrique);
    rendreGrilleRubriqueDialog(rubricCellTest);
    majNavigationRubriqueCellule();
    dialogRubricCell.showModal();
  }

  function fermerDialogRubriqueCellule() {
    rubricCellRowId = null;
    rubricCellColId = null;
    rubricCellTest = null;
    if (dialogRubricCell && dialogRubricCell.open) dialogRubricCell.close();
  }

  function focusCelluleSaisie(rowIndex, colId) {
    if (!tbodyEl || rowIndex < 0) return;
    var t = getActif();
    if (!t || rowIndex >= t.rows.length) return;
    var rowId = t.rows[rowIndex].id;
    var sel =
      'tr[data-row-id="' +
      rowId +
      '"] td[data-col-id="' +
      colId +
      '"] input, tr[data-row-id="' +
      rowId +
      '"] td[data-col-id="' +
      colId +
      '"] select';
    var next = tbodyEl.querySelector(sel);
    if (next) {
      next.focus();
      if (typeof next.select === "function") next.select();
    }
  }

  function syntheseColonne(t, col) {
    if (!t.rows.length) return "—";
    if (col.type === "eleveInfo") return "—";
    if (col.type === "check") {
      if (col.horsSynthese) return "—";
      return syntheseColonneAppelTexte(t, col);
    }
    if ((col.type === "number" || col.type === "calc") && !colonneEstNote(col)) return "—";
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
    return formatNombreAvecBareme(moy, baremeColonne(t, col)) || "—";
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

  function trouverRowPourImport(t, ent) {
    var meta = typeof ent === "string" ? {} : ent.meta || {};
    if (meta.eleveId) {
      for (var i = 0; i < t.rows.length; i++) {
        if (t.rows[i].meta && t.rows[i].meta.eleveId === meta.eleveId) {
          return t.rows[i];
        }
      }
    }
    var label = typeof ent === "string" ? ent : ent.label;
    var l = normaliserNom(label).toLowerCase();
    if (!l) return null;
    for (var j = 0; j < t.rows.length; j++) {
      if (normaliserNom(t.rows[j].label).toLowerCase() === l) {
        return t.rows[j];
      }
    }
    return null;
  }

  function importerOuFusionnerLignes(t, entrees) {
    var ajoutes = 0;
    var maj = 0;
    entrees.forEach(function (ent) {
      var label = typeof ent === "string" ? ent : ent.label;
      var meta = typeof ent === "string" ? {} : ent.meta || {};
      var l = normaliserNom(label);
      if (!l) return;
      var existant = trouverRowPourImport(t, ent);
      if (existant) {
        if (typeof EleveFusion !== "undefined" && EleveFusion.fusionnerMetaRow) {
          EleveFusion.fusionnerMetaRow(existant, meta);
        } else if (meta && typeof meta === "object") {
          if (!existant.meta) existant.meta = {};
          Object.keys(meta).forEach(function (k) {
            if (meta[k] !== undefined && meta[k] !== null && String(meta[k]).trim() !== "") {
              existant.meta[k] = meta[k];
            }
          });
        }
        existant.label = labelEleveRow(existant);
        maj++;
        return;
      }
      t.rows.push({
        id: genererId("row"),
        label: l,
        meta: meta,
      });
      ajoutes++;
    });
    return { ajoutes: ajoutes, maj: maj };
  }

  function ajouterLignes(t, entrees) {
    return importerOuFusionnerLignes(t, entrees).ajoutes;
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
    } else if (mode === "equipe") {
      rows.sort(function (a, b) {
        var ea = (a.meta && a.meta.equipe) || "";
        var eb = (b.meta && b.meta.equipe) || "";
        var c = comparateurTexte(ea, eb);
        return inv * (c !== 0 ? c : comparateurTexte(a.label, b.label));
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
          return sens * (scoreTriPresence(va) - scoreTriPresence(vb));
        }
        if (
          col.type === "eleveInfo" &&
          (normaliserChampInfoEleve(col.infoChamp) === "niveau" ||
            normaliserChampInfoEleve(col.infoChamp) === "vma")
        ) {
          var naN = typeof va === "number" && !isNaN(va) ? va : -Infinity;
          var nbN = typeof vb === "number" && !isNaN(vb) ? vb : -Infinity;
          if (naN === nbN) return sens * comparateurTexte(a.label, b.label);
          return sens * (naN - nbN);
        }
        if (col.type === "eleveInfo") {
          var ta = va === null || va === undefined ? "" : String(va);
          var tb = vb === null || vb === undefined ? "" : String(vb);
          var ct = comparateurTexte(ta, tb);
          return sens * (ct !== 0 ? ct : comparateurTexte(a.label, b.label));
        }
        var na = typeof va === "number" && !isNaN(va) ? va : -Infinity;
        var nb = typeof vb === "number" && !isNaN(vb) ? vb : -Infinity;
        if (na === nb) return sens * comparateurTexte(a.label, b.label);
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
    if (listeSaisieMeta) listeSaisieMeta.refresh();
    majFiltreColonnesUi(t);

    var cols = colonnesVisibles(t);
    var hasGrid = t.rows.length > 0 || t.cols.length > 0;
    if (emptyEl) {
      emptyEl.hidden = hasGrid;
      if (hasGrid && t.rows.length > 0 && t.cols.length > 0 && !cols.length) {
        emptyEl.hidden = false;
        emptyEl.textContent =
          filtreColonnes === "check"
            ? "Aucune colonne d’appel (✓/✗) sur cette feuille."
            : filtreColonnes === "note"
              ? "Aucune colonne de note sur cette feuille."
              : filtreColonnes === "autre"
                ? "Aucune autre colonne (mesure, somme…) sur cette feuille."
                : "Aucune colonne à afficher.";
      } else if (hasGrid) {
        emptyEl.textContent =
          "Ajoutez des élèves puis créez des colonnes (bouton Nouvelle colonne).";
      }
    }
    if (scrollEl) scrollEl.hidden = !hasGrid || (t.rows.length > 0 && t.cols.length > 0 && !cols.length);
    if (!theadEl || !tbodyEl) return;

    theadEl.innerHTML = "";
    tbodyEl.innerHTML = "";

    if (!hasGrid) return;
    if (t.rows.length > 0 && t.cols.length > 0 && !cols.length) return;

    if (!t.cols.length) {
      var trSeul = document.createElement("tr");
      trSeul.className = "tab-suivi-head-labels";
      trSeul.appendChild(creerEnteteEleve());
      theadEl.appendChild(trSeul);
    }

    if (cols.length) {
      var trHead = document.createElement("tr");
      trHead.className = "tab-suivi-head-main";

      trHead.appendChild(creerEnteteEleve());

      cols.forEach(function (col) {
        var th = document.createElement("th");
        th.className =
          "tab-suivi-th tab-suivi-th--col" +
          (col.type === "calc" ? " tab-suivi-th--calc" : "") +
          (col.type === "rubric" ? " tab-suivi-th--rubric" : "") +
          (col.type === "eleveInfo" ? " tab-suivi-th--info-eleve" : "");
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

        var bareme = baremeColonne(t, col);
        if (bareme > 0) {
          var baremeHint = document.createElement("span");
          baremeHint.className = "tab-suivi-col-bareme";
          baremeHint.textContent = "/" + bareme;
          stack.appendChild(baremeHint);
        } else if (col.type === "check" && col.horsSynthese) {
          var horsHint = document.createElement("span");
          horsHint.className = "tab-suivi-col-bareme tab-suivi-col-bareme--hors-synth";
          horsHint.textContent = "hors synth.";
          stack.appendChild(horsHint);
        }

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

      cols.forEach(function (col) {
        var thS = document.createElement("th");
        thS.className = "tab-suivi-th tab-suivi-th--col tab-suivi-th--stats";
        thS.scope = "col";
        thS.setAttribute("data-col-id", col.id);
        thS.textContent =
          col.type === "check" && !col.horsSynthese
            ? syntheseColonneAppelTexte(t, col)
            : syntheseColonne(t, col);
        trStats.appendChild(thS);
      });

      theadEl.appendChild(trStats);
    }

    var afficherTriEquipe = t.affichageTriEquipe === true;

    t.rows.forEach(function (row, rowIndex) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-row-id", row.id);
      if (afficherTriEquipe) {
        var eqCol = couleurEquipeAffichage(row);
        if (eqCol) {
          tr.classList.add("tab-suivi-tr--equipe");
          tr.style.setProperty("--tab-suivi-equipe-couleur", eqCol);
        }
      }

      var tdNom = document.createElement("td");
      tdNom.className = "tab-suivi-td tab-suivi-td--nom";

      var nomWrap = document.createElement("div");
      nomWrap.className = "tab-suivi-nom-wrap";

      nomWrap.appendChild(creerBoutonIconeEleve(t, row));
      nomWrap.appendChild(creerBoutonOubliTenue(row));

      if (afficherTriEquipe) {
        var badgeEquipe = creerBadgeEquipe(row, true);
        if (badgeEquipe) nomWrap.appendChild(badgeEquipe);
      }

      var nomLabel = document.createElement("span");
      nomLabel.className = "tab-suivi-nom-label";
      nomLabel.textContent = labelEleveRow(row);
      nomWrap.appendChild(nomLabel);

      tdNom.appendChild(nomWrap);
      tr.appendChild(tdNom);

      cols.forEach(function (col) {
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
              : formatNombreAffiche(cv) || "—";
          td.appendChild(spanCalc);
        } else if (col.type === "rubric") {
          var btnRubric = document.createElement("button");
          btnRubric.type = "button";
          var scoreRubric = calculerScoreRubrique(col.rubric, getCell(t, row.id, col.id));
          btnRubric.className = "tab-suivi-rubric-cell-btn " + classeScoreRubrique(scoreRubric);
          btnRubric.textContent = libelleScoreRubrique(scoreRubric);
          btnRubric.setAttribute(
            "aria-label",
            "Ouvrir la grille " + (col.label || "") + " pour " + labelEleveRow(row)
          );
          btnRubric.addEventListener("click", function () {
            ouvrirDialogRubriqueCellule(row.id, col.id);
          });
          td.appendChild(btnRubric);
        } else if (col.type === "eleveInfo") {
          td.appendChild(creerCelluleInfoEleve(t, row, col, rowIndex));
        } else if (col.type === "check") {
          var btn = document.createElement("button");
          btn.type = "button";
          appliquerStyleBoutonCheck(btn, getCell(t, row.id, col.id));
          btn.setAttribute(
            "title",
            "Clic : ✓ / ✗ / vide — appui long : menu complet (retard, attitude, absences…)"
          );
          var wasLongPress = lierLongPressPresence(btn, function () {
            ouvrirMenuPresence(btn, function (statut) {
              setCell(t, row.id, col.id, statut);
              appliquerStyleBoutonCheck(btn, statut);
              majStatsColonneDom(t, col);
              planifierSauvegarde();
            });
          });
          btn.addEventListener("click", function () {
            if (wasLongPress()) return;
            var cur = getCell(t, row.id, col.id);
            var next;
            if (cur === true) next = false;
            else if (cur === false) next = null;
            else next = true;
            setCell(t, row.id, col.id, next);
            appliquerStyleBoutonCheck(btn, next);
            majStatsColonneDom(t, col);
            planifierSauvegarde();
          });
          td.appendChild(btn);
        } else {
          var numWrap = document.createElement("div");
          numWrap.className = "tab-suivi-cell-number";
          var num = document.createElement("input");
          num.type = "number";
          num.className = "tab-suivi-cell-input";
          num.inputMode = "decimal";
          num.setAttribute("data-col-id", col.id);
          if (col.max > 0) num.max = col.max;
          var nv = getCell(t, row.id, col.id);
          num.value = nv === null || nv === undefined || nv === "" ? "" : String(nv);
          num.addEventListener("change", function () {
            appliquerValeurDepuisInput(num, t, row, col);
          });
          num.addEventListener("keydown", function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            appliquerValeurDepuisInput(num, t, row, col);
            focusCelluleSaisie(rowIndex + 1, col.id);
          });
          numWrap.appendChild(num);
          td.appendChild(numWrap);
        }

        tr.appendChild(td);
      });

      tbodyEl.appendChild(tr);
    });

    if (scrollVersColId) defilerVersColonne(scrollVersColId);
  }

  function toutRafraichir() {
    majSelectTableaux();
    var t = getActif();
    if (t && cacheElevesParId) {
      if (hydraterEquipesFeuilleSync(t)) planifierSauvegarde();
      rendreGrille();
      return;
    }
    if (t) {
      hydraterEquipesFeuille(t).then(function (changed) {
        if (changed) planifierSauvegarde();
        rendreGrille();
      });
      return;
    }
    rendreGrille();
  }

  function definirActif(id) {
    actifId = id;
    sauverActifIdLocal(id);
    toutRafraichir();
  }

  function ouvrirDialogInfoEleve() {
    if (!dialogInfoEleve || typeof dialogInfoEleve.showModal !== "function") {
      montrerMsg("Fenêtre indisponible sur ce navigateur.");
      return;
    }
    if (dlgInfoEleveChamp) dlgInfoEleveChamp.value = "equipe";
    if (dialogGestion && dialogGestion.open) dialogGestion.close();
    dialogInfoEleve.showModal();
  }

  function creerColonneInfoEleve() {
    var champ = normaliserChampInfoEleve(dlgInfoEleveChamp ? dlgInfoEleveChamp.value : "equipe");
    var col = ajouterColonne("eleveInfo", true, {
      infoChamp: champ,
      label: libelleChampInfoEleve(champ),
    });
    if (!col) return;
    if (dialogInfoEleve && dialogInfoEleve.open) dialogInfoEleve.close();
    montrerOk("Colonne « " + col.label + " » ajoutée.");
    chargerCacheEleves(true)
      .then(function () {
        var t = getActif();
        if (t && hydraterEquipesFeuilleSync(t)) planifierSauvegarde();
        rendreGrille(col.id);
      })
      .catch(function () {
        rendreGrille(col.id);
      });
  }

  function ajouterColonne(type, scrollTo, options) {
    var t = getActif();
    if (!t) return null;
    options = options || {};
    if (
      type !== "check" &&
      type !== "number" &&
      type !== "calc" &&
      type !== "rubric" &&
      type !== "eleveInfo"
    ) {
      return null;
    }
    var col = {
      id: genererId("col"),
      label: labelColonneDefaut(t),
      type: type,
    };
    if (type === "eleveInfo") {
      col.infoChamp = normaliserChampInfoEleve(options.infoChamp);
      col.infoEditable = options.infoEditable === true;
      col.label = normaliserNom(options.label || libelleChampInfoEleve(col.infoChamp));
    }
    if (type === "calc") {
      col.calcOp = options.calcOp === "avg" ? "avg" : "sum";
      col.sourceIds = (options.sourceIds || []).slice();
      col.label = labelColonneCalcDefaut(t, col.calcOp, col.sourceIds);
      col.estNote = false;
    }
    if (type === "number") {
      col.estNote = false;
    }
    if (type === "rubric") {
      col.rubric = normaliserRubrique(options.rubric || {});
      col.label = normaliserNom(options.label || col.rubric.title || "Evaluation");
      col.estNote = true;
      col.max = RUBRIQUE_MAX_DEFAUT;
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
      if (c.type === "calc") majStatsColonneDom(t, c);
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
        var lib = col.label || "Colonne";
        if (col.type === "eleveInfo") {
          lib += " (" + libelleChampInfoEleve(col.infoChamp) + ")";
        }
        opt.textContent = lib;
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
    chargerCacheEleves(true)
      .then(function () {
        var t = getActif();
        if (t) {
          if (hydraterEquipesFeuilleSync(t)) planifierSauvegarde();
        }
        majAffichageDialogTri();
        dialogTri.showModal();
      })
      .catch(function () {
        majAffichageDialogTri();
        dialogTri.showModal();
      });
  }

  function appliquerTriDialog() {
    var t = getActif();
    if (!t || !dlgTriPar) return;
    var par = dlgTriPar.value;

    function executerTri() {
      t.affichageTriEquipe = par === "equipe";
      if (par === "colonne") {
        if (!t.cols.length) {
          montrerMsg("Ajoutez une colonne avant de trier par colonne.");
          return;
        }
        if (!dlgTriColonne || !dlgTriColonne.value) return;
        var colTri = t.cols.filter(function (c) {
          return c.id === dlgTriColonne.value;
        })[0];
        if (colTri && colTri.type === "eleveInfo") {
          t.affichageTriEquipe = false;
        }
        trierLignes(t, "col:" + dlgTriColonne.value, triSensDesc);
      } else {
        trierLignes(t, par, triSensDesc);
      }
      if (dialogTri && dialogTri.open) dialogTri.close();
      rendreGrille();
      planifierSauvegarde();
      if (par === "equipe") {
        var avecEquipe = t.rows.filter(function (r) {
          return libelleEquipeRow(r);
        }).length;
        if (!avecEquipe) {
          montrerMsg(
            "Aucune équipe sur cette feuille. Enregistrez les équipes depuis Composition d’équipes, puis réimportez la classe ou rouvrez la feuille."
          );
        } else {
          montrerOk("Tri par équipe appliqué.");
        }
      } else {
        montrerOk("Tri appliqué.");
      }
    }

    if (par === "colonne" || par === "equipe") {
      chargerCacheEleves(true)
        .then(function () {
          return hydraterEquipesFeuille(t);
        })
        .then(function (changed) {
          if (changed) planifierSauvegarde();
          executerTri();
        })
        .catch(function () {
          executerTri();
        });
      return;
    }
    executerTri();
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
      var lib =
        (col.label || "Colonne") +
        (col.estNote ? (col.max > 0 ? " /" + col.max : " · note") : " · mesure");
      lab.appendChild(document.createTextNode(lib));
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
    if (col.type === "check") {
      return col.horsSynthese
        ? "Présence / rendu — hors synthèse"
        : "Appel (✓ et ✗) — inclus dans la synthèse";
    }
    if (col.type === "calc") {
      var op = col.calcOp === "avg" ? "Moyenne" : "Somme";
      if (col.estNote) return op + " (note" + (col.max > 0 ? " /" + col.max : "") + ")";
      return op + " calculée (notes et mesures possibles)";
    }
    if (col.type === "rubric") {
      var r = normaliserRubrique(col.rubric);
      return "Grille d'évaluation — " + metaRubriqueTexte(r) + " — note /20";
    }
    if (col.type === "eleveInfo") {
      var libInfo = "Info élève — " + libelleChampInfoEleve(col.infoChamp);
      if (col.infoEditable) libInfo += " (modifiable)";
      return libInfo;
    }
    if (col.estNote) {
      return "Note" + (col.max > 0 ? " /" + col.max : "");
    }
    return "Mesure chiffrée (hors moyennes)";
  }

  function rendreRemplirDialogColonne(t, col) {
    if (!dlgColRemplirBody) return;
    dlgColRemplirBody.innerHTML = "";
    if (col.type === "check") {
      [
        { label: "Tout marquer présent", val: true, cls: "tab-suivi-remplir-ok" },
        { label: "Tout marquer absent", val: false, cls: "tab-suivi-remplir-ko" },
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

  function majDialogColonneNoteUi() {
    if (!dlgColNoteWrap || !dlgColEstNote) return;
    var estNote = dlgColEstNote.checked;
    if (dlgColMaxWrap) dlgColMaxWrap.hidden = !estNote;
    if (estNote && dlgColMax && !String(dlgColMax.value || "").trim()) {
      dlgColMax.value = "20";
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
    if (dlgColInfoWrap) dlgColInfoWrap.hidden = col.type !== "eleveInfo";
    if (dlgColInfoChamp) {
      dlgColInfoChamp.value = normaliserChampInfoEleve(col.infoChamp);
    }
    majDialogColonneInfoUi(col);
    if (dlgColNoteWrap) dlgColNoteWrap.hidden = col.type !== "number" && col.type !== "calc";
    if (dlgColEstNote) {
      dlgColEstNote.checked =
        (col.type === "number" || col.type === "calc") && col.estNote === true;
    }
    if (dlgColMax) {
      var estNoteCol = col.type === "number" || col.type === "calc";
      dlgColMax.value =
        estNoteCol && col.estNote && col.max > 0 ? String(col.max) : col.estNote ? "20" : "";
    }
    majDialogColonneNoteUi();
    if (dlgColCheckWrap) dlgColCheckWrap.hidden = col.type !== "check";
    if (dlgColHorsSynthese) dlgColHorsSynthese.checked = col.type === "check" && col.horsSynthese === true;
    if (dlgColRubricWrap) dlgColRubricWrap.hidden = col.type !== "rubric";

    var peutRemplir =
      col.type !== "calc" && col.type !== "rubric" && col.type !== "eleveInfo" && t.rows.length > 0;
    if (dlgColRemplirSection) dlgColRemplirSection.hidden = !peutRemplir;
    if (dlgColCalcHint) dlgColCalcHint.hidden = col.type !== "calc";
    if (col.type === "calc" && dlgColCalcHint && !t.rows.length) {
      dlgColCalcHint.textContent =
        "Colonne calculée automatiquement. Ajoutez des élèves pour voir les résultats.";
    } else if (dlgColCalcHint && col.type === "calc") {
      dlgColCalcHint.textContent =
        "Colonne calculée automatiquement — les valeurs ne peuvent pas être remplies à la main.";
    }
    if (
      !peutRemplir &&
      col.type !== "calc" &&
      col.type !== "rubric" &&
      col.type !== "eleveInfo" &&
      dlgColRemplirSection
    ) {
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
    if (col && (col.type === "number" || col.type === "calc")) {
      col.estNote = dlgColEstNote ? dlgColEstNote.checked : false;
      if (col.estNote && dlgColMax) {
        var rawMax = (dlgColMax.value || "").trim();
        if (!rawMax) {
          col.max = 20;
        } else {
          var parsedMax = parseFloat(rawMax.replace(",", "."));
          col.max = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 20;
        }
      } else {
        col.max = null;
      }
    }
    if (col && col.type === "check") {
      col.horsSynthese = dlgColHorsSynthese ? dlgColHorsSynthese.checked : false;
    }
    if (col && col.type === "eleveInfo") {
      if (dlgColInfoChamp) col.infoChamp = normaliserChampInfoEleve(dlgColInfoChamp.value);
      if (dlgColInfoEditable) col.infoEditable = dlgColInfoEditable.checked;
    }
    if (dialogColonne && dialogColonne.open) dialogColonne.close();
    colonneDialogId = null;
    var colInfo = col && col.type === "eleveInfo";
    var finMajColonne = function () {
      rendreGrille();
      planifierSauvegarde();
      montrerOk("Colonne mise à jour.");
    };
    if (colInfo) {
      chargerCacheEleves(true)
        .then(function () {
          var tab = getActif();
          if (tab && hydraterEquipesFeuilleSync(tab)) planifierSauvegarde();
        })
        .then(finMajColonne)
        .catch(finMajColonne);
    } else {
      finMajColonne();
    }
  }

  function chargerRubriquesPersonnelles() {
    if (typeof DataManager === "undefined" || !DataManager.getParametre) {
      rubriquesPersonnelles = [];
      return Promise.resolve([]);
    }
    return DataManager.getParametre(RUBRIQUES_PARAM_ID)
      .then(function (rec) {
        if (rec && Array.isArray(rec.rubrics)) {
          rubriquesPersonnelles = rec.rubrics.map(normaliserRubrique);
          return rubriquesPersonnelles;
        }
        rubriquesPersonnelles = [normaliserRubrique(grilleBasket4eExemple())];
        return sauverRubriquesPersonnelles().then(function () {
          return rubriquesPersonnelles;
        });
      })
      .catch(function () {
        rubriquesPersonnelles = [];
        return rubriquesPersonnelles;
      });
  }

  function sauverRubriquesPersonnelles() {
    if (typeof DataManager === "undefined" || !DataManager.saveParametre) return Promise.resolve();
    return DataManager.saveParametre({
      id: RUBRIQUES_PARAM_ID,
      rubrics: rubriquesPersonnelles.map(normaliserRubrique),
      updatedAt: maintenant(),
    });
  }

  function ajouterRubriquePersonnelle(rubrique) {
    var r = normaliserRubrique(rubrique);
    r.source = "local";
    rubriquesPersonnelles = rubriquesPersonnelles.filter(function (item) {
      return item.id !== r.id;
    });
    rubriquesPersonnelles.push(r);
    return sauverRubriquesPersonnelles().then(function () {
      return r;
    });
  }

  function urlCatalogueRubriques() {
    return window.OUTILS_EPS_EVAL_CATALOG_URL || RUBRIQUES_CATALOG_URL;
  }

  function majStatutCatalogueEnLigne(etat, texte) {
    if (!dlgRubricOnlineStatus) return;
    dlgRubricOnlineStatus.classList.remove("is-ok", "is-error", "is-warn");
    if (etat) dlgRubricOnlineStatus.classList.add("is-" + etat);
    dlgRubricOnlineStatus.textContent = texte;
  }

  function chargerCatalogueEnLigne() {
    rubriquesEnLigne = [];
    if (typeof fetch !== "function") {
      majStatutCatalogueEnLigne("error", "Catalogue en ligne indisponible sur ce navigateur.");
      return Promise.resolve([]);
    }
    if (navigator && navigator.onLine === false) {
      majStatutCatalogueEnLigne("error", "Catalogue en ligne indisponible hors ligne. Connexion nécessaire.");
      return Promise.resolve([]);
    }
    majStatutCatalogueEnLigne("warn", "Chargement du catalogue en ligne...");
    var loader =
      window.OutilsEPS &&
      window.OutilsEPS.catalog &&
      window.OutilsEPS.catalog.loadCatalogWithLegacyFallback
        ? window.OutilsEPS.catalog.loadCatalogWithLegacyFallback(urlCatalogueRubriques())
        : fetch(urlCatalogueRubriques(), { cache: "no-store" })
            .then(function (res) {
              if (!res.ok) throw new Error("Catalogue en ligne introuvable.");
              return res.json();
            })
            .then(function (data) {
              return Array.isArray(data) ? data : Array.isArray(data.rubrics) ? data.rubrics : [];
            });
    return loader
      .then(function (arr) {
        rubriquesEnLigne = (arr || []).map(function (r) {
          var rub = normaliserRubrique(r);
          rub.source = "en ligne";
          return rub;
        });
        majStatutCatalogueEnLigne(
          "ok",
          rubriquesEnLigne.length
            ? rubriquesEnLigne.length + " grille(s) publiée(s) chargée(s)."
            : "Catalogue en ligne vide pour le moment."
        );
        return rubriquesEnLigne;
      })
      .catch(function () {
        rubriquesEnLigne = [];
        majStatutCatalogueEnLigne("error", "Catalogue en ligne non chargé. Connexion nécessaire.");
        return [];
      });
  }

  function urlPropositionRubrique(rubrique, typeAvis) {
    var r = normaliserRubrique(rubrique);
    var titre = typeAvis
      ? "Avis catalogue evaluation - " + r.title
      : "Proposition grille evaluation - " + r.title;
    var body =
      (typeAvis ? "Avis : " + typeAvis + "\n\n" : "Merci de proposer cette grille au catalogue.\n\n") +
      "APSA : " +
      r.apsa +
      "\nCycle : " +
      labelCycleRubrique(r.cycle) +
      "\nNiveau : " +
      r.niveau +
      "\n\nJSON :\n" +
      JSON.stringify(r, null, 2);
    var configured = window.OUTILS_EPS_EVAL_SUBMIT_URL || "";
    if (configured) {
      return (
        configured +
        (configured.indexOf("?") === -1 ? "?" : "&") +
        "title=" +
        encodeURIComponent(titre) +
        "&body=" +
        encodeURIComponent(body)
      );
    }
    return RUBRIQUES_SUBMIT_MAIL + "?subject=" + encodeURIComponent(titre) + "&body=" + encodeURIComponent(body);
  }

  function proposerPublicationRubrique(rubrique) {
    if (
      window.OutilsEPS &&
      window.OutilsEPS.catalog &&
      window.OutilsEPS.catalog.submitGridToCatalog
    ) {
      return window.OutilsEPS.catalog
        .submitGridToCatalog(normaliserRubrique(rubrique), { shareToCatalog: true, source: "teacher" })
        .then(function (res) {
          if (res && res.message) {
            if (res.submitted) montrerOk(res.message);
            else if (res.duplicate) montrerMsg(res.message);
            else if (!res.skipped) montrerMsg(res.message);
          }
          return res;
        })
        .catch(function (err) {
          montrerMsg(err && err.message ? err.message : "Publication impossible.");
        });
    }
    montrerMsg("Catalogue en ligne non configuré (Supabase).");
    return Promise.resolve({ submitted: false });
  }

  function creerColonneRubriqueDepuisModele(rubrique, options) {
    options = options || {};
    var r = normaliserRubrique(rubrique);
    var col = ajouterColonne("rubric", true, { rubric: r, label: r.title });
    if (!col) return;
    if (dialogRubricCatalog && dialogRubricCatalog.open) dialogRubricCatalog.close();
    fermerDialogGestionSansPrompt();
    if (options.saveLocal) {
      ajouterRubriquePersonnelle(r).catch(function (err) {
        montrerMsg(err && err.message ? err.message : "Impossible d'enregistrer cette grille.");
      });
    }
    if (options.share) {
      proposerPublicationRubrique(r).finally(function () {
        montrerOk("Grille « " + r.title + " » ajoutée.");
      });
    } else {
      montrerOk("Grille « " + r.title + " » ajoutée.");
    }
  }

  function rendreCarteRubrique(rubrique) {
    var r = normaliserRubrique(rubrique);
    var card = document.createElement("article");
    card.className = "tab-suivi-rubric-card";
    var head = document.createElement("div");
    head.className = "tab-suivi-rubric-card__head";
    var title = document.createElement("h4");
    title.className = "tab-suivi-rubric-card__title";
    title.textContent = r.title;
    var badge = document.createElement("span");
    badge.className = "tab-suivi-rubric-card__badge";
    badge.textContent = r.source === "exemple" ? "Exemple" : r.source === "en ligne" ? "Publié" : "Perso";
    head.appendChild(title);
    head.appendChild(badge);
    card.appendChild(head);

    var meta = document.createElement("p");
    meta.className = "tab-suivi-rubric-card__meta";
    meta.textContent = metaRubriqueTexte(r);
    card.appendChild(meta);

    var desc = document.createElement("p");
    desc.className = "tab-suivi-rubric-card__desc";
    desc.textContent = r.items.length + " items · " + r.levels.length + " niveaux · note /20";
    card.appendChild(desc);

    var rating = document.createElement("p");
    rating.className = "tab-suivi-rubric-card__rating";
    var score = r.rating && r.rating.score ? r.rating.score : 0;
    var votes = r.rating && r.rating.votes ? r.rating.votes : 0;
    rating.textContent =
      score > 0 ? "★ " + formatNombreAffiche(score) + "/5 · " + votes + " avis" : "☆ Pas encore d'avis";
    card.appendChild(rating);
    if (r.source === "local") rating.remove();

    var actions = document.createElement("div");
    actions.className = "tab-suivi-rubric-card__actions";
    var test = document.createElement("button");
    test.type = "button";
    test.className = "btn btn--ghost btn--small";
    test.textContent = "Tester";
    test.addEventListener("click", function () {
      ouvrirDialogRubriqueTest(r);
    });
    var use = document.createElement("button");
    use.type = "button";
    use.className = "btn btn--primary btn--small";
    use.textContent = "Utiliser";
    use.addEventListener("click", function () {
      creerColonneRubriqueDepuisModele(r);
    });
    var avis = document.createElement("a");
    avis.className = "btn btn--ghost btn--small";
    avis.href = urlPropositionRubrique(r, "utile");
    avis.target = "_blank";
    avis.rel = "noopener";
    avis.textContent = "Avis ★";
    actions.appendChild(test);
    actions.appendChild(use);
    actions.appendChild(avis);
    if (r.source === "local") avis.remove();
    card.appendChild(actions);
    return card;
  }

  function rendreCatalogueRubriques() {
    if (!dlgRubricCatalogList) return;
    dlgRubricCatalogList.innerHTML = "";
    var query = normaliserRechercheRubrique(dlgRubricSearch ? dlgRubricSearch.value : "");
    var list = rubriquesPersonnelles.map(function (r) {
      var rub = normaliserRubrique(r);
      rub.source = "local";
      return rub;
    }).filter(function (r) {
      if (!query) return true;
      var hay = normaliserRechercheRubrique(
        [r.title, r.apsa, r.cycle, labelCycleRubrique(r.cycle), r.niveau, r.author, r.source].join(" ")
      );
      return hay.indexOf(query) !== -1;
    });
    if (dlgRubricCatalogEmpty) {
      dlgRubricCatalogEmpty.textContent =
        "Aucune grille personnelle disponible. Ouvrez Grilles d'evaluation pour en creer, importer ou dupliquer depuis le catalogue.";
      dlgRubricCatalogEmpty.hidden = list.length > 0;
    }
    list.forEach(function (rubrique) {
      dlgRubricCatalogList.appendChild(rendreCarteRubrique(rubrique));
    });
  }

  function configDialogRubriqueEdition(mode) {
    rubriqueEditionMode = mode === "edit-col" ? "edit-col" : "create";
    var edition = rubriqueEditionMode === "edit-col";
    if (dlgRubricDialogTitle) {
      dlgRubricDialogTitle.textContent = edition ? "Modifier la grille" : "Grille d'évaluation";
    }
    if (dlgRubricDialogIntro) {
      dlgRubricDialogIntro.textContent = edition
        ? "Modifiez la grille de cette colonne. Les notes existantes seront recalculées."
        : "Choisissez un exemple, importez une grille CSV ou enregistrez votre propre modèle.";
    }
    if (dlgRubricOnlineStatus) dlgRubricOnlineStatus.hidden = edition;
    if (dlgRubricSearchWrap) dlgRubricSearchWrap.hidden = edition;
    if (dlgRubricPageLink) dlgRubricPageLink.hidden = edition;
    if (dlgRubricCatalogSection) dlgRubricCatalogSection.hidden = edition;
    if (!edition && dlgRubricDialogIntro) {
      dlgRubricDialogIntro.textContent =
        "Choisissez une grille parmi Mes grilles. Pour créer, importer ou récupérer une grille du catalogue, ouvrez l'outil Grilles d'évaluation.";
    }
    if (dlgRubricOnlineStatus) dlgRubricOnlineStatus.hidden = true;
    if (dlgRubricEditorSection) dlgRubricEditorSection.hidden = !edition;
    if (dlgRubricEditorSectionTitle) {
      dlgRubricEditorSectionTitle.textContent = edition ? "Grille de la colonne" : "Importer ou créer";
    }
    var btnSave = document.getElementById("btn-rubric-create-import");
    if (btnSave) btnSave.textContent = edition ? "Enregistrer la grille" : "Créer la colonne";
  }

  function remplirFormulaireRubrique(rubrique) {
    var r = normaliserRubrique(rubrique || rubriqueVierge(metaRubriqueEdition()));
    if (dlgRubricTitle) dlgRubricTitle.value = r.title || "";
    if (dlgRubricApsa) {
      if (window.OutilsEPS && window.OutilsEPS.fillApsaSelect) {
        window.OutilsEPS.fillApsaSelect(dlgRubricApsa, { selected: r.apsa || "" });
      } else {
        dlgRubricApsa.value = r.apsa || "";
      }
    }
    if (dlgRubricCycle) dlgRubricCycle.value = normaliserCycleRubrique(r.cycle);
    if (dlgRubricNiveau) dlgRubricNiveau.value = r.niveau || "";
    if (dlgRubricShare) dlgRubricShare.checked = true;
    rubriqueEdition = r;
    rendreEditeurRubrique();
    mettreAJourPartageCatalogueRubrique();
  }

  function ouvrirDialogRubriqueCatalog() {
    if (!dialogRubricCatalog || !dialogRubricCatalog.showModal) {
      montrerMsg("Fenêtre de grille indisponible sur ce navigateur.");
      return;
    }
    rubriqueEditionColonneId = null;
    rubriqueEditionInitiale = null;
    configDialogRubriqueEdition("create");
    chargerRubriquesPersonnelles().then(function () {
      rendreCatalogueRubriques();
      remplirFormulaireRubrique(rubriqueVierge({ title: "", apsa: "", cycle: "4", niveau: "" }));
      dialogRubricCatalog.showModal();
    });
  }

  function ouvrirDialogRubriqueColonne(colId) {
    var t = getActif();
    if (!t) return;
    var col = t.cols.filter(function (c) {
      return c.id === colId;
    })[0];
    if (!col || col.type !== "rubric") return;
    if (colonneDialogId === colId && dlgColNom) {
      col.label = normaliserNom(dlgColNom.value) || col.label;
    }
    try {
      sessionStorage.setItem(
        "outils_eps_rubric_edit_handoff_v1",
        JSON.stringify({
          tableId: t.id,
          colId: col.id,
          colLabel: col.label || "",
          rubric: normaliserRubrique(col.rubric),
          returnUrl: "tableau-suivi.html",
          createdAt: maintenant(),
        })
      );
    } catch (e) {
      montrerMsg("Impossible de préparer l'ouverture de la grille.");
      return;
    }
    if (dialogColonne && dialogColonne.open) dialogColonne.close();
    persisterTableaux();
    window.location.href = "grilles-evaluation.html?source=tableau-suivi";
  }

  function lireRubriqueImportee() {
    return lireRubriqueDepuisEditeur();
  }

  function testerRubriqueImportee() {
    try {
      ouvrirDialogRubriqueTest(lireRubriqueImportee());
      montrerMsg("");
    } catch (err) {
      montrerMsg(err && err.message ? err.message : "CSV invalide.");
    }
  }

  function creerRubriqueImportee() {
    try {
      var r = lireRubriqueImportee();
      creerColonneRubriqueDepuisModele(r, {
        saveLocal: true,
        share: dlgRubricShare && dlgRubricShare.checked,
      });
      montrerMsg("");
    } catch (err) {
      montrerMsg(err && err.message ? err.message : "CSV invalide.");
    }
  }

  function compterCellulesRubriqueRenseignees(t, colId) {
    if (!t || !colId) return 0;
    var count = 0;
    t.rows.forEach(function (row) {
      var value = normaliserSelectionRubrique(getCell(t, row.id, colId));
      if (Object.keys(value.selected || {}).length) count++;
    });
    return count;
  }

  function recalculerCellulesRubrique(t, col) {
    if (!t || !col || col.type !== "rubric") return;
    t.rows.forEach(function (row) {
      var raw = getCell(t, row.id, col.id);
      var selection = normaliserSelectionRubrique(raw);
      if (!Object.keys(selection.selected || {}).length) {
        setCell(t, row.id, col.id, null);
        return;
      }
      var score = calculerScoreRubrique(col.rubric, selection);
      if (!score.selectedCount) {
        setCell(t, row.id, col.id, null);
      } else {
        setCell(t, row.id, col.id, {
          selected: score.selected,
          points: score.points,
          note: score.note,
        });
      }
    });
  }

  function enregistrerRubriqueColonne() {
    try {
      var t = getActif();
      if (!t || !rubriqueEditionColonneId) return;
      var col = t.cols.filter(function (c) {
        return c.id === rubriqueEditionColonneId;
      })[0];
      if (!col || col.type !== "rubric") return;
      var dejaRenseignees = compterCellulesRubriqueRenseignees(t, col.id);
      if (dejaRenseignees) {
        var ok = confirm(
          dejaRenseignees +
            " note(s) existent deja pour cette grille. Elles seront recalculees avec la nouvelle grille. Continuer ?"
        );
        if (!ok) return;
      }
      var ancienne = rubriqueEditionInitiale || normaliserRubrique(col.rubric);
      var r = lireRubriqueImportee();
      var doitRenommerColonne = !col.label || col.label === ancienne.title;
      col.rubric = normaliserRubrique(r);
      col.estNote = true;
      col.max = RUBRIQUE_MAX_DEFAUT;
      if (doitRenommerColonne) col.label = col.rubric.title;
      recalculerCellulesRubrique(t, col);
      if (dialogRubricCatalog && dialogRubricCatalog.open) dialogRubricCatalog.close();
      rubriqueEditionColonneId = null;
      rubriqueEditionInitiale = null;
      configDialogRubriqueEdition("create");
      rendreGrille(col.id);
      planifierSauvegarde();
      if (dlgRubricShare && dlgRubricShare.checked) proposerPublicationRubrique(col.rubric);
      montrerMsg("");
      montrerOk(dejaRenseignees ? "Grille mise a jour. Notes recalculees." : "Grille mise a jour.");
    } catch (err) {
      montrerMsg(err && err.message ? err.message : "Grille invalide.");
    }
  }

  function enregistrerRubriqueEdition() {
    if (rubriqueEditionMode === "edit-col") {
      enregistrerRubriqueColonne();
    } else {
      creerRubriqueImportee();
    }
  }

  function importerFichierRubriqueCsv(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var meta = metaRubriqueEdition();
        if (!meta.title || meta.title === "Nouvelle grille") {
          meta.title = normaliserNom(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")) || "Grille importee";
          if (dlgRubricTitle) dlgRubricTitle.value = meta.title;
        }
        rubriqueEdition = parseRubriqueCsv(reader.result || "", meta);
        rendreEditeurRubrique();
        montrerMsg("");
        montrerOk("CSV importé dans l'éditeur.");
      } catch (err) {
        montrerMsg(err && err.message ? err.message : "CSV invalide.");
      }
    };
    reader.onerror = function () {
      montrerMsg("Impossible de lire ce fichier CSV.");
    };
    reader.readAsText(file, "UTF-8");
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

    var cols = colonnesVisibles(t);
    var header = ["Élève"];
    cols.forEach(function (col) {
      var label = col.label || "";
      var bareme = baremeColonne(t, col);
      if (bareme > 0 && colonneEstNote(col)) label += " (/ " + bareme + ")";
      header.push(label);
    });
    var lines = [header.map(csvEscapeCell).join(";")];

    t.rows.forEach(function (row) {
      var line = [labelEleveAvecIcone(row, false)];
      cols.forEach(function (col) {
        line.push(valeurVersTexte(t, row.id, col, false));
      });
      lines.push(line.map(csvEscapeCell).join(";"));
    });

    var synth = [""];
    cols.forEach(function (col) {
      synth.push(syntheseColonne(t, col));
    });
    lines.push(synth.map(csvEscapeCell).join(";"));

    var bom = "\uFEFF";
    var blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    telechargerBlob(nomFichierExport("csv"), blob);
    montrerOk("Export CSV téléchargé.");
  }

  function exporterPdfGrilles(onlyColId) {
    var t = donneesExport();
    if (!t) return;
    var rubricCols = (t.cols || []).filter(function (c) {
      return c && c.type === "rubric" && c.rubric;
    });
    if (onlyColId) {
      rubricCols = rubricCols.filter(function (c) {
        return c.id === onlyColId;
      });
      if (!rubricCols.length) {
        montrerMsg("Cette colonne n'est pas une grille d'évaluation.");
        return;
      }
    } else if (!rubricCols.length) {
      montrerMsg("Aucune colonne « Grille d'évaluation » dans ce tableau.");
      return;
    }
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Impossible de charger jsPDF. Réessayez plus tard.");
      return;
    }
    montrerMsg("");

    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    var margin = 12;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - 2 * margin;
    var pageCount = 0;

    function rgb(c) {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setTextColor(c[0], c[1], c[2]);
    }

    function dessinerFiche(row, col, rubrique, selection, score) {
      if (pageCount > 0) doc.addPage();
      pageCount++;
      var y = margin;

      rgb([15, 118, 110]);
      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, pageW, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(String(t.titre || "Appel et notes").slice(0, 70), margin, 11);

      rgb([15, 23, 42]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      y = 26;
      doc.text(labelEleveAvecIcone(row, true).slice(0, 80), margin, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 6;
      var colLabel = col.label || rubrique.title || "Grille d'évaluation";
      doc.text(colLabel.slice(0, 90), margin, y);
      y += 5;
      var meta = metaRubriqueTexte(rubrique);
      if (meta) {
        doc.setTextColor(100, 116, 139);
        doc.text(meta.slice(0, 100), margin, y);
        y += 5;
      }
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      var noteTxt =
        score.note === null || score.note === undefined || isNaN(score.note)
          ? "Note : —"
          : "Note : " + formatNombreAffiche(score.note) + " / " + RUBRIQUE_MAX_DEFAUT;
      doc.text(
        noteTxt +
          "  ·  " +
          formatNombreAffiche(score.points) +
          " / " +
          formatNombreAffiche(score.total) +
          " pts  ·  " +
          score.selectedCount +
          " / " +
          score.itemCount +
          " items",
        margin,
        y
      );
      y += 8;

      var nLevels = rubrique.levels.length;
      var wItem = Math.min(52, contentW * 0.28);
      var wLevel = (contentW - wItem) / Math.max(nLevels, 1);
      var minRowH = 11;
      var fontCell = 7;
      var fontHead = 7.5;

      function drawGridHeader() {
        rgb([15, 118, 110]);
        doc.setFillColor(15, 118, 110);
        doc.rect(margin, y, contentW, minRowH, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontHead);
        doc.text("Item", margin + 2, y + minRowH * 0.62);
        var x = margin + wItem;
        rubrique.levels.forEach(function (level) {
          var lines = doc.splitTextToSize(String(level.label || ""), wLevel - 3);
          doc.text(lines.slice(0, 2), x + wLevel / 2, y + minRowH * 0.62, { align: "center" });
          x += wLevel;
        });
        y += minRowH;
      }

      drawGridHeader();

      rubrique.items.forEach(function (item, rowIndex) {
        var rowH = minRowH;
        var cellLines = [];
        rubrique.levels.forEach(function (level, levelIndex) {
          var cell = item.cells[levelIndex] || {};
          var txt = (cell.text || level.label || "").trim();
          var lines = doc.splitTextToSize(txt, wLevel - 4);
          var blockH = Math.max(minRowH, lines.length * 3.2 + 4);
          if (blockH > rowH) rowH = blockH;
          cellLines[levelIndex] = lines;
        });
        var itemLines = doc.splitTextToSize(String(item.label || ""), wItem - 4);
        var itemH = Math.max(minRowH, itemLines.length * 3.2 + 3);
        if (itemH > rowH) rowH = itemH;

        if (y + rowH > pageH - margin - 10) {
          doc.addPage();
          y = margin;
          drawGridHeader();
        }

        var bg = rowIndex % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        rgb(bg);
        doc.rect(margin, y, contentW, rowH, "F");
        rgb([226, 232, 240]);
        doc.setLineWidth(0.1);
        doc.rect(margin, y, contentW, rowH, "S");

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontCell);
        doc.text(itemLines, margin + 2, y + 4);

        var xCol = margin + wItem;
        rubrique.levels.forEach(function (level, levelIndex) {
          var selected = selection.selected[item.id] === level.id;
          if (selected) {
            rgb([204, 251, 241]);
            doc.rect(xCol, y, wLevel, rowH, "F");
          }
          rgb([226, 232, 240]);
          doc.rect(xCol, y, wLevel, rowH, "S");

          doc.setFont("helvetica", selected ? "bold" : "normal");
          doc.setTextColor(selected ? 15 : 71, selected ? 118 : 85, selected ? 110 : 105);
          var cell = item.cells[levelIndex] || {};
          var lines = cellLines[levelIndex] || [""];
          doc.setFontSize(fontCell);
          doc.text(lines.slice(0, 4), xCol + wLevel / 2, y + 3.5, { align: "center" });
          var pts = cell.points;
          if (pts !== undefined && pts !== null && !isNaN(pts)) {
            doc.setFontSize(6);
            doc.text(formatNombreAffiche(pts) + " pt", xCol + wLevel / 2, y + rowH - 2.5, {
              align: "center",
            });
          }
          if (selected) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(15, 118, 110);
            doc.text("✓", xCol + wLevel - 3, y + 4, { align: "right" });
          }
          xCol += wLevel;
        });
        y += rowH;
      });

      rgb([148, 163, 184]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(
        "Outils EPS — " + new Date().toLocaleString("fr-FR"),
        margin,
        pageH - 6
      );
    }

    rubricCols.forEach(function (col) {
      var rubrique = normaliserRubrique(col.rubric);
      t.rows.forEach(function (row) {
        var selection = normaliserSelectionRubrique(getCell(t, row.id, col.id));
        var score = calculerScoreRubrique(rubrique, selection);
        if (!score.selectedCount) return;
        dessinerFiche(row, col, rubrique, selection, score);
      });
    });

    if (!pageCount) {
      montrerMsg(
        "Aucune sélection enregistrée sur les grilles d'évaluation. Renseignez les cellules puis réessayez."
      );
      return;
    }

    var total = doc.internal.getNumberOfPages();
    for (var p = 1; p <= total; p++) {
      doc.setPage(p);
      rgb([148, 163, 184]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Page " + p + " / " + total, pageW - margin, pageH - 6, { align: "right" });
    }

    try {
      var base = nomFichierExport("pdf").replace(/\.pdf$/i, "");
      var colSlug = "";
      if (onlyColId && rubricCols[0]) {
        colSlug =
          "-" +
          String(rubricCols[0].label || "grille")
            .replace(/[^\w\-]+/g, "_")
            .replace(/_+/g, "_")
            .slice(0, 32);
      } else {
        colSlug = "-grilles";
      }
      telechargerBlob(base + colSlug + ".pdf", doc.output("blob"));
      montrerOk("Export PDF téléchargé (" + pageCount + " fiche(s)).");
    } catch (err) {
      montrerMsg("Export PDF des grilles impossible.");
    }
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

    var colsExport = colonnesVisibles(t);
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
    for (ci = 0; ci < colsExport.length; ci += maxColsPage) {
      colChunks.push(colsExport.slice(ci, ci + maxColsPage));
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
        var label = col.label || "";
        var bareme = baremeColonne(t, col);
        if (bareme > 0 && colonneEstNote(col)) label += " /" + bareme;
        head.push(label);
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
        var x = tableX;
        var tableW = wNom + wCol * Math.max(0, cols.length);
        var bg = ri % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        rgb(bg);
        doc.rect(tableX, y - rowH + 2.2, tableW, rowH, "F");
        rgb([226, 232, 240]);
        doc.setLineWidth(0.12);
        doc.rect(tableX, y - rowH + 2.2, tableW, rowH, "S");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(labelEleveAvecIcone(row, true).slice(0, Math.floor(wNom / 2.1)), x + 2, y);
        x += wNom;
        cols.forEach(function (col) {
          if (col.type === "check") {
            dessinerStatutPresencePdf(doc, getCell(t, row.id, col.id), x + wCol / 2, y);
          } else {
            reinitialiserStyleTextePdf(doc);
            var txt = valeurVersTexte(t, row.id, col, false);
            doc.text(String(txt || "").slice(0, Math.max(3, Math.floor(wCol / 2.1))), x + wCol / 2, y, {
              align: "center",
            });
          }
          x += wCol;
        });
        y += rowH;
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
      hint:
        "Les élèves déjà sur la feuille sont grisés. Cochez les nouveaux à ajouter (les fiches classe sont synchronisées automatiquement).",
      dejaPresent: function (e) {
        return eleveDejaSurFeuille(t, e);
      },
      defaultChecked: true,
      onConfirm: function (eleves, classe, metaImport) {
        invaliderCacheEleves();
        if (!t.classeId) t.classeId = classe.id;
        var entrees = [];
        eleves.forEach(function (e) {
          var l = eleveVersLabel(e);
          if (l) entrees.push({ label: l, meta: metaDepuisEleve(e, classe.nom, classe.id) });
        });
        var stats = importerOuFusionnerLignes(t, entrees);
        var ignores = metaImport && metaImport.ignores ? metaImport.ignores : 0;
        chargerCacheEleves(true).then(function () {
          hydraterEquipesFeuilleSync(t);
          rendreGrille();
          planifierSauvegarde();
          var msg =
            typeof ImportElevePresence !== "undefined"
              ? ImportElevePresence.messageImportEleves({
                  ajoutes: stats.ajoutes,
                  maj: stats.maj,
                  ignores: ignores,
                  contexte: "« " + classe.nom + " »",
                })
              : "";
          if (stats.ajoutes || stats.maj) montrerOk(msg);
          else if (ignores) montrerMsg(msg);
          else montrerMsg("Aucun élève à importer.");
        });
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
    if (dlgRubricApsa && window.OutilsEPS && window.OutilsEPS.fillApsaSelect) {
      window.OutilsEPS.fillApsaSelect(dlgRubricApsa);
    }
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
        return chargerCacheEleves().then(function () {
          var dirty = false;
          tableaux.forEach(function (tab) {
            if (hydraterEquipesFeuilleSync(tab)) dirty = true;
          });
          var saved = chargerActifIdLocal();
          var found = tableaux.some(function (t) {
            return t.id === saved;
          });
          actifId = found ? saved : tableaux[0].id;
          sauverActifIdLocal(actifId);
          pret = true;
          toutRafraichir();
          if (dirty) return DataManager.saveTableauxSuivi(tableaux);
        });
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
      if (type === "rubric") {
        if (dialogGestion && dialogGestion.open) dialogGestion.close();
        ouvrirDialogRubriqueCatalog();
        return;
      }
      if (type === "eleveInfo") {
        ouvrirDialogInfoEleve();
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

  if (colFiltreEl) {
    colFiltreEl.querySelectorAll("[data-col-filtre]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        definirFiltreColonnes(btn.getAttribute("data-col-filtre"));
      });
    });
  }

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

  var btnDialogInfoEleveClose = document.getElementById("btn-dialog-info-eleve-close");
  if (btnDialogInfoEleveClose && dialogInfoEleve) {
    btnDialogInfoEleveClose.addEventListener("click", function () {
      dialogInfoEleve.close();
    });
  }
  var btnInfoEleveAnnuler = document.getElementById("btn-info-eleve-annuler");
  if (btnInfoEleveAnnuler && dialogInfoEleve) {
    btnInfoEleveAnnuler.addEventListener("click", function () {
      dialogInfoEleve.close();
    });
  }
  var formInfoEleve = document.getElementById("form-tab-suivi-info-eleve");
  if (formInfoEleve) {
    formInfoEleve.addEventListener("submit", function (e) {
      e.preventDefault();
      creerColonneInfoEleve();
    });
  }

  var formCalc = document.getElementById("form-tab-suivi-calc");
  if (formCalc) {
    formCalc.addEventListener("submit", function (e) {
      e.preventDefault();
      creerColonneCalc();
    });
  }

  var btnDialogRubricCatalogClose = document.getElementById("btn-dialog-rubric-catalog-close");
  if (btnDialogRubricCatalogClose && dialogRubricCatalog) {
    btnDialogRubricCatalogClose.addEventListener("click", function () {
      dialogRubricCatalog.close();
    });
  }

  var btnRubricTestImport = document.getElementById("btn-rubric-test-import");
  if (btnRubricTestImport) btnRubricTestImport.addEventListener("click", testerRubriqueImportee);

  var btnRubricCreateImport = document.getElementById("btn-rubric-create-import");
  if (btnRubricCreateImport) btnRubricCreateImport.addEventListener("click", enregistrerRubriqueEdition);

  if (dlgRubricSearch) {
    dlgRubricSearch.addEventListener("input", rendreCatalogueRubriques);
  }

  if (btnRubricAddRow) btnRubricAddRow.addEventListener("click", ajouterLigneRubriqueEdition);
  if (btnRubricAddCol) btnRubricAddCol.addEventListener("click", ajouterColonneRubriqueEdition);
  if (dlgRubricFile) {
    dlgRubricFile.addEventListener("change", function () {
      var file = dlgRubricFile.files && dlgRubricFile.files[0];
      importerFichierRubriqueCsv(file);
      dlgRubricFile.value = "";
    });
  }
  [dlgRubricTitle, dlgRubricApsa, dlgRubricCycle, dlgRubricNiveau].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", planifierMajPartageCatalogueRubrique);
    el.addEventListener("change", function () {
      if (!rubriqueEdition) return;
      rubriqueEdition = appliquerMetaRubriqueEdition(lireRubriqueDepuisEditeur());
      planifierMajPartageCatalogueRubrique();
    });
  });
  if (dlgRubricEditor) {
    dlgRubricEditor.addEventListener("input", planifierMajPartageCatalogueRubrique);
    dlgRubricEditor.addEventListener("change", planifierMajPartageCatalogueRubrique);
  }

  var formRubricCatalog = document.getElementById("form-tab-suivi-rubric-catalog");
  if (formRubricCatalog) {
    formRubricCatalog.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  var btnDialogRubricCellClose = document.getElementById("btn-dialog-rubric-cell-close");
  if (btnDialogRubricCellClose) btnDialogRubricCellClose.addEventListener("click", fermerDialogRubriqueCellule);

  var btnRubricCellClose = document.getElementById("btn-rubric-cell-close");
  if (btnRubricCellClose) btnRubricCellClose.addEventListener("click", fermerDialogRubriqueCellule);

  var btnRubricCellPrev = document.getElementById("btn-rubric-cell-prev");
  if (btnRubricCellPrev) {
    btnRubricCellPrev.addEventListener("click", function () {
      naviguerRubriqueEleve(-1);
    });
  }

  var btnRubricCellNext = document.getElementById("btn-rubric-cell-next");
  if (btnRubricCellNext) {
    btnRubricCellNext.addEventListener("click", function () {
      naviguerRubriqueEleve(1);
    });
  }

  var btnRubricCellClear = document.getElementById("btn-rubric-cell-clear");
  if (btnRubricCellClear) {
    btnRubricCellClear.addEventListener("click", function () {
      var ctx = obtenirContexteRubriqueActif();
      if (!ctx) return;
      ctx.value = { selected: {}, points: 0, note: null };
      enregistrerSelectionRubrique(ctx);
      rendreGrilleRubriqueDialog(ctx);
    });
  }

  var formRubricCell = document.getElementById("form-tab-suivi-rubric-cell");
  if (formRubricCell) {
    formRubricCell.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  var btnColAnnuler = document.getElementById("btn-col-annuler");
  if (btnColAnnuler && dialogColonne) {
    btnColAnnuler.addEventListener("click", function () {
      colonneDialogId = null;
      dialogColonne.close();
    });
  }

  if (dlgColEstNote) {
    dlgColEstNote.addEventListener("change", majDialogColonneNoteUi);
  }

  if (dlgColInfoEditable) {
    dlgColInfoEditable.addEventListener("change", function () {
      if (!dlgColInfoHint) return;
      dlgColInfoHint.textContent = dlgColInfoEditable.checked
        ? "Les modifications dans le tableau mettent à jour la fiche élève dans Classes (élèves importés depuis une classe)."
        : "Lecture seule : donnée issue de la fiche élève (Classes). Utilisez « Tri » pour ordonner selon cette colonne.";
    });
  }

  var formColonne = document.getElementById("form-tab-suivi-colonne");
  if (formColonne) {
    formColonne.addEventListener("submit", function (e) {
      e.preventDefault();
      enregistrerDialogColonne();
    });
  }

  if (btnColRubricTest) {
    btnColRubricTest.addEventListener("click", function () {
      var t = getActif();
      if (!t || !colonneDialogId) return;
      var col = t.cols.filter(function (c) {
        return c.id === colonneDialogId;
      })[0];
      if (col && col.type === "rubric") ouvrirDialogRubriqueTest(col.rubric);
    });
  }

  if (btnColRubricEdit) {
    btnColRubricEdit.addEventListener("click", function () {
      if (!colonneDialogId) return;
      ouvrirDialogRubriqueColonne(colonneDialogId);
    });
  }

  if (btnColRubricPdf) {
    btnColRubricPdf.addEventListener("click", function () {
      if (!colonneDialogId) return;
      exporterPdfGrilles(colonneDialogId);
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
    synchroniserLabelRow(
      row,
      dlgElevesNom.value,
      dlgElevesPrenom.value,
      dlgElevesNaissance ? dlgElevesNaissance.value : undefined
    );
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
