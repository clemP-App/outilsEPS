<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();
sync_require_post();

try {
    $body = sync_read_json_body();
    $sessionId = sync_validate_session_id($body['sessionId'] ?? null);
    $tokenHash = sync_validate_token_hash($body['tokenHash'] ?? null);

    $pdo = sync_pdo();
    sync_cleanup_expired($pdo);
    $row = sync_fetch_session($pdo, $sessionId, $tokenHash, false);

    sync_json_success(sync_session_response($row));
} catch (Throwable $e) {
    if (http_response_code() === 200) {
        sync_json_error('Lecture impossible.', 500);
    }
}
