# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                  |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                             |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Candidata 0.8.11 verificada, pendiente de revisión del usuario. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                      |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                       |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                   |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                 |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Estado de Canvas 0.8.11

Implementación en `feat/canvas-0.8`. El usuario terminó la revisión de 0.8.10 y autorizó las correcciones de 0.8.11. La candidata corrige selección parcial, reincorporación a conjuntos, bordes al alejar, regreso del chat desacoplado a Quick Chat y desplazamiento de Configuración. También aclara el selector de fragmentos y comprueba el texto exacto de su tarjeta. Gate completo y revisión visual realizados; revisión del usuario pendiente. 0.8 sigue abierta y no se integra en `dev`.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación de 0.8.8 identificó pertenencia manual temporal, ausencia de referencias precisas y ocho etiquetas sobre tarjetas en el panorama de veinte materiales. La solución autorizada se concreta en C08-ORG-01 y C08-REF-01 y en la ampliación de C08-B49. El detalle funcional y la matriz están en [Canvas 0.8](docs/iteraciones/0.8.md).

- Conjuntos: crear desde selección múltiple, nombrar, mover, deshacer, recuperar y separar sin borrar materiales. Conservan miembros durante asignación/devolución y no sustituyen zonas ni propiedad de agentes.
- Fragmentos de Docs y Code: selección nativa del rango, preview y entrada al mismo origen, seguimiento de ediciones y estado no disponible. Copiar Docs conserva independencia. Las propuestas preservan contenido vecino y rechazan conflictos de origen.
- Controles: búsqueda siempre en la cabecera, Undo/Redo compactos, salida de Formas, etiqueta con Enter/Esc sin botones y eliminación por menú contextual o teclado, opacidad dentro del color. Superficies está oculto por defecto y tiene un switch persistente en Configuración.
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

0.8.11 verificada el 20 de octubre de 2026. Las cuatro regresiones nuevas fallaron primero sobre el HTML comprobado de 0.8.10: selección parcial vacía, borde subpíxel sin tinta suficiente, Quick Chat de 841 px en lugar de 340 px y pestaña Configuración desplazada 9 px. El diagnóstico se conserva en [revisión de la candidata](output/revision/0.8.11/diagnostico-0.8.10/resultado.json). Esas fallas no se cuentan como pruebas aprobadas.

Gate aprobado: `npm run build`, `typecheck`, `format:check`, `test:unit`, `verify:unit`, `verify:build`, `test:browser` y `verify:browser`. La ejecución de navegador utiliza `--workers=1 --max-failures=1`, sin omisiones ni reintentos, sobre el HTML servido por `node scripts/preview.mjs 4173`.

- [Unitarias](output/pruebas/unitarias/2026-10-20_09-47-35-489Z/result.json): 84 aprobadas, incluidos controles negativos de procesos, evidencia y empaquetado.
- [Navegador](output/pruebas/navegador/2026-10-20_09-54-25-528Z/results.json): 142 aprobadas en 2.155,575 s. Incluye C08-B67–B70, reincorporación/cancelación en B60, tamaño de Quick Chat en B62 y fragmento exacto/superficie activa en B61/B58.
- [Mediciones](output/revision/0.8.11/mediciones.json): 48 combinaciones de selección parcial; 28 condiciones de bordes con todos los puntos de contorno detectados; 96 fotogramas de Configuración sin desplazamiento. La sesión sostenida completa 30 ciclos, conserva 71 listeners y cero temporizadores, intervalos o fotogramas pendientes en las mediciones; los nodos pasan de 451 a 456 y la memoria tras GC crece un 6,80 %, dentro del límite comprobado.
- [Revisión visual y guía para probar](output/revision/0.8.11/revision.md): 14 capturas inspeccionadas, cuatro recortes técnicos de bordes y trazas de los gestos corregidos. Conserva los límites de producto y de cobertura.
- [HTML autónomo](dist/Everett-0.8.11.html), [informe real](output/informe/informe.md) y [paquete](output/paquete/Everett-0.8.11.zip). Build `a128c8e7d3c77d46`; 13.751.313 bytes; SHA-256 `547199ad081bf3bbcc23d6ba6bd0ea14769302b7a91fc9119d6201030a4b138e`.

Pendiente: revisión de 0.8.11 por el usuario y las correcciones que surjan. El gate no aprueba el cierre de 0.8 ni autoriza integrar en `dev`. Agentes y propuestas siguen simulados; los demás límites se mantienen en su sección correspondiente.
