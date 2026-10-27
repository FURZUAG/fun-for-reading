// Modo "copiar y pegar": arma el prompt para Claude/Gemini y valida la respuesta.
import { levelSpec } from './levels.js';
import { uid } from './store.js';

export const THEMES = {
  football: 'football (soccer)',
  blocks: 'a block-building world like Minecraft (no brand names)',
  dinosaurs: 'dinosaurs',
  animals: 'animals',
  space: 'space and planets',
  superheroes: 'superheroes',
  ocean: 'the ocean',
  magic: 'magic and fantasy',
};

function skillBlock(skill, level, count) {
  if (!count) return '';
  const spec = levelSpec(level);
  const s = spec[skill];
  const kind = skill === 'reading'
    ? 'READING stories (the child reads them on screen)'
    : 'LISTENING stories (a text-to-speech voice reads them aloud; the child does NOT see the text). Write for the ear: short sentences, no abbreviations, no emojis, no parentheses, numbers as words';
  return `- ${count} ${kind}. Level ${level}: exactly ${s.parts} parts of about ${s.words} words each (total about ${s.parts * s.words} words) and exactly ${s.questions} final questions.`;
}

export function buildPrompt({ profile, unit, nReading, nListening }) {
  const themes = (profile.themes || []).map((t) => THEMES[t] || t).join(', ') || 'animals, football';
  const words = unit.words.map((w) => w.en).join(', ');
  const rLevel = profile.prog.reading.level;
  const lLevel = profile.prog.listening.level;

  return `You are writing English reading and listening practice for ${profile.name}, a ${profile.age}-year-old Spanish-speaking child learning English as a second language (CEFR A1–A2). The child gets distracted easily, so stories must be fun, concrete and easy to follow.

CREATE:
${[skillBlock('reading', rLevel, nReading), skillBlock('listening', lLevel, nListening)].filter(Boolean).join('\n')}

CONTENT RULES
- Themes the child loves (rotate them, one per story): ${themes}.
- Use as many of these class vocabulary words as possible, naturally: ${words}.
- Grammar of the month (use it at least 3 times per story, and test it in at least one question): ${unit.grammar}${unit.grammarNotes ? ` (${unit.grammarNotes})` : ''}.
- Simple sentences, present or past simple, friendly characters with names, a clear beginning, middle and end.
- Each part continues the story; the parts together tell ONE story.

QUESTIONS
- Final questions mix these types: "mc" (multiple choice, 3 options, exactly one correct), "tf" (a true/false statement) and "order" (put 3–4 events in chronological order). Include exactly ONE "order" question per story when the story has 4 or more questions.
- Questions must be answerable from the text only. Use simple English.
- "skill" of each question is one of: "main_idea", "detail", "sequence", "vocabulary", "grammar", "inference".
- "part" is the number (1, 2, 3…) of the part where the answer is. "evidence" is the EXACT sentence copied from that part that proves the answer.
- For "order", list the "items" in the CORRECT order (the app shuffles them). Do not include "part" or "evidence" for "order".
- Every part also has a "check": one very easy multiple-choice question (2–3 options) about that part only, with its exact "evidence" sentence.
- Every part has a "clue": one emoji and a summary of at most 7 words, to help the child remember what happened.
- "es" is a natural Mexican Spanish translation of the part.
- "glossary": 8–12 harder words from the story (as they appear, lowercase) with their Spanish translation.

OUTPUT
Reply with ONLY valid JSON (no comments, no extra text), exactly in this shape:
{
  "stories": [
    {
      "skill": "reading",
      "level": ${rLevel},
      "title": "…",
      "theme": "…",
      "parts": [
        {
          "text": "…",
          "es": "…",
          "clue": { "emoji": "🦖", "text": "…" },
          "check": { "q": "…", "options": ["…", "…", "…"], "answer": 0, "evidence": "…" }
        }
      ],
      "questions": [
        { "type": "mc", "skill": "detail", "q": "…", "options": ["…", "…", "…"], "answer": 2, "part": 1, "evidence": "…" },
        { "type": "tf", "skill": "grammar", "q": "…", "answer": true, "part": 2, "evidence": "…" },
        { "type": "order", "skill": "sequence", "q": "Put the events in order.", "items": ["…", "…", "…", "…"] }
      ],
      "glossary": { "word": "palabra" }
    }
  ]
}
"answer" in "mc" is the 0-based index of the correct option. Use "level": ${lLevel} for listening stories.`;
}

