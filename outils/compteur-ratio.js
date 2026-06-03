/**
 * Compteur ratio — deux élèves, réussites / échecs et pourcentage de réussite.
 */
(function () {
  "use strict";

  var TOOL_ID = "compteur-ratio";

  var state = {
    a: { plus: 0, minus: 0 },
    b: { plus: 0, minus: 0 },
  };

  function el(id) {
    return document.getElementById(id);
  }

  function nomEleve(id) {
    var nameEl = el("ratio-name-" + id);
    var def = id === "a" ? "Équipe A" : "Équipe B";
    return (nameEl && nameEl.value.trim()) || def;
  }

  function persisterNoms() {
    if (typeof EleveLabels === "undefined") return;
    EleveLabels.saveToolLabels(TOOL_ID, {
      nameA: nomEleve("a"),
      nameB: nomEleve("b"),
    });
  }

  function chargerNoms() {
    if (typeof EleveLabels === "undefined") return;
    var saved = EleveLabels.getToolLabels(TOOL_ID);
    if (saved.nameA && el("ratio-name-a")) el("ratio-name-a").value = saved.nameA;
    if (saved.nameB && el("ratio-name-b")) el("ratio-name-b").value = saved.nameB;
  }

  function ratioPour(eleve) {
    var total = eleve.plus + eleve.minus;
    if (!total) return 0;
    return Math.round((eleve.plus / total) * 100);
  }

  function appliquerCouleur(id) {
    var card = document.querySelector('[data-ratio-card="' + id + '"]');
    var colorEl = el("ratio-color-" + id);
    if (!card || !colorEl) return;
    card.style.setProperty("--ratio-color", colorEl.value || "#0d9488");
  }

  function renderEleve(id) {
    var data = state[id];
    var total = data.plus + data.minus;
    var plusEl = el("ratio-plus-" + id);
    var minusEl = el("ratio-minus-" + id);
    var totalEl = el("ratio-total-" + id);
    var ratioEl = el("ratio-" + id);
    if (plusEl) plusEl.textContent = String(data.plus);
    if (minusEl) minusEl.textContent = String(data.minus);
    if (totalEl) totalEl.textContent = String(total);
    if (ratioEl) ratioEl.textContent = ratioPour(data) + "%";
    appliquerCouleur(id);
  }

  function render() {
    renderEleve("a");
    renderEleve("b");
  }

  function ajouter(id, action) {
    if (!state[id]) return;
    if (action === "plus") state[id].plus++;
    else if (action === "minus") state[id].minus++;
    renderEleve(id);
  }

  function hasStats() {
    return !!(state.a.plus || state.a.minus || state.b.plus || state.b.minus);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var resultsHistory =
    typeof ToolResultsHistory !== "undefined"
      ? ToolResultsHistory.mount({
          toolId: TOOL_ID,
          buildTitle: function (snap) {
            var s = snap.students || {};
            return (s.a && s.a.name ? s.a.name : "Équipe A") + " — " + (s.b && s.b.name ? s.b.name : "Équipe B");
          },
          buildSummary: function (snap) {
            var s = snap.students || {};
            var ra = s.a && s.a.ratio != null ? s.a.ratio : 0;
            var rb = s.b && s.b.ratio != null ? s.b.ratio : 0;
            return ra + "% · " + rb + "%";
          },
          getSharePayload: function (entry) {
            return entry.data;
          },
          getShareParticipantLabel: function (entry) {
            var d = entry.data;
            var s = d && d.students;
            if (s) return (s.a && s.a.name ? s.a.name : "Équipe A") + " — " + (s.b && s.b.name ? s.b.name : "Équipe B");
            return entry.title;
          },
          renderView: function (entry, container) {
            var students = entry.data && entry.data.students;
            if (!students) return;
            var grid = document.createElement("section");
            grid.className = "ratio-grid";
            ["a", "b"].forEach(function (id) {
              var s = students[id];
              if (!s) return;
              var card = document.createElement("article");
              card.className = "card ratio-card";
              card.style.setProperty("--ratio-color", s.color || (id === "a" ? "#0d9488" : "#6366f1"));
              card.innerHTML =
                '<div class="ratio-card__top"><span class="import-preview__team-name">' +
                escapeHtml(s.name || "Équipe " + id.toUpperCase()) +
                '</span></div><div class="ratio-result"><span class="ratio-result__label">Ratio réussite</span><strong>' +
                escapeHtml(String(s.ratio != null ? s.ratio : 0)) +
                '%</strong></div><div class="ratio-stats"><p><span>Réussites</span><strong>' +
                escapeHtml(String(s.plus != null ? s.plus : 0)) +
                '</strong></p><p><span>Échecs</span><strong>' +
                escapeHtml(String(s.minus != null ? s.minus : 0)) +
                '</strong></p><p><span>Total</span><strong>' +
                escapeHtml(String(s.total != null ? s.total : 0)) +
                "</strong></p></div>";
              grid.appendChild(card);
            });
            container.appendChild(grid);
          },
        })
      : null;

  function resetStats() {
    function doClear() {
      state.a.plus = 0;
      state.a.minus = 0;
      state.b.plus = 0;
      state.b.minus = 0;
      render();
    }
    if (resultsHistory) {
      resultsHistory.archiveAndClear({
        hasData: hasStats,
        getSnapshot: buildExportPayload,
        clearFn: doClear,
        confirmMessage:
          "Remettre les statistiques à zéro ? Une copie sera conservée dans l’historique.",
      });
      return;
    }
    if (hasStats() && !confirm("Remettre les statistiques des deux élèves à zéro ?")) return;
    doClear();
  }

  function buildExportPayload() {
    function pack(id) {
      var data = state[id];
      var total = data.plus + data.minus;
      var colorEl = el("ratio-color-" + id);
      return {
        name: nomEleve(id),
        color: colorEl ? colorEl.value : undefined,
        plus: data.plus,
        minus: data.minus,
        total: total,
        ratio: ratioPour(data),
      };
    }
    return {
      students: {
        a: pack("a"),
        b: pack("b"),
      },
    };
  }

  document.querySelectorAll(".ratio-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      ajouter(btn.getAttribute("data-eleve"), btn.getAttribute("data-action"));
    });
  });

  ["a", "b"].forEach(function (id) {
    var colorEl = el("ratio-color-" + id);
    var nameEl = el("ratio-name-" + id);
    if (colorEl) {
      colorEl.addEventListener("input", function () {
        appliquerCouleur(id);
      });
      colorEl.addEventListener("change", function () {
        appliquerCouleur(id);
      });
    }
    if (nameEl) {
      nameEl.addEventListener("input", persisterNoms);
      nameEl.addEventListener("change", persisterNoms);
    }
  });

  var resetBtn = el("ratio-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetStats);

  chargerNoms();
  render();

  if (typeof EleveQrShare !== "undefined") {
    EleveQrShare.mountButton(document.getElementById("eleve-share-bar"), {
      toolId: TOOL_ID,
      getParticipantLabel: function () {
        return nomEleve("a") + " — " + nomEleve("b");
      },
      getPayload: buildExportPayload,
      validateBeforeShare: function () {
        if (!state.a.plus && !state.a.minus && !state.b.plus && !state.b.minus) {
          return "Enregistrez au moins une réussite ou un échec avant de partager.";
        }
        return null;
      },
    });
  }
})();
