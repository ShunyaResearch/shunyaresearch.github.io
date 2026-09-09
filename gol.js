/* B3/S23 automaton — age-shaded, hover feeds it, click drops a burst. */
(function () {
    var gol = document.getElementById('gol');
    if (!gol) return;

    var REDUCED = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* colours come from :root so the stylesheet stays the single source */
    function token(name, fallback) {
        var v = getComputedStyle(document.body).getPropertyValue(name).trim();
        return v || fallback;
    }

    var VOID = token('--bg', '#0f0f0f');
    var NEW = token('--link', '#ffffff');    /* newborns strike white */
    var OLD = token('--steel', '#44789f');   /* veterans settle into steel */

    var gctx = gol.getContext('2d');
    var CELL = 7;
    var gcols, grows, grid, gnext, age;

    function ginit() {
        gol.width = gol.clientWidth || 650;
        gol.height = gol.clientHeight || 150;
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
    }

    function gstep() {
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
            }
        }
        var tmp = grid; grid = gnext; gnext = tmp;
    }

    function gdraw() {
        gctx.fillStyle = VOID;
        gctx.fillRect(0, 0, gol.width, gol.height);
        for (var r = 0; r < grows; r++) {
            for (var c = 0; c < gcols; c++) {
                if (!grid[r][c]) continue;
                gctx.fillStyle = age[r][c] < 3 ? NEW : OLD;
                gctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 1, CELL - 1);
            }
        }
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
})();
