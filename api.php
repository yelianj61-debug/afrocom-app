<?php
// ── RIVO — Proxy Supabase service_role ──────────────────────────────────────
// Toutes les requêtes sbAdmin passent ici. La clé service_role n'est JAMAIS
// exposée au navigateur.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Clés (server-side only) ──────────────────────────────────────────────────
define('SB_URL',     'https://qwdttzsbbspayojzeugy.supabase.co');
define('SB_SERVICE', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZHR0enNiYnNwYXlvanpldWd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MTQzNSwiZXhwIjoyMDk0NTQ3NDM1fQ.Qh-1b3NA4wH5Km4W1v-nU0aGagkeIByet2INxccz3tw');

// ── Firebase Cloud Messaging ─────────────────────────────────────────────────
define('FCM_PROJECT_ID', 'afrotv-b57a1');
define('FCM_SERVICE_ACCOUNT', file_get_contents(__DIR__ . '/fcm-service-account.json') ?: '{}');

// ── Helpers ──────────────────────────────────────────────────────────────────
function sbHeaders(): array {
    return [
        'Content-Type: application/json',
        'apikey: ' . SB_SERVICE,
        'Authorization: Bearer ' . SB_SERVICE,
        'Prefer: return=representation',
    ];
}

function sbRequest(string $method, string $path, ?array $body = null): array {
    $url = SB_URL . $path;
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_HTTPHEADER     => sbHeaders(),
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err) return ['error' => ['message' => 'Réseau: ' . $err]];
    $decoded = json_decode($raw, true);
    // Supabase retourne un tableau pour SELECT, un objet pour POST/PATCH, null pour DELETE
    if ($decoded === null && $raw !== '' && $raw !== 'null') {
        return ['error' => ['message' => 'Réponse invalide (' . $code . ')']];
    }
    // Erreur Supabase (code >= 400)
    if ($code >= 400) {
        $msg = is_array($decoded) ? ($decoded['message'] ?? $raw) : $raw;
        return ['error' => ['message' => $msg, 'code' => $decoded['code'] ?? $code]];
    }
    return ['data' => $decoded ?? null];
}

function buildQueryString(array $q): string {
    $parts = [];
    // Filtres
    foreach ($q['filters'] ?? [] as $f) {
        $op  = $f['op']  ?? 'eq';
        $col = $f['col'] ?? '';
        $val = $f['val'] ?? '';
        switch ($op) {
            case 'eq':
                $parts[] = urlencode($col) . '=eq.' . urlencode($val); break;
            case 'neq':
                $parts[] = urlencode($col) . '=neq.' . urlencode($val); break;
            case 'gt':
                $parts[] = urlencode($col) . '=gt.' . urlencode($val); break;
            case 'gte':
                $parts[] = urlencode($col) . '=gte.' . urlencode($val); break;
            case 'lt':
                $parts[] = urlencode($col) . '=lt.' . urlencode($val); break;
            case 'lte':
                $parts[] = urlencode($col) . '=lte.' . urlencode($val); break;
            case 'in':
                $list    = is_array($val) ? implode(',', $val) : $val;
                $parts[] = urlencode($col) . '=in.(' . urlencode($list) . ')'; break;
            case 'not_in':
                $list    = is_array($val) ? implode(',', $val) : $val;
                $parts[] = urlencode($col) . '=not.in.(' . urlencode($list) . ')'; break;
            case 'ilike':
                $parts[] = urlencode($col) . '=ilike.' . urlencode($val); break;
            case 'is':
                $parts[] = urlencode($col) . '=is.' . urlencode($val); break;
        }
    }
    // SELECT colonnes
    if (!empty($q['select']) && $q['select'] !== '*') {
        $parts[] = 'select=' . urlencode($q['select']);
    } else {
        $parts[] = 'select=*';
    }
    // ORDER
    if (!empty($q['order'])) {
        $dir     = ($q['order']['ascending'] ?? true) ? 'asc' : 'desc';
        $parts[] = 'order=' . urlencode($q['order']['col']) . '.' . $dir;
    }
    // LIMIT
    if (!empty($q['limit'])) {
        $parts[] = 'limit=' . intval($q['limit']);
    }
    return $parts ? '?' . implode('&', $parts) : '';
}

// ── Entrée ───────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => ['message' => 'Méthode non autorisée']]);
    exit;
}

$raw = file_get_contents('php://input');
$q   = json_decode($raw, true);
if (!$q || empty($q['type'])) {
    echo json_encode(['error' => ['message' => 'Payload invalide']]);
    exit;
}

// ── RPC ──────────────────────────────────────────────────────────────────────
if ($q['type'] === 'rpc') {
    $fn     = preg_replace('/[^a-zA-Z0-9_]/', '', $q['fn'] ?? '');
    $params = $q['params'] ?? [];
    $result = sbRequest('POST', '/rest/v1/rpc/' . $fn, $params);
    echo json_encode($result);
    exit;
}

