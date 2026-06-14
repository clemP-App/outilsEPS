# Vidéo — Sauvegarde, transfert et synchronisation (Outils EPS)

Document de production complet : structure, texte à lire, prompts images ChatGPT, tournage écran, chapitres YouTube.

**Durée cible totale :** 12 à 15 minutes (découpable en chapitres).

**Public :** enseignants EPS utilisant Outils EPS (ordinateur, tablette, téléphone).

**Repères visuels importants :**
- Icône **bleue** = ancienne adresse GitHub (`clemp-app.github.io/outilsEPS`)
- Icône **verte** = site officiel **outilseps.fr**
- Menu **☰** → **Sauvegarde** (💾)
- Fichier exporté : `outilsEPS-backup.json`

---

## Table des matières vidéo (chapitres YouTube)

| # | Chapitre | Durée | Début approx. |
|---|----------|-------|---------------|
| 0 | Introduction | 1 min | 0:00 |
| 1 | Comprendre en 30 secondes | 1 min 30 | 1:00 |
| 2 | Exporter une sauvegarde | 2 min | 2:30 |
| 3 | Importer : fusionner ou remplacer | 2 min 30 | 4:30 |
| 4 | Passer de GitHub à outilseps.fr | 3 min | 7:00 |
| 5 | Transférer d’un appareil à un autre (fichier) | 2 min | 10:00 |
| 6 | Synchroniser deux appareils (QR) | 3 min | 12:00 |
| 7 | Bonnes pratiques et erreurs à éviter | 1 min 30 | 15:00 |
| 8 | Conclusion | 30 s | 16:30 |

---

## PARTIE 0 — Introduction

### À l’écran
- Plan large : prof devant son ordinateur + téléphone/tablette en salle de gym.
- Puis capture : accueil Outils EPS (icône verte outilseps.fr).

### Texte à lire

> Bonjour et bienvenue dans ce tutoriel Outils EPS.
>
> Aujourd’hui, on parle de **sauvegarde**, de **transfert** et de **synchronisation** de vos données : classes, élèves, notes, championnats, réglages…
>
> Outils EPS ne fonctionne pas comme un compte en ligne : vos données restent **sur votre appareil**. C’est très pratique et respectueux de la confidentialité, mais ça veut aussi dire une chose importante : **si vous changez d’appareil, videz le cache ou supprimez l’application, vos données ne suivent pas toutes seules**.
>
> Dans cette vidéo, je vous montre comment ne rien perdre, comment passer de l’ancienne adresse GitHub vers **outilseps.fr**, comment transférer vos données d’un appareil à un autre, et comment synchroniser deux appareils quand vous en avez besoin.
>
> C’est parti.

### Image ChatGPT — Intro (IMAGE 0)

**Prompt :**
```
Illustration pédagogique flat design, style moderne et épuré, couleurs bleu marine (#1a2744) et vert (#16a34a). Un professeur d'EPS tient une tablette et un téléphone. Entre les deux appareils, une flèche avec une icône de disquette 💾. Fond neutre clair. Texte discret en français : « Sauvegarder · Transférer · Synchroniser ». Pas de logo réel, pas de marque. Format 16:9, haute qualité, look application éducative française.
```

**Usage :** miniature YouTube + plan d’intro 3 secondes.

---

## PARTIE 1 — Comprendre en 30 secondes

### À l’écran
- Page **Sauvegarde et restauration** : bloc « Comprendre en 30 secondes ».
- Schéma animé simple (image) : appareil → fichier → appareil.

### Texte à lire

> Avant les manipulations, le principe en trente secondes.
>
> Outils EPS enregistre vos données **localement**, dans la mémoire de votre navigateur ou de votre application installée. Il n’y a **pas de compte** et **rien n’est envoyé automatiquement sur internet**.
>
> Vous avez trois outils dans la page Sauvegarde :
>
> **Exporter**, c’est télécharger une copie de sécurité sur votre appareil — un fichier JSON.
>
> **Importer**, c’est restaurer ou **fusionner** un fichier que vous aviez déjà exporté.
>
> **Synchroniser**, c’est aligner **deux appareils** entre eux, avec internet le temps du transfert — on verra ça en détail plus loin.
>
> Retenez surtout ceci : **exporter régulièrement**, c’est votre assurance vie.

