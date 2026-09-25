/* =========================================================
   HAUTGEFÜHL · Einwilligung (Cookie-Banner) + Meta-Pixel
   Das Pixel lädt erst, nachdem die Besucherin zugestimmt hat.
   ========================================================= */
(() => {
  'use strict';

  // >>> Hier deine Meta-Pixel-ID eintragen (nur Ziffern), z. B. '123456789012345'
  const META_PIXEL_ID = '';

  const KEY = 'hg-consent';        // gespeicherte Auswahl: 'all' | 'necessary'
  const banner = document.getElementById('consent');
  if (!banner) return;

  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* privater Modus */ } };

  let pixelLoaded = false;
  function loadPixel() {
    if (pixelLoaded || !META_PIXEL_ID) return;
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

  // Klicks messen (nur wenn das Pixel geladen ist)
  document.addEventListener('click', e => {
    if (!pixelLoaded || !window.fbq) return;
    const a = e.target.closest('a');
    if (!a) return;
    if (a.href.includes('studiobookr.com')) window.fbq('track', 'Lead', { content_name: 'Termin buchen' });
    else if (a.href.includes('wa.me')) window.fbq('track', 'Contact', { content_name: 'WhatsApp' });
    else if (a.href.startsWith('tel:')) window.fbq('track', 'Contact', { content_name: 'Telefon' });
  });

  const show = () => { banner.hidden = false; requestAnimationFrame(() => banner.classList.add('is-visible')); };
  const hide = () => { banner.classList.remove('is-visible'); setTimeout(() => { banner.hidden = true; }, 400); };

  banner.querySelector('[data-consent="all"]').addEventListener('click', () => { save('all'); hide(); loadPixel(); });
  banner.querySelector('[data-consent="necessary"]').addEventListener('click', () => { save('necessary'); hide(); });

  // "Cookie-Einstellungen" im Footer öffnet das Banner erneut
  document.querySelectorAll('[data-consent-open]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); show(); }));

  const choice = read();
  if (choice === 'all') loadPixel();
  else if (!choice) setTimeout(show, 1200);
})();
