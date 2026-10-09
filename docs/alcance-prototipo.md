# Everett — alcance del prototipo hasta 1.0

Alcance ratificado por el usuario el 28 de septiembre de 2026, a partir de [Desarrollar en Canvas](chatgpt-conversation://6ab710c9-398c-83e9-bbd8-f80ccc9e6f31). Se conserva el detalle del roadmap recuperado. Sus requisitos de arnés y entrega se trasladan íntegros a [Validación del prototipo](validacion-prototipo.md), que establece el piso obligatorio y su ampliación según riesgos.

Las referencias a Infinity Canvas, OpenCode y Notion se conservan como referencias del diseño acordado. La lectura de la conversación recuperó el texto, pero no sus adjuntos ni los documentos completos de esas referencias. No darlos por inspeccionados.

**0.7.5 está aprobada e integrada en `dev`.** La reconstrucción estableció fuentes modulares, tipado y arnés, y mejoró la presentación de las superficies y las órbitas. La navegación aprobada se conserva. El estado operativo está en [Tareas](../TAREAS.md); 0.8 continúa pendiente.

| Versión    | Alcance principal                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| **0.7.5**  | Reconstrucción modular, tipado, arnés, motion y propuestas para la vista del Mundo.                      |
| **0.8**    | Canvas, tomando los comportamientos aplicables de Infinity Canvas.                                       |
| **0.9**    | Code + Docs.                                                                                             |
| **0.10**   | Session + Agents.                                                                                        |
| **0.11**   | Board + Shipping Mode.                                                                                   |
| **0.12**   | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design). |
| **1.0 RC** | Integración completa, regresiones y pulido final.                                                        |
| **1.0**    | Prototipo aprobado.                                                                                      |

**Regla de avance:** implementación → pruebas → tu feedback → correcciones → aprobación. Si una etapa necesita correcciones, continúa como `0.8.1`, `0.8.2`, etc. No se pasa a la siguiente dejando pendientes los problemas de su alcance.

---

## 0.7.5 — reconstrucción y pulido

Aplicar [Reconstrucción de 0.7.5](iteraciones/0.7.5.md). Esta etapa conserva las funciones de la base y establece los límites técnicos necesarios para continuar hasta 1.0. El Universo actual es el piso de calidad visual; el resultado debe superarlo. La navegación espacial aprobada se conserva y se pule en su ejecución.

La etapa incorporó las representaciones circulares de las seis superficies, con foco, espaciado y alineación aprobados por el usuario. Mantienen su distribución sin jerarquía visual central. El nombre `Vista atómica` continúa pendiente de revisión.

---

## 0.8 — Canvas

### Materiales y edición

- Representaciones reconocibles de notas, documentos, PDF, imágenes, videos, enlaces y referencias a otras superficies.
- Previews, portadas y metadatos cuando estén disponibles.
- Edición directa de notas y nombres. Renombrar mediante clic sobre el nombre visible; en documentos
  referenciados, actualizar el mismo título compartido con Docs, conservando identidad y contenido.
  En imágenes y videos importados, cambiar su nombre dentro de Everett conserva el archivo original.
- Selección discreta y controles pertinentes al tipo. Asignar a una zona y quitar del Canvas
  corresponden al menú contextual, separado de los controles visibles al seleccionar.
- Redimensionar imágenes y videos conservando la relación de aspecto y el contenido completo.
- Conservar identidad y contenido al abrir, referenciar o asignar materiales.
- Mantener zoom hacia objetos y regreso al contexto espacial de origen.
- Conservar el zoom acoplado de Everett para entrar y salir de materiales y superficies donde
  corresponda, con Alt como embrague cuando la rueda tiene una acción propia de la superficie.
  No incorporar un botón de entrar o abrir en la barra de cada material. Aplicar
  las decisiones de representación y controles de [Canvas 0.8](iteraciones/0.8.md).

### Zonas de agente

- Inspector con agente, instrucción, contexto, actividad y acciones.
- Distinguir asignación contextual con acciones rápidas y transferencia mediante arrastre.
- Mantener exclusividad de uso y estados de procesamiento y revisión.
- Conservar y devolver materiales al cancelar, rechazar, retirar al agente o eliminar la zona.
- Mantener las zonas fijas después de crearlas, según la decisión vigente.
- Propuestas coherentes con el material recibido y la acción solicitada.

