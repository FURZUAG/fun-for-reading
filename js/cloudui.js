// Recuadro de la cuenta familiar en la nube (Ajustes y pantalla de bienvenida).
import { cloudEnabled, cloudStatus, onCloudChange, connect, disconnect, pull, resetPassword, authErrorText } from './cloud.js';
import { esc, modal, toast } from './ui.js';

const STATUS_TEXT = {
  loading: '⏳ Conectando…',
  syncing: '🔄 Guardando en la nube…',
  ok: '✅ Todo guardado en la nube',
  offline: '📴 Sin internet: se guarda aquí y se sube al reconectar',
  error: '⚠️ No se pudo sincronizar. Se reintentará solo.',
  'signed-out': 'No has iniciado sesión.',
};

function statusLine({ status, lastSync }) {
  const when = lastSync && status === 'ok' ? ` · ${lastSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : '';
  return (STATUS_TEXT[status] || '') + when;
}

function askChoice() {
  return modal({
    title: '☁️ Hay datos aquí y en la nube',
    body: `<p>Este dispositivo ya tiene perfiles y la cuenta familiar también. ¿Qué hacemos?</p>
      <p class="muted"><b>Usar los de la nube</b> reemplaza lo de este dispositivo (recomendado si ya jugaban en otro).<br>
      <b>Combinar</b> junta ambos; si creaste los mismos niños en los dos, aparecerán repetidos y podrás borrar uno.</p>`,
    buttons: [
      { label: 'Combinar', value: 'merge' },
      { label: 'Usar los de la nube', cls: 'primary', value: 'cloud' },
    ],
  });
}

// signupAllowed: en la bienvenida de un dispositivo nuevo solo se inicia sesión.
export function renderCloudPanel(el, { onConnected, signupAllowed = true } = {}) {
  if (!cloudEnabled()) {
    el.innerHTML = `<p class="muted">La nube todavía no está configurada en esta app. Mientras tanto, todo se guarda solo en este dispositivo.</p>`;
    return;
  }
  const st = cloudStatus();
  if (st.email) {
    el.innerHTML = `
      <p>Cuenta familiar: <b>${esc(st.email)}</b></p>
      <p class="cloud-status">${statusLine(st)}</p>
      <div class="row">
        <button class="btn small" id="csync">🔄 Sincronizar ahora</button>
        <button class="btn small ghost" id="cout">Cerrar sesión</button>
      </div>
      <p class="muted">Inicia sesión con esta misma cuenta en cada dispositivo (tablet, laptop) para compartir el avance.</p>`;
    const off = onCloudChange((s) => {
      const line = el.querySelector('.cloud-status');
      if (!line) return off();
      line.textContent = statusLine(s);
    });
    el.querySelector('#csync').addEventListener('click', async () => {
      const changed = await pull();
      toast(changed ? 'Datos actualizados desde la nube ✓' : 'Todo al día ✓');
      onConnected?.(changed);
    });
    el.querySelector('#cout').addEventListener('click', async () => {
      const ok = await modal({
        body: '<p>Se cierra la sesión en este dispositivo. Los datos se quedan aquí y en la nube, pero dejan de sincronizarse hasta que vuelvas a entrar.</p>',
        buttons: [{ label: 'Cancelar', value: false }, { label: 'Cerrar sesión', cls: 'primary', value: true }],
      });
      if (!ok) return;
      await disconnect();
      renderCloudPanel(el, { onConnected, signupAllowed });
    });
    return;
  }
  el.innerHTML = `
    <p class="muted">${signupAllowed ? 'Crea la cuenta familiar en el primer dispositivo e inicia sesión con ella en los demás.' : 'Inicia sesión con la cuenta familiar que creaste en el otro dispositivo.'}</p>
    <input class="input" id="cemail" type="email" autocomplete="username" placeholder="Correo">
    <input class="input" id="cpass" type="password" autocomplete="current-password" placeholder="Contraseña (mínimo 6 caracteres)">
    <div class="row">
      <button class="btn primary" id="cin">Iniciar sesión</button>
      ${signupAllowed ? '<button class="btn" id="cup">Crear cuenta familiar</button>' : ''}
      <button class="link" id="cforgot">Olvidé la contraseña</button>
    </div>
    <p class="hint" id="cerr" hidden></p>`;
  const email = () => el.querySelector('#cemail').value.trim();
  const pass = () => el.querySelector('#cpass').value;
  const showErr = (msg) => {
    const box = el.querySelector('#cerr');
    box.hidden = !msg;
    box.textContent = msg || '';
  };
  const go = async (mode) => {
    showErr('');
    el.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      const result = await connect(mode, email(), pass(), askChoice);
      toast(
        {
          uploaded: 'Cuenta lista ✓ Se subieron los datos de este dispositivo',
          downloaded: 'Listo ✓ Se bajaron los datos de la nube',
          merged: 'Listo ✓ Se combinaron los datos',
          synced: 'Sesión iniciada ✓',
        }[result] || 'Listo ✓',
        3000,
      );
      onConnected?.(true);
      if (el.isConnected) renderCloudPanel(el, { onConnected, signupAllowed });
    } catch (e) {
      showErr(authErrorText(e));
      el.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  };
  el.querySelector('#cin').addEventListener('click', () => go('signin'));
  el.querySelector('#cup')?.addEventListener('click', () => go('signup'));
  el.querySelector('#cforgot').addEventListener('click', async () => {
    if (!email()) return showErr('Escribe tu correo arriba y vuelve a tocar “Olvidé la contraseña”.');
    try {
      await resetPassword(email());
      toast('Te enviamos un correo para cambiar la contraseña', 3000);
    } catch (e) {
      showErr(authErrorText(e));
    }
  });
}
