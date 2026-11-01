/* Пошта · motion engine (vanilla, shared by both variants) */
(function () {
  'use strict';
  var d = document, html = d.documentElement, W = window;
  var on = html.classList.contains('m-on');
  var fine = W.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var E = 'cubic-bezier(.16,1,.3,1)';

  /* fixed strip + header height -> --top-h */
  var top = d.querySelector('[data-top]');
  function setTop() { if (top) html.style.setProperty('--top-h', top.offsetHeight + 'px'); }
  setTop();
  if (top && 'ResizeObserver' in W) new ResizeObserver(setTop).observe(top);

  /* mobile menu (APG disclosure) */
  var mb = d.querySelector('[data-menu-btn]');
  if (mb) {
    var panel = d.getElementById(mb.getAttribute('aria-controls'));
    var setMenu = function (open) {
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
      html.classList.toggle('menu-open', open);
    };
    mb.addEventListener('click', function () { setMenu(mb.getAttribute('aria-expanded') !== 'true'); });
    if (panel) panel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mb.getAttribute('aria-expanded') === 'true') { setMenu(false); mb.focus(); } });
    W.matchMedia('(min-width: 1000px)').addEventListener('change', function () { setMenu(false); });
  }

  /* click-to-load map */
  d.querySelectorAll('[data-map]').forEach(function (box) {
    var b = box.querySelector('button');
    if (!b) return;
    b.addEventListener('click', function () {
      var f = d.createElement('iframe');
      f.src = box.getAttribute('data-map');
      f.title = box.getAttribute('data-title') || 'Карта';
      f.loading = 'lazy';
      f.setAttribute('allowfullscreen', '');
      box.innerHTML = '';
      box.appendChild(f);
      box.classList.add('map-on');
    });
  });

  if (!on) return;
  html.classList.add('m-ready');

  /* split headings into words (keeps NBSP joins) */
  function splitWords(el, step) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var n = 0, walker = d.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], t;
    while ((t = walker.nextNode())) nodes.push(t);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/([ \t\r\n]+)/), frag = d.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^[ \t\r\n]+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
        var w = d.createElement('span'), wi = d.createElement('span');
        w.className = 'w'; wi.className = 'wi';
        w.setAttribute('aria-hidden', 'true');
        wi.textContent = p;
        wi.style.transitionDelay = (n++ * step) + 'ms';
        w.appendChild(wi); frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  d.querySelectorAll('[data-rv="w"]').forEach(function (el) { splitWords(el, el.tagName === 'H1' ? 70 : 60); });

  /* stagger index from parent groups */
  d.querySelectorAll('[data-stagger]').forEach(function (g) {
    var i = 0;
    g.querySelectorAll('[data-rv]').forEach(function (c) { c.style.setProperty('--i', i++); });
  });

  /* curtain: release clip after it settles */
  d.querySelectorAll('[data-rv="cur"]').forEach(function (el) {
    el.addEventListener('transitionend', function (e) {
      if (e.target === el && e.propertyName === 'clip-path') el.classList.add('done');
    });
  });

  /* captions assembled from marks (T4) */
  var NOISE = '+-/\\|=<>*#:.';
  function marks(el) {
    var t = el.textContent, start = null, dur = 700;
    el.innerHTML = '';
    var sr = d.createElement('span'); sr.className = 'sr'; sr.textContent = t;
    var tw = d.createElement('span'); tw.setAttribute('aria-hidden', 'true');
    el.appendChild(sr); el.appendChild(tw);
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur), k = Math.floor(p * t.length), s = '';
      for (var i = 0; i < t.length; i++) s += (i < k || t[i] === ' ') ? t[i] : NOISE[(Math.random() * NOISE.length) | 0];
      tw.textContent = s;
      if (p < 1) requestAnimationFrame(frame); else el.textContent = t;
    }
    requestAnimationFrame(frame);
  }

  /* reveal list (rect based: clip-path never hides a box from the check) */
  var pending = [].slice.call(d.querySelectorAll('[data-rv]:not([data-hero])'));
  function show(el) {
    el.classList.add('in');
    if (el.hasAttribute('data-mk')) marks(el);
  }
  function sweep(all) {
    var vh = W.innerHeight, keep = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i], r = el.getBoundingClientRect();
      if (all || r.top < vh * 0.94) show(el); else keep.push(el);
    }
    pending = keep;
  }

  /* hero chain: 300 ms after DOMContentLoaded */
  function hero() {
    var h = [].slice.call(d.querySelectorAll('[data-hero]'));
    h.forEach(function (el) {
      var at = +el.getAttribute('data-hero') || 0;
      setTimeout(function () { show(el); }, at);
    });
  }

  /* scroll-linked pieces */
  var lights = [].slice.call(d.querySelectorAll('[data-light]'));
  lights.forEach(function (p) {
    var words = p.textContent.trim().split(/[ \t\r\n]+/);
    p.innerHTML = words.map(function (w) { return '<span class="lw">' + w + '</span>'; }).join(' ');
    p._w = [].slice.call(p.querySelectorAll('.lw'));
  });

  var panels = [].slice.call(d.querySelectorAll('[data-panel]'));
  var lanes = [].slice.call(d.querySelectorAll('[data-lane]'));
  var wide = W.matchMedia('(min-width: 900px)');

  function layLanes() {
    lanes.forEach(function (s) {
      var view = s.querySelector('.lane-view'), track = s.querySelector('.lane-track');
      track.style.transform = '';
      if (!wide.matches) { s.classList.remove('lane-on'); s.style.height = ''; s._max = 0; return; }
      s.classList.add('lane-on');
      var max = track.scrollWidth - view.clientWidth;
      var cap = (+s.getAttribute('data-lane') || 1.3) * W.innerHeight;
      var extra = Math.min(Math.max(max, 0), cap);
      s._max = Math.max(max, 0);
      var pin = s.querySelector('.lane-pin');
      s.style.height = (pin.offsetHeight + extra) + 'px';
    });
  }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function onScroll() {
    var vh = W.innerHeight;
    lights.forEach(function (p) {
      var r = p.getBoundingClientRect();
      var prog = clamp((vh * 0.88 - r.top) / (vh * 0.5));
      var n = p._w.length, f = prog * (n + 4);
      for (var i = 0; i < n; i++) p._w[i].style.opacity = (0.25 + 0.75 * clamp(f - i)).toFixed(3);
    });
    panels.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var prog = clamp((vh - r.top) / (vh * 0.6));
      var fxm = parseFloat(getComputedStyle(el).getPropertyValue('--fx-max')) || 48;
      el.style.setProperty('--fx', (fxm * (1 - prog)).toFixed(1) + 'px');
    });
    lanes.forEach(function (s) {
      if (!s.classList.contains('lane-on')) return;
      var r = s.getBoundingClientRect(), pin = s.querySelector('.lane-pin');
      var span = r.height - pin.offsetHeight;
      var prog = span > 0 ? clamp(-(r.top - (parseFloat(getComputedStyle(pin).top) || 0)) / span) : 0;
      s.querySelector('.lane-track').style.transform = 'translate3d(' + (-prog * s._max).toFixed(1) + 'px,0,0)';
      var bar = s.querySelector('.lane-bar i');
      if (bar) bar.style.transform = 'scaleX(' + prog.toFixed(4) + ')';
    });
  }

  var ticking = false;
  function tick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; sweep(false); onScroll(); });
  }

  /* cursor: tilt + light spot (fine pointer only) */
  if (fine) {
    var spot = d.querySelector('.spot'), tilts = [].slice.call(d.querySelectorAll('[data-tilt]'));
    var mx = 0, my = 0, raf = 0;
    var paint = function () {
      raf = 0;
      if (spot) spot.style.transform = 'translate3d(' + (mx - 300) + 'px,' + (my - 300) + 'px,0)';
      tilts.forEach(function (t) {
        var r = t.getBoundingClientRect();
        var dx = (mx - (r.left + r.width / 2)) / W.innerWidth, dy = (my - (r.top + r.height / 2)) / W.innerHeight;
        t.style.transform = 'perspective(900px) rotateY(' + (dx * 8).toFixed(2) + 'deg) rotateX(' + (-dy * 6).toFixed(2) + 'deg)';
      });
    };
    W.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    if (spot) spot.classList.add('spot-on');
  }

  function start() {
    layLanes();
    sweep(false);
    onScroll();
    setTimeout(hero, 300);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
  W.addEventListener('scroll', tick, { passive: true });
  W.addEventListener('resize', function () { layLanes(); tick(); });
  W.addEventListener('load', function () { layLanes(); tick(); });
  W.addEventListener('hashchange', function () { setTimeout(function () { sweep(false); onScroll(); }, 60); });
  W.addEventListener('beforeprint', function () { sweep(true); });
  wide.addEventListener('change', function () { layLanes(); onScroll(); });
})();
