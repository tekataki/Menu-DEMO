/* Front-end enhancement only. The complete menu exists in index.html without JS.
   Alpha bounds measured from the approved originals; no file is modified. */
(() => {
  'use strict';
  const menu = document.querySelector('.digital-menu');
  if (!menu) return;
  const bounds = {
    'aves-pollo.webp':[153,28,938,1419],
    'bebidas-frescas.webp':[36,152,1487,970],
    'cafe-foto.webp':[171,28,1100,1220],
    'cerveza-foto.webp':[161,30,1564,860],
    'cocteleria-foto.webp':[176,50,1220,1127],
    'cortes-parrilla.webp':[85,96,1793,779],
    'ensalada-bowl.webp':[106,102,1202,1139],
    'entradas-plato.webp':[107,346,1434,1244],
    'entradas-promo-foto.webp':[34,71,1000,1446],
    'fachada-colonial-footer.webp':[82,173,1840,689],
    'hamburguesa-foto.webp':[45,95,1548,924],
    'icon-aves.webp':[316,62,1196,1033],
    'icon-bebidas.webp':[344,61,1017,1149],
    'icon-cafe.webp':[334,180,1110,902],
    'icon-cerveza.webp':[318,28,1070,1053],
    'icon-cocteleria.webp':[484,221,1104,938],
    'icon-cortes.webp':[347,307,1088,827],
    'icon-ensaladas.webp':[448,260,988,931],
    'icon-hamburguesas.webp':[168,145,1272,926],
    'icon-mariscos.webp':[257,210,1383,936],
    'icon-pastas.webp':[280,275,1164,826],
    'icon-pizzas.webp':[198,168,1344,914],
    'icon-postres.webp':[149,189,1301,956],
    'icon-tostadas.webp':[69,183,1386,1060],
    'mariscos-grill.webp':[74,103,1463,736],
    'pastas-franja.webp':[40,185,1454,698],
    'pizza-foto.webp':[27,87,983,1514],
    'postres-foto.webp':[124,48,1351,1066],
    'tostadas-foto.webp':[29,37,1581,921]
  };
  // Full nonzero-alpha bounds: also retain the very faint edges on phones.
  const fullBounds = {
    'aves-pollo.webp':[0,0,1050,1450], 'bebidas-frescas.webp':[0,0,1538,1023],
    'cafe-foto.webp':[0,0,1244,1254], 'cerveza-foto.webp':[0,0,1728,910],
    'cocteleria-foto.webp':[0,0,1330,1160], 'cortes-parrilla.webp':[0,0,1845,806],
    'ensalada-bowl.webp':[105,101,1203,1140], 'entradas-plato.webp':[107,346,1434,1244],
    'entradas-promo-foto.webp':[0,0,1028,1518], 'fachada-colonial-footer.webp':[25,21,2064,757],
    'hamburguesa-foto.webp':[0,0,1589,989], 'icon-aves.webp':[33,19,1358,1066],
    'icon-bebidas.webp':[114,59,1093,1200], 'icon-cafe.webp':[37,178,1233,1029],
    'icon-cerveza.webp':[98,26,1336,1097], 'icon-cocteleria.webp':[97,54,1378,987],
    'icon-cortes.webp':[49,177,1386,1054], 'icon-ensaladas.webp':[55,56,1360,1044],
    'icon-hamburguesas.webp':[165,142,1380,1013], 'icon-mariscos.webp':[0,101,1385,996],
    'icon-pastas.webp':[276,272,1285,962], 'icon-pizzas.webp':[65,55,1506,998],
    'icon-postres.webp':[101,157,1422,1003], 'icon-tostadas.webp':[67,181,1389,1062],
    'mariscos-grill.webp':[71,101,1465,738], 'pastas-franja.webp':[38,182,1456,700],
    'pizza-foto.webp':[0,8,1008,1558], 'postres-foto.webp':[0,0,1429,1101],
    'tostadas-foto.webp':[0,5,1628,966]
  };
  const calibration = window.CASONA_MENU_CALIBRATION;
  const artboards = [];
  const metricCanvas = document.createElement('canvas');
  const metricContext = metricCanvas.getContext('2d');
  function prepareArtboards() {
    if (!calibration) return;
    for (const section of menu.querySelectorAll('.dm-section')) {
      const key = section.id.replace('menu-', '');
      const model = calibration[key];
      if (!model) continue;
      const heading = section.querySelector('.dm-heading');
      const photo = section.querySelector('.dm-photo');
      const board = document.createElement('div');
      board.className = 'dm-artboard';
      section.prepend(board);
      board.append(heading, photo);
      artboards.push({section, board, heading, photo, model});
    }
    menu.dataset.calibrated = 'true';
  }
  // The browser's real font metrics determine paint bounds, not the line-box height.
  function positionInk(span, target, x, y, scale) {
    metricContext.font = '100px "Menu Anton"';
    metricContext.letterSpacing = '-2px';
    const text = metricContext.measureText(span.textContent);
    const inkWidth = text.actualBoundingBoxLeft + text.actualBoundingBoxRight;
    const inkHeight = text.actualBoundingBoxAscent + text.actualBoundingBoxDescent;
    const sx = target[2]*scale/inkWidth, sy = target[3]*scale/inkHeight;
    const baseline = (100-text.fontBoundingBoxAscent-text.fontBoundingBoxDescent)/2+text.fontBoundingBoxAscent;
    Object.assign(span.style, {
      left: `${(target[0]-x)*scale+text.actualBoundingBoxLeft*sx}px`,
      top: `${(target[1]-y)*scale-(baseline-text.actualBoundingBoxAscent)*sy}px`,
      width: `${text.width}px`, transform: `scale(${sx},${sy})`
    });
  }
  function composeArtboards() {
    const narrow = window.matchMedia('(max-width:900px)').matches;
    const sheet = menu.querySelector('.dm-sheet').getBoundingClientRect();
    const pcScale = sheet.width/1024;
    for (const {section,board,heading,photo,model} of artboards) {
      const sr = section.getBoundingClientRect();
      let scale, originX, originY;
      if (narrow) {
        // Keep the reference's numeral/title height ratio and top alignment,
        // but recompose the photograph for a narrow column, not a miniature PC grid.
        const width = board.clientWidth;
        if (!width) continue;
        const isOpening = section.classList.contains('dm-entradas');
        const nHeight = Math.min(width*(isOpening ? .34 : .245),isOpening ? 118 : 88);
        const typeScale = nHeight/model.n[3];
        const nWidth = model.n[2]*typeScale;
        const gap = Math.max(13,width*.045);
        const titleX = nWidth+gap;
        const titleWidth = Math.min(model.t[2]*typeScale,width-titleX-2);
        const titleHeight = model.t[3]*typeScale;
        const titleY = Math.max(2,(model.t[1]-model.n[1])*typeScale);
        positionInk(heading.querySelector('.dm-number'),[0,0,nWidth,nHeight],0,0,1);
        positionInk(heading.querySelector('.dm-title'),[titleX,titleY,titleWidth,titleHeight],0,0,1);
        const image = photo.querySelector('img');
        const alpha = fullBounds[image.getAttribute('src').split('/').pop()];
        const ratio = (alpha[2]-alpha[0])/(alpha[3]-alpha[1]);
        const maxHeight = Math.min(width*.88,310);
        const photoWidth = Math.min(width,maxHeight*ratio);
        const photoHeight = photoWidth/ratio;
        const photoX = (width-photoWidth)/2;
        const photoY = Math.max(nHeight+8,titleY+titleHeight+12);
        board.style.height = `${photoY+photoHeight}px`;
        photo.style.setProperty('--photo-x',`${photoX}px`);
        photo.style.setProperty('--photo-y',`${photoY}px`);
        Object.assign(photo.style,{left:`${photoX}px`,top:`${photoY}px`,width:`${photoWidth}px`,height:`${photoHeight}px`});
        fitImage(image);
        continue;
      } else {
        scale = pcScale;
        originX = (sr.left-sheet.left)/scale;
        originY = (sr.top-sheet.top)/scale;
        board.style.height = '100%';
      }
      positionInk(heading.querySelector('.dm-number'),model.n,originX,originY,scale);
      positionInk(heading.querySelector('.dm-title'),model.t,originX,originY,scale);
      const photoX = `${(model.p[0]-originX)*scale}px`, photoY = `${(model.p[1]-originY)*scale}px`;
      photo.style.setProperty('--photo-x',photoX);
      photo.style.setProperty('--photo-y',photoY);
      Object.assign(photo.style,{left:photoX,top:photoY,width:`${model.p[2]*scale}px`,height:`${model.p[3]*scale}px`});
      fitImage(photo.querySelector('img'));
    }
  }
  const images = [...menu.querySelectorAll('img')];
  function fitImage(image) {
    if (!image.naturalWidth) return;
    const full = window.matchMedia('(max-width:900px)').matches;
    const box = (full ? fullBounds : bounds)[image.getAttribute('src').split('/').pop()];
    if (!box) return;
    const frame = image.parentElement;
    const w = frame.clientWidth, h = frame.clientHeight;
    if (!w || !h) return;
    const [x0,y0,x1,y1] = box;
    const contain = window.matchMedia('(max-width:900px)').matches || frame.classList.contains('dm-building') || frame.classList.contains('dm-ornament') || frame.classList.contains('dm-entradas-photo');
    frame.dataset.fit = contain ? 'contain' : 'cover';
    frame.dataset.alphaBounds = box.join(',');
    const scale = (contain ? Math.min : Math.max)(w/(x1-x0),h/(y1-y0));
    Object.assign(image.style, {
      width: `${image.naturalWidth*scale}px`, height: `${image.naturalHeight*scale}px`,
      left: `${(w-(x1-x0)*scale)/2-x0*scale}px`,
      top: `${(h-(y1-y0)*scale)/2-y0*scale}px`
    });
    frame.dataset.cropped = 'true';
  }
  images.forEach(image => {fitImage(image);image.addEventListener('load',()=>fitImage(image));});
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(entries => entries.forEach(entry => fitImage(entry.target.querySelector('img'))));
    images.forEach(image => observer.observe(image.parentElement));
  } else window.addEventListener('resize', () => images.forEach(fitImage), {passive:true});

  const index = menu.querySelector('.dm-index');
  const mobile = window.matchMedia('(max-width:900px)');
  const links = [...menu.querySelectorAll('.dm-categories a')];
  function indexMode(){index.open = !mobile.matches;}
  indexMode();
  mobile.addEventListener('change', indexMode);
  // Desktop index stays expanded, including when a mobile toggle was closed.
  index.addEventListener('toggle',()=>{if (!mobile.matches && !index.open) index.open=true;});
  links.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (mobile.matches) index.open = false;
    history.pushState(null, '', link.hash);
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start',behavior:'instant'});
    links.forEach(item => item.removeAttribute('aria-current'));
    link.setAttribute('aria-current','location');
  }));
  document.fonts.ready.then(() => {
    prepareArtboards();
    composeArtboards();
    images.forEach(fitImage);
    let pending = false;
    const refresh = () => {if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;composeArtboards();images.forEach(fitImage);});};
    window.addEventListener('resize',refresh,{passive:true});
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(menu.querySelector('.dm-sheet'));
    menu.dataset.ready = 'true';
  });
})();
