// Pantallas del niño: elegir perfil, compañero, inicio, check-in, calentamiento y resultados.
import { state, save, getProfile, activeUnit, stockFor, sessionsThisWeek, finishSession, wordStat } from './store.js';
import { SPECIES, creatureSVG } from './creatures.js';
import { stageForLevel, xpForNext } from './levels.js';
import { t, setLang, getLang } from './i18n.js';
import { speakWord, speak, stop as stopAudio } from './tts.js';
import { render, on, esc, shuffle, modal, toast, confetti, fmtTime } from './ui.js';
import { prepareMission, runMission } from './mission.js';
import { openParent } from './parent.js';

const petName = (p) => p.creature?.name || SPECIES[p.creature?.species]?.names[stageForLevel(p.petLevel)] || '';

// ---------- Elegir perfil ----------

export function showProfiles() {
  stopAudio();
  setLang('en');
  if (!state.profiles.length) {
    const root = render(`
      <div class="screen center welcome">
        <h1 class="logo">Fun for <span>Reading</span></h1>
        <div class="welcome-pets">${['dino', 'fox', 'ball', 'cube'].map((s) => creatureSVG(s, 0, 'bounce')).join('')}</div>
        <p>¡Bienvenidos! Para empezar, papá o mamá crea un PIN y los perfiles de los niños.</p>
        <button class="btn big primary" id="parent">👨‍👩‍👧 Empezar configuración</button>
      </div>`);
    root.querySelector('#parent').addEventListener('click', () => openParent(showProfiles));
    return;
  }
  const root = render(`
    <div class="screen">
      <h1 class="logo">Fun for <span>Reading</span></h1>
      <h2 class="center">${t('whoPlays')}</h2>
      <div class="profiles">
        ${state.profiles
          .map(
            (p) => `
          <button class="profile-card" data-id="${p.id}">
            ${p.creature ? creatureSVG(p.creature.species, stageForLevel(p.petLevel), 'bounce') : '<div class="egg">🥚</div>'}
            <span class="pname">${esc(p.name)}</span>
            ${p.creature ? `<span class="muted">${esc(petName(p))} · Lv ${p.petLevel}</span>` : ''}
          </button>`,
          )
          .join('')}
      </div>
      <div class="row center"><button class="btn ghost" id="parent">🔒 ${t('parents')}</button></div>
    </div>`);
  on(root, '.profile-card', 'click', (e, el) => openKid(getProfile(el.dataset.id)));
  root.querySelector('#parent').addEventListener('click', () => openParent(showProfiles));
}

function openKid(p) {
  setLang(p.lang);
  if (!p.creature) return choosePartner(p);
  kidHome(p);
}

// ---------- Elegir compañero ----------

function choosePartner(p) {
  let chosen = null;
  const root = render(`
    <div class="screen">
      <h1 class="center">${t('choosePartner')}</h1>
      <div class="partners">
        ${Object.entries(SPECIES)
          .map(([key, s]) => `<button class="partner" data-s="${key}">${creatureSVG(key, 0, 'bounce')}<b>${s.names[0]}</b><span class="muted">${s.names[1]} → ${s.names[2]}</span></button>`)
          .join('')}
      </div>
      <div class="row center">
        <input id="pname" class="input" maxlength="16" placeholder="${t('giveName')}">
        <button class="btn big primary" id="go" disabled>${t('letsGo')}</button>
      </div>
    </div>`);
  on(root, '.partner', 'click', (e, el) => {
    root.querySelectorAll('.partner').forEach((b) => b.classList.remove('sel'));
    el.classList.add('sel');
    chosen = el.dataset.s;
    root.querySelector('#go').disabled = false;
    speakWord(SPECIES[chosen].names[0]);
  });
  root.querySelector('#go').addEventListener('click', () => {
    p.creature = { species: chosen, name: root.querySelector('#pname').value.trim() || null };
    save();
    confetti();
    kidHome(p);
  });
}

// ---------- Inicio del niño ----------

