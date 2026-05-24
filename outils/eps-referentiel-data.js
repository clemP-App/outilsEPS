/**
 * eps-referentiel-data.js
 * Référentiel de propositions pédagogiques EPS pour l’outil Cahier de texte.
 *
 * Logique :
 * Niveau/Cycle -> Champ d’apprentissage -> APSA -> Objectifs de séquence
 * Puis :
 * Objectif(s) de séquence + type de séance -> Objectifs de séance + contenus + points d’attention.
 *
 * Objectif :
 * Fournir peu de propositions, mais très ciblées, proches du terrain et compatibles avec les programmes.
 */

(function (global) {
  "use strict";

  var TYPES_SEANCE = [
    { id: "decouverte", label: "Découverte" },
    { id: "apprentissage", label: "Apprentissage" },
    { id: "stabilisation", label: "Stabilisation" },
    { id: "reinves", label: "Réinvestissement" },
    { id: "remediation", label: "Remédiation" },
    { id: "evaluation", label: "Évaluation" },
    { id: "tournoi", label: "Tournoi / rencontre" },
    { id: "bilan", label: "Bilan de séquence" },
  ];

  var CYCLES = {
    cycle3: {
      id: "cycle3",
      label: "Cycle 3",
      champsAutorises: ["perf", "adapt", "expr", "coop"],
    },
    cycle4: {
      id: "cycle4",
      label: "Cycle 4",
      champsAutorises: ["perf", "adapt", "expr", "coop"],
    },
    lycee: {
      id: "lycee",
      label: "Lycée",
      champsAutorises: ["perf", "adapt", "expr", "coop", "ca5"],
    },
  };

  var CHAMPS = {
    perf: {
      id: "perf",
      label: "CA1 — Produire une performance optimale",
      resume: "Produire une performance mesurable à une échéance donnée.",
      apsa: ["athle", "natation"],
    },
    adapt: {
      id: "adapt",
      label: "CA2 — Adapter ses déplacements à des environnements variés",
      resume: "Lire le milieu, choisir et sécuriser son déplacement.",
      apsa: ["orient", "escalade", "kayak", "voile"],
    },
    expr: {
      id: "expr",
      label: "CA3 — Réaliser une prestation corporelle destinée à être vue",
      resume: "Composer, interpréter, maîtriser le risque ou l’émotion devant autrui.",
      apsa: ["danse", "gym", "acrosport", "cirque"],
    },
    coop: {
      id: "coop",
      label: "CA4 — Conduire et maîtriser un affrontement collectif ou interindividuel",
      resume: "Coopérer, s’opposer, faire basculer un rapport de force.",
      apsa: [
        "hand",
        "basket",
        "foot",
        "rugby",
        "volley",
        "badminton",
        "tennis",
        "hockey",
        "boxe",
        "judo",
        "lutte",
      ],
    },
    ca5: {
      id: "ca5",
      label: "CA5 — Réaliser une activité physique pour développer ses ressources et s’entretenir",
      resume: "Construire, conduire et réguler un projet d’entraînement.",
      apsa: ["course-duree", "cross", "nat-duree"],
    },
  };

  var OBJECTIFS_GENERIQUES_PAR_TYPE = {
    decouverte: [
      "Identifier les règles essentielles de fonctionnement et de sécurité.",
      "Entrer dans l’activité par une situation simple permettant de comprendre le problème à résoudre.",
      "Repérer les premières réussites et difficultés à partir de critères simples.",
    ],
    apprentissage: [
      "Acquérir un comportement efficace ciblé dans une situation aménagée.",
      "S’appuyer sur un critère de réussite clair pour ajuster son action.",
      "Répéter en comprenant ce qu’il faut modifier pour progresser.",
    ],
    stabilisation: [
      "Répéter l’apprentissage dans des situations proches mais légèrement variables.",
      "Maintenir l’efficacité malgré une contrainte supplémentaire.",
      "S’auto-évaluer ou observer un partenaire à partir d’un critère simple.",
    ],
    reinves: [
      "Réinvestir l’apprentissage dans une situation plus globale.",
      "Choisir la réponse adaptée selon le contexte de jeu, de parcours ou de prestation.",
      "Mettre en relation plusieurs apprentissages dans une tâche complexe.",
    ],
    remediation: [
      "Reprendre un apprentissage ciblé à partir d’une difficulté observée.",
      "Simplifier la situation pour retrouver les conditions de réussite.",
      "Utiliser un retour précis pour corriger son action.",
    ],
    evaluation: [
      "Montrer les apprentissages stabilisés dans une situation de référence.",
      "Assumer les rôles nécessaires au bon déroulement de l’évaluation.",
      "Identifier ses acquis et les progrès restant à construire.",
    ],
    tournoi: [
      "Réinvestir les apprentissages dans des rencontres organisées.",
      "Assumer les rôles de joueur, arbitre, observateur ou coach.",
      "Respecter l’adversaire, les règles et le cadre de la rencontre.",
    ],
    bilan: [
      "Identifier les apprentissages réalisés durant la séquence.",
      "Mettre en mots les progrès, les difficultés et les critères de réussite.",
      "Se projeter vers une prochaine étape de progression.",
    ],
  };

  var APSA = {
    hand: {
      id: "hand",
      label: "Handball",
      champ: "coop",
      objectifsSequence: [
        {
          id: "hand-monter-vite",
          label: "Monter vite la balle",
          phrase: "Monter vite la balle pour tirer en situation favorable avant le replacement défensif.",
          objectifsSeance: {
            apprentissage: [
              "Identifier rapidement un couloir de progression vers le but.",
              "Enchaîner réception, course vers l’avant et passe sans ralentir le jeu.",
              "Utiliser un partenaire lancé pour progresser rapidement.",
              "Choisir entre dribbler, passer ou tirer selon la pression défensive.",
              "Observer le temps nécessaire pour atteindre une zone de tir favorable.",
            ],
            stabilisation: [
              "Maintenir une montée de balle rapide malgré l’opposition.",
              "Occuper les couloirs latéraux pour offrir des solutions de passe.",
              "Limiter les pertes de balle en avançant collectivement.",
              "Enchaîner récupération, projection vers l’avant et tir.",
            ],
            evaluation: [
              "Réinvestir la montée de balle rapide dans un match aménagé.",
              "Faire des choix pertinents en transition offensive.",
              "Assumer un rôle d’observateur sur la vitesse de progression vers la cible.",
            ],
          },
          contenus: {
            apprentissage: [
              "Échauffement avec passes en course et réception orientée vers l’avant.",
              "Situation de 3 contre 1 puis 3 contre 2 sur demi-terrain avec tir en moins de 8 secondes.",
              "Match à thème : bonus si le tir intervient après une progression collective rapide.",
              "Rotation joueur / observateur avec critère : balle arrivée en zone favorable.",
              "Bilan : quels choix permettent de gagner du temps vers la cible ?",
            ],
            stabilisation: [
              "Montées de balle par vagues avec départ après récupération.",
              "Jeu 4 contre 3 : obligation d’utiliser au moins deux couloirs.",
              "Match à thème : valorisation des tirs pris avant le replacement complet de la défense.",
              "Observation : nombre de transitions terminées par un tir.",
            ],
            evaluation: [
              "Matchs courts avec grille d’observation sur progression, choix et efficacité du tir.",
              "Rôles tournants : joueur, arbitre, observateur de la montée de balle.",
              "Bilan individuel : choix réussi / choix à améliorer.",
            ],
          },
          pointsAttention: [
            "Veiller à l’occupation de la largeur : éviter le jeu en grappe.",
            "Valoriser la passe vers l’avant avant le dribble systématique.",
            "Adapter les effectifs pour créer des réussites rapides.",
          ],
          criteresReussite: [
            "La balle atteint la zone favorable avant le replacement défensif.",
            "Le porteur a au moins une solution de passe vers l’avant.",
            "Le tir est pris en situation favorable et non sous pression excessive.",
          ],
        },
        {
          id: "hand-creer-decalage",
          label: "Créer un décalage",
          phrase: "Créer un décalage par fixation, passe et déplacement pour accéder à un tir favorable.",
          objectifsSeance: {
            apprentissage: [
              "Fixer un défenseur avant de transmettre à un partenaire démarqué.",
              "Se démarquer dans un espace libre pour offrir une solution de passe.",
              "Enchaîner passe et déplacement pour rester disponible.",
              "Repérer le moment où le défenseur est engagé.",
            ],
            stabilisation: [
              "Conserver la continuité du jeu après une fixation.",
              "Utiliser appui et soutien pour maintenir des solutions autour du porteur.",
              "Faire circuler la balle pour déplacer le bloc défensif.",
            ],
          },
          contenus: {
            apprentissage: [
              "Situation 2 contre 1 puis 3 contre 2 avec zone de tir à atteindre.",
              "Atelier fixation-passe : le porteur doit engager le défenseur avant de transmettre.",
              "Match à thème : point bonus après fixation réussie.",
              "Observation : le défenseur a-t-il été réellement fixé ?",
            ],
            stabilisation: [
              "Jeu réduit 4 contre 4 avec interdiction de dribbler plus de trois fois.",
              "Situation d’attaque placée avec appui et soutien imposés.",
              "Bilan vidéo ou oral rapide sur les moments de décalage.",
            ],
          },
          pointsAttention: [
            "Ne pas confondre vitesse d’exécution et précipitation.",
            "Faire verbaliser le moment où le décalage apparaît.",
          ],
          criteresReussite: [
            "Le défenseur est engagé avant la passe.",
            "Le receveur reçoit dans un espace libre.",
            "L’action se termine par un tir ou une situation de tir favorable.",
          ],
        },
      ],
    },

    basket: {
      id: "basket",
      label: "Basketball",
      champ: "coop",
      objectifsSequence: [
        {
          id: "basket-monter-tirer",
          label: "Monter vite au tir",
          phrase: "Progresser rapidement vers la cible pour tirer avant l’organisation défensive.",
          objectifsSeance: {
            apprentissage: [
              "Orienter sa réception vers l’avant pour enchaîner rapidement.",
              "Choisir entre dribble de progression et passe à un partenaire lancé.",
              "Occuper les couloirs pour éviter l’alignement des joueurs.",
              "Finir la montée de balle par un tir proche du panier.",
            ],
            stabilisation: [
              "Enchaîner récupération, sortie de balle et tir rapide.",
              "Conserver la maîtrise de la balle malgré la vitesse.",
              "Se rendre disponible dans un couloir de jeu direct.",
            ],
          },
          contenus: {
            apprentissage: [
              "Échauffement : passes en course, réception orientée, tir en course.",
              "Situation 3 contre 1 puis 3 contre 2 avec tir en moins de 10 secondes.",
              "Match à thème : bonus si le tir est pris après une montée rapide collective.",
              "Observation : nombre de tirs proches obtenus en transition.",
            ],
            stabilisation: [
              "Vagues de contre-attaque avec défenseur retard.",
              "Jeu 4 contre 3 sur terrain réduit.",
              "Défi collectif : atteindre un nombre de tirs proches en temps limité.",
            ],
          },
          pointsAttention: [
            "Limiter les dribbles inutiles qui ralentissent la montée de balle.",
            "Insister sur la réception orientée et la passe dans la course.",
          ],
          criteresReussite: [
            "La balle arrive rapidement près du panier.",
            "Le tir est pris en situation équilibrée.",
            "Les partenaires occupent des espaces différents.",
          ],
        },
        {
          id: "basket-creer-tir",
          label: "Créer un tir favorable",
          phrase: "Créer un tir favorable par démarquage, fixation et occupation efficace de l’espace.",
          objectifsSeance: {
            apprentissage: [
              "Se démarquer à distance de passe utile.",
              "Fixer son défenseur avant de passer ou d’attaquer le panier.",
              "Libérer un espace par déplacement après la passe.",
              "Choisir un tir proche ou une passe selon la pression.",
            ],
            stabilisation: [
              "Maintenir l’espacement en attaque placée.",
              "Enchaîner passe, déplacement et réception.",
              "Identifier le partenaire le mieux placé pour tirer.",
            ],
          },
          contenus: {
            apprentissage: [
              "Jeu 2 contre 1 puis 3 contre 2 autour du panier.",
              "Atelier passe-et-va avec défenseur passif puis actif.",
              "Match à thème : tir bonifié après passe décisive.",
              "Observation : le tireur était-il démarqué ?",
            ],
            stabilisation: [
              "Jeu 4 contre 4 demi-terrain avec zones d’occupation.",
              "Défi : obtenir un tir proche après au moins deux passes.",
              "Bilan sur les déplacements qui créent réellement un espace.",
            ],
          },
          pointsAttention: [
            "Éviter l’attroupement autour du porteur.",
            "Matérialiser les espaces utiles si besoin.",
          ],
          criteresReussite: [
            "Le tireur reçoit sans pression immédiate.",
            "Le ballon circule avant le tir.",
            "Les déplacements ouvrent une ligne de passe.",
          ],
        },
      ],
    },

    foot: {
      id: "foot",
      label: "Football",
      champ: "coop",
      objectifsSequence: [
        {
          id: "foot-conserver-progresser",
          label: "Conserver pour progresser",
          phrase: "Conserver le ballon collectivement pour progresser vers une zone de tir favorable.",
          objectifsSeance: {
            apprentissage: [
              "Offrir une solution de passe en sortant de l’alignement défenseur-porteur.",
              "Contrôler puis orienter le ballon vers l’espace libre.",
              "Choisir entre conserver, passer ou avancer selon la pression.",
              "Utiliser la largeur pour contourner un regroupement défensif.",
            ],
            stabilisation: [
              "Enchaîner contrôle, passe et déplacement en jeu réduit.",
              "Changer le côté du jeu pour exploiter un espace libre.",
              "Limiter les pertes de balle sous pression modérée.",
            ],
          },
          contenus: {
            apprentissage: [
              "Toro évolutif avec obligation de se rendre disponible après la passe.",
              "Jeu 4 contre 2 puis 4 contre 3 pour franchir une ligne.",
              "Match à thème : point si l’équipe franchit une zone par passe.",
              "Observation : nombre de solutions offertes au porteur.",
            ],
            stabilisation: [
              "Jeu à zones : progresser d’une zone à l’autre sans ballon rendu.",
              "Match à thème avec bonus pour changement de côté.",
              "Bilan : quels déplacements aident vraiment le porteur ?",
            ],
          },
          pointsAttention: [
            "Réduire l’espace si les élèves sont à l’aise, l’augmenter s’ils perdent trop vite le ballon.",
            "Valoriser les déplacements sans ballon.",
          ],
          criteresReussite: [
            "Le porteur dispose d’au moins deux solutions.",
            "L’équipe progresse sans rendre immédiatement le ballon.",
            "Les passes permettent de sortir de la pression.",
          ],
        },
      ],
    },

    rugby: {
      id: "rugby",
      label: "Rugby",
      champ: "coop",
      objectifsSequence: [
        {
          id: "rugby-avancer-soutenir",
          label: "Avancer et soutenir",
          phrase: "Avancer vers l’en-but en utilisant le soutien proche et la continuité du jeu.",
          objectifsSeance: {
            apprentissage: [
              "Avancer dans l’espace libre en conservant la maîtrise du ballon.",
              "Se placer en soutien proche du porteur.",
              "Transmettre après contact ou toucher pour maintenir l’avancée.",
              "Respecter les règles de sécurité dans l’opposition.",
            ],
            stabilisation: [
              "Maintenir la continuité du jeu après un blocage.",
              "Choisir entre avancer seul ou transmettre à un soutien.",
              "Réorganiser rapidement la ligne d’attaque.",
            ],
          },
          contenus: {
            apprentissage: [
              "Jeux de toucher avec zones à franchir.",
              "Situation 2 contre 1 puis 3 contre 2 avec soutien obligatoire.",
              "Match à thème : bonus si l’essai est marqué après relais d’un soutien.",
              "Rappel sécurité : contacts adaptés, engagement maîtrisé.",
            ],
            stabilisation: [
              "Jeu réduit avec obligation de replacement derrière le porteur.",
              "Défi collectif : franchir plusieurs zones sans perte de balle.",
              "Observation : présence ou absence d’un soutien utile.",
            ],
          },
          pointsAttention: [
            "Adapter le degré de contact au niveau et au contexte.",
            "Clarifier les règles de sécurité avant chaque opposition.",
          ],
          criteresReussite: [
            "Le porteur avance avant d’être touché ou bloqué.",
            "Un soutien est disponible dans l’axe proche.",
            "Le ballon reste vivant après l’opposition.",
          ],
        },
      ],
    },

    volley: {
      id: "volley",
      label: "Volleyball",
      champ: "coop",
      objectifsSequence: [
        {
          id: "volley-organiser-attaque",
          label: "Construire l’attaque",
          phrase: "Organiser la réception et la passe pour construire une attaque vers une zone libre.",
          objectifsSeance: {
            apprentissage: [
              "Se placer tôt sous le ballon pour stabiliser la première touche.",
              "Orienter la balle vers un partenaire passeur.",
              "Envoyer le ballon dans une zone libre plutôt que renvoyer au hasard.",
              "Communiquer pour éviter les ballons non joués.",
            ],
            stabilisation: [
              "Construire régulièrement en deux ou trois touches.",
              "Identifier une zone adverse moins défendue.",
              "Stabiliser l’organisation réception-passe-renvoi.",
            ],
          },
          contenus: {
            apprentissage: [
              "Échauffement avec trajectoires hautes et appels de balle.",
              "Situation 2 contre 2 puis 3 contre 3 avec obligation de deux touches minimum.",
              "Cibles au sol dans le camp adverse.",
              "Observation : nombre d’échanges construits en deux ou trois touches.",
            ],
            stabilisation: [
              "Jeu 3 contre 3 avec rôles réceptionneur / passeur / attaquant.",
              "Match à thème : bonus si le point est marqué dans une zone annoncée.",
              "Bilan sur la communication et le placement.",
            ],
          },
          pointsAttention: [
            "Alléger les contraintes techniques si l’échange ne dure pas.",
            "Valoriser la hauteur de balle et le temps donné au partenaire.",
          ],
          criteresReussite: [
            "La première touche est orientée vers un partenaire.",
            "L’équipe construit avant de renvoyer.",
            "Le renvoi vise une zone libre.",
          ],
        },
      ],
    },

    badminton: {
      id: "badminton",
      label: "Badminton",
      champ: "coop",
      objectifsSequence: [
        {
          id: "bad-deplacer-adversaire",
          label: "Déplacer l’adversaire",
          phrase: "Varier longueur et direction de frappe pour déplacer l’adversaire et créer une zone libre.",
          objectifsSeance: {
            apprentissage: [
              "Alterner jeu long et jeu court pour provoquer un déplacement.",
              "Se replacer au centre du terrain après la frappe.",
              "Identifier la zone libre avant de choisir sa frappe.",
              "Construire l’échange avant de chercher à rompre.",
            ],
            stabilisation: [
              "Maintenir l’alternance court / long dans l’échange.",
              "Déplacer l’adversaire avant de chercher le point gagnant.",
              "Adapter la frappe au placement adverse.",
              "Observer si la frappe produit réellement un déplacement.",
            ],
            evaluation: [
              "Réinvestir la variation des zones dans un match à thème.",
              "Construire le point en utilisant au moins deux zones différentes.",
              "Assumer l’arbitrage et l’observation d’un critère tactique.",
            ],
          },
          contenus: {
            apprentissage: [
              "Gammes court / long avec cibles matérialisées.",
              "Situation 1 contre 1 : point bonus si l’adversaire sort de sa zone centrale.",
              "Match à thème : jouer deux zones différentes avant de marquer.",
              "Observation : nombre de frappes qui déplacent réellement l’adversaire.",
            ],
            stabilisation: [
              "Défi zones : marquer dans une zone libre après déplacement adverse.",
              "Montante-descendante avec contrainte court / long.",
              "Fiche observateur : replacement et choix de zone.",
            ],
            evaluation: [
              "Matchs courts avec grille : variation, replacement, intention tactique.",
              "Rôle d’arbitre-observateur à chaque rotation.",
              "Bilan individuel : zone préférée, zone à mieux exploiter.",
            ],
          },
          pointsAttention: [
            "Ne pas demander la rupture trop tôt : installer d’abord l’échange.",
            "Matérialiser les zones pour rendre les choix visibles.",
          ],
          criteresReussite: [
            "L’adversaire est déplacé hors de sa zone centrale.",
            "Le joueur se replace après la frappe.",
            "La rupture intervient après une construction.",
          ],
        },
        {
          id: "bad-repousser",
          label: "Repousser au fond",
          phrase: "Jouer long pour repousser l’adversaire et se donner du temps pour se replacer.",
          objectifsSeance: {
            apprentissage: [
              "Produire une trajectoire haute et longue vers le fond du court.",
              "Se replacer pendant le temps de vol du volant.",
              "Différencier une frappe de dégagement d’un renvoi court subi.",
            ],
            stabilisation: [
              "Utiliser le dégagement quand l’adversaire avance.",
              "Alterner dégagement et amorti selon le placement adverse.",
            ],
          },
          contenus: {
            apprentissage: [
              "Atelier trajectoires longues avec zones cibles au fond.",
              "Duel coopératif : tenir 6 échanges longs.",
              "Match à thème : point bonus si l’adversaire recule avant la rupture.",
            ],
            stabilisation: [
              "Jeu conditionnel : annoncer long ou court avant la frappe.",
              "Matchs courts avec observation du replacement.",
            ],
          },
          pointsAttention: [
            "Aider les élèves à produire de la hauteur, pas seulement de la force.",
          ],
          criteresReussite: [
            "Le volant atteint le fond du court.",
            "Le joueur a le temps de se replacer.",
            "L’adversaire est repoussé vers l’arrière.",
          ],
        },
      ],
    },

    tennis: {
      id: "tennis",
      label: "Tennis",
      champ: "coop",
      objectifsSequence: [
        {
          id: "tennis-zones",
          label: "Construire avec les zones",
          phrase: "Viser des zones variées pour déplacer l’adversaire et construire le point.",
          objectifsSeance: {
            apprentissage: [
              "Orienter la raquette pour viser une zone annoncée.",
              "Alterner jeu croisé et décroisé dans une situation aménagée.",
              "Se replacer après la frappe pour couvrir le terrain.",
              "Construire l’échange avant de conclure.",
            ],
            stabilisation: [
              "Varier les zones en fonction du placement adverse.",
              "Maintenir la régularité tout en changeant de direction.",
              "Choisir une zone libre pour rompre l’échange.",
            ],
          },
          contenus: {
            apprentissage: [
              "Ateliers de frappes vers zones matérialisées.",
              "Échanges coopératifs croisé / décroisé.",
              "Match à thème : point bonus si le joueur vise une zone annoncée.",
            ],
            stabilisation: [
              "Jeu 1 contre 1 avec zones bonifiées.",
              "Défi : déplacer l’adversaire avant de chercher le point.",
              "Observation : choix de zone et replacement.",
            ],
          },
          pointsAttention: [
            "Adapter les balles, distances et rebonds au niveau des élèves.",
          ],
          criteresReussite: [
            "La frappe atteint une zone intentionnelle.",
            "Le joueur se replace après la frappe.",
            "L’adversaire est déplacé avant la rupture.",
          ],
        },
      ],
    },

    orient: {
      id: "orient",
      label: "Course d’orientation",
      champ: "adapt",
      objectifsSequence: [
        {
          id: "orient-itineraire-sur",
          label: "Choisir un itinéraire sûr",
          phrase: "Choisir un itinéraire simple et sûr en utilisant les lignes directrices et les points remarquables.",
          objectifsSeance: {
            apprentissage: [
              "Orienter la carte à partir d’éléments remarquables.",
              "Choisir un itinéraire en privilégiant les lignes directrices.",
              "Identifier un point d’attaque avant de quitter un chemin.",
              "Revenir au point de regroupement dans le temps prévu.",
            ],
            stabilisation: [
              "Comparer deux itinéraires possibles avant de partir.",
              "Adapter son choix si le terrain ne correspond pas à ce qui était prévu.",
              "Gérer son temps sur un parcours en étoile ou en score.",
            ],
            evaluation: [
              "Réaliser un parcours en autonomie dans le temps imparti.",
              "Justifier un choix d’itinéraire après la course.",
              "Respecter les limites, consignes de sécurité et procédure de retour.",
            ],
          },
          contenus: {
            apprentissage: [
              "Lecture collective de carte avant départ.",
              "Parcours en étoile avec balises proches puis éloignées.",
              "Travail en binôme : un élève annonce son itinéraire avant le départ.",
              "Bilan : itinéraire prévu / itinéraire réellement suivi.",
            ],
            stabilisation: [
              "Parcours à choix : deux itinéraires possibles vers la même balise.",
              "Défi temps : annoncer puis respecter un temps de retour.",
              "Carton d’observation : ligne directrice utilisée, point d’attaque choisi.",
            ],
            evaluation: [
              "Parcours individuel ou binôme avec ordre de balises imposé.",
              "Contrôle des retours et respect du temps limite.",
              "Court bilan écrit ou oral sur un choix d’itinéraire.",
            ],
          },
          pointsAttention: [
            "Définir précisément les limites de zone et les procédures de retour.",
            "Privilégier l’autonomie progressive : proche, visible, puis plus éloigné.",
          ],
          criteresReussite: [
            "L’élève annonce un itinéraire avant de partir.",
            "Il utilise une ligne directrice identifiable.",
            "Il revient dans le temps prévu avec la balise validée.",
          ],
        },
      ],
    },

    escalade: {
      id: "escalade",
      label: "Escalade",
      champ: "adapt",
      objectifsSequence: [
        {
          id: "escalade-assurer",
          label: "Assurer en sécurité",
          phrase: "Assurer un grimpeur en moulinette en respectant la chaîne de sécurité et la communication.",
          objectifsSeance: {
            apprentissage: [
              "Réaliser les vérifications mutuelles avant le départ.",
              "Assurer avec une corde tendue sans bloquer le grimpeur.",
              "Utiliser les commandes simples de communication grimpeur-assureur.",
              "Se placer correctement comme contre-assureur.",
            ],
            stabilisation: [
              "Maintenir une vigilance constante pendant toute l’ascension.",
              "Réagir correctement à une demande de tension ou de descente.",
              "Assurer différents partenaires en conservant le protocole.",
            ],
            evaluation: [
              "Valider le protocole d’assurage dans une voie adaptée.",
              "Assumer les rôles grimpeur, assureur et contre-assureur.",
              "Identifier une erreur de sécurité et la corriger.",
            ],
          },
          contenus: {
            apprentissage: [
              "Démonstration du protocole : baudrier, nœud, frein, vérification croisée.",
              "Atelier au sol : avaler / donner du mou / bloquer.",
              "Ascensions courtes avec contre-assurage renforcé.",
              "Bilan : les étapes de la chaîne de sécurité.",
            ],
            stabilisation: [
              "Rotations sur voies faciles avec grille de validation assureur.",
              "Situations avec consignes de communication imposées.",
              "Observation par binôme : corde, placement, vigilance.",
            ],
            evaluation: [
              "Passage de validation assureur sur voie adaptée.",
              "Fiche critériée : nœud, frein, vérification, communication, descente.",
              "Retour individualisé sur les points de vigilance.",
            ],
          },
          pointsAttention: [
            "Ne jamais laisser un assureur non validé sans contre-assurage.",
            "Privilégier des voies faciles pour centrer la séance sur la sécurité.",
          ],
          criteresReussite: [
            "Les vérifications sont réalisées avant chaque départ.",
            "La corde reste maîtrisée pendant l’ascension.",
            "La descente est lente, contrôlée et communiquée.",
          ],
        },
        {
          id: "escalade-grimper-efficace",
          label: "Grimper efficacement",
          phrase: "Grimper en économisant ses bras grâce au placement des pieds et à l’équilibre du corps.",
          objectifsSeance: {
            apprentissage: [
              "Chercher des appuis de pieds avant de tirer sur les bras.",
              "Se rapprocher du mur pour mieux transférer le poids du corps.",
              "Utiliser les jambes pour pousser et progresser.",
              "S’arrêter pour lire la suite de la voie.",
            ],
            stabilisation: [
              "Choisir une voie adaptée pour grimper sans précipitation.",
              "Réduire les mouvements inutiles et les blocages.",
              "Comparer deux façons de franchir un passage.",
            ],
          },
          contenus: {
            apprentissage: [
              "Traversées basses centrées sur les pieds.",
              "Défi : grimper avec bras tendus le plus souvent possible.",
              "Voies faciles avec consigne de pause lecture à mi-parcours.",
              "Observation : nombre d’appuis de pieds utilisés.",
            ],
            stabilisation: [
              "Ateliers de voies avec contraintes : silence des pieds, bras longs, pauses.",
              "Binôme observateur sur placement de bassin et poussée des jambes.",
              "Bilan : ce qui économise l’énergie.",
            ],
          },
          pointsAttention: [
            "Éviter de complexifier la voie si le placement des pieds n’est pas acquis.",
          ],
          criteresReussite: [
            "L’élève utilise les pieds avant de tirer avec les bras.",
            "Il conserve une grimpe fluide et contrôlée.",
            "Il termine la voie avec moins de fatigue inutile.",
          ],
        },
      ],
    },

    athle: {
      id: "athle",
      label: "Athlétisme",
      champ: "perf",
      objectifsSequence: [
        {
          id: "athle-allure-reguliere",
          label: "Tenir une allure régulière",
          phrase: "Construire une allure régulière pour réaliser la meilleure performance possible sur une durée ou une distance donnée.",
          objectifsSeance: {
            apprentissage: [
              "Identifier une allure soutenable à partir de repères simples.",
              "Maintenir une vitesse régulière sur plusieurs fractions.",
              "Adapter son départ pour ne pas subir la fin de course.",
              "Utiliser un temps de passage pour réguler son effort.",
            ],
            stabilisation: [
              "Reproduire une allure cible sur plusieurs répétitions.",
              "Comparer allure prévue et allure réalisée.",
              "Ajuster sa vitesse à partir des sensations et du chronomètre.",
            ],
            evaluation: [
              "Réaliser une performance en respectant un projet d’allure.",
              "Analyser l’écart entre temps prévu et temps réalisé.",
              "Assumer un rôle de chronométreur ou observateur.",
            ],
          },
          contenus: {
            apprentissage: [
              "Échauffement progressif avec repères respiratoires.",
              "Séries de courses à allure imposée avec temps de passage.",
              "Binômes coureur / chronométreur.",
              "Bilan : allure trop rapide, trop lente ou régulière ?",
            ],
            stabilisation: [
              "Contrat d’allure sur 3 à 5 répétitions.",
              "Course en binôme avec annonce du temps visé.",
              "Tableau simple prévu / réalisé.",
            ],
            evaluation: [
              "Épreuve chronométrée avec projet d’allure annoncé.",
              "Rôle d’observateur des passages.",
              "Retour individuel sur régularité et gestion de l’effort.",
            ],
          },
          pointsAttention: [
            "Éviter les départs trop rapides en donnant des repères de passage.",
            "Adapter les distances ou durées aux profils d’élèves.",
          ],
          criteresReussite: [
            "L’écart entre les fractions reste limité.",
            "L’élève termine sans rupture importante d’allure.",
            "Le projet annoncé est cohérent avec le résultat.",
          ],
        },
        {
          id: "athle-vitesse-depart",
          label: "Accélérer efficacement",
          phrase: "Produire une accélération efficace en coordonnant départ, poussée et fréquence d’appuis.",
          objectifsSeance: {
            apprentissage: [
              "Adopter une position de départ stable et orientée.",
              "Pousser fort sur les premiers appuis.",
              "Augmenter progressivement la fréquence sans se désorganiser.",
              "Courir dans son couloir jusqu’à la ligne.",
            ],
            stabilisation: [
              "Reproduire un départ efficace sur plusieurs essais.",
              "Comparer différents départs pour identifier le plus efficace.",
              "Maintenir l’accélération sans se redresser trop tôt.",
            ],
          },
          contenus: {
            apprentissage: [
              "Départs variés sur 10 à 20 mètres.",
              "Atelier poussée : départ arrêté avec repère au sol.",
              "Duel de vitesse court avec récupération complète.",
              "Observation : position de départ et premiers appuis.",
            ],
            stabilisation: [
              "Séries de sprints courts chronométrés.",
              "Binôme observateur : poussée, regard, redressement.",
              "Défi personnel : améliorer ou stabiliser son temps.",
            ],
          },
          pointsAttention: [
            "Prévoir des récupérations complètes pour conserver la qualité.",
            "Sécuriser les couloirs et les zones de décélération.",
          ],
          criteresReussite: [
            "Le départ est explosif et contrôlé.",
            "Les premiers appuis poussent vers l’avant.",
            "La course reste orientée jusqu’à la ligne.",
          ],
        },
      ],
    },

    "course-duree": {
      id: "course-duree",
      label: "Course en durée",
      champ: "ca5",
      objectifsSequence: [
        {
          id: "course-reguler-allure",
          label: "Réguler son allure",
          phrase: "Réguler son allure à partir de repères internes et externes pour tenir un effort choisi.",
          objectifsSeance: {
            apprentissage: [
              "Choisir une allure adaptée à une durée annoncée.",
              "Utiliser la respiration, les sensations ou la fréquence cardiaque pour réguler.",
              "Identifier une allure trop rapide avant la rupture.",
              "Respecter une zone d’effort ciblée.",
            ],
            stabilisation: [
              "Reproduire une allure cible sur plusieurs blocs de course.",
              "Ajuster son effort à partir du ressenti et du chronomètre.",
              "Comparer son projet d’effort et sa réalisation.",
            ],
            evaluation: [
              "Conduire un projet de course cohérent avec un effet recherché.",
              "Justifier les choix d’allure et de récupération.",
              "Analyser sa régulation après l’effort.",
            ],
          },
          contenus: {
            apprentissage: [
              "Échauffement progressif avec échelle de ressenti.",
              "Blocs de course à allure choisie avec récupération contrôlée.",
              "Relevés simples : temps, distance, RPE ou FC si disponible.",
              "Bilan : allure choisie, ressentis, ajustements.",
            ],
            stabilisation: [
              "Séance en blocs : régularité sur plusieurs répétitions.",
              "Contrat personnel d’allure ou de distance.",
              "Comparaison prévu / réalisé.",
            ],
            evaluation: [
              "Séance projet : objectif d’effort annoncé avant départ.",
              "Carnet de suivi : allure, ressenti, récupération.",
              "Retour individuel sur cohérence du projet.",
            ],
          },
          pointsAttention: [
            "Éviter la logique uniquement compétitive : centrer sur le projet et la régulation.",
            "Utiliser des repères simples si la FC n’est pas disponible.",
          ],
          criteresReussite: [
            "L’élève tient la durée prévue sans rupture.",
            "L’allure reste cohérente avec l’effet recherché.",
            "L’élève sait expliquer un ajustement réalisé.",
          ],
        },
      ],
    },

    cross: {
      id: "cross",
      label: "Cross-training",
      champ: "ca5",
      objectifsSequence: [
        {
          id: "cross-circuit-reguler",
          label: "Réguler un circuit",
          phrase: "Réaliser un circuit d’entraînement adapté en régulant intensité, récupération et qualité d’exécution.",
          objectifsSeance: {
            apprentissage: [
              "Réaliser les mouvements avec une qualité prioritaire sur la vitesse.",
              "Adapter la charge ou la variante à son niveau.",
              "Utiliser le RPE pour réguler l’intensité.",
              "Respecter les temps d’effort et de récupération.",
            ],
            stabilisation: [
              "Maintenir une qualité d’exécution malgré la fatigue.",
              "Choisir une variante cohérente avec l’objectif d’effort.",
              "Comparer deux formats d’entraînement et leurs effets.",
            ],
            evaluation: [
              "Conduire un circuit personnalisé en respectant les paramètres annoncés.",
              "Justifier ses choix de charge, répétitions et récupération.",
            ],
          },
          contenus: {
            apprentissage: [
              "Présentation technique des mouvements du circuit.",
              "Circuit court en ateliers avec consignes de qualité.",
              "Auto-positionnement RPE après chaque bloc.",
              "Bilan : quel exercice nécessite une adaptation ?",
            ],
            stabilisation: [
              "Circuit en binôme : pratiquant / observateur qualité.",
              "Choix de variantes faciles, moyennes ou difficiles.",
              "Tableau de suivi : intensité, récupération, qualité.",
            ],
            evaluation: [
              "Circuit projet avec paramètres annoncés.",
              "Fiche individuelle : objectif, choix, ressenti, bilan.",
            ],
          },
          pointsAttention: [
            "Ne pas sacrifier la qualité technique à la quantité.",
            "Prévoir des variantes inclusives pour chaque exercice.",
          ],
          criteresReussite: [
            "Les mouvements restent maîtrisés.",
            "L’intensité correspond à l’objectif annoncé.",
            "La récupération permet de poursuivre sans dégradation majeure.",
          ],
        },
      ],
    },

    natation: {
      id: "natation",
      label: "Natation",
      champ: "perf",
      objectifsSequence: [
        {
          id: "natation-glisse-respiration",
          label: "Nager efficacement",
          phrase: "Améliorer la glisse et la respiration pour nager plus longtemps sans se désorganiser.",
          objectifsSeance: {
            apprentissage: [
              "Aligner le corps pour limiter les résistances.",
              "Expirer dans l’eau et inspirer sans relever excessivement la tête.",
              "Coordonner propulsion, respiration et équilibre.",
              "Maintenir une nage régulière sur une distance adaptée.",
            ],
            stabilisation: [
              "Répéter des longueurs en conservant la même organisation.",
              "Identifier le moment où la technique se dégrade.",
              "Adapter l’allure pour maintenir la qualité de nage.",
            ],
            evaluation: [
              "Réaliser une distance annoncée avec une nage maîtrisée.",
              "Identifier ses points techniques prioritaires.",
            ],
          },
          contenus: {
            apprentissage: [
              "Éducatifs de respiration avec planche ou appuis adaptés.",
              "Séries courtes centrées sur alignement, expiration et glisse.",
              "Travail par couloirs de niveau.",
              "Bilan : ce qui aide à nager sans s’arrêter.",
            ],
            stabilisation: [
              "Séries régulières avec récupération contrôlée.",
              "Binôme observateur sur respiration et alignement.",
              "Défi distance avec maintien de la qualité.",
            ],
            evaluation: [
              "Parcours ou distance continue adaptée.",
              "Fiche d’auto-évaluation technique.",
            ],
          },
          pointsAttention: [
            "Adapter les distances aux niveaux de sécurité aquatique.",
            "Ne pas augmenter la distance si la respiration reste désorganisée.",
          ],
          criteresReussite: [
            "L’expiration se fait dans l’eau.",
            "Le corps reste aligné.",
            "La distance est réalisée sans arrêt subi.",
          ],
        },
      ],
    },

    "nat-duree": {
      id: "nat-duree",
      label: "Natation en durée",
      champ: "ca5",
      objectifsSequence: [
        {
          id: "natduree-gerer-effort",
          label: "Gérer son effort dans l’eau",
          phrase: "Gérer son allure et sa technique pour maintenir un effort régulier en milieu aquatique.",
          objectifsSeance: {
            apprentissage: [
              "Choisir une allure permettant de nager sans rupture.",
              "Réguler la respiration pour maintenir l’effort.",
              "Alterner nage complète et éducatifs pour préserver la qualité.",
            ],
            stabilisation: [
              "Reproduire une allure sur plusieurs séries.",
              "Adapter la récupération selon le ressenti.",
              "Maintenir une technique efficace malgré la durée.",
            ],
          },
          contenus: {
            apprentissage: [
              "Séries courtes à allure confortable avec récupération fixe.",
              "Repères de respiration et de glisse.",
              "Carnet simple : distance, ressenti, récupération.",
            ],
            stabilisation: [
              "Blocs de nage en durée avec allure annoncée.",
              "Auto-évaluation du ressenti d’effort.",
              "Bilan sur les paramètres efficaces.",
            ],
          },
          pointsAttention: [
            "La sécurité aquatique prime sur la logique d’entraînement.",
          ],
          criteresReussite: [
            "L’effort est maintenu sans arrêt subi.",
            "L’élève adapte son allure à ses ressources.",
            "La technique reste suffisamment stable.",
          ],
        },
      ],
    },

    danse: {
      id: "danse",
      label: "Danse",
      champ: "expr",
      objectifsSequence: [
        {
          id: "danse-intention-lisible",
          label: "Rendre une intention lisible",
          phrase: "Construire une phrase chorégraphique lisible à partir de contrastes d’énergie, d’espace et de temps.",
          objectifsSeance: {
            decouverte: [
              "Explorer différentes qualités de mouvement à partir d’une contrainte simple.",
              "Accepter de se montrer et d’observer sans juger.",
              "Transformer un geste quotidien en mouvement dansé.",
            ],
            apprentissage: [
              "Choisir des mouvements cohérents avec une intention.",
              "Utiliser un contraste d’énergie pour rendre la phrase plus lisible.",
              "Organiser début, développement et fin dans une courte phrase.",
              "Observer un critère précis de lisibilité chez un groupe.",
            ],
            stabilisation: [
              "Répéter la phrase pour stabiliser les repères collectifs.",
              "Renforcer les contrastes d’espace, de temps ou d’énergie.",
              "Adapter son engagement corporel au regard du spectateur.",
            ],
            evaluation: [
              "Présenter une composition courte devant un public.",
              "Assumer les rôles de danseur, spectateur et observateur.",
              "Identifier les éléments qui rendent l’intention visible.",
            ],
          },
          contenus: {
            decouverte: [
              "Échauffement guidé sur énergie lente / rapide / saccadée / fluide.",
              "Improvisations courtes à partir de verbes d’action.",
              "Présentation en petits groupes sans notation.",
              "Bilan : qu’a-t-on compris en regardant ?",
            ],
            apprentissage: [
              "Atelier de transformation du mouvement : espace, énergie, temps.",
              "Création d’une phrase de 4 à 6 mouvements.",
              "Regard croisé avec critère unique : intention lisible ou non.",
              "Réécriture d’un passage après retour d’observateurs.",
            ],
            stabilisation: [
              "Répétitions avec repères de placement et de départ.",
              "Ajout d’un contraste obligatoire.",
              "Filage devant un autre groupe avec retour ciblé.",
            ],
            evaluation: [
              "Présentation finale par groupes.",
              "Grille simple : intention, engagement, composition, rôle de spectateur.",
              "Bilan oral ou écrit sur les choix chorégraphiques.",
            ],
          },
          pointsAttention: [
            "Installer un climat de confiance avant la présentation.",
            "Donner des critères d’observation simples pour éviter les jugements personnels.",
          ],
          criteresReussite: [
            "Le spectateur identifie une intention.",
            "La phrase comporte des contrastes visibles.",
            "Le groupe assume le début et la fin de la prestation.",
          ],
        },
      ],
    },

    acrosport: {
      id: "acrosport",
      label: "Acrosport",
      champ: "expr",
      objectifsSequence: [
        {
          id: "acro-composer-securite",
          label: "Composer en sécurité",
          phrase: "Composer un enchaînement acrobatique lisible en respectant les règles de sécurité des portés.",
          objectifsSeance: {
            apprentissage: [
              "Construire une figure stable avec rôles clairement identifiés.",
              "Respecter les placements porteur, voltigeur et pareur.",
              "Enchaîner deux figures avec une transition simple.",
              "Observer la stabilité et la sécurité d’une figure.",
            ],
            stabilisation: [
              "Fluidifier les transitions entre figures.",
              "Rendre l’enchaînement lisible par une entrée et une sortie.",
              "Adapter la difficulté des figures au niveau du groupe.",
            ],
            evaluation: [
              "Présenter un enchaînement maîtrisé devant un public.",
              "Assumer son rôle dans la sécurité du groupe.",
              "Identifier les critères de stabilité et de lisibilité.",
            ],
          },
          contenus: {
            apprentissage: [
              "Rappel des règles de sécurité : appuis, gainage, pareur.",
              "Ateliers de figures à difficulté progressive.",
              "Création d’un enchaînement de deux figures avec transition.",
              "Observation : figure stable trois secondes ?",
            ],
            stabilisation: [
              "Répétition par groupes avec choix de figures adaptées.",
              "Travail des transitions et de la synchronisation.",
              "Filage devant un groupe observateur.",
            ],
            evaluation: [
              "Présentation finale avec grille sécurité / stabilité / composition.",
              "Rôle de spectateur-observateur.",
              "Bilan sur les choix de difficulté.",
            ],
          },
          pointsAttention: [
            "Interdire les figures non maîtrisées ou non sécurisées.",
            "Faire primer stabilité et sécurité sur la difficulté.",
          ],
          criteresReussite: [
            "Les rôles sont identifiés et respectés.",
            "Les figures sont stables et sécurisées.",
            "L’enchaînement possède un début, une transition et une fin.",
          ],
        },
      ],
    },

    gym: {
      id: "gym",
      label: "Gymnastique",
      champ: "expr",
      objectifsSequence: [
        {
          id: "gym-enchainer-maitrise",
          label: "Enchaîner avec maîtrise",
          phrase: "Enchaîner des actions gymniques maîtrisées en recherchant amplitude, équilibre et continuité.",
          objectifsSeance: {
            apprentissage: [
              "Réaliser une action gymnique simple avec placement et sécurité.",
              "Contrôler le départ et la réception.",
              "Enchaîner deux actions sans rupture majeure.",
              "Observer un critère technique précis chez un partenaire.",
            ],
            stabilisation: [
              "Stabiliser un enchaînement adapté à son niveau.",
              "Améliorer amplitude, tenue et continuité.",
              "Choisir des éléments maîtrisés plutôt que trop difficiles.",
            ],
            evaluation: [
              "Présenter un enchaînement maîtrisé selon des critères annoncés.",
              "Assumer les rôles de gymnaste, aide et observateur.",
            ],
          },
          contenus: {
            apprentissage: [
              "Ateliers par familles : rouler, se renverser, sauter, s’équilibrer.",
              "Travail avec aides et parades adaptées.",
              "Mini-enchaînement de deux éléments.",
              "Observation : départ, réalisation, réception.",
            ],
            stabilisation: [
              "Construction d’un enchaînement individuel.",
              "Répétitions avec critères de maîtrise.",
              "Passage devant un binôme observateur.",
            ],
            evaluation: [
              "Présentation individuelle ou par petits groupes.",
              "Grille critériée : maîtrise, continuité, sécurité.",
            ],
          },
          pointsAttention: [
            "Adapter les ateliers aux possibilités réelles et au matériel.",
            "Ne pas laisser les aides/parades sans démonstration préalable.",
          ],
          criteresReussite: [
            "Les réceptions sont contrôlées.",
            "Les éléments sont enchaînés sans arrêt long.",
            "La sécurité est respectée dans chaque atelier.",
          ],
        },
      ],
    },

    judo: {
      id: "judo",
      label: "Judo",
      champ: "coop",
      objectifsSequence: [
        {
          id: "judo-desequilibrer",
          label: "Déséquilibrer pour projeter",
          phrase: "Créer un déséquilibre pour projeter ou contrôler un adversaire dans une opposition maîtrisée.",
          objectifsSeance: {
            apprentissage: [
              "Installer une saisie efficace et sécurisée.",
              "Créer un déséquilibre avant d’engager une projection.",
              "Accompagner la chute du partenaire.",
              "Respecter le signal d’arrêt et les règles d’opposition.",
            ],
            stabilisation: [
              "Réaliser la technique sur partenaire semi-opposant.",
              "Choisir le moment favorable pour engager l’action.",
              "Enchaîner projection et contrôle au sol.",
            ],
          },
          contenus: {
            apprentissage: [
              "Rappel des chutes et consignes de sécurité.",
              "Travail du kumi-kata et du déséquilibre en coopération.",
              "Projection guidée sur partenaire consentant.",
              "Observation : déséquilibre avant projection ?",
            ],
            stabilisation: [
              "Randori à thème avec attaque imposée ou zone limitée.",
              "Enchaînement projection / immobilisation.",
              "Bilan sur respect, sécurité et efficacité.",
            ],
          },
          pointsAttention: [
            "Ne jamais aller vers l’opposition libre sans maîtrise des chutes.",
            "Valoriser le contrôle et le respect du partenaire.",
          ],
          criteresReussite: [
            "Le partenaire est déséquilibré avant l’action.",
            "La chute est accompagnée.",
            "L’opposition reste maîtrisée et respectueuse.",
          ],
        },
      ],
    },

    lutte: {
      id: "lutte",
      label: "Lutte",
      champ: "coop",
      objectifsSequence: [
        {
          id: "lutte-retourner-controler",
          label: "Retourner et contrôler",
          phrase: "Retourner et contrôler un adversaire en utilisant appuis, leviers et règles de sécurité.",
          objectifsSeance: {
            apprentissage: [
              "Chercher un contrôle stable sans action dangereuse.",
              "Utiliser le placement du corps pour retourner l’adversaire.",
              "Sortir d’une immobilisation simple.",
              "Respecter les limites et le signal d’arrêt.",
            ],
            stabilisation: [
              "Enchaîner action de retournement et maintien.",
              "Adapter son action à la résistance de l’adversaire.",
              "Arbitrer un duel à règles simples.",
            ],
          },
          contenus: {
            apprentissage: [
              "Jeux de conquête d’objet ou de territoire au sol.",
              "Ateliers retournement avec partenaire coopératif.",
              "Duels courts à thème : contrôler trois secondes.",
              "Rappel sécurité : nuque, articulations, arrêt immédiat.",
            ],
            stabilisation: [
              "Duel semi-opposé avec rôle d’arbitre.",
              "Défi retournement / sortie d’immobilisation.",
              "Observation : contrôle stable ou non.",
            ],
          },
          pointsAttention: [
            "Encadrer strictement les saisies interdites et les zones dangereuses.",
          ],
          criteresReussite: [
            "Le contrôle est stable et sans danger.",
            "L’élève utilise son placement plutôt que la force seule.",
            "Les règles sont respectées pendant tout le duel.",
          ],
        },
      ],
    },

    boxe: {
      id: "boxe",
      label: "Boxe",
      champ: "coop",
      objectifsSequence: [
        {
          id: "boxe-toucher-sans-se-faire",
          label: "Toucher sans se faire toucher",
          phrase: "Toucher sans se faire toucher en combinant garde, déplacements et distance de sécurité.",
          objectifsSeance: {
            apprentissage: [
              "Maintenir une garde efficace après l’attaque.",
              "Se déplacer pour entrer et sortir de distance.",
              "Toucher une cible autorisée avec contrôle.",
              "Respecter l’intégrité du partenaire.",
            ],
            stabilisation: [
              "Enchaîner attaque simple et sortie de distance.",
              "Utiliser l’esquive ou le retrait après une touche.",
              "Observer le respect de la distance et du contrôle.",
            ],
          },
          contenus: {
            apprentissage: [
              "Déplacements sans frappe : entrer / sortir de distance.",
              "Touches contrôlées sur cible ou partenaire protégé.",
              "Opposition coopérative à vitesse réduite.",
              "Bilan sécurité : contrôle, zones autorisées, arrêt.",
            ],
            stabilisation: [
              "Assauts à thème : une attaque puis sortie obligatoire.",
              "Rôle d’observateur : garde après attaque.",
              "Rotations courtes avec récupération et retour au calme.",
            ],
          },
          pointsAttention: [
            "Insister sur la touche contrôlée, jamais sur la puissance.",
            "Prévoir des règles d’arrêt immédiat très claires.",
          ],
          criteresReussite: [
            "La touche est contrôlée.",
            "Le boxeur revient en garde après l’action.",
            "La distance protège les deux partenaires.",
          ],
        },
      ],
    },

    kayak: {
      id: "kayak",
      label: "Kayak",
      champ: "adapt",
      objectifsSequence: [
        {
          id: "kayak-diriger-securite",
          label: "Diriger son embarcation",
          phrase: "Diriger son embarcation en tenant compte du milieu, de la sécurité et des autres pratiquants.",
          objectifsSeance: {
            apprentissage: [
              "Utiliser des coups de pagaie simples pour avancer et tourner.",
              "Stabiliser l’embarcation en situation calme.",
              "Respecter les distances de sécurité sur l’eau.",
              "Adapter sa trajectoire à une consigne simple.",
            ],
            stabilisation: [
              "Enchaîner propulsion, freinage et changement de direction.",
              "Choisir une trajectoire selon le vent, le courant ou les obstacles.",
              "Coopérer pour respecter un parcours collectif.",
            ],
          },
          contenus: {
            apprentissage: [
              "Rappel équipement, embarquement et consignes de sécurité.",
              "Atelier propulsion / freinage / rotation en zone calme.",
              "Parcours simple avec portes larges.",
              "Bilan : trajectoire prévue / trajectoire réalisée.",
            ],
            stabilisation: [
              "Parcours avec choix de trajectoire.",
              "Défi par binôme : suivre une ligne ou contourner des repères.",
              "Observation : coups de pagaie efficaces.",
            ],
          },
          pointsAttention: [
            "Adapter la séance aux conditions météo et au niveau d’aisance aquatique.",
          ],
          criteresReussite: [
            "L’embarcation suit la trajectoire prévue.",
            "Les règles de sécurité sont respectées.",
            "L’élève adapte ses actions au milieu.",
          ],
        },
      ],
    },

    voile: {
      id: "voile",
      label: "Voile",
      champ: "adapt",
      objectifsSequence: [
        {
          id: "voile-regler-trajectoire",
          label: "Régler et se diriger",
          phrase: "Adapter réglages et trajectoire au vent pour naviguer en sécurité.",
          objectifsSeance: {
            apprentissage: [
              "Identifier la direction du vent.",
              "Adapter l’orientation de la voile à une allure simple.",
              "Tenir un rôle clair à bord.",
              "Respecter les consignes de sécurité et de zone.",
            ],
            stabilisation: [
              "Modifier la trajectoire en fonction du vent.",
              "Coordonner les rôles à bord pour changer d’allure.",
              "Anticiper une manœuvre simple.",
            ],
          },
          contenus: {
            apprentissage: [
              "Lecture du vent depuis la berge.",
              "Navigation courte avec rôle barreur / équipier.",
              "Parcours simple entre deux repères.",
              "Bilan : voile trop bordée, choquée ou adaptée ?",
            ],
            stabilisation: [
              "Parcours avec changement d’allure.",
              "Manœuvres répétées en zone sécurisée.",
              "Observation des rôles et de la communication.",
            ],
          },
          pointsAttention: [
            "Décider la séance selon météo réelle, visibilité et sécurité.",
          ],
          criteresReussite: [
            "La trajectoire est contrôlée.",
            "Les rôles à bord sont respectés.",
            "Le réglage est adapté à l’allure demandée.",
          ],
        },
      ],
    },

    cirque: {
      id: "cirque",
      label: "Arts du cirque",
      champ: "expr",
      objectifsSequence: [
        {
          id: "cirque-numero-lisible",
          label: "Créer un numéro lisible",
          phrase: "Créer un numéro de cirque lisible en articulant prouesse, intention et sécurité.",
          objectifsSeance: {
            apprentissage: [
              "Choisir une famille d’actions adaptée à ses possibilités.",
              "Répéter une prouesse simple pour la stabiliser.",
              "Organiser une entrée, un temps fort et une sortie.",
              "Observer la lisibilité du numéro.",
            ],
            stabilisation: [
              "Fluidifier les transitions entre actions.",
              "Renforcer l’effet recherché auprès du spectateur.",
              "Sécuriser les actions à risque avant présentation.",
            ],
            evaluation: [
              "Présenter un numéro maîtrisé devant un public.",
              "Assumer les rôles d’artiste et de spectateur-observateur.",
            ],
          },
          contenus: {
            apprentissage: [
              "Ateliers jonglage, équilibre, acrobatie ou manipulation selon matériel.",
              "Choix d’un fil conducteur simple.",
              "Présentation intermédiaire devant un petit groupe.",
              "Retour ciblé : prouesse visible ? intention comprise ?",
            ],
            stabilisation: [
              "Répétition du numéro avec contraintes de début et fin.",
              "Travail des transitions et du regard public.",
              "Filage avec observateurs.",
            ],
            evaluation: [
              "Présentation finale.",
              "Grille : maîtrise, sécurité, composition, effet produit.",
            ],
          },
          pointsAttention: [
            "Sécuriser strictement les actions acrobatiques ou d’équilibre.",
          ],
          criteresReussite: [
            "Le numéro possède une organisation lisible.",
            "Les actions sont maîtrisées.",
            "Le public comprend l’effet recherché.",
          ],
        },
      ],
    },

    hockey: {
      id: "hockey",
      label: "Hockey",
      champ: "coop",
      objectifsSequence: [
        {
          id: "hockey-conserver-progresser",
          label: "Conserver et progresser",
          phrase: "Conserver la balle avec la crosse pour progresser collectivement vers une zone de tir.",
          objectifsSeance: {
            apprentissage: [
              "Conduire la balle en gardant la crosse basse et maîtrisée.",
              "Offrir une solution de passe à distance utile.",
              "Choisir entre conduire, passer ou tirer selon l’espace.",
              "Respecter les règles de sécurité liées à la crosse.",
            ],
            stabilisation: [
              "Enchaîner conduite, passe et déplacement.",
              "Utiliser la largeur pour contourner l’opposition.",
              "Tirer depuis une zone favorable.",
            ],
          },
          contenus: {
            apprentissage: [
              "Parcours de conduite avec contraintes de sécurité.",
              "Situation 3 contre 1 pour franchir une ligne.",
              "Match à thème : tir autorisé après une passe vers l’avant.",
              "Observation : crosse maîtrisée et solutions de passe.",
            ],
            stabilisation: [
              "Jeu réduit avec zones latérales valorisées.",
              "Défi collectif : atteindre la zone de tir sans perte de balle.",
              "Bilan sécurité et choix tactiques.",
            ],
          },
          pointsAttention: [
            "Rappeler systématiquement les règles de hauteur de crosse et de distance.",
          ],
          criteresReussite: [
            "La balle reste maîtrisée.",
            "Le porteur dispose de solutions.",
            "La sécurité liée à la crosse est respectée.",
          ],
        },
      ],
    },
  };

  var FALLBACK_OBJECTIFS_SEQUENCE = {
    cycle3: {
      perf: [
        {
          id: "fb-c3-perf-reussite",
          label: "Réussite visible",
          phrase: "Réaliser une performance simple avec un critère de réussite clair et observable.",
        },
        {
          id: "fb-c3-perf-repere",
          label: "Repère concret",
          phrase: "Utiliser un repère simple (temps, distance, nombre) pour ajuster son action.",
        },
      ],
      adapt: [
        {
          id: "fb-c3-adapt-securite",
          label: "Déplacement sûr",
          phrase: "Se déplacer dans le milieu en respectant les règles de sécurité et les consignes.",
        },
        {
          id: "fb-c3-adapt-choix",
          label: "Choix simple",
          phrase: "Choisir un itinéraire ou un appui évident à partir d’indices visibles.",
        },
      ],
      expr: [
        {
          id: "fb-c3-expr-oser",
          label: "Oser montrer",
          phrase: "Présenter un court mouvement devant les autres en tenant compte de l’espace et du regard.",
        },
        {
          id: "fb-c3-expr-visible",
          label: "Rendre visible",
          phrase: "Rendre un geste lisible en jouant sur l’énergie, le tempo ou l’espace.",
        },
      ],
      coop: [
        {
          id: "fb-c3-coop-regles",
          label: "Respecter et jouer",
          phrase: "Respecter les règles et participer à l’échange ou à l’affrontement avec des choix simples.",
        },
        {
          id: "fb-c3-coop-aide",
          label: "Aider le partenaire",
          phrase: "Se rendre disponible ou aider un partenaire pour faire réussir l’action collective.",
        },
      ],
      ca5: [
        {
          id: "fb-c3-ca5-sensations",
          label: "Repérer l’effort",
          phrase: "Courir ou s’entraîner à allure modérée en identifiant ses sensations.",
        },
      ],
    },
    cycle4: {
      perf: [
        {
          id: "fb-c4-perf-reguler",
          label: "Réguler la performance",
          phrase: "Ajuster son action à partir de repères chronométriques, spatiaux ou techniques.",
        },
        {
          id: "fb-c4-perf-comparer",
          label: "Comparer pour progresser",
          phrase: "Comparer plusieurs essais pour identifier ce qui améliore la performance.",
        },
      ],
      adapt: [
        {
          id: "fb-c4-adapt-strategie",
          label: "Stratégie de déplacement",
          phrase: "Choisir et adapter son déplacement si le milieu ne correspond pas au plan prévu.",
        },
        {
          id: "fb-c4-adapt-observation",
          label: "Observer pour décider",
          phrase: "Observer le milieu ou le partenaire avant de décider.",
        },
      ],
      expr: [
        {
          id: "fb-c4-expr-composer",
          label: "Composer une phrase",
          phrase: "Construire une prestation lisible à partir d’une intention et de contrastes simples.",
        },
        {
          id: "fb-c4-expr-groupe",
          label: "Présenter en groupe",
          phrase: "Composer et présenter en tenant compte du regard du spectateur et des rôles.",
        },
      ],
      coop: [
        {
          id: "fb-c4-coop-choix",
          label: "Choix tactiques",
          phrase: "Faire des choix tactiques pour créer un avantage avant de conclure.",
        },
        {
          id: "fb-c4-coop-roles",
          label: "Rôles sociaux",
          phrase: "Assumer les rôles de joueur, arbitre ou observateur avec un critère précis.",
        },
      ],
      ca5: [
        {
          id: "fb-c4-ca5-allure",
          label: "Tenir l’allure",
          phrase: "Réguler son allure pour tenir une durée donnée sans rupture d’effort.",
        },
        {
          id: "fb-c4-ca5-repere",
          label: "Repères d’effort",
          phrase: "Utiliser des repères simples (temps, RPE, sensations) pour éviter la rupture.",
        },
      ],
    },
    lycee: {
      perf: [
        {
          id: "fb-ly-perf-projet",
          label: "Projet de performance",
          phrase: "Construire une stratégie de performance à partir d’essais, de mesures et d’analyse.",
        },
        {
          id: "fb-ly-perf-optimiser",
          label: "Optimiser",
          phrase: "Optimiser les paramètres techniques repérés pour améliorer la performance visée.",
        },
      ],
      adapt: [
        {
          id: "fb-ly-adapt-projet",
          label: "Projet en milieu",
          phrase: "Construire un projet de parcours ou de voie adapté à ses ressources et aux contraintes.",
        },
        {
          id: "fb-ly-adapt-analyse",
          label: "Analyser pour ajuster",
          phrase: "Analyser ses choix ou ses erreurs pour ajuster sa méthode.",
        },
      ],
      expr: [
        {
          id: "fb-ly-expr-projet",
          label: "Projet artistique",
          phrase: "Construire un projet artistique assumé et argumenté devant un public.",
        },
        {
          id: "fb-ly-expr-effet",
          label: "Produire un effet",
          phrase: "Affiner l’interprétation pour produire un effet recherché sur le spectateur.",
        },
      ],
      coop: [
        {
          id: "fb-ly-coop-projet",
          label: "Projet de jeu",
          phrase: "Construire un projet collectif adapté au rapport de force et au profil adverse.",
        },
        {
          id: "fb-ly-coop-exploiter",
          label: "Exploiter les faiblesses",
          phrase: "Exploiter les espaces faibles ou les surnombres pour créer une situation favorable.",
        },
      ],
      ca5: [
        {
          id: "fb-ly-ca5-entrainement",
          label: "Projet d’entraînement",
          phrase: "Construire et conduire un projet d’entraînement personnalisé selon un effet recherché.",
        },
        {
          id: "fb-ly-ca5-parametres",
          label: "Paramètres d’effort",
          phrase: "Réguler l’intensité à partir de FC, RPE, vitesse ou sensations.",
        },
      ],
    },
  };

  function normaliserListe(valeur) {
    if (!valeur) return [];
    return Array.isArray(valeur) ? valeur : [valeur];
  }

  function normaliserCycleId(cycleId) {
    if (cycleId === "c3") return "cycle3";
    if (cycleId === "c4") return "cycle4";
    if (cycleId === "cycle3" || cycleId === "cycle4" || cycleId === "lycee") return cycleId;
    return "cycle4";
  }

  function normaliserFamillesFilter(familleId, familleIds) {
    if (familleIds && familleIds.length) {
      return Array.isArray(familleIds) ? familleIds.slice() : [familleIds];
    }
    if (!familleId) return [];
    return Array.isArray(familleId) ? familleId.slice() : [familleId];
  }

  /** Objectifs de séquence pour un cycle (nouveau format cycles.* ou ancien objectifsSequence). */
  function objectifsSequencePourCycle(apsa, cycleId, familleId, familleIds) {
    if (!apsa) return [];
    var cycle = normaliserCycleId(cycleId);
    var liste = [];
    if (apsa.cycles && apsa.cycles[cycle] && apsa.cycles[cycle].objectifsSequence) {
      liste = apsa.cycles[cycle].objectifsSequence.slice();
    } else if (apsa.objectifsSequence && apsa.objectifsSequence.length) {
      liste = apsa.objectifsSequence.slice();
    }
    var familles = normaliserFamillesFilter(familleId, familleIds);
    if (familles.length && liste.length) {
      liste = liste.filter(function (obj) {
        return !obj.famille || familles.indexOf(obj.famille) >= 0;
      });
    }
    return liste;
  }

  function getCycle(cycleId) {
    return CYCLES[normaliserCycleId(cycleId)] || CYCLES.cycle4;
  }

  function getChampsPourCycle(cycleId) {
    var cycle = getCycle(cycleId);
    return cycle.champsAutorises.map(function (champId) {
      return CHAMPS[champId];
    }).filter(Boolean);
  }

  function getApsaPourChamp(cycleId, champId) {
    var cycle = getCycle(cycleId);
    if (cycle.champsAutorises.indexOf(champId) === -1) return [];
    var champ = CHAMPS[champId];
    if (!champ) return [];
    return champ.apsa.map(function (apsaId) {
      return APSA[apsaId];
    }).filter(Boolean);
  }

  function getObjectifsSequence(params) {
    params = params || {};
    var cycleId = normaliserCycleId(params.cycleId);
    var apsa = APSA[params.apsaId];
    var familles =
      params.athleFamilleIds ||
      params.familleIds ||
      (params.athleFamilleId || params.familleId ? [params.athleFamilleId || params.familleId] : null);
    var liste = objectifsSequencePourCycle(apsa, cycleId, null, familles);
    if (liste.length) return liste.slice(0, 8);
    var fb = FALLBACK_OBJECTIFS_SEQUENCE[cycleId] || FALLBACK_OBJECTIFS_SEQUENCE.cycle4;
    return (fb[params.champId] || []).slice(0, 8);
  }

  function trouverObjectifsSequence(apsaId, objectifSequenceIds, cycleId, familleId, familleIds) {
    var apsa = APSA[apsaId];
    var ids = normaliserListe(objectifSequenceIds);
    var familles =
      familleIds || (familleId ? (Array.isArray(familleId) ? familleId : [familleId]) : null);
    var liste = objectifsSequencePourCycle(apsa, cycleId, null, familles);
    if (!liste.length) return [];
    if (!ids.length) return liste.slice(0, 1);
    return liste.filter(function (obj) {
      return ids.indexOf(obj.id) !== -1;
    });
  }

  function dedupe(liste) {
    var vus = {};
    return liste.filter(function (item) {
      var key = typeof item === "string" ? item : JSON.stringify(item);
      if (vus[key]) return false;
      vus[key] = true;
      return true;
    });
  }

  function getObjectifsSeance(params) {
    params = params || {};
    var cycleId = normaliserCycleId(params.cycleId);
    var type = params.typeSeance || suggererTypeSeance(params.seancesExistantes);
    var familles =
      params.athleFamilleIds ||
      params.familleIds ||
      (params.athleFamilleId || params.familleId ? [params.athleFamilleId || params.familleId] : null);
    var objectifs = trouverObjectifsSequence(params.apsaId, params.objectifSequenceIds, cycleId, null, familles);
    var resultats = [];

    objectifs.forEach(function (obj) {
      if (obj.objectifsSeance) {
        resultats = resultats.concat(obj.objectifsSeance[type] || []);
      }
    });

    if (!resultats.length && OBJECTIFS_GENERIQUES_PAR_TYPE[type]) {
      resultats = resultats.concat(OBJECTIFS_GENERIQUES_PAR_TYPE[type]);
    }

    return dedupe(resultats).slice(0, 8).map(function (phrase, index) {
      return {
        id: "obj-seance-" + type + "-" + index,
        label: phrase.length > 42 ? phrase.slice(0, 39) + "…" : phrase,
        phrase: phrase,
      };
    });
  }

  function getContenusSeance(params) {
    params = params || {};
    var cycleId = normaliserCycleId(params.cycleId);
    var type = params.typeSeance || suggererTypeSeance(params.seancesExistantes);
    var familles =
      params.athleFamilleIds ||
      params.familleIds ||
      (params.athleFamilleId || params.familleId ? [params.athleFamilleId || params.familleId] : null);
    var objectifs = trouverObjectifsSequence(params.apsaId, params.objectifSequenceIds, cycleId, null, familles);
    var resultats = [];

    objectifs.forEach(function (obj) {
      if (obj.contenus) {
        resultats = resultats.concat(obj.contenus[type] || []);
      }
    });

    if (!resultats.length) {
      resultats = [
        "Échauffement progressif et spécifique à l’activité.",
        "Situation aménagée en lien direct avec l’objectif de séquence.",
        "Temps de pratique avec critères de réussite visibles.",
        "Observation ou auto-évaluation à partir d’un critère simple.",
        "Bilan rapide : réussites, difficultés, lien avec la séance suivante.",
      ];
    }

    return dedupe(resultats).slice(0, 8).map(function (phrase, index) {
      return {
        id: "contenu-" + type + "-" + index,
        label: phrase.length > 42 ? phrase.slice(0, 39) + "…" : phrase,
        phrase: phrase,
      };
    });
  }

  function getPointsAttention(params) {
    params = params || {};
    var cycleId = normaliserCycleId(params.cycleId);
    var familles =
      params.athleFamilleIds ||
      params.familleIds ||
      (params.athleFamilleId || params.familleId ? [params.athleFamilleId || params.familleId] : null);
    var objectifs = trouverObjectifsSequence(params.apsaId, params.objectifSequenceIds, cycleId, null, familles);
    var resultats = [];

    objectifs.forEach(function (obj) {
      resultats = resultats.concat(obj.pointsAttention || []);
    });

    return dedupe(resultats).slice(0, 6);
  }

  function getCriteresReussite(params) {
    params = params || {};
    var cycleId = normaliserCycleId(params.cycleId);
    var familles =
      params.athleFamilleIds ||
      params.familleIds ||
      (params.athleFamilleId || params.familleId ? [params.athleFamilleId || params.familleId] : null);
    var objectifs = trouverObjectifsSequence(params.apsaId, params.objectifSequenceIds, cycleId, null, familles);
    var resultats = [];

    objectifs.forEach(function (obj) {
      resultats = resultats.concat(obj.criteresReussite || []);
    });

    return dedupe(resultats).slice(0, 6);
  }

  function suggererTypeSeance(seancesExistantes) {
    var nb = Array.isArray(seancesExistantes) ? seancesExistantes.length : 0;
    if (nb <= 0) return "decouverte";
    if (nb <= 2) return "apprentissage";
    if (nb <= 4) return "stabilisation";
    if (nb <= 6) return "reinves";
    return "evaluation";
  }

  var api = {
    TYPES_SEANCE: TYPES_SEANCE,
    CYCLES: CYCLES,
    CHAMPS: CHAMPS,
    APSA: APSA,
    FALLBACK_OBJECTIFS_SEQUENCE: FALLBACK_OBJECTIFS_SEQUENCE,
    getCycle: getCycle,
    getChampsPourCycle: getChampsPourCycle,
    getApsaPourChamp: getApsaPourChamp,
    getObjectifsSequence: getObjectifsSequence,
    getObjectifsSeance: getObjectifsSeance,
    getContenusSeance: getContenusSeance,
    getPointsAttention: getPointsAttention,
    getCriteresReussite: getCriteresReussite,
    suggererTypeSeance: suggererTypeSeance,
    normaliserCycleId: normaliserCycleId,
    objectifsSequencePourCycle: objectifsSequencePourCycle,
  };

  var target = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : this;
  target.EPS_REFERENTIEL = api;
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
