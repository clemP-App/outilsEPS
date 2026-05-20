"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var IRC = require("../shared/import-record-core.js");
var Qr = require("../shared/qr-exchange-core.js");

describe("imports-eleves (import-record-core)", function () {
  it("construit un enregistrement stocké depuis un export QR", function () {
    var exportRec = Qr.buildExportRecord(
      "compteur-bonus",
      { players: { A: { name: "Léa", score: 5 }, B: { name: "Tom", score: 3 } } },
      { exportId: "exp_test_1" }
    );
    var built = IRC.buildStoredImport(exportRec, function () {
      return "import_fixed";
    });
    assert.equal(built.error, undefined);
    assert.equal(built.item.id, "import_fixed");
    assert.equal(built.item.exportId, "exp_test_1");
    assert.equal(built.item.toolId, "compteur-bonus");
    assert.equal(built.item.payload.players.A.score, 5);
  });

  it("filtre par outil et trie par date", function () {
    var items = [
      {
        id: "1",
        toolId: "compteur-ptb",
        exportId: "a",
        importedAt: "2026-05-19T12:00:00.000Z",
        createdAt: "2026-05-19T11:00:00.000Z",
        payload: {},
      },
      {
        id: "2",
        toolId: "table-marque",
        exportId: "b",
        importedAt: "2026-05-20T12:00:00.000Z",
        createdAt: "2026-05-20T11:00:00.000Z",
        payload: {},
      },
    ];
    var ptb = items.filter(function (r) {
      return IRC.matchesFilters(r, { toolId: "compteur-ptb" });
    });
    assert.equal(ptb.length, 1);
    var sorted = IRC.sortImportsNewestFirst(items);
    assert.equal(sorted[0].id, "2");
  });

  it("refuse un import sans exportId", function () {
    var built = IRC.buildStoredImport({ toolId: "x", payload: {} });
    assert.ok(built.error);
  });
});
