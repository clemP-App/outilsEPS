# Outils EPS

Petite application web **HTML / CSS / JavaScript** (sans framework) pour regrouper des outils utiles en cours d’EPS.

## Utilisation

Ouvrez `index.html` dans un navigateur (double-clic ou « Ouvrir avec… »). Aucun serveur n’est obligatoire ; pour éviter certaines restrictions sur `file://`, vous pouvez aussi servir le dossier avec un serveur statique local si besoin.

## Structure du projet

```
OutilsEPS/
├── index.html              # Accueil : liste des outils + recherche
├── style.css               # Styles partagés (accueil + pages outils)
├── script.js               # Données des outils + filtre recherche (accueil)
├── README.md               # Ce fichier
├── assets/                 # Optionnel : images, favicon, etc.
└── outils/
    ├── ecartement-plots.html    # Calculateur d’écartement des plots
    ├── convertisseur-allure.html # km/h ↔ min/km
    ├── dispenses-eps.html        # Gestion des dispenses (localStorage)
    └── dispenses-eps.js          # Logique des dispenses
```

### Ajouter un outil sur l’accueil

1. Créez une nouvelle page dans `outils/`.
2. Ouvrez `script.js` et ajoutez un objet dans le tableau `OUTILS` (voir le commentaire en tête du fichier).
3. Liez la page à `../style.css` et ajoutez un lien « Retour à l’accueil » vers `../index.html`.

### Dispenses EPS — données et limites

- Les dispenses sont enregistrées dans le **localStorage** du navigateur (pas de serveur, pas de synchronisation entre appareils).
- **Date de fin** : dernier jour **inclus** d’une période de *N* jours à partir de la date de début (formule : fin = début + *N* − 1 jour).
- **Couleurs** : rouge = dispense **en cours** ; vert = **terminée** ; style neutre = **à venir**.
- Les **photos** sont stockées en base64 : évitez les fichiers trop lourds (quota localStorage limité, typiquement quelques mégaoctets au total).

## Technologies

- HTML5, CSS3, JavaScript (modules non utilisés : compatible ouverture fichier direct).
- Accessibilité de base : labels, champs, messages d’erreur, zones `aria-live` où utile.

## Licence

Usage libre pour un contexte éducatif ; adaptez le contenu à vos besoins.