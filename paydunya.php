<?php
/**
 * RIVO — Proxy PayDunya
 * Reçoit le POST JSON de rivo.html et appelle l'API PayDunya côté serveur.
 * Nécessaire car PayDunya bloque les appels directs depuis le navigateur (CORS).
 */

// ── CORS ──────────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Clés PayDunya ─────────────────────────────────────────────────────────────
define('PD_MASTER_KEY',  'Io11LMpAF46SovODgiZy');
define('PD_PUBLIC_KEY',  'live_public_aTk6faXel2g6sQNdYp0cIWtmwPH');
define('PD_PRIVATE_KEY', 'live_private_qE3AAfBnariz6iPIgPmP0IsE3xi');
define('PD_MODE',        'live');
define('PD_API',         'https://app.paydunya.com/api/v1');
define('PD_CHECKOUT',    'https://app.paydunya.com/checkout/pay/');

// ── Helpers ───────────────────────────────────────────────────────────────────
function pdHeaders(): array {
    return [
        'Content-Type: application/json',
        'PAYDUNYA-MASTER-KEY: '  . PD_MASTER_KEY,
        'PAYDUNYA-PUBLIC-KEY: '  . PD_PUBLIC_KEY,
        'PAYDUNYA-PRIVATE-KEY: ' . PD_PRIVATE_KEY,
        'PAYDUNYA-MODE: '        . PD_MODE,
    ];
}

function fail(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

// ── Lecture du body JSON envoyé par rivo.html ─────────────────────────────────
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) fail('Corps de requête invalide', 400);

$amount     = intval($input['amount']            ?? 0);
$purchaseId = trim($input['purchase_id']         ?? '');
$title      = trim($input['course_title']        ?? 'Formation RIVO');
$email      = trim($input['customer_email']      ?? '');
$firstName  = trim($input['customer_first_name'] ?? '');
$lastName   = trim($input['customer_last_name']  ?? '');
$phone      = preg_replace('/\D/', '', $input['customer_phone'] ?? '');

if ($amount <= 0 || !$purchaseId || !$email) {
    fail('Paramètres manquants (amount, purchase_id, email)');
}

// ── URL de retour ─────────────────────────────────────────────────────────────
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base   = $scheme . '://' . $_SERVER['HTTP_HOST'];
// On revient toujours vers rivo.html
$dir    = rtrim(dirname($_SERVER['REQUEST_URI']), '/');
$rivoBase = $base . $dir . '/rivo.html';

// ── Payload PayDunya ──────────────────────────────────────────────────────────
$payload = [
    'invoice' => [
        'items' => ['item_1' => [
            'name'        => $title,
            'quantity'    => 1,
            'unit_price'  => (string) $amount,
            'total_price' => (string) $amount,
            'description' => 'Formation RIVO',
        ]],
        'total_amount' => $amount,
        'description'  => 'RIVO - ' . $title,
    ],
    'store' => [
        'name'        => 'RIVO',
        'tagline'     => "La plateforme qui transforme l'apprentissage en opportunité",
        'website_url' => $base,
    ],
    'actions' => [
        'cancel_url'   => $rivoBase . '?payment=annule&pid=' . urlencode($purchaseId),
        'return_url'   => $rivoBase . '?payment=ok&pid='     . urlencode($purchaseId),
        'callback_url' => $base . $dir . '/paydunya.php?action=notification',
    ],
    'custom_data' => ['purchase_id' => $purchaseId],
    'customer' => [
        'name'  => trim($firstName . ' ' . $lastName) ?: 'Client RIVO',
        'email' => $email,
        'phone' => $phone ?: '',
    ],
];

// ── Appel API PayDunya ────────────────────────────────────────────────────────
$ch = curl_init(PD_API . '/checkout-invoice/create');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => pdHeaders(),
]);
$raw = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) fail('Réseau : ' . $err, 500);

$resp = json_decode($raw, true);
if ($resp && ($resp['response_code'] ?? '') === '00' && !empty($resp['token'])) {
    echo json_encode(['success' => true, 'url' => PD_CHECKOUT . $resp['token']]);
} else {
    $msg = $resp['response_text'] ?? $raw ?? 'Erreur PayDunya';
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => $msg]);
}
