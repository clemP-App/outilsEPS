/**
 * Tournoi éliminatoire — tableau type tennis.
 */
(function () {
  "use strict";

  var textareaEl = document.getElementById("tournoi-participants");
  var seedingListEl = document.getElementById("tournoi-seeding-list");
  var seedingCountEl = document.getElementById("tournoi-seeding-count");
  var formatEls = document.querySelectorAll('input[name="tournoi-format"]');
  var msgEl = document.getElementById("tournoi-msg");
  var bracketEl = document.getElementById("tournoi-bracket");
  var bracketWrapEl = document.querySelector(".tournoi-bracket-wrap");
  var matchsListEl = document.getElementById("tournoi-matchs-list");
  var setupEl = document.getElementById("tournoi-setup");
  var btnImportClasse = document.getElementById("tournoi-import-classe");
  var btnGenerer = document.getElementById("tournoi-generer");
  var btnGenererAleatoire = document.getElementById("tournoi-generer-aleatoire");
  var btnEffacerResultats = document.getElementById("tournoi-effacer-resultats");
  var btnEffacer = document.getElementById("tournoi-effacer");
  var btnValiderListe = document.getElementById("tournoi-valider-liste");

  var listeSaisieMeta =
    typeof ListeSaisieUi !== "undefined" && textareaEl
      ? ListeSaisieUi.bind({
          metaEl: document.getElementById("tournoi-participants-meta"),
          textareaEl: textareaEl,
          getSessionCount: function () {
            return state.participants.length;
          },
        })
      : null;

  var listeManuellePanel =
    typeof ListeManuellePanel !== "undefined" && textareaEl
      ? ListeManuellePanel.bind({
          toggleBtnId: "btn-ajouter-manuel-tournoi",
          panelId: "liste-manuelle-panel-tournoi",
          textareaEl: textareaEl,
        })
      : null;

  var state = {
    format: "elimination",
    participants: [],
    participantsText: "",
    levels: {},
    totalParticipants: 0,
    size: 0,
    rounds: [],
    tables: [],
    placements: {},
  };

  function normaliserNomParticipant(s) {
    return String(s || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function cleNomParticipant(nom) {
    return normaliserNomParticipant(nom).toLowerCase();
  }

  function parseNomsDepuisTexte(text) {
    var seen = {};
    var out = [];
    String(text || "")
      .split(/\r?\n/)
      .forEach(function (ligne) {
        var nom = normaliserNomParticipant(ligne);
        if (!nom || seen[cleNomParticipant(nom)]) return;
        seen[cleNomParticipant(nom)] = true;
        out.push(nom);
      });
    return out;
  }

  function migrerParticipantsDepuisPayload(data) {
    if (!data) return [];
    if (Array.isArray(data.participants) && data.participants.length) {
      return parseNomsDepuisTexte(data.participants.join("\n"));
    }
    if (typeof data.participantsText === "string" && data.participantsText.trim()) {
      return parseNomsDepuisTexte(data.participantsText);
    }
    if (data.levels && typeof data.levels === "object") {
      return Object.keys(data.levels).map(normaliserNomParticipant).filter(Boolean);
    }
    return [];
  }

  function participantEstPresent(nom) {
    var cle = cleNomParticipant(nom);
    if (!cle) return false;
    return state.participants.some(function (n) {
      return cleNomParticipant(n) === cle;
    });
  }

  function ajouterParticipants(noms) {
    var ajoutes = 0;
    var ignores = 0;
    (noms || []).forEach(function (nom) {
      var n = normaliserNomParticipant(nom);
      if (!n) return;
      if (participantEstPresent(n)) {
        ignores++;
        return;
      }
      state.participants.push(n);
      if (state.levels[n] === undefined) state.levels[n] = 3;
      ajoutes++;
    });
    return { ajoutes: ajoutes, ignores: ignores };
  }

  function tableauDejaGenere() {
    return !!(state.rounds && state.rounds.length) || !!(state.tables && state.tables.length);
  }

  function confirmerModificationListe() {
    if (!tableauDejaGenere()) return true;
    return confirm(
      "Le tableau a déjà été généré. Modifier la liste des participants effacera les matchs et les résultats. Continuer ?"
    );
  }

  function effacerTableauGenere() {
    state.rounds = [];
    state.tables = [];
    state.placements = {};
    state.totalParticipants = 0;
    state.size = 0;
  }

  function montrerMsg(msg) {
    if (!msgEl) return;
    msgEl.hidden = !msg;
    msgEl.textContent = msg || "";
  }

  function reinitialiserEtat(opts) {
    opts = opts || {};
    var format = opts.format === "classement" ? "classement" : "elimination";
    state = {
      format: format,
      participants: [],
      participantsText: "",
      levels: {},
      totalParticipants: 0,
      size: 0,
      rounds: [],
      tables: [],
      placements: {},
    };
    if (textareaEl) textareaEl.value = "";
    setFormat(format);
  }

  function appliquerPayload(data) {
    if (!data || !Array.isArray(data.rounds)) return;
    state = {
      format: data.format === "classement" ? "classement" : "elimination",
      participants: migrerParticipantsDepuisPayload(data),
      participantsText: "",
      levels: data.levels && typeof data.levels === "object" ? data.levels : {},
      totalParticipants: typeof data.totalParticipants === "number" ? data.totalParticipants : 0,
      size: typeof data.size === "number" ? data.size : 0,
      rounds: data.rounds,
      tables: Array.isArray(data.tables) ? data.tables : [],
      placements: data.placements && typeof data.placements === "object" ? data.placements : {},
    };
    syncLevels();
    if (textareaEl) textareaEl.value = "";
    setFormat(state.format);
  }

  function save() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      return Promise.resolve();
    }
    return SessionManager.requireSessionId()
      .then(function (sessionId) {
        return DataManager.saveTournoiForSession(sessionId, state);
      })
      .catch(function () {
        montrerMsg("Impossible d’enregistrer la séance.");
      });
  }

  function load() {
    if (typeof DataManager === "undefined" || typeof SessionManager === "undefined") {
      return Promise.resolve();
    }
    return SessionManager.requireSessionId()
      .then(function (sessionId) {
        return DataManager.getTournoiForSession(sessionId);
      })
      .then(function (res) {
        if (res && res.payload) {
          appliquerPayload(res.payload);
        } else {
          reinitialiserEtat();
        }
      })
      .catch(function (err) {
        montrerMsg(err && err.message ? err.message : "Séance introuvable.");
      });
  }

  function setFormat(format) {
    state.format = format === "classement" ? "classement" : "elimination";
    formatEls.forEach(function (input) {
      input.checked = input.value === state.format;
    });
  }

  function lireNomsParticipants() {
    return state.participants.slice();
  }

  function syncLevels() {
    var noms = lireNomsParticipants();
    var next = {};
    noms.forEach(function (nom) {
      var old = parseInt(state.levels[nom], 10);
      next[nom] = !isNaN(old) && old >= 1 && old <= 5 ? old : 3;
    });
    state.levels = next;
    return noms;
  }

  function niveauParticipant(nom) {
    var n = parseInt(state.levels[nom], 10);
    return !isNaN(n) && n >= 1 && n <= 5 ? n : 3;
  }

  function niveauDepuisEleve(e) {
    var n = parseInt(String(e && e.niveau), 10);
    return !isNaN(n) && n >= 1 && n <= 5 ? n : 3;
  }

  function nextPowerOfTwo(n) {
    var size = 2;
    while (size < n) size *= 2;
    return size;
  }

  function roundName(roundIndex, totalRounds) {
    var remaining = Math.pow(2, totalRounds - roundIndex);
    if (remaining === 2) return "Finale";
    if (remaining === 4) return "Demi-finales";
    if (remaining === 8) return "Quarts de finale";
    if (remaining === 16) return "Huitièmes";
    return "Tour " + (roundIndex + 1);
  }

  function matchLabel(roundIndex, matchIndex, totalRounds) {
    var remaining = Math.pow(2, totalRounds - roundIndex);
    if (remaining === 2) return "Finale";
    if (remaining === 4) return "Demi " + (matchIndex + 1);
    if (remaining === 8) return "Quart " + (matchIndex + 1);
    if (remaining === 16) return "Huitième " + (matchIndex + 1);
    return "Tour " + (roundIndex + 1) + " Match " + (matchIndex + 1);
  }

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

  function rangeTitle(start, end) {
    if (start === 1 && end === state.totalParticipants) return "Tableau principal";
    if (start === end) return "Place " + start;
    return "Places " + start + " à " + end;
  }

  function createTable(id, title, rangeStart, rangeEnd, bracketSize, slots, expectedPlayers) {
    return {
      id: id,
      title: title,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      bracketSize: bracketSize,
      expectedPlayers: expectedPlayers || rangeEnd - rangeStart + 1,
      receivedPlayers: slots.filter(Boolean).length,
      rounds: createRoundsFromSlots(slots),
    };
  }

  function seedPositions(size) {
    var positions = [0];
    var currentSize = 1;
    while (currentSize < size) {
      var next = [];
      currentSize *= 2;
      positions.forEach(function (pos) {
        next.push(pos);
        next.push(currentSize - 1 - pos);
      });
      positions = next;
    }
    return positions;
  }

  function shuffle(arr) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function opponentSlot(slot) {
    return slot % 2 === 0 ? slot + 1 : slot - 1;
  }

  function creerSlots(participants, size, randomize) {
    if (randomize) {
      var shuffled = shuffle(participants);
      var byes = size - shuffled.length;
      var index = 0;
      var randomSlots = [];
      for (var slot = 0; slot < size; slot++) {
        if (slot % 2 === 1 && byes > 0) {
          randomSlots.push(null);
          byes--;
        } else {
          randomSlots.push(shuffled[index] ? shuffled[index].name : null);
          index++;
        }
      }
      return randomSlots;
    }

    var sorted = participants
      .slice()
      .sort(function (a, b) {
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name, "fr");
      });
    var slots = new Array(size).fill(null);
    var positions = seedPositions(size);
    var reservedByes = {};
    var byesCount = size - sorted.length;

    sorted.slice(0, byesCount).forEach(function (participant, idx) {
      var pos = positions[idx];
      slots[pos] = participant.name;
      reservedByes[opponentSlot(pos)] = true;
    });

    var positionIndex = byesCount;
    sorted.slice(byesCount).forEach(function (participant) {
      while (positionIndex < positions.length && (slots[positions[positionIndex]] || reservedByes[positions[positionIndex]])) {
        positionIndex++;
      }
      if (positionIndex < positions.length) {
        slots[positions[positionIndex]] = participant.name;
        positionIndex++;
      }
    });
    return slots;
  }

  function generer(randomize) {
    var noms = syncLevels();
    var participants = noms.map(function (nom) {
      return { name: nom, level: niveauParticipant(nom) };
    });
    montrerMsg("");
    if (participants.length < 2) {
      montrerMsg("Ajoutez au moins 2 participants.");
      return;
    }
    if (participants.length > 32) {
      montrerMsg("Limite conseillée : 32 participants maximum.");
      return;
    }

    var size = nextPowerOfTwo(participants.length);
    var slots = creerSlots(participants, size, !!randomize);
    var mainRounds = createRoundsFromSlots(slots);
    var mainTable = createTable(
      "principal",
      "Tableau principal",
      1,
      participants.length,
      size,
      slots,
      participants.length
    );

    state = {
      format: state.format,
      participants: state.participants.slice(),
      participantsText: "",
      levels: state.levels,
      totalParticipants: participants.length,
      size: size,
      rounds: mainRounds,
      tables: state.format === "classement" ? [mainTable] : [],
      placements: {},
    };
    if (textareaEl) textareaEl.value = "";
    autoAdvanceByes();
    save();
    render();
    if (setupEl) setupEl.open = false;
  }

  function syncMatchPlayersFromFeeders(rounds, roundIndex, matchIndex) {
    if (roundIndex < 1 || !rounds[roundIndex]) return false;
    var match = rounds[roundIndex][matchIndex];
    if (!match) return false;
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

  function placeWinner(roundIndex, matchIndex, winner) {
    if (roundIndex >= state.rounds.length - 1) return;
    var nextMatch = state.rounds[roundIndex + 1][Math.floor(matchIndex / 2)];
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

  /** Met à jour uniquement la branche issue du match corrigé ; les autres branches restent intactes. */
  function refreshBranchFrom(roundIndex, matchIndex) {
    var r = roundIndex;
    var m = matchIndex;
    while (r < state.rounds.length - 1) {
      var cur = state.rounds[r][m];
      if (!cur.winner) {
        clearBranchSlotDownstream(state.rounds, r, m);
        return;
      }
      placeWinner(r, m, cur.winner);
      var nextR = r + 1;
      var nextM = Math.floor(m / 2);
      var nextMatch = state.rounds[nextR][nextM];
      var rosterChanged = syncMatchPlayersFromFeeders(state.rounds, nextR, nextM);
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

  function setWinnerClassic(roundIndex, matchIndex, winner) {
    var match = state.rounds[roundIndex][matchIndex];
    if (!winner || match.players.indexOf(winner) === -1) return;
    if (match.winner === winner) {
      match.winner = null;
      clearBranchSlotDownstream(state.rounds, roundIndex, matchIndex);
      autoAdvanceByes();
      save();
      render();
      return;
    }
    match.winner = winner;
    refreshBranchFrom(roundIndex, matchIndex);
    autoAdvanceByes();
    save();
    render();
  }

  function findTable(tableId) {
    return (state.tables || []).filter(function (table) {
      return table.id === tableId;
    })[0];
  }

  function placeWinnerInTable(table, roundIndex, matchIndex, winner) {
    if (roundIndex >= table.rounds.length - 1) {
      state.placements[winner] = table.rangeStart;
      return;
    }
    var nextMatch = table.rounds[roundIndex + 1][Math.floor(matchIndex / 2)];
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

  function refreshBranchInTable(table, roundIndex, matchIndex) {
    var r = roundIndex;
    var m = matchIndex;
    while (r < table.rounds.length - 1) {
      var cur = table.rounds[r][m];
      if (!cur.winner) {
        clearBranchSlotDownstream(table.rounds, r, m);
        return;
      }
      placeWinnerInTable(table, r, m, cur.winner);
      var nextR = r + 1;
      var nextM = Math.floor(m / 2);
      var nextMatch = table.rounds[nextR][nextM];
      var rosterChanged = syncMatchPlayersFromFeeders(table.rounds, nextR, nextM);
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

  function loserRange(table, roundIndex) {
    var unit = table.bracketSize / Math.pow(2, roundIndex + 1);
    var start = table.rangeStart + unit;
    var end = Math.min(table.rangeStart + unit * 2 - 1, table.rangeEnd);
    return { start: start, end: end, size: Math.max(0, end - start + 1) };
  }

  function addPlayerToTable(table, player) {
    if (!table || !player) return;
    var positions = seedPositions(table.bracketSize);
    var slot = positions[table.receivedPlayers] || table.receivedPlayers;
    var match = table.rounds[0][Math.floor(slot / 2)];
    if (!match) return;
    match.players[slot % 2] = player;
    table.receivedPlayers++;
    if (table.receivedPlayers >= table.expectedPlayers) autoAdvanceTableByes(table);
  }

  function getOrCreateLoserTable(table, roundIndex) {
    var range = loserRange(table, roundIndex);
    if (range.size < 2) return null;
    var id = table.id + "-r" + roundIndex;
    var existing = findTable(id);
    if (existing) return existing;
    var bracketSize = nextPowerOfTwo(range.size);
    var slots = new Array(bracketSize).fill(null);
    var child = createTable(id, rangeTitle(range.start, range.end), range.start, range.end, bracketSize, slots, range.size);
    child.sourceTableId = table.id;
    child.sourceRound = roundIndex;
    state.tables.push(child);
    return child;
  }

  function removeDescendantTables(tableId) {
    state.tables = state.tables.filter(function (table) {
      return table.id === tableId || table.id.indexOf(tableId + "-") !== 0;
    });
  }

  function resetTableAfter(table, roundIndex) {
    for (var r = roundIndex + 1; r < table.rounds.length; r++) {
      table.rounds[r].forEach(function (match) {
        match.winner = null;
        match.players = [null, null];
      });
    }
  }

  function applyClassementWinner(table, roundIndex, matchIndex, winner) {
    var match = table.rounds[roundIndex][matchIndex];
    if (!winner || match.players.indexOf(winner) === -1) return;
    match.winner = winner;
    var loser = match.players.filter(function (player) {
      return player && player !== winner;
    })[0];
    placeWinnerInTable(table, roundIndex, matchIndex, winner);
    if (loser) {
      var range = loserRange(table, roundIndex);
      if (range.size === 1) {
        state.placements[loser] = range.start;
      } else {
        addPlayerToTable(getOrCreateLoserTable(table, roundIndex), loser);
      }
    }
  }

  function snapshotTableWinners(table) {
    return table.rounds.map(function (round) {
      return round.map(function (match) {
        return match.winner;
      });
    });
  }

  function clearTableResults(table) {
    resetTableAfter(table, 0);
    table.rounds.forEach(function (round, r) {
      round.forEach(function (match) {
        match.winner = null;
        if (r > 0) match.players = [null, null];
      });
    });
  }

  function replayTableFromSnapshot(table, winnersByRound) {
    winnersByRound.forEach(function (round, r) {
      round.forEach(function (savedWinner, m) {
        if (savedWinner) applyClassementWinner(table, r, m, savedWinner);
      });
    });
    autoAdvanceTableByes(table);
  }

  function rebuildClassementFromSnapshots(snapshots) {
    var main = findTable("principal");
    if (!main) return;
    removeDescendantTables("principal");
    state.tables = [main];
    state.placements = {};
    clearTableResults(main);

    var mainSnap = snapshots.filter(function (snap) {
      return snap.id === "principal";
    })[0];
    if (mainSnap) replayTableFromSnapshot(main, mainSnap.winners);

    snapshots
      .filter(function (snap) {
        return snap.id !== "principal";
      })
      .sort(function (a, b) {
        return a.id.localeCompare(b.id, "fr");
      })
      .forEach(function (snap) {
        var table = findTable(snap.id);
        if (!table) return;
        clearTableResults(table);
        replayTableFromSnapshot(table, snap.winners);
      });
  }

  function setWinnerClassement(tableId, roundIndex, matchIndex, winner) {
    var table = findTable(tableId);
    if (!table) return;
    var match = table.rounds[roundIndex][matchIndex];
    if (!winner || match.players.indexOf(winner) === -1) return;

    var snapshots = (state.tables || []).map(function (t) {
      return { id: t.id, winners: snapshotTableWinners(t) };
    });
    snapshots.forEach(function (snap) {
      if (snap.id !== tableId) return;
      snap.winners[roundIndex][matchIndex] = match.winner === winner ? null : winner;
    });

    rebuildClassementFromSnapshots(snapshots);
    save();
    render();
  }

  function setWinner(tableId, roundIndex, matchIndex, winner) {
    if (state.format === "classement") {
      setWinnerClassement(tableId, roundIndex, matchIndex, winner);
      return;
    }
    setWinnerClassic(roundIndex, matchIndex, winner);
  }

  function autoAdvanceByes() {
    if (state.format === "classement") {
      (state.tables || []).forEach(autoAdvanceTableByes);
      return;
    }
    if (!state.rounds.length) return;
    state.rounds[0].forEach(function (match, m) {
      if (match.winner) return;
      var present = match.players.filter(Boolean);
      if (present.length === 1) {
        match.winner = present[0];
        placeWinner(0, m, present[0]);
      }
    });
  }

  function autoAdvanceTableByes(table) {
    if (!table || !table.rounds.length || table.receivedPlayers < table.expectedPlayers) return;
    var changed = true;
    while (changed) {
      changed = false;
      table.rounds.forEach(function (round, r) {
        round.forEach(function (match, m) {
          if (match.winner) return;
          var present = match.players.filter(Boolean);
          var filledSlot = match.players[0] ? 0 : 1;
          if (present.length === 1 && brancheAdverseVide(table, r, m, filledSlot)) {
            match.winner = present[0];
            placeWinnerInTable(table, r, m, present[0]);
            changed = true;
          }
        });
      });
    }
  }

  function brancheAdverseVide(table, roundIndex, matchIndex, filledSlot) {
    if (roundIndex === 0) return true;
    var emptySlot = filledSlot === 0 ? 1 : 0;
    var sourceMatchIndex = matchIndex * 2 + emptySlot;
    return !branchHasPlayer(table, roundIndex - 1, sourceMatchIndex);
  }

  function branchHasPlayer(table, roundIndex, matchIndex) {
    if (roundIndex < 0) return false;
    var match = table.rounds[roundIndex] && table.rounds[roundIndex][matchIndex];
    if (!match) return false;
    if (match.players[0] || match.players[1] || match.winner) return true;
    if (roundIndex === 0) return false;
    return branchHasPlayer(table, roundIndex - 1, matchIndex * 2) || branchHasPlayer(table, roundIndex - 1, matchIndex * 2 + 1);
  }

  function tableForRender(tableId) {
    if (state.format !== "classement" && tableId === "principal") {
      return { id: "principal", rounds: state.rounds };
    }
    return findTable(tableId);
  }

  /** Exempt = bye (avance seul) ; sinon la case attend le vainqueur d'un match précédent. */
  function isExemptSlot(tableId, roundIndex, matchIndex, slotIndex) {
    var table = tableForRender(tableId);
    if (!table || !table.rounds[roundIndex]) return false;
    var match = table.rounds[roundIndex][matchIndex];
    if (!match || match.players[slotIndex]) return false;
    var otherSlot = slotIndex === 0 ? 1 : 0;
    if (roundIndex === 0) {
      return !!match.players[otherSlot];
    }
    if (match.players[otherSlot]) {
      return brancheAdverseVide(table, roundIndex, matchIndex, otherSlot);
    }
    var sourceMatchIndex = matchIndex * 2 + slotIndex;
    return !branchHasPlayer(table, roundIndex - 1, sourceMatchIndex);
  }

  function emptySlotLabel(tableId, roundIndex, matchIndex, slotIndex) {
    return isExemptSlot(tableId, roundIndex, matchIndex, slotIndex) ? "Exempt" : "Attente de joueur";
  }

  function resetResults() {
    if (state.format === "classement") {
      var main = findTable("principal");
      if (!main) return;
      var slots = [];
      main.rounds[0].forEach(function (match) {
        slots.push(match.players[0]);
        slots.push(match.players[1]);
      });
      var freshMain = createTable("principal", "Tableau principal", 1, state.totalParticipants, state.size, slots, state.totalParticipants);
      state.tables = [freshMain];
      state.rounds = freshMain.rounds;
      state.placements = {};
      autoAdvanceByes();
      save();
      render();
      return;
    }
    if (!state.rounds.length) return;
    state.rounds.forEach(function (round, r) {
      round.forEach(function (match) {
        match.winner = null;
        if (r > 0) match.players = [null, null];
      });
    });
    autoAdvanceByes();
    save();
    render();
  }

  function effacer() {
    if (!confirm("Effacer le tournoi ?")) return;
    reinitialiserEtat({ format: state.format });
    save().then(function () {
      renderSeedingList();
      render();
    });
  }

  function validerListeManuelle() {
    if (!textareaEl) return;
    var lignes = parseNomsDepuisTexte(textareaEl.value);
    if (!lignes.length) {
      montrerMsg("Saisissez au moins un nom (un par ligne).");
      return;
    }
    if (!confirmerModificationListe()) return;
    if (tableauDejaGenere()) effacerTableauGenere();
    var stats = ajouterParticipants(lignes);
    textareaEl.value = "";
    if (listeSaisieMeta) listeSaisieMeta.refresh();
    syncLevels();
    renderSeedingList();
    render();
    save();
    var msg =
      typeof ImportElevePresence !== "undefined"
        ? ImportElevePresence.messageImportEleves(stats)
        : stats.ajoutes
          ? stats.ajoutes + " participant(s) ajouté(s)."
          : "Aucun nouveau participant (doublons ignorés).";
    montrerMsg(msg);
  }

  function retirerParticipant(nom) {
    if (!confirmerModificationListe()) return;
    if (tableauDejaGenere()) effacerTableauGenere();
    state.participants = state.participants.filter(function (n) {
      return n !== nom;
    });
    delete state.levels[nom];
    syncLevels();
    renderSeedingList();
    render();
    save();
    montrerMsg("");
  }

  function nomEleve(e) {
    var nom =
      typeof EleveDisplay !== "undefined" && EleveDisplay.formatEleveListe
        ? EleveDisplay.formatEleveListe(e, "")
        : [e.nom, e.prenom].filter(Boolean).join(" ").trim();
    return nom || "Sans nom";
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.");
      return;
    }
    ClassImport.open({
      title: "Importer des participants",
      hint: "Les joueurs déjà dans la liste sont grisés. Cochez les nouveaux à ajouter.",
      dejaPresent: function (e) {
        return participantEstPresent(nomEleve(e));
      },
      defaultChecked: true,
      onConfirm: function (eleves, classe, metaImport) {
        if (!confirmerModificationListe()) return;
        if (tableauDejaGenere()) effacerTableauGenere();
        var noms = [];
        eleves.forEach(function (eleve) {
          var nom = nomEleve(eleve);
          if (!nom) return;
          noms.push(nom);
          state.levels[nom] = niveauDepuisEleve(eleve);
        });
        var stats = ajouterParticipants(noms);
        var ignores = metaImport && metaImport.ignores ? metaImport.ignores : 0;
        syncLevels();
        renderSeedingList();
        render();
        save();
        montrerMsg(
          typeof ImportElevePresence !== "undefined"
            ? ImportElevePresence.messageImportEleves({
                ajoutes: stats.ajoutes,
                ignores: ignores,
                contexte: classe && classe.nom ? "« " + classe.nom + " »" : "",
              })
            : stats.ajoutes
              ? stats.ajoutes + " participant(s) importé(s)."
              : "Aucun nouveau participant."
        );
      },
    });
  }

  function renderSeedingList() {
    if (!seedingListEl) return;
    var noms = syncLevels();
    if (listeSaisieMeta) listeSaisieMeta.refresh();
    if (seedingCountEl) {
      seedingCountEl.textContent = noms.length <= 1 ? noms.length + " joueur" : noms.length + " joueurs";
    }
    OutilsDom.clear(seedingListEl);
    if (!noms.length) {
      var empty = document.createElement("p");
      empty.className = "tournoi-seeding-empty";
      empty.textContent = "Ajoutez des participants pour régler les niveaux.";
      seedingListEl.appendChild(empty);
      return;
    }
    noms.forEach(function (nom) {
      var row = document.createElement("div");
      row.className = "tournoi-seeding-row";
      var span = document.createElement("span");
      span.textContent = nom;
      var btnRetirer = document.createElement("button");
      btnRetirer.type = "button";
      btnRetirer.className = "btn btn--ghost btn--small btn--icon-only tournoi-seeding-remove";
      btnRetirer.setAttribute("aria-label", "Retirer " + nom);
      btnRetirer.textContent = "×";
      btnRetirer.addEventListener("click", function () {
        retirerParticipant(nom);
      });
      var buttons = document.createElement("div");
      buttons.className = "tournoi-level-buttons";
      buttons.setAttribute("role", "group");
      buttons.setAttribute("aria-label", "Niveau de " + nom);
      for (var n = 1; n <= 5; n++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tournoi-level-btn";
        btn.textContent = String(n);
        btn.setAttribute("aria-pressed", niveauParticipant(nom) === n ? "true" : "false");
        btn.classList.toggle("is-active", niveauParticipant(nom) === n);
        btn.addEventListener("click", (function (niveau) {
          return function () {
            state.levels[nom] = niveau;
            renderSeedingList();
            save();
          };
        })(n));
        buttons.appendChild(btn);
      }
      row.appendChild(span);
      row.appendChild(buttons);
      row.appendChild(btnRetirer);
      seedingListEl.appendChild(row);
    });
  }

  function matchsAJouer() {
    var out = [];
    var tables =
      state.format === "classement" ? state.tables || [] : [{ id: "principal", title: "", rounds: state.rounds }];
    tables.forEach(function (table) {
      table.rounds.forEach(function (round, r) {
        round.forEach(function (match, m) {
          if (!match.winner && match.players[0] && match.players[1]) {
            out.push({
              tableId: table.id,
              roundIndex: r,
              matchIndex: m,
              tour: (table.title ? table.title + " - " : "") + matchLabel(r, m, table.rounds.length),
              j1: match.players[0],
              j2: match.players[1],
            });
          }
        });
      });
    });
    return out;
  }

  function renderMatchsAJouer() {
    if (!matchsListEl) return;
    OutilsDom.clear(matchsListEl);
    var matchs = matchsAJouer();
    if (!matchs.length) {
      var empty = document.createElement("li");
      empty.className = "tournoi-matchs-empty";
      empty.textContent = state.rounds.length ? "Aucun match en attente." : "Générez le tournoi pour voir les matchs.";
      matchsListEl.appendChild(empty);
      return;
    }
    matchs.forEach(function (match) {
      var li = document.createElement("li");
      li.className = "tournoi-matchs-item";
      var tour = document.createElement("span");
      tour.className = "tournoi-matchs-item__tour";
      tour.textContent = match.tour;
      var joueurs = document.createElement("div");
      joueurs.className = "tournoi-matchs-item__players";
      [match.j1, match.j2].forEach(function (joueur) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tournoi-matchs-player";
        btn.textContent = joueur;
        btn.addEventListener("click", function () {
          setWinner(match.tableId, match.roundIndex, match.matchIndex, joueur);
        });
        joueurs.appendChild(btn);
      });
      li.appendChild(tour);
      li.appendChild(joueurs);
      matchsListEl.appendChild(li);
    });
  }

  function renderPlayer(tableId, match, player, roundIndex, matchIndex, slotIndex) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tournoi-player";
    if (!player) {
      var exempt = isExemptSlot(tableId, roundIndex, matchIndex, slotIndex);
      btn.className += " is-empty" + (exempt ? " is-exempt" : " is-waiting");
      btn.disabled = true;
      btn.textContent = emptySlotLabel(tableId, roundIndex, matchIndex, slotIndex);
      return btn;
    }
    btn.textContent = player;
    var isWinner = match.winner === player;
    btn.classList.toggle("is-winner", isWinner);
    btn.setAttribute("aria-pressed", isWinner ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      player + (isWinner ? " — cliquer pour annuler le résultat" : " — cliquer pour désigner vainqueur")
    );
    btn.addEventListener("click", function () {
      setWinner(tableId, roundIndex, matchIndex, player);
    });
    return btn;
  }

  function renderTable(table) {
    var block = document.createElement("section");
    block.className = "tournoi-table-block";
    var title = document.createElement("h2");
    title.className = "tournoi-table-title";
    title.textContent = table.title || "Tableau";
    block.appendChild(title);

    var tableEl = document.createElement("div");
    tableEl.className = "tournoi-bracket tournoi-bracket--table";
    var totalRounds = table.rounds.length;
    var firstRoundMatches = table.rounds[0] ? table.rounds[0].length : 1;
    tableEl.style.setProperty("--tournoi-first-matches", String(firstRoundMatches));
    table.rounds.forEach(function (round, r) {
      var roundEl = document.createElement("section");
      roundEl.className =
        "tournoi-round" +
        (r === 0 ? " tournoi-round--first" : "") +
        (r === totalRounds - 1 ? " tournoi-round--last" : "");
      var h = document.createElement("h3");
      h.textContent = roundName(r, totalRounds);
      roundEl.appendChild(h);

      round.forEach(function (match, m) {
        var matchEl = document.createElement("div");
        matchEl.className = "tournoi-match";
        matchEl.setAttribute("data-table", table.id);
        matchEl.setAttribute("data-round", String(r));
        matchEl.setAttribute("data-match", String(m));
        var span = Math.pow(2, r);
        matchEl.style.gridRow = m * span + 2 + " / span " + span;
        var label = document.createElement("span");
        label.className = "tournoi-match__label";
        label.textContent = matchLabel(r, m, totalRounds);
        matchEl.appendChild(label);
        matchEl.appendChild(renderPlayer(table.id, match, match.players[0], r, m, 0));
        matchEl.appendChild(renderPlayer(table.id, match, match.players[1], r, m, 1));
        roundEl.appendChild(matchEl);
      });
      tableEl.appendChild(roundEl);
    });
    block.appendChild(tableEl);
    return block;
  }

  function renderClassement() {
    if (!state.totalParticipants) return null;
    var places = {};
    Object.keys(state.placements || {}).forEach(function (nom) {
      places[state.placements[nom]] = nom;
    });
    var block = document.createElement("section");
    block.className = "tournoi-classement";
    var title = document.createElement("h2");
    title.textContent = "Classement validé";
    block.appendChild(title);
    var list = document.createElement("ul");
    list.className = "tournoi-classement-list";
    for (var place = 1; place <= state.totalParticipants; place++) {
      var li = document.createElement("li");
      var label = document.createElement("span");
      label.className = "tournoi-classement-place";
      label.textContent = ordinalPlace(place) + " -";
      var nom = document.createElement("strong");
      nom.textContent = places[place] || "";
      li.appendChild(label);
      li.appendChild(nom);
      list.appendChild(li);
    }
    block.appendChild(list);
    return block;
  }

  function ordinalPlace(place) {
    return place === 1 ? "1er" : place + "ème";
  }

  function render() {
    if (!bracketEl) return;
    OutilsDom.clear(bracketEl);
    montrerMsg("");
    renderMatchsAJouer();

    if (!state.rounds.length && !(state.tables && state.tables.length)) {
      bracketEl.appendChild(
        OutilsDom.emptyState("Ajoutez les participants puis générez le tournoi.")
      );
      return;
    }

    if (state.format === "classement") {
      (state.tables || []).forEach(function (table) {
        bracketEl.appendChild(renderTable(table));
      });
      var classement = renderClassement();
      if (classement) bracketEl.appendChild(classement);
    } else {
      bracketEl.appendChild(
        renderTable({
          id: "principal",
          title: "Tableau principal",
          rounds: state.rounds,
        })
      );
    }
    requestAnimationFrame(drawConnectors);
  }

  function ensureConnectorSvg() {
    if (!bracketWrapEl) return null;
    var svg = bracketWrapEl.querySelector(".tournoi-connectors");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "tournoi-connectors");
      svg.setAttribute("aria-hidden", "true");
      bracketWrapEl.insertBefore(svg, bracketEl);
    }
    return svg;
  }

  function matchNode(tableId, roundIndex, matchIndex) {
    return bracketEl.querySelector(
      '.tournoi-match[data-table="' +
        tableId +
        '"][data-round="' +
        roundIndex +
        '"][data-match="' +
        matchIndex +
        '"]'
    );
  }

  function drawSegment(svg, x1, y1, x2, y2) {
    var mid = x1 + Math.max(18, (x2 - x1) / 2);
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M" + x1 + " " + y1 + " H" + mid + " V" + y2 + " H" + x2);
    path.setAttribute("class", "tournoi-connector-path");
    svg.appendChild(path);
  }

  function drawConnectors() {
    if (!bracketEl || (!state.rounds.length && !(state.tables && state.tables.length))) return;
    var svg = ensureConnectorSvg();
    if (!svg || !bracketWrapEl) return;
    OutilsDom.clear(svg);
    var wrapRect = bracketWrapEl.getBoundingClientRect();
    var width = bracketEl.scrollWidth;
    var height = bracketEl.scrollHeight;
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    var tables = state.format === "classement" ? state.tables || [] : [{ id: "principal", rounds: state.rounds }];
    tables.forEach(function (table) {
      for (var r = 1; r < table.rounds.length; r++) {
        table.rounds[r].forEach(function (_match, m) {
          var target = matchNode(table.id, r, m);
          if (!target) return;
          var targetRect = target.getBoundingClientRect();
          var x2 = targetRect.left - wrapRect.left + bracketWrapEl.scrollLeft;
          var y2 = targetRect.top - wrapRect.top + bracketWrapEl.scrollTop + targetRect.height / 2;
          [m * 2, m * 2 + 1].forEach(function (sourceIndex) {
            var source = matchNode(table.id, r - 1, sourceIndex);
            if (!source) return;
            var sourceRect = source.getBoundingClientRect();
            var x1 = sourceRect.right - wrapRect.left + bracketWrapEl.scrollLeft;
            var y1 = sourceRect.top - wrapRect.top + bracketWrapEl.scrollTop + sourceRect.height / 2;
            drawSegment(svg, x1, y1, x2, y2);
          });
        });
      }
    });
  }

  if (textareaEl) {
    textareaEl.addEventListener("input", function () {
      if (listeSaisieMeta) listeSaisieMeta.refresh();
    });
  }
  if (btnValiderListe) btnValiderListe.addEventListener("click", validerListeManuelle);
  formatEls.forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      setFormat(input.value);
      save();
    });
  });
  if (btnGenerer) {
    btnGenerer.addEventListener("click", function () {
      generer(false);
    });
  }
  if (btnGenererAleatoire) {
    btnGenererAleatoire.addEventListener("click", function () {
      generer(true);
    });
  }
  if (btnEffacerResultats) btnEffacerResultats.addEventListener("click", resetResults);
  if (btnEffacer) btnEffacer.addEventListener("click", effacer);
  if (btnImportClasse) btnImportClasse.addEventListener("click", importerClasse);
  if (bracketWrapEl) bracketWrapEl.addEventListener("scroll", drawConnectors);
  window.addEventListener("resize", drawConnectors);

  function demarrerSession() {
    return load().then(function () {
      renderSeedingList();
      autoAdvanceByes();
      render();
    });
  }

  if (typeof SessionManager !== "undefined" && typeof DataManager !== "undefined") {
    SessionManager.init({
      toolId: DataManager.SESSION_TOOLS.TOURNOI,
      toolLabel: "Tournoi éliminatoire",
      onSessionReady: demarrerSession,
      onSessionCleared: function () {
        reinitialiserEtat();
        renderSeedingList();
        render();
      },
    });
  } else {
    montrerMsg("Gestion des séances indisponible.");
    renderSeedingList();
    render();
  }
})();
