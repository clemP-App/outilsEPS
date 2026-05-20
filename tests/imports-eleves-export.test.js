"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var Exp = require("../shared/imports-eleves-export.js");

describe("imports-eleves-export", function () {
  var sample = {
    id: "imp1",
    toolId: "compteur-bonus",
    classeLabel: "3e A",
    auteurLabel: "Léa / Tom",
    createdAt: "2026-05-20T10:00:00.000Z",
    importedAt: "2026-05-20T11:00:00.000Z",
    payload: {
      players: {
        A: { name: "Léa", score: 5, counts: { bonus: 1, normal: 2, malus: 0 } },
        B: { name: "Tom", score: 3, counts: { bonus: 0, normal: 1, malus: 1 } },
      },
    },
  };

  it("résume un import en une phrase lisible", function () {
    assert.match(Exp.humanSummary(sample), /Léa.*5.*Tom.*3/);
  });

  it("construit un modèle tableau pour un outil", function () {
    var model = Exp.buildTableModel("compteur-bonus", [sample]);
    assert.ok(model.headers.indexOf("Points A") >= 0);
    assert.equal(model.rows.length, 1);
    assert.equal(model.rows[0].id, "imp1");
    assert.ok(model.rows[0].cells.some(function (c) { return String(c) === "5"; }));
  });

  it("génère un CSV aligné sur le tableau", function () {
    var csv = Exp.buildCsv("compteur-bonus", [sample]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.match(csv, /Joueur A;Points A/);
    assert.match(csv, /3e A/);
    assert.doesNotMatch(csv, /Indicateur;Valeur/);
  });

  it("PDF : entrées avec résumé", function () {
    var pdf = Exp.buildPdf([sample]);
    assert.equal(pdf.length, 1);
    assert.ok(pdf[0].summary);
  });
});
