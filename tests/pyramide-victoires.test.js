"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
test("dejaAffrontes : bloque seulement au palier du match", function () {
  var tournoi = {
    players: [
      { id: "a", name: "A", wins: 1, joinedAt: 1, reachedAt: {}, promotedAutoAt: {} },
      { id: "b", name: "B", wins: 1, joinedAt: 2, reachedAt: {}, promotedAutoAt: { 1: true } },
    ],
    matches: [
      {
        id: "m1",
        auto: false,
        winnerId: "a",
        loserId: "b",
        winnerWinsBefore: 0,
        loserWinsBefore: 0,
      },
    ],
  };

  function dejaAffrontes(id1, id2, winsLevel) {
    return tournoi.matches.some(function (m) {
      if (m.auto) return false;
      if (typeof winsLevel === "number") {
        if (m.winnerWinsBefore !== winsLevel) return false;
        if (m.loserWinsBefore != null && m.loserWinsBefore !== winsLevel) return false;
      }
      return (
        (m.winnerId === id1 && m.loserId === id2) ||
        (m.winnerId === id2 && m.loserId === id1)
      );
    });
  }

  assert.equal(dejaAffrontes("a", "b", 0), true);
  assert.equal(dejaAffrontes("a", "b", 1), false);
});

test("bilan matchs : ignore les victoires automatiques", function () {
  function bilanMatchsJoueur(playerId, matches) {
    var v = 0;
    var d = 0;
    (matches || []).forEach(function (m) {
      if (m.auto) return;
      if (m.winnerId === playerId) v += 1;
      else if (m.loserId === playerId) d += 1;
    });
    return { wins: v, losses: d };
  }
  var matches = [
    { auto: true, winnerId: "a", loserId: null },
    { auto: false, winnerId: "a", loserId: "b" },
    { auto: false, winnerId: "b", loserId: "a" },
    { auto: false, winnerId: "c", loserId: "a" },
  ];
  assert.deepEqual(bilanMatchsJoueur("a", matches), { wins: 1, losses: 2 });
  assert.deepEqual(bilanMatchsJoueur("b", matches), { wins: 1, losses: 1 });
  assert.deepEqual(bilanMatchsJoueur("c", matches), { wins: 1, losses: 0 });
});

test("classement : victoire auto derniere a palier egal", function () {
  function estPromuAuto(p) {
    return !!(p.promotedAutoAt && p.promotedAutoAt[p.wins]);
  }
  function comparer(a, b) {
    if (b.wins !== a.wins) return b.wins - a.wins;
    var autoA = estPromuAuto(a);
    var autoB = estPromuAuto(b);
    if (autoA !== autoB) return autoA ? 1 : -1;
    return 0;
  }
  var gagnant = { id: "a", wins: 1, promotedAutoAt: {} };
  var auto = { id: "b", wins: 1, promotedAutoAt: { 1: true } };
  assert.ok(comparer(gagnant, auto) < 0);
  assert.ok(comparer(auto, gagnant) > 0);
});
