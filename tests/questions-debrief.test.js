"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var Debrief = require("../shared/questions-debrief-core.js");
var Qr = require("../shared/qr-exchange-core.js");

describe("questions-debrief-core", function () {
  it("expose 7 questions par portée (4 échelle + 3 texte)", function () {
    assert.equal(Debrief.questionsForPortee("individuel").length, 7);
    assert.equal(Debrief.questionsForPortee("equipe").length, 7);
    assert.equal(Debrief.questionsEchelle("individuel").length, 4);
  });

  it("détecte le type échelle sur les items construits", function () {
    var items = Debrief.buildItemsForPortee("individuel");
    assert.equal(Debrief.itemIsEchelle(items[0], "individuel"), true);
    assert.equal(Debrief.itemIsTexte(items[0], "individuel"), false);
    assert.equal(Debrief.itemIsEchelle(items[4], "individuel"), false);
    assert.equal(Debrief.itemIsTexte(items[4], "individuel"), true);
  });

  it("exporte notes et textes", function () {
    var items = Debrief.buildItemsForPortee("individuel");
    items[0].reponse = "4";
    items[1].reponse = "3";
    items[2].reponse = "5";
    items[3].reponse = "2";
    items[4].reponse = "Fatigue en fin de séance";
    var payload = Debrief.buildCompactSharePayload({
      title: "Hand 20 mai",
      dateIso: "2026-05-20",
      portee: "individuel",
      items: items,
    });
    assert.equal(payload.a.length, 7);
    assert.equal(payload.a[0], "4");
    assert.equal(payload.a[4], "Fatigue en fin de séance");
  });

  it("réexpand les réponses pour le prof", function () {
    var expanded = Debrief.expandPayload({
      c: 1,
      p: "e",
      t: "Volley",
      d: "2026-05-21",
      a: ["3", "4", "5", "2", "", "Bien collectif", ""],
    });
    assert.equal(expanded.reponses.length, 7);
    assert.equal(expanded.reponses[0].reponse, "3");
    assert.equal(Debrief.formatReponseLabel("3", expanded.reponses[0]), "3 / 5");
    assert.equal(expanded.reponses[5].reponse, "Bien collectif");
  });

  it("tronque le texte à 120 caractères", function () {
    var q = Debrief.questionsForPortee("individuel").find(function (x) {
      return x.type === "texte";
    });
    var long = "x".repeat(150);
    assert.equal(Debrief.normalizeReponse(long, q).length, 120);
  });

  it("exige les 4 notes pour partager (texte optionnel)", function () {
    var items = Debrief.buildItemsForPortee("individuel");
    items[0].reponse = "5";
    assert.equal(Debrief.seancePretPourPartage({ portee: "individuel", items: items }), false);
    items[0].reponse = "5";
    items[1].reponse = "4";
    items[2].reponse = "3";
    items[3].reponse = "2";
    assert.equal(Debrief.seancePretPourPartage({ portee: "individuel", items: items }), true);
    items[4].reponse = "";
    assert.equal(Debrief.seancePretPourPartage({ portee: "individuel", items: items }), true);
  });

  it("produit un QR court", function () {
    var items = Debrief.buildItemsForPortee("individuel");
    items.forEach(function (it, i) {
      it.reponse = i < 4 ? String(i + 1) : "";
    });
    var payload = Debrief.buildCompactSharePayload({
      title: "EPS",
      dateIso: "2026-05-20",
      portee: "individuel",
      items: items,
    });
    var url = Qr.encodeRecord(Qr.buildExportRecord("questions-debrief", payload));
    assert.ok(url.length < 700, "taille URL : " + url.length);
  });
});
