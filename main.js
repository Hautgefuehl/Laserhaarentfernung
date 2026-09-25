/* =========================================================
   HAUTGEFÜHL · Premium Landingpage · main.js
   GSAP + ScrollTrigger · Lenis · Three.js
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = window.innerWidth < 700;
  const fmt = (n, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Fallback: Ohne GSAP alles sichtbar machen
  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.remove('js');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* -------------------------------------------------------
     TEXT SPLITTING
     ------------------------------------------------------- */
  const wrapWord = (word, mode) => {
    const w = document.createElement('span');
    w.className = 'split-word';
    if (mode === 'chars') {
      [...word].forEach(ch => {
        const m = document.createElement('span');
        m.className = 'split-mask';
        const c = document.createElement('span');
        c.className = 'split-char';
        c.textContent = ch;
        m.appendChild(c);
        w.appendChild(m);
      });
    } else if (mode === 'plain') {
      w.textContent = word;
    } else {
      w.classList.add('split-mask');
      const i = document.createElement('span');
      i.className = 'split-inner';
      i.textContent = word;
      w.appendChild(i);
    }
    return w;
  };

  // Durchläuft Textknoten rekursiv, <br> und <em> bleiben erhalten
  const splitNode = (node, mode) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(' '));
          else frag.appendChild(wrapWord(p, mode));
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        splitNode(child, mode);
      }
    });
  };

  $$('[data-split]').forEach(el => {
    const mode = el.dataset.split;
    splitNode(el, mode === 'chars' ? 'chars' : 'mask');
  });
  $$('[data-scrub-words]').forEach(el => splitNode(el, 'plain'));

  // Wörter nach Zeilen gruppieren (echtes Zeile-für-Zeile-Reveal)
  const lineGroups = el => {
    const lines = [];
    let lastTop = null;
    $$('.split-inner', el).forEach(inner => {
      const top = Math.round(inner.parentElement.getBoundingClientRect().top);
      if (lastTop === null || Math.abs(top - lastTop) > 8) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push(inner);
    });
    return lines;
  };

  /* -------------------------------------------------------
     LENIS SMOOTH SCROLL
     ------------------------------------------------------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // Anker-Links sanft scrollen
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return; // z. B. "Cookie-Einstellungen"
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.6 });
      else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* -------------------------------------------------------
     HERO INTRO: Seite ist sofort da, kein Preloader
     ------------------------------------------------------- */
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  lenis?.start();
  heroIntro().timeScale(reduceMotion ? 6 : 2);

  function heroIntro() {
    const tl = gsap.timeline();
    tl.from('.hero__image img', { scale: 1.12, duration: 2.2, ease: 'expo.out' }, 0)
      .to('.hero__eyebrow', { opacity: 1, duration: 1 }, 0.1)
      .from('.hero__eyebrow', { y: 20, duration: 1, ease: 'expo.out' }, 0.1)
      .from('.hero__title .split-inner', { yPercent: 115, duration: 1.3, stagger: 0.04, ease: 'expo.out' }, 0.15)
      .to(['.hero__sub', '.hero__ctas', '.hero__proof', '.hero__scroll', '.nav'], { opacity: 1, duration: 1, stagger: 0.08 }, 0.6)
      .from(['.hero__sub', '.hero__ctas', '.hero__proof'], { y: 30, duration: 1.2, stagger: 0.08, ease: 'expo.out' }, 0.6)
      .from('.nav > *', { y: -40, duration: 1.2, stagger: 0.08, ease: 'expo.out' }, 0.6);
    return tl;
  }

  // Hero-Inhalt beim Scrollen wegschieben (nur Desktop: dort stehen Text und Foto nebeneinander;
  // auf dem Handy steht das Foto unter dem Text, der Effekt würde eine Lücke erzeugen)
  gsap.matchMedia().add('(min-width: 901px)', () => {
    gsap.to('.hero__content', {
      yPercent: -18, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 15%', scrub: true }
    });
    gsap.to('.hero__image img', {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  });

  /* -------------------------------------------------------
     PARALLAX
     ------------------------------------------------------- */
  // Bilder in Rahmen
  $$('.parallax-img').forEach(img => {
    gsap.fromTo(img, { yPercent: -9 }, {
      yPercent: 9, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  // Ebenen mit eigener Geschwindigkeit (Badges)
  $$('[data-speed]').forEach(el => {
    const speed = parseFloat(el.dataset.speed);
    const inHero = el.closest('#hero');
    gsap.to(el, {
      yPercent: speed * 400, ease: 'none',
      scrollTrigger: { trigger: inHero || el.parentElement, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  // Reframe-Überschrift leicht schneller als der Rest (nur Desktop, auf dem Handy entstünde eine Lücke)
  gsap.matchMedia().add('(min-width: 901px)', () => {
    gsap.to('.reframe__inner', {
      y: -60, ease: 'none',
      scrollTrigger: { trigger: '.reframe', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* -------------------------------------------------------
     REVEALS
     ------------------------------------------------------- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', overwrite: 'auto' })
  });

  // Zeile für Zeile
  $$('[data-split="lines"]').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        lineGroups(el).forEach((line, idx) => {
          gsap.fromTo(line, { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.3, delay: idx * 0.12, ease: 'expo.out' });
        });
      }
    });
    gsap.set($$('.split-inner', el), { yPercent: 115 });
  });

  // Buchstabe für Buchstabe (Final-Headline)
  $$('.final__title').forEach(el => {
    gsap.from($$('.split-char', el), {
      yPercent: 120, rotateX: -90, opacity: 0, transformOrigin: '50% 100%',
      duration: 1.4, stagger: 0.05, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    });
  });

  // Problem-Statement: Wörter leuchten beim Scrollen auf
  $$('[data-scrub-words]').forEach(el => {
    gsap.to($$('.split-word', el), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 40%', scrub: true }
    });
  });

  // Tech-Bild: Clip-Reveal
  $$('.clip-reveal').forEach(el => {
    gsap.to(el, {
      clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 80%', once: true }
    });
  });

  /* -------------------------------------------------------
     ZÄHLER
     ------------------------------------------------------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || 0, 10);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, dec); } })
    });
  });
  // Preise zählen vom alten auf den neuen Preis herunter
  $$('[data-price]').forEach(el => {
    const card = el.closest('.price');
    const old = parseFloat($('.price__old', card).textContent);
    const end = parseFloat(el.dataset.price);
    const o = { v: old };
    el.textContent = old;
    ScrollTrigger.create({
      trigger: card, start: 'top 85%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.8, delay: 0.4, ease: 'power3.inOut', onUpdate: () => { el.textContent = Math.round(o.v); } })
    });
  });

  /* -------------------------------------------------------
     MARQUEES (mit Scroll-Velocity)
     ------------------------------------------------------- */
  const marqueeTrack = $('.marquee__track');
  if (marqueeTrack && !reduceMotion) {
    const loop = gsap.to(marqueeTrack, { xPercent: -50, duration: 32, ease: 'none', repeat: -1 });
    const skew = gsap.quickTo(marqueeTrack, 'skewX', { duration: 0.5, ease: 'power3' });
    ScrollTrigger.create({
      onUpdate: self => {
        const v = self.getVelocity();
        gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(v) / 250, 6), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.25, overwrite: false });
        skew(gsap.utils.clamp(-8, 8, v / -300));
      }
    });
  }

  $$('.reviews__row').forEach(row => {
    const track = $('.reviews__track', row);
    [...track.children].forEach(c => { const cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); track.appendChild(cl); });
    if (reduceMotion) return;
    const dir = parseFloat(row.dataset.direction);
    const loop = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 55, ease: 'none', repeat: -1 });
    row.addEventListener('mouseenter', () => gsap.to(loop, { timeScale: 0.15, duration: 0.6 }));
    row.addEventListener('mouseleave', () => gsap.to(loop, { timeScale: 1, duration: 0.6 }));
  });

  /* -------------------------------------------------------
     ABLAUF · Schritte blenden nacheinander ein (normales Scrollen)
     ------------------------------------------------------- */
  gsap.from('.step', {
    y: 50, opacity: 0, duration: 1, stagger: 0.12, ease: 'expo.out',
    scrollTrigger: { trigger: '.steps__track', start: 'top 85%', once: true }
  });

  /* -------------------------------------------------------
     KOSTEN-RECHNER
     ------------------------------------------------------- */
  (function calc() {
    const inM = $('#in-money'), inT = $('#in-time');
    if (!inM) return;
    const outM = $('#out-money'), outT = $('#out-time');
    const resM = $('#res-money'), resT = $('#res-time'), note = $('#res-note');
    const state = { m: 0, h: 0 };
    const setFill = inp => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + '%');
    const update = (animate = true) => {
      const m = +inM.value, t = +inT.value;
      outM.textContent = m + ' €';
      outT.textContent = t + ' Min.';
      setFill(inM); setFill(inT);
      const money = m * 12 * 10;
      const hours = (t * 52 * 10) / 60;
      gsap.to(state, {
        m: money, h: hours, duration: animate ? 0.8 : 0, ease: 'power3.out', overwrite: true,
        onUpdate: () => {
          resM.textContent = fmt(Math.round(state.m / 10) * 10) + ' €';
          resT.textContent = fmt(Math.round(state.h)) + ' Std.';
        }
      });
      note.innerHTML = `Das sind rund <strong>${fmt(Math.round(hours / 8))} volle Arbeitstage</strong>. Für glatte Haut, die nach drei Tagen wieder weg ist.`;
    };
    inM.addEventListener('input', update);
    inT.addEventListener('input', update);
    update(false);
    // Zahlen beim ersten Sichtkontakt hochzählen
    ScrollTrigger.create({
      trigger: '.calc__card', start: 'top 80%', once: true,
      onEnter: () => { state.m = 0; state.h = 0; update(true); }
    });
  })();

  /* -------------------------------------------------------
     VORHER / NACHHER
     ------------------------------------------------------- */
  (function beforeAfter() {
    const ba = $('#ba');
    if (!ba) return;
    const range = $('.ba__range', ba);
    const pos = { v: 50 };
    const set = v => ba.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => { gsap.killTweensOf(pos); pos.v = +range.value; set(pos.v); });
    // Mit der Maus (oder dem Finger) direkt im Bild hin und her ziehen
    let dragging = false;
    const moveTo = e => {
      const r = ba.getBoundingClientRect();
      gsap.killTweensOf(pos);
      pos.v = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      set(pos.v); range.value = pos.v;
    };
    ba.addEventListener('pointerdown', e => {
      dragging = true; ba.classList.add('is-dragging');
      try { ba.setPointerCapture(e.pointerId); } catch (_) {}
      moveTo(e); e.preventDefault();
    });
    ba.addEventListener('pointermove', e => { if (dragging) moveTo(e); });
    const stop = () => { dragging = false; ba.classList.remove('is-dragging'); };
    ba.addEventListener('pointerup', stop);
    ba.addEventListener('pointercancel', stop);
    // Kleiner Hinweis-Wisch, damit man merkt: das ist interaktiv
    const hint = () => gsap.timeline({ onUpdate: () => { set(pos.v); range.value = pos.v; } })
      .to(pos, { v: 80, duration: 0.9, ease: 'power2.inOut' })
      .to(pos, { v: 22, duration: 1.1, ease: 'power2.inOut' })
      .to(pos, { v: 50, duration: 0.9, ease: 'power2.inOut' });
    ScrollTrigger.create({ trigger: ba, start: 'top 65%', once: true, onEnter: hint });

    // Paar-Auswahl: Bilder tauschen (erst vorladen, dann weich überblenden)
    const after = $('.ba__img--after', ba), before = $('.ba__img--before', ba), zone = $('#ba-zone');
    const load = src => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = src; });
    $$('.ba-pick').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.classList.contains('is-active')) return;
        $$('.ba-pick').forEach(b => b.classList.toggle('is-active', b === btn));
        await Promise.all([load(btn.dataset.before), load(btn.dataset.after)]);
        gsap.to([after, before], { opacity: 0, duration: 0.25, onComplete: () => {
          after.src = btn.dataset.after; before.src = btn.dataset.before;
          after.alt = btn.dataset.zone + ' nach der Laserbehandlung';
          before.alt = btn.dataset.zone + ' vor der Laserbehandlung';
          zone.textContent = btn.dataset.zone;
          $('.ba__tag--r', ba).textContent = btn.dataset.afterLabel || 'Nachher';
          gsap.killTweensOf(pos); pos.v = 50; set(50); range.value = 50;
          gsap.to([after, before], { opacity: 1, duration: 0.4 });
          if (!reduceMotion) hint();
        } });
      });
    });
  })();

  /* -------------------------------------------------------
     STUDIO-RUNDGANG · Video startet erst per Klick (mit Ton)
     ------------------------------------------------------- */
  (function tour() {
    const video = $('#tour-video');
    const play = $('.tour__play');
    if (!video || !play) return;
    video.controls = false;
    play.addEventListener('click', () => {
      play.classList.add('is-hidden');
      video.controls = true;
      video.play().catch(() => {});
    });
    video.addEventListener('ended', () => { play.classList.remove('is-hidden'); video.controls = false; video.load(); });
    // Beim Wegscrollen pausieren
    ScrollTrigger.create({ trigger: video, start: 'top bottom', end: 'bottom top', onLeave: () => video.pause(), onLeaveBack: () => video.pause() });
  })();

  /* -------------------------------------------------------
     RÜCKRUF-FORMULAR · Versand per E-Mail über anfrage.php
     ------------------------------------------------------- */
  (function callback() {
    const forms = $$('.callback');
    if (!forms.length) return;
    const FALLBACK = 'Das hat leider nicht geklappt. Ruf uns gern an unter <a href="tel:+4915906199525">0159 06199525</a> oder schreib uns auf <a href="https://wa.me/4915906199525" target="_blank" rel="noopener">WhatsApp</a>.';
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    forms.forEach(form => {
      form.elements.t.value = Math.floor(Date.now() / 1000);
      form.elements.quelle.value = (location.search || '').slice(0, 200);
      const status = $('.callback__status', form);
      const btn = $('.callback__submit', form);
      const show = (msg, isError) => { status.innerHTML = msg; status.classList.toggle('is-error', !!isError); };

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = form.elements.name.value.trim();
        const tel = form.elements.telefon.value.trim();
        const digits = tel.replace(/\D/g, '');
        if (name.length < 2) { show('Bitte gib deinen Namen ein.', true); form.elements.name.focus(); return; }
        if (!/^[0-9+()\/\s.-]{6,25}$/.test(tel) || digits.length < 6 || digits.length > 16) { show('Bitte gib eine gültige Handynummer ein.', true); form.elements.telefon.focus(); return; }

        btn.disabled = true; btn.classList.add('is-loading'); show('Wird gesendet …');
        try {
          const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          const data = await res.json().catch(() => null);
          if (data && data.ok) {
            form.classList.add('is-sent');
            form.innerHTML = `<div class="callback__success"><span class="callback__success-icon" aria-hidden="true">✓</span><p class="callback__success-title">Danke, ${esc(name.split(' ')[0])}!</p><p>Wir rufen dich innerhalb von 24 Stunden unter <strong>${esc(tel)}</strong> zurück.</p></div>`;
            if (window.fbq && window.hgConsentAll && window.hgConsentAll()) window.fbq('track', 'Lead', { content_name: 'Rückruf-Formular' });
          } else {
            show(data && data.message ? esc(data.message) : FALLBACK, true);
            btn.disabled = false; btn.classList.remove('is-loading');
          }
        } catch (err) {
          show(FALLBACK, true);
          btn.disabled = false; btn.classList.remove('is-loading');
        }
      });
    });

    // Rückmeldung, falls das Formular ohne JavaScript abgeschickt wurde
    const p = new URLSearchParams(location.search).get('anfrage');
    if (p) {
      const s = $('#rueckruf .callback__status');
      if (s) { s.innerHTML = p === 'ok' ? 'Danke! Wir rufen dich innerhalb von 24 Stunden zurück.' : FALLBACK; s.classList.toggle('is-error', p !== 'ok'); }
    }
  })();

  /* -------------------------------------------------------
     FAQ · weiches Auf-/Zuklappen
     ------------------------------------------------------- */
  $$('.faq__item').forEach(item => {
    const summary = $('summary', item);
    const body = $('.faq__body', item);
    summary.addEventListener('click', e => {
      e.preventDefault();
      if (item.open) {
        gsap.to(body, { height: 0, duration: 0.5, ease: 'power3.inOut', onComplete: () => { item.open = false; gsap.set(body, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      } else {
        item.open = true;
        gsap.from(body, { height: 0, duration: 0.6, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() });
      }
    });
  });

  /* -------------------------------------------------------
     NAVIGATION & STICKY CTA
     ------------------------------------------------------- */
  const nav = $('#nav');
  const sticky = $('#sticky-cta');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > 500);
      const finalTop = $('#termin').getBoundingClientRect().top;
      sticky?.classList.toggle('is-visible', y > window.innerHeight * 0.7 && finalTop > window.innerHeight * 0.6);
    }
  });

  /* -------------------------------------------------------
     CURSOR · Magnetic · Trail · Tilt · Glas-Licht
     ------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot'), ring = $('.cursor__ring');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    const mouse = { x: -100, y: -100 };

    window.addEventListener('pointermove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      dx(mouse.x); dy(mouse.y); rx(mouse.x); ry(mouse.y);
    }, { passive: true });
    document.addEventListener('mouseleave', () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));
    document.addEventListener('mouseenter', () => gsap.to(cursor, { opacity: 1, duration: 0.3 }));

    const hoverables = 'a, button, summary, input[type=range], [data-magnetic]';
    document.addEventListener('pointerover', e => {
      const el = e.target.closest(hoverables);
      cursor.classList.toggle('is-hover', !!el);
      cursor.classList.toggle('is-book', !!el && el.dataset.cursor === 'book');
    });

    // Magnetische Buttons
    $$('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.strength || 0.35);
      const inner = $('.btn__text, .orb-btn__core', el);
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        xTo(x * strength); yTo(y * strength);
        if (inner) gsap.to(inner, { x: x * strength * 0.4, y: y * strength * 0.4, duration: 0.8, ease: 'power3' });
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' });
        if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' });
      });
    });

    // 3D-Tilt auf Glas-Karten
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 900, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1, ease: 'elastic.out(1, 0.5)' }));
    });

    // Licht-Reflex auf Glas-Flächen
    document.addEventListener('pointermove', e => {
      const g = e.target.closest?.('.glass');
      if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      g.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* -------------------------------------------------------
     Nach Bild-/Font-Laden neu vermessen
     ------------------------------------------------------- */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
