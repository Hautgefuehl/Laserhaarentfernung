/* =========================================================
   HAUTGEFÜHL · Einwilligung (Cookie-Banner) + Meta-Pixel
   - Das Pixel lädt erst, nachdem die Besucherin zugestimmt hat.
   - Die Einwilligung gilt 12 Monate, danach wird neu gefragt.
   - Jede Auswahl wird anonym protokolliert (consent-log.php):
     Zeitpunkt, Auswahl und eine Zufalls-ID, keine IP-Adresse.
   ========================================================= */
(() => {
  'use strict';

  // Meta-Pixel-ID (nur Ziffern)
  const META_PIXEL_ID = '1353147353315743';

  const KEY = 'hg-consent';
  const GUELTIG_MS = 365 * 24 * 60 * 60 * 1000;   // 12 Monate
  const BANNER_VERSION = '2026-09';                 // bei neuem Banner-Text erhöhen => alle werden neu gefragt
  const banner = document.getElementById('consent');
  if (!banner) return;

  const read = () => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || typeof d !== 'object' || !d.choice || !d.ts) return null;           // alte oder leere Einträge
      if (d.v !== BANNER_VERSION || Date.now() - d.ts > GUELTIG_MS) return null;   // abgelaufen
      return d;
    } catch (e) { return null; }
  };
  const newId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  // Anonymes Protokoll auf dem eigenen Server (Nachweis nach Art. 7 Abs. 1 DSGVO)
  const protokoll = rec => {
    try {
      const body = new URLSearchParams({ id: rec.id, choice: rec.choice, v: rec.v });
      if (navigator.sendBeacon) navigator.sendBeacon('consent-log.php', body);
      else fetch('consent-log.php', { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch (e) { /* Protokoll darf die Seite nie stören */ }
  };

  const save = choice => {
    const prev = read();
    const rec = { choice, ts: Date.now(), v: BANNER_VERSION, id: (prev && prev.id) || newId() };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* privater Modus */ }
    protokoll(rec);
  };

  let pixelLoaded = false;
  function loadPixel() {
    if (!META_PIXEL_ID) return;
    if (pixelLoaded) { window.fbq && window.fbq('consent', 'grant'); return; }
    pixelLoaded = true;
    /* Offizieller Meta-Pixel-Basiscode */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  // Widerruf während des Besuchs: Pixel sofort stummschalten
  const revokePixel = () => { if (pixelLoaded && window.fbq) window.fbq('consent', 'revoke'); };

  // Klicks messen (nur wenn das Pixel geladen ist und die Einwilligung gilt)
  document.addEventListener('click', e => {
    const d = read();
    if (!pixelLoaded || !window.fbq || !d || d.choice !== 'all') return;
    const a = e.target.closest('a');
    if (!a) return;
    if (a.href.includes('studiobookr.com')) window.fbq('track', 'Lead', { content_name: 'Termin buchen' });
    else if (a.href.includes('wa.me')) window.fbq('track', 'Contact', { content_name: 'WhatsApp' });
    else if (a.href.startsWith('tel:')) window.fbq('track', 'Contact', { content_name: 'Telefon' });
  });

  const show = () => { banner.hidden = false; requestAnimationFrame(() => banner.classList.add('is-visible')); };
  const hide = () => { banner.classList.remove('is-visible'); setTimeout(() => { banner.hidden = true; }, 400); };

  banner.querySelector('[data-consent="all"]').addEventListener('click', () => { save('all'); hide(); loadPixel(); });
  banner.querySelector('[data-consent="necessary"]').addEventListener('click', () => { save('necessary'); hide(); revokePixel(); });

  // "Cookie-Einstellungen" im Footer öffnet das Banner erneut
  document.querySelectorAll('[data-consent-open]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); show(); }));

  // Für andere Skripte (z. B. Formular): gilt die Marketing-Einwilligung?
  window.hgConsentAll = () => { const d = read(); return !!(d && d.choice === 'all'); };

  const d = read();
  if (d && d.choice === 'all') loadPixel();
  else if (!d) setTimeout(show, 1200);
})();