function kidHome(p) {
  stopAudio();
  const stage = stageForLevel(p.petLevel);
  const need = xpForNext(p.petLevel);
  const week = sessionsThisWeek(p);
  const stock = stockFor(p);
  const root = render(`
    <div class="screen kid-home">
      <header class="topbar">
        <button class="btn ghost small" id="back">⬅ ${esc(p.name)}</button>
        <div class="coins">🪙 ${p.coins}</div>
        <button class="btn ghost small" id="lang">${getLang() === 'en' ? '🇲🇽 Español' : '🇺🇸 English'}</button>
      </header>
      <div class="home-grid">
        <div class="pet-panel">
          <div class="big-pet" id="bigpet">${creatureSVG(p.creature.species, stage, 'bounce')}</div>
          <h2>${esc(petName(p))} <span class="lv">Lv ${p.petLevel}</span></h2>
          <div class="xpbar"><div style="width:${Math.round((p.xp / need) * 100)}%"></div><span>${p.xp} / ${need} XP</span></div>
        </div>
        <div class="info-panel">
          <div class="card">
            <h3>${t('missionsWeek')}</h3>
            <div class="week">${[0, 1, 2].map((i) => `<span class="${i < week ? 'on' : ''}">⭐</span>`).join('')}${week > 3 ? `<span class="on">+${week - 3}</span>` : ''}</div>
          </div>
          <div class="card skills">
            <div>📖 ${t('reading')} <b>${t('level')} ${p.prog.reading.level}</b></div>
            <div>🎧 ${t('listeningSkill')} <b>${t('level')} ${p.prog.listening.level}</b></div>
            <div class="muted">${t('storiesReady')}: 📖 ${stock.reading} · 🎧 ${stock.listening}</div>
          </div>
          <button class="btn huge primary" id="start">🚀 ${t('start')}</button>
        </div>
      </div>
    </div>`);
  root.querySelector('#back').addEventListener('click', showProfiles);
  root.querySelector('#lang').addEventListener('click', () => {
    p.lang = getLang() === 'en' ? 'es' : 'en';
    setLang(p.lang);
    save();
    kidHome(p);
  });
  root.querySelector('#bigpet').addEventListener('click', (e) => {
    e.currentTarget.classList.remove('jump');
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add('jump');
  });
  root.querySelector('#start').addEventListener('click', () => checkIn(p));
}

// ---------- Check-in ----------

function checkIn(p) {
  const root = render(`
    <div class="screen center">
      <h1>${t('howFeel')}</h1>
      <div class="feelings">
        <button class="feel" data-f="tired"><span>😴</span>${t('tired')}</button>
        <button class="feel" data-f="ok"><span>🙂</span>${t('ok')}</button>
        <button class="feel" data-f="energy"><span>⚡</span>${t('energy')}</button>
      </div>
      <button class="btn ghost" id="back">⬅ ${t('home')}</button>
    </div>`);
  speak('How do you feel today?');
  root.querySelector('#back').addEventListener('click', () => kidHome(p));
  on(root, '.feel', 'click', (e, el) => warmUp(p, { tired: el.dataset.f === 'tired' }));
}

// ---------- Calentamiento: unir palabras ----------

function warmUp(p, opts) {
  const unit = activeUnit();
  const words = (unit?.words || []).filter((w) => w.en && w.es).map((w) => ({ en: w.en, es: w.es }));
  if (words.length < 3) return startMission(p, opts);
  const diff = (w) => {
    const s = p.words[w.en.toLowerCase()];
    return s ? s.wrong * 2 + s.lookups - s.correct : 0;
  };
  const sorted = shuffle(words).sort((a, b) => diff(b) - diff(a));
  const chosen = shuffle([...sorted.slice(0, 2), ...shuffle(sorted.slice(2)).slice(0, 2)]).slice(0, 4);
  const right = shuffle(chosen);
  let selected = null;
  let matched = 0;
  const missed = new Set();

  const root = render(`
    <div class="screen">
      <h2 class="center">🔥 ${t('warmup')}</h2>
      <div class="match">
        <div class="col">${chosen.map((w, i) => `<button class="mcard en" data-i="${i}">🔊 ${esc(w.en)}</button>`).join('')}</div>
        <div class="col">${right.map((w) => `<button class="mcard es" data-en="${esc(w.en)}">${esc(w.es)}</button>`).join('')}</div>
      </div>
      <div class="row center"><button class="btn ghost" id="skip">${t('skip')} ➜</button></div>
    </div>`);
  root.querySelector('#skip').addEventListener('click', () => startMission(p, opts));
  on(root, '.mcard.en', 'click', (e, el) => {
    root.querySelectorAll('.mcard.en').forEach((b) => b.classList.remove('sel'));
    el.classList.add('sel');
    selected = chosen[Number(el.dataset.i)];
    selected.el = el;
    speakWord(selected.en);
  });
  on(root, '.mcard.es', 'click', (e, el) => {
    if (!selected) return el.classList.add('wiggle'), setTimeout(() => el.classList.remove('wiggle'), 400);
    const st = wordStat(p, selected.en);
    st.seen += 1;
    if (el.dataset.en === selected.en) {
      if (!missed.has(selected.en)) st.correct += 1;
      el.classList.add('right');
      selected.el.classList.add('right');
      el.disabled = selected.el.disabled = true;
      selected.el.classList.remove('sel');
      selected = null;
      matched += 1;
      if (matched === chosen.length) {
        save();
        toast(`🔥 ${t('warmupDone')}`);
        setTimeout(() => startMission(p, opts), 1200);
      }
    } else {
      st.wrong += 1;
      missed.add(selected.en);
      el.classList.add('wiggle');
      setTimeout(() => el.classList.remove('wiggle'), 400);
    }
  });
}

