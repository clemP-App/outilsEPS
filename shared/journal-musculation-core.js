/**
 * Journal de musculation — modèle de données, catalogue, export QR (une séance).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.JournalMusculationCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var Rm = null;
  if (typeof RmFormulas !== "undefined") {
    Rm = RmFormulas;
  } else if (typeof module !== "undefined" && module.exports) {
    try {
      Rm = require("./rm-formulas.js");
    } catch (eRm) {
      Rm = null;
    }
  }

  var TOOL_ID = "journal-musculation";
  var STORAGE_KEY = "outils_eps_journal_musculation_v1";
  var CATALOG_SORT_KEYS = ["category", "muscle", "bodyPart"];
  /** Limite notes (export QR + saisie élève). */
  var NOTES_MAX_LENGTH = 120;

  /** Catalogue par défaut : musculation générale + EPS (haltères, poids du corps, machines courantes). */
  var DEFAULT_CATALOG = [
    /* — Jambes — */
    { name: "Squat", category: "Barre", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Squat haltères", category: "Haltères", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Squat au poids du corps", category: "Poids du corps", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Squat guidé (Smith)", category: "Machine", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Hack squat", category: "Machine", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Presse à cuisses", category: "Machine", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Fentes marchées", category: "Haltères", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Fentes arrière", category: "Haltères", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Fentes bulgares", category: "Haltères", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Montées sur banc", category: "Poids du corps", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Step-up", category: "Haltères", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Leg extension", category: "Machine", muscle: "Quadriceps", bodyPart: "Jambes" },
    { name: "Leg curl allongé", category: "Machine", muscle: "Ischio-jambiers", bodyPart: "Jambes" },
    { name: "Leg curl assis", category: "Machine", muscle: "Ischio-jambiers", bodyPart: "Jambes" },
    { name: "Soulevé de terre", category: "Barre", muscle: "Chaîne postérieure", bodyPart: "Jambes" },
    { name: "Soulevé de terre haltères", category: "Haltères", muscle: "Chaîne postérieure", bodyPart: "Jambes" },
    { name: "Soulevé de terre jambes tendues", category: "Barre", muscle: "Ischio-jambiers", bodyPart: "Jambes" },
    { name: "Hip thrust haltères", category: "Haltères", muscle: "Fessiers", bodyPart: "Jambes" },
    { name: "Pont fessier", category: "Poids du corps", muscle: "Fessiers", bodyPart: "Jambes" },
    { name: "Mollets debout", category: "Machine", muscle: "Mollets", bodyPart: "Jambes" },
    { name: "Mollets debout haltères", category: "Haltères", muscle: "Mollets", bodyPart: "Jambes" },
    { name: "Mollets assis", category: "Machine", muscle: "Mollets", bodyPart: "Jambes" },
    /* — Poitrine — */
    { name: "Développé couché", category: "Barre", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Développé couché haltères", category: "Haltères", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Développé incliné haltères", category: "Haltères", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Développé décliné haltères", category: "Haltères", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Chest press", category: "Machine", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Pec deck", category: "Machine", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Pompes", category: "Poids du corps", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Pompes inclinées", category: "Poids du corps", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Pompes déclinées", category: "Poids du corps", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Écarté haltères", category: "Haltères", muscle: "Pectoraux", bodyPart: "Poitrine" },
    { name: "Écarté poulie", category: "Poulie", muscle: "Pectoraux", bodyPart: "Poitrine" },
    /* — Dos — */
    { name: "Tractions", category: "Poids du corps", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Tractions supination", category: "Poids du corps", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Tirage vertical prise large", category: "Machine", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Tirage vertical prise serrée", category: "Machine", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Rowing barre", category: "Barre", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Rowing haltère", category: "Haltères", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Rowing poulie basse", category: "Poulie", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Tirage horizontal poulie", category: "Poulie", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Pull-over haltère", category: "Haltères", muscle: "Grand dorsal", bodyPart: "Dos" },
    { name: "Superman", category: "Poids du corps", muscle: "Chaîne postérieure", bodyPart: "Dos" },
    /* — Épaules — */
    { name: "Développé militaire", category: "Barre", muscle: "Deltoïdes", bodyPart: "Épaules" },
    { name: "Développé militaire haltères", category: "Haltères", muscle: "Deltoïdes", bodyPart: "Épaules" },
    { name: "Développé épaules machine", category: "Machine", muscle: "Deltoïdes", bodyPart: "Épaules" },
    { name: "Élévations latérales", category: "Haltères", muscle: "Deltoïdes", bodyPart: "Épaules" },
    { name: "Élévations frontales", category: "Haltères", muscle: "Deltoïdes", bodyPart: "Épaules" },
    { name: "Oiseau", category: "Haltères", muscle: "Deltoïdes", bodyPart: "Épaules" },
    { name: "Shrugs", category: "Haltères", muscle: "Deltoïdes", bodyPart: "Épaules" },
    /* — Bras — */
    { name: "Curl barre", category: "Barre", muscle: "Biceps", bodyPart: "Bras" },
    { name: "Curl barre EZ", category: "Barre", muscle: "Biceps", bodyPart: "Bras" },
    { name: "Curl haltères", category: "Haltères", muscle: "Biceps", bodyPart: "Bras" },
    { name: "Curl marteau", category: "Haltères", muscle: "Biceps", bodyPart: "Bras" },
    { name: "Curl pupitre", category: "Machine", muscle: "Biceps", bodyPart: "Bras" },
    { name: "Barre au front", category: "Barre", muscle: "Triceps", bodyPart: "Bras" },
    { name: "Extension triceps poulie", category: "Poulie", muscle: "Triceps", bodyPart: "Bras" },
    { name: "Extension triceps haltères", category: "Haltères", muscle: "Triceps", bodyPart: "Bras" },
    { name: "Dips", category: "Poids du corps", muscle: "Triceps", bodyPart: "Bras" },
    { name: "Dips entre deux bancs", category: "Poids du corps", muscle: "Triceps", bodyPart: "Bras" },
    { name: "Pompes diamant", category: "Poids du corps", muscle: "Triceps", bodyPart: "Bras" },
    /* — Core — */
    { name: "Crunch", category: "Poids du corps", muscle: "Abdominaux", bodyPart: "Core" },
    { name: "Crunch haltère", category: "Haltères", muscle: "Abdominaux", bodyPart: "Core" },
    { name: "Relevé de jambes", category: "Poids du corps", muscle: "Abdominaux", bodyPart: "Core" },
    { name: "Planche", category: "Poids du corps", muscle: "Abdominaux", bodyPart: "Core" },
    { name: "Gainage latéral", category: "Poids du corps", muscle: "Abdominaux", bodyPart: "Core" },
    { name: "Russian twist", category: "Haltères", muscle: "Abdominaux", bodyPart: "Core" },
    /* — Conditionnement (EPS) — */
    { name: "Burpees", category: "Poids du corps", muscle: "Corps entier", bodyPart: "Corps entier" },
    { name: "Grimpeur", category: "Poids du corps", muscle: "Corps entier", bodyPart: "Corps entier" },
    { name: "Squat sauté", category: "Poids du corps", muscle: "Corps entier", bodyPart: "Corps entier" },
  ];

  function genererId(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return prefix + crypto.randomUUID();
    }
    return prefix + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function todayIsoDate() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function parseNum(val) {
    if (val === "" || val == null) return null;
    var n = parseFloat(String(val).replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function normalizeNameKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase();
  }

  function normalizeExercise(ex) {
    if (!ex || typeof ex !== "object") return ex;
    if (!ex.setMode) {
      if (ex.setCount != null || ex.uniformReps != null || ex.uniformWeightKg != null) {
        ex.setMode = "uniform";
      } else {
        ex.setMode = "individual";
        ex.sets = ex.sets || [];
      }
    }
    if (ex.setMode === "uniform") {
      ex.setCount = parseNum(ex.setCount) != null ? parseNum(ex.setCount) : 0;
      ex.uniformReps = parseNum(ex.uniformReps);
      ex.uniformWeightKg = parseNum(ex.uniformWeightKg);
    } else {
      ex.sets = ex.sets || [];
    }
    return ex;
  }

  function normalizeSession(session) {
    if (!session || typeof session !== "object") return session;
    if (!session.id) session.id = genererId("jm_");
    if (!session.title) session.title = "Séance";
    if (!session.dateIso) session.dateIso = todayIsoDate();
    session.exercises = (session.exercises || [])
      .filter(function (ex) {
        return ex && typeof ex === "object";
      })
      .map(normalizeExercise);
    return session;
  }

  function defaultState() {
    return { sessions: [], customExercises: [], max1rmByExercise: {}, rmFormula: "epley" };
  }

  function loadState(storage) {
    storage = storage || null;
    if (!storage || !storage.getItem) return defaultState();
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var data = JSON.parse(raw);
      var sessions = [];
      if (Array.isArray(data.sessions)) {
        data.sessions.forEach(function (session) {
          try {
            sessions.push(normalizeSession(session));
          } catch (eOne) {
            if (session && typeof session === "object") sessions.push(session);
          }
        });
      }
      return {
        sessions: sessions,
        customExercises: Array.isArray(data.customExercises) ? data.customExercises : [],
        max1rmByExercise:
          data.max1rmByExercise && typeof data.max1rmByExercise === "object"
            ? data.max1rmByExercise
            : {},
        rmFormula: data.rmFormula === "brzycki" ? "brzycki" : "epley",
      };
    } catch (e) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[journal-musculation] lecture localStorage impossible", e);
      }
      return defaultState();
    }
  }

  function saveState(state, storage) {
    storage = storage || null;
    if (!storage || !storage.setItem) return;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessions: state.sessions || [],
        customExercises: state.customExercises || [],
        max1rmByExercise: state.max1rmByExercise || {},
        rmFormula: state.rmFormula === "brzycki" ? "brzycki" : "epley",
      })
    );
  }

  function getRmFormula(state) {
    return state && state.rmFormula === "brzycki" ? "brzycki" : "epley";
  }

  function setRmFormula(state, formula) {
    state.rmFormula = formula === "brzycki" ? "brzycki" : "epley";
  }

  function getRecordedMax(state, exerciseName) {
    var key = normalizeNameKey(exerciseName);
    if (!key || !state.max1rmByExercise) return null;
    return state.max1rmByExercise[key] || null;
  }

  function setRecordedMax(state, exerciseName, weightKg) {
    var name = String(exerciseName || "").trim();
    var key = normalizeNameKey(name);
    var kg = parseNum(weightKg);
    if (!key || kg == null || kg <= 0) return null;
    state.max1rmByExercise = state.max1rmByExercise || {};
    state.max1rmByExercise[key] = {
      name: name,
      weightKg: Math.round(kg * 10) / 10,
      updatedAtIso: todayIsoDate(),
    };
    return state.max1rmByExercise[key];
  }

  function deleteRecordedMax(state, exerciseName) {
    var key = normalizeNameKey(exerciseName);
    if (!key || !state.max1rmByExercise || !state.max1rmByExercise[key]) return false;
    delete state.max1rmByExercise[key];
    return true;
  }

  function listRecordedMaxes(state) {
    var map = state.max1rmByExercise || {};
    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr");
      });
  }

  function bestPotentialFromExercise(ex, formula) {
    if (!Rm) return null;
    var best = null;
    expandExerciseSets(ex).forEach(function (set) {
      var w = parseNum(set.weightKg);
      var r = parseNum(set.reps);
      if (w == null || r == null) return;
      var est = Rm.estimate1rm(w, r, formula);
      if (est == null) return;
      est = Math.round(est * 10) / 10;
      if (!best || est > best.estimatedKg) {
        best = {
          estimatedKg: est,
          weightKg: w,
          reps: r,
          sourceLabel: Rm.formatKg(w) + " kg × " + r + " rep" + (r > 1 ? "s" : ""),
        };
      }
    });
    return best;
  }

  function collectRmInsights(state, options) {
    options = options || {};
    if (!Rm) return { formula: "epley", formulaLabel: "Epley", rows: [] };
    var formula = options.formula || getRmFormula(state);
    var sessions = options.sessions != null ? options.sessions : state.sessions || [];
    var byKey = {};
    sessions.forEach(function (session) {
      (session.exercises || []).forEach(function (ex) {
        var key = normalizeNameKey(ex.name);
        if (!key) return;
        var pot = bestPotentialFromExercise(ex, formula);
        if (!pot) return;
        if (!byKey[key] || pot.estimatedKg > byKey[key].potential.estimatedKg) {
          byKey[key] = {
            name: ex.name,
            key: key,
            potential: pot,
            sessionTitle: session.title,
            sessionDateIso: session.dateIso,
          };
        }
      });
    });
    var rows = Object.keys(byKey)
      .map(function (k) {
        var row = byKey[k];
        row.recorded = getRecordedMax(state, row.name);
        return row;
      })
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr");
      });
    return {
      formula: formula,
      formulaLabel: Rm.formulaLabel(formula),
      rows: rows,
    };
  }

  function formatPotential1rmLabel(potential, formula) {
    if (!potential || !Rm) return "";
    return (
      "~" +
      Rm.formatKg(potential.estimatedKg) +
      " kg (1RM potentiel · estim. " +
      Rm.formulaLabel(formula) +
      ")"
    );
  }

  function mergeCatalog(state) {
    var map = {};
    DEFAULT_CATALOG.forEach(function (item) {
      var key = normalizeNameKey(item.name);
      map[key] = Object.assign({ isCustom: false }, item);
    });
    (state.customExercises || []).forEach(function (item) {
      if (!item || !item.name) return;
      var key = normalizeNameKey(item.name);
      map[key] = {
        name: String(item.name).trim(),
        category: item.category || "Personnalisé",
        muscle: item.muscle || "—",
        bodyPart: item.bodyPart || "—",
        isCustom: true,
      };
    });
    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr");
      });
  }

  function getCatalogGrouped(state, sortBy) {
    sortBy = CATALOG_SORT_KEYS.indexOf(sortBy) >= 0 ? sortBy : "bodyPart";
    var items = mergeCatalog(state);
    var groups = {};
    items.forEach(function (item) {
      var label = item[sortBy] || "—";
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return Object.keys(groups)
      .sort(function (a, b) {
        return a.localeCompare(b, "fr");
      })
      .map(function (label) {
        return { groupLabel: label, items: groups[label] };
      });
  }

  function findCatalogEntry(state, name) {
    var key = normalizeNameKey(name);
    return mergeCatalog(state).find(function (item) {
      return normalizeNameKey(item.name) === key;
    });
  }

  function addCustomExercise(state, entry) {
    entry = entry || {};
    var name = String(entry.name || "").trim();
    if (!name) return null;
    var existing = findCatalogEntry(state, name);
    if (existing) return existing;
    var item = {
      name: name,
      category: (entry.category && String(entry.category).trim()) || "Personnalisé",
      muscle: (entry.muscle && String(entry.muscle).trim()) || "—",
      bodyPart: (entry.bodyPart && String(entry.bodyPart).trim()) || "—",
      isCustom: true,
    };
    state.customExercises = state.customExercises || [];
    state.customExercises.push(item);
    return item;
  }

  function removeCustomExercise(state, name) {
    var key = normalizeNameKey(name);
    if (!key) return false;
    var before = (state.customExercises || []).length;
    state.customExercises = (state.customExercises || []).filter(function (item) {
      return normalizeNameKey(item.name) !== key;
    });
    return state.customExercises.length < before;
  }

  function stripTitleSuffix(title) {
    return String(title || "")
      .trim()
      .replace(/\s*\(\d+\)\s*$/i, "")
      .trim();
  }

  function uniqueSessionTitle(state, title) {
    title = String(title || "").trim() || "Séance";
    var base = stripTitleSuffix(title) || "Séance";
    var used = {};
    (state.sessions || []).forEach(function (session) {
      used[normalizeNameKey(session.title)] = true;
    });
    var candidate = base;
    var n = 2;
    while (used[normalizeNameKey(candidate)]) {
      candidate = base + " (" + n + ")";
      n++;
    }
    return candidate;
  }

  function expandExerciseSets(ex) {
    ex = normalizeExercise(ex);
    if (ex.setMode === "uniform") {
      var count = Math.max(0, parseNum(ex.setCount) || 0);
      var reps = parseNum(ex.uniformReps);
      var w = parseNum(ex.uniformWeightKg);
      var out = [];
      var i;
      for (i = 0; i < count; i++) {
        out.push({ reps: reps, weightKg: w });
      }
      return out;
    }
    return (ex.sets || []).map(function (set) {
      return {
        reps: parseNum(set.reps),
        weightKg: parseNum(set.weightKg),
      };
    });
  }

  function formatUniformLabel(ex) {
    ex = normalizeExercise(ex);
    if (ex.setMode !== "uniform") return "";
    var count = parseNum(ex.setCount) || 0;
    var reps = parseNum(ex.uniformReps);
    var w = parseNum(ex.uniformWeightKg);
    var parts = [count + " série" + (count !== 1 ? "s" : "")];
    if (reps != null) parts.push(reps + " reps");
    if (w != null) parts.push(w + " kg");
    return parts.join(" · ");
  }

  function metricsFromExercise(ex) {
    var sets = 0;
    var reps = 0;
    var volumeKg = 0;
    expandExerciseSets(ex).forEach(function (set) {
      sets++;
      var r = parseNum(set.reps);
      var w = parseNum(set.weightKg);
      if (r != null) reps += r;
      if (w != null && r != null) volumeKg += w * r;
    });
    return {
      sets: sets,
      reps: reps,
      volumeKg: Math.round(volumeKg * 10) / 10,
    };
  }

  function normalizeMuscleLabel(muscle) {
    muscle = muscle && String(muscle).trim();
    if (!muscle || muscle === "—") return "Muscle non renseigné";
    return muscle;
  }

  function normalizeBodyPartLabel(bodyPart) {
    bodyPart = bodyPart && String(bodyPart).trim();
    if (!bodyPart || bodyPart === "—") return "Partie non renseignée";
    return bodyPart;
  }

  function bumpBucket(map, key, metrics) {
    if (!map[key]) {
      map[key] = { label: key, sets: 0, reps: 0, volumeKg: 0 };
    }
    map[key].sets += metrics.sets;
    map[key].reps += metrics.reps;
    map[key].volumeKg = Math.round((map[key].volumeKg + metrics.volumeKg) * 10) / 10;
  }

  function collectWorkload(sessions) {
    var muscles = {};
    var bodyParts = {};
    var exercises = {};
    (sessions || []).forEach(function (session) {
      (session.exercises || []).forEach(function (ex) {
        var metrics = metricsFromExercise(ex);
        if (!metrics.sets) return;
        bumpBucket(exercises, ex.name || "Exercice", metrics);
        bumpBucket(muscles, normalizeMuscleLabel(ex.muscle), metrics);
        bumpBucket(bodyParts, normalizeBodyPartLabel(ex.bodyPart), metrics);
      });
    });
    return { muscles: muscles, bodyParts: bodyParts, exercises: exercises };
  }

  function toHeatmapRows(bucket, scoreKey) {
    scoreKey = scoreKey || "sets";
    var rows = Object.keys(bucket).map(function (k) {
      return bucket[k];
    });
    var max = 0;
    rows.forEach(function (row) {
      max = Math.max(max, row[scoreKey] || 0);
    });
    return rows
      .sort(function (a, b) {
        return (b[scoreKey] || 0) - (a[scoreKey] || 0);
      })
      .map(function (row) {
        return {
          label: row.label,
          sets: row.sets,
          reps: row.reps,
          volumeKg: row.volumeKg,
          intensity: max > 0 ? (row[scoreKey] || 0) / max : 0,
        };
      });
  }

  function computeWorkloadInsights(sessions) {
    var collected = collectWorkload(sessions);
    var muscleRows = toHeatmapRows(collected.muscles, "sets");
    var bodyRows = toHeatmapRows(collected.bodyParts, "sets");
    var exerciseRows = toHeatmapRows(collected.exercises, "sets");
    return {
      muscles: muscleRows,
      bodyParts: bodyRows,
      topExercises: exerciseRows.slice(0, 5),
      topMuscles: muscleRows.slice(0, 5),
      hasData: muscleRows.some(function (r) {
        return r.sets > 0;
      }),
    };
  }

  function createSession(state, options) {
    options = options || {};
    var now = new Date().toISOString();
    var session = {
      id: genererId("jm_"),
      title: uniqueSessionTitle(state, (options.title && String(options.title).trim()) || "Séance"),
      dateIso: options.dateIso || todayIsoDate(),
      createdAtIso: now,
      updatedAtIso: now,
      notes: "",
      exercises: [],
    };
    state.sessions = state.sessions || [];
    state.sessions.unshift(session);
    return session;
  }

  function touchSession(session) {
    session.updatedAtIso = new Date().toISOString();
  }

  function findSession(state, sessionId) {
    return (state.sessions || []).find(function (s) {
      return s.id === sessionId;
    });
  }

  function deleteSession(state, sessionId) {
    state.sessions = (state.sessions || []).filter(function (s) {
      return s.id !== sessionId;
    });
  }

  function addExercise(session, options) {
    if (typeof options === "string") {
      options = { name: options, setMode: "individual" };
    }
    options = options || {};
    var name = options.name && String(options.name).trim();
    if (!name) return null;
    var ex = {
      id: genererId("jmx_"),
      name: name,
      category: options.category || "",
      muscle: options.muscle || "",
      bodyPart: options.bodyPart || "",
      setMode: options.setMode === "individual" ? "individual" : "uniform",
      setCount: options.setCount != null ? options.setCount : 3,
      uniformReps: options.uniformReps != null ? options.uniformReps : null,
      uniformWeightKg: options.uniformWeightKg != null ? options.uniformWeightKg : null,
      sets: [],
    };
    if (ex.setMode === "individual") {
      ex.setCount = null;
      ex.uniformReps = null;
      ex.uniformWeightKg = null;
      var n = Math.max(1, parseNum(options.initialSets) || 1);
      var i;
      for (i = 0; i < n; i++) addSet(ex);
    } else {
      normalizeExercise(ex);
    }
    session.exercises.push(ex);
    touchSession(session);
    return ex;
  }

  function setExerciseMode(ex, mode) {
    ex.setMode = mode === "individual" ? "individual" : "uniform";
    if (ex.setMode === "uniform") {
      if (ex.sets && ex.sets.length) {
        var first = ex.sets[0];
        if (ex.uniformReps == null) ex.uniformReps = parseNum(first.reps);
        if (ex.uniformWeightKg == null) ex.uniformWeightKg = parseNum(first.weightKg);
        if (!ex.setCount) ex.setCount = ex.sets.length;
      }
      if (!ex.setCount) ex.setCount = 3;
      ex.sets = [];
    } else {
      ex.setCount = null;
      ex.uniformReps = null;
      ex.uniformWeightKg = null;
      if (!ex.sets || !ex.sets.length) addSet(ex);
    }
    normalizeExercise(ex);
    return ex;
  }

  function removeExercise(session, exerciseId) {
    session.exercises = (session.exercises || []).filter(function (e) {
      return e.id !== exerciseId;
    });
    touchSession(session);
  }

  function addSet(exercise) {
    var set = {
      id: genererId("jms_"),
      reps: null,
      weightKg: null,
    };
    exercise.sets = exercise.sets || [];
    exercise.sets.push(set);
    return set;
  }

  function removeSet(exercise, setId) {
    exercise.sets = (exercise.sets || []).filter(function (s) {
      return s.id !== setId;
    });
  }

  function computeSessionSummary(session) {
    var exerciseCount = (session.exercises || []).length;
    var setCount = 0;
    var repCount = 0;
    var volumeKg = 0;
    var hasWeight = false;

    (session.exercises || []).forEach(function (ex) {
      expandExerciseSets(ex).forEach(function (set) {
        setCount++;
        var reps = parseNum(set.reps);
        var w = parseNum(set.weightKg);
        if (reps != null) repCount += reps;
        if (w != null && reps != null) {
          hasWeight = true;
          volumeKg += w * reps;
        }
      });
    });

    return {
      exerciseCount: exerciseCount,
      setCount: setCount,
      repCount: repCount,
      volumeKg: Math.round(volumeKg * 10) / 10,
      hasWeight: hasWeight,
    };
  }

  function computeGlobalSummary(sessions) {
    var list = sessions || [];
    var totalSessions = list.length;
    var totalExercises = 0;
    var totalSets = 0;
    var totalVolume = 0;
    var lastDate = null;

    list.forEach(function (session) {
      var s = computeSessionSummary(session);
      totalExercises += s.exerciseCount;
      totalSets += s.setCount;
      totalVolume += s.volumeKg;
      if (session.dateIso && (!lastDate || session.dateIso > lastDate)) {
        lastDate = session.dateIso;
      }
    });

    return {
      totalSessions: totalSessions,
      totalExercises: totalExercises,
      totalSets: totalSets,
      totalVolumeKg: Math.round(totalVolume * 10) / 10,
      lastDateIso: lastDate,
    };
  }

  function formatDateFr(isoDate) {
    if (!isoDate) return "—";
    try {
      return new Date(isoDate + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return isoDate;
    }
  }

  function serializeExerciseForExport(ex) {
    ex = normalizeExercise(ex);
    var expanded = expandExerciseSets(ex);
    return {
      id: ex.id,
      name: ex.name,
      category: ex.category || "",
      muscle: ex.muscle || "",
      bodyPart: ex.bodyPart || "",
      setMode: ex.setMode,
      setCount: ex.setMode === "uniform" ? parseNum(ex.setCount) : null,
      uniformReps: ex.setMode === "uniform" ? parseNum(ex.uniformReps) : null,
      uniformWeightKg: ex.setMode === "uniform" ? parseNum(ex.uniformWeightKg) : null,
      setsLabel: ex.setMode === "uniform" ? formatUniformLabel(ex) : "",
      sets: expanded,
    };
  }

  /** Décode une ligne compacte (ex. 3×10@50kg ou 8@60;10@50). */
  function parseSetsCompactLabel(label) {
    var raw = String(label || "").trim();
    if (!raw) return { setCount: 0, repCount: 0, volumeKg: 0 };

    var uniform = raw.match(/^(\d+)[×x](\d+)(?:@([\d.]+)kg)?$/i);
    if (uniform) {
      var n = parseInt(uniform[1], 10);
      var r = parseInt(uniform[2], 10);
      var w = uniform[3] != null ? parseFloat(uniform[3]) : 0;
      return {
        setCount: n,
        repCount: n * r,
        volumeKg: w ? Math.round(n * r * w) : 0,
      };
    }

    var setCount = 0;
    var repCount = 0;
    var volumeKg = 0;
    raw.split(";").forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var m = part.match(/^(\d+)(?:@([\d.]+)(?:kg)?)?$/i);
      if (!m) return;
      setCount += 1;
      var reps = parseInt(m[1], 10);
      repCount += reps;
      if (m[2] != null) volumeKg += reps * parseFloat(m[2]);
    });
    return {
      setCount: setCount,
      repCount: repCount,
      volumeKg: volumeKg ? Math.round(volumeKg) : 0,
    };
  }

  function formatSetsCompact(ex) {
    ex = normalizeExercise(ex);
    if (ex.setMode === "uniform") {
      var n = parseNum(ex.setCount);
      var r = parseNum(ex.uniformReps);
      var w = parseNum(ex.uniformWeightKg);
      if (n == null && r == null && w == null) return "";
      return (n != null ? n : "?") + "×" + (r != null ? r : "?") + (w != null ? "@" + w + "kg" : "");
    }
    return expandExerciseSets(ex)
      .map(function (set) {
        var reps = parseNum(set.reps);
        var w = parseNum(set.weightKg);
        return (reps != null ? reps : "?") + (w != null ? "@" + w : "");
      })
      .join(";");
  }

  /** Payload court pour QR (noms + séries uniquement). */
  function normalizeSessionNotes(notes) {
    return String(notes || "").trim().slice(0, NOTES_MAX_LENGTH);
  }

  function buildSharePayloadCompact(session) {
    if (!session) return { c: 1, t: "", d: "", e: [] };
    var notes = normalizeSessionNotes(session.notes);
    var payload = {
      c: 1,
      t: String(session.title || "").trim().slice(0, 80),
      d: session.dateIso || "",
      e: (session.exercises || []).map(function (ex) {
        return [String(ex.name || "").trim().slice(0, 60), formatSetsCompact(ex)];
      }),
    };
    if (notes) payload.n = notes;
    return payload;
  }

  function isCompactSharePayload(payload) {
    return payload && payload.c === 1 && Array.isArray(payload.e);
  }

  function expandSharePayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    if (!isCompactSharePayload(payload)) {
      return payload.session ? payload.session : payload;
    }
    var exercises = (payload.e || []).map(function (row, i) {
      var setsLabel = row[1] || "";
      var parsed = parseSetsCompactLabel(setsLabel);
      return {
        id: "ex_" + i,
        name: row[0] || "Exercice",
        setsLabel: setsLabel,
        setMode: setsLabel.indexOf(";") >= 0 ? "individual" : "uniform",
        setCount: parsed.setCount || null,
        sets: [],
      };
    });
    var totalSets = 0;
    var totalReps = 0;
    var totalVol = 0;
    exercises.forEach(function (ex) {
      var p = parseSetsCompactLabel(ex.setsLabel);
      totalSets += p.setCount;
      totalReps += p.repCount;
      totalVol += p.volumeKg;
    });
    return {
      id: "",
      title: payload.t || "Séance",
      dateIso: payload.d || "",
      dateLabel: formatDateFr(payload.d),
      notes: normalizeSessionNotes(payload.n || ""),
      exercises: exercises,
      summary: {
        exerciseCount: exercises.length,
        setCount: totalSets || null,
        repCount: totalReps || null,
        volumeKg: totalVol || null,
      },
    };
  }

  function buildSharePayload(session) {
    return buildSharePayloadCompact(session);
  }

  function validateSessionForShare(session) {
    if (!session) return "Séance introuvable.";
    var summary = computeSessionSummary(session);
    if (!summary.exerciseCount) return "Ajoutez au moins un exercice avant de partager.";
    if (!summary.setCount) return "Ajoutez au moins une série avant de partager.";
    return null;
  }

  function participantLabel(session) {
    if (!session) return "";
    return session.title + " — " + formatDateFr(session.dateIso);
  }

  return {
    TOOL_ID: TOOL_ID,
    STORAGE_KEY: STORAGE_KEY,
    NOTES_MAX_LENGTH: NOTES_MAX_LENGTH,
    CATALOG_SORT_KEYS: CATALOG_SORT_KEYS,
    normalizeSessionNotes: normalizeSessionNotes,
    DEFAULT_CATALOG: DEFAULT_CATALOG,
    loadState: loadState,
    saveState: saveState,
    mergeCatalog: mergeCatalog,
    getCatalogGrouped: getCatalogGrouped,
    findCatalogEntry: findCatalogEntry,
    addCustomExercise: addCustomExercise,
    removeCustomExercise: removeCustomExercise,
    uniqueSessionTitle: uniqueSessionTitle,
    computeWorkloadInsights: computeWorkloadInsights,
    getRmFormula: getRmFormula,
    setRmFormula: setRmFormula,
    getRecordedMax: getRecordedMax,
    setRecordedMax: setRecordedMax,
    deleteRecordedMax: deleteRecordedMax,
    listRecordedMaxes: listRecordedMaxes,
    bestPotentialFromExercise: bestPotentialFromExercise,
    collectRmInsights: collectRmInsights,
    formatPotential1rmLabel: formatPotential1rmLabel,
    createSession: createSession,
    touchSession: touchSession,
    findSession: findSession,
    deleteSession: deleteSession,
    addExercise: addExercise,
    setExerciseMode: setExerciseMode,
    removeExercise: removeExercise,
    addSet: addSet,
    removeSet: removeSet,
    expandExerciseSets: expandExerciseSets,
    formatUniformLabel: formatUniformLabel,
    normalizeExercise: normalizeExercise,
    computeSessionSummary: computeSessionSummary,
    computeGlobalSummary: computeGlobalSummary,
    buildSharePayload: buildSharePayload,
    buildSharePayloadCompact: buildSharePayloadCompact,
    isCompactSharePayload: isCompactSharePayload,
    expandSharePayload: expandSharePayload,
    formatSetsCompact: formatSetsCompact,
    parseSetsCompactLabel: parseSetsCompactLabel,
    validateSessionForShare: validateSessionForShare,
    participantLabel: participantLabel,
    formatDateFr: formatDateFr,
    todayIsoDate: todayIsoDate,
    parseNum: parseNum,
    genererId: genererId,
  };
});
