/* Finance back-office map (public page #finance-map): a conceptual map of the finance function.
 * Six end-to-end flows drawn as metro lines; their stops are the standard sub-processes; every line meets at the
 * general ledger, which the CFO answers for. Click a stop for what happens there and where an agent can act.
 * Content is curated here (not from a customer); the client workshop maps still use finance-map.js + YAML.
 * Mounts on <div data-finance-landscape>. No dependencies. */
(function () {
  const LINES = [
    { id: 'p2p', name: 'Procure to pay', color: '#c97f1a', to: 'gl',
      about: 'From choosing a vendor to paying them and agreeing balances. In India: GST input credit, TDS, and MSME payment within 45 days.',
      stops: ['p_onboard', 'p_po', 'p_invoice', 'p_pay', 'p_recon'] },
    { id: 'o2c', name: 'Order to cash', color: '#2d5f9a', to: 'gl',
      about: 'From a customer contract to cash in the bank: billing, e-invoicing, collections and receipts matched to invoices.',
      stops: ['o_credit', 'o_bill', 'o_collect', 'o_apply', 'o_recon'] },
    { id: 'trs', name: 'Treasury', color: '#1f8a5b', to: 'gl',
      about: 'Cash visibility and control, between cash coming in and cash going out: forecasting, funding and FX, daily positions and payments, bank reconciliation.',
      stops: ['t_forecast', 't_funding', 't_position', 't_bank'] },
    { id: 'r2r', name: 'Record to report', color: '#0f7f82', from: 'gl',
      about: 'From the ledger to the reports and the audit: journals, reconciliations, the month-end close, consolidation and filings.',
      stops: ['r_journal', 'r_recon', 'r_close', 'r_consol', 'r_audit'] },
    { id: 'fpa', name: 'Plan to perform', color: '#b8402c', from: 'gl',
      about: 'Turning actuals into decisions: management reporting, variance analysis, budgets and forecasts, and answers for the business.',
      stops: ['f_mis', 'f_var', 'f_plan', 'f_partner'] },
    { id: 'tax', name: 'Tax & compliance', color: '#8e4a8c', to: 'gl',
      about: 'Statutory obligations that run through every transaction: notices, income tax, TDS and TCS, GST returns and input credit.',
      stops: ['x_notice', 'x_income', 'x_tds', 'x_gst'] },
  ];

  // x, y on a 1200 × 780 canvas around the ledger at (600, 420); lab = label side:
  // a above, b below, ru right-up, rd right-down, lu left-up, ld left-down
  const S = {
    gl: { x: 600, y: 420 },
    // procure to pay: lower right, into the ledger
    p_onboard: { x: 1090, y: 690, lab: 'b', name: 'Vendor onboarding', does: 'The vendor master: PAN, GSTIN, bank account and MSME status, kept clean.', agent: 'Checks documents against GST and MSME records, flags duplicate vendors and bank-account changes before anyone is paid.' },
    p_po: { x: 980, y: 690, lab: 'a', name: 'Requisition & PO', does: 'Requests approved within budget, turned into purchase orders, and goods or services received against them.', agent: 'Checks budget and past prices, routes the approval, drafts the PO, chases missing receipts.' },
    p_invoice: { x: 870, y: 690, lab: 'b', name: 'Invoice processing', does: 'Invoices captured from email and portals, checked, matched to the PO and receipt, coded and approved.', agent: 'Reads any invoice layout, runs GST, duplicate and bank checks, pairs PO lines, codes GL and cost centre, drafts vendor queries.', links: ['x_gst'] },
    p_pay: { x: 790, y: 610, lab: 'ru', name: 'Payment run', does: 'Approved invoices paid on terms; MSME vendors within 45 days (Sec 43B(h)).', agent: 'Proposes the run by due date, MSME limits and cash; holds payments with risk flags.', links: ['t_position', 'x_tds'] },
    p_recon: { x: 710, y: 530, lab: 'ru', name: 'Vendor reconciliation', does: 'Vendor statements agreed with our ledger; differences explained and cleared.', agent: 'Designs the reconciliation for each vendor, matches lines and explains every difference.' },
    // order to cash: upper right, into the ledger
    o_credit: { x: 1090, y: 150, lab: 'a', name: 'Credit & contracts', does: 'New customers set up with KYC, GSTIN, a credit limit, and the contract terms billing must follow.', agent: 'Checks GSTIN and PAN, scores credit from payment history, keeps billing rules in step with what was signed.' },
    o_bill: { x: 980, y: 150, lab: 'b', name: 'Billing & e-invoicing', does: 'Invoices raised, the e-invoice IRN generated, GST output recorded.', agent: 'Builds invoices from contracts and usage and checks them before they go out.', links: ['x_gst'] },
    o_collect: { x: 870, y: 150, lab: 'a', name: 'Collections', does: 'Follow-ups, disputes and promises to pay.', agent: 'Prioritises whom to chase, drafts follow-ups, logs disputes and promises.' },
    o_apply: { x: 790, y: 230, lab: 'rd', name: 'Cash application', does: 'Receipts matched to open invoices; short payments and TDS explained.', agent: 'Matches receipts using remittance advices, TDS deducted by the customer and part-payments.', links: ['t_bank'] },
    o_recon: { x: 710, y: 310, lab: 'rd', name: 'Customer reconciliation', does: 'Balances agreed with customers; differences explained.', agent: 'Reconciles customer statements and explains each difference.' },
    // treasury: right, into the ledger, between cash in and cash out
    t_forecast: { x: 1090, y: 420, lab: 'b', name: 'Cash forecasting', does: 'Expected receipts and payments by day and week.', agent: 'Builds the forecast from open receivables, payables and payroll, and explains variances.' },
    t_funding: { x: 980, y: 420, lab: 'a', name: 'Funding & FX', does: 'Borrowing, deposits, investments, FX exposure and hedges.', agent: 'Watches limits and exposures and suggests moves within policy.' },
    t_position: { x: 870, y: 420, lab: 'b', name: 'Cash position & payments', does: 'Daily bank balances and payment releases.', agent: 'Assembles the daily position across banks and releases approved payments.' },
    t_bank: { x: 760, y: 420, lab: 'a', name: 'Bank reconciliation', does: 'Bank statements matched to the books.', agent: 'Matches bank lines, explains what is open, proposes the entries.', links: ['r_recon'] },
    // record to report: upper left, out of the ledger
    r_journal: { x: 490, y: 310, lab: 'ld', name: 'Journals & accruals', does: 'Accruals, provisions, fixed assets and leases booked.', agent: 'Proposes accruals from open POs and contracts, with the support attached.' },
    r_recon: { x: 410, y: 230, lab: 'ld', name: 'Reconciliations', does: 'Balance-sheet accounts, sub-ledgers and intercompany balances reconciled and certified.', agent: 'Reconciles sub-ledgers and intercompany balances, flags aged items, proposes entries.' },
    r_close: { x: 330, y: 150, lab: 'a', name: 'Month-end close', does: 'The checklist, cut-offs and sign-offs that close the books.', agent: 'Runs the close checklist, chases owners, drafts variance commentary.' },
    r_consol: { x: 220, y: 150, lab: 'b', name: 'Consolidation & reporting', does: 'Entities combined; P&L, balance sheet and cash flow.', agent: 'Eliminates intercompany items, drafts the statements and notes.', links: ['f_mis'] },
    r_audit: { x: 110, y: 150, lab: 'a', name: 'Audit & filings', does: 'Statutory and internal audit; ROC / MCA filings.', agent: 'Assembles PBC lists and evidence, answers auditor queries.' },
    // plan to perform: left, out of the ledger
    f_mis: { x: 440, y: 420, lab: 'a', name: 'MIS reporting', does: 'The monthly management report for leadership and the board.', agent: 'Builds the MIS pack from the ledger and explains what moved.' },
    f_var: { x: 330, y: 420, lab: 'b', name: 'Variance & performance', does: 'Actuals against budget, by business unit and cost centre.', agent: 'Finds the drivers behind each variance and says them in plain words.' },
    f_plan: { x: 220, y: 420, lab: 'a', name: 'Budget & forecast', does: 'The annual budget and rolling forecasts.', agent: 'Drafts the forecast from run-rates and plans and tests scenarios.' },
    f_partner: { x: 110, y: 420, lab: 'b', name: 'Business partnering', does: 'Finance answers for business heads.', agent: 'Answers ad-hoc questions on finance data, citing the source rows.' },
    // tax & compliance: lower left, into the ledger
    x_notice: { x: 220, y: 690, lab: 'a', name: 'Notices & litigation', does: 'GST and income-tax notices, replies and hearings.', agent: 'Logs notices, tracks deadlines, gathers evidence and drafts replies.' },
    x_income: { x: 330, y: 690, lab: 'b', name: 'Income tax & provisions', does: 'Advance tax, returns, tax audit, transfer pricing, and the tax provision in the books.', agent: 'Assembles schedules and disallowances, such as Sec 43B(h), and the provision workings from the books.' },
    x_tds: { x: 410, y: 610, lab: 'lu', name: 'TDS & TCS', does: 'Tax withheld on payments: deposits, returns and certificates.', agent: 'Checks the section and rate on every payment and reconciles to Form 26AS.' },
    x_gst: { x: 490, y: 530, lab: 'lu', name: 'GST returns & ITC', does: 'GSTR-1 and GSTR-3B filed; input credit matched to GSTR-2B.', agent: 'Reconciles purchases with GSTR-2B and chases vendors who have not filed.' },
  };
  const lineOf = {};
  LINES.forEach(l => l.stops.forEach(s => { lineOf[s] = l; }));

  const css = `
.fl{--fl-ink:var(--ink,#0d2326);--fl-ink2:var(--ink-2,#3e5559);--fl-ink3:var(--ink-3,#6b7f82);--fl-line:var(--line,#ece4e4);font-family:inherit}
.fl-legend{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.fl-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--fl-line);background:#fff;border-radius:99px;padding:6px 14px;font-family:inherit;font-weight:600;font-size:.9rem;line-height:1.2;color:var(--fl-ink);cursor:pointer}
.fl-chip i{width:22px;height:6px;border-radius:3px;background:var(--c)}
.fl-chip[aria-pressed="true"]{border-color:var(--c);box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 25%,transparent)}
.fl-board{position:relative;background:#fff;border:1px solid var(--fl-line);border-radius:16px;padding:8px;box-shadow:var(--shadow,none)}
.fl-pop{position:absolute;z-index:2;width:300px;background:#fff;border:1px solid var(--fl-line);border-top:4px solid var(--c);border-radius:12px;box-shadow:0 12px 32px -12px rgba(13,35,38,.35);padding:12px 14px 10px;font-size:.92rem;line-height:1.45}
.fl-pop[hidden]{display:none}
.fl-pop .k{font:500 .68rem var(--f-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--c)}
.fl-pop h4{margin:2px 0 6px;font-size:1.02rem}
.fl-pop p{margin:0 0 6px;color:var(--fl-ink2)}
.fl-pop .agent{color:var(--fl-ink)}
.fl-pop .agent b{color:var(--teal,#0f7f82)}
.fl-pop .x{position:absolute;top:6px;right:8px;border:0;background:none;font-size:1.1rem;color:var(--fl-ink3);cursor:pointer}
.fl svg{display:block;width:100%;height:auto}
.fl-track{fill:none;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;transition:opacity .25s}
.fl-flow{fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-dasharray:1 22;animation:fl-move 1.6s linear infinite;opacity:.9}
@keyframes fl-move{to{stroke-dashoffset:-23}}
@media (prefers-reduced-motion:reduce){.fl-flow{animation:none;display:none}}
.fl-stop{cursor:pointer}
.fl-stop circle{fill:#fff;stroke-width:4;transition:r .15s}
.fl-stop:hover circle,.fl-stop.on circle,.fl-stop.linked circle{r:13}
.fl-stop.linked circle{fill:var(--c);fill-opacity:.25}
.fl-stop text{font:600 16px/1 var(--f-body,system-ui);fill:var(--fl-ink);paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round}
.fl-stop.on text{fill:var(--c)}
.fl.dim .fl-g:not(.on){opacity:.18}
.fl.dim .fl-g:not(.on) .fl-stop.linked{opacity:1}
.fl.dim .fl-g.has-linked{opacity:.55}
.fl-hub circle{fill:#fff;stroke:var(--teal-deep,#0c4a50);stroke-width:5}
.fl-hub text{font-family:var(--f-display,system-ui);fill:var(--teal-deep,#0c4a50);text-anchor:middle}
.fl-panel{margin-top:14px;border:1px solid var(--fl-line);border-left:5px solid var(--c,var(--teal,#0f7f82));border-radius:12px;background:#fff;padding:16px 20px;min-height:96px}
.fl-panel h3{margin:0 0 4px;font-size:1.15rem}
.fl-panel .k{font:500 .72rem var(--f-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--c,var(--teal,#0f7f82))}
.fl-panel p{margin:.35rem 0;color:var(--fl-ink2)}
.fl-panel .agent{color:var(--fl-ink)}
.fl-panel .agent b{color:var(--teal,#0f7f82)}
.fl-panel .links button{border:0;background:none;padding:0;color:var(--teal,#0f7f82);font:inherit;font-weight:600;cursor:pointer}
.fl-strips{display:none}
@media (max-width:760px){
  .fl-board,.fl-legend{display:none}.fl-strips{display:grid;gap:14px}
  .fl-strip{border:1px solid var(--fl-line);border-radius:12px;background:#fff;padding:12px 14px}
  .fl-strip h4{margin:0 0 8px;display:flex;align-items:center;gap:8px;font-size:1rem}
  .fl-strip h4 i{width:22px;height:6px;border-radius:3px;background:var(--c)}
  .fl-strip ol{list-style:none;margin:0;padding:0 0 0 14px;border-left:4px solid var(--c)}
  .fl-strip li{position:relative;padding:6px 0 6px 12px}
  .fl-strip li::before{content:"";position:absolute;left:-23px;top:13px;width:10px;height:10px;border-radius:50%;background:#fff;border:3px solid var(--c)}
  .fl-strip button{border:0;background:none;padding:0;font-family:inherit;font-weight:600;font-size:.95rem;color:var(--fl-ink);text-align:left;cursor:pointer}
  .fl-strip .gl{color:var(--fl-ink3);font-size:.85rem}
}`;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function label(id) {
    const p = S[id], n = esc(p.name);
    const at = {
      a: [p.x, p.y - 22, 'middle'], b: [p.x, p.y + 36, 'middle'],
      ru: [p.x + 20, p.y - 10, 'start'], rd: [p.x + 20, p.y + 26, 'start'], lu: [p.x - 20, p.y - 10, 'end'], ld: [p.x - 20, p.y + 26, 'end'],
    }[p.lab];
    return `<text x="${at[0]}" y="${at[1]}" text-anchor="${at[2]}">${n}</text>`;
  }

  function svg() {
    const groups = LINES.map(l => {
      const ids = l.to ? [...l.stops, 'gl'] : ['gl', ...l.stops];
      const d = 'M' + ids.map(i => `${S[i].x} ${S[i].y}`).join(' L');
      const stops = l.stops.map(s => `<g class="fl-stop" data-stop="${s}" tabindex="0" role="button" aria-label="${esc(S[s].name)}" style="--c:${l.color}">` +
        `<circle cx="${S[s].x}" cy="${S[s].y}" r="10" stroke="${l.color}"/>${label(s)}</g>`).join('');
      return `<g class="fl-g" data-line="${l.id}"><path class="fl-track" d="${d}" stroke="${l.color}"/><path class="fl-flow" d="${d}"/>${stops}</g>`;
    }).join('');
    return `<svg viewBox="0 100 1200 650" role="img" aria-label="Map of the finance function: six flows that meet at the general ledger">
      ${groups}
      <g class="fl-hub"><circle cx="600" cy="420" r="66"/>
        <text x="600" y="414" font-size="19" font-weight="700">General</text>
        <text x="600" y="436" font-size="19" font-weight="700">ledger</text>
        <text x="600" y="455" font-size="11" style="fill:#6b7f82">CFO's single view</text></g>
    </svg>`;
  }

  function strips() {
    return LINES.map(l => `<div class="fl-strip" style="--c:${l.color}"><h4><i></i>${esc(l.name)}</h4><ol>` +
      (l.from ? '<li class="gl">from the general ledger</li>' : '') +
      l.stops.map(s => `<li><button data-stop="${s}">${esc(S[s].name)}</button></li>`).join('') +
      (l.to ? '<li class="gl">into the general ledger</li>' : '') + '</ol></div>').join('');
  }

  function mount(el) {
    if (!document.getElementById('fl-style')) {
      const st = document.createElement('style');
      st.id = 'fl-style';
      st.textContent = css;
      document.head.appendChild(st);
    }
    el.classList.add('fl');
    el.innerHTML = `<div class="fl-legend">${LINES.map(l => `<button class="fl-chip" data-line="${l.id}" aria-pressed="false" style="--c:${l.color}"><i></i>${esc(l.name)}</button>`).join('')}</div>
      <div class="fl-board">${svg()}<div class="fl-pop" role="dialog" hidden></div></div><div class="fl-strips">${strips()}</div>
      <div class="fl-panel" aria-live="polite"></div>`;
    const panel = el.querySelector('.fl-panel'), pop = el.querySelector('.fl-pop'), board = el.querySelector('.fl-board');
    let popId = null;
    const hidePop = () => { pop.hidden = true; popId = null; };
    const placePop = id => {
      // a short explanation right beside the stop, on the side with more room
      const p = S[id], l = lineOf[id], dot = board.querySelector(`.fl-stop[data-stop="${id}"] circle`);
      if (!dot || !board.getClientRects().length) return;
      popId = id;
      pop.style.setProperty('--c', l.color);
      pop.innerHTML = `<button class="x" aria-label="Close">×</button><span class="k">${esc(l.name)}</span><h4>${esc(p.name)}</h4>
        <p>${esc(p.does)}</p><p class="agent"><b>Agent:</b> ${esc(p.agent)}</p>`;
      pop.hidden = false;
      const b = board.getBoundingClientRect(), d = dot.getBoundingClientRect();
      const cx = d.left + d.width / 2 - b.left, cy = d.top + d.height / 2 - b.top, w = pop.offsetWidth, h = pop.offsetHeight;
      let x = cx < b.width / 2 ? cx + 22 : cx - w - 22;
      let y = Math.min(Math.max(cy - h / 2, 8), b.height - h - 8);
      x = Math.min(Math.max(x, 8), b.width - w - 8);
      pop.style.left = `${x}px`;
      pop.style.top = `${y}px`;
    };

    const intro = () => {
      el.style.removeProperty('--c');
      panel.style.removeProperty('--c');
      panel.innerHTML = `<span class="k">How to read the map</span><h3>Six flows, one ledger</h3>
        <p>Each coloured line is an end-to-end finance process; each stop is a step in it. Every line meets at the general ledger, the single view the CFO answers for. The moving dots show which way the work flows: into the ledger from the operations on the right and below, out of it into reporting and planning on the left.</p>
        <p class="agent">Pick a line above to follow it, or click any stop to see <b>where an agent can act</b>.</p>`;
    };
    const focusLine = id => {
      el.classList.toggle('dim', !!id);
      el.querySelectorAll('.fl-g').forEach(g => g.classList.toggle('on', g.dataset.line === id));
      el.querySelectorAll('.fl-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.line === id)));
    };
    const showLine = id => {
      const l = LINES.find(x => x.id === id);
      hidePop();
      el.querySelectorAll('.fl-stop.on, .fl-stop.linked').forEach(s => s.classList.remove('on', 'linked'));
      el.querySelectorAll('.fl-g.has-linked').forEach(g => g.classList.remove('has-linked'));
      focusLine(id);
      panel.style.setProperty('--c', l.color);
      panel.innerHTML = `<span class="k">End-to-end flow</span><h3>${esc(l.name)}</h3><p>${esc(l.about)}</p>
        <p class="agent">${l.stops.map(s => esc(S[s].name)).join(' → ')}${l.to ? ' → general ledger' : ''}</p>`;
    };
    const showStop = id => {
      const p = S[id], l = lineOf[id];
      focusLine(l.id);
      const links = [...new Set(Object.keys(S).filter(k => (S[k].links || []).includes(id)).concat(p.links || []))];
      el.querySelectorAll('.fl-stop').forEach(s => {
        s.classList.toggle('on', s.dataset.stop === id);
        s.classList.toggle('linked', links.includes(s.dataset.stop));
      });
      el.querySelectorAll('.fl-g').forEach(g => g.classList.toggle('has-linked', links.some(k => lineOf[k].id === g.dataset.line && g.dataset.line !== l.id)));
      panel.style.setProperty('--c', l.color);
      panel.innerHTML = `<span class="k">${esc(l.name)}</span><h3>${esc(p.name)}</h3><p>${esc(p.does)}</p>
        <p class="agent"><b>Where an agent can act:</b> ${esc(p.agent)}</p>` +
        (links.length ? `<p class="links">Hands work to and from: ${links.map(k => `<button data-stop="${k}">${esc(S[k].name)}</button>`).join(', ')}</p>` : '');
      placePop(id);
    };

    el.addEventListener('click', e => {
      if (e.target.closest('.fl-pop .x')) return hidePop();
      if (e.target.closest('.fl-pop')) return;
      const stop = e.target.closest('[data-stop]');
      if (stop) {
        showStop(stop.dataset.stop);
        if (stop.closest('.fl-strips, .fl-panel') && matchMedia('(max-width:760px)').matches) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      const chip = e.target.closest('.fl-chip');
      if (chip) return chip.getAttribute('aria-pressed') === 'true' ? (focusLine(null), intro()) : showLine(chip.dataset.line);
      if (e.target.closest('svg') && !e.target.closest('.fl-g')) { hidePop(); focusLine(null); intro(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hidePop(); });
    window.addEventListener('resize', () => { if (popId) placePop(popId); });
    el.addEventListener('keydown', e => {
      const stop = e.target.closest('.fl-stop');
      if (stop && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showStop(stop.dataset.stop); }
    });
    intro();
  }

  window.FinanceLandscape = { mount };
  document.querySelectorAll('[data-finance-landscape]').forEach(mount);
})();
