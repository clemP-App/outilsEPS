/**
 * Ressources EPS — liens officiels intégrés (ne pas inventer d’URL).
 */
(function (global) {
  "use strict";

  global.RESSOURCES_EPS_DATA = {
    version: 2,
    groups: [
      {
        id: "programmes",
        title: "Programmes & cadres",
        subtitle: "Cycles, voie GT et voie professionnelle",
        icon: "📘",
        accent: "#0d9488",
      },
      {
        id: "evaluation",
        title: "Évaluation & examens",
        subtitle: "Bac, brevet, CCF, référentiels",
        icon: "📝",
        accent: "#dc2626",
      },
      {
        id: "banques",
        title: "Banques de ressources",
        subtitle: "Documents et fiches à parcourir",
        icon: "🔎",
        accent: "#0891b2",
      },
      {
        id: "pedagogie",
        title: "Mise en œuvre",
        subtitle: "Accompagnements et thématiques EPS",
        icon: "🎯",
        accent: "#6366f1",
      },
      {
        id: "securite",
        title: "Sécurité & inclusion",
        subtitle: "Natation, santé, élèves à besoins particuliers",
        icon: "🛡️",
        accent: "#059669",
      },
      {
        id: "concours",
        title: "Concours & carrière",
        subtitle: "CAPEPS, agrégation, jurys",
        icon: "🎓",
        accent: "#7c3aed",
      },
      {
        id: "perso",
        title: "Mes ressources",
        subtitle: "Liens ajoutés par vous",
        icon: "⭐",
        accent: "#d97706",
        custom: true,
      },
    ],
    resources: [
      {
        id: "bo-mene2531948n",
        groupId: "evaluation",
        title: "Évaluation de l'éducation physique et sportive aux baccalauréats général et technologique",
        source: "Bulletin officiel",
        url: "https://www.education.gouv.fr/bo/2026/Hebdo9/MENE2531948N",
      },
      {
        id: "prog-gt",
        groupId: "programmes",
        title: "Programmes EPS — voie générale et technologique",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/5784/programmes-et-ressources-en-education-physique-et-sportive-eps-voie-gt",
      },
      {
        id: "prog-voie-pro",
        groupId: "programmes",
        title: "Programmes EPS — voie professionnelle",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/5880/programmes-et-ressources-en-education-physique-et-sportive-eps-voie-professionnelle",
      },
      {
        id: "prog-cycle4-pdf",
        groupId: "programmes",
        title: "Programme d’enseignement — cycle 4 (PDF)",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/sites/default/files/document/programme-d-enseignement-du-cycle-4-67722.pdf",
      },
      {
        id: "prog-cycle3-pdf",
        groupId: "programmes",
        title: "Programme d’enseignement — cycle 3 (PDF)",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/sites/default/files/document/programme-d-enseignement-du-cycle-3-2023-100806.pdf",
      },
      {
        id: "edubase-eps",
        groupId: "banques",
        title: "EduBase — ressources EPS",
        source: "Éduscol",
        url: "https://edubase.eduscol.education.fr/recherche?discipline%5B0%5D=%C3%89ducation+Physique+et+Sportive",
      },
      {
        id: "accomp-cycle4",
        groupId: "pedagogie",
        title: "Accompagnement du programme — cycle 4",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/5724/ressources-d-accompagnement-du-programme-d-education-physique-et-sportive-au-cycle-4",
      },
      {
        id: "ca5-entretenir",
        groupId: "pedagogie",
        title: "CA5 — Activité physique pour s’entretenir",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/6300/realiser-une-activite-physique-pour-developper-ses-ressources-physiques-et-s-entretenir",
      },
      {
        id: "pleine-nature",
        groupId: "pedagogie",
        title: "Activités de pleine nature en EPS",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/6297/les-activites-de-pleine-nature-en-eps",
      },
      {
        id: "savoir-nager",
        groupId: "securite",
        title: "Savoir nager en sécurité",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/5709/savoir-nager-en-securite-de-la-maternelle-au-lycee",
      },
      {
        id: "bep-eps",
        groupId: "securite",
        title: "Accompagner les élèves à besoins éducatifs particuliers",
        source: "Éduscol",
        url: "https://eduscol.education.gouv.fr/6267/accompagner-en-eps-les-eleves-besoins-educatifs-particuliers",
      },
      {
        id: "capes-present",
        groupId: "concours",
        title: "Enseigner l’EPS — le CAPEPS",
        source: "Devenir enseignant",
        url: "https://www.devenirenseignant.gouv.fr/enseigner-l-education-physique-et-sportive-le-capeps-1396",
      },
      {
        id: "agreg-eps",
        groupId: "concours",
        title: "Agrégation externe — EPS",
        source: "Devenir enseignant",
        url: "https://www.devenirenseignant.gouv.fr/les-epreuves-de-l-agregation-externe-section-education-physique-et-sportive-871",
      },
      {
        id: "jurys-capes",
        groupId: "concours",
        title: "Sujets et rapports de jury — CAPEPS",
        source: "Devenir enseignant",
        url: "https://www.devenirenseignant.gouv.fr/sujets-et-rapports-des-jurys-concours-du-capeps-1139",
      },
    ],
  };
})(typeof window !== "undefined" ? window : this);
