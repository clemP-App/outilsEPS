# Outils EPS

Petite application web **HTML / CSS / JavaScript** (sans framework) pour regrouper des outils utiles en cours d’EPS. Installable en **PWA** ; fonctionne sans serveur (ouverture de `index.html` ou hébergement statique).

## Utilisation

Ouvrez `index.html` dans un navigateur (double-clic ou « Ouvrir avec… »). Aucun serveur n’est obligatoire ; pour éviter certaines restrictions sur `file://`, vous pouvez aussi servir le dossier avec un serveur statique local (ou GitHub Pages).

## Données et sauvegarde

Les données principales sont stockées dans **IndexedDB** (`outilsEPSDB`) via `data-manager.js` :

| Contenu | Store IndexedDB |
|--------|------------------|
| Classes et élèves | `classes`, `eleves` |
| Dispenses EPS | `dispenses` |
| Championnat poule | `championnats` |
| Réglages d’outils (composition, compteur bonus, timer HIIT, etc.) | `parametres` |

**Limites :**

- Données **locales à l’appareil** : pas de serveur, pas de synchronisation automatique entre téléphones ou ordinateurs.
- Pensez à **exporter** régulièrement une sauvegarde JSON depuis l’écran **Sauvegarde et restauration** (icône 💾 sur l’accueil).
- Le fichier `outilsEPS-backup.json` contient **tous** les stores ci-dessus (y compris les raccourcis personnalisés du timer HIIT / Tabata).
- L’**import** remplace **toutes** les données de l’appareil après confirmation (transaction atomique : en cas d’échec, les anciennes données sont conservées).

**Migration :** au premier lancement après une mise à jour, les anciennes données encore présentes dans `localStorage` peuvent être proposées à la migration vers IndexedDB (dispenses, championnat, composition, etc.). Les raccourcis HIIT issus de `outils_eps_hiit_presets_v1` sont migrés automatiquement vers IndexedDB.

**Hors sauvegarde JSON :** certains réglages légers de l’accueil (favoris, ordre des outils) peuvent rester dans `localStorage` ; ils ne sont pas inclus dans l’export global.

## Structure du projet

```
OutilsEPS/
├── index.html              # Accueil : liste des outils + recherche
├── style.css               # Styles partagés
├── script.js               # Liste des outils (accueil)
├── data-manager.js         # IndexedDB, export/import JSON
├── class-import.js         # Import d’élèves depuis une classe
├── sw.js                   # Service worker (cache PWA)
├── vendor/                 # Bibliothèques locales (ex. jsPDF)
├── assets/                 # Icônes PWA
└── outils/                 # Une page HTML (+ JS) par outil
```

### Ajouter un outil sur l’accueil

1. Créez une nouvelle page dans `outils/`.
2. Ajoutez un objet dans le tableau `OUTILS` de `script.js`.
3. Liez `../style.css` et un lien « Retour à l’accueil » vers `../index.html`.
4. Si l’outil enregistre des données, utilisez `DataManager` et ajoutez la page + scripts à `sw.js` (liste `PRECACHE`).

### Dispenses EPS — rappels

- **Date de fin** : dernier jour **inclus** d’une période de *N* jours à partir de la date de début (fin = début + *N* − 1 jour).
- **Couleurs** : rouge = dispense **en cours** ; vert = **terminée** ; neutre = **à venir**.

## Technologies

- HTML5, CSS3, JavaScript (pas de modules : compatible ouverture fichier direct).
- IndexedDB pour la persistance ; `localStorage` uniquement pour migration et préférences légères de l’accueil.
- Accessibilité de base : labels, champs, messages d’erreur, zones `aria-live` où utile.

## Licence

Usage libre pour un contexte éducatif ; adaptez le contenu à vos besoins.
