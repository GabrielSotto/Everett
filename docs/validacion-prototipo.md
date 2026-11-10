# Everett — validación del prototipo

## Autoridad y criterio de calidad

El usuario ratificó el 28 de septiembre de 2026 que el alcance y las exigencias de [Desarrollar en Canvas](chatgpt-conversation://6ab710c9-398c-83e9-bbd8-f80ccc9e6f31) constituyen el **piso de calidad, nunca el techo**.

Las comprobaciones de este documento son obligatorias y se amplían cuando los riesgos, los fallos encontrados o la interacción entre funciones lo requieren. Cumplir una lista o acumular pruebas no basta si queda sin demostrar la intención del usuario, un contrato observable o un recorrido del alcance. Un riesgo detectado exige una comprobación pertinente y su resultado, o identificar explícitamente el bloqueo; no se omite para cerrar una versión.

El [alcance del prototipo](alcance-prototipo.md) define las etapas, sus límites y las aprobaciones. Esta exigencia no incorpora backend, inferencia, colaboración, autenticación ni integraciones reales al prototipo.

Excepción explícita para 0.8.15 y su ampliación 0.8.16: el usuario autorizó un servicio local acotado a previews, lectura web y archivos por URL y pidió concentrar esta entrega en funcionalidad y validación, sin ZIP. Se conservan la regresión completa, revisión visual, informe, fuentes y hashes del artefacto probado. C08-URL-01 documenta el límite del servicio y su cobertura.

## Requisitos originales del arnés y la entrega

El siguiente bloque conserva íntegros los mínimos del roadmap:

- Vincular cada requisito con **acción, intención, resultado observable y contraejemplo**.
- Ejecutar los recorridos desde los controles visibles, incluidos atajos y arrastres.
- Comprobar datos y representación visual, no solamente cambios internos.
- Repetir la regresión de las funciones conservadas.
- Registrar errores, logs, capturas y trazas asociados al caso que los produce.
- Revisar visualmente estados intermedios y transiciones.
- No contar pruebas pendientes, bloqueadas o heredadas como aprobadas.
- Verificar que existan físicamente HTML, fuentes, arnés e informe.
- Confirmar que el HTML entregado sea el mismo artefacto probado.
- Entregar enlaces a archivos existentes, sin declarar una versión terminada antes de completar su verificación.

## Gate de cada versión

### Propuesta separada de biblioteca de bosquejos

Antes de integrar el catálogo de `design/wireframe-library/`, ejecutar `test:design` y
`test:design:browser`, con Vite activo, y revisar sus capturas. Este gate evalúa la propuesta
visual; no reemplaza las pruebas de edición, selección, historial y persistencia de Canvas
que requerirá su integración.

BLF-STATE comprueba intención y partes afectadas. BLF-ANATOMY añade valor conservado al
cambiar foco/disponibilidad, estados incompatibles, acción frente a alternancia, solo lectura,
prefijos/unidades, calendarios completos y coherentes con el campo, rangos, hora, modalidad,
destinos frente a pestañas, accesorios, agrupación, selección múltiple y acciones de avisos.
Los escenarios completos deben reutilizar esas mismas piezas. Comprobar también su contexto:
identidad de la conversación, envío por icono con nombre accesible, búsqueda de conversaciones,
pasos de un proceso y contenido de agenda. La reutilización no justifica controles ajenos a la tarea.

BLF-BROWSER recorre controles reales del catálogo, variantes, anchos mínimos/intermedios/máximos, datos
habituales/extensos/únicos y texto al 200 %. Comprobar límites de piezas, recursos decodificados,
dígitos de calendario sin solapamiento y foco de teclado. Durante resize, los rótulos de controles
y encabezados deben mantener palabras completas; el texto debe caber en su control, no solamente
en el marco de la muestra. Verificar alineación y proporciones de los iconos de acción.
Distinguir scroll local deliberado
de recortes accidentales. Contraejemplos de pérdida de valor, calendario incompleto y pieza
desplazada, palabra partida y chat fuera de contexto deben fallar. Conservar la última salida, identidad de fuentes y capturas en
`output/pruebas/diseno/`; no contar esa evidencia como aprobación del diseño por el usuario.

### Trabajo continuo de Canvas

Texto directo: C08-U76 y C08-B192–B195 comprueban creación por clic y por ancho, edición en el lugar, descarte vacío, deshacer una sesión, copia independiente, recarga durante la escritura, contraste sobre una forma clara, formato a 320 px y ajuste cuando una fuente remota llega tarde. Los recorridos utilizan contextos de navegador aislados. C08-B196 contrasta redistribución y escala con texto multilingüe y emoji, alineación y recarga. C08-B197 y C08-U77 distinguen flechas libres y conexiones ancladas, incluido el ajuste de curva, grosor, persistencia y deshacer.

#### Evaluación de la ampliación de composición

Evaluación requerida para la ampliación de baja/media fidelidad del 8 de noviembre.
La ejecución vigente y sus límites se registran en Tareas.
Un único formulario no demuestra suficiencia. Componer desde piezas y componentes, además de
editar interfaces prearmadas; evaluar al menos estas familias de trabajo:

| Recorrido                                                | Propiedad que debe demostrar                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Acceso/registro móvil con ayuda y error                  | Contenido real, estados, campos y acciones con jerarquía legible.                          |
| Dashboard de escritorio con navegación, métricas y tabla | Anidación, columnas, densidad, jerarquía y edición de una parte sin desarmar la pantalla.  |
| Catálogo con filtros y tarjetas repetidas                | Reutilización, contenidos diferentes, incorporación/retirada y separación conservada.      |
| Mensajería con lista, conversación y composer            | Paneles, contenido largo, vacíos y cambio de dimensiones sin confundir rótulos o acciones. |
| Agenda o reserva en móvil y tablet                       | Filas/columnas, estados de selección y adaptación deliberada entre formatos.               |
| Detalle con diálogo o panel superpuesto                  | Orden, selección, recorte, entrada/salida de edición y regreso al contexto anterior.       |

Cruzar esos recorridos con los siguientes contratos y casos adversos:

- **Composición:** insertar, entrar en varios niveles, editar, reordenar, mover entre
  contenedores, duplicar, separar y cancelar. Comprobar pertenencia única, ausencia de ciclos,
  selección de la parte prevista y original intacto después de editar una copia.
- **Layout:** variar ancho, alto y contenido; comprobar márgenes, separación, tamaños fijos y
  ajustables, límites mínimos y contenido excedente. Cambiar barras/rótulos y refinar contenido
  sin perder identidad ni estructura. Distinguir resize de escala en las aserciones.
- **Retículas:** 4/8/12 columnas y cantidad personalizada, márgenes/separaciones válidos e
  inválidos, varias pantallas con configuraciones diferentes, resize, duplicación y recarga.
  Mostrar/ocultar desde Vista y atajo deben compartir estado sin mover contenido ni borrar
  guías. Probar ajuste magnético por separado, foco en editores y conflictos de atajos.
- **Referencias de ajuste:** dos objetos cercanos con un tercero lejano, coincidencias de
  bordes/centros, varios candidatos casi empatados, marcos anidados, selección múltiple y
  retícula contra objetos. Comprobar referencia elegida, corrección y guía dibujada juntas.
  Recorrer el gesto en ambos sentidos y alrededor del umbral para detectar oscilación.
  Incluir el caso reproducido en Tareas y la alineación distante deliberada.
- **Coordenadas y gestos:** arrastre continuo, inversión, resize, zoom/pan, suspensión del
  ajuste, Escape, pérdida de captura y retorno. Cubrir 1/3/17/38/60/100/431/600 % y estados
  intermedios relevantes sin exigir todas las combinaciones cartesianas. Medir tolerancias
  en píxeles de pantalla y conservar geometría del documento al cambiar solo la cámara.
- **Contenido y acceso:** vacío/uno/muchos, rótulos cortos y largos plausibles, palabras sin
  separación, distintas escrituras, medios ausentes y proporciones extremas. Revisar
  ventanas estrechas, texto al 200 %, teclado, foco, contraste y movimiento reducido.
- **Conservación:** Undo/Redo de gestos completos, recarga intermedia, copias e importación
  de proyectos anteriores. La migración debe conservar apariencia, contenido, identidad y
  relaciones existentes; la información de jerarquía ausente requiere tratamiento explícito.
- **Carga sostenida:** escenas pequeñas y densas dentro de los límites admitidos, repetición
  de edición y navegación; medir latencia y recursos con los presupuestos del arnés vigente.

Agregar pruebas de dominio para invariantes y geometría, recorridos de navegador sobre el
Canvas real y revisión de capturas/fotogramas para jerarquía, legibilidad y continuidad. Los
contraejemplos deben hacer fallar el arnés al elegir la referencia incorrecta, perder un hijo,
desplazar guías, escalar texto en lugar de redistribuir o romper la recuperación. Una captura
final correcta no acredita el trayecto ni el comportamiento con otros contenidos.

Aplicar Impeccable y emil-design-eng al diseño y la revisión, break-ui a datos extremos
realistas y review-animations a continuidad/interrupción. Sus recomendaciones deben quedar
traducidas a comprobaciones del resultado; un detector limpio no acredita usabilidad. Antes
de aceptar la ampliación, verificar que los recorridos se completan sin desagrupar de forma
destructiva, recolocar cada pieza manualmente ni reconstruir componentes para cambios ordinarios.

#### Regresiones de la integración existente

La integración del catálogo añade C08-U50–U51 y C08-B143–B153. Recorrer la biblioteca desde Bosquejos,
crear por botón y arrastre, editar partes después de desagrupar explícitamente, duplicar y recargar. Comprobar
cancelación, cámara conservada, historial atómico, recursos fallidos y recuperación. La conversión
compara píxeles de muestras representativas con sus piezas de Canvas; retirar textos es un
contraejemplo que debe empeorar esa comparación. Preparar todas las entradas con sus variantes
y estados no sustituye los recorridos de edición ni la revisión de las capturas de Canvas.

El desplegable debe ser la única entrada de creación, anclado al disparador y acotado a
280 × 360 px con scroll interno. Comprobar inserción directa, cierre, cambio de categoría,
opciones contextuales sin ficha de tamaño, búsqueda sin resultados y espacio libre a 550/320 px.
Probar altura de 360 px, foco de las opciones, desplazamiento del anclaje y contraste de la
pestaña activa con un contraejemplo del color insuficiente anterior.
Medir el centrado de la tinta de las 24 piezas básicas, incluidos símbolos, puntos y recortes;
un rectángulo DOM centrado no lo demuestra. Las pruebas deben rechazar tanto una miniatura
desplazada como contornos sin contraste; comprobar también tinta reconocible en miniaturas
compuestas, tamaño reconocible de símbolos y barras claras sobre botones oscuros. Revisar
capturas además de las medidas. El detector de Impeccable complementa las guías de Emil:
verificar cada hallazgo en contexto; una tipografía existente o el recorte deliberado del Canvas
no se sustituyen por un aviso genérico. Un escaneo limpio tampoco acredita calidad visual.
Los recorridos
del catálogo retirado cargan explícitamente materiales guardados para comprobar su edición;
los recorridos de creación y composición usan la paleta nueva y sus dimensiones reales.

C08-B150 corta la red después de cargar la aplicación: miniaturas, selector de hora, inserción
y arrastre deben seguir disponibles. C08-B151 selecciona un componente por su texto, lo mueve,
escala por puntero y teclado, duplica, borra, deshace y recarga antes de desagruparlo; ninguna parte
se separa accidentalmente. Comprueba que un botón no incorpore el fondo de exhibición y que
asignar un componente a una zona transfiera todas sus partes. C08-U51 cubre además composiciones
guardadas antes de marcar su tipo.
C08-B152 comprueba que los controles de alineación y espaciado permanecen visibles y se habilitan
con dos o más unidades seleccionadas, desde la barra y el menú contextual, que dos componentes
no se cuentan por sus piezas y que Escape descarta la edición del espaciado.
Los valores numéricos forman parte de Alineación; la distribución automática requiere tres unidades.
C08-B153 comprueba búsqueda lateral en la cabecera a 1440/550/320 px, posiciones intermedias,
anclaje derecho estable y catálogo sin desplazamiento al abrir. Filtrar no requiere Enter y
cerrar no conserva filtros invisibles. Escape recupera foco y categoría; el switch Mostrar rótulos
funciona con ratón, Espacio y Enter, actualiza previews e inserciones y conserva su valor al reabrir.
Comprobar movimiento reducido y texto al 200 %: pestañas sin solapamiento y miniaturas en una
columna cuando su texto requiere más ancho, con navegación por teclado correspondiente.

C08-B154 observa fotogramas durante clics repetidos y pulsación sostenida del switch y apertura/
cierre de búsqueda en las tres categorías. Comprueba continuidad de tarjetas, pintura y escala;
quitar un filtro recupera previews ya preparadas. C08-B155 mide el grosor proyectado de bordes CSS,
trazos SVG y pistas, sin modificar el material insertado; texto transparente con tinta legible
sobre Canvas, bloque claro y sus límites, persistencia y símbolo convencional de máscara.
C08-U52 conserva colores explícitos y descarta fondos distantes o delante del texto.
C08-B156 distingue foco de mouse/teclado, comprueba nombres de glifos estrechos y largos y
cabeceras de 1440/550/320 px.

C08-B157 comprueba el panel Alinear sin selección, con una pieza y con selección múltiple,
distancias reales, distribución, capas según superposición, historial y 320 px con texto ampliado.
C08-B158 distingue flecha de selección, mano de paneo, cruz de creación, tiradores y campos de
texto; panear desde un material debe mover la cámara, no la pieza. C08-B159 mide el contraste
real del título, cuerpo y placeholders sobre cada papel, con un contraejemplo de tinta invisible,
fuente/tamaño compartidos entre tarjeta y editor, teclado, persistencia, texto extenso y 320 px.
C08-U53 amplía la medición a tonos heredados y rechaza tamaños inválidos sin cambiar el estado.
El cierre exterior de paneles incluye los controles desactivados de la cabecera en C08-B63.

C08-B160 comprueba el filtro de familias compacto, sin quitar altura a las miniaturas,
con teclado, cierre local y conservación de categoría a 550/320 px. C08-B161 conserva
el nombre completo y la acción Separar de una interfaz seleccionada entre 17 y 100 %,
comprueba que el botón reciba el puntero y que desagrupar/deshacer conserve las piezas.
BLF-ANATOMY-14 distingue veinte recorridos completos y sus contextos; BLF-BROWSER-07
captura las veinte interfaces con barras y rótulos, las variantes laterales y sus alineaciones.
Los estilos de la página del catálogo no deben alterar los paneles de las composiciones.

El 27 de octubre de 2026 el usuario sustituyó las entregas puntuales por desarrollo continuo
con Vite. El gate cotidiano evalúa directamente las fuentes de la aplicación: tipado, pruebas
unitarias y del arnés, recorridos reales de navegador, regresión pertinente, revisión visual
y auditoría del alcance. No requiere construir un HTML autónomo, preparar un ZIP ni redactar
un informe adicional por cada revisión. Mantener las fuentes versionadas y la evidencia real
de la ejecución. Una versión de paquete no sustituye la identidad de la revisión evaluada.

`target.json` registra versión, hashes de fuentes, configuración, recursos y servicio, y su hash
conjunto. El runner y los casos contrastan la identidad con Vite; el verificador vuelve a leer
las fuentes y descubre exactamente los casos aplicables. Un cambio durante la ejecución o una
discrepancia de identidad debe invalidar el resultado. Conservar los controles negativos del
arnés, los recorridos de aplicación y sus contraejemplos. Los casos C08-B13 y C08-B90, exclusivos
del antiguo archivo autónomo, permanecen en el gate histórico de ese formato y no se acreditan
como ejecutados contra fuentes.

Los adjuntos `development-events` registran navegación y mensajes de recarga de Vite para
distinguir una interrupción del entorno de un fallo del gesto. No esperan la recuperación ni
repiten la acción fallida: la ejecución interrumpida sigue sin certificar el recorrido.

### Antecedente de entregas puntuales

Las comprobaciones de HTML, empaquetado y hashes de un artefacto distribuible que siguen
corresponden a ese formato anterior. El trabajo continuo conserva sus criterios funcionales
y de evidencia; no necesita generar ese formato para iterar ni mostrar los cambios al usuario.

En cada cambio de comportamiento, ampliar o ajustar el arnés junto con la implementación: funciones, superficies, interacciones, gestos, motion y sus combinaciones requieren comprobaciones observables y contraejemplos pertinentes. Cada fallo encontrado durante pruebas o feedback debe quedar cubierto por una regresión reproducible. Conservar las pruebas de comportamientos aprobados y ejecutar las regresiones afectadas; completar la regresión de la etapa antes de integrarla. Los cambios exclusivamente documentales mantienen su verificación específica.

En el catálogo de bosquejos, comprobar la pertinencia de cada estado por componente, su alcance
visual y la información conservada. Separar variantes de presentación, valor elegido, foco,
disponibilidad y estado del contenido. Una toolbar no se activa entera por elegir una herramienta;
la carga de datos no reemplaza sus controles ni agrega un skeleton de texto indiscriminadamente.
Verificar estas intenciones con contraejemplos y revisión visual, además del encaje geométrico.
Las fuentes y el comando específico están en [Desarrollo](desarrollo.md#catálogo-de-diseño-de-bosquejos).

Versionar las fuentes del arnés, sus datos y las instrucciones de ejecución en la misma rama de la iteración. Conservar los resultados, trazas y capturas de la entrega junto con el HTML y las fuentes en un paquete verificado. La continuidad de las pruebas debe depender del repositorio y sus entregas guardadas.

Secuencia mínima recuperada del acuerdo:

`base verificada → implementación → build → typecheck → pruebas de dominio → pruebas de intención → navegador real → regresión completa de Everett → revisión visual → auditoría del alcance → empaquetado → hash del artefacto final → entrega`

- La reconstrucción de 0.8 parte de 0.7.5 y conserva el Universo aprobado. La supuesta 0.8 anterior y sus afirmaciones de pruebas carecen de evidencia utilizable.
- Verificar la base al comienzo. No confundir la existencia del HTML ni sus fuentes embebidas con una validación de funcionamiento.
- Ejecutar las capas con los comandos reales del proyecto y registrar su salida, código de terminación, entorno, fecha, versión y artefacto evaluado.
- Ante un fallo, corregir la causa y volver a ejecutar las comprobaciones afectadas, incluyendo integración y regresiones pertinentes. Si cambia el artefacto, la evidencia anterior no certifica automáticamente el nuevo.
- Antes de entregar, comprobar la integridad del empaquetado y abrir el HTML final. Su hash debe coincidir con el del HTML probado; comprobar también el contenido de los archivos comprimidos y el acceso a los enlaces de entrega.
- No presentar una versión o candidata como lista para prueba libre antes de completar su verificación. Después siguen feedback, correcciones y aprobación del usuario; el cierre técnico no sustituye esa aprobación.

## Trazabilidad por requisito y caso

Cada requisito debe tener un identificador estable y casos asociados. Cada caso registra:

| Campo                 | Evidencia necesaria                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Requisito e intención | Qué necesidad del usuario o contrato demuestra.                                                     |
| Preparación           | Datos iniciales, versión, entorno y condiciones reproducibles.                                      |
| Acción                | Controles visibles, atajos, arrastres y secuencia exacta del recorrido.                             |
| Resultado observable  | Qué datos, contenido y representación debe percibir el usuario.                                     |
| Contraejemplo         | Qué resultado sería incorrecto y cómo detectarlo.                                                   |
| Evidencia             | Salida de ejecución y, según el caso, logs, errores, capturas y trazas vinculados al identificador. |
| Estado                | Aprobado, fallido, pendiente, bloqueado u omitido, con motivo y ejecución correspondiente.          |

Las aserciones de dominio complementan los recorridos de navegador. Modificar directamente el estado interno no demuestra que un control visible, un gesto o un atajo funcione. Una captura final no demuestra por sí sola una transición, la conservación de datos o la intención de una acción.

La auditoría de alcance comprueba que los requisitos tengan evidencia vigente, que los contraejemplos fallen como corresponde y que no queden pendientes ocultos detrás de un total de pruebas aprobadas.

## Ampliaciones según los riesgos

Además del bloque original, cubrir los siguientes riesgos cuando afecten al recorrido. La lista es abierta y debe crecer ante evidencia concreta.

- **Límites y densidad.** Probar vacío, 1, 6, 7, 15 y 16 materiales y el paso en ambos sentidos entre representaciones. Verificar tamaños máximos, consulta de grupos, contadores y contenido conservado.
- **Propiedad, contexto y propuestas.** Diferenciar referencia, asignación contextual y transferencia; impedir uso exclusivo simultáneo indebido. Comprobar cancelación, rechazo, retiro del agente y eliminación de zona con devolución íntegra. Ninguna propuesta cambia contenido compartido antes de aceptarse; cancelar un pedido de cambios mantiene la propuesta pendiente.
- **Historial y edición.** Probar Undo/Redo mediante atajos reales dentro y fuera de texto editable, secuencias encadenadas y datos conservados al cambiar de objeto o superficie.
- **Continuidad de chat y navegación.** Conservar conversación, borradores, participantes, referencias, identidad y posición al anclar, desacoplar, abrir otra superficie y regresar. Canvas 0.8 retira Room. Arrastrar al chat no transfiere propiedad.
- **Geometría e interacción.** Comprobar anclajes de conexiones, conexiones inválidas, proporciones del gesto, paneo, zoom, selección, límites de arrastre y recuperación de controles. Inspeccionar solapamientos entre dock, chats, paneles y composers.
- **Estados y recuperación.** Cubrir carga, vacío, éxito, error, cancelación e interrupción donde existan. Comprobar entradas inválidas, fallos de almacenamiento y de recursos externos en los recorridos afectados, sin pérdida silenciosa de contenido.
- **Accesibilidad y adaptación.** Recorrer teclado, foco, nombres accesibles, contraste y tamaños de ventana pertinentes. Verificar contenido extenso, poco y mucho contenido, controles alcanzables y preferencias de movimiento cuando correspondan.
- **Secuencias y estabilidad.** Repetir acciones rápidas y encadenadas, cambiar de superficie durante estados transitorios y realizar sesiones prolongadas según el riesgo. Buscar duplicaciones, referencias huérfanas, eventos acumulados y deterioro de respuesta.
- **Coherencia entre superficies.** Contrastar las mismas tareas, materiales, conversaciones, propuestas y ejecuciones en sus distintas vistas. Los datos simulados del prototipo deben ser consistentes y reproducibles; identificar su condición de simulación.
- **Regresión de lo aprobado.** Incluir Universo, gravedad, minimapa, navegación, zoom semántico y regreso al origen, además de las funciones conservadas de todas las superficies. Registrar los fallos de base por separado para distinguirlos de los introducidos.

Definir criterios observables y límites apropiados para cada caso antes de considerarlo aprobado. No sustituir cobertura por una cantidad arbitraria de tests, capturas o tiempo de ejecución.

UI-SEQUENCE-01 controla el reloj durante los gestos que deben llegar dentro de una transición
y lo reanuda antes de comprobar su finalización. Así verifica el intervalo previsto incluso
con carga del runner; no depende de que varias llamadas de automatización terminen en 440 ms.

## Comprobar también el arnés

Para 0.8, `scripts/canvas-contracts.mjs` relaciona todos los contratos C08 con casos mínimos unitarios y de navegador. Sus controles negativos rechazan la ausencia o duplicación de un caso y una definición sin correspondencia. La ejecución completa conserva además las regresiones de Everett; una suite de 0.7.5 no basta.

Los recorridos de 0.8 comprueban nombre compartido y duplicado independiente de Docs, retirada de referencias, historial común Canvas/Sessions, archivos con bytes recuperables, PDF multipágina, video y dibujo, cables y etiquetas, comentarios con borrador privado, conflictos de atajos y texto sin activar herramientas. Los estados adversos incluyen datos corruptos reparables, trabajos confirmados como interrumpidos, nombres y listas extensos, hover cancelado, selección múltiple y movimiento reducido. Las nuevas incidencias manuales amplían esta cobertura; la matriz no sustituye la auditoría de alcance y revisión visual.

Las regresiones de disposición comprueban rueda real hasta 6×, tamaño visual de propuestas
y menús, revisión expandida con contenido visible, hit-testing de los extremos de sus
acciones y convivencia con el inspector y el chat. Verificar 799/800/801 px y anchos
hasta 300 px: chat anclado hasta el borde inferior, dock sin huecos ni filas accidentales,
controles utilizables, herramientas adicionales alcanzables y borrador conservado al
contraer/expandir. Medir la representación vigente después de resize y esperar el fin
de las transiciones antes de comprobar su geometría final; revisar también sus estados
intermedios. C08-B17–B29 quedan exigidos por la matriz del arnés. La cobertura incluye
el nombre y chevron de contraer/desplegar, desacoplamiento por arrastre, desplazamiento
del dock colocado manualmente al expandir el chat y contraste entre fondo punteado,
zonas, materiales y herramientas. Comprobar también la legibilidad del texto sobre
las superficies diferenciadas. La corrección 0.8.1 exige también comprobar píxeles
visibles del cable después de etiquetar, un contraejemplo de máscara inválida,
contraste de cada control de propuestas, ausencia de movimiento del dock sin colisión,
toggle de herramientas, cursores, muestras de grosor, nombres independientes de zonas,
menú del composer, regreso desde atajos y ejemplos multimedia recargables.

Para 0.8.2, C08-U07/U08 y C08-B30–B33 amplían esos controles con arrastre del video
antes y durante reproducción, regreso espacial y recarga; reconexión por arrastre y
teclado con identidad, etiqueta, cancelación y Undo/Redo; nombre realmente pintado
y un contraejemplo de tinta invisible; cursor durante trazos consecutivos; metadatos
de Board y vacío centrado de zona. C08-B23 registra filas y ancho en los fotogramas
intermedios de Pedir cambios, además de altura. La propuesta identifica su contexto
y resultado, conserva el contenido recibido hasta una decisión explícita y permanece
cerca de su zona sin desplazar otros materiales.

El arnés forma parte del sistema que se debe validar. Debe detectar y reportar correctamente:

- Un proceso que falla, no inicia, se interrumpe o excede su tiempo.
- Un archivo de resultados ausente, vacío, ilegible o perteneciente a otra ejecución o versión.
- Cero casos descubiertos cuando se esperaban casos, casos pendientes o bloqueados y omisiones que impiden cubrir el alcance.
- Una aserción intencionalmente incumplida y una discrepancia visual relevante.
- Un HTML, fuentes, arnés o informe ausente; un enlace inaccesible; un hash que no coincide con el artefacto probado.

Usar controles negativos para comprobar esos comportamientos. La ausencia de un registro no significa que una prueba esté ejecutándose, pendiente por completar o aprobada: es ausencia de evidencia y debe informarse como tal. Un fallo relevante debe impedir declarar superado el gate.

La evidencia debe permitir reproducir el caso. Un resultado anterior, un cambio interno, un mock o la aprobación de 0.7.5 no certifican una entrega nueva.

El feedback de 0.8.2 agrega C08-U09/U10 y C08-B34–B40. Se comprueba tinta realmente pintada en los cinco papeles de nota, con un contraejemplo que la vuelve invisible; Play mantenido y repetido tras recargas a tres escalas; conexiones inversas, papelera durante la edición y botones de historial; previews de los tipos recibidos, aceptación exacta de sus datos, conservación de bytes y pedidos privados; líneas y ancho de chips en cada fotograma, apertura repetida, contracción gradual del área de previews y movimiento reducido; Formas, lápiz desde el primer gesto y marcador de comentario a varios zooms. La propuesta se verifica a 390 × 500 con los botones inferiores completamente alcanzables. C08-B40 comprueba continuidad de píxeles del dibujo al zoom mínimo, con un contraejemplo de trazo subpíxel, conservación de datos y toolbar superior a 800, 390 y 300 píxeles.

## Entrega verificable

La revisión de 0.8.13 añade C08-U25 y C08-B81–B86 para 0.8.14. Exigir los cuatro switches dentro de Preferencias, idioma y persistencia, sin switches sueltos en Configuración; capacidad incremental del dock con chat anclado en 17 cambios de ancho entre 300 y 1000 px y desborde sin duplicaciones; rueda nativa sobre zona vacía, scroll real y Alt con `preventDefault`; etiquetas de formas y marcos de conjuntos a 1/3/6/17/38/60/100/200/431/600 %, 100 fotogramas de cambios de escala, datos intactos, recarga y acceso por teclado al nombre del conjunto diminuto. La cámara se contrasta alrededor del mismo píxel de cursor, con gestos inversos, límites reiterados y unidades de rueda píxel/línea/página. La inyección de unidades menos frecuentes complementa la rueda nativa y se identifica como tal. Un desplazamiento deliberado del nombre debe fallar el criterio geométrico y su restauración debe volver a cumplirlo. Las capturas al 431 % mantienen visible la punta de la forma y su identificación; medir una etiqueta fuera de pantalla no demuestra su lectura. U25 y B84 exigen lado estable, separación y cero colisiones de encabezados en reposo, con un contraejemplo deliberado. B86 debe consultar y renombrar por puntero un conjunto rodeado por materiales, atravesar la separación hasta el nombre y conservar selección rectangular desde el interior y el puente transparente, sin mover materiales ni cámara. Sobre tarjetas claras, exigir fondo opaco realmente pintado y contraste mínimo 4,5:1 del contador; volver transparente el fondo debe hacer fallar la comparación y restaurarlo debe recuperarla.

La revisión de 0.8.12 amplía el arnés para 0.8.13 con C08-U24 y C08-B77–B80: tres materiales superpuestos intercalados con objetos lejanos, pasos repetidos hasta ambos límites, menú contextual y teclado que omite acciones deshabilitadas; zonas normales y grandes a 6/12/17/32/75/100/200/600 %, zoom continuo en ambas direcciones y estados de densidad sin recortes; apertura reiterada de Quick Chat y resize entre 300 y 1000 px, separación lateral y franja inferior; configuración compacta, switches por teclado, regreso centrado en las tres subsecciones y preferencias locales tras recarga. Comprobar que las teclas sobre Configuración no actúen sobre materiales del Canvas y que la preferencia de movimiento no modifique Universo.

UI-HARNESS-05 contrasta los píxeles del texto de zona con una referencia de texto nativo fuera de ancestros escalados, introduce desenfoque deliberado y exige detectarlo antes de restaurar y volver a comparar. Este control comprueba nitidez de esa muestra; la revisión visual conserva los tamaños y estados intermedios identificados. C08-B74 mantiene los controles de tinta, orden visible, contenido y persistencia; al encontrar un material ya al frente exige la acción deshabilitada en lugar de intentar ejecutarla.

La entrega incluye HTML, fuentes, arnés ejecutable e informe real de la versión, con instrucciones reproducibles y hashes de los artefactos finales. El informe relaciona requisitos, casos, resultados y evidencias; identifica los fallos, bloqueos y omisiones sin contarlos como aprobados.

Comprobar la existencia física, lectura, contenido y accesibilidad de cada archivo o enlace antes de presentarlo. Si algo falta o una capa del gate no se ejecutó, indicar exactamente qué queda por verificar; no anunciar una entrega terminada.

## Inventario comprobado al adoptar este contrato

Inspección local del 28 de septiembre de 2026:

- Archivo presente: `Everett-0.7.5.html`, 7.438.552 bytes.
- SHA-256: `1389917ed01c2bac74933f10e4e44b4c0fcfd1eb659cd5b33340bf8fe5bf0ccc`.
- El HTML contiene un source map con 59 rutas y sus 59 contenidos de fuente TypeScript embebidos. Sus rutas no incluyen archivos identificados como tests, specs o harness.
- En la carpeta inicial no había fuentes separadas, manifiesto de dependencias, scripts de build, arnés ejecutable ni informe de pruebas.
- La conversación recuperada no incluye los adjuntos originales ni un paquete verificable de 0.8.

Este inventario acredita existencia y posibilidad de recuperar esas fuentes. No se han ejecutado build, typecheck, pruebas funcionales, pruebas de navegador ni revisión visual de 0.7.5 en esta inspección.

La corrección 0.8.4 exige C08-U11/U12 y C08-B41–B43: selección mediante arrastre desde el fondo, grupo de tres materiales, movimiento y eliminación atómicos, transferencia completa a zona y devolución tras recarga; rectángulo inverso y aditivo, Shift + clic, cámara estable al seleccionar y cancelación mediante Esc y pointercancel. El video debe pintar un fotograma del archivo antes de Play y tras recuperar material antiguo o copias; se comparan píxeles del preview y un contraejemplo vacío, bytes originales y estado de reproducción a distintas escalas. ReadyState, duración o éxito al pulsar Play no acreditan esa representación en reposo.

Para 0.8.5, C08-B05 debe abrir el selector desde Importar archivos locales y comprobar selección múltiple antes de importar. C08-B44 incorpora las tres imágenes de ejemplo y completa el ciclo, recupera el índice tras recarga y cambio de superficie, exige previews decodificados visibles y bytes distintos entre imágenes, y conserva sin cambios los materiales y archivos anteriores.

Para 0.8.6, C08-B46 exige que el selector de incorporación quede junto a su disparador y no lo cubra, con dimensiones acotadas dentro de la ventana. Medir su distancia al botón además de su visibilidad, antes y después de zoom, arrastre del dock y resize; probar bordes, chat anclado, lista extensa y nombres largos. Verificar navegación por teclado, acceso al final de la lista, cierre y foco recuperado. La rueda dentro del selector desplaza su lista y conserva la cámara del Canvas.

Para 0.8.7, C08-B46 comprueba también la apertura al costado cuando hay espacio lateral cercano y ausencia de solapamiento con todo el dock. La variante anterior encima del dock debe fallar en el escenario ancho. Conservar las aserciones de cercanía y límites en las posiciones que necesiten la apertura vertical alternativa.

## Entrada observable y auditoría de recorridos de Canvas

La preparación de fixtures define datos iniciales; no demuestra el acceso del usuario. Un test que alimenta directamente un input puede comprobar procesamiento o recursos, pero no certifica el botón, menú ni selector. El recorrido positivo de importación debe abrir el selector desde la entrada visible y conservar el input conectado.

El arnés registra clics de entrada antes de reconstruir el DOM, conserva el registro en el runner a través de recargas y adjunta controls-used. El verificador exige el registro en cada caso y las entradas públicas declaradas en canvasControlRequirements de scripts/canvas-contracts.mjs: importación, ejemplos, Play, herramientas, propuestas e historial. Un clic programático o sobre un control oculto no cumple ese requisito. HARNESS-14 rechaza registros ausentes, inválidos, ocultos y programáticos. UI-HARNESS-03 comprueba esa distinción sobre controles del navegador por mouse y teclado. Los registros complementan los resultados y contraejemplos de cada caso; no demuestran por sí solos su intención.

Al incorporar o cambiar una interacción, revisar el recorrido completo antes de entregar: entrada visible, gesto o atajo, resultado representado, cancelar y repetir, datos compartidos, recarga y recuperación. Declarar sus entradas obligatorias en la matriz cuando la intención dependa de un control. Registrar las inyecciones de interrupción y los fixtures adversos como preparación o contraejemplo; no presentarlos como interacción real.

Auditoría de 0.8.5: renombrado compartido, duplicado y retirada de referencias C08-B01; atajos B03/B27; recuperación adversa B10/B11/B14; importación C08-B05/B08/B45; ejemplos B29/B44; herramientas y gestos B24/B39/B41/B42; editor de notas B34; cables B06/B22/B31/B36; comentarios B03/B39; propuestas y zonas B04/B15/B37 y UI-ZONE-01–03; chat e historial B02 y UI-CHAT-01–03. Las aserciones vigentes cubren representación, datos y recuperación. Se amplía la importación con PNG, JPEG y PDF juntos, selección vacía, repetición, archivo no admitido y bytes recuperados, desde el selector. Los previews del lote deben estar completos en la ventana; una fracción visible no cumple la intención.

La evaluación de organización espacial incorpora C08-B47–B49. B47 contrasta la distancia del estilo a su disparador durante el arrastre del dock, al soltar y al abrir junto a distintos bordes; compara geometría y filas a igual ventana en dibujo y formas. Que un panel exista y tenga una flecha correcta en una posición no acredita su continuidad durante un gesto. Al corregirlo, completar las combinaciones pertinentes con chat, zoom y ventanas estrechas.

B48 recorre incorporación de documentos, código y tareas, decisión en una nota, relaciones etiquetadas, movimiento conjunto, Undo/Redo, edición de los registros originales, regreso espacial y recarga. B49 prepara un panorama de 20 materiales y 16 relaciones y comprueba selección conjunta y regreso desde el contenido. Sus adjuntos registran búsqueda, organización manual sin agente e intersecciones de etiquetas. Distinguir aserciones de contratos aprobados de observaciones sobre capacidades por definir: un caso aprobado no certifica que la búsqueda encuentre notas, que haya agrupación persistente o que todas las etiquetas sean legibles. Al acordar esos comportamientos, convertir sus resultados esperados en aserciones específicas.

Las capturas del panorama esperan el final de las transiciones finitas; las de gestos intermedios mantienen el puntero pulsado. Conservar ambas clases de evidencia. Los datos preparados por fixture se identifican como entrada controlada y no como creación mediante controles. La evaluación de un recorrido acotado no sustituye el gate completo ni demuestra por sí sola la utilidad para proyectos de cualquier tamaño.

La corrección 0.8.8 añade C08-U13 y B50–B54. El estilo se mide durante arrastres sucesivos y al soltar, con chat, bordes, resize, cancelación y zoom mínimo/máximo, a 1440/704/390/300 px. Se exige proximidad y ausencia de solapamiento con el dock; un contraejemplo coloca el panel fuera de pantalla y debe ser rechazado. Las mediciones finales esperan las transiciones y comparan geometría con precisión de subpíxel; los gestos conservan muestras intermedias.

La búsqueda comprueba nombre y texto disponible de todos los tipos, referencias con nombres vigentes y destinos por Mundo. Desde controles visibles y teclado debe encontrar un material fuera de pantalla, enfocarlo sin modificar contenido, volver al contexto anterior, conservar el borrador y recuperar cámara/selección tras recarga. Incluir renombrado compartido, retirada y Undo, lista extensa, nombres completos, ausencia de resultados, escritura de N/C/L sin activar herramientas, materiales asignados sin cancelar su trabajo y navegación desde otra superficie o Mundo. B52 comprueba la barra accesible a 801/800/799/564/390/300 px y movimiento reducido. B54 mide apertura y reversión, comprueba que el input siga conectado tras actualizar el encabezado y contrasta píxeles de texto visible con un contraejemplo sin tinta. También cierra con Esc un campo de perfil modificado y enfocado: la actualización por pérdida de foco no debe provocar renders anidados ni perder el dato o el foco de regreso. Pasar las aserciones de datos no sustituye comprobar esos píxeles y los estados intermedios.

### Organización espacial y controles de 0.8.9

C08-B55 mide la expansión de búsqueda dentro de la cabecera durante la transición a 1440/801/800/799/564/390/300 px y comprueba switch, recuperación, tamaño de Undo/Redo y navegación espacial sin menú. Un contraejemplo coloca el buscador debajo deliberadamente y exige detectarlo antes de restaurar el estilo. C08-B56 encadena las cuatro formas, cancelación, selector de opacidad y etiqueta con Enter/Esc/Backspace/Undo.

C08-B57 ejercita selección rectangular, creación, renombrado, arrastre conjunto, Undo/Redo, recarga, asignación/devolución de un miembro y separación conservando materiales. C08-B58 selecciona mediante teclado fragmentos de Docs y Code, comprueba que el lector no edite, entra a los orígenes, inserta antes, vuelve a verificar el fragmento y lo elimina; la recarga conserva el estado no disponible. Los casos unitarios C08-U14/U15/U16 amplían validación, copia independiente, rebasing y transparencia; también se prueban Rehacer después de una edición externa y el rechazo de propuestas obsoletas.

C08-B49 exige cero intersecciones etiqueta/tarjeta en el panorama de veinte materiales; registrar las coordenadas sin esa aserción no detectaba el fallo. Estas pruebas amplían el gate completo y sus controles, sin certificar comportamientos no ejecutados ni reemplazar la revisión visual del artefacto actual.

### Revisión 0.8.10

C08-B59–B66 cubren el área real de color y sus entradas, extracción de conjuntos, selección explicada de fragmentos, tamaño del chat al presionar y arrastrar, configuración y cierre desde cabecera, expansión por fotograma, zoom explícito recuperado y edición/borrado de etiquetas sin acciones duplicadas. El muestreo de búsqueda comienza en el clic: un cierre anterior puede seguir en curso y no se confunde con la dirección de la nueva apertura. El trazo se prueba al 1 % con suficientes píxeles para distinguir continuidad de una línea subpíxel; se conserva el contraejemplo deliberadamente roto y su restauración. Los cambios de UI acordados actualizan los accesos del arnés conservando los resultados exigidos.

Las sondas de apertura capturan el clic desde el documento y se retiran al reconocer su disparador. No dependen de conservar un botón que resize puede reemplazar. B66 cambia el tamaño después de instalar la sonda y exige sus veinte fotogramas, además del hit-testing y su contraejemplo; cero muestras nunca aprueba la transición.

La lectura final de conjuntos tras zoom resuelve encabezado y escala dentro del mismo callback del navegador, y espera un resultado legible y alcanzable. Un elemento ausente, una fuente no finita o un control tapado no aprueban esa espera. Esto evita medir un encabezado retirado por el siguiente fotograma de la cámara.

B19 resuelve el dock y todos sus botones visibles en una sola lectura, con los mismos mínimos de tamaño, cantidad, fila, márgenes y ausencia de solapamiento. Después de resize también exige la anchura prevista del chat antes de usarla como límite del dock. No combinar rectángulos obtenidos de distintas reconstrucciones del DOM.

Las entradas obligatorias se validan también al terminar cada caso, antes de adjuntar el registro definitivo. Se conserva ese registro si la comprobación falla y no se reemplaza el error original de un recorrido fallido. El verificador independiente vuelve a exigirlo. Un menú con opacidad cero no acredita una entrada visible; B65 espera su aparición antes de activar las acciones.

La revisión de 0.8.10 exige C08-U21/U22 y C08-B67–B70. Se comprueba selección de 5/50/95 % desde los cuatro sentidos, a distintos zooms, sobre materiales y miembros de conjuntos, Shift y cancelación, sin mover datos ni cámara. B60 incorpora retirada y reingreso por arrastre en una sola operación reversible; no basta crear otro conjunto. B68 mide tinta en 48 puntos del borde de cada forma de 1 % a 600 %, con y sin relleno, y un contraejemplo subpíxel. B69 exige Quick Chat compacto después de anclar/desacoplar por mouse y teclado, cerrar, reabrir, recargar y recuperar tamaños defectuosos anteriores. B70 comprueba ancho, posición y pestañas en ocho fotogramas por sección a 1440/801/390/300 px, además de un desplazamiento deliberado. B61/B58 comprueban el texto exacto de la tarjeta; el regreso debe pertenecer a la superficie activa y terminar su transición antes de afirmar recuperación.

### Revisión 0.8.12

C08-U23 comprueba orden estable de materiales, pasos y extremos, rechazos atómicos y Undo/Redo sin modificar contenido ni vínculos. C08-B74 usa las cuatro acciones del menú contextual sobre un PDF real superpuesto al código; exige que el hit-testing, el orden de datos, el historial y la recarga concuerden. Añade selección múltiple y una superposición completa de Code, imagen, PDF y video en reproducción, ordenados desde el menú por teclado. B32 conserva el nombre editable por encima de una obstrucción deliberada sin adelantar el cuerpo del material.

C08-B71 exige un clic para seleccionar y doble clic para editar, tanto sobre un cable sin etiqueta como sobre su texto existente, sin menú contextual ni botones. Comprueba foco, selección con Space sin abrir el editor, anclajes visibles, Enter/Esc, etiqueta vacía y Backspace dentro del campo antes de eliminar con Backspace/Delete fuera de él. B06/B22/B31/B36/B56/B65 conservan los resultados de cables y actualizan su acceso a la interacción aprobada; B31 exige reconexión por arrastre y teclado, cancelación, historial y recuperación.

C08-B72 complementa la tinta del borde de B68: cuatro formas, grosores 1/8 y zoom 1/10/32/40/100/200/600 %, 56 condiciones. Muestrea el perímetro con su grosor visible, el marco exterior y los cuatro tiradores de siete píxeles. Desde 10 %, contrasta los píxeles de los cuatro lados contra el mismo marco transparente; ofrece varios puntos por lado porque el dock puede cubrir su centro al acercar, con tolerancia de raster proporcional a la ampliación. Mantiene el umbral de diferencia y exige todos los lados, además de preservar los datos de la figura.

C08-B73 abre Quick Chat lejos del dock y exige la misma posición, orientación y densidad; luego lo acerca hasta dejar cuatro píxeles libres y exige que tampoco lo mueva. Después lo arrastra contra él cuatro veces y comprueba separación, herramientas y borrador. Más herramientas debe conservar Quick Chat abierto incluso a 300 px. B19 exige todas las herramientas desde el desborde cuando solo caben tirador y menú junto al chat anclado. C08-B76 cubre orientación Horizontal/Vertical, recarga, ventana estrecha y regreso de Configuración alineado. B46 repite incorporación con el dock vertical a 300 px y conserva el límite de veinte píxeles hasta el disparador, además de teclado, scroll y listas extensas. C08-B75 exige contador explícito, aviso de reincorporación dentro del conjunto sin sustituir el nombre y etiqueta centrada legible en una zona grande. El encabezado y el contador deben quedar separados de las identificaciones visibles de materiales; un contraejemplo reduce su margen y debe detectar el solapamiento. B50 espera el render de resize antes de escoger entre el botón de herramienta y su entrada visible en Más herramientas, conservando las mediciones de cercanía, dimensiones y gestos.

UI-HARNESS-04 comprueba la sonda de controles con trazos SVG horizontales y verticales de área geométrica cero: el mouse real debe registrarlos como visibles y confiables. Clic programático, SVG oculto y geometría vacía se rechazan. La extensión conserva las comprobaciones previas de controles HTML; no confunde un path interactivo con un elemento invisible por tener ancho o alto cero.

## Lectura y archivos por URL — 0.8.16–0.8.17

C08-U30–U33 y C08-B94–B99 comprueban extracción con Readability, saneamiento, límites, reconocimiento por bytes y proveedores permitidos; contenido guardado y navegación dentro del lector; recarga y scroll; fallo de actualización sin perder la última lectura; conversión tardía de imagen durante renombre, proporción y reproducción nativa de video; portapapeles real y rechazo de permisos; iframe oficial, mensajes de error y regreso visible; rueda continua sin cola y encuadre de selección por encima del 100 %. El caso controlado de proveedor acredita integración y protocolo, no disponibilidad de reproducción de cualquier video público. Contrastar además destinos públicos sin sustituir respuestas y revisar capturas a ancho normal y estrecho.

Las correcciones posteriores a 0.8.16 añaden C08-B100–B107: entrar con rueda nativa en una referencia, seguir un enlace, volver primero a la lectura original y después al mismo Canvas con su cámara. Exigir una única flecha compacta y ausencia de pantallas intermedias de Everett. La salida del reproductor se comprueba con el puntero sobre el video dentro del iframe, además de contrastar el proveedor público. La prueba controlada no acredita disponibilidad universal del proveedor. Comprobar ampliación visible, paneo por arrastre, rotación, ajuste y bytes inalterados de imágenes.

Los diálogos propios de eliminación se recorren aceptando y cancelando, con foco inicial en Cancelar, Tab retenido en ambos sentidos, Escape, restauración del foco, Undo y límites a 300 px. El fixture registra y acepta mediante botones visibles las eliminaciones que no son objeto del caso; C08-B99/B103 desactivan esa ayuda para comprobar las decisiones. Un diálogo nativo inesperado es un fallo. Cerrar formularios no pide confirmación. Denegar la lectura del portapapeles debe ofrecer un campo propio para pegar mediante Ctrl+V sin solicitar permisos en bucle. Los controles negativos de geometría y saneamiento complementan las acciones visibles.

La revisión de diseño aplica emil-design-eng, review-animations, break-ui y apple-design a los controles, gestos y estados de Canvas. C08-B105 alterna fixtures por la frontera HTTP mediante un selector exclusivo del contexto de pruebas, ausente del HTML distribuido. Comprueba títulos ausentes/extensos, texto multilingüe, direcciones largas, 320/2560 px y texto al 200 %. C08-B106 verifica archivos de proporción 20:1 y 1:20; admite el redondeo subpíxel del navegador sin tolerar deformaciones visibles. C08-B107 comprueba respuesta inmediata a teclado, origen geométrico del desborde, feedback al presionar y comentarios alcanzables al alejar, con resumen contenido en una ventana estrecha y sin tapar su burbuja. Contrastar además las capturas de tarjetas, relaciones, conjuntos, zonas, propuestas, chat, dock y configuración del gate, con atención a jerarquía, legibilidad, foco y continuidad de gestos; la existencia de controles no acredita esas propiedades.

### Regresiones de biblioteca por categoría y dispositivo

C08-U55 verifica cobertura de clasificación sin entradas huérfanas ni filtros vacíos.
C08-B162 conserva posición del filtro al cambiar de pestaña a 1440/550/320 px, filtros por
categoría y creación real de las cuatro interfaces táctiles. C08-B163 recorre búsqueda sin
resultados, teclado, selección, recursos sin red, inserción individual, contraste y recarga.
C08-B164 protege las recetas de Piezas durante arrastre y permite editar cada parte después de
Separar; mantener además los recorridos de conjuntos manuales. C08-B165 mide márgenes reales
de los campos insertados y ubicación de acciones del curso a varios anchos.
BLF-ANATOMY-15 y BLF-BROWSER-08 comprueban símbolos individuales, contenido contextual de
interfaces táctiles y uso concreto de recorte y superposición. Evitar buscadores duplicados y
rótulos heredados de otro contexto. Revisar también las capturas: dimensiones válidas no bastan.

C08-B166–B169 verifican el selector de fuentes en notas: catálogo completo sin truncar resultados,
búsqueda y aplicación directa, favoritas persistentes sin cambiar la nota, peso remoto realmente
decodificado, tarjeta/copia/recarga y navegación por teclado entre familia y estrella. Medir el
anclaje y los límites a 320 px; distinguir fallos de catálogo y de archivo, recuperación y respuestas
tardías. Comprobar que ninguna petición incluya la clave o el contenido de la nota. C08-U56 valida
pesos y su historial; FONT-01 filtra las variantes oficiales sin exponer credenciales ni archivos.
C08-U72/U73 y C08-B187/B188 comprueban formato independiente por título y cuerpo: conservación
del aspecto heredado, cambio de destino mediante foco o teclado, pesos y cursivas distintos,
duplicación y portapapeles independientes, historial, recarga y geometría a 320 px. Un fallo o una
respuesta tardía de una fuente no debe alterar la otra parte ni restaurar un aviso obsoleto.
El reintento debe conservar el foco de teclado cuando termine la carga de la otra fuente.
C08-B189 comprueba el centrado de todas las muestras de color y la selección por teclado a
900 y 320 px, sin doble marco ni controles redundantes de título/cuerpo. Incluye formato de un
título vacío antes de escribir y conservación del destino al pasar desde el texto a sus controles.
El cambio de destino automático se recorre también mediante Enter y Tab en C08-B187/B188.
C08-U74/U75 y FONT-02 distinguen transporte local, proveedor, permisos, cuota, tiempos de espera,
JSON inválido y errores desconocidos; rechazan catálogos parciales y comprueban recuperación sin
filtrar secretos. C08-B190/B191 verifican el mensaje de causa y acción a 900/320 px, su asociación
accesible al selector, reintento con teclado sin duplicar solicitudes, conservación de búsqueda,
favoritas, nota y formato, y respuestas tardías al volver a escribir o cerrar el editor.

C08-U57–U61 y C08-B170–B173 verifican retículas por marco: cantidad, márgenes, huecos,
filas/columnas, errores atómicos y recuperación al encoger; copias independientes, historial y
persistencia. La representación debe seguir la geometría al mover, redimensionar y cambiar zoom
entre 1/3/17/38/60/100/431/600 %. El ajuste se prueba también con retícula invisible y ajuste
entre objetos desactivado; el atajo se reasigna y respeta conflictos personales anteriores.
Comprobar el panel a 320 px y texto al 200 %, sin desbordes ni atajos al escribir. La regresión
de alineación exige que una coincidencia distante no robe la referencia cercana, comprueba
el objetivo de la guía dibujada y encadena retención, Ctrl, cancelación, confirmación y Undo.
Estos casos acreditan este bloque; no sustituyen la evaluación completa de la expansión de composición.
La consulta de 50 marcos y 4.000 piezas debe conservar geometría e identidad sin recorrer todas
las piezas por cada miembro; se miden accesos para detectar la regresión independientemente del hardware.

C08-B198 reproduce el bloqueo tras cargar la tipografía de un párrafo guardado. Se comprueba
que el ancho elegido se conserve, que un grafema indivisible quepa, que el repintado se estabilice
y que el dock y el editor respondan después de dos recargas. C08-B199 retiene una transacción
real desde otra pestaña, comprueba el aviso de espera y la recuperación automática del mismo texto
al cerrar esa pestaña. C08-B200, exclusivo de Vite, abre la composición ilustrada, verifica las
imágenes decodificadas, la relación entre el camión y su leyenda, la edición y el aislamiento del
guardado. La captura del ejemplo sirve para revisar la lectura del conjunto con el usuario.
C08-B201 modifica el contenido, la familia y el peso de un texto ya guardado por menú y con
la herramienta Texto. Comprueba que retiene identidad y formato, y que un nombre largo sigue
siendo editable en una ventana estrecha sin duplicar la etiqueta detrás del campo.

C08-U78 y C08-B202 verifican pivote compartido, puertos girados, edición de flechas, teclado, cancelación, persistencia y una sola operación de historial. En una escena con 240 materiales el gesto deja intacto el DOM de un material ajeno y actualiza el cable antes de soltar. C08-B200 mide también la tinta real del «4» y de la «C» de la leyenda.

C08-U79 verifica que el giro de una composición conserva la distribución de sus piezas al cambiar de tamaño; C08-B203 gira el camión y la flecha en la escena y edita la curva incluso cuando su tirador coincide con la imagen.

C08-B204 mide la orientación de los caracteres y la separación entre el nombre y el texto al girar desde la edición de tipografía. C08-B205 mide la distancia entre la esquina y el puntero durante el cruce de 0° en ambos sentidos y atraviesa el centro. C08-B206 comprueba el arrastre y su persistencia cuando una fuente remota termina de cargar en pleno giro.
