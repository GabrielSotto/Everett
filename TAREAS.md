# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                      |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.    |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`. |
| 0.8                           | Candidata para revisión       | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md).                                     |
| 0.9                           | Pendiente                     | Code y Docs.                                                                                                 |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                           |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                       |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).     |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                    |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                    |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Correcciones pendientes

Canvas 0.8.4 es candidata para revisión del usuario en feat/canvas-0.8. Gate completo y arnés ampliado vigentes; cierre e integración pendientes de aprobación explícita. No quedan fallos conocidos abiertos del feedback corregido en este lote.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.4

Corregidos el video vacío en reposo y el paneo al intentar seleccionar. Seleccionar delimita materiales con un rectángulo; el grupo se mueve, elimina y transfiere completo a la zona, con devolución íntegra y operaciones atómicas. Los videos muestran un fotograma real de sus archivos, recuperable para materiales antiguos y copias, sin cambiar bytes ni reproducción.

Regresiones C08-U11/U12 y C08-B41–B43 incorporadas a la matriz obligatoria. Pasaron los ocho comandos del gate sobre el HTML actual: 71 unitarias, ejecución 2026-10-12_20-15-17-604Z, y 114 de navegador, ejecución 2026-10-12_20-15-39-041Z, sin omisiones ni reintentos. Incluyen píxeles del video y contraejemplo vacío, grupo de tres, movimiento, Backspace, Undo/Redo, transferencia y devolución tras recarga, zoom y cancelación; además de regresión completa y controles adversos del propio arnés.

HTML: dist/Everett-0.8.4.html, build c9a6bfe392eefe13, SHA-256 13e3ffb3d1f014c8513f874ddf792b763103a3bab9efa71ccb611f2dea5d3b23. Revisión visual y de alcance: output/revision/0.8.4/revision.md. Informe y paquete candidato en output/informe y output/paquete. Preview único en 4173. Se conservan las fuentes y los HTML anteriores; dev y la entrega aprobada de 0.7.5 permanecen intactos.
