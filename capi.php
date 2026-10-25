<?php
/* =========================================================
   HAUTGEFÜHL · Meta Conversions API (Server-Event "Lead")
   Wird von anfrage.php eingebunden. Meldet eine Rückruf-Anfrage
   zusätzlich direkt vom Server an Meta, aber NUR wenn die
   Besucherin im Banner "Alle akzeptieren" gewählt hat.
   Name und Telefon werden vorher mit SHA-256 verschlüsselt.
   Die event_id ist dieselbe wie im Browser-Pixel, so zählt
   Meta die Anfrage nur einmal (Deduplizierung).
   Fehler hier blockieren niemals die Anfrage selbst.
   ========================================================= */

declare(strict_types=1);

const HG_CAPI_API_VERSION = 'v26.0';

function hg_capi_klein(string $s): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

/** Telefonnummer ins internationale Format ohne + und Leerzeichen (z. B. 4915906199525) */
function hg_capi_telefon(string $tel): string
{
    $tel = trim($tel);
    $ziffern = preg_replace('/\D+/', '', $tel) ?? '';
    if ($ziffern === '') return '';
    if (str_starts_with($tel, '+')) return $ziffern;
    if (str_starts_with($ziffern, '00')) return substr($ziffern, 2);
    if (str_starts_with($ziffern, '0')) return '49' . substr($ziffern, 1);
    return '49' . $ziffern;
}

function hg_capi_lead(string $name, string $telefon): void
{
    // 1. Nur mit Marketing-Einwilligung
    if ((string)($_POST['consent'] ?? '') !== 'all') return;

    // 2. Nur mit gültiger event_id (sonst keine Deduplizierung möglich)
    $eventId = (string)($_POST['event_id'] ?? '');
    if (!preg_match('/^[A-Za-z0-9-]{8,64}$/', $eventId)) return;

    // 3. Zugangsdaten laden
    $configDatei = __DIR__ . '/capi-config.php';
    if (!is_file($configDatei)) return;
    $cfg = require $configDatei;
    if (!is_array($cfg)) return;
    $token = trim((string)($cfg['access_token'] ?? ''));
    $pixel = preg_replace('/\D+/', '', (string)($cfg['pixel_id'] ?? '')) ?? '';
    $testCode = trim((string)($cfg['test_event_code'] ?? ''));
    if ($token === '' || str_starts_with($token, 'HIER_') || $pixel === '') return;

    // 4. Nutzerdaten (gehasht) und technische Daten
    $userData = [
        'country'           => [hash('sha256', 'de')],
        'client_ip_address' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
        'client_user_agent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
    ];
    $tel = hg_capi_telefon($telefon);
    if ($tel !== '') $userData['ph'] = [hash('sha256', $tel)];

    $teile = preg_split('/\s+/u', hg_capi_klein(trim($name)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    if (count($teile) >= 1) $userData['fn'] = [hash('sha256', $teile[0])];
    if (count($teile) >= 2) $userData['ln'] = [hash('sha256', $teile[count($teile) - 1])];

    // Meta-Cookies (gibt es nur, wenn das Pixel mit Einwilligung geladen wurde)
    $fbp = (string)($_COOKIE['_fbp'] ?? '');
    if (preg_match('/^fb\.\d\.\d+\.[\w.-]+$/', $fbp)) $userData['fbp'] = $fbp;
    $fbc = (string)($_COOKIE['_fbc'] ?? '');
    if (preg_match('/^fb\.\d\.\d+\.[\w.-]+$/', $fbc)) {
        $userData['fbc'] = $fbc;
    } else {
        parse_str(ltrim((string)($_POST['quelle'] ?? ''), '?'), $q);
        $fbclid = is_array($q) ? (string)($q['fbclid'] ?? '') : '';
        if (preg_match('/^[\w-]{10,500}$/', $fbclid)) {
            $userData['fbc'] = 'fb.1.' . (int)(microtime(true) * 1000) . '.' . $fbclid;
        }
    }

    // 5. Event zusammenstellen
    $payload = [
        'data' => [[
            'event_name'       => 'Lead',
            'event_time'       => time(),
            'event_id'         => $eventId,
            'action_source'    => 'website',
            'event_source_url' => 'https://hautgefuehl-emmelshausen.de/',
            'user_data'        => $userData,
            'custom_data'      => ['content_name' => 'Rückruf-Anfrage'],
        ]],
        'access_token' => $token,
    ];
    if ($testCode !== '') $payload['test_event_code'] = $testCode;

    $url  = 'https://graph.facebook.com/' . HG_CAPI_API_VERSION . '/' . $pixel . '/events';
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) return;

    // 6. Senden (max. 4 Sekunden, damit das Formular nie hängt)
    $status = 0;
    $antwort = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $json,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_TIMEOUT        => 4,
        ]);
        $antwort = (string)curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/json\r\n",
            'content'       => $json,
            'timeout'       => 4,
            'ignore_errors' => true,
        ]]);
        $antwort = (string)@file_get_contents($url, false, $ctx);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $status = (int)$m[1];
    }

    if ($status !== 200) {
        error_log('Meta CAPI Fehler (HTTP ' . $status . '): ' . substr($antwort, 0, 300));
    }
}
