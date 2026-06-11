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
  var btnExportPdf = document.getElementById("tournoi-export-pdf");

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
    if (state.format === "classement") assurerTableauxPerdants();
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

  function preCreerTousTableauxPerdants(table) {
    if (!table || !table.rounds || !table.rounds.length) return;
    var lastRound = table.rounds.length - 1;
    for (var r = 0; r < lastRound; r++) {
      var child = getOrCreateLoserTable(table, r);
      if (child) preCreerTousTableauxPerdants(child);
    }
  }

  function assurerTableauxPerdants() {
    if (state.format !== "classement" || !tableauDejaGenere()) return;
    var main = findTable("principal");
    if (!main) return;
    preCreerTousTableauxPerdants(main);
  }

  function tableauxPerdantsTries() {
    return (state.tables || [])
      .filter(function (table) {
        return table.id !== "principal";
      })
      .sort(function (a, b) {
        return (a.rangeStart || 0) - (b.rangeStart || 0);
      });
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
    return false;
  }

  function emptySlotLabel(tableId, roundIndex, matchIndex, slotIndex) {
    return isExemptSlot(tableId, roundIndex, matchIndex, slotIndex) ? "Exempt" : "Attente de joueur";
  }

  function hintSourcePerdantSlot(table, matchIndex, slotIndex) {
    table = tableCompletPourPdf(table);
    if (!table || table.sourceTableId == null || table.sourceRound == null) return "";
    var parent = findTable(table.sourceTableId);
    if (!parent || !parent.rounds[table.sourceRound]) return "";
    var parentMatchIndex = matchIndex * 2 + slotIndex;
    if (!parent.rounds[table.sourceRound][parentMatchIndex]) return "";
    return "Perdant " + matchLabel(table.sourceRound, parentMatchIndex, parent.rounds.length);
  }

  function tableCompletPourPdf(table) {
    if (!table) return null;
    if (table.bracketSize != null && table.rangeStart != null) return table;
    return findTable(table.id) || table;
  }

  function hintDestinationPerdantMatch(table, roundIndex) {
    if (state.format !== "classement" || !table) return "";
    var t = tableCompletPourPdf(table);
    if (!t || t.bracketSize == null || t.rangeStart == null) return "";
    var range = loserRange(t, roundIndex);
    if (range.size < 2 || isNaN(range.start) || isNaN(range.end)) return "";
    return "Perdant - " + rangeTitle(range.start, range.end);
  }

  function libelleSlotVideTournoi(table, tableId, roundIndex, matchIndex, slotIndex) {
    if (isExemptSlot(tableId, roundIndex, matchIndex, slotIndex)) return "Exempt";
    if (roundIndex === 0 && table) {
      var hint = hintSourcePerdantSlot(table, matchIndex, slotIndex);
      if (hint) return hint;
    }
    return "Attente de joueur";
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
      assurerTableauxPerdants();
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

  function renderPlayer(table, tableId, match, player, roundIndex, matchIndex, slotIndex) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tournoi-player";
    if (!player) {
      var exempt = isExemptSlot(tableId, roundIndex, matchIndex, slotIndex);
      var slotLabel = libelleSlotVideTournoi(table, tableId, roundIndex, matchIndex, slotIndex);
      var isHint = !exempt && slotLabel.indexOf("Perdant ") === 0;
      btn.className += " is-empty" + (exempt ? " is-exempt" : isHint ? " is-perdant-hint" : " is-waiting");
      btn.disabled = true;
      btn.textContent = slotLabel;
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
        matchEl.className = "tournoi-match" + (r > 0 ? " tournoi-match--compact" : "");
        matchEl.setAttribute("data-table", table.id);
        matchEl.setAttribute("data-round", String(r));
        matchEl.setAttribute("data-match", String(m));
        var span = Math.pow(2, r);
        matchEl.style.gridRow = m * span + 2 + " / span " + span;
        var label = document.createElement("span");
        label.className = "tournoi-match__label";
        label.textContent = matchLabel(r, m, totalRounds);
        matchEl.appendChild(label);
        if (r === 0) {
          matchEl.appendChild(renderPlayer(table, table.id, match, match.players[0], r, m, 0));
          matchEl.appendChild(renderPlayer(table, table.id, match, match.players[1], r, m, 1));
        } else if (match.winner) {
          var winSlot = match.players[0] === match.winner ? 0 : 1;
          matchEl.appendChild(renderPlayer(table, table.id, match, match.winner, r, m, winSlot));
        } else {
          var hasP0 = !!match.players[0];
          var hasP1 = !!match.players[1];
          if (!hasP0 && !hasP1) {
            matchEl.appendChild(renderPlayer(table, table.id, match, null, r, m, 0));
          } else {
            if (hasP0) matchEl.appendChild(renderPlayer(table, table.id, match, match.players[0], r, m, 0));
            if (hasP1) matchEl.appendChild(renderPlayer(table, table.id, match, match.players[1], r, m, 1));
          }
        }
        var destHint = hintDestinationPerdantMatch(table, r);
        if (destHint) {
          var hintEl = document.createElement("span");
          hintEl.className = "tournoi-match__perdant-hint";
          hintEl.textContent = destHint;
          matchEl.appendChild(hintEl);
        }
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
      assurerTableauxPerdants();
      var main = findTable("principal");
      if (main) bracketEl.appendChild(renderTable(main));
      var perdants = tableauxPerdantsTries();
      if (perdants.length) {
        var sectionPerdants = document.createElement("section");
        sectionPerdants.className = "tournoi-perdants-section";
        var titrePerdants = document.createElement("h2");
        titrePerdants.className = "tournoi-perdants-title";
        titrePerdants.textContent = "Tableaux de reclassement (perdants)";
        sectionPerdants.appendChild(titrePerdants);
        var hintPerdants = document.createElement("p");
        hintPerdants.className = "hint tournoi-perdants-hint";
        hintPerdants.textContent =
          "Cases vides à compléter au fil des matchs, ou à imprimer pour noter les perdants à la main.";
        sectionPerdants.appendChild(hintPerdants);
        perdants.forEach(function (table) {
          sectionPerdants.appendChild(renderTable(table));
        });
        bracketEl.appendChild(sectionPerdants);
      }
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

  function slugExport(nom) {
    return String(nom || "tournoi")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function metaTablePdf(table, kind) {
    var src = tableCompletPourPdf(table) || table;
    return {
      id: src.id,
      title: src.title || "Tableau",
      rounds: src.rounds,
      rangeStart: src.rangeStart,
      rangeEnd: src.rangeEnd,
      bracketSize: src.bracketSize,
      sourceTableId: src.sourceTableId,
      sourceRound: src.sourceRound,
      kind: kind || "principal",
    };
  }

  function tablesPourExport() {
    if (state.format === "classement") {
      assurerTableauxPerdants();
      var out = [];
      var main = findTable("principal");
      if (main) out.push(metaTablePdf(main, "principal"));
      tableauxPerdantsTries().forEach(function (table) {
        out.push(metaTablePdf(table, "perdant"));
      });
      return out;
    }
    if (!state.rounds.length) return [];
    return [
      metaTablePdf(
        {
          id: "principal",
          title: "Tableau principal",
          rounds: state.rounds,
          rangeStart: 1,
          rangeEnd: state.totalParticipants,
          bracketSize: state.size,
        },
        "principal"
      ),
    ];
  }

  function libelleJoueurPdf(table, tableId, roundIndex, matchIndex, slotIndex, player) {
    if (player) return { text: player, kind: "player" };
    if (isExemptSlot(tableId, roundIndex, matchIndex, slotIndex)) {
      return { text: "Exempt", kind: "exempt" };
    }
    if (roundIndex === 0 && table) {
      var hint = hintSourcePerdantSlot(table, matchIndex, slotIndex);
      if (hint) return { text: hint, kind: "perdant-hint" };
    }
    return { text: "", kind: "empty" };
  }

  function tronquerTextePdf(doc, texte, maxW, taille) {
    doc.setFontSize(taille);
    var t = String(texte || "");
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
    return t + "…";
  }

  function centreMatchPdf(roundIndex, matchIndex, slotH, debutContenuY) {
    return debutContenuY + (matchIndex * Math.pow(2, roundIndex) + Math.pow(2, roundIndex - 1)) * slotH;
  }

  function dessinerConnecteurPdf(doc, x1, y1, x2, y2, couleur) {
    var mid = x1 + Math.max(4, (x2 - x1) / 2);
    doc.setDrawColor(couleur[0], couleur[1], couleur[2]);
    doc.setLineWidth(0.25);
    doc.line(x1, y1, mid, y1);
    doc.line(mid, y1, mid, y2);
    doc.line(mid, y2, x2, y2);
  }

  function metriquesMatchPdf(roundIndex) {
    var compact = roundIndex > 0;
    var labelH = 2.8;
    var labelSize = 6.2;
    var hintH = state.format === "classement" ? 2.5 : 0;
    var pad = 0.28;
    var playerH = compact ? 3.8 : 3.5;
    var playerGap = compact ? 0 : 0.22;
    var fontSize = compact ? 6.4 : 6.8;
    var boxH = compact
      ? labelH + playerH + pad * 2 + hintH
      : labelH + playerH * 2 + playerGap + pad * 3 + hintH;
    return {
      boxH: boxH,
      labelH: labelH,
      labelSize: labelSize,
      playerH: playerH,
      playerGap: playerGap,
      fontSize: fontSize,
      pad: pad,
      hintH: hintH,
      compact: compact,
    };
  }

  function dessinerJoueurPdf(doc, x, y, w, h, slot, opts) {
    opts = opts || {};
    var taille = opts.fontSize || 7.5;
    var isHint = slot.kind === "perdant-hint";
    var isEmpty = slot.kind === "empty" || slot.kind === "exempt";
    var fond = opts.winner ? [240, 253, 250] : isEmpty && !isHint ? [248, 250, 252] : [255, 255, 255];
    var bord = opts.winner ? [13, 148, 136] : [226, 232, 240];
    doc.setFillColor(fond[0], fond[1], fond[2]);
    doc.setDrawColor(bord[0], bord[1], bord[2]);
    doc.setLineWidth(opts.winner ? 0.3 : 0.18);
    var radius = Math.min(1.2, h * 0.2);
    doc.roundedRect(x, y, w, h, radius, radius, "FD");
    if (!slot.text) return;
    doc.setFont("helvetica", opts.winner ? "bold" : "normal");
    doc.setFontSize(isHint ? Math.min(taille, 5.4) : taille);
    if (isHint || (isEmpty && slot.kind === "exempt")) doc.setTextColor(148, 163, 184);
    else if (opts.winner) doc.setTextColor(15, 118, 110);
    else doc.setTextColor(15, 23, 42);
    doc.text(
      tronquerTextePdf(doc, slot.text, w - 2.5, isHint ? Math.min(taille, 5.4) : taille),
      x + 1.2,
      y + h * 0.68
    );
  }

  function dessinerSlotsMatchPdf(doc, table, tableId, match, roundIndex, matchIndex, x, y, innerW, m, fontSize) {
    function drawSlot(slotIndex, slotY, slot, slotH) {
      dessinerJoueurPdf(doc, x, slotY, innerW, slotH || m.playerH, slot, {
        winner: !!match.players[slotIndex] && match.winner === match.players[slotIndex],
        fontSize: fontSize,
      });
    }

    if (!m.compact) {
      var p1y = y;
      var p2y = y + m.playerH + m.playerGap;
      drawSlot(0, p1y, libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 0, match.players[0]));
      drawSlot(1, p2y, libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 1, match.players[1]));
      return;
    }

    if (match.winner) {
      var winSlot = match.players[0] === match.winner ? 0 : 1;
      drawSlot(winSlot, y, libelleJoueurPdf(table, tableId, roundIndex, matchIndex, winSlot, match.winner));
      return;
    }
    if (match.players[0] && match.players[1]) {
      var halfH = Math.max(2.6, m.playerH / 2 - 0.1);
      drawSlot(
        0,
        y,
        libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 0, match.players[0]),
        halfH
      );
      drawSlot(
        1,
        y + halfH + 0.1,
        libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 1, match.players[1]),
        halfH
      );
      return;
    }
    if (match.players[0]) {
      drawSlot(0, y, libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 0, match.players[0]));
      return;
    }
    if (match.players[1]) {
      drawSlot(1, y, libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 1, match.players[1]));
      return;
    }
    drawSlot(0, y, libelleJoueurPdf(table, tableId, roundIndex, matchIndex, 0, null));
  }

  function dessinerMatchPdf(doc, table, tableId, match, roundIndex, matchIndex, totalRounds, x, centreY, boxW) {
    var m = metriquesMatchPdf(roundIndex);
    var y = centreY - m.boxH / 2;
    var innerW = boxW - 2.4;
    var fontSize = boxW < 36 ? Math.min(m.fontSize, 6.2) : m.fontSize;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, y, boxW, m.boxH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.labelSize);
    doc.setTextColor(100, 116, 139);
    doc.text(
      tronquerTextePdf(doc, matchLabel(roundIndex, matchIndex, totalRounds), innerW, m.labelSize),
      x + 1.2,
      y + m.labelH * 0.72
    );

    var slotsY = y + m.labelH + m.pad;
    dessinerSlotsMatchPdf(doc, table, tableId, match, roundIndex, matchIndex, x + 1.2, slotsY, innerW, m, fontSize);

    var destHint = hintDestinationPerdantMatch(table, roundIndex);
    if (destHint) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(148, 163, 184);
      doc.text(tronquerTextePdf(doc, destHint, innerW, 5.2), x + 1.2, y + m.boxH - 1.1);
    }

    return {
      left: x,
      right: x + boxW,
      centerY: centreY,
      top: y,
      bottom: y + m.boxH,
    };
  }

  var PDF_FOOTER_H = 10;
  var PDF_GAP_TABLE = 4;
  var PDF_SECTION_PERDANTS_H = 9;
  var PDF_TITRE_TABLE_H = 7;

  function hauteurIdealeTableauPdf(table) {
    var firstMatches = table.rounds[0] ? table.rounds[0].length : 1;
    var roundHeaderH = 8;
    var m0 = metriquesMatchPdf(0);
    var slotH = Math.max(m0.boxH + 0.5, 7.2);
    return roundHeaderH + firstMatches * slotH + 4;
  }

  function espaceRestantPdf(y, pageH, margin) {
    return pageH - y - margin - PDF_FOOTER_H;
  }

  function planifierHauteurTableauPdf(table, y, pageH, margin, overhead) {
    var restant = espaceRestantPdf(y, pageH, margin) - (overhead || 0);
    var ideal = hauteurIdealeTableauPdf(table);
    if (restant < 28) return { nouvellePage: true, hauteur: ideal };
    if (ideal <= restant) return { nouvellePage: false, hauteur: ideal };
    return { nouvellePage: false, hauteur: restant };
  }

  function dessinerTableauPdf(doc, table, zone) {
    var totalRounds = table.rounds.length;
    var firstMatches = table.rounds[0] ? table.rounds[0].length : 1;
    var colW = 46;
    var gap = 7;
    var bracketW = totalRounds * colW + Math.max(0, totalRounds - 1) * gap;
    if (bracketW > zone.w) {
      var scale = zone.w / bracketW;
      colW *= scale;
      gap *= scale;
      bracketW = zone.w;
    }

    var roundHeaderH = 8;
    var slotH = (zone.h - roundHeaderH) / firstMatches;
    var bracketH = roundHeaderH + firstMatches * slotH;
    var startX = zone.x + Math.max(0, (zone.w - bracketW) / 2);
    var debutContenuY = zone.y + roundHeaderH;
    var positions = [];

    table.rounds.forEach(function (round, r) {
      var colX = startX + r * (colW + gap);
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(153, 246, 228);
      doc.setLineWidth(0.12);
      doc.roundedRect(colX, zone.y, colW, bracketH, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(15, 118, 110);
      var titreTour = roundName(r, totalRounds).toUpperCase();
      doc.text(tronquerTextePdf(doc, titreTour, colW - 3, 7), colX + colW / 2, zone.y + 5.2, {
        align: "center",
      });

      positions[r] = [];
      round.forEach(function (match, m) {
        var centreY = centreMatchPdf(r, m, slotH, debutContenuY);
        var boxX = colX + 1.2;
        var boxW = colW - 2.4;
        positions[r][m] = dessinerMatchPdf(doc, table, table.id, match, r, m, totalRounds, boxX, centreY, boxW);
      });
    });

    var connectorColor = [94, 234, 212];
    for (var r = 1; r < totalRounds; r++) {
      table.rounds[r].forEach(function (_match, m) {
        var target = positions[r][m];
        if (!target) return;
        [m * 2, m * 2 + 1].forEach(function (sourceIndex) {
          var source = positions[r - 1][sourceIndex];
          if (!source) return;
          dessinerConnecteurPdf(doc, source.right, source.centerY, target.left, target.centerY, connectorColor);
        });
      });
    }

    return zone.y + bracketH + 6;
  }

  function classementPdfRempli() {
    if (!state.totalParticipants || !state.placements) return false;
    return Object.keys(state.placements).some(function (nom) {
      return !!state.placements[nom];
    });
  }

  function dessinerClassementPdf(doc, zone) {
    if (!state.totalParticipants || !classementPdfRempli()) return zone.y;
    var places = {};
    Object.keys(state.placements || {}).forEach(function (nom) {
      places[state.placements[nom]] = nom;
    });

    var y = zone.y;
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.setLineWidth(0.12);
    doc.roundedRect(zone.x, y, zone.w, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 118, 110);
    doc.text("Classement validé", zone.x + 2, y + 5.5);
    y += 11;

    for (var place = 1; place <= state.totalParticipants; place++) {
      if (y > zone.pageH - 14) {
        doc.addPage();
        y = zone.margin;
      }
      var nom = places[place] || "";
      if (!nom) continue;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(ordinalPlace(place), zone.x, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(tronquerTextePdf(doc, nom, zone.w - 18, 8), zone.x + 16, y + 4);
      y += 6.2;
    }
    return y + 4;
  }

  function exporterPdf() {
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Export PDF indisponible (jsPDF non chargé).");
      return;
    }
    if (!tableauDejaGenere()) {
      montrerMsg("Générez d’abord le tournoi pour exporter le tableau.");
      return;
    }

    var tables = tablesPourExport();
    if (!tables.length) {
      montrerMsg("Aucun tableau à exporter.");
      return;
    }

    var sess =
      typeof SessionManager !== "undefined" && SessionManager.getActiveSession
        ? SessionManager.getActiveSession()
        : null;
    var titreSeance = sess && sess.nom ? sess.nom : "Tournoi éliminatoire";
    var formatLabel =
      state.format === "classement" ? "Avec reclassement" : "Élimination directe";
    var meta =
      state.totalParticipants +
      " participant" +
      (state.totalParticipants > 1 ? "s" : "") +
      " · " +
      formatLabel +
      " · " +
      new Date().toLocaleString("fr-FR");

    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    var margin = 10;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - margin * 2;
    var headerH = 18;
    var y = margin;

    function entetePage() {
      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, pageW, headerH, "F");
      doc.setFillColor(17, 94, 89);
      doc.rect(0, headerH - 1.5, pageW, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Tournoi éliminatoire", margin, 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(tronquerTextePdf(doc, titreSeance, contentW * 0.55, 8.5), margin, 13.5);
      doc.text(tronquerTextePdf(doc, meta, contentW * 0.4, 8.5), pageW - margin, 13.5, { align: "right" });
      return headerH + 4;
    }

    function nouvellePageContenu() {
      doc.addPage();
      return entetePage();
    }

    y = entetePage();

    var sectionPerdantsPdf = false;
    tables.forEach(function (table, index) {
      var overhead = 0;
      if (table.kind === "perdant" && !sectionPerdantsPdf) overhead += PDF_SECTION_PERDANTS_H;
      if (table.title && (tables.length > 1 || table.kind === "perdant")) overhead += PDF_TITRE_TABLE_H;

      var plan = planifierHauteurTableauPdf(table, y, pageH, margin, overhead);
      if (plan.nouvellePage) {
        y = nouvellePageContenu();
        plan = planifierHauteurTableauPdf(table, y, pageH, margin, overhead);
      }

      if (table.kind === "perdant" && !sectionPerdantsPdf) {
        sectionPerdantsPdf = true;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 118, 110);
        doc.text("Tableaux de reclassement (perdants)", margin, y + 4);
        y += PDF_SECTION_PERDANTS_H;
      }
      if (table.title && (tables.length > 1 || table.kind === "perdant")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(table.title, margin, y + 4);
        y += PDF_TITRE_TABLE_H;
      }

      y = dessinerTableauPdf(doc, table, {
        x: margin,
        y: y,
        w: contentW,
        h: plan.hauteur,
        margin: margin,
        pageH: pageH,
      });
      if (index < tables.length - 1) y += PDF_GAP_TABLE;
    });

    if (state.format === "classement" && classementPdfRempli()) {
      var besoinClassement = 14;
      if (espaceRestantPdf(y, pageH, margin) < besoinClassement) {
        y = nouvellePageContenu();
      }
      y = dessinerClassementPdf(doc, {
        x: margin,
        y: y,
        w: contentW,
        pageH: pageH,
        margin: margin,
      });
    }

    var totalPages = doc.internal.getNumberOfPages();
    var p;
    for (p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Outils EPS — Tournoi éliminatoire · page " + p + " / " + totalPages, pageW / 2, pageH - 6, {
        align: "center",
      });
    }

    var fileBase = slugExport(titreSeance) || "tournoi";
    doc.save(fileBase + "-tableau.pdf");
    montrerMsg("Export PDF téléchargé.");
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
      if (state.format === "classement") assurerTableauxPerdants();
      save();
      render();
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
  if (btnExportPdf) btnExportPdf.addEventListener("click", exporterPdf);
  if (bracketWrapEl) bracketWrapEl.addEventListener("scroll", drawConnectors);
  window.addEventListener("resize", drawConnectors);

  function demarrerSession() {
    return load().then(function () {
      renderSeedingList();
      autoAdvanceByes();
      var nbTablesAvant = (state.tables || []).length;
      assurerTableauxPerdants();
      if ((state.tables || []).length > nbTablesAvant) save();
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
