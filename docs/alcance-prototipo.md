# Everett — alcance del prototipo hasta 1.0

Alcance ratificado por el usuario el 28 de septiembre de 2026, a partir de [Desarrollar en Canvas](chatgpt-conversation://6ab710c9-398c-83e9-bbd8-f80ccc9e6f31). Se conserva el detalle del roadmap recuperado. Sus requisitos de arnés y entrega se trasladan íntegros a [Validación del prototipo](validacion-prototipo.md), que establece el piso obligatorio y su ampliación según riesgos.

Las referencias a Infinity Canvas, OpenCode y Notion se conservan como referencias del diseño acordado. La lectura de la conversación recuperó el texto, pero no sus adjuntos ni los documentos completos de esas referencias. No darlos por inspeccionados.

**0.7.5 está aprobada e integrada en `dev`.** La reconstrucción estableció fuentes modulares, tipado, arnés y presentación espacial. La navegación aprobada se conserva. 0.8 sigue en desarrollo: la revisión de 0.8.13 confirmó capas y marcos de formas y autorizó corregir la densidad del dock, el comportamiento de rueda en zonas, los anclajes de etiquetas durante zoom y la ubicación de los ajustes dentro de Preferencias. La candidata 0.8.15 incorpora previews reales de enlaces mediante el servicio local autorizado y completó el gate y la revisión visual; la aprobación del usuario sigue pendiente. El estado de pruebas, evidencia y aprobaciones está en [Tareas](../TAREAS.md).

| Versión     | Alcance principal                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **0.7.5**   | Reconstrucción modular, tipado, arnés, motion y propuestas para la vista del Mundo.                      |
| **0.8**     | Canvas, tomando los comportamientos aplicables de Infinity Canvas.                                       |
| **0.9**     | Code + Docs.                                                                                             |
| **0.10**    | Session y registros de actividad de agentes compartidos con Board.                                       |
| **0.11**    | Board fusionado con Agents, asignación y traspaso de tareas, y Shipping Mode.                            |
| **0.12**    | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design). |
| **Preview** | Versión pública de feedback previo a 1.0; el contenido funcional concreto está pendiente de definir.     |
| **1.0 RC**  | Integración completa, regresiones y pulido final.                                                        |
| **1.0**     | Prototipo aprobado.                                                                                      |

**Preview** es un hito de lanzamiento de producto (decisión del 9 de noviembre de 2026, documentada el 10). Se publica antes de 1.0 para obtener feedback rápido mientras continúa la iteración hacia 1.0. No sustituye el recorrido de prototipo `0.8` → … → `0.12` → `1.0 RC` → `1.0`; se inserta como release pública anterior a esas candidatas finales. El alcance funcional de Preview permanece TBD hasta su definición. No confundir con los previews de enlaces o medios de Canvas 0.8. Las superficies de destino siguen siendo cinco: Code, Canvas, Docs, Board y Sessions (Agents se fusiona en Board).

**Regla de avance:** implementación → pruebas → tu feedback → correcciones → aprobación. Si una etapa necesita correcciones, continúa como `0.8.1`, `0.8.2`, etc. No se pasa a la siguiente dejando pendientes los problemas de su alcance.

---

## 0.7.5 — reconstrucción y pulido

Aplicar [Reconstrucción de 0.7.5](iteraciones/0.7.5.md). Esta etapa conserva las funciones de la base y establece los límites técnicos necesarios para continuar hasta 1.0. El Universo actual es el piso de calidad visual; el resultado debe superarlo. La navegación espacial aprobada se conserva y se pule en su ejecución.

La etapa incorporó las representaciones circulares de las seis superficies, con foco, espaciado y alineación aprobados por el usuario. Mantienen su distribución sin jerarquía visual central. El nombre `Vista atómica` continúa pendiente de revisión.

---

## 0.8 — Canvas

### Organización visual y espacial

La utilidad central de Canvas es reunir y organizar visual y espacialmente materiales de las
distintas superficies: documentación, decisiones, tareas, código, diseño y referencias, con
varias capas de detalle. Debe permitir relacionar una tarea con el código pertinente y sus
referencias, comprender el conjunto y diagramar cómo funciona. Al entrar al contenido de origen
y regresar, conserva el contexto de trabajo y la identidad compartida de los elementos.

