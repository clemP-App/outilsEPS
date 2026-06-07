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
});
