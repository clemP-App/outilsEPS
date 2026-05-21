/**
 * Silhouette humaine — carte de chaleur des muscles (journal musculation).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.JournalMusculationBody = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var MUSCLE_TO_REGIONS = {
    Quadriceps: ["quads-l", "quads-r"],
    "Ischio-jambiers": ["hams-l", "hams-r"],
    Fessiers: ["glutes"],
    Mollets: ["calves-f-l", "calves-f-r", "calves-b-l", "calves-b-r"],
    Pectoraux: ["chest"],
    "Grand dorsal": ["lats"],
    Deltoïdes: ["delts-f-l", "delts-f-r", "delts-b-l", "delts-b-r"],
    Biceps: ["biceps-l", "biceps-r"],
    Triceps: ["triceps-l", "triceps-r"],
    Abdominaux: ["abs"],
    "Chaîne postérieure": ["lower-back", "hams-l", "hams-r", "glutes"],
    "Corps entier": [
      "chest",
      "abs",
      "lats",
      "lower-back",
      "delts-f-l",
      "delts-f-r",
      "delts-b-l",
      "delts-b-r",
      "biceps-l",
      "biceps-r",
      "triceps-l",
      "triceps-r",
      "quads-l",
      "quads-r",
      "hams-l",
      "hams-r",
      "glutes",
      "calves-f-l",
      "calves-f-r",
      "calves-b-l",
      "calves-b-r",
    ],
  };

  var ALL_REGIONS = [];
  Object.keys(MUSCLE_TO_REGIONS).forEach(function (key) {
    MUSCLE_TO_REGIONS[key].forEach(function (id) {
      if (ALL_REGIONS.indexOf(id) < 0) ALL_REGIONS.push(id);
    });
  });

  /**
   * Silhouette vectorielle (face + dos), proportions fixes, sans courbes relatives ambiguës.
   */
  var BODY_SVG =
    '<svg class="journal-muscu-body-svg" viewBox="0 0 400 420" role="img" aria-hidden="true">' +
    "<defs>" +
    '<linearGradient id="jm-body-fill" x1="0%" y1="0%" x2="0%" y2="100%">' +
    '<stop offset="0%" stop-color="#f8fafc"/>' +
    '<stop offset="100%" stop-color="#eef2f7"/>' +
    "</linearGradient>" +
    "</defs>" +
    '<g class="journal-muscu-body__panel" transform="translate(24,24)">' +
    '<text x="88" y="0" class="journal-muscu-body__label">Face</text>' +
    '<path class="journal-muscu-body__outline" fill="url(#jm-body-fill)" d="' +
    "M88 14 C72 14 62 26 62 40 C62 48 66 54 72 58 " +
    "L48 64 C34 70 26 88 24 112 L22 156 C20 170 26 180 34 184 " +
    "L30 236 C28 276 36 312 54 324 L70 328 L88 326 L106 328 L122 324 " +
    "C140 312 148 276 146 236 L142 184 C150 180 156 170 154 156 " +
    "L152 112 C150 88 142 70 128 64 L104 58 C110 54 114 48 114 40 " +
    "C114 26 104 14 88 14 Z" +
    '"/>' +
    '<ellipse class="journal-muscu-body__head" cx="88" cy="38" rx="17" ry="21"/>' +
    '<path data-region="delts-f-l" d="M48 64 L40 82 L42 100 L54 94 L58 76 Z"/>' +
    '<path data-region="delts-f-r" d="M128 64 L136 82 L134 100 L122 94 L118 76 Z"/>' +
    '<path data-region="chest" d="M58 76 L118 76 L112 112 L64 112 Z"/>' +
    '<path data-region="biceps-l" d="M34 84 L42 100 L38 148 L26 142 L28 102 Z"/>' +
    '<path data-region="biceps-r" d="M142 84 L134 100 L138 148 L150 142 L148 102 Z"/>' +
    '<path data-region="abs" d="M64 112 L112 112 L108 152 L68 152 Z"/>' +
    '<path data-region="quads-l" d="M62 152 L78 156 L82 244 L66 240 Z"/>' +
    '<path data-region="quads-r" d="M114 152 L98 156 L94 244 L110 240 Z"/>' +
    '<path data-region="calves-f-l" d="M66 240 L82 244 L78 318 L62 314 Z"/>' +
    '<path data-region="calves-f-r" d="M110 240 L94 244 L98 318 L114 314 Z"/>' +
    "</g>" +
    '<g class="journal-muscu-body__panel" transform="translate(224,24)">' +
    '<text x="88" y="0" class="journal-muscu-body__label">Dos</text>' +
    '<path class="journal-muscu-body__outline" fill="url(#jm-body-fill)" d="' +
    "M88 14 C72 14 62 26 62 40 C62 48 66 54 72 58 " +
    "L48 64 C34 70 26 88 24 112 L22 156 C20 170 26 180 34 184 " +
    "L30 236 C28 276 36 312 54 324 L70 328 L88 326 L106 328 L122 324 " +
    "C140 312 148 276 146 236 L142 184 C150 180 156 170 154 156 " +
    "L152 112 C150 88 142 70 128 64 L104 58 C110 54 114 48 114 40 " +
    "C114 26 104 14 88 14 Z" +
    '"/>' +
    '<ellipse class="journal-muscu-body__head" cx="88" cy="38" rx="17" ry="21"/>' +
    '<path data-region="delts-b-l" d="M48 64 L40 82 L42 100 L54 94 L58 76 Z"/>' +
    '<path data-region="delts-b-r" d="M128 64 L136 82 L134 100 L122 94 L118 76 Z"/>' +
    '<path data-region="lats" d="M54 72 L122 72 L118 118 L58 118 Z"/>' +
    '<path data-region="lower-back" d="M68 118 L108 118 L104 152 L72 152 Z"/>' +
    '<path data-region="triceps-l" d="M26 102 L38 148 L48 132 L42 88 Z"/>' +
    '<path data-region="triceps-r" d="M150 102 L138 148 L128 132 L134 88 Z"/>' +
    '<path data-region="glutes" d="M62 152 L114 152 L108 176 L68 176 Z"/>' +
    '<path data-region="hams-l" d="M62 176 L78 180 L82 262 L64 256 Z"/>' +
    '<path data-region="hams-r" d="M114 176 L98 180 L94 262 L112 256 Z"/>' +
    '<path data-region="calves-b-l" d="M64 256 L82 262 L76 318 L60 312 Z"/>' +
    '<path data-region="calves-b-r" d="M112 256 L94 262 L100 318 L116 312 Z"/>' +
    "</g>" +
    "</svg>";

  function normalizeMuscleKey(label) {
    return String(label || "")
      .trim()
      .toLowerCase();
  }

  function regionsForMuscle(label) {
    if (!label || label === "Muscle non renseigné") return [];
    var exact = MUSCLE_TO_REGIONS[label];
    if (exact) return exact.slice();
    var key = normalizeMuscleKey(label);
    var found = Object.keys(MUSCLE_TO_REGIONS).find(function (k) {
      return normalizeMuscleKey(k) === key;
    });
    return found ? MUSCLE_TO_REGIONS[found].slice() : [];
  }

  function regionIntensitiesFromMuscles(muscleRows) {
    var map = {};
    ALL_REGIONS.forEach(function (id) {
      map[id] = 0;
    });
    (muscleRows || []).forEach(function (row) {
      if (!row || !row.sets) return;
      var intensity = row.intensity != null ? row.intensity : 0;
      regionsForMuscle(row.label).forEach(function (regionId) {
        if (intensity > (map[regionId] || 0)) map[regionId] = intensity;
      });
    });
    return map;
  }

  function tooltipForRegion(regionId, muscleRows) {
    var parts = [];
    (muscleRows || []).forEach(function (row) {
      if (!row.sets) return;
      if (regionsForMuscle(row.label).indexOf(regionId) >= 0) {
        parts.push(row.label + " : " + row.sets + " séries");
      }
    });
    return parts.join("\n");
  }

  function paintRegions(svgRoot, regionMap, muscleRows) {
    if (!svgRoot) return;
    var nodes = svgRoot.querySelectorAll("[data-region]");
    nodes.forEach(function (node) {
      var id = node.getAttribute("data-region");
      var heat = regionMap[id] || 0;
      node.classList.remove("has-heat", "has-heat--low", "has-heat--mid", "has-heat--high");
      node.style.removeProperty("--heat");
      node.removeAttribute("title");
      if (heat > 0) {
        node.classList.add("has-heat");
        if (heat >= 0.66) node.classList.add("has-heat--high");
        else if (heat >= 0.33) node.classList.add("has-heat--mid");
        else node.classList.add("has-heat--low");
        node.style.setProperty("--heat", String(heat));
        var tip = tooltipForRegion(id, muscleRows);
        if (tip) node.setAttribute("title", tip);
      }
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildLegendHtml(muscleRows, maxItems) {
    maxItems = maxItems || 4;
    var items = (muscleRows || []).filter(function (r) {
      return r.sets > 0 && r.label !== "Muscle non renseigné";
    });
    if (!items.length) return "";
    var html = '<ul class="journal-muscu-body-legend">';
    items.slice(0, maxItems).forEach(function (row) {
      html +=
        "<li><span class=\"journal-muscu-body-legend__swatch\" style=\"--heat:" +
        row.intensity +
        '"></span><span>' +
        escapeHtml(row.label) +
        "</span> <strong>" +
        row.sets +
        " s.</strong></li>";
    });
    html += "</ul>";
    return html;
  }

  function renderBodyHeatmap(container, muscleRows, options) {
    options = options || {};
    if (!container) return;
    var regionMap = regionIntensitiesFromMuscles(muscleRows);
    var hasHeat = Object.keys(regionMap).some(function (k) {
      return regionMap[k] > 0;
    });
    if (!hasHeat) {
      container.innerHTML = "";
      return;
    }
    var title = options.title || "Carte des muscles";
    var html =
      '<div class="journal-muscu-body-block">' +
      '<h3 class="journal-muscu-insights-title">' +
      title +
      "</h3>" +
      '<p class="hint journal-muscu-body-hint">Plus la teinte est foncée, plus le muscle a été sollicité (séries).</p>' +
      '<div class="journal-muscu-body-wrap">' +
      '<div class="journal-muscu-body-svg-host">' +
      BODY_SVG +
      "</div>" +
      buildLegendHtml(muscleRows) +
      "</div></div>";
    container.innerHTML = html;
    var host = container.querySelector(".journal-muscu-body-svg-host");
    var svg = host && host.querySelector("svg");
    paintRegions(svg, regionMap, muscleRows);
    if (options.ariaLabel && svg) {
      svg.setAttribute("aria-label", options.ariaLabel);
      svg.removeAttribute("aria-hidden");
    }
  }

  return {
    MUSCLE_TO_REGIONS: MUSCLE_TO_REGIONS,
    ALL_REGIONS: ALL_REGIONS,
    regionsForMuscle: regionsForMuscle,
    regionIntensitiesFromMuscles: regionIntensitiesFromMuscles,
    renderBodyHeatmap: renderBodyHeatmap,
  };
});
