/* Interactive 3D cabinet: a hand-built model of Larry's display wall at real scale (inches), projected to
   SVG every frame. Drag or arrow keys rotate, the base doors open, and "See it installed" swings to the
   photo angle and fades to the real photo. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var root = document.querySelector('[data-model3d]');
  if (!root) return;
  var stage = root.querySelector('.model3d__stage');
  var layer = root.querySelector('.model3d__layer');
  var btnDoors = root.querySelector('[data-doors]');
  var btnPhoto = root.querySelector('[data-photo]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RAD = Math.PI / 180;

  /* ---------- Geometry (x right, y up, z toward the room; wall at z = 0) ---------- */
  var WHITE = [248, 248, 245], BACK = [228, 231, 235], KICK = [190, 194, 200], PULL = [40, 40, 44];
  var boxes = [];
  function box(x0, y0, z0, x1, y1, z1, o) {
    o = o || {};
    boxes.push({ a: [x0, y0, z0], b: [x1, y1, z1], c: o.c || WHITE, door: o.door || null, deco: o.deco || null });
  }
  // corner i: bit0 -> x, bit1 -> y, bit2 -> z; face 5 (+z) is the front
  var FACES = [
    { i: [0, 4, 6, 2], n: [-1, 0, 0] }, { i: [1, 3, 7, 5], n: [1, 0, 0] },
    { i: [0, 1, 5, 4], n: [0, -1, 0] }, { i: [2, 6, 7, 3], n: [0, 1, 0] },
    { i: [0, 2, 3, 1], n: [0, 0, -1] }, { i: [4, 5, 7, 6], n: [0, 0, 1] }
  ];

  var COUNTER = 36; // top of the base countertops
  function upper(x0, x1, top, crownDepth) {
    box(x0, COUNTER, 0, x0 + 1.5, top, 12);
    box(x1 - 1.5, COUNTER, 0, x1, top, 12);
    var bead = [];
    for (var x = x0 + 4; x < x1 - 2.5; x += 2.5) bead.push([[x, COUNTER + 0.75, 0.5], [x, top - 1.5, 0.5]]);
    box(x0 + 1.5, COUNTER, 0, x1 - 1.5, top - 1.5, 0.5, { c: BACK, deco: { f: 5, l: bead } }); // beadboard back
    box(x0 + 1.5, COUNTER, 0.5, x1 - 1.5, COUNTER + 0.75, 12);
    box(x0 + 1.5, top - 1.5, 0.5, x1 - 1.5, top, 12);
    var h = (top - 1.5 - COUNTER - 0.75) / 4;
    for (var i = 1; i < 4; i++) {
      var y = COUNTER + 0.75 + i * h;
      box(x0 + 1.5, y - 0.5, 0.5, x1 - 1.5, y + 0.5, 11.5);
    }
    box(x0 - 0.75, top, 0, x1 + 0.75, top + 3, crownDepth - 1.5);  // frieze
    box(x0 - 2.25, top + 3, 0, x1 + 2.25, top + 4.5, crownDepth);  // crown cap
  }

  function base(x0, x1, d, pairs) {
    box(x0 + 1, 0, 0, x1 - 1, 4, d - 3, { c: KICK });              // recessed toe kick
    box(x0, 4, 0, x0 + 0.75, 34.75, d);
    box(x1 - 0.75, 4, 0, x1, 34.75, d);
    box(x0 + 0.75, 4, 0, x1 - 0.75, 34.75, 0.5, { c: BACK });
    box(x0 + 0.75, 4, 0.5, x1 - 0.75, 4.75, d);
    box(x0 + 0.75, 19, 0.5, x1 - 0.75, 19.75, d - 1);
    box(x0 + 0.75, 33.25, 0.5, x1 - 0.75, 34.75, d);
    box(x0 - 0.25, 34.75, 0, x1 + 0.25, COUNTER, d + 1);            // countertop
    var n = pairs * 2, w = (x1 - x0) / n, y0 = 5, y1 = 33, zf = d + 0.75, ins = 2.5;
    for (var i = 0; i < n; i++) {
      var dx0 = x0 + i * w + 0.1, dx1 = x0 + (i + 1) * w - 0.1, left = i % 2 === 0;
      var door = { hx: left ? dx0 : dx1, hz: zf, dir: left ? 1 : -1 };  // hinge on the front outer corner, like a real hinge
      box(dx0, y0, d, dx1, y1, zf, { door: door, deco: { f: 5, l: [   // shaker panel outline
        [[dx0 + ins, y0 + ins, zf], [dx1 - ins, y0 + ins, zf]], [[dx1 - ins, y0 + ins, zf], [dx1 - ins, y1 - ins, zf]],
        [[dx1 - ins, y1 - ins, zf], [dx0 + ins, y1 - ins, zf]], [[dx0 + ins, y1 - ins, zf], [dx0 + ins, y0 + ins, zf]]
      ] } });
      var kx = left ? dx1 - 2.2 : dx1 - (dx1 - dx0) + 1.2;
      box(kx, 27, zf, kx + 1, 31, zf + 1, { c: PULL, door: door });  // black pull near the meeting edge
    }
  }

  // Larry's wall: two 30" side units and a 62" center unit that is taller and deeper
  upper(-61, -31, 96, 14); upper(-31, 31, 98.5, 15.5); upper(31, 61, 96, 14);
  base(-61, -31, 16, 1); base(-31, 31, 18, 2); base(31, 61, 16, 1);

  /* ---------- Camera + projection ---------- */
  var cam = { yaw: 22, pitch: 8 }, open = 0;
  var D = 360, F = 2350, PIV = [0, 50, 9], CX = 600, CY = 640;
  var OPEN_DEG = 85; // under 90 so doors sharing a stile end up side by side instead of crossing
  var zoom = 1, pan = [0, 0], ZMIN = 1, ZMAX = 3.2;  // zoom scales the projection; pan shifts it (SVG units)
  var L = (function (v) { var m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; })([-0.45, 0.75, 0.55]);

  function doorP(p, dr) {
    var a = open * OPEN_DEG * RAD, s = dr.dir * Math.sin(a), c = Math.cos(a), u = p[0] - dr.hx, w = p[2] - dr.hz;
    return [dr.hx + u * c - w * s, p[1], dr.hz + u * s + w * c];
  }
  function doorN(n, dr) {
    var a = open * OPEN_DEG * RAD, s = dr.dir * Math.sin(a), c = Math.cos(a);
    return [n[0] * c - n[2] * s, n[1], n[0] * s + n[2] * c];
  }

  function render() {
    var cy = Math.cos(cam.yaw * RAD), sy = Math.sin(cam.yaw * RAD), cp = Math.cos(cam.pitch * RAD), sp = Math.sin(cam.pitch * RAD);
    function rot(x, y, z) {
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    }
    function view(p) { return rot(p[0] - PIV[0], p[1] - PIV[1], p[2] - PIV[2]); }
    function proj(v) { var dd = D - v[2], f = F * zoom; return (CX + pan[0] + f * v[0] / dd).toFixed(1) + ' ' + (CY + pan[1] - f * v[1] / dd).toFixed(1); }

    // soft contact shadow on the floor under the footprint
    var sh = [[-66, 0, -2], [66, 0, -2], [66, 0, 24], [-66, 0, 24]].map(function (p) { return proj(view(p)); });
    var out = '<path class="shadow" d="M' + sh.join('L') + 'Z" filter="url(#m3-soft)"/>';

    // camera position in world space (inverse of the view rotation)
    var z1c = D * cp, cam3 = [PIV[0] - z1c * sy, PIV[1] + D * sp, PIV[2] + z1c * cy];

    var parts = [];
    boxes.forEach(function (b) {
      var cs = [], mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (var i = 0; i < 8; i++) {
        var p = [i & 1 ? b.b[0] : b.a[0], i & 2 ? b.b[1] : b.a[1], i & 4 ? b.b[2] : b.a[2]];
        if (b.door) p = doorP(p, b.door);
        for (var k = 0; k < 3; k++) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; }
        cs.push(view(p));
      }
      var faces = [];
      FACES.forEach(function (f, fi) {
        var n = b.door ? doorN(f.n, b.door) : f.n, vn = rot(n[0], n[1], n[2]);
        var q = f.i.map(function (k) { return cs[k]; });
        var fx = (q[0][0] + q[2][0]) / 2, fy = (q[0][1] + q[2][1]) / 2, fz = (q[0][2] + q[2][2]) / 2;
        if (-vn[0] * fx - vn[1] * fy + vn[2] * (D - fz) <= 0) return;            // back face
        faces.push({ q: q, n: n, c: b.c, deco: b.deco && b.deco.f === fi ? b.deco.l : null, door: b.door });
      });
      if (!faces.length) return;
      var cx = (cs[0][0] + cs[7][0]) / 2, cyv = (cs[0][1] + cs[7][1]) / 2, cz = (cs[0][2] + cs[7][2]) / 2;
      var sx0 = 1e9, sx1 = -1e9, sy0 = 1e9, sy1 = -1e9;
      cs.forEach(function (v) { var dd = D - v[2], X = F * v[0] / dd, Y = F * v[1] / dd; if (X < sx0) sx0 = X; if (X > sx1) sx1 = X; if (Y < sy0) sy0 = Y; if (Y > sy1) sy1 = Y; });
      parts.push({ s: [sx0, sx1, sy0, sy1], mn: mn, mx: mx, dist: cx * cx + cyv * cyv + (D - cz) * (D - cz), faces: faces, after: [], deg: 0 });
    });

    // Exact order for boxes: along an axis that separates two parts, the one on the camera's side is in front
    var E = 0.01;
    function front(A, B) { // 1: B in front of A, -1: A in front of B, 0: unknown
      for (var k = 0; k < 3; k++) {
        if (A.mx[k] <= B.mn[k] + E) { if (cam3[k] >= B.mn[k]) return 1; if (cam3[k] <= A.mx[k]) return -1; }
        if (B.mx[k] <= A.mn[k] + E) { if (cam3[k] >= A.mn[k]) return -1; if (cam3[k] <= B.mx[k]) return 1; }
      }
      return 0;
    }
    for (var i = 0; i < parts.length; i++) for (var j = i + 1; j < parts.length; j++) {
      var A = parts[i], B = parts[j];
      if (A.s[1] <= B.s[0] || B.s[1] <= A.s[0] || A.s[3] <= B.s[2] || B.s[3] <= A.s[2]) continue; // no overlap on screen
      var r = front(A, B);
      if (r === 1) { parts[i].after.push(parts[j]); parts[j].deg++; }
      else if (r === -1) { parts[j].after.push(parts[i]); parts[i].deg++; }
    }
    var order = [], left = parts.slice();
    while (left.length) {                       // topological sort; farthest ready part first, distance breaks cycles
      var pick = -1;
      for (var m = 0; m < left.length; m++) if (left[m].deg === 0 && (pick < 0 || left[m].dist > left[pick].dist)) pick = m;
      if (pick < 0) { pick = 0; for (m = 1; m < left.length; m++) if (left[m].deg < left[pick].deg || (left[m].deg === left[pick].deg && left[m].dist > left[pick].dist)) pick = m; }
      var P = left.splice(pick, 1)[0];
      P.after.forEach(function (x) { x.deg--; });
      order.push(P);
    }
    var polys = [];
    order.forEach(function (P) { polys.push.apply(polys, P.faces); });
    polys.forEach(function (p) {
      var k = 0.68 + 0.32 * Math.max(0, p.n[0] * L[0] + p.n[1] * L[1] + p.n[2] * L[2]);
      out += '<path d="M' + p.q.map(proj).join('L') + 'Z" fill="rgb(' + Math.round(p.c[0] * k) + ',' + Math.round(p.c[1] * k) + ',' + Math.round(p.c[2] * k) + ')"/>';
      if (p.deco) {
        var dd = '';
        p.deco.forEach(function (ln) {
          var a = ln[0], b = ln[1];
          if (p.door) { a = doorP(a, p.door); b = doorP(b, p.door); }
          dd += 'M' + proj(view(a)) + 'L' + proj(view(b));
        });
        out += '<path class="dec" d="' + dd + '"/>';
      }
    });
    layer.innerHTML = out;
  }

  var pending = false;
  function draw() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); });
  }
  function clamp() {
    cam.yaw = ((cam.yaw + 180) % 360 + 360) % 360 - 180;   // full 360: just wrap the angle
    cam.pitch = Math.max(1, Math.min(28, cam.pitch));
  }
  function tween(ms, fn, done) {
    if (reduce) ms = 1;
    var t0 = null;
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      fn(e); render();
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    });
  }

  /* ---------- Interaction ---------- */
  var touched = false, photo = false, inView = false, looping = false;
  function touch() { touched = true; root.classList.add('is-touched'); }

  /* Zoom around a point (SVG units): whatever is under that point stays under it */
  function zoomAt(z, mx, my) {
    z = Math.max(ZMIN, Math.min(ZMAX, z));
    var r = z / zoom;
    pan[0] = mx - CX - (mx - CX - pan[0]) * r;
    pan[1] = my - CY - (my - CY - pan[1]) * r;
    zoom = z; clampPan(); draw();
  }
  function clampPan() {
    var lim = 600 * (zoom - 1) + 60;
    pan[0] = Math.max(-lim, Math.min(lim, pan[0]));
    pan[1] = Math.max(-lim, Math.min(lim, pan[1]));
    root.classList.toggle('is-zoomed', zoom > 1.01);
  }
  function svgPt(x, y) {
    var r = stage.getBoundingClientRect();
    return [(x - r.left) * 1200 / r.width, (y - r.top) * 1200 / r.height];
  }

  // Pointers: one drags to rotate, two pinch to zoom and move together to pan
  var pts = {}, pinch = null;
  function pair() { var k = Object.keys(pts); return [pts[k[0]], pts[k[1]]]; }
  stage.addEventListener('pointerdown', function (e) {
    if (photo || e.target.closest('button')) return;
    touch();
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    stage.setPointerCapture(e.pointerId);
    if (Object.keys(pts).length === 2) {
      var q = pair();
      pinch = { d: Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y), m: svgPt((q[0].x + q[1].x) / 2, (q[0].y + q[1].y) / 2) };
    }
  });
  stage.addEventListener('pointermove', function (e) {
    var p = pts[e.pointerId];
    if (!p) return;
    var n = Object.keys(pts).length;
    if (n === 1) {
      cam.yaw += (e.clientX - p.x) * 0.4;
      cam.pitch += (e.clientY - p.y) * 0.25;
      p.x = e.clientX; p.y = e.clientY;
      clamp(); draw();
    } else if (n === 2 && pinch) {
      p.x = e.clientX; p.y = e.clientY;
      var q = pair(), d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y);
      var m = svgPt((q[0].x + q[1].x) / 2, (q[0].y + q[1].y) / 2);
      pan[0] += m[0] - pinch.m[0]; pan[1] += m[1] - pinch.m[1];
      zoomAt(zoom * d / pinch.d, m[0], m[1]);
      pinch = { d: d, m: m };
    }
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    stage.addEventListener(t, function (e) { delete pts[e.pointerId]; pinch = null; });
  });

  // Mouse wheel / trackpad: zoom toward the cursor. At the limits the page scrolls as usual.
  stage.addEventListener('wheel', function (e) {
    if (photo) return;
    var z = zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
    if ((e.deltaY > 0 && zoom <= ZMIN) || (e.deltaY < 0 && zoom >= ZMAX)) return;
    e.preventDefault(); touch();
    var m = svgPt(e.clientX, e.clientY);
    zoomAt(z, m[0], m[1]);
  }, { passive: false });

  root.querySelectorAll('[data-zoom]').forEach(function (b) {
    b.addEventListener('click', function () {
      touch();
      if (photo) setPhoto(false);
      var v = b.getAttribute('data-zoom');
      if (v === 'reset') return resetView(400);
      var z0 = zoom, z1 = Math.max(ZMIN, Math.min(ZMAX, zoom * (v === 'in' ? 1.5 : 1 / 1.5)));
      var p0 = pan.slice();
      tween(300, function (e) { var z = z0 + (z1 - z0) * e; zoom = z0; pan = p0.slice(); zoomAt(z, CX, CY); });
    });
  });
  function resetView(ms, done) {
    var z0 = zoom, p0 = pan.slice();
    tween(ms, function (e) { zoom = z0 + (1 - z0) * e; pan = [p0[0] * (1 - e), p0[1] * (1 - e)]; clampPan(); }, done);
  }

  stage.addEventListener('keydown', function (e) {
    if (photo) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); touch(); return zoomAt(zoom * 1.25, CX, CY); }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); touch(); return zoomAt(zoom / 1.25, CX, CY); }
    var k = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (!k) return;
    e.preventDefault(); touch();
    cam.yaw += k[0]; cam.pitch += k[1]; clamp(); draw();
  });
  btnDoors.addEventListener('click', function () {
    touch();
    var from = open, to = open > 0.5 ? 0 : 1;
    btnDoors.setAttribute('aria-pressed', String(to === 1));
    btnDoors.textContent = to ? 'Close the doors' : 'Open the doors';
    if (photo) setPhoto(false);
    tween(800, function (e) { open = from + (to - from) * e; });
  });

  function setPhoto(on) {
    photo = on;
    root.classList.toggle('is-photo', on);
    btnPhoto.setAttribute('aria-pressed', String(on));
    btnPhoto.textContent = on ? 'Back to the 3D model' : 'See it installed';
  }
  btnPhoto.addEventListener('click', function () {
    touch();
    if (photo) return setPhoto(false);
    // swing to roughly the angle the photo was taken from, close the doors, then fade to the photo
    clamp(); // wrapped, so the swing back to the photo angle takes the short way round
    var y0 = cam.yaw, p0 = cam.pitch, o0 = open;
    btnDoors.textContent = 'Open the doors'; btnDoors.setAttribute('aria-pressed', 'false');
    var z0 = zoom, pn = pan.slice();
    tween(900, function (e) { cam.yaw = y0 + (20 - y0) * e; cam.pitch = p0 + (3 - p0) * e; open = o0 * (1 - e); zoom = z0 + (1 - z0) * e; pan = [pn[0] * (1 - e), pn[1] * (1 - e)]; clampPan(); }, function () { setPhoto(true); });
  });

  // Idle sway while on screen, until the visitor takes over
  var swayT0 = null, swayBase = 0;
  function loop(t) {
    if (!inView || touched || photo) { looping = false; swayT0 = null; return; }
    if (swayT0 === null) { swayT0 = t; swayBase = cam.yaw; }
    cam.yaw = swayBase + 28 * Math.sin((t - swayT0) / 2600);
    render();
    requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      if (inView && !reduce && !looping && !touched) { looping = true; requestAnimationFrame(loop); }
    }, { threshold: 0.3 }).observe(stage);
  }
  render();
})();
