# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                 |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                               |
| Mantenimiento del repositorio | En revisión                   | Ordenar salidas, conservar una entrega por versión y comprobar que las pruebas no acumulen ejecuciones. Rama `chore/orden-repositorio`. |
| 0.8                           | Pendiente                     | Canvas.                                                                                                                                 |
| 0.9                           | Pendiente                     | Code y Docs.                                                                                                                            |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                      |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                  |
| 0.12                          | Pendiente                     | Vista del Mundo, barra global, perfil y configuración.                                                                                  |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                               |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                               |

## Correcciones pendientes

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.
