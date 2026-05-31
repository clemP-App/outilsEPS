"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function loadScript(relativePath) {
  var code = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  vm.runInThisContext(code, { filename: relativePath });
}

loadScript("shared/sessions-core.js");
loadScript("shared/championnat-standings.js");
loadScript("shared/synthese-identity.js");
loadScript("shared/synthese-facts.js");
loadScript("shared/synthese-eps-core.js");
loadScript("shared/synthese-eps-activites.js");

var Activites = global.SyntheseEpsActivites;
var Identity = global.SyntheseIdentity;
var Core = global.SyntheseEpsCore;

test("Défi ATP — headline riche (rang, pts, V/D)", function () {
  var eleve = { id: "e1", classeId: "c1", nom: "Andre", prenom: "Clara" };
  var data = {
    classes: [{ id: "c1", nom: "6e Test", eleves: [eleve] }],
    eleves: [eleve],
    identiteAliases: [],
    sessions: [
      {
        id: "s1",
        toolId: "defi-atp",
        classeId: null,
        archived: false,
        lastOpenedAt: "2026-05-29T10:00:00.000Z",
        nomSession: "Première séance",
      },
    ],
    parametres: [
      {
        id: "defi-atp__s1",
        sessionId: "s1",
        toolId: "defi-atp",
        players: [
          {
            id: "p1",
            name: "Andre Clara",
            points: 1002,
            wins: 1,
            losses: 1,
            badges: { b1: 3 },
          },
          { id: "p2", name: "Adam Fournier", points: 1003, wins: 1, losses: 0, badges: {} },
        ],
        ladder: ["p2", "p1"],
        matches: [{ id: "m1" }],
      },
    ],
    championnats: [],
    tournoisElimination: [],
  };
  var acts = Activites.collectActivitesEleve(eleve, data, {});
  assert.equal(acts.length, 1);
  assert.match(acts[0].headline, /2e\/2/);
  assert.match(acts[0].headline, /1002 pts/);
  assert.match(acts[0].headline, /1V-1D/);
  assert.match(acts[0].headline, /3 badge/);
});

test("Prénom seul — une seule Clara dans la classe", function () {
  var eleves = [
    { id: "e1", classeId: "c1", nom: "Andre", prenom: "Clara" },
    { id: "e2", classeId: "c1", nom: "Dupont", prenom: "Lucas" },
  ];
  var ctx = { classeId: "c1", elevesClasse: eleves, aliases: [] };
  assert.equal(Identity.labelMatchesEleve("Clara", eleves[0], ctx).match, true);
  assert.equal(Identity.labelMatchesEleve("Clara", eleves[1], ctx).match, false);
});

test("Import équipe — pas sur fiche élève", function () {
  var imp = { toolId: "table-marque", auteurLabel: "Les Rouges", classeLabel: "6e Test" };
  var eleve = { id: "e1", classeId: "c1", nom: "Andre", prenom: "Clara" };
  assert.equal(Identity.importConcernsEleve(imp, eleve, "6e Test", {}), false);
  assert.equal(Identity.importSubjectKind(imp), "team");
});

test("Synthèse élève — engagement avec headline Défi ATP", function () {
  var eleve = { id: "e1", classeId: "c1", nom: "Andre", prenom: "Clara" };
  var data = Core.normalizeLoadedData({
    classes: [{ id: "c1", nom: "6e Test", eleves: [eleve] }],
    eleves: [eleve],
    sessions: [
      {
        id: "s1",
        toolId: "defi-atp",
        classeId: null,
        archived: false,
        lastOpenedAt: "2026-05-29T10:00:00.000Z",
        nomSession: "Première séance",
      },
    ],
    parametres: [
      {
        id: "defi-atp__s1",
        sessionId: "s1",
        toolId: "defi-atp",
        players: [{ id: "p1", name: "Andre Clara", points: 1002, wins: 1, losses: 1, badges: {} }],
        ladder: ["p1"],
      },
    ],
  });
  var syn = Core.buildEleveSynthese("e1", data, { classeId: "c1" });
  assert.equal(syn.ok, true);
  var engagement = syn.lecturePedagogique.engagement.join(" ");
  assert.match(engagement, /1002 pts|1V-1D|Défi ATP/i);
  assert.equal(engagement.indexOf("participation(s) identifiée(s)"), -1);
});
