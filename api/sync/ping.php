<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit;
}

sync_json_success([
    'ok' => true,
    'service' => 'outilseps-sync',
]);
