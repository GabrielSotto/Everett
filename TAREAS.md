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

Canvas 0.8.0 es candidata para revisión en `feat/canvas-0.8`. El gate del artefacto actual
pasó: build, typecheck, format:check, 64 pruebas unitarias y 92 de navegador, con sus
verificadores y controles del arnés. La revisión y aprobación del usuario permanecen
pendientes; no se integró la iteración en `dev` ni se inició 0.9.
El arnés incorpora casos C08 y controles negativos de su inventario, además de la regresión de
Everett. Los fallos encontrados en selección múltiple, estilo/formas, arrastre al chat, guardado
inmediato y acceso a propuestas quedan cubiertos en `tests/browser/canvas08.spec.ts` y los
recorridos mantenidos de chat. La entrega aprobada de 0.7.5 y las etapas 0.9–0.12 se conservan.

Las incidencias de tamaño de propuestas, menús e inspector, chat recortado debajo de 800 px,
huecos y filas del dock, popovers detrás del chat y scroll local están corregidas y cubiertas
por C08-B17–B19. El arnés espera el resize observable antes de medir y arrastrar sus controles.
El nombre y los chevrons de chat e historial, desacoplamiento mediante arrastre,
desplazamiento del dock manual y contraste quedan comprobados por C08-B02/B20/B21.
C08-B20 registra los cuadros del movimiento; el pequeño salto señalado en la revisión
no se reprodujo en ese recorrido. La revisión visual conserva esta observación.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.
