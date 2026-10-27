// Compañeros originales (estilo "criatura que evoluciona"), dibujados en SVG.
// Cada especie tiene 3 etapas; evolucionan en los niveles definidos en levels.js.

export const SPECIES = {
  dino: {
    names: ['Dinko', 'Raptorex', 'Rexgard'],
    color: ['#7ccf6b', '#4fb35a', '#2f9e57'],
    dark: '#1f6b3a',
    belly: '#e9f7c9',
    theme: 'dinosaurs',
  },
  fox: {
    names: ['Pawly', 'Foxtail', 'Blazefox'],
    color: ['#ffad5c', '#ff8f3a', '#f2711c'],
    dark: '#a3460a',
    belly: '#fff3e2',
    theme: 'animals',
  },
  ball: {
    names: ['Kicko', 'Strikko', 'Goaldor'],
    color: ['#ffffff', '#ffffff', '#fffbe8'],
    dark: '#2b2b38',
    belly: '#ffffff',
    theme: 'football',
  },
  cube: {
    names: ['Cubby', 'Blockon', 'Cubetitan'],
    color: ['#5ec4e8', '#3aa6d6', '#2a7fd4'],
    dark: '#174a7a',
    belly: '#c9f0ff',
    theme: 'blocks',
  },
};

const eyes = (y, stage, dark) => {
  const r = 11 + stage;
  const brows = stage >= 1
    ? `<path d="M${76 - r} ${y - r - 6} l${r * 1.6} 4 M${124 + r} ${y - r - 6} l${-r * 1.6} 4" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`
    : '';
  return `
    <circle cx="80" cy="${y}" r="${r}" fill="#fff" stroke="${dark}" stroke-width="2"/>
    <circle cx="120" cy="${y}" r="${r}" fill="#fff" stroke="${dark}" stroke-width="2"/>
    <circle class="pupil" cx="82" cy="${y + 1}" r="${r * 0.55}" fill="#1d1d2b"/>
    <circle class="pupil" cx="122" cy="${y + 1}" r="${r * 0.55}" fill="#1d1d2b"/>
    <circle cx="85" cy="${y - 3}" r="${r * 0.2}" fill="#fff"/>
    <circle cx="125" cy="${y - 3}" r="${r * 0.2}" fill="#fff"/>
    ${brows}`;
};

const face = (y, stage, dark) => `
  ${eyes(y, stage, dark)}
  <ellipse cx="66" cy="${y + 20}" rx="8" ry="5" fill="#ff8fa3" opacity=".7"/>
  <ellipse cx="134" cy="${y + 20}" rx="8" ry="5" fill="#ff8fa3" opacity=".7"/>
  <path d="M88 ${y + 22} q12 12 24 0" stroke="${dark}" stroke-width="4" fill="${stage >= 2 ? '#ff6b81' : 'none'}" stroke-linecap="round"/>`;

function dino(stage, c) {
  const col = c.color[stage];
  const spikeCol = stage === 2 ? '#ffc93c' : c.dark;
  const spikes = [
    [[78, 82], [88, 62], [98, 80]],
    [[96, 78], [106, 56], [116, 78]],
    [[114, 82], [126, 62], [132, 86]],
    ...(stage >= 1 ? [[[132, 88], [148, 74], [146, 98]], [[62, 90], [66, 70], [80, 84]]] : []),
  ];
  const horn = stage === 2 ? `<path d="M96 96 l4 -16 l6 16 z" fill="#ffc93c" stroke="${c.dark}" stroke-width="2"/>` : '';
  return `
    <path d="M140 150 q50 0 52 -40 q-14 30 -56 22 z" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    ${spikes.map((s) => `<path d="M${s[0]} L${s[1]} L${s[2]} Z" fill="${spikeCol}" stroke="${c.dark}" stroke-width="2"/>`).join('')}
    <ellipse cx="100" cy="132" rx="58" ry="54" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <ellipse cx="100" cy="150" rx="34" ry="30" fill="${c.belly}"/>
    ${horn}
    <ellipse cx="50" cy="146" rx="10" ry="7" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <ellipse cx="150" cy="146" rx="10" ry="7" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <ellipse cx="76" cy="186" rx="18" ry="9" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <ellipse cx="124" cy="186" rx="18" ry="9" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    ${face(118, stage, c.dark)}`;
}

