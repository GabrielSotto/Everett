# Área de Mascotas

## Estado

- Familia de objeto: creación con resultado aplicable y fuente editable.
- Papel en la primera demo: vertical profunda provisional.
- Modelo inicial: **mascota reactiva al contexto de la aplicación anfitriona**.
- Arquitectura conceptual: **runtime + personaje + conducta**, confirmada.
- Instalación conjunta de las tres capas: permitida, sin ocultar su separación.
- Capacidades funcionales propias: excluidas por ahora.
- Identidad persistente entre sesiones: confirmada.
- Sistema Tamagotchi completo: excluido de la primera demo.
- Reactividad expresiva profunda: confirmada como prioridad principal.
- Cuidado ligero mediante hambre y sueño: confirmado con alcance acotado.
- Acceso directo a un asistente de voz: excluido como diferenciador de la mascota.
- Expresión verbal contextual básica: confirmada.
- Formato de la expresión verbal —texto, audio o ambos—: abierto.
- Sincronización expresiva con la voz del anfitrión: referencia, no feature confirmada.
- Conversación, memoria y agencia propias de la mascota: excluidas por ahora.
- Referencia conductual: Clawd y los experimentos de mascotas de Claude; no son una
  referencia visual para copiar.
- Eventos exactos y profundidad contextual: abiertos.

## Problema observado

Según la experiencia aportada por el usuario, las mascotas actuales de Codex son
principalmente visuales: están presentes, pero casi no participan de lo que ocurre.
Esa falta de reactividad es uno de los motivos por los que no las utiliza, aunque la
idea le resulta atractiva.

Esta observación funciona como evidencia cualitativa inicial, no como afirmación
verificada sobre todas las personas usuarias. La hipótesis de producto es que una
mascota conectada con el ritmo del trabajo conserva interés y valor más allá de la
novedad estética.

Codex es aquí el origen de la observación y una referencia competitiva. La conducta
se diseña para la aplicación anfitriona y puede extenderse mediante adaptadores
compatibles.

## Referencia externa: Claude y Clawd

La referencia aportada por el usuario contiene tres superficies relacionadas y
distintas:

1. **Clawd como personaje de comunicación.** Según la observación del usuario, el
   personaje aparece con un repertorio especialmente expresivo en videos y redes,
   aunque esa riqueza no está integrada de la misma manera como mascota persistente
   dentro del producto.
2. **`/buddy` en Claude Code.** Un experimento temporal permitía incubar una mascota
   de terminal con animación, ficha y reacciones. Un miembro de Anthropic confirmó
   que fue una función de April Fools y que se retiró en abril de 2026. La reacción
   pública incluyó pedidos de restitución y varias reconstrucciones comunitarias.
3. **Claude Desktop Buddy.** Un repositorio oficial experimental para hardware
   demuestra un modelo controlado por estados: dieciocho mascotas, siete estados
   animados, variantes rotativas de inactividad y paquetes GIF reemplazables. El
   proyecto usa señales como sesión activa o aprobación pendiente y está limitado a
   modo desarrollador; no es una función de producto oficialmente soportada.

Fuentes consultadas el 2 de agosto de 2026:

