<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();
sync_require_post();

try {
    $body = sync_read_json_body();
    $sessionId = sync_validate_session_id($body['sessionId'] ?? null);
    $tokenHash = sync_validate_token_hash($body['tokenHash'] ?? null);
    $device = sync_validate_device($body['device'] ?? null);
    $now = sync_now_utc();

    $pdo = sync_pdo();
    $pdo->beginTransaction();
    sync_cleanup_expired($pdo);

    $stmt = $pdo->prepare(
        'SELECT * FROM backup_sync_sessions
         WHERE id = :id AND token_hash = :token_hash AND expires_at > :now
         FOR UPDATE'
    );
    $stmt->execute([
        'id' => $sessionId,
        'token_hash' => $tokenHash,
        'now' => $now,
    ]);
    $row = $stmt->fetch();
    if (!$row) {
        $pdo->commit();
        sync_json_success(['success' => true, 'deleted' => true]);
    }

    $applied = (int) $row['applied'];
    if ($device === 'a') {
        $applied |= 1;
    } else {
        $applied |= 2;
    }

    if ($applied >= 3) {
        $del = $pdo->prepare('DELETE FROM backup_sync_sessions WHERE id = :id');
        $del->execute(['id' => $sessionId]);
        $pdo->commit();
        sync_json_success(['success' => true, 'deleted' => true]);
    }

    $upd = $pdo->prepare(
        'UPDATE backup_sync_sessions
         SET applied = :applied, updated_at = :updated_at
         WHERE id = :id'
    );
    $upd->execute([
        'applied' => $applied,
        'updated_at' => $now,
        'id' => $sessionId,
    ]);

    $pdo->commit();
    sync_json_success(['success' => true, 'deleted' => false]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (http_response_code() === 200) {
        sync_json_error('Marquage impossible.', 500);
    }
}
