# Fun for Reading — Documento de diseño (v0.2)

App web para que dos niños (9 y 8 años, hispanohablantes) **aumenten poco a poco su tolerancia y concentración** en *reading* y *listening* en inglés, usando el vocabulario y la gramática que están viendo en la escuela.

---

## 1. Principios de diseño

Salen directamente de lo que observamos en él:

| Lo que pasa | Cómo responde la app |
|---|---|
| Aguanta 3 min cansado, 5–8 min fresco | Sesiones que **empiezan cortas** y se alargan solas, de 10 % en 10 %. Al inicio le pregunta cómo llega hoy. |
| Se distrae y **olvida lo que ya hizo bien** | El texto se va mostrando **por partes** y cada parte deja una **"tarjeta-pista"** visible (emoji + frase corta) que resume lo que ya leyó. La barra de progreso le muestra lo que ya logró. |
| Lo hace "al aventón" | Las respuestas se habilitan hasta que leyó o escuchó la parte completa. Si contesta demasiado rápido, aparece un amable "¿lo revisamos?". **Se premia el cuidado, no la velocidad.** |
| Le frustra la presión y que le señalen errores | **No hay cronómetros visibles ni X rojas.** Un error se convierte en pista ("Casi… busca en el párrafo 2", con la frase resaltada). En el segundo intento también gana puntos. |
| Le gusta competir | Compite contra **su propio récord** y en una **copa semanal** donde cada quien avanza según *su* meta personal, así que es justo frente a su hermana. |
| Le gustan fútbol, Minecraft, dinosaurios y animales | Las historias, los personajes y los premios usan esos temas. |

---

## 2. Usuarios y perfiles

- **2 perfiles de niño** (él y su hermana), cada uno con su avatar, su nivel, sus monedas y sus estadísticas.
- **Modo papá/mamá** protegido con PIN: vocabulario, configuración de la IA, reportes y ajustes.
- Funciona en **un solo dispositivo** (Galaxy Tab S7 FE). Los datos se guardan en la tablet y se pueden respaldar en un archivo.

---

## 3. Estructura de una sesión ("Misión")

La meta es usarla 3 veces por semana.

1. **Check-in** (10 s): *"How do you feel today?"* 😴 cansado / 🙂 normal / ⚡ con energía. Con eso se ajusta la duración del día.
2. **Calentamiento de vocabulario** (≈1 min): un minijuego rápido con las palabras de la unidad (memorama, unir palabra con imagen o con su audio).
3. **Misión principal**: se alternan **Reading** y **Listening** en cada sesión.
4. **Recompensa**: monedas, un sobre de estampas y su avance en la copa semanal.

En los niveles largos aparece una **pausa activa** opcional de 20 s entre partes ("¡Estírate como un T-Rex!").

---

## 4. Progresión de la concentración ("escalera de aguante")

La **meta final** es el formato de su examen: una lectura de 3–4 párrafos con unas 8 preguntas, o un audio de hasta 2 min con unas 8 preguntas.

| Nivel | Reading | Listening | Apoyos |
|---|---|---|---|
| 1 | 2 partes (~50 palabras), 3 preguntas | ~30 s, 3 preguntas | Micro-pregunta tras cada parte, traducción libre, repeticiones ilimitadas |
| 2 | 2 partes (~80), 4 preguntas | ~45 s, 4 preguntas | Igual que el nivel 1 |
| 3 | 3 partes (~120), 5 preguntas | ~60 s, 5 preguntas | Igual que el nivel 1 |
| 4 | 3 partes (~150), 6 preguntas | ~75 s, 6 preguntas | Micro-preguntas en algunas partes, 3 traducciones, 3 repeticiones, pausa activa |
| 5 | 3 partes (~180), 6 preguntas | ~85 s, 6 preguntas | Igual que el nivel 4 |
| 6 | 4 partes (~220), 7 preguntas | ~95 s, 7 preguntas | Sin micro-preguntas, 2 traducciones, 2 repeticiones |
| 7 | 4 partes (~240), 8 preguntas | ~1 min 50 s, 8 preguntas | Las tarjetas-pista ya no se ven durante las preguntas |
| 8 (examen) | 4 partes (~260), 8 preguntas | ~2 min, 8 preguntas | Formato de examen, 1 traducción |

**Reglas de avance** (automáticas y visibles solo en el panel del papá/mamá):
- **Sube** un nivel después de **2 sesiones seguidas** (3 a partir del nivel 3) **con ≥70 % de aciertos** y como máximo una respuesta "al aventón" equivocada.
- Si una sesión sale mal, **se mantiene** el nivel. **Nunca baja de forma visible**; si hace falta, la siguiente sesión es más corta sin decírselo.
- El check-in de "cansado" usa ese día una versión más corta del mismo nivel.

---

## 5. Tipos de actividad

**Comprensión (reading y listening)**
- Opción múltiple: idea principal, detalles, vocabulario en contexto.
- Verdadero / falso.
- **Ordenar los hechos cronológicamente** (arrastrar tarjetas), igual que en su examen.
- "¿Quién lo dijo / quién lo hizo?"

**Vocabulario y gramática del mes**
- Unir palabra con imagen o con audio.
- Completar huecos usando la gramática de la unidad (por ejemplo, *bigger / the biggest*, *who / which / where / when*).
- Ordenar palabras para formar una frase.