### Image ChatGPT — Les 3 actions (IMAGE 1)

**Prompt :**
```
Infographie flat design 16:9, trois cartes côte à côte sur fond clair. Carte 1 : icône téléchargement, titre « Exporter », sous-titre « Copie de sécurité ». Carte 2 : icône dossier, titre « Importer », sous-titre « Restaurer ou fusionner ». Carte 3 : icône flèches bidirectionnelles, titre « Synchroniser », sous-titre « Deux appareils · internet ». Palette bleu marine et vert. Style application web française, minimaliste, sans logo de marque.
```

### Image ChatGPT — Données locales (IMAGE 2)

**Prompt :**
```
Schéma pédagogique simple : au centre un smartphone/tablette avec une base de données stylisée à l'intérieur (cadenas discret = données privées). Autour, des icônes : classe, élève, note, chronomètre, trophée. Aucune flèche vers un nuage — texte « Sur votre appareil ». Style flat, fond blanc, 16:9.
```

---

## PARTIE 2 — Exporter une sauvegarde

### À l’écran (capture écran)
1. Ouvrir **outilseps.fr** (icône verte si PWA installée).
2. Menu **☰** en haut à gauche.
3. Cliquer **Sauvegarde**.
4. Montrer la carte « Ma sauvegarde » (badge Récente / Pas encore exportée).
5. Cliquer **Exporter une sauvegarde** ou **Exporter maintenant**.
6. Montrer le fichier téléchargé : `outilsEPS-backup.json` (Explorateur de fichiers / Fichiers iOS).

### Texte à lire

> On commence par l’action la plus importante : **l’export**.
>
> Sur **outilseps.fr**, ouvrez le menu en haut à gauche, puis **Sauvegarde**.
>
> En haut de la page, vous voyez l’état de votre dernière exportation : récente, à renouveler, ou pas encore faite.
>
> Cliquez sur **Exporter une sauvegarde**. Le navigateur télécharge un fichier nommé **`outilsEPS-backup.json`**.
>
> Ce fichier contient **toutes** vos données principales : classes, élèves, dispenses, séances, championnats, tournois, compositions, tableaux de suivi, réglages du timer HIIT, et plus encore.
>
> **Où le garder ?** Là où vous retrouverez le fichier dans six mois : dossier Documents, Google Drive, OneDrive, clé USB, e-mail à vous-même… L’idéal, c’est **deux endroits** : un sur le cloud et un en local.
>
> **Quand exporter ?** En fin de journée ou de cycle si vous avez beaucoup travaillé. Au minimum, une fois par semaine en période active. Avant une mise à jour importante ou un changement d’appareil, exportez **systématiquement**.

### Image ChatGPT — Export (IMAGE 3)

**Prompt :**
```
Illustration : écran de tablette montrant une interface générique de sauvegarde (bouton vert « Exporter »), une flèche vers un fichier nommé « outilsEPS-backup.json », puis trois destinations : icône nuage (cloud), icône clé USB, icône e-mail. Style flat design, couleurs vert #16a34a et bleu #1a2744. 16:9, sans texte illisible, look tutoriel français.
```

### Notes tournage
- Montrer le badge passer de « Pas encore exportée » à « Récente » après export.
- Zoom sur le nom exact du fichier.

---

## PARTIE 3 — Importer : fusionner ou remplacer

### À l’écran (capture écran)
1. Page Sauvegarde → **Importer un fichier**.
2. Sélectionner un `outilsEPS-backup.json`.
3. Montrer le **tableau de prévisualisation** (ajoutées / identiques / différentes).
4. Expliquer **Fusionner sans effacer** (recommandé).
5. Mentionner **Effacer cet appareil et remplacer** (risqué).

