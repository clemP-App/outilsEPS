<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();
sync_require_post();

try {
    $body = sync_read_json_body();
    $sessionId = sync_validate_session_id($body['sessionId'] ?? null);
    $tokenHash = sync_validate_token_hash($body['tokenHash'] ?? null);
    $now = sync_now_utc();

    $pdo = sync_pdo();
    $pdo->beginTransaction();
    sync_cleanup_expired($pdo);

    $row = sync_fetch_session($pdo, $sessionId, $tokenHash, true);

    $stmt = $pdo->prepare(
        'UPDATE backup_sync_sessions
         SET b_joined = 1, updated_at = :updated_at
         WHERE id = :id'
    );
    $stmt->execute([
        'updated_at' => $now,
        'id' => $sessionId,
    ]);

    $pdo->commit();

    sync_json_success([
        'expiresAt' => gmdate('c', strtotime($row['expires_at'] . ' UTC')),
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (http_response_code() === 200) {
        sync_json_error('Association impossible.', 500);
    }
}
