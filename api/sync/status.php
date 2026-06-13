<?php
/**
 * Test minimal : si cette page répond, le dossier api/sync/ est au bon endroit.
 * URL : https://outilseps.fr/api/sync/status.php
 */
header('Content-Type: text/plain; charset=utf-8');
echo "api/sync OK\n";
echo "config.php : " . (is_readable(__DIR__ . '/config.php') ? "present" : "absent") . "\n";
echo "create.php : " . (is_readable(__DIR__ . '/create.php') ? "present" : "absent") . "\n";
