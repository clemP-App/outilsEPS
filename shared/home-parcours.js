/**
 * Accueil guidé prof — structure en 4 zones (index.html).
 * Libellés d’affichage uniquement ; les href pointent vers les routes existantes.
 */
(function (global) {
  "use strict";

  var HOME_GUIDED = {
    parcoursRapidesTitre: "Selon mon besoin",
    entrees: [
      {
        id: "debut",
        icone: "✨",
        titre: "Je débute sur Outils EPS",
        description: "Créer sa classe, faire l’appel, lancer un tournoi.",
        actions: [
          { label: "Créer ma classe", href: "outils/classes.html", icon: "👥", primary: true },
          { label: "Faire l’appel / mettre une note", href: "outils/tableau-suivi.html", icon: "📒" },
          {
            label: "J’organise un tournoi éliminatoire",
            href: "outils/tournoi-elimination.html",
            icon: "🎾",
          },
        ],
      },
      {
        id: "cours-maintenant",
        icone: "⚡",
        titre: "J’ai cours maintenant",
        description: "Les raccourcis utiles quand la séance commence.",
        actions: [
          { label: "Faire l’appel", href: "outils/tableau-suivi.html", icon: "📒", primary: true },
          { label: "Composer des équipes", href: "outils/composition-equipes.html", icon: "⚖️" },
          { label: "Lancer un timer", href: "outils/maxi-timer.html", icon: "⏲️" },
        ],
      },
      {
        id: "suivre-eleves",
        icone: "🧾",
        titre: "Je fais le suivi de mes élèves",
        description: "Dossier élève, dispenses et oublis de matériel.",
        actions: [
          { label: "Ouvrir le Dossier élève", href: "outils/synthese-eps.html", icon: "🧾", primary: true },
          {
            label: "Dispenses / inaptitudes",
            href: "outils/dispenses-eps.html",
            icon: "📋",
          },
          {
            label: "Oubli de matériel",
            href: "outils/oubli-materiel.html",
            icon: "👟",
          },
        ],
      },
    ],
    confiance: [
      { icon: "🆓", text: "Gratuit" },
      { icon: "🔓", text: "Sans compte obligatoire" },
      { icon: "📱", text: "Données sur votre appareil" },
      { icon: "💾", text: "Sauvegarde exportable" },
    ],
    qrBloc: {
      icone: "📲",
      titre: "Récupérer les résultats des élèves",
      intro:
        "Les élèves utilisent leur page dédiée, génèrent un QR code, puis vous retrouvez leurs résultats dans le Dossier élève.",
      partage: {
        titre: "QR code que les élèves doivent scanner",
        ouvrir: {
          label: "Ouvrir la page élève",
          href: "eleves.html",
          icon: "📱",
          primary: true,
        },
        copier: { label: "Copier le lien de la page élève" },
      },
      reception: {
        titre: "Récupérer les données de mes élèves via Qr Code",
        actions: [
          {
            label: "Ouvrir Données élèves",
            href: "outils/donnees-eleves.html",
            icon: "📲",
            primary: true,
          },
          {
            label: "Voir les imports dans le Dossier élève",
            href: "outils/synthese-eps.html",
            icon: "🧾",
          },
        ],
      },
    },
    parcoursRapides: [
      {
        id: "eval-grille",
        icone: "▦",
        titre: "Évaluer mes élèves",
        description: "Grille d’évaluation, notation en séance et suivi du dossier.",
        actions: [
          {
            label: "Créer une grille d’évaluation",
            href: "outils/grilles-evaluation.html",
            icon: "▦",
            primary: true,
          },
          { label: "Noter avec une grille", href: "outils/tableau-suivi.html", icon: "📒" },
          {
            label: "Suivre le dossier d’un élève",
            href: "outils/synthese-eps.html",
            icon: "🧾",
          },
        ],
      },
      {
        id: "preparer-seance",
        icone: "📝",
        titre: "Préparer une séance",
        description: "Séquences, fiches et ressources.",
        actions: [
          { label: "Ouvrir le cahier de texte", href: "outils/cahier-texte.html", icon: "📝", primary: true },
          { label: "Voir les ressources EPS", href: "outils/ressources-eps.html", icon: "📚" },
        ],
      },
      {
        id: "tournoi",
        icone: "🏆",
        titre: "Organiser un tournoi",
        description: "Poules, paliers et équipes équilibrées.",
        actions: [
          { label: "Lancer un championnat", href: "outils/championnat-poule.html", icon: "🏆", primary: true },
          { label: "Créer une pyramide", href: "outils/pyramide-victoires.html", icon: "📶" },
          { label: "Composer des équipes", href: "outils/composition-equipes.html", icon: "⚖️" },
        ],
      },
      {
        id: "course-perfs",
        icone: "🏃",
        titre: "Course, chronos et performances",
        description: "Mesurer et comparer sur le terrain.",
        actions: [
          { label: "Lancer un test VMA", href: "outils/test-vma.html", icon: "📣", primary: true },
          { label: "Utiliser Photo Finish", href: "outils/photo-finish.html", icon: "📷" },
          { label: "Chronométrer un relais", href: "outils/relais.html", icon: "🔄" },
        ],
      },
      {
        id: "sports-collectifs",
        icone: "🏀",
        titre: "Sports collectifs",
        description: "Observer, schématiser et débriefer.",
        actions: [
          { label: "Observer avec le PTB", href: "outils/compteur-ptb.html", icon: "🧮", primary: true },
          { label: "Dessiner une tactique", href: "outils/tableau-noir.html", icon: "👨‍🏫" },
          { label: "Lancer un débrief", href: "outils/questions-debrief.html", icon: "💬" },
        ],
      },
      {
        id: "securiser",
        icone: "🛡️",
        titre: "Sécuriser mes données",
        description: "Copie en lieu sûr, synchronisation et préparation de la rentrée.",
        actions: [
          {
            label: "Exporter une copie en lieu sûr",
            href: "outils/sauvegarde.html",
            icon: "📤",
            primary: true,
          },
          {
            label: "Synchroniser deux appareils",
            href: "outils/sauvegarde.html",
            icon: "⇄",
          },
          {
            label: "Préparer la nouvelle année",
            href: "outils/nouvelle-annee-scolaire.html",
            icon: "🗓",
          },
        ],
      },
    ],
  };

  global.OutilsEPS = global.OutilsEPS || {};
  global.OutilsEPS.HOME_GUIDED = HOME_GUIDED;
  /** @deprecated Conservé pour compatibilité éventuelle — utiliser HOME_GUIDED */
  global.OutilsEPS.HOME_PARCOURS = HOME_GUIDED.parcoursRapides;
})(typeof window !== "undefined" ? window : globalThis);
