// Utilidades de interfaz compartidas.

export const app = () => document.getElementById('app');

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function render(html) {
  const el = app();
  el.innerHTML = html;
  el.scrollTop = 0;
  window.scrollTo(0, 0);
  return el;
}

export function on(root, selector, event, handler) {
  root.querySelectorAll(selector).forEach((el) => el.addEventListener(event, (e) => handler(e, el)));
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ventana modal sencilla. buttons: [{ label, cls, value }]. Resuelve con el value elegido.
export function modal({ title = '', body = '', buttons = [{ label: 'OK', value: true }], cls = '' }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-back';
    wrap.innerHTML = `
      <div class="modal ${cls}" role="dialog" aria-modal="true">
        ${title ? `<h2>${title}</h2>` : ''}
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          ${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-i]').forEach((btn) =>
      btn.addEventListener('click', () => {
        wrap.remove();
        resolve(buttons[Number(btn.dataset.i)].value);
      }),
    );
  });
}

export function toast(text, ms = 1800) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function confetti(n = 40) {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#ffc93c', '#ff6b81', '#5ec4e8', '#7ccf6b', '#b388ff'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.6 + 's';
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3000);
}

export function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