Evaluar un recorrido completo: reunir materiales del proyecto, representar sus componentes y
relaciones de forma legible, vincular decisiones con documentación y tareas, y retomar el trabajo
después de navegar o recargar. Usar ese recorrido para identificar fricciones y capacidades
ausentes antes de decidir nuevas herramientas. La organización debe ser útil sin agentes;
el procesamiento agéntico real amplía ese trabajo y sigue pendiente de definir. Everett puede
servir como ejemplo de proyecto complejo para la evaluación; no limita la utilidad a ese caso.

Este criterio guía la evaluación de utilidad de 0.8. El usuario autorizó implementar conjuntos manuales duraderos, referencias a fragmentos de Docs/Code y lectura del panorama; sus contratos están en C08-ORG-01 y C08-REF-01 de la definición detallada. La revisión de 0.8.17 autoriza la consulta conjunta de imágenes seleccionadas en el visor existente. La ampliación posterior a 0.8.18 incorpora alineación, distribución y accesos a acciones y ajustes de Canvas en la barra superior. La revisión de 0.8.21 los separa por ámbito: Bosquejos para crear piezas, Alinear para operar sobre la selección y Vista para encuadre y visualización. También requiere resolver bosquejos de interfaz de baja fidelidad como próximo bloque de Canvas, concretando sus piezas y dirección visual antes de implementarlas. Sustituye la postergación anterior de los wireframes. El editor integral conserva su planificación en 0.9.

### Materiales y edición

El usuario autorizó para 0.8.15 un servicio local mínimo para obtener y conservar previews reales de enlaces. La ampliación aprobada permite incorporar imágenes y videos por URL, reproducir proveedores compatibles y leer contenido web guardado dentro de Everett al entrar con zoom. Reutilizar bibliotecas existentes; conservar origen, datos locales y actualización explícita. El servicio no incorpora inferencia ni procesamiento real de agentes. Las dependencias y condiciones de ejecución se documentan en Desarrollo; C08-URL-01 define las previews de base.

- Representaciones reconocibles de notas, documentos, PDF, imágenes, videos, enlaces y referencias a otras superficies.
- Previews, portadas y metadatos cuando estén disponibles.
- Edición directa de notas y nombres. Renombrar mediante clic sobre el nombre visible; en documentos
  referenciados, actualizar el mismo título compartido con Docs, conservando identidad y contenido.
  También ofrecer Renombrar desde el menú contextual del material, con su atajo cuando el usuario
  lo haya asignado. En imágenes y videos importados, cambiar su nombre dentro de Everett conserva
  el archivo original.
- Selección discreta y controles pertinentes al tipo. Asignar a una zona y quitar del Canvas
  corresponden al menú contextual del material, separado de los controles visibles al seleccionar.
  Quitar una referencia a Docs o Board conserva el documento o la tarea original en su superficie.
- Duplicar crea una copia independiente que vive y se guarda en Canvas, incluidos documentos,
  tareas y código. Modificarla o eliminarla no altera el original ni crea elementos automáticamente
  en otras superficies. Incorporarla a Docs, Board o Code requiere una acción explícita y crea un
  elemento nuevo. Admitir duplicación individual y múltiple y copiar/pegar selecciones completas;
  conservar independencia, disposición relativa, persistencia e historial, según C08-MAT-08 de
  [Canvas 0.8](iteraciones/0.8.md). La aclaración confirmada sustituye el duplicado automático en
  Docs y la exclusión anterior de tareas de Board. Tras la incorporación explícita, la pieza pasa
  a representar el nuevo elemento de esa superficie; el original permanece independiente.
- Eliminar materiales propios y quitar referencias admiten Deshacer y conservan sus originales
  y los archivos externos, según C08-MAT-08 de [Canvas 0.8](iteraciones/0.8.md).
- Redimensionar imágenes y videos conservando la relación de aspecto y el contenido completo.
- Conservar identidad y contenido al abrir, referenciar o asignar materiales.
- Mantener zoom hacia objetos y regreso al contexto espacial de origen.
- Conservar el zoom acoplado de Everett para entrar y salir de materiales y superficies donde
  corresponda, con Alt como embrague cuando la rueda tiene una acción propia de la superficie.
  No incorporar un botón de entrar o abrir en la barra de cada material. Aplicar
  las decisiones de representación y controles de [Canvas 0.8](iteraciones/0.8.md).

### Zonas de agente

