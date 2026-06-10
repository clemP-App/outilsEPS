# Référencement — Outils EPS

Checklist pour l’indexation et le suivi dans Google Search Console.

## URLs à utiliser

| Ressource | URL |
|-----------|-----|
| Page principale | https://clemp-app.github.io/outilsEPS/ |
| Sitemap | https://clemp-app.github.io/outilsEPS/sitemap.xml |
| Robots | https://clemp-app.github.io/outilsEPS/robots.txt |

## Étapes Google Search Console

1. Ouvrir [Google Search Console](https://search.google.com/search-console).
2. **Ajouter une propriété** avec préfixe d’URL : `https://clemp-app.github.io/outilsEPS/`
3. **Vérifier la propriété** (balise HTML, fichier sur GitHub Pages, ou DNS selon la méthode choisie).
4. Aller dans **Sitemaps** et soumettre : `sitemap.xml` (ou l’URL complète ci-dessus).
5. Utiliser **Inspection d’URL** sur `https://clemp-app.github.io/outilsEPS/`.
6. Cliquer sur **Demander l’indexation** si la page est éligible.
7. Quelques jours plus tard, consulter **Performances** : impressions, clics et requêtes (outils EPS, application EPS, évaluation EPS, etc.).
8. Travailler des **liens entrants** depuis des pages pertinentes : réseaux EPS, Instagram, collègues, ressources pédagogiques, ENT, blog, sites académiques si possible.

## Vérifications techniques rapides

- [ ] `robots.txt` accessible et contient `Allow: /` + la ligne `Sitemap:`.
- [ ] `sitemap.xml` valide et contient l’URL canonique avec `lastmod` à jour.
- [ ] `index.html` contient `<meta name="robots" content="index, follow">` — **pas de `noindex`**.
- [ ] Balise `<link rel="canonical" href="https://clemp-app.github.io/outilsEPS/">` présente.
- [ ] Contenu SEO visible dans la page (sections + FAQ), pas uniquement dans une modale.
- [ ] JSON-LD `WebSite`, `SoftwareApplication` et `FAQPage` présents dans `index.html`.
- [ ] `404.html` présent à la racine du dépôt.

## Dépannage : « Impossible de lire le sitemap »

Cette erreur dans Google Search Console vient presque toujours d’une **mauvaise propriété** ou d’une **mauvaise URL** — pas d’un fichier XML invalide.

### 1. Vérifier la propriété Search Console

Le site est un **GitHub Pages de projet** (sous-dossier). La propriété doit être créée en **préfixe d’URL**, exactement :

```text
https://clemp-app.github.io/outilsEPS/
```

**Ne pas utiliser** comme seule propriété :

- `https://clemp-app.github.io/` (racine du compte, sans `/outilsEPS/`)
- `http://...` (sans HTTPS)
- `https://clemp-app.github.io/outilseps/` (mauvaise casse : `EPS` est obligatoire)

### 2. Soumettre le bon sitemap

Dans **Sitemaps**, entrez l’une de ces valeurs (dans la propriété `/outilsEPS/`) :

```text
sitemap.xml
```

ou l’URL complète :

```text
https://clemp-app.github.io/outilsEPS/sitemap.xml
```

**URL incorrecte** (404 garanti) :

```text
https://clemp-app.github.io/sitemap.xml
```

### 3. Tester avant de resoumettre

Ouvrez dans un navigateur (navigation privée) :

- https://clemp-app.github.io/outilsEPS/sitemap.xml → doit afficher du XML, pas une page 404
- https://clemp-app.github.io/outilsEPS/robots.txt → doit contenir la ligne `Sitemap:`

Si le XML s’affiche : supprimez l’ancien sitemap dans Search Console, attendez 2–3 minutes, resoumettez `sitemap.xml`.

### 4. Indexation sans attendre le sitemap

Le sitemap aide Google, mais n’est pas obligatoire pour démarrer :

1. **Inspection d’URL** sur `https://clemp-app.github.io/outilsEPS/`
2. **Demander l’indexation** de la page d’accueil

Les « Pages découvertes : 0 » peuvent persister quelques heures après un premier envoi réussi.

## Note importante

Le SEO dépend du **contenu**, de la **technique**, des **liens entrants**, de la **popularité** et du **temps**. Ces optimisations améliorent les chances d’indexation et de compréhension par Google, mais **ne garantissent pas une première position** sur les requêtes visées.