// ---------- Lectura de la respuesta ----------

function extractJSON(text) {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  const start = t.search(/[[{]/);
  if (start < 0) throw new Error('No encontré JSON en el texto pegado.');
  t = t.slice(start);
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  t = t.slice(0, end + 1);
  // Comillas tipográficas que a veces meten los chats.
  t = t.replace(/[“”]/g, '"');
  return JSON.parse(t);
}

const str = (x) => (typeof x === 'string' ? x.trim() : '');

function normMC(q, nParts) {
  const options = Array.isArray(q.options) ? q.options.map(str).filter(Boolean) : [];
  const answer = Number(q.answer);
  if (!str(q.q) || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  const part = Number(q.part);
  return {
    type: 'mc',
    skill: str(q.skill) || 'detail',
    q: str(q.q),
    options,
    answer,
    part: Number.isInteger(part) && part >= 1 && part <= nParts ? part : null,
    evidence: str(q.evidence),
  };
}

function normQuestion(q, nParts) {
  if (!q || typeof q !== 'object') return null;
  const type = str(q.type).toLowerCase();
  if (type === 'order') {
    const items = Array.isArray(q.items) ? q.items.map(str).filter(Boolean) : [];
    if (items.length < 3) return null;
    return { type: 'order', skill: 'sequence', q: str(q.q) || 'Put the events in order.', items };
  }
  if (type === 'tf') {
    const answer = q.answer === true || String(q.answer).toLowerCase() === 'true';
    if (!str(q.q)) return null;
    const part = Number(q.part);
    return {
      type: 'tf',
      skill: str(q.skill) || 'detail',
      q: str(q.q),
      answer,
      part: Number.isInteger(part) && part >= 1 && part <= nParts ? part : null,
      evidence: str(q.evidence),
    };
  }
  return normMC(q, nParts);
}

function normStory(raw, { profileId, unitId }) {
  const skill = str(raw.skill).toLowerCase() === 'listening' ? 'listening' : 'reading';
  const parts = (Array.isArray(raw.parts) ? raw.parts : [])
    .map((p) => ({
      text: str(p?.text),
      es: str(p?.es),
      clue: { emoji: str(p?.clue?.emoji) || '⭐', text: str(p?.clue?.text) },
      check: p?.check ? normMC({ ...p.check, part: 1 }, 1) : null,
    }))
    .filter((p) => p.text);
  if (!parts.length) throw new Error(`"${str(raw.title) || 'Sin título'}" no tiene partes con texto.`);
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q) => normQuestion(q, parts.length))
    .filter(Boolean);
  if (!questions.length) throw new Error(`"${str(raw.title) || 'Sin título'}" no tiene preguntas válidas.`);
  const glossary = {};
  if (raw.glossary && typeof raw.glossary === 'object') {
    for (const [k, v] of Object.entries(raw.glossary)) {
      if (str(k) && str(v)) glossary[str(k).toLowerCase()] = str(v);
    }
  }
  const level = Number(raw.level);
  return {
    id: uid('story'),
    profileId,
    unitId,
    skill,
    level: Number.isInteger(level) && level >= 1 ? level : 1,
    title: str(raw.title) || 'My Story',
    theme: str(raw.theme),
    parts,
    questions,
    glossary,
    usedBy: [],
    createdAt: new Date().toISOString(),
  };
}

// Devuelve { stories, errors }: los cuentos válidos y la razón de los que no.
export function parseResponse(text, meta) {
  const data = extractJSON(text);
  const list = Array.isArray(data) ? data : Array.isArray(data.stories) ? data.stories : [data];
  const stories = [];
  const errors = [];
  for (const raw of list) {
    try {
      stories.push(normStory(raw, meta));
    } catch (e) {
      errors.push(e.message);
    }
  }
  return { stories, errors };
}