- Seleccionar una zona abre su inspector con agente, instrucción, contexto, actividad y acciones.
  Gestionar la zona desde el inspector; el menú contextual corresponde a los materiales,
  según la distribución confirmada en [Canvas 0.8](iteraciones/0.8.md).
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
  el nombre; el usuario puede asignarle un atajo. Acceder desde Perfil → Configuración → Atajos,
  sección Canvas, con una lista de acciones y combinaciones editables; Renombrar aparece con la
  combinación vacía. Guardar automáticamente la configuración local, permitir restaurar un atajo
  o todos los valores iniciales y resolver colisiones entre acciones del mismo contexto. Los controles
  y la ayuda muestran las asignaciones vigentes, según [Canvas 0.8](iteraciones/0.8.md).
- Herramientas de dibujo y formas con controles contextuales, partiendo de las referencias 30 y 31
  según [Canvas 0.8](iteraciones/0.8.md). Aplicar color y grosor al dibujo, y relleno y borde a las
  formas; no extender esos controles de estilo a todos los materiales.
- Respetar dimensiones y proporciones del gesto.
- Mantener selección sin padding ni halos que engorden los objetos.
- Cuatro anclajes por material, arriba, abajo, izquierda y derecha; conectar los extremos que elija
  el usuario. Activar conexiones con L. La 0.8 utiliza curvas suaves con sensación de cable y
  recorrido calculado automáticamente. Reajustar la curva al mover o redimensionar materiales,
  conservando los anclajes elegidos. La modificación manual del recorrido y las vueltas alrededor
  de materiales fueron descartadas por el usuario.
- Al hacer hover sobre una conexión, engrosar su trazo y ofrecer una zona de interacción más amplia
  que la línea visible. Un clic selecciona la conexión y doble clic edita su etiqueta. Enter confirma,
  Esc cancela y Delete/Backspace fuera del texto elimina la conexión seleccionada. El texto
  aparece integrado en el cable, interrumpiendo el trazo bajo las palabras; conserva esa ubicación
  al mover los materiales o cambiar el zoom, según C08-LINK-02 de [Canvas 0.8](iteraciones/0.8.md).
- Selección y eliminación explícita de conexiones.
- Rechazar conexiones hacia zonas de agente.
- Undo/Redo desde los atajos reales, diferenciando texto y operaciones del Canvas.

### Quick Chat, chat anclado e historial

- Quick Chat compacto y arrastrable.
- Incorporación de participantes desde el chat anclado, no desde Quick Chat.
- Retirar Room como modo de Canvas. Conservar la identidad transversal de cada conversación.
- Retomar la misma conversación al cambiar entre Canvas y Sessions mediante la navegación
  existente, con sus mensajes, participantes, referencias y borrador. Aplicar esta continuidad
  en 0.8, según C08-CHAT-11 de [Canvas 0.8](iteraciones/0.8.md).
- Historial local real con un listado común de conversaciones del Mundo, accesible desde el chat
  de Canvas mediante un chevron junto al nombre. Los mensajes de la conversación elegida se
  comparten entre Quick Chat, chat anclado y Sessions, según C08-CHAT-09 y C08-CHAT-11 de
  [Canvas 0.8](iteraciones/0.8.md).
- Aplicar y comprobar las decisiones confirmadas de [Canvas 0.8](iteraciones/0.8.md).
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
- Con un material seleccionado, C o el botón del dock abre el campo para comentarlo. Sin selección,
  activar la herramienta y elegir el material mediante clic. Esc cancela la herramienta o cierra
  el campo conservando su borrador, según C08-COM-03 de [Canvas 0.8](iteraciones/0.8.md).
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

### Guardado y recuperación

- Guardado automático local del Canvas y de las conversaciones, incluyendo sus borradores y los
  materiales y archivos necesarios para recuperar referencias con la misma identidad y contenido.
- Recuperar por usuario cámara, zoom, selección válida y estado del chat. Reiniciar gestos
  transitorios y conservar las propuestas pendientes y los pedidos de cambios sin enviar.
- Recuperar el estado actual del trabajo del agente; cerrar el chat o recargar no implica cancelarlo
  ni marcarlo como interrumpido. La ejecución simulada puede representar continuidad durante la
  ausencia. Ante una interrupción confirmada, ofrecer Reintentar y Cancelar, evitando duplicar
  efectos y devolviendo materiales al cancelar, según C08-STATE-02 de [Canvas 0.8](iteraciones/0.8.md).
