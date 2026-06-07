"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var Sync = require("../shared/backup-sync-core.js");

describe("backup-sync-core", function () {
  it("fusionne les donnees propres a chaque appareil", function () {
    var a = { classes: [{ id: "c1", nom: "6A" }] };
    var b = { eleves: [{ id: "e1", classeId: "c1", nom: "Durand" }] };
    var merged = Sync.mergeBackups(a, b, {});

    assert.equal(merged.unresolved.length, 0);
    assert.equal(merged.payload.classes.length, 1);
    assert.equal(merged.payload.eleves.length, 1);
    assert.equal(merged.total, 2);
  });

  it("detecte un conflit et applique un choix partage", function () {
    var a = { classes: [{ id: "c1", nom: "6A" }] };
    var b = { classes: [{ id: "c1", nom: "6B" }] };
    var compare = Sync.compareBackups(a, b);

    assert.equal(compare.summary.conflicts, 1);

    var merged = Sync.mergeBackups(a, b, { "classes|c1": "b" });
    assert.equal(merged.unresolved.length, 0);
    assert.equal(merged.payload.classes[0].nom, "6B");
  });

  it("peut garder deux copies avec un identifiant deterministe", function () {
    var a = { classes: [{ id: "c1", nom: "6A" }] };
    var b = { classes: [{ id: "c1", nom: "6B" }] };
    var m1 = Sync.mergeBackups(a, b, { "classes|c1": "both" });
    var m2 = Sync.mergeBackups(a, b, { "classes|c1": "both" });

    assert.equal(m1.payload.classes.length, 2);
    assert.equal(m1.payload.classes[1].id, m2.payload.classes[1].id);
    assert.notEqual(m1.payload.classes[1].id, "c1");
  });

  it("fusionne automatiquement les colonnes d une feuille appel et notes de meme id", function () {
    var feuilleA = {
      id: "tab1",
      titre: "Appel 6A",
      classeId: "c1",
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-02T10:00:00.000Z",
      rows: [{ id: "r1", label: "Durand", meta: { eleveId: "e1" } }],
      cols: [
        { id: "col-note-1", label: "Note 1", type: "number", estNote: true, max: 20 },
        { id: "col-note-2", label: "Note 2", type: "number", estNote: true, max: 20 },
      ],
      cells: {
        "r1:col-note-1": 12,
        "r1:col-note-2": 15,
      },
    };
    var feuilleB = {
      id: "tab1",
      titre: "Appel 6A",
      classeId: "c1",
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-03T10:00:00.000Z",
      rows: [{ id: "r1", label: "Durand", meta: { eleveId: "e1" } }],
      cols: [
        { id: "col-appel-1", label: "Seance 1", type: "check" },
        { id: "col-appel-2", label: "Seance 2", type: "check" },
        { id: "col-appel-3", label: "Seance 3", type: "check" },
      ],
      cells: {
        "r1:col-appel-1": true,
        "r1:col-appel-2": false,
        "r1:col-appel-3": true,
      },
    };

    var compare = Sync.compareBackups(
      { tableauxSuivi: [feuilleA] },
      { tableauxSuivi: [feuilleB] }
    );
    assert.equal(compare.summary.conflicts, 0);

    var merged = Sync.mergeBackups({ tableauxSuivi: [feuilleA] }, { tableauxSuivi: [feuilleB] }, {});
    assert.equal(merged.unresolved.length, 0);
    assert.equal(merged.payload.tableauxSuivi.length, 1);
    assert.equal(merged.payload.tableauxSuivi[0].id, "tab1");
    assert.equal(merged.payload.tableauxSuivi[0].cols.length, 5);
    assert.equal(merged.payload.tableauxSuivi[0].cells["r1:col-note-1"], 12);
    assert.equal(merged.payload.tableauxSuivi[0].cells["r1:col-note-2"], 15);
    assert.equal(merged.payload.tableauxSuivi[0].cells["r1:col-appel-1"], true);
    assert.equal(merged.payload.tableauxSuivi[0].cells["r1:col-appel-2"], false);
    assert.equal(merged.payload.tableauxSuivi[0].cells["r1:col-appel-3"], true);
  });
});
