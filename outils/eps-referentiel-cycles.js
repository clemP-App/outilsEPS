(function (global) {
  "use strict";

  var E = global.EPS_REFERENTIEL;
  if (!E) return;

  function toArr(v) {
    if (!v) return [];
    return Array.isArray(v) ? v.slice() : [v];
  }

  function uniq(list) {
    var out = [];
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var k = String(list[i]);
      if (!seen[k]) {
        seen[k] = true;
        out.push(list[i]);
      }
    }
    return out;
  }

  function fillTypes(os, co) {
    var osSrc = os || {};
    var coSrc = co || {};

    var baseOs = {
      decouverte: toArr(osSrc.decouverte),
      apprentissage: toArr(osSrc.apprentissage),
      stabilisation: toArr(osSrc.stabilisation),
      evaluation: toArr(osSrc.evaluation),
    };
    var baseCo = {
      decouverte: toArr(coSrc.decouverte),
      apprentissage: toArr(coSrc.apprentissage),
      stabilisation: toArr(coSrc.stabilisation),
      evaluation: toArr(coSrc.evaluation),
    };

    if (!baseOs.decouverte.length) baseOs.decouverte = toArr(baseOs.apprentissage[0] || baseOs.stabilisation[0]);
    if (!baseOs.apprentissage.length) baseOs.apprentissage = toArr(baseOs.decouverte[0] || baseOs.stabilisation[0]);
    if (!baseOs.stabilisation.length) baseOs.stabilisation = toArr(baseOs.apprentissage[0] || baseOs.decouverte[0]);
    if (!baseOs.evaluation.length) baseOs.evaluation = toArr(baseOs.stabilisation[0] || baseOs.apprentissage[0]);

    if (!baseCo.decouverte.length) baseCo.decouverte = toArr(baseCo.apprentissage[0] || baseCo.stabilisation[0]);
    if (!baseCo.apprentissage.length) baseCo.apprentissage = toArr(baseCo.decouverte[0] || baseCo.stabilisation[0]);
    if (!baseCo.stabilisation.length) baseCo.stabilisation = toArr(baseCo.apprentissage[0] || baseCo.decouverte[0]);
    if (!baseCo.evaluation.length) baseCo.evaluation = toArr(baseCo.stabilisation[0] || baseCo.apprentissage[0]);

    return {
      objectifsSeance: {
        decouverte: uniq(baseOs.decouverte),
        apprentissage: uniq(baseOs.apprentissage),
        stabilisation: uniq(baseOs.stabilisation),
        evaluation: uniq(baseOs.evaluation),
        reinves: uniq(baseOs.stabilisation.concat(baseOs.apprentissage.slice(0, 1))),
        remediation: uniq(baseOs.apprentissage.concat(baseOs.stabilisation.slice(0, 1))),
        tournoi: uniq(baseOs.evaluation.concat(baseOs.stabilisation.slice(0, 1))),
        bilan: uniq(baseOs.evaluation.concat(baseOs.apprentissage.slice(0, 1))),
      },
      contenus: {
        decouverte: uniq(baseCo.decouverte),
        apprentissage: uniq(baseCo.apprentissage),
        stabilisation: uniq(baseCo.stabilisation),
        evaluation: uniq(baseCo.evaluation),
        reinves: uniq(baseCo.stabilisation.concat(baseCo.apprentissage.slice(0, 1))),
        remediation: uniq(baseCo.apprentissage.concat(baseCo.stabilisation.slice(0, 1))),
        tournoi: uniq(baseCo.evaluation.concat(baseCo.stabilisation.slice(0, 1))),
        bilan: uniq(baseCo.evaluation.concat(baseCo.apprentissage.slice(0, 1))),
      },
    };
  }

  function obj(id, label, phrase, cfg) {
    cfg = cfg || {};
    var filled = fillTypes(cfg.os || {}, cfg.co || {});
    var out = {
      id: id,
      label: label,
      phrase: phrase,
      objectifsSeance: filled.objectifsSeance,
      contenus: filled.contenus,
      pointsAttention: toArr(cfg.pointsAttention),
      criteresReussite: toArr(cfg.criteresReussite),
    };
    if (cfg.famille) out.famille = cfg.famille;
    return out;
  }

  function cycleBlock(objectifsArray) {
    return { objectifsSequence: objectifsArray };
  }

  function applyPatch(patchObject) {
    var apsaMap = (E && E.APSA) || {};
    var ids = Object.keys(patchObject || {});
    for (var i = 0; i < ids.length; i++) {
      var apsaId = ids[i];
      if (!apsaMap[apsaId]) continue;
      var current = apsaMap[apsaId];
      var incoming = patchObject[apsaId] || {};
      var keys = Object.keys(incoming);
      for (var j = 0; j < keys.length; j++) current[keys[j]] = incoming[keys[j]];
      if (current.objectifsSequence) delete current.objectifsSequence;
    }
  }

  function minimalSc(phrase, cible) {
    var cap = cible || "la cible annoncée";
    return {
      os: {
        decouverte: [
          "Identifier ce qui permet de réussir : " + phrase + ".",
          "Repérer un indice simple pour orienter l’action.",
        ],
        apprentissage: [
          "Répéter une action efficace en lien direct avec " + phrase + ".",
          "Ajuster son choix selon le placement des partenaires et adversaires.",
        ],
        stabilisation: [
          "Maintenir l’efficacité malgré une opposition ou une contrainte supplémentaire.",
          "Conserver de la lucidité pour rester pertinent vers " + cap + ".",
        ],
        evaluation: [
          "Réinvestir l’objectif dans une situation de référence.",
          "Justifier un choix tactique ou technique après l’action.",
        ],
      },
      co: {
        decouverte: [
          "Situation d’entrée avec consigne unique et critère visible.",
          "Observations rapides sur ce qui facilite la réussite.",
        ],
        apprentissage: [
          "Atelier ciblé avec répétitions courtes et feedback immédiat.",
          "Jeu aménagé imposant un choix pertinent avant de conclure.",
        ],
        stabilisation: [
          "Opposition à effectif réduit avec contraintes progressives.",
          "Rôle observateur : noter deux réussites et un ajustement utile.",
        ],
        evaluation: [
          "Match ou parcours de référence avec grille critériée.",
          "Bilan oral : décision prise, résultat obtenu, amélioration visée.",
        ],
      },
      pointsAttention: [
        "Rendre les critères de décision visibles avant l’opposition.",
        "Conserver un temps de verbalisation court pour ancrer les repères.",
      ],
      criteresReussite: [
        "L’action répond à l’intention annoncée.",
        "Le choix réalisé crée un avantage observable.",
      ],
    };
  }

  function richSc(intention, contexte) {
    return {
      os: {
        decouverte: [
          "Comprendre le problème à résoudre : " + intention + ".",
          "Repérer un premier indice utile dans " + contexte + ".",
        ],
        apprentissage: [
          "Choisir une réponse efficace et l’exécuter avec précision.",
          "Adapter son action dès qu’un indice nouveau apparaît.",
        ],
        stabilisation: [
          "Reproduire la réussite dans des situations légèrement différentes.",
          "Conserver la qualité malgré la fatigue ou la pression temporelle.",
        ],
        evaluation: [
          "Valider l’objectif dans une situation de référence.",
          "Analyser le résultat avec un vocabulaire précis.",
        ],
      },
      co: {
        decouverte: [
          "Mise en route ciblée puis situation simplifiée sur " + contexte + ".",
          "Observation guidée : quel indice déclenche la bonne décision ?",
        ],
        apprentissage: [
          "Atelier à contraintes pour installer un comportement efficace.",
          "Alternance pratiquant/observateur avec feedback immédiat.",
        ],
        stabilisation: [
          "Jeu ou parcours à variables modérées avec objectifs quantifiés.",
          "Défi collectif : maintenir la réussite sur plusieurs répétitions.",
        ],
        evaluation: [
          "Situation de référence avec relevé des indicateurs annoncés.",
          "Retour structuré : décision, exécution, effet obtenu.",
        ],
      },
      pointsAttention: [
        "Hiérarchiser les consignes pour éviter la surcharge cognitive.",
        "Conserver des temps de récupération permettant une action lucide.",
      ],
      criteresReussite: [
        "Le choix est pertinent au regard du contexte.",
        "L’exécution reste stable sur plusieurs essais.",
      ],
    };
  }

  var patch = {
    badminton: {
      cycles: {
        cycle3: cycleBlock([
          obj("bad-c3-echanger", "Maintenir l'échange", "Échanger et maintenir un échange simple pour installer la continuité du jeu.", richSc("maintenir un échange simple", "un duel avec zones cibles")),
          obj("bad-c3-replacer", "Se replacer après frappe", "Se replacer rapidement après chaque frappe pour rester disponible.", richSc("se replacer entre deux frappes", "un terrain matérialisé en zones")),
          obj("bad-c3-zone-libre", "Viser l'espace libre simple", "Identifier puis viser un espace libre simple pour marquer.", richSc("viser un espace libre", "des oppositions à thème")),
        ]),
        cycle4: cycleBlock([
          obj("bad-c4-varier", "Varier longueur et direction", "Varier longueur et direction pour déplacer l’adversaire.", richSc("alterner long/court et droite/gauche", "des échanges à contraintes")),
          obj("bad-c4-construire", "Construire le point", "Construire le point en enchaînant deux intentions tactiques avant de rompre.", richSc("préparer la rupture", "des matchs à thème tactique")),
          obj("bad-c4-exploiter", "Exploiter les zones libres", "Exploiter les zones libres créées par le déplacement adverse.", richSc("frapper dans la zone libérée", "des matchs avec observateur")),
        ]),
        lycee: cycleBlock([
          obj("bad-ly-projet", "Projet tactique adverse", "Conduire un projet tactique en fonction du profil adverse.", richSc("adapter son plan de jeu", "des matchs en sets courts")),
          obj("bad-ly-rompre", "Rompre sur replacement", "Rompre l’échange au moment où l’adversaire se replace.", richSc("rompre au moment opportun", "une opposition avec annonces tactiques")),
          obj("bad-ly-adapter", "Adapter aux points forts/faiblesses", "Adapter ses choix aux points forts et faiblesses identifiés.", richSc("exploiter les fragilités adverses", "une analyse vidéo courte")),
        ]),
      },
    },
    hand: {
      cycles: {
        cycle3: cycleBlock([
          obj("hand-c3-disponible", "Être disponible vers l’avant", "Se rendre disponible vers l’avant pour faire progresser le ballon.", richSc("offrir une solution vers l’avant", "des montées de balle en surnombre")),
          obj("hand-c3-progresser", "Progresser collectivement", "Progresser collectivement sans rupture de circulation.", richSc("enchaîner passe et déplacement", "des jeux réduits à couloirs")),
          obj("hand-c3-tirer-proche", "Tirer en situation proche", "Tirer en situation favorable proche du but.", richSc("choisir le moment de tir", "des situations 3 contre 2")),
        ]),
        cycle4: cycleBlock([
          obj("hand-c4-monter", "Monter vite la balle", "Monter vite la balle pour tirer avant le replacement.", richSc("accélérer la transition offensive", "des vagues de montée de balle")),
          obj("hand-c4-fixer", "Fixer avant transmettre", "Fixer un défenseur avant transmettre au partenaire mieux placé.", richSc("créer un décalage par fixation", "des oppositions à effectif réduit")),
          obj("hand-c4-occupation", "Occuper l’espace en attaque placée", "Organiser l’occupation de l’espace en attaque placée.", richSc("conserver largeur et profondeur", "des matchs à zones bonifiées")),
        ]),
        lycee: cycleBlock([
          obj("hand-ly-projet", "Projet collectif rapport de force", "Construire un projet de jeu collectif selon le rapport de force.", richSc("lire puis exploiter le rapport de force", "des matchs à séquences courtes")),
          obj("hand-ly-alterner", "Alterner rapide et placé", "Alterner jeu rapide et attaque placée selon l’évolution du match.", richSc("basculer entre deux rythmes", "une opposition avec temps morts tactiques")),
          obj("hand-ly-surnombre", "Exploiter surnombres et espaces faibles", "Exploiter les surnombres et les espaces faibles identifiés.", richSc("concrétiser l’avantage numérique", "des situations à thème tactique")),
        ]),
      },
    },
    orient: {
      cycles: {
        cycle3: cycleBlock([
          obj("orient-c3-carte", "Orienter la carte", "Orienter la carte à partir d’éléments remarquables.", richSc("faire coïncider carte et terrain", "des parcours en étoile proches")),
          obj("orient-c3-itineraire", "Itinéraire simple et sûr", "Choisir un itinéraire simple et sûr jusqu’à la balise.", richSc("sécuriser son déplacement", "des chemins et lignes directrices")),
          obj("orient-c3-retour", "Revenir dans le temps prévu", "Revenir au regroupement dans le temps prévu.", richSc("gérer son temps de parcours", "un contrat de retour annoncé")),
        ]),
        cycle4: cycleBlock([
          obj("orient-c4-lignes", "Lignes directrices et points d’attaque", "Utiliser lignes directrices et points d’attaque avant l’approche finale.", richSc("préparer l’entrée de balise", "des parcours à choix d’itinéraires")),
          obj("orient-c4-adapter", "Adapter si le terrain diffère", "Adapter son plan si le terrain diffère de l’anticipation.", richSc("réviser l’itinéraire en cours d’action", "des zones comportant plusieurs options")),
          obj("orient-c4-temps", "Gérer temps étoile/score", "Gérer son temps dans des formats étoile et score.", richSc("arbitrer risque et rendement", "des formats à points")),
        ]),
        lycee: cycleBlock([
          obj("orient-ly-strategie", "Stratégie difficulté/temps/ressources", "Construire une stratégie de course intégrant difficulté, temps et ressources.", richSc("planifier une stratégie globale", "un format score avec balises pondérées")),
          obj("orient-ly-optimiser", "Optimiser distance/sécurité/vitesse", "Optimiser l’itinéraire entre distance, sécurité et vitesse.", richSc("arbitrer entre sécurité et performance", "des comparaisons d’itinéraires")),
          obj("orient-ly-analyser", "Analyser les erreurs d’orientation", "Analyser ses erreurs d’orientation pour ajuster la stratégie suivante.", richSc("identifier la cause d’une erreur", "un debrief cartographique")),
        ]),
      },
    },
    danse: {
      cycles: {
        cycle3: cycleBlock([
          obj("danse-c3-geste", "Du geste au mouvement dansé", "Transformer un geste simple en mouvement dansé.", richSc("donner une qualité de mouvement", "des improvisations guidées")),
          obj("danse-c3-oser", "Oser une courte phrase", "Oser présenter une courte phrase dansée devant un groupe.", richSc("assumer la présentation", "des passages courts en demi-groupe")),
          obj("danse-c3-parametres", "Rendre visibles espace/temps/énergie", "Rendre visibles espace, temps et énergie dans la phrase.", richSc("varier les paramètres du mouvement", "une phrase de 4 à 6 actions")),
        ]),
        cycle4: cycleBlock([
          obj("danse-c4-intention", "Phrase chorégraphique intentionnelle", "Construire une phrase chorégraphique servant une intention.", richSc("cohérence entre intention et gestes", "un atelier de composition")),
          obj("danse-c4-contrastes", "Contrastes énergie/espace/temps", "Utiliser des contrastes d’énergie, d’espace et de temps.", richSc("rendre les contrastes lisibles", "une création en petits groupes")),
          obj("danse-c4-groupe", "Composer et présenter en groupe", "Composer et présenter une production collective structurée.", richSc("coordonner les rôles dans le groupe", "un filage avec spectateurs observateurs")),
        ]),
        lycee: cycleBlock([
          obj("danse-ly-projet", "Projet artistique argumenté", "Construire un projet artistique argumenté.", richSc("justifier ses choix artistiques", "un carnet de création")),
          obj("danse-ly-mise-scene", "Mise en scène intention/procédés", "Mettre en scène une intention via des procédés chorégraphiques.", richSc("choisir des procédés adaptés", "une composition de groupe")),
          obj("danse-ly-interpretation", "Affiner l’effet spectateur", "Affiner l’interprétation pour produire un effet précis sur le spectateur.", richSc("ajuster interprétation et présence", "des retours spectateurs structurés")),
        ]),
      },
    },
    escalade: {
      cycles: {
        cycle3: cycleBlock([
          obj("esc-c3-parcours", "Parcours simple avec les pieds", "Réaliser un parcours simple en privilégiant les appuis de pieds.", richSc("chercher d’abord les appuis utiles", "des voies faciles")),
          obj("esc-c3-securite", "Règles de sécurité et circulation", "Appliquer les règles de sécurité et de circulation au pied du mur.", richSc("sécuriser les rôles autour du mur", "une rotation grimpeur/observateur")),
          obj("esc-c3-hauteur", "Accepter une hauteur adaptée", "Accepter de grimper à une hauteur adaptée à ses ressources.", richSc("gérer l’engagement en hauteur", "des contrats progressifs de hauteur")),
        ]),
        cycle4: cycleBlock([
          obj("esc-c4-assurer", "Assurer en moulinette", "Assurer en moulinette en respectant la chaîne de sécurité.", richSc("enchaîner le protocole complet", "des validations assureur")),
          obj("esc-c4-economie", "Grimper en économisant les bras", "Grimper en économisant les bras grâce au travail des jambes.", richSc("placer le bassin et pousser sur les pieds", "des voies de difficulté modérée")),
          obj("esc-c4-choisir", "Choisir une voie selon ses ressources", "Choisir une voie cohérente avec ses ressources.", richSc("adapter difficulté et stratégie", "des zones de voies graduées")),
        ]),
        lycee: cycleBlock([
          obj("esc-ly-projet", "Projet de voie de niveau", "Conduire un projet de voie de niveau visé.", richSc("planifier une tentative réaliste", "des essais successifs sur la même voie")),
          obj("esc-ly-optimiser", "Optimiser déplacements et lecture", "Optimiser déplacements et lecture de voie.", richSc("anticiper les sections clés", "une lecture au sol puis en action")),
          obj("esc-ly-autonomie", "Autonomie grimpeur/assureur/observateur", "Assumer en autonomie les rôles grimpeur, assureur et observateur.", richSc("tenir les trois rôles avec fiabilité", "des ateliers en autonomie encadrée")),
        ]),
      },
    },
    "course-duree": {
      cycles: {
        cycle3: cycleBlock([
          obj("cd-c3-allure", "Allure modérée et sensations", "Tenir une allure modérée en repérant ses sensations.", richSc("lier allure et ressenti", "des blocs courts de course")),
          obj("cd-c3-alterner", "Alterner course et récupération", "Alterner course et récupération active sans rupture.", richSc("gérer alternance effort/récupération", "des contrats de durée")),
          obj("cd-c3-effets", "Repérer les effets de l’effort", "Repérer les effets de l’effort sur son corps.", richSc("observer respiration et fatigue", "un carnet d’observation simple")),
        ]),
        cycle4: cycleBlock([
          obj("cd-c4-reguler", "Réguler allure et durée", "Réguler son allure pour tenir la durée annoncée.", richSc("stabiliser la vitesse cible", "des séries en temps imposé")),
          obj("cd-c4-reperes", "Utiliser des repères anti-rupture", "Utiliser des repères pour éviter la rupture d’allure.", richSc("anticiper la baisse de régime", "un suivi temps/sensations")),
          obj("cd-c4-comparer", "Comparer prévu/réalisé", "Comparer allure prévue et allure réalisée pour ajuster.", richSc("analyser ses écarts", "des bilans fin de séance")),
        ]),
        lycee: cycleBlock([
          obj("cd-ly-projet", "Projet d’entraînement personnalisé", "Conduire un projet d’entraînement personnalisé.", richSc("choisir un format cohérent avec l’objectif", "un cycle d’entraînement court")),
          obj("cd-ly-reguler", "Réguler FC/RPE/vitesse/sensations", "Réguler l’effort avec FC, RPE, vitesse et sensations.", richSc("croiser plusieurs indicateurs", "des blocs de course différenciés")),
          obj("cd-ly-parametres", "Ajuster les paramètres selon l’effet", "Ajuster les paramètres selon l’effet recherché.", richSc("faire évoluer charge et récupération", "un bilan comparatif des séances")),
        ]),
      },
    },
    athle: {
      familles: {
        sprint: { id: "sprint", label: "Course / sprint" },
        demiFond: { id: "demiFond", label: "Demi-fond" },
        saut: { id: "saut", label: "Saut" },
        lancer: { id: "lancer", label: "Lancer" },
      },
      cycles: {
        cycle3: cycleBlock([
          obj("ath-c3-spr-1", "Réagir au signal et tenir sa ligne", "Réagir au signal et courir vite en tenant sa ligne.", { famille: "sprint", os: richSc("réagir vite au départ", "des sprints courts").os, co: richSc("réagir vite au départ", "des sprints courts").co, pointsAttention: ["Sécuriser couloirs et zones d’arrêt."], criteresReussite: ["Départ rapide et ligne tenue jusqu’à l’arrivée."] }),
          obj("ath-c3-spr-2", "Départ stable et premiers appuis", "Installer un départ stable puis des premiers appuis efficaces.", { famille: "sprint", os: richSc("enchaîner départ et accélération", "des départs variés").os, co: richSc("enchaîner départ et accélération", "des départs variés").co, pointsAttention: ["Récupération complète entre essais."], criteresReussite: ["Poussée franche sur les premiers appuis."] }),
          obj("ath-c3-dem-1", "Tenir une allure sans s’arrêter", "Tenir une allure régulière sur une durée définie sans s’arrêter.", { famille: "demiFond", os: richSc("gérer son effort sur la durée", "des boucles balisées").os, co: richSc("gérer son effort sur la durée", "des boucles balisées").co, pointsAttention: ["Donner des repères temporels simples."], criteresReussite: ["Allure stable sur tout le bloc."] }),
          obj("ath-c3-dem-2", "Alterner course/marche", "Alterner course et marche pour récupérer sans rompre l’engagement.", { famille: "demiFond", os: richSc("organiser son alternance", "des contrats course-marche").os, co: richSc("organiser son alternance", "des contrats course-marche").co, pointsAttention: ["Éviter les départs trop rapides."], criteresReussite: ["Alternance respectée et efficace."] }),
          obj("ath-c3-saut-1", "Élan court et impulsion", "Coordonner un élan court et une impulsion efficace.", { famille: "saut", os: richSc("coordonner élan et impulsion", "des ateliers à marques").os, co: richSc("coordonner élan et impulsion", "des ateliers à marques").co, pointsAttention: ["Adapter la marque à chaque élève."], criteresReussite: ["Impulsion franche dans la zone utile."] }),
          obj("ath-c3-saut-2", "Réception stable", "Stabiliser la réception après le saut.", { famille: "saut", os: richSc("maîtriser la fin d’action", "des réceptions guidées").os, co: richSc("maîtriser la fin d’action", "des réceptions guidées").co, pointsAttention: ["Insister sur la sécurité de réception."], criteresReussite: ["Réception équilibrée et contrôlée."] }),
          obj("ath-c3-lan-1", "Coordonner élan et lancer", "Coordonner élan et lancer dans le respect de la sécurité.", { famille: "lancer", os: richSc("enchaîner déplacement et geste terminal", "des lancers aménagés").os, co: richSc("enchaîner déplacement et geste terminal", "des lancers aménagés").co, pointsAttention: ["Organiser clairement les zones de lancer."], criteresReussite: ["Trajectoire régulière dans le secteur autorisé."] }),
          obj("ath-c3-lan-2", "Viser plus loin", "Viser une zone plus lointaine en restant précis.", { famille: "lancer", os: richSc("chercher distance et précision", "des cibles progressives").os, co: richSc("chercher distance et précision", "des cibles progressives").co, pointsAttention: ["Conserver la qualité technique avant la puissance."], criteresReussite: ["Distance en progrès et sécurité respectée."] }),
        ]),
        cycle4: cycleBlock([
          obj("ath-c4-spr-1", "Optimiser départ et accélération", "Optimiser départ et accélération pour gagner du temps.", { famille: "sprint", os: richSc("optimiser la phase de départ", "des sprints chronométrés").os, co: richSc("optimiser la phase de départ", "des sprints chronométrés").co, pointsAttention: ["Chronométrer des distances courtes régulières."], criteresReussite: ["Temps de réaction et d’accélération en progrès."] }),
          obj("ath-c4-spr-2", "Repères chrono et spatiaux", "Utiliser des repères chronométriques et spatiaux pour réguler la vitesse.", { famille: "sprint", os: richSc("analyser ses passages", "des repères intermédiaires").os, co: richSc("analyser ses passages", "des repères intermédiaires").co, pointsAttention: ["Comparer les essais dans des conditions identiques."], criteresReussite: ["Passages intermédiaires plus réguliers."] }),
          obj("ath-c4-dem-1", "Projet d’allure", "Établir un projet d’allure sur une distance de demi-fond.", { famille: "demiFond", os: richSc("planifier et tenir l’allure", "des fractions de course").os, co: richSc("planifier et tenir l’allure", "des fractions de course").co, pointsAttention: ["Donner des repères de passage réalistes."], criteresReussite: ["Projet d’allure tenu sans effondrement final."] }),
          obj("ath-c4-dem-2", "Comparer les essais", "Comparer les essais pour améliorer la gestion d’effort.", { famille: "demiFond", os: richSc("interpréter les écarts", "un tableau prévu/réalisé").os, co: richSc("interpréter les écarts", "un tableau prévu/réalisé").co, pointsAttention: ["Faire verbaliser l’ajustement choisi."], criteresReussite: ["Écarts réduits entre projet et performance."] }),
          obj("ath-c4-saut-1", "Ajuster la marque d’élan", "Ajuster la marque d’élan pour améliorer l’impulsion.", { famille: "saut", os: richSc("stabiliser sa course d’élan", "des essais filmés courts").os, co: richSc("stabiliser sa course d’élan", "des essais filmés courts").co, pointsAttention: ["Vérifier la constance de la foulée terminale."], criteresReussite: ["Impulsion réalisée près de la zone idéale."] }),
          obj("ath-c4-saut-2", "Comparer les essais de saut", "Comparer les essais pour affiner trajectoire et réception.", { famille: "saut", os: richSc("analyser ce qui fait gagner", "des séries de trois essais").os, co: richSc("analyser ce qui fait gagner", "des séries de trois essais").co, pointsAttention: ["Garder une réception sécurisée à chaque essai."], criteresReussite: ["Trajectoire plus efficace et réception stable."] }),
          obj("ath-c4-lan-1", "Optimiser transfert et trajectoire", "Optimiser le transfert d’appuis et la trajectoire de lancer.", { famille: "lancer", os: richSc("coordonner chaîne motrice", "des lancers techniques").os, co: richSc("coordonner chaîne motrice", "des lancers techniques").co, pointsAttention: ["Sécuriser les rotations et les zones d’attente."], criteresReussite: ["Trajectoire cohérente avec l’intention technique."] }),
          obj("ath-c4-lan-2", "Comparer les lancers", "Comparer les lancers pour choisir la stratégie la plus efficace.", { famille: "lancer", os: richSc("analyser distance et précision", "des séries notées").os, co: richSc("analyser distance et précision", "des séries notées").co, pointsAttention: ["Limiter le nombre de variables modifiées à la fois."], criteresReussite: ["Progression mesurée entre les séries."] }),
        ]),
        lycee: cycleBlock([
          obj("ath-ly-spr-1", "Stratégie de performance sprint", "Construire une stratégie de performance en sprint à partir de données mesurées.", { famille: "sprint", os: richSc("utiliser les données de passage", "des sprints analysés").os, co: richSc("utiliser les données de passage", "des sprints analysés").co, pointsAttention: ["Relier données et choix techniques."], criteresReussite: ["Plan de course argumenté et performant."] }),
          obj("ath-ly-spr-2", "Optimiser fréquence/amplitude", "Optimiser fréquence et amplitude selon son profil.", { famille: "sprint", os: richSc("ajuster fréquence et amplitude", "des séquences vidéo").os, co: richSc("ajuster fréquence et amplitude", "des séquences vidéo").co, pointsAttention: ["Conserver relâchement et efficacité."], criteresReussite: ["Vitesse améliorée sans désorganisation."] }),
          obj("ath-ly-dem-1", "Projet personnel demi-fond", "Conduire un projet personnel en demi-fond selon un objectif chiffré.", { famille: "demiFond", os: richSc("planifier son cycle de course", "des séances différenciées").os, co: richSc("planifier son cycle de course", "des séances différenciées").co, pointsAttention: ["Prendre en compte récupération et charge."], criteresReussite: ["Progression cohérente avec le projet."] }),
          obj("ath-ly-dem-2", "Analyser les données d’effort", "Analyser les données d’effort pour ajuster le plan.", { famille: "demiFond", os: richSc("exploiter FC, RPE et chrono", "des relevés de séance").os, co: richSc("exploiter FC, RPE et chrono", "des relevés de séance").co, pointsAttention: ["Ne pas interpréter une donnée isolée."], criteresReussite: ["Ajustements pertinents d’une séance à l’autre."] }),
          obj("ath-ly-saut-1", "Optimiser impulsion et trajectoire", "Optimiser impulsion et trajectoire pour atteindre la performance visée.", { famille: "saut", os: richSc("relier technique et résultat", "des sauts à objectif").os, co: richSc("relier technique et résultat", "des sauts à objectif").co, pointsAttention: ["Garder une logique progressive de difficulté."], criteresReussite: ["Gain mesurable en performance de saut."] }),
          obj("ath-ly-saut-2", "Exploiter les retours d’observation", "Exploiter les retours d’observation pour affiner son geste.", { famille: "saut", os: richSc("corriger à partir d’indices précis", "des observations croisées").os, co: richSc("corriger à partir d’indices précis", "des observations croisées").co, pointsAttention: ["Cibler un seul ajustement prioritaire."], criteresReussite: ["Correction visible sur l’essai suivant."] }),
          obj("ath-ly-lan-1", "Stratégie de lancer", "Construire une stratégie de lancer selon ses points forts.", { famille: "lancer", os: richSc("adapter technique et prise d’élan", "des séries comparées").os, co: richSc("adapter technique et prise d’élan", "des séries comparées").co, pointsAttention: ["Stabiliser le protocole de préparation."], criteresReussite: ["Régularité des performances et progression."] }),
          obj("ath-ly-lan-2", "Analyser pour optimiser", "Analyser ses essais pour optimiser trajectoire et transfert d’énergie.", { famille: "lancer", os: richSc("objectiver les causes d’échec", "une grille d’analyse technique").os, co: richSc("objectiver les causes d’échec", "une grille d’analyse technique").co, pointsAttention: ["Associer observation, mesure et ressenti."], criteresReussite: ["Choix techniques ajustés et efficaces."] }),
        ]),
      },
    },
  };

  var COOP_VARIANTS = {
    basket: {
      cycle3: [["basket-c3-espaces", "Jouer écarté pour garder des solutions vers le panier."], ["basket-c3-passes", "Enchaîner passe et déplacement pour conserver la continuité du jeu."]],
      cycle4: [["basket-c4-fixer", "Fixer un défenseur puis transmettre au partenaire démarqué."], ["basket-c4-choix-tir", "Choisir entre tir proche, tir extérieur ou passe de renversement."], ["basket-c4-repli", "Alterner montée rapide et attaque placée selon le contexte."]],
      lycee: [["basket-ly-projet", "Conduire un projet collectif de création d’avantages."], ["basket-ly-matchups", "Exploiter les duels favorables et les aides défensives tardives."]],
    },
    foot: {
      cycle3: [["foot-c3-soutien", "Offrir des soutiens proches pour progresser sans perdre le ballon."], ["foot-c3-tir", "Conclure rapidement quand la cible est ouverte."]],
      cycle4: [["foot-c4-renversement", "Renverser le jeu pour attaquer l’espace faible."], ["foot-c4-fixer", "Fixer puis transmettre dans la course d’un partenaire."], ["foot-c4-pression", "Réagir vite à la perte de balle pour gêner la relance."]],
      lycee: [["foot-ly-plan", "Ajuster le plan de jeu selon le bloc adverse."], ["foot-ly-zones", "Exploiter les intervalles entre lignes pour créer une occasion nette."]],
    },
    rugby: {
      cycle3: [["rugby-c3-continuer", "Maintenir la continuité en avançant avec soutien immédiat."], ["rugby-c3-securite", "Maîtriser les contacts autorisés en sécurité."]],
      cycle4: [["rugby-c4-fixer", "Fixer la défense puis jouer dans l’intervalle libéré."], ["rugby-c4-occupation", "Occuper largeur et profondeur pour conserver l’avancée."], ["rugby-c4-rideau", "Reformer rapidement le rideau défensif après perte."]],
      lycee: [["rugby-ly-rapport", "Piloter l’alternance jeu d’évitement / jeu de conquête selon le rapport de force."], ["rugby-ly-temps", "Exploiter les temps faibles adverses pour marquer."]],
    },
    volley: {
      cycle3: [["volley-c3-reception", "Stabiliser la réception pour renvoyer en continuité."], ["volley-c3-communication", "Communiquer pour éviter les ballons laissés."]],
      cycle4: [["volley-c4-2touches", "Construire en deux ou trois touches avant l’attaque."], ["volley-c4-zones", "Orienter l’attaque vers les zones peu défendues."], ["volley-c4-placement", "Adapter le placement défensif à la trajectoire adverse."]],
      lycee: [["volley-ly-systeme", "Organiser un système collectif service-réception-attaque."], ["volley-ly-lecture", "Lire la qualité de passe pour choisir l’option offensive pertinente."]],
    },
    tennis: {
      cycle3: [["tennis-c3-regularite", "Maintenir l’échange avec des trajectoires hautes et longues."], ["tennis-c3-replacement", "Se replacer au centre après chaque frappe."]],
      cycle4: [["tennis-c4-variation", "Varier zones et effets pour déplacer l’adversaire."], ["tennis-c4-preparation", "Préparer la balle d’attaque avant de conclure."], ["tennis-c4-service", "Mettre en jeu de façon fiable et orientée."]],
      lycee: [["tennis-ly-plan", "Construire un plan de match selon le profil adverse."], ["tennis-ly-filiere", "Exploiter sa filière forte en ciblant la faiblesse adverse."]],
    },
    hockey: {
      cycle3: [["hockey-c3-conduite", "Conduire la balle en sécurité pour progresser."], ["hockey-c3-passes", "Passer dans la course d’un partenaire disponible."]],
      cycle4: [["hockey-c4-changer", "Changer de côté pour contourner la densité défensive."], ["hockey-c4-fixer", "Fixer avec la conduite puis servir un appui latéral."], ["hockey-c4-tir", "Déclencher un tir dès qu’une fenêtre apparaît."]],
      lycee: [["hockey-ly-projet", "Conduire un projet collectif de création d’occasions nettes."], ["hockey-ly-transition", "Exploiter les transitions rapides pour attaquer l’axe faible."]],
    },
    boxe: {
      cycle3: [["boxe-c3-garde", "Conserver la garde active en entrant/sortant de distance."], ["boxe-c3-toucher", "Toucher contrôlé sur cible autorisée puis se replacer."]],
      cycle4: [["boxe-c4-enchainement", "Enchaîner attaque simple et sortie en sécurité."], ["boxe-c4-leurre", "Utiliser une feinte pour créer une ouverture."], ["boxe-c4-defense", "Choisir esquive, blocage ou retrait selon l’attaque adverse."]],
      lycee: [["boxe-ly-plan", "Construire un plan d’assaut adapté au profil adverse."], ["boxe-ly-rythme", "Alterner rythmes pour provoquer puis exploiter l’ouverture."]],
    },
    judo: {
      cycle3: [["judo-c3-saisie", "Installer une saisie stable et sécurisée."], ["judo-c3-deseq", "Créer un déséquilibre avant toute projection."]],
      cycle4: [["judo-c4-attaque", "Choisir une entrée pertinente selon la réaction adverse."], ["judo-c4-enchainement", "Enchaîner projection et contrôle au sol."], ["judo-c4-defense", "Neutraliser l’attaque adverse sans rompre la sécurité."]],
      lycee: [["judo-ly-strategie", "Construire une stratégie de combat à partir de séquences observées."], ["judo-ly-adapter", "Adapter ses attaques aux points forts et faibles repérés."]],
    },
    lutte: {
      cycle3: [["lutte-c3-appuis", "Conserver des appuis stables pour contrôler l’opposition."], ["lutte-c3-retourner", "Retourner l’adversaire par placement et leviers simples."]],
      cycle4: [["lutte-c4-chaine", "Enchaîner attaque, contrôle et maintien."], ["lutte-c4-anticiper", "Anticiper la réaction adverse pour rester dominant."], ["lutte-c4-arbitrer", "Arbitrer un duel en repérant les actions valides."]],
      lycee: [["lutte-ly-projet", "Conduire un projet d’affrontement basé sur l’analyse des séquences."], ["lutte-ly-temps-forts", "Exploiter les temps forts pour scorer sans se désorganiser."]],
    },
  };

  var PERF_VARIANTS = {
    natation: {
      cycle3: [["nat-c3-alignement", "Nager aligné pour limiter les résistances."], ["nat-c3-respiration", "Respirer de manière coordonnée sans rupture d’action."]],
      cycle4: [["nat-c4-allure", "Réguler l’allure sur une distance de référence."], ["nat-c4-virage", "Optimiser départs et virages pour préserver la vitesse."], ["nat-c4-observer", "Observer un partenaire pour ajuster fréquence et amplitude."]],
      lycee: [["nat-ly-projet", "Conduire un projet de performance basé sur des données mesurées."], ["nat-ly-efficience", "Optimiser l’efficience de nage selon sa spécialité."]],
    },
    gym: {
      cycle3: [["gym-c3-maitrise", "Réaliser des éléments simples avec départ et réception contrôlés."], ["gym-c3-securite", "Respecter aides et parades sur chaque atelier."]],
      cycle4: [["gym-c4-continuité", "Enchaîner plusieurs éléments sans rupture majeure."], ["gym-c4-amplitude", "Améliorer amplitude et tenue des postures."], ["gym-c4-choix", "Choisir des éléments cohérents avec son niveau."]],
      lycee: [["gym-ly-projet", "Construire un enchaînement personnel répondant à des critères annoncés."], ["gym-ly-affiner", "Affiner exécution et composition grâce aux retours d’observation."]],
    },
    kayak: {
      cycle3: [["kayak-c3-propulsion", "Propulser et diriger l’embarcation en zone calme."], ["kayak-c3-securite", "Appliquer les procédures de sécurité aquatique."]],
      cycle4: [["kayak-c4-trajet", "Choisir une trajectoire adaptée au courant et au vent."], ["kayak-c4-manoeuvre", "Enchaîner propulsion, freinage et rotation."], ["kayak-c4-cooperer", "Coopérer pour réussir un parcours collectif."]],
      lycee: [["kayak-ly-strategie", "Construire une stratégie de parcours selon les contraintes du milieu."], ["kayak-ly-analyse", "Analyser ses choix de trajectoire pour gagner en efficience."]],
    },
    voile: {
      cycle3: [["voile-c3-vent", "Identifier la direction du vent pour orienter l’embarcation."], ["voile-c3-roles", "Tenir un rôle clair à bord dans les manœuvres simples."]],
      cycle4: [["voile-c4-allures", "Adapter réglages et allures selon le vent."], ["voile-c4-manoeuvres", "Coordonner virements et changements de trajectoire."], ["voile-c4-anticiper", "Anticiper la manœuvre avant la zone contrainte."]],
      lycee: [["voile-ly-projet", "Conduire un projet de navigation en autonomie relative."], ["voile-ly-optimiser", "Optimiser trajectoire et réglages avec analyse des choix réalisés."]],
    },
    acrosport: {
      cycle3: [["acro-c3-figures", "Construire des figures stables avec rôles sécurisés."], ["acro-c3-transitions", "Relier deux figures par une transition simple."]],
      cycle4: [["acro-c4-composer", "Composer un enchaînement lisible avec début et fin marqués."], ["acro-c4-fluidite", "Fluidifier les transitions sans perte de sécurité."], ["acro-c4-observer", "Observer stabilité et alignement pour corriger la production."]],
      lycee: [["acro-ly-projet", "Concevoir une composition collective argumentée."], ["acro-ly-effet", "Affiner la relation prouesse/intention pour produire un effet clair."]],
    },
    cirque: {
      cycle3: [["cirque-c3-prouesse", "Stabiliser une prouesse simple dans une famille d’actions choisie."], ["cirque-c3-oser", "Présenter une courte séquence devant les autres."]],
      cycle4: [["cirque-c4-composer", "Composer un numéro avec entrée, temps fort et sortie."], ["cirque-c4-transition", "Maîtriser les transitions pour garder la lisibilité."], ["cirque-c4-securiser", "Sécuriser les actions à risque avant présentation."]],
      lycee: [["cirque-ly-projet", "Construire un projet artistique en assumant les choix scéniques."], ["cirque-ly-spectateur", "Ajuster jeu et rythme selon l’effet produit sur le spectateur."]],
    },
    cross: {
      cycle3: [["cross-c3-technique", "Exécuter correctement les mouvements du circuit."], ["cross-c3-rythme", "Gérer effort et récupération sur un format court."]],
      cycle4: [["cross-c4-reguler", "Réguler l’intensité d’un circuit selon l’objectif annoncé."], ["cross-c4-variantes", "Choisir la variante d’exercice adaptée à son niveau."], ["cross-c4-qualite", "Maintenir la qualité malgré la fatigue progressive."]],
      lycee: [["cross-ly-projet", "Conduire un projet d’entraînement personnalisé sur plusieurs séances."], ["cross-ly-parametres", "Ajuster charge, densité et récupération selon l’effet recherché."]],
    },
    "nat-duree": {
      cycle3: [["natd-c3-allure", "Trouver une allure aquatique soutenable sans rupture."], ["natd-c3-respiration", "Réguler respiration et glisse pour prolonger l’effort."]],
      cycle4: [["natd-c4-reguler", "Réguler allure et récupération sur des blocs en durée."], ["natd-c4-reperes", "Utiliser des repères de distance, temps et ressenti."], ["natd-c4-technique", "Maintenir une technique efficace malgré la durée."]],
      lycee: [["natd-ly-projet", "Construire un projet personnel en natation de durée."], ["natd-ly-analyser", "Analyser données et sensations pour ajuster la charge de travail."]],
    },
  };

  function mkObjective(id, phrase) {
    var cfg = minimalSc(phrase, "la cible de l'activité");
    return obj(id, phrase, phrase, cfg);
  }

  function buildFromVariants(apsaId, variants) {
    if (!variants) return null;
    return {
      cycles: {
        cycle3: cycleBlock((variants.cycle3 || []).map(function (x) { return mkObjective(x[0], x[1]); })),
        cycle4: cycleBlock((variants.cycle4 || []).map(function (x) { return mkObjective(x[0], x[1]); })),
        lycee: cycleBlock((variants.lycee || []).map(function (x) { return mkObjective(x[0], x[1]); })),
      },
    };
  }

  function genererCyclesManquants() {
    var apsaMap = (E && E.APSA) || {};
    var ids = Object.keys(apsaMap);
    var autoPatch = {};
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var a = apsaMap[id];
      if (!a || a.cycles || !a.objectifsSequence || !a.objectifsSequence.length) continue;
      var variants = COOP_VARIANTS[id] || PERF_VARIANTS[id];
      if (!variants) continue;
      autoPatch[id] = buildFromVariants(id, variants);
    }
    applyPatch(autoPatch);
  }

  applyPatch(patch);
  genererCyclesManquants();
})(globalThis);