**Ayudas de idioma**
- Tocar cualquier palabra muestra su **traducción y pronunciación**.
- Botón "traducir frase". En los niveles altos el número de usos es limitado, sin castigo.
- Instrucciones en inglés con un botón 🇲🇽 para verlas en español.

---

## 6. Motivación

- **Compañero tipo Pokémon** (criaturas originales, sin usar personajes con marca registrada):
  - Al empezar, cada niño elige su criatura entre 3 opciones (por ejemplo, de tipo dinosaurio, de tipo animal o de tipo fútbol).
  - Gana **experiencia (XP)** con cada misión: más XP por respuestas cuidadosas y por terminar la misión completa.
  - **Sube de nivel** y **evoluciona** en los niveles 4 y 10 (3 etapas), con animación de evolución.
  - Se le pueden comprar **accesorios y skins** con monedas: gorras, camisetas de fútbol, colores especiales…
  - Su nivel también refleja visualmente el progreso de concentración del niño.
- **Álbum de estampas**: cada misión da un sobre con estampas de dinosaurios, animales y jugadores de fútbol ficticios. Completar páginas da premios grandes.
- **Monedas**: se ganan por terminar la misión, por respuestas cuidadosas y por segundos intentos, nunca solo por velocidad.
- **Racha semanal**: cumplir las 3 misiones de la semana, en lugar de exigir todos los días.
- **Copa semanal entre hermanos**: cada quien llena *su* barra según *su* meta. Gana quien llegue al 100 % de su propia meta, así que pueden ganar los dos.
- **Récord personal**: "¡Hoy aguantaste 6 min 30 s, tu mejor marca!"

---

## 7. Contenido y vocabulario (modo papá/mamá)

- **Unidades de 4 semanas**: cada una tiene un tema gramatical y una lista de vocabulario.
- **Agregar vocabulario y gramática**: al inicio, **los escribes a mano** en el modo papá/mamá. En la fase 3 se agrega la opción de **tomar foto** del libro o del cuaderno para que la IA extraiga las palabras.
- **Generación de contenido**: la IA crea historias y audios con el vocabulario y la gramática de la unidad y con los temas favoritos del niño, al nivel de cada perfil.
- El contenido se **genera por adelantado**, en paquetes de una semana, desde el modo papá/mamá. Así el niño nunca espera y la app funciona sin internet durante la misión.
- Antes de que llegue al niño, tú puedes ver y descartar cualquier historia.

### Sobre "usar mi cuenta de Claude o de Gemini"
Las suscripciones de chat (Claude Pro, Gemini Advanced) **no se pueden conectar directamente a una app**. Hay tres caminos:

| Opción | Costo | Comodidad |
|---|---|---|
| **A. Clave de API de Gemini** (Google AI Studio) | **Gratis** en su nivel gratuito, suficiente para este uso | Alta: todo automático |
| **B. Clave de API de Claude** (console.anthropic.com) | Pago por uso, aproximadamente centavos de dólar por historia (estimado: menos de 2 USD al mes) | Alta: todo automático |
| **C. Modo copiar y pegar** | $0: usa tu suscripción actual | Media: la app te da un *prompt*, lo pegas en el chat de Claude o Gemini y pegas la respuesta de vuelta |

**Decisión:** empezar con la **opción C (copiar y pegar)**. Más adelante se pueden agregar A y B; la clave se guardaría solo en la tablet.

---

## 8. Audio (listening)

- Voz en inglés sintetizada por la tablet (las voces de Google en Android suenan bien), con **velocidad ajustable** (0.8× al principio).
- En listening, el texto **no se muestra** hasta después de responder. Al revisar aparece la transcripción con la respuesta resaltada.
- Las preguntas se habilitan cuando el audio termina completo.
- *Mejora futura:* voces más naturales generadas por la IA.

---

## 9. Panel para papá/mamá

Por cada niño:
- **Aguante**: minutos de concentración por sesión, con su tendencia en el tiempo.
- **Aciertos por habilidad**: idea principal, detalles, orden cronológico, vocabulario y gramática.
- **Palabras dominadas** y palabras con dificultad, que la app repite más.
- Número de respuestas "al aventón" (un indicador de atención).
- Nivel actual de reading y de listening.

---

## 10. Plataforma técnica

- **PWA** (página web instalable): se abre en Chrome de la Galaxy Tab S7 FE y con "Agregar a pantalla de inicio" queda como app, a pantalla completa y en horizontal.
- Funciona **sin internet** durante las misiones; solo necesita internet para generar contenido nuevo.
- Datos en el almacenamiento local de la tablet (localStorage), con **exportar e importar respaldo**.
- Sin servidor propio: hosting gratuito (por ejemplo, GitHub Pages).
- HTML + JavaScript, diseño para pantalla táctil con botones grandes.

---

## 11. Fases de desarrollo propuestas

1. **MVP**: perfiles, captura manual de vocabulario y gramática, IA por copiar y pegar, misiones de reading y listening con la escalera de aguante, compañero que sube de nivel y evoluciona, y panel básico.
2. **Motivación completa**: tienda de accesorios, álbum de estampas y copa semanal.
3. **Extras**: foto del cuaderno → vocabulario, minijuegos adicionales y voces naturales.
