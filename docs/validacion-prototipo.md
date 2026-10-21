# Everett — validación del prototipo

## Autoridad y criterio de calidad

El usuario ratificó el 28 de septiembre de 2026 que el alcance y las exigencias de [Desarrollar en Canvas](chatgpt-conversation://6ab710c9-398c-83e9-bbd8-f80ccc9e6f31) constituyen el **piso de calidad, nunca el techo**.

Las comprobaciones de este documento son obligatorias y se amplían cuando los riesgos, los fallos encontrados o la interacción entre funciones lo requieren. Cumplir una lista o acumular pruebas no basta si queda sin demostrar la intención del usuario, un contrato observable o un recorrido del alcance. Un riesgo detectado exige una comprobación pertinente y su resultado, o identificar explícitamente el bloqueo; no se omite para cerrar una versión.

El [alcance del prototipo](alcance-prototipo.md) define las etapas, sus límites y las aprobaciones. Esta exigencia no incorpora backend, inferencia, colaboración, autenticación ni integraciones reales al prototipo.

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

En cada cambio de comportamiento, ampliar o ajustar el arnés junto con la implementación: funciones, superficies, interacciones, gestos, motion y sus combinaciones requieren comprobaciones observables y contraejemplos pertinentes. Cada fallo encontrado durante pruebas o feedback debe quedar cubierto por una regresión reproducible. Conservar las pruebas de comportamientos aprobados y ejecutar las regresiones afectadas; completar la regresión de la etapa antes de integrarla. Los cambios exclusivamente documentales mantienen su verificación específica.

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

C08-U23 comprueba orden estable de materiales, pasos y extremos, rechazos atómicos y Undo/Redo sin modificar contenido ni vínculos. C08-B74 usa las cuatro acciones del menú contextual sobre un PDF real superpuesto al código; exige que el hit-testing, el orden de datos, el historial y la recarga concuerden.

C08-B71 exige un clic para seleccionar y doble clic para editar, tanto sobre un cable sin etiqueta como sobre su texto existente, sin menú contextual ni botones. Comprueba foco, selección con Space sin abrir el editor, anclajes visibles, Enter/Esc, etiqueta vacía y Backspace dentro del campo antes de eliminar con Backspace/Delete fuera de él. B06/B22/B31/B36/B56/B65 conservan los resultados de cables y actualizan su acceso a la interacción aprobada; B31 exige reconexión por arrastre y teclado, cancelación, historial y recuperación.

C08-B72 complementa la tinta del borde de B68: cuatro formas, grosores 1/8 y zoom 1/10/32/40/100/200/600 %, 56 condiciones. Muestrea el perímetro con su grosor visible, el marco exterior y los cuatro tiradores de siete píxeles. Desde 10 %, contrasta los píxeles de los cuatro lados contra el mismo marco transparente; ofrece varios puntos por lado porque el dock puede cubrir su centro al acercar, con tolerancia de raster proporcional a la ampliación. Mantiene el umbral de diferencia y exige todos los lados, además de preservar los datos de la figura.

C08-B73 abre Quick Chat lejos del dock y exige la misma posición, orientación y densidad; luego lo acerca hasta dejar cuatro píxeles libres y exige que tampoco lo mueva. Después lo arrastra contra él cuatro veces y comprueba separación, herramientas y borrador. Más herramientas debe conservar Quick Chat abierto incluso a 300 px. B19 exige todas las herramientas desde el desborde cuando solo caben tirador y menú junto al chat anclado. C08-B76 cubre orientación Horizontal/Vertical, recarga, ventana estrecha y regreso de Configuración alineado. C08-B75 exige contador explícito, aviso de reincorporación dentro del conjunto sin sustituir el nombre y etiqueta centrada legible en una zona grande. El encabezado y el contador deben quedar separados de las identificaciones visibles de materiales; un contraejemplo reduce su margen y debe detectar el solapamiento. B50 espera el render de resize antes de escoger entre el botón de herramienta y su entrada visible en Más herramientas, conservando las mediciones de cercanía, dimensiones y gestos.

UI-HARNESS-04 comprueba la sonda de controles con trazos SVG horizontales y verticales de área geométrica cero: el mouse real debe registrarlos como visibles y confiables. Clic programático, SVG oculto y geometría vacía se rechazan. La extensión conserva las comprobaciones previas de controles HTML; no confunde un path interactivo con un elemento invisible por tener ancho o alto cero.
