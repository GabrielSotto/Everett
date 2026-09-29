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
- **Continuidad de chat y navegación.** Conservar conversación, borradores, participantes, referencias, identidad y posición al anclar, desacoplar, convertir a Room, abrir otra superficie y regresar. Arrastrar al chat no transfiere propiedad.
- **Geometría e interacción.** Comprobar anclajes de conexiones, conexiones inválidas, proporciones del gesto, paneo, zoom, selección, límites de arrastre y recuperación de controles. Inspeccionar solapamientos entre dock, chats, paneles y composers.
- **Estados y recuperación.** Cubrir carga, vacío, éxito, error, cancelación e interrupción donde existan. Comprobar entradas inválidas, fallos de almacenamiento y de recursos externos en los recorridos afectados, sin pérdida silenciosa de contenido.
- **Accesibilidad y adaptación.** Recorrer teclado, foco, nombres accesibles, contraste y tamaños de ventana pertinentes. Verificar contenido extenso, poco y mucho contenido, controles alcanzables y preferencias de movimiento cuando correspondan.
- **Secuencias y estabilidad.** Repetir acciones rápidas y encadenadas, cambiar de superficie durante estados transitorios y realizar sesiones prolongadas según el riesgo. Buscar duplicaciones, referencias huérfanas, eventos acumulados y deterioro de respuesta.
- **Coherencia entre superficies.** Contrastar las mismas tareas, materiales, conversaciones, propuestas y ejecuciones en sus distintas vistas. Los datos simulados del prototipo deben ser consistentes y reproducibles; identificar su condición de simulación.
- **Regresión de lo aprobado.** Incluir Universo, gravedad, minimapa, navegación, zoom semántico y regreso al origen, además de las funciones conservadas de todas las superficies. Registrar los fallos de base por separado para distinguirlos de los introducidos.

Definir criterios observables y límites apropiados para cada caso antes de considerarlo aprobado. No sustituir cobertura por una cantidad arbitraria de tests, capturas o tiempo de ejecución.

## Comprobar también el arnés

El arnés forma parte del sistema que se debe validar. Debe detectar y reportar correctamente:

- Un proceso que falla, no inicia, se interrumpe o excede su tiempo.
- Un archivo de resultados ausente, vacío, ilegible o perteneciente a otra ejecución o versión.
- Cero casos descubiertos cuando se esperaban casos, casos pendientes o bloqueados y omisiones que impiden cubrir el alcance.
- Una aserción intencionalmente incumplida y una discrepancia visual relevante.
- Un HTML, fuentes, arnés o informe ausente; un enlace inaccesible; un hash que no coincide con el artefacto probado.

Usar controles negativos para comprobar esos comportamientos. La ausencia de un registro no significa que una prueba esté ejecutándose, pendiente por completar o aprobada: es ausencia de evidencia y debe informarse como tal. Un fallo relevante debe impedir declarar superado el gate.

La evidencia debe permitir reproducir el caso. Un resultado anterior, un cambio interno, un mock o la aprobación de 0.7.5 no certifican una entrega nueva.

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
