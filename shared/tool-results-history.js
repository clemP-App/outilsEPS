/**
 * Historique local des résultats (sauvegarde avant effacement).
 * Utilisé par table de marque, compteur PTB, bonus, vitesse plots, zone d’impact.
 */
var ToolResultsHistory = (function () {
  "use strict";

  var STORAGE_PREFIX = "outils_eps_tool_history_v1__";
  var MAX_ENTRIES = 50;

  function storageKey(toolId) {
    return STORAGE_PREFIX + toolId;
  }

  function genererId() {
    return "th_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDateFr(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  function defaultTitle() {
    return "Résultat " + formatDateFr(new Date().toISOString());
  }

  function charger(toolId) {
    try {
      var raw = localStorage.getItem(storageKey(toolId));
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.entries)) return [];
      return data.entries.filter(function (e) {
        return e && e.id && e.savedAt;
      });
    } catch (e) {
      return [];
    }
  }

  function sauvegarder(toolId, entries) {
    try {
      localStorage.setItem(
        storageKey(toolId),
        JSON.stringify({ entries: entries.slice(0, MAX_ENTRIES) })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  function listEntries(toolId) {
    return charger(toolId).sort(function (a, b) {
      return (b.savedAt || "").localeCompare(a.savedAt || "");
    });
  }

  function addEntry(toolId, entry) {
    var entries = listEntries(toolId);
    var record = {
      id: entry.id || genererId(),
      toolId: toolId,
      savedAt: entry.savedAt || new Date().toISOString(),
      title: (entry.title || defaultTitle()).trim(),
      summary: (entry.summary || "").trim(),
      data: entry.data != null ? deepClone(entry.data) : null,
    };
    entries.unshift(record);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    if (!sauvegarder(toolId, entries)) return null;
    return record;
  }

  function getEntry(toolId, entryId) {
    return (
      listEntries(toolId).filter(function (e) {
        return e.id === entryId;
      })[0] || null
    );
  }

  function deleteEntry(toolId, entryId) {
    var entries = listEntries(toolId).filter(function (e) {
      return e.id !== entryId;
    });
    return sauvegarder(toolId, entries);
  }

  var viewDialogEl = null;
  var viewTitleEl = null;
  var viewMetaEl = null;
  var viewBodyEl = null;
  var viewShareBtnEl = null;
  var viewCurrentOptions = null;
  var viewCurrentEntry = null;

  function canShareFromHistory(options, entry) {
    if (typeof EleveQrShare === "undefined" || typeof QrExchangeCore === "undefined") return false;
    if (!options || !options.toolId || !entry || entry.data == null) return false;
    return typeof options.getSharePayload === "function" || entry.data != null;
  }

  function sharePayloadFromEntry(entry, options) {
    if (typeof options.getSharePayload === "function") {
      return options.getSharePayload(entry);
    }
    return entry.data;
  }

  function shareParticipantFromEntry(entry, options) {
    if (typeof options.getShareParticipantLabel === "function") {
      return options.getShareParticipantLabel(entry);
    }
    return entry.title || "";
  }

  function openShareForEntry(entry, options) {
    if (!canShareFromHistory(options, entry)) return;
    EleveQrShare.open({
      toolId: options.toolId,
      getPayload: function () {
        return sharePayloadFromEntry(entry, options);
      },
      getParticipantLabel: function () {
        return shareParticipantFromEntry(entry, options);
      },
      validateBeforeShare: function () {
        return null;
      },
    });
  }

  function ensureViewDialog() {
    if (viewDialogEl) return;
    viewDialogEl = document.createElement("dialog");
    viewDialogEl.className = "eleve-qr-dialog tool-results-history-dialog";
    viewDialogEl.setAttribute("aria-labelledby", "tool-results-history-view-title");
    viewDialogEl.innerHTML =
      '<form method="dialog" class="eleve-qr-dialog__form">' +
      '<header class="eleve-qr-dialog__header">' +
      '<h2 id="tool-results-history-view-title">Résultat archivé</h2>' +
      '<button type="button" class="btn btn--ghost eleve-qr-dialog__close" data-action="close-view" aria-label="Fermer">✕</button>' +
      "</header>" +
      '<p class="hint tool-results-history-dialog__meta" id="tool-results-history-view-meta"></p>' +
      '<div class="tool-results-history-dialog__body" id="tool-results-history-view-body"></div>' +
      '<div class="eleve-qr-dialog__actions tool-results-history-dialog__actions">' +
      '<button type="button" class="btn btn--ghost btn--labeled" id="tool-results-history-share-btn" data-action="share">' +
      '<span class="btn__icon" aria-hidden="true">📲</span><span class="btn__text">Partager au prof (QR)</span>' +
      "</button>" +
      '<button type="submit" class="btn btn--primary" value="cancel">Fermer</button>' +
      "</div>" +
      "</form>";
    document.body.appendChild(viewDialogEl);
    viewTitleEl = document.getElementById("tool-results-history-view-title");
    viewMetaEl = document.getElementById("tool-results-history-view-meta");
    viewBodyEl = document.getElementById("tool-results-history-view-body");
    viewShareBtnEl = document.getElementById("tool-results-history-share-btn");
    viewDialogEl.querySelector('[data-action="close-view"]').addEventListener("click", function () {
      viewDialogEl.close();
    });
    if (viewShareBtnEl) {
      viewShareBtnEl.addEventListener("click", function () {
        if (viewCurrentEntry && viewCurrentOptions) {
          openShareForEntry(viewCurrentEntry, viewCurrentOptions);
        }
      });
    }
  }

  function openViewDialog(entry, options) {
    ensureViewDialog();
    viewCurrentOptions = options;
    viewCurrentEntry = entry;
    if (viewTitleEl) viewTitleEl.textContent = entry.title || "Résultat archivé";
    if (viewMetaEl) {
      var parts = [formatDateFr(entry.savedAt)];
      if (entry.summary) parts.push(entry.summary);
      viewMetaEl.textContent = parts.join(" · ");
    }
    if (viewBodyEl) {
      viewBodyEl.innerHTML = "";
      if (options && typeof options.renderView === "function") {
        options.renderView(entry, viewBodyEl);
      } else {
        var pre = document.createElement("pre");
        pre.className = "tool-results-history-json";
        pre.textContent = JSON.stringify(entry.data, null, 2);
        viewBodyEl.appendChild(pre);
      }
    }
    if (viewShareBtnEl) {
      viewShareBtnEl.hidden = !canShareFromHistory(options, entry);
    }
    if (viewDialogEl.showModal) viewDialogEl.showModal();
  }

  /**
   * @param {object} options
   * @param {string} options.toolId
   * @param {HTMLElement} [options.mountEl] — parent (défaut : .page-outil), en dernière position
   * @param {string} [options.accordionTitle]
   * @param {function(object):string} [options.buildTitle]
   * @param {function(object):string} [options.buildSummary]
   * @param {function(object, HTMLElement):void} options.renderView
   * @param {function({data:object}):object} [options.getSharePayload] — payload QR depuis l’archive
   * @param {function({title:string,data:object}):string} [options.getShareParticipantLabel]
   * @param {function():void} [options.onListChange]
   */
  function mount(options) {
    options = options || {};
    var toolId = options.toolId;
    if (!toolId) throw new Error("toolId requis");

    var accordionEl = document.createElement("details");
    accordionEl.className = "card card--accordion tool-results-history";
    accordionEl.innerHTML =
      '<summary class="card--accordion__summary">' +
      '<span class="card--accordion__title">📁 Historique des résultats</span>' +
      '<span class="tool-results-history__badge card--accordion__badge" hidden></span>' +
      '<span class="card--accordion__chev" aria-hidden="true"></span>' +
      "</summary>" +
      '<div class="card--accordion__panel">' +
      '<p class="hint tool-results-history__hint">Chaque effacement enregistre une copie consultable ici. Vous pouvez la partager au professeur par QR, même après remise à zéro.</p>' +
      '<ul class="tool-results-history__list"></ul>' +
      '<p class="hint tool-results-history__empty" hidden>Aucun résultat archivé pour l’instant.</p>' +
      "</div>";

    var listEl = accordionEl.querySelector(".tool-results-history__list");
    var emptyEl = accordionEl.querySelector(".tool-results-history__empty");
    var badgeEl = accordionEl.querySelector(".tool-results-history__badge");

    var root =
      options.mountEl ||
      document.querySelector(".page-outil") ||
      document.querySelector(".page-outil--table-marque") ||
      null;
    if (root) {
      root.appendChild(accordionEl);
    } else {
      document.body.appendChild(accordionEl);
    }

    function notifyChange() {
      if (typeof options.onListChange === "function") options.onListChange();
    }

    function majBadge() {
      var n = listEntries(toolId).length;
      if (!badgeEl) return;
      badgeEl.textContent = n ? String(n) : "";
      badgeEl.hidden = !n;
    }

    function renderList() {
      var entries = listEntries(toolId);
      if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
        OutilsDom.clear(listEl);
      } else {
        listEl.innerHTML = "";
      }
      if (emptyEl) emptyEl.hidden = entries.length > 0;
      entries.forEach(function (entry) {
        var li = document.createElement("li");
        li.className = "tool-results-history__row";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tool-results-history__btn";
        btn.innerHTML =
          '<span class="tool-results-history__btn-title">' +
          escapeHtml(entry.title) +
          '</span><span class="tool-results-history__btn-meta">' +
          escapeHtml(
            formatDateFr(entry.savedAt) + (entry.summary ? " · " + entry.summary : "")
          ) +
          "</span>";
        btn.addEventListener("click", function () {
          openViewDialog(entry, options);
        });
        var del = document.createElement("button");
        del.type = "button";
        del.className = "btn btn--ghost btn--small tool-results-history__del";
        del.setAttribute("aria-label", "Supprimer " + entry.title);
        del.textContent = "✕";
        del.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (!confirm("Supprimer cette sauvegarde de l’historique ?")) return;
          deleteEntry(toolId, entry.id);
          renderList();
          notifyChange();
        });
        li.appendChild(btn);
        li.appendChild(del);
        listEl.appendChild(li);
      });
      majBadge();
    }

    /**
     * Archive si des données existent, puis exécute clearFn.
     * @param {object} cfg
     * @param {function():object|null} cfg.getSnapshot
     * @param {function():boolean} cfg.hasData
     * @param {function():void} cfg.clearFn
     * @param {string} [cfg.confirmMessage]
     * @param {function(object):string} [cfg.buildTitle]
     * @param {function(object):string} [cfg.buildSummary]
     * @returns {boolean} true si effacement effectué
     */
    function archiveAndClear(cfg) {
      cfg = cfg || {};
      var hasData =
        typeof cfg.hasData === "function"
          ? cfg.hasData()
          : !!(cfg.getSnapshot && cfg.getSnapshot());
      if (!hasData) {
        if (typeof cfg.clearFn === "function") cfg.clearFn();
        return true;
      }
      var msg =
        cfg.confirmMessage ||
        "Effacer les résultats en cours ? Une copie sera conservée dans l’historique.";
      if (!confirm(msg)) return false;
      var snapshot = typeof cfg.getSnapshot === "function" ? cfg.getSnapshot() : null;
      if (snapshot) {
        var titleFn = cfg.buildTitle || options.buildTitle;
        var summaryFn = cfg.buildSummary || options.buildSummary;
        var saved = addEntry(toolId, {
          title: titleFn ? titleFn(snapshot) : defaultTitle(),
          summary: summaryFn ? summaryFn(snapshot) : "",
          data: snapshot,
        });
        if (!saved) {
          if (
            !confirm(
              "Impossible d’enregistrer l’historique (stockage plein). Effacer quand même ?"
            )
          ) {
            return false;
          }
        }
      }
      if (typeof cfg.clearFn === "function") cfg.clearFn();
      renderList();
      notifyChange();
      return true;
    }

    renderList();

    return {
      accordionEl: accordionEl,
      refreshList: renderList,
      archiveAndClear: archiveAndClear,
      addEntry: function (snapshot, meta) {
        var saved = addEntry(toolId, {
          title: meta && meta.title ? meta.title : options.buildTitle ? options.buildTitle(snapshot) : defaultTitle(),
          summary: meta && meta.summary ? meta.summary : options.buildSummary ? options.buildSummary(snapshot) : "",
          data: snapshot,
        });
        if (saved) {
          renderList();
          notifyChange();
        }
        return saved;
      },
    };
  }

  return {
    listEntries: listEntries,
    addEntry: addEntry,
    getEntry: getEntry,
    deleteEntry: deleteEntry,
    formatDateFr: formatDateFr,
    mount: mount,
  };
})();
