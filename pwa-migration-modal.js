/**
 * Modale d’aide « Migration vers outilseps.fr » (accordéon + visuels).
 */
(function () {
  "use strict";

  var DIALOG_ID = "dialog-migration-domain";
  var dialogEl = null;

  function site() {
    return (window.OutilsEPS && window.OutilsEPS.site) || null;
  }

  function isLegacy() {
    var s = site();
    return s ? s.isLegacyHost() : false;
  }

  function assetUrl(path) {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) return "../" + path;
    return path;
  }

  function sauvegardeHref() {
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    return sw && sw.indexOf("../") === 0 ? "../outils/sauvegarde.html" : "outils/sauvegarde.html";
  }

  function chevHtml() {
    return '<span class="card--accordion__chev" aria-hidden="true"></span>';
  }

  function accordionItem(id, title, bodyHtml, open) {
    return (
      '<details class="card card--accordion migration-accordion__item"' +
      (open ? " open" : "") +
      ' id="migration-step-' +
      id +
      '">' +
      '<summary><span class="card--accordion__title">' +
      title +
      "</span>" +
      chevHtml() +
      "</summary>" +
      '<div class="card--accordion__panel migration-accordion__panel">' +
      bodyHtml +
      "</div></details>"
    );
  }

  function buildDialog() {
    if (dialogEl) return dialogEl;

    var newUrl = (site() && site().NEW_SITE_URL) || "https://outilseps.fr/";
    var legacyUrl = (site() && site().LEGACY_SITE_URL) || "https://clemp-app.github.io/outilsEPS/";

    var html =
      '<dialog class="info-dialog card migration-dialog" id="' +
      DIALOG_ID +
      '" aria-labelledby="migration-dialog-title">' +
      '<form method="dialog" class="info-dialog__form migration-dialog__form">' +
      '<h2 id="migration-dialog-title" class="info-dialog__title">Migration vers outilseps.fr</h2>' +
      '<p class="migration-dialog__intro">' +
      "Outils EPS a une nouvelle adresse officielle. Suivez les étapes ci-dessous pour installer la nouvelle application et conserver vos données." +
      "</p>" +
      '<div class="migration-accordion">';

    html += accordionItem(
      "nouvelle-adresse",
      "1. Ouvrir la nouvelle adresse",
      '<p class="hint">Rendez-vous sur <strong><a href="' +
        newUrl +
        '" target="_blank" rel="noopener noreferrer" class="info-dialog__link">outilseps.fr</a></strong> dans votre navigateur.</p>' +
        '<p class="hint">Sur la nouvelle version, l’icône de l’application est <strong>verte</strong> (au lieu du bleu foncé de l’ancienne version). C’est un repère visuel pour savoir que vous êtes sur le bon site.</p>' +
        '<figure class="migration-figure">' +
        '<img src="' +
        assetUrl("assets/migration/logo-vert.png") +
        '" alt="Nouveau logo Outils EPS — fond vert" width="160" height="160" loading="lazy" decoding="async" />' +
        '<figcaption>Nouveau logo sur outilseps.fr</figcaption>' +
        "</figure>" +
        '<p><a href="' +
        newUrl +
        '" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--small">Ouvrir outilseps.fr</a></p>',
      true
    );

    html += accordionItem(
      "iphone",
      "2. Installer la PWA sur iPhone / iPad",
      '<figure class="migration-figure migration-figure--wide">' +
        '<img src="' +
        assetUrl("assets/migration/install-iphone.png") +
        '" alt="Étapes d’installation sur iPhone : Safari, Partager, Sur l’écran d’accueil" width="640" loading="lazy" decoding="async" />' +
        "</figure>" +
        '<ol class="info-dialog__list migration-steps">' +
        "<li>Ouvrez <strong>Safari</strong> et allez sur <strong>outilseps.fr</strong></li>" +
        "<li>Appuyez sur <strong>Partager</strong> (icône carré avec flèche vers le haut)</li>" +
        "<li>Choisissez <strong>Sur l’écran d’accueil</strong></li>" +
        "<li>Ouvrez ensuite l’icône <strong>verte</strong> Outils EPS</li>" +
        "</ol>" +
        '<p class="hint">Application web — aucune installation depuis l’App Store.</p>',
      false
    );

    html += accordionItem(
      "android",
      "3. Installer la PWA sur Android",
      '<figure class="migration-figure migration-figure--wide">' +
        '<img src="' +
        assetUrl("assets/migration/install-android.png") +
        '" alt="Étapes d’installation sur Android : Chrome, Menu, Installer l’application" width="640" loading="lazy" decoding="async" />' +
        "</figure>" +
        '<ol class="info-dialog__list migration-steps">' +
        "<li>Ouvrez <strong>Chrome</strong> et allez sur <strong>outilseps.fr</strong></li>" +
        "<li>Appuyez sur le <strong>menu</strong> (⋮ en haut à droite)</li>" +
        "<li>Choisissez <strong>Installer l’application</strong></li>" +
        "<li>Ouvrez l’icône <strong>verte</strong> Outils EPS</li>" +
        "</ol>",
      false
    );

    html += accordionItem(
      "donnees",
      "4. Transférer vos données (export → import)",
      '<p class="hint">Vos classes, élèves et sauvegardes sont stockées <strong>sur chaque adresse séparément</strong>. Pour les retrouver sur outilseps.fr, exportez depuis l’ancienne version puis importez sur la nouvelle.</p>' +
        '<figure class="migration-figure migration-figure--wide">' +
        '<img src="' +
        assetUrl("assets/migration/export-import.png") +
        '" alt="Schéma export depuis l’ancienne version et import sur la nouvelle" width="640" loading="lazy" decoding="async" />' +
        "</figure>" +
        '<div class="migration-dual-steps">' +
        '<section class="migration-dual-steps__block migration-dual-steps__block--legacy">' +
        "<h3>Ancienne version</h3>" +
        '<p class="migration-dual-steps__url">' +
        legacyUrl +
        "</p>" +
        '<ol class="info-dialog__list migration-steps">' +
        "<li>Ouvrir le <strong>menu</strong> (☰)</li>" +
        "<li>Toucher <strong>Sauvegarde</strong></li>" +
        "<li>Toucher <strong>Exporter une sauvegarde</strong></li>" +
        "</ol>" +
        '<p class="hint">Le fichier JSON est enregistré sur votre appareil.</p>' +
        '<a href="' +
        sauvegardeHref() +
        '" class="btn btn--ghost btn--small">Ouvrir Sauvegarde (ici)</a>' +
        "</section>" +
        '<section class="migration-dual-steps__block migration-dual-steps__block--new">' +
        "<h3>Nouvelle version</h3>" +
        '<p class="migration-dual-steps__url">outilseps.fr</p>' +
        '<ol class="info-dialog__list migration-steps">' +
        "<li>Ouvrir le <strong>menu</strong> (☰)</li>" +
        "<li>Toucher <strong>Sauvegarde</strong></li>" +
        "<li>Toucher <strong>Importer une sauvegarde</strong></li>" +
        "<li>Choisir le fichier exporté depuis l’ancienne version</li>" +
        "</ol>" +
        "</section>" +
        "</div>",
      false
    );

    html +=
      "</div>" +
      '<div class="field-row migration-dialog__actions">' +
      '<a href="' +
      newUrl +
      '" target="_blank" rel="noopener noreferrer" class="btn btn--primary">Ouvrir la nouvelle version</a>' +
      '<button type="submit" class="btn btn--ghost">Fermer</button>' +
      "</div>" +
      "</form></dialog>";

    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    dialogEl = wrap.firstElementChild;
    document.body.appendChild(dialogEl);

    return dialogEl;
  }

  function openMigrationGuide() {
    var dlg = buildDialog();
    if (dlg && dlg.showModal) dlg.showModal();
  }

  window.OutilsEPS = window.OutilsEPS || {};
  window.OutilsEPS.openMigrationGuide = openMigrationGuide;
})();
