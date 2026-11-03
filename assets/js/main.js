/* HBS — Progressive Enhancement (Vanilla, leichtgewichtig) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header-Zustand beim Scrollen */
  var header = document.getElementById('site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobiles Menü */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');
  var overlay = document.getElementById('mobile-menu-overlay');
  if (burger && menu) {
    var lastFocused = null;
    var focusables = function () {
      return Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])'));
    };
    var toggle = function (open) {
      menu.classList.toggle('open', open);
      if (overlay) overlay.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        lastFocused = document.activeElement;
        // Fokus erst setzen, wenn das Panel wirklich sichtbar ist (nicht waehrend der Transition)
        var f = focusables();
        if (f.length) {
          var moveFocus = function () { try { f[0].focus({ preventScroll: true }); } catch (e) { f[0].focus(); } };
          window.requestAnimationFrame(function () { window.requestAnimationFrame(moveFocus); });
          menu.addEventListener('transitionend', function once (ev) {
            if (ev.target !== menu) return;
            menu.removeEventListener('transitionend', once);
            if (menu.classList.contains('open') && !menu.contains(document.activeElement)) moveFocus();
          });
        }
      } else if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
        lastFocused = null;
      }
    };
    burger.addEventListener('click', function () { toggle(!menu.classList.contains('open')); });
    if (overlay) overlay.addEventListener('click', function () { toggle(false); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { toggle(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { toggle(false); return; }
      if (e.key !== 'Tab') return;
      // Fokus im geöffneten Menü halten
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // Menü schließen, wenn auf Desktop-Breite gewechselt wird
    var mq = window.matchMedia('(min-width:1001px)');
    var onMq = function (ev) { if (ev.matches && menu.classList.contains('open')) toggle(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
  }

  /* FAQ-Akkordeon (tastaturbedienbar via <button>) */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    var setOpen = function (open) {
      item.classList.toggle('open', open);
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : null;
    };
    if (item.classList.contains('open')) setOpen(true);
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        if (o !== item) { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; o.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); }
      });
      setOpen(!isOpen);
    });
  });

  /* Reveal / Stagger */
  var revealEls = document.querySelectorAll('.reveal, .stagger');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* Hero-Video: Quellen sind direkt im HTML (robust, auch ohne JS).
     JS sichert zuverlaessiges muted-Autoplay. Poster (poster-Attribut) bleibt
     nur bei reduced-motion oder echtem Wiedergabefehler sichtbar. */
  function initHeroVideo() {
    var hv = document.querySelector('.hero-video');
    if (!hv) return;
    if (reduce) { try { hv.removeAttribute('autoplay'); hv.pause(); } catch (e) {} return; }

    hv.muted = true;
    hv.defaultMuted = true;
    hv.setAttribute('muted', '');

    hv.addEventListener('playing', function () { hv.classList.add('video-playing'); });

    var armInteraction = function () {
      var evts = ['pointerdown', 'touchstart', 'keydown', 'click'];
      var once = function () {
        hv.play().catch(function () {});
        evts.forEach(function (ev) { window.removeEventListener(ev, once); });
      };
      evts.forEach(function (ev) { window.addEventListener(ev, once, { once: true, passive: true }); });
    };
    var attempt = function () {
      var p = hv.play();
      if (p && typeof p.then === 'function') {
        p.then(function () { hv.classList.add('video-playing'); })
         .catch(function () { armInteraction(); }); // Autoplay blockiert -> nach erster Interaktion erneut
      }
    };

    hv.load();
    attempt();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeroVideo);
  else initHeroVideo();
})();