Aplicar los estados de densidad de la [referencia recuperada de Infinity Canvas](referencias/0.8/infinity-canvas/32-zone-material-density-states.png).

| Materiales | Representación                                         |
| ---------- | ------------------------------------------------------ |
| **1–6**    | Materiales individuales con previews ricos.            |
| **7–15**   | Grupos compactos por tipo, con contadores.             |
| **16+**    | Resumen agregado con cantidad total y tipos presentes. |

Los previews tendrán tamaño máximo. Uno o dos materiales no deben estirarse para llenar la zona. Las agrupaciones permitirán consultar sus elementos.

### Herramientas y conexiones

- Consolidar selección, paneo, notas, dibujo, formas y zonas en un dock compacto. Probar comentarios
  en el mismo dock y revisar su ubicación si la cantidad de accesos lo vuelve excesivo.
- Atajos de Canvas configurables, con N para crear notas, C para comentar y L para conectar como
  valores predeterminados. Renombrar queda sin atajo predeterminado y se accede mediante clic sobre
  el nombre; el usuario puede asignarle un atajo. Conservar la configuración local, permitir restaurar
  los valores iniciales y resolver colisiones entre acciones del mismo contexto. Los controles y la ayuda
  muestran las asignaciones vigentes, según [Canvas 0.8](iteraciones/0.8.md).
- Herramientas de dibujo y formas con controles contextuales, partiendo de las referencias 30 y 31
  según [Canvas 0.8](iteraciones/0.8.md). Aplicar color y grosor al dibujo, y relleno y borde a las
  formas; no extender esos controles de estilo a todos los materiales.
- Respetar dimensiones y proporciones del gesto.
- Mantener selección sin padding ni halos que engorden los objetos.
- Cuatro anclajes por material, arriba, abajo, izquierda y derecha; conectar los extremos que elija
  el usuario. Activar conexiones con L. La 0.8 utiliza conectores curvos con recorrido manipulable,
  incluidos desvíos y vueltas alrededor de materiales. Reajustar los extremos a sus anclajes sin
  descartar el recorrido elegido; otros tipos de conector quedan fuera de esta definición.
- Al hacer hover sobre una conexión, engrosar su trazo y ofrecer una zona de interacción más amplia
  que la línea visible. Un clic permite escribir o editar texto asociado a la conexión.
- Selección y eliminación explícita de conexiones.
- Rechazar conexiones hacia zonas de agente.
- Undo/Redo desde los atajos reales, diferenciando texto y operaciones del Canvas.

### Quick Chat, chat anclado e historial

- Quick Chat compacto y arrastrable.
- Incorporación de participantes desde el chat anclado, no desde Quick Chat.
- Retirar Room como modo de Canvas. Conservar la identidad transversal de cada conversación.
- Historial local real de varias conversaciones, accesible mediante un desplegable desde el título.
- Aplicar las decisiones confirmadas y resolver las definiciones abiertas de [Canvas 0.8](iteraciones/0.8.md).
- Anclaje y desacoplamiento mediante desplazamiento visible y rápido.
- Reacomodar el dock para que no quede detrás del chat anclado.
- Conservar conversación, borradores, participantes y referencias entre estados.
- Arrastrar materiales al chat para referenciarlos, sin transferir su propiedad.
- Mantener dictado y participación de agentes por invocación en conversaciones multiusuario.

### Comentarios y propuestas

- Comentarios asociados al material completo, con marcador y consulta contextual. Los comentarios
  anclados a puntos concretos de imágenes quedan para evaluar después de 1.0.
- Listado, respuestas y resolución desde el chat anclado.
- Comentarios con el atajo C. Probar su herramienta en el dock principal y confirmar su ubicación
  tras evaluar la densidad del conjunto; no duplicar el botón de crear comentario en la barra de
  cada material. Conservar los marcadores y la consulta contextual.
