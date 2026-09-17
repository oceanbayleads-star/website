/* Ocean Bay Interiors - vanilla JS. No dependencies. */
(function () {
  'use strict';

  var header = document.getElementById('header');
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.getElementById('drawer');
  var hero = document.querySelector('.hero');

  /* ---------- Header: transparent over hero, solid after ---------- */
  if (header) {
    if (hero) {
      // Transparent over the top of the hero; solid once the page has scrolled past the top bar + a bit.
      var solidAt = 80;
      var solidRaf = null;
      function updateHeader() {
        solidRaf = null;
        header.classList.toggle('is-solid', window.scrollY > solidAt);
      }
      window.addEventListener('scroll', function () { if (!solidRaf) solidRaf = requestAnimationFrame(updateHeader); }, { passive: true });
      window.addEventListener('pageshow', updateHeader);
      updateHeader();
    } else {
      header.classList.add('is-solid');
    }
  }

  /* ---------- Mobile drawer ---------- */
  function setDrawer(open) {
    if (!toggle || !drawer) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  }
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      setDrawer(toggle.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setDrawer(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 64em)').addEventListener('change', function (mq) {
      if (mq.matches) setDrawer(false);
    });
  }

  /* ---------- Current section in desktop nav ---------- */
  var navLinks = document.querySelectorAll('.nav__links a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
          map[en.target.id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { so.observe(s); });
  }

  /* ---------- Section reveal (one entrance per section) ---------- */
  var reveals = document.querySelectorAll('.reveal, .contact-bar');
  // Staggered lists: give each child its index so CSS can delay it
  document.querySelectorAll('[data-stagger]').forEach(function (list) {
    Array.prototype.forEach.call(list.children, function (child, i) { child.style.setProperty('--i', i); });
  });
  if (reveals.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq__item');
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      item.classList.toggle('is-open', !open);
    });
  });

  /* ---------- Services track: arrows scroll one card; scroll-snap does the rest ---------- */
  var track = document.querySelector('.services__track');
  var prevBtn = document.querySelector('[data-track-prev]');
  var nextBtn = document.querySelector('[data-track-next]');
  if (track && prevBtn && nextBtn) {
    var real = Array.prototype.slice.call(track.querySelectorAll('.svc-card'));
    var n = real.length;

    /* Infinite loop: clone the last card before the first and the first after the last, so the
       neighbours are always visible. When the scroll settles on a clone, jump (no animation)
       to the real card in the same position. Positions: 0 = clone(last), 1..n = real, n+1 = clone(first). */
    function clone(card) {
      var c = card.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-clone', '');
      c.querySelectorAll('a, button').forEach(function (el) { el.setAttribute('tabindex', '-1'); });
      return c;
    }
    if (n > 1) {
      track.insertBefore(clone(real[n - 1]), real[0]);
      track.appendChild(clone(real[0]));
    }
    var cards = Array.prototype.slice.call(track.querySelectorAll('.svc-card'));

    function step() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    }
    function jump(left) {
      var prev = track.style.scrollBehavior;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = left;
      track.style.scrollBehavior = prev;
    }
    // --d = how far each card is from the track centre (0 = centred, 1 = one card away); CSS blurs/fades by it.
    function focus() {
      var rect = track.getBoundingClientRect();
      var mid = rect.left + rect.width / 2;
      var w = step();
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect();
        var d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / w);
        c.style.setProperty('--d', d.toFixed(3));
      });
    }
    // After the scroll settles: if we're on a clone, swap to the real card silently.
    var settle = null, cur = 1;
    function onSettle() {
      var w = step();
      var idx = Math.round(track.scrollLeft / w);
      if (idx <= 0) { idx = n; jump(w * n); }
      else if (idx >= n + 1) { idx = 1; jump(w); }
      cur = idx;
      focus();
    }
    var raf = null;
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(function () { raf = null; focus(); });
      clearTimeout(settle);
      settle = setTimeout(onSettle, 120);
    }
    prevBtn.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    nextBtn.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { jump(step() * cur); focus(); });

    if (n > 1) jump(step()); // start on the real first card (clone of the last sits to its left)
    focus();
  }

  /* ---------- Hero: rotating word in the H1 ---------- */
  document.querySelectorAll('.swap[data-words]').forEach(function (el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var words = el.getAttribute('data-words').split('|').filter(Boolean);
    var word = el.querySelector('.swap__word');
    if (words.length < 2 || !word) return;
    var i = 0;
    // Fix the width to the longest word so the line never reflows mid-swap.
    function fitWidth() {
      var probe = word.cloneNode(true);
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;animation:none;';
      el.appendChild(probe);
      var max = 0;
      words.forEach(function (w) { probe.textContent = w; max = Math.max(max, probe.offsetWidth); });
      el.removeChild(probe);
      el.style.minWidth = max + 'px';
    }
    fitWidth();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWidth);
    window.addEventListener('resize', fitWidth);
    setInterval(function () {
      el.classList.add('is-out');
      setTimeout(function () {
        i = (i + 1) % words.length;
        word.textContent = words[i];
        el.classList.remove('is-out');
        el.classList.add('is-in');
        setTimeout(function () { el.classList.remove('is-in'); }, 450);
      }, 350);
    }, 2600);
  });

  /* ---------- Portfolio wall: pause when off-screen; click opens the lightbox ---------- */
  var wall = document.querySelector('[data-wall]');
  var lb = document.getElementById('lightbox');
  if (wall && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      wall.classList.toggle('is-paused', !entries[0].isIntersecting);
    }, { threshold: 0.05 }).observe(wall);
  }
  if (wall && lb) {
    var lbImg = lb.querySelector('.lb__img');
    var lastTrigger = null;
    function openLb(a) {
      var img = a.querySelector('img');
      lbImg.src = a.getAttribute('href');
      lbImg.alt = img ? img.alt : '';
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      lastTrigger = a;
      lb.querySelector('[data-lb-close]').focus();
    }
    function closeLb() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { lb.hidden = true; lbImg.src = ''; }, 250);
      if (lastTrigger) lastTrigger.focus();
    }
    wall.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lb]');
      if (!a) return;
      e.preventDefault();
      if (lb.hidden) openLb(a);
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.closest('[data-lb-close]')) closeLb();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.hidden) closeLb();
    });
  }

  /* ---------- Service-area map: Leaflet + OpenStreetMap, loaded on demand when the card is near the viewport ---------- */
  var areaMap = document.getElementById('area-map');
  if (areaMap) {
    var LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min';
    function initMap() {
      var pins = JSON.parse(areaMap.getAttribute('data-pins') || '[]');
      var c = (areaMap.getAttribute('data-center') || '33.83,-78.84').split(',').map(Number);
      var map = L.map(areaMap, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, zoomSnap: 0.25 })
        .setView(c, parseInt(areaMap.getAttribute('data-zoom'), 10) || 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      pins.forEach(function (p) {
        var home = !!p[3];
        var icon = L.divIcon({
          className: 'map-pin' + (home ? ' map-pin--home' : ''),
          html: '<span class="map-pin__ring"></span><span class="map-pin__dot"></span>',
          iconSize: [28, 28], iconAnchor: [14, 14]
        });
        L.marker([p[1], p[2]], { icon: icon, title: p[0], keyboard: false })
          .addTo(map)
          .bindTooltip(p[0], { permanent: home, direction: 'top', offset: [0, -12], className: 'map-label' });
      });
      // Frame every pin with a little breathing room (labels included)
      if (pins.length) map.fitBounds(pins.map(function (p) { return [p[1], p[2]]; }), { padding: [36, 36] });
    }
    function loadMap() {
      if (window.L) return initMap();
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + '.css';
      document.head.appendChild(css);
      var js = document.createElement('script'); js.src = LEAFLET + '.js'; js.async = true;
      js.onload = initMap;
      document.head.appendChild(js);
    }
    if ('IntersectionObserver' in window) {
      var mo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { mo.disconnect(); loadMap(); }
      }, { rootMargin: '300px 0px' });
      mo.observe(areaMap);
    } else {
      loadMap();
    }
  }

  /* ---------- Hero video: only play when visible, pause when hidden ---------- */
  document.querySelectorAll('.hero__media video').forEach(function (v) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else { v.pause(); }
        });
      }, { threshold: 0.1 }).observe(v);
    }
  });

  /* ---------- Form: inline validation + redirect to /thanks ---------- */
  var form = document.getElementById('form01');
  if (form) {
    var fields = form.querySelectorAll('[required]');
    function validate(input) {
      var wrap = input.closest('.field');
      var ok = input.checkValidity();
      if (input.type === 'tel') ok = ok && /\d{7,}/.test(input.value.replace(/\D/g, ''));
      if (wrap) wrap.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    }
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { validate(f); });
      f.addEventListener('input', function () { if (f.closest('.field.is-invalid')) validate(f); });
    });
    form.addEventListener('submit', function (e) {
      var firstBad = null;
      fields.forEach(function (f) { if (!validate(f) && !firstBad) firstBad = f; });
      if (firstBad) { e.preventDefault(); firstBad.focus(); return; }
      if (form.querySelector('.hp input, input.hp') && form.querySelector('input.hp').value) { e.preventDefault(); return; }

      var action = form.getAttribute('action') || '';
      if (/\[\[TODO/.test(action)) {
        // No backend wired yet: keep the conversion flow testable.
        e.preventDefault();
        window.location.href = '/thanks';
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    });
  }

  /* ---------- Footer year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
