/**
 * Journal de musculation — séances locales, catalogue, partage QR une séance à la fois.
 */
(function () {
  "use strict";

  var Core = typeof JournalMusculationCore !== "undefined" ? JournalMusculationCore : null;
  var Body = typeof JournalMusculationBody !== "undefined" ? JournalMusculationBody : null;
  if (!Core) return;

  var state = Core.loadState(localStorage);
  var currentSessionId = null;
  var catalogSort = "bodyPart";
  var catalogFilter = "";
  var listenersBound = false;
  var exerciseFieldSaveTimer = null;

  var viewList;
  var viewSession;
  var globalSummaryEl;
  var globalInsightsEl;
  var sessionInsightsEl;
  var sessionsListEl;
  var sessionsEmptyEl;
  var sessionSummaryEl;
  var exercisesEl;
  var exercisesEmptyEl;
  var titleInput;
  var dateInput;
  var notesInput;
  var exerciseNameInput;
  var catalogListEl;
  var catalogSortEl;
  var catalogFilterEl;
  var eleveNomInput;
  var eleveClasseInput;

  function refreshState() {
    state = Core.loadState(localStorage);
  }

  function bindDomRefs() {
    viewList = document.getElementById("journal-view-list");
    viewSession = document.getElementById("journal-view-session");
    globalSummaryEl = document.getElementById("journal-global-summary");
    globalInsightsEl = document.getElementById("journal-global-insights");
    sessionInsightsEl = document.getElementById("journal-session-insights");
    sessionsListEl = document.getElementById("journal-sessions-list");
    sessionsEmptyEl = document.getElementById("journal-sessions-empty");
    sessionSummaryEl = document.getElementById("journal-session-summary");
    exercisesEl = document.getElementById("journal-exercises");
    exercisesEmptyEl = document.getElementById("journal-exercises-empty");
    titleInput = document.getElementById("journal-session-title");
    dateInput = document.getElementById("journal-session-date");
    notesInput = document.getElementById("journal-session-notes");
    exerciseNameInput = document.getElementById("journal-exercise-name");
    catalogListEl = document.getElementById("journal-catalog-list");
    catalogSortEl = document.getElementById("journal-catalog-sort");
    catalogFilterEl = document.getElementById("journal-catalog-filter");
    eleveNomInput = document.getElementById("journal-eleve-nom");
    eleveClasseInput = document.getElementById("journal-eleve-classe");
  }

  function getEleveMetaFields() {
    return {
      auteurLabel: eleveNomInput ? eleveNomInput.value.trim() : "",
      classeLabel: eleveClasseInput ? eleveClasseInput.value.trim() : "",
    };
  }

  function chargerEleveMeta() {
    if (typeof EleveLabels === "undefined") return;
    var meta = EleveLabels.getMetaFields();
    var tool = EleveLabels.getToolLabels(Core.TOOL_ID);
    if (eleveNomInput) {
      eleveNomInput.value = tool.auteurLabel || meta.auteurLabel || "";
    }
    if (eleveClasseInput) {
      eleveClasseInput.value = tool.classeLabel || meta.classeLabel || "";
    }
  }

  function persisterEleveMeta() {
    if (typeof EleveLabels === "undefined") return;
    var fields = getEleveMetaFields();
    EleveLabels.saveToolLabels(Core.TOOL_ID, fields);
    EleveLabels.saveMetaFields({ classeLabel: fields.classeLabel });
  }

  function normalizeCatalogFilterQuery(query) {
    return String(query || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function matchesCatalogFilter(item, queryNorm) {
    if (!queryNorm) return true;
    var hay = normalizeCatalogFilterQuery(
      [item.name, item.category, item.muscle, item.bodyPart].join(" ")
    );
    var tokens = queryNorm.split(/\s+/).filter(Boolean);
    return tokens.every(function (tok) {
      return hay.indexOf(tok) >= 0;
    });
  }

  function persist() {
    Core.saveState(state, localStorage);
  }

  function currentSession() {
    return currentSessionId ? Core.findSession(state, currentSessionId) : null;
  }

  function summaryGridHtml(summary, keys) {
    keys = keys || [
      ["totalSessions", "Séances", ""],
      ["totalSets", "Séries", ""],
      ["totalExercises", "Exercices", ""],
      ["totalVolumeKg", "Volume", " kg"],
    ];
    return keys
      .map(function (row) {
        var val = summary[row[0]];
        if (val == null) return "";
        return (
          '<p class="journal-muscu-stat"><span>' +
          row[1] +
          '</span><strong>' +
          val +
          (row[2] || "") +
          "</strong></p>"
        );
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setAccordionBadge(elId, text) {
    var el = document.getElementById(elId);
    if (!el) return;
    var label = text ? String(text).trim() : "";
    el.textContent = label;
    el.hidden = !label;
  }

  function updateHomeAccordions() {
    var sessions = state.sessions || [];
    var n = sessions.length;
    setAccordionBadge(
      "journal-sessions-acc-badge",
      n ? n + " séance" + (n > 1 ? "s" : "") : ""
    );
    var g = Core.computeGlobalSummary(sessions);
    var summaryBadge = "";
    if (g.totalSets > 0) {
      summaryBadge = g.totalSets + " séries";
      if (g.totalVolumeKg) summaryBadge += " · " + g.totalVolumeKg + " kg";
    } else if (g.lastDateIso) {
      summaryBadge = "Dernière : " + Core.formatDateFr(g.lastDateIso);
    }
    setAccordionBadge("journal-summary-acc-badge", summaryBadge);
    var recorded = Core.listRecordedMaxes(state);
    setAccordionBadge(
      "journal-rm-acc-badge",
      recorded.length
        ? recorded.length + " max" + (recorded.length > 1 ? "" : "")
        : ""
    );
  }

  function updateSessionAccordions(session) {
    var count = (session && session.exercises) ? session.exercises.length : 0;
    setAccordionBadge(
      "journal-exos-acc-badge",
      count ? count + " exo." + (count > 1 ? "s" : "") : ""
    );
    var accExos = document.getElementById("journal-acc-session-exos");
    var accAdd = document.getElementById("journal-acc-session-add");
    if (accExos) accExos.open = count > 0;
    if (accAdd) accAdd.open = count === 0;
  }

  function renderInsights(container, insights, scopeLabel) {
    if (!container) return;
    if (!insights || !insights.hasData) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }
    container.hidden = false;
    var html = "";
    if (insights.topExercises && insights.topExercises.length) {
      html +=
        '<div class="journal-muscu-insights-block"><h3 class="journal-muscu-insights-title">Exercices les plus travaillés' +
        (scopeLabel ? " — " + escapeHtml(scopeLabel) : "") +
        '</h3><ol class="journal-muscu-insights-list">';
      insights.topExercises.forEach(function (row) {
        html +=
          "<li><strong>" +
          escapeHtml(row.label) +
          "</strong> · " +
          row.sets +
          " séries" +
          (row.volumeKg ? " · " + row.volumeKg + " kg" : "") +
          "</li>";
      });
      html += "</ol></div>";
    }
    container.innerHTML = html;
    if (insights.muscles && insights.muscles.length && Body) {
      var bodyHost = document.createElement("div");
      bodyHost.className = "journal-muscu-insights-block";
      container.appendChild(bodyHost);
      Body.renderBodyHeatmap(bodyHost, insights.muscles, {
        title: "Carte des muscles",
        ariaLabel:
          "Silhouette humaine : intensité des muscles selon le nombre de séries" +
          (scopeLabel ? " — " + scopeLabel : ""),
      });
    }
  }

  function renderRmSection() {
    var recordedEl = document.getElementById("journal-rm-recorded");
    var potentialsEl = document.getElementById("journal-rm-potentials");
    var datalist = document.getElementById("journal-rm-exercise-list");
    var formulaFieldset = document.getElementById("journal-rm-formula");
    if (!recordedEl || !potentialsEl) return;
    refreshState();

    var formula = Core.getRmFormula(state);
    if (formulaFieldset) {
      var radio = formulaFieldset.querySelector('input[name="rm-formula"][value="' + formula + '"]');
      if (radio) radio.checked = true;
    }

    if (datalist) {
      datalist.innerHTML = Core.mergeCatalog(state)
        .map(function (entry) {
          return "<option value=\"" + escapeHtml(entry.name) + "\"></option>";
        })
        .join("");
    }

    var recorded = Core.listRecordedMaxes(state);
    if (!recorded.length) {
      recordedEl.innerHTML =
        '<p class="empty-state journal-muscu-rm-empty">Aucun max testé enregistré.</p>';
    } else {
      recordedEl.innerHTML =
        '<ul class="journal-muscu-rm-list">' +
        recorded
          .map(function (r) {
            return (
              "<li>" +
              '<span class="journal-muscu-rm-list__name">' +
              escapeHtml(r.name) +
              "</span>" +
              "<strong>" +
              escapeHtml(String(r.weightKg)) +
              ' kg</strong><span class="journal-muscu-rm-list__tag">max testé</span>' +
              '<button type="button" class="btn btn--ghost btn--small" data-action="delete-rm" data-rm-name="' +
              escapeHtml(r.name) +
              '">✕</button></li>'
            );
          })
          .join("") +
        "</ul>";
    }

    var insights = Core.collectRmInsights(state);
    if (!insights.rows.length) {
      potentialsEl.innerHTML =
        '<p class="hint journal-muscu-rm-potentials-empty">Les 1RM potentiels s’affichent lorsque vos séances contiennent charge (kg) et reps (1 à 30).</p>';
    } else {
      potentialsEl.innerHTML =
        '<h3 class="journal-muscu-insights-title">1RM potentiels <span class="journal-muscu-rm-estim">(estimations)</span></h3>' +
        '<p class="hint journal-muscu-rm-potentials-hint">Formule ' +
        escapeHtml(insights.formulaLabel) +
        " — estimation à partir de vos séries, pas un max réel.</p>" +
        '<div class="journal-muscu-rm-table-wrap"><table class="journal-muscu-rm-table"><thead><tr>' +
        "<th>Exercice</th><th>Max testé</th><th>1RM potentiel</th><th>Repère</th>" +
        "</tr></thead><tbody>" +
        insights.rows
          .map(function (row) {
            var rec = row.recorded ? row.recorded.weightKg + " kg" : "—";
            var potLabel = row.potential
              ? Core.formatPotential1rmLabel(row.potential, insights.formula)
              : "—";
            return (
              "<tr><td>" +
              escapeHtml(row.name) +
              "</td><td>" +
              rec +
              '</td><td><strong class="journal-muscu-rm-potential-val">' +
              escapeHtml(potLabel) +
              '</td><td class="journal-muscu-rm-source">' +
              escapeHtml(row.potential ? row.potential.sourceLabel : "—") +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>";
    }
    updateHomeAccordions();
  }

  function appendExerciseRm(card, ex) {
    var formula = Core.getRmFormula(state);
    var pot = Core.bestPotentialFromExercise(ex, formula);
    var rec = Core.getRecordedMax(state, ex.name);
    if (!pot && !rec) return;
    var block = document.createElement("div");
    block.className = "journal-muscu-exo-rm";
    var html = "";
    if (pot) {
      var RmFmt = typeof RmFormulas !== "undefined" ? RmFormulas : null;
      var potKg = RmFmt ? "~" + RmFmt.formatKg(pot.estimatedKg) + " kg" : "~" + pot.estimatedKg + " kg";
      html +=
        '<p class="journal-muscu-exo-rm__line journal-muscu-exo-rm__line--pot">' +
        '<span class="journal-muscu-exo-rm__badge">1RM potentiel</span> ' +
        "<strong>" +
        escapeHtml(potKg) +
        "</strong>" +
        '<span class="hint"> · estimation (' +
        escapeHtml(RmFmt ? RmFmt.formulaLabel(formula) : formula) +
        ") · " +
        escapeHtml(pot.sourceLabel) +
        "</span></p>";
    }
    if (rec) {
      html +=
        '<p class="journal-muscu-exo-rm__line journal-muscu-exo-rm__line--rec">' +
        '<span class="journal-muscu-exo-rm__badge journal-muscu-exo-rm__badge--rec">Max testé</span> ' +
        "<strong>" +
        escapeHtml(String(rec.weightKg)) +
        " kg</strong></p>";
    }
    block.innerHTML = html;
    card.appendChild(block);
  }

  function renderGlobalSummary() {
    if (!globalSummaryEl) return;
    var g = Core.computeGlobalSummary(state.sessions);
    globalSummaryEl.innerHTML = summaryGridHtml(g, [
      ["totalSessions", "Séances", ""],
      ["totalSets", "Séries", ""],
      ["totalVolumeKg", "Volume total", " kg"],
      ["lastDateIso", "Dernière", ""],
    ]);
    var lastEl = globalSummaryEl.querySelector(".journal-muscu-stat:last-child strong");
    if (lastEl && g.lastDateIso) {
      lastEl.textContent = Core.formatDateFr(g.lastDateIso);
    }
    renderInsights(globalInsightsEl, Core.computeWorkloadInsights(state.sessions), "toutes séances");
    updateHomeAccordions();
  }

  function renderSessionsList() {
    var listEl = document.getElementById("journal-sessions-list");
    var emptyEl = document.getElementById("journal-sessions-empty");
    if (!listEl) return;
    refreshState();
    listEl.innerHTML = "";
    var sessions = state.sessions || [];
    if (emptyEl) emptyEl.hidden = sessions.length > 0;
    sessions.forEach(function (session) {
      if (!session || !session.id) return;
      try {
        var s = Core.computeSessionSummary(session);
        var li = document.createElement("li");
        li.className = "journal-muscu-session-row";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "journal-muscu-session-btn";
        btn.setAttribute("data-session-id", session.id);
        btn.innerHTML =
          '<span class="journal-muscu-session-btn__title">' +
          escapeHtml(session.title || "Séance") +
          '</span><span class="journal-muscu-session-btn__meta">' +
          Core.formatDateFr(session.dateIso) +
          " · " +
          s.exerciseCount +
          " exo. · " +
          s.setCount +
          " séries" +
          (s.volumeKg ? " · " + s.volumeKg + " kg vol." : "") +
          "</span>";
        var del = document.createElement("button");
        del.type = "button";
        del.className = "btn btn--ghost btn--small journal-muscu-session-del";
        del.setAttribute("data-action", "delete-session");
        del.setAttribute("data-session-id", session.id);
        del.setAttribute("aria-label", "Supprimer " + (session.title || "Séance"));
        del.textContent = "✕";
        li.appendChild(btn);
        li.appendChild(del);
        listEl.appendChild(li);
      } catch (eRow) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[journal-musculation] séance ignorée à l'affichage", eRow, session);
        }
      }
    });
    try {
      renderGlobalSummary();
    } catch (eSummary) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[journal-musculation] résumé", eSummary);
      }
    }
  }

  function renderSessionSummary(session) {
    if (!sessionSummaryEl) return;
    var s = Core.computeSessionSummary(session);
    sessionSummaryEl.innerHTML = summaryGridHtml(s, [
      ["exerciseCount", "Exercices", ""],
      ["setCount", "Séries", ""],
      ["repCount", "Répétitions", ""],
      ["volumeKg", "Volume", " kg"],
    ]);
    renderInsights(sessionInsightsEl, Core.computeWorkloadInsights([session]), "cette séance");
    updateSessionAccordions(session);
  }

  function renderCatalog() {
    if (!catalogListEl) return;
    if (catalogFilterEl) catalogFilter = catalogFilterEl.value;
    var queryNorm = normalizeCatalogFilterQuery(catalogFilter);
    catalogListEl.innerHTML = "";
    var groups = Core.getCatalogGrouped(state, catalogSort);
    var visibleCount = 0;
    groups.forEach(function (group) {
      var filteredItems = group.items.filter(function (item) {
        return matchesCatalogFilter(item, queryNorm);
      });
      if (!filteredItems.length) return;
      visibleCount += filteredItems.length;
      var section = document.createElement("section");
      section.className = "journal-muscu-catalog-group";
      var title = document.createElement("h3");
      title.textContent = group.groupLabel;
      section.appendChild(title);
      var list = document.createElement("div");
      list.className = "journal-muscu-catalog-items";
      filteredItems.forEach(function (item) {
        var chip = document.createElement("div");
        chip.className = "journal-muscu-catalog-chip";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "journal-muscu-catalog-item";
        btn.setAttribute("data-catalog-name", item.name);
        btn.innerHTML =
          "<span class=\"journal-muscu-catalog-item__name\">" +
          escapeHtml(item.name) +
          "</span>" +
          "<span class=\"journal-muscu-catalog-item__meta\">" +
          escapeHtml(item.category) +
          " · " +
          escapeHtml(item.muscle) +
          (item.isCustom ? " · perso." : "") +
          "</span>";
        chip.appendChild(btn);
        if (item.isCustom) {
          var rm = document.createElement("button");
          rm.type = "button";
          rm.className = "btn btn--ghost btn--small journal-muscu-catalog-del";
          rm.setAttribute("data-action", "remove-catalog");
          rm.setAttribute("data-catalog-name", item.name);
          rm.setAttribute("aria-label", "Retirer " + item.name + " du catalogue");
          rm.textContent = "✕";
          chip.appendChild(rm);
        }
        list.appendChild(chip);
      });
      section.appendChild(list);
      catalogListEl.appendChild(section);
    });
    if (!visibleCount) {
      var empty = document.createElement("p");
      empty.className = "empty-state journal-muscu-catalog-empty";
      empty.textContent = queryNorm
        ? "Aucun exercice ne correspond à votre recherche."
        : "Catalogue vide.";
      catalogListEl.appendChild(empty);
    }
  }

  function addExerciseToSession(entry) {
    var session = currentSession();
    if (!session || !entry || !entry.name) return;
    Core.addExercise(session, {
      name: entry.name,
      category: entry.category,
      muscle: entry.muscle,
      bodyPart: entry.bodyPart,
      setMode: "uniform",
      setCount: 3,
    });
    persist();
    renderExercises(session);
  }

  function renderModeToggle(ex) {
    var wrap = document.createElement("div");
    wrap.className = "journal-muscu-mode";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Mode de saisie des séries");
    var btnUniform = document.createElement("button");
    btnUniform.type = "button";
    btnUniform.className =
      "journal-muscu-mode-btn" + (ex.setMode === "uniform" ? " is-active" : "");
    btnUniform.setAttribute("data-action", "set-mode");
    btnUniform.setAttribute("data-mode", "uniform");
    btnUniform.setAttribute("data-exercise-id", ex.id);
    btnUniform.textContent = "Séries identiques";
    var btnIndiv = document.createElement("button");
    btnIndiv.type = "button";
    btnIndiv.className =
      "journal-muscu-mode-btn" + (ex.setMode === "individual" ? " is-active" : "");
    btnIndiv.setAttribute("data-action", "set-mode");
    btnIndiv.setAttribute("data-mode", "individual");
    btnIndiv.setAttribute("data-exercise-id", ex.id);
    btnIndiv.textContent = "Série par série";
    wrap.appendChild(btnUniform);
    wrap.appendChild(btnIndiv);
    return wrap;
  }

  function renderUniformBlock(ex) {
    ex = Core.normalizeExercise(ex);
    var block = document.createElement("div");
    block.className = "journal-muscu-uniform";
    block.innerHTML =
      '<div class="journal-muscu-uniform-row">' +
      '<label class="field-label" for="uniform-count-' +
      ex.id +
      '">Nb séries</label>' +
      '<input type="number" id="uniform-count-' +
      ex.id +
      '" inputmode="numeric" min="0" max="99" data-field="setCount" data-exercise-id="' +
      ex.id +
      '" value="' +
      (ex.setCount != null ? ex.setCount : "") +
      '" />' +
      "</div>" +
      '<div class="journal-muscu-uniform-row">' +
      '<label class="field-label" for="uniform-reps-' +
      ex.id +
      '">Reps / série</label>' +
      '<input type="number" id="uniform-reps-' +
      ex.id +
      '" inputmode="numeric" min="0" data-field="uniformReps" data-exercise-id="' +
      ex.id +
      '" value="' +
      (ex.uniformReps != null ? ex.uniformReps : "") +
      '" />' +
      "</div>" +
      '<div class="journal-muscu-uniform-row">' +
      '<label class="field-label" for="uniform-kg-' +
      ex.id +
      '">Charge (kg)</label>' +
      '<input type="number" id="uniform-kg-' +
      ex.id +
      '" inputmode="decimal" min="0" step="0.5" data-field="uniformWeightKg" data-exercise-id="' +
      ex.id +
      '" value="' +
      (ex.uniformWeightKg != null ? ex.uniformWeightKg : "") +
      '" />' +
      "</div>";
    if (ex.setCount) {
      var hint = document.createElement("p");
      hint.className = "hint journal-muscu-uniform-hint";
      hint.textContent = Core.formatUniformLabel(ex);
      block.appendChild(hint);
    }
    return block;
  }

  function renderIndividualSets(ex) {
    var table = document.createElement("div");
    table.className = "journal-muscu-sets-table";
    var headRow = document.createElement("div");
    headRow.className = "journal-muscu-sets-head";
    headRow.innerHTML = "<span>Série</span><span>Reps</span><span>kg</span><span></span>";
    table.appendChild(headRow);

    (ex.sets || []).forEach(function (set, index) {
      var row = document.createElement("div");
      row.className = "journal-muscu-sets-row";
      row.setAttribute("data-set-id", set.id);
      row.innerHTML =
        "<span>" +
        (index + 1) +
        '</span><input type="number" inputmode="numeric" min="0" data-field="reps" data-set-id="' +
        set.id +
        '" value="' +
        (set.reps != null ? set.reps : "") +
        '" aria-label="Répétitions série ' +
        (index + 1) +
        '" /><input type="number" inputmode="decimal" min="0" step="0.5" data-field="weightKg" data-set-id="' +
        set.id +
        '" value="' +
        (set.weightKg != null ? set.weightKg : "") +
        '" aria-label="Charge série ' +
        (index + 1) +
        '" /><button type="button" class="btn btn--ghost btn--small" data-action="remove-set" data-set-id="' +
        set.id +
        '" aria-label="Supprimer série">✕</button>';
      table.appendChild(row);
    });

    var addSetBtn = document.createElement("button");
    addSetBtn.type = "button";
    addSetBtn.className = "btn btn--ghost journal-muscu-add-set";
    addSetBtn.textContent = "+ Série";
    addSetBtn.setAttribute("data-action", "add-set");
    addSetBtn.setAttribute("data-exercise-id", ex.id);

    var frag = document.createDocumentFragment();
    frag.appendChild(table);
    frag.appendChild(addSetBtn);
    return frag;
  }

  function scheduleExerciseFieldSave(session) {
    if (!session) return;
    if (exerciseFieldSaveTimer) clearTimeout(exerciseFieldSaveTimer);
    exerciseFieldSaveTimer = setTimeout(function () {
      persist();
      renderSessionSummary(session);
      updateSessionAccordions(session);
    }, 450);
  }

  function refreshExerciseRmBlock(exerciseId) {
    if (!exercisesEl || !exerciseId) return;
    var session = currentSession();
    if (!session) return;
    var ex = findExerciseInSession(session, exerciseId);
    if (!ex) return;
    var card = exercisesEl.querySelector('.journal-muscu-exo-card[data-exercise-id="' + exerciseId + '"]');
    if (!card) return;
    var oldRm = card.querySelector(".journal-muscu-exo-rm");
    if (oldRm) oldRm.remove();
    appendExerciseRm(card, ex);
  }

  function renderExercises(session) {
    if (!exercisesEl) return;
    exercisesEl.innerHTML = "";
    var exercises = session.exercises || [];
    if (exercisesEmptyEl) exercisesEmptyEl.hidden = exercises.length > 0;

    exercises.forEach(function (ex, index) {
      ex = Core.normalizeExercise(ex);
      var card = document.createElement("article");
      card.className = "card journal-muscu-exo-card";
      card.setAttribute("data-exercise-id", ex.id);

      var head = document.createElement("div");
      head.className = "journal-muscu-exo-head";
      var num = document.createElement("span");
      num.className = "journal-muscu-exo-index";
      num.textContent = String(index + 1);
      num.setAttribute("aria-hidden", "true");
      var nameWrap = document.createElement("div");
      nameWrap.className = "journal-muscu-exo-title-wrap";
      var name = document.createElement("h3");
      name.textContent = ex.name;
      nameWrap.appendChild(name);
      if (ex.muscle || ex.bodyPart) {
        var meta = document.createElement("p");
        meta.className = "journal-muscu-exo-meta";
        meta.textContent = [ex.bodyPart, ex.muscle].filter(Boolean).join(" · ");
        nameWrap.appendChild(meta);
      }
      var delEx = document.createElement("button");
      delEx.type = "button";
      delEx.className = "btn btn--ghost btn--small";
      delEx.textContent = "Retirer";
      delEx.setAttribute("data-action", "remove-exercise");
      delEx.setAttribute("data-exercise-id", ex.id);
      head.appendChild(num);
      head.appendChild(nameWrap);
      head.appendChild(delEx);
      card.appendChild(head);
      card.appendChild(renderModeToggle(ex));

      if (ex.setMode === "uniform") {
        card.appendChild(renderUniformBlock(ex));
      } else {
        card.appendChild(renderIndividualSets(ex));
      }
      appendExerciseRm(card, ex);

      exercisesEl.appendChild(card);
    });
    renderSessionSummary(session);
  }

  function showList() {
    currentSessionId = null;
    if (viewList) viewList.hidden = false;
    if (viewSession) viewSession.hidden = true;
    renderSessionsList();
    renderRmSection();
  }

  function showSession(sessionId) {
    var session = Core.findSession(state, sessionId);
    if (!session) {
      showList();
      return;
    }
    currentSessionId = sessionId;
    if (viewList) viewList.hidden = true;
    if (viewSession) viewSession.hidden = false;
    if (titleInput) titleInput.value = session.title;
    if (dateInput) dateInput.value = session.dateIso;
    if (notesInput) {
      var notes = Core.normalizeSessionNotes(session.notes || "");
      notesInput.value = notes;
      if (session.notes !== notes) {
        session.notes = notes;
        persist();
      }
    }
    renderCatalog();
    renderExercises(session);
    updateSessionAccordions(session);
    mountShare();
    if (viewSession.scrollIntoView) {
      viewSession.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function syncSessionFieldsFromInputs() {
    var session = currentSession();
    if (!session) return;
    if (titleInput) session.title = titleInput.value.trim() || "Séance";
    if (dateInput) session.dateIso = dateInput.value || Core.todayIsoDate();
    if (notesInput) {
      session.notes = Core.normalizeSessionNotes(notesInput.value);
      if (notesInput.value !== session.notes) notesInput.value = session.notes;
    }
    Core.touchSession(session);
    persist();
  }

  function findExerciseInSession(session, exerciseId) {
    return (session.exercises || []).find(function (x) {
      return x.id === exerciseId;
    });
  }

  function mountShare() {
    if (typeof EleveQrShare === "undefined") return;
    var bar = document.getElementById("eleve-share-bar");
    if (!bar) return;
    EleveQrShare.mountButton(bar, {
      toolId: Core.TOOL_ID,
      buttonLabel: "Partager cette séance au prof (QR)",
      getParticipantLabel: function () {
        syncSessionFieldsFromInputs();
        return getEleveMetaFields().auteurLabel;
      },
      getPayload: function () {
        syncSessionFieldsFromInputs();
        return Core.buildSharePayload(currentSession());
      },
      validateBeforeShare: function () {
        syncSessionFieldsFromInputs();
        return Core.validateSessionForShare(currentSession());
      },
    });
  }

  function bindEleveMetaListeners() {
    [eleveNomInput, eleveClasseInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", persisterEleveMeta);
      input.addEventListener("change", persisterEleveMeta);
    });
  }

  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    bindEleveMetaListeners();

    var btnNew = document.getElementById("journal-btn-new");
    if (btnNew) {
      btnNew.addEventListener("click", function () {
        var title = prompt(
          "Nom de la séance (optionnel) :",
          "Séance " + Core.formatDateFr(Core.todayIsoDate())
        );
        if (title === null) return;
        var session = Core.createSession(state, { title: title || "Séance" });
        persist();
        showSession(session.id);
      });
    }

    var btnBack = document.getElementById("journal-btn-back-list");
    if (btnBack) {
      btnBack.addEventListener("click", function () {
        syncSessionFieldsFromInputs();
        showList();
      });
    }

    var btnAddEx = document.getElementById("journal-btn-add-exercise");
    if (btnAddEx) {
      btnAddEx.addEventListener("click", function () {
        var session = currentSession();
        if (!session || !exerciseNameInput) return;
        var name = exerciseNameInput.value.trim();
        if (!name) return;
        var entry = Core.findCatalogEntry(state, name) || { name: name };
        Core.addCustomExercise(state, entry);
        addExerciseToSession(entry);
        exerciseNameInput.value = "";
      });
    }

    var btnAddCustom = document.getElementById("journal-btn-add-custom");
    if (btnAddCustom) {
      btnAddCustom.addEventListener("click", function () {
        var nameEl = document.getElementById("journal-custom-name");
        if (!nameEl) return;
        var entry = Core.addCustomExercise(state, {
          name: nameEl.value,
          category: document.getElementById("journal-custom-category").value,
          muscle: document.getElementById("journal-custom-muscle").value,
          bodyPart: document.getElementById("journal-custom-body").value,
        });
        if (!entry) return;
        persist();
        renderCatalog();
        nameEl.value = "";
        ["journal-custom-category", "journal-custom-muscle", "journal-custom-body"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = "";
        });
      });
    }

    var btnDelSession = document.getElementById("journal-btn-delete-session");
    if (btnDelSession) {
      btnDelSession.addEventListener("click", function () {
        var session = currentSession();
        if (!session) return;
        if (!confirm("Supprimer cette séance et tout son contenu ?")) return;
        Core.deleteSession(state, session.id);
        persist();
        showList();
      });
    }

    if (catalogSortEl) {
      catalogSortEl.addEventListener("change", function () {
        catalogSort = catalogSortEl.value;
        renderCatalog();
      });
    }

    if (catalogFilterEl) {
      catalogFilterEl.addEventListener("input", function () {
        catalogFilter = catalogFilterEl.value;
        renderCatalog();
      });
    }

    if (catalogListEl) {
      catalogListEl.addEventListener("click", function (e) {
        var rmCatalog = e.target.closest('[data-action="remove-catalog"]');
        if (rmCatalog) {
          e.stopPropagation();
          var rmName = rmCatalog.getAttribute("data-catalog-name");
          if (!confirm("Retirer « " + rmName + " » de votre catalogue ?")) return;
          Core.removeCustomExercise(state, rmName);
          persist();
          renderCatalog();
          return;
        }
        var btn = e.target.closest(".journal-muscu-catalog-item[data-catalog-name]");
        if (!btn) return;
        var name = btn.getAttribute("data-catalog-name");
        var entry = Core.findCatalogEntry(state, name);
        if (entry) addExerciseToSession(entry);
      });
    }

    if (viewList) {
      viewList.addEventListener("click", function (e) {
        var delBtn = e.target.closest('[data-action="delete-session"]');
        if (delBtn) {
          e.stopPropagation();
          var delId = delBtn.getAttribute("data-session-id");
          var delSession = Core.findSession(state, delId);
          if (!delSession) return;
          if (!confirm("Supprimer la séance « " + delSession.title + " » ?")) return;
          Core.deleteSession(state, delId);
          if (currentSessionId === delId) currentSessionId = null;
          persist();
          renderSessionsList();
          return;
        }
        var btn = e.target.closest(".journal-muscu-session-btn[data-session-id]");
        if (!btn) return;
        showSession(btn.getAttribute("data-session-id"));
      });
    }

    if (exercisesEl) {
      exercisesEl.addEventListener("click", function (e) {
        var session = currentSession();
        if (!session) return;

        var modeBtn = e.target.closest('[data-action="set-mode"]');
        if (modeBtn) {
          var ex = findExerciseInSession(session, modeBtn.getAttribute("data-exercise-id"));
          if (ex) {
            Core.setExerciseMode(ex, modeBtn.getAttribute("data-mode"));
            persist();
            renderExercises(session);
          }
          return;
        }

        var addSet = e.target.closest('[data-action="add-set"]');
        if (addSet) {
          var exAdd = findExerciseInSession(session, addSet.getAttribute("data-exercise-id"));
          if (exAdd) {
            Core.addSet(exAdd);
            persist();
            renderExercises(session);
          }
          return;
        }

        var rmSet = e.target.closest('[data-action="remove-set"]');
        if (rmSet) {
          var setId = rmSet.getAttribute("data-set-id");
          session.exercises.forEach(function (ex) {
            Core.removeSet(ex, setId);
          });
          persist();
          renderExercises(session);
          return;
        }

        var rmEx = e.target.closest('[data-action="remove-exercise"]');
        if (rmEx) {
          Core.removeExercise(session, rmEx.getAttribute("data-exercise-id"));
          persist();
          renderExercises(session);
        }
      });

      exercisesEl.addEventListener("input", function (e) {
        var session = currentSession();
        if (!session) return;

        var uniformInput = e.target.closest("input[data-exercise-id][data-field]");
        if (uniformInput) {
          var exId = uniformInput.getAttribute("data-exercise-id");
          var exU = findExerciseInSession(session, exId);
          if (exU) {
            exU[uniformInput.getAttribute("data-field")] = uniformInput.value;
            Core.normalizeExercise(exU);
            Core.touchSession(session);
            scheduleExerciseFieldSave(session);
            refreshExerciseRmBlock(exId);
          }
          return;
        }

        var input = e.target.closest("input[data-field][data-set-id]");
        if (!input) return;
        var setId = input.getAttribute("data-set-id");
        var field = input.getAttribute("data-field");
        var ownerExId = null;
        session.exercises.forEach(function (ex) {
          (ex.sets || []).forEach(function (set) {
            if (set.id !== setId) return;
            set[field] = input.value;
            ownerExId = ex.id;
          });
        });
        Core.touchSession(session);
        scheduleExerciseFieldSave(session);
        if (ownerExId) refreshExerciseRmBlock(ownerExId);
      });

      exercisesEl.addEventListener("change", function (e) {
        var session = currentSession();
        if (!session) return;
        if (!e.target.closest("input[data-field]")) return;
        if (exerciseFieldSaveTimer) clearTimeout(exerciseFieldSaveTimer);
        persist();
        renderSessionSummary(session);
        updateSessionAccordions(session);
      });
    }

    [titleInput, dateInput, notesInput].forEach(function (el) {
      if (!el) return;
      el.addEventListener("change", function () {
        syncSessionFieldsFromInputs();
        renderSessionsList();
      });
    });

    var rmRecordedEl = document.getElementById("journal-rm-recorded");
    if (rmRecordedEl) {
      rmRecordedEl.addEventListener("click", function (e) {
        var btn = e.target.closest('[data-action="delete-rm"]');
        if (!btn) return;
        var name = btn.getAttribute("data-rm-name");
        if (!confirm("Retirer le max enregistré pour « " + name + " » ?")) return;
        Core.deleteRecordedMax(state, name);
        persist();
        renderRmSection();
      });
    }

    var rmFormulaEl = document.getElementById("journal-rm-formula");
    if (rmFormulaEl) {
      rmFormulaEl.addEventListener("change", function () {
        var checked = rmFormulaEl.querySelector('input[name="rm-formula"]:checked');
        Core.setRmFormula(state, checked ? checked.value : "epley");
        persist();
        renderRmSection();
        var session = currentSession();
        if (session) renderExercises(session);
      });
    }

    var btnSaveRm = document.getElementById("journal-btn-save-rm");
    if (btnSaveRm) {
      btnSaveRm.addEventListener("click", function () {
        var nameEl = document.getElementById("journal-rm-exercise");
        var kgEl = document.getElementById("journal-rm-kg");
        if (!nameEl || !kgEl) return;
        var entry = Core.setRecordedMax(state, nameEl.value, kgEl.value);
        if (!entry) {
          alert("Indiquez un exercice et un poids (kg) valide.");
          return;
        }
        persist();
        nameEl.value = "";
        kgEl.value = "";
        renderRmSection();
      });
    }
  }

  function boot() {
    bindDomRefs();
    refreshState();
    bindListeners();
    chargerEleveMeta();
    showList();
  }

  window.addEventListener("pageshow", function () {
    bindDomRefs();
    chargerEleveMeta();
    refreshState();
    if (!currentSessionId) showList();
    else showSession(currentSessionId);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
