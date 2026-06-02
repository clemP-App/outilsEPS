/**
 * Gestionnaire de séances partagé (composition, tournois, championnat, pyramide).
 * Requiert : SessionsCore, DataManager, OutilsDom (optionnel).
 * (Le code interne conserve le terme « session » ; l’interface affiche « séance ».)
 */
var SessionManager = (function () {
  "use strict";

  var PREMIERE_SEANCE_NOM = "Première séance";

  var cfg = null;
  var activeSession = null;
  var mountEl = null;
  var barEl = null;
  var dialogEl = null;
  var duplicateDialogEl = null;
  var duplicateSourceId = null;
  var duplicateSourceNom = null;
  var gatedEls = [];

  function toolId() {
    return cfg && cfg.toolId;
  }

  function montrerErreur(msg) {
    if (cfg && typeof cfg.onError === "function") cfg.onError(msg);
    if (barEl) {
      var err = barEl.querySelector(".session-bar__error");
      if (err) {
        err.hidden = !msg;
        err.textContent = msg || "";
      }
    }
  }

  function setGatedVisible(visible) {
    gatedEls.forEach(function (el) {
      el.hidden = !visible;
    });
  }

  function majBar() {
    if (!barEl) return;
    var resume = barEl.querySelector(".session-accordion__resume");
    var nom = barEl.querySelector(".session-bar__nom");
    var meta = barEl.querySelector(".session-bar__meta");
    if (resume) {
      resume.textContent = activeSession ? activeSession.nomSession : "";
      resume.hidden = !activeSession;
    }
    if (nom) {
      nom.textContent = activeSession ? activeSession.nomSession : "—";
    }
    if (meta && activeSession) {
      var parts = [];
      if (activeSession.classeNomSnapshot) parts.push(activeSession.classeNomSnapshot);
      if (activeSession.archived) parts.push("archivée");
      meta.textContent = parts.join(" · ");
      meta.hidden = !parts.length;
    } else if (meta) {
      meta.hidden = true;
    }
  }

  function ouvrirDialog() {
    if (!dialogEl || !dialogEl.showModal) return;
    rafraichirListeDialog().then(function () {
      dialogEl.showModal();
    });
  }

  function duplicationActivee() {
    return !!(cfg && cfg.enableDuplicate && typeof cfg.duplicateSession === "function");
  }

  function remplirSelectClassesDuplicate(sel) {
    if (!sel) return Promise.resolve();
    OutilsDom.clear(sel);
    var sansClasse = document.createElement("option");
    sansClasse.value = "";
    sansClasse.textContent =
      (cfg && cfg.duplicateClassEmptyLabel) || "Sans classe — importer les coureurs plus tard";
    sel.appendChild(sansClasse);
    if (typeof DataManager === "undefined" || !DataManager.getClasses) {
      sel.disabled = false;
      return Promise.resolve();
    }
    return DataManager.getClasses().then(function (classes) {
      sel.disabled = false;
      classes.forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.nom;
        sel.appendChild(o);
      });
    });
  }

  function nomDuplicateParDefaut(classeId) {
    var nomEl = duplicateDialogEl && duplicateDialogEl.querySelector("#session-duplicate-nom");
    if (!nomEl || nomEl.dataset.userEdited === "1") return;
    if (classeId) {
      var sel = duplicateDialogEl.querySelector("#session-duplicate-classe");
      var opt = sel && sel.options[sel.selectedIndex];
      nomEl.value = opt && opt.value ? opt.textContent : "";
      return;
    }
    nomEl.value = duplicateSourceNom ? duplicateSourceNom + " (copie)" : "";
  }

  function majNomDuplicateDepuisClasse() {
    if (!duplicateDialogEl) return;
    var sel = duplicateDialogEl.querySelector("#session-duplicate-classe");
    nomDuplicateParDefaut(sel && sel.value ? sel.value : "");
  }

  function ouvrirDuplicateDialog(sourceSessionId) {
    if (!duplicationActivee() || !duplicateDialogEl || !sourceSessionId) return;
    duplicateSourceId = sourceSessionId;
    duplicateSourceNom = null;
    var nomEl = duplicateDialogEl.querySelector("#session-duplicate-nom");
    var sel = duplicateDialogEl.querySelector("#session-duplicate-classe");
    if (nomEl) {
      nomEl.value = "";
      nomEl.dataset.userEdited = "0";
    }
    var prep = Promise.resolve();
    if (typeof DataManager !== "undefined" && DataManager.getSessionById) {
      prep = DataManager.getSessionById(sourceSessionId).then(function (s) {
        duplicateSourceNom = s && s.nomSession ? s.nomSession : null;
        nomDuplicateParDefaut("");
      });
    }
    prep.then(function () {
      return remplirSelectClassesDuplicate(sel);
    }).then(function () {
      if (sel) sel.selectedIndex = 0;
      if (duplicateDialogEl.showModal) duplicateDialogEl.showModal();
    });
  }

  function confirmerDuplicate(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!duplicationActivee() || !duplicateSourceId) return;
    var sel = duplicateDialogEl.querySelector("#session-duplicate-classe");
    var nomEl = duplicateDialogEl.querySelector("#session-duplicate-nom");
    var classeId = sel && sel.value ? sel.value : null;
    var nomSession = nomEl ? (nomEl.value || "").trim().replace(/\s+/g, " ") : "";
    montrerErreur("");
    cfg
      .duplicateSession(duplicateSourceId, { classeId: classeId, nomSession: nomSession })
      .then(function (newSession) {
        duplicateSourceId = null;
        duplicateSourceNom = null;
        if (duplicateDialogEl && duplicateDialogEl.open) duplicateDialogEl.close();
        return choisirSession(newSession.id);
      })
      .then(function () {
        return rafraichirListeDialog();
      })
      .catch(function (err) {
        montrerErreur(err && err.message ? err.message : "Duplication impossible.");
      });
  }

  function creerDuplicateDialog() {
    duplicateDialogEl = document.createElement("dialog");
    duplicateDialogEl.className = "session-dialog card session-duplicate-dialog";
    duplicateDialogEl.setAttribute("aria-labelledby", "session-duplicate-title");

    var form = document.createElement("form");
    form.method = "dialog";
    form.className = "session-dialog__form";
    form.addEventListener("submit", confirmerDuplicate);

    var h = document.createElement("h2");
    h.id = "session-duplicate-title";
    h.className = "session-dialog__title";
    h.textContent = (cfg && cfg.duplicateTitle) || "Dupliquer la séance";

    var hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      (cfg && cfg.duplicateHint) ||
      "Les parcours et les réglages sont recopiés, sans les chronos. Choisissez une classe pour remplir les coureurs automatiquement, ou laissez « Sans classe » et importez-les plus tard.";

    var fgClasse = document.createElement("div");
    fgClasse.className = "field-group";
    var lblClasse = document.createElement("label");
    lblClasse.className = "field-label";
    lblClasse.setAttribute("for", "session-duplicate-classe");
    lblClasse.textContent = "Classe (facultatif)";
    var selClasse = document.createElement("select");
    selClasse.id = "session-duplicate-classe";
    selClasse.addEventListener("change", majNomDuplicateDepuisClasse);
    fgClasse.appendChild(lblClasse);
    fgClasse.appendChild(selClasse);

    var fgNom = document.createElement("div");
    fgNom.className = "field-group";
    var lblNom = document.createElement("label");
    lblNom.className = "field-label";
    lblNom.setAttribute("for", "session-duplicate-nom");
    lblNom.textContent = "Nom de la nouvelle séance";
    var inpNom = document.createElement("input");
    inpNom.type = "text";
    inpNom.id = "session-duplicate-nom";
    inpNom.placeholder = (cfg && cfg.duplicateNamePlaceholder) || "Ex. 6e2 — CO séance 1";
    inpNom.addEventListener("input", function () {
      inpNom.dataset.userEdited = inpNom.value.trim() ? "1" : "0";
    });
    fgNom.appendChild(lblNom);
    fgNom.appendChild(inpNom);

    var row = document.createElement("div");
    row.className = "session-dialog__footer";
    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "btn btn--ghost";
    btnCancel.textContent = "Annuler";
    btnCancel.addEventListener("click", function () {
      duplicateSourceId = null;
      duplicateSourceNom = null;
      if (duplicateDialogEl.close) duplicateDialogEl.close();
    });
    var btnOk = document.createElement("button");
    btnOk.type = "submit";
    btnOk.className = "btn btn--primary";
    btnOk.textContent = "Dupliquer";
    row.appendChild(btnCancel);
    row.appendChild(btnOk);

    form.appendChild(h);
    form.appendChild(hint);
    if (!cfg || cfg.duplicateShowClass !== false) {
      form.appendChild(fgClasse);
    }
    form.appendChild(fgNom);
    form.appendChild(row);
    duplicateDialogEl.appendChild(form);
    document.body.appendChild(duplicateDialogEl);
    return duplicateDialogEl;
  }

  function rafraichirListeDialog() {
    var listEl = dialogEl && dialogEl.querySelector(".session-dialog__list");
    if (!listEl || typeof DataManager === "undefined") return Promise.resolve();
    OutilsDom.clear(listEl);
    return DataManager.listSessionsByTool(toolId(), { includeArchived: true }).then(function (
      sessions
    ) {
      if (!sessions.length) {
        listEl.appendChild(OutilsDom.emptyState("Aucune séance enregistrée."));
        return;
      }
      sessions.forEach(function (s) {
        var li = document.createElement("li");
        li.className = "session-dialog__item";
        if (activeSession && activeSession.id === s.id) {
          li.classList.add("session-dialog__item--active");
        }
        if (s.archived) li.classList.add("session-dialog__item--archived");

        var main = document.createElement("button");
        main.type = "button";
        main.className = "session-dialog__open";
        var titre = document.createElement("span");
        titre.className = "session-dialog__titre";
        titre.textContent = s.nomSession;
        main.appendChild(titre);
        var sous = document.createElement("span");
        sous.className = "session-dialog__sous";
        var d = s.lastOpenedAt || s.updatedAt || "";
        sous.textContent =
          (s.classeNomSnapshot ? s.classeNomSnapshot + " · " : "") +
          (d ? new Date(d).toLocaleString("fr-FR") : "");
        main.appendChild(sous);
        main.addEventListener("click", function () {
          choisirSession(s.id);
        });
        li.appendChild(main);

        var actions = document.createElement("div");
        actions.className = "session-dialog__actions";

        var btnRen = document.createElement("button");
        btnRen.type = "button";
        btnRen.className = "btn btn--ghost session-dialog__mini";
        btnRen.textContent = "Renommer";
        btnRen.addEventListener("click", function (e) {
          e.stopPropagation();
          renommerSession(s.id, s.nomSession);
        });

        if (duplicationActivee()) {
          var btnDup = document.createElement("button");
          btnDup.type = "button";
          btnDup.className = "btn btn--ghost session-dialog__mini";
          btnDup.textContent = "Dupliquer";
          btnDup.addEventListener("click", function (e) {
            e.stopPropagation();
            ouvrirDuplicateDialog(s.id);
          });
          actions.appendChild(btnDup);
        }

        var btnArch = document.createElement("button");
        btnArch.type = "button";
        btnArch.className = "btn btn--ghost session-dialog__mini";
        btnArch.textContent = s.archived ? "Désarchiver" : "Archiver";
        btnArch.addEventListener("click", function (e) {
          e.stopPropagation();
          DataManager.setSessionArchived(s.id, !s.archived)
            .then(rafraichirListeDialog)
            .catch(function (err) {
              montrerErreur(err && err.message ? err.message : "Erreur.");
            });
        });

        var btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "btn btn--ghost session-dialog__mini session-dialog__mini--danger";
        btnDel.textContent = "Supprimer";
        btnDel.addEventListener("click", function (e) {
          e.stopPropagation();
          if (
            !confirm(
              "Supprimer la séance « " +
                s.nomSession +
                " » et toutes ses données ? Cette action est irréversible."
            )
          ) {
            return;
          }
          DataManager.deleteSession(s.id)
            .then(function () {
              if (activeSession && activeSession.id === s.id) {
                activeSession = null;
                setGatedVisible(false);
                majBar();
                if (cfg && typeof cfg.onSessionCleared === "function") {
                  cfg.onSessionCleared();
                }
              }
              return rafraichirListeDialog();
            })
            .catch(function (err) {
              montrerErreur(err && err.message ? err.message : "Suppression impossible.");
            });
        });

        actions.appendChild(btnRen);
        actions.appendChild(btnArch);
        actions.appendChild(btnDel);
        li.appendChild(actions);
        listEl.appendChild(li);
      });
    });
  }

  function choisirSession(sessionId) {
    montrerErreur("");
    return DataManager.openSession(sessionId)
      .then(function (session) {
        activeSession = session;
        majBar();
        setGatedVisible(true);
        if (dialogEl && dialogEl.open) dialogEl.close();
        if (cfg && typeof cfg.onSessionReady === "function") {
          return cfg.onSessionReady(session);
        }
      })
      .catch(function (err) {
        montrerErreur(
          err && err.message ? err.message : "Impossible d’ouvrir cette séance."
        );
        setGatedVisible(false);
      });
  }

  function creerSeanceAvecNom(nom) {
    montrerErreur("");
    return DataManager.createSession({
      toolId: toolId(),
      nomSession: nom,
      classeId: null,
      classeNomSnapshot: null,
    }).then(function (session) {
      return choisirSession(session.id);
    });
  }

  /** Première ouverture : séance par défaut sans dialogue. */
  function creerPremiereSeance() {
    return creerSeanceAvecNom(PREMIERE_SEANCE_NOM);
  }

  /** Bouton « Nouvelle séance » : l’utilisateur choisit le nom. */
  function creerSession() {
    var nom = prompt("Nom de la nouvelle séance (ex. 6e1, Groupe A) :", "");
    if (nom === null) return;
    nom = (nom || "").trim();
    if (!nom) {
      montrerErreur("Le nom de la séance est obligatoire.");
      return;
    }
    creerSeanceAvecNom(nom)
      .then(function () {
        return rafraichirListeDialog();
      })
      .catch(function (err) {
        montrerErreur(err && err.message ? err.message : "Création impossible.");
      });
  }

  function renommerSession(sessionId, ancienNom) {
    var nom = prompt("Nouveau nom de la séance :", ancienNom || "");
    if (nom === null) return;
    nom = (nom || "").trim();
    if (!nom) return;
    DataManager.renameSession(sessionId, nom)
      .then(function (s) {
        if (activeSession && activeSession.id === sessionId) {
          activeSession = s;
          majBar();
        }
        return rafraichirListeDialog();
      })
      .catch(function (err) {
        montrerErreur(err && err.message ? err.message : "Renommage impossible.");
      });
  }

  function ouvrirSeanceParId(sessionId) {
    if (!sessionId) return Promise.reject(new Error("no-id"));
    return DataManager.getSessionById(sessionId).then(function (s) {
      if (!s || s.archived) return Promise.reject(new Error("invalid"));
      return choisirSession(s.id);
    });
  }

  function ouvrirDerniereSeanceOuCreer() {
    return DataManager.listSessionsByTool(toolId(), { includeArchived: false }).then(function (
      list
    ) {
      if (list.length) {
        return choisirSession(list[0].id);
      }
      return creerPremiereSeance();
    });
  }

  function demarrerOutil() {
    return DataManager.getActiveSessionId(toolId())
      .then(function (sid) {
        if (!sid) {
          return ouvrirDerniereSeanceOuCreer();
        }
        return ouvrirSeanceParId(sid).catch(function () {
          return DataManager.setActiveSessionId(toolId(), null).then(ouvrirDerniereSeanceOuCreer);
        });
      })
      .catch(function (err) {
        montrerErreur(err && err.message ? err.message : "Chargement impossible.");
        setGatedVisible(false);
      });
  }

  function creerAccordionSeance() {
    barEl = document.createElement("details");
    barEl.className = "card card--accordion session-accordion";
    barEl.setAttribute("aria-label", "Gestion des séances");

    var summary = document.createElement("summary");
    summary.className = "card--accordion__summary";
    var title = document.createElement("span");
    title.className = "card--accordion__title";
    title.textContent = "Séance";
    var resume = document.createElement("span");
    resume.className = "session-accordion__resume";
    resume.hidden = true;
    var chev = document.createElement("span");
    chev.className = "card--accordion__chev";
    chev.setAttribute("aria-hidden", "true");
    summary.appendChild(title);
    summary.appendChild(resume);
    summary.appendChild(chev);
    barEl.appendChild(summary);

    var panel = document.createElement("div");
    panel.className = "card--accordion__panel";

    var hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      "Chaque séance conserve ses données (6e1, 6e2, reprise la semaine suivante…).";
    panel.appendChild(hint);

    var row = document.createElement("div");
    row.className = "session-bar__row";

    var info = document.createElement("div");
    info.className = "session-bar__info";
    var label = document.createElement("span");
    label.className = "session-bar__label";
    label.textContent = "Séance active";
    var nom = document.createElement("strong");
    nom.className = "session-bar__nom";
    nom.textContent = "—";
    var meta = document.createElement("span");
    meta.className = "session-bar__meta";
    meta.hidden = true;
    info.appendChild(label);
    info.appendChild(nom);
    info.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "session-bar__actions";
    var btnChange = document.createElement("button");
    btnChange.type = "button";
    btnChange.className = "btn btn--ghost btn--labeled";
    btnChange.innerHTML =
      '<span class="btn__icon" aria-hidden="true">📂</span><span class="btn__text">Changer</span>';
    btnChange.addEventListener("click", ouvrirDialog);
    var btnNew = document.createElement("button");
    btnNew.type = "button";
    btnNew.className = "btn btn--primary btn--labeled";
    btnNew.innerHTML =
      '<span class="btn__icon" aria-hidden="true">＋</span><span class="btn__text">Nouvelle séance</span>';
    btnNew.addEventListener("click", creerSession);
    actions.appendChild(btnChange);
    actions.appendChild(btnNew);
    if (duplicationActivee()) {
      var btnDup = document.createElement("button");
      btnDup.type = "button";
      btnDup.className = "btn btn--ghost btn--labeled session-bar__duplicate";
      btnDup.innerHTML =
        '<span class="btn__icon" aria-hidden="true">📋</span><span class="btn__text">Dupliquer</span>';
      btnDup.addEventListener("click", function () {
        if (!activeSession) {
          montrerErreur("Ouvrez une séance à dupliquer.");
          return;
        }
        ouvrirDuplicateDialog(activeSession.id);
      });
      actions.appendChild(btnDup);
    }
    if (cfg && typeof cfg.createSessionActions === "function") {
      var extraActions = cfg.createSessionActions({
        getActiveSession: getActiveSession,
        showError: montrerErreur,
        openPicker: ouvrirDialog,
      });
      if (extraActions) {
        if (!Array.isArray(extraActions)) extraActions = [extraActions];
        extraActions.forEach(function (actionEl) {
          if (actionEl) actions.appendChild(actionEl);
        });
      }
    }

    row.appendChild(info);
    row.appendChild(actions);
    panel.appendChild(row);

    var err = document.createElement("p");
    err.className = "msg-error session-bar__error";
    err.hidden = true;
    panel.appendChild(err);

    barEl.appendChild(panel);
    return barEl;
  }

  function creerDialog() {
    dialogEl = document.createElement("dialog");
    dialogEl.className = "session-dialog card";
    dialogEl.setAttribute("aria-labelledby", "session-dialog-title");

    var form = document.createElement("form");
    form.method = "dialog";
    form.className = "session-dialog__form";

    var h = document.createElement("h2");
    h.id = "session-dialog-title";
    h.className = "session-dialog__title";
    h.textContent = "Séances — " + (cfg.toolLabel || toolId());

    var hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      "Ouvrez une séance existante ou créez-en une nouvelle pour chaque classe ou créneau.";

    var list = document.createElement("ul");
    list.className = "session-dialog__list";
    list.setAttribute("role", "list");

    var row = document.createElement("div");
    row.className = "session-dialog__footer";
    var btnCreate = document.createElement("button");
    btnCreate.type = "button";
    btnCreate.className = "btn btn--primary";
    btnCreate.textContent = "Créer une séance";
    btnCreate.addEventListener("click", function (e) {
      e.preventDefault();
      creerSession();
    });
    var btnClose = document.createElement("button");
    btnClose.type = "submit";
    btnClose.className = "btn btn--ghost";
    btnClose.textContent = "Fermer";
    row.appendChild(btnCreate);
    row.appendChild(btnClose);

    form.appendChild(h);
    form.appendChild(hint);
    form.appendChild(list);
    form.appendChild(row);
    dialogEl.appendChild(form);
    document.body.appendChild(dialogEl);
    return dialogEl;
  }

  function init(options) {
    cfg = options || {};
    if (!cfg.toolId) return Promise.resolve();
    mountEl =
      typeof cfg.mount === "string"
        ? document.querySelector(cfg.mount)
        : cfg.mount || document.getElementById("session-manager-mount");
    gatedEls = Array.prototype.slice.call(
      document.querySelectorAll(cfg.gateSelector || ".tool-session-gated")
    );

    if (mountEl) {
      OutilsDom.clear(mountEl);
      mountEl.appendChild(creerAccordionSeance());
    }
    creerDialog();
    if (duplicationActivee()) creerDuplicateDialog();
    setGatedVisible(false);
    montrerErreur("");

    if (typeof DataManager === "undefined") {
      montrerErreur("Stockage indisponible.");
      return Promise.resolve();
    }

    return DataManager.ready.then(demarrerOutil);
  }

  function getActiveSession() {
    return activeSession;
  }

  function getActiveSessionId() {
    return activeSession ? activeSession.id : null;
  }

  function requireSessionId() {
    if (!activeSession || !activeSession.id) {
      return Promise.reject(
        new Error("Aucune séance active. Choisissez ou créez une séance.")
      );
    }
    return Promise.resolve(activeSession.id);
  }

  return {
    init: init,
    getActiveSession: getActiveSession,
    getActiveSessionId: getActiveSessionId,
    requireSessionId: requireSessionId,
    openPicker: ouvrirDialog,
    createSession: creerSession,
  };
})();