- Propuestas legibles y diferenciadas del contenido aceptado.
- Aceptar, rechazar y pedir cambios mediante una barra compacta de acciones agrupadas. Al pulsar
  `Pedir cambios`, el mismo contenedor se expande hacia abajo y muestra el campo de texto libre
  con cuatro sugerencias rápidas, `Enviar` y `Cancelar`, según C08-PROP-01 de [Canvas 0.8](iteraciones/0.8.md).
  Ordenar la barra como `Aceptar`, `Pedir cambios`, `Rechazar`. El campo no admite redimensionado
  manual ni muestra un tirador; `Cancelar` y `Enviar` comparten dimensiones y alineación,
  conservando su jerarquía secundaria y principal.
  El campo permanece oculto en reposo; las tres acciones producen resultados coherentes.
- Cancelar un pedido de cambios conserva la propuesta pendiente.
- Ninguna propuesta modifica el contenido compartido antes de aceptarse.

**Cierre de 0.8:** completar el recorrido material → zona → agente → propuesta → revisión, y trabajar con chat, referencias y comentarios sin perder contenido, contexto ni controles.

---

## 0.9 — Code + Docs

### Code

- Reorganizar **crear archivo, guardar y buscar dentro del archivo** en un acceso contextual discreto.
- Evitar controles que queden flotando o cambien arbitrariamente de posición al colapsar el explorador.
- Integrar la búsqueda interna sin competir visualmente con la búsqueda global.
- Comparación **Actual / Propuesta** con cambios reales y resaltado de diferencias.
- Apertura lateral consistente con las demás herramientas auxiliares.
- Desplazamiento coordinado, sin scrollbars redundantes.
- Geometría consistente entre editor, comparación y Terminal.
- Revisar Browser, Files, Images y Preview dentro del espacio auxiliar.
- Eliminar controles redundantes, incluida la lupa aislada junto al buscador de Browser.

### Docs

- Colocar el control de cierre del panel izquierdo dentro del panel.
- Mantener acceso visible para recuperarlo cuando esté cerrado.
- Reordenar creación de documentos y hojas.
- Conservar composer centrado respecto de la hoja.
- Mantener transiciones consistentes en cada cambio de documento.
- Preservar contenido, saltos de línea y posición de trabajo al cambiar de documento o colapsar paneles.

### Compartido

- FAB lateral y composer centrado en el área útil.
- Expansión desde el FAB y contracción hacia él.
- Conservación de borradores y cambios.
- Navegación desde referencias de Canvas y regreso al contexto de origen.

**Cierre de 0.9:** crear, editar, guardar, buscar y revisar contenido sin pérdida de cambios, paneles superpuestos ni comparaciones ambiguas.

---

## 0.10 — Session + Agents

### Session

- Conservar el estado inicial limpio: pregunta y composer.
- Mantener el slot auxiliar con apertura contextual y manual.
- Contexto resumido en un indicador compacto.
- **256k como capacidad de ejemplo del prototipo.**
- Clic en el indicador → desglose detallado con scroll.
- Mostrar instrucciones, skills, memoria, materiales, mensajes y resultados de herramientas.
- Detalle por llamada: modelo, entrada, salida, herramientas, duración, tokens, caché, errores, reintentos y recuperación.
- Distinguir contexto actualmente ocupado de consumo acumulado.
- Hacer reconciliables las cifras del resumen y del detalle.

El desglose que señalaste en **OpenCode** queda como referencia para esta etapa.

### Agents

- Relacionar actividad, tareas, herramientas, duración, consumo, errores y resultados.
- Utilizar las mismas ejecuciones que aparecen en las conversaciones.
- Permitir pasar de una métrica o gráfico a los registros que la explican.
- Mantener variedad de estados: trabajando, disponibles, con historial, con errores y con resultados pendientes.
- Conservar conversación directa, capacidades y memoria.
- Evitar métricas y gráficos desconectados de los registros.

### Compartido

- Revisar dictado, borradores y estados de los composers.
- Mantener acciones del agente sobre el mundo sin obligar a navegar a otra superficie.
- Verificar coherencia de Shipping, tareas y referencias.
- Mantener datos de ejecución consistentes y reproducibles dentro del prototipo.

