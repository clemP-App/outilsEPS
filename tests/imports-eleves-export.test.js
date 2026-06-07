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

  it("résume un import Relais avec note transmission", function () {
    var relais = {
      id: "imp-relais",
      toolId: "relais-eleve",
      classeLabel: "6e B",
      auteurLabel: "Binôme GG",
      createdAt: "2026-06-01T10:00:00.000Z",
      importedAt: "2026-06-01T11:00:00.000Z",
      payload: {
        label: "Binôme GG",
        temps: { total: "12.50 sec", z1: "4.00 sec", zt: "5.00 sec", z2: "3.50 sec" },
        vitesses: { z1: 18, zt: 14.4, z2: 20.6 },
        efficaciteZT: { note10: 6.7, itIdeal: 33.3, itReel: 40, verdict: "Transmission correcte" },
      },
    };
    assert.match(Exp.humanSummary(relais), /12\.50 sec/);
    assert.match(Exp.humanSummary(relais), /6,7\/10/);
    var model = Exp.buildTableModel("relais-eleve", [relais]);
    assert.ok(model.headers.indexOf("Note transmission (/10)") >= 0);
    assert.equal(model.rows[0].cells[model.headers.length - 1], "6.7");
  });
});
