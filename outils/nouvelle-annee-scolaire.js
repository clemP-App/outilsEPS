(function () {
  "use strict";

  var CAHIER_PARAM_ID = "cahier-texte-data";
  var CAHIER_ARCHIVE_PREFIX = "cahier-texte-archive__";

  var msgEl = document.getElementById("annee-msg");
  var okEl = document.getElementById("annee-ok");
  var impactEl = document.getElementById("annee-impact-lists");
  var archiveCheckEl = document.getElementById("annee-archivage-check");
  var presetHintEl = document.getElementById("annee-preset-hint");
  var backupDone = false;

  var currentPreset = "equilibre";
  var snapshot = null;

  function showError(text) {
    if (!msgEl) return;
    msgEl.hidden = !text;
    msgEl.textContent = text || "";
    if (text && okEl) okEl.hidden = true;
  }

  function showOk(text) {
    if (!okEl) return;
    okEl.hidden = !text;
    okEl.textContent = text || "";
    if (text) {
      showError("");
      setTimeout(function () {
        okEl.hidden = true;
      }, 5000);
    }
  }

  function formatDatePart(n) {
    return String(n).padStart(2, "0");
  }

  function backupFilenameWithDate() {
    var d = new Date();
    var y = d.getFullYear();
    var m = formatDatePart(d.getMonth() + 1);
    var day = formatDatePart(d.getDate());
    var hh = formatDatePart(d.getHours());
    var mm = formatDatePart(d.getMinutes());
    return "outilsEPS-backup-" + y + "-" + m + "-" + day + "_" + hh + "-" + mm + ".json";
  }

  function downloadJson(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 0);
  }

  function setFlowLocked(locked) {
    var gatedSections = document.querySelectorAll(".annee-after-backup");
    gatedSections.forEach(function (section) {
      section.hidden = !!locked;
    });
    document.querySelectorAll(".annee-preset").forEach(function (btn) {
      btn.disabled = locked;
    });
    document.querySelectorAll('.annee-grid input[type="radio"]').forEach(function (input) {
      input.disabled = locked;
    });
    var applyBtn = document.getElementById("btn-annee-apply");
    if (applyBtn) applyBtn.disabled = locked;
    if (locked) {
      presetHintEl.textContent =
        "Étape obligatoire : exportez d’abord une sauvegarde avant de continuer.";
    } else if (currentPreset !== "personnalise") {
      applyPreset(currentPreset);
    }
  }

  function setRadio(name, value) {
    var sel = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (sel) sel.checked = true;
  }

  function getRadio(name, fallback) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : fallback;
  }

  function applyPreset(mode) {
    currentPreset = mode;
    if (mode === "prudent") {
      setRadio("classes-action", "archive");
      setRadio("dispenses-action", "archive");
      setRadio("oublis-action", "archive");
      setRadio("sessions-action", "archive");
      setRadio("cahier-action", "archive");
      presetHintEl.textContent =
        "Mode prudent : archive les données pour repartir proprement sans suppression définitive.";
    } else if (mode === "reset") {
      setRadio("classes-action", "delete");
      setRadio("dispenses-action", "delete");
      setRadio("oublis-action", "delete");
      setRadio("sessions-action", "delete");
      setRadio("cahier-action", "delete");
      presetHintEl.textContent =
        "Mode remise à zéro : supprime toutes les données de l’année sur ces blocs.";
    } else if (mode === "equilibre") {
      setRadio("classes-action", "delete");
      setRadio("dispenses-action", "delete");
      setRadio("oublis-action", "delete");
      setRadio("sessions-action", "archive");
      setRadio("cahier-action", "archive");
      presetHintEl.textContent =
        "Mode équilibré : supprime classes/dispenses/oublis et archive séances + cahier de texte.";
    } else {
      presetHintEl.textContent = "Mode personnalisé : ajustez chaque règle.";
    }
    updateImpact();
    updatePresetButtons();
  }

  function updatePresetButtons() {
    var buttons = document.querySelectorAll(".annee-preset");
    buttons.forEach(function (btn) {
      var selected = btn.getAttribute("data-preset") === currentPreset;
      btn.classList.toggle("btn--primary", selected);
      btn.classList.toggle("btn--ghost", !selected);
    });
  }

  function getActions() {
    return {
      classes: getRadio("classes-action", "delete"),
      dispenses: getRadio("dispenses-action", "delete"),
      oublis: getRadio("oublis-action", "delete"),
      sessions: getRadio("sessions-action", "archive"),
      cahier: getRadio("cahier-action", "archive"),
    };
  }

  function itemLabel(name, n) {
    return n + " " + name + (n > 1 ? "s" : "");
  }

  function li(text) {
    var el = document.createElement("li");
    el.textContent = text;
    return el;
  }

  function pluralize(singular, plural, count) {
    return count > 1 ? plural : singular;
  }

  function buildImpactSummary(data, actions) {
    var toDelete = [];
    var toArchive = [];
    var toKeep = [];

    if (actions.classes === "delete") {
      toDelete.push(itemLabel("classe", data.classes.length));
      toDelete.push(itemLabel("élève", data.eleves.length));
    } else if (actions.classes === "archive") {
      toArchive.push(itemLabel("classe", data.classes.length));
      toArchive.push(itemLabel("élève", data.eleves.length));
    } else {
      toKeep.push(itemLabel("classe", data.classes.length));
      toKeep.push(itemLabel("élève", data.eleves.length));
    }

    if (actions.dispenses === "delete") toDelete.push(itemLabel("dispense", data.dispenses.length));
    else if (actions.dispenses === "archive")
      toArchive.push(itemLabel("dispense", data.dispenses.length));
    else toKeep.push(itemLabel("dispense", data.dispenses.length));

    if (actions.oublis === "delete")
      toDelete.push(itemLabel("oubli de matériel", data.oublisMateriel.length));
    else if (actions.oublis === "archive")
      toArchive.push(itemLabel("oubli de matériel", data.oublisMateriel.length));
    else toKeep.push(itemLabel("oubli de matériel", data.oublisMateriel.length));

    var sessionsActives = data.sessions.filter(function (s) {
      return s && !s.archived;
    });
    var sessionsArchives = data.sessions.filter(function (s) {
      return s && s.archived;
    });
    if (actions.sessions === "archive") {
      toArchive.push(itemLabel("séance active", sessionsActives.length));
      if (sessionsArchives.length) toKeep.push(itemLabel("séance déjà archivée", sessionsArchives.length));
    } else if (actions.sessions === "delete") {
      toDelete.push(itemLabel("séance", data.sessions.length));
    } else {
      toKeep.push(itemLabel("séance", data.sessions.length));
    }

    var cahierRec = data.cahier || null;
    var seqCount = cahierRec && Array.isArray(cahierRec.sequences) ? cahierRec.sequences.length : 0;
    var seanceCount = cahierRec && Array.isArray(cahierRec.sequences)
      ? cahierRec.sequences.reduce(function (sum, seq) {
          return sum + (Array.isArray(seq.seances) ? seq.seances.length : 0);
        }, 0)
      : 0;
    if (actions.cahier === "archive") {
      toArchive.push(itemLabel("séquence du cahier", seqCount));
      toArchive.push(itemLabel("séance du cahier", seanceCount));
    } else if (actions.cahier === "delete") {
      toDelete.push(itemLabel("séquence du cahier", seqCount));
      toDelete.push(itemLabel("séance du cahier", seanceCount));
    } else {
      toKeep.push(itemLabel("séquence du cahier", seqCount));
      toKeep.push(itemLabel("séance du cahier", seanceCount));
    }

    return {
      toDelete: toDelete,
      toArchive: toArchive,
      toKeep: toKeep,
      sessionsActives: sessionsActives,
      seqCount: seqCount,
      seanceCount: seanceCount,
    };
  }

  function buildAccordion(title, className, items, open) {
    var details = document.createElement("details");
    details.className = "annee-impact-card " + className;
    if (open) details.open = true;
    var summary = document.createElement("summary");
    summary.textContent = title;
    details.appendChild(summary);
    var ul = document.createElement("ul");
    ul.className = "annee-impact-items";
    if (!items.length) ul.appendChild(li("Aucun élément."));
    else items.forEach(function (text) { ul.appendChild(li(text)); });
    details.appendChild(ul);
    return details;
  }

  function updateImpact() {
    if (!snapshot || !impactEl) return;
    var actions = getActions();
    var summary = buildImpactSummary(snapshot, actions);
    impactEl.innerHTML = "";
    impactEl.appendChild(buildAccordion("Supprimés (" + summary.toDelete.length + ")", "is-delete", summary.toDelete, true));
    impactEl.appendChild(buildAccordion("Archivés (" + summary.toArchive.length + ")", "is-archive", summary.toArchive, true));
    impactEl.appendChild(buildAccordion("Conservés (" + summary.toKeep.length + ")", "is-keep", summary.toKeep, false));
  }

  function buildArchiveCoverage(data) {
    if (!archiveCheckEl) return;
    archiveCheckEl.innerHTML = "";
    var toolLabels = (window.SessionsCore && SessionsCore.TOOL_LABELS) || {};
    var ids = (window.SessionsCore && SessionsCore.SESSION_TOOL_IDS) || [];
    ids.forEach(function (toolId) {
      var label = toolLabels[toolId] || toolId;
      var total = data.sessions.filter(function (s) {
        return s && s.toolId === toolId;
      }).length;
      var active = data.sessions.filter(function (s) {
        return s && s.toolId === toolId && !s.archived;
      }).length;
      var tr = document.createElement("tr");
      tr.className = "annee-archive-row";

      var tdTool = document.createElement("td");
      tdTool.className = "annee-archive-tool";
      tdTool.textContent = label;

      var tdActive = document.createElement("td");
      tdActive.className = "annee-archive-number";
      tdActive.textContent = String(active);

      var tdTotal = document.createElement("td");
      tdTotal.className = "annee-archive-number";
      tdTotal.textContent = String(total);

      tr.appendChild(tdTool);
      tr.appendChild(tdActive);
      tr.appendChild(tdTotal);
      archiveCheckEl.appendChild(tr);
    });
  }

  function fetchSnapshot() {
    return Promise.all([
      DataManager.getAll("classes"),
      DataManager.getAll("eleves"),
      DataManager.getAll("dispenses"),
      DataManager.getAll("oublisMateriel"),
      DataManager.getAll("sessions"),
      DataManager.getParametre(CAHIER_PARAM_ID),
    ]).then(function (res) {
      snapshot = {
        classes: res[0] || [],
        eleves: res[1] || [],
        dispenses: res[2] || [],
        oublisMateriel: res[3] || [],
        sessions: res[4] || [],
        cahier: res[5] || null,
      };
      updateImpact();
      buildArchiveCoverage(snapshot);
    });
  }

  function archiveCahierIfNeeded(actions) {
    if (actions.cahier !== "archive") return Promise.resolve({ archived: 0, seances: 0 });
    return DataManager.getParametre(CAHIER_PARAM_ID).then(function (rec) {
      if (!rec || !Array.isArray(rec.sequences) || !rec.sequences.length) {
        return { archived: 0, seances: 0 };
      }
      var seqCount = rec.sequences.length;
      var seanceCount = rec.sequences.reduce(function (sum, seq) {
        return sum + (Array.isArray(seq.seances) ? seq.seances.length : 0);
      }, 0);
      var stamp = new Date().toISOString();
      var archiveId = CAHIER_ARCHIVE_PREFIX + stamp;
      return DataManager.saveParametre({
        id: archiveId,
        type: "cahier-texte-archive",
        archivedAt: stamp,
        sourceId: CAHIER_PARAM_ID,
        sequences: rec.sequences,
      }).then(function () {
        return DataManager.saveParametre({
          id: CAHIER_PARAM_ID,
          sequences: [],
          updatedAt: stamp,
        });
      }).then(function () {
        return { archived: seqCount, seances: seanceCount };
      });
    });
  }

  function archiveStoreAndClear(storeName, archiveKind, stamp) {
    return DataManager.getAll(storeName).then(function (items) {
      if (!items || !items.length) return 0;
      return DataManager.saveParametre({
        id: "archive__" + archiveKind + "__" + stamp,
        type: "archive",
        kind: archiveKind,
        archivedAt: stamp,
        items: items,
      }).then(function () {
        return DataManager.clearStore(storeName).then(function () {
          return items.length;
        });
      });
    });
  }

  function archiveClassesIfNeeded(actions) {
    if (actions.classes !== "archive") return Promise.resolve(0);
    return DataManager.getClasses({ includeArchived: true }).then(function (classes) {
      var active = (classes || []).filter(function (c) {
        return c && !c.archived;
      });
      if (!active.length) return 0;
      return Promise.all(
        active.map(function (c) {
          return DataManager.setClasseArchived(c.id, true);
        })
      ).then(function () {
        var elevesCount = active.reduce(function (sum, c) {
          return sum + ((c && c.eleves && c.eleves.length) || 0);
        }, 0);
        return active.length + elevesCount;
      });
    });
  }

  function archiveDispensesIfNeeded(actions) {
    if (actions.dispenses !== "archive") return Promise.resolve(0);
    var stamp = new Date().toISOString();
    return archiveStoreAndClear("dispenses", "dispenses", stamp).then(function (n) {
      return DataManager.deleteParametre("dispenses-masquer-terminees").then(function () {
        return n;
      });
    });
  }

  function archiveOublisIfNeeded(actions) {
    if (actions.oublis !== "archive") return Promise.resolve(0);
    return archiveStoreAndClear("oublisMateriel", "oublis-materiel", new Date().toISOString());
  }

  function archiveSessionsIfNeeded(actions) {
    if (actions.sessions !== "archive") return Promise.resolve(0);
    return DataManager.getAll("sessions").then(function (sessions) {
      var active = (sessions || []).filter(function (s) {
        return s && !s.archived;
      });
      if (!active.length) return 0;
      return Promise.all(
        active.map(function (s) {
          return DataManager.setSessionArchived(s.id, true);
        })
      ).then(function () {
        return active.length;
      });
    });
  }

  function deleteSessionsIfNeeded(actions) {
    if (actions.sessions !== "delete") return Promise.resolve(0);
    return DataManager.getAll("sessions").then(function (sessions) {
      var list = sessions || [];
      if (!list.length) return 0;
      return Promise.all(
        list.map(function (s) {
          return DataManager.deleteSession(s.id);
        })
      ).then(function () {
        return list.length;
      });
    });
  }

  function clearIfDelete(actions) {
    var ops = [];
    if (actions.classes === "delete") {
      ops.push(DataManager.clearStore("classes"));
      ops.push(DataManager.clearStore("eleves"));
    }
    if (actions.dispenses === "delete") {
      ops.push(DataManager.clearStore("dispenses"));
      ops.push(DataManager.deleteParametre("dispenses-masquer-terminees"));
    }
    if (actions.oublis === "delete") {
      ops.push(DataManager.clearStore("oublisMateriel"));
    }
    if (actions.cahier === "delete") {
      ops.push(DataManager.deleteParametre(CAHIER_PARAM_ID));
    }
    return Promise.all(ops);
  }

  function runTransition() {
    if (!backupDone) {
      showError("Sauvegarde obligatoire : exportez d’abord une sauvegarde pour continuer.");
      return;
    }
    var actions = getActions();
    var summary = buildImpactSummary(snapshot, actions);
    var confirmMsg =
      "Confirmer le passage à la nouvelle année ?\n\n" +
      "- Supprimés : " + summary.toDelete.join(", ") + "\n" +
      "- Archivés : " + summary.toArchive.join(", ") + "\n" +
      "- Conservés : " + summary.toKeep.join(", ");
    if (!confirm(confirmMsg)) return;
    showError("");

    Promise.resolve()
      .then(function () {
        return clearIfDelete(actions);
      })
      .then(function () {
        return Promise.all([
          archiveClassesIfNeeded(actions),
          archiveDispensesIfNeeded(actions),
          archiveOublisIfNeeded(actions),
          archiveSessionsIfNeeded(actions),
          archiveCahierIfNeeded(actions),
          deleteSessionsIfNeeded(actions),
        ]);
      })
      .then(function (res) {
        var archivedClasses = res[0];
        var archivedDispenses = res[1];
        var archivedOublis = res[2];
        var archivedSessions = res[3];
        var archivedCahier = res[4];
        showOk(
          "Transition terminée. " +
            archivedClasses +
            " élément(s) classes/élèves archivé(s), " +
            archivedDispenses +
            " dispense(s) archivée(s), " +
            archivedOublis +
            " oubli(s) archivé(s), " +
            archivedSessions +
            " séance(s) archivée(s), " +
            archivedCahier.archived +
            " séquence(s) de cahier archivée(s)."
        );
        return fetchSnapshot().then(function () {
          setTimeout(function () {
            window.location.href = "../index.html";
          }, 900);
        });
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : "Transition impossible.");
      });
  }

  function bindEvents() {
    var exportBtn = document.getElementById("btn-annee-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        showError("");
        DataManager.exportAllData()
          .then(function (data) {
            var filename = backupFilenameWithDate();
            downloadJson(data, filename);
            backupDone = true;
            setFlowLocked(false);
            showOk("Sauvegarde exportée : " + filename);
          })
          .catch(function (e) {
            showError(e && e.message ? e.message : "Export impossible.");
          });
      });
    }

    var applyBtn = document.getElementById("btn-annee-apply");
    if (applyBtn) applyBtn.addEventListener("click", runTransition);

    document.querySelectorAll(".annee-preset").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyPreset(btn.getAttribute("data-preset"));
      });
    });

    document.querySelectorAll('.annee-grid input[type="radio"]').forEach(function (input) {
      input.addEventListener("change", function () {
        currentPreset = "personnalise";
        updatePresetButtons();
        updateImpact();
      });
    });
  }

  function init() {
    DataManager.ready
      .then(function () {
        bindEvents();
        applyPreset("equilibre");
        setFlowLocked(true);
        return fetchSnapshot();
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : "Chargement impossible.");
      });
  }

  init();
})();
