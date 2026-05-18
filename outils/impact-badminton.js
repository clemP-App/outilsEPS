/**
 * Zone d'impact — carte cliquable multi-activités.
 */
(function () {
  "use strict";

  var courtEl = document.getElementById("bad-impact-court");
  var zoneGridEl = document.getElementById("bad-impact-zone-grid");
  var markersEl = document.getElementById("bad-impact-markers");
  var statsEl = document.getElementById("bad-impact-zone-stats");
  var totalEl = document.getElementById("bad-impact-total");
  var coverageEl = document.getElementById("bad-impact-coverage");
  var mainZoneEl = document.getElementById("bad-impact-main-zone");
  var undoBtn = document.getElementById("bad-impact-undo");
  var resetBtn = document.getElementById("bad-impact-reset");
  var activityEl = document.getElementById("bad-impact-activity");
  var colsEl = document.getElementById("bad-impact-cols");
  var rowsEl = document.getElementById("bad-impact-rows");
  var colsGroupEl = document.getElementById("bad-impact-cols-group");
  var rowsGroupEl = document.getElementById("bad-impact-rows-group");
  var surfaceHintEl = document.getElementById("bad-impact-surface-hint");

  var impacts = [];
  var ACTIVITIES = {
    badminton: {
      className: "is-badminton",
      label: "demi-terrain",
      hint: "Badminton : demi-terrain adverse, filet en bas. La zone avant commence au filet.",
      rows: ["Fond", "Milieu", "Avant"],
      cols: ["gauche", "centre", "droite"],
      fixedRows: false,
      fixedCols: false,
    },
    "tennis-table": {
      className: "is-table-tennis",
      label: "demi-table",
      hint: "Tennis de table : demi-table adverse, filet en bas.",
      rows: ["Long", "Intermédiaire", "Court"],
      cols: ["gauche", "centre", "droite"],
      fixedRows: false,
      fixedCols: false,
    },
    volleyball: {
      className: "is-volleyball",
      label: "terrain adverse",
      hint: "Volley-ball : terrain adverse, filet en bas. Cliquez la zone visée ou touchée.",
      rows: ["Fond", "Centre", "Avant"],
      cols: ["gauche", "centre", "droite"],
      fixedRows: false,
      fixedCols: false,
    },
    "boxe-francaise": {
      className: "is-boxe",
      label: "corps",
      hint: "Boxe française : cliquez la zone touchée sur le corps.",
      rows: ["Tête", "Tronc", "Jambes"],
      cols: ["zone"],
      fixedRows: true,
      fixedCols: true,
    },
  };

  function currentActivity() {
    var id = activityEl && ACTIVITIES[activityEl.value] ? activityEl.value : "badminton";
    return ACTIVITIES[id];
  }

  function clampGridValue(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return 3;
    return Math.max(1, Math.min(3, n));
  }

  function gridConfig() {
    var activity = currentActivity();
    return {
      cols: activity.fixedCols ? 1 : clampGridValue(colsEl ? colsEl.value : 3),
      rows: activity.fixedRows ? 3 : clampGridValue(rowsEl ? rowsEl.value : 3),
    };
  }

  function rowName(row, totalRows) {
    var activity = currentActivity();
    if (activity.fixedRows) return activity.rows[row] || "Zone";
    if (totalRows === 1) return "Toute profondeur";
    if (totalRows === 2) return row === 0 ? "Fond" : "Avant";
    return activity.rows[row] || "Zone";
  }

  function colName(col, totalCols) {
    var activity = currentActivity();
    if (activity.fixedCols) return "";
    if (totalCols === 1) return "toute largeur";
    if (totalCols === 2) return col === 0 ? "gauche" : "droite";
    return activity.cols[col] || "zone";
  }

  function zoneIndexFromPoint(xPct, yPct) {
    var cfg = gridConfig();
    var col = Math.min(cfg.cols - 1, Math.max(0, Math.floor(xPct / (100 / cfg.cols))));
    var row = Math.min(cfg.rows - 1, Math.max(0, Math.floor(yPct / (100 / cfg.rows))));
    return row * cfg.cols + col;
  }

  function zoneLabel(index) {
    var cfg = gridConfig();
    var row = Math.floor(index / cfg.cols);
    var col = index % cfg.cols;
    var activity = currentActivity();
    if (activity.fixedCols) return rowName(row, cfg.rows);
    if (cfg.rows === 1 && cfg.cols === 1) return "Toute la surface";
    if (cfg.rows === 1) return "Toute profondeur " + colName(col, cfg.cols);
    if (cfg.cols === 1) return rowName(row, cfg.rows);
    return rowName(row, cfg.rows) + " " + colName(col, cfg.cols);
  }

  function countsByZone() {
    var cfg = gridConfig();
    var counts = Array(cfg.rows * cfg.cols).fill(0);
    impacts.forEach(function (impact) {
      counts[zoneIndexFromPoint(impact.x, impact.y)]++;
    });
    return counts;
  }

  function addImpactFromEvent(event) {
    if (!courtEl) return;
    var rect = courtEl.getBoundingClientRect();
    var x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    var y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    if (currentActivity().fixedCols && (x < 18 || x > 82)) return;
    impacts.push({
      x: x,
      y: y,
    });
    render();
  }

  function reset() {
    if (!impacts.length) return;
    if (!confirm("Effacer tous les impacts ?")) return;
    impacts = [];
    render();
  }

  function undo() {
    impacts.pop();
    render();
  }

  function renderMarkers() {
    if (!markersEl) return;
    markersEl.innerHTML = "";
    impacts.forEach(function (impact, index) {
      var marker = document.createElement("span");
      marker.className = "bad-impact-marker";
      marker.style.left = impact.x + "%";
      marker.style.top = impact.y + "%";
      marker.textContent = String(index + 1);
      markersEl.appendChild(marker);
    });
  }

  function renderStats() {
    var cfg = gridConfig();
    var counts = countsByZone();
    var total = impacts.length;
    var touched = counts.filter(function (count) {
      return count > 0;
    }).length;
    var max = Math.max.apply(Math, counts);
    var mainIndex = counts.indexOf(max);

    if (totalEl) totalEl.textContent = String(total);
    if (coverageEl) coverageEl.textContent = touched + " / " + counts.length;
    if (mainZoneEl) mainZoneEl.textContent = total ? zoneLabel(mainIndex) : "—";

    if (!statsEl) return;
    statsEl.innerHTML = "";
    statsEl.style.setProperty("--bad-cols", String(cfg.cols));
    counts.forEach(function (count, index) {
      var pct = total ? Math.round((count / total) * 100) : 0;
      var cell = document.createElement("div");
      cell.className = "bad-impact-zone-stat" + (count ? " is-active" : "");
      cell.style.setProperty("--bad-zone-alpha", String(Math.min(0.85, 0.16 + pct / 100)));

      var label = document.createElement("span");
      label.textContent = zoneLabel(index);
      var value = document.createElement("strong");
      value.textContent = String(count);
      var percent = document.createElement("small");
      percent.textContent = pct + "%";

      cell.appendChild(label);
      cell.appendChild(value);
      cell.appendChild(percent);
      statsEl.appendChild(cell);
    });
  }

  function renderZoneGrid() {
    var cfg = gridConfig();
    var activity = currentActivity();
    if (courtEl) {
      courtEl.style.setProperty("--bad-cols", String(cfg.cols));
      courtEl.style.setProperty("--bad-rows", String(cfg.rows));
      courtEl.className = "bad-impact-court " + activity.className;
      courtEl.setAttribute("aria-label", "Surface d'impact cliquable : " + activity.label);
    }
    if (surfaceHintEl) surfaceHintEl.textContent = activity.hint;
    if (colsEl) colsEl.disabled = !!activity.fixedCols;
    if (rowsEl) rowsEl.disabled = !!activity.fixedRows;
    if (colsGroupEl) colsGroupEl.hidden = !!activity.fixedCols;
    if (rowsGroupEl) rowsGroupEl.hidden = !!activity.fixedRows;
    if (!zoneGridEl) return;
    zoneGridEl.innerHTML = "";
    zoneGridEl.style.setProperty("--bad-cols", String(cfg.cols));
    zoneGridEl.style.setProperty("--bad-rows", String(cfg.rows));
    for (var index = 0; index < cfg.rows * cfg.cols; index++) {
      var zone = document.createElement("span");
      zone.textContent = zoneLabel(index);
      zoneGridEl.appendChild(zone);
    }
  }

  function render() {
    renderZoneGrid();
    renderMarkers();
    renderStats();
    if (undoBtn) undoBtn.disabled = impacts.length === 0;
    if (resetBtn) resetBtn.disabled = impacts.length === 0;
  }

  if (courtEl) {
    courtEl.addEventListener("pointerdown", function (event) {
      addImpactFromEvent(event);
    });
    courtEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        impacts.push({ x: 50, y: 50 });
        render();
      }
    });
  }

  if (undoBtn) undoBtn.addEventListener("click", undo);
  if (resetBtn) resetBtn.addEventListener("click", reset);
  if (activityEl) activityEl.addEventListener("change", render);
  if (colsEl) colsEl.addEventListener("change", render);
  if (rowsEl) rowsEl.addEventListener("change", render);

  render();
})();
