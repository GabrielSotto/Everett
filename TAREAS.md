# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                                |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                              |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                                           |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.12 verificada y empaquetada; pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                                    |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                                     |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                                 |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                               |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                              |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                              |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado de Canvas 0.8.12

El usuario terminó la revisión de 0.8.11 y autorizó corregirla en 0.8.12: marco y tiradores de selección de formas, orden de materiales, colisiones entre chat y dock, orientación personal del dock, avisos de conjuntos y zonas grandes, regreso de Configuración y conexiones con doble clic sin menú contextual. Gate completo, revisión visual y paquete candidato de 0.8.12 verificados. La selección parcial y la referencia a fragmentos se conservan. La aprobación del usuario sigue pendiente.

Implementación en `feat/canvas-0.8`. 0.8 sigue abierta y no se integra en `dev`. La revisión del usuario confirmó selección parcial, conjuntos y referencias a fragmentos; las correcciones actuales preservan esos recorridos.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación de 0.8.8 identificó pertenencia manual temporal, ausencia de referencias precisas y ocho etiquetas sobre tarjetas en el panorama de veinte materiales. La solución autorizada se concreta en C08-ORG-01 y C08-REF-01 y en la ampliación de C08-B49. El detalle funcional y la matriz están en [Canvas 0.8](docs/iteraciones/0.8.md).

- Conjuntos: crear desde selección múltiple, nombrar, mover, deshacer, recuperar y separar sin borrar materiales. Conservan miembros durante asignación/devolución y no sustituyen zonas ni propiedad de agentes.
- Fragmentos de Docs y Code: selección nativa del rango, preview y entrada al mismo origen, seguimiento de ediciones y estado no disponible. Copiar Docs conserva independencia. Las propuestas preservan contenido vecino y rechazan conflictos de origen.
- Controles: búsqueda siempre en la cabecera, Undo/Redo compactos, salida de Formas, conexión seleccionada con un clic, etiqueta con doble clic y Enter/Esc sin botones, eliminación por teclado, opacidad dentro del color. Superficies está oculto por defecto y tiene un switch persistente en Configuración.
- Panorama: comprobar etiquetas fuera de tarjetas, continuidad del cable, zoom, movimiento y nombres de conjuntos alcanzables. El nombre de una forma sigue en su identificación contextual; texto dentro de formas permanece como posibilidad a evaluar, sin prioridad ni diseño aprobado.

## Límites y trabajo posterior

Canvas sigue en desarrollo. El gate de una candidata no acredita por sí solo la utilidad completa ni aprueba la iteración. Evaluar sus recorridos y resultados con la revisión del usuario.

- Agentes: la simulación local conserva y reorganiza archivos visuales sin interpretarlos. El procesamiento real requiere definir un trabajo e integración aparte; no se implementa un proveedor en esta etapa.
- Referencias: rangos de texto, sin identidad semántica de AST. Una reescritura completa o recuperación ambigua requiere revisar el vínculo. Los conjuntos son planos; sus miembros se pueden sacar por arrastre o acción contextual.
- Pulido del panorama: a 0,4×, la identificación contextual del documento seleccionado puede cubrir temporalmente una etiqueta de relación situada encima; deseleccionar recupera su lectura. C08-B49 comprueba los cuerpos de las tarjetas y los cables, no la ausencia universal de solapamientos con identificaciones transitorias.
- [Galería y bocetos rápidos](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar): prioridad baja, sin versión comprometida. [Editor integral](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral): planificar y evaluar herramientas open source en 0.9.
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. Las correcciones de búsqueda, el switch de navegación alternativa y la agrupación de Preferencias/Herramientas dentro de Configuración son los ajustes transversales autorizados para este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Verificación y entrega actual

Candidata **0.8.12** preparada para revisión del usuario. Se ejecutaron `npm run build`, `typecheck`, `format:check`, `test:unit`, `verify:unit`, `verify:build`, `test:browser -- --workers=1` y `verify:browser`. Resultado vigente: **85 pruebas de lógica/herramientas y 149 de navegador aprobadas**, sin omisiones ni reintentos. Incluye controles negativos del arnés y sesión sostenida de treinta ciclos.

- [HTML autónomo](dist/Everett-0.8.12.html): 13.777.257 bytes, build `a4a5e9796991167a`, SHA-256 `0236dcc04dca408b8bbf8b80f7bb2f0bab4e686a67285e1a3eff56e8b0fcc2f1`.
- [Informe real](output/informe/informe.md), [resultado unitario](output/pruebas/unitarias/2026-10-21_10-47-53-140Z/result.json) y [resultado de navegador](output/pruebas/navegador/2026-10-21_13-59-43-189Z/results.json).
- [Revisión visual, alcance y qué probar](output/revision/0.8.12/revision.md), con capturas, mediciones y fotogramas del artefacto actual. La inspección visual está acotada a los estados identificados; no certifica todos los fotogramas ni toda la utilidad del producto.
- [Paquete candidato](output/paquete/Everett-0.8.12.zip) y [verificación de entradas y hashes](output/paquete/verificacion.json).
- Preview independiente en `http://127.0.0.1:4173/`, servido con `node scripts/preview.mjs 4173`. La pestaña y los datos de revisión del usuario se conservan.

Las regresiones nuevas detectaron sobre 0.8.11 el editor abierto por un clic, el contorno subpíxel al alejar y la compactación del dock al abrir Quick Chat sin colisión. El [diagnóstico inicial](output/revision/0.8.12/diagnostico-0.8.11/resultado.json) corresponde a las primeras versiones de esos casos; después se ampliaron. No se cuenta como ejecución aprobada.

0.8 continúa abierta en `feat/canvas-0.8`. No se integra en `dev` ni se adelanta otra iteración. Esta candidata requiere revisión del usuario antes de cualquier cierre.
