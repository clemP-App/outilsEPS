# Outils EPS

Petite application web **HTML / CSS / JavaScript** (sans framework) pour regrouper des outils utiles en cours d’EPS. Installable en **PWA** ; fonctionne sans serveur (ouverture de `index.html` ou hébergement statique).

## Utilisation

Ouvrez `index.html` dans un navigateur (double-clic ou « Ouvrir avec… »). Aucun serveur n’est obligatoire.

**Preview Cursor :** l’aperçu intégré ne gère souvent pas `file://` (erreur `ERR_FAILED`). Sans Node ni Python, double-cliquez sur `ouvrir-apercu.bat` à la racine du projet, puis dans Cursor ouvrez **http://localhost:5173/index.html** (Simple Browser : `Ctrl+Shift+P` → « Simple Browser: Show »). La PWA reste active sur GitHub Pages ; le service worker est désactivé en local / preview IDE (`pwa-register.js`).

## Données et sauvegarde

Les données principales sont stockées dans **IndexedDB** (`outilsEPSDB`) via `data-manager.js` :

| Contenu | Store IndexedDB |
|--------|------------------|
| Classes et élèves | `classes`, `eleves` |
| Dispenses EPS | `dispenses` |
| Séances (méta : nom, classe, outil ; store `sessions`) | `sessions` |
| Championnat poule (données par séance) | `championnats` |
| Tournoi éliminatoire, pyramide de victoires | `tournoisElimination` |
| Composition d’équipes et autres réglages | `parametres` |
| Imports élèves (QR) | `importsEleves` |

**Limites :**

- Données **locales à l’appareil** : pas de serveur, pas de synchronisation automatique entre téléphones ou ordinateurs.
- Pensez à **exporter** régulièrement une sauvegarde JSON depuis l’écran **Sauvegarde et restauration** (icône 💾 sur l’accueil).
- Le fichier `outilsEPS-backup.json` contient **tous** les stores ci-dessus (y compris les raccourcis personnalisés du timer HIIT / Tabata).
- L’**import** remplace **toutes** les données de l’appareil après confirmation (transaction atomique : en cas d’échec, les anciennes données sont conservées).

**Migration :** au premier lancement après une mise à jour, les anciennes données encore présentes dans `localStorage` peuvent être proposées à la migration vers IndexedDB (dispenses, championnat, composition, etc.). Les raccourcis HIIT issus de `outils_eps_hiit_presets_v1` sont migrés automatiquement vers IndexedDB.

### Séances (championnat, tournois, composition, pyramide)

Quatre outils utilisent des **séances** pour enregistrer plusieurs contextes (ex. 6e1 le matin, 6e2 l’après-midi, reprise la semaine suivante) :

- Composition d’équipes
- Tournoi éliminatoire
- Pyramide de victoires
- Championnat à poule unique

**Utilisation :**

1. Ouvrez l’outil : un accordéon **Séance** (fermé par défaut) indique la séance active ; la **première ouverture** crée automatiquement « Première séance » (sans dialogue).
2. **Nouvelle séance** : vous saisissez le nom (ex. « 6e1 — Badminton »). **Changer** : ouvrir une autre séance existante.
3. Toutes les actions (équipes, scores, tableau…) sont enregistrées **uniquement** dans la séance ouverte.
4. **Archiver** ou **Supprimer** une séance depuis la liste (suppression = données de la séance effacées).

**Technique (code) :** chaque enregistrement métier porte un `sessionId`. La séance active par outil est mémorisée dans `parametres` (`active-session__<toolId>`). Les sauvegardes JSON incluent le store `sessions`.

**Migration ascendante :** à la première ouverture après mise à jour, les données existantes sans `sessionId` sont rattachées à une séance **Legacy — … (date)** par outil (y compris l’ancien tournoi éliminatoire stocké en `localStorage`). Aucune perte volontaire.

**Hors sauvegarde JSON :** certains réglages légers de l’accueil (favoris, ordre des outils) peuvent rester dans `localStorage` ; ils ne sont pas inclus dans l’export global.

### Remontée des données élèves (QR, 100 % offline)

Flux sans serveur ni cloud : l’élève partage un QR, le prof le scanne sur son téléphone.

**Outils élèves concernés :** table de marque, compteur PTB, compteur bonus, vitesse aux plots, zone d’impact.

#### Côté élève — partager

