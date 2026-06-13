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
    $payload = $body['payload'] ?? null;
    $payloadHash = trim((string) ($body['payloadHash'] ?? ''));

    if ($payload === null || $payloadHash === '' || strlen($payloadHash) < 32) {
        sync_json_error('Sauvegarde invalide.', 400);
    }
    if (sync_payload_too_large($payload)) {
        sync_json_error('Sauvegarde trop volumineuse.', 413);
    }

    $payloadJson = sync_encode_json_field($payload);
    $now = sync_now_utc();

    $pdo = sync_pdo();
    $pdo->beginTransaction();
    sync_cleanup_expired($pdo);
    sync_fetch_session($pdo, $sessionId, $tokenHash, true);

    if ($device === 'a') {
        $stmt = $pdo->prepare(
            'UPDATE backup_sync_sessions
             SET a_payload = :payload,
                 a_payload_hash = :payload_hash,
                 a_uploaded = 1,
                 updated_at = :updated_at
             WHERE id = :id'
        );
    } else {
        $stmt = $pdo->prepare(
            'UPDATE backup_sync_sessions
             SET b_payload = :payload,
                 b_payload_hash = :payload_hash,
                 b_uploaded = 1,
                 b_joined = 1,
                 updated_at = :updated_at
             WHERE id = :id'
        );
    }

    $stmt->execute([
        'payload' => $payloadJson,
        'payload_hash' => $payloadHash,
        'updated_at' => $now,
        'id' => $sessionId,
    ]);

    $pdo->commit();
    sync_json_success(['success' => true]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (http_response_code() === 200) {
        sync_json_error('Envoi impossible.', 500);
    }
}