- [`/buddy`: reporte y confirmación de retiro](https://github.com/anthropics/claude-code/issues/42677);
- [repositorio oficial Claude Desktop Buddy](https://github.com/anthropics/claude-desktop-buddy);
- [reacción comunitaria al retiro](https://www.reddit.com/r/ClaudeAI/comments/1sgcbcj/they_removed_the_buddy_from_latest_claude_code/).

La evidencia comunitaria es anecdótica y autoseleccionada; demuestra intensidad de
apego, no adopción general. El caso sí respalda que nombre, persistencia, personalidad
y variedad de comportamiento pueden importar tanto como la cantidad de funciones.

## Principios extraídos de la referencia

- Un estado no debe corresponder siempre a una única animación repetida.
- La personalidad surge de repertorio, timing, transiciones y excepciones poco
  frecuentes, además del diseño visual.
- Las acciones de reposo son importantes porque ocupan la mayor parte del tiempo.
- La mascota debe conservar identidad entre sesiones si pretende generar apego.
- Retirar una mascota persistente equivale para algunas personas a perder algo que
  sentían propio; portabilidad y continuidad forman parte de la confianza.
- La expresividad de marca y la experiencia dentro del producto deben sentirse como
  manifestaciones coherentes del mismo personaje.

Comunity Hub toma estos principios como referencia conductual. No reutiliza
especies, arte, nombres ni animaciones de Claude.

## Baseline actual de Codex

Esta sección conserva una referencia comparativa del mercado; no define el alcance
ni la identidad de Comunity Hub.

La documentación oficial consultada el 2 de agosto de 2026 describe mascotas
opcionales que siguen la actividad de uno o varios chats mediante cuatro estados:
Running, Needs input, Ready y Blocked. También documenta mascotas personalizadas,
persistencia de selección y posición, una versión de terminal y ejemplos de frases
con personalidad. Aclara que elegir una mascota cambia su apariencia, no la manera en
que ChatGPT completa las tareas.

El 31 de julio de 2026, la cuenta oficial de ChatGPT anunció que en la aplicación de
escritorio se puede pulsar la mascota para abrir ChatGPT Voice, consultar el estado del
trabajo y aprobar o detener tareas. El video presenta la función como un acceso a
Voice desde la mascota. Vincula dos superficies de ChatGPT, pero no enriquece el
comportamiento del personaje: la conversación y las acciones pertenecen al anfitrión
ChatGPT/Codex.

Ese mismo día, Shikhar publicó **Persona vs Codex Pet**, una demostración comunitaria
de un personaje de escritorio conectado a experiencias de voz. El repositorio de
Persona precisa que el personaje escucha la salida de audio del proceso elegido para
animarse, pero no captura el micrófono, produce voz, transcribe, ejecuta un modelo ni
envía audio a la red. Su conexión MCP con Codex expone controles visuales como mostrar
el personaje o reproducir animaciones. Esto demuestra otra arquitectura útil: el
personaje puede dar cuerpo y expresividad a una conversación sin poseer la capacidad
conversacional.

Reportes de usuarios en el repositorio oficial de Codex también mencionan burbujas de
actividad o de texto en builds de mayo de 2026. Esos reportes confirman una superficie
visual tipo burbuja, pero por sí solos no distinguen estado, frase de personalidad y
diálogo.

Fuentes:

- [documentación oficial de Pets](https://learn.chatgpt.com/docs/pets);
- [anuncio oficial de acceso a ChatGPT Voice desde la mascota](https://x.com/i/status/2083287694852112400);
- [demostración Persona vs Codex Pet](https://x.com/i/status/2083264720837214477);
- [repositorio de Persona](https://github.com/xikhar/persona);
- [reporte sobre burbujas y overlay](https://github.com/openai/codex/issues/21501).

La consecuencia para Comunity Hub es estratégica: hablar, mostrar estados o añadir
una animación nueva son capacidades que una aplicación anfitriona puede incorporar
rápidamente. La vertical debe demostrar además descubrimiento público, autoría,
instalación, fuente editable, personalidad, persistencia, remix y publicación de
derivados.

## Qué puede significar que una mascota "hable"

Las referencias recuperadas obligan a separar cuatro comportamientos que visualmente
pueden parecer el mismo:

1. **Mostrar un estado.** Una burbuja traduce Running, Needs input, Ready o Blocked.
   No existe voz autoral ni conversación.
2. **Expresar personalidad.** La mascota elige entre frases breves asociadas a un
   evento seguro. Puede sentirse viva sin leer el contenido del proyecto ni tomar
   decisiones.
3. **Representar la voz del anfitrión.** Cuando el asistente anfitrión habla, la mascota
   acompaña esa salida con animación, expresión o sincronización labial. El anfitrión
   conserva contexto, micrófono, modelo, herramientas y permisos.
4. **Ser un agente propio.** La mascota mantiene memoria, interpreta libremente el
   trabajo y usa herramientas o toma decisiones. Esto sí añade capacidad funcional y
   queda fuera del modelo inicial.

Abrir Voice al pulsar la mascota es solamente navegación. No modifica el comportamiento
del personaje y no cuenta como uno de estos niveles ni como diferenciación para la
primera demo.

La evidencia actual confirma que el nivel 1 ya existe en Codex y que el nivel 3 es
técnicamente viable mediante proyectos como Persona. Ninguno de los dos, por sí solo,
resuelve la falta de vínculo señalada por el usuario. El nivel 2 forma parte de la
primera demo con alcance básico. El nivel 4 permanece excluido.

## Diferencia mínima frente a las mascotas actuales

Una mascota limitada a los cuatro estados actuales, algunas animaciones adicionales y
un acceso a Voice quedaría demasiado cerca de lo que Codex ya ofrece. En ese caso,
la vertical serviría para demostrar publicación y remix dentro de Comunity Hub,
pero fallaría como propuesta de mascota más atractiva.

La primera demo combina las tres dimensiones con una jerarquía explícita:

1. **Reactividad expresiva profunda — prioridad principal.** Recibe la mayor parte del
   diseño, contenido y validación: más eventos seguros, repertorios variados,
   transiciones, timing, acciones de reposo y reacciones poco frecuentes.
2. **Cuidado ligero — apoyo acotado.** Hambre y sueño crean continuidad y pequeños
   rituales sin castigo, deuda por ausencia ni sistemas de supervivencia.
3. **Expresión verbal contextual básica — apoyo acotado.** Frases breves con
   personalidad acompañan eventos y estados sin convertirse en conversación libre ni
   en un segundo agente.

Las dos capas secundarias reutilizan el sistema de conducta de la reactividad profunda
en lugar de crecer como productos independientes. La reactividad básica y el acceso a
Voice no alcanzan.

## Lecciones estructurales de Persona

El repositorio aporta más que una referencia visual. Su arquitectura valida varias
decisiones que Comunity Hub ya venía insinuando:

- la integración recibe estados y niveles normalizados, no audio crudo, prompts,
  transcripciones, credenciales ni archivos del proyecto;
- el anfitrión conserva la conversación y Persona se limita a representar estados
  como idle, listening y speaking;
- cada acción tiene nombre, descripción, escenario de activación y uno o varios clips;
- el MCP expone acciones estrechas —listar o reproducir animaciones, mostrar u ocultar
  la ventana y consultar estado— sin entregar rutas de archivos ni acceso al sistema;
- los medios empaquetados son inmutables y las personalizaciones del usuario se
  guardan como overrides, evitando modificar silenciosamente el original;
- código, modelos y animaciones pueden tener derechos distintos. Persona separa la
  licencia MIT del código de las licencias de cada asset y bloquea releases mientras
  la procedencia o el permiso de redistribución estén incompletos.

### Una mascota no tiene por qué ser un único objeto monolítico

Persona permite distinguir tres piezas publicables o remixables:

1. **Runtime o integración:** conecta de forma segura el entorno anfitrión con estados,
   audio normalizado y controles de ventana.
2. **Paquete de personaje:** modelo o sprites, texturas, animaciones y sus licencias.
3. **Paquete de conducta:** acciones, escenarios, variedad, timing y reglas que
   convierten eventos seguros en expresión.

Una publicación sencilla puede empaquetar las tres, pero Comunity Hub debería
mostrar qué parte instala, de qué runtime depende y cuál está permitido forkear o
redistribuir. Esto también permite que alguien use Persona con un personaje nuevo,
aplique una mascota 2D al runtime de un anfitrión compatible o remezcle solamente
el comportamiento sin copiar assets restringidos.

Esta separación se adopta como arquitectura conceptual de la vertical. Define cómo
Comunity Hub representa, inspecciona y remezcla una mascota; todavía no elige una
implementación técnica, no convierte Persona en un runtime obligatorio ni obliga a
que todas las mascotas sean 3D.

## Definición para la primera demo

Una mascota reactiva recibe **eventos abstractos y controlados** de la aplicación
anfitriona y responde mediante animaciones, expresiones o cambios de estado.

Ejemplos conceptuales:

- el agente comienza una tarea y la mascota adopta una animación de trabajo;
- el sistema queda esperando una decisión y la mascota muestra expectativa;
- una tarea termina correctamente y la mascota celebra;
- aparece un error y la mascota reacciona sin ocultarlo ni trivializarlo;
- durante inactividad prolongada vuelve a un repertorio de reposo.

La reacción acompaña el estado real de la experiencia. No ejecuta la tarea ni
pretende haber producido su resultado.

### Profundidad prioritaria

El esfuerzo principal se concentra en que la mascota no repita una única animación por
estado. El sistema de conducta debe poder combinar:

- un vocabulario de eventos seguros más amplio que los cuatro estados actuales;
- varias respuestas posibles para un mismo evento;
- transiciones coherentes entre actividad, espera, interrupción, resultado y reposo;
- modificadores persistentes como hambre y sueño;
- selección por personalidad, frecuencia, intensidad, cooldown y rareza;
- salidas coordinadas de animación, expresión y frase contextual;
- una reacción de respaldo cuando un paquete no cubre un evento opcional.

La propuesta de taxonomía y prioridad se desarrolla en
[`mascots-reactivity-v0.md`](mascots-reactivity-v0.md) y queda pendiente de validación
con una mascota concreta. La disponibilidad real de eventos y el timing exacto siguen
abiertos.

## Límite confirmado

En esta etapa, la mascota:

- no ejecuta herramientas;
- no modifica archivos ni proyectos;
- no envía mensajes;
- no toma decisiones en nombre del usuario;
- no accede directamente a red, credenciales o secretos;
- no funciona como agente ni como plugin de automatización.

El entorno anfitrión decide qué eventos seguros expone. La mascota solamente traduce
esos eventos a comportamiento expresivo. Una expansión funcional futura requeriría
otra decisión de producto, permisos explícitos y un modelo de seguridad propio.

## Resultado utilizable y fuente editable

El resultado utilizable es una mascota instalada y reaccionando dentro o junto a la
aplicación anfitriona. Adaptadores posteriores pueden llevarla a otros anfitriones
compatibles. Puede distribuirse como un paquete que instala las tres capas de una
vez, pero Comunity Hub conserva su composición visible.

Cada capa publicada tiene fuente editable propia; una capa que ya existe como otra
creación de Comunity Hub se declara como dependencia en lugar de duplicarse:

- **runtime:** adaptadores, contrato de eventos seguros, compatibilidad, permisos y
  controles de integración;
- **personaje:** sprites o modelos, texturas, variantes visuales, animaciones y
  transiciones;
- **conducta:** mapa entre eventos permitidos y reacciones, escenarios de activación,
  frecuencia, intensidad, timing y personalidad;
- **manifiesto común:** componentes, dependencias, autoría, versión, atribución,
  licencias, procedencia y linaje;
- repertorio de frases contextuales y reglas de selección;
- archivos fuente necesarios para crear un remix real.

Dos mascotas pueden reaccionar a los mismos eventos con personalidades diferentes.
El creador modifica la expresión de la reacción; el anfitrión conserva el control
sobre el significado y la procedencia del evento.

Para evitar que la reactividad se reduzca a cinco bucles previsibles, el formato debe
poder representar:

- varias animaciones para un mismo estado;
- transiciones entre estados;
- acciones de reposo con rotación y pausas distintas;
- reacciones poco frecuentes;
- timing, intensidad y cooldowns propios de la personalidad;
- una reacción de respaldo cuando el paquete no implementa un evento opcional.

## Privacidad y control del usuario

La primera demo debe mantener visible la diferencia entre observar un estado técnico
y leer el contenido del trabajo. La mascota no necesita conocer prompts, código,
archivos o resultados completos para reaccionar a estados como trabajando, esperando,
completado o fallido.

La experiencia deberá contemplar al menos apagar la mascota y reducir movimiento.
Otros controles de intensidad, sonido o repertorio quedan abiertos.

## Cuidado ligero confirmado

Hambre y sueño pueden añadir un pequeño ritual de cuidado y favorecer el apego sin
convertir la experiencia en un Tamagotchi completo.

### Hambre

- disminuye lentamente solamente durante uso activo;
- se pausa cuando la mascota está guardada o la aplicación anfitriona está cerrada;
- nunca provoca muerte, pérdida, enfermedad ni bloqueo de funciones;
- tiene un límite inferior para evitar estados de emergencia;
- alimentar es una interacción gratuita, breve y expresiva.

### Sueño

- aumenta durante sesiones activas prolongadas;
- modifica el repertorio de animaciones y la energía expresiva;
- puede recuperarse mediante una acción de arropar o con siestas automáticas durante
  inactividad;
- nunca reduce la capacidad de la aplicación anfitriona ni castiga al usuario.

### Reglas comunes

- no existe deterioro acumulado mientras la persona está ausente;
- la mascota no envía recordatorios insistentes fuera de su superficie;
- ignorar una necesidad cambia su expresión, no rompe la relación;
- el usuario puede pausar el cuidado o activar recuperación automática;
- alimentos y descanso no forman una economía de consumibles pagos en la primera
  demo.

Este diseño busca cuidado voluntario y continuidad afectiva. Los sistemas de muerte,
abandono, enfermedad, reproducción o evolución compleja quedan fuera del alcance
inicial.

## Expresión verbal contextual básica

La mascota dispone de un repertorio breve definido por su paquete de conducta. Cada
frase se vincula con eventos seguros, estados de cuidado o acciones explícitas del
usuario y puede participar de las mismas reglas de variedad y cooldown que las
animaciones.

El alcance inicial contempla:

- frases cortas y reconocibles como parte de la personalidad;
- varias alternativas para evitar repetición mecánica;
- coordinación con la expresión y la animación activa;
- posibilidad de apagar la expresión verbal;
- ausencia de lectura libre de prompts, código o resultados del proyecto;
- ausencia de conversación abierta, memoria conversacional y herramientas propias.

Todavía está abierto si esas frases aparecen solamente como texto, usan audio o
admiten ambas modalidades. Esa decisión no cambia su alcance conductual básico.

## Recorrido que debe poder demostrar la vertical

1. descubrir una mascota y verla reaccionar en una vista previa;
2. comprender qué eventos reconoce y qué permisos no posee;
3. revisar autor, compatibilidad, versión, procedencia y licencia;
4. probarla o aplicarla en la aplicación anfitriona;
5. observar reactividad profunda, una necesidad de cuidado y una frase contextual;
6. inspeccionar sus sprites, animaciones y mapa de reacciones;
7. abrir la fuente en el espacio de trabajo;
8. cambiar una reacción, frase o rasgo de personalidad;
9. publicar el remix con atribución y linaje visibles.

## Señal de éxito

La vertical funciona si la diferencia con una mascota puramente visual se entiende
al verla, si el usuario distingue reacción de capacidad funcional y si el paso desde
usar hasta inspeccionar y remixar resulta natural.

## Continuidad de la demo

El siguiente paso se mantiene en el [alcance de la demo](../demo-scope-v0.md).