1. Utilisez l’outil pendant la séance (noms d’équipes / joueurs / libellé modifiables et mémorisés sur l’appareil).
2. Appuyez sur **Partager au prof (QR)** en bas de page.
3. Optionnel : classe, groupe, nom du binôme (mémorisés pour les prochains partages).
4. Montrez le QR au professeur. Un **lien texte** est aussi copiable en secours.

#### Côté prof — récupérer

1. Ouvrez **Récupération de données** sur l’accueil (section prof).
2. **Démarrer la caméra** et scannez le QR, ou **collez le lien** si le scan échoue.
3. En cas de doublon (`exportId` déjà importé), une confirmation est demandée.
4. Consultez les imports dans **Visualisation des données** (filtres, détail, suppression, export JSON des imports).

**Format technique :** JSON compact versionné (`v`, `toolId`, `exportId`, `checksum`, `payload`), compressé LZ-String + URL `outilseps://qr?v=1&d=…`. Bibliothèques locales dans `vendor/` (`lz-string`, `qrcodejs`, `html5-qrcode`).

**Limites QR :**

- Un QR standard convient pour **quelques Ko** de données compressées. Au-delà (~2–3 Ko d’URL), le scan peut échouer : privilégiez un résumé (match terminé, stats agrégées) plutôt qu’un historique très long.
- Pas de **QR multi-parties** pour l’instant (gros historiques de passages ou dizaines d’impacts détaillés).
- Les noms saisis sur l’appareil élève restent en `localStorage` ; seules les données du QR sont transférées au prof.

## Structure du projet

```
OutilsEPS/
├── index.html              # Accueil : liste des outils + recherche
├── style.css               # Styles partagés
├── script.js               # Liste des outils (accueil)
├── data-manager.js         # IndexedDB, export/import JSON
├── class-import.js         # Import d’élèves depuis une classe
├── sw.js                   # Service worker (cache PWA)
├── app-version.js          # Version PWA (cache Service Worker)
├── precache-manifest.js    # Liste precache (générée)
├── dom-utils.js            # Helpers DOM partagés
├── session-manager.js      # UI séances (barre + dialogue ; code « session »)
├── shared/sessions-core.js # Règles séances (validation, toolId)
├── shared/qr-exchange-core.js # Format QR encode/decode
├── shared/qr-share-ui.js   # Dialogue partage élève
├── shared/import-record-core.js # Normalisation imports IndexedDB
├── shared/import-detail-render.js # Affichage détail import
├── scripts/
│   ├── generate-precache.js
│   └── check-js.js
├── vendor/                 # Bibliothèques locales (jsPDF, lz-string, QR…)
├── assets/                 # Icônes PWA
└── outils/                 # Une page HTML (+ JS) par outil
```

### Ajouter un outil sur l’accueil

1. Créez une nouvelle page dans `outils/`.
2. Ajoutez un objet dans le tableau `OUTILS` de `script.js`.
3. Liez `../style.css` et un lien « Retour à l’accueil » vers `../index.html`.
4. Si l’outil enregistre des données, utilisez `DataManager`, incrémentez `APP_VERSION` dans `app-version.js`, puis régénérez le precache (voir ci-dessous).

### Cache PWA (Service Worker)

1. Incrémentez `APP_VERSION` dans `app-version.js` à chaque release qui doit invalider le cache navigateur.
2. Régénérez la liste precache :

```bash
node scripts/generate-precache.js
```

Le fichier `precache-manifest.js` est recréé automatiquement ; `sw.js` l’importe via `importScripts`. Les dossiers `scripts/`, `tests/`, `.git` et `node_modules` sont ignorés.

**Vérifications locales :**

```bash
npm run check:js
npm test
```

### Dispenses EPS — rappels

- **Date de fin** : dernier jour **inclus** d’une période de *N* jours à partir de la date de début (fin = début + *N* − 1 jour).
- **Couleurs** : rouge = dispense **en cours** ; vert = **terminée** ; neutre = **à venir**.

## Technologies

- HTML5, CSS3, JavaScript (pas de modules : compatible ouverture fichier direct).
- IndexedDB pour la persistance ; `localStorage` uniquement pour migration et préférences légères de l’accueil.
- Accessibilité de base : labels, champs, messages d’erreur, zones `aria-live` où utile.

## Licence

Usage libre pour un contexte éducatif ; adaptez le contenu à vos besoins.
