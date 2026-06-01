<?php
// ── RIVO — Proxy upload image (Cloudinary) ──────────────────────────────────
// Le navigateur envoie son fichier ici. Ce proxy le retransmet à Cloudinary
// sans exposer la clé upload_preset en clair dans le JS (elle est visible
// de toutes façons côté client via Cloudinary, mais le flux transite ici pour
// pouvoir valider le fichier côté serveur).
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('CLD_CLOUD',  'dx0dzt35e');
define('CLD_PRESET', 'afrotv_avatars');
define('CLD_URL',    'https://api.cloudinary.com/v1_1/' . CLD_CLOUD . '/image/upload');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Méthode non autorisée']); exit;
}

// ── Validation basique ───────────────────────────────────────────────────────
if (empty($_FILES['file'])) {
    echo json_encode(['error' => 'Aucun fichier reçu']); exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Erreur upload: ' . $file['error']]); exit;
}

$maxSize = 8 * 1024 * 1024; // 8 Mo
if ($file['size'] > $maxSize) {
    echo json_encode(['error' => 'Fichier trop lourd (max 8 Mo)']); exit;
}

$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$mime    = mime_content_type($file['tmp_name']);
if (!in_array($mime, $allowed, true)) {
    echo json_encode(['error' => 'Type non autorisé: ' . $mime]); exit;
}

// ── Retransmettre à Cloudinary ───────────────────────────────────────────────
$post = [
    'file'          => new CURLFile($file['tmp_name'], $mime, $file['name']),
    'upload_preset' => CLD_PRESET,
];

$ch = curl_init(CLD_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $post,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
]);
$raw = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    echo json_encode(['error' => 'Réseau: ' . $err]); exit;
}

// Retransmettre la réponse Cloudinary telle quelle
echo $raw;
