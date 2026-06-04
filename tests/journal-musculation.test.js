"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var JM = require("../shared/journal-musculation-core.js");
var Body = require("../shared/journal-musculation-body.js");
var Rm = require("../shared/rm-formulas.js");
var Qr = require("../shared/qr-exchange-core.js");

describe("journal-musculation-core", function () {
  it("crée une séance et calcule le volume (série par série)", function () {
    var state = { sessions: [] };
    var session = JM.createSession(state, { title: "Push", dateIso: "2026-05-20" });
    var ex = JM.addExercise(session, "Développé couché");
    var set = ex.sets[0];
    set.reps = 10;
    set.weightKg = 50;
    var summary = JM.computeSessionSummary(session);
    assert.equal(summary.exerciseCount, 1);
    assert.equal(summary.setCount, 1);
    assert.equal(summary.volumeKg, 500);
  });

  it("calcule le volume avec séries identiques", function () {
    var state = { sessions: [] };
    var session = JM.createSession(state, {});
    var ex = JM.addExercise(session, {
      name: "Squat",
      setMode: "uniform",
      setCount: 4,
      uniformReps: 10,
      uniformWeightKg: 50,
    });
    var summary = JM.computeSessionSummary(session);
    assert.equal(ex.setMode, "uniform");
    assert.equal(summary.setCount, 4);
    assert.equal(summary.volumeKg, 2000);
    assert.equal(JM.expandExerciseSets(ex).length, 4);
  });

  it("groupe le catalogue par muscle", function () {
    var state = { sessions: [], customExercises: [] };
    var groups = JM.getCatalogGrouped(state, "muscle");
    assert.ok(groups.length > 0);
    assert.ok(groups.some(function (g) {
      return g.items.some(function (item) {
        return item.name === "Squat";
      });
    }));
  });

  it("charge les séances même si une entrée est corrompue", function () {
    var storage = {
      _data: {},
      getItem: function (k) {
        return this._data[k] || null;
      },
      setItem: function (k, v) {
        this._data[k] = v;
      },
    };
    storage.setItem(
      JM.STORAGE_KEY,
      JSON.stringify({
        sessions: [
          { id: "jm_ok", title: "Push", dateIso: "2026-05-20", exercises: [] },
          null,
          { id: "jm_bad", title: "Pull", exercises: [null] },
        ],
      })
    );
    var loaded = JM.loadState(storage);
    assert.equal(loaded.sessions.length, 3);
    assert.equal(loaded.sessions[0].title, "Push");
  });

  it("déduplique les noms de séance avec (2)", function () {
    var state = { sessions: [], customExercises: [] };
    JM.createSession(state, { title: "Push" });
    var second = JM.createSession(state, { title: "Push" });
    assert.equal(second.title, "Push (2)");
    assert.equal(JM.uniqueSessionTitle(state, "Push"), "Push (3)");
  });

  it("supprime un exercice personnalisé du catalogue", function () {
    var state = { sessions: [], customExercises: [] };
    JM.addCustomExercise(state, { name: "Mon exo" });
    assert.ok(JM.removeCustomExercise(state, "Mon exo"));
    assert.equal(JM.findCatalogEntry(state, "Mon exo"), undefined);
  });

  it("calcule la carte des muscles", function () {
    var state = { sessions: [] };
    var session = JM.createSession(state, {});
    JM.addExercise(session, {
      name: "Squat",
      muscle: "Quadriceps",
      bodyPart: "Jambes",
      setMode: "uniform",
      setCount: 4,
      uniformReps: 10,
      uniformWeightKg: 50,
    });
    var insights = JM.computeWorkloadInsights(state.sessions);
    assert.ok(insights.hasData);
    assert.equal(insights.topMuscles[0].label, "Quadriceps");
    assert.equal(insights.topMuscles[0].sets, 4);
    assert.ok(insights.muscles[0].intensity > 0);
  });

  it("ajoute un exercice personnalisé au catalogue", function () {
    var state = { sessions: [], customExercises: [] };
    var item = JM.addCustomExercise(state, {
      name: "Mon exo",
      muscle: "Biceps",
      bodyPart: "Bras",
    });
    assert.equal(item.name, "Mon exo");
    assert.equal(JM.findCatalogEntry(state, "Mon exo").isCustom, true);
  });

  it("refuse le partage sans série", function () {
    var state = { sessions: [] };
    var session = JM.createSession(state, {});
    JM.addExercise(session, { name: "Squat", setMode: "uniform", setCount: 0 });
    assert.match(JM.validateSessionForShare(session), /série/i);
  });

  it("exporte une seule séance dans le payload QR", function () {
    var state = { sessions: [] };
    var session = JM.createSession(state, { title: "Legs" });
    var ex = JM.addExercise(session, {
      name: "Squat",
      setMode: "uniform",
      setCount: 2,
      uniformReps: 5,
      uniformWeightKg: 80,
    });
    ex.rpes = [7, 8];
    var payload = JM.buildSharePayload(session);
    assert.equal(payload.c, 1);
    assert.equal(payload.t, "Legs");
    assert.equal(payload.e[0][0], "Squat");
    assert.match(payload.e[0][1], /2×5@80/);
    assert.equal(payload.e[0][2], "7;8");
    var expanded = JM.expandSharePayload(payload);
    assert.equal(expanded.title, "Legs");
    assert.equal(expanded.exercises[0].name, "Squat");
    assert.match(expanded.exercises[0].setsLabel, /2×5@80/);
    assert.deepEqual(expanded.exercises[0].rpes, [7, 8]);
    assert.match(expanded.exercises[0].rpeLabel, /S1 RPE 7/);
  });

  it("normalise le RPE entre 5 et 10", function () {
    assert.equal(JM.normalizeRpe("7"), 7);
    assert.equal(JM.normalizeRpe(10), 10);
    assert.equal(JM.normalizeRpe(4), null);
    assert.match(JM.formatRpeLabel(9), /Tr\u00e8s difficile/);
  });

  it("compresse les RPE identiques dans le QR", function () {
    var state = { sessions: [] };
    var session = JM.createSession(state, { title: "Push" });
    var ex = JM.addExercise(session, {
      name: "Developpe couche",
      setMode: "uniform",
      setCount: 3,
      uniformReps: 10,
      uniformWeightKg: 50,
    });
    ex.rpes = [8, 8, 8];
    var payload = JM.buildSharePayload(session);
    assert.equal(payload.e[0][2], "8");
    var expanded = JM.expandSharePayload(payload);
    assert.deepEqual(expanded.exercises[0].rpes, [8, 8, 8]);
    assert.deepEqual(expanded.exercises[0].sets.map(function (set) { return set.rpe; }), [8, 8, 8]);
  });
});

