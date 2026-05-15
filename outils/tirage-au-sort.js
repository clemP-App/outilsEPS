/**
 * Tirage au sort — liste manuelle ou import classe, tirage aléatoire.
 */
(function () {
  "use strict";

  var participants = [];
  var msgEl = document.getElementById("tirage-msg");
  var listeBruteEl = document.getElementById("liste-brute");
  var participantsListEl = document.getElementById("participants-list");
  var participantsEmptyEl = document.getElementById("participants-empty");
  var nbEl = document.getElementById("tirage-nb");
  var resultatEl = document.getElementById("tirage-resultat");
  var resultatHintEl = document.getElementById("tirage-resultat-hint");
  var nomEl = document.getElementById("tirage-nom");
  var retirerEl = document.getElementById("retirer-apres-tirage");

  function montrerMsg(texte) {
    if (!msgEl) return;
    if (!texte) {
      msgEl.hidden = true;
      msgEl.textContent = "";
      return;
    }
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.remove("msg-ok");
  }

  function montrerOk(texte) {
    if (!msgEl) return;
    msgEl.textContent = texte;
    msgEl.hidden = false;
    msgEl.classList.add("msg-ok");
  }

  function libelleNb(n) {
    var nb = n || 0;
    return nb <= 1 ? nb + " participant" : nb + " participants";
  }

  function normaliserNom(s) {
    return (s || "").trim().replace(/\s+/g, " ");
  }

  function eleveVersNom(e) {
    return normaliserNom([e.prenom, e.nom].filter(Boolean).join(" "));
  }

  function contientNom(nom) {
    var n = normaliserNom(nom).toLowerCase();
    return participants.some(function (p) {
      return p.toLowerCase() === n;
    });
  }

  function ajouterNoms(noms) {
    var ajoutes = 0;
    noms.forEach(function (nom) {
      var n = normaliserNom(nom);
      if (!n || contientNom(n)) return;
      participants.push(n);
      ajoutes++;
    });
    return ajoutes;
  }

  function parserTextarea() {
    if (!listeBruteEl) return [];
    return listeBruteEl.value
      .split(/\r?\n/)
      .map(normaliserNom)
      .filter(Boolean);
  }

  function majAffichage() {
    if (nbEl) nbEl.textContent = libelleNb(participants.length);

    if (!participantsListEl || !participantsEmptyEl) return;

    participantsListEl.innerHTML = "";
    if (!participants.length) {
      participantsListEl.hidden = true;
      participantsEmptyEl.hidden = false;
      return;
    }

    participantsEmptyEl.hidden = true;
    participantsListEl.hidden = false;
    participants.forEach(function (nom) {
      var li = document.createElement("li");
      li.className = "tirage-participants__item";
      var span = document.createElement("span");
      span.textContent = nom;
      li.appendChild(span);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tirage-participants__remove";
      btn.setAttribute("aria-label", "Retirer " + nom);
      btn.textContent = "×";
      btn.addEventListener("click", function () {
        participants = participants.filter(function (p) {
          return p !== nom;
        });
        majAffichage();
      });
      li.appendChild(btn);
      participantsListEl.appendChild(li);
    });
  }

  function validerListe() {
    var lignes = parserTextarea();
    if (!lignes.length) {
      montrerMsg("Saisissez au moins un nom (un par ligne).");
      return;
    }
    var ajoutes = ajouterNoms(lignes);
    listeBruteEl.value = "";
    majAffichage();
    montrerMsg("");
    if (ajoutes) {
      montrerOk(ajoutes + " participant(s) ajouté(s).");
    } else {
      montrerMsg("Aucun nouveau nom (doublons ignorés).");
    }
  }

  function viderListe() {
    if (!participants.length) return;
    if (!confirm("Vider toute la liste des participants ?")) return;
    participants = [];
    if (listeBruteEl) listeBruteEl.value = "";
    if (resultatEl) resultatEl.hidden = true;
    if (resultatHintEl) resultatHintEl.hidden = false;
    majAffichage();
    montrerMsg("");
  }

  function importerClasse() {
    if (typeof ClassImport === "undefined") {
      montrerMsg("Import de classe indisponible.");
      return;
    }
    ClassImport.open({
      title: "Importer des participants",
      hint: "Cochez les élèves à ajouter à la liste du tirage.",
      onConfirm: function (eleves, classe) {
        var noms = eleves.map(eleveVersNom).filter(Boolean);
        var ajoutes = ajouterNoms(noms);
        majAffichage();
        if (ajoutes) {
          montrerOk(ajoutes + " participant(s) importé(s) depuis « " + classe.nom + " ».");
        } else {
          montrerMsg("Aucun nouveau participant (doublons ignorés).");
        }
      },
    });
  }

  function tirer() {
    montrerMsg("");
    if (participants.length < 1) {
      montrerMsg("Ajoutez au moins un participant avant de tirer au sort.");
      return;
    }
    if (participants.length === 1) {
      var seul = participants[0];
      if (nomEl) nomEl.textContent = seul;
      if (resultatEl) {
        resultatEl.hidden = false;
        resultatEl.classList.add("tirage-resultat--flash");
        setTimeout(function () {
          resultatEl.classList.remove("tirage-resultat--flash");
        }, 400);
      }
      if (resultatHintEl) resultatHintEl.hidden = true;
      if (retirerEl && retirerEl.checked) {
        participants = [];
        majAffichage();
      }
      return;
    }

    var idx = Math.floor(Math.random() * participants.length);
    var tire = participants[idx];
    if (nomEl) nomEl.textContent = tire;
    if (resultatEl) {
      resultatEl.hidden = false;
      resultatEl.classList.add("tirage-resultat--flash");
      setTimeout(function () {
        resultatEl.classList.remove("tirage-resultat--flash");
      }, 400);
    }
    if (resultatHintEl) resultatHintEl.hidden = true;

    if (retirerEl && retirerEl.checked) {
      participants.splice(idx, 1);
      majAffichage();
    }
  }

  var btnValider = document.getElementById("btn-valider-liste");
  if (btnValider) btnValider.addEventListener("click", validerListe);

  var btnVider = document.getElementById("btn-vider-liste");
  if (btnVider) btnVider.addEventListener("click", viderListe);

  var btnTirer = document.getElementById("btn-tirer");
  if (btnTirer) btnTirer.addEventListener("click", tirer);

  var btnImport = document.getElementById("btn-import-classe-tirage");
  if (btnImport) btnImport.addEventListener("click", importerClasse);

  majAffichage();
})();