// ---------- Misión ----------

async function startMission(p, opts) {
  const m = prepareMission(p, opts);
  if (!m) {
    await modal({ body: `<p>${t('noStories')}</p>`, buttons: [{ label: t('home'), value: true }] });
    return kidHome(p);
  }
  runMission(m, {
    onFinish: (session, pack) => showResults(p, session, pack),
    onExit: () => kidHome(p),
  });
}

// ---------- Resultados ----------

async function showResults(p, session, pack) {
  const levelBefore = p.petLevel;
  const stageBefore = stageForLevel(levelBefore);
  const out = finishSession(p, session, pack);
  const pct = session.max ? session.score / session.max : 0;
  const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
  const need = xpForNext(p.petLevel);

  const root = render(`
    <div class="screen center results">
      <h1>🎉 ${t('missionComplete')}</h1>
      <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.25}s">★</span>`).join('')}</div>
      <div class="result-grid">
        <div class="card"><div class="big-num">🎯 ${fmtTime(session.focusMs)}</div>${t('focusedFor')}${out.record ? `<div class="badge">🏆 ${t('newRecord')}</div>` : ''}</div>
        <div class="card"><div class="big-num">⭐ ${session.careful}</div>${t('careful')}</div>
        <div class="card"><div class="big-num">🪙 +${out.coins}</div>${t('coins')}</div>
      </div>
      <div class="pet-panel small">
        <div class="big-pet" id="bigpet">${creatureSVG(p.creature.species, stageBefore, 'bounce')}</div>
        <div class="xpbar"><div id="xpfill" style="width:0%"></div><span>+${out.xp} XP · Lv ${p.petLevel}</span></div>
      </div>
      ${out.levelUpSkill ? `<p class="card levelup">🚀 ${t('harderNext')}</p>` : ''}
      <button class="btn big primary" id="home">🏠 ${t('home')}</button>
    </div>`);
  setTimeout(() => {
    const fill = root.querySelector('#xpfill');
    if (fill) fill.style.width = Math.round((p.xp / need) * 100) + '%';
  }, 300);
  root.querySelector('#home').addEventListener('click', () => kidHome(p));

  if (out.petLevelUps) {
    await new Promise((r) => setTimeout(r, 1200));
    const stageAfter = stageForLevel(p.petLevel);
    if (stageAfter > stageBefore) {
      await evolve(p, stageBefore, stageAfter);
    } else {
      confetti(60);
      speak('Level up!');
      await modal({
        title: `⬆️ ${t('levelUp')}`,
        body: `<div class="center">${creatureSVG(p.creature.species, stageAfter, 'bounce big')}<p class="big-text">${esc(petName(p))} → Lv ${p.petLevel}</p></div>`,
        buttons: [{ label: '🎉', cls: 'primary', value: true }],
      });
    }
    const pet = root.querySelector('#bigpet');
    if (pet) pet.innerHTML = creatureSVG(p.creature.species, stageForLevel(p.petLevel), 'bounce');
  }
}

async function evolve(p, from, to) {
  const s = SPECIES[p.creature.species];
  const wrap = document.createElement('div');
  wrap.className = 'evolve';
  wrap.innerHTML = `
    <div class="evo-box">
      <h2>✨ ${esc(p.creature.name || s.names[from])} ${t('evolving')} ✨</h2>
      <div class="evo-stage">
        <div class="evo-old">${creatureSVG(p.creature.species, from)}</div>
        <div class="evo-new">${creatureSVG(p.creature.species, to)}</div>
      </div>
      <h2 class="evo-name">${esc(s.names[to])}!</h2>
      <button class="btn big primary" id="evo-ok">🎉</button>
    </div>`;
  document.body.appendChild(wrap);
  speak('What? Your partner is evolving!');
  setTimeout(() => confetti(80), 2600);
  await new Promise((r) => wrap.querySelector('#evo-ok').addEventListener('click', r));
  wrap.remove();
}
