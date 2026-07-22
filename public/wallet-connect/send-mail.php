<?php
// PayCrivo — SMTP send endpoint for the static-hosted frontend.
// Reads the ACTIVE SMTP config from smtp-configs.json (managed via
// smtp-manage.php) and sends the email over raw SMTP with fsockopen —
// no Composer / PHPMailer dependency required.
//
// Auth: caller must send header `X-Admin-Token: <ADMIN_TOKEN>` matching
//       the token in smtp-configs.json (field `adminToken`).
//       On very first run, if smtp-configs.json is missing, the admin panel
//       will create it with a token you must copy into the admin UI.
//
// POST JSON: { to, subject, html, text?, replyTo? }

declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'Method not allowed']); exit; }

require_once __DIR__ . '/_smtp_lib.php';

$cfgFile = __DIR__ . '/smtp-configs.json';
if (!file_exists($cfgFile)) { http_response_code(503); echo json_encode(['ok'=>false,'error'=>'SMTP not configured']); exit; }
$cfg = json_decode((string)file_get_contents($cfgFile), true);
if (!is_array($cfg)) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'Corrupt SMTP config']); exit; }

$token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if (!hash_equals((string)($cfg['adminToken'] ?? ''), (string)$token)) {
  http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit;
}

$activeId = $cfg['activeId'] ?? null;
$slots = $cfg['slots'] ?? [];
$active = null;
foreach ($slots as $s) { if (($s['id'] ?? null) === $activeId) { $active = $s; break; } }
if (!$active) { http_response_code(503); echo json_encode(['ok'=>false,'error'=>'No active SMTP slot']); exit; }

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid body']); exit; }
$to = trim((string)($body['to'] ?? ''));
$subject = (string)($body['subject'] ?? '');
$html = (string)($body['html'] ?? '');
$text = (string)($body['text'] ?? strip_tags($html));
$replyTo = trim((string)($body['replyTo'] ?? ''));
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid recipient']); exit; }

try {
  paycrivo_smtp_send($active, $to, $subject, $html, $text, $replyTo);
  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  http_response_code(502);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}