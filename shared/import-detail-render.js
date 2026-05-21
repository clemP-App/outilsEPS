/**
 * Aperçu lecture seule d’un import élève — rendu proche de chaque outil source.
 */
var ImportDetailRender = (function () {
  "use strict";

  function clear(node) {
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(node);
      return;
    }
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null && text !== "") node.textContent = String(text);
    return node;
  }

  function metaChip(parent, label, value) {
    if (!value) return;
    var chip = el("span", "import-preview-meta__chip");
    chip.appendChild(el("span", "import-preview-meta__label", label + " :"));
    chip.appendChild(el("strong", null, value));
    parent.appendChild(chip);
  }

  function renderMeta(record, parent) {
    var meta = el("div", "import-preview-meta");
    metaChip(
      meta,
      "Outil",
      typeof QrExchangeCore !== "undefined" ? QrExchangeCore.toolTitle(record.toolId) : record.toolId
    );
    metaChip(meta, "Classe", record.classeLabel);
    metaChip(meta, "Joueur / Équipe", record.auteurLabel);
    var created = record.createdAt
      ? new Date(record.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
      : "";
    var imported = record.importedAt
      ? new Date(record.importedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
      : "";
    metaChip(meta, "Saisie", created);
    metaChip(meta, "Import", imported);
    parent.appendChild(meta);
  }

  function renderTableMarque(payload, parent) {
    var wrap = el("div", "import-preview import-preview--table-marque page-outil--table-marque");
    var board = el("section", "table-scoreboard");
    [["left", "table-team--left"], ["right", "table-team--right"]].forEach(function (pair) {
      var side = pair[0];
      var team = payload.teams && payload.teams[side];
      if (!team) return;
      var card = el("article", "card table-team " + pair[1]);
      card.style.setProperty("--team-color", team.color || (side === "left" ? "#0d9488" : "#6366f1"));
      card.appendChild(el("p", "import-preview__team-name", team.name || "—"));
      card.appendChild(el("p", "table-team__score import-preview__score", String(team.score != null ? team.score : 0)));
      board.appendChild(card);
    });
    wrap.appendChild(board);
    if (payload.timer) {
      var timer = el("section", "card table-timer-card import-preview__timer");
      timer.appendChild(el("p", "table-timer-label", "Timer"));
      timer.appendChild(
        el("p", "table-timer-time", payload.timer.displayLabel || payload.timer.durationLabel || "—")
      );
      if (payload.timer.durationLabel) {
        timer.appendChild(el("p", "hint", "Durée réglée : " + payload.timer.durationLabel));
      }
      wrap.appendChild(timer);
    }
    parent.appendChild(wrap);
  }

  function ptbFormatTime(ms) {
    var total = Math.max(0, Math.floor((ms || 0) / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var mm = (m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    if (h > 0) return h + ":" + mm + ":" + ss;
    return mm + ":" + ss;
  }

  function ptbPossessions(team) {
    if (!team) return 0;
    if (team.possessions != null) return team.possessions;
    return (team.losses || 0) + (team.shots || 0);
  }

  function ptbBestTeam(aVal, bVal, mode) {
    if (aVal === bVal) return "";
    if (mode === "low") return aVal < bVal ? "a" : "b";
    return aVal > bVal ? "a" : "b";
  }

  function ptbAppendStatValue(strong, format, value) {
    if (format === "possession" && value && typeof value === "object") {
      var stack = el("span", "ptb-stat-stack");
      stack.appendChild(el("b", null, ptbFormatTime(value.ms)));
      stack.appendChild(el("small", null, (value.pct != null ? value.pct : 0) + "%"));
      strong.appendChild(stack);
      return;
    }
    if (format === "pct") {
      strong.textContent = value != null && value !== "" ? String(value) + "%" : "—";
      return;
    }
    strong.textContent = value != null && value !== "" ? String(value) : "—";
  }

  function ptbAppendStatsRow(table, row) {
    var aCmp = row.compareMs && row.a && typeof row.a === "object" ? row.a.ms : row.a;
    var bCmp = row.compareMs && row.b && typeof row.b === "object" ? row.b.ms : row.b;
    var best = ptbBestTeam(aCmp, bCmp, row.best);
    var rowEl = el("div", "ptb-stats-row");
    rowEl.appendChild(el("span", null, row.label));
    var strongA = el("strong");
    if (best === "a") strongA.className = "is-best";
    ptbAppendStatValue(strongA, row.format, row.a);
    var strongB = el("strong");
    if (best === "b") strongB.className = "is-best";
    ptbAppendStatValue(strongB, row.format, row.b);
    rowEl.appendChild(strongA);
    rowEl.appendChild(strongB);
    table.appendChild(rowEl);
  }

  function renderPtb(payload, parent) {
    var wrap = el("div", "import-preview import-preview--ptb page-outil--ptb");
    var teams = payload.teams || {};
    var a = teams.a || {};
    var b = teams.b || {};
    var mode = payload.mode || "none";

    if (payload.timer) {
      var chrono = el("p", "hint import-preview__chrono");
      var parts = [];
      if (payload.timer.statusLabel) parts.push(payload.timer.statusLabel);
      if (payload.timer.displayLabel) parts.push(payload.timer.displayLabel);
      if (payload.timer.durationLabel && payload.timer.mode === "down") {
        parts.push("durée " + payload.timer.durationLabel);
      }
      chrono.textContent = parts.join(" · ");
      wrap.appendChild(chrono);
    }

    var table = el("div", "ptb-stats-table");
    table.style.setProperty("--ptb-color-a", a.color || "#2563eb");
    table.style.setProperty("--ptb-color-b", b.color || "#dc2626");
    var head = el("div", "ptb-stats-head");
    head.appendChild(el("span"));
    head.appendChild(el("strong", null, a.name || "Équipe A"));
    head.appendChild(el("strong", null, b.name || "Équipe B"));
    table.appendChild(head);

    var rows = [
      { label: "Score", a: a.goals, b: b.goals, format: "plain", best: "high" },
      {
        label: "Possessions estimées",
        a: ptbPossessions(a),
        b: ptbPossessions(b),
        format: "plain",
        best: "high",
      },
    ];

    if (mode !== "none") {
      if (a.possessionMs != null || b.possessionMs != null) {
        var totalMs = Math.max(1, (a.possessionMs || 0) + (b.possessionMs || 0));
        rows.push({
          label: "Temps de possession",
          a: {
            ms: a.possessionMs || 0,
            pct: Math.round(((a.possessionMs || 0) / totalMs) * 100),
          },
          b: {
            ms: b.possessionMs || 0,
            pct: Math.round(((b.possessionMs || 0) / totalMs) * 100),
          },
          format: "possession",
          best: "high",
          compareMs: true,
        });
      } else if (a.possessionLabel || b.possessionLabel) {
        rows.push({
          label: "Temps de possession",
          a: a.possessionLabel,
          b: b.possessionLabel,
          format: "plain",
          best: "high",
        });
      }
    }

    rows = rows.concat([
      { label: "Pertes", a: a.losses, b: b.losses, format: "plain", best: "low" },
      { label: "Tirs", a: a.shots, b: b.shots, format: "plain", best: "high" },
      { label: "Buts", a: a.goals, b: b.goals, format: "plain", best: "high" },
      {
        label: "Efficacité au tir",
        a: a.efficiency,
        b: b.efficiency,
        format: "pct",
        best: "high",
      },
      {
        label: "Tirs / possession",
        a: a.shotsPerPossession,
        b: b.shotsPerPossession,
        format: "pct",
        best: "high",
      },
      {
        label: "Pertes / possession",
        a: a.lossesPerPossession,
        b: b.lossesPerPossession,
        format: "pct",
        best: "low",
      },
    ]);

    rows.forEach(function (row) {
      ptbAppendStatsRow(table, row);
    });

    wrap.appendChild(table);
    if (payload.finished) wrap.appendChild(el("p", "hint import-preview__badge", "Match terminé"));
    parent.appendChild(wrap);
  }

  function renderBonus(payload, parent) {
    var wrap = el("div", "import-preview import-preview--bonus page-outil--bonus");
    var grid = el("section", "bonus-grid");
    var players = payload.players || {};
    [["A", "a"], ["B", "b"]].forEach(function (pair) {
      var p = players[pair[0]];
      if (!p) return;
      var card = el("article", "card bonus-card");
      card.style.setProperty("--bonus-color", p.color || (pair[0] === "A" ? "#0d9488" : "#6366f1"));
      var top = el("div", "bonus-card__top");
      top.appendChild(el("span", "import-preview__team-name", p.name || "Joueur " + pair[0]));
      card.appendChild(top);
      var result = el("div", "bonus-result");
      result.appendChild(el("span", "bonus-result__label", "Score"));
      var strong = el("strong", null, String(p.score != null ? p.score : 0));
      result.appendChild(strong);
      result.appendChild(el("span", "bonus-result__unit", "pts"));
      card.appendChild(result);
      if (p.counts) {
        var stats = el("div", "bonus-stats");
        var total =
          (p.counts.bonus || 0) + (p.counts.normal || 0) + (p.counts.malus || 0);
        function pct(n) {
          if (!total) return "";
          return Math.round((n / total) * 100) + "%";
        }
        [
          ["👍 Bonus", p.counts.bonus],
          ["➕ Points", p.counts.normal],
          ["👎 Malus", p.counts.malus],
        ].forEach(function (row) {
          var stat = el("p");
          stat.appendChild(el("span", null, row[0]));
          var line = el("span", "bonus-stat__line");
          line.appendChild(el("strong", null, String(row[1] != null ? row[1] : 0)));
          var pctEl = el("span", "bonus-stat__pct", pct(row[1] || 0));
          line.appendChild(pctEl);
          stat.appendChild(line);
          stats.appendChild(stat);
        });
        card.appendChild(stats);
      }
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    parent.appendChild(wrap);
  }

  function renderRatio(payload, parent) {
    var wrap = el("div", "import-preview import-preview--ratio page-outil--ratio");
    var grid = el("section", "ratio-grid");
    var students = payload.students || payload.eleves || {};
    ["a", "b"].forEach(function (id) {
      var s = students[id];
      if (!s) return;
      var card = el("article", "card ratio-card");
      card.style.setProperty("--ratio-color", s.color || (id === "a" ? "#0d9488" : "#6366f1"));
      var top = el("div", "ratio-card__top");
      top.appendChild(el("span", "import-preview__team-name", s.name || "Équipe " + id.toUpperCase()));
      card.appendChild(top);
      var result = el("div", "ratio-result");
      result.appendChild(el("span", "ratio-result__label", "Ratio réussite"));
      result.appendChild(el("strong", null, (s.ratio != null ? s.ratio : 0) + "%"));
      card.appendChild(result);
      var stats = el("div", "ratio-stats");
      [["Réussites", s.plus], ["Échecs", s.minus], ["Total", s.total]].forEach(function (row) {
        var p = el("p");
        p.appendChild(el("span", null, row[0]));
        p.appendChild(el("strong", null, String(row[1] != null ? row[1] : 0)));
        stats.appendChild(p);
      });
      card.appendChild(stats);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    parent.appendChild(wrap);
  }

  function renderVitesse(payload, parent) {
    var wrap = el("div", "import-preview import-preview--vitesse-plots page-outil--vitesse-plots");
    if (payload.label) wrap.appendChild(el("p", "import-preview__title", payload.label));
    var live = el("section", "card vitesse-plots-live-card");
    var row = el("div", "vitesse-plots-results");
    function block(label, value, unit) {
      var b = el("div", "vitesse-plots-result");
      b.appendChild(el("span", null, label));
      var txt = value != null ? String(value) : "—";
      if (unit && value != null) txt += unit;
      b.appendChild(el("strong", null, txt));
      row.appendChild(b);
    }
    block("Vitesse dernier intervalle", payload.vitesseDernier, " km/h");
    block("Vitesse moyenne", payload.vitesseMoyenne, " km/h");
    live.appendChild(row);
    wrap.appendChild(live);

    if (payload.passages && payload.passages.length) {
      var tableWrap = el("div", "vitesse-plots-table-wrap");
      var table = el("table", "vitesse-plots-table");
      var thead = el("thead");
      var hr = el("tr");
      ["Plot", "Temps", "Intervalle", "Vitesse", "Moyenne"].forEach(function (h) {
        var th = el("th");
        th.textContent = h;
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el("tbody");
      payload.passages.forEach(function (p) {
        var tr = el("tr");
        [
          p.numero,
          p.tempsTotalLabel || "—",
          p.intervalLabel || "—",
          p.vitesseDernier != null ? p.vitesseDernier : "—",
          p.vitesseMoyenne != null ? p.vitesseMoyenne : "—",
        ].forEach(function (v) {
          tr.appendChild(el("td", null, v));
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      wrap.appendChild(tableWrap);
    }
    parent.appendChild(wrap);
  }

  function renderImpact(payload, parent) {
    var wrap = el("div", "import-preview import-preview--bad-impact page-outil--bad-impact");
    if (payload.label) wrap.appendChild(el("p", "import-preview__title", payload.label));
    wrap.appendChild(el("p", "hint", payload.activityLabel || payload.activity || "Activité"));
    var summary = el("div", "bad-impact-summary");
    function sumItem(label, value) {
      var p = el("p");
      p.appendChild(el("span", null, label));
      p.appendChild(el("strong", null, value != null ? String(value) : "—"));
      summary.appendChild(p);
    }
    sumItem("Impacts", payload.total);
    sumItem("Zones touchées", payload.coverage);
    sumItem("Zone principale", payload.mainZone);
    wrap.appendChild(summary);

    if (payload.zones && payload.zones.length) {
      var stats = el("div", "bad-impact-zone-stats import-preview__impact-grid");
      var cols = (payload.grid && payload.grid.cols) || 3;
      stats.style.setProperty("--bad-cols", String(cols));
      payload.zones.forEach(function (z) {
        var cell = el("div", "bad-impact-zone-stat" + (z.count ? " is-active" : ""));
        cell.style.setProperty("--bad-zone-alpha", String(Math.min(0.85, 0.16 + (z.percent || 0) / 100)));
        cell.appendChild(el("span", null, z.label));
        cell.appendChild(el("strong", null, String(z.count)));
        cell.appendChild(el("small", null, (z.percent != null ? z.percent : 0) + "%"));
        stats.appendChild(cell);
      });
      wrap.appendChild(stats);
    }
    parent.appendChild(wrap);
  }

  function renderQuestionsDebrief(payload, parent) {
    var expanded =
      typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.expandPayload
        ? QuestionsDebriefCore.expandPayload(payload)
        : payload;
    var wrap = el("div", "import-preview import-preview--debrief");
    var titre = expanded.seanceTitle || expanded.titre || expanded.porteeLabel || "Débrief";
    wrap.appendChild(el("h3", "debrief-preview-title", titre));
    var meta = [];
    if (expanded.dateLabel || expanded.dateIso) meta.push(expanded.dateLabel || expanded.dateIso);
    if (expanded.porteeLabel) meta.push(expanded.porteeLabel);
    if (expanded.compact) meta.push("QR compact");
    if (meta.length) {
      wrap.appendChild(el("p", "hint debrief-preview-portee", meta.join(" · ")));
    }
    var reponses = expanded.reponses || [];
    if (!reponses.length) {
      wrap.appendChild(el("p", "empty-state", "Aucune réponse dans cet import."));
      parent.appendChild(wrap);
      return;
    }
    reponses.forEach(function (row, index) {
      var card = el("article", "card debrief-preview-item");
      if (row.theme) {
        card.appendChild(el("span", "debrief-preview-theme", row.theme));
      }
      card.appendChild(
        el("p", "debrief-preview-question", (index + 1) + ". " + (row.question || "—"))
      );
      var rep = el("div", "debrief-preview-reponse");
      rep.appendChild(el("span", "debrief-preview-reponse__label", "Réponse"));
      var repText =
        typeof QuestionsDebriefCore !== "undefined" && QuestionsDebriefCore.formatReponseLabel
          ? QuestionsDebriefCore.formatReponseLabel(
              row.reponse,
              QuestionsDebriefCore.questionDef(row, expanded.portee)
            )
          : row.reponse && String(row.reponse).trim()
            ? row.reponse
            : "—";
      rep.appendChild(el("p", "debrief-preview-reponse__text", repText));
      card.appendChild(rep);
      wrap.appendChild(card);
    });
    parent.appendChild(wrap);
  }

  function formatRecordDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }

  function appendJournalPreviewRow(tbody, label, value, valueClass) {
    var tr = document.createElement("tr");
    var th = document.createElement("th");
    th.scope = "row";
    th.className = "journal-muscu-preview-table__label";
    th.textContent = label;
    var td = document.createElement("td");
    td.className =
      "journal-muscu-preview-table__value" + (valueClass ? " " + valueClass : "");
    td.textContent = value != null && value !== "" ? String(value) : "—";
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);
    return tr;
  }

  function appendJournalPreviewSection(tbody, title) {
    var tr = document.createElement("tr");
    tr.className = "journal-muscu-preview-table__section";
    var td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = title;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function formatExerciseSetsLabel(ex) {
    if (ex.setsLabel) return ex.setsLabel;
    if (!ex.sets || !ex.sets.length) return "—";
    return ex.sets
      .map(function (set, i) {
        return (
          "S" +
          (i + 1) +
          " " +
          (set.reps != null ? set.reps : "—") +
          "×" +
          (set.weightKg != null ? set.weightKg + " kg" : "—")
        );
      })
      .join(" · ");
  }

  function renderJournalMusculation(record, parent) {
    var wrap = el("div", "import-preview import-preview--journal-muscu page-outil--journal-muscu");
    var payload = record.payload || {};
    var session = payload;
    if (typeof JournalMusculationCore !== "undefined" && JournalMusculationCore.expandSharePayload) {
      session = JournalMusculationCore.expandSharePayload(payload);
    } else if (payload && payload.session) {
      session = payload.session;
    }
    if (!session) {
      parent.appendChild(el("p", "empty-state", "Séance non disponible."));
      return;
    }

    var summary = session.summary || {};
    var tableWrap = el("div", "journal-muscu-preview-table-wrap");
    var table = document.createElement("table");
    table.className = "journal-muscu-preview-table";
    var caption = document.createElement("caption");
    caption.className = "journal-muscu-preview-table__caption";
    caption.textContent = "Aperçu — journal de musculation";
    table.appendChild(caption);
    var tbody = document.createElement("tbody");

    appendJournalPreviewSection(tbody, "Import");
    appendJournalPreviewRow(
      tbody,
      "Outil",
      typeof QrExchangeCore !== "undefined"
        ? QrExchangeCore.toolTitle(record.toolId)
        : record.toolId
    );
    appendJournalPreviewRow(tbody, "Classe", record.classeLabel);
    appendJournalPreviewRow(tbody, "Joueur / Équipe", record.auteurLabel);
    appendJournalPreviewRow(tbody, "Saisie", formatRecordDateTime(record.createdAt));
    appendJournalPreviewRow(tbody, "Import", formatRecordDateTime(record.importedAt));

    appendJournalPreviewSection(tbody, "Séance");
    appendJournalPreviewRow(tbody, "Titre", session.title || "Séance");
    appendJournalPreviewRow(tbody, "Date", session.dateLabel || session.dateIso || "");
    appendJournalPreviewRow(
      tbody,
      "Exercices",
      summary.exerciseCount != null ? summary.exerciseCount : "—"
    );
    appendJournalPreviewRow(tbody, "Séries", summary.setCount != null ? summary.setCount : "—");
    appendJournalPreviewRow(
      tbody,
      "Répétitions",
      summary.repCount != null ? summary.repCount : "—"
    );
    appendJournalPreviewRow(
      tbody,
      "Volume",
      summary.volumeKg != null ? summary.volumeKg + " kg" : "—"
    );
    if (session.notes) {
      appendJournalPreviewRow(tbody, "Notes", session.notes, "journal-muscu-preview-table__notes");
    }

    var exercises = session.exercises || [];
    if (exercises.length) {
      appendJournalPreviewSection(tbody, "Exercices");
      exercises.forEach(function (ex) {
        appendJournalPreviewRow(
          tbody,
          ex.name || "Exercice",
          formatExerciseSetsLabel(ex),
          "journal-muscu-preview-table__sets"
        );
      });
    }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    parent.appendChild(wrap);
  }

  function renderPayload(record, parent) {
    var payload = record.payload || {};
    if (record.toolId === "table-marque") renderTableMarque(payload, parent);
    else if (record.toolId === "compteur-ptb") renderPtb(payload, parent);
    else if (record.toolId === "compteur-bonus") renderBonus(payload, parent);
    else if (record.toolId === "compteur-ratio") renderRatio(payload, parent);
    else if (record.toolId === "vitesse-plots") renderVitesse(payload, parent);
    else if (record.toolId === "zone-impact") renderImpact(payload, parent);
    else if (record.toolId === "journal-musculation") renderJournalMusculation(record, parent);
    else if (record.toolId === "questions-debrief") renderQuestionsDebrief(payload, parent);
    else parent.appendChild(el("p", "empty-state", "Aperçu non disponible pour cet outil."));
  }

  function render(record, container) {
    if (!container) return;
    clear(container);
    if (!record) {
      container.appendChild(el("p", "empty-state", "Aucun détail."));
      return;
    }
    var root = el("div", "import-preview-root");
    if (record.toolId === "journal-musculation") {
      renderPayload(record, root);
    } else {
      renderMeta(record, root);
      renderPayload(record, root);
    }
    container.appendChild(root);
  }

  return { render: render };
})();
