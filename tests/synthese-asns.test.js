"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function loadScript(relativePath) {
  vm.runInThisContext(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
    { filename: relativePath }
  );
}

loadScript("shared/validation-asns-core.js");
loadScript("shared/synthese-asns.js");

test("ASNS absent si aucune validation commencée", function () {
  var asnsData = {
    classes: [{ id: "ac1", nom: "6eA" }],
    eleves: [
      {
        id: "ae1",
        classeId: "ac1",
        nom: "Andre",
        prenom: "Clara",
        statut: "non_commence",
        etapes: {},
      },
    ],
  };
  var eleve = { id: "e1", nom: "Andre", prenom: "Clara", classeId: "c1" };
  var summary = SyntheseAsns.resolveForEleve(
    { asnsData: asnsData, parametres: [] },
    eleve,
    "6eA"
  );
  assert.equal(summary, null);
});

test("migration grille ASSN 2015 vers ASNS 2022/2025", function () {
  var migrated = ValidationAsnsCore.migrerEtapesV2({
    p1: "valide",
    p4: "valide",
    p5: "a_revoir",
    p6: "valide",
    p10: "valide",
    k1: "valide",
  });
  assert.equal(migrated.p1, "valide");
  assert.equal(migrated.p4, "a_revoir");
  assert.equal(migrated.p5, "valide");
  assert.equal(migrated.p9, "valide");
  assert.equal(migrated.p10, "");
  assert.equal(migrated.k1, "valide");
  assert.equal(ValidationAsnsCore.ETAPES.length, 13);
});

test("ASNS présent si au moins une étape validée", function () {
  var asnsData = {
    classes: [{ id: "ac1", nom: "6eA" }],
    eleves: [
      {
        id: "ae1",
        classeId: "ac1",
        nom: "Andre",
        prenom: "Clara",
        statut: "en_cours",
        etapes: { p1: "valide", p2: "a_revoir" },
      },
    ],
  };
  var eleve = { id: "e1", nom: "Andre", prenom: "Clara", classeId: "c1" };
  var summary = SyntheseAsns.resolveForEleve(
    { asnsData: asnsData, parametres: [] },
    eleve,
    "6eA"
  );
  assert.ok(summary);
  assert.match(summary.headline, /En cours/);
  assert.equal(summary.valides, 1);
});
