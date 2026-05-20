"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var Qr = require("../shared/qr-exchange-core.js");

/**
 * Non-régression minimale : payload PTB typique → QR → import stockable.
 */
describe("compteur-ptb QR (non-régression)", function () {
  it("roundtrip PTB avec stats et noms d'équipes", function () {
    var payload = {
      mode: "down",
      finished: true,
      teams: {
        a: {
          name: "Bleus",
          color: "#2563eb",
          goals: 3,
          shots: 8,
          losses: 2,
          efficiency: 38,
          possessionLabel: "04:12 (52%)",
        },
        b: {
          name: "Rouges",
          color: "#dc2626",
          goals: 2,
          shots: 6,
          losses: 3,
          efficiency: 33,
          possessionLabel: "03:50 (48%)",
        },
      },
    };

    var record = Qr.buildExportRecord("compteur-ptb", payload, {
      groupeLabel: "Terrain 2",
    });
    var url = Qr.encodeRecord(record);
    var parsed = Qr.parseQrUrl(url);
    assert.equal(parsed.error, undefined);

    var IRC = require("../shared/import-record-core.js");
    var stored = IRC.buildStoredImport(parsed.record, function () {
      return "import_ptb_1";
    });
    assert.equal(stored.item.toolId, "compteur-ptb");
    assert.equal(stored.item.payload.teams.a.name, "Bleus");
    assert.equal(stored.item.payload.teams.b.goals, 2);
    assert.equal(stored.item.groupeLabel, "Terrain 2");
  });
});
