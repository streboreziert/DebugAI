/* Noeti Boards — questions about a board, answered from its data (Claude via the sample capability) */
(function () {
  'use strict';
  const N = window.Noeti;
  const el = N.el;
  const I = N.icons;

  const RULES = `You are a hardware debugging assistant embedded in a PCB viewer. You read schematics, netlists and layouts and help engineers bring up boards and find faults. Never give yourself a name.
Answer about THIS board using the board data below${'${TOOLS}'}. Rules:
- Be concrete. Cite reference designators (U3, C12) and net names exactly as they appear in the data.
- When you give a measurement, say where to put the probe (ref.pin, test point or via on the named net) and the value you expect, and say when the expected value is inferred rather than read from the data.
- Do not invent parts, nets or values that are not in the data. If the data cannot answer, say what is missing.
- Plain prose or short bullet lists. No headings. Keep it under about 220 words unless the user asks for depth.`;

  const DEBUG_RULES = `The user is describing a fault on a physical unit of this board. Respond in three parts, as short bullet lists:
1. Likely causes, most likely first (2–4), each naming the parts and nets involved and why the symptom points there.
2. Measurement plan: what to probe, where (ref.pin, test point or net), with power on or off, and the value a healthy board should show.
3. What each result tells you: which cause it confirms or rules out.`;

  function boardContext(ctx, sel) {
    const { B, repo, board, version } = ctx;
    const m = B.meta, st = B.stats;
    const L = [];
    L.push(`# ${repo.title} — board "${board.name}" (${version.label})`);
    L.push(repo.user ? `Source: made on Noeti (${N.lib.kindLabel(repo.meta)})${repo.meta.desc ? ' · ' + repo.meta.desc.slice(0, 300) : ''}` : `Source: ${repo.url} · ${version.pcbPath} · KiCad ${version.kicad}`);
    if (ctx.extra) { try { const x = ctx.extra(); if (x) L.push(x); } catch (e) { /* optional */ } }
    L.push(`Board: ${m.w.toFixed(1)} x ${m.h.toFixed(1)} mm, ${m.cu.length} copper layers (${m.cu.join(', ')}), ${m.thickness} mm, finish ${m.finish}, solder mask ${m.maskName}.`);
    L.push(`Counts: ${st.parts} placed parts (${st.top} top / ${st.bottom} bottom), ${st.lines} BOM lines, ${st.nets} nets, ${st.vias} vias, ${st.sheets} schematic sheets. Min track ${m.minTrack} mm, min drill ${m.minDrill} mm.`);
    const summ = N.summaryFor(repo.id, board.id, version.id);
    if (summ) L.push('Overview: ' + summ.text);
    L.push('\n## ICs, modules and major parts (ref | value | footprint | description)');
    const major = B.fps.filter(f => /^(U|IC|M|MOD|Q|Y|X|J|USB|SW|L|FB|D|BT|F)\d/.test(f.r) && f.z && f.z[0] !== 'none');
    const important = major.filter(f => /^(U|IC|M|MOD|J|USB|Y|X)\d/.test(f.r)).sort((a, b) => N.refCmp(a.r, b.r)).slice(0, 90);
    for (const f of important) {
      const sp = B.schParts.get(f.r);
      L.push(`${f.r} | ${f.v} | ${f.fp} | ${(sp && sp.desc || f.d || '').slice(0, 90)}`);
    }
    const others = {};
    for (const f of B.fps) {
      const k = (f.r.match(/^[A-Za-z]+/) || [''])[0];
      if (!k || /^(U|IC|M|MOD|J|USB|Y|X)$/.test(k)) continue;
      others[k] = (others[k] || 0) + 1;
    }
    L.push('Other parts by prefix: ' + Object.entries(others).map(([k, v]) => `${k}×${v}`).join(', '));
    L.push('\n## Supply rails (net | pads | parts on it | narrowest track | test points)');
    const rails = [...B.power].map(n => B.netInfo(n)).sort((a, b) => b.padCount - a.padCount).slice(0, 40);
    for (const r of rails) {
      const refs = [...new Set(r.pads.map(p => p.ref))];
      L.push(`${r.name} | ${r.padCount} | ${refs.slice(0, 18).join(' ')}${refs.length > 18 ? ' …' : ''} | ${r.widthMin ? r.widthMin + ' mm' : 'pour/none'} | ${r.testpoints.join(' ') || 'none'}`);
    }
    L.push('\n## IC power and control pins (ref.pin function → net)');
    for (const f of B.fps.filter(f => /^(U|IC)\d/.test(f.r)).slice(0, 45)) {
      const pins = f.pads.map(pi => B.pads[pi]).filter(p => p[10] && (B.power.has(p[10]) || /EN|RST|RESET|PG|BOOT|CLK|XTAL|XIN|XOUT|VBUS|CC\d|SDA|SCL|FB|SW/i.test(p[14] || '') || /EN|RST|RESET|PG|BOOT|SDA|SCL/i.test(N.fmt.shortNet(B.nets[p[10]]))));
      if (!pins.length) continue;
      const uniq = new Map();
      for (const p of pins) { const k = (p[14] || p[1]) + '→' + N.fmt.shortNet(B.nets[p[10]]); if (!uniq.has(k)) uniq.set(k, `${p[1]}${p[14] ? ' ' + p[14] : ''}→${N.fmt.shortNet(B.nets[p[10]])}`); }
      L.push(`${f.r} (${f.v}): ${[...uniq.values()].slice(0, 24).join(', ')}`);
    }
    L.push('\n## Connectors (ref | value | nets)');
    for (const f of B.fps.filter(f => /^(J|USB|P|CN)\d/.test(f.r)).slice(0, 30)) {
      const nets = [...new Set(f.pads.map(pi => B.pads[pi][10]).filter(Boolean).map(n => N.fmt.shortNet(B.nets[n])))];
      L.push(`${f.r} | ${f.v} | ${nets.slice(0, 24).join(', ')}${nets.length > 24 ? ' …' : ''}`);
    }
    L.push('\n## Automated check results');
    for (const c of B.checks) {
      L.push(`[${c.status}] ${c.title}: ${c.summary}`);
      for (const it of c.items.slice(0, c.status === 'pass' ? 0 : 4)) L.push('  - ' + it.t);
    }
    if (sel && (sel.refs.size || sel.nets.size)) {
      L.push('\n## What the user has selected in the viewer right now');
      for (const r of [...sel.refs].slice(0, 3)) {
        const p = B.partInfo(r);
        if (!p) continue;
        L.push(`Part ${r}: ${p.value} · ${p.footprint} · ${p.side} side · ${p.desc}`);
        L.push('Pins: ' + p.pins.slice(0, 120).map(x => `${x.pin}${x.fn ? '(' + x.fn + ')' : ''}=${N.fmt.shortNet(x.net) || 'nc'}`).join(', '));
      }
      for (const n of [...sel.nets].slice(0, 3)) {
        const ni = B.netInfo(n);
        L.push(`Net ${ni.name}: ${ni.padCount} pads (${ni.pads.slice(0, 60).map(p => p.ref + '.' + p.pin).join(' ')}), ${ni.vias} vias, ${ni.trackLen} mm of track on ${ni.layers.join('/') || 'pours only'}${ni.widthMin ? ', widths ' + ni.widthMin + '–' + ni.widthMax + ' mm' : ''}.`);
      }
    }
    let s = L.join('\n');
    if (s.length > 60000) s = s.slice(0, 60000) + '\n…(truncated)';
    return s;
  }

  function tools(ctx) {
    const B = ctx.B;
    return [
      {
        name: 'get_part',
        description: 'Look up one part by reference designator. Returns value, footprint, description, side, position (mm) and every pin with its function and net.',
        inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Reference designator, e.g. U3' } }, required: ['ref'] },
        execute: ({ ref }) => {
          const p = B.partInfo(String(ref).trim().toUpperCase()) || B.partInfo(String(ref).trim());
          if (!p) throw new Error('No part ' + ref + ' on this board');
          return Object.assign({}, p, { pins: p.pins.slice(0, 200) });
        },
      },
      {
        name: 'get_net',
        description: 'Look up one net by name (full hierarchical name or its last segment). Returns every pad on it, vias, routed length, track widths, layers and test points.',
        inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        execute: ({ name }) => {
          const n = B.findNet(String(name));
          if (n <= 0) throw new Error('No net named ' + name);
          const ni = B.netInfo(n);
          return Object.assign({}, ni, { pads: ni.pads.slice(0, 200) });
        },
      },
      {
        name: 'search_board',
        description: 'Search parts (by ref, value, footprint, description or fields) and net names. Returns up to 30 matches of each.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        execute: ({ query }) => {
          const q = String(query).toLowerCase();
          const parts = [];
          for (const f of B.fps) {
            const sp = B.schParts.get(f.r);
            const hay = [f.r, f.v, f.fp, f.d, sp && sp.desc, ...Object.values(Object.assign({}, f.p, sp && sp.p))].join(' ').toLowerCase();
            if (hay.includes(q)) parts.push({ ref: f.r, value: f.v, footprint: f.fp, desc: (sp && sp.desc) || f.d || '' });
            if (parts.length >= 30) break;
          }
          const nets = B.nets.filter(n => n && n.toLowerCase().includes(q)).slice(0, 30);
          return { parts, nets };
        },
      },
      {
        name: 'highlight',
        description: 'Highlight parts and nets in the board viewer so the user can see them. Call once near the end with the parts and nets your answer is about.',
        inputSchema: { type: 'object', properties: { refs: { type: 'array', items: { type: 'string' } }, nets: { type: 'array', items: { type: 'string' } } } },
        execute: ({ refs, nets }) => {
          const r = (Array.isArray(refs) ? refs : []).map(String).filter(x => B.fp(x));
          const n = (Array.isArray(nets) ? nets : []).map(x => B.findNet(String(x))).filter(x => x > 0);
          ctx.onHighlight(r, n);
          return `Highlighted ${r.length} parts and ${n.length} nets.`;
        },
      },
    ];
  }

  // Turn references and net names in rendered answers into clickable probes
  function linkify(root, ctx) {
    const B = ctx.B;
    const named = [...new Set(B.nets.filter(n => n && !/^(Net-|unconnected)/.test(N.fmt.shortNet(n))).map(N.fmt.shortNet))]
      .filter(n => n.length >= 3).sort((a, b) => b.length - a.length).slice(0, 700);
    const netRe = named.length ? new RegExp('(^|[^A-Za-z0-9_/+.-])(' + named.map(s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|') + ')(?![A-Za-z0-9_])', 'g') : null;
    const refRe = /\b([A-Z]{1,4}\d{1,4}[A-Z]?)(?:\.(\w+))?\b/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement.closest('button, a, pre')) continue;
      const text = node.nodeValue;
      const marks = [];
      let m;
      refRe.lastIndex = 0;
      while ((m = refRe.exec(text))) if (B.fp(m[1])) marks.push({ s: m.index, e: m.index + m[0].length, ref: m[1], label: m[0] });
      if (netRe) {
        netRe.lastIndex = 0;
        while ((m = netRe.exec(text))) {
          const s = m.index + m[1].length, e = s + m[2].length;
          if (!marks.some(x => s < x.e && e > x.s)) marks.push({ s, e, net: m[2], label: m[2] });
        }
      }
      if (!marks.length) continue;
      marks.sort((a, b) => a.s - b.s);
      const frag = document.createDocumentFragment();
      let pos = 0;
      for (const mk of marks) {
        if (mk.s < pos) continue;
        frag.append(text.slice(pos, mk.s));
        frag.append(el('button', {
          class: 'probe-chip ' + (mk.ref ? 'ref' : 'net'), title: mk.ref ? 'Show ' + mk.ref + ' on the board' : 'Trace ' + mk.net,
          onclick: () => mk.ref ? ctx.onHighlight([mk.ref], []) : ctx.onHighlight([], [B.findNet(mk.net)].filter(x => x > 0)),
        }, mk.label));
        pos = mk.e;
      }
      frag.append(text.slice(pos));
      node.replaceWith(frag);
    }
  }

  const ERR = {
    not_granted: 'Asking Claude was not allowed for this page. You can still browse the board.',
    sampling_disabled: 'Claude is not available for this account, so questions cannot be answered here.',
    rate_limited: 'Too many questions in a short time. Wait a moment, then ask again.',
    session_expired: 'Your session expired. Sign in again to keep asking.',
    refused: 'Claude declined that question. Try asking it a different way.',
    prompt_too_large: 'That was too much to send at once. Ask about a smaller part of the board.',
    empty_completion: 'No answer came back. Try rephrasing the question.',
    upstream_error: 'The connection dropped before the answer finished. Ask again to retry.',
  };

  N.renderAsk = function (host, ctx) {
    host.innerHTML = '';
    const summ = N.summaryFor(ctx.repo.id, ctx.board.id, ctx.version.id);
    const thread = [];
    let mode = 'ask';
    let ctl = null;
    let sample = null;
    let canTools = false;

    const summaryBox = el('div', { class: 'ask-summary' }, el('p', null, summ ? summ.text : ctx.repo.user ? `${ctx.repo.title}: ${ctx.B.stats.parts} part${ctx.B.stats.parts === 1 ? '' : 's'} on a ${ctx.B.meta.w.toFixed(0)} × ${ctx.B.meta.h.toFixed(0)} mm, ${ctx.B.meta.cu.length}-layer board${ctx.repo.kind === 'design' ? ', placed but not routed yet' : ''}. ${ctx.repo.meta.desc || ''}` : `${ctx.repo.title}: ${ctx.board.name}. ${ctx.B.stats.parts} parts on a ${ctx.B.meta.cu.length}-layer board.`));
    const more = el('button', { class: 'linkish ask-more', onclick: () => ask('Tell me more about how this board works: its main blocks, how power flows from the input to each rail, and which parts I should look at first when bringing it up.', { label: 'Tell me more' }) }, 'Tell me more');
    summaryBox.append(more);
    linkify(summaryBox.querySelector('p'), ctx);
    const tries = el('div', { class: 'ask-try' },
      (summ ? summ.q : ['What does each IC on this board do?', 'Which rails should I measure first at power-up?', 'What do the failing checks mean for bring-up?']).map(q =>
        el('button', { class: 'try', onclick: () => ask(q) }, N.svg(I.right), el('span', null, q))));
    const modeSeg = el('div', { class: 'seg small', role: 'group', 'aria-label': 'Question type' },
      el('button', { class: 'active', onclick: e => setMode('ask', e.currentTarget) }, 'Question'),
      el('button', { onclick: e => setMode('debug', e.currentTarget) }, N.svg(I.bug), 'Fault on a unit'));
    const log = el('div', { class: 'ask-log', 'aria-live': 'polite' });
    const input = el('input', { class: 'input ask-input', id: 'ask-input', type: 'text', placeholder: 'Which rail comes up first? What does U4 do?', 'aria-label': 'Question about this board' });
    const sendBtn = el('button', { class: 'btn', 'aria-label': 'Answer the question', onclick: () => submit() }, 'Answer');
    const stopBtn = el('button', { class: 'btn icon-only', 'aria-label': 'Stop', hidden: true, onclick: () => ctl && ctl.abort() }, N.svg(I.stop));
    const selHint = el('div', { class: 'ask-sel', hidden: true });
    const composer = el('div', { class: 'ask-compose' }, el('div', { class: 'ask-row' }, input, sendBtn, stopBtn), el('div', { class: 'ask-row2' }, modeSeg, selHint));
    const note = el('p', { class: 'ask-note' }, 'Answered by Claude on your account, from this board’s netlist, BOM and check results.');
    const offline = el('p', { class: 'ask-offline', hidden: true }, 'Open this page in Claude to get questions answered. Everything else works here.');
    host.append(summaryBox, tries, log, composer, note, offline);

    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });

    function setMode(m, btn) {
      mode = m;
      modeSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      input.placeholder = m === 'debug' ? 'The symptom, e.g. “3V3 reads 2.1 V and U4 gets hot”' : 'Which rail comes up first? What does U4 do?';
      input.focus();
    }
    function updateSel() {
      const sel = ctx.getSelection();
      const bits = [...sel.refs].slice(0, 3).concat([...sel.nets].slice(0, 2).map(n => N.fmt.shortNet(ctx.B.nets[n])));
      selHint.hidden = !bits.length;
      selHint.textContent = bits.length ? 'About the selection: ' + bits.join(', ') : '';
    }
    updateSel();
    const off = N.bus.on('selection', updateSel);

    (async () => {
      sample = await N.caps.use('sample');
      if (!sample) { composer.hidden = true; note.hidden = true; offline.hidden = false; more.hidden = true; tries.classList.add('disabled'); return; }
      try { const lim = await sample.limits(); canTools = !!(lim && lim.tools); } catch (e) { canTools = false; }
    })();

    function submit() {
      const q = input.value.trim();
      if (!q) { input.focus(); return; }
      input.value = '';
      ask(q, { debug: mode === 'debug' });
    }

    async function ask(q, opts = {}) {
      if (!sample) {
        sample = await N.caps.use('sample');
        if (!sample) { N.toast('Open this page in Claude to get questions answered.', 'warn'); return; }
      }
      if (ctl) ctl.abort();
      const userMsg = el('div', { class: 'msg user' }, opts.debug ? el('span', { class: 'tag' }, 'Fault') : null, el('span', null, opts.label || q));
      const body = el('div', { class: 'md' }, el('span', { class: 'thinking' }, el('span', { class: 'dots' }), 'Reading the board…'));
      const botMsg = el('div', { class: 'msg bot' }, body);
      log.append(userMsg, botMsg);
      botMsg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      sendBtn.hidden = true; stopBtn.hidden = false;
      ctl = new AbortController();
      const sel = ctx.getSelection();
      const context = boardContext(ctx, sel);
      const rules = RULES.replace('${TOOLS}', canTools ? ' and your tools (get_part, get_net, search_board, highlight)' : '') + (opts.debug ? '\n\n' + DEBUG_RULES : '');
      const turns = [{ role: 'user', content: rules + '\n\n<board_data>\n' + context + '\n</board_data>' }];
      for (const t of thread.slice(-6)) turns.push(t);
      turns.push({ role: 'user', content: (opts.debug ? 'Symptom: ' : '') + q });
      let rendered = '';
      const render = N.debounce(text => {
        body.innerHTML = N.markdown(text);
        linkify(body, ctx);
      }, 60);
      const status = t => { body.innerHTML = ''; body.append(el('span', { class: 'thinking' }, el('span', { class: 'dots' }), t)); };
      const toolList = canTools ? tools(ctx).map(t => Object.assign({}, t, {
        execute: (input, c) => { status(t.name === 'highlight' ? 'Highlighting on the board…' : `Looking up ${Object.values(input || {})[0] || ''}…`); return t.execute(input, c); },
      })) : undefined;
      try {
        const opt = { signal: ctl.signal, modelTier: 'default', onText: ({ text }) => { rendered = text; render(text); } };
        if (toolList) opt.tools = toolList; else opt.cache = false;
        const res = await sample(turns, opt);
        rendered = res.text;
        body.innerHTML = N.markdown(res.text);
        linkify(body, ctx);
        if (res.truncated) body.append(el('p', { class: 'muted small' }, 'The answer was cut short. Ask a narrower question for the rest.'));
        thread.push({ role: 'user', content: q }, { role: 'assistant', content: res.text });
        autoHighlight(res.text);
      } catch (e) {
        const code = e && e.code;
        if (code === 'cancelled') { if (!rendered) body.innerHTML = '<p class="muted">Stopped.</p>'; }
        else if (code === 'tools_unavailable') { canTools = false; body.innerHTML = '<p class="muted">Retrying without board tools…</p>'; setTimeout(() => ask(q, opts), 50); botMsg.remove(); userMsg.remove(); }
        else {
          const keep = e && e.text && code !== 'refused' ? N.markdown(e.text) : '';
          body.innerHTML = keep;
          if (keep) linkify(body, ctx);
          body.append(el('p', { class: 'err' }, ERR[code] || 'Something went wrong while asking. Try again.'));
          if (code === 'not_granted' || code === 'sampling_disabled') { composer.hidden = true; offline.hidden = false; }
        }
      } finally {
        sendBtn.hidden = false; stopBtn.hidden = true; ctl = null;
      }
    }
    function autoHighlight(text) {
      // if the tools path did not highlight anything, highlight the parts named in the answer
      const refs = [...new Set((text.match(/\b[A-Z]{1,4}\d{1,4}[A-Z]?\b/g) || []).filter(r => ctx.B.fp(r)))].slice(0, 8);
      if (refs.length && !ctx.getSelection().refs.size && !ctx.getSelection().nets.size) ctx.onHighlight(refs, [], true);
    }
    return { ask, destroy: off };
  };
})();