describe("rm-formulas", function () {
  it("estime 1RM Epley", function () {
    var est = Rm.estimate1rm(50, 10, "epley");
    assert.ok(est > 65 && est < 70);
  });

  it("refuse reps trop élevées pour Brzycki", function () {
    assert.equal(Rm.estimate1rm(50, 36, "brzycki"), null);
  });
});

describe("journal-musculation 1RM", function () {
  it("enregistre et lit un max testé", function () {
    var state = { sessions: [], customExercises: [], max1rmByExercise: {}, rmFormula: "epley" };
    JM.setRecordedMax(state, "Squat", 120);
    assert.equal(JM.getRecordedMax(state, "Squat").weightKg, 120);
  });

  it("calcule un 1RM potentiel depuis une séance", function () {
    var state = { sessions: [], customExercises: [], max1rmByExercise: {}, rmFormula: "epley" };
    var session = JM.createSession(state, {});
    var ex = JM.addExercise(session, {
      name: "Développé couché",
      setMode: "uniform",
      setCount: 1,
      uniformReps: 10,
      uniformWeightKg: 50,
    });
    var pot = JM.bestPotentialFromExercise(ex, "epley");
    assert.ok(pot.estimatedKg > 65);
    var insights = JM.collectRmInsights(state);
    assert.equal(insights.rows.length, 1);
    assert.match(JM.formatPotential1rmLabel(pot, "epley"), /potentiel/i);
  });
});

describe("journal-musculation-body", function () {
  it("colore les cuisses pour les quadriceps", function () {
    var map = Body.regionIntensitiesFromMuscles([
      { label: "Quadriceps", sets: 12, intensity: 1 },
    ]);
    assert.equal(map["quads-l"], 1);
    assert.equal(map["quads-r"], 1);
    assert.equal(map["chest"], 0);
  });

  it("répartit la chaîne postérieure sur plusieurs zones", function () {
    var map = Body.regionIntensitiesFromMuscles([
      { label: "Chaîne postérieure", sets: 5, intensity: 0.8 },
    ]);
    assert.ok(map["lower-back"] > 0);
    assert.ok(map["glutes"] > 0);
    assert.ok(map["hams-l"] > 0);
  });
});

describe("journal-musculation QR", function () {
  it("tronque les notes pour l'export QR", function () {
    var long = "x".repeat(200);
    var payload = JM.buildSharePayload({
      title: "Push",
      dateIso: "2026-05-20",
      notes: long,
      exercises: [],
    });
    assert.equal(payload.n.length, JM.NOTES_MAX_LENGTH);
    assert.equal(JM.normalizeSessionNotes(long).length, JM.NOTES_MAX_LENGTH);
  });

  it("calcule le résumé depuis le payload compact", function () {
    var session = JM.expandSharePayload({
      c: 1,
      t: "Push",
      d: "2026-05-20",
      e: [
        ["Squat", "3×10@50kg"],
        ["Curl", "8@20;10@22"],
      ],
    });
    assert.equal(session.summary.exerciseCount, 2);
    assert.equal(session.summary.setCount, 5);
    assert.equal(session.summary.repCount, 48);
    assert.equal(session.summary.volumeKg, 1880);
  });

  it("roundtrip encode / decode", function () {
    var payload = JM.buildSharePayload({
      id: "jm_test",
      title: "Séance test",
      dateIso: "2026-05-20",
      notes: "Bien",
      exercises: [
        {
          id: "e1",
          name: "Traction",
          setMode: "uniform",
          setCount: 3,
          uniformReps: 8,
          uniformWeightKg: 0,
          sets: [
            { reps: 8, weightKg: 0 },
            { reps: 8, weightKg: 0 },
            { reps: 8, weightKg: 0 },
          ],
        },
      ],
    });
    var record = Qr.buildExportRecord(JM.TOOL_ID, payload);
    var parsed = Qr.parseQrUrl(Qr.encodeRecord(record));
    assert.equal(parsed.error, undefined);
    assert.equal(parsed.record.toolId, JM.TOOL_ID);
    assert.equal(parsed.record.payload.e[0][0], "Traction");
    var back = JM.expandSharePayload(parsed.record.payload);
    assert.equal(back.exercises[0].name, "Traction");
  });
});