**Cierre de 0.10:** poder identificar qué hizo un agente, qué información utilizó, qué recursos consumió, qué falló y cómo terminó cada ejecución.

---

## 0.11 — Board + Shipping Mode

### Board

Tomar como referencia de estructura y estética el tablero de Codroid aportado por el usuario
el 9 de octubre de 2026: interfaz en `C:/Proyectos/codroid/tools/board/web` y guía en
`C:/Proyectos/codroid/docs/TABLERO.md`. Se inspeccionaron su Kanban y el detalle de un ticket;
la [captura local](referencias/0.11/board-codroid.jpg) conserva la referencia visual.
Adaptar esta dirección a Everett combinándola con las vistas y capacidades de propiedades
previstas a continuación. El diseño concreto de Board se define en 0.11.
Comprobar la coherencia visual de su tarjeta referenciada en Canvas, elegida para 0.8 en
[C08-MAT-07](iteraciones/0.8.md).

- Revisar Kanban, tabla y calendario sobre las mismas tareas.
- Adoptar los patrones de propiedades y vistas de **Notion** que acordamos usar como referencia.
- Buscar, añadir, editar, quitar y organizar propiedades.
- Mantener estado, prioridad, responsable, creador, fechas, origen y propiedades personalizadas.
- Resolver consistentemente clic para abrir/editar y arrastre para mover.
- Permitir paneo sin interferir con el movimiento de tarjetas.
- Corregir contadores pegados al borde y contenido fuera de pantalla.
- Reubicar propiedades y creación de tareas hacia el lateral.
- Despejar el centro y ordenar su convivencia con Shipping Mode.

### Shipping Mode

- Conservar el toggle discreto en Board y el estado global del mundo.
- Mejorar la presentación de bloqueantes, trabajo necesario, revisión y tareas listas.
- Hacer claras las cantidades y su relación con las tareas.
- Mantener accesible el trabajo posterior.
- Conservar activación y desactivación mediante agente sobre el mismo estado compartido.
- Reflejar el estado en las demás superficies sin añadir contenido innecesario.
- Verificar consultas sobre bloqueantes y trabajo pendiente para lanzar.

**Cierre de 0.11:** organizar el mismo trabajo desde distintas vistas y utilizar Shipping sin discrepancias entre tareas, propiedades, cantidades y estado global.

---

## 0.12 — vista de superficies del Mundo, barra global, perfil y sistema de diseño

### Vista de superficies del Mundo

Esta vista muestra las seis superficies de un único Mundo (proyecto). El Universo es la vista que reúne todos los Mundos; ambas escalas conservan la navegación aprobada.

El nombre y la representación se trabajan inicialmente en la reconstrucción de 0.7.5. En 0.12 se verifica su integración con las superficies terminadas y se resuelven los ajustes que el usuario apruebe.

- Acordar el nombre que reemplazará a `Vista atómica`.
- Definir y aprobar una referencia visual para representar las seis superficies.
- Sustituir las tarjetas actuales por una representación cohesiva con Everett.
- Mantener identificación, foco y destino inequívocos.
- Conservar la navegación aprobada.
- Mantener miniaturas y conexiones visualmente comprensibles.

### Barra global

- Evaluar el acceso secundario a superficies con el resto de la experiencia ya pulida.
- Mantenerlo discreto mientras aporte utilidad.
- Revisar ubicación, búsqueda, filtros, estado e iconografía.
- Eliminar duplicaciones y trasladar acciones secundarias a su contexto correspondiente.
- Mantener cantidades de mundos coherentes y contextualizadas.

### Perfil y configuración

- Definir y aprobar las opciones concretas que entran en 1.0.
- Separar identidad, preferencias y diagnóstico.
- Rediseñar presentación y navegación.
- Mantener comportamiento adecuado ante campos extensos.
- Evitar que el perfil esté dominado por herramientas técnicas.

### Sistema de diseño — Atomic Design

