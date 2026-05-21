"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var Debrief = require("../shared/questions-debrief-core.js");
var Qr = require("../shared/qr-exchange-core.js");

describe("questions-debrief-core", function () {
  it("expose 5 questions par portée", function () {
    assert.equal(Debrief.questionsForPortee("individuel").length, 5);
    assert.equal(Debrief.questionsForPortee("equipe").length, 5);
  });

  it("exporte uniquement les réponses", function () {
    var seance = {
      title: "Hand 20 mai",
      dateIso: "2026-05-20",
      portee: "individuel",
      items: Debrief.buildItemsForPortee("individuel").map(function (q, i) {
        q.reponse = "Réponse " + (i + 1);
        return q;
      }),
    };
    var payload = Debrief.buildCompactSharePayload(seance);
    assert.equal(payload.c, 1);
    assert.equal(payload.a.length, 5);
    assert.equal(payload.a[0], "Réponse 1");
    assert.equal(payload.question, undefined);
  });

  it("réexpand les réponses pour le prof", function () {
    var expanded = Debrief.expandPayload({
      c: 1,
      p: "e",
      t: "Volley",
      d: "2026-05-21",
      a: ["", "Bien", "", "", "Objectif"],
    });
    assert.equal(expanded.reponses.length, 5);
    assert.ok(expanded.reponses[0].question.length > 10);
    assert.equal(expanded.reponses[1].reponse, "Bien");
  });

  it("produit un QR court", function () {
    var payload = Debrief.buildCompactSharePayload({
      title: "EPS",
      dateIso: "2026-05-20",
      portee: "individuel",
      items: Debrief.buildItemsForPortee("individuel").map(function (q) {
        q.reponse = "ok";
        return q;
      }),
    });
    var url = Qr.encodeRecord(Qr.buildExportRecord("questions-debrief", payload));
    assert.ok(url.length < 700, "taille URL : " + url.length);
  });
});
