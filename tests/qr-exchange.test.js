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

  it("encode des réponses questions débrief (compact)", function () {
    var record = Qr.buildExportRecord(
      "questions-debrief",
      {
        c: 1,
        p: "i",
        t: "Basket",
        d: "2026-05-20",
        a: ["Bien", "", "Fatigue", "Passes", "Objectif demain"],
      },
      { classeLabel: "3eB", auteurLabel: "Léa M." }
    );
    var parsed = Qr.parseQrUrl(Qr.encodeRecord(record));
    assert.equal(parsed.record.toolId, "questions-debrief");
    assert.equal(parsed.record.payload.a[0], "Bien");
    assert.ok(record.exportId.length < 80);
  });

  it("encode une séance musculation compacte", function () {
    var JM = require("../shared/journal-musculation-core.js");
    var session = {
      title: "Push",
      dateIso: "2026-05-20",
      notes: "",
      exercises: [
        {
          name: "Développé couché",
          setMode: "uniform",
          setCount: 4,
          uniformReps: 8,
          uniformWeightKg: 60,
        },
      ],
    };
    var payload = JM.buildSharePayloadCompact(session);
    var record = Qr.buildExportRecord("journal-musculation", payload, {
      auteurLabel: "Léa",
    });
    var url = Qr.encodeRecord(record);
    assert.ok(url.length < 900, "URL compacte : " + url.length);
    var parsed = Qr.parseQrUrl(url);
    assert.equal(parsed.record.payload.e[0][0], "Développé couché");
  });

  it("rejette un outil inconnu", function () {
    assert.throws(function () {
      Qr.buildExportRecord("outil-inconnu", {});
    }, /non pris en charge/);
  });
});
