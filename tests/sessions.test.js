"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var sessionsCore = require("../shared/sessions-core.js");

test("validateSession accepte une session valide", function () {
  var err = sessionsCore.validateSession({
    id: "session_1",
    toolId: "championnat-poule",
    nomSession: "6e1",
  });
  assert.equal(err, null);
});

test("validateSession rejette un toolId inconnu", function () {
  var err = sessionsCore.validateSession({
    id: "session_1",
    toolId: "inconnu",
    nomSession: "Test",
  });
  assert.ok(err);
});

test("compositionDataId lie paramètre et session", function () {
  assert.equal(
    sessionsCore.compositionDataId("abc"),
    "composition-equipes__abc"
  );
});

test("filterSessionsForTool trie par lastOpenedAt", function () {
  var list = sessionsCore.filterSessionsForTool(
    [
      {
        id: "a",
        toolId: "championnat-poule",
        nomSession: "A",
        lastOpenedAt: "2026-01-01T10:00:00.000Z",
        archived: false,
      },
      {
        id: "b",
        toolId: "championnat-poule",
        nomSession: "B",
        lastOpenedAt: "2026-02-01T10:00:00.000Z",
        archived: false,
      },
    ],
    "championnat-poule"
  );
  assert.equal(list[0].id, "b");
});

test("legacySessionName contient le libellé outil", function () {
  var name = sessionsCore.legacySessionName(
    "tournoi-elimination",
    "2026-05-20T12:00:00.000Z"
  );
  assert.match(name, /Tournoi éliminatoire/);
  assert.match(name, /Legacy/);
});

test("cloneOrientationSessionData copie parcours et réglages sans chronos", function () {
  var src = {
    parcours: [{ id: "p1", nom: "Court", balises: [1, 2] }],
    coureurs: [{ id: "c1", nom: "Dupont", ordre: 1 }],
    runs: [{ id: "r1", coureurId: "c1" }],
    settings: { penaliteFausseSec: 45, classementCriteres: [{ key: "tempsTotal", order: "asc" }] },
  };
  var copy = sessionsCore.cloneOrientationSessionData(src);
  assert.deepEqual(copy.parcours, src.parcours);
  assert.notEqual(copy.parcours, src.parcours);
  assert.deepEqual(copy.coureurs, []);
  assert.deepEqual(copy.runs, []);
  assert.deepEqual(copy.settings, src.settings);
  assert.notEqual(copy.settings, src.settings);
});

test("buildOrientationCoureurs trie et numérote", function () {
  var coureurs = sessionsCore.buildOrientationCoureurs(
    ["Zorro", "  Abel  ", "Abel", "Martin"],
    function (nom, idx) {
      return "id_" + idx + "_" + nom.replace(/\s+/g, "");
    }
  );
  assert.equal(coureurs.length, 3);
  assert.equal(coureurs[0].nom, "Abel");
  assert.equal(coureurs[1].nom, "Martin");
  assert.equal(coureurs[2].nom, "Zorro");
  assert.equal(coureurs[0].ordre, 1);
  assert.equal(coureurs[2].ordre, 3);
});
