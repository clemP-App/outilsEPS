"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function loadScript(relativePath) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"), {
    filename: relativePath,
  });
}

loadScript("shared/sessions-core.js");
loadScript("shared/synthese-identity.js");
loadScript("shared/synthese-eps-core.js");

var Core = global.SyntheseEpsCore;

test("Photo Finish — chronométrage rattaché à un élève par nom", function () {
  var eleve = { id: "e1", classeId: "c1", nom: "Martin", prenom: "Lea" };
  var data = {
    classes: [{ id: "c1", nom: "6e Test", eleves: [eleve] }],
    eleves: [eleve],
    identiteAliases: [],
    sessions: [
      {
        id: "s-pf",
        toolId: "photo-finish",
        classeId: "c1",
        classeNomSnapshot: "6e Test",
        nomSession: "Sprint 60 m",
        lastOpenedAt: "2026-06-01T10:00:00.000Z",
      },
    ],
    tournoisElimination: [
      {
        id: "pf1",
        kind: "photo-finish",
        sessionId: "s-pf",
        sessionInfo: { className: "6e Test", eventType: "Sprint", distance: "60 m" },
        runners: [
          {
            id: "r1",
            displayName: "Lea Martin",
            firstName: "Lea",
            lastName: "Martin",
            className: "6e Test",
          },
        ],
        results: [
          {
            id: "res1",
            runnerId: "r1",
            runnerName: "Lea Martin",
            className: "6e Test",
            timeMs: 8234,
            formattedTime: "8.23 s",
            rank: 1,
            seriesNumber: 1,
            date: "2026-06-01T10:05:00.000Z",
            isUnassigned: false,
          },
        ],
        updatedAt: "2026-06-01T10:05:00.000Z",
      },
    ],
    radarPerfs: [],
    dispenses: [],
    oublisMateriel: [],
    importsEleves: [],
    tableauxSuivi: [],
    championnats: [],
    parametres: [],
  };

  var records = Core.findEleveRecords(eleve, data, {});
  assert.equal(records.photoFinish.length, 1);
  assert.equal(records.photoFinish[0].formattedTime, "8.23 s");
  assert.equal(records.photoFinish[0].distance, "60 m");

  var syn = Core.buildEleveSynthese("e1", data, { classeId: "c1" });
  assert.ok(syn.ok);
  assert.equal(syn.stats.nbPhotoFinish, 1);
  assert.equal(syn.stats.activiteTotale >= 1, true);
});

test("Photo Finish — ignore les temps non attribués", function () {
  var eleve = { id: "e1", classeId: "c1", nom: "Martin", prenom: "Lea" };
  var data = {
    classes: [{ id: "c1", nom: "6e Test", eleves: [eleve] }],
    eleves: [eleve],
    identiteAliases: [],
    sessions: [{ id: "s-pf", toolId: "photo-finish", classeId: "c1", nomSession: "Test" }],
    tournoisElimination: [
      {
        id: "pf1",
        kind: "photo-finish",
        sessionId: "s-pf",
        sessionInfo: { className: "6e Test" },
        results: [
          {
            id: "res1",
            runnerName: "Non attribue",
            timeMs: 9000,
            date: "2026-06-01T10:05:00.000Z",
            isUnassigned: true,
          },
        ],
      },
    ],
    radarPerfs: [],
    dispenses: [],
    oublisMateriel: [],
    importsEleves: [],
    tableauxSuivi: [],
    championnats: [],
    parametres: [],
  };

  var records = Core.findEleveRecords(eleve, data, {});
  assert.equal(records.photoFinish.length, 0);
});
