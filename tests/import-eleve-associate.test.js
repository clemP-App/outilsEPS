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

loadScript("shared/synthese-identity.js");

global.document = {
  body: { appendChild: function () {} },
  createElement: function () {
    return {
      className: "",
      hidden: true,
      innerHTML: "",
      setAttribute: function () {},
      querySelector: function () {
        return { addEventListener: function () {}, focus: function () {} };
      },
      querySelectorAll: function () {
        return [];
      },
      addEventListener: function () {},
    };
  },
};

loadScript("shared/import-eleve-associate.js");

test("recordNeedsAssociation — prénom ambigu (2 Clara)", function () {
  var classes = [
    {
      id: "c1",
      nom: "6eA",
      eleves: [
        { id: "e1", nom: "Andre", prenom: "Clara" },
        { id: "e2", nom: "Martin", prenom: "Clara" },
      ],
    },
  ];
  var record = { toolId: "vitesse-plots", auteurLabel: "Clara" };
  assert.equal(ImportEleveAssociate.recordNeedsAssociation(record, { classes: classes, aliases: [] }), true);
});

test("recordNeedsAssociation — match unique, pas de prompt", function () {
  var classes = [
    {
      id: "c1",
      nom: "6eA",
      eleves: [{ id: "e1", nom: "Andre", prenom: "Clara" }],
    },
  ];
  var record = { toolId: "compteur-ratio", auteurLabel: "Andre Clara" };
  assert.equal(ImportEleveAssociate.recordNeedsAssociation(record, { classes: classes, aliases: [] }), false);
});

test("recordNeedsAssociation — table marque ignorée", function () {
  var record = { toolId: "table-marque", auteurLabel: "Les Rouges" };
  assert.equal(
    ImportEleveAssociate.recordNeedsAssociation(record, { classes: [{ id: "c1", nom: "6e", eleves: [] }], aliases: [] }),
    false
  );
});

test("recordNeedsAssociation — compteur bonus, deux joueurs à associer", function () {
  var classes = [
    {
      id: "c1",
      nom: "6eA",
      eleves: [
        { id: "e1", nom: "Andre", prenom: "Clara" },
        { id: "e2", nom: "Martin", prenom: "Paul" },
      ],
    },
  ];
  var record = {
    toolId: "compteur-bonus",
    auteurLabel: "Bleus — Rouges",
    payload: {
      players: {
        A: { name: "Bleus", score: 3 },
        B: { name: "Rouges", score: 1 },
      },
    },
  };
  assert.equal(ImportEleveAssociate.recordNeedsAssociation(record, { classes: classes, aliases: [] }), true);
});

test("recordNeedsAssociation — compteur bonus déjà associé", function () {
  var classes = [
    {
      id: "c1",
      nom: "6eA",
      eleves: [
        { id: "e1", nom: "Andre", prenom: "Clara" },
        { id: "e2", nom: "Martin", prenom: "Paul" },
      ],
    },
  ];
  var record = {
    toolId: "compteur-bonus",
    payload: {
      players: {
        A: { name: "Clara" },
        B: { name: "Paul" },
      },
    },
    playerAssociations: {
      A: { label: "Clara", eleveId: "e1", eleveLabel: "Andre Clara" },
      B: { label: "Paul", eleveId: "e2", eleveLabel: "Martin Paul" },
    },
  };
  assert.equal(ImportEleveAssociate.recordNeedsAssociation(record, { classes: classes, aliases: [] }), false);
});

test("getImportPlayerSlots — compteur ratio", function () {
  var record = {
    toolId: "compteur-ratio",
    payload: { students: { a: { name: "Léa" }, b: { name: "Tom" } } },
  };
  var slots = SyntheseIdentity.getImportPlayerSlots(record);
  assert.equal(slots.length, 2);
  assert.equal(slots[0].label, "Léa");
  assert.equal(slots[1].label, "Tom");
});

test("importConcernsEleve — compteur bonus par slot", function () {
  var imp = {
    toolId: "compteur-bonus",
    payload: { players: { A: { name: "Clara" }, B: { name: "Paul" } } },
    playerAssociations: {
      A: { label: "Clara", eleveId: "e1", eleveLabel: "Andre Clara" },
      B: { label: "Paul", eleveId: "e2", eleveLabel: "Martin Paul" },
    },
  };
  var eleveA = { id: "e1", nom: "Andre", prenom: "Clara", classeId: "c1" };
  var eleveB = { id: "e2", nom: "Martin", prenom: "Paul", classeId: "c1" };
  var eleveC = { id: "e3", nom: "Durand", prenom: "Luc", classeId: "c1" };
  assert.equal(SyntheseIdentity.importConcernsEleve(imp, eleveA, "6eA", {}), true);
  assert.equal(SyntheseIdentity.importConcernsEleve(imp, eleveB, "6eA", {}), true);
  assert.equal(SyntheseIdentity.importConcernsEleve(imp, eleveC, "6eA", {}), false);
});

test("identityLabelForRecord — conserve le libellé QR d’origine", function () {
  var record = {
    auteurLabel: "Andre Clara",
    identityLabel: "Clara",
  };
  assert.equal(ImportEleveAssociate.identityLabelForRecord(record), "Clara");
});

test("isTeamRecord — table de marque", function () {
  assert.equal(ImportEleveAssociate.isTeamRecord({ toolId: "table-marque" }), true);
  assert.equal(ImportEleveAssociate.isTeamRecord({ toolId: "compteur-ptb" }), false);
  assert.equal(ImportEleveAssociate.isTeamRecord({ toolId: "vitesse-plots" }), false);
});

test("isDualPlayerRecord — compteurs à deux joueurs", function () {
  assert.equal(ImportEleveAssociate.isDualPlayerRecord({ toolId: "compteur-bonus" }), true);
  assert.equal(ImportEleveAssociate.isDualPlayerRecord({ toolId: "compteur-ptb" }), true);
  assert.equal(ImportEleveAssociate.isDualPlayerRecord({ toolId: "vitesse-plots" }), false);
});

test("alias résout un prénom ambigu", function () {
  var classes = [
    {
      id: "c1",
      nom: "6eA",
      eleves: [
        { id: "e1", nom: "Andre", prenom: "Clara" },
        { id: "e2", nom: "Martin", prenom: "Clara" },
      ],
    },
  ];
  var aliases = [{ classeId: "c1", labelNorm: "clara", eleveId: "e1" }];
  var record = { toolId: "vitesse-plots", auteurLabel: "Clara" };
  var matches = ImportEleveAssociate.findMatchesForLabel("Clara", classes, aliases);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "e1");
});
