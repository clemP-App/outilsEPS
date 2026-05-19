/**
 * Pyramide de victoires — tournoi par paliers (montée uniquement).
 */
(function () {
  "use strict";

  var msgEl = document.getElementById("pyramide-msg");
  var listeBruteEl = document.getElementById("pyramide-liste-brute");
  var nbJoueursEl = document.getElementById("pyramide-nb-joueurs");
  var joueursListEl = document.getElementById("pyramide-joueurs-list");
  var classementEl = document.getElementById("pyramide-classement");
  var boardEl = document.getElementById("pyramide-board");
  var historiqueEl = document.getElementById("pyramide-historique");
  var gagnantEl = document.getElementById("pyramide-gagnant");
  var perdantEl = document.getElementById("pyramide-perdant");
  var matchSubmitEl = document.getElementById("pyramide-match-submit");
  var matchFormEl = document.getElementById("pyramide-match-form");
  var joueursPanelEl = document.getElementById("pyramide-joueurs-panel");

  var tournoi = { players: [], matches: [] };

  function fermerAccordeonJoueurs() {
    if (joueursPanelEl) joueursPanelEl.open = false;
  }

  function montrerMsg(texte, erreur) {
    if (!msgEl) return;
    if (!texte) {
      msgEl.hidden = true;
      msgEl.textContent = "";
      msgEl.classList.remove("msg-ok");
      return;
    }
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.toggle("msg-error", !!erreur);
    msgEl.classList.remove("msg-ok");
  }

  function montrerOk(texte) {
    if (!msgEl) return;
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.remove("msg-error");
    msgEl.classList.add("msg-ok");
  }

  function normaliserNom(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function eleveVersNom(e) {
    return normaliserNom([e.prenom, e.nom].filter(Boolean).join(" "));
  }

  function libelleNb(n) {
    var nb = n || 0;
    return nb <= 1 ? nb + " joueur" : nb + " joueurs";
  }

  function genererId(prefix) {
    if (typeof DataManager !== "undefined" && DataManager.genererId) {
      return DataManager.genererId(prefix || "pyr");
    }
    return (prefix || "pyr") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function creerJoueur(nom) {
    return {
      id: genererId("joueur"),
      name: nom,
      wins: 0,
      joinedAt: Date.now(),
      reachedAt: {},
    };
  }

  function getJoueur(id) {
    return tournoi.players.filter(function (p) {
      return p.id === id;
    })[0];
  }

  function palierLabel(wins) {
    if (wins === 0) return "Départ";
    if (wins === 1) return "1 victoire";
    return wins + " victoires";
  }

  function recomputeFromMatches(data) {
    data.players.forEach(function (p) {
      p.wins = 0;
      p.reachedAt = {};
    });
    var ordered = (data.matches || []).slice().sort(function (a, b) {
      return (a.at || 0) - (b.at || 0);
    });
    ordered.forEach(function (m) {
      var winner = data.players.filter(function (p) {
        return p.id === m.winnerId;
      })[0];
      if (!winner) return;
      if (m.auto) {
        var niveauAuto = winner.wins + 1;
        if (!winner.reachedAt[niveauAuto]) {
          winner.reachedAt[niveauAuto] = m.at || Date.now();
        }
        winner.wins += 1;
        return;
      }
      var loser = data.players.filter(function (p) {
        return p.id === m.loserId;
      })[0];
      if (!loser) return;
      if (winner.wins !== loser.wins) return;
      var niveau = winner.wins + 1;
      if (!winner.reachedAt[niveau]) {
        winner.reachedAt[niveau] = m.at || Date.now();
      }
      winner.wins += 1;
    });
  }

  function palierBas() {
    if (!tournoi.players.length) return -1;
    var min = tournoi.players[0].wins;
    tournoi.players.forEach(function (p) {
      if (p.wins < min) min = p.wins;
    });
    return min;
  }

  function joueurSeulEnBas() {
    if (tournoi.players.length < 2) return null;
    var bas = palierBas();
    var groupe = tournoi.players.filter(function (p) {
      return p.wins === bas;
    });
    if (groupe.length !== 1) return null;
    return groupe[0];
  }

  function appliquerVictoiresAutomatiques() {
    var securite = 0;
    while (securite < 50) {
      securite++;
      var seul = joueurSeulEnBas();
      if (!seul) break;
      tournoi.matches.push({
        id: genererId("match"),
        at: Date.now(),
        winnerId: seul.id,
        loserId: null,
        winnerWinsBefore: seul.wins,
        auto: true,
      });
      recomputeFromMatches(tournoi);
    }
  }

  function synchroniserEtat() {
    recomputeFromMatches(tournoi);
    appliquerVictoiresAutomatiques();
  }

  function contientJoueur(nom) {
    var n = normaliserNom(nom).toLowerCase();
    return tournoi.players.some(function (p) {
      return p.name.toLowerCase() === n;
    });
  }

  function ajouterNomsJoueurs(noms) {
    var ajouts = 0;
    noms.forEach(function (nom) {
      var n = normaliserNom(nom);
      if (!n || contientJoueur(n)) return;
      tournoi.players.push(creerJoueur(n));
      ajouts++;
    });
    return ajouts;
  }

  function parserTextarea() {
    if (!listeBruteEl) return [];
    return listeBruteEl.value
      .split(/\r?\n/)
      .map(normaliserNom)
      .filter(Boolean);
  }

  function classementJoueurs() {
    return tournoi.players
      .slice()
      .sort(function (a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        var ta = a.reachedAt[a.wins] != null ? a.reachedAt[a.wins] : a.joinedAt;
        var tb = b.reachedAt[b.wins] != null ? b.reachedAt[b.wins] : b.joinedAt;
        if (ta !== tb) return ta - tb;
        return a.joinedAt - b.joinedAt;
      });
  }

  function joueursParPalier() {
    var map = {};
    tournoi.players.forEach(function (p) {
      var w = p.wins;
      if (!map[w]) map[w] = [];
      map[w].push(p);
    });
    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) {
        var ta = a.reachedAt[a.wins] != null ? a.reachedAt[a.wins] : a.joinedAt;
        var tb = b.reachedAt[b.wins] != null ? b.reachedAt[b.wins] : b.joinedAt;
        return ta - tb;
      });
    });
    return map;
  }

  function adversairesPossibles(winnerId) {
    var winner = getJoueur(winnerId);
    if (!winner) return [];
    return tournoi.players.filter(function (p) {
      return p.id !== winner.id && p.wins === winner.wins;
    });
  }

  function dejaAffrontes(id1, id2) {
    return (tournoi.matches || []).some(function (m) {
      if (m.auto) return false;
      return (
        (m.winnerId === id1 && m.loserId === id2) ||
        (m.winnerId === id2 && m.loserId === id1)
      );
    });
  }

  function sauver() {
    if (typeof DataManager === "undefined" || !DataManager.savePyramideVictoires) {
      return Promise.resolve();
    }
    return DataManager.savePyramideVictoires(tournoi).catch(function () {
      montrerMsg("Impossible d’enregistrer les données.", true);
    });
  }

  function majNbJoueurs() {
    if (nbJoueursEl) nbJoueursEl.textContent = libelleNb(tournoi.players.length);
  }

  function renderJoueurs() {
    if (!joueursListEl) return;
    OutilsDom.clear(joueursListEl);
    majNbJoueurs();
    if (!tournoi.players.length) {
      var vide = document.createElement("li");
      vide.className = "pyramide-empty";
      vide.textContent = "Aucun joueur pour le moment.";
      joueursListEl.appendChild(vide);
      return;
    }
    tournoi.players
      .slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr");
      })
      .forEach(function (p) {
        var li = document.createElement("li");
        li.className = "pyramide-joueur-item";
        var nom = document.createElement("span");
        nom.textContent = p.name;
        var meta = document.createElement("span");
        meta.className = "pyramide-joueur-item__meta";
        meta.textContent = palierLabel(p.wins);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--ghost btn--small";
        btn.textContent = "Retirer";
        btn.addEventListener("click", function () {
          retirerJoueur(p.id);
        });
        li.appendChild(nom);
        li.appendChild(meta);
        li.appendChild(btn);
        joueursListEl.appendChild(li);
      });
  }

  function renderClassement() {
    if (!classementEl) return;
    OutilsDom.clear(classementEl);
    var liste = classementJoueurs();
    if (!liste.length) {
      var vide = document.createElement("li");
      vide.className = "pyramide-empty";
      vide.textContent = "—";
      classementEl.appendChild(vide);
      return;
    }
    liste.forEach(function (p, idx) {
      var li = document.createElement("li");
      li.className = "pyramide-classement__item";
      var rang = document.createElement("span");
      rang.className = "pyramide-classement__rang";
      rang.textContent = String(idx + 1);
      var nom = document.createElement("span");
      nom.className = "pyramide-classement__nom";
      nom.textContent = p.name;
      var vict = document.createElement("span");
      vict.className = "pyramide-classement__v";
      vict.textContent = palierLabel(p.wins);
      li.appendChild(rang);
      li.appendChild(nom);
      li.appendChild(vict);
      classementEl.appendChild(li);
    });
  }

  function renderBoard() {
    if (!boardEl) return;
    OutilsDom.clear(boardEl);
    if (!tournoi.players.length) {
      boardEl.appendChild(OutilsDom.emptyState("Aucun joueur."));
      return;
    }
    var parPalier = joueursParPalier();
    var niveaux = Object.keys(parPalier)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    var desktop = document.createElement("div");
    desktop.className = "pyramide-board__cols";
    niveaux.forEach(function (wins) {
      var col = document.createElement("section");
      col.className = "pyramide-col";
      var titre = document.createElement("h3");
      titre.className = "pyramide-col__title";
      titre.textContent = palierLabel(wins);
      col.appendChild(titre);
      var ul = document.createElement("ul");
      ul.className = "pyramide-col__list";
      parPalier[wins].forEach(function (p) {
        var li = document.createElement("li");
        li.textContent = p.name;
        ul.appendChild(li);
      });
      col.appendChild(ul);
      desktop.appendChild(col);
    });
    boardEl.appendChild(desktop);

    var mobile = document.createElement("div");
    mobile.className = "pyramide-board__stack";
    niveaux.forEach(function (wins) {
      var sep = document.createElement("div");
      sep.className = "pyramide-stack-sep";
      sep.setAttribute("role", "separator");
      sep.textContent = palierLabel(wins);
      mobile.appendChild(sep);
      var bloc = document.createElement("ul");
      bloc.className = "pyramide-stack-bloc";
      parPalier[wins].forEach(function (p) {
        var li = document.createElement("li");
        li.textContent = p.name;
        bloc.appendChild(li);
      });
      mobile.appendChild(bloc);
    });
    boardEl.appendChild(mobile);
  }

  function renderMatchForm() {
    if (!gagnantEl || !perdantEl) return;
    OutilsDom.clear(gagnantEl);
    OutilsDom.clear(perdantEl);
    matchSubmitEl.disabled = true;
    perdantEl.disabled = true;

    if (tournoi.players.length < 2) {
      var o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = "Ajoutez au moins 2 joueurs";
      gagnantEl.appendChild(o0);
      gagnantEl.disabled = true;
      var o1 = document.createElement("option");
      o1.value = "";
      o1.textContent = "—";
      perdantEl.appendChild(o1);
      return;
    }
    gagnantEl.disabled = false;
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Choisir le gagnant —";
    gagnantEl.appendChild(opt0);
    tournoi.players
      .slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name, "fr");
      })
      .forEach(function (p) {
        var adv = adversairesPossibles(p.id).filter(function (a) {
          return !dejaAffrontes(p.id, a.id);
        });
        if (!adv.length) return;
        var o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name + " (" + palierLabel(p.wins) + ")";
        gagnantEl.appendChild(o);
      });
    var optP = document.createElement("option");
    optP.value = "";
    optP.textContent = "— Choisir le gagnant d’abord —";
    perdantEl.appendChild(optP);
  }

  function majPerdants() {
    if (!gagnantEl || !perdantEl) return;
    OutilsDom.clear(perdantEl);
    var winnerId = gagnantEl.value;
    if (!winnerId) {
      perdantEl.disabled = true;
      matchSubmitEl.disabled = true;
      var o = document.createElement("option");
      o.value = "";
      o.textContent = "— Choisir le gagnant d’abord —";
      perdantEl.appendChild(o);
      return;
    }
    var adv = adversairesPossibles(winnerId).filter(function (a) {
      return !dejaAffrontes(winnerId, a.id);
    });
    if (!adv.length) {
      perdantEl.disabled = true;
      matchSubmitEl.disabled = true;
      var vide = document.createElement("option");
      vide.value = "";
      vide.textContent = "Aucun adversaire disponible sur ce palier";
      perdantEl.appendChild(vide);
      return;
    }
    perdantEl.disabled = false;
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Choisir le perdant —";
    perdantEl.appendChild(opt0);
    adv.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      perdantEl.appendChild(opt);
    });
    matchSubmitEl.disabled = !perdantEl.value;
  }

  function renderHistorique() {
    if (!historiqueEl) return;
    OutilsDom.clear(historiqueEl);
    if (!tournoi.matches.length) {
      var vide = document.createElement("li");
      vide.className = "pyramide-empty";
      vide.textContent = "Aucun match enregistré.";
      historiqueEl.appendChild(vide);
      return;
    }
    var ordered = tournoi.matches.slice().sort(function (a, b) {
      return (b.at || 0) - (a.at || 0);
    });
    ordered.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "pyramide-historique__item";
      var texte = document.createElement("span");
      var winner = getJoueur(m.winnerId);
      var loser = m.auto ? null : getJoueur(m.loserId);
      if (m.auto) {
        var avant = m.winnerWinsBefore != null ? m.winnerWinsBefore : 0;
        texte.textContent =
          (winner ? winner.name : "?") +
          " — victoire automatique (" +
          palierLabel(avant) +
          " → " +
          palierLabel(avant + 1) +
          ")";
      } else {
        texte.textContent =
          (winner ? winner.name : "?") +
          " bat " +
          (loser ? loser.name : "?") +
          " (" +
          palierLabel(m.winnerWinsBefore != null ? m.winnerWinsBefore : 0) +
          ")";
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--ghost btn--small";
      btn.textContent = "Supprimer";
      btn.addEventListener("click", function () {
        supprimerMatch(m.id);
      });
      li.appendChild(texte);
      li.appendChild(btn);
      historiqueEl.appendChild(li);
    });
  }

  function render() {
    renderJoueurs();
    renderClassement();
    renderBoard();
    renderMatchForm();
    renderHistorique();
    if (matchFormEl) matchFormEl.reset();
    majPerdants();
  }

  function validerListe() {
    var lignes = parserTextarea();
    if (!lignes.length) {
      montrerMsg("Saisissez au moins un nom (un par ligne).");
      return;
    }
    var ajouts = ajouterNomsJoueurs(lignes);
    if (listeBruteEl) listeBruteEl.value = "";
    synchroniserEtat();
    if (ajouts) {
      montrerOk(ajouts + " joueur(s) ajouté(s).");
    } else {
      montrerMsg("Aucun nouveau joueur (doublons ignorés).");
    }
    sauver().then(render);
  }

  function viderJoueurs() {
    if (!tournoi.players.length) return;
    if (!confirm("Vider toute la liste des joueurs et l’historique des matchs ?")) return;
    tournoi.players = [];
    tournoi.matches = [];
    if (listeBruteEl) listeBruteEl.value = "";
    montrerMsg("");
    sauver().then(render);
  }

  function retirerJoueur(id) {
    var lie = tournoi.matches.some(function (m) {
      return m.winnerId === id || m.loserId === id;
    });
    if (lie) {
      montrerMsg("Ce joueur a des matchs : supprimez-les d’abord.", true);
      return;
    }
    if (!confirm("Retirer ce joueur ?")) return;
    tournoi.players = tournoi.players.filter(function (p) {
      return p.id !== id;
    });
    synchroniserEtat();
    sauver().then(render);
  }

  function enregistrerMatch(winnerId, loserId) {
    var winner = getJoueur(winnerId);
    var loser = getJoueur(loserId);
    if (!winner || !loser) {
      montrerMsg("Joueurs introuvables.", true);
      return;
    }
    if (winner.id === loser.id) {
      montrerMsg("Le gagnant et le perdant doivent être différents.", true);
      return;
    }
    if (winner.wins !== loser.wins) {
      montrerMsg("Les deux joueurs doivent être sur le même palier.", true);
      return;
    }
    if (dejaAffrontes(winner.id, loser.id)) {
      montrerMsg("Ces joueurs se sont déjà affrontés à ce palier.", true);
      return;
    }
    tournoi.matches.push({
      id: genererId("match"),
      at: Date.now(),
      winnerId: winner.id,
      loserId: loser.id,
      winnerWinsBefore: winner.wins,
      loserWinsBefore: loser.wins,
      auto: false,
    });
    synchroniserEtat();
    montrerOk("Match enregistré.");
    fermerAccordeonJoueurs();
    sauver().then(render);
  }

  function supprimerMatch(matchId) {
    if (!confirm("Supprimer ce match ? Les paliers seront recalculés.")) return;
    tournoi.matches = tournoi.matches.filter(function (m) {
      return m.id !== matchId;
    });
    synchroniserEtat();
    montrerOk("Match supprimé.");
    sauver().then(render);
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.", true);
      return;
    }
    ClassImport.open({
      title: "Importer des élèves",
      hint: "Cochez les élèves à ajouter à la liste des joueurs.",
      onConfirm: function (eleves, classe) {
        var noms = eleves.map(eleveVersNom).filter(Boolean);
        var ajouts = ajouterNomsJoueurs(noms);
        synchroniserEtat();
        if (ajouts) {
          montrerOk(ajouts + " joueur(s) importé(s) depuis « " + classe.nom + " ».");
          sauver().then(render);
        } else {
          montrerMsg("Aucun nouveau joueur (doublons ignorés).");
          render();
        }
      },
    });
  }

  function init() {
    if (typeof DataManager !== "undefined" && DataManager.getPyramideVictoires) {
      return DataManager.ready.then(function () {
        return DataManager.getPyramideVictoires();
      }).then(function (data) {
        tournoi = {
          players: data.players || [],
          matches: data.matches || [],
        };
        synchroniserEtat();
        render();
      });
    }
    render();
  }

  if (document.getElementById("btn-import-classe-pyramide")) {
    document.getElementById("btn-import-classe-pyramide").addEventListener("click", importerClasse);
  }
  if (document.getElementById("btn-valider-liste-pyramide")) {
    document.getElementById("btn-valider-liste-pyramide").addEventListener("click", validerListe);
  }
  if (document.getElementById("btn-vider-joueurs-pyramide")) {
    document.getElementById("btn-vider-joueurs-pyramide").addEventListener("click", viderJoueurs);
  }
  if (gagnantEl) gagnantEl.addEventListener("change", majPerdants);
  if (perdantEl) {
    perdantEl.addEventListener("change", function () {
      matchSubmitEl.disabled = !perdantEl.value;
    });
  }
  if (matchFormEl) {
    matchFormEl.addEventListener("submit", function (e) {
      e.preventDefault();
      enregistrerMatch(gagnantEl.value, perdantEl.value);
    });
  }

  init();
})();
