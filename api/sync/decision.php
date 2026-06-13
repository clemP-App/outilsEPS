<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

sync_handle_cors();
sync_require_post();

try {
    $body = sync_read_json_body();
    $sessionId = sync_validate_session_id($body['sessionId'] ?? null);
    $tokenHash = sync_validate_token_hash($body['tokenHash'] ?? null);
    $decision = $body['decision'] ?? [];
    if (!is_array($decision)) {
        sync_json_error('Décision invalide.', 400);
    }

    $decisionJson = sync_encode_json_field($decision);
    $now = sync_now_utc();

    $pdo = sync_pdo();
    $pdo->beginTransaction();
    sync_cleanup_expired($pdo);
    $row = sync_fetch_session($pdo, $sessionId, $tokenHash, true);

    if (!(int) $row['a_uploaded'] || !(int) $row['b_uploaded']) {
        sync_json_error('Les deux sauvegardes ne sont pas encore disponibles.', 409);
    }

    $stmt = $pdo->prepare(
        'UPDATE backup_sync_sessions
         SET decision_json = :decision_json, updated_at = :updated_at
         WHERE id = :id'
    );
    $stmt->execute([
        'decision_json' => $decisionJson,
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
        sync_json_error('Enregistrement impossible.', 500);
    }
}