- Comunicar fallos de guardado o recuperación sin sobrescribir los datos ni reiniciar silenciosamente
  el Canvas o el historial. El mecanismo técnico se concreta durante la implementación.

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

#### Ampliación por planificar: editor integral

Dirección confirmada para la planificación de 0.9: ampliar Docs hacia una experiencia integrada
de edición de documentos, hojas de cálculo y PDF. Definir las capacidades útiles de cada formato,
la compatibilidad de importación y exportación y las etapas de implementación. En PDF, distinguir
anotaciones, formularios y operaciones sobre páginas de la modificación del contenido original.

Evaluar herramientas open source antes de elegir una solución: capacidades realmente abiertas,
licencias, mantenimiento, peso e integración con la arquitectura de Everett. La evaluación debe
contemplar persistencia local, conservación del contenido e identidad compartida con Canvas.
Las herramientas y el alcance funcional concreto quedan pendientes de esa planificación.

Este registro no inicia 0.9 ni amplía la implementación de 0.8. Canvas sigue siendo la iteración
activa hasta su revisión, corrección y cierre aprobados por el usuario.

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

Conservar las capacidades siguientes como parte de la fusión confirmada con Board. En 0.10 se
trabajan sus registros y continuidad con Sessions; en 0.11 se concreta la experiencia unificada
de gestión de agentes y tareas. Esta distribución conserva el orden de las iteraciones.

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

**Dirección confirmada:** fusionar Board y Agents en una misma superficie, conservando la gestión,
conversación directa, capacidades, memoria y actividad de los agentes previstas en 0.10. Las tareas,
asignaciones y ejecuciones deben compartir identidad y estado con Sessions y las demás superficies.
La disposición y navegación concretas se definen al planificar la experiencia unificada.

Tomar como referencia de estructura y estética el tablero de Codroid aportado por el usuario
el 9 de octubre de 2026: interfaz en `C:/Proyectos/codroid/tools/board/web` y guía en
`C:/Proyectos/codroid/docs/TABLERO.md`. Se inspeccionaron su Kanban y el detalle de un ticket;
la [captura local](referencias/0.11/board-codroid.jpg) conserva la referencia visual.
El usuario desarrolló ese tablero como prototipo para organizar el trabajo de Codroid y evaluar
interfaz, funciones y problemas que ayuden a mejorar Board en Everett.
Adaptar esta dirección a Everett combinándola con las vistas y capacidades de propiedades
previstas a continuación. El diseño concreto de Board se define en 0.11.
Comprobar la coherencia visual de su tarjeta referenciada en Canvas, elegida para 0.8 en
[C08-MAT-07](iteraciones/0.8.md).

