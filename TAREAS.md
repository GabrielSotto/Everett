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

Canvas 0.8.6 en preparación en feat/canvas-0.8. El feedback sobre incorporación reproduce un menú desproporcionado y separado del dock por una posición fija en la pantalla; se corrige con anclaje al disparador y regresión C08-B46. El gate debe renovarse para esta candidata. Cierre e integración pendientes de aprobación explícita.

Galería y bocetos rápidos están en [Mejoras de Canvas por evaluar](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar), con prioridad baja y sin versión comprometida.

Para 0.12: observaciones de búsqueda global, estructura del perfil y acceso a Superficies. El usuario confirmó conservarlas en esa etapa y trabajar exclusivamente en 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa del alcance.

Registrar aquí cada nuevo fallo abierto con su versión, forma de reproducirlo, resultado esperado y caso de prueba asociado. Al corregirlo, conservar la regresión en `tests/` y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en `output/pruebas/` hasta la siguiente ejecución de su grupo.

## Candidata 0.8.5

Importar archivos locales abre el selector real. Su input permanece conectado al cerrar el menú y los lotes se encuadran completos. Cargar ejemplos multimedia alterna paisaje, ciudad y naturaleza, conserva el ciclo tras recarga y no modifica archivos ni materiales anteriores. Se mantienen las correcciones de video, selección de grupos y demás recorridos de Canvas.

Regresiones C08-B44/B45 y UI-HARNESS-03 incorporadas a la matriz obligatoria. La importación entra por controles visibles y comprueba selección vacía, varios archivos PNG/JPEG/PDF, previews completos a 390 píxeles, repetición, archivo no admitido y bytes recuperados. El verificador exige las entradas declaradas de controles y el adjunto controls-used en cada caso; HARNESS-14 comprueba que rechace evidencia ausente, inválida, oculta o programática. La auditoría de recorridos y el criterio preventivo permanecen en [Validación](docs/validacion-prototipo.md#entrada-observable-y-auditoría-de-recorridos-de-canvas).

Pasaron los ocho comandos del gate sobre el HTML actual: 72 unitarias, ejecución 2026-10-13_03-19-51-658Z, y 117 de navegador, ejecución 2026-10-13_03-19-59-251Z, sin omisiones ni reintentos. Incluyen regresión completa, sesión sostenida, recorridos de Canvas y controles adversos del propio arnés. Los verificadores confirmaron las identidades actuales del HTML, las fuentes y la evidencia.

HTML: [dist/Everett-0.8.5.html](dist/Everett-0.8.5.html), build 2053541d8ecd4e02, SHA-256 56aae7dca16aeae5137ba6a94707b1e5b96317a9f6eca099a130012e7c9f3e8e. [Revisión visual y de alcance](output/revision/0.8.5/revision.md), [informe](output/informe/informe.md) y paquete candidato en output/paquete. Preview único en 4173. Se conservan las fuentes y los HTML anteriores; dev y la entrega aprobada de 0.7.5 permanecen intactos.
