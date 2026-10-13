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

Canvas 0.8.6 es candidata para revisión del usuario en feat/canvas-0.8. Gate completo y arnés ampliado vigentes; cierre e integración pendientes de aprobación explícita. No quedan fallos conocidos abiertos del feedback corregido en este lote.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.6

Incorporar materiales abre un selector compacto anclado al + o a Más herramientas, independiente del zoom. Se adapta al dock móvil y los bordes de la ventana, limita su altura y desplaza listas extensas internamente. Nombres completos consultables, recorrido por teclado, segundo clic para cerrar y foco recuperado. Se mantienen importación local, ejemplos alternados y los demás recorridos de Canvas.

C08-B46 se incorpora a la matriz obligatoria. Comprueba distancia al disparador, dimensiones, zoom 0,2/1/4, dock en distintos bordes, chat anclado, 801/800/799/390/300 px, 30 documentos adicionales con nombres extensos, scroll local, foco y activación real de una referencia con Enter. La versión previa falla con una distancia de 385,75 px. El verificador exige las entradas reales de references y reference-add, junto con la cobertura existente y los controles negativos del arnés.

Pasaron los ocho comandos del gate sobre el HTML actual: 72 unitarias, ejecución 2026-10-13_09-55-11-135Z, y 118 de navegador, ejecución 2026-10-13_09-55-39-379Z, sin omisiones ni reintentos. Incluyen regresión completa, sesión sostenida, recorridos de Canvas y controles adversos del propio arnés. Los verificadores confirmaron las identidades actuales del HTML, las fuentes y la evidencia.

HTML: [dist/Everett-0.8.6.html](dist/Everett-0.8.6.html), build 523b8614201baa78, SHA-256 aed1e506f0dca69aa7a60899c544902d10e7e7775b87572824841517a5f2aaa0. [Revisión visual y de alcance](output/revision/0.8.6/revision.md), [informe](output/informe/informe.md) y paquete candidato en output/paquete. Preview único en 4173. Se conservan las fuentes y los HTML anteriores; dev y la entrega aprobada de 0.7.5 permanecen intactos.
