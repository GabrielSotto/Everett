# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                  |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                             |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.14 verificada; pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                      |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                       |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                   |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                 |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado de Canvas 0.8.14

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

Candidata **0.8.14** preparada para revisión del usuario. Gate completo: npm run build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser -- --workers=1 y verify:browser. **87 pruebas de lógica/herramientas y 160 de navegador aprobadas**, sin omisiones ni reintentos. Incluye controles negativos del arnés y 30 ciclos de sesión sostenida. La pasada de navegador duró 39.54 minutos.

- [HTML autónomo](dist/Everett-0.8.14.html): 13.819.227 bytes, build `75d907e61f6a643b`, SHA-256 `3110b489635f57ebec57d40ef6b9ed8b71ae31675ea4dfe251b19024dfe786f0`.
- [Informe real](output/informe/informe.md), [resultado unitario](output/pruebas/unitarias/2026-10-23_13-31-49-562Z/result.json) y [resultado de navegador](output/pruebas/navegador/2026-10-23_13-31-57-866Z/results.json).
- [Revisión visual, alcance y qué probar](output/revision/0.8.14/revision.md), con capturas del usuario, diagnóstico anterior, imágenes/fotogramas finales y mediciones.
- [Paquete candidato](output/paquete/Everett-0.8.14.zip) y [verificación de archivos y hashes](output/paquete/verificacion.json).
- Preview único en http://127.0.0.1:4173/, mediante node scripts/preview.mjs 4173. La pestaña y los datos de revisión del usuario se conservaron.

La revisión visual encontró un encabezado de conjunto tapado en un primer HTML de esta corrección. Se detuvo la pasada, se añadió U25 y se amplió B84 con cero colisiones, lado estable, acceso por foco y contraejemplo. Otra pasada se interrumpió para reparar la fase de captura de la sonda de Alt. La inspección de una pasada completa encontró contraste insuficiente sobre una tarjeta clara; se corrigió el fondo y B86 exige pintura opaca, contraste y un contraejemplo transparente. Esas ejecuciones no certifican el artefacto final. La evidencia vigente corresponde a la nueva pasada completa sobre el HTML identificado arriba.

0.8 sigue abierta en feat/canvas-0.8. No se integra en dev ni se adelanta otra iteración. La revisión y aprobación del usuario continúan pendientes.
