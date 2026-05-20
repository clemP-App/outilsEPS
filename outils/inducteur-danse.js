/**
 * Inducteur danse — tirage aléatoire d’inducteurs par listes (APSA / EPS).
 * Stockage : IndexedDB (paramètres via DataManager).
 */
(function () {
  "use strict";

  var PARAM_ID = "inducteur-danse";

  var LISTES_DEFAUT = [
    {
      id: "espace",
      nom: "Espace",
      inducteurs: [
        "Haut",
        "Bas",
        "Au sol",
        "En diagonale",
        "Au centre",
        "Sur les bords",
        "Traverser l’espace",
        "Rester sur place",
        "Loin du public",
        "Près du public",
        "En cercle",
        "En ligne",
      ],
    },
    {
      id: "objet",
      nom: "Objet",
      inducteurs: [
        "Ballon",
        "Écharpe",
        "Cerceau",
        "Bâton",
        "Chaise",
        "Corde",
        "Coussin",
        "Ballon de gym",
        "Plot",
        "Sans objet (imaginer un objet)",
      ],
    },
    {
      id: "partenaire",
      nom: "Partenaire",
      inducteurs: [
        "Seul",
        "En duo",
        "En trio",
        "Miroir (copier l’autre)",
        "Opposition",
        "Contact léger",
        "Guidage",
        "À distance",
        "Dos à dos",
        "Face à face",
        "En groupe (3+)",
      ],
    },
    {
      id: "temps",
      nom: "Temps / Rythme",
      inducteurs: [
        "Lent",
        "Rapide",
        "Saccadé",
        "Continu",
        "En suspension",
        "Syncopé",
        "Sur l’accent",
        "En silence",
        "Accélération progressive",
        "Ralentissement progressif",
      ],
    },
    {
      id: "qualite",
      nom: "Qualité de mouvement",
      inducteurs: [
        "Fluide",
        "Cassé",
        "Lourd",
        "Léger",
        "Explosif",
        "Ondulant",
        "Étiré",
        "Rebondissant",
        "Glissé",
        "Tremblé",
      ],
    },
    {
      id: "contraintes-corporelles",
      nom: "Contraintes corporelles",
      inducteurs: [
        "Yeux fermés",
        "Un œil fermé",
        "Sans les bras",
        "Bras liés (collés au corps)",
        "Mains sur les hanches",
        "Un seul bras libre",
        "Genoux au sol uniquement",
        "Sans quitter le sol (pas de saut)",
        "Sur la pointe des pieds",
        "Talons collés au sol",
        "Tête fixe (ne pas bouger la tête)",
        "Bassin immobile",
        "Une jambe bloquée (l’autre seule en mouvement)",
        "Dos rond",
        "Dos cambré",
        "Épaules hautes",
        "Contact main-sol obligatoire",
        "Face au mur / dos au groupe",
      ],
    },
    {
      id: "energie",
      nom: "Énergie / Intention",
      inducteurs: [
        "Joie",
        "Colère",
        "Peur",
        "Surprise",
        "Calme",
        "Tension",
        "Légèreté",
        "Pesanteur",
        "Mystère",
        "Humour",
      ],
    },
    {
      id: "relation",
      nom: "Relation au groupe",
      inducteurs: [
        "Solo face au groupe",
        "Tout le monde ensemble",
        "Un mène, les autres suivent",
        "Échange de rôles",
        "Canons (décalage)",
        "En file",
        "En cercle",
        "Spectateur / acteur",
      ],
    },
  ];

  var state = { listes: [] };
  var saveTimer = null;

  var msgEl = document.getElementById("inducteur-msg");
  var wrapUneListe = document.getElementById("wrap-select-une-liste");
  var selectUneListe = document.getElementById("select-une-liste");
  var wrapCheckListes = document.getElementById("wrap-check-listes");
  var checkListesEl = document.getElementById("check-listes");
  var resultatsEl = document.getElementById("inducteur-resultats");
  var hintEl = document.getElementById("inducteur-resultat-hint");
  var editorEl = document.getElementById("listes-editor");
  var modeRadios = document.querySelectorAll('input[name="mode-tirage"]');

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
        inducteurs: l.inducteurs.slice(),
      };
    });
  }

  /** Ajoute les listes par défaut absentes (ex. après une mise à jour de l’outil). */
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
        inducteurs: def.inducteurs.slice(),
      });
      ajouts = true;
    });
    if (ajouts) planifierSauvegarde();
  }

  function normaliserTexte(s) {
    return (s || "").trim().replace(/\s+/g, " ");
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

  function modeTirage() {
    var checked = document.querySelector('input[name="mode-tirage"]:checked');
    return checked ? checked.value : "toutes";
  }

  function tousLesInducteurs() {
    var out = [];
    state.listes.forEach(function (liste) {
      (liste.inducteurs || []).forEach(function (ind) {
        var t = normaliserTexte(ind);
        if (t) out.push({ texte: t, listeId: liste.id, listeNom: liste.nom });
      });
    });
    return out;
  }

  function inducteursListe(listeId) {
    var liste = state.listes.filter(function (l) {
      return l.id === listeId;
    })[0];
    if (!liste) return [];
    return (liste.inducteurs || [])
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

  function majModeAffichage() {
    var mode = modeTirage();
    if (wrapUneListe) wrapUneListe.hidden = mode !== "une-liste";
    if (wrapCheckListes) wrapCheckListes.hidden = mode !== "plusieurs-listes";
    if (mode === "une-liste") majSelectUneListe();
    if (mode === "plusieurs-listes") majCheckListes();
  }

  function majSelectUneListe() {
    if (!selectUneListe) return;
    var prev = selectUneListe.value;
    selectUneListe.innerHTML = "";
    state.listes.forEach(function (l) {
      var opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.nom + " (" + (l.inducteurs || []).length + ")";
      selectUneListe.appendChild(opt);
    });
    if (prev && state.listes.some(function (l) { return l.id === prev; })) {
      selectUneListe.value = prev;
    }
  }

  function majCheckListes() {
    if (!checkListesEl) return;
    OutilsDom.clear(checkListesEl);
    if (!state.listes.length) {
      checkListesEl.appendChild(
        OutilsDom.emptyState("Créez au moins une liste dans « Gérer les listes ».")
      );
      return;
    }
    state.listes.forEach(function (l) {
      var label = document.createElement("label");
      label.className = "inducteur-check-item";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = l.id;
      input.className = "inducteur-check-input";
      input.checked = true;
      var span = document.createElement("span");
      span.textContent = l.nom;
      label.appendChild(input);
      label.appendChild(span);
      checkListesEl.appendChild(label);
    });
  }

  function listesCochees() {
    if (!checkListesEl) return [];
    var inputs = checkListesEl.querySelectorAll(".inducteur-check-input:checked");
    return Array.prototype.map.call(inputs, function (inp) {
      return inp.value;
    });
  }

  function afficherResultats(items) {
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

    items.forEach(function (item) {
      var bloc = document.createElement("div");
      bloc.className = "inducteur-resultat";
      if (items.length > 1) {
        var label = document.createElement("span");
        label.className = "inducteur-resultat__liste";
        label.textContent = item.listeNom;
        bloc.appendChild(label);
      }
      var strong = document.createElement("strong");
      strong.className = "inducteur-resultat__texte";
      strong.textContent = item.texte;
      bloc.appendChild(strong);
      resultatsEl.appendChild(bloc);
    });
  }

  function tirer() {
    montrerMsg("");
    var mode = modeTirage();
    var resultats = [];

    if (!state.listes.length) {
      montrerMsg("Ajoutez au moins une liste d’inducteurs.");
      return;
    }

    if (mode === "toutes") {
      var pool = tousLesInducteurs();
      if (!pool.length) {
        montrerMsg("Aucun inducteur dans vos listes. Ajoutez-en dans « Gérer les listes ».");
        return;
      }
      var un = tirerUn(pool);
      if (un) resultats.push(un);
    } else if (mode === "une-liste") {
      var id = selectUneListe ? selectUneListe.value : "";
      var poolUne = inducteursListe(id);
      if (!poolUne.length) {
        montrerMsg("Cette liste est vide. Ajoutez des inducteurs.");
        return;
      }
      var tire = tirerUn(poolUne);
      if (tire) resultats.push(tire);
    } else {
      var ids = listesCochees();
      if (!ids.length) {
        montrerMsg("Cochez au moins une liste pour le tirage combiné.");
        return;
      }
      var vide = true;
      ids.forEach(function (lid) {
        var poolL = inducteursListe(lid);
        if (!poolL.length) return;
        vide = false;
        var t = tirerUn(poolL);
        if (t) resultats.push(t);
      });
      if (vide) {
        montrerMsg("Les listes cochées sont vides. Ajoutez des inducteurs.");
        return;
      }
      if (!resultats.length) {
        montrerMsg("Impossible de tirer : listes vides.");
        return;
      }
    }

    afficherResultats(resultats);
  }

  function planifierSauvegarde() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(sauvegarder, 400);
  }

  function sauvegarder() {
    if (typeof DataManager === "undefined" || !DataManager.saveParametre) return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_ID,
      listes: state.listes,
    }).catch(function () {
      montrerMsg("Enregistrement impossible (stockage local indisponible).");
    });
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
          state.listes = rec.listes.map(function (l) {
            return {
              id: l.id || genererId("liste"),
              nom: normaliserTexte(l.nom) || "Liste",
              inducteurs: Array.isArray(l.inducteurs)
                ? l.inducteurs.map(normaliserTexte).filter(Boolean)
                : [],
            };
          });
        } else {
          state.listes = copierListesDefaut();
        }
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
    nomInput.setAttribute("aria-label", "Nom de la liste");
    nomInput.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    nomInput.addEventListener("input", function () {
      liste.nom = normaliserTexte(nomInput.value) || "Liste";
      planifierSauvegarde();
      majSelectUneListe();
      majCheckListes();
    });

    var count = document.createElement("span");
    count.className = "inducteur-liste__count";
    count.textContent = (liste.inducteurs || []).length + " inducteur(s)";

    var btnSupprListe = document.createElement("button");
    btnSupprListe.type = "button";
    btnSupprListe.className = "inducteur-liste__delete";
    btnSupprListe.textContent = "Supprimer la liste";
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
      majSelectUneListe();
      majCheckListes();
      majModeAffichage();
    });

    summary.appendChild(nomInput);
    summary.appendChild(count);
    summary.appendChild(btnSupprListe);
    details.appendChild(summary);

    var panel = document.createElement("div");
    panel.className = "inducteur-liste__panel";

    var hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Un inducteur par ligne. Validez pour enregistrer dans la liste.";
    panel.appendChild(hint);

    var textarea = document.createElement("textarea");
    textarea.rows = 6;
    textarea.className = "inducteur-liste__textarea";
    textarea.spellcheck = false;
    textarea.value = (liste.inducteurs || []).join("\n");
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
    textV.textContent = "Valider les inducteurs";
    btnValider.appendChild(iconV);
    btnValider.appendChild(textV);
    btnValider.addEventListener("click", function () {
      var lignes = textarea.value
        .split(/\r?\n/)
        .map(normaliserTexte)
        .filter(Boolean);
      liste.inducteurs = lignes;
      count.textContent = lignes.length + " inducteur(s)";
      textarea.value = lignes.join("\n");
      planifierSauvegarde();
      majSelectUneListe();
      majCheckListes();
      montrerMsg(lignes.length + " inducteur(s) enregistré(s) dans « " + liste.nom + " ».", true);
    });

    var ul = document.createElement("ul");
    ul.className = "inducteur-inducteurs";
    ul.setAttribute("role", "list");

    function renderTags() {
      ul.innerHTML = "";
      (liste.inducteurs || []).forEach(function (ind) {
        var li = document.createElement("li");
        li.className = "inducteur-inducteurs__item";
        var span = document.createElement("span");
        span.textContent = ind;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "inducteur-inducteurs__remove";
        btn.setAttribute("aria-label", "Retirer " + ind);
        btn.textContent = "×";
        btn.addEventListener("click", function () {
          liste.inducteurs = liste.inducteurs.filter(function (x) {
            return x !== ind;
          });
          count.textContent = liste.inducteurs.length + " inducteur(s)";
          textarea.value = liste.inducteurs.join("\n");
          renderTags();
          planifierSauvegarde();
          majSelectUneListe();
          majCheckListes();
        });
        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);
      });
      ul.hidden = !(liste.inducteurs && liste.inducteurs.length);
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
      editorEl.appendChild(OutilsDom.emptyState("Aucune liste. Créez-en une avec le bouton ci-dessous."));
      return;
    }
    state.listes.forEach(function (liste, i) {
      editorEl.appendChild(creerBlocListe(liste, i));
    });
  }

  function nouvelleListe() {
    var nom = prompt("Nom de la nouvelle liste :", "Nouvelle liste");
    if (nom === null) return;
    var n = normaliserTexte(nom) || "Nouvelle liste";
    state.listes.push({
      id: genererId("liste"),
      nom: n,
      inducteurs: [],
    });
    planifierSauvegarde();
    renderEditor();
    majSelectUneListe();
    majCheckListes();
    montrerMsg("Liste « " + n + " » créée.", true);
  }

  function resetListes() {
    if (
      !confirm(
        "Réinitialiser toutes les listes avec les inducteurs par défaut ? Vos listes actuelles seront remplacées."
      )
    ) {
      return;
    }
    state.listes = copierListesDefaut();
    planifierSauvegarde();
    renderEditor();
    majSelectUneListe();
    majCheckListes();
    if (resultatsEl) resultatsEl.hidden = true;
    if (hintEl) hintEl.hidden = false;
    montrerMsg("Listes réinitialisées.", true);
  }

  modeRadios.forEach(function (radio) {
    radio.addEventListener("change", majModeAffichage);
  });

  var btnTirer = document.getElementById("btn-tirer");
  if (btnTirer) btnTirer.addEventListener("click", tirer);

  var btnNouvelle = document.getElementById("btn-nouvelle-liste");
  if (btnNouvelle) btnNouvelle.addEventListener("click", nouvelleListe);

  var btnReset = document.getElementById("btn-reset-listes");
  if (btnReset) btnReset.addEventListener("click", resetListes);

  charger().then(function () {
    renderEditor();
    majModeAffichage();
  });
})();
