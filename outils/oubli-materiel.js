/**
 * Oubli de matériel — stockage IndexedDB (DataManager).
 */
(function () {
  "use strict";

  var form = document.getElementById("form-oubli");
  var editIdEl = document.getElementById("edit-id");
  var eleveIdEl = document.getElementById("eleve-id");
  var classeIdEl = document.getElementById("classe-id");
  var nomEl = document.getElementById("nom");
  var prenomEl = document.getElementById("prenom");
  var classeEl = document.getElementById("classe");
  var dateOubliEl = document.getElementById("date-oubli");
  var commentaireEl = document.getElementById("commentaire");
  var btnSubmit = document.getElementById("btn-submit");
  var btnResetForm = document.getElementById("btn-reset-form");
  var formMsg = document.getElementById("form-msg");
  var formOk = document.getElementById("form-ok");
  var formTitre = document.getElementById("form-titre");
  var listeEl = document.getElementById("liste-oublis");
  var filtreEl = document.getElementById("filtre-liste");
  var tabListe = document.getElementById("tab-liste");
  var tabForm = document.getElementById("tab-form");
  var panelListe = document.getElementById("oubli-panel-liste");
  var panelForm = document.getElementById("oubli-panel-form");
  var feedbackEl = document.getElementById("oubli-feedback");

  var vueState = "liste";
  var listeOublis = [];
  var editingId = null;

  function montrerErreur(msg) {
    formMsg.hidden = !msg;
    formMsg.textContent = msg || "";
    if (msg) formOk.hidden = true;
  }

  function montrerOk(msg) {
    formOk.hidden = !msg;
    formOk.textContent = msg || "";
    if (msg) {
      formMsg.hidden = true;
      setTimeout(function () {
        formOk.hidden = true;
      }, 3500);
    }
  }

  function montrerFeedbackGlobal(msg, isError) {
    if (!feedbackEl || !msg) return;
    feedbackEl.textContent = msg;
    feedbackEl.className =
      "dispense-feedback" +
      (isError ? " dispense-feedback--error" : " dispense-feedback--ok");
    feedbackEl.hidden = false;
    if (montrerFeedbackGlobal._timer) clearTimeout(montrerFeedbackGlobal._timer);
    montrerFeedbackGlobal._timer = setTimeout(function () {
      feedbackEl.hidden = true;
    }, 4000);
  }

  function afficherVue(mode) {
    vueState = mode;
    var isListe = mode === "liste";
    if (panelListe) {
      panelListe.hidden = !isListe;
      panelListe.setAttribute("aria-hidden", isListe ? "false" : "true");
    }
    if (panelForm) {
      panelForm.hidden = isListe;
      panelForm.setAttribute("aria-hidden", isListe ? "true" : "false");
    }
    if (tabListe) {
      tabListe.setAttribute("aria-selected", isListe ? "true" : "false");
      tabListe.classList.toggle("dispense-nav__btn--active", isListe);
      tabListe.tabIndex = isListe ? 0 : -1;
    }
    if (tabForm) {
      tabForm.setAttribute("aria-selected", isListe ? "false" : "true");
      tabForm.classList.toggle("dispense-nav__btn--active", !isListe);
      tabForm.tabIndex = isListe ? -1 : 0;
    }
  }

  function formatDateISO(d) {
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, "0");
    var da = String(d.getDate()).padStart(2, "0");
    return y + "-" + mo + "-" + da;
  }

  function aujourdhuiIso() {
    return formatDateISO(new Date());
  }

  function isoVersFr(iso) {
    if (!iso || typeof iso !== "string") return "";
    var p = iso.split("-");
    if (p.length !== 3) return "";
    var y = p[0];
    var mnum = parseInt(p[1], 10);
    var dnum = parseInt(p[2], 10);
    if (isNaN(mnum) || isNaN(dnum) || isNaN(parseInt(y, 10))) return "";
    return String(dnum).padStart(2, "0") + "/" + String(mnum).padStart(2, "0") + "/" + y;
  }

  function frVersIso(s) {
    s = (s || "")
      .trim()
      .replace(/\./g, "/")
      .replace(/\s/g, "");
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    var day = parseInt(m[1], 10);
    var month = parseInt(m[2], 10);
    var year = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    var d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null;
    }
    return formatDateISO(d);
  }

  function digitsVersChaineDateFr(digits) {
    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
  }

  function positionApresNChiffresDate(str, n) {
    if (n <= 0) return 0;
    var c = 0;
    var i;
    for (i = 0; i < str.length; i++) {
      if (/\d/.test(str[i])) {
        c++;
        if (c === n) return i + 1;
      }
    }
    return str.length;
  }

  function formaterSaisieDate() {
    var old = dateOubliEl.value;
    var start = dateOubliEl.selectionStart;
    if (start === null || typeof start !== "number" || isNaN(start)) start = old.length;
    var beforeSel = old.slice(0, start);
    var chiffresAvant = (beforeSel.match(/\d/g) || []).length;
    var digits = old.replace(/\D/g, "").slice(0, 8);
    var nouveau = digitsVersChaineDateFr(digits);
    dateOubliEl.value = nouveau;
    var pos = positionApresNChiffresDate(nouveau, chiffresAvant);
    if (dateOubliEl.setSelectionRange) {
      try {
        dateOubliEl.setSelectionRange(pos, pos);
      } catch (e) {
        /* ignore */
      }
    }
  }

  function normalise(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function cleEleve(o) {
    if (o.eleveId) return "id:" + o.eleveId;
    return normalise([o.classe, o.nom, o.prenom].join("|")).trim();
  }

  function numeroOublisParId(liste) {
    var sorted = liste.slice().sort(function (a, b) {
      if (a.dateOubli !== b.dateOubli) return a.dateOubli < b.dateOubli ? -1 : 1;
      return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
    });
    var counts = {};
    var nums = {};
    sorted.forEach(function (o) {
      var key = cleEleve(o);
      counts[key] = (counts[key] || 0) + 1;
      nums[o.id] = counts[key];
    });
    return nums;
  }

  function sauverListe(arr) {
    listeOublis = Array.isArray(arr) ? arr.slice() : [];
    if (typeof DataManager === "undefined") {
      return Promise.reject(new Error("Stockage indisponible."));
    }
    return DataManager.saveOublisMateriel(listeOublis);
  }

  function genererId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "om_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function resetForm() {
    editingId = null;
    editIdEl.value = "";
    eleveIdEl.value = "";
    classeIdEl.value = "";
    form.reset();
    dateOubliEl.value = isoVersFr(aujourdhuiIso());
    btnResetForm.hidden = true;
    btnSubmit.setAttribute("aria-label", "Enregistrer l'oubli de matériel");
    formTitre.textContent = "Nouvel oubli de matériel";
    montrerErreur("");
  }

  function filtrerOublis(liste, q) {
    var nq = normalise(q).trim();
    if (!nq) return liste.slice();
    return liste.filter(function (o) {
      var hay = normalise([o.nom, o.prenom, o.classe].join(" "));
      return hay.indexOf(nq) !== -1;
    });
  }

  function supprimer(id) {
    if (!confirm("Supprimer cet oubli de matériel ?")) return;
    var liste = listeOublis.filter(function (x) {
      return x.id !== id;
    });
    sauverListe(liste)
      .then(function () {
        if (editingId === id) resetForm();
        renderListe();
        montrerFeedbackGlobal("Oubli supprimé.", false);
      })
      .catch(function () {
        montrerErreur("Impossible de supprimer l’oubli.");
      });
  }

  function editer(o) {
    afficherVue("form");
    editingId = o.id;
    editIdEl.value = o.id;
    eleveIdEl.value = o.eleveId || "";
    classeIdEl.value = o.classeId || "";
    nomEl.value = o.nom || "";
    prenomEl.value = o.prenom || "";
    classeEl.value = o.classe || "";
    dateOubliEl.value = isoVersFr(o.dateOubli);
    commentaireEl.value = o.commentaire || "";
    btnResetForm.hidden = false;
    btnSubmit.setAttribute("aria-label", "Mettre à jour l'oubli de matériel");
    formTitre.textContent = "Modifier l’oubli de matériel";
    if (panelForm && panelForm.scrollIntoView) {
      panelForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    montrerErreur("");
  }

  function renderListe() {
    var q = filtreEl ? filtreEl.value : "";
    var brute = listeOublis.slice();
    var liste = filtrerOublis(brute, q);
    var numeros = numeroOublisParId(brute);

    liste.sort(function (a, b) {
      if (a.dateOubli !== b.dateOubli) return a.dateOubli < b.dateOubli ? 1 : -1;
      return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1;
    });

    listeEl.innerHTML = "";
    if (liste.length === 0) {
      var p = document.createElement("p");
      p.className = "empty-state";
      p.textContent =
        brute.length === 0
          ? "Aucun oubli de matériel enregistré pour le moment."
          : "Aucun oubli ne correspond au filtre.";
      listeEl.appendChild(p);
      return;
    }

    liste.forEach(function (o) {
      var article = document.createElement("article");
      article.className = "dispense-item dispense-item--active oubli-item";

      var head = document.createElement("div");
      head.className = "dispense-item__head";

      var left = document.createElement("div");
      left.className = "dispense-item__main";
      var h3 = document.createElement("h3");
      h3.className = "dispense-item__title";
      h3.textContent = (o.prenom || "") + " " + (o.nom || "");
      var meta = document.createElement("p");
      meta.style.margin = "0";
      meta.style.fontSize = "0.9rem";
      meta.style.color = "var(--text-muted)";
      meta.textContent = (o.classe || "Sans classe") + " · " + isoVersFr(o.dateOubli);
      left.appendChild(h3);
      left.appendChild(meta);

      var badge = document.createElement("div");
      badge.className = "dispense-item__days dispense-item__days--active";
      var num = document.createElement("span");
      num.className = "dispense-item__days-num";
      num.textContent = "n°" + (numeros[o.id] || 1);
      var lbl = document.createElement("span");
      lbl.className = "dispense-item__days-label";
      lbl.textContent = "oubli";
      badge.appendChild(lbl);
      badge.appendChild(num);
      badge.setAttribute("role", "group");
      badge.setAttribute("aria-label", "Oubli numéro " + (numeros[o.id] || 1));

      var actions = document.createElement("div");
      actions.className = "dispense-actions";
      var bEdit = document.createElement("button");
      bEdit.type = "button";
      bEdit.className = "btn btn--ghost btn--small btn--icon-only";
      bEdit.setAttribute("aria-label", "Modifier l'oubli de " + o.prenom + " " + o.nom);
      bEdit.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">✏️</span>';
      bEdit.addEventListener("click", function () {
        editer(o);
      });
      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--small btn--icon-only";
      bDel.setAttribute("aria-label", "Supprimer l'oubli de " + o.prenom + " " + o.nom);
      bDel.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">🗑️</span>';
      bDel.addEventListener("click", function () {
        supprimer(o.id);
      });
      actions.appendChild(bEdit);
      actions.appendChild(bDel);

      head.appendChild(left);
      head.appendChild(badge);
      head.appendChild(actions);
      article.appendChild(head);

      if (o.commentaire) {
        var c = document.createElement("p");
        c.className = "oubli-comment";
        c.textContent = o.commentaire;
        article.appendChild(c);
      }
      listeEl.appendChild(article);
    });
  }

  function importerEleveDepuisClasse() {
    if (typeof ClassImport === "undefined") {
      montrerErreur("Import de classe indisponible.");
      return;
    }
    ClassImport.open({
      title: "Importer un élève",
      hint: "Choisissez une classe puis cliquez sur un élève pour remplir le formulaire.",
      clickToImport: true,
      onConfirm: function (eleves, classe) {
        if (!eleves.length) return;
        if (eleves.length > 1) {
          montrerErreur("Cochez un seul élève pour remplir l’oubli de matériel.");
          return;
        }
        var e = eleves[0];
        nomEl.value = e.nom || "";
        prenomEl.value = e.prenom || "";
        classeEl.value = classe.nom || "";
        eleveIdEl.value = e.id || "";
        classeIdEl.value = classe.id || "";
        afficherVue("form");
        montrerErreur("");
        montrerOk("Élève importé depuis « " + classe.nom + " ».");
        if (dateOubliEl.focus) dateOubliEl.focus();
      },
    });
  }

  dateOubliEl.addEventListener("input", formaterSaisieDate);
  dateOubliEl.addEventListener("blur", function () {
    var iso = frVersIso(dateOubliEl.value.trim());
    if (iso) dateOubliEl.value = isoVersFr(iso);
  });
  btnResetForm.addEventListener("click", resetForm);

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    montrerErreur("");
    var nom = nomEl.value.trim();
    var prenom = prenomEl.value.trim();
    var classe = classeEl.value.trim();
    var dateOubli = frVersIso(dateOubliEl.value.trim());
    var commentaire = commentaireEl.value.trim();
    if (!nom || !prenom || !classe) {
      montrerErreur("Renseignez le nom, le prénom et la classe.");
      return;
    }
    if (!dateOubli) {
      montrerErreur("Date invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }

    var liste = listeOublis.slice();
    var id = editingId || genererId();
    var now = new Date().toISOString();
    var entree = {
      id: id,
      eleveId: eleveIdEl.value || "",
      classeId: classeIdEl.value || "",
      nom: nom,
      prenom: prenom,
      classe: classe,
      dateOubli: dateOubli,
      commentaire: commentaire,
      createdAt: editingId
        ? (liste.find(function (x) {
            return x.id === editingId;
          }) || {}).createdAt || now
        : now,
      updatedAt: now,
    };

    if (editingId) {
      var idx = liste.findIndex(function (x) {
        return x.id === editingId;
      });
      if (idx === -1) {
        montrerErreur("Oubli de matériel introuvable.");
        return;
      }
      liste[idx] = entree;
    } else {
      liste.push(entree);
    }

    sauverListe(liste)
      .then(function () {
        var etaitModification = !!editingId;
        resetForm();
        renderListe();
        afficherVue("liste");
        montrerFeedbackGlobal(
          etaitModification ? "Oubli de matériel modifié." : "Oubli de matériel enregistré.",
          false
        );
      })
      .catch(function () {
        montrerErreur("Stockage plein ou indisponible. Supprimez d’anciens oublis.");
      });
  });

  var btnImportEleve = document.getElementById("btn-import-eleve-classe");
  if (btnImportEleve) {
    btnImportEleve.addEventListener("click", function () {
      if (vueState !== "form") {
        afficherVue("form");
        if (!editingId) resetForm();
      }
      importerEleveDepuisClasse();
    });
  }

  if (filtreEl) filtreEl.addEventListener("input", renderListe);

  if (tabListe && tabForm && panelListe && panelForm) {
    tabListe.addEventListener("click", function () {
      afficherVue("liste");
    });
    tabForm.addEventListener("click", function () {
      if (vueState !== "form") {
        afficherVue("form");
        if (!editingId) resetForm();
      } else {
        afficherVue("form");
      }
    });
  }

  DataManager.ready
    .then(function () {
      return DataManager.getOublisMateriel();
    })
    .then(function (arr) {
      listeOublis = arr;
      resetForm();
      afficherVue("liste");
      renderListe();
    })
    .catch(function () {
      resetForm();
      afficherVue("liste");
      renderListe();
    });
})();
