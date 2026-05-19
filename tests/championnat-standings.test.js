"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var standings = require("../shared/championnat-standings.js");

test("classement : victoire à domicile (3 pts)", function () {
  var teams = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
  ];
  var matches = [{ id: "m1", homeId: "a", awayId: "b", homeScore: 2, awayScore: 0 }];
  var rows = standings.computeStandingsFromData(teams, matches);
  assert.equal(rows[0].teamId, "a");
  assert.equal(rows[0].pts, 3);
  assert.equal(rows[0].v, 1);
  assert.equal(rows[1].pts, 0);
  assert.equal(rows[1].d, 1);
});

test("classement : match nul (1 pt chacun)", function () {
  var teams = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
  ];
  var matches = [{ id: "m1", homeId: "a", awayId: "b", homeScore: 1, awayScore: 1 }];
  var rows = standings.computeStandingsFromData(teams, matches);
  assert.equal(rows[0].pts, 1);
  assert.equal(rows[0].n, 1);
  assert.equal(rows[1].pts, 1);
  assert.equal(rows[1].n, 1);
});

test("classement : match sans score ignoré", function () {
  var teams = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
  ];
  var matches = [{ id: "m1", homeId: "a", awayId: "b", homeScore: null, awayScore: null }];
  var rows = standings.computeStandingsFromData(teams, matches);
  assert.equal(rows[0].mj, 0);
  assert.equal(rows[0].pts, 0);
});
