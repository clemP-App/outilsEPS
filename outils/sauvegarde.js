/**
 * Sauvegarde et restauration — export / import JSON (IndexedDB).
 */
(function () {
  "use strict";

  var msgEl = document.getElementById("sauvegarde-msg");
  var okEl = document.getElementById("sauvegarde-ok");
  var statsEl = document.getElementById("sauvegarde-stats");

  function montrerErreur(t) {
    if (!msgEl) return;
    msgEl.hidden = !t;
    msgEl.textContent = t || "";
    if (t && okEl) okEl.hidden = true;
  }

  function montrerOk(t) {
    if (!okEl) return;
    okEl.hidden = !t;
    okEl.textContent = t || "";
    if (t) {
      montrerErreur("");
      setTimeout(function () {
        okEl.hidden = true;
      }, 4000);
    }
  }

  function renderStats() {
    if (!statsEl) return;
    Promise.all([
      DataManager.getAll("classes"),
      DataManager.getAll("eleves"),
      DataManager.getAll("dispenses"),
      DataManager.getAll("championnats"),
      DataManager.getAll("parametres"),
    ])
      .then(function (arrays) {
        var labels = ["Classes", "Élèves", "Dispenses", "Championnats", "Paramètres"];
        statsEl.innerHTML = "";
        labels.forEach(function (label, i) {
          var li = document.createElement("li");
          li.textContent = label + " : " + arrays[i].length;
          statsEl.appendChild(li);
        });
      })
      .catch(function (e) {
        montrerErreur(e.message || "Impossible de lire les statistiques.");
      });
  }

  function init() {
    return DataManager.ready
      .then(function () {
        renderStats();
      })
      .catch(function (e) {
        montrerErreur(e.message || "Base de données indisponible.");
      });
  }

  var btnExport = document.getElementById("btn-export-backup");
  if (btnExport) {
    btnExport.addEventListener("click", function () {
      montrerErreur("");
      DataManager.exportBackupFile()
        .then(function () {
          montrerOk("Sauvegarde exportée : " + DataManager.BACKUP_FILENAME);
        })
        .catch(function (e) {
          montrerErreur(e.message || "Export impossible.");
        });
    });
  }

  var btnImport = document.getElementById("btn-import-backup");
  if (btnImport) {
    btnImport.addEventListener("click", function () {
      montrerErreur("");
      DataManager.pickAndImportBackup()
        .then(function (result) {
          if (result && result.cancelled) {
            if (result.reason === "no-file") {
              montrerErreur("");
              return;
            }
            montrerErreur("Import annulé.");
            return;
          }
          if (result && result.success) {
            montrerOk("Import réussi. Les données ont été restaurées.");
            renderStats();
            setTimeout(function () {
              window.location.reload();
            }, 1200);
            return;
          }
        })
        .catch(function (e) {
          montrerErreur(e.message || "Import impossible.");
        });
    });
  }

  init();
})();
