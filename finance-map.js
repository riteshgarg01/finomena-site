/* Finance back-office map: renders a finance-map.yaml (the single source of truth) into an interactive map.
   Used by the website page (#finance-map, generic data) and by build_map.py (a client's data, one self-contained file).
   Data: YAML text in <script type="text/yaml" id="finance-map-data">, else fetched from data-src on the mount element.
   Needs js-yaml (window.jsyaml). Colours come from the page's CSS variables, with fallbacks for a standalone file. */
(function () {
  const PRIORITY = { high: 'High priority', medium: 'Medium', low: 'Low', skip: 'Served by existing tools' };
  const STATUS = { live: 'Finomena: live', next: 'Finomena: next', idea: 'Agentic opportunity' };
  const SIGNAL = { starred: '★ starred', circled: '◯ circled' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CSS = `
.fm{--fm-teal:var(--teal,#0f7f82);--fm-deep:var(--teal-deep,#0c4a50);--fm-wash:var(--teal-wash,#e3f2f1);--fm-amber:var(--amber,#c97f1a);
  --fm-ink:var(--ink,#0d2326);--fm-ink2:var(--ink-2,#3e5559);--fm-ink3:var(--ink-3,#6b7f82);--fm-line:var(--line,#ece4e4);
  --fm-sunk:var(--sunk,#f7f1f1);--fm-bg:var(--bg,#fffafa);--fm-ok:var(--ok,#1f8a5b);position:relative;color:var(--fm-ink)}
.fm-bar{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;margin:0 0 18px}
.fm-legend{display:flex;flex-wrap:wrap;gap:8px}
.fm-chip{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;padding:5px 10px;border:1px solid var(--fm-line);border-radius:99px;background:var(--fm-bg);color:var(--fm-ink2);cursor:pointer;user-select:none}
.fm-chip[aria-pressed="false"]{opacity:.45;text-decoration:line-through}
.fm-dot{width:10px;height:10px;border-radius:3px;display:inline-block}
.fm-toggles{display:flex;gap:8px;flex-wrap:wrap}
.fm-toggle{font:600 .82rem inherit;padding:7px 12px;border-radius:10px;border:1px solid var(--fm-line);background:var(--fm-bg);color:var(--fm-ink2);cursor:pointer}
.fm-toggle[aria-pressed="true"]{background:var(--fm-deep);border-color:var(--fm-deep);color:#fff}
.fm-root{display:flex;justify-content:center;margin-bottom:34px}
.fm-seg{display:inline-flex;border:1px solid var(--fm-line);border-radius:10px;overflow:hidden}
.fm-seg button{font:600 .82rem inherit;padding:7px 12px;border:0;background:var(--fm-bg);color:var(--fm-ink2);cursor:pointer}
.fm-seg button[aria-pressed="true"]{background:var(--fm-deep);color:#fff}
.fm-map{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(150px,.45fr) minmax(0,1fr);
  grid-template-areas:"top top top" "left center right" "bottom bottom bottom";gap:30px 26px;align-items:center;position:relative;z-index:1}
.fm-slot{display:flex;gap:16px;align-items:flex-start;min-width:0}
.fm-slot:empty{display:none}
.fm-slot.top{grid-area:top;justify-content:center}.fm-slot.bottom{grid-area:bottom;justify-content:center}
.fm-slot.left{grid-area:left;flex-direction:column;align-items:stretch}.fm-slot.right{grid-area:right;flex-direction:column;align-items:stretch}
.fm-slot.top>.fm-col,.fm-slot.bottom>.fm-col{flex:1 1 0;max-width:640px}
.fm-center{grid-area:center;display:grid;place-items:center}
.fm-root-box.hub{display:grid;gap:4px;text-align:center;padding:22px 20px;border-radius:50%;width:150px;height:150px;place-content:center;
  box-shadow:0 0 0 10px color-mix(in srgb,var(--fm-teal) 12%,transparent),0 18px 40px -20px rgba(12,74,80,.7)}
.fm-root-box.hub small{font-weight:400;font-size:.68rem;opacity:.8;line-height:1.3}
.fm-map .fm-col.focus{grid-column:auto}
.fm-col.horiz .fm-cards{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}
.fm-root-box{padding:12px 26px;border-radius:14px;background:var(--fm-deep);color:#fff;font-weight:700;letter-spacing:.01em;box-shadow:0 14px 30px -18px rgba(12,74,80,.6)}
.fm-stage{position:relative}
.fm-cols{display:grid;grid-template-columns:repeat(var(--fm-n,5),minmax(0,1fr));gap:16px;align-items:start;position:relative;z-index:1}
.fm-col{border:1px solid var(--fm-line);border-radius:16px;background:color-mix(in srgb,var(--fm-bg) 70%,transparent);padding:12px;display:grid;gap:10px;position:relative;align-content:start}
.fm-col.focus{grid-column:span 2;border:2px solid var(--fm-amber);box-shadow:0 18px 40px -26px rgba(201,127,26,.7)}
.fm-col.adjacent{border-style:dashed}
.fm-col-head{display:grid;gap:3px;padding:2px 4px 6px}
.fm-col-head b{font-size:1rem}
.fm-col-head small{color:var(--fm-ink3);font-size:.76rem}
.fm-ribbon{position:absolute;top:-11px;right:14px;background:var(--fm-amber);color:#2b1700;font:700 .66rem ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:99px}
.fm-cards{display:grid;gap:8px;align-items:start}
.fm-col.focus .fm-cards{grid-template-columns:1fr 1fr}
.fm-card{position:relative;text-align:left;border:1px solid var(--fm-line);border-left:5px solid var(--fm-pri,#ccc);border-radius:12px;background:var(--fm-bg);padding:10px 11px 9px;cursor:pointer;display:grid;gap:6px;align-content:start;font:inherit;color:inherit;transition:transform .15s ease,box-shadow .15s ease,opacity .2s ease}
.fm-card:hover,.fm-card:focus-visible,.fm-card.sel{transform:translateY(-1px);box-shadow:0 10px 24px -16px rgba(13,35,38,.45);outline:none}
.fm-card.sel{border-color:var(--fm-deep)}
.fm-card b{font-size:.88rem;line-height:1.25}
.fm-card .fm-sub{font-size:.74rem;color:var(--fm-ink3);line-height:1.35}
.fm-card.unconfirmed{border-style:dashed}
.fm-card.unconfirmed b::after{content:" ?";color:var(--fm-ink3);font-weight:400}
.fm-card.skip{background:repeating-linear-gradient(135deg,var(--fm-sunk) 0 6px,var(--fm-bg) 6px 12px);color:var(--fm-ink3)}
.fm-card.dim{opacity:.22}
.fm-tags{display:flex;flex-wrap:wrap;gap:4px;align-self:start}
.fm-tag{font:600 .64rem ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:6px;background:var(--fm-sunk);color:var(--fm-ink2)}
.fm-tag.live{background:color-mix(in srgb,var(--fm-ok) 15%,transparent);color:var(--fm-ok)}
.fm-tag.next{background:var(--fm-wash);color:var(--fm-deep)}
.fm-tag.idea{background:color-mix(in srgb,var(--fm-amber) 14%,transparent);color:#8a5410}
.fm-tag.signal{background:transparent;border:1px dashed var(--fm-ink3);color:var(--fm-ink2)}
.fm-group{border:1px dashed var(--fm-line);border-radius:12px;padding:8px;display:grid;gap:6px}
.fm-group>.fm-group-name{font-size:.78rem;font-weight:700;color:var(--fm-ink2);padding:0 2px}
.fm-svg{position:absolute;left:0;top:0;pointer-events:none;z-index:0;overflow:visible}
.fm-svg.top{z-index:2}
.fm-flow{fill:none;stroke:var(--fm-teal);stroke-width:1.6;opacity:.7;transition:opacity .2s ease,stroke-width .2s ease}
.fm-flow.hot{opacity:1;stroke-width:2.4}
.fm-flow-label{font:600 10.5px ui-sans-serif,system-ui,sans-serif;fill:var(--fm-deep);paint-order:stroke;stroke:var(--fm-bg);stroke-width:4px;opacity:0;transition:opacity .2s ease}
.fm-flow-label.hot{opacity:1}
.fm-link{stroke:var(--fm-ink3);stroke-width:1.2;fill:none;opacity:.6}
.fm-link.adjacent{stroke-dasharray:5 5}
.fm-panel{position:sticky;bottom:12px;margin-top:18px;border:1px solid var(--fm-line);border-radius:16px;background:var(--fm-bg);box-shadow:0 22px 50px -28px rgba(13,35,38,.55);padding:16px 18px;display:none;z-index:3}
.fm-panel.open{display:block}
.fm-panel h3{margin:0 0 4px;font-size:1.05rem}
.fm-panel .fm-close{position:absolute;top:10px;right:12px;border:0;background:none;font-size:1.3rem;cursor:pointer;color:var(--fm-ink3)}
.fm-panel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 22px;margin-top:10px}
.fm-panel h4{margin:0 0 4px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--fm-ink3)}
.fm-panel ul{margin:0;padding-left:18px;font-size:.88rem;line-height:1.5}
.fm-panel p{margin:0;font-size:.88rem;line-height:1.5}
.fm-panel a{color:var(--fm-teal);font-weight:600}
.fm-ideas li{margin-bottom:4px}
.fm-note{font-size:.78rem;color:var(--fm-ink3);margin-top:12px}
@media (max-width:1100px){.fm-cols{grid-template-columns:repeat(2,minmax(0,1fr))}.fm-col.focus{grid-column:1/-1}
  .fm-map{grid-template-columns:1fr;grid-template-areas:"center" "left" "right" "top" "bottom"}.fm-slot.top,.fm-slot.bottom{flex-direction:column;align-items:stretch}
  .fm-slot.top>.fm-col,.fm-slot.bottom>.fm-col{max-width:none}}
@media (max-width:640px){.fm-cols{grid-template-columns:1fr}.fm-col.focus .fm-cards{grid-template-columns:1fr}.fm-svg{display:none}}
@media (prefers-reduced-motion:reduce){.fm-card,.fm-flow,.fm-flow-label{transition:none}}
`;

  function priColor(p) {
    return { high: 'var(--fm-teal)', medium: 'color-mix(in srgb, var(--fm-teal) 45%, #fff)', low: '#c9d3d4', skip: '#d9d3d3' }[p] || '#c9d3d4';
  }

  function walk(items, cb, parent) {
    (items || []).forEach(it => { cb(it, parent); if (it.children) walk(it.children, cb, it); });
  }

  function render(mount, data) {
    if (!document.getElementById('fm-style')) {
      const st = document.createElement('style'); st.id = 'fm-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    const focus = (data.meta || {}).pilot_focus;
    const byId = {}, domainOf = {};
    (data.domains || []).forEach(d => { byId[d.id] = d; walk(d.children, it => { byId[it.id] = it; domainOf[it.id] = d; }); });
    const pri = it => it.priority || (domainOf[it.id] || {}).priority || 'low';
    const flows = data.flows || [];

    const card = it => {
      const tags = [];
      if (it.finomena) tags.push(`<span class="fm-tag ${esc(it.finomena)}">${it.finomena === 'live' ? '● live' : it.finomena === 'next' ? 'next' : 'agentic idea'}</span>`);
      (it.signals || []).forEach(s => tags.push(`<span class="fm-tag signal" title="Flagged on the whiteboard">${esc(SIGNAL[s] || s)}</span>`));
      const sub = it.product_name ? `${esc(it.product_name)}` : (it.activities || []).slice(0, 3).join(' · ');
      return `<button type="button" class="fm-card ${esc(pri(it))}${it.unconfirmed ? ' unconfirmed' : ''}" data-id="${esc(it.id)}" data-pri="${esc(pri(it))}"
        data-fin="${esc(it.finomena || '')}" style="--fm-pri:${priColor(pri(it))}" aria-label="${esc(it.name)}, ${esc(PRIORITY[pri(it)] || '')}">
        <b>${esc(it.name)}</b>${sub ? `<span class="fm-sub">${esc(sub)}</span>` : ''}${tags.length ? `<span class="fm-tags">${tags.join('')}</span>` : ''}</button>`;
    };
    const cell = it => it.children && it.children.length
      ? `<div class="fm-group" data-group="${esc(it.id)}"><span class="fm-group-name">${esc(it.name)}</span>${it.children.map(card).join('')}</div>`
      : card(it);

    const domains = data.domains || [];
    const block = (d, slot) => {
      const items = d.children && d.children.length ? d.children : [{ ...d, id: d.id + '__self', name: 'Activities', children: undefined }];
      if (!d.children) byId[d.id + '__self'] = { ...d, name: d.name };
      const adj = d.reports === 'adjacent';
      const horiz = slot === 'top' || slot === 'bottom';
      return `<section class="fm-col${d.id === focus ? ' focus' : ''}${adj ? ' adjacent' : ''}${horiz ? ' horiz' : ''}" data-domain="${esc(d.id)}" data-slot="${esc(slot || '')}">
        ${d.id === focus ? `<span class="fm-ribbon">${esc((data.meta || {}).focus_label || 'Pilot focus')}</span>` : ''}
        <div class="fm-col-head"><b>${esc(d.name)}</b><small>${esc(adj ? 'Works alongside finance' : (PRIORITY[d.priority] || ''))}${d.systems ? ' · ' + esc(d.systems.join(', ')) : ''}</small></div>
        <div class="fm-cards">${items.map(cell).join('')}</div></section>`;
    };
    // Map view: each domain's side of the CFO comes from `position` (left / right / top / bottom); unset ones fill in.
    const SIDES = ['left', 'right', 'top', 'bottom'];
    const slotOf = {};
    let free = 0;
    domains.forEach(d => { if (SIDES.includes(d.position)) slotOf[d.id] = d.position; });
    domains.forEach(d => { if (!slotOf[d.id]) slotOf[d.id] = d.id === focus ? 'left' : SIDES[free++ % 4]; });
    const rootName = esc((data.root || {}).name || 'CFO Office');
    const views = {
      org: () => `<div class="fm-root"><div class="fm-root-box" data-root>${rootName}</div></div>
        <div class="fm-cols">${domains.map(d => block(d, '')).join('')}</div>`,
      map: () => `<div class="fm-map">${SIDES.map(side => `<div class="fm-slot ${side}">${domains.filter(d => slotOf[d.id] === side).map(d => block(d, side)).join('')}</div>`).join('')}
        <div class="fm-center"><div class="fm-root-box hub" data-root>${rootName}</div></div></div>`,
    };
    let view = (data.meta || {}).default_view === 'map' ? 'map' : 'org';
    try { view = localStorage.getItem('fm-view') || view; } catch (e) { /* storage blocked: use the default */ }

    const legend = Object.entries(PRIORITY).map(([k, v]) =>
      `<span class="fm-chip" role="button" tabindex="0" aria-pressed="true" data-pri-filter="${k}"><i class="fm-dot" style="background:${priColor(k)}"></i>${v}</span>`).join('');
    mount.innerHTML = `<div class="fm" style="--fm-n:${domains.length + (domains.some(d => d.id === focus) ? 1 : 0)}">
      <div class="fm-bar"><div class="fm-legend" aria-label="Filter by priority">${legend}</div>
        <div class="fm-toggles">
          <span class="fm-seg" role="group" aria-label="View"><button type="button" data-view="org">Org chart</button><button type="button" data-view="map">Map</button></span>
          <button type="button" class="fm-toggle" data-mode="finomena" aria-pressed="false">Where Finomena runs today</button>
          <button type="button" class="fm-toggle" data-mode="flows" aria-pressed="true">Show flows</button></div></div>
      <div class="fm-stage"></div>
      <div class="fm-panel" role="dialog" aria-live="polite"></div></div>`;

    const fm = mount.querySelector('.fm'), stage = mount.querySelector('.fm-stage'), panel = mount.querySelector('.fm-panel');
    let svg, showFlows = true, onlyFin = false, hidden = new Set(), selected = null;

    function layout(v) {
      view = v;
      try { localStorage.setItem('fm-view', v); } catch (e) { /* not remembered: fine */ }
      fm.classList.toggle('as-map', v === 'map');
      fm.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
      stage.innerHTML = views[v]() + '<svg class="fm-svg" aria-hidden="true"></svg>';
      svg = stage.querySelector('.fm-svg');
      applyFilters();
      if (selected) stage.querySelectorAll('.fm-card').forEach(c => c.classList.toggle('sel', c.dataset.id === selected));
      requestAnimationFrame(draw);
    }

    function draw() {
      const box = stage.getBoundingClientRect();
      if (!box.width) return;
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.style.width = box.width + 'px'; svg.style.height = box.height + 'px';
      const rel = el => { const r = el.getBoundingClientRect(); return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }; };
      let out = '';
      const root = rel(stage.querySelector('[data-root]'));
      stage.querySelectorAll('.fm-col').forEach(c => {          // CFO → each domain
        const r = rel(c), cls = `fm-link${c.classList.contains('adjacent') ? ' adjacent' : ''}`;
        const cx = root.x + root.w / 2, cy = root.y + root.h / 2;
        let d;
        if (view === 'map' && c.dataset.slot === 'left') d = `M${root.x} ${cy}H${r.x + r.w}`;
        else if (view === 'map' && c.dataset.slot === 'right') d = `M${root.x + root.w} ${cy}H${r.x}`;
        else if (view === 'map' && c.dataset.slot === 'top') { const ym = (r.y + r.h + root.y) / 2; d = `M${cx} ${root.y}V${ym}H${r.x + r.w / 2}V${r.y + r.h}`; }
        else { const y1 = root.y + root.h, ym = (y1 + r.y) / 2; d = `M${cx} ${y1}V${ym}H${r.x + r.w / 2}V${r.y}`; }
        out += `<path class="${cls}" d="${d}"/>`;
      });
      if (showFlows) flows.forEach((f, i) => {
        const a = stage.querySelector(`[data-id="${f.from}"]`), b = stage.querySelector(`[data-id="${f.to}"]`);
        if (!a || !b) return;
        const A = rel(a), B = rel(b);
        const leftToRight = A.x + A.w / 2 < B.x + B.w / 2;
        const sameCol = Math.abs((A.x + A.w / 2) - (B.x + B.w / 2)) < 40;
        let d, lx, ly;
        if (sameCol) {
          const x = A.x + A.w, y1 = A.y + A.h / 2, y2 = B.y + B.h / 2, bend = x + 22;
          d = `M${x} ${y1}C${bend} ${y1} ${bend} ${y2} ${x} ${y2}`; lx = bend + 2; ly = (y1 + y2) / 2;
        } else {
          const x1 = leftToRight ? A.x + A.w : A.x, x2 = leftToRight ? B.x : B.x + B.w, y1 = A.y + A.h / 2, y2 = B.y + B.h / 2, mx = (x1 + x2) / 2;
          d = `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`; lx = mx; ly = (y1 + y2) / 2 - 6;
        }
        out += `<path class="fm-flow" data-flow="${i}" data-a="${esc(f.from)}" data-b="${esc(f.to)}" d="${d}" marker-end="url(#fm-arrow)"/>
                <text class="fm-flow-label" data-flow="${i}" x="${lx}" y="${ly}" text-anchor="middle">${esc(f.label || '')}</text>`;
      });
      svg.innerHTML = `<defs><marker id="fm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill="var(--fm-teal)"/></marker></defs>${out}`;
      if (selected) heat(selected);
    }

    function heat(id) {
      svg.querySelectorAll('[data-flow]').forEach(el => {
        const f = flows[+el.dataset.flow]; el.classList.toggle('hot', !!id && (f.from === id || f.to === id));
      });
    }

    function applyFilters() {
      stage.querySelectorAll('.fm-card').forEach(c => {
        const off = hidden.has(c.dataset.pri) || (onlyFin && c.dataset.fin !== 'live');
        c.classList.toggle('dim', off);
      });
    }

    function open(id) {
      const it = byId[id]; if (!it) return;
      selected = id;
      stage.querySelectorAll('.fm-card').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
      heat(id);
      const list = (title, xs, cls) => xs && xs.length ? `<div><h4>${title}</h4><ul class="${cls || ''}">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
      const ins = flows.filter(f => f.to === id).map(f => `${(byId[f.from] || {}).name || f.from}: ${f.label}`);
      const outs = flows.filter(f => f.from === id).map(f => `${(byId[f.to] || {}).name || f.to}: ${f.label}`);
      const fin = it.finomena ? `<div><h4>Finomena</h4><p><b>${esc(STATUS[it.finomena])}</b>${it.product_name ? ' · ' + esc(it.product_name) : ''}${it.finomena_note ? '. ' + esc(it.finomena_note) : ''}
        ${it.product_link ? ` <a href="${esc(it.product_link)}">See it →</a>` : ''}</p></div>` : '';
      panel.innerHTML = `<button class="fm-close" type="button" aria-label="Close">×</button>
        <h3>${esc(it.name)}</h3><p style="color:var(--fm-ink3)">${esc((domainOf[id] || {}).name || '')} · ${esc(PRIORITY[pri(it)] || '')}${it.unconfirmed ? ' · to be confirmed' : ''}</p>
        <div class="fm-panel-grid">${fin}${list('Where agents can act', it.agent_ideas, 'fm-ideas')}${list('Activities', it.activities)}
          ${list('Outputs', it.outputs)}${list('Process chain', it.process_chain)}${list('Systems in use', it.systems)}
          ${list('Receives', ins)}${list('Feeds', outs)}${it.notes ? `<div><h4>Notes</h4><p>${esc(it.notes)}</p></div>` : ''}</div>`;
      panel.classList.add('open');
      panel.querySelector('.fm-close').onclick = () => { panel.classList.remove('open'); selected = null; heat(null);
        stage.querySelectorAll('.fm-card').forEach(c => c.classList.remove('sel')); };
    }

    stage.addEventListener('click', e => { const c = e.target.closest('.fm-card'); if (c) open(c.dataset.id); });
    stage.addEventListener('mouseover', e => { const c = e.target.closest('.fm-card'); if (c) heat(c.dataset.id); });
    stage.addEventListener('mouseout', e => { const c = e.target.closest('.fm-card'); if (c) heat(selected); });
    fm.querySelectorAll('[data-pri-filter]').forEach(ch => {
      const flip = () => { const k = ch.dataset.priFilter, on = ch.getAttribute('aria-pressed') !== 'true';
        ch.setAttribute('aria-pressed', String(on)); on ? hidden.delete(k) : hidden.add(k); applyFilters(); };
      ch.addEventListener('click', flip); ch.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
    fm.querySelector('[data-mode="finomena"]').addEventListener('click', e => {
      onlyFin = !onlyFin; e.currentTarget.setAttribute('aria-pressed', String(onlyFin)); applyFilters(); });
    fm.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => layout(b.dataset.view)));
    fm.querySelector('[data-mode="flows"]').addEventListener('click', e => {
      showFlows = !showFlows; e.currentTarget.setAttribute('aria-pressed', String(showFlows)); draw(); });
    addEventListener('resize', draw);
    new ResizeObserver(() => draw()).observe(stage);
    layout(view);
    return { draw };
  }

  async function mountAll() {
    for (const mount of document.querySelectorAll('[data-finance-map]')) {
      if (mount.dataset.ready) continue;
      try {
        const inline = document.getElementById('finance-map-data');
        const text = inline ? inline.textContent : await (await fetch(mount.dataset.src || 'finance-map.yaml', { cache: 'no-cache' })).text();
        const data = window.jsyaml.load(text);
        mount.dataset.ready = '1';
        render(mount, data);
      } catch (err) {
        mount.innerHTML = `<p style="color:#b8402c">The map could not be loaded: ${esc(err.message)}</p>`;
      }
    }
  }
  window.FinanceMap = { render, mountAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
