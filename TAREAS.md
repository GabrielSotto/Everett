# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                      |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.    |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`. |
| 0.8                           | Correcciones de revisión      | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md).                                     |
| 0.9                           | Pendiente                     | Code y Docs.                                                                                                 |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                           |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                       |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).     |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                    |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                    |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Correcciones pendientes

Canvas 0.8.2 es candidata para revisión del usuario en `feat/canvas-0.8`. Build, typecheck, format:check, test:unit, verify:unit, verify:build, test:browser y verify:browser pasaron sobre el artefacto actual: 67 pruebas unitarias y 104 de navegador, en 22,7 minutos. No hubo fallos, omisiones ni reintentos.

El [informe vigente](output/informe/informe.md) conserva hashes, resultados y 142 capturas. La [revisión visual y de alcance](output/revision/0.8.2/revision.md) registra correcciones, referencias, estados intermedios y límites. El HTML original y la entrega aprobada de 0.7.5 se conservan.

El feedback de 0.8.1 quedó corregido y cubierto por C08-U07/U08, C08-B30–B33 y la ampliación de B23: video arrastrable también con zoom alejado; extremos de cable reconectables y eliminación contextual; propuesta próxima a su zona, contexto y resultado reconocibles; chips y estado activo estables; nombre pintado y Sin nombre; lápiz durante gestos consecutivos; metadatos de Board dentro de su tarjeta; vacío y acciones de zona claros. La regresión completa de Everett, incluida la densidad de 16 materiales y sesión sostenida, está aprobada técnicamente.

Permanecen pendientes la revisión y aprobación del usuario y la integración explícita en `dev`. Las siguientes iteraciones continúan pendientes. No se registra un fallo técnico abierto de este feedback; cualquier nueva incidencia de la revisión debe incorporarse aquí y convertirse en regresión.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.
