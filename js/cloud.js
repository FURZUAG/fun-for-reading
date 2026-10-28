// Sincronización con Firebase: una cuenta familiar (correo y contraseña) y una copia de los datos en Firestore.
// Los datos siguen viviendo en localStorage; esto solo sube los cambios y baja los de otros dispositivos.
// Ruta en Firestore: families/{uid} (PIN y unidad activa) y families/{uid}/{profiles|units|packs|sessions}/{id}.
import { FIREBASE_CONFIG } from './firebase-config.js';
import { state, save, onSave } from './store.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const SYNC_KEY = 'fun-for-reading-sync-v1';
const COLLECTIONS = ['profiles', 'units', 'packs', 'sessions'];

let backend = null;
let user = null;
let status = 'off'; // off | loading | signed-out | syncing | ok | offline | error
let lastSync = null;
let lastPull = 0;
let pushing = false;
let pushAgain = false;
let pushTimer = null;
let loggingIn = false;
const listeners = new Set();

const fake = typeof window !== 'undefined' ? window.__FFR_FAKE_CLOUD__ : null;

export const cloudEnabled = () => Boolean(fake || FIREBASE_CONFIG);
export const cloudUser = () => user;
export const cloudStatus = () => ({ status, lastSync, email: user?.email || null });

export function onCloudChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setStatus(s) {
  status = s;
  listeners.forEach((fn) => fn(cloudStatus()));
}

// ---------- Qué ya está sincronizado en este dispositivo ----------

function syncMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY)) || { uid: null, hashes: {}, stamps: {} };
  } catch {
    return { uid: null, hashes: {}, stamps: {} };
  }
}

function saveSyncMeta(meta) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(meta));
}

function localItems() {
  const items = new Map();
  items.set('meta', { pin: state.pin, activeUnitId: state.activeUnitId });
  for (const c of COLLECTIONS) for (const it of state[c]) items.set(`${c}/${it.id}`, it);
  return items;
}

const hashOf = (o) => JSON.stringify(o);
const clean = (o) => JSON.parse(JSON.stringify(o));

function withoutStamp(data) {
  const { _u, ...rest } = data;
  return rest;
}

// Escribe un elemento remoto en el estado local, actualizando el objeto existente
// (la pantalla puede tener una referencia al perfil) en vez de reemplazarlo.
function applyRemote(key, data) {
  const value = withoutStamp(data);
  if (key === 'meta') {
    if (value.pin) state.pin = value.pin;
    if (value.activeUnitId) state.activeUnitId = value.activeUnitId;
    return;
  }
  const [c, id] = key.split('/');
  const obj = state[c].find((x) => x.id === id);
  if (obj) {
    Object.keys(obj).forEach((k) => delete obj[k]);
    Object.assign(obj, value);
  } else {
    state[c].push(value);
  }
}

function removeLocal(key) {
  if (key === 'meta') return;
  const [c, id] = key.split('/');
  state[c] = state[c].filter((x) => x.id !== id);
}

// ---------- Subir y bajar ----------

function schedulePush(ms = 1500) {
  if (!user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, ms);
}

async function push() {
  if (!user) return;
  if (pushing) {
    pushAgain = true;
    return;
  }
  const meta = syncMeta();
  const items = localItems();
  const sets = [];
  const dels = [];
  const now = Date.now();
  for (const [key, value] of items) {
    const h = hashOf(value);
    if (meta.hashes[key] !== h) sets.push({ key, h, data: { ...clean(value), _u: now } });
  }
  for (const key of Object.keys(meta.hashes)) if (!items.has(key)) dels.push(key);
  if (!sets.length && !dels.length) return;

  pushing = true;
  setStatus(navigator.onLine === false ? 'offline' : 'syncing');
  try {
    await backend.write(user.uid, sets, dels);
    const m = syncMeta();
    for (const s of sets) {
      m.hashes[s.key] = s.h;
      m.stamps[s.key] = now;
    }
    for (const key of dels) {
      delete m.hashes[key];
      delete m.stamps[key];
    }
    saveSyncMeta(m);
    lastSync = new Date();
    setStatus('ok');
  } catch (e) {
    console.warn('No se pudo subir a la nube', e);
    setStatus(navigator.onLine === false ? 'offline' : 'error');
  }
  pushing = false;
  if (pushAgain) {
    pushAgain = false;
    schedulePush(200);
  }
}

