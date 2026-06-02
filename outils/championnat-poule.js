/**
 * Championnat multi-poules (enseignant) — IndexedDB + sessions.
 */
(function () {
  "use strict";

  var SAVE_DELAY_MS = 400;
  var DEFAULT_POULE_ID = "poule-a";

  function createEmptyChampionnatState() {
    return {
      poules: [{ id: DEFAULT_POULE_ID, name: "Poule A" }],
      teams: [],
      matches: [],
      importMeta: { importedExportIds: {} },
    };
  }

  var state = createEmptyChampionnatState();

  var newTeamEl = document.getElementById("new-team");
  var newTeamPouleEl = document.getElementById("new-team-poule");
  var newTeamPouleSegmentEl = document.getElementById("new-team-poule-segment");
  var btnOpenAddPouleDialog = document.getElementById("btn-open-add-poule-dialog");
  var btnOpenManagePouleDialog = document.getElementById("btn-open-manage-poule-dialog");
  var addPouleDialogEl = document.getElementById("add-poule-dialog");
  var btnCloseAddPouleDialog = document.getElementById("btn-close-add-poule-dialog");
  var btnConfirmAddPoule = document.getElementById("btn-confirm-add-poule");
  var addPouleCustomNameEl = document.getElementById("add-poule-custom-name");
  var managePouleDialogEl = document.getElementById("manage-poule-dialog");
  var btnCloseManagePouleDialog = document.getElementById("btn-close-manage-poule-dialog");
  var managePouleSelectEl = document.getElementById("manage-poule-select");
  var managePouleNameEl = document.getElementById("manage-poule-name");
  var btnRenamePouleDialog = document.getElementById("btn-rename-poule-dialog");
  var btnDeletePouleDialog = document.getElementById("btn-delete-poule-dialog");
  var teamPoolsBoardEl = document.getElementById("team-pools-board");
  var accordionGestionEl = document.getElementById("accordion-gestion");
  var gestionMenuEl = document.getElementById("champ-gestion-menu");
  var gestionMenuIndicatorEl = document.getElementById("champ-gestion-menu-indicator");
  var gestionPanelAffectationEl = document.getElementById("gestion-panel-affectation");
  var gestionPanelAffichageEl = document.getElementById("gestion-panel-affichage");
  var teamListOrderEl = document.getElementById("team-list-order");
  var standingsFilterEl = document.getElementById("standings-poule-filter");
  var btnAdd = document.getElementById("btn-add-team");
  var teamListEl = document.getElementById("team-list");
  var matchListEl = document.getElementById("match-list");
  var accordionMatchsTitleEl = document.getElementById("accordion-matchs-title");
  var matchSearchEl = document.getElementById("match-search");
  var btnClearMatchSearch = document.getElementById("btn-clear-match-search");
  var standingsBody = document.getElementById("standings-body");
  var standingsTableEl = document.getElementById("standings-table");
  var msgEl = document.getElementById("champ-msg");
  var btnResetScores = document.getElementById("btn-reset-scores");
  var btnExport = document.getElementById("btn-export-csv");
  var btnDeleteAll = document.getElementById("btn-delete-all");
  var btnAssignRandom = document.getElementById("btn-assign-random");
  var btnAssignHomogeneous = document.getElementById("btn-assign-homogeneous");
  var btnAssignHeterogeneous = document.getElementById("btn-assign-heterogeneous");

  var qrInputEl = document.getElementById("champ-qr-input");
  var btnImportEleveQr = document.getElementById("btn-import-eleve-qr");
  var btnScanEleveQr = document.getElementById("btn-scan-eleve-qr");
  var btnStopScanEleveQr = document.getElementById("btn-stop-scan-eleve-qr");
  var qrReaderEl = document.getElementById("champ-qr-reader");
  var sharePouleSelectEl = document.getElementById("champ-share-poule-select");
  var shareLinkEl = document.getElementById("champ-share-link");
  var shareQrHostEl = document.getElementById("champ-share-qr-host");
  var btnGeneratePouleShare = document.getElementById("btn-generate-poule-share");
  var btnCopyPouleShare = document.getElementById("btn-copy-poule-share");
  var syncElevesDialogEl = document.getElementById("sync-eleves-dialog");
  var btnCloseSyncElevesDialog = document.getElementById("btn-close-sync-eleves-dialog");
  var syncElevesListEl = document.getElementById("sync-eleves-list");
  var btnApplySyncEleves = document.getElementById("btn-apply-sync-eleves");
  var syncPouleModeEl = document.getElementById("sync-poule-mode");
  var syncExistingPouleWrapEl = document.getElementById("sync-existing-poule-wrap");
  var syncExistingPouleSelectEl = document.getElementById("sync-existing-poule-select");
  var syncNewPouleWrapEl = document.getElementById("sync-new-poule-wrap");
  var syncNewPouleNameEl = document.getElementById("sync-new-poule-name");
  var syncPouleModeHintEl = document.getElementById("sync-poule-mode-hint");
  var conflictImportDialogEl = document.getElementById("conflict-import-dialog");
  var conflictImportListEl = document.getElementById("conflict-import-list");
  var btnCloseConflictImportDialog = document.getElementById("btn-close-conflict-import-dialog");
  var btnConflictKeepProf = document.getElementById("btn-conflict-keep-prof");
  var btnConflictOverwriteEleve = document.getElementById("btn-conflict-overwrite-eleve");
  var previewImportDialogEl = document.getElementById("preview-import-dialog");
  var previewImportTargetEl = document.getElementById("preview-import-target");
  var previewImportAmbiguitiesEl = document.getElementById("preview-import-ambiguities");
  var previewImportSummaryEl = document.getElementById("preview-import-summary");
  var previewImportListEl = document.getElementById("preview-import-list");
  var btnClosePreviewImportDialog = document.getElementById("btn-close-preview-import-dialog");
  var btnPreviewCancelImport = document.getElementById("btn-preview-cancel-import");
  var btnPreviewImportFillEmpty = document.getElementById("btn-preview-import-fill-empty");
  var btnPreviewImportOverwrite = document.getElementById("btn-preview-import-overwrite");
  var promotionSettingsDialogEl = document.getElementById("promotion-settings-dialog");
  var promotionSettingsRowsEl = document.getElementById("promotion-settings-rows");
  var promotionSessionNameEl = document.getElementById("promotion-session-name");
  var promotionCommonValueEl = document.getElementById("promotion-common-value");
  var btnApplyPromotionCommon = document.getElementById("btn-apply-promotion-common");
  var btnApplyPromotionSettings = document.getElementById("btn-apply-promotion-settings");
  var btnClosePromotionSettingsDialog = document.getElementById("btn-close-promotion-settings-dialog");

  var saveTimer = null;
  var selectedAddTeamPouleId = DEFAULT_POULE_ID;
  var activeGestionPanel = "affichage";
  var pendingSyncRecord = null;
  var pendingSyncAddedCount = 0;
  var pendingSyncForcedPouleId = null;
  var pendingSyncAllowPouleMode = true;
  var pendingConflictImportContext = null;
  var pendingPreviewImportContext = null;
  var pendingPromotionBoundaries = [];
  var qrScanner = null;
  var qrScannerRunning = false;
  var POULE_COLORS = [
    { bg: "#e0f2fe", border: "#0ea5e9", text: "#0f172a" },
    { bg: "#dcfce7", border: "#22c55e", text: "#0f172a" },
    { bg: "#fef3c7", border: "#f59e0b", text: "#0f172a" },
    { bg: "#fae8ff", border: "#d946ef", text: "#0f172a" },
    { bg: "#fee2e2", border: "#ef4444", text: "#0f172a" },
    { bg: "#ede9fe", border: "#7c3aed", text: "#0f172a" },
  ];

  function genererId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function montrerMsg(text) {
    if (!msgEl) return;
    msgEl.hidden = !text;
    msgEl.textContent = text || "";
  }

  function closeGestionAccordionsOnScoreEntry() {
    if (!accordionGestionEl) return;
    accordionGestionEl.open = false;
    var nested = accordionGestionEl.querySelectorAll("details[open]");
    Array.prototype.forEach.call(nested, function (d) {
      d.open = false;
    });
  }

  function clearImportInputField() {
    if (qrInputEl) qrInputEl.value = "";
  }

  function ensureImportMeta() {
    if (!state.importMeta || typeof state.importMeta !== "object") {
      state.importMeta = {};
    }
    if (
      !state.importMeta.importedExportIds ||
      typeof state.importMeta.importedExportIds !== "object"
    ) {
      state.importMeta.importedExportIds = {};
    }
  }

  function resetImportPendingState() {
    pendingSyncRecord = null;
    pendingSyncAddedCount = 0;
    pendingSyncForcedPouleId = null;
    pendingSyncAllowPouleMode = true;
    pendingConflictImportContext = null;
    pendingPreviewImportContext = null;
  }

  function stopEleveQrScanner() {
    if (!qrScanner || !qrScannerRunning) return Promise.resolve();
    return qrScanner
      .stop()
      .then(function () {
        qrScannerRunning = false;
        if (btnScanEleveQr) btnScanEleveQr.hidden = false;
        if (btnStopScanEleveQr) btnStopScanEleveQr.hidden = true;
        if (qrReaderEl) qrReaderEl.hidden = true;
      })
      .catch(function () {
        qrScannerRunning = false;
        if (btnScanEleveQr) btnScanEleveQr.hidden = false;
        if (btnStopScanEleveQr) btnStopScanEleveQr.hidden = true;
        if (qrReaderEl) qrReaderEl.hidden = true;
      });
  }

  function importRawQrText(raw) {
    if (!raw) {
      montrerMsg("Collez d'abord le lien QR.");
      return;
    }
    if (typeof QrExchangeCore === "undefined") {
      montrerMsg("Module QR indisponible.");
      return;
    }
    var parsed = QrExchangeCore.parseQrUrl(raw);
    if (parsed.error) {
      montrerMsg(parsed.error);
      return;
    }
    importerResultatsEleve(parsed.record);
  }

  function startEleveQrScanner() {
    if (typeof Html5Qrcode === "undefined") {
      montrerMsg("Scanner QR indisponible sur cet appareil.");
      return;
    }
    if (!qrReaderEl) return;
    if (!qrScanner) qrScanner = new Html5Qrcode("champ-qr-reader");
    if (qrScannerRunning) return;
    var config = { fps: 8, qrbox: { width: 260, height: 260 } };
    Html5Qrcode.getCameras()
      .then(function (cameras) {
        if (!cameras || !cameras.length) throw new Error("Aucune caméra détectée.");
        var back = cameras.find(function (c) {
          return /back|rear|arriere|environment/i.test(c.label || "");
        });
        var camId = (back || cameras[cameras.length - 1]).id;
        if (qrReaderEl) qrReaderEl.hidden = false;
        return qrScanner.start(camId, config, function (decodedText) {
          if (qrInputEl) qrInputEl.value = decodedText;
          importRawQrText(decodedText);
          stopEleveQrScanner();
        }, function () {});
      })
      .then(function () {
        qrScannerRunning = true;
        if (btnScanEleveQr) btnScanEleveQr.hidden = true;
        if (btnStopScanEleveQr) btnStopScanEleveQr.hidden = false;
      })
      .catch(function (e) {
        montrerMsg(
          (e && e.message) || "Impossible d'accéder à la caméra. Utilisez le collage manuel."
        );
        if (qrReaderEl) qrReaderEl.hidden = true;
      });
  }

  function charger() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      return Promise.resolve({ teams: [], matches: [] });
    }
    return SessionManager.requireSessionId().then(function (sessionId) {
      return DataManager.getChampionnatForSession(sessionId).then(function (data) {
        var raw = {
          poules: data.poules || null,
          teams: data.teams || [],
          matches: data.matches || [],
          importMeta: data.importMeta || null,
        };
        normalizeState(raw);
        return raw;
      });
    });
  }
  function normalizeState(s) {
    if (!Array.isArray(s.poules) || !s.poules.length) {
      s.poules = [{ id: DEFAULT_POULE_ID, name: "Poule A" }];
    }
    s.poules = s.poules
      .filter(function (p) {
        return p && p.id;
      })
      .map(function (p, idx) {
        return { id: p.id, name: (p.name || p.nom || ("Poule " + String.fromCharCode(65 + idx))).trim() };
      });
    var fallbackPool = s.poules[0].id;
    s.teams = (s.teams || []).map(function (t) {
      var pid = t.pouleId || fallbackPool;
      var ok = s.poules.some(function (p) { return p.id === pid; });
      return {
        id: t.id,
        name: t.name,
        eleveId: t.eleveId || null,
        niveau: normalizeNiveau(t.niveau),
        pouleId: ok ? pid : fallbackPool,
      };
    });
    s.matches = (s.matches || []).map(function (m) {
      return {
        id: m.id || genererId(),
        homeId: m.homeId,
        awayId: m.awayId,
        homeScore: m.homeScore == null ? null : m.homeScore,
        awayScore: m.awayScore == null ? null : m.awayScore,
        journee: typeof m.journee === "number" ? m.journee : 1,
        pouleId: m.pouleId || fallbackPool,
      };
    });
    var meta = s.importMeta && typeof s.importMeta === "object" ? s.importMeta : {};
    var imported =
      meta.importedExportIds && typeof meta.importedExportIds === "object"
        ? meta.importedExportIds
        : {};
    s.importMeta = { importedExportIds: imported };
  }


  function sauverImmediate() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      montrerMsg("Stockage indisponible.");
      return Promise.resolve();
    }
    return SessionManager.requireSessionId()
      .then(function (sessionId) {
        var meta = {};
        var s = SessionManager.getActiveSession();
        if (s && s.nomSession) meta.nom = s.nomSession;
        return DataManager.saveChampionnatForSession(sessionId, state, meta);
      })
      .then(function () {
        montrerMsg("");
      })
      .catch(function () {
        montrerMsg("Impossible d’enregistrer les données.");
      });
  }

  function sauverDebounced() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      sauverImmediate();
    }, SAVE_DELAY_MS);
  }

  function nomEquipe(id) {
    var t = state.teams.find(function (x) {
      return x.id === id;
    });
    return t ? t.name : "?";
  }

  var BYE = "__BYE__";

  /**
   * Récupère les scores pour une paire (home/away comme dans le nouveau calendrier),
   * en consultant l’ancienne liste (même paire, ordre domicile/extérieur indifférent).
   */
  function trouverScoresPourPaires(homeId, awayId, anciennes, pouleId) {
    for (var i = 0; i < anciennes.length; i++) {
      var m = anciennes[i];
      if ((m.pouleId || DEFAULT_POULE_ID) !== pouleId) continue;
      if (m.homeId === homeId && m.awayId === awayId) {
        return { homeScore: m.homeScore, awayScore: m.awayScore };
      }
      if (m.homeId === awayId && m.awayId === homeId) {
        return { homeScore: m.awayScore, awayScore: m.homeScore };
      }
    }
    return { homeScore: null, awayScore: null };
  }

  /**
   * Génère les journées (aller simple) : chaque équipe rencontre chaque autre une fois,
   * au plus un match par équipe et par journée — méthode du cercle (Berger).
   * @returns {Array<Array<{homeId:string,awayId:string}>>}
   */
  function genererJourneesPoule(ids) {
    if (ids.length < 2) return [];
    var arr = ids.slice();
    var n = arr.length;
    var odd = n % 2 === 1;
    if (odd) arr.push(BYE);
    var N = arr.length;
    var nbJournees = N - 1;
    var journees = [];
    var copie = arr.slice();
    for (var r = 0; r < nbJournees; r++) {
      var round = [];
      for (var i = 0; i < N / 2; i++) {
        var a = copie[i];
        var b = copie[N - 1 - i];
        if (a !== BYE && b !== BYE) {
          round.push({ homeId: a, awayId: b });
        }
      }
      journees.push(round);
      var fixed = copie[0];
      var last = copie[N - 1];
      for (var j = N - 1; j >= 2; j--) {
        copie[j] = copie[j - 1];
      }
      copie[1] = last;
      copie[0] = fixed;
    }
    return journees;
  }

  function teamsForPoule(pouleId) {
    return state.teams.filter(function (t) {
      return t.pouleId === pouleId;
    });
  }

  /** Reconstruit tous les matchs par poule en conservant les scores des paires déjà jouées. */
  function reconstruireMatchsDepuisEquipes() {
    var anciennes = state.matches.slice();
    var out = [];
    state.poules.forEach(function (poule) {
      var ids = teamsForPoule(poule.id).map(function (t) { return t.id; });
      if (ids.length < 2) return;
      var journees = genererJourneesPoule(ids);
      journees.forEach(function (round, jIdx) {
        round.forEach(function (pair) {
          var sc = trouverScoresPourPaires(pair.homeId, pair.awayId, anciennes, poule.id);
          out.push({
            id: genererId(),
            homeId: pair.homeId,
            awayId: pair.awayId,
            homeScore: sc.homeScore,
            awayScore: sc.awayScore,
            journee: jIdx + 1,
            pouleId: poule.id,
          });
        });
      });
    });
    state.matches = out;
  }

  function calendrierCoherent() {
    var attendu = 0;
    state.poules.forEach(function (p) {
      var n = teamsForPoule(p.id).length;
      attendu += n >= 2 ? (n * (n - 1)) / 2 : 0;
    });
    if (state.matches.length !== attendu) return false;
    for (var i = 0; i < state.matches.length; i++) {
      if (typeof state.matches[i].journee !== "number" || state.matches[i].journee < 1) {
        return false;
      }
    }
    return true;
  }

  function ajouterPoule(name) {
    var n = (name || "").trim();
    if (!n) {
      n = nextDefaultPouleName();
    }
    state.poules.push({ id: genererId(), name: n });
    if (standingsFilterEl && !standingsFilterEl.value) standingsFilterEl.value = "all";
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    if (standingsFilterEl && targetId) standingsFilterEl.value = targetId;
    render();
  }

  function renommerPoule(pouleId, nouveauNom) {
    var p = state.poules.find(function (x) {
      return x.id === pouleId;
    });
    if (!p) return;
    var n = (nouveauNom || "").trim();
    if (!n) return;
    p.name = n;
    sauverImmediate();
    render();
  }

  function supprimerPoule(pouleId) {
    if (state.poules.length <= 1) {
      montrerMsg("Impossible de supprimer la dernière poule.");
      return;
    }
    var p = state.poules.find(function (x) {
      return x.id === pouleId;
    });
    if (!p) return;
    if (!confirm("Supprimer " + p.name + " ? Les participants seront déplacés.")) return;
    var fallback = state.poules.find(function (x) {
      return x.id !== pouleId;
    });
    state.teams.forEach(function (t) {
      if (t.pouleId === pouleId) t.pouleId = fallback.id;
    });
    state.poules = state.poules.filter(function (x) {
      return x.id !== pouleId;
    });
    if (selectedAddTeamPouleId === pouleId) selectedAddTeamPouleId = fallback.id;
    if (standingsFilterEl && standingsFilterEl.value === pouleId) standingsFilterEl.value = "all";
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
  }

  function nextDefaultPouleNameByMode(mode) {
    if (mode === "numbers") {
      var usedNumbers = {};
      state.poules.forEach(function (p) {
        var m = String(p.name || "").match(/^poule\s+(\d+)$/i);
        if (m) usedNumbers[parseInt(m[1], 10)] = true;
      });
      var k = 1;
      while (usedNumbers[k]) k++;
      return "Poule " + k;
    }
    return nextDefaultPouleName();
  }

  function selectedPouleNameMode() {
    if (!addPouleDialogEl) return "letters";
    var checked = addPouleDialogEl.querySelector('input[name="poule-name-mode"]:checked');
    return checked ? checked.value : "letters";
  }

  function openAddPouleDialog() {
    if (!addPouleDialogEl || typeof addPouleDialogEl.showModal !== "function") {
      ajouterPoule(nextDefaultPouleName());
      return;
    }
    if (addPouleCustomNameEl) addPouleCustomNameEl.value = "";
    addPouleDialogEl.showModal();
  }

  function fillManagePouleDialog() {
    if (!managePouleSelectEl) return;
    OutilsDom.clear(managePouleSelectEl);
    state.poules.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      if (p.id === selectedAddTeamPouleId) o.selected = true;
      managePouleSelectEl.appendChild(o);
    });
    var selected = state.poules.find(function (p) {
      return p.id === managePouleSelectEl.value;
    });
    if (managePouleNameEl) managePouleNameEl.value = selected ? selected.name : "";
    if (btnDeletePouleDialog) btnDeletePouleDialog.disabled = state.poules.length <= 1;
  }

  function openManagePouleDialog() {
    if (!managePouleDialogEl || typeof managePouleDialogEl.showModal !== "function") return;
    fillManagePouleDialog();
    managePouleDialogEl.showModal();
  }

  function renameSelectedPouleFromDialog() {
    if (!managePouleSelectEl) return;
    var id = managePouleSelectEl.value;
    var name = managePouleNameEl ? managePouleNameEl.value : "";
    renommerPoule(id, name);
    fillManagePouleDialog();
  }

  function deleteSelectedPouleFromDialog() {
    if (!managePouleSelectEl) return;
    var id = managePouleSelectEl.value;
    supprimerPoule(id);
    fillManagePouleDialog();
  }

  function confirmAddPouleFromDialog() {
    var mode = selectedPouleNameMode();
    var custom = (addPouleCustomNameEl && addPouleCustomNameEl.value || "").trim();
    if (mode === "custom" && custom) {
      ajouterPoule(custom);
    } else {
      ajouterPoule(nextDefaultPouleNameByMode(mode));
    }
    if (addPouleDialogEl && addPouleDialogEl.open) addPouleDialogEl.close();
  }

  function ajouterEquipe(nom) {
    var n = (nom || "").trim();
    if (!n) {
      montrerMsg("Indiquez un nom de participant.");
      return;
    }
    var pid =
      selectedAddTeamPouleId ||
      (newTeamPouleEl && newTeamPouleEl.value) ||
      (state.poules[0] && state.poules[0].id);
    var id = genererId();
    state.teams.push({ id: id, name: n, eleveId: null, niveau: null, pouleId: pid });
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
  }

  function supprimerEquipe(id) {
    if (!confirm("Supprimer ce participant et tous ses matchs ?")) return;
    state.teams = state.teams.filter(function (t) {
      return t.id !== id;
    });
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
  }

  function changerPouleEquipe(id, pouleId) {
    var t = state.teams.find(function (x) { return x.id === id; });
    if (!t) return;
    t.pouleId = pouleId;
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
  }

  function renommerEquipe(id, nouveauNom) {
    var n = (nouveauNom || "").trim();
    if (!n) return;
    var t = state.teams.find(function (x) {
      return x.id === id;
    });
    if (t) t.name = n;
    sauverImmediate();
    render();
  }

  function setNiveauEquipe(id, value) {
    var t = state.teams.find(function (x) {
      return x.id === id;
    });
    if (!t) return;
    var nv = normalizeNiveau(value);
    t.niveau = nv;
    renderTeams();
    renderPoolsBoard();
    sauverDebounced();
    if (!t.eleveId || typeof DataManager === "undefined") return;
    DataManager.getById("eleves", t.eleveId)
      .then(function (eleve) {
        if (!eleve) return null;
        eleve.niveau = nv === null ? "" : String(nv);
        return DataManager.updateItem("eleves", eleve);
      })
      .catch(function () {
        montrerMsg("Niveau modifié localement, mais impossible de synchroniser avec la classe.");
      });
  }

  function resetScores() {
    if (!confirm("Réinitialiser tous les scores des matchs ?")) return;
    state.matches.forEach(function (m) {
      m.homeScore = null;
      m.awayScore = null;
    });
    sauverImmediate();
    render();
  }

  function supprimerTout() {
    if (
      !confirm(
        "Supprimer tout le championnat (participants, matchs et résultats) ? Cette action est définitive."
      )
    ) {
      return;
    }
    state = createEmptyChampionnatState();
    ensureImportMeta();
    sauverImmediate();
    render();
  }

  function parseScoreInput(v) {
    if (v === "" || v === null || typeof v === "undefined") return null;
    var n = parseInt(String(v), 10);
    if (isNaN(n) || n < 0) return null;
    return n;
  }

  function majScore(matchId, cote, valeurBrute) {
    var m = state.matches.find(function (x) {
      return x.id === matchId;
    });
    if (!m) return;
    var val = parseScoreInput(valeurBrute);
    if (cote === "home") m.homeScore = val;
    else m.awayScore = val;
    if (m.homeScore == null && m.awayScore != null) {
      m.homeScore = 0;
    } else if (m.awayScore == null && m.homeScore != null) {
      m.awayScore = 0;
    }
    if (m.homeScore != null || m.awayScore != null) {
      closeGestionAccordionsOnScoreEntry();
    }
    sauverDebounced();
    renderStandingsOnly();
  }

  function computeStandingsByPool() {
    return ChampionnatStandings.computeStandingsByPoules(state.teams, state.matches, state.poules);
  }

  function buildPromotionRelegationState(boundaryRules) {
    var next = {
      poules: state.poules.map(function (p) {
        return { id: p.id, name: p.name };
      }),
      teams: state.teams.map(function (t) {
        return {
          id: t.id,
          name: t.name,
          eleveId: t.eleveId || null,
          niveau: t.niveau == null ? null : t.niveau,
          pouleId: t.pouleId,
        };
      }),
      matches: [],
      importMeta: { importedExportIds: {} },
    };
    if (next.poules.length < 2) {
      return next;
    }
    var standings = computeStandingsByPool();
    var rowsByPoule = {};
    standings.forEach(function (g) {
      rowsByPoule[g.pouleId] = g.rows.slice();
    });
    boundaryRules = Array.isArray(boundaryRules) ? boundaryRules : [];
    var promotedIdsBySource = {};
    var relegatedIdsBySource = {};
    function pickTeamIdsFromRows(rows, count, fromTop) {
      var out = [];
      if (!rows || !rows.length || !count) return out;
      var n = Math.min(count, Math.max(0, rows.length - 1));
      for (var i = 0; i < n; i++) {
        var idx = fromTop ? i : rows.length - 1 - i;
        var row = rows[idx];
        if (!row || !row.name) continue;
        var team = next.teams.find(function (t) {
          return t.pouleId && normalizeName(t.name) === normalizeName(row.name);
        });
        if (team) out.push(team.id);
      }
      return out;
    }
    for (var i = 0; i < next.poules.length - 1; i++) {
      var upper = next.poules[i];
      var lower = next.poules[i + 1];
      var upperRows = rowsByPoule[upper.id] || [];
      var lowerRows = rowsByPoule[lower.id] || [];
      if (!upperRows.length || !lowerRows.length) continue;
      var rule = boundaryRules[i] || { up: 1, down: 1 };
      var upCount = Math.max(0, parseInt(rule.up, 10) || 0);
      var downCount = Math.max(0, parseInt(rule.down, 10) || 0);
      promotedIdsBySource[lower.id] = pickTeamIdsFromRows(lowerRows, upCount, true);
      relegatedIdsBySource[upper.id] = pickTeamIdsFromRows(upperRows, downCount, false);
    }
    next.teams.forEach(function (t) {
      var poolIdx = next.poules.findIndex(function (p) { return p.id === t.pouleId; });
      if (poolIdx < 0) return;
      var promotedIds = promotedIdsBySource[t.pouleId] || [];
      var relegatedIds = relegatedIdsBySource[t.pouleId] || [];
      if (promotedIds.indexOf(t.id) >= 0 && poolIdx > 0) {
        t.pouleId = next.poules[poolIdx - 1].id;
        return;
      }
      if (relegatedIds.indexOf(t.id) >= 0 && poolIdx < next.poules.length - 1) {
        t.pouleId = next.poules[poolIdx + 1].id;
      }
    });
    next.poules.forEach(function (poule) {
      var ids = next.teams
        .filter(function (t) { return t.pouleId === poule.id; })
        .map(function (t) { return t.id; });
      if (ids.length < 2) return;
      var journees = genererJourneesPoule(ids);
      journees.forEach(function (round, jIdx) {
        round.forEach(function (pair) {
          next.matches.push({
            id: genererId(),
            homeId: pair.homeId,
            awayId: pair.awayId,
            homeScore: null,
            awayScore: null,
            journee: jIdx + 1,
            pouleId: poule.id,
          });
        });
      });
    });
    return next;
  }

  function getPoolCounts() {
    return state.poules.map(function (p) {
      return state.teams.filter(function (t) { return t.pouleId === p.id; }).length;
    });
  }

  function getBoundaryMax(i, counts) {
    if (i < 0 || i >= counts.length - 1) return 0;
    return Math.max(0, Math.min(counts[i] - 1, counts[i + 1] - 1));
  }

  function projectCountsFromBoundaries(boundaries, counts) {
    var projected = counts.slice();
    for (var i = 0; i < boundaries.length; i++) {
      var v = Math.max(0, parseInt(boundaries[i], 10) || 0);
      projected[i] -= v;
      projected[i + 1] += v;
      projected[i] += v;
      projected[i + 1] -= v;
    }
    for (var j = 0; j < projected.length; j++) {
      var up = j > 0 ? Math.max(0, parseInt(boundaries[j - 1], 10) || 0) : 0;
      var down = j < boundaries.length ? Math.max(0, parseInt(boundaries[j], 10) || 0) : 0;
      projected[j] = counts[j] - down + up;
    }
    return projected;
  }

  function refreshPromotionProjection() {
    if (!promotionSettingsRowsEl) return;
    var rules = pendingPromotionBoundaries.map(function (v) {
      var n = Math.max(0, parseInt(v, 10) || 0);
      return { up: n, down: n };
    });
    var simulated = buildPromotionRelegationState(rules);
    var projected = state.poules.map(function (p) {
      return simulated.teams.filter(function (t) { return t.pouleId === p.id; }).length;
    });
    state.poules.forEach(function (p, idx) {
      var target = promotionSettingsRowsEl.querySelector('[data-projection-pool-idx="' + idx + '"]');
      if (!target) return;
      target.textContent = "Effectif projeté: " + projected[idx] + " élève(s)";
    });
  }

  function setBoundaryValue(idx, value) {
    if (idx < 0 || idx >= pendingPromotionBoundaries.length) return;
    var counts = getPoolCounts();
    var max = getBoundaryMax(idx, counts);
    pendingPromotionBoundaries[idx] = Math.max(0, Math.min(max, parseInt(value, 10) || 0));
    var downSel = promotionSettingsRowsEl.querySelector('select[data-type="down"][data-pool-idx="' + idx + '"]');
    if (downSel) downSel.value = String(pendingPromotionBoundaries[idx]);
    var upSel = promotionSettingsRowsEl.querySelector('select[data-type="up"][data-pool-idx="' + (idx + 1) + '"]');
    if (upSel) upSel.value = String(pendingPromotionBoundaries[idx]);
    refreshPromotionProjection();
  }

  function fillPromotionCommonOptions() {
    if (!promotionCommonValueEl) return;
    OutilsDom.clear(promotionCommonValueEl);
    var counts = getPoolCounts();
    var maxCommon = 0;
    for (var i = 0; i < state.poules.length - 1; i++) {
      var m = getBoundaryMax(i, counts);
      if (i === 0 || m < maxCommon) maxCommon = m;
    }
    for (var v = 0; v <= maxCommon; v++) {
      var o = document.createElement("option");
      o.value = String(v);
      o.textContent = String(v);
      if (v === 1) o.selected = true;
      promotionCommonValueEl.appendChild(o);
    }
  }

  function renderPromotionRows() {
    if (!promotionSettingsRowsEl) return;
    OutilsDom.clear(promotionSettingsRowsEl);
    var counts = getPoolCounts();
    state.poules.forEach(function (p, idx) {
      var row = document.createElement("div");
      row.className = "champ-toolbar champ-toolbar--labeled";
      row.style.marginBottom = "10px";

      var labelWrap = document.createElement("div");
      labelWrap.className = "field-group";
      labelWrap.style.flex = "1";
      var title = document.createElement("label");
      title.className = "field-label";
      title.textContent = p.name;
      var proj = document.createElement("div");
      proj.className = "hint";
      proj.setAttribute("data-projection-pool-idx", String(idx));
      labelWrap.appendChild(title);
      labelWrap.appendChild(proj);
      row.appendChild(labelWrap);

      var upWrap = document.createElement("div");
      upWrap.className = "field-group";
      var upSel = document.createElement("select");
      upSel.setAttribute("data-type", "up");
      upSel.setAttribute("data-pool-idx", String(idx));
      if (idx === 0) {
        var oUp0 = document.createElement("option");
        oUp0.value = "0";
        oUp0.textContent = "Montées: 0";
        upSel.appendChild(oUp0);
        upSel.disabled = true;
      } else {
        var bIdxUp = idx - 1;
        var maxUp = getBoundaryMax(bIdxUp, counts);
        for (var u = 0; u <= maxUp; u++) {
          var ou = document.createElement("option");
          ou.value = String(u);
          ou.textContent = "Montées: " + u;
          if (u === pendingPromotionBoundaries[bIdxUp]) ou.selected = true;
          upSel.appendChild(ou);
        }
        upSel.addEventListener("change", function () {
          setBoundaryValue(bIdxUp, upSel.value);
        });
      }
      upWrap.appendChild(upSel);
      row.appendChild(upWrap);

      var downWrap = document.createElement("div");
      downWrap.className = "field-group";
      var downSel = document.createElement("select");
      downSel.setAttribute("data-type", "down");
      downSel.setAttribute("data-pool-idx", String(idx));
      if (idx >= state.poules.length - 1) {
        var oDown0 = document.createElement("option");
        oDown0.value = "0";
        oDown0.textContent = "Descentes: 0";
        downSel.appendChild(oDown0);
        downSel.disabled = true;
      } else {
        var bIdxDown = idx;
        var maxDown = getBoundaryMax(bIdxDown, counts);
        for (var d = 0; d <= maxDown; d++) {
          var od = document.createElement("option");
          od.value = String(d);
          od.textContent = "Descentes: " + d;
          if (d === pendingPromotionBoundaries[bIdxDown]) od.selected = true;
          downSel.appendChild(od);
        }
        downSel.addEventListener("change", function () {
          setBoundaryValue(bIdxDown, downSel.value);
        });
      }
      downWrap.appendChild(downSel);
      row.appendChild(downWrap);

      promotionSettingsRowsEl.appendChild(row);
    });
    refreshPromotionProjection();
  }

  function createSessionFromPromotions() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      montrerMsg("Création de séance indisponible.");
      return;
    }
    if (state.poules.length < 2) {
      montrerMsg("Ajoutez au moins 2 poules pour utiliser montées/descentes.");
      return;
    }
    if (!promotionSettingsDialogEl || typeof promotionSettingsDialogEl.showModal !== "function") {
      montrerMsg("Dialogue de montées/descentes indisponible.");
      return;
    }
    OutilsDom.clear(promotionSettingsRowsEl);
    var active = SessionManager.getActiveSession && SessionManager.getActiveSession();
    var defaultName = (active && active.nomSession ? active.nomSession : "Championnat") + " — séance suivante";
    if (promotionSessionNameEl) promotionSessionNameEl.value = defaultName;
    pendingPromotionBoundaries = [];
    var counts = getPoolCounts();
    for (var i = 0; i < state.poules.length - 1; i++) {
      var max = getBoundaryMax(i, counts);
      pendingPromotionBoundaries.push(Math.min(1, max));
    }
    fillPromotionCommonOptions();
    renderPromotionRows();
    promotionSettingsDialogEl.showModal();
  }

  function createPromotionSessionAction() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--labeled session-bar__duplicate-promotion";
    btn.innerHTML =
      '<span class="btn__icon" aria-hidden="true">🔁</span><span class="btn__text">Dupliquer montées/descentes</span>';
    btn.addEventListener("click", createSessionFromPromotions);
    return btn;
  }

  function applyPromotionSettingsAndCreateSession() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      montrerMsg("Création de séance indisponible.");
      return;
    }
    var active = SessionManager.getActiveSession && SessionManager.getActiveSession();
    var nom =
      (promotionSessionNameEl && String(promotionSessionNameEl.value || "").trim()) ||
      ((active && active.nomSession ? active.nomSession : "Championnat") + " — séance suivante");
    var rules = pendingPromotionBoundaries.map(function (v) {
      var n = Math.max(0, parseInt(v, 10) || 0);
      return { up: n, down: n };
    });
    var nextState = buildPromotionRelegationState(rules);
    DataManager.createSession({
      toolId: DataManager.SESSION_TOOLS.CHAMPIONNAT,
      nomSession: nom,
      classeId: active && active.classeId ? active.classeId : null,
      classeNomSnapshot: active && active.classeNomSnapshot ? active.classeNomSnapshot : null,
    })
      .then(function (session) {
        return DataManager.saveChampionnatForSession(session.id, nextState, { nom: nom }).then(function () {
          return session;
        });
      })
      .then(function (session) {
        if (promotionSettingsDialogEl) promotionSettingsDialogEl.close();
        return DataManager.openSession(session.id);
      })
      .then(function () {
        window.location.reload();
      })
      .catch(function (err) {
        montrerMsg(err && err.message ? err.message : "Impossible de créer la nouvelle séance.");
      });
  }

  function nextDefaultPouleName() {
    var used = {};
    state.poules.forEach(function (p) {
      used[(p.name || "").toLowerCase()] = true;
    });
    var idx = 0;
    while (idx < 26) {
      var letter = String.fromCharCode(65 + idx);
      var candidate = "Poule " + letter;
      if (!used[candidate.toLowerCase()]) return candidate;
      idx++;
    }
    return "Poule " + (state.poules.length + 1);
  }

  function normalizeNiveau(v) {
    if (v === null || typeof v === "undefined" || v === "") return null;
    var n = parseFloat(String(v).replace(",", "."));
    if (isNaN(n)) return null;
    return n;
  }

  function pouleColorById(pouleId) {
    var idx = state.poules.findIndex(function (p) {
      return p.id === pouleId;
    });
    if (idx < 0) idx = 0;
    return POULE_COLORS[idx % POULE_COLORS.length];
  }

  function applyPouleColorStyle(el, pouleId) {
    var c = pouleColorById(pouleId);
    if (!el || !c) return;
    el.style.setProperty("--poule-bg", c.bg);
    el.style.setProperty("--poule-border", c.border);
    el.style.setProperty("--poule-text", c.text);
  }

  function applyStandingsHeaderColor(pouleId) {
    if (!standingsTableEl) return;
    var hasPoule = !!pouleId && pouleId !== "all";
    standingsTableEl.classList.toggle("champ-table--pool-colored", hasPoule);
    if (!hasPoule) {
      standingsTableEl.style.removeProperty("--poule-bg");
      standingsTableEl.style.removeProperty("--poule-border");
      standingsTableEl.style.removeProperty("--poule-text");
      return;
    }
    applyPouleColorStyle(standingsTableEl, pouleId);
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function distributeRoundRobin(teams) {
    var pools = state.poules.slice();
    if (!pools.length) return;
    teams.forEach(function (t, idx) {
      t.pouleId = pools[idx % pools.length].id;
    });
  }

  function applyRandomAssignment() {
    if (state.poules.length < 2 || state.teams.length < 2) {
      montrerMsg("Ajoutez au moins 2 poules et 2 participants.");
      return;
    }
    var copy = state.teams.slice();
    shuffleInPlace(copy);
    distributeRoundRobin(copy);
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
    montrerMsg("Attribution aléatoire appliquée.");
  }

  function sortTeamsByLevelDesc() {
    return state.teams.slice().sort(function (a, b) {
      var na = a.niveau;
      var nb = b.niveau;
      if (na === null && nb === null) {
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      }
      if (na === null) return 1;
      if (nb === null) return -1;
      return nb - na;
    });
  }

  function applyHomogeneousAssignment() {
    if (state.poules.length < 2 || state.teams.length < 2) {
      montrerMsg("Ajoutez au moins 2 poules et 2 participants.");
      return;
    }
    var missing = state.teams.filter(function (t) {
      return normalizeNiveau(t.niveau) === null;
    });
    if (missing.length) {
      montrerMsg(
        "Répartition homogène impossible: " +
          missing.length +
          " élève(s) sans niveau. Activez « Modifier les niveaux »."
      );
      return;
    }
    var sorted = sortTeamsByLevelDesc();
    var pools = state.poules.slice();
    var nPools = pools.length;
    var baseSize = Math.floor(sorted.length / nPools);
    var remainder = sorted.length % nPools;
    var cursor = 0;
    pools.forEach(function (p, idx) {
      var size = baseSize + (idx < remainder ? 1 : 0);
      for (var i = 0; i < size; i++) {
        if (!sorted[cursor]) break;
        sorted[cursor].pouleId = p.id;
        cursor++;
      }
    });
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
    montrerMsg("Répartition homogène appliquée (niveaux proches regroupés).");
  }

  function applyHeterogeneousAssignment() {
    if (state.poules.length < 2 || state.teams.length < 2) {
      montrerMsg("Ajoutez au moins 2 poules et 2 participants.");
      return;
    }
    var missing = state.teams.filter(function (t) {
      return normalizeNiveau(t.niveau) === null;
    });
    if (missing.length) {
      montrerMsg(
        "Répartition hétérogène impossible: " +
          missing.length +
          " élève(s) sans niveau. Activez « Modifier les niveaux »."
      );
      return;
    }
    var sorted = sortTeamsByLevelDesc();
    var poolIds = state.poules.map(function (p) {
      return p.id;
    });
    var pi = 0;
    var dir = 1;
    sorted.forEach(function (t) {
      t.pouleId = poolIds[pi];
      if (poolIds.length === 1) return;
      pi += dir;
      if (pi >= poolIds.length) {
        pi = poolIds.length - 2;
        dir = -1;
      } else if (pi < 0) {
        pi = 1;
        dir = 1;
      }
    });
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
    montrerMsg("Répartition hétérogène appliquée (niveaux mélangés).");
  }

  function buildSegmentControl(container, selectedId, onSelect, includeAll) {
    if (!container) return;
    OutilsDom.clear(container);
    if (includeAll) {
      var allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "champ-segment__btn" + (selectedId === "all" ? " is-active" : "");
      allBtn.textContent = "Toutes";
      allBtn.addEventListener("click", function () {
        onSelect("all");
      });
      container.appendChild(allBtn);
    }
    state.poules.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "champ-segment__btn" + (p.id === selectedId ? " is-active" : "");
      b.textContent = p.name;
      applyPouleColorStyle(b, p.id);
      b.addEventListener("click", function () {
        onSelect(p.id);
      });
      container.appendChild(b);
    });
  }

  function renderPoulesSelects() {
    function renderSelect(selectEl, includeAll) {
      if (!selectEl) return;
      var val = selectEl.value;
      OutilsDom.clear(selectEl);
      if (includeAll) {
        var all = document.createElement("option");
        all.value = "all";
        all.textContent = "Toutes les poules";
        selectEl.appendChild(all);
      }
      state.poules.forEach(function (p) {
        var o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name;
        selectEl.appendChild(o);
      });
      if (val && Array.prototype.some.call(selectEl.options, function (opt) { return opt.value === val; })) {
        selectEl.value = val;
      } else if (includeAll) {
        selectEl.value = state.poules[0] ? state.poules[0].id : "all";
      } else {
        selectEl.value = state.poules[0] ? state.poules[0].id : "";
      }
    }
    renderSelect(newTeamPouleEl, false);
    renderSelect(standingsFilterEl, true);
    renderSelect(sharePouleSelectEl, false);
    if (!selectedAddTeamPouleId || !state.poules.some(function (p) { return p.id === selectedAddTeamPouleId; })) {
      selectedAddTeamPouleId = state.poules[0] ? state.poules[0].id : DEFAULT_POULE_ID;
    }
    buildSegmentControl(newTeamPouleSegmentEl, selectedAddTeamPouleId, function (pouleId) {
      selectedAddTeamPouleId = pouleId;
      if (newTeamPouleEl) newTeamPouleEl.value = pouleId;
      renderPoulesSelects();
    }, false);
    if (newTeamPouleEl) newTeamPouleEl.value = selectedAddTeamPouleId;
  }

  function clearNode(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function buildPouleSharePayload(pouleId) {
    var poule = state.poules.find(function (p) {
      return p.id === pouleId;
    });
    if (!poule) throw new Error("Poule introuvable.");
    var teams = state.teams
      .filter(function (t) {
        return t.pouleId === pouleId;
      })
      .map(function (t) {
        return {
          teamId: t.id,
          profTeamId: t.id,
          eleveId: t.eleveId || null,
          name: t.name,
          niveau: t.niveau == null ? null : t.niveau,
        };
      });
    if (teams.length < 2) {
      throw new Error("Ajoutez au moins deux participants dans cette poule.");
    }
    return {
      type: "assignment",
      schemaVersion: 2,
      sourceTool: "championnat-poule",
      pouleId: poule.id,
      pouleName: poule.name,
      exportedAt: new Date().toISOString(),
      teams: teams,
    };
  }

  function clearPouleShareOutput() {
    clearNode(shareQrHostEl);
    if (shareLinkEl) shareLinkEl.value = "";
    if (btnCopyPouleShare) btnCopyPouleShare.hidden = true;
  }

  function generatePouleShareLink() {
    if (!sharePouleSelectEl || typeof QrExchangeCore === "undefined") return null;
    var pouleId = sharePouleSelectEl.value;
    if (!pouleId) throw new Error("Choisissez une poule.");
    var payload = buildPouleSharePayload(pouleId);
    var record = QrExchangeCore.buildExportRecord("championnat-poule-unique", payload, {});
    return QrExchangeCore.encodeRecord(record);
  }

  function renderPouleShareQr(link) {
    clearNode(shareQrHostEl);
    if (!shareQrHostEl || !link || typeof QRCode === "undefined") return;
    new QRCode(shareQrHostEl, {
      text: link,
      width: 220,
      height: 220,
      correctLevel: QRCode.CorrectLevel.L,
      margin: 1,
    });
  }

  function copyShareLink() {
    if (!shareLinkEl || !shareLinkEl.value) {
      montrerMsg("Générez d'abord un lien.");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareLinkEl.value).then(
        function () {
          montrerMsg("Lien copié.");
        },
        function () {
          montrerMsg("Copie impossible.");
        }
      );
      return;
    }
    var tmp = document.createElement("textarea");
    tmp.value = shareLinkEl.value;
    tmp.setAttribute("readonly", "readonly");
    tmp.style.position = "fixed";
    tmp.style.left = "-9999px";
    document.body.appendChild(tmp);
    tmp.select();
    try {
      document.execCommand("copy");
      montrerMsg("Lien copié.");
    } catch (_e) {
      montrerMsg("Copie impossible.");
    } finally {
      document.body.removeChild(tmp);
    }
  }

  function renderTeams() {
    OutilsDom.clear(teamListEl);
    if (state.teams.length === 0) {
      var li0 = document.createElement("li");
      li0.className = "champ-team-empty";
      li0.textContent = "Aucun participant pour le moment.";
      teamListEl.appendChild(li0);
      return;
    }
    var items = state.teams.slice();
    var order = teamListOrderEl ? teamListOrderEl.value : "poule";
    if (order === "alpha") {
      items.sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      });
    } else if (order === "niveau") {
      items = sortTeamsByLevelDesc();
    } else {
      items.sort(function (a, b) {
        var ia = state.poules.findIndex(function (p) { return p.id === a.pouleId; });
        var ib = state.poules.findIndex(function (p) { return p.id === b.pouleId; });
        if (ia !== ib) return ia - ib;
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      });
    }

    var enableGrouping = order === "poule" || order === "niveau";
    var lastGroupLabel = null;
    function getGroupLabel(team) {
      if (order === "alpha") {
        var first = String(team.name || "").trim().charAt(0).toUpperCase();
        return first || "#";
      }
      if (order === "niveau") {
        return team.niveau === null ? "Sans niveau" : "Niveau " + team.niveau;
      }
      var p = state.poules.find(function (x) {
        return x.id === team.pouleId;
      });
      return p ? p.name : "Sans poule";
    }
    function appendGroupTitle(label) {
      var li = document.createElement("li");
      li.className = "champ-team-group-title";
      li.textContent = label;
      teamListEl.appendChild(li);
    }

    items.forEach(function (t) {
      if (enableGrouping) {
        var groupLabel = getGroupLabel(t);
        if (groupLabel !== lastGroupLabel) {
          appendGroupTitle(groupLabel);
          lastGroupLabel = groupLabel;
        }
      }
      var li = document.createElement("li");
      li.className = "champ-team-row";

      var nameSpan = document.createElement("span");
      nameSpan.className = "champ-team-name";
      nameSpan.textContent = t.name;

      var poolSelect = document.createElement("select");
      poolSelect.className = "champ-team-poule-current";
      state.poules.forEach(function (p) {
        var o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name;
        if (p.id === t.pouleId) o.selected = true;
        poolSelect.appendChild(o);
      });
      applyPouleColorStyle(poolSelect, t.pouleId);
      poolSelect.addEventListener("change", function () {
        changerPouleEquipe(t.id, poolSelect.value);
      });

      var actions = document.createElement("div");
      actions.className = "champ-team-actions";

      var levelWrap = document.createElement("div");
      levelWrap.className = "champ-team-level";
      var levelSelect = document.createElement("select");
      levelSelect.className = "champ-team-level__select";
      var optEmpty = document.createElement("option");
      optEmpty.value = "";
      optEmpty.textContent = "Niv. -";
      levelSelect.appendChild(optEmpty);
      [1, 2, 3, 4, 5].forEach(function (n) {
        var opt = document.createElement("option");
        opt.value = String(n);
        opt.textContent = "Niv. " + n;
        if (t.niveau === n) opt.selected = true;
        levelSelect.appendChild(opt);
      });
      levelSelect.addEventListener("change", function () {
        setNiveauEquipe(t.id, levelSelect.value);
      });
      levelWrap.appendChild(levelSelect);
      li.appendChild(levelWrap);

      var bEdit = document.createElement("button");
      bEdit.type = "button";
      bEdit.className = "btn btn--ghost btn--icon-only btn--small";
      bEdit.setAttribute("aria-label", "Renommer " + t.name);
      OutilsDom.setIconButton(bEdit, "✏️", "Renommer " + t.name);
      bEdit.addEventListener("click", function () {
        var nv = window.prompt("Nouveau nom :", t.name);
        if (nv !== null) renommerEquipe(t.id, nv);
      });

      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--icon-only btn--small";
      bDel.setAttribute("aria-label", "Supprimer " + t.name);
      OutilsDom.setIconButton(bDel, "🗑️", "Supprimer " + t.name);
      bDel.addEventListener("click", function () {
        supprimerEquipe(t.id);
      });

      actions.appendChild(bEdit);
      actions.appendChild(bDel);
      applyPouleColorStyle(li, t.pouleId);
      li.appendChild(nameSpan);
      li.appendChild(poolSelect);
      li.appendChild(actions);
      teamListEl.appendChild(li);
    });
  }

  function renderGestionPanels() {
    if (gestionPanelAffectationEl) gestionPanelAffectationEl.hidden = activeGestionPanel !== "affectation";
    if (gestionPanelAffichageEl) gestionPanelAffichageEl.hidden = activeGestionPanel !== "affichage";
    if (!gestionMenuEl) return;
    var buttons = gestionMenuEl.querySelectorAll("[data-gestion-panel-target]");
    Array.prototype.forEach.call(buttons, function (btn) {
      var target = btn.getAttribute("data-gestion-panel-target");
      var isActive = target === activeGestionPanel;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    updateGestionMenuIndicator();
  }

  function updateGestionMenuIndicator() {
    if (!gestionMenuEl || !gestionMenuIndicatorEl) return;
    var active = gestionMenuEl.querySelector(".champ-gestion-menu__item.is-active");
    if (!active) return;
    gestionMenuIndicatorEl.style.width = active.offsetWidth + "px";
    gestionMenuIndicatorEl.style.transform = "translateX(" + active.offsetLeft + "px)";
  }

  function renderPoolsBoard() {
    if (!teamPoolsBoardEl) return;
    OutilsDom.clear(teamPoolsBoardEl);
    if (!state.poules.length) return;
    state.poules.forEach(function (p) {
      var col = document.createElement("section");
      col.className = "champ-pools-board__col";
      applyPouleColorStyle(col, p.id);
      var h = document.createElement("h3");
      h.className = "champ-pools-board__title";
      var teams = teamsForPoule(p.id);
      var validLevels = teams
        .map(function (t) {
          return normalizeNiveau(t.niveau);
        })
        .filter(function (n) {
          return n !== null;
        });
      var avg = validLevels.length
        ? Math.round((validLevels.reduce(function (s, n) { return s + n; }, 0) / validLevels.length) * 10) / 10
        : null;
      h.textContent = p.name + " (" + teams.length + ") · Moy: " + (avg === null ? "-" : avg);
      var head = document.createElement("div");
      head.className = "champ-pools-board__head";
      head.appendChild(h);
      col.appendChild(head);
      var ul = document.createElement("ul");
      ul.className = "champ-pools-board__list";
      if (!teams.length) {
        var li0 = document.createElement("li");
        li0.className = "champ-pools-board__empty";
        li0.textContent = "Aucun participant";
        ul.appendChild(li0);
      } else {
        teams.forEach(function (t) {
          var li = document.createElement("li");
          li.textContent = t.name + " (niv. " + (t.niveau === null ? "-" : t.niveau) + ")";
          ul.appendChild(li);
        });
      }
      col.appendChild(ul);
      teamPoolsBoardEl.appendChild(col);
    });
  }

  function buildMatchRow(m) {
    var row = document.createElement("div");
    row.className = "match-row";
    row.setAttribute("data-match-id", m.id);
    applyPouleColorStyle(row, m.pouleId);

    var nHome = document.createElement("span");
    nHome.className = "match-row__name";
    nHome.textContent = nomEquipe(m.homeId);

    var inpH = document.createElement("input");
    inpH.type = "number";
    inpH.min = "0";
    inpH.step = "1";
    inpH.inputMode = "numeric";
    inpH.className = "match-row__score";
    inpH.setAttribute("aria-label", "Score " + nomEquipe(m.homeId));
    inpH.value = m.homeScore !== null && typeof m.homeScore !== "undefined" ? String(m.homeScore) : "";
    inpH.dataset.matchId = m.id;
    inpH.dataset.side = "home";

    var sep = document.createElement("span");
    sep.className = "match-row__sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "—";

    var inpA = document.createElement("input");
    inpA.type = "number";
    inpA.min = "0";
    inpA.step = "1";
    inpA.inputMode = "numeric";
    inpA.className = "match-row__score";
    inpA.setAttribute("aria-label", "Score " + nomEquipe(m.awayId));
    inpA.value = m.awayScore !== null && typeof m.awayScore !== "undefined" ? String(m.awayScore) : "";
    inpA.dataset.matchId = m.id;
    inpA.dataset.side = "away";

    var nAway = document.createElement("span");
    nAway.className = "match-row__name match-row__name--away";
    nAway.textContent = nomEquipe(m.awayId);

    row.appendChild(nHome);
    row.appendChild(inpH);
    row.appendChild(sep);
    row.appendChild(inpA);
    row.appendChild(nAway);
    var badge = document.createElement("span");
    badge.className = "match-row__pool";
    var pool = state.poules.find(function (p) { return p.id === m.pouleId; });
    badge.textContent = pool ? pool.name : "Poule";
    applyPouleColorStyle(badge, m.pouleId);
    row.appendChild(badge);
    return row;
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function matchSearchHaystack(m) {
    var pool = state.poules.find(function (p) { return p.id === m.pouleId; });
    var day = m.journee || 1;
    return normalizeSearchText(
      [
        nomEquipe(m.homeId),
        nomEquipe(m.awayId),
        pool ? pool.name : "Poule",
        "journee " + day,
        "j" + day,
        String(day),
      ].join(" ")
    );
  }

  function renderMatches() {
    OutilsDom.clear(matchListEl);
    if (accordionMatchsTitleEl) {
      accordionMatchsTitleEl.textContent = "⚽ Matchs (0 restants)";
    }
    if (state.teams.length < 2) {
      var p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Ajoutez au moins deux participants pour générer les matchs.";
      matchListEl.appendChild(p);
      return;
    }
    if (state.matches.length === 0) {
      var p2 = document.createElement("p");
      p2.className = "hint";
      p2.textContent = "Aucun match (état inattendu).";
      matchListEl.appendChild(p2);
      return;
    }

    var selected = standingsFilterEl && standingsFilterEl.value ? standingsFilterEl.value : "all";
    var query = normalizeSearchText(matchSearchEl ? matchSearchEl.value : "");
    var filtered = state.matches.filter(function (m) {
      var poolOk = selected === "all" || (m.pouleId || DEFAULT_POULE_ID) === selected;
      var searchOk = !query || matchSearchHaystack(m).indexOf(query) !== -1;
      return poolOk && searchOk;
    });
    var remaining = filtered.filter(function (m) {
      return m.homeScore == null || m.awayScore == null;
    }).length;
    if (accordionMatchsTitleEl) {
      accordionMatchsTitleEl.textContent = "⚽ Matchs (" + remaining + " restants)";
    }
    if (!filtered.length) {
      var empty = document.createElement("p");
      empty.className = "hint champ-match-filter__empty";
      empty.textContent = query
        ? "Aucun match ne correspond à ce filtre."
        : "Aucun match à afficher pour cette poule.";
      matchListEl.appendChild(empty);
      return;
    }
    var byDay = {};
    var maxDay = 0;
    filtered.forEach(function (m) {
      var d = m.journee || 1;
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(m);
      if (d > maxDay) maxDay = d;
    });
    for (var jr = 1; jr <= maxDay; jr++) {
      var list = byDay[jr];
      if (!list || !list.length) continue;
      var bloc = document.createElement("section");
      bloc.className = "champ-journee";
      var h3 = document.createElement("h3");
      h3.className = "champ-journee__title";
      h3.textContent = "Journée " + jr + " · " + list.length + " match" + (list.length > 1 ? "s" : "");
      bloc.appendChild(h3);
      list.forEach(function (m) {
        bloc.appendChild(buildMatchRow(m));
      });
      matchListEl.appendChild(bloc);
    }
  }

  function renderStandings() {
    var grouped = computeStandingsByPool();
    var selected = standingsFilterEl && standingsFilterEl.value ? standingsFilterEl.value : "all";
    applyStandingsHeaderColor(selected);
    var rows = [];
    grouped.forEach(function (g) {
      if (selected !== "all" && g.pouleId !== selected) return;
      g.rows.forEach(function (r) {
        rows.push(
          Object.assign({}, r, {
            poolLabel: selected === "all" ? g.pouleNom : "",
            poolId: g.pouleId,
          })
        );
      });
    });
    OutilsDom.clear(standingsBody);
    if (rows.length === 0) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 10;
      td0.className = "champ-table-empty";
      td0.textContent = "Ajoutez des participants pour voir le classement.";
      tr0.appendChild(td0);
      standingsBody.appendChild(tr0);
      return;
    }
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      function td(txt) {
        var c = document.createElement("td");
        c.textContent = String(txt);
        return c;
      }
      tr.appendChild(td(r.rang));
      var tdName = document.createElement("td");
      if (selected === "all" && r.poolLabel) {
        var badge = document.createElement("span");
        badge.className = "match-row__pool champ-standings-pool-badge";
        badge.textContent = r.poolLabel;
        applyPouleColorStyle(badge, r.poolId);
        tdName.appendChild(badge);
      }
      var nameText = document.createElement("span");
      nameText.textContent = r.name;
      tdName.appendChild(nameText);
      tr.appendChild(tdName);
      tr.appendChild(td(r.mj));
      tr.appendChild(td(r.v));
      tr.appendChild(td(r.n));
      tr.appendChild(td(r.d));
      tr.appendChild(td(r.pour));
      tr.appendChild(td(r.contre));
      tr.appendChild(td((r.diff >= 0 ? "+" : "") + r.diff));
      var tdPts = document.createElement("td");
      var strong = document.createElement("strong");
      strong.textContent = String(r.pts);
      tdPts.appendChild(strong);
      tr.appendChild(tdPts);
      standingsBody.appendChild(tr);
    });
  }

  function renderStandingsOnly() {
    renderStandings();
    renderMatches();
  }

  function render() {
    renderPoulesSelects();
    renderGestionPanels();
    renderTeams();
    renderPoolsBoard();
    renderMatches();
    renderStandings();
  }

  function exportCsv() {
    var rows = [];
    computeStandingsByPool().forEach(function (pool) {
      pool.rows.forEach(function (r) {
        rows.push(Object.assign({ poule: pool.pouleNom }, r));
      });
    });
    var headers = [
      "Poule",
      "Rang",
      "Participant",
      "Matchs joués",
      "Victoires",
      "Matchs nuls",
      "Défaites",
      "Points marqués",
      "Points encaissés",
      "Différence",
      "Points au classement",
    ];
    var lines = [headers.join(";")];
    rows.forEach(function (r) {
      lines.push(
        [
          csvCell(r.poule),
          r.rang,
          csvCell(r.name),
          r.mj,
          r.v,
          r.n,
          r.d,
          r.pour,
          r.contre,
          r.diff,
          r.pts,
        ].join(";")
      );
    });
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classement-championnat.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function csvCell(s) {
    var t = String(s).replace(/"/g, '""');
    if (/[;\r\n"]/.test(t)) return '"' + t + '"';
    return t;
  }

  matchListEl.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains("match-row__score")) return;
    var mid = el.getAttribute("data-match-id");
    var side = el.getAttribute("data-side");
    if (!mid || !side) return;
    majScore(mid, side, el.value);
  });

  if (matchSearchEl) {
    matchSearchEl.addEventListener("input", renderMatches);
  }
  if (btnClearMatchSearch && matchSearchEl) {
    btnClearMatchSearch.addEventListener("click", function () {
      matchSearchEl.value = "";
      renderMatches();
      matchSearchEl.focus();
    });
  }

  btnAdd.addEventListener("click", function () {
    ajouterEquipe(newTeamEl.value);
    newTeamEl.value = "";
    newTeamEl.focus();
  });
  newTeamEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      ajouterEquipe(newTeamEl.value);
      newTeamEl.value = "";
    }
  });

  btnResetScores.addEventListener("click", resetScores);
  btnExport.addEventListener("click", exportCsv);
  btnDeleteAll.addEventListener("click", supprimerTout);
  if (btnAssignRandom) btnAssignRandom.addEventListener("click", applyRandomAssignment);
  if (btnAssignHomogeneous) btnAssignHomogeneous.addEventListener("click", applyHomogeneousAssignment);
  if (btnAssignHeterogeneous) btnAssignHeterogeneous.addEventListener("click", applyHeterogeneousAssignment);
  if (teamListOrderEl) {
    teamListOrderEl.addEventListener("change", function () {
      renderTeams();
    });
  }
  if (gestionMenuEl) {
    gestionMenuEl.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-gestion-panel-target]") : null;
      if (!btn) return;
      var target = btn.getAttribute("data-gestion-panel-target");
      if (!target) return;
      activeGestionPanel = target;
      renderGestionPanels();
    });
  }
  window.addEventListener("resize", updateGestionMenuIndicator);
  if (btnOpenAddPouleDialog) btnOpenAddPouleDialog.addEventListener("click", openAddPouleDialog);
  if (btnOpenManagePouleDialog) btnOpenManagePouleDialog.addEventListener("click", openManagePouleDialog);
  if (btnCloseAddPouleDialog && addPouleDialogEl) {
    btnCloseAddPouleDialog.addEventListener("click", function () {
      addPouleDialogEl.close();
    });
  }
  if (btnCloseManagePouleDialog && managePouleDialogEl) {
    btnCloseManagePouleDialog.addEventListener("click", function () {
      managePouleDialogEl.close();
    });
  }
  if (btnConfirmAddPoule) btnConfirmAddPoule.addEventListener("click", confirmAddPouleFromDialog);
  if (managePouleSelectEl) {
    managePouleSelectEl.addEventListener("change", function () {
      var p = state.poules.find(function (x) {
        return x.id === managePouleSelectEl.value;
      });
      if (managePouleNameEl) managePouleNameEl.value = p ? p.name : "";
    });
  }
  if (btnRenamePouleDialog) btnRenamePouleDialog.addEventListener("click", renameSelectedPouleFromDialog);
  if (btnDeletePouleDialog) btnDeletePouleDialog.addEventListener("click", deleteSelectedPouleFromDialog);
  if (standingsFilterEl) standingsFilterEl.addEventListener("change", renderStandingsOnly);

  var btnImportClasse = document.getElementById("btn-import-classe-champ");
  if (btnImportClasse && typeof ClassImport !== "undefined") {
    btnImportClasse.addEventListener("click", function () {
      ClassImport.open({
        title: "Importer des participants depuis une classe",
        hint: "Chaque élève coché devient un participant (nom prénom).",
        onConfirm: function (eleves, classe) {
          var ajout = 0;
          eleves.forEach(function (e) {
            var name =
              typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
                ? EleveDisplay.formatEleveListe(e, "")
                : [e.nom, e.prenom].filter(Boolean).join(" ").trim();
            if (!name) return;
            var existe = state.teams.some(function (t) {
              return t.name === name && t.eleveId === e.id;
            });
            if (!existe) {
              state.teams.push({
                id: genererId(),
                name: name,
                eleveId: e.id || null,
                niveau: normalizeNiveau(e.niveau),
                pouleId: state.poules[0].id,
              });
              ajout++;
            }
          });
          if (!ajout) {
            montrerMsg("Aucun nouveau participant à ajouter.");
            return;
          }
          reconstruireMatchsDepuisEquipes();
          sauverImmediate();
          render();
          montrerMsg(ajout + " participant(s) importé(s) depuis « " + classe.nom + " ».");
        },
      });
    });
  }

  function normalizeName(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function scoreEquals(a, b) {
    return (a == null && b == null) || a === b;
  }

  function scoreLabel(v) {
    return v == null ? "vide" : String(v);
  }

  function normalizePouleName(name) {
    return normalizeName(name || "");
  }

  function collectImportParticipants(entries) {
    var map = {};
    function upsert(side, entry) {
      var teamId = side === "home" ? (entry.homeProfTeamId || entry.homeTeamId || null) : (entry.awayProfTeamId || entry.awayTeamId || null);
      var eleveId = side === "home" ? (entry.homeEleveId || null) : (entry.awayEleveId || null);
      var name = side === "home" ? (entry.homeName || "") : (entry.awayName || "");
      var key = String(teamId || "") + "|" + String(eleveId || "") + "|" + normalizeName(name);
      if (!map[key]) {
        map[key] = {
          sourceKey: key,
          name: name || "Participant",
          teamIdFromQr: teamId,
          eleveId: eleveId,
        };
      }
    }
    entries.forEach(function (entry) {
      upsert("home", entry);
      upsert("away", entry);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function resolveTargetPouleForImport(record, participants) {
    var payload = record.payload || {};
    var source = payload.source || {};
    var sourcePouleId = source.pouleId || payload.pouleId || null;
    var sourcePouleName = source.pouleName || payload.pouleName || null;
    if (sourcePouleId) {
      var byId = state.poules.find(function (p) { return p.id === sourcePouleId; });
      if (byId) {
        return { status: "existing", pouleId: byId.id, pouleName: byId.name, reason: "id source" };
      }
    }
    if (sourcePouleName) {
      var nName = normalizePouleName(sourcePouleName);
      var byName = state.poules.find(function (p) { return normalizePouleName(p.name) === nName; });
      if (byName) {
        return { status: "existing", pouleId: byName.id, pouleName: byName.name, reason: "nom source" };
      }
    }
    var countByPool = {};
    participants.forEach(function (p) {
      if (p.status === "matched" && p.matchedTeamId) {
        var t = state.teams.find(function (x) { return x.id === p.matchedTeamId; });
        if (t && t.pouleId) countByPool[t.pouleId] = (countByPool[t.pouleId] || 0) + 1;
      }
    });
    var bestPool = null;
    Object.keys(countByPool).forEach(function (pid) {
      if (!bestPool || countByPool[pid] > bestPool.count) bestPool = { id: pid, count: countByPool[pid] };
    });
    if (bestPool) {
      var p = state.poules.find(function (x) { return x.id === bestPool.id; });
      return { status: "existing", pouleId: p.id, pouleName: p.name, reason: "majorité des élèves reconnus" };
    }
    var desired = (sourcePouleName || "Poule " + String.fromCharCode(65 + state.poules.length)).trim();
    if (state.teams.length === 0) {
      return { status: "create", pouleId: null, pouleName: desired, reason: "championnat vide" };
    }
    return { status: "create", pouleId: null, pouleName: desired, reason: "poule source absente" };
  }

  function resolveParticipantFromImportParticipant(p, targetPouleId) {
    var exactTeam = p.teamIdFromQr
      ? state.teams.find(function (t) { return t.id === p.teamIdFromQr; })
      : null;
    if (exactTeam) {
      return { status: "matched", matchedTeamId: exactTeam.id, candidates: [] };
    }
    var exactEleve = p.eleveId
      ? state.teams.find(function (t) { return t.eleveId && t.eleveId === p.eleveId; })
      : null;
    if (exactEleve) {
      return { status: "matched", matchedTeamId: exactEleve.id, candidates: [] };
    }
    var n = normalizeName(p.name);
    if (!n) return { status: "create", matchedTeamId: null, candidates: [] };
    var inTarget = state.teams.filter(function (t) {
      return t.pouleId === targetPouleId && normalizeName(t.name) === n;
    });
    if (inTarget.length === 1) {
      return { status: "matched", matchedTeamId: inTarget[0].id, candidates: [] };
    }
    if (inTarget.length > 1) {
      return {
        status: "ambiguous",
        matchedTeamId: null,
        candidates: inTarget.map(function (t) { return t.id; }),
      };
    }
    var global = state.teams.filter(function (t) {
      return normalizeName(t.name) === n;
    });
    if (global.length === 1) {
      return { status: "matched", matchedTeamId: global[0].id, candidates: [] };
    }
    if (global.length > 1) {
      return {
        status: "ambiguous",
        matchedTeamId: null,
        candidates: global.map(function (t) { return t.id; }),
      };
    }
    return { status: "create", matchedTeamId: null, candidates: [] };
  }

  function buildImportPlanFromEleveResults(record, options) {
    options = options || {};
    var payload = record.payload || {};
    var entries = Array.isArray(payload.entries) ? payload.entries : [];
    var participants = collectImportParticipants(entries).map(function (p) {
      return {
        sourceKey: p.sourceKey,
        name: p.name,
        teamIdFromQr: p.teamIdFromQr || null,
        eleveId: p.eleveId || null,
        status: "ignored",
        matchedTeamId: null,
        candidates: [],
      };
    });
    var manualMap = options.manualMap || {};
    var provisional = participants.map(function (p) {
      var p2 = Object.assign({}, p);
      if (manualMap[p.sourceKey]) {
        p2.status = "matched";
        p2.matchedTeamId = manualMap[p.sourceKey];
      }
      return p2;
    });
    var target = options.targetOverride || resolveTargetPouleForImport(record, provisional);
    var targetPouleId = target.pouleId;
    participants = participants.map(function (p) {
      var out = Object.assign({}, p);
      if (manualMap[p.sourceKey]) {
        out.status = "matched";
        out.matchedTeamId = manualMap[p.sourceKey];
        return out;
      }
      var r = resolveParticipantFromImportParticipant(p, targetPouleId);
      out.status = r.status;
      out.matchedTeamId = r.matchedTeamId;
      out.candidates = r.candidates || [];
      return out;
    });
    var bySourceKey = {};
    participants.forEach(function (p) { bySourceKey[p.sourceKey] = p; });
    var unresolvedMatchCount = 0;
    var scoreActions = [];
    entries.forEach(function (entry) {
      var homeKey = String(entry.homeProfTeamId || entry.homeTeamId || "") + "|" + String(entry.homeEleveId || "") + "|" + normalizeName(entry.homeName || "");
      var awayKey = String(entry.awayProfTeamId || entry.awayTeamId || "") + "|" + String(entry.awayEleveId || "") + "|" + normalizeName(entry.awayName || "");
      var hp = bySourceKey[homeKey];
      var ap = bySourceKey[awayKey];
      if (!hp || !ap || hp.status !== "matched" || ap.status !== "matched") {
        unresolvedMatchCount++;
        scoreActions.push({
          matchId: null,
          homeName: entry.homeName || "?",
          awayName: entry.awayName || "?",
          currentHomeScore: null,
          currentAwayScore: null,
          incomingHomeScore: parseScoreInput(entry.homeScore),
          incomingAwayScore: parseScoreInput(entry.awayScore),
          status: "unresolved",
        });
        return;
      }
      var match = state.matches.find(function (m) {
        return (
          (m.homeId === hp.matchedTeamId && m.awayId === ap.matchedTeamId) ||
          (m.homeId === ap.matchedTeamId && m.awayId === hp.matchedTeamId)
        );
      });
      if (!match) {
        scoreActions.push({
          matchId: null,
          homeName: entry.homeName || "?",
          awayName: entry.awayName || "?",
          currentHomeScore: null,
          currentAwayScore: null,
          incomingHomeScore: parseScoreInput(entry.homeScore),
          incomingAwayScore: parseScoreInput(entry.awayScore),
          status: "create_after_rebuild",
        });
        return;
      }
      var incomingHome = null;
      var incomingAway = null;
      if (match.homeId === hp.matchedTeamId) {
        incomingHome = parseScoreInput(entry.homeScore);
        incomingAway = parseScoreInput(entry.awayScore);
      } else {
        incomingHome = parseScoreInput(entry.awayScore);
        incomingAway = parseScoreInput(entry.homeScore);
      }
      var status = "unchanged";
      if (!scoreEquals(match.homeScore, incomingHome) || !scoreEquals(match.awayScore, incomingAway)) {
        status = (match.homeScore == null && match.awayScore == null) ? "fill_empty" : "conflict";
      }
      scoreActions.push({
        matchId: match.id,
        homeName: nomEquipe(match.homeId),
        awayName: nomEquipe(match.awayId),
        currentHomeScore: match.homeScore,
        currentAwayScore: match.awayScore,
        incomingHomeScore: incomingHome,
        incomingAwayScore: incomingAway,
        status: status,
      });
    });
    var importIds = state.importMeta && state.importMeta.importedExportIds ? state.importMeta.importedExportIds : {};
    var source = payload.source || {};
    var exportId = record.exportId || null;
    return {
      valid: true,
      errors: [],
      warnings: [],
      source: {
        exportId: exportId,
        pouleId: source.pouleId || payload.pouleId || null,
        pouleName: source.pouleName || payload.pouleName || null,
      },
      targetPoule: target,
      participants: participants,
      scoreActions: scoreActions,
      stats: {
        entriesReceived: entries.length,
        participantsReceived: participants.length,
        participantsMatched: participants.filter(function (p) { return p.status === "matched"; }).length,
        participantsToCreate: participants.filter(function (p) { return p.status === "create"; }).length,
        participantsAmbiguous: participants.filter(function (p) { return p.status === "ambiguous"; }).length,
        scoresToFill: scoreActions.filter(function (s) { return s.status === "fill_empty"; }).length,
        conflicts: scoreActions.filter(function (s) { return s.status === "conflict"; }).length,
        unchanged: scoreActions.filter(function (s) { return s.status === "unchanged"; }).length,
        unresolved: unresolvedMatchCount + scoreActions.filter(function (s) { return s.status === "create_after_rebuild"; }).length,
        alreadyImported: !!(exportId && importIds[exportId]),
      },
      lastImportedAt: exportId && importIds[exportId] ? importIds[exportId] : null,
      manualMap: manualMap,
      targetOverride: options.targetOverride || null,
      record: record,
    };
  }

  function resolveTeamForEntry(entry, side, manualNameMap) {
    var teamIdKey = side === "home" ? "homeTeamId" : "awayTeamId";
    var profTeamIdKey = side === "home" ? "homeProfTeamId" : "awayProfTeamId";
    var eleveIdKey = side === "home" ? "homeEleveId" : "awayEleveId";
    var nameKey = side === "home" ? "homeName" : "awayName";
    var t = null;
    if (entry[profTeamIdKey]) {
      t = state.teams.find(function (x) { return x.id === entry[profTeamIdKey]; });
    }
    if (entry[teamIdKey]) {
      t = state.teams.find(function (x) { return x.id === entry[teamIdKey]; });
    }
    if (!t && entry[eleveIdKey]) {
      t = state.teams.find(function (x) { return x.eleveId === entry[eleveIdKey]; });
    }
    if (!t && entry[nameKey]) {
      var norm = normalizeName(entry[nameKey]);
      if (manualNameMap && manualNameMap[norm]) {
        t = state.teams.find(function (x) { return x.id === manualNameMap[norm]; });
      }
      if (!t) {
        t = state.teams.find(function (x) { return normalizeName(x.name) === norm; });
      }
    }
    return t;
  }

  function addTeamForSync(name, targetPouleId) {
    var n = (name || "").trim();
    if (!n) return null;
    var pid = targetPouleId || (state.poules[0] && state.poules[0].id) || DEFAULT_POULE_ID;
    var team = { id: genererId(), name: n, eleveId: null, niveau: null, pouleId: pid };
    state.teams.push(team);
    reconstruireMatchsDepuisEquipes();
    return team;
  }

  function fillSyncPouleOptions() {
    if (!syncExistingPouleSelectEl) return;
    var current = syncExistingPouleSelectEl.value;
    OutilsDom.clear(syncExistingPouleSelectEl);
    state.poules.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      syncExistingPouleSelectEl.appendChild(o);
    });
    if (current && state.poules.some(function (p) { return p.id === current; })) {
      syncExistingPouleSelectEl.value = current;
    } else if (state.poules[0]) {
      syncExistingPouleSelectEl.value = state.poules[0].id;
    }
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("fr-FR");
    } catch (_e) {
      return "";
    }
  }

  function pluralizeFr(n, singular, plural) {
    return n + " " + (n > 1 ? plural : singular);
  }

  function escapeHtmlText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildImportDecisionText(plan) {
    var targetName = plan.targetPoule && plan.targetPoule.pouleName ? plan.targetPoule.pouleName : "la poule cible";
    var parts = [];
    if (plan.stats.scoresToFill) {
      parts.push("remplir " + pluralizeFr(plan.stats.scoresToFill, "score vide", "scores vides"));
    }
    if (plan.stats.conflicts) {
      parts.push("examiner " + pluralizeFr(plan.stats.conflicts, "conflit", "conflits"));
    }
    if (plan.stats.participantsToCreate) {
      parts.push("créer " + pluralizeFr(plan.stats.participantsToCreate, "participant", "participants"));
    }
    if (plan.stats.participantsAmbiguous) {
      parts.push("valider " + pluralizeFr(plan.stats.participantsAmbiguous, "correspondance", "correspondances"));
    }
    if (!parts.length) {
      parts.push("ne rien modifier pour le moment");
    }
    return "Cet import va " + parts.join(", ") + " dans " + targetName + ".";
  }

  function getSessionSecurityLabel() {
    var label = "Séance active";
    if (typeof SessionManager === "undefined") return label;
    var s = SessionManager.getActiveSession && SessionManager.getActiveSession();
    if (!s) return label;
    return s.nomSession ? 'Séance active: "' + s.nomSession + '"' : label;
  }

  function renderSyncPouleModeFields() {
    if (!pendingSyncAllowPouleMode) {
      if (syncPouleModeEl && syncPouleModeEl.parentElement) syncPouleModeEl.parentElement.hidden = true;
      if (syncExistingPouleWrapEl) syncExistingPouleWrapEl.hidden = true;
      if (syncNewPouleWrapEl) syncNewPouleWrapEl.hidden = true;
      return;
    }
    if (syncPouleModeEl && syncPouleModeEl.parentElement) syncPouleModeEl.parentElement.hidden = false;
    var mode = syncPouleModeEl ? syncPouleModeEl.value : "existing";
    if (syncExistingPouleWrapEl) syncExistingPouleWrapEl.hidden = mode !== "existing";
    if (syncNewPouleWrapEl) syncNewPouleWrapEl.hidden = mode !== "new";
  }

  function resolveSyncTargetPouleId() {
    if (!pendingSyncAllowPouleMode && pendingSyncForcedPouleId) {
      return pendingSyncForcedPouleId;
    }
    var mode = syncPouleModeEl ? syncPouleModeEl.value : "existing";
    if (mode !== "new") {
      return (syncExistingPouleSelectEl && syncExistingPouleSelectEl.value) || (state.poules[0] && state.poules[0].id) || DEFAULT_POULE_ID;
    }
    var name = (syncNewPouleNameEl && syncNewPouleNameEl.value || "").trim();
    if (!name) name = nextDefaultPouleName();
    var existing = state.poules.find(function (p) {
      return normalizeName(p.name) === normalizeName(name);
    });
    if (existing) return existing.id;
    var newId = genererId();
    state.poules.push({ id: newId, name: name });
    fillSyncPouleOptions();
    renderPoulesSelects();
    return newId;
  }

  function importedUniqueNamesFromRecord(record) {
    var payload = (record && record.payload) || {};
    var entries = Array.isArray(payload.entries) ? payload.entries : [];
    var seen = {};
    entries.forEach(function (e) {
      if (e.homeName) seen[normalizeName(e.homeName)] = true;
      if (e.awayName) seen[normalizeName(e.awayName)] = true;
    });
    return Object.keys(seen).filter(Boolean);
  }

  function inferPouleFromMatchedEntries(record) {
    var payload = (record && record.payload) || {};
    var entries = Array.isArray(payload.entries) ? payload.entries : [];
    var countByPool = {};
    entries.forEach(function (entry) {
      ["home", "away"].forEach(function (side) {
        var team = resolveTeamForEntry(entry, side, null);
        if (!team || !team.pouleId) return;
        countByPool[team.pouleId] = (countByPool[team.pouleId] || 0) + 1;
      });
    });
    var best = null;
    Object.keys(countByPool).forEach(function (pid) {
      if (!best || countByPool[pid] > best.count) best = { id: pid, count: countByPool[pid] };
    });
    return best ? best.id : null;
  }

  function buildTeamSelectOptions(selectEl, selectedTeamId) {
    OutilsDom.clear(selectEl);
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "— Choisir un élève —";
    selectEl.appendChild(empty);
    state.teams
      .slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      })
      .forEach(function (t) {
        var opt = document.createElement("option");
        opt.value = t.id;
        var pool = state.poules.find(function (p) { return p.id === t.pouleId; });
        var level = t.niveau == null ? "-" : String(t.niveau);
        opt.textContent = t.name + " · " + (pool ? pool.name : "Sans poule") + " · niv " + level;
        if (selectedTeamId && selectedTeamId === t.id) opt.selected = true;
        selectEl.appendChild(opt);
      });
  }

  function suggestTeamIdForName(rawName) {
    var target = normalizeName(rawName);
    if (!target) return null;
    var tokens = target.split(" ").filter(Boolean);
    var candidates = state.teams
      .map(function (t) {
        var tn = normalizeName(t.name);
        if (!tn) return null;
        var score = 0;
        if (tn === target) score += 100;
        if (tn.indexOf(target) === 0 || target.indexOf(tn) === 0) score += 70;
        if (tn.indexOf(target) >= 0 || target.indexOf(tn) >= 0) score += 40;
        var teamTokens = tn.split(" ").filter(Boolean);
        tokens.forEach(function (tok) {
          if (tok.length < 2) return;
          if (teamTokens.indexOf(tok) >= 0) score += 20;
          else if (tn.indexOf(tok) >= 0) score += 8;
        });
        return {
          id: t.id,
          score: score,
          lenDiff: Math.abs(tn.length - target.length),
        };
      })
      .filter(function (x) {
        return x && x.score > 0;
      })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.lenDiff - b.lenDiff;
      });
    if (!candidates.length) return null;
    if (candidates.length > 1 && candidates[0].score === candidates[1].score) return null;
    return candidates[0].id;
  }

  function openSyncDialog(unmatchedNames, record) {
    if (!syncElevesDialogEl || typeof syncElevesDialogEl.showModal !== "function" || !syncElevesListEl) {
      montrerMsg(
        "Noms non reconnus: " +
          unmatchedNames.join(", ") +
          ". Ajoutez les élèves manuellement puis relancez l'import."
      );
      return;
    }
    pendingSyncRecord = record;
    pendingSyncAddedCount = 0;
    pendingSyncForcedPouleId = null;
    pendingSyncAllowPouleMode = true;
    fillSyncPouleOptions();
    if (syncPouleModeEl) syncPouleModeEl.value = "existing";
    if (syncNewPouleNameEl) syncNewPouleNameEl.value = "";
    var importedNames = importedUniqueNamesFromRecord(record);
    var allUnmatched = importedNames.length > 0 && unmatchedNames.length >= importedNames.length;
    if (!allUnmatched) {
      pendingSyncAllowPouleMode = false;
      pendingSyncForcedPouleId =
        inferPouleFromMatchedEntries(record) ||
        (state.poules[0] && state.poules[0].id) ||
        DEFAULT_POULE_ID;
      if (syncPouleModeHintEl) {
        var forced = state.poules.find(function (p) { return p.id === pendingSyncForcedPouleId; });
        syncPouleModeHintEl.textContent =
          "Des élèves correspondent déjà : les nouveaux élèves seront ajoutés automatiquement dans " +
          (forced ? forced.name : "la poule active") +
          ".";
      }
    } else if (syncPouleModeHintEl) {
      syncPouleModeHintEl.textContent =
        "Aucun élève reconnu : choisissez où placer les nouveaux élèves.";
    }
    renderSyncPouleModeFields();
    OutilsDom.clear(syncElevesListEl);
    unmatchedNames.forEach(function (name) {
      var row = document.createElement("div");
      row.className = "champ-toolbar champ-toolbar--labeled";
      row.style.marginBottom = "8px";

      var label = document.createElement("div");
      label.className = "field-group";
      label.style.flex = "1";
      var small = document.createElement("label");
      small.className = "field-label";
      small.textContent = "Nom reçu";
      var input = document.createElement("input");
      input.type = "text";
      input.readOnly = true;
      input.value = name;
      label.appendChild(small);
      label.appendChild(input);

      var selectWrap = document.createElement("div");
      selectWrap.className = "field-group";
      selectWrap.style.flex = "1";
      var selectLabel = document.createElement("label");
      selectLabel.className = "field-label";
      selectLabel.textContent = "Associer à";
      var select = document.createElement("select");
      select.className = "sync-eleve-select";
      select.setAttribute("data-sync-name", name);
      buildTeamSelectOptions(select, suggestTeamIdForName(name));
      selectWrap.appendChild(selectLabel);
      selectWrap.appendChild(select);

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn--ghost btn--labeled";
      addBtn.innerHTML = '<span class="btn__icon" aria-hidden="true">➕</span><span class="btn__text">Ajouter</span>';
      addBtn.addEventListener("click", function () {
        var proposed = window.prompt("Nom de l'élève à ajouter :", name);
        if (proposed === null) return;
        if (
          !window.confirm(
            "Ajouter cet élève va régénérer les matchs de sa poule (scores déjà saisis conservés si paire identique). Continuer ?"
          )
        ) {
          return;
        }
        var targetPouleId = resolveSyncTargetPouleId();
        var added = addTeamForSync(proposed, targetPouleId);
        if (!added) {
          montrerMsg("Nom invalide.");
          return;
        }
        pendingSyncAddedCount++;
        var selects = syncElevesListEl.querySelectorAll("select.sync-eleve-select");
        Array.prototype.forEach.call(selects, function (sel) {
          var current = sel.value;
          buildTeamSelectOptions(sel, current);
        });
        select.value = added.id;
        render();
      });

      row.appendChild(label);
      row.appendChild(selectWrap);
      row.appendChild(addBtn);
      syncElevesListEl.appendChild(row);
    });
    syncElevesDialogEl.showModal();
  }

  function openConflictImportDialog(context) {
    if (
      !conflictImportDialogEl ||
      !conflictImportListEl ||
      typeof conflictImportDialogEl.showModal !== "function"
    ) {
      return false;
    }
    pendingConflictImportContext = context;
    OutilsDom.clear(conflictImportListEl);
    context.actions
      .filter(function (a) {
        return a.conflict;
      })
      .forEach(function (a) {
        var row = document.createElement("div");
        row.className = "card card--soft";
        row.style.marginBottom = "8px";
        row.style.padding = "10px";

        var title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.marginBottom = "6px";
        title.textContent = nomEquipe(a.match.homeId) + " — " + nomEquipe(a.match.awayId);

        var prof = document.createElement("div");
        prof.textContent =
          "Actuellement : " + scoreLabel(a.match.homeScore) + " - " + scoreLabel(a.match.awayScore);

        var eleve = document.createElement("div");
        eleve.textContent =
          "Import QR : " + scoreLabel(a.incomingHome) + " - " + scoreLabel(a.incomingAway);

        row.appendChild(title);
        row.appendChild(prof);
        row.appendChild(eleve);
        conflictImportListEl.appendChild(row);
      });
    conflictImportDialogEl.showModal();
    return true;
  }

  function applyImportPlan(plan, conflictPolicy) {
    ensureImportMeta();
    var policy = conflictPolicy || "fill_empty_only";
    var targetId = plan.targetPoule.pouleId;
    var createdPoule = null;
    if (plan.targetPoule.status === "create" || !targetId) {
      targetId = genererId();
      createdPoule = { id: targetId, name: plan.targetPoule.pouleName || nextDefaultPouleName() };
      state.poules.push(createdPoule);
    }
    var createdTeams = 0;
    var participantMap = {};
    plan.participants.forEach(function (p) {
      if (p.status === "matched" && p.matchedTeamId) {
        participantMap[p.sourceKey] = p.matchedTeamId;
        return;
      }
      if (p.status === "create") {
        var created = addTeamForSync(p.name, targetId);
        if (created) {
          createdTeams++;
          participantMap[p.sourceKey] = created.id;
        }
      }
    });
    if (createdTeams > 0) {
      reconstruireMatchsDepuisEquipes();
    }
    var refreshedPlan = buildImportPlanFromEleveResults(plan.record, {
      manualMap: participantMap,
      targetOverride: {
        status: "existing",
        pouleId: targetId,
        pouleName: (state.poules.find(function (p) { return p.id === targetId; }) || {}).name || "Poule",
      },
    });
    var merged = 0;
    var unchanged = 0;
    var conflicts = 0;
    refreshedPlan.scoreActions.forEach(function (a) {
      if (!a.matchId) return;
      var match = state.matches.find(function (m) { return m.id === a.matchId; });
      if (!match) return;
      if (a.status === "unchanged") {
        unchanged++;
        return;
      }
      if (a.status === "conflict" && policy !== "overwrite_conflicts") {
        conflicts++;
        return;
      }
      match.homeScore = a.incomingHomeScore;
      match.awayScore = a.incomingAwayScore;
      merged++;
    });
    if (plan.source.exportId) {
      ensureImportMeta();
      state.importMeta.importedExportIds[plan.source.exportId] = new Date().toISOString();
    }
    sauverImmediate();
    render();
    if (standingsFilterEl && targetId) {
      standingsFilterEl.value = targetId;
      renderStandingsOnly();
    }
    clearImportInputField();
    var msg = [];
    if (createdPoule) msg.push('nouvelle poule "' + createdPoule.name + '" créée');
    if (createdTeams) msg.push(createdTeams + " élève(s) ajouté(s)");
    msg.push(merged + " score(s) importé(s)");
    if (unchanged) msg.push(unchanged + " inchangé(s)");
    if (conflicts) msg.push(conflicts + " conflit(s) conservé(s)");
    montrerMsg("Import réussi : " + msg.join(", ") + ".");
  }

  function openPreviewImportDialog(plan) {
    if (
      !previewImportDialogEl ||
      !previewImportSummaryEl ||
      !previewImportListEl ||
      typeof previewImportDialogEl.showModal !== "function"
    ) {
      return false;
    }
    pendingPreviewImportContext = plan;
    if (previewImportTargetEl) {
      previewImportTargetEl.innerHTML =
        "<strong>Poule cible</strong> : " +
        (plan.targetPoule.pouleName || "Poule") +
        " (" +
        (plan.targetPoule.status === "create" ? "sera créée" : "existante") +
        ")<br><span class=\"hint\">" +
        (plan.targetPoule.reason || "") +
        "</span>";
    }
    var needsResolution = plan.participants.filter(function (p) {
      return p.status === "ambiguous" || p.status === "create";
    });
    if (previewImportAmbiguitiesEl) {
      previewImportAmbiguitiesEl.hidden = !needsResolution.length;
      OutilsDom.clear(previewImportAmbiguitiesEl);
      if (needsResolution.length) {
        var title = document.createElement("p");
        title.className = "hint";
        title.textContent = "Correspondances à valider avant import :";
        previewImportAmbiguitiesEl.appendChild(title);
        needsResolution.forEach(function (p) {
          var wrap = document.createElement("div");
          wrap.className = "field-group";
          var lab = document.createElement("label");
          lab.className = "field-label";
          lab.textContent =
            p.status === "ambiguous"
              ? p.name + " (plusieurs correspondances possibles)"
              : p.name + " (nom non reconnu)";
          var sel = document.createElement("select");
          sel.setAttribute("data-source-key", p.sourceKey);
          var optCreate = document.createElement("option");
          optCreate.value = "__create__";
          optCreate.textContent = "Ajouter comme nouvel élève";
          if (p.status === "create") optCreate.selected = true;
          sel.appendChild(optCreate);
          var ids =
            p.candidates && p.candidates.length
              ? p.candidates.slice()
              : state.teams
                  .slice()
                  .sort(function (a, b) {
                    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
                  })
                  .map(function (t) {
                    return t.id;
                  });
          ids.forEach(function (id) {
            var t = state.teams.find(function (x) { return x.id === id; });
            if (!t) return;
            var o = document.createElement("option");
            o.value = id;
            o.textContent = t.name;
            sel.appendChild(o);
          });
          wrap.appendChild(lab);
          wrap.appendChild(sel);
          previewImportAmbiguitiesEl.appendChild(wrap);
        });
      }
    }
    var changedCount = plan.stats.scoresToFill + plan.stats.conflicts;
    var conflictCount = plan.stats.conflicts;
    var unchangedCount = plan.stats.unchanged;
    var alreadyText = plan.stats.alreadyImported && plan.lastImportedAt
      ? "QR déjà importé le " + formatDateTime(plan.lastImportedAt) + " ; détail conservé ci-dessous."
      : "";
    previewImportSummaryEl.className = "hint champ-import-preview-summary";
    previewImportSummaryEl.innerHTML =
      '<span class="champ-import-preview-decision">' +
      escapeHtmlText(buildImportDecisionText(plan)) +
      "</span>" +
      (alreadyText
        ? '<span class="champ-import-preview-chip champ-import-preview-chip--muted">ℹ️ ' + escapeHtmlText(alreadyText) + "</span>"
        : "") +
      '<span class="champ-import-preview-chip champ-import-preview-chip--neutral">📦 Données reçues: <strong>' +
      plan.stats.entriesReceived +
      "</strong></span>" +
      '<span class="champ-import-preview-chip champ-import-preview-chip--ok">✅ Changements prévus: <strong>' +
      changedCount +
      "</strong></span>" +
      '<span class="champ-import-preview-chip champ-import-preview-chip--warn">⚠️ Conflits: <strong>' +
      conflictCount +
      "</strong></span>" +
      '<span class="champ-import-preview-chip champ-import-preview-chip--muted">🔎 Non associées: <strong>' +
      plan.stats.unresolved +
      "</strong></span>";
    OutilsDom.clear(previewImportListEl);
    var conflictsOnly = plan.scoreActions.filter(function (a) { return a.status === "conflict"; });
    conflictsOnly.forEach(function (a) {
      var row = document.createElement("div");
      row.className = "card card--soft";
      row.style.marginBottom = "8px";
      row.style.padding = "10px";
      var title = document.createElement("div");
      title.style.fontWeight = "700";
      title.style.marginBottom = "6px";
      title.textContent = a.homeName + " — " + a.awayName;
      var prof = document.createElement("div");
      prof.textContent = "Actuellement : " + scoreLabel(a.currentHomeScore) + " - " + scoreLabel(a.currentAwayScore);
      var eleve = document.createElement("div");
      eleve.textContent = "Import QR : " + scoreLabel(a.incomingHomeScore) + " - " + scoreLabel(a.incomingAwayScore);
      row.appendChild(title);
      row.appendChild(prof);
      row.appendChild(eleve);
      previewImportListEl.appendChild(row);
    });
    if (!conflictsOnly.length) {
      var noConf = document.createElement("div");
      noConf.className = "hint";
      noConf.textContent = "Aucun conflit de score.";
      previewImportListEl.appendChild(noConf);
    }
    if (plan.stats.alreadyImported && unchangedCount === plan.scoreActions.length && !alreadyText) {
      previewImportSummaryEl.innerHTML +=
        '<span class="champ-import-preview-chip champ-import-preview-chip--muted">ℹ️ QR déjà importé, sans nouveauté</span>';
    }
    if (btnPreviewImportOverwrite) btnPreviewImportOverwrite.hidden = conflictCount === 0;
    previewImportDialogEl.showModal();
    return true;
  }

  function continueImportAfterPreview(policy) {
    var plan = pendingPreviewImportContext;
    if (!plan) return false;
    var manualMap = {};
    if (previewImportAmbiguitiesEl && !previewImportAmbiguitiesEl.hidden) {
      var selects = previewImportAmbiguitiesEl.querySelectorAll("select[data-source-key]");
      var unresolved = [];
      Array.prototype.forEach.call(selects, function (sel) {
        var sourceKey = sel.getAttribute("data-source-key");
        if (!sourceKey) return;
        var val = sel.value;
        if (!val) {
          unresolved.push(sourceKey);
          return;
        }
        if (val !== "__create__") manualMap[sourceKey] = val;
      });
      if (unresolved.length) {
        montrerMsg("Résolvez toutes les ambiguïtés avant import.");
        return false;
      }
    }
    var rebuilt = buildImportPlanFromEleveResults(plan.record, {
      manualMap: manualMap,
      targetOverride: plan.targetPoule,
    });
    if (rebuilt.stats.alreadyImported && rebuilt.stats.scoresToFill === 0 && rebuilt.stats.conflicts === 0 && rebuilt.stats.unresolved === 0) {
      clearImportInputField();
      montrerMsg("QR code déjà importé : aucun changement dans ces données.");
      return true;
    }
    if (rebuilt.stats.participantsAmbiguous > 0) {
      montrerMsg("Des ambiguïtés restent à résoudre.");
      pendingPreviewImportContext = rebuilt;
      openPreviewImportDialog(rebuilt);
      return false;
    }
    applyImportPlan(rebuilt, policy);
    resetImportPendingState();
    return true;
  }

  function importerResultatsEleve(record) {
    if (!record || record.toolId !== "championnat-poule-unique") {
      montrerMsg("QR invalide pour l'outil championnat élève.");
      return;
    }
    var payload = record.payload || {};
    if (payload.type && payload.type !== "results") {
      montrerMsg("Ce QR ne contient pas des résultats finaux.");
      return;
    }
    var entries = Array.isArray(payload.entries) ? payload.entries : [];
    if (!entries.length) {
      montrerMsg("Aucun résultat dans le QR.");
      return;
    }
    ensureImportMeta();
    var plan = buildImportPlanFromEleveResults(record, {});
    var openedPreview = openPreviewImportDialog(plan);
    if (openedPreview) return;
    pendingPreviewImportContext = plan;
    continueImportAfterPreview("fill_empty_only");
  }

  if (btnImportEleveQr && qrInputEl && typeof QrExchangeCore !== "undefined") {
    btnImportEleveQr.addEventListener("click", function () {
      importRawQrText((qrInputEl.value || "").trim());
    });
  }
  if (btnScanEleveQr) btnScanEleveQr.addEventListener("click", startEleveQrScanner);
  if (btnStopScanEleveQr) btnStopScanEleveQr.addEventListener("click", stopEleveQrScanner);
  if (sharePouleSelectEl) {
    sharePouleSelectEl.addEventListener("change", clearPouleShareOutput);
  }
  if (btnGeneratePouleShare && shareLinkEl) {
    btnGeneratePouleShare.addEventListener("click", function () {
      try {
        var link = generatePouleShareLink();
        if (!link) return;
        shareLinkEl.value = link;
        renderPouleShareQr(link);
        if (btnCopyPouleShare) btnCopyPouleShare.hidden = false;
        montrerMsg("Partage prêt : noms des participants uniquement (QR + lien).");
      } catch (e) {
        if (btnCopyPouleShare) btnCopyPouleShare.hidden = true;
        montrerMsg(e && e.message ? e.message : "Impossible de générer le partage.");
      }
    });
  }
  if (btnCopyPouleShare) btnCopyPouleShare.addEventListener("click", copyShareLink);
  clearPouleShareOutput();
  if (btnCloseSyncElevesDialog && syncElevesDialogEl) {
    btnCloseSyncElevesDialog.addEventListener("click", function () {
      syncElevesDialogEl.close();
      pendingSyncRecord = null;
      pendingSyncAddedCount = 0;
      pendingSyncForcedPouleId = null;
      pendingSyncAllowPouleMode = true;
    });
  }
  if (btnApplySyncEleves && syncElevesListEl) {
    btnApplySyncEleves.addEventListener("click", function () {
      if (!pendingSyncRecord) {
        montrerMsg("Aucun import en attente de synchronisation.");
        return;
      }
      var unresolvedRows = [];
      var selects = syncElevesListEl.querySelectorAll("select.sync-eleve-select");
      Array.prototype.forEach.call(selects, function (sel) {
        var rawName = sel.getAttribute("data-sync-name");
        var teamId = sel.value;
        if (!teamId && rawName) unresolvedRows.push(rawName);
      });
      if (unresolvedRows.length) {
        montrerMsg(
          "Choisissez une seule action pour chaque élève : associer ou ajouter. Manquants : " +
            unresolvedRows.join(", ")
        );
        return;
      }
      syncElevesDialogEl.close();
      importerResultatsEleve(pendingSyncRecord);
      pendingSyncRecord = null;
      pendingSyncAddedCount = 0;
    });
  }
  if (syncPouleModeEl) {
    syncPouleModeEl.addEventListener("change", renderSyncPouleModeFields);
  }
  if (btnCloseConflictImportDialog && conflictImportDialogEl) {
    btnCloseConflictImportDialog.addEventListener("click", function () {
      conflictImportDialogEl.close();
      pendingConflictImportContext = null;
      montrerMsg("Import annulé : conflits non validés.");
    });
  }
  if (btnConflictKeepProf) {
    btnConflictKeepProf.addEventListener("click", function () {
      if (!pendingConflictImportContext) return;
      var ctx = pendingConflictImportContext;
      pendingConflictImportContext = null;
      if (conflictImportDialogEl) conflictImportDialogEl.close();
      finalizeImportResultats(ctx, false);
    });
  }
  if (btnConflictOverwriteEleve) {
    btnConflictOverwriteEleve.addEventListener("click", function () {
      if (!pendingConflictImportContext) return;
      var ctx = pendingConflictImportContext;
      pendingConflictImportContext = null;
      if (conflictImportDialogEl) conflictImportDialogEl.close();
      finalizeImportResultats(ctx, true);
    });
  }
  if (btnClosePreviewImportDialog && previewImportDialogEl) {
    btnClosePreviewImportDialog.addEventListener("click", function () {
      previewImportDialogEl.close();
      resetImportPendingState();
      montrerMsg("Import annulé.");
    });
  }
  if (btnPreviewCancelImport && previewImportDialogEl) {
    btnPreviewCancelImport.addEventListener("click", function () {
      previewImportDialogEl.close();
      resetImportPendingState();
      montrerMsg("Import annulé.");
    });
  }
  if (btnPreviewImportFillEmpty && previewImportDialogEl) {
    btnPreviewImportFillEmpty.addEventListener("click", function () {
      var done = continueImportAfterPreview("fill_empty_only");
      if (done && previewImportDialogEl.open) previewImportDialogEl.close();
    });
  }
  if (btnPreviewImportOverwrite && previewImportDialogEl) {
    btnPreviewImportOverwrite.addEventListener("click", function () {
      var done = continueImportAfterPreview("overwrite_conflicts");
      if (done && previewImportDialogEl.open) previewImportDialogEl.close();
    });
  }
  if (btnApplyPromotionSettings) {
    btnApplyPromotionSettings.addEventListener("click", applyPromotionSettingsAndCreateSession);
  }
  if (btnApplyPromotionCommon && promotionCommonValueEl) {
    btnApplyPromotionCommon.addEventListener("click", function () {
      var common = Math.max(0, parseInt(promotionCommonValueEl.value, 10) || 0);
      for (var i = 0; i < pendingPromotionBoundaries.length; i++) {
        setBoundaryValue(i, common);
      }
      renderPromotionRows();
    });
  }
  if (btnClosePromotionSettingsDialog && promotionSettingsDialogEl) {
    btnClosePromotionSettingsDialog.addEventListener("click", function () {
      promotionSettingsDialogEl.close();
    });
  }

  function demarrerSession() {
    return charger()
      .then(function (data) {
        state = data;
        normalizeState(state);
        ensureImportMeta();
        if (!calendrierCoherent()) {
          reconstruireMatchsDepuisEquipes();
          return sauverImmediate();
        }
      })
      .then(function () {
        render();
      })
      .catch(function (err) {
        montrerMsg(
          err && err.message ? err.message : "Impossible de charger le championnat."
        );
        render();
      });
  }

  if (typeof SessionManager !== "undefined" && typeof DataManager !== "undefined") {
    SessionManager.init({
      toolId: DataManager.SESSION_TOOLS.CHAMPIONNAT,
      toolLabel: "Championnat",
      enableDuplicate: true,
      duplicateSession: DataManager.duplicateChampionnatSession,
      duplicateShowClass: false,
      duplicateHint: "Les poules, participants, matchs, scores et liens d'import sont recopiés dans une nouvelle séance.",
      duplicateNamePlaceholder: "Ex. Championnat séance 2",
      createSessionActions: function () {
        return createPromotionSessionAction();
      },
      onSessionReady: demarrerSession,
      onSessionCleared: function () {
        state = createEmptyChampionnatState();
        ensureImportMeta();
        render();
      },
    });
  } else {
    montrerMsg("Gestion des séances indisponible sur cet appareil.");
  }
})();
