/**
 * Questions débrief — bilan personnel ou d’équipe (élèves).
 */
(function () {
  "use strict";

  var Core =
    typeof QuestionsDebriefCore !== "undefined" ? QuestionsDebriefCore : null;
  if (!Core) return;

  var TOOL_ID = "questions-debrief";
  var SEANCES_STORAGE_KEY = "outils_eps_questions_debrief_seances_v1";
  var PORTEE_STORAGE_KEY = "outils_eps_questions_debrief_portee_v1";
  var FICHE_STORAGE_KEY_LEGACY = "outils_eps_questions_debrief_fiches_v1";

  var state = { seances: [], portee: "individuel" };
  var SCALE_MIN = Core.SCALE_MIN;
  var SCALE_MAX = Core.SCALE_MAX;
  var TEXTE_MAX = Core.TEXTE_MAX_LENGTH;
  var currentSeanceId = null;
  var seanceSaveTimer = null;

  var viewList = document.getElementById("debrief-view-list");
  var viewSession = document.getElementById("debrief-view-session");
  var msgEl = document.getElementById("debrief-msg");
  var resultatsEl = document.getElementById("debrief-resultats");
  var hintEl = document.getElementById("debrief-resultat-hint");
  var porteeHintEl = document.getElementById("debrief-portee-hint");
  var porteeRadios = document.querySelectorAll('input[name="portee-debrief"]');
  var shareBarEl = document.getElementById("eleve-share-bar");
  var seancesListEl = document.getElementById("debrief-seances-list");
  var seancesEmptyEl = document.getElementById("debrief-seances-empty");
  var seancesBadgeEl = document.getElementById("debrief-seances-acc-badge");
  var titleInput = document.getElementById("debrief-seance-title");
  var dateInput = document.getElementById("debrief-seance-date");
  var eleveNomInput = document.getElementById("debrief-eleve-nom");
  var eleveClasseInput = document.getElementById("debrief-eleve-classe");

  function genererId(prefix) {
    return (prefix || "db") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  }

  function normaliserTexte(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function getEleveMetaFields() {
    return {
      auteurLabel: eleveNomInput ? normaliserTexte(eleveNomInput.value) : "",
      classeLabel: eleveClasseInput ? normaliserTexte(eleveClasseInput.value) : "",
    };
  }

  function metaDepuisLabels() {
    if (typeof EleveLabels === "undefined") {
      return { auteurLabel: "", classeLabel: "" };
    }
    var meta = EleveLabels.getMetaFields();
    var tool = EleveLabels.getToolLabels(TOOL_ID);
    return {
      auteurLabel: normaliserTexte(tool.auteurLabel || meta.auteurLabel || ""),
      classeLabel: normaliserTexte(tool.classeLabel || meta.classeLabel || ""),
    };
  }

  function persisterEleveMeta() {
    if (typeof EleveLabels === "undefined") return;
    var fields = getEleveMetaFields();
    EleveLabels.saveToolLabels(TOOL_ID, fields);
    EleveLabels.saveMetaFields({ classeLabel: fields.classeLabel, auteurLabel: fields.auteurLabel });
  }

  function remplirChampsEleve(seance) {
    var labels = metaDepuisLabels();
    var nom = seance ? normaliserTexte(seance.eleveNom) : "";
    var classe = seance ? normaliserTexte(seance.eleveClasse) : "";
    if (eleveNomInput) eleveNomInput.value = nom || labels.auteurLabel;
    if (eleveClasseInput) eleveClasseInput.value = classe || labels.classeLabel;
  }

  function montrerMsg(texte, ok) {
    if (!msgEl) return;
    if (!texte) {
      msgEl.hidden = true;
      msgEl.textContent = "";
      msgEl.classList.remove("msg-ok");
      return;
    }
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.toggle("msg-ok", !!ok);
  }

  function todayIsoDate() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function formatDateFr(iso) {
    if (!iso) return "";
    try {
      var p = String(iso).split("-");
      if (p.length === 3) return p[2] + "/" + p[1] + "/" + p[0];
    } catch (e) {
      /* ignore */
    }
    return iso;
  }

  function porteeDebrief() {
    var checked = document.querySelector('input[name="portee-debrief"]:checked');
    return checked && checked.value === "equipe" ? "equipe" : "individuel";
  }

  function chargerPortee() {
    try {
      if (localStorage.getItem(PORTEE_STORAGE_KEY) === "equipe") state.portee = "equipe";
    } catch (e) {
      /* ignore */
    }
  }

  function sauvegarderPortee() {
    try {
      localStorage.setItem(PORTEE_STORAGE_KEY, state.portee);
    } catch (e) {
      /* ignore */
    }
  }

  function currentSeance() {
    if (!currentSeanceId) return null;
    return state.seances.filter(function (s) {
      return s.id === currentSeanceId;
    })[0] || null;
  }

  function normaliserSeance(raw) {
    if (!raw || typeof raw !== "object") return null;
    var portee = raw.portee === "equipe" ? "equipe" : "individuel";
    var seance = {
      id: raw.id || genererId("db_"),
      title: normaliserTexte(raw.title) || "Débrief",
      dateIso: raw.dateIso || todayIsoDate(),
      portee: portee,
      eleveNom: normaliserTexte(raw.eleveNom),
      eleveClasse: normaliserTexte(raw.eleveClasse),
      items: raw.items || [],
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
    seance.items = Core.buildItemsForPortee(portee, seance.items);
    return seance;
  }

  function ensureSeanceQuestions(seance) {
    if (!seance) return;
    seance.items = Core.buildItemsForPortee(seance.portee, seance.items);
    touchSeance(seance);
  }

  function uniqueSeanceTitle(title) {
    title = normaliserTexte(title) || "Débrief";
    var exists = state.seances.some(function (s) {
      return s.title === title;
    });
    if (!exists) return title;
    var n = 2;
    while (
      state.seances.some(function (s) {
        return s.title === title + " (" + n + ")";
      })
    ) {
      n++;
    }
    return title + " (" + n + ")";
  }

  function touchSeance(seance) {
    seance.updatedAt = new Date().toISOString();
  }

  function planifierSauvegardeSeances() {
    if (seanceSaveTimer) clearTimeout(seanceSaveTimer);
    seanceSaveTimer = setTimeout(sauvegarderSeances, 350);
  }

  function sauvegarderSeances() {
    try {
      localStorage.setItem(
        SEANCES_STORAGE_KEY,
        JSON.stringify({ seances: state.seances })
      );
    } catch (e) {
      montrerMsg("Enregistrement des débriefs impossible sur cet appareil.");
    }
    majSeancesBadge();
    renderSessionsList();
  }

  function chargerSeances() {
    try {
      var raw = localStorage.getItem(SEANCES_STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.seances)) {
          state.seances = data.seances.map(normaliserSeance).filter(Boolean);
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }
    migrerAnciennesFiches();
  }

  function migrerAnciennesFiches() {
    try {
      var raw = localStorage.getItem(FICHE_STORAGE_KEY_LEGACY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;
      var today = todayIsoDate();
      if (data.individuel && Array.isArray(data.individuel.items) && data.individuel.items.length) {
        state.seances.push(
          normaliserSeance({
            id: genererId("db_"),
            title: "Débrief individuel (import)",
            dateIso: today,
            portee: "individuel",
            items: data.individuel.items.map(function (it, i) {
              var canon = Core.questionsForPortee("individuel")[i];
              return {
                id: (canon && canon.id) || it.listeId || "q" + i,
                listeId: it.listeId,
                listeNom: it.listeNom,
                question: it.question || it.texte,
                reponse: it.reponse,
              };
            }),
          })
        );
      }
      if (data.equipe && Array.isArray(data.equipe.items) && data.equipe.items.length) {
        state.seances.push(
          normaliserSeance({
            id: genererId("db_"),
            title: "Débrief d’équipe (import)",
            dateIso: today,
            portee: "equipe",
            items: data.equipe.items.map(function (it, i) {
              var canon = Core.questionsForPortee("equipe")[i];
              return {
                id: (canon && canon.id) || it.listeId || "q" + i,
                listeId: it.listeId,
                listeNom: it.listeNom,
                question: it.question || it.texte,
                reponse: it.reponse,
              };
            }),
          })
        );
      }
      if (state.seances.length) sauvegarderSeances();
    } catch (e) {
      /* ignore */
    }
  }

  function majSeancesBadge() {
    if (!seancesBadgeEl) return;
    var n = state.seances.length;
    seancesBadgeEl.textContent = n ? n + " débrief" + (n > 1 ? "s" : "") : "";
    seancesBadgeEl.hidden = !n;
  }

  function compteReponses(seance) {
    if (!seance) return 0;
    var portee = seance.portee === "equipe" ? "equipe" : "individuel";
    return (seance.items || []).filter(function (it) {
      return Core.isReponseValide(it.reponse, Core.questionDef(it, portee));
    }).length;
  }

  function renderSessionsList() {
    if (!seancesListEl) return;
    OutilsDom.clear(seancesListEl);
    var seances = state.seances.slice().sort(function (a, b) {
      return (b.dateIso || "").localeCompare(a.dateIso || "") || (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    if (seancesEmptyEl) seancesEmptyEl.hidden = seances.length > 0;
    seances.forEach(function (seance) {
      var li = document.createElement("li");
      li.className = "debrief-seance-row";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "debrief-seance-btn";
      btn.setAttribute("data-seance-id", seance.id);
      var nbRep = compteReponses(seance);
      var meta =
        formatDateFr(seance.dateIso) +
        " · " +
        Core.porteeLabel(seance.portee) +
        (seance.items.length
          ? " · " + seance.items.length + " question" + (seance.items.length > 1 ? "s" : "")
          : "") +
        (nbRep ? " · " + nbRep + " rép." : "");
      btn.innerHTML =
        '<span class="debrief-seance-btn__title">' +
        escapeHtml(seance.title) +
        '</span><span class="debrief-seance-btn__meta">' +
        escapeHtml(meta) +
        "</span>";
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn--ghost btn--small debrief-seance-del";
      del.setAttribute("data-action", "delete-seance");
      del.setAttribute("data-seance-id", seance.id);
      del.setAttribute("aria-label", "Supprimer " + seance.title);
      del.textContent = "✕";
      li.appendChild(btn);
      li.appendChild(del);
      seancesListEl.appendChild(li);
    });
    majSeancesBadge();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showList() {
    currentSeanceId = null;
    if (viewList) viewList.hidden = false;
    if (viewSession) viewSession.hidden = true;
    renderSessionsList();
  }

  function syncSeanceFieldsFromInputs() {
    var seance = currentSeance();
    if (!seance) return;
    if (titleInput) seance.title = normaliserTexte(titleInput.value) || "Débrief";
    if (dateInput) seance.dateIso = dateInput.value || todayIsoDate();
    var eleve = getEleveMetaFields();
    seance.eleveNom = eleve.auteurLabel;
    seance.eleveClasse = eleve.classeLabel;
    persisterEleveMeta();
    touchSeance(seance);
    planifierSauvegardeSeances();
  }

  function appliquerPorteeSurSeance() {
    var seance = currentSeance();
    if (!seance) return;
    seance.portee = porteeDebrief();
    ensureSeanceQuestions(seance);
    planifierSauvegardeSeances();
    afficherFiche(seance);
    majShareBar();
  }

  function showSession(seanceId) {
    var seance = state.seances.filter(function (s) {
      return s.id === seanceId;
    })[0];
    if (!seance) {
      showList();
      return;
    }
    currentSeanceId = seanceId;
    if (viewList) viewList.hidden = true;
    if (viewSession) viewSession.hidden = false;
    if (titleInput) titleInput.value = seance.title;
    if (dateInput) dateInput.value = seance.dateIso;
    remplirChampsEleve(seance);
    porteeRadios.forEach(function (radio) {
      radio.checked = radio.value === seance.portee;
    });
    ensureSeanceQuestions(seance);
    majInterfacePortee();
    afficherFiche(seance);
    majShareBar();
    if (viewSession.scrollIntoView) viewSession.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createSeance() {
    var labels = metaDepuisLabels();
    var seance = normaliserSeance({
      id: genererId("db_"),
      title: uniqueSeanceTitle("Débrief"),
      dateIso: todayIsoDate(),
      portee: state.portee === "equipe" ? "equipe" : "individuel",
      eleveNom: labels.auteurLabel,
      eleveClasse: labels.classeLabel,
      items: [],
    });
    ensureSeanceQuestions(seance);
    state.seances.unshift(seance);
    sauvegarderSeances();
    showSession(seance.id);
  }

  function deleteSeance(seanceId) {
    state.seances = state.seances.filter(function (s) {
      return s.id !== seanceId;
    });
    sauvegarderSeances();
    if (currentSeanceId === seanceId) showList();
    else renderSessionsList();
  }

  function majInterfacePortee() {
    var portee = porteeDebrief();
    state.portee = portee;
    sauvegarderPortee();

    if (porteeHintEl) {
      porteeHintEl.textContent =
        portee === "equipe"
          ? "4 notes de 1 à 5, puis 3 questions texte (obstacles, progrès, priorités)."
          : "4 notes de 1 à 5, puis 3 questions texte (difficultés, progrès, axes de travail).";
    }

    if (currentSeanceId) appliquerPorteeSurSeance();
  }

  function majShareBar() {
    if (!shareBarEl) return;
    var seance = currentSeance();
    shareBarEl.hidden = !(seance && seance.items.length);
  }

  function afficherFiche(seance) {
    if (!resultatsEl) return;
    OutilsDom.clear(resultatsEl);
    if (!seance || !seance.items.length) {
      resultatsEl.hidden = true;
      if (hintEl) hintEl.hidden = false;
      majShareBar();
      return;
    }
    resultatsEl.hidden = false;
    if (hintEl) hintEl.hidden = true;
    resultatsEl.classList.add("inducteur-resultats--flash");
    setTimeout(function () {
      resultatsEl.classList.remove("inducteur-resultats--flash");
    }, 400);
    var entete = document.createElement("p");
    entete.className = "debrief-resultats__titre";
    entete.textContent = Core.porteeLabel(seance.portee);
    resultatsEl.appendChild(entete);

    var sectionTexteAffichee = false;
    seance.items.forEach(function (item, index) {
      var qDef = Core.questionDef(item, seance.portee);
      var estTexte = qDef && Core.isTexte(qDef);

      if (estTexte && !sectionTexteAffichee) {
        sectionTexteAffichee = true;
        var sep = document.createElement("p");
        sep.className = "debrief-resultats__section";
        sep.textContent = "Questions complémentaires (texte)";
        resultatsEl.appendChild(sep);
      }

      var bloc = document.createElement("div");
      bloc.className =
        "inducteur-resultat debrief-resultat" + (estTexte ? " debrief-resultat--texte" : "");

      var num = document.createElement("span");
      num.className = "debrief-resultat__num";
      num.textContent = "Question " + (index + 1);
      bloc.appendChild(num);

      var label = document.createElement("span");
      label.className = "inducteur-resultat__liste";
      label.textContent = item.listeNom;
      bloc.appendChild(label);

      var strong = document.createElement("p");
      strong.className = "inducteur-resultat__texte debrief-resultat__question";
      strong.textContent = item.question;
      bloc.appendChild(strong);

      if (estTexte) {
        var repLabel = document.createElement("label");
        repLabel.className = "field-label debrief-reponse-label";
        repLabel.setAttribute("for", "debrief-reponse-" + index);
        repLabel.textContent = "Votre réponse";
        bloc.appendChild(repLabel);

        var textarea = document.createElement("textarea");
        textarea.id = "debrief-reponse-" + index;
        textarea.className = "debrief-reponse-input";
        textarea.rows = 2;
        textarea.maxLength = TEXTE_MAX;
        textarea.placeholder = "Réponse courte (optionnel, " + TEXTE_MAX + " caractères max)…";
        if (item.id === "difficulte") {
          textarea.setAttribute("aria-describedby", "debrief-texte-hint");
        }
        textarea.value = Core.normalizeReponse(item.reponse, qDef);
        textarea.addEventListener("input", function () {
          item.reponse = Core.normalizeReponse(textarea.value, qDef);
          touchSeance(seance);
          planifierSauvegardeSeances();
        });
        bloc.appendChild(textarea);

        if (item.id === "difficulte") {
          var textHint = document.createElement("p");
          textHint.id = "debrief-texte-hint";
          textHint.className = "hint debrief-reponse-hint";
          textHint.textContent =
            "Texte optionnel — " +
            TEXTE_MAX +
            " caractères max par réponse pour un QR lisible.";
          bloc.appendChild(textHint);
        }
      } else {
        var noteLabel = document.createElement("span");
        noteLabel.className = "field-label debrief-reponse-label";
        noteLabel.textContent = "Votre note";
        bloc.appendChild(noteLabel);

        var echelle = document.createElement("fieldset");
        echelle.className = "debrief-echelle";
        var echelleHintId = "debrief-echelle-hint";
        if (index === 0) {
          echelle.setAttribute("aria-describedby", echelleHintId);
        }

        var options = document.createElement("div");
        options.className = "debrief-echelle__options";
        options.setAttribute("role", "radiogroup");
        options.setAttribute(
          "aria-label",
          item.question + " — note de " + SCALE_MIN + " à " + SCALE_MAX
        );

        function choisirNote(note) {
          item.reponse = Core.normalizeReponse(note, qDef);
          touchSeance(seance);
          planifierSauvegardeSeances();
          options.querySelectorAll(".debrief-echelle__opt").forEach(function (opt) {
            var input = opt.querySelector("input");
            var actif = input && input.value === item.reponse;
            opt.classList.toggle("is-selected", !!actif);
            if (input) input.checked = !!actif;
          });
        }

        for (var note = SCALE_MIN; note <= SCALE_MAX; note++) {
          var opt = document.createElement("label");
          opt.className = "debrief-echelle__opt";
          var radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "debrief-echelle-" + seance.id + "-" + index;
          radio.value = String(note);
          radio.checked = item.reponse === String(note);
          if (radio.checked) opt.classList.add("is-selected");
          var numSpan = document.createElement("span");
          numSpan.className = "debrief-echelle__num";
          numSpan.textContent = String(note);
          opt.appendChild(radio);
          opt.appendChild(numSpan);
          radio.addEventListener("change", function () {
            if (this.checked) choisirNote(this.value);
          });
          options.appendChild(opt);
        }
        echelle.appendChild(options);

        if (index === 0) {
          var leg = document.createElement("p");
          leg.id = echelleHintId;
          leg.className = "hint debrief-echelle-legend";
          leg.textContent = SCALE_MIN + " = pas du tout · " + SCALE_MAX + " = tout à fait";
          echelle.appendChild(leg);
        }
        bloc.appendChild(echelle);
      }

      resultatsEl.appendChild(bloc);
    });
    majShareBar();
  }

  function buildExportPayload() {
    syncSeanceFieldsFromInputs();
    var seance = currentSeance();
    if (!seance) return Core.buildCompactSharePayload(null);
    return Core.buildCompactSharePayload(seance);
  }

  function validateBeforeShare() {
    syncSeanceFieldsFromInputs();
    var seance = currentSeance();
    if (!seance || !seance.items.length) {
      return "Ouvrez un débrief de séance.";
    }
    if (!Core.seancePretPourPartage(seance)) {
      return (
        "Attribuez une note de " +
        SCALE_MIN +
        " à " +
        SCALE_MAX +
        " pour chaque critère (implication, concentration, progrès, " +
        (seance.portee === "equipe" ? "coopération" : "effort") +
        ") avant de partager."
      );
    }
    return null;
  }

  function mountQrShare() {
    if (typeof EleveQrShare === "undefined" || !shareBarEl) return;
    EleveQrShare.mountButton(shareBarEl, {
      toolId: TOOL_ID,
      buttonLabel: "Partager ce débrief au prof (QR)",
      getParticipantLabel: function () {
        syncSeanceFieldsFromInputs();
        return getEleveMetaFields().auteurLabel;
      },
      getPayload: buildExportPayload,
      validateBeforeShare: validateBeforeShare,
    });
  }

  function bindListeners() {
    porteeRadios.forEach(function (radio) {
      radio.addEventListener("change", majInterfacePortee);
    });

    var btnNew = document.getElementById("debrief-btn-new");
    if (btnNew) btnNew.addEventListener("click", createSeance);

    var btnBack = document.getElementById("debrief-btn-back-list");
    if (btnBack) btnBack.addEventListener("click", showList);

    var btnDelete = document.getElementById("debrief-btn-delete");
    if (btnDelete) {
      btnDelete.addEventListener("click", function () {
        var seance = currentSeance();
        if (!seance) return;
        if (!confirm("Supprimer ce débrief et toutes ses réponses ?")) return;
        deleteSeance(seance.id);
      });
    }

    if (titleInput) {
      titleInput.addEventListener("change", syncSeanceFieldsFromInputs);
      titleInput.addEventListener("blur", syncSeanceFieldsFromInputs);
    }
    if (dateInput) {
      dateInput.addEventListener("change", syncSeanceFieldsFromInputs);
    }
    [eleveNomInput, eleveClasseInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", syncSeanceFieldsFromInputs);
      input.addEventListener("change", syncSeanceFieldsFromInputs);
    });

    if (seancesListEl) {
      seancesListEl.addEventListener("click", function (e) {
        var delBtn = e.target.closest('[data-action="delete-seance"]');
        if (delBtn) {
          e.stopPropagation();
          var delId = delBtn.getAttribute("data-seance-id");
          var s = state.seances.filter(function (x) {
            return x.id === delId;
          })[0];
          if (!s || !confirm("Supprimer « " + s.title + " » ?")) return;
          deleteSeance(delId);
          return;
        }
        var openBtn = e.target.closest(".debrief-seance-btn[data-seance-id]");
        if (!openBtn) return;
        showSession(openBtn.getAttribute("data-seance-id"));
      });
    }
  }

  mountQrShare();
  bindListeners();
  chargerPortee();
  chargerSeances();
  renderSessionsList();
  showList();
})();
