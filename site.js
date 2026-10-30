/* Shared code for both pages: stretched titles, hill strips, the leaning
   "Join us" wordmark and the cursor trail on buttons. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => matchMedia('(max-width:760px)').matches;
  const css = n => getComputedStyle(root).getPropertyValue(n).trim();
  const setVW = () => root.style.setProperty('--vw', root.clientWidth + 'px');
  setVW();

  /* ---------- stretched titles ---------- */
  let capRatio = 0.72;
  function measureCap(){
    try{
      const c = document.createElement('canvas').getContext('2d');
      c.font = '100px "Bowlby One"';
      const m = c.measureText('PUZZLE CIRCLE');
      if (m.actualBoundingBoxAscent > 10) capRatio = m.actualBoundingBoxAscent / 100;
    }catch(e){}
  }
  function fitTitles(){
    document.querySelectorAll('.tl').forEach(box => {
      const r = box.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const svg = box.querySelector('svg'), t = svg.querySelector('text');
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      t.setAttribute('x', 0);
      t.setAttribute('y', r.height);
      t.setAttribute('font-size', (r.height / capRatio).toFixed(2));
      t.setAttribute('textLength', r.width);
      t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    });
  }

  /* ---------- hills and trees ---------- */
  function rng(seed){ return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function ridgePath(W, H, base, amp, seed, step){
    const r = rng(seed); const ph = [r()*6, r()*6, r()*6]; const k = [1.3 + r(), 3.1 + r()*1.5, 7 + r()*3];
    const ys = []; const n = Math.ceil(W / step) + 1;
    for (let i = 0; i <= n; i++){
      const x = i * step, t = x / W * Math.PI * 2;
      ys.push([x, base - amp * (0.55*Math.sin(t*k[0]+ph[0]) + 0.3*Math.sin(t*k[1]+ph[1]) + 0.15*Math.sin(t*k[2]+ph[2]))]);
    }
    let d = `M0 ${H} L${ys[0][0]} ${ys[0][1]}`;
    for (let i = 1; i < ys.length; i++){
      const [x0,y0] = ys[i-1], [x1,y1] = ys[i];
      d += ` Q${x0} ${y0} ${(x0+x1)/2} ${(y0+y1)/2}`;
    }
    d += ` L${W} ${ys[ys.length-1][1]} L${W} ${H} Z`;
    return {d, at: x => { const i = Math.min(ys.length-1, Math.max(0, Math.round(x/step))); return ys[i][1]; }};
  }
  function crown(cx, cy, rx, ry, r){
    const n = 7, q = [];
    for (let i = 0; i < n; i++){ const a = -Math.PI/2 + i*2*Math.PI/n + (r()-.5)*.35; const k = .82 + r()*.24;
      q.push([cx + Math.cos(a)*rx*k, cy + Math.sin(a)*ry*k]); }
    let d = '';
    for (let i = 0; i <= n; i++){ const [x0,y0] = q[i%n], [x1,y1] = q[(i+1)%n]; const mx = ((x0+x1)/2).toFixed(1), my = ((y0+y1)/2).toFixed(1);
      d += i ? ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${mx} ${my}` : `M${mx} ${my}`; }
    return d + 'Z';
  }
  function trees(g, ridge, W, scale, seed, colors, density, trunk){
    const r = rng(seed);
    for (let x = -10; x < W + 10; x += (15 + r()*17) * scale / density){
      const rad = (9 + r()*11) * scale, base = ridge.at(x);
      if (r() < 0.16){
        const h = rad*3.1, w = rad*1.05, pth = document.createElementNS(SVGNS, 'path');
        pth.setAttribute('d', `M${x} ${base - h} L${x + w*.55} ${base - h*.55} L${x + w*.32} ${base - h*.55} L${x + w} ${base + rad*.2} L${x - w} ${base + rad*.2} L${x - w*.32} ${base - h*.55} L${x - w*.55} ${base - h*.55}Z`);
        pth.setAttribute('fill', '#2E3A2A'); g.appendChild(pth); continue;
      }
      const cy = base - rad*0.55 - r()*rad*0.5;
      if (trunk){ const t = document.createElementNS(SVGNS, 'path'); t.setAttribute('d', `M${x} ${cy} L${x} ${base + rad}`); t.setAttribute('stroke', '#2B2119'); t.setAttribute('stroke-width', Math.max(1.5, rad*.16).toFixed(1)); g.appendChild(t); }
      const c = document.createElementNS(SVGNS, 'path');
      c.setAttribute('d', crown(x, cy, rad*0.92, rad*1.12, r));
      c.setAttribute('fill', colors[Math.floor(r()*colors.length)]);
      g.appendChild(c);
    }
  }
  function ridgeLayers(svg, W, H, L, sc, step){
    L.forEach(l => {
      const g = document.createElementNS(SVGNS, 'g');
      const ridge = ridgePath(W, H, l.base, l.amp, l.seed, step);
      if (l.trees) trees(g, ridge, W, sc * (l.big || 1), l.seed + 5, l.trees, l.dens, l.trunk);
      const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', ridge.d); p.setAttribute('fill', l.fill);
      g.appendChild(p); svg.appendChild(g);
    });
  }
  /* any <svg class="strip" data-seed="n"> becomes a strip of wooded ridges */
  function drawStrips(){
    document.querySelectorAll('svg.strip').forEach(svg => {
      svg.textContent = '';
      const r = svg.getBoundingClientRect(); const W = Math.max(320, r.width), H = Math.max(60, r.height);
      const seed = +svg.dataset.seed || 131;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const L = [];
      if (svg.dataset.sky) L.push({base: H*0.3, amp: H*0.1, seed: seed + 40, fill: css('--ridge-2')});
      L.push({base: H*0.48, amp: H*0.12, seed, fill: css('--ridge-3'), trees: [css('--leaf-amber'), css('--leaf-red'), css('--leaf-olive')], dens: 1});
      L.push({base: H*0.8, amp: H*0.08, seed: seed + 20, fill: css('--ridge-4'), trees: [css('--leaf-gold'), css('--leaf-amber'), css('--leaf-red'), css('--leaf-olive')], dens: 1.1, big: 1.2, trunk: true});
      ridgeLayers(svg, W, H, L, isPhone() ? 0.8 : W/1440, Math.max(8, W/90));
    });
  }

  /* ---------- "Join us": letters lean toward the pointer ---------- */
  const leans = [...document.querySelectorAll('.lean')].map(el => ({
    el, letters: [...el.querySelectorAll('span:not(.gap)')].map(sp => ({sp, a: 0, x: 0, y: 0, s: 1})), on: false
  }));
  let px = null, py = null, leanRaf = 0;
  function leanFrame(){
    leanRaf = 0; let moving = false;
    leans.forEach(L => {
      if (!L.on) return;
      L.letters.forEach(o => {
        const r = o.sp.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height*0.6;
        let ta = 0, tx = 0, ty = 0, ts = 1;
        if (px !== null){
          const dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy);
          const near = 1 / (1 + (dist / 520) ** 2);
          ta = Math.max(-1, Math.min(1, dx / 420)) * 17 * near;
          tx = Math.max(-1, Math.min(1, dx / 300)) * 12 * near;
          ty = Math.max(-1, Math.min(1, dy / 300)) * 10 * near;
          ts = 1 + 0.1 * near * near;
        }
        o.a += (ta - o.a) * 0.14; o.x += (tx - o.x) * 0.14; o.y += (ty - o.y) * 0.14; o.s += (ts - o.s) * 0.14;
        if (Math.abs(ta - o.a) + Math.abs(tx - o.x) + Math.abs(ty - o.y) > 0.02) moving = true;
        o.sp.style.transform = `translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px) rotate(${o.a.toFixed(2)}deg) scaleY(${o.s.toFixed(3)})`;
      });
    });
    if (moving) leanRaf = requestAnimationFrame(leanFrame);
  }
  const kickLean = () => { if (!leanRaf) leanRaf = requestAnimationFrame(leanFrame); };
  if (leans.length && !reduce){
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver(es => es.forEach(e => { const L = leans.find(l => l.el === e.target); if (L) L.on = e.isIntersecting; kickLean(); }), {rootMargin: '200px'});
      leans.forEach(L => io.observe(L.el));
    } else leans.forEach(L => L.on = true);
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; kickLean(); }, {passive: true});
    document.addEventListener('pointerleave', () => { px = py = null; kickLean(); });
    addEventListener('blur', () => { px = py = null; kickLean(); });
    addEventListener('scroll', kickLean, {passive: true});
  }

  /* ---------- cursor trail over buttons ---------- */
  let trail = null, tc = null, pts = [], parts = [], trailRaf = 0, lastSpawn = null;
  function ensureTrail(){
    if (trail) return;
    trail = document.createElement('canvas'); trail.className = 'trail'; trail.setAttribute('aria-hidden', 'true');
    document.body.appendChild(trail); tc = trail.getContext('2d'); sizeTrail();
  }
  function sizeTrail(){
    if (!trail) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    trail.width = innerWidth * dpr; trail.height = innerHeight * dpr; tc.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const palette = () => [css('--join-red') || '#B3301E', css('--leaf-gold') || '#E3B341', css('--sun') || '#F7E2B2', css('--leaf-amber') || '#CF8A2E'];
  function trailFrame(t){
    trailRaf = 0;
    const now = performance.now();
    tc.clearRect(0, 0, innerWidth, innerHeight);
    pts = pts.filter(p => now - p.t < 300);
        const gold = css('--leaf-gold') || '#E3B341';
    tc.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++){
      for (let i = 1; i < pts.length; i++){
        const a = pts[i-1], b = pts[i], life = Math.max(0, 1 - (now - b.t) / 300);
        tc.globalAlpha = pass ? life : life * 0.55;
        tc.strokeStyle = pass ? gold : '#16211D';
        tc.lineWidth = pass ? 1.5 + 6 * life : 4 + 6 * life;
        tc.beginPath(); tc.moveTo(a.x, a.y); tc.lineTo(b.x, b.y); tc.stroke();
      }
    }
    tc.globalAlpha = 1;
    parts = parts.filter(p => now - p.t0 < p.life);
    parts.forEach(p => {
      const age = (now - p.t0) / 1000, k = 1 - (now - p.t0) / p.life;
      const x = p.x + p.vx*age, y = p.y + p.vy*age + 140*age*age;
      tc.save(); tc.globalAlpha = Math.max(0, k); tc.translate(x, y); tc.rotate(p.rot + p.vr*age);
      tc.beginPath(); tc.moveTo(-p.s*1.5, 0);
      tc.quadraticCurveTo(-p.s*0.2, -p.s*0.8, p.s*1.5, 0);
      tc.quadraticCurveTo(-p.s*0.2, p.s*0.8, -p.s*1.5, 0);
      tc.fillStyle = p.c; tc.fill();
      tc.lineWidth = 1; tc.strokeStyle = 'rgba(22,33,29,.45)'; tc.stroke();
      tc.restore();
    });
    if (pts.length || parts.length) trailRaf = requestAnimationFrame(trailFrame);
  }
  if (!reduce){
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const over = e.target && e.target.closest && e.target.closest('.btn');
      if (!over){ lastSpawn = null; return; }
      ensureTrail();
      const now = performance.now();
      pts.push({x: e.clientX, y: e.clientY, t: now});
      if (!lastSpawn || Math.hypot(e.clientX - lastSpawn.x, e.clientY - lastSpawn.y) > 9){
        const cols = palette();
        parts.push({x: e.clientX, y: e.clientY, t0: now, life: 700 + Math.random()*500, vx: (Math.random() - .5) * 90, vy: -30 - Math.random()*50,
          s: 5 + Math.random()*4.5, rot: Math.random()*6, vr: (Math.random() - .5) * 6, c: cols[Math.floor(Math.random()*cols.length)]});
        if (parts.length > 60) parts.shift();
        lastSpawn = {x: e.clientX, y: e.clientY};
      }
      if (!trailRaf) trailRaf = requestAnimationFrame(trailFrame);
    }, {passive: true});
    addEventListener('resize', sizeTrail);
  }

  window.PC = {rng, SVGNS, ridgeLayers, fitTitles, measureCap, drawStrips, setVW, css, isPhone, reduce};
})();
