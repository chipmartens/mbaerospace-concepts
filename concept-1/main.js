// Manitoba Aerospace & Defence, concept 1. Vanilla, no dependencies.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the pin: one engine, five camera positions ---------- */
  // f = focal point in the photo (0..1), s = where it lands on screen (0..1), z = zoom over "cover".
  // Beats: 1 machined (the afterburning engine is the right object), 2 overhauled and 3 tested
  // (casing only, the plume is cropped out of frame), 4 commanded (pull back, dimmed).
  const KEYS_WIDE = [
    { z: 1.00, fx: 0.50, fy: 0.50, sx: 0.50, sy: 0.50 },  // hero: the whole test cell
    { z: 2.00, fx: 0.67, fy: 0.38, sx: 0.70, sy: 0.50 },  // machined: nozzle petals and actuators
    { z: 3.00, fx: 0.99, fy: 0.23, sx: 0.98, sy: 0.45 },  // overhauled: engine case, plume out of frame
    { z: 3.00, fx: 0.99, fy: 0.54, sx: 0.98, sy: 0.50 },  // tested: case and test stand, plume out of frame
    { z: 1.00, fx: 0.50, fy: 0.50, sx: 0.50, sy: 0.50 },  // commanded: pull back
  ];
  const KEYS_TALL = [
    { z: 1.00, fx: 0.62, fy: 0.40, sx: 0.50, sy: 0.30 },
    { z: 1.55, fx: 0.69, fy: 0.37, sx: 0.50, sy: 0.30 },
    { z: 1.60, fx: 0.85, fy: 0.25, sx: 0.50, sy: 0.30 },
    { z: 1.60, fx: 0.82, fy: 0.50, sx: 0.50, sy: 0.30 },
    { z: 1.00, fx: 0.55, fy: 0.45, sx: 0.50, sy: 0.30 },
  ];
  const pin = $('.pin'), stage = $('.stage'), shot = $('.shot');
  const beats = $$('.beat'), ticks = $$('.ticks i');
  const AR = 3200 / 2133;
  let vw = 0, vh = 0, W0 = 0, H0 = 0, keys = KEYS_WIDE, beatNow = -1, raf = 0;

  function size() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    W0 = Math.max(vw, vh * AR); H0 = W0 / AR;
    shot.style.width = W0 + 'px'; shot.style.height = H0 + 'px';
    keys = vw < 760 ? KEYS_TALL : KEYS_WIDE;
    frame();
  }
  function place(k) {
    const w = W0 * k.z, h = H0 * k.z;
    let tx = k.sx * vw - k.fx * w, ty = k.sy * vh - k.fy * h;
    tx = Math.min(0, Math.max(vw - w, tx)); ty = Math.min(0, Math.max(vh - h, ty));
    return { z: k.z, tx, ty };
  }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function frame() {
    raf = 0;
    const r = pin.getBoundingClientRect();
    const span = pin.offsetHeight - vh;
    const p = Math.min(1, Math.max(0, -r.top / span));       // 0..1 through the pin
    // segments: hero 0..0.1, then four beats of equal length
    const pos = p < 0.1 ? 0 : 1 + Math.min(3.999, (p - 0.1) / 0.9 * 4);
    const beat = Math.floor(pos);
    if (beat !== beatNow) {
      beatNow = beat;
      stage.dataset.beat = beat;
      beats.forEach(b => b.classList.toggle('on', +b.dataset.i === beat));
      ticks.forEach((t, i) => t.classList.toggle('on', i + 1 === beat));
      if (beat > 0) closeResults();
    }
    let a, b, t;
    if (reduce) { a = b = place(keys[beat]); t = 0; }
    else {
      // hold each camera position for the middle of its beat, move in the last third
      const i = Math.min(4, Math.floor(pos)), local = pos - i;
      const m = i === 0 ? Math.min(1, p / 0.1) : Math.max(0, (local - 0.62) / 0.38);
      a = place(keys[i]); b = place(keys[Math.min(4, i + 1)]); t = ease(i === 4 ? 0 : m);
    }
    const z = a.z + (b.z - a.z) * t, tx = a.tx + (b.tx - a.tx) * t, ty = a.ty + (b.ty - a.ty) * t;
    shot.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${z.toFixed(4)})`;
  }
  // ponytail: place() clamps translate for zoom >= 1 only; every key uses z >= 1.
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener('resize', size);
  size();

  /* ---------- header ---------- */
  const hdr = $('.hdr');
  const solid = () => hdr.classList.toggle('solid', scrollY > 30);
  addEventListener('scroll', solid, { passive: true }); solid();

  /* ---------- menu ---------- */
  const menu = $('#menu'), openBtn = $('[data-menu-open]');
  let lastFocus = null;
  function openMenu() {
    lastFocus = document.activeElement;
    menu.hidden = false; void menu.offsetWidth; menu.classList.add('open');   // reflow, then fade in
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    $('.menu-close', menu).focus();
  }
  function closeMenu(restore = true) {
    menu.classList.remove('open'); openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 320);
    if (restore && lastFocus) lastFocus.focus();
  }
  openBtn.addEventListener('click', openMenu);
  $('[data-menu-close]').addEventListener('click', () => closeMenu());
  $$('[data-menu-link]', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
    if (e.key === 'Tab' && menu.classList.contains('open')) {   // keep focus inside the dialog
      const f = $$('a, button', menu); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- find a supplier (sample data, real members only) ---------- */
  const MEMBERS = [
    ['StandardAero', 'Engine overhaul: CF34, CFM56, and RCAF CC-130 and CP-140 engines', 'engine engines overhaul mro repair maintenance turbine cf34 cfm56 c-130 cc-130 cp-140 p-8 poseidon'],
    ['Magellan Aerospace', 'Machining for F404 and F414 engines, Black Brant rockets, satellite buses', 'machining machined machine cnc engine parts f404 f414 rocket rockets space satellite satellites propulsion'],
    ['Boeing Winnipeg', "Aerospace composite parts, Canada's largest composite plant", 'composite composites structures carbon fibre fiber aerostructures'],
    ['GE Aviation Canada', 'Engine research, testing and development centre in Winnipeg', 'engine engines test testing research development'],
    ['MDs AeroTest', 'Built the GLACIER cold-weather engine test facility with NRC', 'cold icing ice winter test testing engine glacier certification'],
    ['EnviroTREC', 'Non-profit partner of GLACIER, engine testing in Thompson', 'cold icing ice winter test testing engine glacier thompson certification'],
    ['SkyAlyne', 'RCAF Future Aircrew Training, from Winnipeg and Southport', 'training train aircrew pilot pilots flight rcaf'],
    ['KF Aerospace', 'Aircraft maintenance, leasing and defence training', 'maintenance mro repair aircraft leasing training defence defense'],
    ['PAL Aerospace', 'ISR, in-service support and aircrew training', 'isr surveillance in-service support training aircrew defence defense'],
    ['Southport Aerospace Centre', 'Home of 3 Canadian Forces Flight Training School', 'training flight airfield airport pilot'],
    ['Babcock Canada', 'Aerial firefighting management', 'firefighting fire aerial wildfire'],
    ['MicroPilot', 'Autopilots for drones and uncrewed aircraft', 'autopilot autopilots drone drones uav uas uncrewed unmanned avionics'],
    ['Collins Aerospace', 'Dash 8 cargo conversion', 'cargo conversion modification dash 8 dash-8'],
    ['Castellan Information Security Services', 'Cyber readiness for CMMC and CPCSC', 'cyber security cybersecurity cmmc cpcsc controlled goods'],
    ['Mark=1T Consulting', 'Defence and Arctic cyber', 'cyber security cybersecurity arctic defence defense'],
    ['Red River College Polytech', 'Training and applied research; leads the Defence and Dual-Use Innovation Bridge', 'training education college research smes sme defence defense'],
    ['University of Manitoba', 'Engineering research, STARLab space research', 'research university engineering space satellite'],
    ['Cadorath', 'Helicopter component repair and overhaul', 'repair overhaul components helicopter mro maintenance'],
  ];
  const find = $('[data-find]'), q = $('#q'), box = $('.results', find), res = $('.results-in', box);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function search(text) {
    const words = text.toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !['and', 'the', 'for', 'of', 'in', 'a'].includes(w));
    if (!words.length) return [];
    return MEMBERS.map(m => {
      const hay = (m[0] + ' ' + m[1] + ' ' + m[2]).toLowerCase();
      const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : (w.length > 4 && hay.includes(w.slice(0, -1)) ? 1 : 0)), 0);
      return { m, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.m);
  }
  // looked up by selector: the pin calls this on load, before res below is initialised (deep links)
  function closeResults() { $('.results').classList.remove('show'); }
  find.addEventListener('submit', e => {
    e.preventDefault();
    const text = q.value.trim();
    if (!text) { q.focus(); res.innerHTML = '<p class="miss">Type a capability, for example engine overhaul, composites or cyber.</p>'; box.classList.add('show'); return; }
    const hits = search(text);
    if (hits.length) {
      const top = hits.slice(0, 4);
      res.innerHTML = `<p class="tag">Sample data from member profiles</p><ol>${top.map(m => `<li><a href="stub.html#members"><b>${esc(m[0])}</b><span>${esc(m[1])}</span></a></li>`).join('')}</ol>` +
        (hits.length > 4 ? `<p class="more">${hits.length - 4} more in this sample. <a class="tlink" href="#members">See all members</a></p>` : '');
    } else {
      res.innerHTML = `<p class="tag">Sample data from member profiles</p><p class="miss">“${esc(text)}” is not in this sample. We can still find you a Manitoba supplier: <a href="#contact" data-reason="Finding a supplier">send us the brief</a> or call <a href="tel:+12042722957">204-272-2957</a>.</p>`;
    }
    box.classList.add('show');
  });
  q.addEventListener('keydown', e => { if (e.key === 'Escape') closeResults(); });

  // any "find a supplier" link returns to the field
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-focus-search]');
    if (!a) return;
    e.preventDefault();
    if (menu.classList.contains('open')) closeMenu(false);
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => q.focus({ preventScroll: true }), reduce ? 0 : 600);
  });

  /* ---------- links that preset the contact reason ---------- */
  const reason = $('#c-reason');
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-reason]');
    if (a) reason.value = a.dataset.reason;
  });

  /* ---------- rail ---------- */
  const rail = $('.rail'), prev = $('.rail-ctl .prev'), next = $('.rail-ctl .next');
  const stepW = () => rail.querySelector('article').offsetWidth + 24;
  prev.addEventListener('click', () => rail.scrollBy({ left: -stepW(), behavior: reduce ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: stepW(), behavior: reduce ? 'auto' : 'smooth' }));
  const railState = () => { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8; };
  rail.addEventListener('scroll', railState, { passive: true }); addEventListener('resize', railState); railState();
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });

  /* ---------- reveal on scroll ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- contact form ---------- */
  const form = $('[data-contact]'), sent = $('.sent');
  const rules = {
    'c-name': v => v.trim() ? '' : 'Enter your name.',
    'c-email': v => !v.trim() ? 'Enter your email address.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@company.ca.'),
    'c-msg': v => v.trim().length >= 5 ? '' : 'Tell us a little about what you need.',
  };
  function check(id) {
    const el = $('#' + id), msg = rules[id](el.value);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('#e-' + id.slice(2)).textContent = msg;
    return !msg;
  }
  Object.keys(rules).forEach(id => {
    const el = $('#' + id);
    el.addEventListener('blur', () => { if (el.value) check(id); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(id); });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = Object.keys(rules).filter(id => !check(id));
    if (bad.length) { $('#' + bad[0]).focus(); return; }
    const name = $('#c-name').value.trim().split(' ')[0];
    $('[data-name]', sent).textContent = ', ' + name;
    $('[data-topic]', sent).textContent = reason.value.toLowerCase();
    form.hidden = true; sent.classList.add('show'); sent.focus();
  });
})();
