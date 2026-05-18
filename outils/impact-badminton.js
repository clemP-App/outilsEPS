/**
 * Zones d'impact badminton — carte cliquable des impacts de volant.
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
  var colsEl = document.getElementById("bad-impact-cols");
  var rowsEl = document.getElementById("bad-impact-rows");

  var impacts = [];

  function clampGridValue(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return 3;
    return Math.max(1, Math.min(3, n));
  }

  function gridConfig() {
    return {
      cols: clampGridValue(colsEl ? colsEl.value : 3),
      rows: clampGridValue(rowsEl ? rowsEl.value : 3),
    };
  }

  function rowName(row, totalRows) {
    if (totalRows === 1) return "Toute profondeur";
    if (totalRows === 2) return row === 0 ? "Fond" : "Avant";
    return ["Fond", "Milieu", "Avant"][row];
  }

  function colName(col, totalCols) {
    if (totalCols === 1) return "toute largeur";
    if (totalCols === 2) return col === 0 ? "gauche" : "droite";
    return ["gauche", "centre", "droite"][col];
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
    if (cfg.rows === 1 && cfg.cols === 1) return "Tout le demi-terrain";
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
    if (courtEl) {
      courtEl.style.setProperty("--bad-cols", String(cfg.cols));
      courtEl.style.setProperty("--bad-rows", String(cfg.rows));
    }
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
  if (colsEl) colsEl.addEventListener("change", render);
  if (rowsEl) rowsEl.addEventListener("change", render);

  render();
})();
