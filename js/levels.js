// "Escalera de aguante": cada nivel alarga un poco el texto/audio y quita apoyos.
// El nivel 8 equivale al formato de su examen (3–4 párrafos / 2 min, 8 preguntas).

export const LEVELS = [
  { level: 1, reading: { parts: 2, words: 25, questions: 3 }, listening: { parts: 2, words: 35, questions: 3 }, microChecks: 'all',  phraseTranslations: Infinity, replays: Infinity, cluesDuringQuestions: true },
  { level: 2, reading: { parts: 2, words: 40, questions: 4 }, listening: { parts: 2, words: 50, questions: 4 }, microChecks: 'all',  phraseTranslations: Infinity, replays: Infinity, cluesDuringQuestions: true },
  { level: 3, reading: { parts: 3, words: 40, questions: 5 }, listening: { parts: 3, words: 45, questions: 5 }, microChecks: 'all',  phraseTranslations: Infinity, replays: Infinity, cluesDuringQuestions: true },
  { level: 4, reading: { parts: 3, words: 50, questions: 6 }, listening: { parts: 3, words: 55, questions: 6 }, microChecks: 'some', phraseTranslations: 3, replays: 3, cluesDuringQuestions: true },
  { level: 5, reading: { parts: 3, words: 60, questions: 6 }, listening: { parts: 3, words: 65, questions: 6 }, microChecks: 'some', phraseTranslations: 3, replays: 3, cluesDuringQuestions: true },
  { level: 6, reading: { parts: 4, words: 55, questions: 7 }, listening: { parts: 4, words: 55, questions: 7 }, microChecks: 'none', phraseTranslations: 2, replays: 2, cluesDuringQuestions: true },
  { level: 7, reading: { parts: 4, words: 60, questions: 8 }, listening: { parts: 4, words: 62, questions: 8 }, microChecks: 'none', phraseTranslations: 2, replays: 2, cluesDuringQuestions: false },
  { level: 8, reading: { parts: 4, words: 65, questions: 8 }, listening: { parts: 4, words: 70, questions: 8 }, microChecks: 'none', phraseTranslations: 1, replays: 2, cluesDuringQuestions: false },
];

export const MAX_LEVEL = LEVELS.length;

export function levelSpec(n) {
  return LEVELS[Math.min(Math.max(n, 1), MAX_LEVEL) - 1];
}

// Sesiones buenas seguidas necesarias para subir de nivel.
export function goodSessionsNeeded(level) {
  return level <= 2 ? 2 : 3;
}

export function isGoodSession({ score, max, rushedWrong }) {
  return max > 0 && score / max >= 0.7 && rushedWrong <= 1;
}

export function showsMicroCheck(spec, partIdx) {
  if (spec.microChecks === 'all') return true;
  if (spec.microChecks === 'some') return partIdx % 2 === 0;
  return false;
}

export function wordCount(text) {
  return (text.match(/\S+/g) || []).length;
}

// Tiempo mínimo antes de habilitar "Terminé de leer": ~240 palabras/min,
// más rápido de lo que él lee, así que nunca frena a quien sí leyó.
export function minReadMs(text) {
  return Math.min(Math.max(wordCount(text) * 250, 3000), 25000);
}

// Respuestas más rápidas que esto se consideran "al aventón".
export function rushThresholdMs(question) {
  if (question.type === 'order') return 4000;
  const text = [question.q, ...(question.options || [])].join(' ');
  return Math.min(1200 + wordCount(text) * 110, 6000);
}

// XP para pasar del nivel n del compañero al n+1.
export function xpForNext(level) {
  return 40 + 20 * level;
}

// XP extra por elegir la habilidad que le toca practicar (para que no deje una de lado).
export const BONUS_XP = 10;

export const EVOLVE_AT = [4, 10]; // niveles del compañero en que evoluciona

export function stageForLevel(level) {
  return level >= EVOLVE_AT[1] ? 2 : level >= EVOLVE_AT[0] ? 1 : 0;
}
