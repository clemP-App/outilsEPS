"use strict";

var { describe, it } = require("node:test");
var assert = require("node:assert/strict");
require("../shared/equipe-couleur.js");
var ClasseCsvImport = require("../shared/classe-csv-import.js");

describe("classe-csv-import", function () {
  it("parse un CSV point-virgule avec guillemets", function () {
    var texte = 'Nom;Prénom;Date\n"DUPONT";Léa;14/05/2012\nMartin;Paul;';
    var parsed = ClasseCsvImport.parseCsvTexte(texte);
    assert.equal(parsed.delimiteur, ";");
    assert.equal(parsed.lignes.length, 3);
    assert.equal(parsed.lignes[1][0], "DUPONT");
    assert.equal(parsed.lignes[1][1], "Léa");
  });

  it("détecte une ligne d'en-tête", function () {
    var lignes = [
      ["Nom", "Prénom", "Sexe"],
      ["Dupont", "Léa", "F"],
    ];
    assert.equal(ClasseCsvImport.devinerEntete(lignes), true);
    assert.equal(ClasseCsvImport.devinerEntete([["Dupont", "Léa"]]), false);
  });

  it("devine le mapping depuis les en-têtes", function () {
    var mapping = ClasseCsvImport.devinerMapping(
      ["Nom de famille", "Prénom", "Date de naissance"],
      3
    );
    assert.equal(mapping.nom, 0);
    assert.equal(mapping.prenom, 1);
    assert.equal(mapping.dateNaissance, 2);
  });

  it("devine une colonne Nom & Prénom combinée", function () {
    var mapping = ClasseCsvImport.devinerMapping(["Nom & Prénom", "Classe"], 2);
    assert.equal(mapping.nom_et_prenom, 0);
    assert.equal(mapping.nom, undefined);
  });

  it("sépare NOM Prénom (majuscules)", function () {
    var r = ClasseCsvImport.separerNomPrenom("DUPONT Léa");
    assert.equal(r.nom, "DUPONT");
    assert.equal(r.prenom, "Léa");
  });

  it("sépare Prénom Nom", function () {
    var r = ClasseCsvImport.separerNomPrenom("Léa Dupont", "prenom_nom");
    assert.equal(r.prenom, "Léa");
    assert.equal(r.nom, "Dupont");
  });

  it("sépare avec virgule", function () {
    var r = ClasseCsvImport.separerNomPrenom("DUPONT, Léa");
    assert.equal(r.nom, "DUPONT");
    assert.equal(r.prenom, "Léa");
  });

  it("devine la colonne Équipe", function () {
    var mapping = ClasseCsvImport.devinerMapping(["Nom", "Prénom", "Équipe"], 3);
    assert.equal(mapping.equipe, 2);
  });

  it("devine et importe la colonne VMA", function () {
    var mapping = ClasseCsvImport.devinerMapping(["Nom", "Prénom", "VMA"], 3);
    assert.equal(mapping.vma, 2);
    var result = ClasseCsvImport.lignesVersEleves(
      [["Martin", "Léa", "12,5"]],
      mapping,
      { genererId: function () { return "e1"; } }
    );
    assert.equal(result.eleves[0].vma, "12.5");
  });

  it("importe une équipe couleur et pose equipeCouleur", function () {
    var mapping = ClasseCsvImport.devinerMapping(["Nom", "Prénom", "Équipe"], 3);
    assert.equal(mapping.equipe, 2);
    var result = ClasseCsvImport.lignesVersEleves(
      [["Martin", "Léa", "Rouge"]],
      mapping,
      { genererId: function () { return "e1"; } }
    );
    assert.equal(result.eleves[0].equipe, "Rouge");
    assert.equal(result.eleves[0].equipeCouleur, "#ef4444");
  });

  it("convertit des lignes en élèves", function () {
    var rows = [
      ["Dupont", "Léa", "F", "4"],
      ["Martin", "Paul", "", ""],
    ];
    var result = ClasseCsvImport.lignesVersEleves(
      rows,
      { nom: 0, prenom: 1, sexe: 2, niveau: 3 },
      { genererId: function () { return "id1"; } }
    );
    assert.equal(result.eleves.length, 2);
    assert.equal(result.eleves[0].nom, "Dupont");
    assert.equal(result.eleves[0].sexe, "F");
    assert.equal(result.eleves[0].niveau, "4");
  });

  it("importe la colonne équipe", function () {
    var rows = [["Dupont", "Léa", "Rouge"]];
    var result = ClasseCsvImport.lignesVersEleves(
      rows,
      { nom: 0, prenom: 1, equipe: 2 },
      { genererId: function () { return "id1"; } }
    );
    assert.equal(result.eleves[0].equipe, "Rouge");
  });

  it("importe depuis une colonne combinée", function () {
    var rows = [["DUPONT Léa"], ["Martin Paul"]];
    var result = ClasseCsvImport.lignesVersEleves(
      rows,
      { nom_et_prenom: 0 },
      {
        ordreNomPrenom: "nom_prenom",
        genererId: function () { return "id1"; },
      }
    );
    assert.equal(result.eleves.length, 2);
    assert.equal(result.eleves[0].nom, "DUPONT");
    assert.equal(result.eleves[0].prenom, "Léa");
    assert.equal(result.eleves[1].nom, "Martin");
    assert.equal(result.eleves[1].prenom, "Paul");
  });

  it("valide le mapping minimum", function () {
    assert.equal(ClasseCsvImport.validerMapping({ nom: 0, prenom: 1 }), null);
    assert.equal(ClasseCsvImport.validerMapping({ nom_et_prenom: 0 }), null);
    assert.ok(ClasseCsvImport.validerMapping({ nom: 0 }));
  });
});