### Texte à lire

> Vous avez déjà un fichier de sauvegarde ? C’est l’**import**.
>
> Toujours dans **Sauvegarde**, cliquez sur **Importer un fichier**, puis choisissez votre `outilsEPS-backup.json`.
>
> Avant d’appliquer quoi que ce soit, Outils EPS vous montre un **résumé** : combien de données seront ajoutées, combien sont déjà identiques, et s’il y a des différences.
>
> Vous avez deux choix.
>
> **Fusionner sans effacer** — c’est l’option **recommandée** dans la grande majorité des cas. Les nouvelles données sont ajoutées. Ce qui est déjà sur l’appareil est conservé. Si une même donnée existe des deux côtés mais avec un contenu différent, elle est ajoutée en **copie** plutôt que d’écraser votre travail.
>
> **Effacer cet appareil et remplacer** — option **risquée**. Toutes les données actuelles de l’appareil sont supprimées, puis remplacées par le fichier. À utiliser seulement si vous voulez **restaurer entièrement** une sauvegarde, par exemple sur un appareil neuf ou vide.
>
> En cas de doute : choisissez **Fusionner sans effacer**.

### Image ChatGPT — Fusion vs Remplacer (IMAGE 4)

**Prompt :**
```
Infographie comparatif deux colonnes. Colonne gauche fond vert clair : « Fusionner sans effacer » avec icône + et coche, texte « Recommandé · Ajoute sans effacer ». Colonne droite fond rouge très pâle : « Effacer et remplacer » avec icône attention, texte « Risqué · Tout remplace ». Style flat, 16:9, français, sans logo.
```

### Notes tournage
- Faire une démo avec un petit fichier test si possible (classes fictives).
- Insister visuellement sur le badge « Recommandé » vs « Risqué ».

---

## PARTIE 4 — Passer de GitHub à outilseps.fr

### À l’écran (capture écran)
1. Ancienne adresse GitHub (bannière « Cette adresse n’est plus mise à jour »).
2. Page **passer-sur-outilseps.html** (Guide pas à pas).
3. Onglet **J’ai des données sur l’ancienne adresse**.
4. Export depuis GitHub → Import sur outilseps.fr.
5. Installation PWA (icône verte).

### Texte à lire

> Beaucoup d’entre vous ont commencé sur l’**ancienne adresse GitHub** : `clemp-app.github.io/outilsEPS`, avec l’icône **bleue**.
>
> Le site officiel est maintenant **outilseps.fr**, avec l’icône **verte**. C’est là que arrivent les mises à jour et les nouveautés.
>
> **Point crucial** : vos données **ne basculent pas toutes seules**. L’ancienne adresse et outilseps.fr stockent les données **séparément**, même sur le même téléphone.
>
> Voici la procédure, une seule fois.
>
> **Étape 1 — Sur l’ancienne adresse GitHub**
> Ouvrez l’ancienne version. Si un bandeau s’affiche, cliquez sur **Guide pas à pas**, ou allez sur la page « Passer sur outilseps.fr ».
> Dans l’onglet **J’ai des données sur l’ancienne adresse**, cliquez sur **Exporter ma sauvegarde**.
> Vous obtenez le même type de fichier : `outilsEPS-backup.json`. **Conservez-le.**
>
> **Étape 2 — Sur outilseps.fr**
> Installez d’abord l’application web depuis **outilseps.fr** — c’est l’icône **verte**.
> - Sur **iPhone/iPad** : Safari → outilseps.fr → Partager → Sur l’écran d’accueil.
> - Sur **Android** : Chrome → outilseps.fr → Menu → Installer l’application.
>
> **Étape 3 — Importer**
> Ouvrez l’icône **verte**, menu **Sauvegarde**, **Importer un fichier**, sélectionnez le fichier exporté à l’étape 1.
> Si l’appareil outilseps.fr est neuf ou vide, vous pouvez **fusionner** ou **remplacer** ; sur un appareil vierge, les deux donnent le même résultat.
>
> Vous pouvez ensuite **supprimer l’ancienne icône bleue** de votre écran d’accueil. Gardez uniquement la **verte**.

