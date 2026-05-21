/**
 * Questions débrief — tirage de questions pour bilan personnel ou d’équipe (élèves).
 * Stockage : IndexedDB (paramètres via DataManager).
 */
(function () {
  "use strict";

  var PARAM_ID = "questions-debrief";
  var TOOL_ID = "questions-debrief";
  var SEANCES_STORAGE_KEY = "outils_eps_questions_debrief_seances_v1";
  var FICHE_STORAGE_KEY_LEGACY = "outils_eps_questions_debrief_fiches_v1";

  /** Fiche bilan individuel : une question par thème. */
  var FICHE_INDIVIDUEL_IDS = [
    "bilan-personnel",
    "progressions",
    "pistes-amelioration",
    "difficultes",
  ];

  /** Fiche bilan d’équipe : une question par thème. */
  var FICHE_EQUIPE_IDS = [
    "bilan-equipe",
    "progressions",
    "pistes-amelioration",
    "points-positifs",
  ];

  var LISTES_DEFAUT = [
    {
      id: "bilan-personnel",
      nom: "Bilan personnel",
      questions: [
        "Comment vous êtes-vous senti(e) pendant la séance d’aujourd’hui ?",
        "Qu’avez-vous le plus aimé dans cette séance ?",
        "Qu’est-ce qui vous a le plus demandé d’effort ?",
        "À quel moment avez-vous été le plus concentré(e) ?",
        "Qu’avez-vous appris sur vous-même aujourd’hui ?",
        "Quelle action ou geste vous a le plus marqué(e) ?",
        "Comment évaluez-vous votre implication dans la séance ?",
        "Qu’auriez-vous fait différemment si vous recommenciez ?",
      ],
    },
    {
      id: "bilan-equipe",
      nom: "Bilan d’équipe",
      questions: [
        "Comment votre équipe a-t-elle fonctionné aujourd’hui ?",
        "Qu’est-ce qui a bien marché dans la coopération du groupe ?",
        "Y a-t-il eu des moments de désaccord ? Comment les avez-vous gérés ?",
        "Chacun a-t-il pu s’exprimer et participer ?",
        "Quel rôle avez-vous pris dans le groupe ?",
        "Comment vous êtes-vous entraidés pendant la séance ?",
        "Quelle décision commune avez-vous prise ? Était-elle efficace ?",
        "Que pourrait faire l’équipe pour mieux travailler ensemble la prochaine fois ?",
      ],
    },
    {
      id: "progressions",
      nom: "Progressions",
      questions: [
        "Par rapport à la dernière séance, qu’avez-vous progressé ?",
        "Quelle compétence ou technique maîtrisez-vous mieux qu’avant ?",
        "Quel objectif fixé en début de séance avez-vous atteint ?",
        "Donnez un exemple concret d’un progrès réalisé aujourd’hui.",
        "Qu’est-ce qui vous semble plus facile qu’au début de l’année ?",
        "Quelle consigne avez-vous mieux comprise ou appliquée ?",
        "En quoi votre niveau a-t-il changé sur l’activité travaillée ?",
        "Quelle réussite voulez-vous garder en tête pour la suite ?",
      ],
    },
    {
      id: "pistes-amelioration",
      nom: "Pistes d’amélioration",
      questions: [
        "Sur quoi voulez-vous progresser à la prochaine séance ?",
        "Quelle compétence devez-vous encore travailler ?",
        "Quel point technique ou tactique reste à améliorer ?",
        "Qu’allez-vous essayer de faire différemment la prochaine fois ?",
        "De quoi avez-vous besoin pour progresser (entraînement, aide, consigne…) ?",
        "Quel objectif personnel fixez-vous pour la prochaine séance ?",
        "Quelle habitude de travail pourriez-vous renforcer ?",
        "Quelle question voulez-vous poser au professeur pour progresser ?",
      ],
    },
    {
      id: "points-positifs",
      nom: "Points positifs",
      questions: [
        "Citez trois réussites de la séance (petites ou grandes).",
        "Quel compliment feriez-vous à un camarade de votre groupe ?",
        "Quel moment de la séance aimeriez-vous revivre ?",
        "Qu’avez-vous réussi alors que vous pensiez que ce serait difficile ?",
        "Quelle qualité avez-vous mise en avant aujourd’hui ?",
      ],
    },
    {
      id: "difficultes",
      nom: "Difficultés",
      questions: [
        "Quelle difficulté avez-vous rencontrée aujourd’hui ?",
        "Qu’est-ce qui vous a bloqué ou freiné pendant l’activité ?",
        "Qu’avez-vous trouvé trop difficile et pourquoi ?",
        "De quoi auriez-vous besoin pour surmonter cette difficulté ?",
        "Comment le groupe pourrait-il vous aider sur ce point ?",
      ],
    },
  ];

  var state = { listes: [], seances: [], portee: "individuel" };
  var currentSeanceId = null;
  var saveTimer = null;
  var seanceSaveTimer = null;

  var viewList = document.getElementById("debrief-view-list");
  var viewSession = document.getElementById("debrief-view-session");
  var msgEl = document.getElementById("debrief-msg");
  var resultatsEl = document.getElementById("debrief-resultats");
  var hintEl = document.getElementById("debrief-resultat-hint");
  var editorEl = document.getElementById("listes-editor");
  var porteeHintEl = document.getElementById("debrief-portee-hint");
  var btnTirerLabelEl = document.getElementById("btn-tirer-label");
  var porteeRadios = document.querySelectorAll('input[name="portee-debrief"]');
  var shareBarEl = document.getElementById("eleve-share-bar");
  var seancesListEl = document.getElementById("debrief-seances-list");
  var seancesEmptyEl = document.getElementById("debrief-seances-empty");
  var seancesBadgeEl = document.getElementById("debrief-seances-acc-badge");
  var titleInput = document.getElementById("debrief-seance-title");
  var dateInput = document.getElementById("debrief-seance-date");

  function genererId(prefix) {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId(prefix || "liste");
    }
    return (prefix || "liste") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  }

  function copierListesDefaut() {
    return LISTES_DEFAUT.map(function (l) {
      return {
        id: l.id,
        nom: l.nom,
        questions: l.questions.slice(),
      };
    });
  }

  function fusionnerListesDefautManquantes() {
    var ids = {};
    state.listes.forEach(function (l) {
      ids[l.id] = true;
    });
    var ajouts = false;
    LISTES_DEFAUT.forEach(function (def) {
      if (ids[def.id]) return;
      state.listes.push({
        id: def.id,
        nom: def.nom,
        questions: def.questions.slice(),
      });
      ajouts = true;
    });
    if (ajouts) planifierSauvegarde();
  }

  function normaliserTexte(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function questionsListe(liste) {
    var q = liste.questions;
    if (!Array.isArray(q) && Array.isArray(liste.inducteurs)) q = liste.inducteurs;
    return Array.isArray(q) ? q : [];
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

  function porteeLabel(portee) {
    return portee === "equipe" ? "Bilan d’équipe" : "Bilan individuel";
  }

  function titreBilan(portee) {
    return portee === "equipe" ? "Fiche bilan d’équipe" : "Fiche bilan individuel";
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
    return {
      id: raw.id || genererId("db_"),
      title: normaliserTexte(raw.title) || "Débrief",
      dateIso: raw.dateIso || todayIsoDate(),
      portee: portee,
      items: (raw.items || []).map(function (it) {
        return {
          listeId: it.listeId || "",
          listeNom: it.listeNom || "Thème",
          question: normaliserTexte(it.question || it.texte),
          reponse: String(it.reponse != null ? it.reponse : ""),
        };
      }).filter(function (it) {
        return it.question;
      }),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
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
            items: data.individuel.items,
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
            items: data.equipe.items,
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
    return (seance.items || []).filter(function (it) {
      return String(it.reponse || "").trim().length > 0;
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
        porteeLabel(seance.portee) +
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
    touchSeance(seance);
    planifierSauvegardeSeances();
  }

  function appliquerPorteeSurSeance() {
    var seance = currentSeance();
    if (!seance) return;
    seance.portee = porteeDebrief();
    touchSeance(seance);
    planifierSauvegardeSeances();
    if (seance.items.length) afficherFiche(seance);
    else {
      if (resultatsEl) resultatsEl.hidden = true;
      if (hintEl) hintEl.hidden = false;
    }
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
    porteeRadios.forEach(function (radio) {
      radio.checked = radio.value === seance.portee;
    });
    majInterfacePortee();
    if (seance.items.length) afficherFiche(seance);
    else {
      if (resultatsEl) resultatsEl.hidden = true;
      if (hintEl) hintEl.hidden = false;
    }
    majShareBar();
    if (viewSession.scrollIntoView) viewSession.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createSeance() {
    var seance = normaliserSeance({
      id: genererId("db_"),
      title: uniqueSeanceTitle("Débrief"),
      dateIso: todayIsoDate(),
      portee: state.portee === "equipe" ? "equipe" : "individuel",
      items: [],
    });
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

  function idsFichePourPortee(portee) {
    return portee === "equipe" ? FICHE_EQUIPE_IDS : FICHE_INDIVIDUEL_IDS;
  }

  function majInterfacePortee() {
    var portee = porteeDebrief();
    state.portee = portee;
    planifierSauvegarde();

    if (porteeHintEl) {
      porteeHintEl.textContent =
        portee === "equipe"
          ? "Sur le groupe : coopération, réussites collectives et objectifs pour la prochaine séance."
          : "Sur vous : ressenti, progrès personnels et axes de travail.";
    }

    if (btnTirerLabelEl) {
      btnTirerLabelEl.textContent = "Obtenir ma fiche personnalisée";
    }

    if (currentSeanceId) appliquerPorteeSurSeance();
  }

  function questionsParListeId(listeId) {
    var liste = state.listes.filter(function (l) {
      return l.id === listeId;
    })[0];
    if (!liste) return [];
    return questionsListe(liste)
      .map(normaliserTexte)
      .filter(Boolean)
      .map(function (t) {
        return { texte: t, listeId: liste.id, listeNom: liste.nom };
      });
  }

  function tirerUn(pool) {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
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
    resultatsEl.classList.add("inducteur-resultats--flash");
    setTimeout(function () {
      resultatsEl.classList.remove("inducteur-resultats--flash");
    }, 400);
    if (hintEl) hintEl.hidden = true;

    var entete = document.createElement("p");
    entete.className = "debrief-resultats__titre";
    entete.textContent = titreBilan(seance.portee);
    resultatsEl.appendChild(entete);

    seance.items.forEach(function (item, index) {
      var bloc = document.createElement("div");
      bloc.className = "inducteur-resultat debrief-resultat";

      if (seance.items.length > 1) {
        var num = document.createElement("span");
        num.className = "debrief-resultat__num";
        num.textContent = "Question " + (index + 1);
        bloc.appendChild(num);
      }

      var label = document.createElement("span");
      label.className = "inducteur-resultat__liste";
      label.textContent = item.listeNom;
      bloc.appendChild(label);

      var strong = document.createElement("p");
      strong.className = "inducteur-resultat__texte debrief-resultat__question";
      strong.textContent = item.question;
      bloc.appendChild(strong);

      var repLabel = document.createElement("label");
      repLabel.className = "field-label debrief-reponse-label";
      repLabel.setAttribute("for", "debrief-reponse-" + index);
      repLabel.textContent = "Votre réponse";
      bloc.appendChild(repLabel);

      var textarea = document.createElement("textarea");
      textarea.id = "debrief-reponse-" + index;
      textarea.className = "debrief-reponse-input";
      textarea.rows = 3;
      textarea.maxLength = 2000;
      textarea.placeholder = "Rédigez votre réponse…";
      textarea.value = item.reponse || "";
      textarea.addEventListener("input", function () {
        item.reponse = textarea.value;
        touchSeance(seance);
        planifierSauvegardeSeances();
      });
      bloc.appendChild(textarea);

      resultatsEl.appendChild(bloc);
    });
    majShareBar();
  }

  function tirerFiche(portee) {
    var resultats = [];
    var manquantes = [];
    idsFichePourPortee(portee).forEach(function (lid) {
      var pool = questionsParListeId(lid);
      if (!pool.length) {
        manquantes.push(lid);
        return;
      }
      var t = tirerUn(pool);
      if (t) resultats.push(t);
    });
    return { resultats: resultats, manquantes: manquantes };
  }

  function tirer() {
    montrerMsg("");
    var seance = currentSeance();
    if (!seance) {
      montrerMsg("Créez ou ouvrez un débrief de séance.");
      return;
    }
    syncSeanceFieldsFromInputs();
    var portee = porteeDebrief();
    seance.portee = portee;

    if (!state.listes.length) {
      montrerMsg("Aucune liste de questions disponible.");
      return;
    }

    var tirage = tirerFiche(portee);
    var resultats = tirage.resultats;
    if (!resultats.length) {
      montrerMsg("Les questions de ce bilan sont vides. Réinitialisez ou complétez les listes.");
      return;
    }
    if (tirage.manquantes.length) {
      montrerMsg(
        "Fiche incomplète : certains thèmes sont vides. Les autres questions sont affichées.",
        true
      );
    }

    var prevItems = seance.items || [];
    seance.items = resultats.map(function (item) {
      var prev = prevItems.find(function (x) {
        return x.listeId === item.listeId && x.question === item.texte;
      });
      return {
        listeId: item.listeId,
        listeNom: item.listeNom,
        question: item.texte,
        reponse: prev ? prev.reponse : "",
      };
    });
    touchSeance(seance);
    sauvegarderSeances();
    afficherFiche(seance);
  }

  function buildExportPayload() {
    syncSeanceFieldsFromInputs();
    var seance = currentSeance();
    if (!seance) return { portee: "individuel", titre: "", reponses: [] };
    return {
      seanceTitle: seance.title,
      dateIso: seance.dateIso,
      dateLabel: formatDateFr(seance.dateIso),
      portee: seance.portee,
      porteeLabel: porteeLabel(seance.portee),
      titre: titreBilan(seance.portee),
      reponses: seance.items.map(function (it) {
        return {
          theme: it.listeNom,
          question: it.question,
          reponse: String(it.reponse || "").trim(),
        };
      }),
    };
  }

  function validateBeforeShare() {
    syncSeanceFieldsFromInputs();
    var seance = currentSeance();
    if (!seance || !seance.items.length) {
      return "Obtenez d’abord votre fiche personnalisée.";
    }
    var remplies = seance.items.filter(function (it) {
      return String(it.reponse || "").trim().length > 0;
    });
    if (!remplies.length) {
      return "Rédigez au moins une réponse avant de partager.";
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
        var seance = currentSeance();
        var base = seance ? seance.title + " · " + porteeLabel(seance.portee) : "Débrief";
        if (typeof EleveLabels !== "undefined" && EleveLabels.getToolLabels) {
          var labels = EleveLabels.getToolLabels(TOOL_ID);
          if (labels.auteurLabel) return labels.auteurLabel + " · " + base;
        }
        return base;
      },
      getPayload: buildExportPayload,
      validateBeforeShare: validateBeforeShare,
    });
  }

  function planifierSauvegarde() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(sauvegarder, 400);
  }

  function sauvegarder() {
    if (typeof DataManager === "undefined" || !DataManager.saveParametre) return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_ID,
      portee: state.portee === "equipe" ? "equipe" : "individuel",
      listes: state.listes.map(function (l) {
        return {
          id: l.id,
          nom: l.nom,
          questions: questionsListe(l),
        };
      }),
    }).catch(function () {
      montrerMsg("Enregistrement impossible (stockage local indisponible).");
    });
  }

  function normaliserListeChargee(l) {
    return {
      id: l.id || genererId("liste"),
      nom: normaliserTexte(l.nom) || "Liste",
      questions: questionsListe(l).map(normaliserTexte).filter(Boolean),
    };
  }

  function charger() {
    if (typeof DataManager === "undefined" || !DataManager.getParametre) {
      state.listes = copierListesDefaut();
      return Promise.resolve();
    }
    return DataManager.initDB()
      .then(function () {
        return DataManager.getParametre(PARAM_ID);
      })
      .then(function (rec) {
        if (rec && Array.isArray(rec.listes) && rec.listes.length) {
          state.listes = rec.listes.map(normaliserListeChargee);
        } else {
          state.listes = copierListesDefaut();
        }
        if (rec && rec.portee === "equipe") state.portee = "equipe";
        else state.portee = "individuel";
        fusionnerListesDefautManquantes();
      })
      .catch(function () {
        state.listes = copierListesDefaut();
      });
  }

  function creerBlocListe(liste, index) {
    var details = document.createElement("details");
    details.className = "inducteur-liste";
    details.open = index === 0;

    var summary = document.createElement("summary");
    summary.className = "inducteur-liste__summary";

    var nomInput = document.createElement("input");
    nomInput.type = "text";
    nomInput.className = "inducteur-liste__nom-input";
    nomInput.value = liste.nom;
    nomInput.setAttribute("aria-label", "Nom du thème");
    nomInput.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    nomInput.addEventListener("input", function () {
      liste.nom = normaliserTexte(nomInput.value) || "Liste";
      planifierSauvegarde();
    });

    var count = document.createElement("span");
    count.className = "inducteur-liste__count";
    count.textContent = questionsListe(liste).length + " question(s)";

    var btnSupprListe = document.createElement("button");
    btnSupprListe.type = "button";
    btnSupprListe.className = "inducteur-liste__delete";
    btnSupprListe.textContent = "Supprimer";
    btnSupprListe.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (state.listes.length <= 1) {
        montrerMsg("Gardez au moins une liste.");
        return;
      }
      if (!confirm("Supprimer la liste « " + liste.nom + " » ?")) return;
      state.listes = state.listes.filter(function (l) {
        return l.id !== liste.id;
      });
      planifierSauvegarde();
      renderEditor();
    });

    summary.appendChild(nomInput);
    summary.appendChild(count);
    summary.appendChild(btnSupprListe);
    details.appendChild(summary);

    var panel = document.createElement("div");
    panel.className = "inducteur-liste__panel";

    var hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Une question par ligne. Validez pour enregistrer.";
    panel.appendChild(hint);

    var textarea = document.createElement("textarea");
    textarea.rows = 6;
    textarea.className = "inducteur-liste__textarea";
    textarea.spellcheck = true;
    textarea.value = questionsListe(liste).join("\n");
    panel.appendChild(textarea);

    var row = document.createElement("div");
    row.className = "field-row inducteur-liste__actions";

    var btnValider = document.createElement("button");
    btnValider.type = "button";
    btnValider.className = "btn btn--primary btn--labeled";
    var iconV = document.createElement("span");
    iconV.className = "btn__icon";
    iconV.setAttribute("aria-hidden", "true");
    iconV.textContent = "✓";
    var textV = document.createElement("span");
    textV.className = "btn__text";
    textV.textContent = "Valider les questions";
    btnValider.appendChild(iconV);
    btnValider.appendChild(textV);
    btnValider.addEventListener("click", function () {
      var lignes = textarea.value
        .split(/\r?\n/)
        .map(normaliserTexte)
        .filter(Boolean);
      liste.questions = lignes;
      count.textContent = lignes.length + " question(s)";
      textarea.value = lignes.join("\n");
      planifierSauvegarde();
      montrerMsg(lignes.length + " question(s) enregistrée(s) dans « " + liste.nom + " ».", true);
    });

    var ul = document.createElement("ul");
    ul.className = "inducteur-inducteurs";
    ul.setAttribute("role", "list");

    function renderTags() {
      ul.innerHTML = "";
      questionsListe(liste).forEach(function (q) {
        var li = document.createElement("li");
        li.className = "inducteur-inducteurs__item debrief-tag";
        var span = document.createElement("span");
        span.textContent = q;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "inducteur-inducteurs__remove";
        btn.setAttribute("aria-label", "Retirer la question");
        btn.textContent = "×";
        btn.addEventListener("click", function () {
          liste.questions = questionsListe(liste).filter(function (x) {
            return x !== q;
          });
          count.textContent = liste.questions.length + " question(s)";
          textarea.value = liste.questions.join("\n");
          renderTags();
          planifierSauvegarde();
        });
        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);
      });
      ul.hidden = !questionsListe(liste).length;
    }

    renderTags();
    row.appendChild(btnValider);
    panel.appendChild(row);
    panel.appendChild(ul);
    details.appendChild(panel);

    return details;
  }

  function renderEditor() {
    if (!editorEl) return;
    OutilsDom.clear(editorEl);
    if (!state.listes.length) {
      editorEl.appendChild(OutilsDom.emptyState("Aucune liste."));
      return;
    }
    state.listes.forEach(function (liste, i) {
      editorEl.appendChild(creerBlocListe(liste, i));
    });
  }

  function nouvelleListe() {
    var nom = prompt("Nom du thème :", "Nouveau thème");
    if (nom === null) return;
    var n = normaliserTexte(nom) || "Nouveau thème";
    state.listes.push({
      id: genererId("liste"),
      nom: n,
      questions: [],
    });
    planifierSauvegarde();
    renderEditor();
    montrerMsg("Liste « " + n + " » créée.", true);
  }

  function resetListes() {
    if (
      !confirm(
        "Réinitialiser toutes les questions par défaut ? Vos listes actuelles seront remplacées."
      )
    ) {
      return;
    }
    state.listes = copierListesDefaut();
    planifierSauvegarde();
    renderEditor();
    montrerMsg("Questions réinitialisées.", true);
  }

  function bindListeners() {
    porteeRadios.forEach(function (radio) {
      radio.addEventListener("change", majInterfacePortee);
    });

    var btnTirer = document.getElementById("btn-tirer");
    if (btnTirer) btnTirer.addEventListener("click", tirer);

    var btnNouvelle = document.getElementById("btn-nouvelle-liste");
    if (btnNouvelle) btnNouvelle.addEventListener("click", nouvelleListe);

    var btnReset = document.getElementById("btn-reset-listes");
    if (btnReset) btnReset.addEventListener("click", resetListes);

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
  chargerSeances();

  charger().then(function () {
    renderEditor();
    renderSessionsList();
    showList();
  });
})();
