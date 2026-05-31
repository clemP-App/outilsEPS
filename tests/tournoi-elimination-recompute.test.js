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

function syncMatchPlayersFromFeeders(rounds, roundIndex, matchIndex) {
  if (roundIndex < 1 || !rounds[roundIndex]) return false;
  var match = rounds[roundIndex][matchIndex];
  var before0 = match.players[0];
  var before1 = match.players[1];
  var left = rounds[roundIndex - 1][matchIndex * 2];
  var right = rounds[roundIndex - 1][matchIndex * 2 + 1];
  match.players[0] = left && left.winner ? left.winner : null;
  match.players[1] = right && right.winner ? right.winner : null;
  return before0 !== match.players[0] || before1 !== match.players[1];
}

function invalidateWinnerIfNeeded(match) {
  if (!match || !match.winner) return;
  if (match.players.indexOf(match.winner) === -1) {
    match.winner = null;
  }
}

function placeWinner(rounds, roundIndex, matchIndex, winner) {
  if (roundIndex >= rounds.length - 1) return;
  var nextMatch = rounds[roundIndex + 1][Math.floor(matchIndex / 2)];
  var slot = matchIndex % 2;
  var previous = nextMatch.players[slot];
  nextMatch.players[slot] = winner;
  if (nextMatch.winner && (previous !== winner || nextMatch.players.indexOf(nextMatch.winner) === -1)) {
    nextMatch.winner = null;
  }
}

function clearBranchSlotDownstream(rounds, roundIndex, matchIndex) {
  var r = roundIndex;
  var m = matchIndex;
  while (r < rounds.length - 1) {
    var nextR = r + 1;
    var nextM = Math.floor(m / 2);
    var slot = m % 2;
    var nextMatch = rounds[nextR][nextM];
    nextMatch.players[slot] = null;
    invalidateWinnerIfNeeded(nextMatch);
    if (nextMatch.winner) return;
    r = nextR;
    m = nextM;
  }
}

function refreshBranchFrom(rounds, roundIndex, matchIndex) {
  var r = roundIndex;
  var m = matchIndex;
  while (r < rounds.length - 1) {
    var cur = rounds[r][m];
    if (!cur.winner) {
      clearBranchSlotDownstream(rounds, r, m);
      return;
    }
    placeWinner(rounds, r, m, cur.winner);
    var nextR = r + 1;
    var nextM = Math.floor(m / 2);
    var nextMatch = rounds[nextR][nextM];
    var rosterChanged = syncMatchPlayersFromFeeders(rounds, nextR, nextM);
    if (rosterChanged && nextMatch.winner) {
      nextMatch.winner = null;
    } else {
      invalidateWinnerIfNeeded(nextMatch);
    }
    if (nextMatch.winner) return;
    r = nextR;
    m = nextM;
  }
}

describe("tournoi élimination — correction vainqueur", function () {
  it("invalide le vainqueur si le joueur du créneau remplacé était gagnant", function () {
    var rounds = [
      [{ players: ["A", "B"], winner: "A" }],
      [{ players: ["A", "C"], winner: "C" }],
    ];
    rounds[0][0].winner = "B";
    refreshBranchFrom(rounds, 0, 0);
    assert.equal(rounds[1][0].players[0], "B");
    assert.equal(rounds[1][0].winner, null);
  });

  it("remet à zéro le quart si un participant change (ex. C→D)", function () {
    var slots = ["A", "B", "C", "D"];
    var rounds = createRoundsFromSlots(slots);
    rounds[0][0].winner = "A";
    rounds[0][1].winner = "C";
    placeWinner(rounds, 0, 0, "A");
    placeWinner(rounds, 0, 1, "C");
    rounds[1][0].players = ["A", "C"];
    rounds[1][0].winner = "A";

    rounds[0][1].winner = "D";
    refreshBranchFrom(rounds, 0, 1);

    assert.deepEqual(rounds[1][0].players, ["A", "D"]);
    assert.equal(rounds[1][0].winner, null);
  });

  it("ne modifie pas l'autre match du quart", function () {
    var slots = ["A", "B", "C", "D", "E", "F", "G", "H"];
    var rounds = createRoundsFromSlots(slots);
    rounds[0].forEach(function (m, i) {
      m.winner = m.players[0];
      placeWinner(rounds, 0, i, m.winner);
    });
    rounds[1][0].winner = "A";
    rounds[1][1].winner = "E";

    rounds[0][2].winner = "F";
    refreshBranchFrom(rounds, 0, 2);

    assert.equal(rounds[1][0].winner, "A");
    assert.deepEqual(rounds[1][1].players, ["F", "G"]);
    assert.equal(rounds[1][1].winner, null);
  });

  it("annule le vainqueur et vide la branche en aval", function () {
    var slots = ["A", "B", "C", "D"];
    var rounds = createRoundsFromSlots(slots);
    rounds[0][0].winner = "A";
    rounds[0][1].winner = "C";
    placeWinner(rounds, 0, 0, "A");
    placeWinner(rounds, 0, 1, "C");
    rounds[1][0].players = ["A", "C"];
    rounds[1][0].winner = "A";

    rounds[0][0].winner = null;
    clearBranchSlotDownstream(rounds, 0, 0);

    assert.equal(rounds[0][0].winner, null);
    assert.equal(rounds[1][0].players[0], null);
    assert.equal(rounds[1][0].winner, null);
  });

  it("invalide la finale sur la branche corrigée si le vainqueur du quart disparaît", function () {
    var slots = ["A", "B", "C", "D"];
    var rounds = createRoundsFromSlots(slots);
    rounds[0][0].winner = "A";
    rounds[0][1].winner = "C";
    placeWinner(rounds, 0, 0, "A");
    placeWinner(rounds, 0, 1, "C");
    rounds[1][0].players = ["A", "C"];
    rounds[1][0].winner = "A";

    rounds[0][0].winner = "B";
    refreshBranchFrom(rounds, 0, 0);

    assert.deepEqual(rounds[1][0].players, ["B", "C"]);
    assert.equal(rounds[1][0].winner, null);
  });
});
