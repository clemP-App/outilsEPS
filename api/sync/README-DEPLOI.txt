DÉPLOIEMENT OVH — dossier api/sync/
====================================

1. Dans FileZilla, connectez-vous en SFTP à outilseps.fr.

2. Ouvrez le dossier RACINE DU SITE WEB :
   - souvent nommé "www" ou "public_html"
   - c'est le dossier où se trouve déjà index.html

3. Créez (ou vérifiez) cette arborescence :

   www/
     index.html          (déjà présent)
     api/
       sync/
         config.php
         db.php
         create.php
         join.php
         upload.php
         session.php
         decision.php
         mark-applied.php
         cleanup.php
         ping.php
         diag.php
         status.php
         schema.sql
         .htaccess

4. Test dans le navigateur :
   https://outilseps.fr/api/sync/status.php
   → doit afficher "api/sync OK"

5. Puis :
   https://outilseps.fr/api/sync/diag.php
   → doit afficher du JSON avec "ok": true

IMPORTANT : n'uploadez PAS api/sync/ dans outils/ ni dans un sous-dossier.
L'URL doit être exactement : outilseps.fr/api/sync/...
