/**
 * Selecteur de classe / eleves reutilisable (composition, championnat).
 */
var ClassImport = (function () {
  "use strict";

  var overlayEl = null;
  var onConfirmCb = null;
  var currentOpts = {};
  var D = "d" + "iv";

  function domClear(node) {
    if (!node) return;
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(node);
      return;
    }
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function creerOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement(D);
    overlayEl.className = "class-import-overlay";
    overlayEl.hidden = true;
    overlayEl.setAttribute("role", "dialog");
    overlayEl.setAttribute("aria-modal", "true");

    var dialog = document.createElement(D);
    dialog.className = "class-import-dialog card";

    var title = document.createElement("h2");
    title.className = "class-import-title";
    title.id = "class-import-title";
    title.textContent = "Importer une classe";

    var hint = document.createElement("p");
    hint.className = "hint class-import-hint";
    hint.textContent = "Choisissez une classe puis cochez les eleves a importer.";

    var fg = document.createElement(D);
    fg.className = "field-group";
    var lbl = document.createElement("label");
    lbl.className = "field-label";
    lbl.setAttribute("for", "class-import-select");
    lbl.textContent = "Classe";
    var sel = document.createElement("select");
    sel.id = "class-import-select";
    fg.appendChild(lbl);
    fg.appendChild(sel);

    var toolbar = document.createElement(D);
    toolbar.className = "class-import-toolbar";
    var btnAll = document.createElement("button");
    btnAll.type = "button";
    btnAll.className = "btn btn--ghost btn--small";
    btnAll.id = "class-import-all";
    btnAll.textContent = "Tout cocher";
    var btnNone = document.createElement("button");
    btnNone.type = "button";
    btnNone.className = "btn btn--ghost btn--small";
    btnNone.id = "class-import-none";
    btnNone.textContent = "Tout decocher";
    toolbar.appendChild(btnAll);
    toolbar.appendChild(btnNone);

    var list = document.createElement(D);
    list.id = "class-import-list";
    list.className = "class-import-list";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Eleves");

    var empty = document.createElement("p");
    empty.id = "class-import-empty";
    empty.className = "empty-state class-import-empty";
    empty.hidden = true;
    empty.textContent = "Aucune classe enregistree.";

    var actions = document.createElement(D);
    actions.className = "field-row class-import-actions";
    var btnOk = document.createElement("button");
    btnOk.type = "button";
    btnOk.className = "btn btn--primary btn--labeled";
    btnOk.id = "class-import-ok";
    var spanOk = document.createElement("span");
    spanOk.className = "btn__text";
    spanOk.textContent = "Importer la selection";
    btnOk.appendChild(spanOk);
    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "btn btn--ghost btn--labeled";
    btnCancel.id = "class-import-cancel";
    var spanCancel = document.createElement("span");
    spanCancel.className = "btn__text";
    spanCancel.textContent = "Annuler";
    btnCancel.appendChild(spanCancel);
    actions.appendChild(btnOk);
    actions.appendChild(btnCancel);

    dialog.appendChild(title);
    dialog.appendChild(hint);
    dialog.appendChild(fg);
    dialog.appendChild(toolbar);
    dialog.appendChild(list);
    dialog.appendChild(empty);
    dialog.appendChild(actions);
    overlayEl.appendChild(dialog);
    document.body.appendChild(overlayEl);

    btnCancel.addEventListener("click", fermer);
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) fermer();
    });
    btnAll.addEventListener("click", function () {
      cocherTous(true);
    });
    btnNone.addEventListener("click", function () {
      cocherTous(false);
    });
    sel.addEventListener("change", remplirListe);
    btnOk.addEventListener("click", valider);

    return overlayEl;
  }

  function cocherTous(etat) {
    var list = overlayEl.querySelector("#class-import-list");
    if (!list) return;
    var cbs = list.querySelectorAll('input[type="checkbox"]');
    var i;
    for (i = 0; i < cbs.length; i++) cbs[i].checked = etat;
  }

  function libelleNbEleves(n) {
    var nb = n || 0;
    return nb <= 1 ? nb + " élève" : nb + " élèves";
  }

  function remplirListe() {
    var sel = overlayEl.querySelector("#class-import-select");
    var list = overlayEl.querySelector("#class-import-list");
    var empty = overlayEl.querySelector("#class-import-empty");
    if (!sel || !list) return;

    domClear(list);
    var id = sel.value;
    if (!id) {
      list.hidden = true;
      return;
    }

    DataManager.getElevesFromClasse(id).then(function (eleves) {
      if (!eleves.length) {
        list.hidden = true;
        empty.hidden = false;
        empty.textContent = "Cette classe ne contient aucun élève.";
        return;
      }

      empty.hidden = true;
      list.hidden = false;
      eleves.forEach(function (e) {
        if (currentOpts.clickToImport) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "class-import-item class-import-item--button";
          btn.textContent = formatEleve(e);
          btn.addEventListener("click", function () {
            DataManager.getClasseById(id).then(function (classe) {
              if (onConfirmCb && classe) onConfirmCb([e], classe);
              fermer();
            });
          });
          list.appendChild(btn);
          return;
        }

        var label = document.createElement("label");
        label.className = "class-import-item";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = currentOpts.defaultChecked !== false;
        cb.value = e.id;
        var span = document.createElement("span");
        span.textContent = formatEleve(e);
        label.appendChild(cb);
        label.appendChild(span);
        list.appendChild(label);
      });
    });
  }

  function formatEleve(e) {
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe) {
      var nom = EleveDisplay.formatEleveListe(e);
    } else {
      var nom = [e.nom, e.prenom].filter(Boolean).join(" ").trim();
      if (!nom) nom = "Sans nom";
    }
    if (!nom) nom = "Sans nom";
    var extra =
      typeof EleveDisplay !== "undefined" && EleveDisplay.metaEleveParts
        ? EleveDisplay.metaEleveParts(e)
        : [];
    if (!extra.length) {
      if (e.sexe) extra.push(e.sexe);
      if (e.niveau) {
        var n = parseInt(String(e.niveau), 10);
        if (!isNaN(n) && n >= 1 && n <= 5) extra.push("niv. " + n);
      }
    }
    if (extra.length) nom += " (" + extra.join(", ") + ")";
    return nom;
  }

  function valider() {
    var sel = overlayEl.querySelector("#class-import-select");
    if (!sel || !sel.value) {
      alert("Choisissez une classe.");
      return;
    }
    DataManager.getClasseById(sel.value).then(function (classe) {
      if (!classe) return;

      var ids = [];
      overlayEl.querySelectorAll('#class-import-list input[type="checkbox"]:checked').forEach(function (cb) {
        ids.push(cb.value);
      });

      if (!ids.length) {
        alert("Cochez au moins un élève.");
        return;
      }

      var selection = classe.eleves.filter(function (e) {
        return ids.indexOf(e.id) !== -1;
      });

      if (onConfirmCb) onConfirmCb(selection, classe);
      fermer();
    });
  }

  function fermer() {
    if (overlayEl) overlayEl.hidden = true;
    onConfirmCb = null;
    document.body.classList.remove("class-import-open");
  }

  function open(opts) {
    opts = opts || {};
    if (typeof DataManager === "undefined") {
      alert("Gestion des donnees indisponible.");
      return;
    }

    creerOverlay();
    currentOpts = opts;
    onConfirmCb = opts.onConfirm;

    var titleEl = overlayEl.querySelector("#class-import-title");
    var hintEl = overlayEl.querySelector(".class-import-hint");
    if (titleEl && opts.title) titleEl.textContent = opts.title;
    if (hintEl && opts.hint) hintEl.textContent = opts.hint;

    var sel = overlayEl.querySelector("#class-import-select");
    var empty = overlayEl.querySelector("#class-import-empty");
    var list = overlayEl.querySelector("#class-import-list");
    var okBtn = overlayEl.querySelector("#class-import-ok");
    var toolbar = overlayEl.querySelector(".class-import-toolbar");
    var actions = overlayEl.querySelector(".class-import-actions");
    var clickToImport = !!opts.clickToImport;
    if (toolbar) toolbar.hidden = clickToImport;
    if (okBtn) okBtn.hidden = clickToImport;
    if (actions) actions.classList.toggle("class-import-actions--single", clickToImport);

    DataManager.ready
      .then(function () {
        return DataManager.getClasses();
      })
      .then(function (classes) {
        domClear(sel);
        if (!classes.length) {
          empty.hidden = false;
          empty.textContent =
            "Aucune classe enregistrée. Créez-en une dans Classes et groupes.";
          list.hidden = true;
          okBtn.disabled = true;
        } else {
          okBtn.disabled = false;
          classes.forEach(function (c) {
            var opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.nom + " (" + libelleNbEleves(c.eleves ? c.eleves.length : 0) + ")";
            sel.appendChild(opt);
          });
          remplirListe();
        }

        overlayEl.hidden = false;
        document.body.classList.add("class-import-open");
        sel.focus();
      })
      .catch(function (err) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[ClassImport] chargement classes", err);
        }
        alert("Impossible de charger les classes. Rechargez la page ou vérifiez que des classes existent dans « Classes et groupes ».");
      });
  }

  return { open: open, fermer: fermer, formatEleve: formatEleve };
})();
