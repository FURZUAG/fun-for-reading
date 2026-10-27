// Todo el estado vive en localStorage de la tablet. Se puede respaldar en un archivo JSON.
import { SAMPLE_UNIT, SAMPLE_PACKS } from './sample.js';
import { xpForNext, goodSessionsNeeded, isGoodSession, MAX_LEVEL } from './levels.js';

const KEY = 'fun-for-reading-v1';

function defaultState() {
  return {
    version: 1,
    pin: null,
    settings: { rate: 0.85, voiceURI: null },
    units: [structuredClone(SAMPLE_UNIT)],
    activeUnitId: SAMPLE_UNIT.id,
    profiles: [],
    packs: structuredClone(SAMPLE_PACKS).map((p) => ({ ...p, usedBy: [], createdAt: SAMPLE_UNIT.createdAt })),
    sessions: [],
  };
}

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('No se pudo leer el estado guardado', e);
  }
  return defaultState();
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    alert('No se pudo guardar el progreso: ' + e.message);
  }
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function exportBackup() {
  return JSON.stringify(state, null, 2);
}

export function importBackup(json) {
  const data = JSON.parse(json);
  if (!data || !Array.isArray(data.profiles) || !Array.isArray(data.packs)) {
    throw new Error('El archivo no parece un respaldo de Fun for Reading.');
  }
  state = { ...defaultState(), ...data };
  save();
}

export function resetAll() {
  localStorage.removeItem(KEY);
  state = defaultState();
}

// ---------- Perfiles ----------

export function newProfile({ name, age, themes }) {
  const p = {
    id: uid('kid'),
    name,
    age,
    themes,
    lang: 'en',
    creature: null,
    xp: 0,
    petLevel: 1,
    coins: 0,
    prog: {
      reading: { level: 1, good: 0, bad: 0 },
      listening: { level: 1, good: 0, bad: 0 },
    },
    nextSkill: 'reading',
    words: {},
    best: { focusMs: 0 },
  };
  state.profiles.push(p);
  save();
  return p;
}

export function getProfile(id) {
  return state.profiles.find((p) => p.id === id);
}

export function activeUnit() {
  return state.units.find((u) => u.id === state.activeUnitId) || state.units[0];
}

// ---------- Cuentos ----------

export function availablePacks(profile, skill) {
  return state.packs.filter(
    (p) => p.skill === skill && (p.profileId === profile.id || p.profileId === null) && !p.usedBy.includes(profile.id),
  );
}

export function stockFor(profile) {
  return {
    reading: availablePacks(profile, 'reading').length,
    listening: availablePacks(profile, 'listening').length,
  };
}

// Elige el cuento más cercano a su nivel; prefiere uno igual o un poco más fácil.
export function pickPack(profile, skill) {
  const level = profile.prog[skill].level;
  const dist = (p) => (p.level > level ? (p.level - level) * 2 : level - p.level);
  const candidates = availablePacks(profile, skill).sort((a, b) => dist(a) - dist(b) || (a.profileId ? -1 : 1));
  return candidates[0] || null;
}

// Si se acabaron los cuentos nuevos, repite el que hizo hace más tiempo.
export function pickRepeatPack(profile) {
  const mine = state.packs.filter((p) => p.profileId === profile.id || p.profileId === null);
  if (!mine.length) return null;
  const lastUse = (pack) => {
    const s = state.sessions.filter((x) => x.packId === pack.id && x.profileId === profile.id).at(-1);
    return s ? s.date : '';
  };
  return mine.sort((a, b) => lastUse(a).localeCompare(lastUse(b)))[0];
}

// ---------- Vocabulario ----------

export function wordStat(profile, word) {
  const key = word.toLowerCase();
  profile.words[key] ||= { seen: 0, correct: 0, wrong: 0, lookups: 0 };
  return profile.words[key];
}

export function difficultWords(profile, n = 8) {
  return Object.entries(profile.words)
    .map(([w, s]) => ({ w, score: s.wrong * 2 + s.lookups - s.correct }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ---------- Fin de sesión ----------

export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil(((d - yearStart) / 86400000 + 1) / 7)}`;
}

export function sessionsThisWeek(profile) {
  const wk = weekKey();
  return state.sessions.filter((s) => s.profileId === profile.id && weekKey(new Date(s.date)) === wk).length;
}

// Registra la sesión, aplica la escalera de aguante y da XP/monedas.
// Devuelve lo que pasó para mostrarlo en la pantalla de resultados.
export function finishSession(profile, session, pack) {
  const out = { levelUpSkill: false, petLevelUps: 0, xp: 0, coins: 0, record: false };
  state.sessions.push(session);
  if (!pack.usedBy.includes(profile.id)) pack.usedBy.push(profile.id);

  const prog = profile.prog[session.skill];
  const good = isGoodSession(session);
  if (good && !session.short) {
    prog.good += 1;
    prog.bad = 0;
    if (prog.good >= goodSessionsNeeded(prog.level) && prog.level < MAX_LEVEL && pack.level >= prog.level) {
      prog.level += 1;
      prog.good = 0;
      out.levelUpSkill = true;
    }
  } else if (!good) {
    prog.good = 0;
    prog.bad += 1;
  }
  profile.nextSkill = session.skill === 'reading' ? 'listening' : 'reading';

  if (session.focusMs > profile.best.focusMs) {
    out.record = profile.best.focusMs > 0;
    profile.best.focusMs = session.focusMs;
  }

  out.xp = 15 + Math.round(session.score * 8) + session.careful * 2;
  out.coins = 5 + Math.round(session.score * 2);
  profile.coins += out.coins;
  profile.xp += out.xp;
  while (profile.xp >= xpForNext(profile.petLevel)) {
    profile.xp -= xpForNext(profile.petLevel);
    profile.petLevel += 1;
    out.petLevelUps += 1;
  }
  save();
  return out;
}
