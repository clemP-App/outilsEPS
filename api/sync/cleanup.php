<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();
sync_require_post();

try {
    $body = sync_read_json_body();
    $sessionId = isset($body['sessionId']) ? sync_validate_session_id($body['sessionId']) : null;
    $tokenHash = isset($body['tokenHash']) ? sync_validate_token_hash($body['tokenHash']) : null;

    $pdo = sync_pdo();
    $pdo->beginTransaction();
    sync_cleanup_expired($pdo);

    if ($sessionId && $tokenHash) {
        $stmt = $pdo->prepare(
            'DELETE FROM backup_sync_sessions WHERE id = :id AND token_hash = :token_hash'
        );
        $stmt->execute([
            'id' => $sessionId,
            'token_hash' => $tokenHash,
        ]);
    }

    $pdo->commit();
    sync_json_success(['success' => true]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (http_response_code() === 200) {
        sync_json_error('Nettoyage impossible.', 500);
    }
}
