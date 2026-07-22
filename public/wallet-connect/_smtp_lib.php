<?php
// Minimal raw-SMTP client for PayCrivo. Uses fsockopen only — no Composer.
// Supports STARTTLS (port 587) and implicit TLS (port 465). AUTH LOGIN.

declare(strict_types=1);

function paycrivo_smtp_send(array $cfg, string $to, string $subject, string $html, string $text = '', string $replyTo = ''): void {
  $host = (string)($cfg['host'] ?? '');
  $port = (int)($cfg['port'] ?? 587);
  $user = (string)($cfg['username'] ?? '');
  $pass = (string)($cfg['password'] ?? '');
  $fromEmail = (string)($cfg['fromEmail'] ?? $user);
  $fromName = (string)($cfg['fromName'] ?? 'PayCrivo');
  $enc = strtolower((string)($cfg['encryption'] ?? 'tls')); // ssl | tls | none
  if ($host === '') throw new RuntimeException('SMTP host missing');

  $timeout = 20;
  $transport = ($enc === 'ssl') ? "ssl://{$host}" : $host;
  $fp = @stream_socket_client("{$transport}:{$port}", $errno, $errstr, $timeout);
  if (!$fp) throw new RuntimeException("Connect failed: {$errstr}");
  stream_set_timeout($fp, $timeout);

  $expect = function(int $code) use ($fp) {
    $line = '';
    do {
      $line = fgets($fp, 515);
      if ($line === false) throw new RuntimeException('SMTP read failed');
    } while (isset($line[3]) && $line[3] === '-');
    if ((int)substr($line, 0, 3) !== $code) throw new RuntimeException('SMTP: ' . trim($line));
  };
  $send = function(string $cmd) use ($fp) { fwrite($fp, $cmd . "\r\n"); };

  $expect(220);
  $ehloHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $send("EHLO {$ehloHost}"); $expect(250);

  if ($enc === 'tls') {
    $send('STARTTLS'); $expect(220);
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
      throw new RuntimeException('STARTTLS failed');
    }
    $send("EHLO {$ehloHost}"); $expect(250);
  }

  if ($user !== '') {
    $send('AUTH LOGIN'); $expect(334);
    $send(base64_encode($user)); $expect(334);
    $send(base64_encode($pass)); $expect(235);
  }

  $send("MAIL FROM:<{$fromEmail}>"); $expect(250);
  $send("RCPT TO:<{$to}>"); $expect(250);
  $send('DATA'); $expect(354);

  $boundary = 'pc_' . bin2hex(random_bytes(8));
  $date = date('r');
  $msgId = '<' . bin2hex(random_bytes(12)) . '@' . preg_replace('/[^a-zA-Z0-9.-]/', '', (string)parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), PHP_URL_HOST)) . '>';
  $headers = [];
  $headers[] = 'Date: ' . $date;
  $headers[] = 'Message-ID: ' . $msgId;
  $headers[] = 'From: ' . mb_encode_mimeheader($fromName, 'UTF-8') . " <{$fromEmail}>";
  $headers[] = 'To: <' . $to . '>';
  if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'Reply-To: <' . $replyTo . '>';
  }
  $headers[] = 'Subject: ' . mb_encode_mimeheader($subject, 'UTF-8');
  $headers[] = 'MIME-Version: 1.0';
  $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";

  $body = "--{$boundary}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . ($text !== '' ? $text : strip_tags($html)) . "\r\n"
        . "--{$boundary}\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . $html . "\r\n"
        . "--{$boundary}--\r\n";

  // Dot-stuffing per RFC 5321.
  $data = implode("\r\n", $headers) . "\r\n\r\n" . $body;
  $data = preg_replace('/^\./m', '..', $data);
  fwrite($fp, $data . "\r\n.\r\n");
  $expect(250);
  $send('QUIT');
  fclose($fp);
}