function fox(stage, c) {
  const col = c.color[stage];
  const tip = stage === 2 ? '#5fd3ff' : '#fff';
  const tail = stage === 0
    ? `<path d="M146 160 q46 -6 40 -50 q-18 20 -44 30 z" fill="${col}" stroke="${c.dark}" stroke-width="3"/>`
    : `<path d="M140 166 q64 -4 54 -78 q-10 10 -16 6 q-6 40 -42 52 z" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
       <path d="M194 88 q-10 10 -16 6 q2 -14 16 -6z" fill="${tip}"/>`;
  const earH = 34 + stage * 8;
  return `
    ${tail}
    <path d="M58 100 L64 ${96 - earH} L96 88 Z" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <path d="M142 100 L136 ${96 - earH} L104 88 Z" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <path d="M66 96 L68 ${104 - earH} L86 90 Z" fill="${stage === 2 ? tip : '#ffd0d8'}"/>
    <path d="M134 96 L132 ${104 - earH} L114 90 Z" fill="${stage === 2 ? tip : '#ffd0d8'}"/>
    <ellipse cx="100" cy="134" rx="56" ry="52" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <path d="M58 134 q42 70 84 0 q-16 18 -42 18 q-26 0 -42 -18z" fill="${c.belly}"/>
    <ellipse cx="100" cy="136" rx="7" ry="5" fill="#1d1d2b"/>
    <ellipse cx="76" cy="186" rx="16" ry="8" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <ellipse cx="124" cy="186" rx="16" ry="8" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    ${face(116, stage, c.dark)}`;
}

function ball(stage, c) {
  const cape = stage === 2
    ? `<path d="M52 118 q-20 50 -6 72 l108 0 q14 -22 -6 -72 z" fill="#e63946" stroke="#7a1520" stroke-width="3"/>`
    : '';
  const band = stage >= 1
    ? `<path d="M46 104 q54 -26 108 0 l0 12 q-54 -24 -108 0z" fill="#e63946" stroke="#7a1520" stroke-width="2"/>`
    : '';
  const star = stage === 2
    ? `<path d="M100 50 l6 13 14 1 -11 9 4 14 -13 -8 -13 8 4 -14 -11 -9 14 -1z" fill="#ffc93c" stroke="#a3730a" stroke-width="2"/>`
    : '';
  const shoes = stage >= 1
    ? `<path d="M56 180 h34 q4 12 -6 12 h-30 q-6 -6 2 -12z" fill="#ffc93c" stroke="${c.dark}" stroke-width="3"/>
       <path d="M110 180 h34 q8 6 2 12 h-30 q-10 0 -6 -12z" fill="#ffc93c" stroke="${c.dark}" stroke-width="3"/>`
    : `<ellipse cx="76" cy="186" rx="16" ry="8" fill="#ddd" stroke="${c.dark}" stroke-width="3"/>
       <ellipse cx="124" cy="186" rx="16" ry="8" fill="#ddd" stroke="${c.dark}" stroke-width="3"/>`;
  return `
    ${cape}
    <circle cx="100" cy="128" r="58" fill="${c.color[stage]}" stroke="${c.dark}" stroke-width="3"/>
    <path d="M100 150 l16 12 -6 18 -20 0 -6 -18z" fill="${c.dark}"/>
    <path d="M44 128 l14 -6 8 14 -8 14 -12 -4z" fill="${c.dark}"/>
    <path d="M156 128 l-14 -6 -8 14 8 14 12 -4z" fill="${c.dark}"/>
    <path d="M70 76 l12 8 -4 14 -16 2 -6 -12z" fill="${c.dark}"/>
    <path d="M130 76 l-12 8 4 14 16 2 6 -12z" fill="${c.dark}"/>
    ${band}
    ${shoes}
    ${star}
    ${face(122, stage, c.dark)}`;
}

function cube(stage, c) {
  const col = c.color[stage];
  const pixels = [[64, 150], [128, 160], [72, 92], [140, 104], [104, 170]]
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="12" fill="${c.dark}" opacity=".18"/>`).join('');
  const antenna = stage >= 1
    ? `<rect x="94" y="52" width="12" height="24" fill="${c.dark}"/><rect x="88" y="40" width="24" height="16" rx="3" fill="${stage === 2 ? '#7df9ff' : '#ffc93c'}" stroke="${c.dark}" stroke-width="3"/>`
    : '';
  const crown = stage === 2
    ? `<rect x="46" y="66" width="16" height="16" fill="#7df9ff" stroke="${c.dark}" stroke-width="2"/><rect x="138" y="66" width="16" height="16" fill="#7df9ff" stroke="${c.dark}" stroke-width="2"/>`
    : '';
  return `
    ${antenna}
    <rect x="46" y="74" width="108" height="108" rx="14" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    ${pixels}
    ${crown}
    <rect x="34" y="128" width="14" height="22" rx="4" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <rect x="152" y="128" width="14" height="22" rx="4" fill="${col}" stroke="${c.dark}" stroke-width="3"/>
    <rect x="62" y="180" width="28" height="12" rx="3" fill="${c.dark}"/>
    <rect x="110" y="180" width="28" height="12" rx="3" fill="${c.dark}"/>
    ${face(118, stage, c.dark)}`;
}

const DRAW = { dino, fox, ball, cube };

export function creatureSVG(species, stage = 0, cls = '') {
  const c = SPECIES[species] || SPECIES.dino;
  const scale = [0.78, 0.9, 1][stage];
  return `<svg class="creature ${cls}" viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="100" cy="198" rx="62" ry="9" fill="#000" opacity=".12"/>
    <g transform="translate(100 196) scale(${scale}) translate(-100 -196)">
      ${DRAW[species](stage, c)}
    </g>
  </svg>`;
}

export function creatureName(profile) {
  return profile.creature?.name || '';
}
