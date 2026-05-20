/**
 * Questions débrief — tirage de questions pour bilan personnel ou d’équipe (élèves).
 * Stockage : IndexedDB (paramètres via DataManager).
 */
(function () {
  "use strict";

  var PARAM_ID = "questions-debrief";

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

  var state = { listes: [], portee: "individuel" };
  var saveTimer = null;

  var msgEl = document.getElementById("debrief-msg");
  var resultatsEl = document.getElementById("debrief-resultats");
  var hintEl = document.getElementById("debrief-resultat-hint");
  var editorEl = document.getElementById("listes-editor");
  var porteeHintEl = document.getElementById("debrief-portee-hint");
  var btnTirerLabelEl = document.getElementById("btn-tirer-label");
  var porteeRadios = document.querySelectorAll('input[name="portee-debrief"]');

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

  function porteeDebrief() {
    var checked = document.querySelector('input[name="portee-debrief"]:checked');
    return checked && checked.value === "equipe" ? "equipe" : "individuel";
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
      btnTirerLabelEl.textContent =
        portee === "equipe" ? "Obtenir ma fiche d’équipe" : "Obtenir ma fiche individuelle";
    }
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

  function afficherResultats(items, titreFiche) {
    if (!resultatsEl) return;
    OutilsDom.clear(resultatsEl);
    if (!items.length) {
      resultatsEl.hidden = true;
      if (hintEl) hintEl.hidden = false;
      return;
    }
    resultatsEl.hidden = false;
    resultatsEl.classList.add("inducteur-resultats--flash");
    setTimeout(function () {
      resultatsEl.classList.remove("inducteur-resultats--flash");
    }, 400);
    if (hintEl) hintEl.hidden = true;

    if (titreFiche && items.length > 1) {
      var entete = document.createElement("p");
      entete.className = "debrief-resultats__titre";
      entete.textContent = titreFiche;
      resultatsEl.appendChild(entete);
    }

    items.forEach(function (item, index) {
      var bloc = document.createElement("div");
      bloc.className = "inducteur-resultat debrief-resultat";
      var label = document.createElement("span");
      label.className = "inducteur-resultat__liste";
      label.textContent = item.listeNom;
      bloc.appendChild(label);
      var strong = document.createElement("p");
      strong.className = "inducteur-resultat__texte debrief-resultat__question";
      strong.textContent = item.texte;
      bloc.appendChild(strong);
      if (items.length > 1) {
        var num = document.createElement("span");
        num.className = "debrief-resultat__num";
        num.textContent = "Question " + (index + 1);
        bloc.insertBefore(num, label);
      }
      resultatsEl.appendChild(bloc);
    });
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
    var portee = porteeDebrief();
    var titreFiche = portee === "equipe" ? "Fiche bilan d’équipe" : "Fiche bilan individuel";

    if (!state.listes.length) {
      montrerMsg("Aucune liste de questions disponible.");
      return;
    }

    var fiche = tirerFiche(portee);
    var resultats = fiche.resultats;
    if (!resultats.length) {
      montrerMsg("Les questions de ce bilan sont vides. Réinitialisez ou complétez les listes.");
      return;
    }
    if (fiche.manquantes.length) {
      montrerMsg(
        "Fiche incomplète : certains thèmes sont vides. Les autres questions sont affichées.",
        true
      );
    }

    afficherResultats(resultats, titreFiche);
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
        appliquerPorteeEnregistree();
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

  function appliquerPorteeEnregistree() {
    porteeRadios.forEach(function (radio) {
      radio.checked = radio.value === state.portee;
    });
    majInterfacePortee();
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
    if (resultatsEl) resultatsEl.hidden = true;
    if (hintEl) hintEl.hidden = false;
    montrerMsg("Questions réinitialisées.", true);
  }

  porteeRadios.forEach(function (radio) {
    radio.addEventListener("change", majInterfacePortee);
  });

  var btnTirer = document.getElementById("btn-tirer");
  if (btnTirer) btnTirer.addEventListener("click", tirer);

  var btnNouvelle = document.getElementById("btn-nouvelle-liste");
  if (btnNouvelle) btnNouvelle.addEventListener("click", nouvelleListe);

  var btnReset = document.getElementById("btn-reset-listes");
  if (btnReset) btnReset.addEventListener("click", resetListes);

  charger().then(function () {
    renderEditor();
    appliquerPorteeEnregistree();
  });
})();