// Baja lo que cambió en otros dispositivos. Regla: si este dispositivo también cambió
// ese mismo elemento y aún no lo sube, gana el de este dispositivo.
export async function pull() {
  if (!user) return false;
  setStatus('syncing');
  let remote;
  try {
    remote = await backend.readAll(user.uid);
  } catch (e) {
    console.warn('No se pudo leer la nube', e);
    setStatus(navigator.onLine === false ? 'offline' : 'error');
    return false;
  }
  lastPull = Date.now();
  const meta = syncMeta();
  const local = localItems();
  let changed = false;

  for (const [key, data] of Object.entries(remote)) {
    const l = local.get(key);
    const known = meta.stamps[key] || 0;
    if (l && (data._u || 0) <= known) continue; // nada nuevo en la nube
    if (l && meta.hashes[key] !== hashOf(l)) continue; // cambiado aquí y aún sin subir: gana este dispositivo
    applyRemote(key, data);
    const applied = localItems().get(key);
    meta.hashes[key] = hashOf(applied);
    meta.stamps[key] = data._u || 0;
    changed = true;
  }
  for (const key of Object.keys(meta.hashes)) {
    if (key in remote) continue;
    const l = local.get(key);
    if (l && meta.hashes[key] === hashOf(l)) {
      removeLocal(key);
      changed = true;
    }
    delete meta.hashes[key];
    delete meta.stamps[key];
  }
  meta.uid = user.uid;
  saveSyncMeta(meta);
  if (changed) {
    state.sessions.sort((a, b) => a.date.localeCompare(b.date));
    save(); // el push que dispara solo sube lo que este dispositivo tenía pendiente
  }
  lastSync = new Date();
  setStatus('ok');
  await push();
  return changed;
}

// Primera vez que este dispositivo se conecta a esta cuenta.
async function firstSync(askChoice) {
  const remote = await backend.readAll(user.uid);
  const remoteHasData = Object.keys(remote).some((k) => k.startsWith('profiles/'));
  const localHasData = state.profiles.length > 0;
  saveSyncMeta({ uid: user.uid, hashes: {}, stamps: {} });

  if (!remoteHasData) {
    // La nube está vacía: se sube todo lo de este dispositivo.
    await push();
    return 'uploaded';
  }
  const choice = localHasData ? await askChoice() : 'cloud';
  if (choice === 'cloud') {
    // Se usan los datos de la nube; lo de este dispositivo se descarta.
    for (const c of COLLECTIONS) state[c] = [];
    const meta = { uid: user.uid, hashes: {}, stamps: {} };
    for (const [key, data] of Object.entries(remote)) {
      applyRemote(key, data);
      meta.stamps[key] = data._u || 0;
    }
    state.sessions.sort((a, b) => a.date.localeCompare(b.date));
    for (const [key, value] of localItems()) if (key in remote) meta.hashes[key] = hashOf(value);
    saveSyncMeta(meta);
    save();
    lastSync = new Date();
    setStatus('ok');
    await push();
    return 'downloaded';
  }
  // Combinar: lo que solo está en la nube se agrega; lo que está en ambos queda como en este dispositivo.
  for (const [key, data] of Object.entries(remote)) {
    if (!localItems().has(key)) applyRemote(key, data);
  }
  state.sessions.sort((a, b) => a.date.localeCompare(b.date));
  save();
  await push();
  return 'merged';
}

// ---------- Cuenta ----------

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Usa “Iniciar sesión”.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/missing-password': 'Escribe la contraseña.',
  'auth/network-request-failed': 'Sin internet. Conéctate e intenta de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/operation-not-allowed': 'Falta activar “Correo electrónico/contraseña” en Firebase (Paso 3 de la guía).',
};

