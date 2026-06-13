<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();
sync_require_post();

try {
    $body = sync_read_json_body();
    $tokenHash = sync_validate_token_hash($body['tokenHash'] ?? null);
    $expiresAt = sync_validate_expires_at($body['expiresAt'] ?? null);
    $now = sync_now_utc();

    $pdo = sync_pdo();
    $pdo->beginTransaction();
    sync_cleanup_expired($pdo);

    $sessionId = sync_random_session_id();
    $stmt = $pdo->prepare(
        'INSERT INTO backup_sync_sessions
            (id, token_hash, created_at, expires_at, updated_at)
         VALUES
            (:id, :token_hash, :created_at, :expires_at, :updated_at)'
    );
    $stmt->execute([
        'id' => $sessionId,
        'token_hash' => $tokenHash,
        'created_at' => $now,
        'expires_at' => $expiresAt,
        'updated_at' => $now,
    ]);

    $pdo->commit();

    sync_json_success([
        'sessionId' => $sessionId,
        'expiresAt' => gmdate('c', strtotime($expiresAt . ' UTC')),
    ]);
} catch (RuntimeException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sync_json_error($e->getMessage(), 503);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sync_json_error('Création impossible (vérifiez la base MySQL et schema.sql).', 500);
}
