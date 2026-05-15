/**
 * Dispenses EPS — stockage IndexedDB (DataManager).
 */

(function () {
  "use strict";

  var PARAM_MASQUER_ID = "dispenses-masquer-terminees";
  /** Taille max approximative d’une entrée photo (caractères base64) pour limiter les erreurs */
  var MAX_PHOTO_CHARS = 800000;

  var form = document.getElementById("form-dispense");
  var editIdEl = document.getElementById("edit-id");
  var nomEl = document.getElementById("nom");
  var prenomEl = document.getElementById("prenom");
  var classeEl = document.getElementById("classe");
  var dateDebutEl = document.getElementById("date-debut");
  var dureeJoursEl = document.getElementById("duree-jours");
  var dateFinEl = document.getElementById("date-fin");
  var motifEl = document.getElementById("motif");
  var photoEl = document.getElementById("photo");
  var btnSubmit = document.getElementById("btn-submit");
  var btnResetForm = document.getElementById("btn-reset-form");
  var formMsg = document.getElementById("form-msg");
  var formOk = document.getElementById("form-ok");
  var formTitre = document.getElementById("form-titre");
  var listeEl = document.getElementById("liste-dispenses");
  var filtreEl = document.getElementById("filtre-liste");
  var masquerTermineesEl = document.getElementById("masquer-terminees");
  var tabListe = document.getElementById("tab-liste");
  var tabForm = document.getElementById("tab-form");
  var panelListe = document.getElementById("dispense-panel-liste");
  var panelForm = document.getElementById("dispense-panel-form");
  var feedbackEl = document.getElementById("dispense-feedback");

  /** 'liste' | 'form' — synchronisé avec les panneaux */
  var vueState = "liste";

  /** Cache en mémoire synchronisé avec IndexedDB */
  var listeDispenses = [];

  /** @type {string|null} id en cours d’édition */
  var editingId = null;
  /** Photo base64 conservée si on édite sans changer le fichier */
  var photoDataUrlCourante = null;

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

  /** Message visible même quand le formulaire est masqué (après enregistrement / suppression). */
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

  /**
   * Affiche uniquement le panneau liste ou formulaire (boutons en tête de page).
   * @param {'liste'|'form'} mode
   */
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

  function parseDateLocal(yyyyMmDd) {
    if (!yyyyMmDd || typeof yyyyMmDd !== "string") return null;
    var p = yyyyMmDd.split("-");
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10) - 1;
    var d = parseInt(p[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function formatDateISO(d) {
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, "0");
    var da = String(d.getDate()).padStart(2, "0");
    return y + "-" + mo + "-" + da;
  }

  /** Affichage français jj/mm/aaaa à partir d’une date ISO (aaaa-mm-jj). */
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

  /** Saisie jj/mm/aaaa (ou j.m.aaaa) → ISO, ou null si invalide. */
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

  /** Date de fin : dernier jour inclus de la période de N jours */
  function calculerDateFin(dateDebutStr, dureeJours) {
    var d0 = parseDateLocal(dateDebutStr);
    if (!d0 || dureeJours < 1) return "";
    var fin = new Date(d0);
    fin.setDate(fin.getDate() + (dureeJours - 1));
    return formatDateISO(fin);
  }

  function aujourdhui() {
    var t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }

  function comparerJours(a, b) {
    return a.getTime() - b.getTime();
  }

  /** @returns {'upcoming'|'active'|'done'} */
  function statutDispense(dateDebutStr, dateFinStr) {
    var deb = parseDateLocal(dateDebutStr);
    var fin = parseDateLocal(dateFinStr);
    var now = aujourdhui();
    if (!deb || !fin) return "upcoming";
    if (comparerJours(now, deb) < 0) return "upcoming";
    if (comparerJours(now, fin) > 0) return "done";
    return "active";
  }

  /**
   * Nombre de jours calendaires restants jusqu’au dernier jour de la dispense (date de fin incluse).
   * 0 si la période est terminée. null si dates invalides.
   */
  function joursRestantsJusquaFin(dateFinStr) {
    var fin = parseDateLocal(dateFinStr);
    var now = aujourdhui();
    if (!fin) return null;
    if (comparerJours(now, fin) > 0) return 0;
    var d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var d1 = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
    var msPerDay = 86400000;
    return Math.round((d1 - d0) / msPerDay) + 1;
  }

  function chargerListe() {
    return listeDispenses.slice();
  }

  function sauverListe(arr) {
    listeDispenses = Array.isArray(arr) ? arr.slice() : [];
    if (typeof DataManager === "undefined") {
      return Promise.reject(new Error("Stockage indisponible."));
    }
    return DataManager.saveDispenses(listeDispenses);
  }

  function genererId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function majDateFinChamps() {
    var iso = frVersIso(dateDebutEl.value.trim());
    var dj = parseInt(dureeJoursEl.value, 10);
    if (iso && dj >= 1) {
      dateFinEl.value = isoVersFr(calculerDateFin(iso, dj));
    } else {
      dateFinEl.value = "";
    }
  }

  /** jj/mm/aaaa à partir des chiffres saisis (max 8), avec / insérés automatiquement. */
  function digitsVersChaineDateFr(digits) {
    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
  }

  /** Position du curseur après le n-ième chiffre (n = 0 → début). */
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

  function formaterSaisieDateDebut() {
    var el = dateDebutEl;
    var old = el.value;
    var start = el.selectionStart;
    if (start === null || typeof start !== "number" || isNaN(start)) start = old.length;
    var end = el.selectionEnd;
    if (end === null || typeof end !== "number" || isNaN(end)) end = start;
    var selLow = Math.min(start, end);
    var beforeSel = old.slice(0, selLow);
    var chiffresAvant = (beforeSel.match(/\d/g) || []).length;

    var digits = old.replace(/\D/g, "").slice(0, 8);
    var nouveau = digitsVersChaineDateFr(digits);
    el.value = nouveau;

    var pos = positionApresNChiffresDate(nouveau, chiffresAvant);
    if (el.setSelectionRange) {
      try {
        el.setSelectionRange(pos, pos);
      } catch (e) {
        /* ignore */
      }
    }
    majDateFinChamps();
  }

  dateDebutEl.addEventListener("input", formaterSaisieDateDebut);
  dateDebutEl.addEventListener("change", majDateFinChamps);
  dateDebutEl.addEventListener("blur", function () {
    var iso = frVersIso(dateDebutEl.value.trim());
    if (iso) {
      dateDebutEl.value = isoVersFr(iso);
    }
    majDateFinChamps();
  });
  dureeJoursEl.addEventListener("input", majDateFinChamps);
  dureeJoursEl.addEventListener("change", majDateFinChamps);

  function resetForm() {
    editingId = null;
    editIdEl.value = "";
    form.reset();
    photoDataUrlCourante = null;
    dateFinEl.value = "";
    btnResetForm.hidden = true;
    btnSubmit.setAttribute("aria-label", "Enregistrer la dispense");
    formTitre.textContent = "Nouvelle dispense";
    montrerErreur("");
  }

  btnResetForm.addEventListener("click", resetForm);

  function lireFichierPhoto(file, cb) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      cb(null, "Choisissez un fichier image.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var res = reader.result;
      if (typeof res === "string" && res.length > MAX_PHOTO_CHARS) {
        cb(
          null,
          "Image trop volumineuse pour le stockage local. Choisissez une photo plus petite."
        );
        return;
      }
      cb(res, null);
    };
    reader.onerror = function () {
      cb(null, "Impossible de lire le fichier.");
    };
    reader.readAsDataURL(file);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    montrerErreur("");
    var nom = nomEl.value.trim();
    var prenom = prenomEl.value.trim();
    var classe = classeEl.value.trim();
    var dateDebutIso = frVersIso(dateDebutEl.value.trim());
    var duree = parseInt(dureeJoursEl.value, 10);
    var motif = motifEl.value.trim();

    if (!nom || !prenom || !classe) {
      montrerErreur("Renseignez le nom, le prénom et la classe.");
      return;
    }
    if (!dateDebutIso) {
      montrerErreur("Date de début invalide. Utilisez le format jj/mm/aaaa.");
      return;
    }
    if (!duree || duree < 1) {
      montrerErreur("La durée doit être d’au moins 1 jour.");
      return;
    }

    var dateFin = calculerDateFin(dateDebutIso, duree);
    if (!dateFin) {
      montrerErreur("Dates invalides.");
      return;
    }

    function finaliser(photoBase64) {
      var liste = chargerListe();
      var id = editingId || genererId();
      var entree = {
        id: id,
        nom: nom,
        prenom: prenom,
        classe: classe,
        dateDebut: dateDebutIso,
        dureeJours: duree,
        dateFin: dateFin,
        motif: motif,
        photoBase64: photoBase64 || null,
      };

      if (editingId) {
        var idx = liste.findIndex(function (x) {
          return x.id === editingId;
        });
        if (idx === -1) {
          montrerErreur("Dispense introuvable.");
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
            etaitModification ? "Dispense modifiée." : "Dispense enregistrée.",
            false
          );
        })
        .catch(function () {
          montrerErreur(
            "Stockage plein ou indisponible. Supprimez d’anciennes photos ou dispenses."
          );
        });
      return;

    }

    var file = photoEl.files && photoEl.files[0];
    if (file) {
      lireFichierPhoto(file, function (dataUrl, err) {
        if (err) {
          montrerErreur(err);
          return;
        }
        photoDataUrlCourante = dataUrl;
        finaliser(dataUrl);
      });
    } else {
      finaliser(photoDataUrlCourante);
    }
  });

  function normalise(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function filtrerDispenses(liste, q) {
    var nq = normalise(q).trim();
    if (!nq) return liste.slice();
    return liste.filter(function (d) {
      var hay = normalise([d.nom, d.prenom, d.classe].join(" "));
      return hay.indexOf(nq) !== -1;
    });
  }

  function chargerMasquerTerminees() {
    if (typeof DataManager === "undefined") return Promise.resolve(false);
    return DataManager.getParametre(PARAM_MASQUER_ID).then(function (p) {
      return !!(p && p.value);
    });
  }

  function sauverMasquerTerminees(checked) {
    if (typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.saveParametre({ id: PARAM_MASQUER_ID, value: !!checked });
  }

  function supprimer(id) {
    if (!confirm("Supprimer cette dispense ?")) return;
    var liste = chargerListe().filter(function (x) {
      return x.id !== id;
    });
    sauverListe(liste)
      .then(function () {
        if (editingId === id) resetForm();
        renderListe();
        montrerFeedbackGlobal("Dispense supprimée.", false);
      })
      .catch(function () {
        montrerErreur("Impossible de supprimer la dispense.");
      });
  }

  function editer(d) {
    afficherVue("form");
    editingId = d.id;
    editIdEl.value = d.id;
    nomEl.value = d.nom;
    prenomEl.value = d.prenom;
    classeEl.value = d.classe;
    dateDebutEl.value = isoVersFr(d.dateDebut);
    dureeJoursEl.value = String(d.dureeJours);
    motifEl.value = d.motif || "";
    photoEl.value = "";
    photoDataUrlCourante = d.photoBase64 || null;
    majDateFinChamps();
    btnResetForm.hidden = false;
    btnSubmit.setAttribute("aria-label", "Mettre à jour la dispense");
    formTitre.textContent = "Modifier la dispense";
    var cible = panelForm || form;
    if (cible && cible.scrollIntoView) {
      cible.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    montrerErreur("");
  }

  function ouvrirModalImage(src) {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--primary btn--labeled close-full";
    btn.setAttribute("aria-label", "Fermer");
    btn.innerHTML =
      '<span class="btn__icon" aria-hidden="true">✕</span><span class="btn__text">Fermer</span>';
    var img = document.createElement("img");
    img.src = src;
    img.alt = "Dispense agrandie";
    overlay.appendChild(btn);
    overlay.appendChild(img);
    function fermer() {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") fermer();
    }
    btn.addEventListener("click", fermer);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) fermer();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    btn.focus();
  }

  function renderListe() {
    var q = filtreEl ? filtreEl.value : "";
    var brute = chargerListe();
    var apresTexte = filtrerDispenses(brute, q);
    var liste = apresTexte.slice();
    if (masquerTermineesEl && masquerTermineesEl.checked) {
      liste = liste.filter(function (d) {
        return statutDispense(d.dateDebut, d.dateFin) !== "done";
      });
    }
    liste.sort(function (a, b) {
      return a.dateDebut < b.dateDebut ? 1 : a.dateDebut > b.dateDebut ? -1 : 0;
    });

    listeEl.innerHTML = "";
    if (liste.length === 0) {
      var p = document.createElement("p");
      p.className = "empty-state";
      if (brute.length === 0) {
        p.textContent = "Aucune dispense enregistrée pour le moment.";
      } else if (apresTexte.length === 0) {
        p.textContent = "Aucune dispense ne correspond au filtre.";
      } else if (masquerTermineesEl && masquerTermineesEl.checked && apresTexte.length > 0) {
        p.textContent =
          "Toutes les dispenses correspondantes sont terminées. Décochez « Masquer les dispenses terminées » pour les afficher.";
      } else {
        p.textContent = "Aucune dispense à afficher.";
      }
      listeEl.appendChild(p);
      return;
    }

    liste.forEach(function (d) {
      var st = statutDispense(d.dateDebut, d.dateFin);
      var article = document.createElement("article");
      article.className = "dispense-item";
      if (st === "active") article.classList.add("dispense-item--active");
      else if (st === "done") article.classList.add("dispense-item--done");

      var head = document.createElement("div");
      head.className = "dispense-item__head";

      var left = document.createElement("div");
      left.className = "dispense-item__main";
      var h3 = document.createElement("h3");
      h3.className = "dispense-item__title";
      h3.textContent = d.prenom + " " + d.nom;
      var meta = document.createElement("p");
      meta.style.margin = "0";
      meta.style.fontSize = "0.9rem";
      meta.style.color = "var(--text-muted)";
      var badge =
        st === "active"
          ? "En cours"
          : st === "done"
            ? "Terminée"
            : "À venir";
      meta.textContent =
        d.classe +
        " · " +
        badge +
        " · du " +
        isoVersFr(d.dateDebut) +
        " au " +
        isoVersFr(d.dateFin) +
        " (" +
        d.dureeJours +
        " j.)";

      left.appendChild(h3);
      left.appendChild(meta);

      var jReste = joursRestantsJusquaFin(d.dateFin);
      var daysWrap = document.createElement("div");
      daysWrap.className = "dispense-item__days";
      if (st === "done") daysWrap.classList.add("dispense-item__days--done");
      else if (st === "active") daysWrap.classList.add("dispense-item__days--active");
      var daysNum = document.createElement("span");
      daysNum.className = "dispense-item__days-num";
      daysNum.textContent = jReste === null ? "—" : String(jReste);
      var daysLbl = document.createElement("span");
      daysLbl.className = "dispense-item__days-label";
      daysLbl.textContent = jReste === null ? "" : jReste === 1 ? "jour" : "jours";
      daysWrap.appendChild(daysNum);
      daysWrap.appendChild(daysLbl);
      daysNum.setAttribute("aria-hidden", "true");
      daysLbl.setAttribute("aria-hidden", "true");
      if (jReste !== null) {
        daysWrap.setAttribute(
          "role",
          "group"
        );
        daysWrap.setAttribute(
          "aria-label",
          jReste === 0
            ? "Dispense terminée, 0 jour restant"
            : jReste +
                (jReste === 1 ? " jour restant jusqu’à la fin" : " jours restants jusqu’à la fin")
        );
      }

      head.appendChild(left);
      head.appendChild(daysWrap);

      if (d.photoBase64) {
        var thumb = document.createElement("img");
        thumb.className = "dispense-thumb";
        thumb.src = d.photoBase64;
        thumb.alt = "Miniature dispense";
        thumb.addEventListener("click", function () {
          ouvrirModalImage(d.photoBase64);
        });
        head.appendChild(thumb);
      }

      article.appendChild(head);

      if (d.motif) {
        var m = document.createElement("p");
        m.style.margin = "0.5rem 0 0";
        m.textContent = d.motif;
        article.appendChild(m);
      }

      var actions = document.createElement("div");
      actions.className = "dispense-actions";

      var bEdit = document.createElement("button");
      bEdit.type = "button";
      bEdit.className = "btn btn--ghost btn--small btn--icon-only";
      bEdit.setAttribute("aria-label", "Modifier la dispense de " + d.prenom + " " + d.nom);
      bEdit.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">✏️</span>';

      bEdit.addEventListener("click", function () {
        editer(d);
      });

      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--small btn--icon-only";
      bDel.setAttribute("aria-label", "Supprimer la dispense de " + d.prenom + " " + d.nom);
      bDel.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">🗑️</span>';
      bDel.addEventListener("click", function () {
        supprimer(d.id);
      });

      actions.appendChild(bEdit);
      actions.appendChild(bDel);
      article.appendChild(actions);

      listeEl.appendChild(article);
    });
  }

  if (filtreEl) {
    filtreEl.addEventListener("input", renderListe);
  }

  if (masquerTermineesEl) {
    masquerTermineesEl.addEventListener("change", function () {
      sauverMasquerTerminees(masquerTermineesEl.checked).then(function () {
        renderListe();
      });
    });
  }

  if (tabListe && tabForm && panelListe && panelForm) {
    tabListe.addEventListener("click", function () {
      afficherVue("liste");
    });
    tabListe.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        tabForm.focus();
      }
    });
    tabForm.addEventListener("click", function () {
      if (vueState !== "form") {
        afficherVue("form");
        if (!editingId) resetForm();
      } else {
        afficherVue("form");
      }
    });
    tabForm.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        tabListe.focus();
      }
    });
  }

  DataManager.ready
    .then(function () {
      return DataManager.getDispenses();
    })
    .then(function (arr) {
      listeDispenses = arr;
      return chargerMasquerTerminees();
    })
    .then(function (masquer) {
      if (masquerTermineesEl) masquerTermineesEl.checked = masquer;
      afficherVue("liste");
      renderListe();
    })
    .catch(function () {
      afficherVue("liste");
      renderListe();
    });
})();
