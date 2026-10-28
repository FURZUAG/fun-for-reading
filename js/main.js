import { showProfiles } from './app.js';
import { initCloud, onCloudChange } from './cloud.js';

showProfiles();

// Al recuperar la sesión de la nube, refresca la pantalla de perfiles con lo más reciente.
let refreshed = false;
onCloudChange(({ status, email }) => {
  if (!email) refreshed = false;
  else if (status === 'ok' && !refreshed) {
    refreshed = true;
    if (document.querySelector('.profiles, .welcome')) showProfiles();
  }
});
initCloud();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Sin modo offline:', e));
}
