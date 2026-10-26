# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                                                                       |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                                                                     |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                                                                                  |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.17 verificada: consulta espacial, multimedia y controles revisados; pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                                                                           |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                                                                            |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                                                                        |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                                                                      |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                                                                     |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                                                                     |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado actual — correcciones de consulta 0.8.17

La revisión de 0.8.16 está implementada en `27ef7ce`, `b7200c2` y `689c131`: regreso por niveles de lectura, controles compactos, inspección de imágenes, reproducción y salida espacial, pegado recuperable y confirmaciones locales. Se aplicaron ampliamente las skills de Emil, break-ui y Apple junto con Transitions.dev, según los [criterios adoptados](docs/desarrollo.md#criterios-adoptados-para-la-revisión-de-canvas). La revisión transversal cubrió dock, tarjetas, conexiones, conjuntos, zonas, propuestas, chat, gestos y visores; los hallazgos corregidos permanecen en el arnés.

Gate completo aprobado: 95 pruebas unitarias/de herramientas y 181 de navegador, sin omisiones ni reintentos. Se verificaron artefacto, fuentes, controles negativos e informe. La revisión visual y las comprobaciones públicas corresponden al mismo HTML. La revisión del usuario sigue pendiente. No integrar en dev ni cerrar 0.8.

## Feedback en curso — revisión de 0.8.17

La revisión del usuario sigue abierta; conservar el HTML mientras dicta feedback. Registrar hallazgos sin iniciar correcciones hasta que termine.

- Lectura web: la portada de YouTube no ofrece una consulta útil. Distinguir aplicaciones/índices de artículos o videos concretos y resolver un estado accionable; el lector actual no es un navegador de aplicaciones completo.
- Retomar una lectura: poder regresar a la última página consultada dentro de una referencia (ejemplo: Introduction de Godot) sin recorrer de nuevo la portada. Conservar el historial de regreso y distinguir posición de lectura de identidad de la referencia.
- Video: revisar autoplay al entrar; el usuario cuestiona que empiece solo. La rueda común debe quedar para la acción local del reproductor/visor y Alt + rueda para navegación espacial. Corregir el desplazamiento visible previo a salir y la salida sin Alt observados. Las pruebas deben reproducir el gesto sobre el video/iframe, con foco en los controles y cambios de modificador.
- Acceso contextual: ofrecer Ajustar a la selección sobre materiales seleccionados desde su menú contextual. Penpot Focus mode también oculta el resto de elementos: no confundir ese aislamiento con el encuadre de cámara existente ni incorporarlo automáticamente.
- Abrir original: definir dónde abre en la aplicación final, diferenciando la lectura interna, el entorno web y un eventual contenedor de escritorio. El comportamiento actual del navegador de Codex no define esa política.
- Arrastre de enlaces: el usuario aclaró que ocurrió en la interfaz del navegador de Codex. No es un fallo atribuido al Canvas de Everett ni añade una corrección de Canvas a este feedback.
- Penpot se incorpora como referencia de calidad de vida y de soluciones existentes para el trabajo espacial, junto con la investigación de alineación ya solicitada. Evaluar reutilización de código con su licencia y preservar el alcance acordado.

## Siguiente mejora de 0.8 — guías de alineación

Solicitada durante la revisión de 0.8.17: mostrar guías temporales al arrastrar materiales para alinear bordes y centros con otros elementos, con ajuste por proximidad opcional. Contrastar Figma, Canva y otros canvases de diseño y evaluar soluciones reutilizables antes de implementar; no partir de cero por defecto. La investigación es temporal; conservar aquí el alcance y posteriormente las decisiones adoptadas.

Definir tolerancia consistente en píxeles de pantalla durante zoom, desactivación temporal del ajuste, movimiento de selecciones/conjuntos sin deformarlos y convivencia con zonas, pan y conexiones. Ampliar el arnés con arrastres en ambos ejes, distintas escalas, cancelación, Undo/Redo, geometría de las guías y coincidencia con la posición final. El ajuste no debe introducir saltos al soltar ni mover elementos ajenos a la selección. Esta mejora todavía no forma parte de 0.8.17; mantener el HTML estable durante la revisión del usuario.

## Antecedente — enlaces reales en 0.8.15

Implementación de C08-URL-01 en `feat/canvas-0.8`: previews mediante servicio local mínimo aprobado expresamente por el usuario. Se compararon bibliotecas y se adoptó link-preview-js (MIT) con descarga acotada y almacenamiento local. El usuario autorizó actualizar el preview durante este trabajo y excluyó el ZIP; se conservan el gate completo, revisión visual, informe y fuentes versionadas. No integrar en `dev` ni cerrar 0.8.

Candidata 0.8.15 con gate completo: tipado, formato, 91 pruebas de lógica/herramientas y 167 de navegador aprobadas, sin omisiones ni reintentos. Incluye siete regresiones nuevas de navegador y sesión sostenida de 30 ciclos. El informe, fuentes e identidad del HTML fueron verificados. La prueba pública de MDN sin respuestas sustituidas compara los mismos bytes de portada mediante SHA-256 antes y después de recargar. La evidencia de 0.8.14 se conserva como antecedente en su paquete.

## Revisión pendiente del usuario

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
- [Galería y bocetos rápidos](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar): prioridad baja, sin versión comprometida. [Editor integral](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral): planificar y evaluar herramientas open source en 0.9.
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. Las correcciones de búsqueda, navegación alternativa, agrupación de Preferencias/Herramientas y configuración compacta con preferencias de Canvas son los ajustes transversales de este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Verificación y entrega actual

Candidata **0.8.17** preparada para revisión. Gate completo: build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser -- --workers=2 y verify:browser. **95 pruebas de lógica/herramientas y 181 de navegador aprobadas**, sin omisiones ni reintentos. La pasada completa duró 25.92 minutos e incluye los 30 ciclos de sesión sostenida y los controles negativos del arnés.

- [HTML autónomo](dist/Everett-0.8.17.html): 14,456,727 bytes, build `df15072e56109a57`, SHA-256 `5d6e82b0beb91030447c31bc58fc44f25d94361b886f49bc8fb70eece343ecca`.
- [Informe verificado](output/informe/informe.md), [resultado unitario](output/pruebas/unitarias/2026-10-26_03-40-31-178Z/result.json) y [resultado de navegador](output/pruebas/navegador/2026-10-26_03-40-36-370Z/results.json).
- [Revisión visual, alcance y qué probar](output/revision/0.8.17/revision.md), con tabla de diseño, comprobaciones públicas, bytes conservados tras recarga, imágenes de 20.000 píxeles, texto al 200 %, ventana de 320 px y la limitación observada en Vimeo. Las dependencias y el servicio se documentan en Desarrollo.
- Preview único en http://127.0.0.1:4173/, mediante `node scripts/preview.mjs 4173`. La pestaña y los datos de revisión del usuario se conservaron.
- Sin ZIP por instrucción del usuario. Permanecen las decisiones adoptadas, fuentes, pruebas y evidencia vigente.

El arnés amplía la extracción, saneamiento, formatos/proveedores, descarga acotada, respuesta tardía durante edición, bytes recuperados, reproducción nativa, portapapeles real, cancelación de navegación pendiente y actualización fallida del lector, dentro de una página seguida y de la referencia original. Los estados de carga conservan los controles de regreso y las respuestas obsoletas no sustituyen la lectura vigente.

0.8 sigue abierta en `feat/canvas-0.8`. No se integra en `dev` ni se adelanta otra iteración. La revisión y aprobación del usuario continúan pendientes.
