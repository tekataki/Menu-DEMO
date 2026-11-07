/* Sello original de «Bienvenida Mesa QR.html».
   Solo SVG + animación. Sin configurador, botones, bienvenida ni enlaces del ejemplo.
   La mesa procede exclusivamente de la sesión que ya validó la aplicación. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 80 480 480" role="img" id="stampSvg" aria-label="Sello: Bienvenido a la mesa 1">
      <defs>
        <filter id="ink" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="warp"/>
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/>
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3" result="grain"/>
          <feColorMatrix in="grain" type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    -14 0 0 0 8.6" result="holes"/>
          <feComposite in="rough" in2="holes" operator="in"/>
        </filter>
        <polygon id="star" points="0,-10 2.35,-3.24 9.51,-3.09 3.8,1.24 5.88,8.09 0,4 -5.88,8.09 -3.8,1.24 -9.51,-3.09 -2.35,-3.24"/>
        <path id="arcTop" d="M -122 0 A 122 122 0 0 1 122 0"/>
        <path id="arcBottom" d="M -137 0 A 137 137 0 0 0 137 0"/>
      </defs>

      <g class="stamp-impact">

        <!-- Impresión -->
        <g transform="translate(300 318)">
          <g class="imprint">
            <g transform="rotate(-9)" filter="url(#ink)">
              <circle r="172" fill="none" stroke="#c81d25" stroke-width="11"/>
              <circle r="153" fill="none" stroke="#c81d25" stroke-width="3"/>
              <circle r="106" fill="none" stroke="#c81d25" stroke-width="3"/>

              <!-- Aro exterior -->
              <text class="anton" font-size="26" letter-spacing="4" fill="#c81d25">
                <textPath id="arcPlace" href="#arcTop" startOffset="50%" text-anchor="middle">LA CASONA</textPath>
              </text>
              <text class="anton" font-size="20" letter-spacing="3" fill="#c81d25">
                <textPath href="#arcBottom" startOffset="50%" text-anchor="middle">★ RESERVADA PARA TI ★</textPath>
              </text>

              <!-- Centro -->
              <g fill="#c81d25">
                <use href="#star" transform="translate(-22 -84) scale(.7)"/>
                <use href="#star" transform="translate(0 -88)"/>
                <use href="#star" transform="translate(22 -84) scale(.7)"/>
              </g>
              <text id="greet" x="0" y="-51" class="anton" font-size="20" letter-spacing="2.5" text-anchor="middle" fill="#c81d25">BIENVENIDO A LA</text>

              <polygon points="-172,-40 172,-40 154,0 172,40 -172,40 -154,0" fill="#c81d25"/>
              <text id="tableText" x="0" y="24" class="anton" font-size="66" letter-spacing="4" text-anchor="middle" fill="#f3ece0">MESA 1</text>

              <text id="msgText" x="0" y="66" class="anton" font-size="17" letter-spacing="1.5" text-anchor="middle" fill="#c81d25">DISFRUTA TU COMIDA</text>
              <text id="dateText" x="0" y="88" class="mono" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle" fill="#c81d25">00.00.00</text>

              <!-- gotas de tinta -->
              <circle cx="186" cy="-58" r="3.5" fill="#c81d25"/>
              <circle cx="194" cy="-44" r="2" fill="#c81d25"/>
              <circle cx="-184" cy="70" r="2.6" fill="#c81d25"/>
            </g>
          </g>
        </g>

        <!-- Líneas de impacto -->
        <g transform="translate(300 318)">
          <g class="burst" stroke="#c81d25" stroke-width="6" stroke-linecap="round">
            <line x1="0" y1="-196" x2="0" y2="-224"/>
            <line x1="139" y1="-139" x2="158" y2="-158"/>
            <line x1="196" y1="0" x2="224" y2="0"/>
            <line x1="139" y1="139" x2="158" y2="158"/>
            <line x1="-139" y1="139" x2="-158" y2="158"/>
            <line x1="-196" y1="0" x2="-224" y2="0"/>
            <line x1="-139" y1="-139" x2="-158" y2="-158"/>
          </g>
        </g>
      </g>

      <!-- Sello de madera -->
      <g transform="translate(300 492)">
        <g class="tool">
          <ellipse cx="0" cy="-246" rx="72" ry="52" fill="#3a2a20"/>
          <ellipse cx="-26" cy="-264" rx="20" ry="9" fill="#5c463a"/>
          <rect x="-44" y="-202" width="88" height="14" fill="#2a1e17"/>
          <rect x="-28" y="-188" width="56" height="90" fill="#6b4429"/>
          <rect x="-28" y="-188" width="12" height="90" fill="#7f5334"/>
          <rect x="-166" y="-100" width="332" height="78" fill="#9a6440"/>
          <rect x="-166" y="-100" width="332" height="10" fill="#b57a50"/>
          <path d="M -150 -74 C -90 -80, -40 -66, 20 -74 S 120 -80, 150 -70 M -140 -50 C -80 -56, 10 -42, 70 -52 S 130 -54, 152 -46"
                fill="none" stroke="#7d4f31" stroke-width="2"/>
          <rect x="-176" y="-22" width="352" height="22" fill="#c81d25"/>
          <rect x="-176" y="-22" width="352" height="5" fill="#a3151c"/>
        </g>
      </g>
    </svg>`;

  function html(s) {
    const n = String(s.numero);
    const started = new Date(s.startedAt || Date.now());
    const now = Number.isNaN(started.getTime()) ? new Date() : started;
    const pad = n => String(n).padStart(2, '0');
    const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(2)}`;
    return '<div class="mesa-stamp" data-mesa-stamp>' + SVG
      .replace('aria-label="Sello: Bienvenido a la mesa 1"', `aria-label="Sello: Bienvenido a la mesa ${esc(n)}"`)
      .replace('>MESA 1<', `>MESA ${esc(n.toUpperCase())}<`)
      .replace('>00.00.00<', `>${date}<`) + '</div>';
  }
  function mount(root) {
    const stage = root.querySelector('[data-mesa-stamp]');
    if (!stage) return;
    const fit = (id, max) => {
      const el = stage.querySelector('#' + id);
      if (el.getComputedTextLength() > max) {
        el.setAttribute('textLength', max);
        el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
    };
    const start = () => {
      if (!stage.isConnected) return;
      fit('tableText', 290); fit('msgText', 160); fit('greet', 176); fit('arcPlace', 320);
      stage.classList.add('play');
    };
    // El sello se estampa una vez, cuando el visitante llega a verlo.
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      if (!stage.isConnected) return;
      if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const observer = new IntersectionObserver(entries => {
          if (!stage.isConnected) { observer.disconnect(); return; }
          if (entries.some(e => e.isIntersecting)) { observer.disconnect(); start(); }
        }, {threshold: .2});
        observer.observe(stage);
      } else start();
    });
  }
  window.CasonaMesaStamp = { html, mount };
})();
