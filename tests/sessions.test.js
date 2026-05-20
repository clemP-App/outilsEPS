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
