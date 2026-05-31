/**
 * Tests de cohérence du tableau après correction d'un vainqueur.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

function createEmptyMatch() {
  return { players: [null, null], winner: null };
}

function createRoundsFromSlots(slots) {
  var size = slots.length;
  var totalRounds = Math.log(size) / Math.log(2);
  var rounds = [];
  var firstRound = [];
  for (var i = 0; i < size; i += 2) {
    firstRound.push({ players: [slots[i], slots[i + 1]], winner: null });
  }
  rounds.push(firstRound);
  for (var r = 1; r < totalRounds; r++) {
    var matches = [];
    for (var m = 0; m < Math.pow(2, totalRounds - r - 1); m++) {
      matches.push(createEmptyMatch());
    }
    rounds.push(matches);
  }
  return rounds;
}

/** Même logique que placeWinner dans tournoi-elimination.js */
function placeWinner(rounds, roundIndex, matchIndex, winner) {
  if (roundIndex >= rounds.length - 1) return;
  var nextMatch = rounds[roundIndex + 1][Math.floor(matchIndex / 2)];
  var slot = matchIndex % 2;
  var previous = nextMatch.players[slot];
  nextMatch.players[slot] = winner;
  if (
    nextMatch.winner &&
    (previous !== winner || nextMatch.players.indexOf(nextMatch.winner) === -1)
  ) {
    nextMatch.winner = null;
  }
}

function recomputeFrom(rounds, roundIndex) {
  for (var r = roundIndex + 1; r < rounds.length; r++) {
    rounds[r].forEach(function (match) {
      match.winner = null;
      match.players = [null, null];
    });
  }
  for (var sourceRound = 0; sourceRound <= roundIndex; sourceRound++) {
    rounds[sourceRound].forEach(function (match, idx) {
      if (match.winner) placeWinner(rounds, sourceRound, idx, match.winner);
    });
  }
}

describe("tournoi élimination — correction vainqueur", function () {
  it("recomputeFrom remet à jour les tours suivants (élimination directe)", function () {
    var slots = ["A", "B", "C", "D", "E", "F", "G", "H"];
    var rounds = createRoundsFromSlots(slots);
    rounds[0].forEach(function (m, i) {
      m.winner = m.players[0];
      placeWinner(rounds, 0, i, m.winner);
    });
    rounds[1].forEach(function (m, i) {
      m.winner = m.players[0];
      placeWinner(rounds, 1, i, m.winner);
    });
    rounds[2][0].winner = rounds[2][0].players[0];

    rounds[0][0].winner = "B";
    recomputeFrom(rounds, 0);

    assert.equal(rounds[1][0].players[0], "B");
    assert.equal(rounds[1][0].winner, null);
    assert.equal(rounds[2][0].winner, null);
    assert.deepEqual(rounds[2][0].players, [null, null]);
  });

  it("placeWinner invalide le vainqueur si un joueur du créneau change", function () {
    var rounds = [
      [{ players: ["A", "B"], winner: "A" }],
      [{ players: ["A", "C"], winner: "C" }],
    ];
    rounds[0][0].winner = "B";
    placeWinner(rounds, 0, 0, "B");
    assert.equal(rounds[1][0].players[0], "B");
    assert.equal(rounds[1][0].winner, null);
  });

  it("correction au 1er tour sans laisser une finale incohérente", function () {
    var slots = ["A", "B", "C", "D"];
    var rounds = createRoundsFromSlots(slots);
    rounds[0][0].winner = "A";
    rounds[0][1].winner = "C";
    placeWinner(rounds, 0, 0, "A");
    placeWinner(rounds, 0, 1, "C");
    rounds[1][0].players = ["A", "C"];
    rounds[1][0].winner = "C";

    rounds[0][0].winner = "B";
    recomputeFrom(rounds, 0);

    assert.deepEqual(rounds[1][0].players, ["B", "C"]);
    assert.equal(rounds[1][0].winner, null);
  });
});
