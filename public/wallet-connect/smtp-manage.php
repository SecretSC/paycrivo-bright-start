<?php
// PayCrivo — SMTP configuration manager for the static-hosted admin panel.
// Stores up to 8 SMTP slots + which one is active in smtp-configs.json.
// The JSON file lives beside this script and is denied via .htaccess.
//
// Auth: header `X-Admin-Token: <ADMIN_TOKEN>` must match the token stored
// in smtp-configs.json. On first boot (file missing) the endpoint mints a
// random token, saves it, and returns it ONCE — copy it into the admin UI.
//
// Actions (JSON POST { action, ... }):
//   bootstrap       -> creates the file if missing; returns adminToken once
//   list            -> returns slots (passwords redacted) and activeId
//   upsert          -> { slot: {...} }   (slot.id optional; keep <=8 total)
//   remove          -> { id }
//   setActive       -> { id }
//   test            -> { id, to }        send test email using slot `id`

declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'Method not allowed']); exit; }

require_once __DIR__ . '/_smtp_lib.php';

$cfgFile = __DIR__ . '/smtp-configs.json';

function pc_load_cfg(string $file): array {
  if (!file_exists($file)) return ['adminToken'=>'', 'activeId'=>null, 'slots'=>[]];
  $raw = (string)file_get_contents($file);
  $j = json_decode($raw, true);
  return is_array($j) ? $j : ['adminToken'=>'', 'activeId'=>null, 'slots'=>[]];
}
function pc_save_cfg(string $file, array $cfg): void {
  $tmp = $file . '.tmp';
  file_put_contents($tmp, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
  @chmod($tmp, 0600);
  rename($tmp, $file);
}
function pc_redact(array $cfg): array {
  $out = $cfg;
  $out['adminToken'] = $cfg['adminToken'] ? '••••••••' : '';
  $out['slots'] = array_map(function($s){ $s['password'] = !empty($s['password']) ? '••••••••' : ''; return $s; }, $cfg['slots'] ?? []);
  return $out;
}

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid body']); exit; }
$action = (string)($body['action'] ?? '');

$cfg = pc_load_cfg($cfgFile);

// Bootstrap: only allowed when file is missing / token empty.
if ($action === 'bootstrap') {
  if (!empty($cfg['adminToken'])) { http_response_code(409); echo json_encode(['ok'=>false,'error'=>'Already bootstrapped']); exit; }
  $token = bin2hex(random_bytes(24));
  $cfg = ['adminToken'=>$token, 'activeId'=>null, 'slots'=>[]];
  pc_save_cfg($cfgFile, $cfg);
  echo json_encode(['ok'=>true, 'adminToken'=>$token, 'note'=>'Copy this token into the admin UI. It will not be shown again.']);
  exit;
}

// All other actions require the token.
$token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if (!$cfg['adminToken'] || !hash_equals((string)$cfg['adminToken'], (string)$token)) {
  http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit;
}

switch ($action) {
  case 'list':
    echo json_encode(['ok'=>true, 'config'=>pc_redact($cfg)]);
    break;

  case 'upsert': {
    $slot = is_array($body['slot'] ?? null) ? $body['slot'] : null;
    if (!$slot) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing slot']); exit; }
    $slot['id'] = (string)($slot['id'] ?? bin2hex(random_bytes(6)));
    $slot['label'] = trim((string)($slot['label'] ?? 'SMTP'));
    $slot['host'] = trim((string)($slot['host'] ?? ''));
    $slot['port'] = (int)($slot['port'] ?? 587);
    $slot['username'] = (string)($slot['username'] ?? '');
    $slot['fromEmail'] = (string)($slot['fromEmail'] ?? '');
    $slot['fromName'] = (string)($slot['fromName'] ?? 'PayCrivo');
    $slot['encryption'] = in_array(($slot['encryption'] ?? 'tls'), ['ssl','tls','none'], true) ? $slot['encryption'] : 'tls';
    // Only replace password when a new (non-empty, non-redacted) value is provided.
    $incomingPass = (string)($slot['password'] ?? '');
    $slots = $cfg['slots'] ?? [];
    $found = false;
    foreach ($slots as &$s) {
      if (($s['id'] ?? '') === $slot['id']) {
        $keepPass = $s['password'] ?? '';
        $s = $slot;
        if ($incomingPass === '' || $incomingPass === '••••••••') $s['password'] = $keepPass;
        $found = true;
        break;
      }
    }
    unset($s);
    if (!$found) {
      if (count($slots) >= 8) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Maximum of 8 SMTP slots']); exit; }
      $slots[] = $slot;
    }
    $cfg['slots'] = $slots;
    pc_save_cfg($cfgFile, $cfg);
    echo json_encode(['ok'=>true, 'config'=>pc_redact($cfg)]);
    break;
  }

  case 'remove': {
    $id = (string)($body['id'] ?? '');
    $cfg['slots'] = array_values(array_filter($cfg['slots'] ?? [], fn($s) => ($s['id'] ?? '') !== $id));
    if (($cfg['activeId'] ?? null) === $id) $cfg['activeId'] = null;
    pc_save_cfg($cfgFile, $cfg);
    echo json_encode(['ok'=>true, 'config'=>pc_redact($cfg)]);
    break;
  }

  case 'setActive': {
    $id = (string)($body['id'] ?? '');
    $exists = false;
    foreach ($cfg['slots'] ?? [] as $s) { if (($s['id'] ?? '') === $id) { $exists = true; break; } }
    if (!$exists) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Slot not found']); exit; }
    $cfg['activeId'] = $id;
    pc_save_cfg($cfgFile, $cfg);
    echo json_encode(['ok'=>true, 'config'=>pc_redact($cfg)]);
    break;
  }

  case 'test': {
    $id = (string)($body['id'] ?? '');
    $to = trim((string)($body['to'] ?? ''));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid recipient']); exit; }
    $slot = null;
    foreach ($cfg['slots'] ?? [] as $s) { if (($s['id'] ?? '') === $id) { $slot = $s; break; } }
    if (!$slot) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Slot not found']); exit; }
    try {
      paycrivo_smtp_send($slot, $to, 'PayCrivo SMTP test — ' . ($slot['label'] ?? ''),
        '<p>Your PayCrivo SMTP slot "<strong>' . htmlspecialchars((string)($slot['label'] ?? '')) . '</strong>" is working.</p>',
        'Your PayCrivo SMTP slot is working.');
      echo json_encode(['ok'=>true]);
    } catch (Throwable $e) {
      http_response_code(502); echo json_encode(['ok'=>false, 'error'=>$e->getMessage()]);
    }
    break;
  }

  default:
    http_response_code(400); echo json_encode(['ok'=>false, 'error'=>'Unknown action']);
}