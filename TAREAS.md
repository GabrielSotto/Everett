# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                                 |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                               |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                                            |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). 0.8.18: regresión verificada; consulta espacial del iframe enfocado pendiente. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                                     |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                                      |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                                  |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                                |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                               |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                               |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Base verificada — consulta 0.8.17

La revisión de 0.8.16 está implementada en `27ef7ce`, `b7200c2` y `689c131`: regreso por niveles de lectura, controles compactos, inspección de imágenes, reproducción y salida espacial, pegado recuperable y confirmaciones locales. Se aplicaron ampliamente las skills de Emil, break-ui y Apple junto con Transitions.dev, según los [criterios adoptados](docs/desarrollo.md#criterios-adoptados-para-la-revisión-de-canvas). La revisión transversal cubrió dock, tarjetas, conexiones, conjuntos, zonas, propuestas, chat, gestos y visores; los hallazgos corregidos permanecen en el arnés.

Gate completo aprobado: 95 pruebas unitarias/de herramientas y 181 de navegador, sin omisiones ni reintentos. Se verificaron artefacto, fuentes, controles negativos e informe. La revisión visual y las comprobaciones públicas corresponden al mismo HTML. Su revisión terminó y dio lugar a las correcciones 0.8.18 indicadas debajo. No integrar en dev ni cerrar 0.8.

## Correcciones implementadas — 0.8.18

La revisión de 0.8.17 terminó y el usuario autorizó implementar. Alcance: contrato global de rueda local y modificador espacial configurable en Atajos (Alt por defecto), zoom de imagen gradual, galería acotada a las imágenes seleccionadas, reanudación de lectura, estados útiles para aplicaciones web y fallos de red, sugerencia local aceptable con Tab, renombrado fiable con Enter, encuadre contextual y guías de alineación. Preservar los comportamientos confirmados. La base es 0.8.17. La regresión actual verifica los cambios; la comprobación pública mantiene abierto el gesto del iframe enfocado.

La galería de selección queda autorizada en 0.8 por el último feedback; no añade otra superficie de biblioteca. Las guías reutilizan el cálculo de proximidad de Moveable (MIT), adaptado al modelo de coordenadas existente, sin incorporar su framework de arrastre ni código de Penpot.

- Lectura web: la portada de YouTube no ofrece una consulta útil. Distinguir aplicaciones/índices de artículos o videos concretos y resolver un estado accionable; el lector actual no es un navegador de aplicaciones completo.
- Retomar una lectura: poder regresar a la última página consultada dentro de una referencia (ejemplo: Introduction de Godot) sin recorrer de nuevo la portada. Conservar el historial de regreso y distinguir posición de lectura de identidad de la referencia.
- Video: revisar autoplay al entrar; el usuario cuestiona que empiece solo. La rueda común debe quedar para la acción local del reproductor/visor y Alt + rueda para navegación espacial. Corregir el desplazamiento visible previo a salir y la salida sin Alt observados. Las pruebas deben reproducir el gesto sobre el video/iframe, con foco en los controles y cambios de modificador.
- Acceso contextual: ofrecer Ajustar a la selección sobre materiales seleccionados desde su menú contextual. Penpot Focus mode también oculta el resto de elementos: no confundir ese aislamiento con el encuadre de cámara existente ni incorporarlo automáticamente.
- Abrir original: definir dónde abre en la aplicación final, diferenciando la lectura interna, el entorno web y un eventual contenedor de escritorio. El comportamiento actual del navegador de Codex no define esa política.
- Navegador de Codex: el usuario intentó soltar el enlace de Penpot en la zona de pestañas para crear otra pestaña; allí aparece prohibido, mientras que la barra de direcciones sí lo acepta. No es un fallo atribuido al Canvas de Everett.
- Idea por evaluar para la incorporación a Canvas: arrastrar una referencia de video desde otro navegador (Brave/YouTube) y crear la tarjeta en el punto de suelta, reutilizando la resolución de enlaces existente. Comprobar el enlace de la miniatura/título y las representaciones URI/HTML/texto que entrega el navegador; no confundir el enlace al video con la imagen de portada ni asumir que se transfieren los bytes del video. Actualmente no hay receptor de arrastres externos en las fuentes. Verificar con arrastre real entre ventanas/navegadores, distintas escalas, persistencia y Undo/Redo antes de acreditarlo. No implementar durante esta revisión.
- Penpot se incorpora como referencia funcional y de calidad de vida para el trabajo espacial, junto con la investigación de alineación. Everett es propietario y de código cerrado: cualquier reutilización queda sujeta a los [criterios de compatibilidad de licencias](docs/desarrollo.md#compatibilidad-de-licencias-con-everett). No se ha incorporado código de Penpot; priorizar alternativas permisivas o implementación independiente si las obligaciones no encajan.

## Límites comprobados de consulta

- Dentro del iframe externo enfocado, sus teclas no llegan al documento de Everett. La rueda común ya no sale ni desplaza el visor; el modificador permite salir cuando el documento lo recibe. Alt pulsado después de enfocar los controles externos sigue pendiente: la prueba pública lo registra como fallo y la flecha conserva el regreso. Resolverlo por completo requiere cooperación del proveedor o captura en un contenedor nativo, sin apropiarse del teclado del reproductor.
- El lector no ejecuta la aplicación completa de YouTube.com. Su inicio muestra un estado compacto con explicación y origen; los videos específicos utilizan el reproductor oficial. La consulta de aplicaciones web completas dentro de Everett y el destino final de Abrir original requieren una decisión de contenedor.

## Implementada en 0.8.18 — guías de alineación

Solicitada durante la revisión de 0.8.17: mostrar guías temporales al arrastrar materiales para alinear bordes y centros con otros elementos, con ajuste por proximidad opcional. Contrastar Figma, Canva y otros canvases de diseño y evaluar soluciones reutilizables antes de implementar; no partir de cero por defecto. La investigación es temporal; conservar aquí el alcance y posteriormente las decisiones adoptadas.

La implementación usa cinco píxeles de pantalla y Ctrl/Meta para suspender temporalmente el ajuste. C08-U35, C08-B113 y C08-B115 comprueban bordes, centros, varias escalas, cancelación, Undo/Redo, geometría de guías y movimiento de selecciones/conjuntos sin deformarlos. El ajuste no debe introducir saltos al soltar ni mover elementos ajenos a la selección. Esta mejora se implementa en 0.8.18 y no formaba parte del HTML 0.8.17 revisado por el usuario.

## Antecedente — enlaces reales en 0.8.15

Implementación de C08-URL-01 en `feat/canvas-0.8`: previews mediante servicio local mínimo aprobado expresamente por el usuario. Se compararon bibliotecas y se adoptó link-preview-js (MIT) con descarga acotada y almacenamiento local. El usuario autorizó actualizar el preview durante este trabajo y excluyó el ZIP; se conservan el gate completo, revisión visual, informe y fuentes versionadas. No integrar en `dev` ni cerrar 0.8.

Candidata 0.8.15 con gate completo: tipado, formato, 91 pruebas de lógica/herramientas y 167 de navegador aprobadas, sin omisiones ni reintentos. Incluye siete regresiones nuevas de navegador y sesión sostenida de 30 ciclos. El informe, fuentes e identidad del HTML fueron verificados. La prueba pública de MDN sin respuestas sustituidas compara los mismos bytes de portada mediante SHA-256 antes y después de recargar. La evidencia de 0.8.14 se conserva como antecedente en su paquete.

## Antecedente — revisión de 0.8.17

La candidata 0.8.17 conserva la lectura web, los archivos por URL y los comportamientos confirmados. Se simplificó la consulta con una flecha compacta y regreso espacial por niveles, se unificaron los visores y se corrigieron las confirmaciones, el teclado, los datos externos extremos y los comentarios con zoom bajo y ventana estrecha. El detalle de cambios y recorridos de revisión permanece en la evidencia enlazada al final.

- Revisar la utilidad del lector, el regreso desde páginas seguidas y la incorporación de referencias visuales con material propio.
- La rueda de Canvas responde sin cola y Ajustar a la selección puede ampliar hasta el máximo de cámara. Se conserva 1–600 %; la calibración perceptual y el uso con trackpad físico requieren revisión del usuario. Las pruebas verifican cursor, inversión, detención, unidades de rueda y encuadre.
- Vimeo: cargó el iframe oficial, pero no reprodujo el ejemplo público en el navegador de pruebas. El mismo rechazo aparece en un iframe aislado, con autoplay y sin sandbox. No se acredita reproducción ni se atribuye una causa definitiva. YouTube sí reprodujo contenido real. El origen y el regreso permanecen disponibles.

## Antecedente — Canvas 0.8.14

**Candidata 0.8.14 con gate completo; pendiente de revisión del usuario.** Se corrigieron capacidad del dock, anclajes y densidad de identificaciones durante zoom, colisiones entre encabezados y tarjetas, rueda en zonas y ubicación de las preferencias. Se preservan capas, formas, conexiones, conjuntos y referencias confirmadas.

La revisión de 0.8.13 terminó. La corrección se limita a anclajes y densidad de etiquetas durante zoom, capacidad del dock, acciones de rueda en zonas y agrupación de preferencias. La cámara conserva el recorrido multiplicativo de 1–600 %; se comprueban cursor, reversibilidad, unidades de rueda y límites. El texto completo de zonas usa 16/14 px de pantalla. El rediseño general de configuración sigue en 0.12.

Implementación en `feat/canvas-0.8`. 0.8 sigue abierta y no se integra en `dev`. La revisión del usuario confirmó selección parcial, conjuntos y referencias a fragmentos; las correcciones actuales preservan esos recorridos.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación de 0.8.8 identificó pertenencia manual temporal, ausencia de referencias precisas y ocho etiquetas sobre tarjetas en el panorama de veinte materiales. La solución autorizada se concreta en C08-ORG-01 y C08-REF-01 y en la ampliación de C08-B49. El detalle funcional y la matriz están en [Canvas 0.8](docs/iteraciones/0.8.md).

- Conjuntos: crear desde selección múltiple, nombrar, mover, deshacer, recuperar y separar sin borrar materiales. Conservan miembros durante asignación/devolución y no sustituyen zonas ni propiedad de agentes.
- Fragmentos de Docs y Code: selección nativa del rango, preview y entrada al mismo origen, seguimiento de ediciones y estado no disponible. Copiar Docs conserva independencia. Las propuestas preservan contenido vecino y rechazan conflictos de origen.
- Controles: búsqueda siempre en la cabecera, Undo/Redo compactos, salida de Formas, conexión seleccionada con un clic, etiqueta con doble clic y Enter/Esc sin botones, eliminación por teclado, opacidad dentro del color. Superficies está oculto por defecto y tiene un switch persistente en Configuración → Preferencias.
- Panorama: comprobar etiquetas fuera de tarjetas, continuidad del cable, zoom, movimiento y nombres de conjuntos alcanzables. El nombre de una forma sigue en su identificación contextual; texto dentro de formas permanece como posibilidad a evaluar, sin prioridad ni diseño aprobado.

## Límites y trabajo posterior

Canvas sigue en desarrollo. El gate de una candidata no acredita por sí solo la utilidad completa ni aprueba la iteración. Evaluar sus recorridos y resultados con la revisión del usuario.

- Agentes: la simulación local conserva y reorganiza archivos visuales sin interpretarlos. El procesamiento real requiere definir un trabajo e integración aparte; no se implementa un proveedor en esta etapa.
- Referencias: rangos de texto, sin identidad semántica de AST. Una reescritura completa o recuperación ambigua requiere revisar el vínculo. Los conjuntos son planos; sus miembros se pueden sacar por arrastre o acción contextual.
- Pulido del panorama: a 0,4×, la identificación contextual del documento seleccionado puede cubrir temporalmente una etiqueta de relación situada encima; deseleccionar recupera su lectura. C08-B49 comprueba los cuerpos de las tarjetas y los cables, no la ausencia universal de solapamientos con identificaciones transitorias.
- [Mejoras de Canvas](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar): la galería de selección quedó autorizada para 0.8.18; los bocetos rápidos siguen por evaluar, sin prioridad ni versión comprometida. [Editor integral](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral): planificar y evaluar herramientas open source en 0.9.
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. Las correcciones de búsqueda, navegación alternativa, agrupación de Preferencias/Herramientas y configuración compacta con preferencias de Canvas son los ajustes transversales de este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Verificación actual — 0.8.18

Fuentes implementadas y versionadas en `c768f49`, `b0f2295`, `6d193aa`, `9098787` y `b05d72a`, con ampliaciones de inspección pública en `de146b7` y `7c5ad21`.

**Regresión verificada: 98 pruebas de lógica/herramientas y 189 de navegador**, sin fallos, omisiones ni reintentos. La pasada completa duró 26,66 minutos e incluye la sesión sostenida de 30 ciclos. Se comprobaron build, tipado, formato, fuentes, controles negativos e integridad del informe. Las ejecuciones interrumpidas no se acreditan.

**El gate de entrega sigue bloqueado** por `youtube-focused-modifier`: después de enfocar el iframe externo, Alt no llega a Everett. La comprobación pública y su verificador devuelven error por ese gesto. No se considera resuelto ni se presenta la regresión aprobada como cierre funcional. El lector de artículos tampoco ejecuta la página de inicio de aplicaciones como YouTube; su consulta completa requiere definir un contenedor.

- [HTML actual](dist/Everett-0.8.18.html): 14.513.263 bytes, build `1622184f84c3f972`, SHA-256 `cfb25c753bda83a61cf289d6596bde18c33d30a6fee4dc94e9e11a3eb80be3ea`.
- [Informe de regresión verificado](output/informe/informe.md), [resultado de navegador](output/pruebas/navegador/2026-10-26_10-49-40-227Z/results.json) y [resultado unitario](output/pruebas/unitarias/2026-10-26_10-55-45-996Z/result.json).
- [Revisión visual, límites y qué probar](output/revision/0.8.18/revision.md), [comprobación pública](output/revision/0.8.18/destinos-publicos.json) y [veredicto público bloqueado](output/revision/0.8.18/verificacion-publica.json), del mismo SHA.
- Las fuentes de las comprobaciones públicas están versionadas en `tests/public/`. HARNESS-15 comprueba que un fallo público bloquee el resultado aunque pase la regresión controlada. La galería se contrasta con dos imágenes distintas, controles a 320 px y texto al 200 %.
- Preview único en http://127.0.0.1:4173/. Se conserva la pestaña y los datos del usuario. Sin ZIP, por su instrucción.

0.8 sigue abierta en `feat/canvas-0.8`. No integrar en `dev`, cerrar 0.8 ni adelantar otra iteración. El pendiente del iframe y la revisión del usuario permanecen explícitos.
