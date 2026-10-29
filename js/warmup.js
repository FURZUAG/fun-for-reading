// Calentamiento antes de cada misión, en dos rondas:
//  1. Unir palabras de la unidad con su traducción.
//  2. Repaso según el tema de la unidad: ejercicios de gramática o conjugación ("drills")
//     del cuento o de la unidad; si no hay, un repaso de vocabulario escuchando la palabra.
import { activeUnit, wordStat, save } from './store.js';
import { SAMPLE_UNIT } from './sample.js';
import { t } from './i18n.js';
import { speak, speakWord } from './tts.js';
import { render, on, esc, shuffle, toast } from './ui.js';

const unitWords = () => (activeUnit()?.words || []).filter((w) => w.en && w.es).map((w) => ({ en: w.en, es: w.es }));

function difficulty(p, w) {
  const s = p.words[w.en.toLowerCase()];
  return s ? s.wrong * 2 + s.lookups - s.correct : 0;
}

// Prefiere las palabras que más le cuestan, con algo de variedad.
function pickWords(p, words, n) {
  const sorted = shuffle(words).sort((a, b) => difficulty(p, b) - difficulty(p, a));
  return shuffle([...sorted.slice(0, Math.ceil(n / 2)), ...shuffle(sorted.slice(Math.ceil(n / 2))).slice(0, Math.floor(n / 2))]);
}

function drillsFor(m) {
  if (m.pack.drills?.length >= 2) return m.pack.drills;
  const unit = activeUnit();
  if (unit?.drills?.length >= 2) return unit.drills;
  if (unit?.id === SAMPLE_UNIT.id) return SAMPLE_UNIT.drills;
  return [];
}

function header(step, title) {
  return `<div class="wu-head"><span class="tag">🔥 ${step}/2</span><h2>${title}</h2></div>`;
}

// ---------- Ronda 1: unir palabras ----------

function matchRound(p, words, done) {
  const chosen = pickWords(p, words, 4);
  const right = shuffle(chosen);
  let selected = null;
  let selectedEl = null;
  let matched = 0;
  let correct = 0;
  const missed = new Set();

  const root = render(`
    <div class="screen">
      ${header(1, t('warmup'))}
      <div class="match">
        <div class="col">${chosen.map((w, i) => `<button class="mcard en" data-i="${i}">🔊 ${esc(w.en)}</button>`).join('')}</div>
        <div class="col">${right.map((w) => `<button class="mcard es" data-en="${esc(w.en)}">${esc(w.es)}</button>`).join('')}</div>
      </div>
      <div class="row center"><button class="btn ghost" id="skip">${t('skip')} ➜</button></div>
    </div>`);
  root.querySelector('#skip').addEventListener('click', () => done([correct, chosen.length]));
  on(root, '.mcard.en', 'click', (e, el) => {
    root.querySelectorAll('.mcard.en').forEach((b) => b.classList.remove('sel'));
    el.classList.add('sel');
    selected = chosen[Number(el.dataset.i)];
    selectedEl = el;
    speakWord(selected.en);
  });
  on(root, '.mcard.es', 'click', (e, el) => {
    if (!selected) {
      el.classList.add('wiggle');
      return setTimeout(() => el.classList.remove('wiggle'), 400);
    }
    const st = wordStat(p, selected.en);
    st.seen += 1;
    if (el.dataset.en === selected.en) {
      if (!missed.has(selected.en)) {
        st.correct += 1;
        correct += 1;
      }
      el.classList.add('right');
      selectedEl.classList.add('right');
      el.disabled = selectedEl.disabled = true;
      selectedEl.classList.remove('sel');
      selected = null;
      matched += 1;
      if (matched === chosen.length) {
        save();
        setTimeout(() => done([correct, chosen.length]), 700);
      }
    } else {
      st.wrong += 1;
      missed.add(selected.en);
      el.classList.add('wiggle');
      setTimeout(() => el.classList.remove('wiggle'), 400);
    }
  });
}

// ---------- Ronda 2: repaso con preguntas de opción múltiple ----------

