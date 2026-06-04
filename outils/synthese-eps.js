/**
 * Synthèse — interface fiches classe / élève.
 */
(function () {
  "use strict";

  var Core = typeof SyntheseEpsCore !== "undefined" ? SyntheseEpsCore : null;

  var msgEl = document.getElementById("synthese-msg");
  var okEl = document.getElementById("synthese-ok");
  var selectClasseEl = document.getElementById("synthese-classe");
  var selectEleveEl = document.getElementById("synthese-eleve");
  var searchEleveEl = document.getElementById("synthese-eleve-search");
  var datalistEl = document.getElementById("synthese-eleves-datalist");
  var dateFromEl = document.getElementById("synthese-date-from");
  var dateToEl = document.getElementById("synthese-date-to");
  var triAlertesEl = document.getElementById("synthese-tri-alertes");
  var panelClasseEl = document.getElementById("synthese-classe-content");
  var panelEleveEl = document.getElementById("synthese-eleve-content");
  var tabClasse = document.getElementById("tab-classe");
  var tabEleve = document.getElementById("tab-eleve");
  var panelClasseWrap = document.getElementById("panel-classe");
  var panelEleveWrap = document.getElementById("panel-eleve");
  var eleveFiltresEl = document.getElementById("synthese-eleve-filtres");

  var dataCache = null;
  var synClasse = null;
  var synEleve = null;
  var vueActive = "classe";
  var classesList = [];

  function montrerMsg(t) {
    if (okEl) okEl.hidden = true;
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
  }

  function montrerOk(t) {
    if (msgEl) msgEl.hidden = true;
    if (!okEl) return;
    okEl.hidden = !t;
    okEl.textContent = t || "";
    if (t) {
      setTimeout(function () {
        okEl.hidden = true;
      }, 3000);
    }
  }

  function getPeriod() {
    var from = dateFromEl && dateFromEl.value ? dateFromEl.value : "";
    var to = dateToEl && dateToEl.value ? dateToEl.value : "";
    if (!from && !to) return null;
    return { from: from || null, to: to || null };
  }

  function getBuildOptions() {
    return {
      period: getPeriod(),
      triAlertes: !!(triAlertesEl && triAlertesEl.checked),
    };
  }

  /**
   * Charge toutes les données nécessaires depuis IndexedDB (lecture seule).
   */
  function loadAllSyntheseData() {
    if (typeof DataManager === "undefined") {
      return Promise.reject(new Error("DataManager indisponible."));
    }
    return DataManager.ready.then(function () {
      return Promise.all([
        DataManager.getClasses(),
        DataManager.getDispenses(),
        DataManager.getOublisMateriel(),
        DataManager.getRadarPerfs(),
        DataManager.getAll("sessions"),
        DataManager.getAll("championnats"),
        DataManager.getAll("tournoisElimination"),
        DataManager.getAll("parametres"),
        DataManager.getImportedRecords(),
        DataManager.getTableauxSuivi(),
        DataManager.getAll("eleves"),
      ]).then(function (res) {
        var classes = res[0] || [];
        var flatEleves = res[10] || [];
        var payload = {
          classes: classes,
          eleves: flatEleves,
          dispenses: res[1] || [],
          oublisMateriel: res[2] || [],
          radarPerfs: res[3] || [],
          sessions: res[4] || [],
          championnats: res[5] || [],
          tournoisElimination: res[6] || [],
          parametres: res[7] || [],
          importsEleves: res[8] || [],
          tableauxSuivi: res[9] || [],
        };
        return Core ? Core.normalizeLoadedData(payload) : payload;
      });
    });
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function formatDateFr(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return iso;
    }
  }

  function formatDateNaissance(iso) {
    if (!iso) return "Non renseigné";
    if (typeof EleveDisplay !== "undefined" && EleveDisplay.formatDateNaissanceFR) {
      return EleveDisplay.formatDateNaissanceFR(iso) || iso;
    }
    return iso;
  }

  var IMPORTS_PREVIEW_LIMIT = 8;
  var TIMELINE_PREVIEW_LIMIT = 10;

  function isResumePlaceholder(text) {
    return (
      text === "Aucun indicateur fort particulier." ||
      text === "Rien de notable dans les alertes automatiques."
    );
  }

  function factListHtml(items, emptyText) {
    var filtered = (items || []).filter(function (item) {
      return item && !isResumePlaceholder(item);
    });
    if (!filtered.length) {
      return emptyText ? '<p class="synthese-empty">' + esc(emptyText) + "</p>" : "";
    }
    return (
      '<ul class="synthese-fact-list">' +
      filtered
        .map(function (item) {
          return "<li>" + item + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }
  function sectionHtml(titre, contenu, opts) {
    opts = opts || {};
    var icon = opts.icon
      ? '<span class="synthese-block__icon" aria-hidden="true">' + opts.icon + "</span>"
      : "";
    var openAttr = opts.open ? " open" : "";
    return (
      '<details class="synthese-block card card--accordion"' +
      openAttr +
      ">" +
      '<summary class="card--accordion__summary synthese-block__summary">' +
      icon +
      '<span class="card--accordion__title">' +
      esc(titre) +
      "</span>" +
      '<span class="card--accordion__chev" aria-hidden="true"></span>' +
      "</summary>" +
      '<div class="card--accordion__panel synthese-block__body">' +
      contenu +
      "</div></details>"
    );
  }

  function heroClasseHtml(nom, badge, statsAffichage, labels) {
    var badgeText =
      badge === "rouge"
        ? "Vigilance élevée"
        : badge === "orange"
          ? "Points de vigilance"
          : "Situation stable";
    return (
      '<div class="synthese-hero synthese-hero--classe card">' +
      '<div class="synthese-hero__head">' +
      '<div><p class="synthese-hero__eyebrow">Classe</p>' +
      '<h2 class="synthese-hero__title">' +
      esc(nom) +
      "</h2></div>" +
      '<span class="synthese-hero__badge synthese-hero__badge--' +
      esc(badge || "vert") +
      '">' +
      esc(badgeText) +
      "</span></div>" +
      statsListHtml(statsAffichage, labels) +
      "</div>"
    );
  }

  function getInitials(prenom, nom) {
    var p = (prenom && prenom !== "Non renseigné" ? prenom.charAt(0) : "") || "";
    var n = (nom && nom !== "Non renseigné" ? nom.charAt(0) : "") || "";
    return (p + n).toUpperCase() || "?";
  }

  function listeHtml(items, vide) {
    if (!items || !items.length) {
      return '<p class="synthese-empty">' + esc(vide || "Aucune donnée") + "</p>";
    }
    return "<ul class=\"synthese-list\">" + items.map(function (li) {
      return "<li>" + li + "</li>";
    }).join("") + "</ul>";
  }

  function formatMoyenne(n, bareme) {
    if (n == null || isNaN(n)) return "—";
    var s = n.toFixed(1);
    if (s.indexOf(".0") === s.length - 2) s = String(Math.round(n));
    s = s.replace(".", ",");
    if (bareme > 0) return s + "/" + bareme;
    return s;
  }

  function labelEvaluationAvecBareme(label, bareme) {
    if (!label) return "—";
    if (bareme > 0) return label + " /" + bareme;
    return label;
  }

  function moyenneClasseGlobale(moyennes) {
    var items = [];
    Object.keys(moyennes || {}).forEach(function (k) {
      var mc = moyennes[k];
      if (mc && mc.moyenne != null && mc.count) {
        items.push({ valeur: mc.moyenne, bareme: mc.bareme || null, count: mc.count });
      }
    });
    if (!items.length) return { moyenne: null, bareme: null };
    var avecBareme = items.filter(function (e) {
      return e.bareme > 0;
    });
    if (avecBareme.length === items.length) {
      var ref = avecBareme[0].bareme;
      var sameBareme = avecBareme.every(function (e) {
        return e.bareme === ref;
      });
      if (sameBareme) {
        var total = 0;
        var count = 0;
        items.forEach(function (e) {
          total += e.valeur * e.count;
          count += e.count;
        });
        return { moyenne: count ? total / count : null, bareme: ref };
      }
      var totalRatio = 0;
      var countRatio = 0;
      items.forEach(function (e) {
        totalRatio += (e.valeur / e.bareme) * e.count;
        countRatio += e.count;
      });
      var avgRatio = countRatio ? totalRatio / countRatio : null;
      return { moyenne: avgRatio != null ? avgRatio * ref : null, bareme: ref };
    }
    var total = 0;
    var count = 0;
    items.forEach(function (e) {
      total += e.valeur * e.count;
      count += e.count;
    });
    return { moyenne: count ? total / count : null, bareme: null };
  }

  function parseNoteNombre(c) {
    if (!c) return null;
    if (typeof c.valeur === "number" && !isNaN(c.valeur)) return c.valeur;
    var s = String(c.affichage || "")
      .trim()
      .replace(",", ".");
    if (!s || s === "—") return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  /** Compare note élève vs moyenne classe (seuil 0,05 pour « à la moyenne »). */
  function comparerVsMoyenne(noteEleve, moyenneClasse) {
    if (noteEleve == null || moyenneClasse == null || isNaN(noteEleve) || isNaN(moyenneClasse)) {
      return {
        code: "na",
        label: "—",
        aria: "Comparaison impossible",
      };
    }
    var delta = noteEleve - moyenneClasse;
    var eps = 0.05;
    if (Math.abs(delta) < eps) {
      return {
        code: "equal",
        label: "= moyenne",
        aria: "À la moyenne de la classe (" + formatMoyenne(moyenneClasse) + ")",
      };
    }
    if (delta > 0) {
      return {
        code: "above",
        label: "▲ +" + formatMoyenne(delta),
        aria:
          "Au-dessus de la moyenne classe (" +
          formatMoyenne(moyenneClasse) +
          ") de " +
          formatMoyenne(delta) +
          " point(s)",
      };
    }
    return {
      code: "below",
      label: "▼ " + formatMoyenne(delta),
      aria:
        "En dessous de la moyenne classe (" +
        formatMoyenne(moyenneClasse) +
        ") de " +
        formatMoyenne(Math.abs(delta)) +
        " point(s)",
    };
  }

  function celluleComparaisonHtml(cmp) {
    return (
      '<td class="synthese-grille__val synthese-cmp synthese-cmp--' +
      esc(cmp.code) +
      '" title="' +
      esc(cmp.aria) +
      '"><span class="synthese-cmp__badge" aria-label="' +
      esc(cmp.aria) +
      '">' +
      esc(cmp.label) +
      "</span></td>"
    );
  }

  function legendeComparaisonHtml() {
    return (
      '<p class="synthese-cmp-legend" aria-hidden="true">' +
      '<span class="synthese-cmp synthese-cmp--above"><span class="synthese-cmp__badge">▲</span> Au-dessus</span> · ' +
      '<span class="synthese-cmp synthese-cmp--equal"><span class="synthese-cmp__badge">=</span> À la moyenne</span> · ' +
      '<span class="synthese-cmp synthese-cmp--below"><span class="synthese-cmp__badge">▼</span> En dessous</span>' +
      "</p>"
    );
  }

  function notesEleveTableHtml(colonnesDetail, moyennesClasse, moyenneEleveGlobale, moyenneEleveBareme) {
    var notes = (colonnesDetail || []).filter(function (c) {
      return c.estNote;
    });
    if (!notes.length) {
      return '<p class="synthese-empty">Aucune note chiffrée pour cet élève sur cette feuille.</p>';
    }
    var moyennes = moyennesClasse || {};
    var html = legendeComparaisonHtml();
    html +=
      '<table class="synthese-grille" aria-label="Notes de l’élève comparées à la moyenne de classe"><thead><tr>' +
      '<th scope="col">Évaluation</th><th scope="col">Note élève</th><th scope="col">Moy. classe</th><th scope="col">Vs moyenne</th>' +
      "</tr></thead><tbody>";
    notes.forEach(function (c) {
      var note = parseNoteNombre(c);
      var mc = moyennes[c.label];
      var moyCl = mc && mc.moyenne != null ? mc.moyenne : null;
      var baremeCol = (c.bareme > 0 ? c.bareme : null) || (mc && mc.bareme > 0 ? mc.bareme : null);
      var cmp = comparerVsMoyenne(note, moyCl);
      var noteCls =
        cmp.code === "above"
          ? " synthese-grille__note--above"
          : cmp.code === "below"
            ? " synthese-grille__note--below"
            : "";
      html +=
        "<tr><td>" +
        esc(labelEvaluationAvecBareme(c.label, baremeCol)) +
        '</td><td class="synthese-grille__val' +
        noteCls +
        '">' +
        esc(c.affichage) +
        '</td><td class="synthese-grille__val synthese-grille__moy">' +
        esc(moyCl != null ? formatMoyenne(moyCl, baremeCol) : "—") +
        "</td>" +
        celluleComparaisonHtml(cmp) +
        "</tr>";
    });
    if (moyenneEleveGlobale != null) {
      var moyClGlob = moyenneClasseGlobale(moyennes);
      var cmpFoot = comparerVsMoyenne(moyenneEleveGlobale, moyClGlob.moyenne);
      var baremeFoot = moyenneEleveBareme > 0 ? moyenneEleveBareme : moyClGlob.bareme;
      html +=
        '<tr class="synthese-grille__foot"><th scope="row">Moyenne générale</th><td class="synthese-grille__val">' +
        esc(formatMoyenne(moyenneEleveGlobale, baremeFoot)) +
        '</td><td class="synthese-grille__val synthese-grille__moy">' +
        esc(moyClGlob.moyenne != null ? formatMoyenne(moyClGlob.moyenne, baremeFoot) : "—") +
        "</td>" +
        celluleComparaisonHtml(cmpFoot) +
        "</tr>";
    }
    html += "</tbody></table>";
    return html;
  }

  function feuillesAppelEleveHtml(feuilles, appel) {
    if (!feuilles || !feuilles.length) return "";
    var moyennes = (appel && appel.moyennesClasse) || {};
    var html = "";
    feuilles.forEach(function (f) {
      var ps = f.presenceStats || {};
      var titreFeuille = f.titre || "Appel / notes";
      html += '<div class="synthese-feuille-block">';
      html +=
        '<h4 class="synthese-appel-sub">Feuille « ' +
        esc(titreFeuille) +
        " »</h4>";
      if (ps.total > 0) {
        html +=
          '<p class="hint synthese-presence-resume">Présence : <strong>' +
          esc(Math.round((ps.ok / ps.total) * 100)) +
          " %</strong> (✓).</p>";
      }
      html += notesEleveTableHtml(
        f.colonnesDetail,
        moyennes,
        appel && appel.moyenneNotes,
        appel && appel.moyenneNotesBareme
      );
      html += "</div>";
    });
    return html;
  }

  function resumeAppelClasseHtml(resumes) {
    if (!resumes || !resumes.length) return "";
    var html = "";
    resumes.forEach(function (f) {
      html += '<div class="synthese-feuille-block">';
      html +=
        "<h4 class=\"synthese-appel-sub\">Feuille « " +
        esc(f.titre) +
        " »" +
        (f.updatedAt ? ' <span class="hint">— maj. ' + esc(formatDateFr(f.updatedAt)) + "</span>" : "") +
        "</h4>";
      html += feuilleAppelResumeHtml(f);
      if (f.colonnesNotes && f.colonnesNotes.length) {
        html +=
          '<table class="synthese-grille" aria-label="Moyennes par évaluation"><thead><tr>' +
          "<th>Évaluation</th><th>Moy. classe</th><th>Min–max</th></tr></thead><tbody>";
        f.colonnesNotes.forEach(function (col) {
          html +=
            "<tr><td>" +
            esc(labelEvaluationAvecBareme(col.label, col.bareme)) +
            '</td><td class="synthese-grille__val">' +
            esc(formatMoyenne(col.moyenneClasse, col.bareme)) +
            "</td><td>" +
            esc(col.min) +
            " – " +
            esc(col.max) +
            "</td></tr>";
        });
        html += "</tbody></table>";
      } else {
        html += '<p class="synthese-empty">Aucune colonne « note » sur cette feuille.</p>';
      }
      html += "</div>";
    });
    return html;
  }

  function identiteHtml(id) {
    var nomComplet = [id.prenom, id.nom].filter(function (x) {
      return x && x !== "Non renseigné";
    }).join(" ");
    var secondaires = [];
    if (id.classe && id.classe !== "Non renseigné") secondaires.push(id.classe);
    if (id.sexe && id.sexe !== "Non renseigné") secondaires.push(id.sexe);
    if (id.dateNaissance) {
      secondaires.push("Né(e) le " + formatDateNaissance(id.dateNaissance));
    }
    if (id.niveau) secondaires.push("Niveau " + id.niveau);
    if (id.equipe) secondaires.push("Équipe " + id.equipe);
    if (id.vma) {
      secondaires.push(
        typeof EleveDisplay !== "undefined" && EleveDisplay.formatVma
          ? EleveDisplay.formatVma(id.vma)
          : "VMA " + id.vma
      );
    }
    var html =
      '<div class="synthese-profile">' +
      '<div class="synthese-profile__avatar" aria-hidden="true">' +
      esc(getInitials(id.prenom, id.nom)) +
      "</div>" +
      '<div class="synthese-profile__body">' +
      '<p class="synthese-profile__nom">' +
      esc(nomComplet || id.nom || "Élève") +
      "</p>";
    if (secondaires.length) {
      html += '<p class="synthese-profile__meta">' + esc(secondaires.join(" · ")) + "</p>";
    }
    if (id.commentaire) {
      html +=
        '<p class="synthese-profile__comment"><span class="synthese-profile__comment-label">Commentaire</span>' +
        esc(id.commentaire) +
        "</p>";
    }
    html += "</div></div>";
    return html;
  }

  function activitesEleveHtml(activites) {
    if (!activites || !activites.length) {
      return '<p class="synthese-empty">Aucune participation détectée aux outils séance (championnat, tournoi, défi ATP, etc.). Vérifiez que la séance est liée à la classe et que le nom correspond à celui de « Classes ».</p>';
    }
    var html = '<ul class="synthese-activites-list">';
    activites.forEach(function (a) {
      var headline = a.headline || a.resume || "Participation";
      html +=
        '<li class="synthese-activites-item">' +
        '<div class="synthese-activites-item__head">' +
        '<span class="synthese-activites-item__tool">' +
        esc(a.toolLabel) +
        "</span>" +
        (a.sessionNom || a.titre
          ? '<span class="synthese-activites-item__session">' + esc(a.sessionNom || a.titre) + "</span>"
          : "") +
        (a.date ? '<span class="synthese-activites-item__date">' + esc(formatDateFr(a.date)) + "</span>" : "") +
        "</div>" +
        '<p class="synthese-activites-item__resume">' +
        esc(headline) +
        "</p>";
      if (a.details && a.details.length) {
        html += '<ul class="synthese-list synthese-list--compact">';
        a.details.forEach(function (d) {
          html += "<li>" + esc(d) + "</li>";
        });
        html += "</ul>";
      }
      html += "</li>";
    });
    html += "</ul>";
    return html;
  }

  function importFactsHtml(facts, emptyMsg, opts) {
    opts = opts || {};
    if (!facts || !facts.length) {
      return emptyMsg ? '<p class="synthese-empty">' + esc(emptyMsg) + "</p>" : "";
    }
    var limit = opts.limit != null ? opts.limit : IMPORTS_PREVIEW_LIMIT;
    var visible = facts.slice(0, limit);
    var hidden = facts.slice(limit);

    function renderFact(f) {
      var lbl = f.toolLabel || (Core && Core.TOOL_LABELS_IMPORT && Core.TOOL_LABELS_IMPORT[f.toolId]) || f.toolId;
      return (
        '<li class="synthese-fact-list__item synthese-fact-list__item--import">' +
        '<span class="synthese-fact-list__meta">' +
        esc(lbl) +
        (f.date ? ' · <time>' + esc(formatDateFr(f.date)) + "</time>" : "") +
        "</span>" +
        '<span class="synthese-fact-list__val">' +
        esc(f.headline || "—") +
        "</span></li>"
      );
    }

    var html = '<ul class="synthese-fact-list synthese-fact-list--imports">';
    visible.forEach(function (f) {
      html += renderFact(f);
    });
    html += "</ul>";
    if (hidden.length) {
      html +=
        '<details class="synthese-more">' +
        '<summary>Voir ' +
        hidden.length +
        " import(s) supplémentaire(s)</summary>" +
        '<ul class="synthese-fact-list synthese-fact-list--imports">';
      hidden.forEach(function (f) {
        html += renderFact(f);
      });
      html += "</ul></details>";
    }
    return html;
  }

  function activitesClasseHtml(activitesClasse) {
    var groups = (activitesClasse && activitesClasse.parOutil) || [];
    if (!groups.length) {
      return '<p class="synthese-empty">Aucune séance d’outil liée à cette classe.</p>';
    }
    var html = "";
    groups.forEach(function (g) {
      html += '<div class="synthese-feuille-block">';
      html += "<h4 class=\"synthese-appel-sub\">" + esc(g.label) + " (" + g.nbSessions + " séance(s))</h4>";
      html += '<ul class="synthese-list">';
      (g.sessions || []).forEach(function (s) {
        html +=
          "<li><strong>" +
          esc(s.nom || "Séance") +
          "</strong>" +
          (s.date ? " — " + esc(formatDateFr(s.date)) : "") +
          "<br><span class=\"synthese-timeline__detail\">" +
          esc(s.resume) +
          "</span></li>";
      });
      html += "</ul></div>";
    });
    return html;
  }

  function timelineTypeLabel(type) {
    if (type === "oubli") return "Oubli";
    if (type === "radar") return "Radar";
    if (type === "dispense") return "Dispense";
    if (type === "import") return "Import QR";
    if (type === "activite") return "Activité";
    if (type === "session") return "Séance";
    if (type === "observation") return "Débrief";
    return "";
  }

  function timelineHtml(events, opts) {
    opts = opts || {};
    if (!events || !events.length) {
      return '<p class="synthese-empty">Aucun événement daté pour la période choisie.</p>';
    }
    var limit = opts.limit != null ? opts.limit : TIMELINE_PREVIEW_LIMIT;
    var visible = events.slice(0, limit);
    var hidden = events.slice(limit);

    function renderEvent(ev) {
      var typeLabel = timelineTypeLabel(ev.type);
      var typeClass = ev.type ? " synthese-feed__item--" + esc(ev.type) : "";
      return (
        '<li class="synthese-feed__item' +
        typeClass +
        '">' +
        '<span class="synthese-feed__dot" aria-hidden="true"></span>' +
        '<div class="synthese-feed__card">' +
        '<div class="synthese-feed__meta">' +
        "<time>" +
        esc(formatDateFr(ev.date)) +
        "</time>" +
        (typeLabel ? '<span class="synthese-feed__tag">' + esc(typeLabel) + "</span>" : "") +
        "</div>" +
        '<p class="synthese-feed__text">' +
        esc(ev.label) +
        (ev.detail ? ' <span class="synthese-feed__detail">— ' + esc(ev.detail) + "</span>" : "") +
        "</p></div></li>"
      );
    }

    var html =
      '<p class="hint synthese-timeline-intro">Faits enregistrés dans les outils (du plus récent au plus ancien). Les feuilles d’appel sont détaillées dans la section Appel et notes.</p>' +
      '<ul class="synthese-feed">';
    visible.forEach(function (ev) {
      html += renderEvent(ev);
    });
    html += "</ul>";
    if (hidden.length) {
      html +=
        '<details class="synthese-more">' +
        "<summary>Voir " +
        hidden.length +
        " événement(s) supplémentaire(s)</summary>" +
        '<ul class="synthese-feed">';
      hidden.forEach(function (ev) {
        html += renderEvent(ev);
      });
      html += "</ul></details>";
    }
    return html;
  }

  function appelNotesHtml(appel, feuillesAppel) {
    if (!appel || !appel.nbTableaux) {
      return '<p class="synthese-empty">Aucune feuille d’appel liée à cet élève. Dans « Appel et notes », importez la classe ou ajoutez l’élève avec le même nom/prénom que dans « Classes ».</p>';
    }
    var html = appelEleveIntroHtml(appel);
    if (appel.icones.length) {
      html +=
        "<p class=\"hint\">Repères sur la feuille : " +
        appel.icones
          .map(function (ic) {
            return ic.label;
          })
          .join(", ") +
        "</p>";
    }
    var feuilles = feuillesAppel || appel.feuillesDetail || [];
    html += feuillesAppelEleveHtml(feuilles, appel);
    return html;
  }

  function resumeEleveHtml(resume, asns) {
    if (!resume) return "";
    var html = '<div class="synthese-resume-grid">';
    html +=
      '<div class="synthese-resume-block synthese-resume-block--fort">' +
      '<h4 class="synthese-resume-block__title">Points forts</h4>' +
      factListHtml(
        resume.pointsForts.map(function (p) {
          return esc(p);
        }),
        "Aucun indicateur fort pour l’instant."
      ) +
      "</div>";
    html +=
      '<div class="synthese-resume-block synthese-resume-block--vigilance">' +
      '<h4 class="synthese-resume-block__title">Points de vigilance</h4>' +
      factListHtml(
        resume.pointsVigilance.map(function (p) {
          return esc(p);
        }),
        "Rien de notable dans les alertes automatiques."
      ) +
      "</div>";
    if (asns) {
      var asnsMod = asns.statut === "non_valide" ? "vigilance" : "fort";
      html +=
        '<div class="synthese-resume-block synthese-resume-block--' +
        asnsMod +
        '">' +
        '<h4 class="synthese-resume-block__title">ASNS</h4>' +
        factListHtml(
          [esc(asns.headline + (asns.commentaires ? " — " + asns.commentaires : ""))],
          null
        ) +
        "</div>";
    }
    html += '<div class="synthese-resume-meta">';
    html +=
      '<p class="synthese-resume-meta__row"><span>Dernière donnée</span><strong>' +
      esc(formatDateFr(resume.derniereDonnee)) +
      "</strong></p>";
    if (resume.progressionRadar) {
      html +=
        '<p class="synthese-resume-meta__row"><span>Radar vitesse</span><strong>' +
        esc(resume.progressionRadar.tendance) +
        " (" +
        resume.progressionRadar.premier.kmh.toFixed(1) +
        " → " +
        resume.progressionRadar.dernier.kmh.toFixed(1) +
        " km/h)</strong></p>";
    }
    html += "</div></div>";
    return html;
  }

  function alertesHtml(alertes) {
    if (!alertes || !alertes.length) {
      return '<p class="synthese-empty">Aucune alerte automatique.</p>';
    }
    return (
      '<div class="synthese-alerts-grid">' +
      alertes
        .map(function (a) {
          var niveau = a.niveau || "orange";
          return (
            '<div class="synthese-alert-card synthese-alert-card--' +
            esc(niveau) +
            '">' +
            '<span class="synthese-alert-card__icon" aria-hidden="true">' +
            (niveau === "rouge" ? "⚠" : "●") +
            "</span>" +
            "<span>" +
            esc(a.label) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function statsListHtml(stats, labels) {
    var keys = Object.keys(labels);
    var rows = keys
      .map(function (k) {
        var v = stats[k];
        if (v === undefined || v === null) v = 0;
        return (
          '<div class="synthese-stat-row">' +
          '<span class="synthese-stat-row__lbl">' +
          esc(labels[k]) +
          "</span>" +
          '<span class="synthese-stat-row__val">' +
          esc(String(v)) +
          "</span></div>"
        );
      })
      .join("");
    return '<div class="synthese-stat-list">' + rows + "</div>";
  }

  function statsGrid(stats, labels, tones) {
    return statsListHtml(stats, labels);
  }

  function appelClasseIntroHtml(ac) {
    if (!ac || !ac.nbTableaux) return "";
    var stats = {
      nbFeuilles: ac.nbTableaux,
      nbColonnesAppel: ac.nbFeuilles,
      nbColonnesNotes: ac.nbColonnesNotes || 0,
      pctPresent: ac.pctPresent != null ? ac.pctPresent + " %" : "—",
      nbEleves: ac.nbElevesSurFeuilles,
    };
    var labels = {
      nbFeuilles: "Feuilles liées",
      nbColonnesAppel: "Colonnes appel",
      nbColonnesNotes: "Colonnes note",
      pctPresent: "Présence (✓)",
      nbEleves: "Élèves sur l’appel",
    };
    return '<div class="synthese-appel-intro">' + statsListHtml(stats, labels) + "</div>";
  }

  function appelEleveIntroHtml(appel) {
    var stats = {
      nbFeuilles: appel.nbTableaux,
      nbColonnesAppel: appel.nbFeuilles,
      nbColonnesNotes: appel.nbColonnesNotes || 0,
      pctPresent: appel.pctPresent != null ? appel.pctPresent + " %" : "—",
      moyenneNotes:
        appel.moyenneNotes != null
          ? formatMoyenne(appel.moyenneNotes, appel.moyenneNotesBareme)
          : "—",
    };
    var labels = {
      nbFeuilles: "Feuilles liées",
      nbColonnesAppel: "Colonnes appel",
      nbColonnesNotes: "Colonnes note",
      pctPresent: "Présence (✓)",
      moyenneNotes: "Moyenne élève",
    };
    return '<div class="synthese-appel-intro">' + statsListHtml(stats, labels) + "</div>";
  }

  function feuilleAppelResumeHtml(f) {
    var stats = {
      nbColonnesAppel: f.nbColonnesAppel || 0,
      nbColonnesNotes: f.nbColonnesNotes || 0,
      pctPresent: f.pctPresent != null ? f.pctPresent + " %" : "—",
      nbEleves: f.nbEleves,
    };
    var labels = {
      nbColonnesAppel: "Colonnes appel",
      nbColonnesNotes: "Colonnes note",
      pctPresent: "Présence (✓)",
      nbEleves: "Élèves sur la feuille",
    };
    return (
      '<div class="synthese-appel-intro synthese-appel-intro--feuille">' +
      statsListHtml(stats, labels) +
      "</div>"
    );
  }


  function renderClasse() {
    if (!panelClasseEl) return;
    var classeId = selectClasseEl && selectClasseEl.value;
    if (!classeId || !dataCache || !Core) {
      panelClasseEl.innerHTML =
        '<p class="synthese-empty-state">Choisissez une classe pour afficher la synthèse.</p>';
      synClasse = null;
      return;
    }

    synClasse = Core.buildClasseSynthese(classeId, dataCache, getBuildOptions());
    if (!synClasse.ok) {
      panelClasseEl.innerHTML = '<p class="synthese-empty-state">' + esc(synClasse.error) + "</p>";
      return;
    }

    var s = synClasse.stats;
    var kpiLabels = {
      nbEleves: "Élèves",
      nbOublis: "Oublis matériel",
      nbDispenses: "Dispenses",
      nbImports: "Imports QR",
      nbSessions: "Séances outils",
    };
    var statsAffichageClasse = {
      nbEleves: s.nbEleves,
      nbOublis: s.nbOublis,
      nbDispenses: s.nbDispenses,
      nbImports: s.nbImports,
      nbSessions: s.nbSessions,
    };
    var html = heroClasseHtml(synClasse.classeNom, synClasse.badge, statsAffichageClasse, kpiLabels);

    if (synClasse.appelNotes && synClasse.appelNotes.nbTableaux) {
      var ac = synClasse.appelNotes;
      var resumes = synClasse.resumeAppelFeuilles || [];
      html += sectionHtml(
        "Appel et notes",
        appelClasseIntroHtml(ac) + resumeAppelClasseHtml(resumes),
        { icon: "📝", open: true }
      );
    } else {
      html += sectionHtml(
        "Appel et notes",
        '<p class="synthese-empty">Aucune feuille liée. Créez une feuille dans « Appel et notes » et importez cette classe.</p>',
        { icon: "📝", open: true }
      );
    }

    if (synClasse.topOublis.length) {
      html += sectionHtml(
        "Top oublis de matériel",
        listeHtml(
          synClasse.topOublis.map(function (t) {
            return "<strong>" + esc(t.label) + "</strong> — " + esc(t.count) + " oubli(s)";
          })
        ),
        { icon: "🎒" }
      );
    }

    html += sectionHtml(
      "Activités et compétitions",
      '<p class="hint">Championnat, tournoi, pyramide, défi ATP, composition, course d’orientation — synthèse par séance.</p>' +
        activitesClasseHtml(synClasse.activitesClasse),
      { icon: "🏆" }
    );

    if (synClasse.importFactsEquipe && synClasse.importFactsEquipe.length) {
      html += sectionHtml(
        "Imports QR — équipes (sport co)",
        '<p class="hint">Matchs ou scores d’équipe (table de marque, PTB…) — non rattachés à un élève en particulier.</p>' +
          importFactsHtml(synClasse.importFactsEquipe, null, { limit: IMPORTS_PREVIEW_LIMIT }),
        { icon: "👥" }
      );
    }

    var elevesAlerte = (synClasse.synthesesEleves || []).filter(function (se) {
      return se.scoreAlerte > 0;
    });
    if (elevesAlerte.length) {
      html += sectionHtml(
        "Élèves à surveiller",
        '<p class="hint">Uniquement les élèves avec au moins une alerte automatique.</p><ul class="synthese-eleves-alerts">' +
          elevesAlerte
            .slice(0, 12)
            .map(function (se) {
              var badge = se.scoreAlerte >= 5 ? "rouge" : "orange";
              var alerts = (se.alertes || [])
                .map(function (a) {
                  return a.label;
                })
                .join(", ");
              return (
                "<li><span class=\"synthese-puce synthese-puce--" +
                badge +
                "\" aria-hidden=\"true\"></span> " +
                "<strong>" +
                esc(se.label) +
                "</strong>" +
                (alerts ? ' — <span class="synthese-feed__detail">' + esc(alerts) + "</span>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>",
        { icon: "👁" }
      );
    }

    if (synClasse.evenementsRecents.length) {
      html += sectionHtml("Historique récent", timelineHtml(synClasse.evenementsRecents), { icon: "🕐" });
    }

    var hasData =
      s.nbDispenses ||
      s.nbOublis ||
      s.nbFeuillesAppel ||
      s.nbColonnesNotes ||
      s.nbImports ||
      s.nbSessions;
    if (!hasData && !s.nbEleves) {
      html = '<p class="synthese-empty-state">Aucune donnée enregistrée pour cette classe. Utilisez les autres outils ou importez depuis une classe.</p>';
    } else if (!hasData) {
      html =
        '<p class="hint synthese-hint-top">Classe enregistrée mais aucune activité liée pour l’instant.</p>' + html;
    }

    panelClasseEl.innerHTML = html;
  }

  function renderEleve() {
    if (!panelEleveEl) return;
    var eleveId = selectEleveEl && selectEleveEl.value;
    var classeId = selectClasseEl && selectClasseEl.value;
    if (!eleveId || !dataCache || !Core) {
      panelEleveEl.innerHTML =
        '<p class="synthese-empty-state">Choisissez un élève pour afficher la synthèse.</p>';
      synEleve = null;
      return;
    }

    synEleve = Core.buildEleveSynthese(eleveId, dataCache, {
      classeId: classeId,
      period: getPeriod(),
    });
    if (!synEleve.ok) {
      panelEleveEl.innerHTML = '<p class="synthese-empty-state">' + esc(synEleve.error) + "</p>";
      return;
    }

    var id = synEleve.identite;
    var rec = synEleve.records;
    var html = sectionHtml("Identité", identiteHtml(id), { icon: "👤", open: true });

    html += sectionHtml(
      "Appel et notes",
      appelNotesHtml(
        synEleve.appelNotes || synEleve.resume.appel,
        synEleve.feuillesAppel
      ),
      { icon: "📝", open: true }
    );

    html += sectionHtml("Résumé automatique", resumeEleveHtml(synEleve.resume, synEleve.asns), {
      icon: "✨",
      open: true,
    });

    if (synEleve.asns) {
      var asnsBody = "<p><strong>" + esc(synEleve.asns.headline) + "</strong></p>";
      if (synEleve.asns.commentaires) {
        asnsBody += "<p class=\"hint\">" + esc(synEleve.asns.commentaires) + "</p>";
      }
      if (synEleve.asns.dateValidation) {
        asnsBody +=
          '<p class="hint">Validation enregistrée le ' +
          esc(formatDateFr(synEleve.asns.dateValidation)) +
          ".</p>";
      }
      html += sectionHtml("Validation ASNS", asnsBody, { icon: "🏊" });
    }

    if (synEleve.alertes.length) {
      html += sectionHtml(
        "Alertes",
        alertesHtml(
          synEleve.alertes.map(function (a) {
            return { label: a.label, niveau: "orange" };
          })
        ),
        { icon: "⚠" }
      );
    }

    html += sectionHtml(
      "Dispenses / inaptitudes",
      rec.dispenses.length
        ? listeHtml(
            rec.dispenses.map(function (d) {
              return (
                esc(formatDateFr(d.dateDebut)) +
                " → " +
                esc(formatDateFr(d.dateFin)) +
                (d.motif ? " — " + esc(d.motif) : "")
              );
            })
          )
        : '<p class="synthese-empty">Aucune donnée</p>',
      { icon: "🏥" }
    );

    html += sectionHtml(
      "Oublis de matériel",
      rec.oublis.length
        ? listeHtml(
            rec.oublis.map(function (o) {
              return esc(formatDateFr(o.dateOubli)) + (o.commentaire ? " — " + esc(o.commentaire) : "");
            })
          )
        : '<p class="synthese-empty">Aucune donnée</p>',
      { icon: "🎒" }
    );

    if (rec.radar.length) {
      html += sectionHtml(
        "Radar vitesse (complément)",
        listeHtml(
          rec.radar.map(function (r) {
            return (
              esc(formatDateFr(r.createdAt)) +
              " — " +
              (r.kmh != null ? r.kmh.toFixed(2) + " km/h" : "perf.")
            );
          })
        ),
        { icon: "📡" }
      );
    }

    if (rec.imports.length || (synEleve.importFacts && synEleve.importFacts.length)) {
      html += sectionHtml(
        "Imports élèves (QR)",
        importFactsHtml(
          synEleve.importFacts && synEleve.importFacts.length ? synEleve.importFacts : null,
          null,
          { limit: IMPORTS_PREVIEW_LIMIT }
        ) ||
          listeHtml(
            rec.imports.slice(0, IMPORTS_PREVIEW_LIMIT).map(function (imp) {
              var lbl = Core.TOOL_LABELS_IMPORT[imp.toolId] || imp.toolId;
              var headline =
                typeof SyntheseFacts !== "undefined"
                  ? SyntheseFacts.importHeadline(imp)
                  : imp.auteurLabel || lbl;
              return esc(formatDateFr(imp.importedAt)) + " — " + esc(lbl) + " : " + esc(headline);
            })
          ) +
          (rec.imports.length > IMPORTS_PREVIEW_LIMIT
            ? '<p class="hint">+' +
              (rec.imports.length - IMPORTS_PREVIEW_LIMIT) +
              " import(s) supplémentaire(s) — consultez « Données élèves ».</p>"
            : ""),
        { icon: "📲" }
      );
    }

    if (rec.observations.length) {
      html += sectionHtml(
        "Observations / bilans (débrief)",
        listeHtml(
          rec.observations.map(function (o) {
            return esc(formatDateFr(o.date)) + " — " + esc(o.type || "débrief");
          })
        ),
        { icon: "💬" }
      );
    }

    html += sectionHtml(
      "Activités et compétitions",
      '<p class="hint">Résultats issus des séances liées à la classe (nom identique à « Classes »).</p>' +
        activitesEleveHtml(synEleve.activites),
      { icon: "🏆" }
    );

    if (synEleve.timeline.length) {
      html += sectionHtml("Historique récent", timelineHtml(synEleve.timeline), { icon: "🕐" });
    }

    if (synEleve.stats.activiteTotale === 0) {
      html =
        '<p class="synthese-empty-state">Aucune donnée d’activité pour cet élève sur la période sélectionnée.</p>' +
        html;
    }

    panelEleveEl.innerHTML = html;
  }

  function remplirClasses(classes) {
    classesList = classes || [];
    if (!selectClasseEl) return;
    var cur = selectClasseEl.value;
    selectClasseEl.innerHTML = '<option value="" disabled>Choisir une classe…</option>';
    classesList.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nom + " (" + (c.eleves ? c.eleves.length : 0) + ")";
      selectClasseEl.appendChild(opt);
    });
    if (cur && classesList.some(function (c) {
      return c.id === cur;
    })) {
      selectClasseEl.value = cur;
    } else if (classesList.length) {
      selectClasseEl.value = classesList[0].id;
    }
    remplirEleves();
  }

  function remplirEleves() {
    if (!selectEleveEl || !selectClasseEl) return;
    var classeId = selectClasseEl.value;
    var classe = classesList.find(function (c) {
      return c.id === classeId;
    });
    var eleves = (classe && classe.eleves) || [];
    var q = searchEleveEl ? normalizeSearch(searchEleveEl.value) : "";

    selectEleveEl.innerHTML = "";
    selectEleveEl.disabled = !eleves.length;

    if (datalistEl) {
      datalistEl.innerHTML = "";
      eleves.forEach(function (e) {
        var opt = document.createElement("option");
        opt.value = Core ? Core.labelEleve(e) : [e.nom, e.prenom].join(" ");
        datalistEl.appendChild(opt);
      });
    }

    var filtered = eleves.filter(function (e) {
      if (!q) return true;
      var blob = normalizeSearch([e.nom, e.prenom].join(" "));
      return blob.indexOf(q) >= 0;
    });

    if (!filtered.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = eleves.length ? "Aucun élève ne correspond" : "Aucun élève dans cette classe";
      selectEleveEl.appendChild(empty);
      return;
    }

    filtered.forEach(function (e) {
      var opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = Core ? Core.labelEleve(e) : [e.nom, e.prenom].join(" ");
      selectEleveEl.appendChild(opt);
    });
    selectEleveEl.value = filtered[0].id;
  }

  function normalizeSearch(s) {
    return Core ? Core.normalizeName(s) : String(s || "").toLowerCase();
  }

  function rafraichir() {
    montrerMsg("");
    return loadAllSyntheseData()
      .then(function (data) {
        dataCache = data;
        classesList = data.classes || [];
        remplirClasses(classesList);
        renderClasse();
        renderEleveIfActive();
      })
      .catch(function (err) {
        montrerMsg((err && err.message) || "Impossible de charger les données.");
      });
  }

  function renderEleveIfActive() {
    if (vueActive === "eleve") renderEleve();
  }

  function afficherOnglet(mode) {
    vueActive = mode;
    var isClasse = mode === "classe";
    if (tabClasse) {
      tabClasse.classList.toggle("synthese-seg__btn--active", isClasse);
      tabClasse.setAttribute("aria-selected", isClasse ? "true" : "false");
      tabClasse.tabIndex = isClasse ? 0 : -1;
    }
    if (tabEleve) {
      tabEleve.classList.toggle("synthese-seg__btn--active", !isClasse);
      tabEleve.setAttribute("aria-selected", isClasse ? "false" : "true");
      tabEleve.tabIndex = isClasse ? -1 : 0;
    }
    if (panelClasseWrap) panelClasseWrap.hidden = !isClasse;
    if (panelEleveWrap) panelEleveWrap.hidden = isClasse;
    if (eleveFiltresEl) eleveFiltresEl.hidden = isClasse;
    if (!isClasse) renderEleve();
  }

  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 0);
  }

  function exportCsv() {
    var lines = ["Section;Libellé;Valeur"];
    if (vueActive === "eleve" && synEleve && synEleve.ok) {
      var id = synEleve.identite;
      lines.push("Identité;Nom;" + id.nom);
      lines.push("Identité;Prénom;" + id.prenom);
      lines.push("Identité;Classe;" + id.classe);
      lines.push("Stats;Dispenses;" + synEleve.stats.nbDispenses);
      lines.push("Stats;Oublis;" + synEleve.stats.nbOublis);
      lines.push("Stats;Radar;" + synEleve.stats.nbRadar);
    } else if (synClasse && synClasse.ok) {
      lines.push("Classe;Nom;" + synClasse.classeNom);
      lines.push("Stats;Élèves;" + synClasse.stats.nbEleves);
      lines.push("Stats;Dispenses;" + synClasse.stats.nbDispenses);
      lines.push("Stats;Oublis;" + synClasse.stats.nbOublis);
      synClasse.topOublis.forEach(function (t, i) {
        lines.push("Top oublis;" + (i + 1) + ";" + t.label + " (" + t.count + ")");
      });
    } else {
      montrerMsg("Rien à exporter.");
      return;
    }
    downloadBlob("\ufeff" + lines.join("\n"), "synthese-eps.csv", "text/csv;charset=utf-8");
    montrerOk("Export CSV téléchargé.");
  }

  function slugFichierExport(label) {
    return (
      String(label || "export")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "export"
    );
  }

  function nomFichierPdfSynthese(type, label) {
    var d = new Date();
    var y = d.getFullYear();
    var mo = d.getMonth() + 1;
    var day = d.getDate();
    var m = mo < 10 ? "0" + mo : String(mo);
    var da = day < 10 ? "0" + day : String(day);
    return "synthese-" + type + "-" + slugFichierExport(label) + "-" + y + "-" + m + "-" + da + ".pdf";
  }

  function periodePdfLabel() {
    var p = getPeriod();
    if (p && (p.from || p.to)) {
      var parts = [];
      if (p.from) parts.push("depuis " + formatDateFr(p.from));
      if (p.to) parts.push("jusqu’au " + formatDateFr(p.to));
      return parts.join(" · ");
    }
    return "Toutes les dates";
  }

  function exportPdf() {
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Export PDF indisponible (jsPDF non chargé).");
      return;
    }

    var isEleve = vueActive === "eleve" && synEleve && synEleve.ok;
    var isClasse = !isEleve && synClasse && synClasse.ok;
    if (!isEleve && !isClasse) {
      montrerMsg("Rien à exporter en PDF.");
      return;
    }

    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    var margin = 14;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - 2 * margin;
    var headerH = 26;
    var y = margin;
    var lineH = 5;
    var fname;

    var C = {
      primary: [15, 118, 110],
      primaryDark: [17, 94, 89],
      ink: [15, 23, 42],
      slate: [100, 116, 139],
      soft: [240, 253, 250],
    };

    function rgb(c) {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setTextColor(c[0], c[1], c[2]);
    }

    function ensureSpace(h) {
      if (y + h > pageH - 16) {
        doc.addPage();
        y = margin;
      }
    }

    function drawPageHeader(title, subtitle) {
      rgb(C.primary);
      doc.rect(0, 0, pageW, headerH, "F");
      rgb(C.primaryDark);
      doc.rect(0, headerH - 2, pageW, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(String(title || "Synthèse").slice(0, 70), margin, 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      var meta =
        "Synthèse — Outils EPS · " +
        new Date().toLocaleString("fr-FR") +
        (subtitle ? " · " + subtitle : "");
      doc.text(doc.splitTextToSize(meta, contentW)[0], margin, 18);
      y = headerH + 8;
    }

    function drawSection(title) {
      ensureSpace(12);
      rgb(C.soft);
      doc.rect(margin, y - 3, contentW, 8, "F");
      rgb(C.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(String(title || "").toUpperCase(), margin + 2, y + 2);
      y += 10;
    }

    function drawParagraph(text, opts) {
      opts = opts || {};
      rgb(C.ink);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(opts.size || 9.5);
      var split = doc.splitTextToSize(String(text || ""), contentW);
      ensureSpace(split.length * lineH + 2);
      doc.text(split, margin, y);
      y += split.length * lineH + (opts.gap != null ? opts.gap : 2);
    }

    function drawKeyValues(rows) {
      rows.forEach(function (row) {
        if (!row || row.length < 2) return;
        ensureSpace(lineH + 1);
        rgb(C.slate);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(String(row[0]), margin, y);
        rgb(C.ink);
        doc.setFont("helvetica", "bold");
        doc.text(String(row[1]), margin + 52, y);
        y += lineH + 0.5;
      });
      y += 2;
    }

    function drawBullets(items, emptyText) {
      var list = (items || []).filter(Boolean);
      if (!list.length) {
        if (emptyText) drawParagraph(emptyText, { size: 9 });
        return;
      }
      list.forEach(function (item) {
        var split = doc.splitTextToSize("• " + String(item), contentW - 4);
        ensureSpace(split.length * lineH + 1);
        rgb(C.ink);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text(split, margin + 2, y);
        y += split.length * lineH + 0.5;
      });
      y += 2;
    }

    function drawFooters() {
      var total = doc.internal.getNumberOfPages();
      var p;
      for (p = 1; p <= total; p++) {
        doc.setPage(p);
        rgb(C.slate);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Outils EPS — Synthèse · page " + p + " / " + total, pageW / 2, pageH - 8, {
          align: "center",
        });
      }
    }

    if (isEleve) {
      var id = synEleve.identite;
      var appel = synEleve.appelNotes || synEleve.resume.appel || {};
      fname = nomFichierPdfSynthese("eleve", id.nom + "-" + id.prenom);
      drawPageHeader(id.prenom + " " + id.nom, id.classe + " · " + periodePdfLabel());

      drawSection("Identité");
      drawKeyValues([
        ["Classe", id.classe || "—"],
        ["Nom", id.nom || "—"],
        ["Prénom", id.prenom || "—"],
      ]);

      drawSection("Appel et notes");
      if (appel.nbTableaux) {
        drawKeyValues([
          ["Feuilles liées", String(appel.nbTableaux)],
          ["Colonnes appel", String(appel.nbFeuilles || 0)],
          ["Colonnes note", String(appel.nbColonnesNotes || 0)],
          [
            "Présence (✓)",
            appel.pctPresent != null ? appel.pctPresent + " %" : "—",
          ],
          [
            "Moyenne élève",
            appel.moyenneNotes != null
              ? formatMoyenne(appel.moyenneNotes, appel.moyenneNotesBareme)
              : "—",
          ],
        ]);
      } else {
        drawParagraph("Aucune feuille d’appel liée à cet élève.", { size: 9 });
      }

      drawSection("Résumé");
      drawParagraph("Points forts", { bold: true, size: 9, gap: 1 });
      drawBullets(
        synEleve.resume.pointsForts.filter(function (p) {
          return p !== "Aucun indicateur fort particulier.";
        }),
        "Aucun indicateur fort pour l’instant."
      );
      drawParagraph("Points de vigilance", { bold: true, size: 9, gap: 1 });
      drawBullets(
        synEleve.resume.pointsVigilance.filter(function (p) {
          return p !== "Rien de notable dans les alertes automatiques.";
        }),
        "Rien de notable dans les alertes automatiques."
      );

      if (synEleve.asns) {
        drawSection("ASNS");
        drawParagraph(synEleve.asns.headline, { bold: true, size: 9.5 });
        if (synEleve.asns.commentaires) {
          drawParagraph(synEleve.asns.commentaires, { size: 9 });
        }
      }

      drawSection("Suivi");
      drawKeyValues([
        ["Dispenses", String(synEleve.stats.nbDispenses || 0)],
        ["Oublis matériel", String(synEleve.stats.nbOublis || 0)],
        ["Imports QR", String(synEleve.stats.nbImports || 0)],
        ["Passages radar", String(synEleve.stats.nbRadar || 0)],
      ]);

      if (synEleve.alertes && synEleve.alertes.length) {
        drawSection("Alertes");
        drawBullets(
          synEleve.alertes.map(function (a) {
            return a.label;
          })
        );
      }

      if (synEleve.activites && synEleve.activites.length) {
        drawSection("Activités et compétitions");
        drawBullets(
          synEleve.activites.slice(0, 12).map(function (a) {
            return (a.toolLabel || a.toolId || "Activité") + " : " + (a.headline || a.resume || "—");
          })
        );
        if (synEleve.activites.length > 12) {
          drawParagraph("… et " + (synEleve.activites.length - 12) + " autre(s) activité(s).", {
            size: 8.5,
          });
        }
      }

      if (synEleve.timeline && synEleve.timeline.length) {
        drawSection("Historique récent");
        drawBullets(
          synEleve.timeline.slice(0, 10).map(function (ev) {
            return formatDateFr(ev.date) + " — " + ev.label + (ev.detail ? " (" + ev.detail + ")" : "");
          })
        );
        if (synEleve.timeline.length > 10) {
          drawParagraph("… et " + (synEleve.timeline.length - 10) + " événement(s) supplémentaire(s).", {
            size: 8.5,
          });
        }
      }
    } else {
      var s = synClasse.stats;
      var ac = synClasse.appelNotes || {};
      fname = nomFichierPdfSynthese("classe", synClasse.classeNom);
      drawPageHeader(synClasse.classeNom, periodePdfLabel());

      drawSection("Vue d’ensemble");
      drawKeyValues([
        ["Élèves", String(s.nbEleves || 0)],
        ["Dispenses", String(s.nbDispenses || 0)],
        ["Oublis matériel", String(s.nbOublis || 0)],
        ["Imports QR", String(s.nbImports || 0)],
        ["Séances outils", String(s.nbSessions || 0)],
      ]);

      if (ac.nbTableaux) {
        drawSection("Appel et notes");
        drawKeyValues([
          ["Feuilles liées", String(ac.nbTableaux)],
          ["Colonnes appel", String(ac.nbFeuilles || 0)],
          ["Colonnes note", String(ac.nbColonnesNotes || 0)],
          [
            "Présence (✓)",
            ac.pctPresent != null ? ac.pctPresent + " %" : "—",
          ],
          ["Élèves sur l’appel", String(ac.nbElevesSurFeuilles || 0)],
        ]);
      }

      if (synClasse.topOublis && synClasse.topOublis.length) {
        drawSection("Top oublis de matériel");
        drawBullets(
          synClasse.topOublis.map(function (t) {
            return t.label + " — " + t.count + " oubli(s)";
          })
        );
      }

      var groups = (synClasse.activitesClasse && synClasse.activitesClasse.parOutil) || [];
      if (groups.length) {
        drawSection("Activités et compétitions");
        groups.forEach(function (g) {
          drawParagraph(g.label + " (" + g.nbSessions + " séance(s))", { bold: true, size: 9, gap: 0.5 });
          drawBullets(
            (g.sessions || []).slice(0, 4).map(function (sess) {
              return (sess.nom || "Séance") + (sess.date ? " — " + formatDateFr(sess.date) : "") + " : " + (sess.resume || "—");
            })
          );
        });
      }

      var elevesAlerte = (synClasse.synthesesEleves || []).filter(function (se) {
        return se.scoreAlerte > 0;
      });
      if (elevesAlerte.length) {
        drawSection("Élèves à surveiller");
        drawBullets(
          elevesAlerte.slice(0, 15).map(function (se) {
            var alerts = (se.alertes || [])
              .map(function (a) {
                return a.label;
              })
              .join(", ");
            return se.label + (alerts ? " — " + alerts : "");
          })
        );
      }

      if (synClasse.evenementsRecents && synClasse.evenementsRecents.length) {
        drawSection("Historique récent");
        drawBullets(
          synClasse.evenementsRecents.slice(0, 10).map(function (ev) {
            return formatDateFr(ev.date) + " — " + ev.label + (ev.detail ? " (" + ev.detail + ")" : "");
          })
        );
        if (synClasse.evenementsRecents.length > 10) {
          drawParagraph(
            "… et " + (synClasse.evenementsRecents.length - 10) + " événement(s) supplémentaire(s).",
            { size: 8.5 }
          );
        }
      }
    }

    drawFooters();
    doc.save(fname);
    montrerOk("PDF téléchargé.");
  }

  function initEvents() {
    if (selectClasseEl) {
      selectClasseEl.addEventListener("change", function () {
        remplirEleves();
        renderClasse();
        renderEleveIfActive();
      });
    }
    if (selectEleveEl) {
      selectEleveEl.addEventListener("change", function () {
        renderEleve();
      });
    }
    if (searchEleveEl) {
      searchEleveEl.addEventListener("input", function () {
        remplirEleves();
        renderEleveIfActive();
      });
    }
    [dateFromEl, dateToEl, triAlertesEl].forEach(function (el) {
      if (!el) return;
      el.addEventListener("change", function () {
        renderClasse();
        renderEleveIfActive();
      });
    });

    if (tabClasse) {
      tabClasse.addEventListener("click", function () {
        afficherOnglet("classe");
      });
    }
    if (tabEleve) {
      tabEleve.addEventListener("click", function () {
        afficherOnglet("eleve");
      });
    }

    var btnCsv = document.getElementById("synthese-export-csv");
    if (btnCsv) btnCsv.addEventListener("click", exportCsv);
    var btnPdf = document.getElementById("synthese-export-pdf");
    if (btnPdf) btnPdf.addEventListener("click", exportPdf);
  }

  function init() {
    if (!Core) {
      montrerMsg("Module Synthèse non chargé.");
      return;
    }
    initEvents();
    afficherOnglet("classe");
    rafraichir();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SyntheseEps = {
    loadAllSyntheseData: loadAllSyntheseData,
    buildClasseSynthese: function (id, data, opts) {
      return Core.buildClasseSynthese(id, data, opts);
    },
    buildEleveSynthese: function (id, data, opts) {
      return Core.buildEleveSynthese(id, data, opts);
    },
    findEleveRecords: function (eleve, data, opts) {
      return Core.findEleveRecords(eleve, data, opts);
    },
    normalizeName: function (v) {
      return Core.normalizeName(v);
    },
    sameEleve: function (a, b) {
      return Core.sameEleve(a, b);
    },
  };
})();
