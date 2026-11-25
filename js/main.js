/* ============================================================
   FIVE HORIZONS — interactions, consent, Meta Pixel
   Pixel ID comes from <meta name="fb-pixel-id">.
   The pixel is NEVER loaded before explicit consent.
   ============================================================ */
(function () {
  'use strict';

  var CONSENT_KEY = 'fivehorizons_consent_v1';
  var CONSENT_VERSION = 1;
  var meta = document.querySelector('meta[name="fb-pixel-id"]');
  var PIXEL_ID = meta && meta.getAttribute('content') ? meta.getAttribute('content').trim() : '';
  var pixelValid = /^\d{8,20}$/.test(PIXEL_ID);
  var pixelLoaded = false;

  var banner = document.getElementById('cookieBanner');
  var acceptBtn = document.getElementById('cookieAccept');
  var rejectBtn = document.getElementById('cookieReject');
  var closeBtn = document.getElementById('cookieClose');
  var settingsBtns = document.querySelectorAll('[data-cookie-settings]');
  var debug = /[?&]debug=1/.test(window.location.search);

  function log() {
    if (!debug) return;
    try { console.log.apply(console, ['[Five Horizons]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.value === 'string') return parsed.value;
      return raw === 'granted' || raw === 'denied' ? raw : null;
    } catch (e) { return null; }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ value: value, version: CONSENT_VERSION, ts: new Date().toISOString() }));
    } catch (e) {}
  }

  function initPixel() {
    if (!pixelValid || pixelLoaded) return false;
    pixelLoaded = true;

    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    window.fbq('track', 'ViewContent', {
      content_name: 'Five Horizons travel guides',
      content_category: 'Travel books',
      content_type: 'product',
      content_ids: ['B0HRVRKDC7', 'B0HPKJYWR5', 'B0GQZ4JH5M', 'B0HLJB6Q3L', 'B0FPCBSRWN'],
      contents: [
        { id: 'B0HRVRKDC7', quantity: 1, item_price: 99.00 },
        { id: 'B0HPKJYWR5', quantity: 1, item_price: 99.00 },
        { id: 'B0GQZ4JH5M', quantity: 1, item_price: 99.00 },
        { id: 'B0HLJB6Q3L', quantity: 1, item_price: 99.00 },
        { id: 'B0FPCBSRWN', quantity: 1, item_price: 99.00 }
      ],
      value: 495.00,
      currency: 'EUR'
    });
    log('pixel initialised', PIXEL_ID);
    return true;
  }

  function trackLead(el) {
    var asin = el.getAttribute('data-asin') || '';
    var title = el.getAttribute('data-title') || 'Travel guide';
    var price = parseFloat(el.getAttribute('data-price') || '99');
    var currency = el.getAttribute('data-currency') || 'EUR';
    var payload = {
      content_name: title,
      content_category: 'Travel books',
      content_type: 'product',
      content_ids: asin ? [asin] : [],
      contents: asin ? [{ id: asin, quantity: 1, item_price: price }] : [],
      value: price,
      currency: currency
    };

    if (pixelLoaded && typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', payload);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'lead',
        lead_source: 'amazon_button',
        content_name: title,
        content_ids: asin,
        value: price,
        currency: currency
      });
      log('Lead', payload);
    } else {
      log('Lead skipped — no consent or pixel not loaded', payload);
    }
    return payload;
  }

  function showBanner(focus) {
    if (!banner) return;
    banner.hidden = false;
    if (focus && acceptBtn) acceptBtn.focus({ preventScroll: true });
  }

  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
  }

  function clearPixelCookies() {
    ['_fbp', '_fbc'].forEach(function (name) {
      document.cookie = name + '=; Max-Age=0; path=/';
      document.cookie = name + '=; Max-Age=0; path=/; domain=' + window.location.hostname;
      document.cookie = name + '=; Max-Age=0; path=/; domain=.' + window.location.hostname;
    });
  }

  function decide(value) {
    var previous = readConsent();
    writeConsent(value);
    hideBanner();
    if (value === 'granted') {
      initPixel();
    } else if (previous === 'granted') {
      clearPixelCookies();
      if (pixelLoaded) window.location.reload();
    }
    document.dispatchEvent(new CustomEvent('fivehorizons:consent', { detail: { value: value } }));
    log('consent', value);
  }

  if (acceptBtn) acceptBtn.addEventListener('click', function () { decide('granted'); });
  if (rejectBtn) rejectBtn.addEventListener('click', function () { decide('denied'); });
  if (closeBtn) closeBtn.addEventListener('click', function () { decide('denied'); });
  Array.prototype.forEach.call(settingsBtns, function (btn) {
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      showBanner(true);
    });
  });

  var stored = readConsent();
  if (stored === 'granted') {
    initPixel();
  } else if (stored === null) {
    window.setTimeout(function () { showBanner(false); }, 700);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-lead]'), function (link) {
    link.addEventListener('click', function () { trackLead(link); });
    link.addEventListener('auxclick', function (event) {
      if (event.button === 1) trackLead(link);
    });
  });

  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.style.boxShadow = window.scrollY > 8 ? '0 18px 40px -30px rgba(0,0,0,.8)' : 'none';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var revealNodes = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealNodes.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    Array.prototype.forEach.call(revealNodes, function (node) { io.observe(node); });
  } else {
    Array.prototype.forEach.call(revealNodes, function (node) { node.classList.add('is-in'); });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  window.FiveHorizons = {
    pixelId: PIXEL_ID,
    getConsent: readConsent,
    isPixelLoaded: function () { return pixelLoaded; },
    initPixel: initPixel,
    trackLead: trackLead,
    openConsent: function () { showBanner(true); },
    clearConsent: function () { try { window.localStorage.removeItem(CONSENT_KEY); } catch (e) {} }
  };

  if (!pixelValid) console.warn('[Five Horizons] Missing or invalid Meta Pixel ID.');
})();
