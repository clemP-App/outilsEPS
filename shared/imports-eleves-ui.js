/**
 * UI imports élèves (scan QR + tableau + détail).
 */
var ImportsElevesUI = (function () {
  "use strict";

  var scanner = null;
  var scanning = false;
  var lastScanned = "";
  var lastScanAt = 0;
  var records = [];
  var selectedId = null;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function showMsg(text, isOk) {
    if (els.msg) {
      els.msg.hidden = !text || isOk;
      els.msg.textContent = isOk ? "" : text || "";
    }
    if (els.ok) {
      els.ok.hidden = !text || !isOk;
      els.ok.textContent = isOk ? text || "" : "";
    }
  }

  function getSelectedToolId() {
    return els.tool && els.tool.value ? els.tool.value : "";
  }

  function setToolFilter(toolId) {
    if (!els.tool || !toolId) return;
    var found = false;
    for (var i = 0; i < els.tool.options.length; i++) {
      if (els.tool.options[i].value === toolId) {
        found = true;
        break;
      }
    }
    if (found) els.tool.value = toolId;
  }

  function importRecord(record) {
    return DataManager.ready
      .then(function () {
        return DataManager.hasImportedRecord(record.exportId);
      })
      .then(function (exists) {
        if (
          exists &&
          !confirm(
            "Cet export a déjà été importé (même identifiant). Réimporter quand même ?"
          )
        ) {
          showMsg("Import annulé (doublon).", false);
          return null;
        }
        return DataManager.saveImportedRecord({
          exportId: record.exportId,
          toolId: record.toolId,
          createdAt: record.createdAt,
          classeLabel: record.classeLabel,
          auteurLabel: record.auteurLabel,
          checksum: record.checksum,
          payload: record.payload,
        });
      })
      .then(function (saved) {
        if (!saved) return;
        var title =
          typeof QrExchangeCore !== "undefined"
            ? QrExchangeCore.toolTitle(saved.toolId)
            : saved.toolId;
        showMsg("Import enregistré — " + title + ".", true);
        setToolFilter(saved.toolId);
        refreshList(saved.id);
        if (typeof ImportEleveAssociate !== "undefined") {
          return ImportEleveAssociate.maybePromptAfterImport(saved, {
            onSaved: function (result) {
              if (result && result.updatedRecord) mergeRecordUpdate(saved, result.updatedRecord);
              showMsg("Association enregistrée — " + title + ".", true);
              refreshList(saved.id);
            },
          }).then(function () {
            updateAssociateButton(saved);
          });
        }
      })
      .catch(function (e) {
        var msg = e.message || "Erreur lors de l’import.";
        if (typeof DataManager !== "undefined" && DataManager.storageErrorMessage && e) {
          msg = DataManager.storageErrorMessage(e);
        }
        showMsg(msg, false);
      });
  }

  function handleRawQr(text) {
    if (!text || typeof QrExchangeCore === "undefined") return;
    var now = Date.now();
    if (text === lastScanned && now - lastScanAt < 3000) return;
    lastScanned = text;
    lastScanAt = now;
    var parsed = QrExchangeCore.parseQrUrl(text);
    if (parsed.error) {
      showMsg(parsed.error, false);
      return;
    }
    importRecord(parsed.record);
  }

  function stopScanner() {
    if (!scanner || !scanning) return Promise.resolve();
    return scanner
      .stop()
      .then(function () {
        scanning = false;
        if (els.btnStart) els.btnStart.hidden = false;
        if (els.btnStop) els.btnStop.hidden = true;
      })
      .catch(function () {
        scanning = false;
        if (els.btnStart) els.btnStart.hidden = false;
        if (els.btnStop) els.btnStop.hidden = true;
      });
  }

  function startScanner() {
    if (typeof Html5Qrcode === "undefined") {
      showMsg("Scanner QR indisponible.", false);
      return;
    }
    showMsg("", false);
    if (!scanner) scanner = new Html5Qrcode(els.readerId);
    if (scanning) return;
    var config = { fps: 8, qrbox: { width: 260, height: 260 } };
    Html5Qrcode.getCameras()
      .then(function (cameras) {
        if (!cameras || !cameras.length) throw new Error("Aucune caméra détectée.");
        var back = cameras.find(function (c) {
          return /back|rear|arrière|environment/i.test(c.label || "");
        });
        var camId = (back || cameras[cameras.length - 1]).id;
        return scanner.start(camId, config, handleRawQr, function () {});
      })
      .then(function () {
        scanning = true;
        if (els.btnStart) els.btnStart.hidden = true;
        if (els.btnStop) els.btnStop.hidden = false;
      })
      .catch(function (e) {
        showMsg(
          e.message || "Impossible d’accéder à la caméra. Utilisez le collage manuel.",
          false
        );
      });
  }

  function readFilters() {
    var toolId = getSelectedToolId();
    if (!toolId) return null;
    var f = { toolId: toolId };
    if (els.classe && els.classe.value.trim()) f.classeLabel = els.classe.value.trim();
    if (els.participant && els.participant.value.trim()) {
      f.auteurLabel = els.participant.value.trim();
    }
    if (els.dateFrom && els.dateFrom.value) f.dateFrom = els.dateFrom.value;
    if (els.dateTo && els.dateTo.value) f.dateTo = els.dateTo.value + "T23:59:59";
    return f;
  }

  function mergeRecordUpdate(rec, patch) {
    if (!rec || !patch) return rec;
    Object.keys(patch).forEach(function (k) {
      rec[k] = patch[k];
    });
    return rec;
  }

  function updateAssociateButton(rec) {
    if (!els.btnAssociate) return;
    if (!rec) {
      els.btnAssociate.hidden = true;
      return;
    }
    var isTeam =
      typeof SyntheseIdentity !== "undefined" && SyntheseIdentity.isTeamImportTool(rec.toolId);
    var isDual =
      typeof SyntheseIdentity !== "undefined" && SyntheseIdentity.isDualPlayerImportTool(rec.toolId);
    els.btnAssociate.hidden = false;
    if (isTeam) {
      els.btnAssociate.textContent = "Associer à une classe…";
      return;
    }
    if (isDual) {
      els.btnAssociate.textContent = "Associer les joueurs…";
      if (typeof ImportEleveAssociate !== "undefined") {
        ImportEleveAssociate.loadContext().then(function (ctx) {
          var needs = ImportEleveAssociate.recordNeedsAssociation(rec, ctx);
          els.btnAssociate.textContent = needs ? "Associer les joueurs…" : "Modifier les associations…";
        });
      }
      return;
    }
    if (typeof ImportEleveAssociate === "undefined") {
      els.btnAssociate.textContent = "Associer…";
      return;
    }
    ImportEleveAssociate.loadContext().then(function (ctx) {
      var needs = ImportEleveAssociate.recordNeedsAssociation(rec, ctx);
      els.btnAssociate.textContent = needs ? "Associer à un élève…" : "Modifier l’association…";
    });
  }

  function selectRecord(id) {
    selectedId = id;
    var rec = records.find(function (r) {
      return r.id === id;
    });
    if (!rec) {
      if (els.detailCard) els.detailCard.hidden = true;
      return;
    }
    if (els.detailCard) els.detailCard.hidden = false;
    if (typeof ImportDetailRender !== "undefined") {
      ImportDetailRender.render(rec, els.detail);
    }
    if (els.tableBody) {
      els.tableBody.querySelectorAll("tr").forEach(function (tr) {
        tr.classList.toggle("is-selected", tr.getAttribute("data-id") === id);
      });
    }
    updateAssociateButton(rec);
  }

  function clearTable() {
    if (els.tableHead) els.tableHead.innerHTML = "";
    if (els.tableBody) els.tableBody.innerHTML = "";
  }

  function renderTable() {
    var toolId = getSelectedToolId();
    if (els.count) {
      els.count.textContent =
        toolId && records.length ? "(" + records.length + ")" : "";
    }

    if (!toolId) {
      if (els.pickTool) els.pickTool.hidden = false;
      if (els.tableWrap) els.tableWrap.hidden = true;
      if (els.empty) els.empty.hidden = true;
      if (els.detailCard) els.detailCard.hidden = true;
      clearTable();
      selectedId = null;
      return;
    }

    if (els.pickTool) els.pickTool.hidden = true;

    if (!records.length) {
      if (els.tableWrap) els.tableWrap.hidden = true;
      if (els.empty) els.empty.hidden = false;
      if (els.detailCard) els.detailCard.hidden = true;
      clearTable();
      selectedId = null;
      return;
    }

    if (els.empty) els.empty.hidden = true;
    if (els.tableWrap) els.tableWrap.hidden = false;

    if (typeof ImportsElevesExport === "undefined") return;
    var model = ImportsElevesExport.buildTableModel(toolId, records);

    if (els.tableHead) {
      els.tableHead.innerHTML = "";
      var headTr = document.createElement("tr");
      model.headers.forEach(function (h) {
        var th = document.createElement("th");
        th.scope = "col";
        th.textContent = h;
        headTr.appendChild(th);
      });
      els.tableHead.appendChild(headTr);
    }

    if (els.tableBody) {
      els.tableBody.innerHTML = "";
      model.rows.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.setAttribute("data-id", row.id);
        tr.tabIndex = 0;
        row.cells.forEach(function (cell) {
          var td = document.createElement("td");
          td.textContent = cell;
          tr.appendChild(td);
        });
        tr.addEventListener("click", function () {
          selectRecord(row.id);
        });
        tr.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectRecord(row.id);
          }
        });
        els.tableBody.appendChild(tr);
      });
    }

    if (selectedId && records.some(function (r) { return r.id === selectedId; })) {
      selectRecord(selectedId);
    } else if (records[0]) {
      selectRecord(records[0].id);
    }
  }

  function refreshList(forceSelectId) {
    var filters = readFilters();
    if (!filters) {
      records = [];
      renderTable();
      return Promise.resolve();
    }
    return DataManager.getImportedRecords(filters)
      .then(function (list) {
        records = list || [];
        if (forceSelectId) selectedId = forceSelectId;
        renderTable();
        if (forceSelectId && els.detailCard) {
          els.detailCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      })
      .catch(function (e) {
        showMsg(e.message || "Erreur de chargement.", false);
      });
  }

  function exportFilename(ext) {
    var d = new Date();
    var stamp =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    var tool = getSelectedToolId() || "imports";
    return "outilsEPS-" + tool + "-" + stamp + "." + ext;
  }

  function hasSecondaryFilters() {
    var f = readFilters();
    if (!f) return false;
    return !!(f.classeLabel || f.auteurLabel || f.dateFrom || f.dateTo);
  }

  function shouldWarnLargeExport(list) {
    return (list || []).length > 20 && !hasSecondaryFilters();
  }

  function confirmExport(list, label) {
    if (!getSelectedToolId()) {
      showMsg("Choisissez d’abord un outil.", false);
      return false;
    }
    if (!list || !list.length) {
      showMsg("Aucune donnée à exporter pour ces filtres.", false);
      return false;
    }
    if (shouldWarnLargeExport(list)) {
      return confirm(
        list.length +
          " lignes seront exportées.\n\nConseil : filtrez par classe, joueur ou date pour un fichier plus court.\n\nContinuer l'export " +
          label +
          " ?"
      );
    }
    return true;
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 0);
  }

  function exportCsv(list) {
    var toolId = getSelectedToolId();
    if (typeof ImportsElevesExport === "undefined" || !toolId) {
      showMsg("Module d'export indisponible.", false);
      return;
    }
    var csv = ImportsElevesExport.buildCsv(toolId, list);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      exportFilename("csv")
    );
    showMsg("Export Excel (CSV) téléchargé.", true);
  }

  function exportPdf(list) {
    var toolId = getSelectedToolId();
    if (typeof ImportsElevesExport === "undefined" || !toolId) {
      showMsg("Module d'export indisponible.", false);
      return;
    }
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      showMsg("Impossible de charger jsPDF. Réessayez ou exportez en CSV.", false);
      return;
    }
    var entries = ImportsElevesExport.buildPdf(list);
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    var margin = 12;
    var pageH = doc.internal.pageSize.getHeight();
    var pageW = doc.internal.pageSize.getWidth();
    var maxW = pageW - 2 * margin;
    var y = margin + 4;
    var toolLabel =
      typeof QrExchangeCore !== "undefined"
        ? QrExchangeCore.toolTitle(toolId)
        : toolId;

    function newPage() {
      doc.addPage();
      y = margin + 4;
    }

    function needSpace(extra) {
      if (y + extra > pageH - margin) newPage();
    }

    function writeLines(text, fontSize, fontStyle) {
      doc.setFont("helvetica", fontStyle || "normal");
      doc.setFontSize(fontSize);
      var step = fontSize >= 12 ? 6 : 5;
      var lines = doc.splitTextToSize(String(text), maxW);
      for (var i = 0; i < lines.length; i++) {
        needSpace(step + 1);
        doc.text(lines[i], margin, y);
        y += step;
      }
    }

    doc.setTextColor(15, 118, 110);
    writeLines("Données élèves — " + toolLabel, 14, "bold");
    doc.setTextColor(100, 116, 139);
    y += 1;
    writeLines(
      new Date().toLocaleString("fr-FR") + " · " + list.length + " import(s)",
      9
    );
    doc.setTextColor(15, 23, 42);
    y += 4;

    entries.forEach(function (entry, index) {
      writeLines((index + 1) + ". " + entry.heading, 10, "bold");
      writeLines(entry.summary, 10);
      (entry.details || []).forEach(function (line) {
        writeLines("   " + line, 9);
      });
      y += 2;
    });

    try {
      downloadBlob(doc.output("blob"), exportFilename("pdf"));
      showMsg("Export PDF téléchargé.", true);
    } catch (e) {
      showMsg("Export PDF impossible. Utilisez l'export CSV.", false);
    }
  }

  function init(options) {
    options = options || {};
    els.readerId = options.readerId || "imports-reader";
    els.msg = $(options.msgId || "imports-msg");
    els.ok = $(options.okId || "imports-ok");
    els.btnStart = $(options.startId || "imports-start");
    els.btnStop = $(options.stopId || "imports-stop");
    els.paste = $(options.pasteId || "imports-paste");
    els.btnPaste = $(options.pasteBtnId || "imports-import-paste");
    els.tool = $(options.toolId || "imports-tool");
    els.classe = $(options.classeId || "imports-classe");
    els.participant = $(options.participantId || "imports-participant");
    els.dateFrom = $(options.dateFromId || "imports-date-from");
    els.dateTo = $(options.dateToId || "imports-date-to");
    els.tableWrap = $(options.tableWrapId || "imports-table-wrap");
    els.tableHead = $(options.tableHeadId || "imports-table-head");
    els.tableBody = $(options.tableBodyId || "imports-table-body");
    els.pickTool = $(options.pickToolId || "imports-pick-tool");
    els.empty = $(options.emptyId || "imports-empty");
    els.count = $(options.countId || "imports-count");
    els.detailCard = $(options.detailCardId || "imports-detail-card");
    els.detail = $(options.detailId || "imports-detail");
    els.btnApply = $(options.applyId || "imports-apply");
    els.btnExportCsv = $(options.exportCsvId || "imports-export-csv");
    els.btnExportPdf = $(options.exportPdfId || "imports-export-pdf");
    els.btnClear = $(options.clearId || "imports-clear-filtered");
    els.btnDeleteOne = $(options.deleteOneId || "imports-delete-one");
    els.btnAssociate = $(options.associateId || "imports-associate");

    if (els.btnAssociate) {
      els.btnAssociate.addEventListener("click", function () {
        if (!selectedId) return;
        var rec = records.find(function (r) {
          return r.id === selectedId;
        });
        if (!rec || typeof ImportEleveAssociate === "undefined") return;
        ImportEleveAssociate.showAssociateForRecord(rec, {
          onSaved: function (result) {
            if (result && result.updatedRecord) {
              mergeRecordUpdate(rec, result.updatedRecord);
            }
            showMsg("Association enregistrée.", true);
            refreshList(selectedId);
          },
        });
      });
    }

    if (els.btnStart) els.btnStart.addEventListener("click", startScanner);
    if (els.btnStop) els.btnStop.addEventListener("click", stopScanner);
    if (els.btnPaste) {
      els.btnPaste.addEventListener("click", function () {
        var text = els.paste && els.paste.value ? els.paste.value.trim() : "";
        if (!text) {
          showMsg("Collez d’abord le lien outilseps://…", false);
          return;
        }
        handleRawQr(text);
      });
    }
    if (els.btnApply) els.btnApply.addEventListener("click", function () { refreshList(); });
    if (els.btnExportCsv) {
      els.btnExportCsv.addEventListener("click", function () {
        var filters = readFilters();
        if (!filters) {
          showMsg("Choisissez d’abord un outil.", false);
          return;
        }
        DataManager.getImportedRecords(filters).then(function (list) {
          if (!confirmExport(list, "Excel (CSV)")) return;
          exportCsv(list);
        });
      });
    }
    if (els.btnExportPdf) {
      els.btnExportPdf.addEventListener("click", function () {
        var filters = readFilters();
        if (!filters) {
          showMsg("Choisissez d’abord un outil.", false);
          return;
        }
        DataManager.getImportedRecords(filters).then(function (list) {
          if (!confirmExport(list, "PDF")) return;
          exportPdf(list);
        });
      });
    }
    if (els.btnClear) {
      els.btnClear.addEventListener("click", function () {
        var f = readFilters();
        if (!f) {
          showMsg("Choisissez d’abord un outil.", false);
          return;
        }
        var hasSecondary = f.classeLabel || f.auteurLabel || f.dateFrom || f.dateTo;
        if (
          !confirm(
            hasSecondary
              ? "Supprimer tous les imports de cet outil correspondant aux filtres actuels ?"
              : "Supprimer tous les imports de cet outil ?"
          )
        ) {
          return;
        }
        DataManager.clearImportedRecords(f).then(function () {
          selectedId = null;
          showMsg("Imports supprimés.", true);
          refreshList();
        });
      });
    }
    if (els.btnDeleteOne) {
      els.btnDeleteOne.addEventListener("click", function () {
        if (!selectedId) return;
        if (!confirm("Supprimer cet import ?")) return;
        DataManager.deleteImportedRecord(selectedId).then(function () {
          selectedId = null;
          showMsg("Import supprimé.", true);
          refreshList();
        });
      });
    }
    if (els.tool) {
      els.tool.addEventListener("change", function () {
        selectedId = null;
        refreshList();
      });
    }
    [els.classe, els.participant, els.dateFrom, els.dateTo].forEach(function (el) {
      if (!el) return;
      el.addEventListener("change", refreshList);
    });

    window.addEventListener("pagehide", stopScanner);

    if (window.location.hash === "#imports-eleves" && options.sectionEl) {
      options.sectionEl.scrollIntoView({ behavior: "smooth" });
    }

    return refreshList();
  }

  return { init: init, refreshList: refreshList, stopScanner: stopScanner };
})();

