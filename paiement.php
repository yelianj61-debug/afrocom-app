<?php
/**
 * RIVO — Passerelle de paiement PaiementPro (Xpaye)
 * Gère 3 actions : init, notification (webhook), retour
 */

// ── Config ────────────────────────────────────────────────────────────────
define('MERCHANT_ID',     'PP-F92222');
define('CURRENCY_CODE',   '952');       // XOF / FCFA
define('WSDL_URL',        'https://www.paiementpro.net/webservice/OnlineServicePayment_v2.php?wsdl');
define('PP_PROCESSING',   'https://www.paiementpro.net/webservice/onlinepayment/processing_v2.php');

define('SUPABASE_URL',    'https://qwdttzsbbspayojzeugy.supabase.co');
define('SUPABASE_KEY',    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZHR0enNiYnNwYXlvanpldWd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MTQzNSwiZXhwIjoyMDk0NTQ3NDM1fQ.Qh-1b3NA4wH5Km4W1v-nU0aGagkeIByet2INxccz3tw');

// ── Helpers ───────────────────────────────────────────────────────────────

/** URL de base du serveur (https://monsite.com) */
function baseUrl(): string {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . $_SERVER['HTTP_HOST'];
}

/** Chemin du dossier courant sur le serveur (/rivo ou /) */
function scriptDir(): string {
    return rtrim(dirname($_SERVER['REQUEST_URI']), '/');
}

/** Mettre à jour le statut d'un achat dans Supabase via REST */
function updatePurchaseStatus(string $purchaseId, string $status): bool {
    $url  = SUPABASE_URL . '/rest/v1/purchases?id=eq.' . urlencode($purchaseId);
    $body = json_encode(['status' => $status]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'PATCH',
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'apikey: '         . SUPABASE_KEY,
            'Authorization: Bearer ' . SUPABASE_KEY,
            'Prefer: return=minimal',
        ],
    ]);
    $result = curl_exec($ch);
    $code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $code >= 200 && $code < 300;
}

/** Réponse JSON */
function json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode($data);
    exit;
}

// ── Routing ───────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

// ── OPTIONS preflight (CORS) ──────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

// =========================================================================
// ACTION : init — initialiser la transaction et obtenir le sessionid
// Appelé par rivo.html via fetch POST JSON
// =========================================================================
if ($action === 'init') {

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json(['success' => false, 'error' => 'Corps de requête invalide'], 400);
    }

    $amount        = intval($input['amount']         ?? 0);
    $purchaseId    = trim($input['purchase_id']       ?? '');
    $courseTitle   = trim($input['course_title']      ?? 'Formation RIVO');
    $email         = trim($input['customer_email']    ?? '');
    $firstName     = trim($input['customer_first_name'] ?? '');
    $lastName      = trim($input['customer_last_name']  ?? '');
    $phone         = preg_replace('/\D/', '', $input['customer_phone'] ?? '');

    if ($amount <= 0 || !$purchaseId || !$email) {
        json(['success' => false, 'error' => 'Paramètres manquants (amount, purchase_id, email)'], 400);
    }
    if (!$phone) $phone = '00000000'; // téléphone obligatoire côté PP

    $dir = scriptDir();
    $notifURL  = baseUrl() . $dir . '/paiement.php?action=notification';
    $returnURL = baseUrl() . $dir . '/paiement.php?action=retour';

    ini_set('soap.wsdl_cache_enabled', 0);

    try {
        $client = new SoapClient(WSDL_URL, [
            'cache_wsdl'       => WSDL_CACHE_NONE,
            'connection_timeout' => 30,
        ]);

        $params = [
            'merchantId'          => MERCHANT_ID,
            'countryCurrencyCode' => CURRENCY_CODE,
            'amount'              => $amount,
            'referenceNumber'     => 'RIVO-' . time(),
            'customerEmail'       => $email,
            'customerFirstName'   => $firstName ?: 'Client',
            'customerLastname'    => $lastName  ?: 'RIVO',
            'customerPhoneNumber' => $phone,
            'description'         => 'RIVO - ' . $courseTitle,
            'notificationURL'     => $notifURL,
            'returnURL'           => $returnURL,
            'returnContext'       => 'purchase_id=' . $purchaseId,
        ];

        $response = $client->initTransact($params);

        if ($response->Code == 0) {
            $redirectUrl = PP_PROCESSING . '?sessionid=' . $response->Sessionid;
            json(['success' => true, 'url' => $redirectUrl]);
        } else {
            $desc = $response->Description ?? 'Erreur inconnue';
            json(['success' => false, 'error' => $desc, 'code' => $response->Code]);
        }

    } catch (SoapFault $e) {
        json(['success' => false, 'error' => 'SOAP: ' . $e->getMessage()], 500);
    } catch (Exception $e) {
        json(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// =========================================================================
// ACTION : notification — webhook appelé par PaiementPro (server → server)
// Reçu en POST avec responsecode, returnContext, etc.
// =========================================================================
elseif ($action === 'notification') {

    $responsecode  = $_POST['responsecode']  ?? '';
    $returnContext = $_POST['returnContext']  ?? '';

    // Parser le returnContext pour récupérer purchase_id
    parse_str($returnContext, $ctx);
    $purchaseId = $ctx['purchase_id'] ?? '';

    if ($purchaseId) {
        if ($responsecode === '0') {
            updatePurchaseStatus($purchaseId, 'complete');
        } else {
            updatePurchaseStatus($purchaseId, 'rejete');
        }
    }

    // PaiementPro attend une réponse 200
    http_response_code(200);
    echo 'OK';
    exit;
}

// =========================================================================
// ACTION : retour — redirection client après paiement
// PaiementPro renvoie le client ici (GET)
// =========================================================================
elseif ($action === 'retour') {

    $returnContext = $_GET['returnContext'] ?? '';
    parse_str($returnContext, $ctx);
    $purchaseId = $ctx['purchase_id'] ?? '';

    // Rediriger vers rivo.html avec les paramètres de succès
    $rivoHtml = scriptDir() . '/rivo.html';
    if ($purchaseId) {
        header('Location: ' . $rivoHtml . '?payment=ok&pid=' . urlencode($purchaseId));
    } else {
        header('Location: ' . $rivoHtml . '?payment=erreur');
    }
    exit;
}

// =========================================================================
// Action inconnue
// =========================================================================
else {
    json(['error' => 'Action invalide. Utilisez ?action=init|notification|retour'], 400);
}
