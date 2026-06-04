/**
 * Composition d’équipes homogènes — répartition par somme des niveaux (1–5).
 * Effectifs équilibrés : écart d’au plus 1 joueur entre équipes (capacités gloutonnes).
 * Tirage : ordre aléatoire puis affectation gloutonne (parmi les places restantes).
 * PDF : jsPDF (fichier local) — texte vectoriel, fichier téléchargeable ; Web Share si le navigateur l’autorise.
 * Stockage : IndexedDB (paramètres via DataManager).
 */
(function () {
  "use strict";

  var SAVE_DELAY_MS = 350;

  var listeBruteEl = document.getElementById("liste-brute");
  var btnValider = document.getElementById("btn-valider-liste");
  var btnViderJoueurs = document.getElementById("btn-vider-joueurs");
  var nbJoueursEl = document.getElementById("compo-nb-joueurs");
  var accordionJoueurs = document.getElementById("accordion-joueurs");
  var joueursContainer = document.getElementById("joueurs-container");
  var nbEquipesEl = document.getElementById("nb-equipes");
  var btnComposer = document.getElementById("btn-composer");
  var btnTirage = document.getElementById("btn-tirage");
  var btnExportCsv = document.getElementById("btn-export-csv-compo");
  var btnExportPdf = document.getElementById("btn-export-pdf-compo");
  var sectionEquipes = document.getElementById("section-equipes");
  var equipesContainer = document.getElementById("equipes-container");
  var msgEl = document.getElementById("compo-msg");

  /** @type {Array<{id:string,name:string,level:number}>} */
  var players = [];
  /** @type {Record<string, number>|null} playerId -> index équipe 0..k-1 */
  var assignments = null;
  var saveTimer = null;

  var TEAM_COLORS_DEFAULT = [
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
  var teamNames = [];
  var teamColors = [];

  var listeSaisieMeta =
    typeof ListeSaisieUi !== "undefined" && listeBruteEl
      ? ListeSaisieUi.bind({
          metaEl: document.getElementById("liste-brute-meta"),
          textareaEl: listeBruteEl,
          getSessionCount: function () {
            return players.length;
          },
        })
      : null;

  var listeManuellePanel =
    typeof ListeManuellePanel !== "undefined" && listeBruteEl
      ? ListeManuellePanel.bind({
          toggleBtnId: "btn-ajouter-manuel-compo",
          panelId: "liste-manuelle-panel-compo",
          textareaEl: listeBruteEl,
        })
      : null;

  function genererId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function montrerMsg(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
  }

  function charger() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      return Promise.resolve(null);
    }
    return SessionManager.requireSessionId().then(function (sessionId) {
      return DataManager.getCompositionForSession(sessionId);
    });
  }

  function sauverDebounced() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      sauverImmediate();
    }, SAVE_DELAY_MS);
  }

  function sauverImmediate() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      montrerMsg("Stockage indisponible.");
      return Promise.resolve();
    }
    var data = {
      listeBrute: listeBruteEl ? listeBruteEl.value : "",
      players: players,
      nbEquipes: parseInt(nbEquipesEl.value, 10) || 2,
      assignments: assignments,
      teamNames: teamNames.slice(),
      teamColors: teamColors.slice(),
    };
    return SessionManager.requireSessionId()
      .then(function (sessionId) {
        return DataManager.saveCompositionForSession(sessionId, data);
      })
      .then(function () {
        montrerMsg("");
      })
      .catch(function () {
        montrerMsg("Impossible d’enregistrer les données.");
      });
  }

  function majBoutonTirage() {
    if (!btnTirage) return;
    btnTirage.hidden = assignments === null || players.length === 0;
  }

  function shuffleCopy(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function getNbEquipes() {
    var n = parseInt(nbEquipesEl.value, 10);
    if (isNaN(n) || n < 2) return 2;
    if (n > 24) return 24;
    return n;
  }

  function ensureTeamArrays(k) {
    while (teamNames.length < k) teamNames.push("");
    while (teamColors.length < k) {
      teamColors.push(TEAM_COLORS_DEFAULT[teamColors.length % TEAM_COLORS_DEFAULT.length]);
    }
    if (teamNames.length > k) teamNames.length = k;
    if (teamColors.length > k) teamColors.length = k;
  }

  function getTeamLabel(ti) {
    var raw = teamNames[ti];
    if (raw != null && String(raw).trim()) return String(raw).trim();
    return "Équipe " + (ti + 1);
  }

  function getTeamColor(ti) {
    var c = teamColors[ti];
    if (c && /^#[0-9a-fA-F]{6}$/.test(String(c))) return String(c);
    return TEAM_COLORS_DEFAULT[ti % TEAM_COLORS_DEFAULT.length];
  }

  function reporterEquipesDansFiches() {
    if (!assignments || !players.length) {
      montrerMsg("Créez d’abord les équipes, puis réessayez.");
      return;
    }
    if (typeof DataManager === "undefined") {
      montrerMsg("Stockage indisponible.");
      return;
    }
    var k = getNbEquipes();
    ensureTeamArrays(k);
    var avecEleveId = players.filter(function (p) {
      return p.eleveId && typeof assignments[p.id] === "number";
    });
    if (!avecEleveId.length) {
      montrerMsg(
        "Aucun élève lié à une classe (importez la liste depuis « Importer depuis une classe » pour enregistrer les équipes)."
      );
      return;
    }
    var majEleves = 0;
    var majLignes = 0;
    var ops = avecEleveId.map(function (p) {
      var ti = assignments[p.id];
      if (typeof ti !== "number" || ti < 0 || ti >= k) return Promise.resolve();
      var equipe = getTeamLabel(ti);
      var equipeCouleur = getTeamColor(ti);
      return DataManager.getById("eleves", p.eleveId).then(function (el) {
        if (!el) return;
        el.equipe = equipe;
        el.equipeCouleur = equipeCouleur;
        majEleves++;
        return DataManager.updateItem("eleves", el);
      });
    });
    Promise.all(ops)
      .then(function () {
        return DataManager.getTableauxSuivi ? DataManager.getTableauxSuivi() : [];
      })
      .then(function (tableaux) {
        if (!Array.isArray(tableaux)) return;
        var changed = false;
        tableaux.forEach(function (tab) {
          if (!tab || !Array.isArray(tab.rows)) return;
          tab.rows.forEach(function (row) {
            if (!row.meta || !row.meta.eleveId) return;
            var p = avecEleveId.filter(function (x) {
              return x.eleveId === row.meta.eleveId;
            })[0];
            if (!p) return;
            var ti = assignments[p.id];
            if (typeof ti !== "number" || ti < 0 || ti >= k) return;
            var label = getTeamLabel(ti);
            var couleur = getTeamColor(ti);
            if (!row.meta) row.meta = {};
            if (row.meta.equipe === label && row.meta.equipeCouleur === couleur) return;
            row.meta.equipe = label;
            row.meta.equipeCouleur = couleur;
            majLignes++;
            changed = true;
          });
        });
        if (changed && DataManager.saveTableauxSuivi) {
          return DataManager.saveTableauxSuivi(tableaux);
        }
      })
      .then(function () {
        var msg =
          majEleves +
          " fiche" +
          (majEleves > 1 ? "s" : "") +
          " élève" +
          (majEleves > 1 ? "s" : "") +
          " mise" +
          (majEleves > 1 ? "s" : "") +
          " à jour";
        if (majLignes) {
          msg += " · " + majLignes + " ligne" + (majLignes > 1 ? "s" : "") + " dans Appel et notes";
        }
        montrerMsg(msg + ".");
      })
      .catch(function () {
        montrerMsg("Impossible d’enregistrer les équipes sur les fiches élèves.");
      });
  }

  /**
   * Compte les joueurs par équipe selon assignments.
   * @param {Record<string, number>} assign
   * @param {number} k
   * @returns {number[]}
   */
  function compteParEquipe(assign, k) {
    var c = [];
    var t;
    for (t = 0; t < k; t++) c.push(0);
    players.forEach(function (p) {
      var ti = assign[p.id];
      if (typeof ti === "number" && ti >= 0 && ti < k) c[ti]++;
    });
    return c;
  }

  /**
   * Effectifs équilibrés : max(count) - min(count) <= 1.
   * @param {number[]} counts
   */
  function effectifsEquilibres(counts) {
    if (counts.length === 0) return true;
    var minV = Infinity;
    var maxV = -Infinity;
    var t;
    for (t = 0; t < counts.length; t++) {
      if (counts[t] < minV) minV = counts[t];
      if (counts[t] > maxV) maxV = counts[t];
    }
    return maxV - minV <= 1;
  }

  /**
   * Déplacer playerId de son équipe actuelle vers targetTeam conserve l’équilibre des effectifs.
   */
  function deplacementValide(assign, k, playerId, targetTeam) {
    var cur = assign[playerId];
    if (typeof cur !== "number" || cur < 0 || cur >= k) return false;
    if (cur === targetTeam) return true;
    var c = compteParEquipe(assign, k);
    c[cur]--;
    c[targetTeam]++;
    return effectifsEquilibres(c);
  }

  /**
   * Vérifie que l’affectation chargée respecte l’équilibre des effectifs.
   */
  function assignmentsGlobalementValides(assign, k) {
    if (!assign || players.length === 0) return false;
    var ok = true;
    players.forEach(function (p) {
      if (typeof assign[p.id] !== "number" || assign[p.id] < 0 || assign[p.id] >= k) ok = false;
    });
    if (!ok) return false;
    return effectifsEquilibres(compteParEquipe(assign, k));
  }

  /**
   * Capacités max par équipe pour n joueurs et k équipes (écart d’au plus 1 entre effectifs).
   * @returns {number[]}
   */
  function capacitesMaxParEquipe(n, k) {
    var base = Math.floor(n / k);
    var rem = n % k;
    var maxCap = [];
    var i;
    for (i = 0; i < k; i++) maxCap.push(base + (i < rem ? 1 : 0));
    return maxCap;
  }

  /**
   * Affectation gloutonne : parmi les équipes non pleines, celle de plus faible somme de niveaux.
   * @returns {Record<string, number>}
   */
  function composerGlouton(ordreJoueurs, k) {
    var n = ordreJoueurs.length;
    var maxCap = capacitesMaxParEquipe(n, k);
    var counts = [];
    var totals = [];
    var i;
    for (i = 0; i < k; i++) {
      counts.push(0);
      totals.push(0);
    }
    var assign = {};
    ordreJoueurs.forEach(function (p) {
      var best = -1;
      var minT = Infinity;
      for (i = 0; i < k; i++) {
        if (counts[i] >= maxCap[i]) continue;
        if (totals[i] < minT) {
          minT = totals[i];
          best = i;
        }
      }
      if (best < 0) best = 0;
      assign[p.id] = best;
      counts[best]++;
      totals[best] += p.level;
    });
    return assign;
  }

  /**
   * Parse une ligne : "Nom" ou "Nom;niveau" (niveau 1–5 optionnel, défaut 3).
   * @returns {{id:string,name:string,level:number}|null}
   */
  function eleveVersJoueur(e) {
    var name =
      typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
        ? EleveDisplay.formatEleveListe(e, "?")
        : [e.nom, e.prenom].filter(Boolean).join(" ").trim() || e.nom || e.prenom || "?";
    var level = 3;
    if (e.niveau) {
      var n = parseInt(String(e.niveau), 10);
      if (!isNaN(n) && n >= 1 && n <= 5) level = n;
    }
    return { id: genererId(), name: name, level: level, eleveId: e.id || "" };
  }

  function importerDepuisClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.");
      return;
    }
    function eleveDejaDansListe(e) {
      if (typeof ImportElevePresence !== "undefined") {
        return ImportElevePresence.eleveEstDansListe(players, e);
      }
      var cle = [e.nom, e.prenom].filter(Boolean).join(" ").trim().toLowerCase();
      var pi;
      for (pi = 0; pi < players.length; pi++) {
        var p = players[pi];
        if (p.eleveId && e.id && p.eleveId === e.id) return true;
        if (p.name && String(p.name).trim().toLowerCase() === cle) return true;
      }
      return false;
    }

    ClassImport.open({
      title: "Importer des élèves",
      hint: "Les joueurs déjà dans la liste sont grisés. Cochez les nouveaux élèves à ajouter.",
      dejaPresent: eleveDejaDansListe,
      defaultChecked: true,
      onConfirm: function (eleves, classe, metaImport) {
        var ajoutes = 0;
        var ignores = metaImport && metaImport.ignores ? metaImport.ignores : 0;
        eleves.forEach(function (e) {
          players.push(eleveVersJoueur(e));
          ajoutes++;
        });
        assignments = null;
        majNbJoueursAffiche();
        renderJoueurs();
        sectionEquipes.hidden = true;
        OutilsDom.clear(equipesContainer);
        majBoutonTirage();
        sauverImmediate();
        montrerMsg(
          (typeof ImportElevePresence !== "undefined"
            ? ImportElevePresence.messageImportEleves({
                ajoutes: ajoutes,
                ignores: ignores,
                contexte: "« " + classe.nom + " »",
              })
            : ajoutes
              ? ajoutes + " joueur(s) importé(s)."
              : "Aucun changement")
        );
      },
    });
  }

  function parserLigneJoueur(ligne) {
    var def = 3;
    var s = (ligne || "").trim();
    if (!s) return null;
    var idx = s.indexOf(";");
    var name;
    var level = def;
    if (idx === -1) {
      name = s;
    } else {
      name = s.slice(0, idx).trim();
      var rest = s.slice(idx + 1).trim();
      if (!name) return null;
      if (rest !== "") {
        var n = parseInt(rest, 10);
        if (!isNaN(n) && n >= 1 && n <= 5) level = n;
      }
    }
    if (!name) return null;
    return { id: genererId(), name: name, level: level, eleveId: "" };
  }

  function lancerComposition(melanger) {
    montrerMsg("");
    var k = getNbEquipes();
    if (players.length < k) {
      montrerMsg("Il faut au moins autant de joueurs que d’équipes (actuellement " + players.length + " joueur(s)).");
      return;
    }
    var ordre;
    if (melanger) {
      ordre = shuffleCopy(players);
    } else {
      ordre = players.slice().sort(function (a, b) {
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      });
    }
    ensureTeamArrays(k);
    assignments = composerGlouton(ordre, k);
    sauverImmediate();
    majBoutonTirage();
    renderEquipes();
    sectionEquipes.hidden = false;
    if (accordionJoueurs) accordionJoueurs.open = false;
  }

  function majNbJoueursAffiche() {
    if (!nbJoueursEl) return;
    var n = players.length;
    nbJoueursEl.textContent = n + " joueur" + (n !== 1 ? "s" : "");
    if (listeSaisieMeta) listeSaisieMeta.refresh();
  }

  function trouverJoueur(pid) {
    for (var i = 0; i < players.length; i++) {
      if (players[i].id === pid) return players[i];
    }
    return null;
  }

  /**
   * @returns {{ k: number, teams: Array<{ index: number, players: typeof players, total: number }> } | null}
   */
  function construireTableauEquipes() {
    var k = getNbEquipes();
    if (!assignments || players.length === 0) return null;
    var byTeam = [];
    var t;
    for (t = 0; t < k; t++) byTeam.push([]);
    players.forEach(function (p) {
      var ti = assignments[p.id];
      if (typeof ti !== "number" || ti < 0 || ti >= k) ti = 0;
      byTeam[ti].push(p);
    });
    var teams = [];
    for (t = 0; t < k; t++) {
      var list = byTeam[t].slice().sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      });
      var total = 0;
      list.forEach(function (p) {
        total += p.level;
      });
      teams.push({
        index: t + 1,
        ti: t,
        label: getTeamLabel(t),
        players: list,
        total: total,
      });
    }
    return { k: k, teams: teams };
  }

  function csvEscapeCell(val) {
    var s = String(val);
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

  function nomFichierExport(prefix, ext) {
    var d = new Date();
    var y = d.getFullYear();
    var mo = d.getMonth() + 1;
    var day = d.getDate();
    var m = mo < 10 ? "0" + mo : String(mo);
    var da = day < 10 ? "0" + day : String(day);
    return prefix + "-" + y + "-" + m + "-" + da + "." + ext;
  }

  function exporterCsv() {
    var data = construireTableauEquipes();
    if (!data) return;
    var lines = [];
    lines.push("Équipe;Joueur;Niveau");
    data.teams.forEach(function (team) {
      team.players.forEach(function (p) {
        lines.push([team.label, p.name, p.level].map(csvEscapeCell).join(";"));
      });
    });
    lines.push("");
    lines.push("Équipe;Somme niveaux;Effectif");
    data.teams.forEach(function (team) {
      lines.push([team.label, team.total, team.players.length].map(csvEscapeCell).join(";"));
    });
    var bom = "\uFEFF";
    var blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    telechargerBlob(nomFichierExport("composition-equipes", "csv"), blob);
  }

  /**
   * Télécharge le PDF ; si le navigateur le permet, propose aussi le menu Partager (fichier).
   */
  function partagerOuTelechargerPdf(fname, blob) {
    function dl() {
      telechargerBlob(fname, blob);
    }
    try {
      var file = new File([blob], fname, { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator
          .share({
            files: [file],
            title: "Composition d’équipes",
            text: fname,
          })
          .catch(dl);
        return;
      }
    } catch (e) {
      /* navigateurs sans File / canShare */
    }
    dl();
  }

  /**
   * PDF en texte vectoriel (jsPDF) — fiable sur PC (html2canvas/html2pdf produisait souvent une page blanche).
   */
  function exporterPdf() {
    var data = construireTableauEquipes();
    if (!data) return;
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg(
        "Impossible de charger jsPDF. Réessayez ou exportez en CSV."
      );
      return;
    }
    montrerMsg("");
    var fname = nomFichierExport("composition-equipes", "pdf");
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    var margin = 14;
    var pageH = doc.internal.pageSize.getHeight();
    var pageW = doc.internal.pageSize.getWidth();
    var maxW = pageW - 2 * margin;
    var y = margin + 5;
    var lhBody = 5.3;
    var lhHead = 6.2;

    function newPage() {
      doc.addPage();
      y = margin + 5;
    }

    function needSpace(extra) {
      if (y + extra > pageH - margin) newPage();
    }

    function writeLines(text, fontSize, fontStyle) {
      doc.setFont("helvetica", fontStyle || "normal");
      doc.setFontSize(fontSize);
      var step = fontSize >= 13 ? lhHead : lhBody;
      var lines = doc.splitTextToSize(String(text), maxW);
      for (var i = 0; i < lines.length; i++) {
        needSpace(step + 2);
        doc.text(lines[i], margin, y);
        y += step;
      }
    }

    doc.setTextColor(15, 118, 110);
    writeLines("Composition d'équipes homogènes", 16, "bold");
    doc.setTextColor(100, 116, 139);
    y += 1;
    writeLines(new Date().toLocaleString("fr-FR"), 10);
    doc.setTextColor(15, 23, 42);
    y += 5;

    data.teams.forEach(function (team) {
      var title =
        team.label +
        " - Total niveau : " +
        team.total +
        " (" +
        team.players.length +
        " joueur" +
        (team.players.length > 1 ? "s" : "") +
        ")";
      doc.setTextColor(15, 118, 110);
      writeLines(title, 12, "bold");
      doc.setTextColor(15, 23, 42);
      y += 1.5;
      team.players.forEach(function (p) {
        writeLines("- " + p.name + " (niveau " + p.level + ")", 11);
      });
      y += 4;
    });

    try {
      var blob = doc.output("blob");
      partagerOuTelechargerPdf(fname, blob);
    } catch (err) {
      montrerMsg("Export PDF impossible (caractère non pris en charge ?). Utilisez l’export CSV.");
    }
  }

  function renderJoueurs() {
    OutilsDom.clear(joueursContainer);
    if (players.length === 0) {
      joueursContainer.hidden = true;
      majNbJoueursAffiche();
      return;
    }
    joueursContainer.hidden = false;
    players.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "compo-joueur-row";
      row.setAttribute("data-player-id", p.id);

      var head = document.createElement("div");
      head.className = "compo-joueur-head";

      var name = document.createElement("span");
      name.className = "compo-joueur-name";
      name.textContent = p.name;

      var actions = document.createElement("div");
      actions.className = "compo-joueur-actions";

      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn--ghost compo-joueur-icon-btn";
      btnEdit.setAttribute("aria-label", "Renommer " + p.name);
      btnEdit.setAttribute("data-action", "rename");
      OutilsDom.setIconButton(btnEdit, "✏️", "Renommer " + p.name, "btn__icon");

      var btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn--ghost compo-joueur-icon-btn compo-joueur-icon-btn--danger";
      btnDel.setAttribute("aria-label", "Retirer " + p.name + " de la liste");
      btnDel.setAttribute("data-action", "delete");
      OutilsDom.setIconButton(btnDel, "🗑️", "Retirer " + p.name + " de la liste", "btn__icon");

      actions.appendChild(btnEdit);
      actions.appendChild(btnDel);
      head.appendChild(name);
      head.appendChild(actions);
      row.appendChild(head);

      var lab = document.createElement("span");
      lab.className = "compo-level-btns-label";
      lab.textContent = "Niveau";

      var group = document.createElement("div");
      group.className = "compo-level-btns";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Niveau pour " + p.name);

      for (var lv = 1; lv <= 5; lv++) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "compo-level-btn" + (lv === p.level ? " compo-level-btn--active" : "");
        b.setAttribute("data-level", String(lv));
        b.setAttribute("aria-pressed", lv === p.level ? "true" : "false");
        b.textContent = String(lv);
        group.appendChild(b);
      }

      row.appendChild(lab);
      row.appendChild(group);
      joueursContainer.appendChild(row);
    });
    majNbJoueursAffiche();
  }

  joueursContainer.addEventListener("click", function (e) {
    var actionBtn = e.target.closest("[data-action]");
    if (actionBtn && joueursContainer.contains(actionBtn)) {
      var row = actionBtn.closest(".compo-joueur-row");
      if (!row) return;
      var pid = row.getAttribute("data-player-id");
      var act = actionBtn.getAttribute("data-action");
      var p = trouverJoueur(pid);
      if (!p) return;
      if (act === "rename") {
        var nv = window.prompt("Nouveau nom pour le joueur :", p.name);
        if (nv === null) return;
        nv = (nv || "").trim();
        if (!nv) {
          montrerMsg("Le nom ne peut pas être vide.");
          return;
        }
        montrerMsg("");
        p.name = nv;
        sauverDebounced();
        renderJoueurs();
        if (assignments) renderEquipes();
        return;
      }
      if (act === "delete") {
        players = players.filter(function (x) {
          return x.id !== pid;
        });
        if (assignments) {
          delete assignments[pid];
          if (players.length === 0) assignments = null;
        }
        sauverImmediate();
        majBoutonTirage();
        renderJoueurs();
        if (assignments) renderEquipes();
        else {
          sectionEquipes.hidden = true;
          OutilsDom.clear(equipesContainer);
        }
        return;
      }
    }

    var btn = e.target.closest(".compo-level-btn");
    if (!btn || !joueursContainer.contains(btn)) return;
    var row2 = btn.closest(".compo-joueur-row");
    if (!row2) return;
    var pid2 = row2.getAttribute("data-player-id");
    var lv = parseInt(btn.getAttribute("data-level"), 10);
    if (!pid2 || isNaN(lv) || lv < 1 || lv > 5) return;
    var p2 = trouverJoueur(pid2);
    if (!p2) return;
    p2.level = lv;
    row2.querySelectorAll(".compo-level-btn").forEach(function (b) {
      var isAct = parseInt(b.getAttribute("data-level"), 10) === lv;
      b.classList.toggle("compo-level-btn--active", isAct);
      b.setAttribute("aria-pressed", isAct ? "true" : "false");
    });
    sauverDebounced();
    if (assignments) renderEquipes();
  });

  function refreshMoveSelectLabels() {
    if (!equipesContainer || !assignments) return;
    var k = getNbEquipes();
    equipesContainer.querySelectorAll(".compo-move-select").forEach(function (sel) {
      var pid = sel.id ? sel.id.replace(/^move-/, "") : "";
      var cur = typeof assignments[pid] === "number" ? assignments[pid] : parseInt(sel.value, 10);
      if (isNaN(cur) || cur < 0 || cur >= k) cur = 0;
      sel.innerHTML = "";
      for (var ti = 0; ti < k; ti++) {
        var o = document.createElement("option");
        o.value = String(ti);
        o.textContent = getTeamLabel(ti);
        if (ti === cur) o.selected = true;
        if (pid && ti !== cur && !deplacementValide(assignments, k, pid, ti)) {
          o.disabled = true;
        }
        sel.appendChild(o);
      }
      sel.value = String(cur);
    });
  }

  function lierEquipesContainerEvents() {
    if (!equipesContainer || equipesContainer.dataset.compoEventsLie === "1") return;
    equipesContainer.dataset.compoEventsLie = "1";
    equipesContainer.addEventListener("input", function (e) {
      var inp = e.target;
      if (!inp || !inp.classList) return;
      if (inp.classList.contains("compo-team-name-input")) {
        var card = inp.closest("[data-team-index]");
        if (!card) return;
        var ti = parseInt(card.getAttribute("data-team-index"), 10);
        if (isNaN(ti)) return;
        teamNames[ti] = inp.value;
        sauverDebounced();
        refreshMoveSelectLabels();
        return;
      }
      if (inp.classList.contains("compo-team-color")) {
        var cardColor = inp.closest("[data-team-index]");
        if (!cardColor) return;
        var tiColor = parseInt(cardColor.getAttribute("data-team-index"), 10);
        if (isNaN(tiColor)) return;
        teamColors[tiColor] = inp.value;
        cardColor.style.borderLeftColor = inp.value;
        sauverDebounced();
      }
    });
  }

  function renderEquipes() {
    var k = getNbEquipes();
    ensureTeamArrays(k);
    OutilsDom.clear(equipesContainer);
    if (!assignments || players.length === 0) {
      sectionEquipes.hidden = true;
      return;
    }
    var byTeam = [];
    var t;
    for (t = 0; t < k; t++) byTeam.push([]);

    players.forEach(function (p) {
      var ti = assignments[p.id];
      if (typeof ti !== "number" || ti < 0 || ti >= k) ti = 0;
      byTeam[ti].push(p);
    });

    for (t = 0; t < k; t++) {
      var total = 0;
      byTeam[t].forEach(function (p) {
        total += p.level;
      });

      var card = document.createElement("article");
      card.className = "compo-team-card";
      card.setAttribute("data-team-index", String(t));

      var head = document.createElement("header");
      head.className = "compo-team-head";
      var titleWrap = document.createElement("div");
      titleWrap.className = "compo-team-title-wrap";
      var colorInp = document.createElement("input");
      colorInp.type = "color";
      colorInp.className = "compo-team-color";
      colorInp.value = getTeamColor(t);
      colorInp.setAttribute("aria-label", "Couleur de " + getTeamLabel(t));
      var nameInp = document.createElement("input");
      nameInp.type = "text";
      nameInp.className = "compo-team-name-input";
      nameInp.maxLength = 40;
      nameInp.placeholder = "Équipe " + (t + 1);
      nameInp.value = teamNames[t] ? String(teamNames[t]) : "";
      nameInp.setAttribute("aria-label", "Nom de l’équipe " + (t + 1));
      titleWrap.appendChild(colorInp);
      titleWrap.appendChild(nameInp);
      var tot = document.createElement("span");
      tot.className = "compo-team-total";
      tot.textContent = "Total niveau : " + total;
      head.appendChild(titleWrap);
      head.appendChild(tot);
      card.style.borderLeftWidth = "4px";
      card.style.borderLeftStyle = "solid";
      card.style.borderLeftColor = getTeamColor(t);
      card.appendChild(head);

      var ul = document.createElement("ul");
      ul.className = "compo-team-list";

      if (byTeam[t].length === 0) {
        var liEmpty = document.createElement("li");
        liEmpty.className = "compo-team-empty";
        liEmpty.textContent = "Aucun joueur";
        ul.appendChild(liEmpty);
      } else {
        byTeam[t].forEach(function (p) {
          var li = document.createElement("li");
          li.className = "compo-team-player";

          var badge = document.createElement("span");
          badge.className = "compo-level-badge";
          badge.textContent = "Nv " + p.level;

          var nm = document.createElement("span");
          nm.className = "compo-team-player-name";
          nm.textContent = p.name;

          var moveWrap = document.createElement("div");
          moveWrap.className = "compo-move-wrap";

          var moveLab = document.createElement("label");
          moveLab.className = "compo-move-label";
          moveLab.setAttribute("for", "move-" + p.id);
          moveLab.textContent = "Équipe";

          var moveSel = document.createElement("select");
          moveSel.id = "move-" + p.id;
          moveSel.className = "compo-move-select";
          for (var ti = 0; ti < k; ti++) {
            var o = document.createElement("option");
            o.value = String(ti);
            o.textContent = getTeamLabel(ti);
            if (ti === assignments[p.id]) o.selected = true;
            if (ti !== assignments[p.id] && !deplacementValide(assignments, k, p.id, ti)) {
              o.disabled = true;
            }
            moveSel.appendChild(o);
          }
          moveSel.addEventListener("change", function () {
            var nv = parseInt(moveSel.value, 10);
            if (isNaN(nv) || nv < 0 || nv >= k) return;
            if (!deplacementValide(assignments, k, p.id, nv)) {
              montrerMsg("Ce changement déséquilibrerait les effectifs des équipes (écart max. 1 joueur).");
              moveSel.value = String(assignments[p.id]);
              return;
            }
            montrerMsg("");
            assignments[p.id] = nv;
            sauverImmediate();
            renderEquipes();
          });

          moveWrap.appendChild(moveLab);
          moveWrap.appendChild(moveSel);

          li.appendChild(badge);
          li.appendChild(nm);
          li.appendChild(moveWrap);
          ul.appendChild(li);
        });
      }
      card.appendChild(ul);
      equipesContainer.appendChild(card);
    }
    sectionEquipes.hidden = false;
  }

  lierEquipesContainerEvents();

  var btnImportClasse = document.getElementById("btn-import-classe-compo");
  if (btnImportClasse) btnImportClasse.addEventListener("click", importerDepuisClasse);

  var btnReporterEquipes = document.getElementById("btn-reporter-equipes-fiches");
  if (btnReporterEquipes) btnReporterEquipes.addEventListener("click", reporterEquipesDansFiches);

  if (btnValider) {
    btnValider.addEventListener("click", function () {
      montrerMsg("");
      var texte = listeBruteEl.value;
      var lignes = texte
        .split(/\r?\n/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);

      if (lignes.length === 0) {
        montrerMsg("Ajoutez au moins une ligne avec un nom de joueur.");
        return;
      }

      var ajouts = lignes
        .map(function (ligne) {
          return parserLigneJoueur(ligne);
        })
        .filter(function (x) {
          return x !== null;
        });
      if (ajouts.length === 0) {
        montrerMsg("Aucune ligne valide (nom vide ou incorrect).");
        return;
      }

      players = players.concat(ajouts);
      listeBruteEl.value = "";
      assignments = null;
      majBoutonTirage();
      sectionEquipes.hidden = true;
      OutilsDom.clear(equipesContainer);
      sauverImmediate();
      renderJoueurs();
    });
  }

  if (btnViderJoueurs) {
    btnViderJoueurs.addEventListener("click", function () {
      if (players.length === 0) return;
      if (
        !confirm(
          "Supprimer les " +
            players.length +
            " joueur(s) de la liste ? Les équipes seront effacées."
        )
      ) {
        return;
      }
      montrerMsg("");
      players = [];
      assignments = null;
      majBoutonTirage();
      sectionEquipes.hidden = true;
      OutilsDom.clear(equipesContainer);
      renderJoueurs();
      sauverImmediate();
    });
  }

  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", function () {
      exporterCsv();
    });
  }

  if (btnExportPdf) {
    btnExportPdf.addEventListener("click", function () {
      exporterPdf();
    });
  }

  btnComposer.addEventListener("click", function () {
    lancerComposition(false);
  });

  btnTirage.addEventListener("click", function () {
    if (!assignments || players.length === 0) return;
    lancerComposition(true);
  });

  function restaurer() {
    return charger().then(function (data) {
    if (!data) {
      majBoutonTirage();
      return;
    }
    if (data.listeBrute && listeBruteEl) {
      listeBruteEl.value = data.listeBrute;
      if (listeManuellePanel && listeManuellePanel.open) listeManuellePanel.open();
    }
    if (Array.isArray(data.players)) players = data.players;
    teamNames = Array.isArray(data.teamNames) ? data.teamNames.slice() : [];
    teamColors = Array.isArray(data.teamColors) ? data.teamColors.slice() : [];
    if (nbEquipesEl && players.length >= 2) {
      var nb = typeof data.nbEquipes === "number" ? data.nbEquipes : 2;
      nb = Math.max(2, Math.min(24, players.length, nb));
      nbEquipesEl.value = String(nb);
    } else if (nbEquipesEl && typeof data.nbEquipes === "number") {
      nbEquipesEl.value = String(Math.max(2, Math.min(24, data.nbEquipes)));
    }
    assignments = null;
    if (data.assignments && typeof data.assignments === "object" && players.length) {
      var as = {};
      var ok = true;
      players.forEach(function (p) {
        if (typeof data.assignments[p.id] !== "number") ok = false;
        else as[p.id] = data.assignments[p.id];
      });
      if (ok && Object.keys(as).length === players.length) {
        var k = parseInt(nbEquipesEl.value, 10) || 2;
        players.forEach(function (p) {
          if (as[p.id] < 0 || as[p.id] >= k) ok = false;
        });
        if (ok && assignmentsGlobalementValides(as, k)) assignments = as;
      }
    }
    if (assignments) ensureTeamArrays(parseInt(nbEquipesEl.value, 10) || 2);
    majBoutonTirage();
    renderJoueurs();
    if (assignments) renderEquipes();
    else sectionEquipes.hidden = true;
    });
  }

  listeBruteEl.addEventListener("input", sauverDebounced);

  nbEquipesEl.addEventListener("input", function () {
    if (assignments) {
      assignments = null;
      majBoutonTirage();
      sectionEquipes.hidden = true;
      OutilsDom.clear(equipesContainer);
    }
    sauverDebounced();
  });

  if (typeof SessionManager !== "undefined" && typeof DataManager !== "undefined") {
    SessionManager.init({
      toolId: DataManager.SESSION_TOOLS.COMPOSITION,
      toolLabel: "Composition d’équipes",
      onSessionReady: restaurer,
      onSessionCleared: function () {
        players = [];
        assignments = null;
        teamNames = [];
        teamColors = [];
        if (listeBruteEl) listeBruteEl.value = "";
        majBoutonTirage();
        renderJoueurs();
        sectionEquipes.hidden = true;
        OutilsDom.clear(equipesContainer);
      },
    });
  } else {
    montrerMsg("Gestion des séances indisponible sur cet appareil.");
  }
})();
