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

echo json_encode(['error' => ['message' => 'Type inconnu']]);
