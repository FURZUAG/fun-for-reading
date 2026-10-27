// La misión principal: lectura o audio por partes, micro-preguntas, pausa activa y preguntas finales.
import { state, save, wordStat, pickPack, pickRepeatPack, uid } from './store.js';
import { levelSpec, showsMicroCheck, minReadMs, rushThresholdMs, stageForLevel } from './levels.js';
import { creatureSVG } from './creatures.js';
import { t, pick, PRAISE, BRAIN_BREAKS, getLang } from './i18n.js';
import { speak, speakWord, stop as stopAudio } from './tts.js';
import { render, on, esc, shuffle, modal, toast, confetti } from './ui.js';

// ---------- Texto con palabras tocables ----------

const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

function tokensHTML(text) {
  return text
    .split(/(\s+)/)
    .map((tok) => {
      if (/^\s+$/.test(tok) || !tok) return tok;
      const core = tok.match(/[A-Za-z][A-Za-z'’-]*/)?.[0];
      return core ? `<span class="w" data-w="${esc(core)}">${esc(tok)}</span>` : esc(tok);
    })
    .join('');
}

// Devuelve el HTML del texto, resaltando la frase de evidencia si se pide.
function textHTML(text, evidence) {
  if (evidence) {
    const i = norm(text).indexOf(norm(evidence));
    if (i >= 0) {
      // norm() solo colapsa espacios; si el texto no tiene espacios dobles, los índices coinciden.
      const clean = text.replace(/\s+/g, ' ');
      const end = i + norm(evidence).length;
      return `${tokensHTML(clean.slice(0, i))}<mark>${tokensHTML(clean.slice(i, end))}</mark>${tokensHTML(clean.slice(end))}`;
    }
  }
  return tokensHTML(text);
}

function lookup(m, word) {
  const w = word.toLowerCase().replace(/[’]/g, "'");
  const variants = [w, w.replace(/'s$/, ''), w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ed$/, ''), w.replace(/ing$/, '')];
  const unitWords = m.unitWords;
  for (const v of variants) {
    if (m.pack.glossary?.[v]) return { key: v, es: m.pack.glossary[v] };
    if (unitWords[v]) return { key: v, es: unitWords[v] };
  }
  return { key: w, es: null };
}

function closePopover() {
  document.querySelector('.popover')?.remove();
}

function bindWords(m, root) {
  on(root, '.w', 'click', (e, el) => {
    e.stopPropagation();
    closePopover();
    const { key, es } = lookup(m, el.dataset.w);
    speakWord(el.dataset.w);
    if (es) {
      const st = wordStat(m.profile, key);
      st.lookups += 1;
      save();
    }
    const pop = document.createElement('div');
    pop.className = 'popover';
    pop.innerHTML = `<b>${esc(el.dataset.w)}</b> 🔊<br>${es ? esc(es) : `<span class="muted">${t('noTranslation')}</span>`}`;
    document.body.appendChild(pop);
    const r = el.getBoundingClientRect();
    const pw = pop.offsetWidth;
    pop.style.left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8) + 'px';
    pop.style.top = r.top + window.scrollY - pop.offsetHeight - 8 + 'px';
    setTimeout(closePopover, 2600);
  });
}

document.addEventListener('click', closePopover);

// ---------- Tiempo de concentración ----------

function startClock(m) {
  m.activeMs = 0;
  m.lastTick = performance.now();
  m.onVis = () => {
    if (document.hidden) {
      m.activeMs += performance.now() - m.lastTick;
      m.lastTick = null;
    } else {
      m.lastTick = performance.now();
    }
  };
  document.addEventListener('visibilitychange', m.onVis);
}

function stopClock(m) {
  if (m.lastTick) m.activeMs += performance.now() - m.lastTick;
  document.removeEventListener('visibilitychange', m.onVis);
}

// ---------- Preparación ----------

export function prepareMission(profile, { tired }) {
  let skill = profile.nextSkill || 'reading';
  let pack = pickPack(profile, skill);
  if (!pack) {
    skill = skill === 'reading' ? 'listening' : 'reading';
    pack = pickPack(profile, skill);
  }
  let repeat = false;
  if (!pack) {
    pack = pickRepeatPack(profile);
    repeat = true;
    if (!pack) return null;
    skill = pack.skill;
  }

  const prog = profile.prog[skill];
  const short = tired || prog.bad >= 2;
  let parts = pack.parts;
  let questions = pack.questions;
  if (short && parts.length > 1) {
    const n = parts.length - 1;
    const qs = questions.filter((q) => q.type !== 'order' && q.part && q.part <= n);
    if (qs.length >= 2) {
      parts = parts.slice(0, n);
      questions = qs;
    }
  }

  const spec = levelSpec(pack.level);
  const unitWords = {};
  for (const u of state.units) for (const w of u.words) if (w.es) unitWords[w.en.toLowerCase()] = w.es;

  return {
    profile,
    pack,
    skill,
    spec,
    parts,
    questions,
    short,
    tired,
    repeat,
    unitWords,
    idx: 0,
    clues: [],
    translationsLeft: spec.phraseTranslations,
    replaysLeft: spec.replays,
    results: [],
    checks: { correct: 0, total: 0 },
    rushedAny: 0,
    rushedWrong: 0,
    careful: 0,
  };
}

// ---------- Pantallas ----------

function header(m, stepLabel) {
  const total = m.parts.length;
  const dots = m.parts
    .map((_, i) => `<span class="dot ${i < m.idx || m.phase === 'questions' ? 'done' : i === m.idx ? 'now' : ''}">${i < m.idx || m.phase === 'questions' ? '✓' : i + 1}</span>`)
    .join('');
  const stage = stageForLevel(m.profile.petLevel);
  return `
    <header class="mbar">
      <button class="icon-btn" id="exit" aria-label="${t('exit')}">✕</button>
      <div class="dots">${dots}<span class="dot q ${m.phase === 'questions' ? 'now' : ''}">?</span></div>
      <div class="mbar-label">${stepLabel || `${t('part')} ${Math.min(m.idx + 1, total)} ${t('of')} ${total}`}</div>
      <div class="mini-pet" id="pet">${creatureSVG(m.profile.creature.species, stage)}</div>
    </header>`;
}

function cluesHTML(m) {
  if (!m.clues.length) return '';
  return `<div class="clues">${m.clues
    .map((c, i) => `<div class="clue ${i === m.clues.length - 1 && m.newClue ? 'pop' : ''}"><span class="emoji">${esc(c.emoji)}</span><span>${esc(c.text)}</span></div>`)
    .join('')}</div>`;
}

function bindCommon(m, root) {
  root.querySelector('#exit')?.addEventListener('click', async () => {
    const ok = await modal({
      body: `<p>${t('exitConfirm')}</p>`,
      buttons: [{ label: t('continue'), cls: 'primary', value: false }, { label: t('exit'), value: true }],
    });
    if (ok) {
      stopAudio();
      stopClock(m);
      m.onExit();
    }
  });
}

function petJump() {
  const pet = document.getElementById('pet');
  if (!pet) return;
  pet.classList.remove('jump');
  void pet.offsetWidth;
  pet.classList.add('jump');
}

function translateButton(m) {
  const left = m.translationsLeft === Infinity ? '' : ` (${m.translationsLeft} ${t('left')})`;
  return `<button class="btn small ghost" id="tr">🇲🇽 ${t('translate')}${left}</button>`;
}

function bindTranslate(m, root, part) {
  root.querySelector('#tr')?.addEventListener('click', (e) => {
    const box = root.querySelector('#trbox');
    if (!box.hidden) return;
    if (m.translationsLeft <= 0) return toast(t('noTranslations'), 2600);
    m.translationsLeft -= 1;
    box.hidden = false;
    box.textContent = part.es || '—';
    e.currentTarget.disabled = true;
  });
}

// ----- Parte de lectura -----

function showReadingPart(m) {
  const part = m.parts[m.idx];
  const root = render(`
    <div class="mission">
      ${header(m)}
      ${cluesHTML(m)}
      <article class="card story">
        ${m.idx === 0 ? `<h2 class="story-title">${esc(m.pack.title)}</h2>` : ''}
        <p class="text" id="text">${textHTML(part.text)}</p>
        <div class="row">${part.es ? translateButton(m) : ''}</div>
        <p class="translation" id="trbox" hidden></p>
      </article>
      <div id="below">
        <button class="btn big primary fillbtn" id="done" disabled>
          <span class="fill" style="animation-duration:${minReadMs(part.text)}ms"></span>
          <span class="lbl">✓ ${t('finishedReading')}</span>
        </button>
      </div>
    </div>`);
  m.newClue = false;
  bindCommon(m, root);
  bindWords(m, root);
  bindTranslate(m, root, part);
  const done = root.querySelector('#done');
  setTimeout(() => (done.disabled = false), minReadMs(part.text));
  done.addEventListener('click', () => afterPart(m, root));
}

// ----- Parte de audio -----

function keyWordsHTML(m, part) {
  if (m.pack.level > 5 || !m.pack.glossary) return '';
  const textLow = part.text.toLowerCase();
  const words = Object.keys(m.pack.glossary).filter((w) => textLow.includes(w)).slice(0, 6);
  if (!words.length) return '';
  return `<div class="keywords"><span class="muted">${t('keyWords')}:</span> ${words.map((w) => `<span class="w chip" data-w="${esc(w)}">${esc(w)}</span>`).join(' ')}</div>`;
}

function replayLabel(m) {
  return m.replaysLeft === Infinity ? '' : ` (${m.replaysLeft} ${t('left')})`;
}

function showListeningPart(m) {
  const part = m.parts[m.idx];
  const stage = stageForLevel(m.profile.petLevel);
  const root = render(`
    <div class="mission">
      ${header(m)}
      ${cluesHTML(m)}
      <article class="card listen">
        ${m.idx === 0 ? `<h2 class="story-title">${esc(m.pack.title)}</h2>` : ''}
        <div class="listen-pet" id="lpet">${creatureSVG(m.profile.creature.species, stage)}<div class="waves"><i></i><i></i><i></i></div></div>
        <div class="row center">
          <button class="btn big primary" id="play">▶ ${t('listen')}</button>
          <button class="btn ghost" id="again" hidden>🔁 ${t('listenAgain')}<span id="rl">${replayLabel(m)}</span></button>
        </div>
        ${keyWordsHTML(m, part)}
        <div class="row">${part.es ? translateButton(m) : ''}</div>
        <p class="translation" id="trbox" hidden></p>
      </article>
      <div id="below">
        <button class="btn big primary" id="done" disabled>${t('next')} ➜</button>
      </div>
    </div>`);
  m.newClue = false;
  bindCommon(m, root);
  bindWords(m, root);
  bindTranslate(m, root, part);
  const lpet = root.querySelector('#lpet');
  const play = async () => {
    lpet.classList.add('talking');
    root.querySelector('#play').disabled = true;
    root.querySelector('#again').disabled = true;
    await speak(part.text);
    lpet.classList.remove('talking');
    root.querySelector('#play').hidden = true;
    root.querySelector('#again').hidden = false;
    root.querySelector('#again').disabled = false;
    root.querySelector('#done').disabled = false;
  };
  root.querySelector('#play').addEventListener('click', play);
  root.querySelector('#again').addEventListener('click', () => {
    if (m.replaysLeft <= 0) return toast(t('noReplays'), 2600);
    m.replaysLeft -= 1;
    root.querySelector('#rl').textContent = replayLabel(m);
    play();
  });
  root.querySelector('#done').addEventListener('click', () => {
    stopAudio();
    afterPart(m, root);
  });
}

// ----- Micro-pregunta tras cada parte -----

function afterPart(m, root) {
  const part = m.parts[m.idx];
  if (part.check && showsMicroCheck(m.spec, m.idx)) {
    showMicroCheck(m, root, part);
  } else {
    completePart(m);
  }
}

function showMicroCheck(m, root, part) {
  const c = part.check;
  m.checks.total += 1;
  const below = root.querySelector('#below');
  let tries = 0;
  const draw = () => {
    below.innerHTML = `
      <div class="card check">
        <div class="tag">⚡ ${t('quickCheck')}</div>
        <h3>${esc(c.q)} <button class="icon-btn small" id="hearq" aria-label="${t('hearQuestion')}">🔊</button></h3>
        <div class="options">${c.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <div id="hint"></div>
      </div>`;
    below.querySelector('#hearq').addEventListener('click', () => speak(c.q));
    on(below, '.opt', 'click', (e, el) => {
      const i = Number(el.dataset.i);
      if (i === c.answer) {
        if (tries === 0) m.checks.correct += 1;
        el.classList.add('right');
        petJump();
        toast(`✨ ${pick(PRAISE[Math.floor(Math.random() * PRAISE.length)])}`);
        setTimeout(() => completePart(m), 900);
        return;
      }
      tries += 1;
      el.classList.add('dim');
      el.disabled = true;
      const hint = below.querySelector('#hint');
      if (m.skill === 'reading') {
        root.querySelector('#text').innerHTML = textHTML(part.text, c.evidence);
        bindWords(m, root.querySelector('#text'));
        hint.innerHTML = `<p class="hint">${t('almost')} ${t('lookYellow')}</p>`;
      } else {
        hint.innerHTML = `<p class="hint">${t('almost')}</p><button class="btn small" id="hintplay">🔊 ${t('listenAgain')}</button>`;
        hint.querySelector('#hintplay').addEventListener('click', () => speak(part.text));
      }
      if (tries >= 2 || c.options.length - tries <= 1) {
        below.querySelectorAll('.opt').forEach((b) => {
          b.disabled = true;
          if (Number(b.dataset.i) === c.answer) b.classList.add('right');
        });
        hint.innerHTML = `<p class="hint">${t('answerWas')} <b>${esc(c.options[c.answer])}</b></p><button class="btn primary" id="go">${t('continue')} ➜</button>`;
        hint.querySelector('#go').addEventListener('click', () => completePart(m));
      }
    });
  };
  draw();
  below.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function completePart(m) {
  stopAudio();
  const part = m.parts[m.idx];
  if (part.clue?.text) {
    m.clues.push(part.clue);
    m.newClue = true;
  }
  m.idx += 1;
  if (m.idx >= m.parts.length) return startQuestions(m);
  if (m.idx === 2 && m.parts.length >= 3 && m.pack.level >= 4) return showBrainBreak(m);
  showPart(m);
}

function showBrainBreak(m) {
  const b = BRAIN_BREAKS[Math.floor(Math.random() * BRAIN_BREAKS.length)];
  const root = render(`
    <div class="mission">
      ${header(m)}
      <div class="card center brain">
        <h2>🧠 ${t('brainBreak')}</h2>
        <p class="big-text">${pick(b)}</p>
        <div class="ring"><span>20</span></div>
        <div class="row center">
          <button class="btn primary big" id="go">${t('continue')} ➜</button>
        </div>
      </div>
    </div>`);
  bindCommon(m, root);
  speak(b[0]);
  let n = 20;
  const span = root.querySelector('.ring span');
  const timer = setInterval(() => {
    n -= 1;
    if (span.isConnected) span.textContent = n;
    if (n <= 0 || !span.isConnected) clearInterval(timer);
  }, 1000);
  root.querySelector('#go').addEventListener('click', () => {
    clearInterval(timer);
    showPart(m);
  });
}

function showPart(m) {
  m.phase = 'parts';
  if (m.skill === 'reading') showReadingPart(m);
  else showListeningPart(m);
}

// ---------- Preguntas finales ----------

function startQuestions(m) {
  m.phase = 'questions';
  m.qIdx = 0;
  showQuestion(m);
}

function fullTextModal(m, highlight) {
  const body = m.parts
    .map((p, i) => `<p class="text"><span class="pnum">${i + 1}</span> ${textHTML(p.text, highlight?.part === i + 1 ? highlight.evidence : null)}</p>`)
    .join('');
  modal({ title: `📖 ${esc(m.pack.title)}`, body, buttons: [{ label: t('close'), cls: 'primary', value: true }], cls: 'wide' });
  bindWords(m, document.querySelector('.modal'));
}

function supportBar(m) {
  if (m.skill === 'reading') {
    return `<button class="btn small ghost" id="seetext">📖 ${t('seeText')}</button>`;
  }
  return `<span class="muted">🔊</span> ${m.parts.map((_, i) => `<button class="btn small ghost replay" data-p="${i}">${t('part')} ${i + 1}</button>`).join('')} <span class="muted" id="rl">${replayLabel(m)}</span>`;
}

function bindSupport(m, root) {
  root.querySelector('#seetext')?.addEventListener('click', () => fullTextModal(m));
  on(root, '.replay', 'click', (e, el) => {
    if (m.replaysLeft <= 0) return toast(t('noReplays'), 2600);
    m.replaysLeft -= 1;
    const rl = root.querySelector('#rl');
    if (rl) rl.textContent = replayLabel(m);
    speak(m.parts[Number(el.dataset.p)].text);
  });
}

function showQuestion(m) {
  const q = m.questions[m.qIdx];
  const n = m.questions.length;
  const clues = m.spec.cluesDuringQuestions ? cluesHTML(m) : '';
  m.newClue = false;
  let body;
  if (q.type === 'order') {
    body = `<p class="muted">${t('tapOrder')}</p><div class="order-grid"><div class="slots" id="slots"></div><div class="pool" id="pool"></div></div><div class="row center"><button class="btn primary big" id="checkorder" disabled>${t('check')}</button></div>`;
  } else {
    const options = q.type === 'tf' ? [t('trueW'), t('falseW')] : q.options;
    body = `<div class="options ${q.type === 'tf' ? 'tf' : ''}">${options.map((o, i) => `<button class="opt" data-i="${i}">${q.type === 'tf' ? (i === 0 ? '👍 ' : '👎 ') : ''}${esc(o)}</button>`).join('')}</div>`;
  }
  const root = render(`
    <div class="mission">
      ${header(m, `${t('question')} ${m.qIdx + 1} ${t('of')} ${n}`)}
      ${clues}
      <div class="support">${supportBar(m)}</div>
      <article class="card question">
        <h3>${esc(q.q)} <button class="icon-btn small" id="hearq" aria-label="${t('hearQuestion')}">🔊</button></h3>
        ${body}
        <div id="hint"></div>
      </article>
    </div>`);
  bindCommon(m, root);
  bindSupport(m, root);
  root.querySelector('#hearq').addEventListener('click', () => speak(q.q));

  const st = { shownAt: performance.now(), tries: 0, rushAsked: false, rushed: false };
  if (q.type === 'order') setupOrder(m, root, q, st);
  else setupChoice(m, root, q, st);
}

// Pregunta si contestó "al aventón". Devuelve true si debe seguir evaluando la respuesta.
async function rushGate(m, q, st) {
  const elapsed = performance.now() - st.shownAt;
  if (st.rushAsked || elapsed >= rushThresholdMs(q)) return true;
  st.rushAsked = true;
  m.rushedAny += 1;
  const sure = await modal({
    title: t('fastTitle'),
    body: `<p>${t('fastBody')}</p>`,
    buttons: [{ label: t('letMeCheck'), cls: 'primary', value: false }, { label: t('imSure'), value: true }],
  });
  if (!sure) {
    st.shownAt = performance.now();
    return false;
  }
  st.rushed = true;
  return true;
}

function record(m, q, points, st) {
  m.results.push({ skill: q.skill, type: q.type, points, firstTry: st.tries === 0 && points === 1 });
  if (points > 0 && !st.rushed) m.careful += 1;
}

function nextQuestion(m) {
  stopAudio();
  m.qIdx += 1;
  if (m.qIdx >= m.questions.length) return finish(m);
  showQuestion(m);
}

function hintFor(m, root, q) {
  const hint = root.querySelector('#hint');
  if (!q.part) {
    hint.innerHTML = `<p class="hint">${t('almost')}</p>`;
    return;
  }
  if (m.skill === 'reading') {
    hint.innerHTML = `<p class="hint">${t('almost')} ${t('clueIn')} ${q.part}.</p><button class="btn small" id="showev">📖 ${t('part')} ${q.part}</button>`;
    hint.querySelector('#showev').addEventListener('click', () => fullTextModal(m, q));
  } else {
    hint.innerHTML = `<p class="hint">${t('almost')} ${t('clueIn')} ${q.part}.</p><button class="btn small" id="showev">🔊 ${t('part')} ${q.part}</button>`;
    hint.querySelector('#showev').addEventListener('click', () => speak(m.parts[q.part - 1].text));
  }
}

function reveal(m, root, q, correctLabel, after) {
  const hint = root.querySelector('#hint');
  const ev = q.evidence ? `<p class="evidence">“${esc(q.evidence)}”</p>` : '';
  hint.innerHTML = `<p class="hint">${t('answerWas')} <b>${esc(correctLabel)}</b></p>${ev}<p class="muted">${t('nextTime')}</p><button class="btn primary" id="go">${t('next')} ➜</button>`;
  hint.querySelector('#go').addEventListener('click', after);
}

function setupChoice(m, root, q, st) {
  const correctIdx = q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer;
  const labels = q.type === 'tf' ? [t('trueW'), t('falseW')] : q.options;
  on(root, '.opt', 'click', async (e, el) => {
    const i = Number(el.dataset.i);
    if (!(await rushGate(m, q, st))) return;
    const opts = root.querySelectorAll('.opt');
    if (i === correctIdx) {
      el.classList.add('right');
      opts.forEach((b) => (b.disabled = true));
      record(m, q, st.tries === 0 ? 1 : 0.5, st);
      petJump();
      toast(`✨ ${pick(PRAISE[Math.floor(Math.random() * PRAISE.length)])}`);
      setTimeout(() => nextQuestion(m), 1000);
      return;
    }
    if (st.rushed) m.rushedWrong += 1;
    st.tries += 1;
    el.classList.add('dim');
    el.disabled = true;
    const remaining = labels.length - st.tries;
    if (q.type === 'tf' || st.tries >= 2 || remaining <= 1) {
      opts.forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.i) === correctIdx) b.classList.add('right');
      });
      record(m, q, 0, st);
      reveal(m, root, q, labels[correctIdx], () => nextQuestion(m));
    } else {
      st.rushed = false;
      hintFor(m, root, q);
    }
  });
}