### Image ChatGPT — Migration GitHub → outilseps.fr (IMAGE 5)

**Prompt :**
```
Schéma migration en 3 étapes, style flat design 16:9. Étape 1 : icône app bleue + texte « GitHub (ancien) » + flèche « Exporter » vers fichier JSON. Étape 2 : icône app verte + texte « outilseps.fr (officiel) » + texte « Installer l'app ». Étape 3 : flèche « Importer » du fichier vers icône verte. Flèche large entre bleu et vert. Texte discret « Vos données ne migrent pas seules ». Pas de logo GitHub officiel, icônes génériques.
```

### Image ChatGPT — Bleu vs Vert (IMAGE 6)

**Prompt :**
```
Comparaison visuelle deux icônes d'application côte à côte sur écran d'accueil smartphone. Gauche : icône bleue arrondie « Ancienne version ». Droite : icône verte arrondie « outilseps.fr officiel ». Flèche « Remplacer par ». Style réaliste mais simplifié, 16:9, tutoriel français.
```

### Notes tournage
- Montrer la bannière permanente sur GitHub Pages.
- Montrer le schéma déjà présent dans `assets/migration/export-import.png` si disponible à l’écran.

---

## PARTIE 5 — Transférer d’un appareil à un autre (via fichier)

### À l’écran (capture écran)
1. **Appareil A** (ex. ordinateur) : Export.
2. Transfert du fichier (AirDrop, e-mail, Drive, câble USB…).
3. **Appareil B** (ex. tablette) : Import → Fusionner.

### Texte à lire

> Passons au cas le plus courant après la migration : vous travaillez sur un **ordinateur** et vous voulez retrouver vos classes sur une **tablette**, ou l’inverse.
>
> La méthode la plus simple et la plus fiable reste le **fichier de sauvegarde**.
>
> **Sur l’appareil source** — celui qui a les bonnes données — ouvrez Sauvegarde et **exportez**.
>
> **Transférez le fichier** vers l’autre appareil. Plusieurs possibilités :
> - e-mail à vous-même ;
> - Google Drive, OneDrive, iCloud ;
> - AirDrop entre Apple ;
> - clé USB via l’ordinateur ;
> - messagerie interne de l’établissement.
>
> **Sur l’appareil de destination**, ouvrez outilseps.fr — de préférence l’**icône verte installée** — puis Sauvegarde, **Importer**, et choisissez **Fusionner sans effacer** si l’appareil a déjà des données, ou **Remplacer** s’il est vide.
>
> Cette méthode fonctionne **hors synchronisation QR**, **sans compte**, et vous gardez une **copie archive** du fichier au passage.

### Image ChatGPT — Transfert fichier (IMAGE 7)

**Prompt :**
```
Schéma : à gauche un ordinateur portable, à droite une tablette. Entre les deux, un fichier JSON stylisé passant par trois nuages discrets (e-mail, drive, AirDrop). Flèches « Exporter » à gauche, « Importer » à droite. Style flat, vert et bleu marine, 16:9, texte français minimal.
```

---

## PARTIE 6 — Synchroniser deux appareils (QR)

### À l’écran (capture écran)
1. **Deux appareils** côte à côte (ou split screen simulé).
2. Appareil A : Sauvegarde → **Synchroniser deux appareils**.
3. QR code affiché sur A.
4. Appareil B : Scanner le QR (caméra arrière).
5. Phase 2 : Analyse et fusion — statistiques.
6. Résolution conflits si présents.
7. **Synchroniser maintenant** des deux côtés.
8. Message « Synchronisation réussie ».

### Texte à lire