// items: [{ prompt (HTML), options, answer, hint?, es?, sayAfter?, sayBefore? }]
function quizRound({ title, subtitle, items }, done) {
  let i = 0;
  let correct = 0;
  const next = () => {
    if (i >= items.length) return done([correct, items.length]);
    const it = items[i];
    let tries = 0;
    const root = render(`
      <div class="screen">
        ${header(2, title)}
        ${subtitle ? `<p class="center muted">${esc(subtitle)}</p>` : ''}
        <article class="card question drill">
          <div class="muted">${i + 1} / ${items.length}</div>
          <h3 class="drill-q">${it.prompt}</h3>
          ${it.sayBefore ? `<button class="btn small ghost" id="hear">🔊 ${t('listenAgain')}</button>` : ''}
          ${it.es ? `<button class="btn small ghost" id="tr">🇲🇽 ${t('translate')}</button><p class="translation" id="trbox" hidden>${esc(it.es)}</p>` : ''}
          <div class="options">${it.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
          <div id="hint"></div>
        </article>
        <div class="row center"><button class="btn ghost" id="skip">${t('skip')} ➜</button></div>
      </div>`);
    if (it.sayBefore) {
      speakWord(it.sayBefore);
      root.querySelector('#hear').addEventListener('click', () => speakWord(it.sayBefore));
    }
    root.querySelector('#tr')?.addEventListener('click', (e) => {
      root.querySelector('#trbox').hidden = false;
      e.currentTarget.disabled = true;
    });
    root.querySelector('#skip').addEventListener('click', () => done([correct, items.length]));
    const advance = () => {
      i += 1;
      next();
    };
    on(root, '.opt', 'click', (e, el) => {
      const k = Number(el.dataset.k);
      const opts = root.querySelectorAll('.opt');
      const hint = root.querySelector('#hint');
      if (k === it.answer) {
        if (tries === 0) correct += 1;
        it.onResult?.(tries === 0);
        el.classList.add('right');
        opts.forEach((b) => (b.disabled = true));
        const blank = root.querySelector('.blank');
        if (blank) {
          blank.textContent = it.options[it.answer];
          blank.classList.add('filled');
        }
        if (it.sayAfter) speak(it.sayAfter);
        toast(`✨ ${t('great')}`);
        setTimeout(advance, it.sayAfter ? 2200 : 1100);
        return;
      }
      tries += 1;
      el.classList.add('dim');
      el.disabled = true;
      if (tries >= 2 || it.options.length - tries <= 1) {
        it.onResult?.(false);
        opts.forEach((b) => {
          b.disabled = true;
          if (Number(b.dataset.k) === it.answer) b.classList.add('right');
        });
        hint.innerHTML = `<p class="hint">${t('answerWas')} <b>${esc(it.options[it.answer])}</b>${it.hint ? `<br><span class="muted">${esc(it.hint)}</span>` : ''}</p><button class="btn primary" id="go">${t('next')} ➜</button>`;
        if (it.sayAfter) speak(it.sayAfter);
        hint.querySelector('#go').addEventListener('click', advance);
      } else {
        hint.innerHTML = `<p class="hint">${t('almost')}${it.hint ? `<br><span class="muted">💡 ${esc(it.hint)}</span>` : ''}</p>`;
      }
    });
  };
  next();
}

function blankHTML(q) {
  return esc(q).replace(/_{2,}/, '<span class="blank">___</span>');
}

function grammarItems(drills, n) {
  return shuffle(drills)
    .slice(0, n)
    .map((d) => {
      // Las opciones se barajan para que la correcta no quede siempre en el mismo lugar.
      const order = shuffle(d.options.map((_, k) => k));
      return {
        prompt: blankHTML(d.q),
        options: order.map((k) => d.options[k]),
        answer: order.indexOf(d.answer),
        hint: d.hint,
        es: d.es,
        sayAfter: d.q.replace(/_{2,}/, d.options[d.answer]),
      };
    });
}

// Repaso de vocabulario: escucha la palabra en inglés y elige qué significa.
function vocabItems(p, words, n) {
  return pickWords(p, words, n).map((w) => {
    const distract = shuffle(words.filter((x) => x.es !== w.es)).slice(0, 2).map((x) => x.es);
    const options = shuffle([w.es, ...distract]);
    return {
      prompt: `🔊 <b>${esc(w.en)}</b> — ${esc(t('chooseMeaning'))}`,
      options,
      answer: options.indexOf(w.es),
      sayBefore: w.en,
      onResult: (ok) => {
        const st = wordStat(p, w.en);
        st.seen += 1;
        if (ok) st.correct += 1;
        else st.wrong += 1;
        save();
      },
    };
  });
}

// ---------- Calentamiento completo ----------

export function runWarmup(p, m, onDone) {
  const words = unitWords();
  const result = { match: null, review: null };
  const nReview = m.pack.level >= 4 ? 4 : 3;
  const finish = () => {
    toast(`🔥 ${t('warmupDone')}`);
    setTimeout(() => onDone(result), 900);
  };
  const review = () => {
    const drills = drillsFor(m);
    if (drills.length >= 2) {
      const unit = activeUnit();
      return quizRound({ title: t('grammarReview'), subtitle: unit?.grammar, items: grammarItems(drills, nReview) }, (r) => {
        result.review = { kind: 'grammar', score: r };
        finish();
      });
    }
    if (words.length >= 3) {
      return quizRound({ title: t('wordReview'), items: vocabItems(p, words, nReview) }, (r) => {
        result.review = { kind: 'vocab', score: r };
        finish();
      });
    }
    onDone(result);
  };
  if (words.length >= 3) {
    matchRound(p, words, (r) => {
      result.match = r;
      review();
    });
  } else {
    review();
  }
}