// ── QUERY (SELECT / INSERT / UPDATE / DELETE) ─────────────────────────────────
if ($q['type'] === 'query') {
    $table  = preg_replace('/[^a-zA-Z0-9_]/', '', $q['table'] ?? '');
    $action = $q['action'] ?? 'select';
    $single = !empty($q['single']);

    $headers = sbHeaders();
    if ($single) {
        $headers[] = 'Accept: application/vnd.pgrst.object+json';
    }

    switch ($action) {
        case 'select':
            $qs     = buildQueryString($q);
            $result = sbRequest('GET', '/rest/v1/' . $table . $qs, null);
            if ($single && isset($result['data']) && is_array($result['data']) && !empty($result['data'])) {
                $result['data'] = $result['data'][0];
            }
            break;

        case 'insert':
            // Préférer objet unique retourné
            $data   = $q['data'] ?? [];
            $path   = '/rest/v1/' . $table;
            $result = sbRequest('POST', $path, $data);
            if ($single && isset($result['data']) && is_array($result['data'])) {
                $result['data'] = $result['data'][0] ?? $result['data'];
            }
            break;

        case 'update':
            $data = $q['data'] ?? [];
            $qs   = buildQueryString($q);
            $result = sbRequest('PATCH', '/rest/v1/' . $table . $qs, $data);
            if ($single && isset($result['data']) && is_array($result['data'])) {
                $result['data'] = $result['data'][0] ?? $result['data'];
            }
            break;

        case 'delete':
            $qs     = buildQueryString($q);
            $result = sbRequest('DELETE', '/rest/v1/' . $table . $qs, null);
            break;

        default:
            $result = ['error' => ['message' => 'Action inconnue']];
    }

    echo json_encode($result);
    exit;
}


// ── FCM helpers ───────────────────────────────────────────────────────────────
function fcmB64u(string $d): string {
    return rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
}
function fcmAccessToken(): ?string {
    $sa = json_decode(FCM_SERVICE_ACCOUNT, true);
    if (empty($sa['private_key'])) return null;
    $now = time();
    $h = fcmB64u(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $p = fcmB64u(json_encode([
        'iss'   => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600,
    ]));
    openssl_sign("$h.$p", $sig, $sa['private_key'], 'sha256WithRSAEncryption');
    $jwt = "$h.$p." . fcmB64u($sig);
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt])]);
    $resp = json_decode(curl_exec($ch), true); curl_close($ch);
    return $resp['access_token'] ?? null;
}
function fcmSendOne(string $token, string $title, string $body, string $url = ''): array {
    $at = fcmAccessToken();
    if (!$at) return ['error' => 'service_account_not_configured'];
    $msg = ['token' => $token, 'notification' => ['title' => $title, 'body' => $body],
        'webpush' => ['notification' => ['icon' => '/icon-192.png', 'badge' => '/icon-192.png', 'vibrate' => [200, 100, 200]],
                      'fcm_options'  => ['link' => $url ?: '/']]];
    $ch = curl_init('https://fcm.googleapis.com/v1/projects/' . FCM_PROJECT_ID . '/messages:send');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => json_encode(['message' => $msg]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $at]]);
    $raw = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
    return $err ? ['error' => $err] : (json_decode($raw, true) ?? ['error' => 'invalid_response']);
}

// ── FCM NOTIFY ────────────────────────────────────────────────────────────────
if ($q['type'] === 'fcm_notify') {
    $title  = $q['title']   ?? 'RIVO';
    $msg    = $q['message'] ?? '';
    $url    = $q['url']     ?? '';
    $target = $q['target']  ?? 'all';
    if ($target === 'all') {
        $r = sbRequest('GET', '/rest/v1/profiles?select=fcm_token&fcm_token=not.is.null&limit=2000');
        $tokens = array_filter(array_column($r['data'] ?? [], 'fcm_token'));
    } else {
        $r = sbRequest('GET', '/rest/v1/profiles?select=fcm_token&id=eq.' . urlencode($target));
        $tk = $r['data'][0]['fcm_token'] ?? null;
        $tokens = $tk ? [$tk] : [];
    }
    $sent = 0;
    foreach ($tokens as $tok) { if (!isset(fcmSendOne($tok, $title, $msg, $url)['error'])) $sent++; }
    echo json_encode(['sent' => $sent, 'total' => count($tokens)]);
    exit;
}

// ── FCM DAILY NOTIF ───────────────────────────────────────────────────────────
if ($q['type'] === 'fcm_daily_notif') {
    $dateFile = sys_get_temp_dir() . '/rivo_fcm_daily.txt';
    $today    = date('Y-m-d');
    if (file_exists($dateFile) && trim(file_get_contents($dateFile)) === $today) {
        echo json_encode(['skipped' => true, 'reason' => 'already_sent_today']); exit;
    }
    $messages = [
        ['🔥 Continue d\'apprendre !', 'Connecte-toi pour gagner des points aujourd\'hui sur RIVO'],
        ['📚 Une formation t\'attend !', 'Termine ce que tu as commencé et progresse chaque jour'],
        ['⭐ Objectif du jour', 'Découvre une nouvelle formation et gagne des points sur RIVO'],
        ['💪 Les meilleurs gagnent des récompenses !', 'Voiture, Moto, Visa… Et si c\'était toi ? Continue d\'apprendre !'],
        ['🎯 Prêt pour aujourd\'hui ?', 'Achète des formations et gagne des récompenses incroyables sur RIVO'],
        ['🏆 Les champions apprennent chaque jour', 'Rejoins les meilleurs apprenants RIVO et gagne des lots'],
        ['🚀 Ta prochaine récompense t\'attend', 'Continue d\'apprendre sur RIVO : Voiture / Moto / Visa / Emploi'],
    ];
    $pick = $messages[array_rand($messages)];
    $r    = sbRequest('GET', '/rest/v1/profiles?select=fcm_token&fcm_token=not.is.null&limit=2000');
    $tokens = array_filter(array_column($r['data'] ?? [], 'fcm_token'));
    $sent = 0;
    foreach ($tokens as $tok) { if (!isset(fcmSendOne($tok, $pick[0], $pick[1])['error'])) $sent++; }
    if ($sent > 0 || empty($tokens)) @file_put_contents($dateFile, $today);
    echo json_encode(['sent' => $sent, 'total' => count($tokens)]);
    exit;
}

echo json_encode(['error' => ['message' => 'Type inconnu']]);
