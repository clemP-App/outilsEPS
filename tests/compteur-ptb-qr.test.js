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
      timer: {
        mode: "down",
        durationLabel: "08:00",
        displayLabel: "00:00",
        statusLabel: "Fin du match",
      },
      teams: {
        a: {
          name: "Bleus",
          color: "#2563eb",
          goals: 3,
          shots: 8,
          losses: 2,
          possessions: 10,
          efficiency: 38,
          shotsPerPossession: 80,
          lossesPerPossession: 20,
          possessionMs: 252000,
          possessionLabel: "04:12 (52%)",
        },
        b: {
          name: "Rouges",
          color: "#dc2626",
          goals: 2,
          shots: 6,
          losses: 3,
          possessions: 9,
          efficiency: 33,
          shotsPerPossession: 67,
          lossesPerPossession: 33,
          possessionMs: 230000,
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
    assert.equal(stored.item.payload.teams.a.possessions, 10);
    assert.equal(stored.item.payload.teams.a.possessionMs, 252000);
    assert.equal(stored.item.payload.timer.displayLabel, "00:00");
    assert.equal(stored.item.groupeLabel, "Terrain 2");
  });
});
