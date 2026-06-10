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

## Note importante

Le SEO dépend du **contenu**, de la **technique**, des **liens entrants**, de la **popularité** et du **temps**. Ces optimisations améliorent les chances d’indexation et de compréhension par Google, mais **ne garantissent pas une première position** sur les requêtes visées.
