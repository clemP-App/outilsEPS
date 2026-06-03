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
  var importPanelEl = document.getElementById("import-backup-panel");
  var importMetaEl = document.getElementById("import-backup-meta");
  var importDetailsEl = document.getElementById("import-backup-details");
  var importStatAddEl = document.getElementById("import-stat-add");
  var importStatSameEl = document.getElementById("import-stat-same");
  var importStatDiffEl = document.getElementById("import-stat-diff");
  var btnImportMerge = document.getElementById("btn-import-merge");
  var btnImportReplace = document.getElementById("btn-import-replace");
  var btnImportCancel = document.getElementById("btn-import-cancel");
  var pendingImportData = null;
  var pendingImportPreview = null;

  var DELETE_CONFIRM = {
    "imports-eleves":
      "Supprimer tous les imports QR élèves enregistrés ?\n\nLes données saisies par les élèves ne seront plus consultables ici.\n\nCette action est irréversible.",
    classes:
      "Supprimer toutes les classes et tous les élèves ?\n\nLes autres outils qui s’appuient sur les classes ne pourront plus importer d’élèves tant que vous n’aurez pas recréé des classes.\n\nCette action est irréversible.",
    "cahier-texte":
      "Supprimer toutes les séquences et fiches de séance du cahier de texte ?\n\nCette action est irréversible.",
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
    "inducteur-danse":
      "Supprimer les listes personnalisées de l’inducteur danse ?\n\nLes listes intégrées restent disponibles.",
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

  function creerItemStockage(cat) {
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

    return li;
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

        var groupOrder =
          typeof DataManager.STORAGE_GROUP_ORDER !== "undefined"
            ? DataManager.STORAGE_GROUP_ORDER.slice()
            : ["Gestion de classe", "Séance", "Activités"];
        groupOrder.push("Autres");

        var byGroup = {};
        breakdown.categories.forEach(function (cat) {
          var key = cat.groupe || "Autres";
          if (!byGroup[key]) byGroup[key] = [];
          byGroup[key].push(cat);
        });

        groupOrder.forEach(function (groupLabel) {
          var items = byGroup[groupLabel];
          if (!items || !items.length) return;

          var section = document.createElement("li");
          section.className = "stockage-groupe";

          var heading = document.createElement("h3");
          heading.className = "stockage-groupe__titre";
          heading.textContent = groupLabel;
          section.appendChild(heading);

          var sublist = document.createElement("ul");
          sublist.className = "stockage-groupe__list";
          items.forEach(function (cat) {
            sublist.appendChild(creerItemStockage(cat));
          });
          section.appendChild(sublist);

          stockageListEl.appendChild(section);
        });
      })
      .catch(function (e) {
        montrerErreur(e.message || "Impossible de lire l’espace utilisé.");
      });
  }

  function formatCount(n) {
    return String(n || 0);
  }

  function formatBackupDate(value) {
    if (!value) return "date inconnue";
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return "date inconnue";
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function setImportBusy(busy) {
    [btnImportMerge, btnImportReplace, btnImportCancel].forEach(function (btn) {
      if (btn) btn.disabled = !!busy;
    });
    if (!busy && btnImportMerge && pendingImportPreview) {
      btnImportMerge.disabled = pendingImportPreview.summary.willImport === 0;
    }
  }

  function hideImportPanel() {
    pendingImportData = null;
    pendingImportPreview = null;
    if (importPanelEl) importPanelEl.hidden = true;
    if (importDetailsEl) importDetailsEl.innerHTML = "";
  }

  function renderImportPreview(data, preview) {
    pendingImportData = data;
    pendingImportPreview = preview;

    if (importPanelEl) importPanelEl.hidden = false;
    if (importMetaEl) {
      var meta = data && data.metadata ? data.metadata : {};
      importMetaEl.textContent =
        "Sauvegarde du " +
        formatBackupDate(meta.exportedAt) +
        " : " +
        formatCount(preview.summary.imported) +
        " donnée" +
        (preview.summary.imported > 1 ? "s" : "") +
        " dans le fichier, " +
        formatCount(preview.summary.current) +
        " déjà sur cet appareil.";
    }
    if (importStatAddEl) importStatAddEl.textContent = formatCount(preview.summary.willImport);
    if (importStatSameEl) importStatSameEl.textContent = formatCount(preview.summary.identical);
    if (importStatDiffEl) importStatDiffEl.textContent = formatCount(preview.summary.different);

    if (btnImportMerge) {
      btnImportMerge.disabled = preview.summary.willImport === 0;
      btnImportMerge.textContent =
        preview.summary.willImport > 0
          ? "Fusionner " +
            preview.summary.willImport +
            " donnée" +
            (preview.summary.willImport > 1 ? "s" : "")
          : "Rien à fusionner";
    }

    if (importDetailsEl) {
      importDetailsEl.innerHTML = "";
      (preview.stores || [])
        .filter(function (row) {
          return row.current || row.imported;
        })
        .forEach(function (row) {
          var tr = document.createElement("tr");
          var addLabel = row.willImport
            ? row.willImport +
              " (" +
              row.added +
              " nouvelle" +
              (row.added > 1 ? "s" : "") +
              (row.different
                ? ", " + row.different + " copie" + (row.different > 1 ? "s" : "")
                : "") +
              ")"
            : "0";
          [row.label, row.current, row.imported, row.identical, addLabel].forEach(function (
            value,
            index
          ) {
            var cell = document.createElement(index === 0 ? "th" : "td");
            if (index === 0) cell.scope = "row";
            cell.textContent = String(value);
            tr.appendChild(cell);
          });
          importDetailsEl.appendChild(tr);
        });
    }

    if (importPanelEl && importPanelEl.scrollIntoView) {
      importPanelEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function readBackupFile(file) {
    if (!file) return Promise.resolve({ cancelled: true, reason: "no-file" });
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(JSON.parse(reader.result));
        } catch (e) {
          reject(new Error("Fichier JSON invalide."));
        }
      };
      reader.onerror = function () {
        reject(new Error("Impossible de lire le fichier."));
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  function pickBackupFile() {
    return new Promise(function (resolve, reject) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        readBackupFile(file)
          .then(function (data) {
            input.remove();
            resolve(data);
          })
          .catch(function (e) {
            input.remove();
            reject(e);
          });
      });
      input.click();
    });
  }

  function ouvrirImportSauvegarde() {
    montrerErreur("");
    montrerOk("");
    hideImportPanel();
    pickBackupFile()
      .then(function (data) {
        if (data && data.cancelled) return;
        pendingImportData = data;
        return DataManager.previewBackupImport(data).then(function (preview) {
          renderImportPreview(data, preview);
        });
      })
      .catch(function (e) {
        montrerErreur(e.message || "Import impossible.");
      });
  }

  function fusionnerSauvegarde() {
    if (!pendingImportData) return;
    montrerErreur("");
    setImportBusy(true);
    DataManager.importBackupMerge(pendingImportData)
      .then(function (result) {
        var plan = result && result.plan ? result.plan : pendingImportPreview;
        var count = plan && plan.summary ? plan.summary.willImport : 0;
        if (count) {
          montrerOk(
            "Fusion réussie : " +
              count +
              " donnée" +
              (count > 1 ? "s" : "") +
              " ajoutée" +
              (count > 1 ? "s" : "") +
              "."
          );
        } else {
          montrerOk("Aucune donnée à ajouter : cette sauvegarde est déjà présente ici.");
        }
        hideImportPanel();
        setImportBusy(false);
        return renderStockage();
      })
      .catch(function (e) {
        setImportBusy(false);
        montrerErreur(e.message || "Fusion impossible.");
      });
  }

  function remplacerParSauvegarde() {
    if (!pendingImportData) return;
    var msg =
      "Remplacer toutes les données de cet appareil par cette sauvegarde ?\n\n" +
      "Les données actuelles seront effacées avant import.";
    if (!confirm(msg)) return;
    montrerErreur("");
    setImportBusy(true);
    DataManager.importAllData(pendingImportData, { skipConfirm: true })
      .then(function (result) {
        if (result && result.success) {
          montrerOk("Import réussi. Les données ont été restaurées.");
          hideImportPanel();
          renderStockage();
          setTimeout(function () {
            window.location.reload();
          }, 1200);
        }
        setImportBusy(false);
      })
      .catch(function (e) {
        setImportBusy(false);
        montrerErreur(e.message || "Import impossible.");
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
    btnImport.addEventListener("click", ouvrirImportSauvegarde);
  }

  if (btnImportMerge) btnImportMerge.addEventListener("click", fusionnerSauvegarde);
  if (btnImportReplace) btnImportReplace.addEventListener("click", remplacerParSauvegarde);
  if (btnImportCancel) btnImportCancel.addEventListener("click", hideImportPanel);

  init();
})();

