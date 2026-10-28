# Fun for Reading 📖🎧

App web para que los niños practiquen **reading** y **listening** en inglés con misiones cortas que se alargan poco a poco, usando el vocabulario y la gramática de su escuela. Un compañero tipo "criatura" sube de nivel y evoluciona con cada misión.

El diseño completo está en [DISENO.md](DISENO.md).

## Qué incluye (fase 1)

- **Perfiles** para cada niño, con su compañero (4 criaturas originales con 3 evoluciones cada una).
- **Juego libre:** cada niño juega con su propio perfil cuando quiera y cuantas misiones quiera, sin turnos. Elige entre **leer** o **escuchar**; la opción que tiene menos práctica lleva un bonus de +10 XP.
- **Misiones** de unos 3 a 15 minutos:
  1. ¿Cómo te sientes hoy? Si llega cansado, la misión es más corta.
  2. Calentamiento: unir palabras de la unidad con su traducción.
  3. Lectura o audio **por partes**, con una micro-pregunta y una **tarjeta-pista** después de cada parte.
  4. Preguntas finales: opción múltiple, verdadero/falso y **ordenar los hechos**.
  5. Resultados: tiempo de concentración, respuestas cuidadosas, monedas y XP.
- **Escalera de aguante** de 8 niveles: el nivel 8 equivale al formato de su examen.
- **Sin presión:** no hay cronómetros visibles ni X rojas. Un error se vuelve pista, y si contesta demasiado rápido la app le pregunta "¿lo revisamos?".
- **Ayudas de idioma:** tocar una palabra la pronuncia y la traduce. También hay un botón para traducir la parte y otro para ver la app en español.
- **Modo papá/mamá** con PIN:
  - Perfiles y niveles.
  - Unidades de vocabulario y gramática.
  - Cuentos por copiar y pegar con Claude o Gemini.
  - Progreso: minutos de concentración, aciertos por habilidad, respuestas "al aventón" y palabras difíciles.
  - Voz, respaldo de datos y borrado.
- **Funciona sin internet** una vez instalada.
- **Nube opcional (Firebase):** con una cuenta familiar, el avance, los niveles y los cuentos se comparten entre la tablet y la laptop. Sin configurarla, todo se guarda solo en el dispositivo.

## Cómo crear cuentos nuevos (copiar y pegar)

1. Entra a **Modo papá/mamá → 📝 Vocabulario** y captura la unidad: el tema gramatical y las palabras, una por renglón, en formato `palabra = traducción`.
2. Ve a **📚 Cuentos**, elige al niño y cuántas lecturas y audios quieres, y toca **📋 Copiar instrucciones**.
3. Toca **Abrir Claude** o **Abrir Gemini**, pega las instrucciones y envíalas.
4. Copia **toda** la respuesta del chat, pégala en el **Paso 2** y toca **Revisar cuentos**.
5. Revisa los cuentos, desmarca los que no te gusten y toca **Guardar**.

Si la respuesta se corta, pídele al chat "continúa el JSON" y pega todo junto. Mientras no haya cuentos propios, la app usa 4 cuentos de ejemplo.

## Publicarla en internet (GitHub Pages, gratis)

1. En GitHub, abre el repositorio → **Settings → Pages**.
2. En **Source** elige **Deploy from a branch**. Luego elige la rama donde está la app (por ejemplo `main`) y la carpeta `/ (root)`, y guarda.
3. En un par de minutos la app queda en `https://furzuag.github.io/fun-for-reading/`.

## Instalarla en la Galaxy Tab S7 FE

1. Abre la dirección en **Chrome**.
2. Menú ⋮ → **Agregar a la pantalla principal** (o **Instalar app**).
3. Se abre a pantalla completa, como una app normal.

Si la voz en inglés suena mal o no se oye, revisa **Ajustes de la tablet → Administración general → Texto a voz**. Ahí elige **Servicios de voz de Google** y descarga el idioma **inglés**. Después escoge la voz en **Modo papá/mamá → ⚙️ Ajustes**.

## Guardar en la nube (Firebase)

1. Crea el proyecto de Firebase: activa **Authentication → Correo electrónico/contraseña** y crea **Firestore** con las reglas de abajo.
2. Copia la configuración web (`firebaseConfig`) en `js/firebase-config.js`.
3. En la app: **Modo papá/mamá → ⚙️ Ajustes → Guardar en la nube → Crear cuenta familiar**. En los demás dispositivos usa **☁️ Ya usamos la app en otro dispositivo** o **Iniciar sesión**.

Reglas de Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /families/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Sin la nube, los datos viven solo en el navegador de cada dispositivo; descarga un respaldo de vez en cuando en **⚙️ Ajustes → Descargar respaldo**.

## Para probarla en una computadora

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html`, `css/styles.css` | Página y estilos |
| `js/app.js` | Pantallas del niño: perfil, compañero, inicio, check-in, calentamiento y resultados |
| `js/mission.js` | La misión: partes, micro-preguntas, pausa activa y preguntas finales |
| `js/parent.js` | Modo papá/mamá |
| `js/levels.js` | Escalera de aguante y reglas de nivel |
| `js/prompt.js` | Instrucciones para Claude o Gemini y lectura de la respuesta |
| `js/creatures.js` | Dibujos de los compañeros |
| `js/store.js` | Datos guardados, XP, monedas y reglas para subir de nivel |
| `js/cloud.js`, `js/cloudui.js`, `js/firebase-config.js` | Sincronización con Firebase y la cuenta familiar |
| `js/tts.js` | Voz en inglés |
| `js/i18n.js` | Textos en inglés y español |
| `sw.js`, `manifest.webmanifest` | Instalación y uso sin internet |

## Próximas fases

- **Fase 2:** tienda de accesorios para el compañero, álbum de estampas y copa semanal entre hermanos.
- **Fase 3:** foto del cuaderno → vocabulario, más minijuegos y voces más naturales.
