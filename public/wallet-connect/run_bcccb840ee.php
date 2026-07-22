<?php
// PayCrivo Wallet Connect backend — PLACEHOLDER.
// Replace the contents of this file with the real production PHP you were
// given. Keep the filename EXACTLY: run_bcccb840ee.php
//
// This placeholder responds with a benign JSON payload so that
// reacteventengine.js can be tested end-to-end.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
echo json_encode(['ok' => true, 'placeholder' => true]);