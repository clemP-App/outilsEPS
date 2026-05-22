/**
 * Sauvegarde et restauration — export / import JSON, espace utilisé, suppression par outil.
 */
(function () {
  "use strict";

  var msgEl = document.getElementById("sauvegarde-msg");
  var okEl = document.getElementById("sauvegarde-ok");
  var stockageTotalEl = document.getElementById("stockage-total");
  var stockageListEl = document.getElementById("stockage-outils");
  var stockageVideEl = document.getElementById("stockage-vide");
  var stockageAlertEl = document.getElementById("stockage-alert");
  var stockageQuotaWrapEl = document.getElementById("stockage-quota-wrap");
  var stockageQuotaTextEl = document.getElementById("stockage-quota-text");
  var stockageQuotaBarEl = document.getElementById("stockage-quota-bar");
  var stockageQuotaFillEl = document.getElementById("stockage-quota-fill");
  var stockageQuotaHintEl = document.getElementById("stockage-quota-hint");

  var DELETE_CONFIRM = {
    "imports-eleves":
      "Supprimer tous les imports QR élèves enregistrés ?\n\nLes données saisies par les élèves ne seront plus consultables ici.\n\nCette action est irréversible.",
    classes:
      "Supprimer toutes les classes et tous les élèves ?\n\nLes autres outils qui s’appuient sur les classes ne pourront plus importer d’élèves tant que vous n’aurez pas recréé des classes.\n\nCette action est irréversible.",
    dispenses: "Supprimer toutes les dispenses / inaptitudes et leurs réglages d’affichage ?\n\nCette action est irréversible.",
    "oublis-materiel": "Supprimer tous les oublis de matériel enregistrés ?\n\nCette action est irréversible.",
    championnat: "Supprimer le championnat en cours (équipes et matchs) ?\n\nCette action est irréversible.",
    "tournoi-elimination":
      "Supprimer le tournoi éliminatoire en cours (tableau et matchs) ?\n\nCette action est irréversible.",
    "pyramide-victoires":
      "Supprimer la pyramide de victoires en cours ?\n\nCette action est irréversible.",
    composition: "Supprimer les données enregistrées de Composition équipes ?\n\nCette action est irréversible.",
    "tableau-suivi":
      "Supprimer toutes les feuilles d’appel et notes enregistrées ?\n\nCette action est irréversible.",
    radar: "Supprimer toutes les performances Radar vitesse et les réglages associés ?\n\nCette action est irréversible.",
    sessions:
      "Supprimer les séances enregistrées et les outils actifs liés (championnat, tournoi, composition…) ?\n\nLes données de ces outils peuvent devenir inaccessibles.\n\nCette action est irréversible.",
    "compteur-bonus": "Supprimer les réglages du Compteur bonus ?\n\nLes scores en cours ne sont pas conservés ailleurs.",
    "timer-hiit":
      "Supprimer les raccourcis personnalisés du Timer HIIT / Tabata ?\n\nLes raccourcis intégrés (Tabata, etc.) restent disponibles.",
    autres: "Supprimer les autres données paramétrées non reconnues ?\n\nCette action est irréversible.",
  };

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

  function renderQuotaUi(overview) {
    var est = overview.estimate;
    var level = overview.level;

    if (stockageAlertEl) {
      var alertText = DataManager.storageAlertMessage(level);
      if (alertText && level !== "ok" && level !== "unknown") {
        stockageAlertEl.hidden = false;
        stockageAlertEl.className = "stockage-alert stockage-alert--" + level;
        stockageAlertEl.textContent = alertText;
      } else {
        stockageAlertEl.hidden = true;
        stockageAlertEl.textContent = "";
      }
    }

    if (stockageQuotaWrapEl && stockageQuotaTextEl && stockageQuotaFillEl) {
      if (est.supported && est.quota) {
        stockageQuotaWrapEl.hidden = false;
        var pct = est.percent != null ? est.percent : 0;
        stockageQuotaTextEl.textContent =
          DataManager.formatBytes(est.usage) +
          " / ~" +
          DataManager.formatBytes(est.quota) +
          " (" +
          pct +
          " %)";
        stockageQuotaFillEl.style.width = Math.min(100, pct) + "%";
        stockageQuotaFillEl.className =
          "stockage-quota__fill stockage-quota__fill--" + (level === "unknown" ? "ok" : level);
        if (stockageQuotaBarEl) {
          stockageQuotaBarEl.setAttribute("aria-valuenow", String(pct));
          stockageQuotaBarEl.setAttribute(
            "aria-label",
            "Espace utilisé par le site : " + pct + " pour cent du quota estimé"
          );
        }
      } else {
        stockageQuotaWrapEl.hidden = true;
      }
    }

    if (stockageQuotaHintEl) {
      if (!est.supported) {
        stockageQuotaHintEl.hidden = false;
        stockageQuotaHintEl.textContent =
          "Ce navigateur n’affiche pas le quota total. En cas d’erreur à l’enregistrement, supprimez des données ci-dessous.";
      } else if (
        est.supported &&
        overview.breakdown.totalBytes > 0 &&
        est.usage > overview.breakdown.totalBytes * 1.5
      ) {
        stockageQuotaHintEl.hidden = false;
        stockageQuotaHintEl.textContent =
          "Le quota navigateur inclut aussi le cache de l’application (hors liste ci-dessous).";
      } else {
        stockageQuotaHintEl.hidden = true;
        stockageQuotaHintEl.textContent = "";
      }
    }
  }

  function renderStockage() {
    if (!stockageListEl) return Promise.resolve();
    var load =
      typeof DataManager.getStorageOverview === "function"
        ? DataManager.getStorageOverview()
        : DataManager.getStorageBreakdown().then(function (breakdown) {
            return { breakdown: breakdown, estimate: { supported: false }, level: "unknown" };
          });

    return load
      .then(function (overview) {
        var breakdown = overview.breakdown;
        if (stockageTotalEl) {
          stockageTotalEl.textContent = DataManager.formatBytes(breakdown.totalBytes);
        }
        renderQuotaUi(overview);

        stockageListEl.innerHTML = "";
        var hasData = breakdown.totalBytes > 0;
        if (stockageVideEl) stockageVideEl.hidden = hasData;

        breakdown.categories.forEach(function (cat) {
          var li = document.createElement("li");
          li.className = "stockage-item";

          var main = document.createElement("div");
          main.className = "stockage-item__main";

          var titre = document.createElement("span");
          titre.className = "stockage-item__titre";
          titre.textContent = cat.label;

          var meta = document.createElement("span");
          meta.className = "stockage-item__meta";
          meta.textContent = DataManager.formatBytes(cat.bytes) + " · " + cat.countLabel;

          main.appendChild(titre);
          main.appendChild(meta);
          li.appendChild(main);

          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--ghost btn--small stockage-item__delete";
          btn.textContent = "Supprimer";
          btn.setAttribute("data-category", cat.id);
          btn.setAttribute("aria-label", "Supprimer les données de " + cat.label);
          li.appendChild(btn);

          stockageListEl.appendChild(li);
        });
      })
      .catch(function (e) {
        montrerErreur(e.message || "Impossible de lire l’espace utilisé.");
      });
  }

  function supprimerCategorie(categoryId, label) {
    var msg = DELETE_CONFIRM[categoryId];
    if (!msg) {
      msg =
        "Supprimer les données de « " +
        label +
        " » ?\n\nCette action est irréversible. Pensez à exporter une sauvegarde avant.";
    }
    if (!confirm(msg)) return;
    montrerErreur("");
    DataManager.clearStorageCategory(categoryId)
      .then(function () {
        montrerOk("Données supprimées : " + label + ".");
        return renderStockage();
      })
      .catch(function (e) {
        montrerErreur(e.message || "Suppression impossible.");
      });
  }

  if (stockageListEl) {
    stockageListEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".stockage-item__delete");
      if (!btn) return;
      var categoryId = btn.getAttribute("data-category");
      var item = btn.closest(".stockage-item");
      var labelEl = item && item.querySelector(".stockage-item__titre");
      var label = labelEl ? labelEl.textContent : categoryId;
      supprimerCategorie(categoryId, label);
    });
  }

  function init() {
    return DataManager.ready
      .then(function () {
        return renderStockage();
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
            renderStockage();
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

