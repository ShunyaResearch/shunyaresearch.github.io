/* ==================================================================
   SHUNYA RESEARCH // runtime
   theme . voidfield . automaton . reveals . readouts
   ================================================================== */

(function () {
    'use strict';

    var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ----------------------------------------------------------
       theme — tamas (dark) is the ground state
    ---------------------------------------------------------- */

    function applyTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        try { localStorage.setItem('shunya-theme', dark ? 'dark' : 'light'); } catch (e) {}
    }

    window.toggleDarkMode = function () {
        applyTheme(!document.body.classList.contains('dark-mode'));
    };

    var stored = null;
    try { stored = localStorage.getItem('shunya-theme'); } catch (e) {}
    applyTheme(stored ? stored === 'dark' : true);

    /* ----------------------------------------------------------
       mobile nav — right-hand drawer
    ---------------------------------------------------------- */

    var navBtn = document.querySelector('.nav-toggle');

    function closeNav() {
        document.body.classList.remove('nav-open');
        if (navBtn) navBtn.setAttribute('aria-expanded', 'false');
    }

    window.toggleNav = function () {
        var open = document.body.classList.toggle('nav-open');
        if (navBtn) navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    if (navBtn) {
        var scrim = document.createElement('div');
        scrim.className = 'nav-scrim';
        scrim.addEventListener('click', closeNav);
        document.body.appendChild(scrim);

        document.querySelectorAll('.topbar nav a').forEach(function (a) {
            a.addEventListener('click', closeNav);
        });

        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeNav();
        });
    }

    /* ----------------------------------------------------------
       palette readout for canvases
    ---------------------------------------------------------- */

    function palette() {
        var s = getComputedStyle(document.body);
        return {
            void_: s.getPropertyValue('--void').trim(),
            raise: s.getPropertyValue('--void-raise').trim(),
            ink: s.getPropertyValue('--ink').trim(),
            steel: s.getPropertyValue('--steel').trim(),
            volt: s.getPropertyValue('--volt-raw').trim(),
            gridLine: s.getPropertyValue('--grid-line').trim()
        };
    }

    /* ----------------------------------------------------------
       voidfield — spacetime grid warped by gravity wells
    ---------------------------------------------------------- */

    var field = document.querySelector('.voidfield');
    if (field) {
        var fctx = field.getContext('2d');
        var W = 0, H = 0, DPR = 1;
        var mouse = { x: 0.5, y: 0.5 };
        var eased = { x: 0.5, y: 0.5 };

        function fresize() {
            DPR = Math.min(window.devicePixelRatio || 1, 2);
            W = field.clientWidth;
            H = field.clientHeight;
            field.width = W * DPR;
            field.height = H * DPR;
            fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }

        window.addEventListener('resize', fresize);
        fresize();

        window.addEventListener('pointermove', function (e) {
            /* fraction within the canvas itself, not the whole viewport —
               the hero (and its canvas) is often shorter than window.innerHeight */
            var rect = field.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left) / rect.width;
            mouse.y = (e.clientY - rect.top) / rect.height;
        });

        function wells(t) {
            return [
                { x: eased.x * W, y: eased.y * H, s: Math.min(W, H) * 0.42, g: 1 },
                {
                    x: W * (0.72 + 0.1 * Math.sin(t * 0.00013)),
                    y: H * (0.3 + 0.12 * Math.cos(t * 0.00011)),
                    s: Math.min(W, H) * 0.3,
                    g: 0.7
                }
            ];
        }

        function warp(x, y, ws) {
            var dx = 0, dy = 0;
            for (var i = 0; i < ws.length; i++) {
                var w = ws[i];
                var ax = x - w.x, ay = y - w.y;
                var r2 = ax * ax + ay * ay;
                var s2 = w.s * w.s;
                /* displacement is linear in distance near the center, so
                   points never overshoot the well and tangle */
                var k = w.g * 0.38 * Math.exp(-r2 / s2);
                dx -= ax * k;
                dy -= ay * k;
            }
            return [x + dx, y + dy];
        }

        function drawField(t) {
            eased.x += (mouse.x - eased.x) * 0.18;
            eased.y += (mouse.y - eased.y) * 0.18;

            var pal = palette();
            fctx.clearRect(0, 0, W, H);

            var ws = wells(t);
            var GAP = 44;
            var STEP = 14;
            var cols = Math.ceil(W / GAP) + 2;
            var rows = Math.ceil(H / GAP) + 2;

            fctx.lineWidth = 1;
            fctx.strokeStyle = pal.gridLine;

            var r, c, x, y, p, first;

            for (r = 0; r <= rows; r++) {
                y = r * GAP;
                fctx.beginPath();
                first = true;
                for (x = -GAP; x <= W + GAP; x += STEP) {
                    p = warp(x, y, ws);
                    if (first) { fctx.moveTo(p[0], p[1]); first = false; }
                    else fctx.lineTo(p[0], p[1]);
                }
                fctx.stroke();
            }

            for (c = 0; c <= cols; c++) {
                x = c * GAP;
                fctx.beginPath();
                first = true;
                for (y = -GAP; y <= H + GAP; y += STEP) {
                    p = warp(x, y, ws);
                    if (first) { fctx.moveTo(p[0], p[1]); first = false; }
                    else fctx.lineTo(p[0], p[1]);
                }
                fctx.stroke();
            }
        }

        if (REDUCED) {
            drawField(0);
            /* redraw once on theme flips so colors stay true */
            new MutationObserver(function () { drawField(0); })
                .observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } else {
            (function floop(t) {
                drawField(t || 0);
                requestAnimationFrame(floop);
            })(0);
        }
    }

    /* ----------------------------------------------------------
       automaton — B3/S23, age-shaded, click to disturb
    ---------------------------------------------------------- */

    var gol = document.getElementById('gol');
    if (gol) {
        var gctx = gol.getContext('2d');
        var CELL = 7;
        var gcols, grows, grid, gnext, age;
        var gen = 0, pop = 0;
        var genEl = document.getElementById('gol-gen');
        var popEl = document.getElementById('gol-pop');

        function ginit() {
            var w = gol.clientWidth || 760;
            gol.width = w;
            gol.height = gol.clientHeight || 240;
            gcols = Math.floor(gol.width / CELL);
            grows = Math.floor(gol.height / CELL);
            grid = [];
            gnext = [];
            age = [];
            for (var r = 0; r < grows; r++) {
                grid.push(new Array(gcols));
                gnext.push(new Array(gcols).fill(0));
                age.push(new Array(gcols).fill(0));
                for (var c = 0; c < gcols; c++) {
                    grid[r][c] = Math.random() < 0.22 ? 1 : 0;
                }
            }
            gen = 0;
        }

        function gstep() {
            pop = 0;
            for (var r = 0; r < grows; r++) {
                for (var c = 0; c < gcols; c++) {
                    var n = 0;
                    for (var dr = -1; dr <= 1; dr++) {
                        for (var dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            n += grid[(r + dr + grows) % grows][(c + dc + gcols) % gcols];
                        }
                    }
                    var alive = grid[r][c];
                    var next = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
                    gnext[r][c] = next;
                    age[r][c] = next ? age[r][c] + 1 : 0;
                    pop += next;
                }
            }
            var tmp = grid; grid = gnext; gnext = tmp;
            gen++;
        }

        function gdraw() {
            var pal = palette();
            gctx.fillStyle = pal.void_;
            gctx.fillRect(0, 0, gol.width, gol.height);
            for (var r = 0; r < grows; r++) {
                for (var c = 0; c < gcols; c++) {
                    if (!grid[r][c]) continue;
                    /* newborns strike volt, veterans settle into steel */
                    gctx.fillStyle = age[r][c] < 3 ? pal.volt : pal.steel;
                    gctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 1, CELL - 1);
                }
            }
            if (genEl) genEl.textContent = String(gen).padStart(5, '0');
            if (popEl) popEl.textContent = String(pop).padStart(5, '0');
        }

        function gseed(e, radius, density) {
            var rect = gol.getBoundingClientRect();
            var cx = Math.floor((e.clientX - rect.left) / rect.width * gcols);
            var cy = Math.floor((e.clientY - rect.top) / rect.height * grows);
            for (var dr = -radius; dr <= radius; dr++) {
                for (var dc = -radius; dc <= radius; dc++) {
                    if (Math.random() < density) {
                        var r = (cy + dr + grows) % grows;
                        var c = (cx + dc + gcols) % gcols;
                        grid[r][c] = 1;
                        age[r][c] = 0;
                    }
                }
            }
            gdraw();
        }

        /* hovering feeds the automaton; a click drops a bigger burst */
        gol.addEventListener('pointermove', function (e) { gseed(e, 1, 0.35); });
        gol.addEventListener('pointerdown', function (e) { gseed(e, 3, 0.5); });

        ginit();
        gdraw();

        if (!REDUCED) {
            var last = 0;
            var running = true;

            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (entries) {
                    running = entries[0].isIntersecting;
                }).observe(gol);
            }

            (function gloop(ts) {
                if (running && ts - last > 140) {
                    gstep();
                    gdraw();
                    last = ts;
                }
                requestAnimationFrame(gloop);
            })(0);
        }
    }

    /* ----------------------------------------------------------
       scroll reveals
    ---------------------------------------------------------- */

    var revealed = document.querySelectorAll('.reveal');
    if (revealed.length && 'IntersectionObserver' in window && !REDUCED) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add('in');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.12 });
        revealed.forEach(function (el) { io.observe(el); });
    } else {
        revealed.forEach(function (el) { el.classList.add('in'); });
    }

    /* ----------------------------------------------------------
       HUD clock — UTC, updates once a second
    ---------------------------------------------------------- */

    var clock = document.getElementById('hud-clock');
    if (clock) {
        function tick() {
            var d = new Date();
            function p(n) { return String(n).padStart(2, '0'); }
            clock.textContent =
                p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + ' UTC';
        }
        tick();
        setInterval(tick, 1000);
    }

    /* ----------------------------------------------------------
       wallet lines — click to copy
    ---------------------------------------------------------- */

    document.querySelectorAll('.crypto-address[data-addr]').forEach(function (el) {
        el.addEventListener('click', function () {
            var hint = el.querySelector('.copy-hint');
            navigator.clipboard.writeText(el.getAttribute('data-addr')).then(function () {
                if (hint) {
                    hint.textContent = '[ COPIED ]';
                    setTimeout(function () { hint.textContent = '[ COPY ]'; }, 1600);
                }
            }).catch(function () {});
        });
    });

})();