- Consolidar un sistema de diseño común de Everett mediante Atomic Design, aplicable a todas las superficies y a la interfaz compartida.
- Centralizar tipografía, colores por función, tamaños, espaciados, radios, bordes, sombras y movimiento mediante tokens de diseño.
- Componer las interfaces con piezas básicas, combinaciones y conjuntos reutilizables; definir sus variantes según su función y contexto.
- Consolidar los controles y representaciones existentes en ese sistema, preservando las funciones, la navegación y la dirección visual aprobadas.
- Mantener un catálogo visual de componentes, variantes y estados para revisar la coherencia del conjunto.
- Comprobar estados de interacción, teclado, foco, contraste, contenido extenso y adaptación al espacio disponible.
- Verificar el efecto de los cambios compartidos de tipografía, colores y tamaños en todas las superficies y completar su regresión.

La consolidación transversal corresponde a 0.12. Las iteraciones anteriores construyen las piezas que necesita cada área siguiendo los estilos y componentes compartidos vigentes.

**Definiciones necesarias:** nombre y representación elegidos durante 0.7.5; opciones adicionales del perfil y catálogo de componentes y variantes a acordar en 0.12.

**Cierre de 0.12:** orientación, navegación global, perfil y configuración coherentes con las superficies ya aprobadas; sistema de diseño compartido aplicado y verificado en Everett.

---

## 1.0 RC — integración y pulido final

### Recorridos completos

- Universo → mundo → superficies → objetos → regreso.
- Canvas → documento, archivo o tarea → edición → regreso.
- Material → agente → procesamiento → propuesta → aceptación, rechazo o cambios.
- Session → acción del sistema → resultado reflejado en otra superficie.
- Board → Shipping → consulta al agente → actualización de tareas.
- Combinaciones de paneles, chats, composers, búsquedas y herramientas.
- Cambios rápidos, acciones repetidas y sesiones prolongadas.

### Revisión transversal

- Motion, iconografía, contraste y espaciado.
- Foco, selección, atajos y conservación de borradores.
- Límites de arrastre y recuperación de controles.
- Comportamiento con poco y mucho contenido.
- Coherencia de datos entre superficies.
- Errores, recuperación, trazas y diagnóstico.
- Rendimiento y estabilidad durante los recorridos acordados.

Los problemas encontrados se corrigen en candidatas sucesivas hasta cerrar la evaluación.

**Observación pendiente de diseño para el cierre previo a 1.0:** revisar el inicio de un Mundo y sus superficies, incluido el momento de asignar nombres. El usuario señaló que falta un paso previo y difirió su definición; la navegación aprobada de 0.7.5 se conserva.

---

## Arnés y entrega: requisitos de todas las etapas

Aplicar [Validación del prototipo](validacion-prototipo.md). Sus exigencias son el **piso, nunca el techo**. La aprobación técnica requiere evidencia del artefacto actual; la aprobación de producto corresponde al usuario.

## 1.0 — aprobación del prototipo

La 1.0 se publica cuando los recorridos acordados funcionan, las superficies representan suficientemente la visión, no quedan correcciones críticas pendientes dentro del alcance y **vos aprobás la prueba libre de la candidata**.

Backend, inferencia, colaboración, autenticación e integraciones reales quedan para el desarrollo del producto.

## Después de 1.0

Ideas conservadas para evaluar, sin una versión de implementación comprometida.

- **Canvas: comentarios anclados a un punto de una imagen.** Permitir señalar el detalle al que se
  refiere un comentario mediante un marcador en el lugar del clic, manteniendo la imagen entera.
  Como posible mecanismo para Everett, guardar la posición relativa dentro de la imagen para
  conservar el anclaje al moverla o redimensionarla. Revisar la legibilidad y cuánto contenido tapa
  el marcador. El usuario decidió posponer esta exploración; los comentarios de 0.8 se asocian al
  material completo.
  Referencias verificadas el 3 de octubre de 2026:
  [Figma permite fijar comentarios en ubicaciones del lienzo y adjuntarlos a marcos de nivel superior](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files);
  [Frame.io permite anclar comentarios a un punto del visor](https://help.frame.io/en/articles/9105251-commenting-on-your-media).
  Estas fuentes describen sus comportamientos, no confirman el mecanismo interno propuesto para Everett.

**Próximo paso del roadmap: desarrollar 0.8 y cerrar Canvas antes de pasar a 0.9.**
