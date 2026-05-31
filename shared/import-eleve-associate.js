/**
 * Associer un libellé QR (prénom, surnom…) à un élève de « Classes ».
 * Utilisable à l’import ou plus tard (Synthèse, Données élèves).
 */
var ImportEleveAssociate = (function () {
  "use strict";

  var overlayEl = null;
  var pendingResolve = null;

  function Identity() {
    return typeof SyntheseIdentity !== "undefined" ? SyntheseIdentity : null;
  }

  function labelEleve(e) {
    if (Identity()) return Identity().labelEleve(e);
    return [e.nom, e.prenom].filter(Boolean).join(" ");
  }

  function elevesForClasse(classe) {
    if (!classe || !Array.isArray(classe.eleves)) return [];
    return classe.eleves.map(function (e) {
      return Object.assign({ classeId: classe.id }, e);
    });
  }

  function findClasseByLabel(classes, label) {
    if (!label || !classes || !Identity()) return null;
    var norm = Identity().normalizeName(label);
    for (var i = 0; i < classes.length; i++) {
      var c = classes[i];
      if (c && Identity().normalizeName(c.nom) === norm) return c;
    }
    return null;
  }

  function findMatchesForLabel(label, classes, aliases, classeIdFilter) {
    var Id = Identity();
    if (!Id || !label) return [];
    var out = [];
    var seen = {};
    (classes || []).forEach(function (classe) {
      if (!classe) return;
      if (classeIdFilter && classe.id !== classeIdFilter) return;
      var eleves = elevesForClasse(classe);
      eleves.forEach(function (e) {
        if (
          Id.labelMatchesEleve(label, e, {
            classeId: classe.id,
            elevesClasse: eleves,
            aliases: aliases || [],
          }).match
        ) {
          var key = e.id || labelEleve(e);
          if (!seen[key]) {
            seen[key] = true;
            out.push(e);
          }
        }
      });
    });
    return out;
  }

  function identityLabelForRecord(record) {
    if (!record) return "";
    return String(record.identityLabel || record.auteurLabel || "").trim();
  }

  function isTeamRecord(record) {
    var Id = Identity();
    return !!(Id && record && Id.isTeamImportTool(record.toolId));
  }

  function isDualPlayerRecord(record) {
    var Id = Identity();
    return !!(Id && record && Id.isDualPlayerImportTool(record.toolId));
  }

  function getPlayerSlots(record) {
    var Id = Identity();
    return Id && record ? Id.getImportPlayerSlots(record) : [];
  }

  function slotNeedsAssociation(slot, record, ctx) {
    var assoc = (record && record.playerAssociations) || {};
    var stored = assoc[slot.slot];
    if (stored && stored.eleveId) return false;
    var label = slot.label;
    if (!label) return true;
    var matches = findMatchesForLabel(label, ctx.classes, ctx.aliases);
    return matches.length !== 1;
  }

  function dualPlayerAuteurLabel(slots, associations) {
    return slots
      .map(function (slot) {
        var stored = associations[slot.slot];
        return (stored && stored.eleveLabel) || slot.label;
      })
      .filter(Boolean)
      .join(" — ");
  }

  function applyAssociationToImport(record, result, ctx) {
    if (!record || !record.id || typeof DataManager === "undefined" || !DataManager.updateImportedRecord) {
      return Promise.resolve(record);
    }
    var classe = (ctx.classes || []).filter(function (c) {
      return c && c.id === result.classeId;
    })[0];
    if (!classe) return Promise.resolve(record);

    var patch = {
      classeLabel: classe.nom,
    };

    if (result.playerAssociations) {
      patch.playerAssociations = result.playerAssociations;
      var slots = getPlayerSlots(record);
      patch.auteurLabel = dualPlayerAuteurLabel(slots, result.playerAssociations);
      patch.identityLabel = patch.auteurLabel;
    } else {
      var sourceLabel = identityLabelForRecord(record) || result.label || "";
      patch.identityLabel = sourceLabel;
      if (result.eleveId && result.eleveLabel) {
        patch.auteurLabel = result.eleveLabel;
      }
    }

    return DataManager.updateImportedRecord(record.id, patch).then(function (updated) {
      return updated || Object.assign({}, record, patch);
    });
  }
  function recordNeedsAssociation(record, ctx) {
    var Id = Identity();
    if (!record || !Id) return false;
    if (Id.isTeamImportTool(record.toolId)) return false;
    if (isDualPlayerRecord(record)) {
      var slots = getPlayerSlots(record);
      if (!slots.length) return false;
      return slots.some(function (slot) {
        return slotNeedsAssociation(slot, record, ctx);
      });
    }
    var label = identityLabelForRecord(record);
    if (!label) return false;
    var matches = findMatchesForLabel(label, ctx.classes, ctx.aliases);
    return matches.length !== 1;
  }

  function loadContext() {
    if (typeof DataManager === "undefined") {
      return Promise.reject(new Error("DataManager indisponible."));
    }
    return DataManager.ready.then(function () {
      return Promise.all([DataManager.getClasses(), DataManager.getSyntheseIdentityAliases()]).then(
        function (res) {
          return { classes: res[0] || [], aliases: res[1] || [] };
        }
      );
    });
  }

  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement("div");
    overlayEl.className = "class-import-overlay import-associate-overlay";
    overlayEl.hidden = true;
    overlayEl.setAttribute("role", "dialog");
    overlayEl.setAttribute("aria-modal", "true");
    overlayEl.setAttribute("aria-labelledby", "import-associate-title");

    overlayEl.innerHTML =
      '<div class="class-import-dialog card import-associate-dialog">' +
      '<h2 id="import-associate-title" class="class-import-title">Associer à un élève</h2>' +
      '<p class="hint import-associate-hint" id="import-associate-hint"></p>' +
      '<p class="import-associate-label"><strong id="import-associate-qr-label"></strong></p>' +
      '<div class="field-group">' +
      '<label class="field-label" for="import-associate-classe">Classe</label>' +
      '<select id="import-associate-classe"></select>' +
      "</div>" +
      '<div class="field-group" id="import-associate-eleve-wrap">' +
      '<label class="field-label" for="import-associate-eleve">Élève</label>' +
      '<select id="import-associate-eleve"></select>' +
      "</div>" +
      '<div id="import-associate-players" class="import-associate-players" hidden></div>' +
      '<p class="hint import-associate-candidates" id="import-associate-candidates" hidden></p>' +
      '<div class="field-row class-import-actions import-associate-actions">' +
      '<button type="button" class="btn btn--primary" id="import-associate-save">Associer</button>' +
      '<button type="button" class="btn btn--ghost" id="import-associate-later">Plus tard</button>' +
      '<button type="button" class="btn btn--ghost" id="import-associate-cancel">Annuler</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(overlayEl);

    overlayEl.querySelector("#import-associate-cancel").addEventListener("click", closeDialog);
    overlayEl.querySelector("#import-associate-later").addEventListener("click", function () {
      closeDialog(null);
    });
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) closeDialog(null);
    });

    return overlayEl;
  }

  function closeDialog(result) {
    if (overlayEl) overlayEl.hidden = true;
    if (pendingResolve) {
      var fn = pendingResolve;
      pendingResolve = null;
      fn(result);
    }
  }

  function fillClasseSelect(selectEl, classes, selectedId) {
    selectEl.innerHTML = "";
    if (!classes.length) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Aucune classe — créez-en une dans « Classes »";
      selectEl.appendChild(opt);
      selectEl.disabled = true;
      return;
    }
    classes.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.nom + " (" + (c.eleves ? c.eleves.length : 0) + ")";
      selectEl.appendChild(o);
    });
    selectEl.disabled = false;
    if (selectedId && classes.some(function (c) { return c.id === selectedId; })) {
      selectEl.value = selectedId;
    } else {
      selectEl.value = classes[0].id;
    }
  }

  function fillEleveSelect(selectEl, classe, aliases, qrLabel, preferredEleveId, allowNoEleve) {
    selectEl.innerHTML = "";
    if (!classe) {
      selectEl.disabled = true;
      return;
    }
    var eleves = elevesForClasse(classe);
    if (allowNoEleve) {
      var none = document.createElement("option");
      none.value = "";
      none.textContent = "— Équipe / sans élève —";
      selectEl.appendChild(none);
    }
    if (!eleves.length) {
      if (!allowNoEleve) {
        var empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Aucun élève dans cette classe";
        selectEl.appendChild(empty);
      }
      selectEl.disabled = !allowNoEleve;
      return;
    }
    var candidates = findMatchesForLabel(qrLabel, [classe], aliases, classe.id);
    var candidateIds = {};
    candidates.forEach(function (e) {
      candidateIds[e.id] = true;
    });

    if (candidates.length > 1) {
      var grp = document.createElement("optgroup");
      grp.label = "Suggestions (prénom ou nom proche)";
      candidates.forEach(function (e) {
        var o = document.createElement("option");
        o.value = e.id;
        o.textContent = labelEleve(e);
        grp.appendChild(o);
      });
      selectEl.appendChild(grp);
    }

    var allGrp = candidates.length > 1 ? document.createElement("optgroup") : selectEl;
    if (candidates.length > 1) {
      allGrp.label = "Tous les élèves";
      selectEl.appendChild(allGrp);
    }
    eleves.forEach(function (e) {
      if (candidateIds[e.id] && candidates.length > 1) return;
      var o = document.createElement("option");
      o.value = e.id;
      o.textContent = labelEleve(e);
      allGrp.appendChild(o);
    });

    selectEl.disabled = false;
    if (preferredEleveId && eleves.some(function (e) { return e.id === preferredEleveId; })) {
      selectEl.value = preferredEleveId;
    } else if (candidates.length === 1) {
      selectEl.value = candidates[0].id;
    } else if (allowNoEleve) {
      selectEl.value = "";
    } else if (eleves.length) {
      selectEl.value = eleves[0].id;
    }
  }

  function renderDualPlayerFields(playersEl, slots, classe, ctx, record) {
    playersEl.innerHTML = "";
    var existing = (record && record.playerAssociations) || {};
    slots.forEach(function (slot, index) {
      var row = document.createElement("div");
      row.className = "field-group import-associate-player";
      row.setAttribute("data-slot", slot.slot);

      var lab = document.createElement("label");
      lab.className = "field-label";
      lab.setAttribute("for", "import-associate-eleve-" + slot.slot);
      lab.textContent = "Joueur " + (index + 1) + " (« " + slot.label + " »)";
      row.appendChild(lab);

      var sel = document.createElement("select");
      sel.id = "import-associate-eleve-" + slot.slot;
      sel.setAttribute("data-slot", slot.slot);
      row.appendChild(sel);

      var stored = existing[slot.slot];
      fillEleveSelect(
        sel,
        classe,
        ctx.aliases,
        slot.label,
        stored && stored.eleveId ? stored.eleveId : null,
        false
      );

      playersEl.appendChild(row);
    });
  }

  function updateDualPlayerCandidates(candEl, slots, ctx, classeId) {
    var ambiguous = 0;
    var missing = 0;
    slots.forEach(function (slot) {
      var matches = findMatchesForLabel(slot.label, ctx.classes, ctx.aliases, classeId);
      if (matches.length > 1) ambiguous++;
      if (matches.length === 0) missing++;
    });
    if (ambiguous > 0) {
      candEl.hidden = false;
      candEl.textContent =
        ambiguous +
        " joueur(s) ont plusieurs correspondances possibles — vérifiez chaque choix.";
    } else if (missing > 0) {
      candEl.hidden = false;
      candEl.textContent =
        missing +
        " joueur(s) sans correspondance automatique — sélectionnez l’élève pour chaque slot.";
    } else {
      candEl.hidden = true;
    }
  }

  /**
   * @param {{ record: object, classes?: array, aliases?: array, classeId?: string, onSaved?: function }} options
   * @returns {Promise<{ eleveId: string, classeId: string, label: string }|null>}
   */
  function openDialog(options) {
    options = options || {};
    var record = options.record || {};
    var teamMode = isTeamRecord(record);
    var dualMode = isDualPlayerRecord(record);
    var playerSlots = dualMode ? getPlayerSlots(record) : [];
    var qrLabel = identityLabelForRecord(record);
    if (!qrLabel && !teamMode && !dualMode) {
      return Promise.resolve(null);
    }

    return (options.classes
      ? Promise.resolve({ classes: options.classes, aliases: options.aliases || [] })
      : loadContext()
    ).then(function (ctx) {
      if (!ctx.classes.length) {
        alert("Créez d’abord une classe dans « Classes et groupes ».");
        return null;
      }

      ensureOverlay();
      var titleEl = overlayEl.querySelector("#import-associate-title");
      var hintEl = overlayEl.querySelector("#import-associate-hint");
      var labelEl = overlayEl.querySelector("#import-associate-qr-label");
      var labelWrap = labelEl && labelEl.parentElement;
      var classeSel = overlayEl.querySelector("#import-associate-classe");
      var eleveWrap = overlayEl.querySelector("#import-associate-eleve-wrap");
      var eleveSel = overlayEl.querySelector("#import-associate-eleve");
      var playersEl = overlayEl.querySelector("#import-associate-players");
      var candEl = overlayEl.querySelector("#import-associate-candidates");
      var saveBtn = overlayEl.querySelector("#import-associate-save");

      var toolTitle =
        typeof QrExchangeCore !== "undefined"
          ? QrExchangeCore.toolTitle(record.toolId)
          : record.toolId || "Import";

      if (eleveWrap) eleveWrap.hidden = dualMode;
      if (playersEl) playersEl.hidden = !dualMode;
      if (eleveSel) eleveSel.disabled = dualMode;

      if (titleEl) {
        if (teamMode) titleEl.textContent = "Associer à une classe";
        else if (dualMode) titleEl.textContent = "Associer les joueurs";
        else titleEl.textContent = "Associer à un élève";
      }
      if (teamMode) {
        hintEl.textContent =
          "Import « " +
          toolTitle +
          " ». Choisissez la classe concernée. Laissez « sans élève » pour un résultat d’équipe ; le nom de classe sera enregistré dans les données.";
        if (labelWrap) labelWrap.hidden = !qrLabel;
        if (qrLabel) labelEl.textContent = "Libellé QR : « " + qrLabel + " »";
      } else if (dualMode) {
        hintEl.textContent =
          "Import « " +
          toolTitle +
          " » avec deux joueurs. Choisissez la classe puis l’élève correspondant à chaque joueur. Les associations seront mémorisées pour les prochains imports.";
        if (labelWrap) labelWrap.hidden = true;
      } else {
        hintEl.textContent =
          "Le QR indique « " +
          qrLabel +
          " » (" +
          toolTitle +
          "). Choisissez la classe et l’élève dans « Classes ». Le nom sera mis à jour dans les données et mémorisé pour les prochains imports.";
        if (labelWrap) labelWrap.hidden = false;
        labelEl.textContent = "« " + qrLabel + " »";
      }

      var suggestedClasse =
        options.classeId ||
        (record.classeLabel ? findClasseByLabel(ctx.classes, record.classeLabel) : null);
      var suggestedClasseId = suggestedClasse ? suggestedClasse.id : ctx.classes[0].id;

      fillClasseSelect(classeSel, ctx.classes, suggestedClasseId);

      function refreshEleves() {
        var cid = classeSel.value;
        var classe = ctx.classes.filter(function (c) {
          return c.id === cid;
        })[0];
        if (dualMode) {
          renderDualPlayerFields(playersEl, playerSlots, classe, ctx, record);
          updateDualPlayerCandidates(candEl, playerSlots, ctx, cid);
          return;
        }
        var matches = qrLabel ? findMatchesForLabel(qrLabel, ctx.classes, ctx.aliases, cid) : [];
        fillEleveSelect(eleveSel, classe, ctx.aliases, qrLabel, null, teamMode);
        if (teamMode || !qrLabel) {
          candEl.hidden = true;
          return;
        }
        if (matches.length > 1) {
          candEl.hidden = false;
          candEl.textContent =
            matches.length +
            " élève(s) pourraient correspondre à ce prénom — vérifiez le bon choix.";
        } else if (matches.length === 0) {
          candEl.hidden = false;
          candEl.textContent =
            "Aucune correspondance automatique : sélectionnez l’élève ou laissez « sans élève » pour une équipe.";
        } else {
          candEl.hidden = true;
        }
      }

      refreshEleves();
      classeSel.onchange = refreshEleves;

      overlayEl.hidden = false;
      saveBtn.focus();

      return new Promise(function (resolve) {
        pendingResolve = resolve;
        saveBtn.onclick = function () {
          var classeId = classeSel.value;
          if (!classeId) {
            alert("Choisissez une classe.");
            return;
          }

          var classe = ctx.classes.filter(function (c) {
            return c.id === classeId;
          })[0];

          if (dualMode) {
            var playerAssociations = {};
            var missingSlot = null;
            playerSlots.forEach(function (slot) {
              var sel = playersEl.querySelector('[data-slot="' + slot.slot + '"] select');
              var eleveId = sel ? sel.value : "";
              if (!eleveId) {
                missingSlot = slot;
                return;
              }
              var eleve = elevesForClasse(classe).filter(function (e) {
                return e.id === eleveId;
              })[0];
              playerAssociations[slot.slot] = {
                label: slot.label,
                eleveId: eleveId,
                eleveLabel: eleve ? labelEleve(eleve) : "",
              };
            });
            if (missingSlot) {
              alert("Choisissez un élève pour « " + missingSlot.label + " ».");
              return;
            }

            var dualResult = {
              classeId: classeId,
              playerAssociations: playerAssociations,
              recordId: record.id || null,
            };

            var aliasChain = Promise.resolve();
            playerSlots.forEach(function (slot) {
              var assoc = playerAssociations[slot.slot];
              if (assoc && assoc.eleveId && slot.label) {
                aliasChain = aliasChain.then(function () {
                  return DataManager.saveSyntheseIdentityAlias(classeId, slot.label, assoc.eleveId);
                });
              }
            });

            aliasChain
              .then(function () {
                return applyAssociationToImport(record, dualResult, ctx);
              })
              .then(function (updatedRecord) {
                if (updatedRecord) dualResult.updatedRecord = updatedRecord;
                if (typeof options.onSaved === "function") options.onSaved(dualResult);
                closeDialog(dualResult);
              })
              .catch(function (err) {
                alert((err && err.message) || "Impossible d’enregistrer l’association.");
              });
            return;
          }

          var eleveId = eleveSel.value;
          if (!teamMode && !eleveId) {
            alert("Choisissez un élève, ou « sans élève » uniquement pour un import d’équipe.");
            return;
          }

          var eleve = eleveId
            ? elevesForClasse(classe).filter(function (e) {
                return e.id === eleveId;
              })[0]
            : null;
          var result = {
            eleveId: eleveId || null,
            classeId: classeId,
            label: qrLabel,
            eleveLabel: eleve ? labelEleve(eleve) : "",
            recordId: record.id || null,
          };

          var chain = Promise.resolve();
          if (eleveId && qrLabel && !teamMode) {
            chain = DataManager.saveSyntheseIdentityAlias(classeId, qrLabel, eleveId);
          }
          chain
            .then(function () {
              return applyAssociationToImport(record, result, ctx);
            })
            .then(function (updatedRecord) {
              if (updatedRecord) {
                result.updatedRecord = updatedRecord;
              }
              if (typeof options.onSaved === "function") options.onSaved(result);
              closeDialog(result);
            })
            .catch(function (err) {
              alert((err && err.message) || "Impossible d’enregistrer l’association.");
            });
        };
      });
    });
  }

  function maybePromptAfterImport(record, options) {
    options = options || {};
    if (!record || isTeamRecord(record)) return Promise.resolve(null);
    if (!isDualPlayerRecord(record) && !identityLabelForRecord(record)) return Promise.resolve(null);
    return loadContext().then(function (ctx) {
      if (!recordNeedsAssociation(record, ctx)) return null;
      return openDialog({
        record: record,
        classes: ctx.classes,
        aliases: ctx.aliases,
        onSaved: options.onSaved,
      });
    });
  }

  function showAssociateForRecord(record, options) {
    return openDialog(
      Object.assign({}, options || {}, {
        record: record,
      })
    );
  }

  return {
    loadContext: loadContext,
    findMatchesForLabel: findMatchesForLabel,
    recordNeedsAssociation: recordNeedsAssociation,
    openDialog: openDialog,
    maybePromptAfterImport: maybePromptAfterImport,
    showAssociateForRecord: showAssociateForRecord,
    applyAssociationToImport: applyAssociationToImport,
    identityLabelForRecord: identityLabelForRecord,
    isTeamRecord: isTeamRecord,
    isDualPlayerRecord: isDualPlayerRecord,
    getPlayerSlots: getPlayerSlots,
    findClasseByLabel: findClasseByLabel,
  };
})();