> Parfois, vous voulez aligner **deux appareils** sans manipuler de fichier — par exemple votre téléphone et votre tablette du même jour.
>
> Outils EPS propose la **synchronisation par QR code**. Elle est disponible sur **outilseps.fr** — pas sur l’ancienne adresse GitHub.
>
> **Prérequis :** connexion **internet** sur les deux appareils, et les deux doivent ouvrir la page **Sauvegarde**.
>
> **Étape 1 — Associer les appareils**
> Sur le **premier appareil**, cliquez **Synchroniser deux appareils**. Un **QR code** apparaît, avec un compte à rebours — la session dure environ **dix minutes**.
>
> Sur le **second appareil**, cliquez aussi **Synchroniser deux appareils**, puis **Scanner avec la caméra arrière** et scannez le QR du premier.
>
> Les deux appareils sont maintenant associés.
>
> **Étape 2 — Analyse et fusion**
> Chaque appareil envoie **temporairement** sa sauvegarde au serveur sécurisé **outilseps.fr** hébergé chez OVH — **uniquement le temps** de comparer et fusionner. Les données sont **supprimées du serveur** à la fin.
>
> Vous voyez combien d’éléments sont uniquement sur chaque appareil, et s’il y a des **différences à trancher**.
>
> En cas de conflit — la même donnée modifiée différemment — choisissez pour chaque ligne : garder la version de **cet appareil**, de **l’autre**, ou **les deux** (copie).
>
> Quand c’est prêt, cliquez **Synchroniser maintenant** sur **les deux appareils**. À la fin, les deux ont **exactement les mêmes données**.
>
> **Confidentialité :** le QR contient un jeton secret. Sans scan physique, personne d’autre ne peut rejoindre la session. Utilisez cette fonction avec **vos propres appareils** et une connexion de confiance.
>
> **Limites à connaître :**
> - Internet obligatoire pendant toute l’opération.
> - Ce n’est **pas** une synchro automatique en continu : c’est un **alignement ponctuel**.
> - Les réponses élèves remontées par QR se gèrent dans **Réception QR**, pas ici.

### Image ChatGPT — Sync QR (IMAGE 8)

**Prompt :**
```
Illustration : deux smartphones face à face. Celui de gauche affiche un QR code. Celui de droite montre une caméra qui scanne. Entre eux, une flèche bidirectionnelle passant par un serveur stylisé avec cadenas et texte « Temporaire · OVH ». Compte à rebours « 10 min » discret. Style flat, vert #16a34a, 16:9, tutoriel français.
```

### Image ChatGPT — Conflits sync (IMAGE 9)

**Prompt :**
```
Interface générique de tableau comparatif : deux colonnes « Cet appareil » et « Autre appareil », une ligne avec données différentes surlignées en orange, menu déroulant avec options « Garder ici », « Garder ailleurs », « Garder les deux ». Style UI flat moderne, pas de vraie marque, 16:9, français.
```

### Notes tournage
- Idéal : enregistrer avec deux vrais appareils.
- Montrer le compte à rebours et la barre de progression.
- Montrer le bloc RGPD repliable si question de confidentialité en commentaires.

---

## PARTIE 7 — Bonnes pratiques et erreurs à éviter

### À l’écran
- Montage rapide : icônes + texte à l’écran (images ou slides).
- Option : section « Libérer de l’espace » (accordéon avancé) en 10 secondes.

### Texte à lire

> Quelques réflexes pour éviter les mauvaises surprises.
>
> **Un seul mode d’ouverture.** Si vous avez installé l’app, ouvrez **toujours** la même icône — la **verte** sur outilseps.fr. Mélanger navigateur, ancienne icône bleue et nouvelle icône verte, c’est le meilleur moyen de croire avoir « perdu » ses données.
>
> **Exportez avant de supprimer.** Avant de vider le cache, désinstaller l’app ou changer de téléphone : **exportez**.
>
> **Deux copies minimum** du fichier JSON : cloud + local.
>
> **Fusionner par défaut**, remplacer seulement si vous êtes sûr.
>
> **La synchronisation QR** sert à un alignement ponctuel, pas à remplacer l’export régulier.
>
> **Espace de stockage :** dans Sauvegarde, section avancée, vous pouvez voir l’espace utilisé et supprimer des données obsolètes — **après** avoir exporté.
>
> **Réception QR ≠ Sauvegarde :** les données envoyées par les élèves via QR se retrouvent dans **Réception QR**, pas dans l’export global automatiquement de la même façon — pensez-y si vous gérez beaucoup de retours élèves.

