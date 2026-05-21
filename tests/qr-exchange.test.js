"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var Qr = require("../shared/qr-exchange-core.js");

describe("qr-exchange-core", function () {
  it("calcule un checksum stable", function () {
    var body = {
      v: 1,
      toolId: "compteur-ptb",
      exportId: "test-id",
      createdAt: "2026-05-20T10:00:00.000Z",
      payload: { teams: { a: { name: "Bleus" } } },
    };
    var c1 = Qr.checksumForBody(body);
    var c2 = Qr.checksumForBody(body);
    assert.equal(c1, c2);
    assert.match(c1, /^[0-9a-f]+$/);
  });

  it("encode et decode un enregistrement PTB", function () {
    var record = Qr.buildExportRecord("compteur-ptb", {
      teams: {
        a: { name: "Bleus", goals: 2, shots: 5, losses: 1 },
        b: { name: "Rouges", goals: 1, shots: 3, losses: 2 },
      },
      finished: true,
    }, {
      classeLabel: "6eA",
      auteurLabel: "Binôme 1",
    });
    var url = Qr.encodeRecord(record);
    assert.ok(url.indexOf("outilseps://qr?v=1&d=") === 0);
    var parsed = Qr.parseQrUrl(url);
    assert.equal(parsed.error, undefined);
    assert.equal(parsed.record.exportId, record.exportId);
    assert.equal(parsed.record.toolId, "compteur-ptb");
    assert.equal(parsed.record.classeLabel, "6eA");
    assert.equal(parsed.record.payload.teams.a.goals, 2);
  });

  it("rejette un checksum invalide", function () {
    var record = Qr.buildExportRecord("table-marque", {
      teams: { left: { name: "A", score: 1 }, right: { name: "B", score: 0 } },
    });
    record.checksum = "deadbeef";
    var err = Qr.validateExportRecord(record);
    assert.ok(err && err.indexOf("Checksum") >= 0);
  });

  it("encode un compteur ratio", function () {
    var record = Qr.buildExportRecord("compteur-ratio", {
      students: {
        a: { name: "Bleus", plus: 5, minus: 2, total: 7, ratio: 71 },
        b: { name: "Rouges", plus: 3, minus: 4, total: 7, ratio: 43 },
      },
    });
    var parsed = Qr.parseQrUrl(Qr.encodeRecord(record));
    assert.equal(parsed.record.toolId, "compteur-ratio");
    assert.equal(parsed.record.payload.students.a.ratio, 71);
  });

  it("encode des réponses questions débrief", function () {
    var record = Qr.buildExportRecord(
      "questions-debrief",
      {
        portee: "individuel",
        porteeLabel: "Bilan individuel",
        titre: "Fiche bilan individuel",
        reponses: [
          {
            theme: "Bilan personnel",
            question: "Comment vous êtes-vous senti(e) ?",
            reponse: "Bien, un peu fatigué à la fin.",
          },
        ],
      },
      { classeLabel: "3eB", auteurLabel: "Léa M." }
    );
    var parsed = Qr.parseQrUrl(Qr.encodeRecord(record));
    assert.equal(parsed.record.toolId, "questions-debrief");
    assert.equal(parsed.record.payload.reponses[0].reponse, "Bien, un peu fatigué à la fin.");
  });

  it("rejette un outil inconnu", function () {
    assert.throws(function () {
      Qr.buildExportRecord("outil-inconnu", {});
    }, /non pris en charge/);
  });
});
