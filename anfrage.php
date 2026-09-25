<?php
/* =========================================================
   HAUTGEFÜHL · Rückruf-Anfrage
   Nimmt Name + Handynummer entgegen und schickt sie per E-Mail
   an das Studio. Es wird nichts auf dem Server gespeichert
   (außer einem anonymen Zähler gegen Spam, max. 1 Stunde).
   ========================================================= */

declare(strict_types=1);

const EMPFAENGER = 'info@hautgefuehl-emmelshausen.de';
const ABSENDER   = 'info@hautgefuehl-emmelshausen.de'; // muss zur eigenen Domain gehören
const MAX_PRO_STUNDE = 5;                               // Anfragen pro Besucher und Stunde

// Absicherung, falls die PHP-Erweiterung mbstring fehlt
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $s): int { return (int)preg_match_all('/./us', $s); }
}
if (!function_exists('mb_encode_mimeheader')) {
    function mb_encode_mimeheader(string $s, string $enc = 'UTF-8'): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
}

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function antwort(bool $ok, string $meldung, int $status = 200): never
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $meldung], JSON_UNESCAPED_UNICODE);
    } else {
        // Ohne JavaScript: zurück zur Seite mit Ergebnis-Hinweis
        header('Location: ./?anfrage=' . ($ok ? 'ok' : 'fehler') . '#rueckruf', true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    antwort(false, 'Bitte nutze das Formular auf der Seite.', 405);
}

/* --- Spam-Schutz 1: verstecktes Feld muss leer bleiben (Bots füllen es aus) --- */
if (trim((string)($_POST['website'] ?? '')) !== '') {
    antwort(true, 'Danke!'); // Bots bekommen eine neutrale Antwort
}

/* --- Spam-Schutz 2: Formular darf nicht in unter 3 Sekunden abgeschickt werden --- */
$start = (int)($_POST['t'] ?? 0);
$jetzt = time();
if ($start <= 0 || $jetzt - $start < 3 || $jetzt - $start > 86400) {
    antwort(false, 'Bitte lade die Seite neu und versuche es noch einmal.', 400);
}

/* --- Spam-Schutz 3: höchstens MAX_PRO_STUNDE Anfragen pro Besucher und Stunde --- */
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H') . __FILE__);
$zaehlerDatei = sys_get_temp_dir() . '/hg_anfrage_' . $ipHash;
$anzahl = is_file($zaehlerDatei) ? (int)@file_get_contents($zaehlerDatei) : 0;
if ($anzahl >= MAX_PRO_STUNDE) {
    antwort(false, 'Zu viele Anfragen. Bitte versuche es später noch einmal oder schreib uns auf WhatsApp.', 429);
}

/* --- Eingaben prüfen --- */
$bereinigen = static fn(string $s): string => trim(preg_replace('/[\r\n\t]+/', ' ', $s) ?? '');
$name    = $bereinigen((string)($_POST['name'] ?? ''));
$telefon = $bereinigen((string)($_POST['telefon'] ?? ''));
$einwilligung = ($_POST['einwilligung'] ?? '') === 'ja';
$quelle  = substr($bereinigen((string)($_POST['quelle'] ?? '')), 0, 200);
$position = substr($bereinigen((string)($_POST['position'] ?? '')), 0, 40);

if (mb_strlen($name) < 2 || mb_strlen($name) > 80) {
    antwort(false, 'Bitte gib deinen Namen ein.', 422);
}
$ziffern = preg_replace('/\D+/', '', $telefon) ?? '';
if (!preg_match('/^[0-9+()\/\s.-]{6,25}$/', $telefon) || strlen($ziffern) < 6 || strlen($ziffern) > 16) {
    antwort(false, 'Bitte gib eine gültige Handynummer ein.', 422);
}
if (!$einwilligung) {
    antwort(false, 'Bitte bestätige, dass wir dich zurückrufen dürfen.', 422);
}

/* --- E-Mail zusammenstellen --- */
$betreff = 'Rückruf-Anfrage Landingpage: ' . $name;
$zeit = (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format('d.m.Y, H:i');
$text = "Neue Rückruf-Anfrage über die Landingpage\n"
      . "==========================================\n\n"
      . "Name:          {$name}\n"
      . "Handynummer:   {$telefon}\n"
      . "Eingegangen:   {$zeit} Uhr\n"
      . "Formular:      " . ($position !== '' ? $position : 'unbekannt') . "\n"
      . ($quelle !== '' ? "Herkunft/Link: {$quelle}\n" : '')
      . "\nDie Person hat eingewilligt, zur Terminvereinbarung zurückgerufen zu werden.\n";

$kopf = [
    'From: ' . mb_encode_mimeheader('Hautgefühl Landingpage', 'UTF-8') . ' <' . ABSENDER . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: Hautgefuehl-Landingpage',
];

$gesendet = mail(
    EMPFAENGER,
    mb_encode_mimeheader($betreff, 'UTF-8'),
    $text,
    implode("\r\n", $kopf),
    '-f' . ABSENDER
);

if (!$gesendet) {
    antwort(false, 'Das hat leider nicht geklappt. Bitte ruf uns an oder schreib uns auf WhatsApp.', 500);
}

@file_put_contents($zaehlerDatei, (string)($anzahl + 1));
antwort(true, 'Danke! Wir rufen dich innerhalb von 24 Stunden zurück.');