export function authErrorText(e) {
  return AUTH_ERRORS[e?.code] || e?.message || 'Ocurrió un error.';
}

// mode: 'signin' | 'signup'. askChoice() se llama si este dispositivo y la nube tienen datos distintos.
export async function connect(mode, email, password, askChoice) {
  loggingIn = true;
  try {
    const u = mode === 'signup' ? await backend.auth.signUp(email, password) : await backend.auth.signIn(email, password);
    user = u;
    const meta = syncMeta();
    if (meta.uid === user.uid) {
      await pull();
      return 'synced';
    }
    return await firstSync(askChoice);
  } finally {
    loggingIn = false;
  }
}

export async function disconnect() {
  await push();
  await backend.auth.signOut();
  user = null;
  setStatus('signed-out');
}

// Para "Borrar todos los datos": se desconecta sin subir nada y olvida qué estaba sincronizado,
// así borrar este dispositivo nunca borra la nube.
export async function forgetDevice() {
  clearTimeout(pushTimer);
  if (user) await backend.auth.signOut().catch(() => {});
  user = null;
  localStorage.removeItem(SYNC_KEY);
  setStatus(cloudEnabled() ? 'signed-out' : 'off');
}

export function resetPassword(email) {
  return backend.auth.resetPassword(email);
}

// Baja cambios si hace rato que no se revisa (al volver a la pantalla de perfiles).
export async function maybePull(minMs = 15000) {
  if (!user || Date.now() - lastPull < minMs) return false;
  return pull();
}

// ---------- Firebase ----------

async function firebaseBackend() {
  const [appMod, authMod, fs] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js'),
  ]);
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  const auth = authMod.getAuth(app);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  const ref = (uid, key) => (key === 'meta' ? fs.doc(db, 'families', uid) : fs.doc(db, 'families', uid, ...key.split('/')));
  const toUser = (u) => (u ? { uid: u.uid, email: u.email } : null);
  return {
    auth: {
      onChange: (cb) => authMod.onAuthStateChanged(auth, (u) => cb(toUser(u))),
      signIn: async (e, p) => toUser((await authMod.signInWithEmailAndPassword(auth, e, p)).user),
      signUp: async (e, p) => toUser((await authMod.createUserWithEmailAndPassword(auth, e, p)).user),
      signOut: () => authMod.signOut(auth),
      resetPassword: (e) => authMod.sendPasswordResetEmail(auth, e),
    },
    async readAll(uid) {
      const out = {};
      const m = await fs.getDoc(ref(uid, 'meta'));
      if (m.exists()) out.meta = m.data();
      for (const c of COLLECTIONS) {
        const snap = await fs.getDocs(fs.collection(db, 'families', uid, c));
        snap.forEach((d) => (out[`${c}/${d.id}`] = d.data()));
      }
      return out;
    },
    async write(uid, sets, dels) {
      const ops = [...sets.map((s) => ['set', s]), ...dels.map((k) => ['del', k])];
      for (let i = 0; i < ops.length; i += 400) {
        const batch = fs.writeBatch(db);
        for (const [type, x] of ops.slice(i, i + 400)) {
          if (type === 'set') batch.set(ref(uid, x.key), x.data);
          else batch.delete(ref(uid, x));
        }
        await batch.commit();
      }
    },
  };
}

// ---------- Arranque ----------

export async function initCloud() {
  if (!cloudEnabled()) return;
  setStatus('loading');
  try {
    backend = fake || (await firebaseBackend());
  } catch (e) {
    console.warn('No se pudo cargar Firebase (¿sin internet?)', e);
    setStatus('offline');
    return;
  }
  onSave(() => schedulePush());
  document.addEventListener('visibilitychange', () => document.hidden && user && push());
  window.addEventListener('online', () => user && pull());
  backend.auth.onChange((u) => {
    if (loggingIn) return;
    user = u;
    if (!u) return setStatus('signed-out');
    if (syncMeta().uid === u.uid) pull();
    else setStatus('ok');
  });
}
