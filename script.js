/* ─────────────────────────────────────────────────────
   TMU CTLD Conference — script.js
───────────────────────────────────────────────────── */
(function () {
    "use strict";

    /* ══════════════════════════════════════════════════
     1. SPLASH SCREEN + HERO ENTRANCE
  ══════════════════════════════════════════════════ */
    const splash = document.getElementById("splash");
    const heroAnims = document.querySelectorAll('[data-anim="hero"]');

    function dismissSplash() {
        splash.classList.add("hidden");
        // Trigger hero column entrance animations after splash fades
        setTimeout(() => {
            heroAnims.forEach((el) => el.classList.add("anim-in"));
        }, 150);
    }

    // Dismiss on full page load (all resources ready)
    window.addEventListener("load", () => {
        // Show at least 1.0 s so the spinner is visible and intentional
        const minTime = 1000;
        const elapsed = performance.now();
        const wait = Math.max(0, minTime - elapsed);
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
        document.querySelectorAll("img").forEach((img) => {
            const wrapper = img.closest(".img-loader");
            if (!wrapper) return;
            if (img.complete && img.naturalWidth) {
                wrapper.classList.add("loaded");
            } else {
                img.addEventListener("load", () =>
                    wrapper.classList.add("loaded"),
                );
                img.addEventListener("error", () =>
                    wrapper.classList.add("loaded"),
                );
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
        const canvas = document.getElementById("heroCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const COUNT = 100;
        const CONNECT = 130;
        const SPEED = 0.35;
        const MOUSE_S = 55;

        let W,
            H,
            paused = false;
        const mouse = { x: 0, y: 0 };
        let raf;

        function resize() {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        }
        function mkP() {
            const z = Math.random();
            return {
                x: Math.random() * W,
                y: Math.random() * H,
                z,
                vx: (Math.random() - 0.5) * SPEED,
                vy: (Math.random() - 0.5) * SPEED * 0.6,
                zv: (Math.random() - 0.5) * 0.003,
                phase: Math.random() * Math.PI * 2,
            };
        }

        let pts = [];
        function reset() {
            resize();
            pts = Array.from({ length: COUNT }, mkP);
        }
        reset();
        window.addEventListener("resize", () => {
            resize();
            pts.forEach((p) => {
                if (p.x > W) p.x = W;
                if (p.y > H) p.y = H;
            });
        });

        const heroEl = document.getElementById("hero");
        heroEl.addEventListener("mousemove", (e) => {
            const r = heroEl.getBoundingClientRect();
            mouse.x = (e.clientX - r.left - W / 2) / W;
            mouse.y = (e.clientY - r.top - H / 2) / H;
        });
        heroEl.addEventListener("mouseleave", () => {
            mouse.x = 0;
            mouse.y = 0;
        });

        new IntersectionObserver(
            (entries) => {
                paused = !entries[0].isIntersecting;
                if (!paused) tick();
            },
            { threshold: 0.01 },
        ).observe(heroEl);

        function tick() {
            if (paused) return;
            ctx.clearRect(0, 0, W, H);
            const t = performance.now() * 0.001;

            pts.forEach((p, i) => {
                p.x += p.vx + mouse.x * p.z * MOUSE_S * 0.02;
                p.y += p.vy + mouse.y * p.z * MOUSE_S * 0.012;
                p.z += p.zv;
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H;
                if (p.y > H) p.y = 0;
                if (p.z < 0.02 || p.z > 1) p.zv *= -1;
                p.z = Math.max(0.02, Math.min(1, p.z));

                const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + p.phase);
                const alpha = p.z * 0.8 * tw;
                const radius = 1.2 + p.z * 2.8;

                // Edges
                for (let j = i + 1; j < pts.length; j++) {
                    const o = pts[j];
                    const dx = p.x - o.x,
                        dy = p.y - o.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT) {
                        const la =
                            (1 - dist / CONNECT) * Math.min(p.z, o.z) * 0.4;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(o.x, o.y);
                        ctx.strokeStyle = `rgba(255,255,255,${la})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }

                // Glow + dot
                const r = Math.round(200 + p.z * 55),
                    g = Math.round(160 + p.z * 50),
                    b = Math.round(100 + p.z * 155);
                const grd = ctx.createRadialGradient(
                    p.x,
                    p.y,
                    0,
                    p.x,
                    p.y,
                    radius * 3,
                );
                grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
                grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.fill();
            });
            raf = requestAnimationFrame(tick);
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            tick();
            cancelAnimationFrame(raf);
        } else {
            tick();
        }
    })();

    /* ══════════════════════════════════════════════════
     4. NAVBAR — scroll glass + active link
  ══════════════════════════════════════════════════ */
    const navbar = document.getElementById("navbar");
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".section[id]");

    function onScroll() {
        navbar.classList.toggle("scrolled", window.scrollY > 60);
        let current = "";
        sections.forEach((sec) => {
            if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
        });
        navLinks.forEach((link) => {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === `#${current}`,
            );
        });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ══════════════════════════════════════════════════
     5. SMOOTH SCROLL
  ══════════════════════════════════════════════════ */
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const id = this.getAttribute("href");
            if (id === "#") return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            window.scrollTo({
                top: target.getBoundingClientRect().top + window.scrollY - 80,
                behavior: "smooth",
            });
        });
    });

    /* ══════════════════════════════════════════════════
     6. MOBILE MENU
  ══════════════════════════════════════════════════ */
    const hamburger = document.getElementById("hamburger");
    const navLinksList = document.getElementById("nav-links");
    const overlay = document.getElementById("mobile-overlay");

    function openMenu() {
        navLinksList.classList.add("active");
        overlay.classList.add("active");
        overlay.removeAttribute("aria-hidden");
        hamburger.classList.add("active");
        hamburger.setAttribute("aria-expanded", "true");
        hamburger.setAttribute("aria-label", "Close menu");
        document.body.style.overflow = "hidden";
    }
    function closeMenu() {
        navLinksList.classList.remove("active");
        overlay.classList.remove("active");
        overlay.setAttribute("aria-hidden", "true");
        hamburger.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.setAttribute("aria-label", "Open menu");
        document.body.style.overflow = "";
    }

    hamburger.addEventListener("click", () => {
        hamburger.getAttribute("aria-expanded") === "true"
            ? closeMenu()
            : openMenu();
    });
    overlay.addEventListener("click", closeMenu);
    navLinks.forEach((link) => link.addEventListener("click", closeMenu));
    // Close when drawer CTA is tapped
    const drawerCta = document.getElementById("nav-drawer-cta");
    if (drawerCta) drawerCta.addEventListener("click", closeMenu);
    // Close when the dedicated × button is tapped
    const closeBtn = document.getElementById("nav-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
    });

    /* ══════════════════════════════════════════════════
     7. TRACK TABS + KEYBOARD NAV
  ══════════════════════════════════════════════════ */
    const trackTabs = document.querySelectorAll(".tracks-tab");
    const trackPanes = document.querySelectorAll(".tracks-pane");
    const trackPips = document.querySelectorAll(".track-pip");
    const tracksCurrent = document.getElementById("tracks-current");

    // Bottom-sheet elements
    const sheetTrigger = document.getElementById("tracks-sheet-trigger");
    const sheet = document.getElementById("tracks-sheet");
    const sheetOverlay = document.getElementById("tracks-sheet-overlay");
    const sheetHandle = document.getElementById("tracks-sheet-handle");
    const sheetItems = document.querySelectorAll(".tracks-sheet-item");
    const sheetLabel = document.getElementById("tracks-sheet-label");
    const sheetNumBadge = sheetTrigger
        ? sheetTrigger.querySelector(".tracks-sheet-trigger-num")
        : null;

    /* Track names for the trigger label */
    const TRACK_NAMES = {
        1: ["01", "Learning & Pedagogy"],
        2: ["02", "Leadership"],
        3: ["03", "Skills & Employability"],
        4: ["04", "Tech & Innovation"],
        5: ["05", "Sustainability"],
        6: ["06", "Global Perspectives"],
    };

    /* ── Scroll lock (no position:fixed — avoids scroll-position reset) ── */
    function lockBodyScroll() {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }
    function unlockBodyScroll() {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
    }

    function openSheet() {
        if (!sheet) return;
        sheet.removeAttribute("aria-hidden");
        sheet.classList.add("open");
        sheetOverlay.style.display = "block";
        requestAnimationFrame(() => sheetOverlay.classList.add("open"));
        if (sheetTrigger) sheetTrigger.setAttribute("aria-expanded", "true");
        lockBodyScroll();
    }
    function closeSheet() {
        if (!sheet) return;
        sheet.classList.remove("open");
        sheetOverlay.classList.remove("open");
        if (sheetTrigger) sheetTrigger.setAttribute("aria-expanded", "false");
        sheet.setAttribute("aria-hidden", "true");
        unlockBodyScroll();
        setTimeout(() => {
            sheetOverlay.style.display = "none";
        }, 360);
    }

    if (sheetTrigger) sheetTrigger.addEventListener("click", openSheet);
    if (sheetOverlay) sheetOverlay.addEventListener("click", closeSheet);

    /* ── Drag-to-dismiss on the handle bar ── */
    if (sheetHandle && sheet) {
        let startY = 0,
            currentY = 0,
            dragging = false;

        function onDragStart(e) {
            dragging = true;
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            sheet.style.transition = "none";
        }
        function onDragMove(e) {
            if (!dragging) return;
            currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const delta = Math.max(0, currentY - startY); // only downward
            sheet.style.transform = `translateY(${delta}px)`;
        }
        function onDragEnd() {
            if (!dragging) return;
            dragging = false;
            sheet.style.transition = "";
            sheet.style.transform = "";
            const delta = currentY - startY;
            if (delta > 80) {
                closeSheet();
            }
            // else snap back (CSS transition handles it via .open re-applied)
        }

        sheetHandle.addEventListener("touchstart", onDragStart, {
            passive: true,
        });
        sheetHandle.addEventListener("touchmove", onDragMove, {
            passive: true,
        });
        sheetHandle.addEventListener("touchend", onDragEnd, { passive: true });
        // Mouse drag (desktop dev/testing)
        sheetHandle.addEventListener("mousedown", onDragStart);
        window.addEventListener("mousemove", (e) => {
            if (dragging) onDragMove(e);
        });
        window.addEventListener("mouseup", (e) => {
            if (dragging) onDragEnd(e);
        });
    }

    function switchTrack(num) {
        const n = String(num);
        // Desktop tabs
        trackTabs.forEach((t) => {
            const active = t.dataset.track === n;
            t.classList.toggle("active", active);
            t.setAttribute("aria-selected", active ? "true" : "false");
        });
        // Panes
        trackPanes.forEach((p) =>
            p.classList.toggle("active", p.id === `tracks-pane-${n}`),
        );
        // Pips
        trackPips.forEach((p) =>
            p.classList.toggle("active", p.dataset.track === n),
        );
        // Counter
        if (tracksCurrent) tracksCurrent.textContent = n;

        // Mobile bottom-sheet: update trigger label + sheet item highlight
        if (TRACK_NAMES[n]) {
            if (sheetNumBadge) sheetNumBadge.textContent = TRACK_NAMES[n][0];
            if (sheetLabel) sheetLabel.textContent = TRACK_NAMES[n][1];
        }
        sheetItems.forEach((item) => {
            const active = item.dataset.track === n;
            item.classList.toggle("active", active);
            item.setAttribute("aria-selected", active ? "true" : "false");
        });
    }

    trackTabs.forEach((btn) =>
        btn.addEventListener("click", () => switchTrack(btn.dataset.track)),
    );
    trackPips.forEach((pip) =>
        pip.addEventListener("click", () => switchTrack(pip.dataset.track)),
    );

    const trackPrevBtn = document.getElementById("track-prev-btn");
    const trackNextBtn = document.getElementById("track-next-btn");

    if (trackPrevBtn && trackNextBtn) {
        trackPrevBtn.addEventListener("click", () => {
            const currentTab = Array.from(trackTabs).findIndex((t) =>
                t.classList.contains("active"),
            );
            if (currentTab !== -1) {
                const prev =
                    (currentTab - 1 + trackTabs.length) % trackTabs.length;
                switchTrack(trackTabs[prev].dataset.track);
            }
        });
        trackNextBtn.addEventListener("click", () => {
            const currentTab = Array.from(trackTabs).findIndex((t) =>
                t.classList.contains("active"),
            );
            if (currentTab !== -1) {
                const next = (currentTab + 1) % trackTabs.length;
                switchTrack(trackTabs[next].dataset.track);
            }
        });
    }

    // Bottom-sheet item selection
    sheetItems.forEach((item) => {
        item.addEventListener("click", () => {
            switchTrack(item.dataset.track);
            closeSheet();
        });
    });

    // Keyboard navigation on the rail
    const tracksRail = document.querySelector(".tracks-rail");
    if (tracksRail) {
        tracksRail.addEventListener("keydown", (e) => {
            const cur = [...trackTabs].indexOf(document.activeElement);
            if (cur === -1) return;
            let next = -1;
            if (e.key === "ArrowDown" || e.key === "ArrowRight")
                next = (cur + 1) % trackTabs.length;
            if (e.key === "ArrowUp" || e.key === "ArrowLeft")
                next = (cur - 1 + trackTabs.length) % trackTabs.length;
            if (next >= 0) {
                e.preventDefault();
                trackTabs[next].focus();
                trackTabs[next].click();
            }
        });
    }

    /* ══════════════════════════════════════════════════
     8. SCROLL REVEAL
  ══════════════════════════════════════════════════ */
    if ("IntersectionObserver" in window) {
        const revealObs = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
        );
        document
            .querySelectorAll(".reveal")
            .forEach((el) => revealObs.observe(el));
    } else {
        document
            .querySelectorAll(".reveal")
            .forEach((el) => el.classList.add("visible"));
    }

    /* ══════════════════════════════════════════════════
     10. POSTER MODAL
  ══════════════════════════════════════════════════ */
    const posterTrigger = document.getElementById("cfp-poster-trigger");
    const posterModal = document.getElementById("cfp-poster-modal");
    const posterCloseBg = document.getElementById("cfp-modal-close-bg");
    const posterCloseBtn = document.getElementById("cfp-modal-close-btn");

    if (posterTrigger && posterModal) {
        const openPoster = () => {
            posterModal.classList.add("active");
            posterModal.setAttribute("aria-hidden", "false");
            lockBodyScroll();
        };

        const closePoster = () => {
            posterModal.classList.remove("active");
            posterModal.setAttribute("aria-hidden", "true");
            unlockBodyScroll();
        };

        posterTrigger.addEventListener("click", openPoster);
        posterTrigger.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPoster();
            }
        });

        if (posterCloseBg) posterCloseBg.addEventListener("click", closePoster);
        if (posterCloseBtn)
            posterCloseBtn.addEventListener("click", closePoster);

        document.addEventListener("keydown", (e) => {
            if (
                e.key === "Escape" &&
                posterModal.classList.contains("active")
            ) {
                closePoster();
            }
        });
    }

    /* ══════════════════════════════════════════════════
     11. OBJ CARD STAGGER
     Parallax removed — hero background is fully static,
     controlled only by CSS. This prevents any scroll-
     driven image shift or snap-back entirely.
  ══════════════════════════════════════════════════ */

    document.querySelectorAll(".obj-card").forEach((card, i) => {
        card.style.setProperty("--delay", `${i * 0.1}s`);
    });
})();
