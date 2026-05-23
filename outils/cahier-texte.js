/**
 * Cahier de texte EPS — séquences + fiches de séance (prévu, fait, suite).
 */
(function () {
  "use strict";

  var PARAM_DATA = "cahier-texte-data";
  var APSA_ID_AUTRE = "autre";

  var CHAMPS = [
    {
      id: "perf",
      label: "CA1 — Produire une performance optimale",
      resume:
        "Viser une performance maximale mesurable à une échéance donnée (athlétisme, natation, gymnastique…).",
    },
    {
      id: "adapt",
      label: "CA2 — S’adapter à des environnements variés",
      resume:
        "Adapter ses déplacements et ses choix aux contraintes du milieu (orientation, escalade, kayak…).",
    },
    {
      id: "expr",
      label: "CA3 — Prestation artistique / acrobatique",
      resume:
        "S’exprimer devant les autres par une prestation artistique ou acrobatique (danse, acrosport, arts du cirque…).",
    },
    {
      id: "coop",
      label: "CA4 — Coopérer et s’opposer",
      resume:
        "Coopérer et s’opposer dans des situations d’affrontement collectif, de raquette ou de combat.",
    },
    {
      id: "ca5",
      label: "CA5 — Développer ses ressources et s’entretenir",
      resume:
        "Réaliser et orienter son activité physique pour développer ses ressources et s’entretenir : entraînement autonome, projet personnel, endurance.",
    },
  ];

  var APSA_PAR_CHAMP = {
    perf: [
      { id: "athle", label: "Athlétisme", intro: "Séance d’athlétisme" },
      { id: "natation", label: "Natation", intro: "Séance de natation" },
      { id: "gym", label: "Gymnastique", intro: "Séance de gymnastique" },
    ],
    adapt: [
      { id: "orient", label: "Course d’orientation", intro: "Séance de course d’orientation" },
      { id: "escalade", label: "Escalade", intro: "Séance d’escalade" },
      { id: "kayak", label: "Kayak", intro: "Séance de kayak" },
      { id: "voile", label: "Voile", intro: "Séance de voile" },
    ],
    expr: [
      { id: "danse", label: "Danse", intro: "Séance de danse" },
      { id: "cirque", label: "Arts du cirque", intro: "Séance d’arts du cirque" },
      { id: "acrosport", label: "Acrosport", intro: "Séance d’acrosport" },
    ],
    coop: [
      { id: "hand", label: "Handball", intro: "Séance de handball" },
      { id: "basket", label: "Basketball", intro: "Séance de basketball" },
      { id: "foot", label: "Football", intro: "Séance de football" },
      { id: "rugby", label: "Rugby", intro: "Séance de rugby" },
      { id: "volley", label: "Volleyball", intro: "Séance de volleyball" },
      { id: "badminton", label: "Badminton", intro: "Séance de badminton" },
      { id: "tennis", label: "Tennis", intro: "Séance de tennis" },
      { id: "hockey", label: "Hockey", intro: "Séance de hockey" },
      { id: "boxe", label: "Boxe", intro: "Séance de boxe" },
      { id: "judo", label: "Judo", intro: "Séance de judo" },
      { id: "lutte", label: "Lutte", intro: "Séance de lutte" },
    ],
    ca5: [
      { id: "cross", label: "Cross-training", intro: "Séance de cross-training" },
      { id: "course-duree", label: "Course en durée", intro: "Séance de course en durée" },
      { id: "nat-duree", label: "Natation en durée", intro: "Séance de natation en durée" },
    ],
  };

  var ID_OBJECTIF_IDEM = "idem-objectif";
  var ID_CONTENU_IDEM = "idem-contenu";

  /** Propositions de déroulé communes à toutes les APSA */
  var DEROULE_COMMUN = [
    { id: ID_CONTENU_IDEM, label: "Idem séance préc.", phrase: null },
    {
      id: "echauffement",
      label: "Échauffement",
      phrase:
        "Échauffement général (mobilisation, éveil) puis échauffement spécifique à l’activité, avec montée progressive de l’intensité et rappel des consignes de sécurité.",
    },
    {
      id: "ateliers",
      label: "Ateliers",
      phrase:
        "Organisation en plusieurs ateliers (rotation par groupes) : consignes affichées, critères de réussite, bilan rapide entre chaque passage.",
    },
    {
      id: "situation",
      label: "Situation de jeu",
      phrase:
        "Mise en situation d’application (jeu, opposition ou parcours) avec règles adaptées, rôles définis et objectifs d’apprentissage rappelés.",
    },
    {
      id: "bilan",
      label: "Bilan",
      phrase:
        "Bilan de séance en collectif : ce que les élèves ont appris, ce qui reste difficile, lien avec la séance suivante.",
    },
    {
      id: "retour-calme",
      label: "Retour au calme",
      phrase: "Retour au calme, étirements ou activité de récupération, rangement du matériel.",
    },
  ];

  /** Déroulé de séance selon l’APSA choisie dans la séquence */
  var DEROULE_PAR_APSA = {
    athle: [
      {
        id: "vma",
        label: "VMA / fractionné",
        phrase:
          "Séries par intervalles (VMA) : consignes d’allure, temps de travail et de récupération, auto-évaluation de l’effort.",
      },
      {
        id: "fond",
        label: "Course continue",
        phrase: "Course continue : gestion de l’allure, respiration et régularité sur la durée imposée.",
      },
      {
        id: "tests",
        label: "Tests / perf.",
        phrase:
          "Tests de performance (chronométrage ou mesure) : protocole expliqué, deux essais possibles, exploitation des résultats.",
      },
      {
        id: "fondamentaux",
        label: "Fondamentaux",
        phrase:
          "Ateliers techniques (départ, foulée, relais…) : démonstration, essais guidés puis enchaînement autonome.",
      },
    ],
    natation: [
      {
        id: "technique",
        label: "Technique",
        phrase: "Travail technique par couloirs : consignes ciblées, allers-retours avec reprise des points à améliorer.",
      },
      {
        id: "endurance",
        label: "Endurance",
        phrase: "Séries d’endurance (distance ou durée) avec récupération active et consignes d’allure.",
      },
      {
        id: "eau",
        label: "Jeux aquatiques",
        phrase: "Jeux et activités ludiques en bassin, en lien avec les apprentissages de la séquence.",
      },
    ],
    gym: [
      {
        id: "stations",
        label: "Stations",
        phrase: "Circuit par stations : figures ou actions imposées, consignes de sécurité et critères de réussite.",
      },
      {
        id: "acrosport",
        label: "Acrosport",
        phrase: "Travail d’équilibre et de portés en binôme : progressivité, confiance et communication.",
      },
      {
        id: "apprentissage",
        label: "Figures",
        phrase: "Apprentissage progressif de figures imposées : décomposition, assistance, enchaînement.",
      },
    ],
    muscu: [
      { id: "circuit", label: "Circuit", phrase: "Circuit training : fiches d’exercices, charges adaptées, récupération entre stations." },
      { id: "force", label: "Force", phrase: "Travail de force : séries, répétitions, technique et récupération." },
    ],
    orient: [
      {
        id: "parcours",
        label: "Parcours",
        phrase: "Parcours d’orientation : lecture de carte, choix d’itinéraire, validation des balises.",
      },
      {
        id: "securite",
        label: "Sécurité",
        phrase: "Rappel des consignes de sécurité et travail en autonomie encadrée en milieu naturel.",
      },
    ],
    escalade: [
      {
        id: "voies",
        label: "Voies / blocs",
        phrase: "Ascensions en voies ou blocs : consignes, relais, objectifs par niveau.",
      },
      {
        id: "technique",
        label: "Technique",
        phrase: "Ateliers techniques et sécurisation des assurages avant les ascensions.",
      },
    ],
    kayak: [
      { id: "technique", label: "Technique", phrase: "Travail technique (pagaie, équilibre) et consignes de sécurité sur l’eau." },
      { id: "parcours", label: "Parcours", phrase: "Parcours en kayak : lecture du milieu, coopération et gestion de l’effort." },
    ],
    voile: [
      { id: "nav", label: "Navigation", phrase: "Initiation ou perfectionnement à la navigation : rôles à bord et consignes de sécurité." },
    ],
    ski: [{ id: "piste", label: "Piste", phrase: "Séance sur piste ou espace adapté : technique et sécurité." }],
    hand: [
      {
        id: "mini",
        label: "Mini-jeux",
        phrase: "Mini-jeux par roulement : règles simplifiées, objectifs d’apprentissage rappelés à chaque relance.",
      },
      {
        id: "situations",
        label: "Situations",
        phrase: "Situations d’opposition (format réduit) pour mettre en jeu les fondamentaux travaillés.",
      },
      {
        id: "technique",
        label: "Technique",
        phrase: "Ateliers techniques (gestes, déplacements) puis application en situation de jeu.",
      },
      {
        id: "championnat",
        label: "Championnat",
        phrase: "Poursuite du championnat de classe : règles, classement et fair-play.",
      },
    ],
    basket: [
      { id: "mini", label: "Mini-jeux", phrase: "Mini-jeux et situations réduites (2c2, 3c3) avec consignes ciblées." },
      { id: "situations", label: "Situations", phrase: "Situations d’opposition en demi-terrain : fondamentaux et prise de décision." },
      { id: "technique", label: "Technique", phrase: "Ateliers techniques (tir, dribble, passe) puis oppositions." },
    ],
    foot: [
      { id: "mini", label: "Mini-jeux", phrase: "Mini-jeux et jeux collectifs adaptés au nombre de joueurs et à l’espace." },
      {
        id: "situations",
        label: "Situations",
        phrase: "Situations d’opposition pour appliquer les fondamentaux (passe, conduite, tir).",
      },
      { id: "technique", label: "Technique", phrase: "Ateliers techniques puis mise en situation avec opposition." },
    ],
    rugby: [
      { id: "mini", label: "Mini-jeux", phrase: "Mini-jeux de toucher ou opposition adaptée (effectifs et règles)." },
      { id: "situations", label: "Situations", phrase: "Situations d’opposition avec règles adaptées et objectifs tactiques simples." },
    ],
    volley: [
      { id: "mini", label: "Mini-jeux", phrase: "Mini-jeux et situations 3c3 / 4c4 : service, relance, placement." },
      { id: "technique", label: "Technique", phrase: "Travail des fondamentaux (passe, attaque, service) puis jeu." },
    ],
    badminton: [
      { id: "mini", label: "Mini-jeux", phrase: "Mini-jeux et situations ludiques pour travailler les déplacements." },
      { id: "situations", label: "Situations", phrase: "Situations de jeu en simple ou double : tactique et gestion de l’effort." },
      { id: "tournoi", label: "Tournoi", phrase: "Tournoi par poules ou tableau : règles, arbitrage élève, classement." },
    ],
    tennis: [
      { id: "technique", label: "Technique", phrase: "Ateliers techniques (coup droit, revers, service) puis échanges ou jeux." },
      { id: "tournoi", label: "Tournoi", phrase: "Organisation d’un tournoi : poules, consignes et fair-play." },
    ],
    hockey: [
      { id: "mini", label: "Mini-jeux", phrase: "Mini-jeux et situations adaptées (effectifs, espace, matériel)." },
      { id: "situations", label: "Situations", phrase: "Situations d’opposition avec consignes tactiques et sécurité." },
    ],
    boxe: [
      { id: "technique", label: "Technique", phrase: "Ateliers techniques (gardes, déplacements) puis mises en situation encadrées." },
      { id: "opposition", label: "Opposition", phrase: "Oppositions adaptées : consignes de sécurité, respect du partenaire." },
    ],
    judo: [
      {
        id: "technique",
        label: "Technique",
        phrase: "Apprentissage des projections et contrôles au sol : démonstration, pratique guidée.",
      },
      { id: "opposition", label: "Opposition", phrase: "Combats adaptés : application des règles et fair-play." },
    ],
    lutte: [
      { id: "technique", label: "Technique", phrase: "Travail des actions de lutte et du règlement en situation maîtrisée." },
      { id: "opposition", label: "Opposition", phrase: "Duels et situations d’opposition encadrés." },
    ],
    danse: [
      { id: "impro", label: "Improvisation", phrase: "Improvisation guidée par contraintes (rythme, espace, thème)." },
      { id: "chor", label: "Chorégraphie", phrase: "Construction, répétition et restitution d’une chorégraphie." },
    ],
    cirque: [
      { id: "creatif", label: "Création", phrase: "Création et restitution d’une séquence : répétition et sécurité des figures." },
      { id: "technique", label: "Technique", phrase: "Travail technique progressif et sécurisation des figures." },
    ],
    acrosport: [
      { id: "portes", label: "Portés", phrase: "Travail des portés et de l’équilibre en binôme, avec progressivité." },
      { id: "creatif", label: "Création", phrase: "Création d’enchaînements et restitution devant le groupe." },
    ],
    "gym-expr": [
      { id: "creatif", label: "Création", phrase: "Création d’enchaînements ou de figures en groupe." },
      { id: "apprentissage", label: "Apprentissage", phrase: "Apprentissage progressif de figures imposées." },
    ],
    cross: [
      {
        id: "circuit",
        label: "Circuit",
        phrase: "Circuit training en autonomie : fiches d’exercices, intensité adaptée, bilan individuel.",
      },
      { id: "projet", label: "Projet perso", phrase: "Séance en lien avec le projet personnel d’entraînement de chaque élève." },
    ],
    "course-duree": [
      { id: "fond", label: "Course continue", phrase: "Course en durée : gestion de l’allure, effort et hydratation si besoin." },
      { id: "fractionne", label: "Fractionné", phrase: "Travail par intervalles : consignes de vitesse et temps de récupération." },
    ],
    "nat-duree": [
      { id: "endurance", label: "Endurance", phrase: "Natation en durée : gestion de l’allure et régularité." },
      { id: "technique", label: "Technique", phrase: "Travail technique puis série d’endurance." },
    ],
    autre: [
      { id: "seance", label: "Séance type", phrase: "Déroulé conforme au projet de la séquence (activités et consignes)." },
      { id: "eval", label: "Évaluation", phrase: "Situation d’évaluation des apprentissages : critères annoncés aux élèves." },
      { id: "projet", label: "Projet", phrase: "Travail en lien avec le projet de séquence (création, recherche, autonomie)." },
    ],
  };

  /** Propositions d’objectif de la séance (multi-sélection) */
  var PROPOSITIONS_OBJECTIF = {
    _commun: [
      {
        id: ID_OBJECTIF_IDEM,
        label: "Idem séance préc.",
        phrase: "Reprendre les apprentissages visés à la séance précédente.",
      },
      {
        id: "consolider",
        label: "Réinvestir",
        phrase: "Réinvestir les apprentissages des séances précédentes dans une nouvelle situation.",
      },
      {
        id: "prerequis",
        label: "Prérequis",
        phrase: "Mobiliser les savoirs et savoir-faire nécessaires pour aborder la séance.",
      },
      {
        id: "nouveau",
        label: "Nouvel apprentissage",
        phrase: "Acquérir un nouvel apprentissage (geste, règle, stratégie) annoncé en début de séance.",
      },
      {
        id: "autonomie",
        label: "Autonomie",
        phrase: "Apprendre à s’organiser, s’évaluer et progresser en autonomie.",
      },
      {
        id: "evaluer",
        label: "Montrer ses acquis",
        phrase: "Manifester les apprentissages attendus (évaluation formatrice ou sommative).",
      },
      {
        id: "securite",
        label: "Sécurité",
        phrase: "Intégrer et appliquer les règles de sécurité en situation.",
      },
    ],
    athle: [
      { id: "perf", label: "Performance", phrase: "Apprendre à améliorer une performance mesurée (technique, régularité, gestion de l’effort)." },
      { id: "technique-course", label: "Technique", phrase: "Apprendre les fondamentaux techniques de la course (départ, foulée, relais…)." },
      { id: "endurance", label: "Endurance", phrase: "Apprendre à gérer l’effort sur la durée (allure, respiration, régularité)." },
    ],
    natation: [
      { id: "technique-eau", label: "Technique", phrase: "Apprendre à améliorer la technique de nage (gestes, respiration, glisse)." },
      { id: "endurance-eau", label: "Endurance", phrase: "Apprendre à maintenir un effort en milieu aquatique." },
    ],
    gym: [
      { id: "figures", label: "Figures", phrase: "Apprendre à réaliser des figures ou enchaînements imposés." },
      { id: "equilibre", label: "Équilibre", phrase: "Apprendre à maîtriser l’équilibre et la posture en situation." },
    ],
    hand: [
      { id: "fondamentaux-hand", label: "Fondamentaux", phrase: "Apprendre à utiliser les fondamentaux en situation de jeu." },
      { id: "cooperation", label: "Coopération", phrase: "Apprendre à coopérer efficacement avec les partenaires." },
    ],
    foot: [
      { id: "fondamentaux-foot", label: "Fondamentaux", phrase: "Apprendre à appliquer les fondamentaux en situation d’opposition." },
      { id: "opposition", label: "Opposition", phrase: "Apprendre à s’opposer en respectant les règles et le fair-play." },
    ],
    basket: [
      { id: "fondamentaux-basket", label: "Fondamentaux", phrase: "Apprendre à utiliser les fondamentaux en opposition." },
      { id: "tactique", label: "Tactique", phrase: "Apprendre à comprendre et appliquer une consigne tactique simple." },
    ],
    danse: [
      { id: "expression", label: "Expression", phrase: "Apprendre à exprimer une intention par le mouvement." },
      { id: "chor", label: "Chorégraphie", phrase: "Apprendre à construire ou enrichir une chorégraphie." },
    ],
    muscu: [
      { id: "charge", label: "Charge", phrase: "Apprendre à adapter la charge et le volume d’entraînement à son niveau." },
      { id: "projet-perso", label: "Projet", phrase: "Apprendre à progresser dans son projet personnel d’entraînement." },
    ],
    cross: [
      { id: "circuit-obj", label: "Circuit", phrase: "Apprendre à réaliser un circuit adapté à son niveau." },
      { id: "intensite", label: "Intensité", phrase: "Apprendre à gérer l’intensité de l’effort." },
    ],
    orient: [
      { id: "lecture", label: "Lecture", phrase: "Apprendre à lire le terrain et les consignes de parcours." },
      { id: "autonomie-orient", label: "Autonomie", phrase: "Apprendre à progresser en autonomie sur le parcours." },
    ],
    escalade: [
      { id: "grimpe", label: "Grimpe", phrase: "Apprendre à grimper en sécurité (gestes, assurage, communication)." },
    ],
    judo: [
      { id: "projection", label: "Projection", phrase: "Apprendre une projection ou un contrôle au sol." },
    ],
    autre: [
      { id: "objectif-apsa", label: "Séquence", phrase: "Atteindre les apprentissages visés pour cette APSA dans la séquence." },
    ],
  };

  /**
   * Propositions d’objectifs de la séquence — attendus de fin de cycle 4 et compétences générales EPS (Eduscol).
   * @see https://eduscol.education.gouv.fr/5724/ressources-d-accompagnement-du-programme-d-education-physique-et-sportive-au-cycle-4
   */
  var PROPOSITIONS_OBJECTIF_SEQUENCE = {
    _commun: [
      {
        id: "cg-engager",
        label: "S’engager",
        phrase: "S’engager lucidement dans la pratique et persévérer pour progresser.",
      },
      {
        id: "cg-apprendre",
        label: "Apprendre",
        phrase:
          "S’approprier seul ou à plusieurs les méthodes et outils pour apprendre, s’évaluer et progresser.",
      },
      {
        id: "cg-securite",
        label: "Sécurité",
        phrase: "Assurer sa sécurité et celle des autres ; respecter les règles et l’environnement.",
      },
      {
        id: "cg-regles",
        label: "Règles et rôles",
        phrase: "Respecter les règles et assumer les rôles proposés (joueur, observateur, arbitre…).",
      },
    ],
    perf: [
      {
        id: "ca1-perf",
        label: "Performance optimale",
        phrase:
          "Mobiliser précisément ses ressources pour réaliser, au moment voulu et de manière stable, sa performance optimale (courir, sauter, lancer, nager).",
      },
      {
        id: "ca1-intensite",
        label: "Intensité / allure",
        phrase:
          "Choisir l’intensité et l’allure pour atteindre la meilleure performance sur une distance ou une épreuve donnée.",
      },
      {
        id: "ca1-rapports",
        label: "Rapports contradictoires",
        phrase:
          "Identifier les rapports intensité–durée, fréquence–amplitude ou force–précision pour reproduire des performances.",
      },
      {
        id: "ca1-preparation",
        label: "Préparation",
        phrase: "Se préparer à un effort (échauffement, repères) avant une performance à échéance donnée.",
      },
    ],
    adapt: [
      {
        id: "ca2-deplacement",
        label: "Déplacement planifié",
        phrase:
          "Réussir un déplacement planifié dans un milieu plus ou moins connu (terrestre, aquatique ou aérien).",
      },
      {
        id: "ca2-ressources",
        label: "Gérer ses ressources",
        phrase: "Gérer ses ressources pour réaliser en totalité un parcours sécurisé.",
      },
      {
        id: "ca2-trajet",
        label: "Adapter le trajet",
        phrase: "Adapter sa motricité pour corriger sa trajectoire ou réorganiser un itinéraire.",
      },
      {
        id: "ca2-milieu",
        label: "Anticiper le milieu",
        phrase:
          "Anticiper les effets du milieu sur le déplacement et choisir des organisations motrices adaptées.",
      },
    ],
    expr: [
      {
        id: "ca3-prestation",
        label: "Prestation",
        phrase:
          "Réaliser une prestation corporelle destinée à être vue et appréciée (effets esthétiques ou acrobatiques).",
      },
      {
        id: "ca3-intention",
        label: "Intention",
        phrase: "Communiquer une intention ou une émotion par le corps ; enrichir son répertoire d’actions.",
      },
      {
        id: "ca3-engagement",
        label: "Devant les autres",
        phrase: "S’engager devant spectateurs ou juges en contrôlant risques et émotions.",
      },
      {
        id: "ca3-creation",
        label: "Création",
        phrase: "Construire, répéter et restituer une séquence ou chorégraphie en petit groupe.",
      },
    ],
    coop: [
      {
        id: "ca4-decisif",
        label: "Actions décisives",
        phrase:
          "Réaliser des actions décisives pour faire basculer le rapport de force en faveur de son équipe.",
      },
      {
        id: "ca4-engagement",
        label: "Engagement adapté",
        phrase: "Adapter son engagement moteur à son état physique et au rapport de force.",
      },
      {
        id: "ca4-arbitrage",
        label: "Observer / arbitrer",
        phrase: "Observer et co-arbitrer ; assumer les rôles (joueur, arbitre, observateur, coach).",
      },
      {
        id: "ca4-coop",
        label: "Coopérer",
        phrase: "Coopérer efficacement tout en respectant adversaires, partenaires et arbitres.",
      },
      {
        id: "ca4-projet-jeu",
        label: "Projet de jeu",
        phrase: "Construire et ajuster un projet de jeu collectif (tactique, placement, communication).",
      },
    ],
    ca5: [
      {
        id: "ca5-projet",
        label: "Projet d’entraînement",
        phrase:
          "Concevoir et mener un projet personnel d’entraînement pour développer ses ressources et s’entretenir.",
      },
      {
        id: "ca5-parametres",
        label: "Paramètres",
        phrase:
          "Choisir et moduler les paramètres d’entraînement (intensité, durée, répétitions, récupération) selon les effets recherchés.",
      },
      {
        id: "ca5-autonomie",
        label: "Autonomie",
        phrase: "S’entraîner en autonomie (seul ou collectivement) en régulant l’effort à partir de ses ressentis.",
      },
      {
        id: "ca5-effets",
        label: "Effets recherchés",
        phrase:
          "S’engager pour obtenir les effets recherchés (endurance, force, souplesse…) liés au thème de séquence.",
      },
    ],
  };

  /** Compléments par APSA (fiches Eduscol cycle 4). */
  var PROPOSITIONS_OBJECTIF_SEQUENCE_APSA = {
    athle: [
      {
        id: "apsa-athle-fond",
        label: "Demi-fond / VMA",
        phrase: "Produire et répartir intentionnellement ses efforts pour progresser ou se classer (allure, VMA, records).",
      },
    ],
    natation: [
      {
        id: "apsa-nat-technique",
        label: "Technique de nage",
        phrase: "Améliorer la technique de nage (gestes, respiration, glisse) sur plusieurs styles.",
      },
    ],
    orient: [
      {
        id: "apsa-orient-parcours",
        label: "Parcours CO",
        phrase: "Lire le terrain, choisir un itinéraire et réaliser un parcours d’orientation en autonomie.",
      },
    ],
    hand: [
      {
        id: "apsa-hand-fond",
        label: "Fondamentaux hand",
        phrase: "Utiliser les fondamentaux en situation de jeu et coopérer pour construire le jeu collectif.",
      },
    ],
    foot: [
      {
        id: "apsa-foot-fond",
        label: "Fondamentaux foot",
        phrase: "Appliquer les fondamentaux en opposition (passe, conduite, tir) dans des formats adaptés.",
      },
    ],
    basket: [
      {
        id: "apsa-basket-fond",
        label: "Fondamentaux basket",
        phrase: "Utiliser les fondamentaux en opposition et appliquer une consigne tactique simple.",
      },
    ],
    badminton: [
      {
        id: "apsa-badminton-echange",
        label: "Échanges badminton",
        phrase: "Construire des échanges et des déplacements efficaces en simple ou double.",
      },
    ],
    danse: [
      {
        id: "apsa-danse-chor",
        label: "Chorégraphie",
        phrase: "Créer, répéter et présenter une chorégraphie en lien avec une intention expressive.",
      },
    ],
    cross: [
      {
        id: "apsa-cross-wod",
        label: "Circuit / WOD",
        phrase: "Organiser et réaliser une séance d’entraînement en circuit en régulant l’intensité.",
      },
    ],
    "course-duree": [
      {
        id: "apsa-course-duree",
        label: "Course en durée",
        phrase: "Gérer l’allure et l’effort sur la durée (endurance, régularité, hydratation si besoin).",
      },
    ],
    judo: [
      {
        id: "apsa-judo-projection",
        label: "Projection / sol",
        phrase: "Maîtriser une projection ou un contrôle au sol et l’appliquer en combat adapté.",
      },
    ],
  };

  var LEGACY_DOMAIN_TO_CHAMP = {
    athle: "perf",
    natation: "perf",
    muscu: "perf",
    gym: "perf",
    nature: "adapt",
    collectif: "coop",
    raquette: "coop",
    danse: "expr",
  };

  var store = {
    sequences: [],
    activeSequenceId: null,
    activeSeanceId: null,
  };

  var seanceUi = {
    formatIds: [],
    objectifIds: [],
    manual: { objectif: false, contenu: false, attention: false },
  };

  var seqDraft = {
    id: null,
    classeId: "",
    champId: null,
    apsaId: null,
    apsaAutre: "",
    objectifs: "",
    objectifIds: [],
    manualObjectifs: false,
  };

  var classes = [];
  var recognition = null;
  var dictatingTarget = null;
  var suspendreSauvegardeAuto = false;
  var timerSauvegardeStore = null;
  var timerSauvegardeSequence = null;
  var timerSauvegardeSeance = null;

  function $(id) {
    return document.getElementById(id);
  }

  function accordeonSeance() {
    return $("cahier-acc-seance");
  }

  function afficherAccordeonSeance(ouvert) {
    var acc = accordeonSeance();
    if (!acc) return;
    acc.hidden = false;
    acc.open = ouvert !== false;
  }

  function masquerAccordeonSeance() {
    var acc = accordeonSeance();
    if (!acc) return;
    acc.hidden = true;
    acc.open = false;
  }

  function fermerAccordeonSeance() {
    var acc = accordeonSeance();
    if (acc) acc.open = false;
  }

  function majBoutonsSeanceActions() {
    var dup = $("cahier-duplicate-seance");
    var del = $("cahier-delete-seance");
    var hasSeance = !!(store.activeSeanceId && getActiveSequence());
    if (del) del.hidden = !hasSeance;
    if (dup) dup.hidden = !hasSeance;
  }

  function planifierSauvegardeStore() {
    clearTimeout(timerSauvegardeStore);
    timerSauvegardeStore = setTimeout(function () {
      sauverStore();
    }, 350);
  }

  function sequenceValidePourSauvegarde() {
    if (!seqDraft.classeId || !seqDraft.champId || !seqDraft.apsaId) return false;
    if (seqDraft.apsaId === APSA_ID_AUTRE && !seqDraft.apsaAutre) return false;
    return true;
  }

  function construireSequenceDepuisDraft() {
    var existing = seqDraft.id ? getSequence(seqDraft.id) : null;
    return {
      id: seqDraft.id || genererId("seq"),
      titre: titreSequenceAuto(
        seqDraft.classeId,
        seqDraft.champId,
        seqDraft.apsaId,
        seqDraft.apsaId === APSA_ID_AUTRE ? seqDraft.apsaAutre : ""
      ),
      classeId: seqDraft.classeId,
      classeNom: nomClasse(seqDraft.classeId),
      champId: seqDraft.champId,
      apsaId: seqDraft.apsaId,
      apsaAutre: seqDraft.apsaId === APSA_ID_AUTRE ? seqDraft.apsaAutre : "",
      objectifs: seqDraft.objectifs,
      objectifIds: seqDraft.objectifIds.slice(),
      seances: existing && existing.seances ? existing.seances : [],
      archivee: existing ? !!existing.archivee : false,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
  }

  function planifierSauvegardeSequence() {
    if (suspendreSauvegardeAuto) return;
    clearTimeout(timerSauvegardeSequence);
    timerSauvegardeSequence = setTimeout(persisterSequenceAuto, 350);
  }

  function persisterSequenceAuto() {
    if (suspendreSauvegardeAuto) return false;
    lireSeqForm();
    if (!sequenceValidePourSauvegarde()) return false;
    var wasNew = !seqDraft.id;
    var workspaceWasHidden = $("cahier-workspace") && $("cahier-workspace").hidden;
    var seq = construireSequenceDepuisDraft();
    var found = false;
    for (var i = 0; i < store.sequences.length; i++) {
      if (store.sequences[i].id === seq.id) {
        store.sequences[i] = seq;
        found = true;
        break;
      }
    }
    if (!found) store.sequences.push(seq);
    seqDraft.id = seq.id;
    store.activeSequenceId = seq.id;
    if ($("cahier-seq-delete")) $("cahier-seq-delete").hidden = false;
    remplirSelectSequences();
    if (wasNew || workspaceWasHidden) $("cahier-workspace").hidden = false;
    majUiSequenceAccordion();
    if (wasNew || workspaceWasHidden) {
      renderSeancesList();
      renderFormatChips();
    }
    planifierSauvegardeStore();
    return true;
  }

  function planifierSauvegardeSeance() {
    if (suspendreSauvegardeAuto) return;
    clearTimeout(timerSauvegardeSeance);
    timerSauvegardeSeance = setTimeout(persisterSeanceAuto, 350);
  }

  function persisterSeanceAuto() {
    if (suspendreSauvegardeAuto) return;
    var seq = getActiveSequence();
    if (!seq || !store.activeSeanceId) return;
    persisterSeanceCouranteDansSequence();
    seq.updatedAt = Date.now();
    planifierSauvegardeStore();
    renderSeancesList();
    majTitreSeancePanel();
    majBoutonsSeanceActions();
    majUiSequenceAccordion();
  }

  function persisterSeanceCouranteDansSequence() {
    var seq = getActiveSequence();
    if (!seq || !store.activeSeanceId) return;
    var snap = snapshotSeance();
    if (!seq.seances) seq.seances = [];
    var idx = -1;
    for (var i = 0; i < seq.seances.length; i++) {
      if (seq.seances[i].id === snap.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) seq.seances[idx] = snap;
    else seq.seances.push(snap);
  }

  function sequencesMemeActivite(seqA, seqB) {
    if (!seqA || !seqB) return false;
    return (
      seqA.champId === seqB.champId &&
      seqA.apsaId === seqB.apsaId &&
      (seqA.apsaAutre || "") === (seqB.apsaAutre || "")
    );
  }

  function trouverSequenceMemeActivite(classeId, modele) {
    for (var i = 0; i < store.sequences.length; i++) {
      var s = store.sequences[i];
      if (s.classeId === classeId && sequencesMemeActivite(s, modele)) {
        return normaliserSequence(s);
      }
    }
    return null;
  }

  function creerSequenceDepuisModele(modele, classeId) {
    var seq = {
      id: genererId("seq"),
      titre: titreSequenceAuto(classeId, modele.champId, modele.apsaId, modele.apsaAutre),
      classeId: classeId,
      classeNom: nomClasse(classeId),
      champId: modele.champId,
      apsaId: modele.apsaId,
      apsaAutre: modele.apsaAutre || "",
      objectifs: modele.objectifs || "",
      objectifIds: (modele.objectifIds || []).slice(),
      seances: [],
      archivee: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.sequences.push(normaliserSequence(seq));
    return seq;
  }

  function copierSeance(source) {
    source = normaliserSeance(JSON.parse(JSON.stringify(source)));
    return normaliserSeance({
      id: genererId("seance"),
      date: aujourdhuiIso(),
      formatIds: (source.formatIds || []).slice(),
      formatId: source.formatId || null,
      objectifIds: (source.objectifIds || []).slice(),
      objectif: source.objectif || "",
      contenu: source.contenu || "",
      attention: source.attention || "",
      manual: source.manual
        ? {
            objectif: !!source.manual.objectif,
            contenu: !!source.manual.contenu,
            attention: !!source.manual.attention,
          }
        : { objectif: true, contenu: true, attention: true },
      updatedAt: Date.now(),
    });
  }

  function copierSequence(source) {
    source = normaliserSequence(JSON.parse(JSON.stringify(source)));
    var titre = titreSequenceAuto(source.classeId, source.champId, source.apsaId, source.apsaAutre);
    if (titre.toLowerCase().indexOf("(copie)") < 0) titre = titre + " (copie)";
    return normaliserSequence({
      id: genererId("seq"),
      titre: titre,
      classeId: source.classeId,
      classeNom: source.classeNom || nomClasse(source.classeId),
      champId: source.champId,
      apsaId: source.apsaId,
      apsaAutre: source.apsaAutre || "",
      objectifs: source.objectifs || "",
      objectifIds: (source.objectifIds || []).slice(),
      seances: (source.seances || []).map(copierSeance),
      archivee: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  function libelleSequenceOption(seq) {
    if (!seq) return "";
    var titre = seq.titre || titreSequenceAuto(seq.classeId, seq.champId, seq.apsaId, seq.apsaAutre) || "Sans titre";
    var n = seq.seances ? seq.seances.length : 0;
    return titre + " (" + n + " séance" + (n !== 1 ? "s" : "") + ")";
  }

  function sequenceArchivee(seq) {
    return !!(seq && seq.archivee);
  }

  function sequencesTrieesPourAffichage() {
    var actives = [];
    var archivees = [];
    store.sequences.forEach(function (s) {
      var seq = normaliserSequence(s);
      if (sequenceArchivee(seq)) archivees.push(seq);
      else actives.push(seq);
    });
    var byDate = function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    };
    actives.sort(byDate);
    archivees.sort(byDate);
    return { actives: actives, archivees: archivees };
  }

  function remplirSelectSequencesOptions(sel, groups) {
    groups.actives.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.id;
      o.textContent = libelleSequenceOption(s);
      sel.appendChild(o);
    });
    if (groups.archivees.length) {
      var og = document.createElement("optgroup");
      og.label = "Archivées";
      groups.archivees.forEach(function (s) {
        var o = document.createElement("option");
        o.value = s.id;
        o.textContent = libelleSequenceOption(s);
        og.appendChild(o);
      });
      sel.appendChild(og);
    }
  }

  function ajouterSeanceDansSequence(seqId, snap) {
    for (var i = 0; i < store.sequences.length; i++) {
      if (store.sequences[i].id !== seqId) continue;
      var copie = copierSeance(snap);
      if (!store.sequences[i].seances) store.sequences[i].seances = [];
      store.sequences[i].seances.push(copie);
      store.sequences[i].updatedAt = Date.now();
      return { sequence: normaliserSequence(store.sequences[i]), seance: copie };
    }
    return null;
  }

  function dupliquerSequence() {
    var source = getActiveSequence();
    if (!source) {
      montrerMsg("Ouvrez ou enregistrez une séquence à dupliquer.");
      return;
    }
    if (store.activeSeanceId) persisterSeanceCouranteDansSequence();
    source = getSequence(source.id) || source;
    var copie = copierSequence(source);
    store.sequences.push(copie);
    store.activeSequenceId = copie.id;
    store.activeSeanceId = null;
    sauverStore().then(function () {
      remplirSelectSequences();
      ouvrirWorkspace(copie.id);
      montrerOk("Séquence dupliquée — modifiez la classe si besoin.");
    });
  }

  function remplirSelectDupliquerCible() {
    var sel = $("cahier-dupliquer-cible");
    var seq = getActiveSequence();
    if (!sel || !seq) return;
    OutilsDom.clear(sel);
    var hasOption = false;

    var ogCourante = document.createElement("optgroup");
    ogCourante.label = "Séquence ouverte";
    var oCourante = document.createElement("option");
    oCourante.value = "seq:" + seq.id;
    oCourante.textContent = libelleSequenceOption(seq);
    ogCourante.appendChild(oCourante);
    sel.appendChild(ogCourante);
    hasOption = true;

    var autresSeq = sequencesTrieesPourAffichage();
    var listeAutres = autresSeq.actives
      .concat(autresSeq.archivees)
      .filter(function (s) {
        return s.id !== seq.id;
      });
    if (listeAutres.length) {
      var ogSeq = document.createElement("optgroup");
      ogSeq.label = "Autres séquences";
      listeAutres.forEach(function (s) {
        var o = document.createElement("option");
        o.value = "seq:" + s.id;
        o.textContent = libelleSequenceOption(s);
        ogSeq.appendChild(o);
      });
      sel.appendChild(ogSeq);
      hasOption = true;
    }

    var autresClasses = classes.filter(function (c) {
      return c.id !== seq.classeId;
    });
    if (autresClasses.length) {
      var ogClasse = document.createElement("optgroup");
      ogClasse.label = "Autre classe (même APSA)";
      autresClasses.forEach(function (c) {
        var o = document.createElement("option");
        o.value = "class:" + c.id;
        o.textContent = c.nom;
        ogClasse.appendChild(o);
      });
      sel.appendChild(ogClasse);
      hasOption = true;
    }

    sel.disabled = !hasOption;
    if (!hasOption) {
      var vide = document.createElement("option");
      vide.value = "";
      vide.textContent = "Aucune destination disponible";
      sel.appendChild(vide);
    }
  }

  function ouvrirDialogueDupliquerSeance() {
    var seq = getActiveSequence();
    if (!seq || !store.activeSeanceId) return;
    remplirSelectDupliquerCible();
    var dlg = $("cahier-dialog-dupliquer");
    if (!dlg) return;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else montrerMsg("Duplication indisponible sur ce navigateur.");
  }

  function finaliserDuplicationSeance(cible, copie, message) {
    store.activeSequenceId = cible.id;
    store.activeSeanceId = copie.id;
    var dlg = $("cahier-dialog-dupliquer");
    if (dlg && typeof dlg.close === "function") dlg.close();
    sauverStore().then(function () {
      remplirSelectSequences();
      ouvrirWorkspace(cible.id);
      var s = (cible.seances || []).filter(function (x) {
        return x.id === copie.id;
      })[0];
      if (s) appliquerSeance(s);
      montrerOk(message);
    });
  }

  function confirmerDupliquerSeance() {
    var seq = getActiveSequence();
    var sel = $("cahier-dupliquer-cible");
    if (!seq || !sel || !store.activeSeanceId) return;
    var val = sel.value;
    if (!val) {
      montrerMsg("Choisissez une destination.");
      return;
    }
    persisterSeanceCouranteDansSequence();
    var snap = snapshotSeance();

    if (val.indexOf("seq:") === 0) {
      var seqId = val.slice(4);
      var result = ajouterSeanceDansSequence(seqId, snap);
      if (!result) {
        montrerMsg("Séquence introuvable.");
        return;
      }
      var meme = seqId === seq.id;
      finaliserDuplicationSeance(
        result.sequence,
        result.seance,
        meme
          ? "Séance dupliquée dans cette séquence."
          : "Séance dupliquée dans « " + (result.sequence.titre || "la séquence") + " »."
      );
      return;
    }

    if (val.indexOf("class:") === 0) {
      var classeId = val.slice(6);
      if (!classeId) {
        montrerMsg("Choisissez une classe de destination.");
        return;
      }
      var cible = trouverSequenceMemeActivite(classeId, seq);
      var created = false;
      if (!cible) {
        cible = creerSequenceDepuisModele(seq, classeId);
        created = true;
      }
      var copie = copierSeance(snap);
      if (!cible.seances) cible.seances = [];
      cible.seances.push(copie);
      cible.updatedAt = Date.now();
      finaliserDuplicationSeance(
        cible,
        copie,
        created
          ? "Séance dupliquée — séquence créée pour " + nomClasse(classeId) + "."
          : "Séance dupliquée dans la séquence de " + nomClasse(classeId) + "."
      );
      return;
    }

    montrerMsg("Destination invalide.");
  }

  function genererId(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + "_" + crypto.randomUUID();
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function montrerMsg(msg) {
    var el = $("cahier-msg");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
      if ($("cahier-ok")) $("cahier-ok").hidden = true;
    } else el.hidden = true;
  }

  function montrerOk(msg) {
    var el = $("cahier-ok");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
      montrerMsg("");
      clearTimeout(montrerOk._t);
      montrerOk._t = setTimeout(function () {
        el.hidden = true;
      }, 2800);
    } else el.hidden = true;
  }

  function aujourdhuiIso() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function parseDateLocal(str) {
    if (!str) return null;
    var p = str.split("-");
    if (p.length !== 3) return null;
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDateFr(iso) {
    var d = parseDateLocal(iso);
    if (!d) return iso || "—";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  function getSequence(id) {
    var seq = store.sequences.filter(function (s) {
      return s.id === id;
    })[0];
    return seq ? normaliserSequence(seq) : null;
  }

  function getActiveSequence() {
    return store.activeSequenceId ? getSequence(store.activeSequenceId) : null;
  }

  function getActiveSeance() {
    var seq = getActiveSequence();
    if (!seq || !store.activeSeanceId) return null;
    return (seq.seances || []).filter(function (s) {
      return s.id === store.activeSeanceId;
    })[0];
  }

  function nomClasse(id) {
    var c = classes.filter(function (x) {
      return x.id === id;
    })[0];
    return c ? c.nom : "";
  }

  function libelleApsa(champId, apsaId, apsaAutre) {
    if (apsaId === APSA_ID_AUTRE) {
      var custom = (apsaAutre || "").trim();
      return custom || "Autre";
    }
    var a = apsaById(champId, apsaId);
    return a ? a.label : "";
  }

  function introApsa(champId, apsaId, apsaAutre) {
    if (apsaId === APSA_ID_AUTRE) {
      var custom = (apsaAutre || "").trim();
      return custom ? "Séance de " + custom.toLowerCase() : "";
    }
    var a = apsaById(champId, apsaId);
    return a && a.intro ? a.intro : "";
  }

  function titreSequenceAuto(classeId, champId, apsaId, apsaAutre) {
    var nom = nomClasse(classeId);
    var label = libelleApsa(champId, apsaId, apsaAutre);
    if (!label) return nom || "Séquence";
    return nom ? nom + " — " + label : label;
  }

  function champById(id) {
    return CHAMPS.filter(function (c) {
      return c.id === id;
    })[0];
  }

  function apsaById(champId, apsaId) {
    var list = APSA_PAR_CHAMP[champId];
    if (!list) return null;
    return list.filter(function (a) {
      return a.id === apsaId;
    })[0];
  }

  function deroulePourApsa(apsaId) {
    var spec = DEROULE_PAR_APSA[apsaId] || DEROULE_PAR_APSA.autre || [];
    return DEROULE_COMMUN.concat(spec);
  }

  function derouleById(apsaId, formatId) {
    if (!formatId) return null;
    var list = deroulePourApsa(apsaId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === formatId) return list[i];
    }
    return null;
  }

  function seancePrecedente(seq, currentSeanceId) {
    var ordered = seancesOrdonneesPourListe(seq);
    if (!ordered.length) return null;
    var idx = -1;
    for (var i = 0; i < ordered.length; i++) {
      if (ordered[i].id === currentSeanceId) {
        idx = i;
        break;
      }
    }
    if (idx > 0) return ordered[idx - 1];
    if (idx < 0) return ordered[ordered.length - 1];
    return null;
  }

  function normaliserSequence(seq) {
    if (!seq) return seq;
    if (!seq.champId && seq.domainId) {
      seq.champId = LEGACY_DOMAIN_TO_CHAMP[seq.domainId] || seq.domainId;
    }
    if (!seq.apsaId && seq.domainId && APSA_PAR_CHAMP[seq.champId]) {
      var match = APSA_PAR_CHAMP[seq.champId].filter(function (a) {
        return a.id === seq.domainId;
      })[0];
      if (match) seq.apsaId = match.id;
      else if (seq.champId === "coop" && seq.domainId === "raquette") seq.apsaId = "badminton";
      else if (seq.domainId === "muscu") {
        seq.champId = "ca5";
        seq.apsaId = "cross";
      } else if (seq.domainId === "ski") {
        seq.apsaId = "kayak";
      } else if (seq.domainId === "gym-expr") {
        seq.champId = "expr";
        seq.apsaId = "acrosport";
      }
    }
    if (seq.apsaId === "ski" && seq.champId === "adapt") seq.apsaId = "kayak";
    if (seq.apsaId === "gym-expr") {
      seq.champId = "expr";
      seq.apsaId = "acrosport";
    }
    if (seq.apsaId === "muscu") {
      if (seq.champId === "ca5") seq.apsaId = "cross";
      else if (seq.champId === "perf") seq.apsaId = "gym";
    }
    if (seq.classeId && seq.apsaId) {
      seq.titre = titreSequenceAuto(seq.classeId, seq.champId, seq.apsaId, seq.apsaAutre);
    }
    if (!Array.isArray(seq.objectifIds)) seq.objectifIds = [];
    seq.archivee = !!seq.archivee;
    return seq;
  }

  function propositionsObjectifSequencePourDraft() {
    if (!seqDraft.champId) return [];
    var list = PROPOSITIONS_OBJECTIF_SEQUENCE._commun.slice();
    if (PROPOSITIONS_OBJECTIF_SEQUENCE[seqDraft.champId]) {
      list = list.concat(PROPOSITIONS_OBJECTIF_SEQUENCE[seqDraft.champId]);
    }
    if (seqDraft.apsaId && PROPOSITIONS_OBJECTIF_SEQUENCE_APSA[seqDraft.apsaId]) {
      list = list.concat(PROPOSITIONS_OBJECTIF_SEQUENCE_APSA[seqDraft.apsaId]);
    }
    return list;
  }

  function propositionObjectifSequenceById(propId) {
    var list = propositionsObjectifSequencePourDraft();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === propId) return list[i];
    }
    return null;
  }

  function filtrerObjectifIdsSequence() {
    var valid = {};
    propositionsObjectifSequencePourDraft().forEach(function (p) {
      valid[p.id] = true;
    });
    seqDraft.objectifIds = seqDraft.objectifIds.filter(function (id) {
      return valid[id];
    });
  }

  function genererObjectifSequence() {
    var parts = [];
    seqDraft.objectifIds.forEach(function (propId) {
      var p = propositionObjectifSequenceById(propId);
      if (p && p.phrase) parts.push(p.phrase);
    });
    return texteEnPuces(parts);
  }

  function syncSeqObjectifsTextarea() {
    var el = $("cahier-seq-objectifs");
    if (!el || seqDraft.manualObjectifs) return;
    el.value = genererObjectifSequence();
    seqDraft.objectifs = el.value.trim();
  }

  function renderSeqObjectifChips() {
    var wrap = $("cahier-chips-seq-objectif");
    var hint = $("cahier-seq-objectif-hint");
    var block = $("cahier-seq-objectif-block");
    if (!wrap) return;
    OutilsDom.clear(wrap);
    if (!seqDraft.champId) {
      if (block) block.hidden = true;
      var hrObj = $("cahier-hr-seq-objectifs");
      var hrText = $("cahier-hr-objectifs-text");
      if (hrObj) hrObj.hidden = true;
      if (hrText) hrText.hidden = true;
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Choisissez un champ d’apprentissage.";
      }
      return;
    }
    if (block) block.hidden = false;
    var hrObjShow = $("cahier-hr-seq-objectifs");
    var hrTextShow = $("cahier-hr-objectifs-text");
    if (hrObjShow) hrObjShow.hidden = false;
    if (hrTextShow) hrTextShow.hidden = false;
    if (hint) hint.hidden = true;
    propositionsObjectifSequencePourDraft().forEach(function (p) {
      var on = seqDraft.objectifIds.indexOf(p.id) >= 0;
      wrap.appendChild(
        creerChip(p.label, on, function () {
          var i = seqDraft.objectifIds.indexOf(p.id);
          if (i >= 0) seqDraft.objectifIds.splice(i, 1);
          else seqDraft.objectifIds.push(p.id);
          seqDraft.manualObjectifs = false;
          renderSeqObjectifChips();
          syncSeqObjectifsTextarea();
        })
      );
    });
  }

  function majPropositionsObjectifSequence() {
    filtrerObjectifIdsSequence();
    renderSeqObjectifChips();
    syncSeqObjectifsTextarea();
    planifierSauvegardeSequence();
  }

  function propositionsObjectifPourSeq(seq) {
    var list = PROPOSITIONS_OBJECTIF._commun.slice();
    if (seq && seq.apsaId && PROPOSITIONS_OBJECTIF[seq.apsaId]) {
      list = list.concat(PROPOSITIONS_OBJECTIF[seq.apsaId]);
    }
    if (seq && seq.objectifs) {
      list.unshift({ id: "_seq", label: "Objectifs de la séquence", phrase: seq.objectifs });
    }
    return list;
  }

  function propositionObjectifById(seq, propId) {
    var list = propositionsObjectifPourSeq(seq);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === propId) return list[i];
    }
    return null;
  }

  function decouperEnElements(text) {
    if (!text) return [];
    return String(text)
      .split(/\n+/)
      .map(function (l) {
        return l.replace(/^[-•*]\s*/, "").trim();
      })
      .filter(Boolean);
  }

  function texteEnPuces(items) {
    return items
      .filter(function (i) {
        return i && String(i).trim();
      })
      .map(function (i) {
        return "• " + String(i).trim().replace(/^[-•*]\s*/, "");
      })
      .join("\n");
  }

  function apercuUneLigne(text, max) {
    if (!text) return "";
    var first =
      decouperEnElements(text)[0] ||
      String(text)
        .replace(/\s+/g, " ")
        .trim();
    if (first.length > max) return first.slice(0, max - 1) + "…";
    return first;
  }

  function normaliserSeance(s) {
    if (!s) return s;
    if (s.objectif !== undefined) {
      if (!Array.isArray(s.objectifIds)) s.objectifIds = [];
      if (!Array.isArray(s.formatIds)) {
        s.formatIds = s.formatId ? [s.formatId] : [];
      }
      return s;
    }
    if (s.prevu !== undefined) {
      return {
        id: s.id,
        date: s.date,
        formatId: s.formatId,
        formatIds: s.formatIds || (s.formatId ? [s.formatId] : []),
        objectif: s.prevu || "",
        contenu: s.fait || "",
        attention: s.suivant || "",
        objectifIds: s.objectifIds || [],
        manual: {
          objectif: !!(s.manual && s.manual.prevu),
          contenu: !!(s.manual && s.manual.fait),
          attention: !!(s.manual && s.manual.suivant),
        },
        updatedAt: s.updatedAt,
      };
    }
    var objectifParts = [];
    if (s.contenu) objectifParts.push(s.contenu);
    if (s.competences) objectifParts.push(s.competences);
    return {
      id: s.id,
      date: s.date,
      formatId: s.formatId,
      formatIds: s.formatId ? [s.formatId] : [],
      objectif: objectifParts.join("\n\n"),
      contenu: "",
      attention: s.obs || "",
      objectifIds: [],
      manual: { objectif: true, contenu: false, attention: !!s.obs },
      updatedAt: s.updatedAt,
    };
  }

  function sauverStore() {
    if (typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.saveParametre({
      id: PARAM_DATA,
      sequences: store.sequences,
      activeSequenceId: store.activeSequenceId,
      activeSeanceId: store.activeSeanceId,
    });
  }

  function chargerStore() {
    if (typeof DataManager === "undefined") return Promise.resolve();
    return DataManager.getParametre(PARAM_DATA).then(function (rec) {
      if (rec && Array.isArray(rec.sequences)) {
        store.sequences = rec.sequences.map(normaliserSequence);
        store.activeSequenceId = rec.activeSequenceId || null;
        store.activeSeanceId = rec.activeSeanceId || null;
      }
    });
  }

  function creerChip(label, active, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cahier-chip" + (active ? " cahier-chip--active" : "");
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function creerChipChamp(label, active, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cahier-chip" + (active ? " cahier-chip--active" : "");
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    var sep = label.indexOf(" — ");
    if (sep >= 0) {
      var code = document.createElement("span");
      code.className = "cahier-chip__code";
      code.textContent = label.slice(0, sep);
      var lib = document.createElement("span");
      lib.className = "cahier-chip__libelle";
      lib.textContent = label.slice(sep);
      btn.appendChild(code);
      btn.appendChild(lib);
    } else {
      btn.textContent = label;
    }
    btn.addEventListener("click", onClick);
    return btn;
  }

  function majChampResume() {
    var el = $("cahier-champ-resume");
    if (!el) return;
    var c = champById(seqDraft.champId);
    if (!c || !c.resume) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.textContent = c.resume;
    el.hidden = false;
  }

  function renderChampChips() {
    var wrap = $("cahier-seq-chips-champ");
    if (!wrap) return;
    OutilsDom.clear(wrap);
    CHAMPS.forEach(function (c) {
      wrap.appendChild(
        creerChipChamp(c.label, seqDraft.champId === c.id, function () {
          var was = seqDraft.champId;
          seqDraft.champId = seqDraft.champId === c.id ? null : c.id;
          if (was !== seqDraft.champId) {
            seqDraft.apsaId = null;
            seqDraft.apsaAutre = "";
          }
          renderChampChips();
          majBlocApsaVisible();
          renderApsaChips();
          majPropositionsObjectifSequence();
        })
      );
    });
    majChampResume();
    majWorkspaceHead();
  }

  function majBlocApsaVisible() {
    var block = $("cahier-seq-apsa-block");
    if (block) block.hidden = !seqDraft.champId;
  }

  function majBlocApsaAutre() {
    var block = $("cahier-seq-apsa-autre-block");
    var input = $("cahier-seq-apsa-autre");
    if (!block) return;
    var show = seqDraft.apsaId === APSA_ID_AUTRE;
    block.hidden = !show;
    if (input) {
      input.required = show;
      if (show) input.value = seqDraft.apsaAutre || "";
    }
  }

  function renderApsaChips() {
    var wrap = $("cahier-seq-chips-apsa");
    if (!wrap) return;
    OutilsDom.clear(wrap);
    if (!seqDraft.champId || !APSA_PAR_CHAMP[seqDraft.champId]) {
      majBlocApsaAutre();
      return;
    }
    APSA_PAR_CHAMP[seqDraft.champId].forEach(function (a) {
      wrap.appendChild(
        creerChip(a.label, seqDraft.apsaId === a.id, function () {
          seqDraft.apsaId = seqDraft.apsaId === a.id ? null : a.id;
          renderApsaChips();
          majBlocApsaAutre();
          majPropositionsObjectifSequence();
        })
      );
    });
    wrap.appendChild(
      creerChip("Autre", seqDraft.apsaId === APSA_ID_AUTRE, function () {
        seqDraft.apsaId = seqDraft.apsaId === APSA_ID_AUTRE ? null : APSA_ID_AUTRE;
        renderApsaChips();
        majBlocApsaAutre();
        majPropositionsObjectifSequence();
        if (seqDraft.apsaId === APSA_ID_AUTRE && $("cahier-seq-apsa-autre")) {
          $("cahier-seq-apsa-autre").focus();
        }
      })
    );
    majBlocApsaAutre();
    majWorkspaceHead();
  }

  function renderObjectifChips() {
    var wrap = $("cahier-chips-objectif");
    var hint = $("cahier-objectif-hint");
    if (!wrap) return;
    OutilsDom.clear(wrap);
    var seq = getActiveSequence();
    if (!seq || !seq.apsaId) {
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Choisissez l’APSA dans la séquence.";
      }
      return;
    }
    if (hint) hint.hidden = true;
    propositionsObjectifPourSeq(seq).forEach(function (p) {
      var on = seanceUi.objectifIds.indexOf(p.id) >= 0;
      wrap.appendChild(
        creerChip(p.label || p.phrase, on, function () {
          var i = seanceUi.objectifIds.indexOf(p.id);
          if (i >= 0) seanceUi.objectifIds.splice(i, 1);
          else seanceUi.objectifIds.push(p.id);
          seanceUi.manual.objectif = false;
          renderObjectifChips();
          syncEditeursSeance();
          planifierSauvegardeSeance();
        })
      );
    });
  }

  function renderFormatChips() {
    var wrap = $("cahier-chips-format");
    var hint = $("cahier-format-hint");
    if (!wrap) return;
    OutilsDom.clear(wrap);
    var seq = getActiveSequence();
    if (!seq || !seq.apsaId) {
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Choisissez l’APSA dans la séquence.";
      }
      return;
    }
    if (hint) hint.hidden = true;
    deroulePourApsa(seq.apsaId).forEach(function (f) {
      var on = seanceUi.formatIds.indexOf(f.id) >= 0;
      wrap.appendChild(
        creerChip(f.label, on, function () {
          var i = seanceUi.formatIds.indexOf(f.id);
          if (i >= 0) seanceUi.formatIds.splice(i, 1);
          else seanceUi.formatIds.push(f.id);
          seanceUi.manual.contenu = false;
          renderFormatChips();
          syncEditeursSeance();
          planifierSauvegardeSeance();
        })
      );
    });
  }

  function lireSeqForm() {
    seqDraft.classeId = $("cahier-seq-classe").value;
    seqDraft.objectifs = $("cahier-seq-objectifs").value.trim();
    if ($("cahier-seq-apsa-autre")) {
      seqDraft.apsaAutre = $("cahier-seq-apsa-autre").value.trim();
    }
  }

  function remplirSeqForm(seq) {
    suspendreSauvegardeAuto = true;
    if (seq) normaliserSequence(seq);
    seqDraft.id = seq ? seq.id : null;
    seqDraft.classeId = seq ? seq.classeId || "" : "";
    seqDraft.champId = seq ? seq.champId || null : null;
    seqDraft.apsaId = seq ? seq.apsaId || null : null;
    seqDraft.apsaAutre = seq ? seq.apsaAutre || "" : "";
    seqDraft.objectifs = seq ? seq.objectifs || "" : "";
    seqDraft.objectifIds = seq && Array.isArray(seq.objectifIds) ? seq.objectifIds.slice() : [];
    seqDraft.manualObjectifs = false;
    $("cahier-seq-classe").value = seqDraft.classeId;
    $("cahier-seq-objectifs").value = seqDraft.objectifs;
    if ($("cahier-seq-apsa-autre")) $("cahier-seq-apsa-autre").value = seqDraft.apsaAutre;
    $("cahier-seq-delete").hidden = !seq;
    renderChampChips();
    majBlocApsaVisible();
    renderApsaChips();
    renderSeqObjectifChips();
    suspendreSauvegardeAuto = false;
  }

  function genererObjectifSeance(seq) {
    var parts = [];
    seanceUi.objectifIds.forEach(function (propId) {
      if (propId === ID_OBJECTIF_IDEM) {
        var prevObj = seancePrecedente(seq, store.activeSeanceId);
        if (prevObj && prevObj.objectif) {
          decouperEnElements(prevObj.objectif).forEach(function (p) {
            parts.push(p);
          });
        } else {
          parts.push("Reprendre les apprentissages visés à la séance précédente.");
        }
        return;
      }
      var p = propositionObjectifById(seq, propId);
      if (!p || !p.phrase) return;
      if (p.id === "_seq") {
        decouperEnElements(p.phrase).forEach(function (line) {
          parts.push(line);
        });
      } else {
        parts.push(p.phrase);
      }
    });
    return texteEnPuces(parts);
  }

  function genererContenuSeance(seq) {
    var parts = [];
    seanceUi.formatIds.forEach(function (fid) {
      if (fid === ID_CONTENU_IDEM) {
        var prevCont = seancePrecedente(seq, store.activeSeanceId);
        if (prevCont && prevCont.contenu) {
          decouperEnElements(prevCont.contenu).forEach(function (p) {
            parts.push(p);
          });
        } else {
          parts.push("Reprendre le déroulé de la séance précédente.");
        }
        return;
      }
      var der = derouleById(seq.apsaId, fid);
      if (der && der.phrase) parts.push(der.phrase);
    });
    return texteEnPuces(parts);
  }

  function texteCopieObjectifContenu() {
    var objectif = $("cahier-edit-objectif").value.trim();
    var contenu = $("cahier-edit-contenu").value.trim();
    var parts = [];
    if (objectif) parts.push("Objectif :\n" + objectif);
    if (contenu) parts.push("Contenu :\n" + contenu);
    return parts.join("\n\n");
  }

  function syncEditeursSeance() {
    var seq = getActiveSequence();
    if (!seq) return;
    if (!seanceUi.manual.objectif) $("cahier-edit-objectif").value = genererObjectifSeance(seq);
    if (!seanceUi.manual.contenu) $("cahier-edit-contenu").value = genererContenuSeance(seq);
    majApercuCopie();
  }

  function majApercuCopie() {
    var el = $("cahier-preview-copie");
    if (!el) return;
    var txt = texteCopieObjectifContenu();
    el.textContent = txt || "—";
  }

  function majSeanceTout() {
    syncEditeursSeance();
    renderObjectifChips();
    renderFormatChips();
  }

  function snapshotSeance() {
    return {
      id: store.activeSeanceId || genererId("seance"),
      date: $("cahier-date").value || aujourdhuiIso(),
      formatIds: seanceUi.formatIds.slice(),
      formatId: seanceUi.formatIds[0] || null,
      objectifIds: seanceUi.objectifIds.slice(),
      objectif: $("cahier-edit-objectif").value.trim(),
      contenu: $("cahier-edit-contenu").value.trim(),
      attention: $("cahier-edit-attention").value.trim(),
      manual: {
        objectif: seanceUi.manual.objectif,
        contenu: seanceUi.manual.contenu,
        attention: seanceUi.manual.attention,
      },
      updatedAt: Date.now(),
    };
  }

  function appliquerSeance(s) {
    if (!s) return;
    suspendreSauvegardeAuto = true;
    s = normaliserSeance(s);
    store.activeSeanceId = s.id;
    seanceUi.formatIds = Array.isArray(s.formatIds) ? s.formatIds.slice() : s.formatId ? [s.formatId] : [];
    seanceUi.objectifIds = Array.isArray(s.objectifIds) ? s.objectifIds.slice() : [];
    seanceUi.manual = s.manual || { objectif: false, contenu: false, attention: false };
    $("cahier-date").value = s.date || aujourdhuiIso();
    $("cahier-edit-objectif").value = s.objectif || "";
    $("cahier-edit-contenu").value = s.contenu || "";
    $("cahier-edit-attention").value = s.attention || "";
    majBoutonsSeanceActions();
    afficherAccordeonSeance(true);
    majSeanceTout();
    renderSeancesList();
    majTitreSeancePanel();
    suspendreSauvegardeAuto = false;
  }

  function nouvelleSeance() {
    var seq = getActiveSequence();
    if (!seq) {
      montrerMsg("Complétez ou ouvrez une séquence d’abord.");
      return;
    }
    store.activeSeanceId = genererId("seance");
    seanceUi.formatIds = [];
    seanceUi.objectifIds = [];
    seanceUi.manual = { objectif: false, contenu: false, attention: false };
    $("cahier-date").value = aujourdhuiIso();
    $("cahier-edit-objectif").value = "";
    $("cahier-edit-contenu").value = "";
    $("cahier-edit-attention").value = "";
    majBoutonsSeanceActions();
    afficherAccordeonSeance(true);
    renderFormatChips();
    majSeanceTout();
    majTitreSeancePanel();
    persisterSeanceAuto();
    var acc = accordeonSeance();
    if (acc) acc.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function supprimerSeance() {
    var seq = getActiveSequence();
    if (!seq || !store.activeSeanceId) return;
    if (!confirm("Supprimer cette séance ?")) return;
    seq.seances = (seq.seances || []).filter(function (s) {
      return s.id !== store.activeSeanceId;
    });
    store.activeSeanceId = null;
    masquerAccordeonSeance();
    majBoutonsSeanceActions();
    sauverStore().then(function () {
      montrerOk("Séance supprimée.");
      renderSeancesList();
      majWorkspaceHead();
    });
  }

  function supprimerSequence() {
    if (!seqDraft.id) return;
    if (!confirm("Supprimer toute la séquence et ses séances ?")) return;
    store.sequences = store.sequences.filter(function (s) {
      return s.id !== seqDraft.id;
    });
    store.activeSequenceId = null;
    store.activeSeanceId = null;
    fermerWorkspace();
    remplirSelectSequences();
    remplirSeqForm(null);
    sauverStore().then(function () {
      montrerOk("Séquence supprimée.");
    });
  }

  function archiverSequence() {
    var seq = getActiveSequence();
    if (!seq || !store.activeSequenceId) return;
    if (store.activeSeanceId) persisterSeanceCouranteDansSequence();
    for (var i = 0; i < store.sequences.length; i++) {
      if (store.sequences[i].id !== seq.id) continue;
      store.sequences[i].archivee = true;
      store.sequences[i].updatedAt = Date.now();
      break;
    }
    store.activeSequenceId = null;
    store.activeSeanceId = null;
    sauverStore().then(function () {
      fermerWorkspace();
      setModeSequence("resume");
      remplirSelectSequences();
      majUiSequenceAccordion({ ouvrirSequence: true });
      montrerOk("Séquence archivée.");
    });
  }

  function desarchiverSequence(seqId) {
    var id = seqId || store.activeSequenceId;
    if (!id) return;
    for (var i = 0; i < store.sequences.length; i++) {
      if (store.sequences[i].id !== id) continue;
      store.sequences[i].archivee = false;
      store.sequences[i].updatedAt = Date.now();
      break;
    }
    sauverStore().then(function () {
      remplirSelectSequences();
      var sel = $("cahier-seq-select");
      if (sel) sel.value = id;
      majBoutonsResumeSequence();
      majUiSequenceAccordion();
      if (store.activeSequenceId === id) {
        remplirSeqForm(getSequence(id));
      }
      montrerOk("Séquence désarchivée.");
    });
  }

  function majBoutonsResumeSequence() {
    var sel = $("cahier-seq-select");
    var btn = $("cahier-unarchive-selected");
    if (!sel || !btn) return;
    var id = sel.value;
    if (!id) {
      btn.hidden = true;
      return;
    }
    var seq = getSequence(id);
    btn.hidden = !seq || !sequenceArchivee(seq);
  }

  function ouvrirWorkspace(seqId) {
    var seq = getSequence(seqId);
    if (!seq) return;
    store.activeSequenceId = seqId;
    $("cahier-workspace").hidden = false;
    remplirSeqForm(seq);
    majUiSequenceAccordion({ replierSequence: true, ouvrirSeances: true });
    renderSeancesList();
    renderFormatChips();
    if (store.activeSeanceId) {
      var s = getActiveSeance();
      if (s) appliquerSeance(s);
      else masquerAccordeonSeance();
    } else {
      masquerAccordeonSeance();
    }
    sauverStore();
  }

  function fermerWorkspace() {
    $("cahier-workspace").hidden = true;
    masquerAccordeonSeance();
    majUiSequenceAccordion({ ouvrirSequence: true });
  }

  function metaSequenceCourte(seq) {
    if (!seq) return "";
    var champ = champById(seq.champId);
    var labelApsa = libelleApsa(seq.champId, seq.apsaId, seq.apsaAutre);
    return (
      (seq.classeNom || nomClasse(seq.classeId)) +
      (labelApsa ? " · " + labelApsa : champ ? " · " + champ.label : "") +
      " · " +
      (seq.seances ? seq.seances.length : 0) +
      " séance" +
      (seq.seances && seq.seances.length !== 1 ? "s" : "") +
      (sequenceArchivee(seq) ? " · Archivée" : "")
    );
  }

  function majUiSequenceAccordion(opts) {
    opts = opts || {};
    var seq = getActiveSequence();
    var hasActive = !!(seq && store.activeSequenceId);
    var summaryTitle = $("cahier-seq-summary-title");
    var picker = $("cahier-seq-picker");
    var activeBar = $("cahier-seq-active-bar");
    var meta = $("cahier-seq-active-meta");

    if (summaryTitle) {
      var summaryText = $("cahier-seq-summary-title-text");
      if (hasActive) {
        var titreAffiche = seq.titre || "Séquence";
        if (seqDraft.id === seq.id && seqDraft.classeId && seqDraft.apsaId) {
          if (seqDraft.apsaId !== APSA_ID_AUTRE || seqDraft.apsaAutre) {
            titreAffiche = titreSequenceAuto(
              seqDraft.classeId,
              seqDraft.champId,
              seqDraft.apsaId,
              seqDraft.apsaId === APSA_ID_AUTRE ? seqDraft.apsaAutre : ""
            );
          }
        }
        if (summaryText) summaryText.textContent = titreAffiche;
        summaryTitle.hidden = false;
      } else {
        summaryTitle.hidden = true;
        if (summaryText) summaryText.textContent = "";
      }
    }
    if (picker) picker.hidden = hasActive;
    if (activeBar) activeBar.hidden = !hasActive;
    var dupSeq = $("cahier-duplicate-sequence");
    if (dupSeq) dupSeq.hidden = !hasActive;
    var archiveBtn = $("cahier-archive-sequence");
    var unarchiveBtn = $("cahier-unarchive-sequence");
    if (archiveBtn) archiveBtn.hidden = !hasActive || sequenceArchivee(seq);
    if (unarchiveBtn) unarchiveBtn.hidden = !hasActive || !sequenceArchivee(seq);
    var hrAfterActive = $("cahier-hr-after-active");
    if (hrAfterActive) hrAfterActive.hidden = !hasActive;
    var hrSeqForm = $("cahier-hr--seq-form");
    if (hrSeqForm) hrSeqForm.hidden = hasActive && picker && picker.hidden;
    if (meta) meta.textContent = hasActive ? metaSequenceCourte(seq) : "";
    var form = $("cahier-panel-seq-form");
    if (form && hasActive) form.hidden = false;
    var badge = $("cahier-seances-count");
    if (badge) {
      badge.textContent = hasActive && seq ? String(seq.seances ? seq.seances.length : 0) : "0";
    }
    var workspace = $("cahier-workspace");
    var workspaceVisible = workspace && !workspace.hidden;
    var accSeq = $("cahier-acc-sequence");
    var accSeances = $("cahier-acc-seances");
    if (accSeq) {
      if (opts.ouvrirSequence) accSeq.open = true;
      else if (opts.replierSequence && hasActive && workspaceVisible) accSeq.open = false;
    }
    if (accSeances && opts.ouvrirSeances && hasActive && workspaceVisible) accSeances.open = true;
  }

  function majWorkspaceHead() {
    majUiSequenceAccordion();
    planifierSauvegardeSequence();
  }

  function changerSequence() {
    store.activeSequenceId = null;
    store.activeSeanceId = null;
    fermerWorkspace();
    setModeSequence("resume");
    remplirSeqForm(null);
    majUiSequenceAccordion();
    sauverStore();
  }

  /** Séances triées par date (ordre du cahier : n°1 = la plus ancienne). */
  function seancesOrdonneesPourListe(seq) {
    return (seq.seances || []).map(normaliserSeance).sort(function (a, b) {
      var da = a.date || "9999-12-31";
      var db = b.date || "9999-12-31";
      if (da !== db) return da.localeCompare(db);
      return (a.id || "").localeCompare(b.id || "");
    });
  }

  function numeroSeance(seq, seanceId) {
    if (!seanceId) return null;
    var list = seancesOrdonneesPourListe(seq);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === seanceId) return i + 1;
    }
    return null;
  }

  function majTitreSeancePanel() {
    var titleText = $("cahier-seance-title-text");
    var acc = accordeonSeance();
    if (!titleText || !acc || acc.hidden) return;
    var seq = getActiveSequence();
    if (!seq) {
      titleText.textContent = "Séance";
      return;
    }
    var num = numeroSeance(seq, store.activeSeanceId);
    titleText.textContent = num != null ? "Séance n°" + num : "Nouvelle séance";
  }

  function renderSeancesList() {
    var list = $("cahier-seances-list");
    var vide = $("cahier-seances-empty");
    var seq = getActiveSequence();
    if (!list || !seq) return;
    OutilsDom.clear(list);
    var seances = seancesOrdonneesPourListe(seq);
    if (!seances.length) {
      list.hidden = true;
      if (vide) vide.hidden = false;
      return;
    }
    list.hidden = false;
    if (vide) vide.hidden = true;
    seances.forEach(function (s, index) {
      var num = index + 1;
      var li = document.createElement("li");
      li.className =
        "cahier-seances-list__item" + (s.id === store.activeSeanceId ? " cahier-seances-list__item--active" : "");

      var numEl = document.createElement("span");
      numEl.className = "cahier-seances-list__num";
      numEl.setAttribute("aria-hidden", "true");
      numEl.textContent = String(num);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cahier-seances-list__btn";
      btn.setAttribute("aria-label", "Ouvrir la séance n°" + num);

      var body = document.createElement("span");
      body.className = "cahier-seances-list__body";

      var titleRow = document.createElement("span");
      titleRow.className = "cahier-seances-list__title";
      var titre = document.createElement("strong");
      titre.textContent = "Séance n°" + num;
      titleRow.appendChild(titre);
      if (s.date) {
        var dateEl = document.createElement("time");
        dateEl.className = "cahier-seances-list__date";
        dateEl.dateTime = s.date;
        dateEl.textContent = formatDateFr(s.date);
        titleRow.appendChild(dateEl);
      }
      body.appendChild(titleRow);

      if (s.objectif) {
        var resumeEl = document.createElement("span");
        resumeEl.className = "cahier-seances-list__resume";
        resumeEl.textContent = apercuUneLigne(s.objectif, 90);
        body.appendChild(resumeEl);
      }

      btn.appendChild(body);
      btn.addEventListener("click", function () {
        appliquerSeance(s);
        var acc = accordeonSeance();
        if (acc) acc.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      li.appendChild(numEl);
      li.appendChild(btn);
      list.appendChild(li);
    });
    majTitreSeancePanel();
  }

  function remplirSelectSequences() {
    var sel = $("cahier-seq-select");
    if (!sel) return;
    OutilsDom.clear(sel);
    var groups = sequencesTrieesPourAffichage();
    var total = groups.actives.length + groups.archivees.length;
    if (!total) {
      var o = document.createElement("option");
      o.value = "";
      o.textContent = "Aucune séquence enregistrée";
      sel.appendChild(o);
      $("cahier-seq-open").disabled = true;
      majBoutonsResumeSequence();
      return;
    }
    $("cahier-seq-open").disabled = false;
    remplirSelectSequencesOptions(sel, groups);
    majBoutonsResumeSequence();
  }

  function remplirClassesSelect() {
    var sel = $("cahier-seq-classe");
    if (!sel) return;
    OutilsDom.clear(sel);
    var o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "Choisir une classe…";
    sel.appendChild(o0);
    classes.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.nom;
      sel.appendChild(o);
    });
  }

  function setModeSequence(mode) {
    var isNew = mode === "new";
    $("cahier-mode-new").classList.toggle("cahier-mode__btn--active", isNew);
    $("cahier-mode-resume").classList.toggle("cahier-mode__btn--active", !isNew);
    $("cahier-mode-new").setAttribute("aria-selected", isNew ? "true" : "false");
    $("cahier-mode-resume").setAttribute("aria-selected", !isNew ? "true" : "false");
    $("cahier-panel-resume").hidden = isNew;
    $("cahier-panel-seq-form").hidden = !isNew;
    if (!isNew) remplirSelectSequences();
  }

  function ouvrirSequenceDepuisSelect() {
    var id = $("cahier-seq-select").value;
    if (!id) {
      montrerMsg("Choisissez une séquence.");
      return;
    }
    var seq = getSequence(id);
    remplirSeqForm(seq);
    ouvrirWorkspace(id);
  }

  function copierTexte(text, okMsg) {
    if (!text) {
      montrerMsg("Rien à copier.");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          montrerOk(okMsg || "Copié.");
        },
        function () {
          fallbackCopie(text, okMsg);
        }
      );
    } else fallbackCopie(text, okMsg);
  }

  function fallbackCopie(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      montrerOk(okMsg || "Copié.");
    } catch (e) {
      montrerMsg("Copie impossible.");
    }
    document.body.removeChild(ta);
  }

  function copierObjectifContenu() {
    copierTexte(
      texteCopieObjectifContenu(),
      "Texte copié — collez-le dans Pronote ou votre cahier de texte."
    );
  }

  function csvEscapeCell(val) {
    var s = String(val == null ? "" : val)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function telechargerBlob(filename, blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function nomFichierExport(seq, ext) {
    var base = (seq.titre || "sequence")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (!base) base = "sequence";
    return base + "." + ext;
  }

  function sequencePourExport() {
    var seq = getActiveSequence();
    if (!seq) return null;
    seq = JSON.parse(JSON.stringify(seq));
    normaliserSequence(seq);
    if (store.activeSeanceId && accordeonSeance() && !accordeonSeance().hidden) {
      var snap = snapshotSeance();
      if (!seq.seances) seq.seances = [];
      var idx = -1;
      for (var i = 0; i < seq.seances.length; i++) {
        if (seq.seances[i].id === snap.id) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) seq.seances[idx] = snap;
      else seq.seances.push(snap);
    }
    seq.seances = seancesOrdonneesPourListe(seq);
    return seq;
  }

  function metaExportSequence(seq) {
    var champ = champById(seq.champId);
    return [
      { label: "Titre", value: seq.titre || "—" },
      { label: "Classe", value: seq.classeNom || nomClasse(seq.classeId) || "—" },
      { label: "Champ d’apprentissage", value: champ ? champ.label : "—" },
      { label: "APSA", value: libelleApsa(seq.champId, seq.apsaId, seq.apsaAutre) || "—" },
      { label: "Objectifs de la séquence", value: seq.objectifs || "—" },
      { label: "Nombre de séances", value: String((seq.seances || []).length) },
    ];
  }

  function collecterDonneesExport() {
    var seq = sequencePourExport();
    if (!seq) {
      montrerMsg("Ouvrez ou enregistrez une séquence d’abord.");
      return null;
    }
    return {
      seq: seq,
      meta: metaExportSequence(seq),
      headers: ["Séance", "Objectif de la séance", "Contenu", "Points d’attention (enseignant)"],
      rows: (seq.seances || []).map(function (s, index) {
        return [
          "n°" + (index + 1) + (s.date ? " — " + formatDateFr(s.date) : ""),
          s.objectif || "",
          s.contenu || "",
          s.attention || "",
        ];
      }),
    };
  }

  function exporterCsv() {
    var data = collecterDonneesExport();
    if (!data) return;
    var lines = [];
    lines.push(["Cahier de texte — export séquence"].map(csvEscapeCell).join(";"));
    lines.push(["Exporté le", new Date().toLocaleString("fr-FR")].map(csvEscapeCell).join(";"));
    lines.push("");
    data.meta.forEach(function (m) {
      lines.push([m.label, m.value].map(csvEscapeCell).join(";"));
    });
    lines.push("");
    lines.push(data.headers.map(csvEscapeCell).join(";"));
    if (!data.rows.length) {
      lines.push(["—", "—", "—", "—"].map(csvEscapeCell).join(";"));
    } else {
      data.rows.forEach(function (row) {
        lines.push(row.map(csvEscapeCell).join(";"));
      });
    }
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    telechargerBlob(nomFichierExport(data.seq, "csv"), blob);
    montrerOk("Export CSV téléchargé.");
  }

  function exporterPdf() {
    var data = collecterDonneesExport();
    if (!data) return;
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      montrerMsg("Export PDF indisponible (jsPDF non chargé).");
      return;
    }
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    var margin = 12;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - 2 * margin;
    var y = margin;
    var colWidths = [20, 52, 52, contentW - 20 - 52 - 52];
    var lineH = 4;
    var pad = 2;

    function nouvellePage() {
      doc.addPage();
      y = margin;
    }

    function ensureSpace(h) {
      if (y + h > pageH - margin) nouvellePage();
    }

    doc.setTextColor(26, 39, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Cahier de texte — Séquence", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Exporté le " + new Date().toLocaleString("fr-FR"), margin, y);
    y += 8;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Détail de la séquence", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    data.meta.forEach(function (m) {
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.text(m.label + " :", margin, y);
      doc.setFont("helvetica", "normal");
      var wrapped = doc.splitTextToSize(m.value || "—", contentW - 42);
      doc.text(wrapped, margin + 40, y);
      y += Math.max(5, wrapped.length * lineH);
    });
    y += 4;

    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Séances", margin, y);
    y += 6;

    function drawTableRow(cells, isHeader) {
      var x = margin;
      var rowHeight = isHeader ? 7 : 0;
      var cellLines = [];
      var i;
      for (i = 0; i < cells.length; i++) {
        var lines = doc.splitTextToSize(String(cells[i] || "—"), colWidths[i] - pad * 2);
        cellLines.push(lines);
        rowHeight = Math.max(rowHeight, lines.length * lineH + pad * 2);
      }
      if (rowHeight < 7) rowHeight = 7;
      ensureSpace(rowHeight);
      if (isHeader) {
        doc.setFillColor(26, 39, 68);
        doc.rect(margin, y - pad, contentW, rowHeight, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - pad, contentW, rowHeight, "F");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
      }
      doc.setFontSize(8);
      for (i = 0; i < cellLines.length; i++) {
        doc.text(cellLines[i], x + pad, y + pad);
        x += colWidths[i];
      }
      y += rowHeight;
    }

    drawTableRow(data.headers, true);
    if (!data.rows.length) {
      drawTableRow(["Aucune séance enregistrée", "", "", ""], false);
    } else {
      data.rows.forEach(function (row) {
        drawTableRow(row, false);
      });
    }

    doc.save(nomFichierExport(data.seq, "pdf"));
    montrerOk("Export PDF téléchargé.");
  }

  function initDictation() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.onresult = function (e) {
      var txt = "";
      for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      if (dictatingTarget) {
        var el = $(dictatingTarget);
        if (el) {
          var cur = el.value.trim();
          el.value = cur ? cur + " " + txt.trim() : txt.trim();
          if (dictatingTarget.indexOf("objectif") >= 0) seanceUi.manual.objectif = true;
          if (dictatingTarget.indexOf("contenu") >= 0) seanceUi.manual.contenu = true;
          if (dictatingTarget.indexOf("attention") >= 0) seanceUi.manual.attention = true;
          majApercuCopie();
          planifierSauvegardeSeance();
        }
      }
      dictatingTarget = null;
    };
    recognition.onerror = function () {
      montrerMsg("Dictée indisponible.");
    };
  }

  function bindEvents() {
    $("cahier-mode-new").addEventListener("click", function () {
      setModeSequence("new");
      remplirSeqForm(null);
    });
    $("cahier-mode-resume").addEventListener("click", function () {
      setModeSequence("resume");
    });
    $("cahier-seq-open").addEventListener("click", ouvrirSequenceDepuisSelect);
    $("cahier-seq-delete").addEventListener("click", supprimerSequence);
    $("cahier-seq-classe").addEventListener("change", function () {
      lireSeqForm();
      renderChampChips();
      majBlocApsaVisible();
      renderApsaChips();
      majPropositionsObjectifSequence();
    });
    if ($("cahier-seq-apsa-autre")) {
      $("cahier-seq-apsa-autre").addEventListener("input", function (e) {
        seqDraft.apsaAutre = e.target.value.trim();
        majWorkspaceHead();
      });
    }
    $("cahier-seq-objectifs").addEventListener("input", function () {
      seqDraft.manualObjectifs = true;
      seqDraft.objectifs = $("cahier-seq-objectifs").value.trim();
      planifierSauvegardeSequence();
    });
    $("cahier-reset-seq-objectif").addEventListener("click", function () {
      seqDraft.manualObjectifs = false;
      seqDraft.objectifIds = [];
      renderSeqObjectifChips();
      syncSeqObjectifsTextarea();
      planifierSauvegardeSequence();
      montrerOk("Objectifs de la séquence effacés.");
    });
    $("cahier-seq-changer").addEventListener("click", changerSequence);
    $("cahier-duplicate-sequence").addEventListener("click", dupliquerSequence);
    $("cahier-archive-sequence").addEventListener("click", archiverSequence);
    $("cahier-unarchive-sequence").addEventListener("click", function () {
      desarchiverSequence();
    });
    $("cahier-unarchive-selected").addEventListener("click", function () {
      var id = $("cahier-seq-select") && $("cahier-seq-select").value;
      if (!id) return;
      desarchiverSequence(id);
    });
    $("cahier-seq-select").addEventListener("change", majBoutonsResumeSequence);
    $("cahier-new-seance").addEventListener("click", nouvelleSeance);
    $("cahier-delete-seance").addEventListener("click", supprimerSeance);
    $("cahier-duplicate-seance").addEventListener("click", ouvrirDialogueDupliquerSeance);
    $("cahier-dupliquer-annuler").addEventListener("click", function () {
      var dlg = $("cahier-dialog-dupliquer");
      if (dlg && typeof dlg.close === "function") dlg.close();
    });
    $("cahier-dialog-dupliquer-form").addEventListener("submit", function (e) {
      e.preventDefault();
      confirmerDupliquerSeance();
    });
    if ($("cahier-date")) {
      $("cahier-date").addEventListener("change", planifierSauvegardeSeance);
    }
    ["cahier-edit-objectif", "cahier-edit-contenu", "cahier-edit-attention"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        if (id === "cahier-edit-objectif") seanceUi.manual.objectif = true;
        if (id === "cahier-edit-contenu") seanceUi.manual.contenu = true;
        if (id === "cahier-edit-attention") seanceUi.manual.attention = true;
        majApercuCopie();
        planifierSauvegardeSeance();
      });
    });
    $("cahier-reset-objectif").addEventListener("click", function () {
      seanceUi.manual.objectif = false;
      seanceUi.objectifIds = [];
      renderObjectifChips();
      syncEditeursSeance();
      planifierSauvegardeSeance();
      montrerOk("Objectif de la séance effacé.");
    });
    $("cahier-reset-contenu").addEventListener("click", function () {
      seanceUi.manual.contenu = false;
      seanceUi.formatIds = [];
      renderFormatChips();
      syncEditeursSeance();
      planifierSauvegardeSeance();
      montrerOk("Contenu effacé.");
    });
    $("cahier-copy-pronote").addEventListener("click", copierObjectifContenu);
    $("cahier-export-csv").addEventListener("click", exporterCsv);
    $("cahier-export-pdf").addEventListener("click", exporterPdf);
    document.querySelectorAll(".cahier-dictate").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dictatingTarget = btn.getAttribute("data-target");
        if (!recognition) {
          montrerMsg("Dictée non supportée ici.");
          return;
        }
        try {
          recognition.start();
        } catch (e) {
          montrerMsg("Impossible de démarrer la dictée.");
        }
      });
    });
  }

  function init() {
    bindEvents();
    initDictation();
    setModeSequence("new");
    remplirSeqForm(null);
    renderChampChips();
    majBlocApsaVisible();
    renderApsaChips();
    renderSeqObjectifChips();
    var prom = Promise.resolve();
    if (typeof DataManager !== "undefined") {
      prom = prom.then(chargerStore).then(function () {
        return DataManager.getClasses();
      }).then(function (c) {
        classes = c || [];
      });
    }
    prom.then(function () {
      remplirClassesSelect();
      remplirSelectSequences();
      majUiSequenceAccordion();
      if (store.activeSequenceId && getSequence(store.activeSequenceId)) {
        ouvrirWorkspace(store.activeSequenceId);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
