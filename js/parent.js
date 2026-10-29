// Modo papá/mamá: perfiles, vocabulario, cuentos (copiar y pegar), progreso y ajustes.
import { state, save, uid, newProfile, getProfile, stockFor, exportBackup, importBackup, resetAll, difficultWords } from './store.js';
import { buildPrompt, parseResponse } from './prompt.js';
import { MAX_LEVEL } from './levels.js';
import { englishVoices, speak } from './tts.js';
import { render, on, esc, modal, toast, fmtTime, fmtDate } from './ui.js';
import { renderCloudPanel } from './cloudui.js';
import { forgetDevice } from './cloud.js';

const THEME_LABELS = {
  football: '⚽ Fútbol',
  blocks: '🧱 Bloques (tipo Minecraft)',
  dinosaurs: '🦖 Dinosaurios',
  animals: '🐾 Animales',
  space: '🚀 Espacio',
  superheroes: '🦸 Superhéroes',
  ocean: '🐙 Océano',
  magic: '🪄 Magia',
};

const SKILL_LABELS = {
  main_idea: 'Idea principal',
  detail: 'Detalles',
  sequence: 'Orden de los hechos',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  inference: 'Inferencia',
};

let exitTo = null;
let tab = 'kids';
let draft = null; // cuentos importados pendientes de guardar

export function openParent(onExit) {
  exitTo = onExit;
  if (!state.pin) return setPin(true);
  const root = render(`
    <div class="screen center parent">
      <h1>🔒 Modo papá/mamá</h1>
      <input id="pin" class="input pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" autofocus>
      <div class="row center">
        <button class="btn ghost" id="back">⬅ Regresar</button>
        <button class="btn primary" id="ok">Entrar</button>
      </div>
    </div>`);
  const tryPin = () => {
    if (root.querySelector('#pin').value === state.pin) dashboard();
    else {
      toast('PIN incorrecto');
      root.querySelector('#pin').value = '';
    }
  };
  root.querySelector('#ok').addEventListener('click', tryPin);
  root.querySelector('#pin').addEventListener('keydown', (e) => e.key === 'Enter' && tryPin());
  root.querySelector('#back').addEventListener('click', () => exitTo());
}

function setPin(first) {
  const root = render(`
    <div class="screen center parent">
      <h1>🔒 ${first ? 'Crea un PIN para papá/mamá' : 'Cambiar PIN'}</h1>
      <p class="muted">Protege la configuración para que los niños no la cambien. Usa 4 a 6 números.</p>
      <input id="p1" class="input pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN nuevo">
      <input id="p2" class="input pin" type="password" inputmode="numeric" maxlength="6" placeholder="Repite el PIN">
      <div class="row center">
        <button class="btn ghost" id="back">⬅ Regresar</button>
        <button class="btn primary" id="ok">Guardar PIN</button>
      </div>
    </div>`);
  root.querySelector('#back').addEventListener('click', () => (first ? exitTo() : dashboard()));
  root.querySelector('#ok').addEventListener('click', () => {
    const a = root.querySelector('#p1').value;
    const b = root.querySelector('#p2').value;
    if (!/^\d{4,6}$/.test(a)) return toast('El PIN debe tener de 4 a 6 números');
    if (a !== b) return toast('Los PIN no coinciden');
    state.pin = a;
    save();
    toast('PIN guardado ✓');
    if (first) tab = 'kids';
    dashboard();
  });
}

// ---------- Tablero ----------

function dashboard() {
  const tabs = [
    ['kids', '👧👦 Niños'],
    ['vocab', '📝 Vocabulario'],
    ['stories', '📚 Cuentos'],
    ['progress', '📈 Progreso'],
    ['settings', '⚙️ Ajustes'],
  ];
  const root = render(`
    <div class="screen parent">
      <header class="topbar">
        <h1>Modo papá/mamá</h1>
        <button class="btn ghost small" id="out">Salir 🔓</button>
      </header>
      <nav class="tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</nav>
      <section id="pane"></section>
    </div>`);
  root.querySelector('#out').addEventListener('click', () => exitTo());
  on(root, '.tab', 'click', (e, el) => {
    tab = el.dataset.t;
    dashboard();
  });
  const pane = root.querySelector('#pane');
  ({ kids: kidsPane, vocab: vocabPane, stories: storiesPane, progress: progressPane, settings: settingsPane })[tab](pane);
}

