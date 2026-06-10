/**
 * Catalogue des outils EPS (accueil prof, accueil élèves, recherche).
 *
 * POUR AJOUTER UN OUTIL :
 * 1. Créez la page HTML dans outils/nom-de-votre-outil.html
 * 2. Ajoutez un objet dans OUTILS ci-dessous.
 * 3. publicCible : "prof" ou "eleve" — les outils élèves renvoient vers eleves.html.
 * 4. Outils prof : categorie (voir ACCUEIL_CATEGORIES_PROF pour l’ordre d’affichage).
 * 5. badge (optionnel) : ex. "Beta" — pastille affichée sur la tuile d’accueil.
 */
(function (global) {
  "use strict";

  /** Ordre d’affichage sur l’accueil prof — 3 groupes (libellé = champ categorie de l’outil). */
  var ACCUEIL_CATEGORIES_PROF = [
    { label: "Gestion de classe" },
    { label: "Séance" },
    { label: "Activités" },
  ];

  /** @type {Array<{id:string,titre:string,description:string,icone:string,href:string,categorie:string,publicCible:'prof'|'eleve',badge?:string}>} */
  var OUTILS = [
    {
      id: "classes",
      titre: "Classes et groupes",
      description:
        "Créer des classes, groupes et listes d'élèves réutilisables dans tous les outils.",
      icone: "👥",
      href: "outils/classes.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "tableau-suivi",
      titre: "Appel et notes",
      description:
        "Appel, notes et colonnes datées : liste d’élèves, synthèse, tri et export CSV/PDF.",
      icone: "📒",
      href: "outils/tableau-suivi.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "grilles-evaluation",
      titre: "Grilles d'évaluation",
      description:
        "Catalogue, création, modification, duplication et publication de modèles de grilles d'évaluation.",
      icone: "▦",
      href: "outils/grilles-evaluation.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "cahier-texte",
      titre: "Cahier de texte",
      description:
        "Séquence (CA, APSA) et fiches de séance : prévu, réalisé et points pour la prochaine fois.",
      icone: "📝",
      href: "outils/cahier-texte.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "validation-asns",
      titre: "Validation ASNS",
      description:
        "Valider le savoir-nager au bord du bassin : suivi par élève, étapes du parcours officiel, attestations PDF et signature.",
      icone: "🏊",
      href: "outils/validation-asns.html",
      categorie: "Activités",
      publicCible: "prof",
    },
    {
      id: "dispenses-eps",
      titre: "Dispenses / Inaptitudes",
      description:
        "Enregistrez et suivez les dispenses, avec filtres et dates de fin calculées.",
      icone: "📋",
      href: "outils/dispenses-eps.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "oubli-materiel",
      titre: "Oubli de matériel",
      description:
        "Notez les oublis d’affaires et retrouvez automatiquement l’oubli n°1, n°2, etc. par élève.",
      icone: "👟",
      href: "outils/oubli-materiel.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "donnees-eleves",
      titre: "Données élèves",
      description:
        "Scannez les QR des élèves, consultez leurs résultats (aperçu identique à chaque outil) et gérez les imports.",
      icone: "📲",
      href: "outils/donnees-eleves.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "synthese-eps",
      titre: "Synthèse",
      description:
        "Consulter les fiches élèves et fiches classes avec présence, oublis, dispenses, performances, observations, évaluations et bilans.",
      icone: "🧾",
      href: "outils/synthese-eps.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "ressources-eps",
      titre: "Ressources EPS",
      description:
        "Liens officiels Eduscol et concours, favoris et ressources personnelles en un clin d’œil.",
      icone: "📚",
      href: "outils/ressources-eps.html",
      categorie: "Gestion de classe",
      publicCible: "prof",
    },
    {
      id: "video-retard",
      titre: "Vidéo avec retard",
      description:
        "Filmez une action et affichez-la avec 5 à 60 s de décalage pour l’auto-correction en direct.",
      icone: "📹",
      href: "outils/video-retard.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "tableau-noir",
      titre: "Tableau tactique",
      description:
        "Schémas tactiques sur terrains sportifs : dessin, joueurs, animation, export PNG/PDF, mode présentation.",
      icone: "👨‍🏫",
      href: "outils/tableau-noir.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "composition-equipes",
      titre: "Composition d’équipes homogènes",
      description:
        "Liste prénom ou nom (optionnel ;niveau 1–5), équipes équilibrées par niveau et déplacements manuels.",
      icone: "⚖️",
      href: "outils/composition-equipes.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "championnat-poule",
      titre: "Championnat",
      description:
        "Créer un championnat multi-poules, gérer les équipes, saisir les résultats et afficher les classements.",
      icone: "🏆",
      href: "outils/championnat-poule.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "championnat-poule-unique",
      titre: "Championnat poule unique",
      description:
        "Gérer une poule sur appareil élève, saisir les scores et transmettre les résultats par QR.",
      icone: "🏆",
      href: "outils/championnat-poule-unique.html",
      categorie: "Sports collectifs",
      publicCible: "eleve",
    },
    {
      id: "tournoi-elimination",
      titre: "Tournoi éliminatoire",
      description:
        "Créer un tableau type tennis : quarts, demies, finale, avec progression automatique des gagnants.",
      icone: "🎾",
      href: "outils/tournoi-elimination.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "pyramide-victoires",
      titre: "Pyramide de victoires",
      description:
        "Tournoi par paliers : une victoire fait monter, une défaite ne fait pas descendre. Classement et matchs entre joueurs du même palier.",
      icone: "📶",
      href: "outils/pyramide-victoires.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "defi-atp",
      titre: "Défi ATP",
      description:
        "Défis entre élèves avec classement dynamique, badges, historique, hall of fame et points paramétrables.",
      icone: "🥊",
      href: "outils/defi-atp.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "photo-finish",
      titre: "Photo Finish",
      description:
        "Chronometrage avec vraie image recomposee de ligne d'arrivee : bandeaux horodates, curseur central, zoom, resultats et export.",
      icone: "📷",
      href: "outils/photo-finish.html",
      categorie: "Activités",
      publicCible: "prof",
      badge: "Beta",
    },
    {
      id: "relais",
      titre: "Relais (prof)",
      description:
        "Même chronométrage 3 zones que l’outil élève, plus classe, associations donneur/receveur, meilleures perfs et export.",
      icone: "🔄",
      href: "outils/relais.html",
      categorie: "Activités",
      publicCible: "prof",
      badge: "Beta",
    },
    {
      id: "course-orientation",
      titre: "Course d’orientation",
      description:
        "Plusieurs parcours en parallèle, chronos et balises par élève, grille couleur, classement live et départs groupés.",
      icone: "🧭",
      href: "outils/course-orientation.html",
      categorie: "Activités",
      publicCible: "prof",
    },
    {
      id: "timer-hiit-tabata",
      titre: "Timer HIIT / Tabata",
      description:
        "Travail / pause en boucle, raccourcis Tabata et HIIT, bips et décompte au départ.",
      icone: "⏱️",
      href: "outils/timer-hiit-tabata.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "maxi-timer",
      titre: "Maxi timer",
      description:
        "Grand chrono descendant ou croissant, lisible de loin, avec bips de fin.",
      icone: "⏲️",
      href: "outils/maxi-timer.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "tirage-au-sort",
      titre: "Tirage au sort",
      description:
        "Importez depuis une classe ou saisissez une liste, puis tirez un nom au hasard parmi les participants.",
      icone: "🎲",
      href: "outils/tirage-au-sort.html",
      categorie: "Séance",
      publicCible: "prof",
    },
    {
      id: "inducteur-danse",
      titre: "Inducteur danse",
      description:
        "Tirez au hasard des inducteurs (espace, objet, contraintes corporelles…) pour l’improvisation ou la composition en danse APSA.",
      icone: "💃",
      href: "outils/inducteur-danse.html",
      categorie: "Activités",
      publicCible: "prof",
    },
    {
      id: "test-vma",
      titre: "Test VMA",
      description:
        "Chronomètre avec bips, voix, paliers et repères plots pour Gacon, Luc Léger, VAMEVAL et demi-Cooper.",
      icone: "📣",
      href: "outils/test-vma.html",
      categorie: "Activités",
      publicCible: "prof",
    },
    {
      id: "radar",
      titre: "Radar vitesse",
      description:
        "Chronométrez un élève sur une distance : à l’arrivée, vitesse (km/h) et allure (min/km), performances enregistrées par classe.",
      icone: "📡",
      href: "outils/radar.html",
      categorie: "Activités",
      publicCible: "prof",
    },
    {
      id: "table-marque",
      titre: "Table de marque",
      description:
        "Deux scores, timer de match, noms et couleurs d’équipes personnalisables.",
      icone: "🏀",
      href: "outils/table-marque.html",
      categorie: "Sports collectifs",
      publicCible: "eleve",
    },
    {
      id: "compteur-ptb",
      titre: "Compteur PTB",
      description:
        "Observer pertes, tirs et buts pour deux équipes, avec statistiques comparatives en direct.",
      icone: "🧮",
      href: "outils/compteur-ptb.html",
      categorie: "Sports collectifs",
      publicCible: "eleve",
    },
    {
      id: "compteur-bonus",
      titre: "Compteur bonus",
      description:
        "Deux joueurs en direct : bonus, points et malus en un clic, score et pourcentages par type d’action.",
      icone: "👍",
      href: "outils/compteur-bonus.html",
      categorie: "Organisation EPS",
      publicCible: "eleve",
    },
    {
      id: "vitesse-plots",
      titre: "Vitesse aux plots",
      description:
        "Chronométrez les passages aux plots pour connaître la vitesse du dernier intervalle et la moyenne.",
      icone: "📍",
      href: "outils/vitesse-plots.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "relais-eleve",
      titre: "Relais",
      description:
        "Chronométrez un relais en 3 zones (course, transmission, reprise) avec vitesses et relecture vidéo optionnelle de la ZT.",
      icone: "🔄",
      href: "outils/relais-eleve.html",
      categorie: "Course à pied",
      publicCible: "eleve",
      badge: "Beta",
    },
    {
      id: "compteur-ratio",
      titre: "Compteur ratio",
      description:
        "Deux compteurs réussite/échec avec total de tentatives et ratio de réussite.",
      icone: "📊",
      href: "outils/compteur-ratio.html",
      categorie: "Observation",
      publicCible: "eleve",
    },
    {
      id: "questions-debrief",
      titre: "Questions débrief",
      description:
        "Bilan : 4 critères notés de 1 à 5 et 3 questions texte, partageables au professeur via QR.",
      icone: "💬",
      href: "outils/questions-debrief.html",
      categorie: "Réflexion",
      publicCible: "eleve",
    },
    {
      id: "zone-impact",
      titre: "Zone d’impact",
      description:
        "Cliquez les zones visées ou touchées selon l’activité : badminton, tennis de table, volley ou boxe.",
      icone: "⭕",
      href: "outils/impact-badminton.html",
      categorie: "Observation",
      publicCible: "eleve",
    },
    {
      id: "convertisseur-allure",
      titre: "Convertisseur km/h ↔ min/km",
      description:
        "Passez de la vitesse à l’allure, ou l’inverse, avec des champs dédiés et mise à jour automatique.",
      icone: "⏱️",
      href: "outils/convertisseur-allure.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "distance-vma",
      titre: "Distance VMA",
      description:
        "Convertisseur distance–temps à partir de la VMA, avec tableau de passages et chronomètre de suivi.",
      icone: "🎯",
      href: "outils/distance-vma.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "calcul-1rm",
      titre: "Calcul du 1RM",
      description:
        "Estimez votre charge max (1RM) à partir du poids et du nombre de répétitions, formules Epley ou Brzycki.",
      icone: "🏋️",
      href: "outils/calcul-1rm.html",
      categorie: "Musculation",
      publicCible: "eleve",
    },
    {
      id: "journal-musculation",
      titre: "Journal de musculation",
      description:
        "Enregistrez vos séances (exercices, séries, charges) et partagez une séance à la fois au prof via QR.",
      icone: "📓",
      href: "outils/journal-musculation.html",
      categorie: "Musculation",
      publicCible: "eleve",
    },
    {
      id: "vitesse-course",
      titre: "Vitesse de course",
      description:
        "Calculez la vitesse (km/h, m/s) et l’allure (min/km) à partir d’une distance et d’un temps.",
      icone: "🏃",
      href: "outils/vitesse-course.html",
      categorie: "Course à pied",
      publicCible: "eleve",
    },
    {
      id: "ecartement-plots",
      titre: "Écartement des plots",
      description:
        "Calcule la distance entre deux plots pour que 1 km/h corresponde à 1 plot selon la durée du demi-fond.",
      icone: "📐",
      href: "outils/ecartement-plots.html",
      categorie: "Activités",
      publicCible: "prof",
    },
  ];

  global.OutilsEPS = global.OutilsEPS || {};
  global.OutilsEPS.OUTILS = OUTILS;
  global.OutilsEPS.ACCUEIL_CATEGORIES_PROF = ACCUEIL_CATEGORIES_PROF;
  global.OutilsEPS.ACCUEIL_PROF = "index.html";
  global.OutilsEPS.ACCUEIL_ELEVE = "eleves.html";
})(typeof window !== "undefined" ? window : globalThis);