Referencia complementaria aportada el 12 de octubre de 2026:
[Gr8r Studio, publicado por Tanjim](https://x.com/Tanjim38/status/2109638103346381298), con
[demo](https://gr8r-taskmanagement.vercel.app/) y
[repositorio inspeccionado](https://github.com/gr8rstudio/gr8r-studio/tree/904205c626918ee96054eb35495c394a60c0c601).
Se revisaron el post, Kanban, detalle lateral y tabla en el navegador interno, y el código de
vistas, propiedades, gestos y almacenamiento. Evaluar sus tarjetas compactas, detalle lateral,
edición contextual, controles compartidos entre vistas y creación y orden manual dentro de
columnas. La referencia usa propiedades predefinidas; sus adjuntos simulan la carga y conservan
metadatos, y su almacenamiento silencia los fallos. En el estado inspeccionado no se encontró
una licencia explícita; la eventual reutilización de código requiere aclarar sus permisos.

**Criterio confirmado de consolidación:** construir una experiencia coherente a partir de las
necesidades de planificación y seguimiento del Mundo y de los aprendizajes de las referencias.
Priorizar funcionalidad, eficiencia y claridad de navegación, preservando las capacidades
aprobadas de Everett y aplicando los criterios transversales de
[profundidad y simplicidad de uso](producto.md#profundidad-y-simplicidad-de-uso).
Seleccionar y adaptar los patrones que ayuden a esas actividades; cada
función adicional necesita una definición de alcance antes de implementarse.

La [propuesta visual 1](referencias/0.11/propuesta-board-01.md) presenta una vista cotidiana y
el mismo tablero con el inspector de trazabilidad de un bug abierto. Contiene datos de ejemplo
y permanece pendiente de revisión y aprobación del usuario.

El feedback del 12 de octubre elige la disposición con inspector lateral como base, con un
botón para ampliar la misma ficha a pantalla completa y regresar conservando el contexto.
La disposición con detalle inferior quedó descartada. La dirección combina la claridad de
tickets de Linear con la flexibilidad de propiedades y vistas de Notion. La
[propuesta revisada](referencias/0.11/propuesta-board-02.md) concreta esos criterios con datos
de ejemplo; la imagen y los mecanismos propuestos siguen pendientes de evaluación del usuario.

- Revisar Kanban, tabla y calendario sobre las mismas tareas.
- Adoptar los patrones de propiedades y vistas de **Notion** que acordamos usar como referencia.
- Buscar, añadir, editar, quitar y organizar propiedades.
- Mantener estado, prioridad, responsable, creador, fechas, origen y propiedades personalizadas.
- Permitir que una persona cree una tarea y la asigne a sí misma, a otra persona o a un agente.
  Distinguir al creador del responsable y permitir definir una fecha límite.
- Crear y personalizar vistas sobre el mismo trabajo: filtros, orden, agrupación y propiedades
  visibles. Permitir añadir propiedades y definir sus tipos; el catálogo se concreta en 0.11.
- Resolver consistentemente clic para abrir/editar y arrastre para mover.
- Permitir paneo sin interferir con el movimiento de tarjetas.
- Corregir contadores pegados al borde y contenido fuera de pantalla.
- Reubicar propiedades y creación de tareas hacia el lateral.
- Despejar el centro y ordenar su convivencia con Shipping Mode.

**Idea por definir en 0.11 — seguimiento de bugs:** el usuario propuso evaluar su incorporación
al mismo Board. El modelo actual de Everett contiene tareas genéricas y propiedades
personalizadas, sin un tipo de bug ni un flujo específico de reproducción y verificación.
Codroid distingue bugs, los relaciona con otros tickets y conserva evidencia de cierre.
Evaluar identificación del tipo, pasos de reproducción, resultado esperado y observado,
severidad diferenciada de prioridad, relación con el trabajo afectado y verificación de la
corrección. Aplicar el criterio transversal de [trazabilidad y diagnóstico](producto.md#trazabilidad-y-diagnóstico):
vincular el bug o error de ejecución con el origen y recorrido de los elementos afectados,
la secuencia y condiciones del fallo, la investigación de su causa raíz y la evidencia de
corrección y prevención de regresiones. Ofrecer un resumen claro y acceso progresivo al detalle.
Mantener identidad, vistas y relación con Shipping sobre el mismo trabajo. Estos campos y
comportamientos son candidatos; su alcance concreto permanece pendiente.

Las hipótesis deben identificar a la persona o agente que las formuló, cuándo lo hizo y su
contexto o evidencia; conservar su estado de verificación y distinguirlas de una causa
comprobada. La investigación debe tener un responsable explícito. El selector de persona o
agente y la preparación de la acción se proponen en la ficha revisada; abrir un bug o consultar
una hipótesis no inicia una ejecución.

#### Asignación y traspaso de tareas

**Reglas confirmadas:** cualquier participante puede asignar tareas a otro o a sí mismo. El
usuario puede recuperar trabajo de un worker o delegar una tarea que estaba realizando. La
solicitud puede hacerse en cualquier momento; si la ejecución ya comenzó, el traspaso espera
un punto seguro del paso en curso desde el que el nuevo responsable pueda continuar. La tarea
completa puede seguir abierta.

El PM interviene cuando hace falta coordinación o una decisión. Una tarea clara puede pasar al
worker adecuado y continuar directamente. Los demás participantes siguen trabajando y esperan
cuando su trabajo depende del resultado, su validación o las pruebas pertinentes. Transferir una
tarea no la completa ni valida su resultado.

Conservar avance, contexto, recursos e identidad de la tarea durante el traspaso, con persistencia,
trazabilidad y protección frente a ejecuciones duplicadas por accidente. Distinguir el estado de
la tarea, su validación, el responsable y el estado del traspaso. La prevención de duplicados de
una misma ejecución debe permitir el trabajo paralelo coordinado sobre tareas distintas.

Fuente de las reglas: mensajes del usuario del 4 de noviembre de 2026 en
[Diseñar loop de Everett](https://chatgpt.com/c/6ad9ded1-9208-83e8-acfd-14df8c564e0e).
El registro de este alcance y de las propuestas siguientes fue autorizado el 10 de noviembre.

**Protocolo propuesto, pendiente de concretar y aprobar antes de implementarlo:**

| Estado del traspaso   | Comportamiento propuesto                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Solicitado            | Registrar destino; el ejecutor actual conserva el control y prepara el cierre seguro del paso en curso. |
| Preparando entrega    | Estabilizar el paso, guardar avance y resolver las operaciones que no pueden abandonarse.               |
| Listo para continuar  | Persistir el punto de recuperación y comprobar que el ejecutor anterior dejó de actuar sobre la tarea.  |
| Transferido           | Confirmar el nuevo responsable y su autorización de ejecución antes de que continúe.                    |
| Requiere intervención | Conservar el avance disponible e identificar qué impide entregar o recuperar el control.                |

Estos estados describen el traspaso y no requieren columnas adicionales en el Kanban. La aceptación
del destino puede ser automática para un worker disponible y compatible; el gesto de recuperar
una tarea puede expresar la aceptación del usuario. Definir estos comportamientos junto con la
interfaz y los permisos configurados.

Evaluar un registro coordinado y versionado de la autorización de ejecución, con cambio persistido
de responsable y autorización en una única transición. Resolver solicitudes simultáneas contra
la versión vigente y rechazar resultados tardíos de ejecuciones anteriores. El aislamiento mediante
worktrees debe complementarse con el control de procesos, herramientas y otros recursos afectados.
Un timeout no demuestra que el ejecutor haya dejado de actuar; la recuperación debe comprobar el
estado real antes de habilitar un reemplazo.

**Escenarios que debe cubrir la verificación del protocolo:**

- Autoasignación de una tarea libre: un responsable y una sola ejecución autorizada.
- Delegación de una tarea clara: el worker recupera el avance y continúa sin intervención
  innecesaria del PM; una decisión pendiente activa la coordinación correspondiente.
- Recuperación durante una operación: la solicitud permanece visible y el cambio espera al
  punto seguro, conservando el contenido y los pendientes.
- Solicitudes simultáneas: una sola transferencia se confirma; las demás reciben el estado vigente.
- Cierre o recarga durante el traspaso: recuperar el estado confirmado sin perder avance ni
  iniciar dos ejecuciones; los resultados tardíos no alteran la tarea transferida.
- Fallo o desaparición del worker: conservar el último avance verificable y comprobar operaciones
  y recursos pendientes antes de habilitar otro ejecutor.
- Dependencias: transferir una tarea no libera trabajo que todavía espera un resultado validado.

**Decisiones abiertas:** definir el punto seguro y la evidencia necesaria por herramienta; el
contenido mínimo del punto de recuperación; la selección y aceptación del destino; cuándo
interviene el PM; la cancelación o el rechazo de una solicitud; el arbitraje de solicitudes
simultáneas; y la recuperación cuando un worker no puede entregar el control. Concretar cómo se
revoca y verifica la autorización anterior, incluidos procesos y efectos externos pendientes.

### Shipping Mode

**Fundamento confirmado:** Shipping orienta el Mundo entero al cierre de una entrega,
según [Producto](producto.md#shipping-mode). Board debe cambiar la organización y las
decisiones de trabajo para llegar a ese cierre. La
[propuesta de Shipping en Board](referencias/0.11/shipping-board.md) concreta objetivo de entrega,
bloqueos y dependencias, trabajo pendiente y verificación con evidencia. Sus agrupaciones y
mecanismos de preparación permanecen pendientes de evaluación y definición de alcance.

- Conservar el toggle discreto en Board y el estado global del mundo.
- Mejorar la presentación de bloqueantes, trabajo necesario, revisión y tareas listas.
- Al activarlo, dar prioridad efectiva al trabajo necesario para lanzar: destacar primero los
  bloqueantes y priorizar el resto del alcance de lanzamiento. El trabajo posterior permanece
  accesible en un nivel secundario, conservando las propiedades y vistas del mismo trabajo.
- Hacer claras las cantidades y su relación con las tareas.
- Mantener accesible el trabajo posterior.
- Conservar activación y desactivación mediante agente sobre el mismo estado compartido.
- Reflejar el estado en las demás superficies sin añadir contenido innecesario.
- Verificar consultas sobre bloqueantes y trabajo pendiente para lanzar.

**Cierre de 0.11:** organizar el mismo trabajo desde distintas vistas, gestionar agentes y tareas
en la experiencia unificada y verificar los traspasos sin pérdida de contexto ni ejecuciones
duplicadas. Utilizar Shipping sin discrepancias entre tareas, propiedades, cantidades y estado global.

---

## 0.12 — vista de superficies del Mundo, barra global, perfil y sistema de diseño

### Vista de superficies del Mundo

Esta vista muestra las superficies de un único Mundo (proyecto), reflejando la fusión confirmada
de Board y Agents. El Universo es la vista que reúne todos los Mundos; ambas escalas conservan
la navegación aprobada. Las seis superficies de la base corresponden a la presentación previa
a esa integración.

El nombre y la representación se trabajan inicialmente en la reconstrucción de 0.7.5. En 0.12 se verifica su integración con las superficies terminadas y se resuelven los ajustes que el usuario apruebe.

- Acordar el nombre que reemplazará a `Vista atómica`.
- Definir y aprobar una referencia visual para representar las superficies tras la fusión de Board y Agents.
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

## Preview — versión pública de feedback

Decisión del 9 de noviembre de 2026 (documentada el 10): lanzar una versión **Preview** antes de 1.0 para recoger feedback mientras se itera hacia la aprobación del prototipo. Es un hito de release de producto, no una etapa adicional del recorrido `0.8`–`0.12` ni los previews de enlaces/medios de Canvas.

El camino de prototipo documentado arriba se conserva. Preview se publica como release pública anterior a `1.0 RC` y `1.0`. Qué entra en Preview —superficies, recorridos y límites— está **pendiente de definir**; este registro fija el hito sin inventar alcance.

Las superficies de destino del producto siguen siendo Code, Canvas, Docs, Board y Sessions, con Agents integrado en Board.

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

Excepción aprobada por el usuario para 0.8.15 y ampliada en 0.8.16: servicio local acotado a previews, lectura web guardada y archivos de imagen/video por URL, según C08-URL-01 y C08-WEB-01. El resto de este límite se conserva.

## Mejoras de Canvas por evaluar

Necesidades de organización y consulta confirmadas durante la revisión de Canvas. El estado de implementación permanece en [Tareas](../TAREAS.md).

- **Galería de imágenes:** autorizada para 0.8.18 como consulta de las imágenes seleccionadas en el visor existente, conservando selección y contexto espacial al regresar. No agrega una biblioteca independiente.
- **Organización de la selección:** alinear bordes y centros; distribuir el espacio horizontal o vertical entre piezas de tamaños distintos conservando los extremos. Las guías aparecen automáticamente al arrastrar. Las acciones explícitas pertenecen al menú contextual de la selección y al menú de Canvas en la barra superior. Los ajustes generales y el acceso a Atajos reutilizan las preferencias existentes.
- **Bosquejos de baja fidelidad:** el usuario requiere componer interfaces coherentes y editables, además de dibujar a mano alzada. El primer bloque confirmado incluye pantallas, texto, botones, campos, tarjetas/listas, marcadores de imagen, tablas y menús básicos como piezas visuales editables. Se representan como piezas monocromas de contorno discreto y texto legible, accesibles desde Canvas → Bosquejos y editables con doble clic, Enter o menú contextual. Reutilizan selección, tamaño, alineación, capas, conjuntos, historial y persistencia. La composición se agrupa explícitamente para moverla completa. No incluye formularios funcionales, responsive automático ni generación de código en este primer bloque. Rough.js aporta los contornos bajo MIT, según los criterios de [Desarrollo](desarrollo.md#dependencias); una apariencia dibujada por sí sola no resuelve esta capacidad. El contrato y los límites se concretan en C08-WIRE-01 de [Canvas 0.8](iteraciones/0.8.md#bosquejos-de-interfaz--0821). El bloque pertenece a 0.8.

### Dirección de la biblioteca de bosquejos

Confirmada el 1 de noviembre de 2026: construir una base coherente de piezas visuales elementales
que puedan combinarse para formar interfaces completas, aplicando composición y reutilización.
Ofrecer formas/contenedores, texto simulado y rótulos, líneas, símbolos y regiones de medios,
junto con composiciones editables de controles, navegación, contenido y comunicación. Botones y
campos deben conservar acceso a sus partes gráficas. Probar la suficiencia de la base componiendo
login, inicio, invitaciones, alertas, mensajes, diálogos, overlays, composers y paneles.

Evaluar catálogos, código y recursos MIT o Apache-2.0 antes de dibujar o implementar piezas desde
cero; verificar por separado la licencia de código, iconos y otros activos. El 4 de noviembre de
2026 el usuario aprobó incorporar la biblioteca visual al Canvas. Sus definiciones compartidas
producen composiciones de piezas editables, con variantes, estados y rótulos opcionales. Los
ejemplos compuestos sirven también para revisar su calidad y cobertura;
no implican formularios funcionales, generación de código ni responsive automático. Ese bloque
integrado corresponde a baja fidelidad; la ampliación siguiente se define a continuación.

### Composición y wireframes de baja y media fidelidad

Dirección confirmada el 8 de noviembre de 2026, en implementación. Amplía el límite
anterior de baja fidelidad; alta fidelidad queda fuera del trabajo actual. Refinar una composición
debe permitir introducir contenido representativo, proporciones, jerarquía y estados más precisos
conservando sus piezas y relaciones. La fidelidad visual, de contenido y de interacción se evalúa
por separado; cambiar barras por rótulos no acredita por sí solo toda esta ampliación.

- **Composición editable:** jerarquía de pantallas, contenedores, componentes y piezas; entrar y
  salir de su edición sin desagrupar. Mantener separación intencional y copias independientes.
- **Distribución:** filas/columnas, separación, márgenes interiores y reglas de tamaño que
  conserven la estructura al editar contenido o dimensiones. Diferenciar redimensionar un
  contenedor de escalar proporcionalmente su contenido.
- **Guías de layout:** retículas por pantalla/marco con columnas, filas, cantidad configurable
  —incluidos 4, 8 y 12—, márgenes y separación. Vista ofrece mostrar/ocultar con atajo visible y
  configurable en Atajos. `Shift+G` es el valor por defecto y respeta las asignaciones personales
  existentes; en caso de conflicto queda sin asignar hasta elegir otro. La configuración pertenece al marco;
  visibilidad y ajuste magnético son controles distintos. Ocultar no borra la configuración.
- **Ajuste automático:** mejorar la elección de referencias según proximidad, contexto de
  edición y continuidad del gesto, incluyendo conflictos entre objetos y retículas. La guía
  debe identificar la referencia que realmente produjo el ajuste. Conservar la suspensión
  temporal existente y comprobarla junto con la navegación espacial.
- **Edición y reutilización:** conservar propiedades útiles de los componentes insertados,
  editar contenido/estados, sustituir piezas y repetir estructuras. Guardar composiciones
  propias; cualquier vínculo de actualización entre instancias requiere una acción explícita.
- **Recorridos:** relacionar pantallas y alternativas con sus decisiones, referencias y tareas.
  Concretar las interacciones de consulta antes de implementar; los controles dibujados no
  adquieren comportamiento real de formularios por esta definición.

La base debe conservar identidad y jerarquía además de geometría y apariencia. Separar modelo,
cálculo de layout/ajuste, representación e interacción siguiendo la arquitectura existente.
Revisar lo que necesita rediseño antes de ampliar recetas sobre posiciones fijas. Planificar
migración de composiciones guardadas, historial, persistencia y selección; no inferir relaciones
perdidas de forma destructiva ni modificar el original al editar una copia. La futura alta
fidelidad orienta los límites entre responsabilidades, sin implementarla anticipadamente.

Referencias adoptadas para retículas y acceso: [guías de layout de Figma](https://help.figma.com/hc/en-us/articles/360040450513-Create-layout-guides)
y [guías y ajuste de Penpot](https://help.penpot.app/user-guide/designing/workspace-basics/).
La evaluación requiere los [recorridos de composición](validacion-prototipo.md#evaluación-de-la-ampliación-de-composición),
con geometría, interacción continua, datos realistas y revisión visual.

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

**Próximo paso del roadmap: desarrollar 0.8 y cerrar Canvas antes de pasar a 0.9.** Preview queda registrado como hito posterior de release pública; su contenido se define cuando se acuerde el alcance.
