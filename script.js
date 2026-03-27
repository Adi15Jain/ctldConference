/* ─────────────────────────────────────────────────────
   TMU CTLD Conference — script.js
───────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     1. SPLASH SCREEN + HERO ENTRANCE
  ══════════════════════════════════════════════════ */
  const splash     = document.getElementById('splash');
  const heroAnims  = document.querySelectorAll('[data-anim="hero"]');

  function dismissSplash() {
    splash.classList.add('hidden');
    // Trigger hero column entrance animations after splash fades
    setTimeout(() => {
      heroAnims.forEach(el => el.classList.add('anim-in'));
    }, 150);
  }

  // Dismiss on full page load (all resources ready)
  window.addEventListener('load', () => {
    // Show at least 1.0 s so the spinner is visible and intentional
    const minTime = 1000;
    const elapsed = performance.now();
    const wait    = Math.max(0, minTime - elapsed);
    setTimeout(dismissSplash, wait);
  });

  // Fallback — if load fires very late, cap at 4 s
  setTimeout(dismissSplash, 4000);


  /* ══════════════════════════════════════════════════
     2. IMAGE LOADING INDICATORS
     Wrap every <img> whose parent has .img-loader,
     OR automatically apply to hero-bg-img
  ══════════════════════════════════════════════════ */
  function watchImages() {
    document.querySelectorAll('img').forEach(img => {
      const wrapper = img.closest('.img-loader');
      if (!wrapper) return;
      if (img.complete && img.naturalWidth) {
        wrapper.classList.add('loaded');
      } else {
        img.addEventListener('load',  () => wrapper.classList.add('loaded'));
        img.addEventListener('error', () => wrapper.classList.add('loaded'));
      }
    });
  }
  watchImages();


  /* ══════════════════════════════════════════════════
     3. HERO PARTICLE SYSTEM (pure Canvas 2D)
     Floating 3D-style particles with depth, edges,
     mouse parallax, and warm/cool Z-gradient colour.
  ══════════════════════════════════════════════════ */
  (function initParticles() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COUNT   = 100;
    const CONNECT = 130;
    const SPEED   = 0.35;
    const MOUSE_S = 55;

    let W, H, paused = false;
    const mouse = { x: 0, y: 0 };
    let raf;

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    function mkP() {
      const z = Math.random();
      return { x: Math.random() * W, y: Math.random() * H, z,
               vx: (Math.random() - 0.5) * SPEED,
               vy: (Math.random() - 0.5) * SPEED * 0.6,
               zv: (Math.random() - 0.5) * 0.003,
               phase: Math.random() * Math.PI * 2 };
    }

    let pts = [];
    function reset() { resize(); pts = Array.from({ length: COUNT }, mkP); }
    reset();
    window.addEventListener('resize', () => { resize(); pts.forEach(p => { if (p.x > W) p.x = W; if (p.y > H) p.y = H; }); });

    const heroEl = document.getElementById('hero');
    heroEl.addEventListener('mousemove', e => {
      const r = heroEl.getBoundingClientRect();
      mouse.x = (e.clientX - r.left - W / 2) / W;
      mouse.y = (e.clientY - r.top  - H / 2) / H;
    });
    heroEl.addEventListener('mouseleave', () => { mouse.x = 0; mouse.y = 0; });

    new IntersectionObserver(entries => {
      paused = !entries[0].isIntersecting;
      if (!paused) tick();
    }, { threshold: 0.01 }).observe(heroEl);

    function tick() {
      if (paused) return;
      ctx.clearRect(0, 0, W, H);
      const t = performance.now() * 0.001;

      pts.forEach((p, i) => {
        p.x += p.vx + mouse.x * p.z * MOUSE_S * 0.02;
        p.y += p.vy + mouse.y * p.z * MOUSE_S * 0.012;
        p.z += p.zv;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        if (p.z < 0.02 || p.z > 1) p.zv *= -1;
        p.z = Math.max(0.02, Math.min(1, p.z));

        const tw     = 0.6 + 0.4 * Math.sin(t * 1.5 + p.phase);
        const alpha  = p.z * 0.8 * tw;
        const radius = 1.2 + p.z * 2.8;

        // Edges
        for (let j = i + 1; j < pts.length; j++) {
          const o = pts[j];
          const dx = p.x - o.x, dy = p.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT) {
            const la = (1 - dist / CONNECT) * Math.min(p.z, o.z) * 0.4;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = `rgba(255,255,255,${la})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }

        // Glow + dot
        const r = Math.round(200 + p.z * 55), g = Math.round(160 + p.z * 50), b = Math.round(100 + p.z * 155);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
        grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath(); ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tick(); cancelAnimationFrame(raf);
    } else {
      tick();
    }
  })();


  /* ══════════════════════════════════════════════════
     4. NAVBAR — scroll glass + active link
  ══════════════════════════════════════════════════ */
  const navbar   = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section[id]');

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    let current = '';
    sections.forEach(sec => { if (window.scrollY >= sec.offsetTop - 120) current = sec.id; });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  /* ══════════════════════════════════════════════════
     5. SMOOTH SCROLL
  ══════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });


  /* ══════════════════════════════════════════════════
     6. MOBILE MENU
  ══════════════════════════════════════════════════ */
  const hamburger    = document.getElementById('hamburger');
  const navLinksList = document.getElementById('nav-links');
  const overlay      = document.getElementById('mobile-overlay');

  function openMenu() {
    navLinksList.classList.add('active');
    overlay.classList.add('active');
    overlay.removeAttribute('aria-hidden');
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    navLinksList.classList.remove('active');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    hamburger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  overlay.addEventListener('click', closeMenu);
  navLinks.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });


  /* ══════════════════════════════════════════════════
     7. TRACK TABS + KEYBOARD NAV
  ══════════════════════════════════════════════════ */
  const tabBtns  = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const pane = document.getElementById(`tab-${target}`);
      if (pane) pane.classList.add('active');
    });
  });

  const tabsRail = document.querySelector('.tabs-rail');
  if (tabsRail) {
    tabsRail.addEventListener('keydown', e => {
      const cur = [...tabBtns].indexOf(document.activeElement);
      if (cur === -1) return;
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % tabBtns.length;
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   next = (cur - 1 + tabBtns.length) % tabBtns.length;
      if (next >= 0) { e.preventDefault(); tabBtns[next].focus(); tabBtns[next].click(); }
    });
  }


  /* ══════════════════════════════════════════════════
     8. SCROLL REVEAL
  ══════════════════════════════════════════════════ */
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }


  /* ══════════════════════════════════════════════════
     9. HERO BG PARALLAX + OBJ STAGGER
  ══════════════════════════════════════════════════ */
  const heroBg = document.querySelector('.hero-bg-img');
  if (heroBg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight)
        heroBg.style.transform = `scale(1.06) translateY(${window.scrollY * 0.22}px)`;
    }, { passive: true });
  }

  document.querySelectorAll('.obj-card').forEach((card, i) => {
    card.style.setProperty('--delay', `${i * 0.1}s`);
  });

})();