### Image ChatGPT — Checklist (IMAGE 10)

**Prompt :**
```
Checklist visuelle flat design, 6 cases cochées vertes : « Toujours l'icône verte », « Exporter régulièrement », « Deux copies du fichier », « Fusionner par défaut », « Export avant changement d'appareil », « Sync QR = ponctuel ». Fond clair, 16:9, typographie lisible française.
```

---

## PARTIE 8 — Conclusion

### Texte à lire

> Voilà, vous savez maintenant **exporter**, **importer**, **migrer vers outilseps.fr**, **transférer un fichier** entre appareils, et **synchroniser** deux appareils avec le QR.
>
> Le réflexe le plus important reste simple : **exportez régulièrement**. Deux minutes, et vous êtes tranquille pour toute l’année.
>
> La page **Sauvegarde** et la **FAQ** sur outilseps.fr reprennent ces étapes. Merci de votre confiance, et bon cours d’EPS !

### Image ChatGPT — Outro (IMAGE 11)

**Prompt :**
```
Illustration positive : professeur EPS souriant avec tablette, icône disquette verte et coche. Texte « Vos données, sous contrôle ». Style flat, vert #16a34a, 16:9, chaleureux, pas de logo de marque.
```

---

## Récapitulatif — 12 images à générer (ChatGPT)

| ID | Titre court | Usage |
|----|-------------|-------|
| IMAGE 0 | Intro Sauvegarder Transférer Sync | Miniature + intro |
| IMAGE 1 | 3 actions Export Import Sync | Partie 1 |
| IMAGE 2 | Données sur l'appareil | Partie 1 |
| IMAGE 3 | Export → fichier → cloud/USB/mail | Partie 2 |
| IMAGE 4 | Fusionner vs Remplacer | Partie 3 |
| IMAGE 5 | Migration GitHub → outilseps.fr | Partie 4 |
| IMAGE 6 | Icône bleue vs verte | Partie 4 |
| IMAGE 7 | Transfert ordi → tablette | Partie 5 |
| IMAGE 8 | Sync QR deux téléphones | Partie 6 |
| IMAGE 9 | Résolution conflits | Partie 6 |
| IMAGE 10 | Checklist bonnes pratiques | Partie 7 |
| IMAGE 11 | Outro | Conclusion |

**Conseil ChatGPT :** demander format **1792×1024** ou **16:9**, style cohérent sur toute la série (« reprendre le même style que l’image précédente »).

---

## Liste de plans capture écran (B-roll)

| Plan | Page / action |
|------|----------------|
| B1 | Accueil outilseps.fr — menu ☰ ouvert |
| B2 | Page sauvegarde.html — vue d’ensemble |
| B3 | Clic Exporter + téléchargement fichier |
| B4 | Explorateur : fichier outilsEPS-backup.json |
| B5 | Import → choix fichier → prévisualisation |
| B6 | Clic Fusionner sans effacer → message succès |
| B7 | GitHub : bannière migration |
| B8 | passer-sur-outilseps.html — onglet données |
| B9 | Export depuis page migration |
| B10 | Install PWA iPhone (Safari Partager) — si possible |
| B11 | Install PWA Android (Chrome) — si possible |
| B12 | Import sur outilseps.fr après migration |
| B13 | Sync : QR affiché appareil A |
| B14 | Sync : scan appareil B |
| B15 | Sync : analyse + conflits |
| B16 | Sync : succès des deux côtés |
| B17 | Accordéon stockage avancé (optionnel) |

---

## Description YouTube (à coller)

