// Voz en inglés del dispositivo (Web Speech API).
import { state } from './store.js';

const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth ? synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')) : [];
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export function englishVoices() {
  loadVoices();
  return voices;
}

function pickVoice() {
  const list = englishVoices();
  return (
    list.find((v) => v.voiceURI === state.settings.voiceURI) ||
    list.find((v) => /en[-_]US/i.test(v.lang) && /google/i.test(v.name)) ||
    list.find((v) => /en[-_]US/i.test(v.lang)) ||
    list[0] ||
    null
  );
}

let token = 0;

export function stop() {
  token += 1;
  synth?.cancel();
}

// Habla el texto frase por frase (evita que Chrome corte audios largos).
// Resuelve la promesa cuando termina, o antes si se llama stop().
export function speak(text, { rate = state.settings.rate } = {}) {
  stop();
  const my = token;
  if (!synth) return Promise.resolve(false);
  const sentences = text.match(/[^.!?]+[.!?]*["']?/g)?.map((s) => s.trim()).filter(Boolean) || [text];
  const voice = pickVoice();
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (my !== token) return resolve(false);
      if (i >= sentences.length) return resolve(true);
      const u = new SpeechSynthesisUtterance(sentences[i++]);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'en-US';
      u.rate = rate;
      // Respaldo por si el navegador nunca dispara "end".
      const words = u.text.split(/\s+/).length;
      let advanced = false;
      const go = () => {
        if (advanced) return;
        advanced = true;
        clearTimeout(fallback);
        next();
      };
      const fallback = setTimeout(go, (words / (2.6 * rate)) * 1000 + 2500);
      u.onend = () => setTimeout(go, 250);
      u.onerror = go;
      synth.speak(u);
    };
    next();
  });
}

export function speakWord(word) {
  return speak(word, { rate: Math.max(state.settings.rate - 0.1, 0.6) });
}
