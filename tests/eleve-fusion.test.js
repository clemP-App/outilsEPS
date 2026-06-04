"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
var EleveFusion = require("../shared/eleve-fusion.js");

describe("eleve-fusion", function () {
  it("détecte un conflit sur la colonne équipe", function () {
    var liste = [
      { id: "1", nom: "Dupont", prenom: "Léa", equipe: "Bleue", niveau: "3" },
    ];
    var imports = [{ nom: "Dupont", prenom: "Léa", equipe: "Rouge", niveau: "3" }];
    var conflits = EleveFusion.detecterConflitsColonnes(liste, imports, ["equipe", "niveau"]);
    assert.equal(conflits.length, 1);
    assert.equal(conflits[0].champ, "equipe");
    assert.equal(conflits[0].count, 1);
  });

  it("ne signale pas de conflit si une valeur est vide", function () {
    var liste = [{ id: "1", nom: "Dupont", prenom: "Léa", equipe: "Bleue" }];
    var imports = [{ nom: "Dupont", prenom: "Léa", equipe: "Rouge" }];
    var sansEps = EleveFusion.detecterConflitsColonnes(
      [{ id: "1", nom: "Dupont", prenom: "Léa" }],
      imports,
      ["equipe"]
    );
    assert.equal(sansEps.length, 0);
  });

  it("respecte la priorité EPS sur un conflit", function () {
    var liste = [{ id: "1", nom: "Dupont", prenom: "Léa", niveau: "4" }];
    var imports = [{ nom: "Dupont", prenom: "Léa", niveau: "2" }];
    EleveFusion.fusionnerElevesDansListe(liste, imports, {
      priorites: { niveau: "eps" },
      champsActifs: ["niveau"],
    });
    assert.equal(liste[0].niveau, "4");
  });

  it("respecte la priorité CSV sur un conflit", function () {
    var liste = [{ id: "1", nom: "Dupont", prenom: "Léa", niveau: "4" }];
    var imports = [{ nom: "Dupont", prenom: "Léa", niveau: "2" }];
    EleveFusion.fusionnerElevesDansListe(liste, imports, {
      priorites: { niveau: "csv" },
      champsActifs: ["niveau"],
    });
    assert.equal(liste[0].niveau, "2");
  });

  it("complète un champ vide sans conflit", function () {
    var liste = [{ id: "1", nom: "Dupont", prenom: "Léa" }];
    var imports = [{ nom: "Dupont", prenom: "Léa", commentaire: "Sportif" }];
    EleveFusion.fusionnerElevesDansListe(liste, imports);
    assert.equal(liste[0].commentaire, "Sportif");
  });
});
