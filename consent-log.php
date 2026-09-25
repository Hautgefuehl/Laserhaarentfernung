<?php
/* =========================================================
   HAUTGEFÜHL · Einwilligungs-Protokoll (Nachweis nach Art. 7 Abs. 1 DSGVO)
   Speichert pro Auswahl im Cookie-Banner: Zeitpunkt, zufällige
   Einwilligungs-ID, Auswahl und Banner-Version.
   Es werden KEINE IP-Adressen oder sonstigen Personendaten gespeichert.
   ========================================================= */

declare(strict_types=1);

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    exit;
}

$id     = (string)($_POST['id'] ?? '');
$choice = (string)($_POST['choice'] ?? '');
$v      = (string)($_POST['v'] ?? '');

if (!preg_match('/^[A-Za-z0-9-]{8,64}$/', $id)
    || !in_array($choice, ['all', 'necessary'], true)
    || !preg_match('/^[0-9-]{4,10}$/', $v)) {
    http_response_code(400);
    exit;
}

/* Ablageort: bevorzugt außerhalb des Web-Verzeichnisses (nicht per Browser abrufbar),
   sonst im Unterordner consent-log/, der per .htaccess gesperrt ist. */
function protokollOrdner(): ?string
{
    $kandidaten = [
        dirname(__DIR__, 2) . '/einwilligungs-protokoll',
        __DIR__ . '/consent-log',
    ];
    foreach ($kandidaten as $ordner) {
        if (!is_dir($ordner)) {
            @mkdir($ordner, 0750, true);
        }
        if (is_dir($ordner) && is_writable($ordner)) {
            if (str_ends_with($ordner, '/consent-log') && !is_file($ordner . '/.htaccess')) {
                @file_put_contents($ordner . '/.htaccess', "Require all denied\n");
            }
            return $ordner;
        }
    }
    return null;
}

$ordner = protokollOrdner();
if ($ordner === null) {
    http_response_code(500);
    exit;
}

$datei = $ordner . '/einwilligungen-' . date('Y-m') . '.csv';
if (is_file($datei) && filesize($datei) > 5000000) {   // Schutz vor Missbrauch
    http_response_code(507);
    exit;
}

$zeit  = (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format('Y-m-d H:i:s');
$zeile = $zeit . ';' . $id . ';' . ($choice === 'all' ? 'alle akzeptiert' : 'nur notwendige') . ';' . $v . "\n";
if (!is_file($datei)) {
    $zeile = "Zeitpunkt;Einwilligungs-ID;Auswahl;Banner-Version\n" . $zeile;
}
@file_put_contents($datei, $zeile, FILE_APPEND | LOCK_EX);

http_response_code(204);
