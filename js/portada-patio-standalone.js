/* ==========================================================================
   LA CASONA · PORTADA "PATIO"
   Ilustraciones botánicas generadas en SVG a la medida de la pantalla:
   - .corner   jazmín que cuelga del alero (arriba a la izquierda)
   - .la-stem  el filete de "La" es un tallo de bugambilia que cuelga sobre "ona"
   - .c-bloom  ramo metido en la "C"   · .a-plant  brote que sale de la última "a"
   - .garland  jardinera de flores silvestres donde "Casona" se apoya
   - .shade    sombra de palmas sobre la pared (profundidad)
   - .ground   pasto y flores al pie de la fachada
   - .petals   pétalos que caen
   Usa los símbolos d-leaf, d-leaf2, d-bloom, d-bloom2, d-daisy, d-bud y
   d-berry de menuV2.html. Los colores cambian con el cielo (CSS).
   Cada pieza tiene semilla fija: el dibujo es el mismo en cada visita.
   ========================================================================== */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const DEG = 180 / Math.PI;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = n => Math.round(n * 10) / 10;
  function rng(seed) {
    return () => {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const between = (r, a, b) => a + r() * (b - a);

  /* ---------- Piezas ------------------------------------------------------- */
  const leaf = (x, y, deg, w, dark) => `<use href="#d-leaf${dark ? '2' : ''}" width="${f(w)}" height="${f(w / 2)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)}) translate(0 ${f(-w / 4)})"/>`;
  const flower = (id, x, y, s, deg = 0) => `<use href="#${id}" x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" transform="rotate(${f(deg)} ${f(x)} ${f(y)})"/>`;
  /* botón: deg 0 = apunta hacia arriba */
  const bud = (x, y, deg, h) => `<use href="#d-bud" width="${f(h * 2 / 3)}" height="${f(h)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)}) translate(${f(-h / 3)} ${f(-h)})"/>`;
  const stem = (d, w) => `<path d="${d}" class="stem" stroke-width="${f(w)}"/>`;
  const tendril = (x, y, s, dir = 1) => stem(`M${f(x)} ${f(y)}c${f(dir * s * .2)} ${f(-s * .7)} ${f(dir * s)} ${f(-s * .9)} ${f(dir * s * .95)} ${f(-s * .35)}c${f(-dir * s * .05)} ${f(s * .3)} ${f(-dir * s * .45)} ${f(s * .25)} ${f(-dir * s * .4)} ${f(-s * .02)}`, Math.max(.8, s * .07));

  /* Racimo de bugambilia: brácteas alrededor de una central, con hojas detrás */
  function cluster(x, y, s, r, n = 4) {
    let o = leaf(x, y, between(r, 0, 360), s * 1.25, r() < .5) + leaf(x, y, between(r, 0, 360), s * 1.1, r() < .5);
    for (let i = 1; i < n; i++) {
      const a = (i / (n - 1)) * Math.PI * 2 + r() * 1.5, d = s * between(r, .42, .6);
      o += flower(r() < .62 ? 'd-bloom' : 'd-bloom2', x + Math.cos(a) * d, y + Math.sin(a) * d, s * between(r, .6, .85), r() * 120);
    }
    return o + flower(r() < .6 ? 'd-bloom' : 'd-bloom2', x, y, s, r() * 120);
  }

  /* Puntos a lo largo de un trazo (posición + ángulo) */
  function along(svg, d, step) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    const L = p.getTotalLength();
    const n = Math.max(2, Math.ceil(L / Math.max(step, 2)));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * L;
      const a = p.getPointAtLength(t), b = p.getPointAtLength(Math.min(L, t + .6)), c = p.getPointAtLength(Math.max(0, t - .6));
      pts.push({ x: a.x, y: a.y, a: Math.atan2(b.y - c.y, b.x - c.x), t: i / n });
    }
    p.remove();
    return pts;
  }
  /* Tallo con hojas alternadas */
  function leafy(svg, d, sw, ls, step, r, dark = .3, from = .05) {
    const pts = along(svg, d, step);
    let o = stem(d, sw);
    pts.forEach((p, i) => {
      if (p.t < from || p.t > .97) return;
      const side = i % 2 ? 1 : -1;
      o += leaf(p.x, p.y, p.a * DEG + side * between(r, 38, 66), ls * between(r, .72, 1.08), r() < dark);
    });
    return { o, pts };
  }
  /* Línea ondulada horizontal y suave */
  function wave(x0, x1, y, amp, seg, r) {
    const n = Math.max(2, Math.round((x1 - x0) / seg)), w = (x1 - x0) / n;
    let d = `M${f(x0)} ${f(y)}`;
    for (let i = 0; i < n; i++) {
      const xa = x0 + w * i, dy = (i % 2 ? 1 : -1) * amp * between(r, .6, 1.2);
      d += `C${f(xa + w * .3)} ${f(y + dy)} ${f(xa + w * .7)} ${f(y + dy)} ${f(xa + w)} ${f(y)}`;
    }
    return d;
  }
  const drop = (x, y, len, dx) => `M${f(x)} ${f(y)}C${f(x + dx)} ${f(y + len * .35)} ${f(x - dx)} ${f(y + len * .7)} ${f(x + dx * .5)} ${f(y + len)}`;
  const nearest = (pts, x) => pts.reduce((m, p) => Math.abs(p.x - x) < Math.abs(m.x - x) ? p : m, pts[0]);
  const sway = (inner, r, up) => `<g class="sway${up ? ' sway-up' : ''}" style="--dl:${f(-r() * 3.4)}s">${inner}</g>`;

  /* Plantas de jardinera: crecen hacia arriba desde (x, base) */
  function plant(svg, kind, x, base, h, r) {
    const dx = h * between(r, -.18, .18);
    const top = [x + dx, base - h];
    const d = `M${f(x)} ${f(base)}Q${f(x + dx * .2)} ${f(base - h * .55)} ${f(top[0])} ${f(top[1])}`;
    const sw = Math.max(1, h * .022);
    switch (kind) {
      case 'grass': {
        let o = '';
        const n = 3 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const hh = h * between(r, .35, .7), tx = x + (i - n / 2) * h * .07 + hh * between(r, -.35, .35), w = Math.max(1.6, h * .028);
          o += `<path class="blade" d="M${f(x - w)} ${f(base)}Q${f(x + (tx - x) * .3 - w)} ${f(base - hh * .55)} ${f(tx)} ${f(base - hh)}Q${f(x + (tx - x) * .3 + w)} ${f(base - hh * .55)} ${f(x + w)} ${f(base)}Z"/>`;
        }
        return o;
      }
      case 'daisy': {
        const s = h * between(r, .2, .28);
        return stem(d, sw) + leaf(x + dx * .1, base - h * .3, -145 + between(r, -10, 10), h * .26, true) + leaf(x + dx * .15, base - h * .45, -35, h * .22) + flower('d-daisy', top[0], top[1], s, r() * 90);
      }
      case 'lav': {
        let o = stem(d, sw) + leaf(x, base - h * .18, -140, h * .2, true) + leaf(x, base - h * .24, -40, h * .2, true);
        const pts = along(svg, d, h * .05);
        pts.forEach((p, i) => { if (p.t < .55) return; const s = h * .055 * (1.2 - p.t * .5); const side = i % 2 ? 1 : -1; o += `<ellipse class="lav" cx="${f(p.x + side * s * .7)}" cy="${f(p.y)}" rx="${f(s * .75)}" ry="${f(s)}" transform="rotate(${f(side * 25)} ${f(p.x + side * s * .7)} ${f(p.y)})"/>`; });
        return o;
      }
      case 'bush':
        return stem(d, sw) + cluster(x + dx * .4, base - h * .55, h * .24, r, 4) + leaf(x, base - h * .2, -150, h * .24, true);
      case 'berry': {
        let o = leafy(svg, d, sw, h * .2, h * .16, r, .6, .15).o;
        o += flower('d-berry', top[0], top[1], h * .16) + flower('d-berry', top[0] + h * .08, top[1] + h * .14, h * .12);
        return o;
      }
      default: { // ramita con hojas y botón
        const o = leafy(svg, d, sw, h * .22, h * .14, r, .45, .12).o;
        return o + bud(top[0], top[1], dx > 0 ? 18 : -18, h * .2);
      }
    }
  }

  /* Sombra de una palma proyectada en la pared */
  function frond(svg, x, y, deg, len, r) {
    const a = deg / DEG, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, bend = len * .2;
    const cx = (x + ex) / 2 - Math.sin(a) * bend, cy = (y + ey) / 2 + Math.cos(a) * bend;
    const d = `M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}`;
    let o = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${f(len * .014)}" stroke-linecap="round"/>`;
    along(svg, d, len / 24).forEach(p => {
      if (p.t < .08) return;
      const L = len * .32 * Math.pow(Math.sin(Math.PI * Math.min(.98, p.t * 1.02)), .65);
      [1, -1].forEach(s => {
        const b = p.a + s * 1.05, tx = p.x + Math.cos(b) * L, ty = p.y + Math.sin(b) * L + L * .22;
        const w = L * .13, nx = -Math.sin(b) * w, ny = Math.cos(b) * w, mx = (p.x + tx) / 2, my = (p.y + ty) / 2;
        o += `<path d="M${f(p.x)} ${f(p.y)}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${f(p.x)} ${f(p.y)}Z"/>`;
      });
    });
    r();
    return `<g class="frond">${o}</g>`;
  }

  /* ---------- Piezas a la medida ------------------------------------------ */
  const R = {
    /* Tallo de "La": hojas a todo lo ancho, bugambilia colgando a la derecha */
    laStem(svg, W, H) {
      const fs = H, r = rng(7), y = H * .6;
      const d = wave(0, W + 4, y, fs * .07, fs * 1.5, r);
      const { o: base, pts } = leafy(svg, d, Math.max(1.4, fs * .032), fs * .36, fs * .46, r, .35, .06);
      let o = base + tendril(fs * .06, y, fs * .4, 1);
      let x = Math.max(W * .4, fs * 2), j = 0;
      while (x < W - fs * .25) {
        const p = nearest(pts, x);
        const len = fs * between(r, .4, .95) * (j % 2 ? .7 : 1), dx = fs * between(r, -.22, .22);
        const dd = drop(p.x, p.y, len, dx);
        let g = leafy(svg, dd, Math.max(1, fs * .024), fs * .28, fs * .3, r, .3, .18).o;
        g += cluster(p.x + dx * .5, p.y + len, fs * between(r, .28, .36), r, 4);
        if (r() < .5) g += cluster(p.x - dx * .2, p.y + len * .5, fs * .22, r, 3);
        o += sway(g, r);
        x += fs * between(r, .85, 1.4); j++;
      }
      pts.forEach(p => {
        if (p.t < .1 || p.t > .98) return;
        const k = r();
        if (p.t > .42 && k < .34) o += cluster(p.x, p.y, fs * .3, r, 3);
        else if (k < .16) o += bud(p.x, p.y, between(r, -40, 40), fs * .3);
        else if (k < .22) o += flower('d-daisy', p.x, p.y - fs * .04, fs * .26, r() * 90);
        else if (k < .27 && p.t < .5) o += flower('d-bloom2', p.x, p.y, fs * .22, r() * 90);
      });
      return o;
    },

    /* Jazmín del alero */
    corner(svg, W, H) {
      const r = rng(23), y = H * .16;
      const d = wave(-8, W, y, H * .08, H * 1.15, r);
      const { o: base, pts } = leafy(svg, d, Math.max(1.6, H * .035), H * .3, H * .19, r, .65, 0);
      let o = base;
      pts.forEach((p, i) => {
        if (i % 3 || p.t > .9) return;
        const len = H * between(r, .32, .72) * (1 - p.t * .45), dx = H * between(r, -.14, .14);
        let g = leafy(svg, drop(p.x, p.y, len, dx), Math.max(1, H * .02), H * .22, H * .17, r, .6, .22).o;
        const ex = p.x + dx * .5, ey = p.y + len;
        g += r() < .6
          ? flower('d-daisy', ex, ey, H * .21, r() * 90) + (r() < .6 ? flower('d-daisy', ex + H * .13, ey - H * .09, H * .15, 20) : '')
          : bud(ex, ey, 180 + between(r, -20, 20), H * .2) + flower('d-berry', ex - H * .08, ey - H * .1, H * .12);
        o += sway(g, r);
      });
      pts.forEach((p, i) => {
        if (i % 4 === 1) o += flower('d-daisy', p.x, p.y, H * between(r, .15, .21), r() * 90);
        else if (i % 6 === 3) o += flower('d-berry', p.x, p.y + H * .04, H * .12);
      });
      return tendril(W * .99, y, H * .3, -1) + o;
    },

    /* Jardinera: flores silvestres que crecen detrás de "Casona" */
    garland(svg, W, H) {
      const r = rng(31);
      const kinds = ['grass', 'sprig', 'daisy', 'lav', 'grass', 'daisy', 'bush', 'sprig', 'berry'];
      let o = '', x = between(r, 0, H * .2);
      while (x < W) {
        const kind = kinds[Math.floor(r() * kinds.length)];
        const h = H * (kind === 'grass' ? between(r, .55, .85) : between(r, .5, 1));
        o += plant(svg, kind, x, H, h, r);   // estática: ligera en celulares
        x += H * between(r, .26, .5);
      }
      return o;
    },

    /* Sombra de palmas (sin contorno, muy tenue) */
    shade(svg, W, H) {
      const r = rng(41), m = Math.min(W, H * 1.4);
      return frond(svg, -m * .06, -m * .04, 38, m * .78, r) +
        frond(svg, W + m * .05, H * .42, 196, m * .62, r) +
        frond(svg, W * .52, -m * .1, 112, m * .46, r);
    },

    /* Pasto y flores al pie de la fachada */
    ground(svg, W, H) {
      const r = rng(53);
      let o = '', x = between(r, 0, H);
      while (x < W) {
        const k = r();
        const kind = k < .5 ? 'grass' : k < .72 ? 'daisy' : k < .86 ? 'sprig' : 'lav';
        o += plant(svg, kind, x, H, H * between(r, .55, 1), r);
        x += H * between(r, .7, 1.7);
      }
      return o;
    }
  };

  /* Piezas fijas (escalan con la letra) */
  const STATIC = {
    '.c-bloom': ['0 0 100 100', () => {
      const r = rng(11);
      return stem('M14 74C30 62 46 48 70 30', 2.4) + stem('M36 58C46 66 58 72 76 72', 2) +
        leaf(26, 66, -150, 30, true) + leaf(50, 48, -84, 28) + leaf(62, 70, 12, 26, true) + leaf(44, 54, -18, 24) +
        bud(16, 74, -120, 20) + flower('d-daisy', 78, 72, 22, 10) + cluster(70, 30, 26, r, 4);
    }],
    '.a-plant': ['0 0 100 140', () => {
      return stem('M50 140C48 110 54 80 56 34', 2.4) + stem('M51 112C40 100 28 92 18 70', 2) + stem('M54 92C66 84 76 82 86 66', 2) +
        leaf(50, 124, -160, 28, true) + leaf(52, 110, -22, 26) + leaf(54, 84, -152, 24) + leaf(55, 62, -32, 22, true) + leaf(34, 97, -128, 22) + leaf(72, 83, -30, 20, true) +
        flower('d-berry', 28, 88, 12) + bud(18, 72, -35, 22) + flower('d-bloom2', 86, 64, 22, 30) + flower('d-daisy', 56, 30, 34, 8);
    }]
  };

  /* ---------- Dibujo y redimensionado -------------------------------------- */
  const JOBS = { '.la-stem': R.laStem, '.corner': R.corner, '.garland': R.garland, '.shade': R.shade, '.ground': R.ground };
  function draw(svg, fn) {
    const b = svg.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) return;
    const key = `${Math.round(b.width)}x${Math.round(b.height)}`;
    if (svg.dataset.k === key) return;
    svg.dataset.k = key;
    svg.setAttribute('viewBox', `0 0 ${f(b.width)} ${f(b.height)}`);
    svg.innerHTML = fn(svg, b.width, b.height);
  }
  function petals() {
    const box = document.querySelector('.petals');
    if (!box) return;
    box.style.setProperty('--fall', `${box.parentElement.offsetHeight + 40}px`);
    if (reduced || box.childElementCount) return;
    const r = rng(3);
    let s = '';
    for (let i = 0; i < 9; i++) {
      s += `<i class="${i % 3 ? '' : 'p2'}" style="left:${f(between(r, 3, 97))}%;--sw:${f(between(r, 14, 42))}px;--s:${f(between(r, .7, 1.25))};animation-duration:${f(between(r, 10, 17))}s;animation-delay:${f(-between(r, 0, 17))}s"></i>`;
    }
    box.innerHTML = s;
  }
  function all() {
    Object.entries(JOBS).forEach(([sel, fn]) => document.querySelectorAll(sel).forEach(svg => draw(svg, fn)));
    petals();
  }

  Object.entries(STATIC).forEach(([sel, [vb, fn]]) => document.querySelectorAll(sel).forEach(svg => {
    svg.setAttribute('viewBox', vb);
    svg.innerHTML = fn();
  }));
  all();
  /* Pausa el movimiento cuando la portada no se ve (ahorra batería) */
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => hero.classList.toggle('is-away', !e.isIntersecting)).observe(hero);
  }
  if ('ResizeObserver' in window) {
    let t;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(all, 60); });
    Object.keys(JOBS).forEach(sel => document.querySelectorAll(sel).forEach(el => ro.observe(el)));
  } else addEventListener('resize', all);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
})();
