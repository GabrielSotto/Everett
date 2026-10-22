# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                  |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                             |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.13 verificada; pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                      |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                       |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                   |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                 |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado de Canvas 0.8.13

El usuario terminó la revisión de 0.8.12 y autorizó corregir las capas contextuales, el texto de zonas a múltiples escalas, el desplazamiento del dock al abrir Quick Chat y la anchura y controles de Configuración. Confirmó formas, conexiones y conjuntos. 0.8.13 tiene gate completo y revisión visual; la aprobación del usuario sigue pendiente. La ampliación de preferencias se limita a fondo de Canvas, movimiento y orientación personales; no adelanta el rediseño general de 0.12.

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
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. Las correcciones de búsqueda, navegación alternativa, agrupación de Preferencias/Herramientas y configuración compacta con preferencias de Canvas son los ajustes transversales de este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Verificación y entrega actual

Candidata **0.8.13** preparada para revisión del usuario. Se completaron `npm run build`, `typecheck`, `format:check`, `test:unit`, `verify:unit`, `verify:build`, `test:browser -- --workers=1` y `verify:browser`. Resultado vigente: **86 pruebas de lógica/herramientas y 154 de navegador aprobadas**, sin omisiones ni reintentos. Incluye los controles negativos del arnés y 30 ciclos de sesión sostenida.

- [HTML autónomo](dist/Everett-0.8.13.html): 13.800.339 bytes, build `4a6b8267a2c8edcf`, SHA-256 `d075ecb38eae1295b910e28e7402891085f8dd9df345ef4a53b68e4b9a2d6b6b`.
- [Informe real](output/informe/informe.md), [resultado unitario](output/pruebas/unitarias/2026-10-22_10-04-23-056Z/result.json) y [resultado de navegador](output/pruebas/navegador/2026-10-22_10-05-13-438Z/results.json).
- [Revisión visual, alcance y qué probar](output/revision/0.8.13/revision.md), con comparación del feedback, capturas, fotogramas y mediciones.
- [Paquete candidato](output/paquete/Everett-0.8.13.zip) y [verificación de archivos y hashes](output/paquete/verificacion.json).
- Preview único en `http://127.0.0.1:4173/`, mediante `node scripts/preview.mjs 4173`. Se conservan la pestaña y los datos de revisión del usuario.

La revisión de 0.8.12 confirmó formas, conexiones y conjuntos. Las correcciones de esta candidata cubren capas contextuales con pasos repetidos, texto de zonas a múltiples escalas, separación lateral y recuperación del dock, Configuración compacta, switch Dock vertical y preferencias personales de fondo y movimiento. El [diagnóstico del HTML anterior](output/revision/0.8.13/diagnostico-0.8.12/resultado.json) reproduce los fallos; el [caso complementario de recuperación](output/revision/0.8.13/recuperacion-quick-antes.json) detectó el fallo al recargar durante el trabajo. Esa pasada se interrumpió, se amplió B79 y se repitió todo el gate sobre el HTML final.

0.8 sigue abierta en `feat/canvas-0.8`. No se integra en `dev` ni se adelanta otra iteración. La revisión y aprobación del usuario continúan pendientes.
