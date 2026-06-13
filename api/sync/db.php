<?php
/**
 * Connexion PDO et fonctions communes — API sync Outils EPS.
 */
declare(strict_types=1);

function sync_load_config(): array
{
    $path = __DIR__ . '/config.php';
    if (!is_readable($path)) {
        throw new RuntimeException('Configuration sync introuvable.');
    }
    /** @var array $config */
    $config = require $path;
    return $config;
}

function sync_assert_config_ready(): void
{
    $config = sync_load_config();
    $user = trim((string) ($config['db_user'] ?? ''));
    $pass = (string) ($config['db_pass'] ?? '');
    $name = trim((string) ($config['db_name'] ?? ''));
    if ($user === '' || $user === 'A_REMPLACER' || $pass === '' || $pass === 'A_REMPLACER' || $name === '') {
        sync_json_error('API sync non configurée sur le serveur (config.php).', 503);
    }
}

function sync_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    sync_assert_config_ready();
    $config = sync_load_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function sync_max_payload_bytes(): int
{
    $config = sync_load_config();
    return (int) ($config['max_payload_bytes'] ?? 8388608);
}

function sync_handle_cors(): void
{
    $config = sync_load_config();
    $allowed = $config['allowed_origins'] ?? [];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Content-Type: application/json; charset=utf-8');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function sync_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        sync_json_error('Corps JSON invalide.', 400);
    }
    return $data;
}

function sync_json_success(array $data = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sync_json_error(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sync_require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        sync_json_error('Méthode non autorisée.', 405);
    }
}

function sync_now_utc(): string
{
    return gmdate('Y-m-d H:i:s');
}

function sync_cleanup_expired(PDO $pdo): void
{
    $stmt = $pdo->prepare('DELETE FROM backup_sync_sessions WHERE expires_at < :now');
    $stmt->execute(['now' => sync_now_utc()]);
}

function sync_validate_token_hash(?string $tokenHash): string
{
    $tokenHash = trim((string) $tokenHash);
    if (!preg_match('/^[a-f0-9]{64}$/i', $tokenHash)) {
        sync_json_error('Jeton invalide.', 400);
    }
    return strtolower($tokenHash);
}

function sync_validate_session_id(?string $sessionId): string
{
    $sessionId = trim((string) $sessionId);
    if (!preg_match('/^[A-Za-z0-9_-]{16,64}$/', $sessionId)) {
        sync_json_error('Session invalide.', 400);
    }
    return $sessionId;
}

function sync_validate_device(?string $device): string
{
    $device = strtolower(trim((string) $device));
    if ($device !== 'a' && $device !== 'b') {
        sync_json_error('Appareil invalide.', 400);
    }
    return $device;
}

function sync_random_session_id(): string
{
    return rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
}

function sync_fetch_session(PDO $pdo, string $sessionId, string $tokenHash, bool $forUpdate = false): array
{
    $sql = 'SELECT * FROM backup_sync_sessions WHERE id = :id AND token_hash = :token_hash AND expires_at > :now';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id' => $sessionId,
        'token_hash' => $tokenHash,
        'now' => sync_now_utc(),
    ]);
    $row = $stmt->fetch();
    if (!$row) {
        sync_json_error('Session introuvable ou expirée.', 404);
    }
    return $row;
}

function sync_decode_json_field(?string $value)
{
    if ($value === null || $value === '') {
        return null;
    }
    $decoded = json_decode($value, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    return $decoded;
}

function sync_encode_json_field($value): ?string
{
    if ($value === null) {
        return null;
    }
    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        sync_json_error('JSON invalide.', 400);
    }
    return $encoded;
}

function sync_session_response(array $row): array
{
    return [
        'id' => $row['id'],
        'expires_at' => gmdate('c', strtotime($row['expires_at'] . ' UTC')),
        'b_joined' => (bool) ((int) $row['b_joined']),
        'a_uploaded' => (bool) ((int) $row['a_uploaded']),
        'b_uploaded' => (bool) ((int) $row['b_uploaded']),
        'a_payload' => sync_decode_json_field($row['a_payload'] ?? null),
        'b_payload' => sync_decode_json_field($row['b_payload'] ?? null),
        'decision' => sync_decode_json_field($row['decision_json'] ?? null),
    ];
}

function sync_validate_expires_at(?string $expiresAt): string
{
    $expiresAt = trim((string) $expiresAt);
    if ($expiresAt === '') {
        sync_json_error('Expiration invalide.', 400);
    }

    $ts = strtotime($expiresAt);
    if ($ts === false) {
        sync_json_error('Expiration invalide.', 400);
    }

    $now = time();
    $max = $now + (15 * 60);
    if ($ts <= $now || $ts > $max) {
        sync_json_error('Expiration invalide.', 400);
    }

    return gmdate('Y-m-d H:i:s', $ts);
}

function sync_payload_too_large($payload): bool
{
    $encoded = sync_encode_json_field($payload);
    return $encoded !== null && strlen($encoded) > sync_max_payload_bytes();
}