function setupOrder(m, root, q, st) {
  let pool = shuffle(q.items.map((text, i) => ({ text, i })));
  if (pool.every((it, k) => it.i === k)) pool = [...pool.slice(1), pool[0]];
  let placed = [];
  const locked = new Set();
  const slotsEl = root.querySelector('#slots');
  const poolEl = root.querySelector('#pool');
  const btn = root.querySelector('#checkorder');

  const draw = () => {
    slotsEl.innerHTML = q.items
      .map((_, k) => {
        const it = placed[k];
        return `<div class="slot ${it ? 'filled' : ''} ${locked.has(k) ? 'locked' : ''}" data-k="${k}"><span class="n">${k + 1}</span>${it ? esc(it.text) : ''}</div>`;
      })
      .join('');
    poolEl.innerHTML = pool.map((it, k) => `<button class="card-item" data-k="${k}">${esc(it.text)}</button>`).join('');
    btn.disabled = placed.filter(Boolean).length !== q.items.length;
    on(poolEl, '.card-item', 'click', (e, el) => {
      const it = pool.splice(Number(el.dataset.k), 1)[0];
      const free = q.items.findIndex((_, k) => !placed[k]);
      placed[free] = it;
      draw();
    });
    on(slotsEl, '.slot.filled:not(.locked)', 'click', (e, el) => {
      const k = Number(el.dataset.k);
      pool.push(placed[k]);
      placed[k] = undefined;
      draw();
    });
  };
  draw();

  btn.addEventListener('click', async () => {
    if (!(await rushGate(m, q, st))) return;
    const rightCount = placed.filter((it, k) => it.i === k).length;
    if (rightCount === q.items.length) {
      record(m, q, st.tries === 0 ? 1 : 0.5, st);
      slotsEl.querySelectorAll('.slot').forEach((s) => s.classList.add('right'));
      btn.disabled = true;
      petJump();
      toast(`✨ ${pick(PRAISE[Math.floor(Math.random() * PRAISE.length)])}`);
      setTimeout(() => nextQuestion(m), 1100);
      return;
    }
    if (st.rushed) m.rushedWrong += 1;
    st.tries += 1;
    if (st.tries >= 2) {
      record(m, q, 0, st);
      placed = q.items.map((text, i) => ({ text, i }));
      pool = [];
      q.items.forEach((_, k) => locked.add(k));
      draw();
      btn.hidden = true;
      reveal(m, root, q, '1 → ' + q.items.length, () => nextQuestion(m));
      return;
    }
    // Deja fijas las que están bien y regresa las demás.
    placed.forEach((it, k) => {
      if (it.i === k) locked.add(k);
      else {
        pool.push(it);
        placed[k] = undefined;
      }
    });
    st.rushed = false;
    draw();
    root.querySelector('#hint').innerHTML = `<p class="hint">${t('almost')} ${rightCount} ${t('inPlace')}</p>`;
  });
}

// ---------- Fin ----------

function finish(m) {
  stopClock(m);
  const bySkill = {};
  for (const r of m.results) {
    bySkill[r.skill] ||= [0, 0];
    bySkill[r.skill][0] += r.points;
    bySkill[r.skill][1] += 1;
  }
  const session = {
    id: uid('ses'),
    profileId: m.profile.id,
    date: new Date().toISOString(),
    skill: m.skill,
    level: m.pack.level,
    packId: m.pack.id,
    title: m.pack.title,
    tired: m.tired,
    short: m.short,
    repeat: m.repeat,
    focusMs: Math.round(m.activeMs),
    score: m.results.reduce((s, r) => s + r.points, 0),
    max: m.results.length,
    rushedAny: m.rushedAny,
    rushedWrong: m.rushedWrong,
    careful: m.careful,
    checks: m.checks,
    bySkill,
    lang: getLang(),
  };
  confetti();
  m.onFinish(session, m.pack);
}

export function runMission(m, { onFinish, onExit }) {
  m.onFinish = onFinish;
  m.onExit = onExit;
  startClock(m);
  if (m.repeat) toast(t('noStories'), 3500);
  showPart(m);
}