// ---------- Niños ----------

function themeChecks(selected = []) {
  return `<div class="checks">${Object.entries(THEME_LABELS)
    .map(([k, l]) => `<label class="check-chip"><input type="checkbox" value="${k}" ${selected.includes(k) ? 'checked' : ''}> ${l}</label>`)
    .join('')}</div>`;
}

function kidsPane(pane) {
  pane.innerHTML = `
    ${state.profiles
      .map(
        (p) => `
      <div class="card kid-edit" data-id="${p.id}">
        <div class="row">
          <input class="input name" value="${esc(p.name)}" placeholder="Nombre">
          <input class="input age" type="number" min="5" max="14" value="${p.age}" style="width:5.5em"> años
        </div>
        <p class="muted">Temas favoritos</p>
        ${themeChecks(p.themes)}
        <div class="row levels">
          ${['reading', 'listening']
            .map(
              (s) => `<div>${s === 'reading' ? '📖 Reading' : '🎧 Listening'}: nivel
                <button class="btn small ghost lv" data-s="${s}" data-d="-1">−</button>
                <b>${p.prog[s].level}</b>
                <button class="btn small ghost lv" data-s="${s}" data-d="1">+</button></div>`,
            )
            .join('')}
        </div>
        <div class="row">
          <button class="btn primary small save">Guardar</button>
          <button class="btn ghost small reset-pet">Cambiar compañero</button>
          <button class="btn danger small del">Borrar perfil</button>
        </div>
      </div>`,
      )
      .join('')}
    <div class="card">
      <h3>➕ Agregar niño</h3>
      <div class="row">
        <input class="input" id="nname" placeholder="Nombre">
        <input class="input" id="nage" type="number" min="5" max="14" value="9" style="width:5.5em"> años
      </div>
      <p class="muted">Temas favoritos</p>
      <div id="nthemes">${themeChecks(['football', 'blocks', 'dinosaurs', 'animals'])}</div>
      <button class="btn primary" id="add">Agregar</button>
    </div>
    <p class="muted">El nivel sube solo (2–3 misiones buenas seguidas). Úsalo a mano solo si sientes que quedó muy fácil o muy difícil.</p>`;

  const themesOf = (el) => [...el.querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);

  pane.querySelector('#add').addEventListener('click', () => {
    const name = pane.querySelector('#nname').value.trim();
    if (!name) return toast('Escribe el nombre');
    newProfile({ name, age: Number(pane.querySelector('#nage').value) || 9, themes: themesOf(pane.querySelector('#nthemes')) });
    toast('Perfil creado ✓');
    dashboard();
  });

  pane.querySelectorAll('.kid-edit').forEach((card) => {
    const p = getProfile(card.dataset.id);
    on(card, '.lv', 'click', (e, el) => {
      const s = el.dataset.s;
      p.prog[s].level = Math.min(Math.max(p.prog[s].level + Number(el.dataset.d), 1), MAX_LEVEL);
      p.prog[s].good = 0;
      p.prog[s].bad = 0;
      save();
      dashboard();
    });
    card.querySelector('.save').addEventListener('click', () => {
      p.name = card.querySelector('.name').value.trim() || p.name;
      p.age = Number(card.querySelector('.age').value) || p.age;
      p.themes = themesOf(card);
      save();
      toast('Guardado ✓');
    });
    card.querySelector('.reset-pet').addEventListener('click', async () => {
      const ok = await modal({ body: `<p>${esc(p.name)} podrá elegir otro compañero. Conserva su nivel y su XP.</p>`, buttons: [{ label: 'Cancelar', value: false }, { label: 'Sí, cambiar', cls: 'primary', value: true }] });
      if (!ok) return;
      p.creature = null;
      save();
      toast('Listo ✓');
    });
    card.querySelector('.del').addEventListener('click', async () => {
      const ok = await modal({ body: `<p>¿Borrar el perfil de <b>${esc(p.name)}</b> con todo su progreso? No se puede deshacer.</p>`, buttons: [{ label: 'Cancelar', value: false }, { label: 'Borrar', cls: 'danger', value: true }] });
      if (!ok) return;
      state.profiles = state.profiles.filter((x) => x.id !== p.id);
      state.packs = state.packs.filter((x) => x.profileId !== p.id);
      save();
      dashboard();
    });
  });
}

