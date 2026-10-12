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

Canvas 0.8.3 está preparada para revisión en feat/canvas-0.8. Pasaron 69 pruebas unitarias y 111 de navegador sobre el HTML actual, incluidos los controles del arnés. El cierre y la integración en dev siguen pendientes de la aprobación explícita del usuario. Se conserva el HTML original y la entrega aprobada de 0.7.5.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.3

El feedback de 0.8.2 está corregido y cubierto por C08-U09/U10, C08-B34–B40 y los recorridos de regresión ampliados. La propuesta muestra materiales independientes de su decisión; aceptar conserva tipo, bytes e identidad del resultado mostrado. También se corrigieron Play, notas, motion, cables, nombres de copias, zona, herramientas y comentarios. Deshacer/Rehacer están en la toolbar superior con botones de 33 px; el trazo conserva continuidad al zoom mínimo y el comentario usa una sola burbuja.

Gate completo: build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser y verify:browser. Evidencia actual:

- [Unitarias: 69 aprobadas](output/pruebas/unitarias/2026-10-12_18-28-21-406Z/result.json).
- [Navegador: 111 aprobadas](output/pruebas/navegador/2026-10-12_18-58-18-756Z/results.json), sin omisiones ni reintentos.
- [Revisión visual y límites](output/revision/0.8.3/revision.md), [informe generado](output/informe/informe.md) y [verificación del paquete](output/paquete/verificacion.json).

HTML autónomo: dist/Everett-0.8.3.html; build 04e08372b8805ef7; SHA-256 ed7d6529c1776c9cf1a36e38aeb99e85e34055d114e818323bcda5fc01517c5a. Preview único en 127.0.0.1:4173.

Sin fallos reproducidos pendientes de este lote. Las respuestas siguen simuladas y el dictado físico no se revalidó. Crear agentes desde la zona, galería y herramientas de wireframes quedan fuera. La aprobación de producto y la integración permanecen pendientes; la evidencia no sustituye la revisión del usuario.
