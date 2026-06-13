# Déploiement de la synchronisation OVH (PHP + MySQL)

Guide pas à pas pour activer la synchronisation entre deux appareils sur **outilseps.fr**, sans Supabase.

---

## Vue d’ensemble

| Composant | Rôle |
|-----------|------|
| `shared/backup-sync-ovh.js` | Client navigateur (même API que l’ancien adaptateur Supabase) |
| `api/sync/*.php` | API REST sur votre hébergement OVH |
| Base MySQL `backup_sync_sessions` | Stockage temporaire des sauvegardes (10 min max) |

Les données ne transitent que le temps de la synchronisation, protégées par un jeton secret dans le QR code.

---

## Étape 1 — Créer la base MySQL chez OVH

1. Connectez-vous à [l’espace client OVH](https://www.ovh.com/manager/).
2. Allez dans **Hébergements** → votre hébergement → **Bases de données**.
3. Cliquez sur **Créer une base de données** (si besoin).
4. Notez :
   - **Nom de la base** (ex. `outilseps_sync`)
   - **Utilisateur** MySQL
   - **Mot de passe**
   - **Serveur** (souvent `nombase.mysql.db` ou `localhost` depuis le serveur web)

---

## Étape 2 — Créer la table

1. Ouvrez **phpMyAdmin** depuis le manager OVH.
2. Sélectionnez votre base `outilseps_sync`.
3. Onglet **SQL**.
4. Collez le contenu de `api/sync/schema.sql` et exécutez.

Vous devez voir la table `backup_sync_sessions`.

---

## Étape 3 — Configurer l’API PHP

1. Via **FileZilla**, connectez-vous en SFTP à votre hébergement.
2. Uploadez le dossier `api/sync/` à la racine du site :
   ```
   www/
     api/
       sync/
         create.php
         join.php
         ...
         config.php
   ```
3. Sur le serveur, éditez `api/sync/config.php` :
   ```php
   'db_host' => 'votreserveur.mysql.db',  // ou localhost
   'db_name' => 'outilseps_sync',
   'db_user' => 'votre_utilisateur',
   'db_pass' => 'votre_mot_de_passe',
   ```
4. **Ne partagez jamais** ce fichier publiquement. Le `.htaccess` bloque l’accès direct à `config.php`.

---

## Étape 4 — Uploader les fichiers du site

Uploadez aussi (ou mettez à jour) via FileZilla :

- `shared/backup-sync-ovh.js`
- `shared/backup-sync-core.js`
- `outils/sauvegarde.html` (scripts mis à jour)
- `app-version.js` et `precache-manifest.js` (version 132+)

Le dossier `api/sync/` doit être accessible à :
`https://outilseps.fr/api/sync/create.php`

---

## Étape 5 — Vérifier PHP et HTTPS

1. Votre site doit être en **HTTPS** (certificat SSL actif chez OVH).
2. PHP **7.4+** ou **8.x** est requis (standard sur mutualisé OVH).
3. Extension **PDO MySQL** activée (par défaut sur OVH).

Test rapide dans un terminal :
```bash
curl -X POST https://outilseps.fr/api/sync/create.php \
  -H "Content-Type: application/json" \
  -d "{\"tokenHash\":\"abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789\",\"expiresAt\":\"2099-01-01T00:00:00.000Z\"}"
```
→ Une réponse JSON avec `sessionId` (ou erreur d’expiration si date trop lointaine) confirme que l’API répond.

---

## Étape 6 — Tester dans l’application

1. Ouvrez `https://outilseps.fr/outils/sauvegarde.html` sur un **premier appareil**.
2. Cliquez sur **Synchroniser deux appareils**.
3. Un QR code doit s’afficher (session créée).
4. Sur un **second appareil**, ouvrez la même page et scannez le QR.
5. Les deux sauvegardes sont comparées, puis fusionnées.

En cas d’erreur, ouvrez les **Outils de développement** (F12) → onglet **Réseau** et vérifiez les appels vers `/api/sync/`.

---

## Étape 7 — Nettoyage automatique (recommandé)

Les sessions expirées sont supprimées à chaque appel API. Pour un nettoyage régulier supplémentaire, créez une tâche cron OVH :

- Fréquence : toutes les heures
- Commande :
  ```bash
  curl -s -X POST https://outilseps.fr/api/sync/cleanup.php -H "Content-Type: application/json" -d "{}"
  ```

---

## Sécurité

- Le **token brut** reste uniquement dans le QR code (navigateur). Seul le **hash SHA-256** est stocké en base.
- CORS limité à `https://outilseps.fr` et `https://www.outilseps.fr`.
- Taille max d’une sauvegarde : **8 Mo** (modifiable dans `config.php`).
- Sessions expirées au bout de **10 minutes**.
- Requêtes SQL via **PDO préparées**.

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `Synchronisation indisponible` | Vérifiez `config.php`, identifiants MySQL, table créée |
| Erreur CORS | L’origine doit être exactement `https://outilseps.fr` (pas `http://`) |
| `Sauvegarde trop volumineuse` | Exportez moins de données ou augmentez `max_payload_bytes` |
| 500 sur create.php | Consultez les logs PHP dans le manager OVH |
| Ça marche en local mais pas en prod | L’API n’existe que sur outilseps.fr, pas sur GitHub Pages |

---

## Fichiers modifiés dans le projet

```
shared/backup-sync-ovh.js     ← nouveau client
api/sync/                     ← API PHP complète
outils/sauvegarde.html        ← scripts + textes
```

L’ancien adaptateur Supabase (`shared/backup-sync.js`) reste dans le dépôt pour référence mais n’est plus chargé par `sauvegarde.html`.