// ---------- Vocabulario y gramática ----------

let editingUnit = null;

function wordsToText(words) {
  return words.map((w) => (w.es ? `${w.en} = ${w.es}` : w.en)).join('\n');
}

function textToWords(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*(?:=|:|\s[-–]\s)\s*(.*)$/);
      return m ? { en: m[1].trim(), es: m[2].trim() } : { en: line, es: '' };
    })
    .filter((w) => w.en);
}

function vocabPane(pane) {
  const unit = state.units.find((u) => u.id === (editingUnit || state.activeUnitId)) || state.units[0];
  pane.innerHTML = `
    <div class="card">
      <h3>Unidades (cada 4 semanas)</h3>
      <div class="unit-list">
        ${state.units
          .map(
            (u) => `<div class="unit-row ${unit && u.id === unit.id ? 'sel' : ''}">
              <button class="link edit-u" data-id="${u.id}">${esc(u.name)}</button>
              <span class="muted">${u.words.length} palabras</span>
              ${u.id === state.activeUnitId ? '<span class="badge">✓ Activa</span>' : `<button class="btn small ghost act" data-id="${u.id}">Hacer activa</button>`}
            </div>`,
          )
          .join('')}
      </div>
      <button class="btn small" id="newu">➕ Nueva unidad</button>
    </div>
    ${
      unit
        ? `<div class="card">
      <h3>Editar unidad</h3>
      <label>Nombre<input class="input" id="uname" value="${esc(unit.name)}" placeholder="Ej. Unit 3 – Animals"></label>
      <label>Tema gramatical<input class="input" id="ugram" value="${esc(unit.grammar)}" placeholder="Ej. Comparatives and superlatives; who / which / where / when"></label>
      <label>Notas o ejemplos de gramática (opcional)<input class="input" id="unotes" value="${esc(unit.grammarNotes || '')}" placeholder="Ej. bigger than, the biggest"></label>
      <label>Vocabulario — una palabra por renglón, con su traducción después de “=”
        <textarea class="input" id="uwords" rows="12" placeholder="goalkeeper = portero\nstadium = estadio\nfossil = fósil">${esc(wordsToText(unit.words))}</textarea>
      </label>
      <div class="row">
        <button class="btn primary" id="saveu">Guardar unidad</button>
        ${state.units.length > 1 ? '<button class="btn danger small" id="delu">Borrar unidad</button>' : ''}
      </div>
      <p class="muted">La unidad <b>activa</b> se usa en el calentamiento y al crear cuentos nuevos.</p>
    </div>`
        : ''
    }`;

  on(pane, '.edit-u', 'click', (e, el) => {
    editingUnit = el.dataset.id;
    dashboard();
  });
  on(pane, '.act', 'click', (e, el) => {
    state.activeUnitId = el.dataset.id;
    save();
    dashboard();
  });
  pane.querySelector('#newu').addEventListener('click', () => {
    const u = { id: uid('unit'), name: 'Unidad nueva', grammar: '', grammarNotes: '', words: [], createdAt: new Date().toISOString() };
    state.units.push(u);
    state.activeUnitId = u.id;
    editingUnit = u.id;
    save();
    dashboard();
  });
  pane.querySelector('#saveu')?.addEventListener('click', () => {
    unit.name = pane.querySelector('#uname').value.trim() || 'Unidad';
    unit.grammar = pane.querySelector('#ugram').value.trim();
    unit.grammarNotes = pane.querySelector('#unotes').value.trim();
    unit.words = textToWords(pane.querySelector('#uwords').value);
    save();
    toast(`Guardado ✓ (${unit.words.length} palabras)`);
    dashboard();
  });
  pane.querySelector('#delu')?.addEventListener('click', async () => {
    const ok = await modal({ body: `<p>¿Borrar la unidad <b>${esc(unit.name)}</b>?</p>`, buttons: [{ label: 'Cancelar', value: false }, { label: 'Borrar', cls: 'danger', value: true }] });
    if (!ok) return;
    state.units = state.units.filter((u) => u.id !== unit.id);
    if (state.activeUnitId === unit.id) state.activeUnitId = state.units[0]?.id;
    editingUnit = null;
    save();
    dashboard();
  });
}

// ---------- Cuentos (copiar y pegar) ----------

let gen = { kid: null, unit: null, nr: 2, nl: 2 };

