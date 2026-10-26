# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                                               |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                                             |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                                                          |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.16 verificada: lectura web y archivos por URL; revisión del usuario pendiente. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                                                   |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                                                    |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                                                |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                                              |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                                             |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                                             |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado actual — correcciones de consulta 0.8.17

Implementación base en `27ef7ce`: navegación por niveles de lectura, controles compactos, visores, salida con rueda sobre iframe, recuperación del pegado y confirmaciones locales. La automatización fue eliminada por pedido del usuario; el trabajo se inició manualmente. El usuario aportó https://github.com/emilkowalski/skills y pidió usar ampliamente emil-design-eng, review-animations, break-ui y apple-design en todo Canvas, junto con Transitions.dev. Está en curso la revisión de dock, tarjetas, conexiones, conjuntos, zonas, propuestas, chat, gestos y visores; ampliar datos adversos y corregir los hallazgos antes del gate final. Las pasadas anteriores se interrumpieron por ajustes de sincronización y cambios de artefacto: no certifican esta candidata. El gate final todavía no está aprobado. No integrar en dev ni cerrar 0.8.

## Antecedente — enlaces reales en 0.8.15

Implementación de C08-URL-01 en `feat/canvas-0.8`: previews mediante servicio local mínimo aprobado expresamente por el usuario. Se compararon bibliotecas y se adoptó link-preview-js (MIT) con descarga acotada y almacenamiento local. El usuario autorizó actualizar el preview durante este trabajo y excluyó el ZIP; se conservan el gate completo, revisión visual, informe y fuentes versionadas. No integrar en `dev` ni cerrar 0.8.

Candidata 0.8.15 con gate completo: tipado, formato, 91 pruebas de lógica/herramientas y 167 de navegador aprobadas, sin omisiones ni reintentos. Incluye siete regresiones nuevas de navegador y sesión sostenida de 30 ciclos. El informe, fuentes e identidad del HTML fueron verificados. La prueba pública de MDN sin respuestas sustituidas compara los mismos bytes de portada mediante SHA-256 antes y después de recargar. La evidencia de 0.8.14 se conserva como antecedente en su paquete.

## Revisión pendiente del usuario

Las correcciones de la revisión de 0.8.15 están implementadas y cubiertas por C08-WEB-01: Godot supera el límite anterior de HTML, hay lectura guardada dentro de Everett, importación real por URL, pegado contextual/nativo, nombres compactos y confirmaciones. Los fallos corregidos conservan sus regresiones; sus condiciones funcionales permanecen en la definición de 0.8 y en Desarrollo.

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

Candidata **0.8.16** preparada para revisión. Gate completo: build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser -- --workers=2 y verify:browser. **95 pruebas de lógica/herramientas y 173 de navegador aprobadas**, sin omisiones ni reintentos. La pasada completa duró 25.98 minutos e incluye los 30 ciclos de sesión sostenida y controles negativos del arnés.

- [HTML autónomo](dist/Everett-0.8.16.html): 14,312,865 bytes, build `58aea329bd3cc3a7`, SHA-256 `3c979912d3e512bb01b8501e1e3d4131ec767ea2807b07f79be55282935958d4`.
- [Informe verificado](output/informe/informe.md), [resultado unitario](output/pruebas/unitarias/2026-10-25_21-14-54-072Z/result.json) y [resultado de navegador](output/pruebas/navegador/2026-10-25_21-15-25-660Z/results.json).
- [Revisión visual, alcance y qué probar](output/revision/0.8.16/revision.md), con comprobaciones públicas de Godot, imagen, video y YouTube, bytes conservados tras recarga y la limitación observada en Vimeo. Las dependencias y el servicio se documentan en Desarrollo.
- Preview único en http://127.0.0.1:4173/, mediante `node scripts/preview.mjs 4173`. La pestaña y los datos de revisión del usuario se conservaron.
- Sin ZIP por instrucción del usuario. La investigación comparativa fue temporal y se retiró; permanecen las decisiones adoptadas, fuentes y evidencias de validación.

El arnés amplía la extracción, saneamiento, formatos/proveedores, descarga acotada, respuesta tardía durante edición, bytes recuperados, reproducción nativa, portapapeles real, cancelación de navegación pendiente y actualización fallida del lector, dentro de una página seguida y de la referencia original. Los estados de carga conservan los controles de regreso y las respuestas obsoletas no sustituyen la lectura vigente.

0.8 sigue abierta en `feat/canvas-0.8`. No se integra en `dev` ni se adelanta otra iteración. La revisión y aprobación del usuario continúan pendientes.
