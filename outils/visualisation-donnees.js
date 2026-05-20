/**
 * Visualisation des imports élèves (QR).
 */
(function () {
  "use strict";

  var listEl = document.getElementById("viz-list");
  var emptyEl = document.getElementById("viz-empty");
  var countEl = document.getElementById("viz-count");
  var detailCard = document.getElementById("viz-detail-card");
  var detailEl = document.getElementById("viz-detail");
  var msgEl = document.getElementById("viz-msg");
  var okEl = document.getElementById("viz-ok");
  var toolEl = document.getElementById("viz-tool");
  var classeEl = document.getElementById("viz-classe");
  var groupeEl = document.getElementById("viz-groupe");
  var dateFromEl = document.getElementById("viz-date-from");
  var dateToEl = document.getElementById("viz-date-to");
  var btnApply = document.getElementById("viz-apply");
  var btnExport = document.getElementById("viz-export-json");
  var btnClear = document.getElementById("viz-clear-filtered");
  var btnDeleteOne = document.getElementById("viz-delete-one");

  var records = [];
  var selectedId = null;

  function showMsg(text, isOk) {
    if (msgEl) {
      msgEl.hidden = !text || isOk;
      msgEl.textContent = isOk ? "" : text || "";
    }
    if (okEl) {
      okEl.hidden = !text || !isOk;
      okEl.textContent = isOk ? text || "" : "";
    }
  }

  function readFilters() {
    var f = {};
    if (toolEl && toolEl.value) f.toolId = toolEl.value;
    if (classeEl && classeEl.value.trim()) f.classeLabel = classeEl.value.trim();
    if (groupeEl && groupeEl.value.trim()) f.groupeLabel = groupeEl.value.trim();
    if (dateFromEl && dateFromEl.value) f.dateFrom = dateFromEl.value;
    if (dateToEl && dateToEl.value) f.dateTo = dateToEl.value + "T23:59:59";
    return f;
  }

  function summaryLine(rec) {
    var tool =
      typeof QrExchangeCore !== "undefined"
        ? QrExchangeCore.toolTitle(rec.toolId)
        : rec.toolId;
    var parts = [tool];
    if (rec.classeLabel) parts.push(rec.classeLabel);
    if (rec.auteurLabel) parts.push(rec.auteurLabel);
    var d = rec.importedAt || rec.createdAt;
    if (d) parts.push(new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }));
    return parts.join(" · ");
  }

  function selectRecord(id) {
    selectedId = id;
    var rec = records.find(function (r) {
      return r.id === id;
    });
    if (!rec) {
      if (detailCard) detailCard.hidden = true;
      return;
    }
    if (detailCard) detailCard.hidden = false;
    if (typeof ImportDetailRender !== "undefined") {
      ImportDetailRender.render(rec, detailEl);
    }
    listEl.querySelectorAll(".viz-list__item").forEach(function (li) {
      li.classList.toggle("is-selected", li.getAttribute("data-id") === id);
    });
  }

  function renderList() {
    if (!listEl) return;
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(listEl);
    } else {
      listEl.innerHTML = "";
    }

    if (countEl) countEl.textContent = records.length ? "(" + records.length + ")" : "";

    if (!records.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (detailCard) detailCard.hidden = true;
      selectedId = null;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    records.forEach(function (rec) {
      var li = document.createElement("li");
      li.className = "viz-list__item";
      li.setAttribute("data-id", rec.id);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "viz-list__btn";
      btn.textContent = summaryLine(rec);
      btn.addEventListener("click", function () {
        selectRecord(rec.id);
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });

    if (selectedId && records.some(function (r) { return r.id === selectedId; })) {
      selectRecord(selectedId);
    } else if (records[0]) {
      selectRecord(records[0].id);
    }
  }

  function refresh() {
    if (typeof DataManager === "undefined") {
      showMsg("DataManager indisponible.", false);
      return;
    }
    DataManager.ready
      .then(function () {
        return DataManager.getImportedRecords(readFilters());
      })
      .then(function (list) {
        records = list || [];
        renderList();
        showMsg("", false);
      })
      .catch(function (e) {
        showMsg(e.message || "Erreur de chargement.", false);
      });
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

  if (btnApply) btnApply.addEventListener("click", refresh);

  if (btnExport) {
    btnExport.addEventListener("click", function () {
      DataManager.getImportedRecords(readFilters())
        .then(function (list) {
          return downloadJson(
            {
              metadata: {
                app: "OutilsEPS",
                kind: "imports-eleves-filtered",
                exportedAt: new Date().toISOString(),
              },
              importsEleves: list,
            },
            "outilsEPS-imports-eleves.json"
          );
        })
        .catch(function (e) {
          showMsg(e.message, false);
        });
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", function () {
      var f = readFilters();
      var hasFilter = f.toolId || f.classeLabel || f.groupeLabel || f.dateFrom || f.dateTo;
      if (
        !confirm(
          hasFilter
            ? "Supprimer tous les imports correspondant aux filtres actuels ?"
            : "Supprimer TOUS les imports enregistrés ?"
        )
      ) {
        return;
      }
      DataManager.clearImportedRecords(hasFilter ? f : undefined)
        .then(function () {
          selectedId = null;
          showMsg("Imports supprimés.", true);
          refresh();
        })
        .catch(function (e) {
          showMsg(e.message, false);
        });
    });
  }

  if (btnDeleteOne) {
    btnDeleteOne.addEventListener("click", function () {
      if (!selectedId) return;
      if (!confirm("Supprimer cet import ?")) return;
      DataManager.deleteImportedRecord(selectedId)
        .then(function () {
          selectedId = null;
          showMsg("Import supprimé.", true);
          refresh();
        })
        .catch(function (e) {
          showMsg(e.message, false);
        });
    });
  }

  [toolEl, classeEl, groupeEl, dateFromEl, dateToEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("change", refresh);
  });

  refresh();
})();