function storyPreview(s) {
  const qs = s.questions
    .map((q) => {
      if (q.type === 'order') return `<li>🔢 ${esc(q.q)}<br><span class="muted">${q.items.map(esc).join(' → ')}</span></li>`;
      if (q.type === 'tf') return `<li>👍👎 ${esc(q.q)} <b>(${q.answer ? 'True' : 'False'})</b></li>`;
      return `<li>${esc(q.q)} <b>(${esc(q.options[q.answer])})</b></li>`;
    })
    .join('');
  return `
    ${s.parts.map((p, i) => `<p><b>${i + 1}.</b> ${esc(p.text)}<br><span class="muted">${esc(p.es)}</span></p>`).join('')}
    <ol>${qs}</ol>
    ${s.drills?.length ? `<p class="muted"><b>Repaso del calentamiento</b></p><ul>${s.drills.map((d) => `<li>${esc(d.q)} <b>(${esc(d.options[d.answer])})</b></li>`).join('')}</ul>` : ''}`;
}

function storiesPane(pane) {
  if (!state.profiles.length) {
    pane.innerHTML = '<p class="card">Primero agrega un niño en la pestaña “Niños”.</p>';
    return;
  }
  gen.kid = getProfile(gen.kid)?.id || state.profiles[0].id;
  gen.unit = state.units.find((u) => u.id === gen.unit)?.id || state.activeUnitId;
  const kid = getProfile(gen.kid);

  const stockRows = state.profiles
    .map((p) => {
      const s = stockFor(p);
      return `<li><b>${esc(p.name)}</b>: 📖 ${s.reading} lecturas · 🎧 ${s.listening} audios listos</li>`;
    })
    .join('');

  const pending = state.packs.filter((x) => x.profileId === kid.id && !x.usedBy.includes(kid.id));

  pane.innerHTML = `
    <div class="card">
      <h3>Cuentos listos</h3>
      <ul>${stockRows}</ul>
      <p class="muted">Con 3 misiones por semana, 2 lecturas + 2 audios alcanzan para ~1 semana y media.</p>
    </div>

    <div class="card">
      <h3>Paso 1 · Crear las instrucciones</h3>
      <div class="row wrap">
        <label>Niño <select class="input" id="gkid">${state.profiles.map((p) => `<option value="${p.id}" ${p.id === gen.kid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label>Unidad <select class="input" id="gunit">${state.units.map((u) => `<option value="${u.id}" ${u.id === gen.unit ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
        <label>📖 Lecturas <input class="input" id="gnr" type="number" min="0" max="4" value="${gen.nr}" style="width:4.5em"></label>
        <label>🎧 Audios <input class="input" id="gnl" type="number" min="0" max="4" value="${gen.nl}" style="width:4.5em"></label>
      </div>
      <p class="muted">Niveles actuales de ${esc(kid.name)}: 📖 ${kid.prog.reading.level} · 🎧 ${kid.prog.listening.level}. Los cuentos se crean a su nivel.</p>
      <button class="btn primary" id="mk">📋 Copiar instrucciones</button>
      <a class="btn ghost" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a>
      <a class="btn ghost" href="https://gemini.google.com/app" target="_blank" rel="noopener">Abrir Gemini ↗</a>
      <details><summary class="muted">Ver instrucciones</summary><textarea class="input mono" id="prompt" rows="10" readonly></textarea></details>
    </div>

    <div class="card">
      <h3>Paso 2 · Pega la respuesta</h3>
      <p class="muted">Pega en Claude o Gemini las instrucciones copiadas. Cuando responda, copia toda su respuesta y pégala aquí.</p>
      <textarea class="input mono" id="resp" rows="8" placeholder='{ "stories": [ … ] }'></textarea>
      <button class="btn primary" id="imp">Revisar cuentos</button>
      <div id="draft"></div>
    </div>

    <div class="card">
      <h3>Cuentos pendientes de ${esc(kid.name)} (${pending.length})</h3>
      ${pending.length ? pending.map((s) => `
        <details class="story-row">
          <summary>${s.skill === 'reading' ? '📖' : '🎧'} <b>${esc(s.title)}</b> · nivel ${s.level} · ${s.parts.length} partes · ${s.questions.length} preguntas</summary>
          ${storyPreview(s)}
          <button class="btn danger small delstory" data-id="${s.id}">Borrar cuento</button>
        </details>`).join('') : '<p class="muted">No hay cuentos propios pendientes. (Los cuentos de ejemplo se usan mientras tanto.)</p>'}
    </div>`;

  const readForm = () => {
    gen.kid = pane.querySelector('#gkid').value;
    gen.unit = pane.querySelector('#gunit').value;
    gen.nr = Math.min(Math.max(Number(pane.querySelector('#gnr').value) || 0, 0), 4);
    gen.nl = Math.min(Math.max(Number(pane.querySelector('#gnl').value) || 0, 0), 4);
  };
  const promptText = () => {
    readForm();
    return buildPrompt({ profile: getProfile(gen.kid), unit: state.units.find((u) => u.id === gen.unit), nReading: gen.nr, nListening: gen.nl });
  };
  pane.querySelector('#prompt').value = promptText();
  pane.querySelector('#gkid').addEventListener('change', () => {
    readForm();
    draft = null;
    dashboard();
  });
  ['#gunit', '#gnr', '#gnl'].forEach((sel) => pane.querySelector(sel).addEventListener('change', () => (pane.querySelector('#prompt').value = promptText())));

  pane.querySelector('#mk').addEventListener('click', async () => {
    const text = promptText();
    pane.querySelector('#prompt').value = text;
    if (!gen.nr && !gen.nl) return toast('Elige al menos 1 lectura o 1 audio');
    try {
      await navigator.clipboard.writeText(text);
      toast('Instrucciones copiadas ✓ Ahora pégalas en Claude o Gemini');
    } catch {
      pane.querySelector('details').open = true;
      pane.querySelector('#prompt').select();
      toast('Selecciona el texto y cópialo manualmente');
    }
  });

  pane.querySelector('#imp').addEventListener('click', () => {
    readForm();
    const text = pane.querySelector('#resp').value;
    if (!text.trim()) return toast('Primero pega la respuesta');
    try {
      const { stories, errors } = parseResponse(text, { profileId: gen.kid, unitId: gen.unit });
      draft = { stories, errors };
      drawDraft(pane);
    } catch (e) {
      pane.querySelector('#draft').innerHTML = `<p class="hint">No pude leer la respuesta: ${esc(e.message)}<br>Asegúrate de copiar <b>toda</b> la respuesta. Si se cortó, pídele al chat: “continúa el JSON”.</p>`;
    }
  });
  if (draft) drawDraft(pane);

  on(pane, '.delstory', 'click', async (e, el) => {
    const ok = await modal({ body: '<p>¿Borrar este cuento?</p>', buttons: [{ label: 'Cancelar', value: false }, { label: 'Borrar', cls: 'danger', value: true }] });
    if (!ok) return;
    state.packs = state.packs.filter((x) => x.id !== el.dataset.id);
    save();
    dashboard();
  });
}

function drawDraft(pane) {
  const box = pane.querySelector('#draft');
  const { stories, errors } = draft;
  box.innerHTML = `
    ${errors.length ? `<p class="hint">⚠️ Se descartaron ${errors.length}: ${errors.map(esc).join('; ')}</p>` : ''}
    ${stories.map((s, i) => `
      <div class="draft-row">
        <label class="check-chip"><input type="checkbox" class="keep" data-i="${i}" checked> Guardar</label>
        <details class="story-row">
          <summary>${s.skill === 'reading' ? '📖' : '🎧'} <b>${esc(s.title)}</b> · nivel ${s.level} · ${s.parts.length} partes · ${s.questions.length} preguntas</summary>
          ${storyPreview(s)}
        </details>
      </div>`).join('')}
    ${stories.length ? '<button class="btn primary big" id="savedraft">✓ Guardar cuentos marcados</button>' : ''}`;
  box.querySelector('#savedraft')?.addEventListener('click', () => {
    const keep = [...box.querySelectorAll('.keep')].filter((c) => c.checked).map((c) => stories[Number(c.dataset.i)]);
    state.packs.push(...keep);
    save();
    draft = null;
    toast(`${keep.length} cuentos guardados ✓`);
    dashboard();
  });
}

// ---------- Progreso ----------

let progKid = null;

function bars(items, max, fmt) {
  if (!items.length) return '<p class="muted">Aún no hay datos.</p>';
  return `<div class="bars">${items
    .map((it) => `<div class="bar-col" title="${esc(it.title || '')}"><div class="bar" style="height:${Math.max(4, (it.v / max) * 100)}%"></div><span class="bv">${fmt(it.v)}</span><span class="bl">${esc(it.label)}</span></div>`)
    .join('')}</div>`;
}

function progressPane(pane) {
  if (!state.profiles.length) {
    pane.innerHTML = '<p class="card">Aún no hay niños.</p>';
    return;
  }
  const kid = getProfile(progKid) || state.profiles[0];
  progKid = kid.id;
  const ses = state.sessions.filter((s) => s.profileId === kid.id);
  const last = ses.slice(-12);
  const totalFocus = ses.reduce((a, s) => a + s.focusMs, 0);

  const agg = {};
  for (const s of ses.slice(-20)) {
    for (const [k, [pts, n]] of Object.entries(s.bySkill || {})) {
      agg[k] ||= [0, 0];
      agg[k][0] += pts;
      agg[k][1] += n;
    }
  }
  const skillBars = Object.entries(agg).map(([k, [pts, n]]) => ({ label: SKILL_LABELS[k] || k, v: Math.round((pts / n) * 100) }));
  const hard = difficultWords(kid);
  const recentRushed = ses.slice(-5).reduce((a, s) => a + s.rushedAny, 0);
  const reviewPct = (kind) => {
    const r = ses.slice(-10).map((s) => s.warmup?.review).filter((x) => x?.kind === kind);
    const [c, n] = r.reduce(([c, n], x) => [c + x.score[0], n + x.score[1]], [0, 0]);
    return n ? `<b>${Math.round((c / n) * 100)}%</b> al primer intento (${n} ejercicios)` : 'aún sin datos';
  };

  pane.innerHTML = `
    <div class="row wrap">
      ${state.profiles.map((p) => `<button class="btn small ${p.id === kid.id ? 'primary' : 'ghost'} pk" data-id="${p.id}">${esc(p.name)}</button>`).join('')}
    </div>
    <div class="stat-grid">
      <div class="card"><div class="big-num">📖 ${kid.prog.reading.level}<small>/${MAX_LEVEL}</small></div>Nivel reading</div>
      <div class="card"><div class="big-num">🎧 ${kid.prog.listening.level}<small>/${MAX_LEVEL}</small></div>Nivel listening</div>
      <div class="card"><div class="big-num">${ses.length}</div>Misiones (${fmtTime(totalFocus)} en total)</div>
      <div class="card"><div class="big-num">🏆 ${fmtTime(kid.best.focusMs)}</div>Récord de concentración</div>
    </div>
    <div class="card">
      <h3>Minutos de concentración por misión</h3>
      ${bars(last.map((s) => ({ v: s.focusMs / 60000, label: fmtDate(s.date), title: s.title })), Math.max(5, ...last.map((s) => s.focusMs / 60000)), (v) => v.toFixed(1))}
      <p class="muted">La meta es que esta barra crezca poco a poco: de 3–5 min hacia 12–15 min.</p>
    </div>
    <div class="card">
      <h3>Aciertos por habilidad (últimas 20 misiones)</h3>
      ${bars(skillBars, 100, (v) => v + '%')}
    </div>
    <div class="card">
      <h3>Atención</h3>
      <p>Respuestas “al aventón” en las últimas 5 misiones: <b>${recentRushed}</b> ${recentRushed <= 2 ? '👍' : '— vale la pena sentarte a su lado en la próxima misión.'}</p>
    </div>
    <div class="card">
      <h3>Repaso del calentamiento (últimas 10 misiones)</h3>
      <p>Gramática o conjugación: ${reviewPct('grammar')}</p>
      <p>Vocabulario: ${reviewPct('vocab')}</p>
      <p class="muted">Los ejercicios de gramática vienen de cada cuento nuevo y practican el tema de la unidad.</p>
    </div>
    <div class="card">
      <h3>Palabras que le cuestan</h3>
      ${hard.length ? `<div class="checks">${hard.map((h) => `<span class="chip">${esc(h.w)}</span>`).join('')}</div>` : '<p class="muted">Aún no hay suficientes datos.</p>'}
      <p class="muted">Salen de los errores en el calentamiento y de las palabras que toca para traducir. El calentamiento las repite más.</p>
    </div>
    <div class="card">
      <h3>Últimas misiones</h3>
      <div class="table-wrap"><table class="table">
        <tr><th>Fecha</th><th>Tipo</th><th>Cuento</th><th>Nivel</th><th>Tiempo</th><th>Aciertos</th><th>Aventón</th><th></th></tr>
        ${ses.slice(-15).reverse().map((s) => `
          <tr>
            <td>${fmtDate(s.date)}</td>
            <td>${s.skill === 'reading' ? '📖' : '🎧'}</td>
            <td>${esc(s.title || '')}</td>
            <td>${s.level}</td>
            <td>${fmtTime(s.focusMs)}</td>
            <td>${s.max ? Math.round((s.score / s.max) * 100) : 0}%</td>
            <td>${s.rushedAny}</td>
            <td>${s.tired ? '😴' : ''}${s.short && !s.tired ? '✂️' : ''}${s.repeat ? '🔁' : ''}</td>
          </tr>`).join('')}
      </table></div>
      <p class="muted">😴 llegó cansado (misión corta) · ✂️ misión acortada por dos sesiones difíciles · 🔁 cuento repetido</p>
    </div>`;
  on(pane, '.pk', 'click', (e, el) => {
    progKid = el.dataset.id;
    dashboard();
  });
}

// ---------- Ajustes ----------

function settingsPane(pane) {
  const voices = englishVoices();
  pane.innerHTML = `
    <div class="card">
      <h3>🔊 Voz en inglés</h3>
      ${voices.length
        ? `<select class="input" id="voice">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === state.settings.voiceURI ? 'selected' : ''}>${esc(v.name)} (${v.lang})</option>`).join('')}</select>`
        : '<p class="muted">Este navegador no tiene voces en inglés. En la tablet, instala “Servicios de voz de Google” y descarga el idioma inglés.</p>'}
      <label>Velocidad: <b id="ratev">${state.settings.rate.toFixed(2)}×</b>
        <input type="range" id="rate" min="0.6" max="1.1" step="0.05" value="${state.settings.rate}">
      </label>
      <button class="btn small" id="test">▶ Probar</button>
    </div>
    <div class="card">
      <h3>☁️ Guardar en la nube</h3>
      <div id="cloud"></div>
    </div>
    <div class="card">
      <h3>🔒 PIN</h3>
      <button class="btn small" id="pin">Cambiar PIN</button>
    </div>
    <div class="card">
      <h3>💾 Respaldo</h3>
      <p class="muted">Un archivo con todo el progreso. Útil si no usas la nube, o como copia extra.</p>
      <button class="btn small" id="exp">⬇ Descargar respaldo</button>
      <label class="btn small ghost">⬆ Cargar respaldo<input type="file" id="imp" accept="application/json,.json" hidden></label>
    </div>
    <div class="card">
      <h3>⚠️ Borrar todo</h3>
      <button class="btn danger small" id="reset">Borrar todos los datos</button>
    </div>`;
  renderCloudPanel(pane.querySelector('#cloud'));
  pane.querySelector('#voice')?.addEventListener('change', (e) => {
    state.settings.voiceURI = e.target.value;
    save();
  });
  pane.querySelector('#rate').addEventListener('input', (e) => {
    state.settings.rate = Number(e.target.value);
    pane.querySelector('#ratev').textContent = state.settings.rate.toFixed(2) + '×';
    save();
  });
  pane.querySelector('#test').addEventListener('click', () => speak('Hello! The cheetah is faster than the elephant, but the elephant is the biggest animal.'));
  pane.querySelector('#pin').addEventListener('click', () => setPin(false));
  pane.querySelector('#exp').addEventListener('click', () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fun-for-reading-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  pane.querySelector('#imp').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      importBackup(await file.text());
      toast('Respaldo cargado ✓');
      dashboard();
    } catch (err) {
      toast('No se pudo cargar: ' + esc(err.message), 3000);
    }
  });
  pane.querySelector('#reset').addEventListener('click', async () => {
    const ok = await modal({ body: '<p>Se borran perfiles, progreso, unidades y cuentos <b>de este dispositivo</b> y se cierra la sesión de la nube. Lo guardado en la nube no se borra. ¿Seguro?</p>', buttons: [{ label: 'Cancelar', value: false }, { label: 'Borrar todo', cls: 'danger', value: true }] });
    if (!ok) return;
    await forgetDevice();
    resetAll();
    exitTo();
  });
}