```
🎓 Sauvegarde, transfert et synchronisation — Outils EPS

Vos classes et réglages restent sur votre appareil : apprenez à les protéger et à les déplacer.

⏱ Chapitres
0:00 Introduction
1:00 Comprendre en 30 secondes
2:30 Exporter une sauvegarde
4:30 Importer (fusionner ou remplacer)
7:00 GitHub → outilseps.fr
10:00 Transfert d’un appareil à l’autre
12:00 Synchronisation QR (2 appareils)
15:00 Bonnes pratiques
16:30 Conclusion

🔗 Liens
Site officiel : https://outilseps.fr
Sauvegarde : https://outilseps.fr/outils/sauvegarde.html
Guide migration : https://outilseps.fr/passer-sur-outilseps.html
FAQ : https://outilseps.fr/faq.html

#OutilsEPS #EPS #Enseignant #Sauvegarde #PWA
```

---

## Checklist avant publication

- [ ] Tournage sur **outilseps.fr** (icône verte), pas seulement GitHub
- [ ] Nom de fichier **`outilsEPS-backup.json`** prononcé et montré
- [ ] Différence **fusion / remplacer** clarifiée
- [ ] Migration **GitHub → outilseps.fr** montrée
- [ ] Sync QR avec **deux appareils** (ou simulation claire)
- [ ] Mention **10 min** session sync + **suppression serveur**
- [ ] Distinction **Sauvegarde** vs **Réception QR**
- [ ] 12 images ChatGPT générées, style cohérent
- [ ] Chapitres YouTube renseignés
- [ ] Sous-titres auto relus (fusionner, outilseps.fr, JSON…)

---

## Script téléprompter — version continue (lecture fluide)

*(Regrouper les parties sans titres pour enregistrement audio d’un bloc)*

Bonjour et bienvenue dans ce tutoriel Outils EPS. Aujourd’hui, on parle de sauvegarde, de transfert et de synchronisation de vos données : classes, élèves, notes, championnats, réglages… Outils EPS ne fonctionne pas comme un compte en ligne : vos données restent sur votre appareil. C’est pratique et respectueux de la confidentialité, mais si vous changez d’appareil, videz le cache ou supprimez l’application, vos données ne suivent pas toutes seules. Je vous montre comment ne rien perdre, passer de GitHub à outilseps.fr, transférer d’un appareil à l’autre, et synchroniser deux appareils.

Le principe en trente secondes : Outils EPS enregistre tout localement, sans compte, sans envoi automatique sur internet. Exporter, c’est télécharger une copie JSON. Importer, c’est restaurer ou fusionner un fichier. Synchroniser, c’est aligner deux appareils avec internet le temps du transfert. Exportez régulièrement : c’est votre assurance vie.

Sur outilseps.fr, menu, Sauvegarde, Exporter une sauvegarde. Vous obtenez outilsEPS-backup.json avec toutes vos données. Gardez-le sur cloud et clé USB ou e-mail. Exportez en fin de journée, chaque semaine en période active, et avant tout changement d’appareil.

Pour importer : Sauvegarde, Importer un fichier. Fusionner sans effacer est recommandé : on ajoute sans supprimer. Effacer et remplacer est risqué : réservé à une restauration complète sur appareil vide ou neuf.

Pour quitter GitHub : exportez sur l’ancienne adresse bleue, installez l’app verte sur outilseps.fr, importez le fichier. Les données ne migrent pas seules. Supprimez l’ancienne icône bleue.

Entre deux appareils : export sur le source, transférez le JSON par mail ou Drive ou AirDrop, import sur la destination avec fusion si besoin.

Synchronisation QR sur outilseps.fr : ouvrez Sauvegarde sur les deux appareils, QR sur le premier, scan sur le second, analyse, tranchez les conflits, Synchroniser maintenant des deux côtés. Session d’environ dix minutes, données temporaires sur le serveur OVH puis supprimées. Ce n’est pas une synchro automatique permanente.

En résumé : une seule icône verte, exportez souvent, fusionnez par défaut, sync QR en complément. Merci et bon cours d’EPS !

---

*Document généré pour la production vidéo Outils EPS — sauvegarde et transfert.*
