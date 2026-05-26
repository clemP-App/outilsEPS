/**
 * Validation ASNS — interface professeur (bord de bassin).
 */
(function () {
  "use strict";

  var Core = ValidationAsnsCore;
  var SE = Core.STATUT_ELEVE;
  var SC = Core.STATUT_COMP;

  var data = null;
  var settings = null;
  var classeActiveId = null;
  var filtreRapide = "";
  var eleveValidationId = null;
  var eleveDialogId = null;
  var saveTimer = null;
  var settingsSaveTimer = null;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function montrerErreur(t) {
    if (!els.msg) return;
    els.msg.hidden = !t;
    els.msg.textContent = t || "";
    if (t && els.ok) els.ok.hidden = true;
  }

  function montrerOk(t) {
    if (!els.ok) return;
    els.ok.hidden = !t;
    els.ok.textContent = t || "";
    if (t) {
      montrerErreur("");
      setTimeout(function () {
        els.ok.hidden = true;
      }, 2800);
    }
  }

  function run(p) {
    (p || Promise.resolve()).catch(function (e) {
      montrerErreur(e && e.message ? e.message : "Erreur.");
    });
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      run(Core.saveData(data));
    }, 400);
  }

  function scheduleSaveSettings() {
    if (!settings) return;
    if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(function () {
      run(Core.saveSettings(settings));
    }, 400);
  }

  function setClasseActive(id, options) {
    options = options || {};
    classeActiveId = id || null;
    if (settings) {
      settings.classeActiveId = classeActiveId;
      if (options.save !== false) scheduleSaveSettings();
    }
  }

  function resoudreClasseActive() {
    if (!data.classes.length) {
      setClasseActive(null, { save: false });
      return;
    }
    var saved = settings && settings.classeActiveId;
    if (saved && Core.getClasse(data, saved)) {
      setClasseActive(saved, { save: false });
      return;
    }
    setClasseActive(data.classes[0].id, { save: false });
  }

  function normaliseRecherche(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function eleveARevoir(e) {
    return Core.ETAPES.some(function (ep) {
      return e.etapes[ep.id] === SC.A_REVOIR;
    });
  }

  function getElevesFiltres() {
    var list = classeActiveId ? Core.elevesDeClasse(data, classeActiveId) : data.eleves.slice();
    var q = normaliseRecherche(els.search ? els.search.value : "").trim();
    if (q) {
      list = list.filter(function (e) {
        var hay = normaliseRecherche(
          [e.nom, e.prenom, e.groupe, e.niveau, e.commentaires].join(" ")
        );
        return hay.indexOf(q) !== -1;
      });
    }
    if (filtreRapide === "a_revoir") {
      list = list.filter(eleveARevoir);
    } else if (filtreRapide) {
      list = list.filter(function (e) {
        return e.statut === filtreRapide;
      });
    }
    return list;
  }

  function classeItemStatut(statut) {
    if (statut === SE.VALIDE) return "dispense-item--done";
    if (statut === SE.NON_VALIDE) return "dispense-item--active";
    return "";
  }

  function majTitreAccordeonClasses() {
    var lbl = $("lbl-classes");
    if (!lbl) return;
    var c = classeActiveId ? Core.getClasse(data, classeActiveId) : null;
    lbl.textContent = c && c.nom ? "Classes — " + c.nom : "Classes";
  }

  function renderStats() {
    if (!els.stats) return;
    var eleves = classeActiveId ? Core.elevesDeClasse(data, classeActiveId) : data.eleves;
    var c = Core.compterParStatut(eleves);
    var total = eleves.length || 1;
    var pct = Math.round((c.valide / total) * 100);
    els.stats.innerHTML =
      '<div class="asns-stat"><strong>' +
      c.valide +
      '</strong><span>Validés</span></div>' +
      '<div class="asns-stat"><strong>' +
      c.en_cours +
      '</strong><span>En cours</span></div>' +
      '<div class="asns-stat"><strong>' +
      c.non_valide +
      '</strong><span>Non validés</span></div>' +
      '<div class="asns-stat"><strong>' +
      pct +
      '%</strong><span>Réussite</span></div>';
  }

  function renderCarteEleve(e) {
    var prog = Core.progressionEleve(e);
    var card = document.createElement("article");
    card.className = "dispense-item " + classeItemStatut(e.statut);
    card.dataset.id = e.id;

    var head = document.createElement("div");
    head.className = "dispense-item__head";

    var main = document.createElement("div");
    main.className = "dispense-item__main";
    var titre = document.createElement("p");
    titre.className = "dispense-item__title";
    titre.textContent = [e.prenom, e.nom].filter(Boolean).join(" ") || "Sans nom";
    main.appendChild(titre);

    var note = document.createElement("p");
    note.className = "dispense-note";
    var parts = [Core.STATUT_LABELS[e.statut] || e.statut];
    if (e.groupe) parts.push("Groupe " + e.groupe);
    parts.push(prog.valides + " / " + prog.total + " étapes validées");
    if (prog.pct > 0 && prog.pct < 100) parts.push(prog.pct + " %");
    note.textContent = parts.join(" · ");
    main.appendChild(note);

    var bar = document.createElement("div");
    bar.className = "asns-progress";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuenow", String(prog.pct));
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    var fill = document.createElement("span");
    fill.className = "asns-progress__fill";
    fill.style.width = prog.pct + "%";
    bar.appendChild(fill);
    main.appendChild(bar);

    head.appendChild(main);

    var days = document.createElement("div");
    days.className = "dispense-item__days";
    var daysNum = document.createElement("span");
    daysNum.className = "dispense-item__days-num";
    daysNum.textContent = prog.valides + "/" + prog.total;
    var daysLbl = document.createElement("span");
    daysLbl.className = "dispense-item__days-label";
    daysLbl.textContent = "étapes";
    days.appendChild(daysNum);
    days.appendChild(daysLbl);
    head.appendChild(days);

    card.appendChild(head);

    var actions = document.createElement("div");
    actions.className = "dispense-actions";

    var btnVal = document.createElement("button");
    btnVal.type = "button";
    btnVal.className = "btn btn--primary btn--labeled";
    btnVal.innerHTML =
      '<span class="btn__icon" aria-hidden="true">✓</span><span class="btn__text">Valider</span>';
    btnVal.addEventListener("click", function () {
      ouvrirValidation(e.id);
    });
    actions.appendChild(btnVal);

    var btnMod = document.createElement("button");
    btnMod.type = "button";
    btnMod.className = "btn btn--ghost btn--small";
    btnMod.textContent = "Modifier";
    btnMod.addEventListener("click", function () {
      ouvrirFicheEleve(e.id);
    });
    actions.appendChild(btnMod);

    var btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn btn--ghost btn--small";
    btnDel.textContent = "Supprimer";
    btnDel.addEventListener("click", function () {
      supprimerEleve(e.id);
    });
    actions.appendChild(btnDel);

    card.appendChild(actions);
    return card;
  }

  function renderListeEleves() {
    if (!els.listeEleves) return;
    renderStats();
    els.listeEleves.innerHTML = "";
    var list = getElevesFiltres();
    if (!list.length) {
      if (els.listeEmpty) {
        els.listeEmpty.hidden = false;
        els.listeEmpty.textContent = data.classes.length
          ? "Aucun élève ne correspond."
          : "Créez une classe dans l'onglet Classes.";
      }
      return;
    }
    if (els.listeEmpty) els.listeEmpty.hidden = true;
    list.forEach(function (e) {
      els.listeEleves.appendChild(renderCarteEleve(e));
    });
  }

  function renderAttestations() {
    if (!els.attestList) return;
    els.attestList.innerHTML = "";
    var list = getElevesFiltres().filter(function (e) {
      return e.statut === SE.VALIDE;
    });
    if (!list.length) {
      els.attestList.innerHTML =
        '<p class="empty-state">Aucun élève validé pour l\'instant.</p>';
      return;
    }
    list.forEach(function (e) {
      var row = document.createElement("div");
      row.className = "classes-eleve-item";
      var main = document.createElement("div");
      main.className = "classes-eleve-item__main";
      var nom = document.createElement("span");
      nom.className = "classes-eleve-item__nom";
      nom.textContent = [e.prenom, e.nom].join(" ");
      main.appendChild(nom);
      row.appendChild(main);
      var act = document.createElement("div");
      act.className = "classes-eleve-item__actions";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--primary btn--small";
      btn.textContent = "PDF";
      btn.addEventListener("click", function () {
        run(genererPdfEleve(e));
      });
      act.appendChild(btn);
      row.appendChild(act);
      els.attestList.appendChild(row);
    });
  }

  function renderClasses() {
    if (!els.classesList) return;
    els.classesList.innerHTML = "";
    var hint = $("asns-classes-hint");
    if (!data.classes.length) {
      if (els.classesDetail) els.classesDetail.hidden = true;
      if (hint) hint.hidden = false;
      majTitreAccordeonClasses();
      return;
    }
    if (hint) hint.hidden = true;
    data.classes.forEach(function (c) {
      var li = document.createElement("li");
      li.className =
        "classes-list__item" + (c.id === classeActiveId ? " classes-list__item--active" : "");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "classes-list__btn";
      var nb = Core.elevesDeClasse(data, c.id).length;
      btn.textContent = c.nom + " (" + nb + (nb <= 1 ? " élève" : " élèves") + ")";
      btn.addEventListener("click", function () {
        setClasseActive(c.id);
        if (els.classeNom) els.classeNom.value = c.nom;
        if (els.classesDetail) els.classesDetail.hidden = false;
        renderAll();
      });
      li.appendChild(btn);
      els.classesList.appendChild(li);
    });
    if (classeActiveId && els.classesDetail) {
      els.classesDetail.hidden = false;
      if (els.classeNom) {
        var active = Core.getClasse(data, classeActiveId);
        if (active) els.classeNom.value = active.nom;
      }
    }
    majTitreAccordeonClasses();
  }

  function carteParcoursRef(ep, num, variante) {
    var row = document.createElement("div");
    row.className = "asns-parcours-item" + (variante ? " asns-parcours-item--" + variante : "");
    var badge = document.createElement("span");
    badge.className = "asns-parcours-item__num";
    badge.textContent = String(num);
    var text = document.createElement("p");
    text.className = "asns-parcours-item__text";
    text.textContent = ep.label;
    row.appendChild(badge);
    row.appendChild(text);
    return row;
  }

  function renderParcoursReference() {
    var parc = $("asns-parcours-parcours");
    var conn = $("asns-parcours-conn");
    if (!parc || !conn) return;
    parc.innerHTML = "";
    conn.innerHTML = "";
    var i = 1;
    Core.etapesParSection("parcours").forEach(function (ep) {
      parc.appendChild(carteParcoursRef(ep, i, "parcours"));
      i++;
    });
    i = 1;
    Core.etapesParSection("connaissances").forEach(function (ep) {
      conn.appendChild(carteParcoursRef(ep, i, "conn"));
      i++;
    });
  }

  function renderAll() {
    renderListeEleves();
    renderAttestations();
    renderClasses();
  }

  function ouvrirAccordeonClasses() {
    var acc = $("asns-acc-classes");
    if (!acc) return;
    acc.open = true;
    acc.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setVue(v) {
    document.querySelectorAll(".dispense-nav--asns .dispense-nav__btn").forEach(function (btn) {
      var on = btn.dataset.view === v;
      btn.classList.toggle("dispense-nav__btn--active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".page-outil--asns .dispense-view").forEach(function (panel) {
      var on = panel.dataset.viewPanel === v;
      panel.hidden = !on;
    });
    if (v === "parametres") chargerParametresForm();
    if (v === "attestations") renderAttestations();
  }

  function supprimerEleve(id) {
    if (!confirm("Supprimer cet élève et tout son historique ?")) return;
    data.eleves = data.eleves.filter(function (x) {
      return x.id !== id;
    });
    run(
      Core.saveData(data).then(function () {
        montrerOk("Élève supprimé.");
        renderAll();
      })
    );
  }

  function ouvrirFicheEleve(id) {
    eleveDialogId = id;
    var e = Core.getEleve(data, id);
    if (!e) return;
    $("asns-dialog-eleve-title").textContent = "Modifier — " + [e.prenom, e.nom].join(" ");
    $("asns-eleve-nom").value = e.nom;
    $("asns-eleve-prenom").value = e.prenom;
    $("asns-eleve-naissance").value = e.dateNaissance || "";
    $("asns-eleve-commentaires").value = e.commentaires || "";
    var hist = $("asns-eleve-historique");
    hist.innerHTML = "<h3>Historique</h3>";
    if (!e.historique.length) {
      hist.innerHTML += "<p class='hint'>Aucun passage enregistré.</p>";
    } else {
      e.historique.forEach(function (h) {
        var prog =
          h.etapes &&
          Core.ETAPES.filter(function (ep) {
            return h.etapes[ep.id] === SC.VALIDE;
          }).length;
        var p = document.createElement("p");
        p.textContent =
          Core.formatDateFr(h.date) +
          " — " +
          (Core.STATUT_LABELS[h.resultat] || h.resultat) +
          (prog !== undefined ? " (" + prog + "/" + Core.ETAPES.length + " étapes)" : "") +
          (h.observations ? " — " + h.observations : "");
        hist.appendChild(p);
      });
    }
    $("asns-eleve-delete").hidden = false;
    els.dialogEleve.showModal();
  }

  var STATUTS_ETAPE = [SC.VALIDE, SC.NON_VALIDE, SC.A_REVOIR, SC.ABSENT];

  function classeStatutBtn(st) {
    return "asns-stat-btn asns-stat-btn--" + st.replace(/_/g, "-");
  }

  function syncBoutonsStatut(btns, statutActif) {
    btns.querySelectorAll(".asns-stat-btn").forEach(function (btn) {
      var actif = !!statutActif && btn.dataset.statut === statutActif;
      btn.classList.toggle("asns-stat-btn--selected", actif);
      btn.setAttribute("aria-pressed", actif ? "true" : "false");
    });
  }

  function classeEtapeRow(st) {
    var rowClass = "asns-val-step";
    if (st) rowClass += " asns-val-step--" + st.replace(/_/g, "-");
    return rowClass;
  }

  function appliquerStatutEtape(row, btns, e, ep, st) {
    e.etapes[ep.id] = st;
    row.className = classeEtapeRow(st);
    syncBoutonsStatut(btns, st);
    majProgressValidation(e);
  }

  function ajouterLigneEtape(grille, e, ep, index) {
    var row = document.createElement("article");
    row.className = classeEtapeRow(e.etapes[ep.id]);

    var head = document.createElement("div");
    head.className = "asns-val-step__head";
    var num = document.createElement("span");
    num.className = "asns-val-step__num";
    num.textContent = String(index);
    var lab = document.createElement("p");
    lab.className = "asns-val-step__label";
    lab.textContent = ep.label;
    head.appendChild(num);
    head.appendChild(lab);
    row.appendChild(head);

    var btns = document.createElement("div");
    btns.className = "asns-stat-btns";
    btns.setAttribute("role", "group");
    btns.setAttribute("aria-label", "Statut — étape " + index);

    STATUTS_ETAPE.forEach(function (st) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = classeStatutBtn(st);
      b.dataset.statut = st;
      b.textContent = Core.COMP_LABELS[st];
      if (e.etapes[ep.id] === st) {
        b.classList.add("asns-stat-btn--selected");
        b.setAttribute("aria-pressed", "true");
      } else {
        b.setAttribute("aria-pressed", "false");
      }
      b.addEventListener("click", function () {
        var actuel = e.etapes[ep.id];
        appliquerStatutEtape(row, btns, e, ep, actuel === st ? "" : st);
      });
      btns.appendChild(b);
    });
    row.appendChild(btns);
    grille.appendChild(row);
  }

  function majProgressValidation(e) {
    var prog = Core.progressionEleve(e);
    var el = $("asns-validation-progress");
    if (el) {
      el.textContent =
        prog.valides + " / " + prog.total + " étapes validées (" + prog.pct + " %)";
    }
    var bar = $("asns-validation-progressbar");
    var fill = $("asns-validation-progress-fill");
    if (bar) {
      bar.setAttribute("aria-valuenow", String(prog.valides));
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(prog.total));
    }
    if (fill) {
      fill.style.width = prog.pct + "%";
    }
    var pctEl = $("asns-validation-pct");
    if (pctEl) pctEl.textContent = prog.pct + "%";
  }

  function renderGrilleValidation(e) {
    var grille = $("asns-validation-grille");
    if (!grille || !e) return;
    grille.innerHTML = "";

    var hParc = document.createElement("h3");
    hParc.className = "asns-val-section-title";
    hParc.textContent = "Parcours";
    grille.appendChild(hParc);
    var i = 1;
    Core.etapesParSection("parcours").forEach(function (ep) {
      ajouterLigneEtape(grille, e, ep, i);
      i++;
    });

    var hConn = document.createElement("h3");
    hConn.className = "asns-val-section-title";
    hConn.textContent = "Connaissances et attitudes";
    grille.appendChild(hConn);
    Core.etapesParSection("connaissances").forEach(function (ep) {
      ajouterLigneEtape(grille, e, ep, i);
      i++;
    });

    majProgressValidation(e);
  }

  function ouvrirValidation(id) {
    eleveValidationId = id;
    var e = Core.getEleve(data, id);
    if (!e) return;
    $("asns-validation-title").textContent = [e.prenom, e.nom].join(" ");
    $("asns-validation-remarques").value = e.commentaires || "";
    renderGrilleValidation(e);
    els.dialogValidation.showModal();
  }

  function validerSection(e, section) {
    Core.etapesParSection(section).forEach(function (ep) {
      e.etapes[ep.id] = SC.VALIDE;
    });
  }

  function validerToutesEtapes(e) {
    Core.ETAPES.forEach(function (ep) {
      e.etapes[ep.id] = SC.VALIDE;
    });
  }

  function enregistrerValidation() {
    var e = Core.getEleve(data, eleveValidationId);
    if (!e) return;
    var rem = $("asns-validation-remarques").value.trim();
    e.commentaires = rem;
    e.statut = Core.calculerStatutGlobal(e);
    if (e.statut === SE.VALIDE) {
      e.dateValidation = new Date().toISOString();
    } else {
      e.dateValidation = null;
    }
    Core.ajouterHistorique(e, {
      resultat: e.statut,
      observations: rem,
      enseignant: (settings && settings.enseignant) || "",
    });
    run(
      Core.saveData(data).then(function () {
        els.dialogValidation.close();
        montrerOk("Validation enregistrée.");
        renderAll();
      })
    );
  }

  function genererPdfEleve(e) {
    return ValidationAsnsPdf.genererAttestation(e, settings).then(function () {
      montrerOk("Attestation téléchargée.");
    });
  }

  function chargerParametresForm() {
    if (!settings) return;
    $("asns-academie").value = settings.academie || "";
    $("asns-etablissement").value = settings.etablissement || "";
    $("asns-enseignant").value = settings.enseignant || "";
    $("asns-profil").value = settings.profil || "eps";
    initSignatureCanvas(settings.signaturePng);
  }

  function sauverParametres() {
    settings.academie = $("asns-academie").value.trim();
    settings.etablissement = $("asns-etablissement").value.trim();
    settings.enseignant = $("asns-enseignant").value.trim();
    settings.profil = $("asns-profil").value;
    return Core.saveSettings(settings).then(function () {
      montrerOk("Paramètres enregistrés.");
    });
  }

  function initSignatureCanvas(existingPng) {
    var canvas = $("asns-signature-canvas");
    if (!canvas) return;
    var sigCtx = canvas.getContext("2d");
    sigCtx.strokeStyle = "#0f172a";
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = "round";
    sigCtx.fillStyle = "#fff";
    sigCtx.fillRect(0, 0, canvas.width, canvas.height);
    if (existingPng) {
      var img = new Image();
      img.onload = function () {
        sigCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = existingPng;
    }
    var sigDrawing = false;
    function pos(ev) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left) * (canvas.width / r.width),
        y: (ev.clientY - r.top) * (canvas.height / r.height),
      };
    }
    function start(ev) {
      ev.preventDefault();
      sigDrawing = true;
      var p = pos(ev.touches ? ev.touches[0] : ev);
      sigCtx.beginPath();
      sigCtx.moveTo(p.x, p.y);
    }
    function move(ev) {
      if (!sigDrawing) return;
      ev.preventDefault();
      var p = pos(ev.touches ? ev.touches[0] : ev);
      sigCtx.lineTo(p.x, p.y);
      sigCtx.stroke();
    }
    function end() {
      sigDrawing = false;
    }
    canvas.onmousedown = start;
    canvas.onmousemove = move;
    canvas.onmouseup = end;
    canvas.onmouseleave = end;
    canvas.ontouchstart = start;
    canvas.ontouchmove = move;
    canvas.ontouchend = end;
  }

  function bindEvents() {
    document.querySelectorAll(".dispense-nav--asns .dispense-nav__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setVue(btn.dataset.view);
      });
    });

    if (els.search) els.search.addEventListener("input", renderListeEleves);

    document.querySelectorAll(".asns-dash-filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filtreRapide = btn.dataset.filter || "";
        document.querySelectorAll(".asns-dash-filter").forEach(function (b) {
          b.classList.toggle("btn--primary", b === btn && filtreRapide);
          b.classList.toggle("btn--ghost", b !== btn || !filtreRapide);
        });
        renderListeEleves();
      });
    });

    $("asns-btn-add-eleve").addEventListener("click", function () {
      if (!classeActiveId) {
        montrerErreur("Sélectionnez ou créez une classe d'abord.");
        ouvrirAccordeonClasses();
        return;
      }
      eleveDialogId = null;
      $("asns-dialog-eleve-title").textContent = "Nouvel élève";
      $("asns-form-eleve").reset();
      $("asns-eleve-delete").hidden = true;
      $("asns-eleve-historique").innerHTML = "";
      els.dialogEleve.showModal();
    });

    $("asns-form-eleve").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nom = $("asns-eleve-nom").value.trim();
      var prenom = $("asns-eleve-prenom").value.trim();
      if (!nom || !prenom) {
        montrerErreur("Nom et prénom obligatoires.");
        return;
      }
      var payload = {
        nom: nom,
        prenom: prenom,
        dateNaissance: $("asns-eleve-naissance").value,
        commentaires: $("asns-eleve-commentaires").value.trim(),
        classeId: classeActiveId,
      };
      if (eleveDialogId) {
        Object.assign(Core.getEleve(data, eleveDialogId), payload);
      } else {
        data.eleves.push(
          Core.normaliserEleve(
            Object.assign({ id: Core.genererId("eleve"), classeId: classeActiveId }, payload)
          )
        );
      }
      run(
        Core.saveData(data).then(function () {
          els.dialogEleve.close();
          montrerOk("Élève enregistré.");
          renderAll();
        })
      );
    });

    $("asns-eleve-close").addEventListener("click", function () {
      els.dialogEleve.close();
    });

    $("asns-eleve-delete").addEventListener("click", function () {
      if (!eleveDialogId) return;
      els.dialogEleve.close();
      supprimerEleve(eleveDialogId);
    });

    $("asns-val-tout-parcours").addEventListener("click", function () {
      var e = Core.getEleve(data, eleveValidationId);
      if (!e) return;
      validerSection(e, "parcours");
      renderGrilleValidation(e);
    });

    $("asns-val-tout-conn").addEventListener("click", function () {
      var e = Core.getEleve(data, eleveValidationId);
      if (!e) return;
      validerSection(e, "connaissances");
      renderGrilleValidation(e);
    });

    $("asns-val-tout").addEventListener("click", function () {
      var e = Core.getEleve(data, eleveValidationId);
      if (!e) return;
      validerToutesEtapes(e);
      renderGrilleValidation(e);
    });

    $("asns-val-enregistrer").addEventListener("click", enregistrerValidation);
    $("asns-val-close").addEventListener("click", function () {
      els.dialogValidation.close();
    });

    $("asns-btn-valider-groupe").addEventListener("click", function () {
      var list = getElevesFiltres();
      if (!list.length) {
        montrerErreur("Aucun élève à valider.");
        return;
      }
      if (
        !confirm("Valider toutes les étapes pour " + list.length + " élève(s) affiché(s) ?")
      ) {
        return;
      }
      list.forEach(function (e) {
        validerToutesEtapes(e);
        e.statut = SE.VALIDE;
        e.dateValidation = new Date().toISOString();
        Core.ajouterHistorique(e, {
          resultat: SE.VALIDE,
          observations: "Validation collective",
          enseignant: (settings && settings.enseignant) || "",
        });
      });
      run(
        Core.saveData(data).then(function () {
          montrerOk(list.length + " élève(s) validé(s).");
          renderAll();
        })
      );
    });

    $("asns-btn-new-classe").addEventListener("click", function () {
      var nom = prompt("Nom de la classe :", "6eA");
      if (!nom) return;
      nom = nom.trim();
      if (!nom) return;
      var id = Core.genererId("classe");
      data.classes.push({ id: id, nom: nom });
      setClasseActive(id, { save: false });
      run(
        Core.saveData(data).then(function () {
          setClasseActive(id);
          renderAll();
        })
      );
    });

    if (els.classeNom) {
      els.classeNom.addEventListener("change", function () {
        var c = Core.getClasse(data, classeActiveId);
        if (c) {
          c.nom = els.classeNom.value.trim();
          scheduleSave();
          majTitreAccordeonClasses();
        }
      });
    }

    $("asns-btn-del-classe").addEventListener("click", function () {
      if (!classeActiveId || !confirm("Supprimer cette classe et ses élèves ASNS ?")) return;
      data.eleves = data.eleves.filter(function (e) {
        return e.classeId !== classeActiveId;
      });
      data.classes = data.classes.filter(function (c) {
        return c.id !== classeActiveId;
      });
      setClasseActive(data.classes[0] ? data.classes[0].id : null, { save: false });
      run(
        Core.saveData(data).then(function () {
          setClasseActive(classeActiveId);
          renderAll();
        })
      );
    });

    $("asns-import-submit").addEventListener("click", function () {
      if (!classeActiveId) {
        montrerErreur("Sélectionnez une classe.");
        return;
      }
      var texteEl = $("asns-import-texte");
      if (!texteEl) return;
      var lignes = texteEl.value.split(/\r?\n/);
      var n = 0;
      lignes.forEach(function (ln) {
        if (/^nom\s*[;,]/i.test(ln.trim())) return;
        var p = Core.parserLigneCsv(ln);
        if (!p || !p.nom || !p.prenom) return;
        data.eleves.push(
          Core.normaliserEleve(
            Object.assign({ id: Core.genererId("eleve"), classeId: classeActiveId }, p)
          )
        );
        n++;
      });
      if (!n) {
        montrerErreur("Aucune ligne valide (nom et prénom obligatoires).");
        return;
      }
      texteEl.value = "";
      run(
        Core.saveData(data).then(function () {
          montrerOk(n + " élève(s) importé(s).");
          renderAll();
        })
      );
    });

    $("asns-btn-import-global").addEventListener("click", function () {
      if (typeof ClassImport === "undefined") {
        montrerErreur("Import de classe indisponible.");
        return;
      }
      ClassImport.open({
        title: "Importer depuis Classes et groupes",
        onConfirm: function (selection, classe) {
          var cid = Core.genererId("classe");
          data.classes.push({ id: cid, nom: (classe && classe.nom) || "Classe importée" });
          selection.forEach(function (el) {
            data.eleves.push(
              Core.normaliserEleve({
                id: Core.genererId("eleve"),
                classeId: cid,
                nom: el.nom || "",
                prenom: el.prenom || "",
                dateNaissance: el.dateNaissance || "",
                groupe: el.niveau || "",
              })
            );
          });
          classeActiveId = cid;
          run(
            Core.saveData(data).then(function () {
              montrerOk(selection.length + " élève(s) importé(s).");
              renderAll();
            })
          );
        },
      });
    });

    $("asns-btn-pdf-classe").addEventListener("click", function () {
      var list = classeActiveId ? Core.elevesDeClasse(data, classeActiveId) : data.eleves;
      run(ValidationAsnsPdf.genererClasse(list, settings));
    });

    $("asns-btn-print-info").addEventListener("click", function () {
      montrerOk("Ouvrez le PDF téléchargé puis imprimez depuis votre appareil.");
    });

    $("asns-signature-clear").addEventListener("click", function () {
      initSignatureCanvas(null);
    });

    $("asns-signature-save").addEventListener("click", function () {
      settings.signaturePng = $("asns-signature-canvas").toDataURL("image/png");
      run(
        Core.saveSettings(settings).then(function () {
          montrerOk("Signature enregistrée.");
        })
      );
    });

    $("asns-btn-save-settings").addEventListener("click", function () {
      run(sauverParametres());
    });

    window.addEventListener("online", function () {
      if (els.offline) els.offline.hidden = true;
    });
    window.addEventListener("offline", function () {
      if (els.offline) els.offline.hidden = false;
    });
    if (!navigator.onLine && els.offline) els.offline.hidden = false;
  }

  function initEls() {
    els.msg = $("asns-msg");
    els.ok = $("asns-ok");
    els.offline = $("asns-offline");
    els.search = $("asns-search-eleves");
    els.stats = $("asns-stats");
    els.listeEleves = $("asns-liste-eleves");
    els.listeEmpty = $("asns-liste-empty");
    els.attestList = $("asns-attest-list");
    els.classesList = $("asns-classes-list");
    els.classesDetail = $("asns-classes-detail");
    els.classeNom = $("asns-classe-nom");
    els.dialogEleve = $("asns-dialog-eleve");
    els.dialogValidation = $("asns-dialog-validation");
  }

  function init() {
    initEls();
    renderParcoursReference();
    bindEvents();
    run(
      Promise.all([Core.loadData(), Core.loadSettings()]).then(function (arr) {
        data = arr[0];
        settings = arr[1];
        resoudreClasseActive();
        renderAll();
        setVue("eleves");
      })
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
