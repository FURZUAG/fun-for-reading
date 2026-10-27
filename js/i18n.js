// Textos que ve el niño: en inglés, con botón para verlos en español.
const STRINGS = {
  whoPlays: ['Who is playing today?', '¿Quién juega hoy?'],
  parents: ['Parents', 'Papá / Mamá'],
  start: ['Start mission!', '¡Empezar misión!'],
  whatToday: ['What do you want to do?', '¿Qué quieres hacer?'],
  readStory: ['Read a story', 'Leer un cuento'],
  listenStory: ['Listen to a story', 'Escuchar un cuento'],
  bonus: ['Bonus', 'Bonus'],
  new: ['new', 'nuevos'],
  bonusEarned: ['Bonus for practicing this today!', '¡Bonus por practicar esto hoy!'],
  missionsWeek: ['Missions this week', 'Misiones esta semana'],
  storiesReady: ['Stories ready', 'Cuentos listos'],
  noStories: ['Ask Mom or Dad for new stories! 📚 Today we practice a story again.', '¡Pídele a papá o mamá cuentos nuevos! 📚 Hoy repasamos un cuento.'],
  choosePartner: ['Choose your partner!', '¡Elige a tu compañero!'],
  giveName: ['Give it a name (optional)', 'Ponle nombre (opcional)'],
  letsGo: ["Let's go!", '¡Vamos!'],
  howFeel: ['How do you feel today?', '¿Cómo te sientes hoy?'],
  tired: ['Tired', 'Cansado'],
  ok: ['OK', 'Normal'],
  energy: ['Full of energy', 'Con energía'],
  warmup: ['Warm-up: match the words', 'Calentamiento: une las palabras'],
  warmupDone: ['Great warm-up!', '¡Gran calentamiento!'],
  continue: ['Continue', 'Continuar'],
  part: ['Part', 'Parte'],
  of: ['of', 'de'],
  finishedReading: ['I finished reading', 'Terminé de leer'],
  translate: ['Translate', 'Traducir'],
  left: ['left', 'quedan'],
  listen: ['Listen', 'Escuchar'],
  listenAgain: ['Listen again', 'Escuchar otra vez'],
  listening: ['Listening…', 'Escuchando…'],
  next: ['Next', 'Siguiente'],
  keyWords: ['Key words', 'Palabras clave'],
  quickCheck: ['Quick check', 'Pregunta rápida'],
  question: ['Question', 'Pregunta'],
  seeText: ['Look at the text', 'Ver el texto'],
  close: ['Close', 'Cerrar'],
  trueW: ['True', 'Verdadero'],
  falseW: ['False', 'Falso'],
  check: ['Check', 'Revisar'],
  tapOrder: ['Tap the events in order', 'Toca los hechos en orden'],
  almost: ['Almost! Try again 🔍', '¡Casi! Intenta otra vez 🔍'],
  clueIn: ['The clue is in part', 'La pista está en la parte'],
  lookYellow: ['Look at the yellow sentence.', 'Mira la frase amarilla.'],
  answerWas: ['The answer is:', 'La respuesta es:'],
  nextTime: ["You'll get the next one!", '¡La próxima es tuya!'],
  inPlace: ['in the right place!', 'en su lugar.'],
  great: ['Great job!', '¡Muy bien!'],
  fastTitle: ['Wow, that was fast! ⚡', '¡Wow, qué rápido! ⚡'],
  fastBody: ['Do you want to check again?', '¿Quieres revisarlo otra vez?'],
  letMeCheck: ['Let me check 🔍', 'Lo reviso 🔍'],
  imSure: ["I'm sure ✓", 'Estoy seguro ✓'],
  brainBreak: ['Brain break!', '¡Pausa activa!'],
  skip: ['Skip', 'Saltar'],
  missionComplete: ['Mission complete!', '¡Misión cumplida!'],
  focusedFor: ['You focused for', 'Te concentraste'],
  newRecord: ['New record!', '¡Nuevo récord!'],
  careful: ['Careful answers', 'Respuestas cuidadosas'],
  coins: ['coins', 'monedas'],
  levelUp: ['Level up!', '¡Subió de nivel!'],
  evolving: ['is evolving!', '¡está evolucionando!'],
  harderNext: ['Your missions will be a little longer now. You are getting stronger! 💪', 'Tus misiones serán un poquito más largas. ¡Te estás volviendo más fuerte! 💪'],
  home: ['Home', 'Inicio'],
  exit: ['Exit', 'Salir'],
  exitConfirm: ['Leave this mission? Your progress in it will be lost.', '¿Salir de esta misión? Se pierde el avance de esta misión.'],
  reading: ['Reading', 'Lectura'],
  listeningSkill: ['Listening', 'Escucha'],
  level: ['Level', 'Nivel'],
  noTranslations: ['No more translations in this mission. You can do it! 💪', 'Ya no quedan traducciones en esta misión. ¡Tú puedes! 💪'],
  noReplays: ['No more replays. Try with what you remember! 💪', 'Ya no quedan repeticiones. ¡Intenta con lo que recuerdas! 💪'],
  noTranslation: ['(no translation)', '(sin traducción)'],
  hearQuestion: ['Hear the question', 'Escuchar la pregunta'],
};

let lang = 'en';

export function setLang(l) {
  lang = l === 'es' ? 'es' : 'en';
}

export function getLang() {
  return lang;
}

export function t(key) {
  const s = STRINGS[key];
  if (!s) return key;
  return lang === 'es' ? s[1] : s[0];
}

export const BRAIN_BREAKS = [
  ['Stretch up high like a T-Rex! 🦖', '¡Estírate muy alto como un T-Rex! 🦖'],
  ['Jump 5 times like a frog! 🐸', '¡Salta 5 veces como rana! 🐸'],
  ['Kick an invisible ball 5 times! ⚽', '¡Patea un balón invisible 5 veces! ⚽'],
  ['Take 3 big breaths, slowly. 🌬️', 'Respira profundo 3 veces, despacio. 🌬️'],
  ['Shake your hands like a wet dog! 🐶', '¡Sacude las manos como perrito mojado! 🐶'],
];

export const PRAISE = [
  ['Great job!', '¡Muy bien!'],
  ['Awesome!', '¡Increíble!'],
  ['You got it!', '¡Lo lograste!'],
  ['Super focus!', '¡Súper concentración!'],
  ['Well done!', '¡Bien hecho!'],
];

export function pick(pair) {
  return lang === 'es' ? pair[1] : pair[0];
}
