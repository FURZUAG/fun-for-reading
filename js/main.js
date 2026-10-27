import { showProfiles } from './app.js';

showProfiles();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Sin modo offline:', e));
}
