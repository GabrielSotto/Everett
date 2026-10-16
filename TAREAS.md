# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                             |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.           |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.        |
| 0.8                           | Candidata para revisión       | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md).                                            |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral). |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                  |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                              |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).            |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                           |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                           |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Correcciones pendientes

Canvas 0.8.7 es candidata para revisión del usuario en feat/canvas-0.8. Gate completo y arnés ampliado vigentes; cierre e integración pendientes de aprobación explícita. No quedan fallos conocidos abiertos del feedback corregido en este lote.

Canvas continúa en revisión e iteración: falta evaluar su utilidad en recorridos reales y completar las correcciones que surjan antes de proponer el cierre. El gate aprobado de una candidata no equivale a la aprobación de la iteración.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.7

Incorporar materiales prioriza abrir al costado del dock, cerca del disparador: derecha junto a + e izquierda disponible en el dock compacto. Arriba o abajo quedan como alternativa cuando no haya espacio lateral cercano. Se conservan dimensiones, scroll, teclado, cierre, foco, importación local y los demás recorridos de Canvas.

C08-B46 amplía la regresión: exige apertura lateral en el escenario ancho y después de mover el dock a lugares con espacio, posición estable con zoom y ningún solapamiento con las herramientas. La variante anterior encima del dock falla. Se conservan cercanía, límites, adaptación a 801/800/799/390/300 px, lista extensa, teclado e incorporación exacta de una referencia. El verificador exige las entradas reales de references y reference-add, junto con la cobertura existente y los controles negativos del arnés.

Pasaron los ocho comandos del gate sobre el HTML actual: 72 unitarias, ejecución 2026-10-13_15-36-29-211Z, y 118 de navegador, ejecución 2026-10-13_15-36-33-039Z, sin omisiones ni reintentos. Incluyen regresión completa, sesión sostenida, recorridos de Canvas y controles adversos del propio arnés. Los verificadores confirmaron las identidades actuales del HTML, las fuentes y la evidencia.

HTML: [dist/Everett-0.8.7.html](dist/Everett-0.8.7.html), build e0be768f4631d4b3, SHA-256 446ed522e8063eea65f3af7806d04f995fde56d431e76e008535d79860b6a6fe. [Revisión visual y de alcance](output/revision/0.8.7/revision.md), [informe](output/informe/informe.md) y paquete candidato en output/paquete. Preview único en 4173. Se conservan las fuentes y los HTML anteriores; dev y la entrega aprobada de 0.7.5 permanecen intactos.
