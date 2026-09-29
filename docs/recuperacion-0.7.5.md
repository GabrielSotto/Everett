# Recuperación de Everett 0.7.5

Esta iteración reconstruye la base 0.7.5 para mantenerla y continuar el desarrollo hasta 1.0. La aprobación del usuario habilita la implementación en una rama propia. La integración en `dev` requiere verificación y aprobación de la etapa terminada.

## Alcance

1. Recuperar y comprobar las fuentes y recursos del HTML original, conservando su hash.
2. Establecer módulos con responsabilidades claras, TypeScript estricto, convenciones y documentación por propósito.
3. Mantener las funciones y los datos compartidos de la base. Corregir los fallos comprobados dentro de esos recorridos.
4. Conservar zoom, paneo, foco, gravedad, minimapa, entrada y regreso. Pulir la ejecución visual de la navegación aprobada.
5. Elevar el motion, las transiciones y las microanimaciones. Superar la calidad del Universo recibido es requisito de cierre.
6. Presentar propuestas de nombre y representación para la vista actualmente llamada `Vista atómica`. Implementar la dirección elegida por el usuario manteniendo las seis superficies sin jerarquía visual central.
7. Construir y verificar el arnés, ejecutar la regresión completa y entregar artefactos comprobados.

Las funciones nuevas de Canvas y las demás ampliaciones mantienen sus etapas en [Alcance del prototipo](alcance-prototipo.md).

## Contratos que se conservan

El Mundo contiene el proyecto completo. Las superficies comparten identidad, contenido y estado del mismo Mundo. Entrar en un objeto y regresar debe recuperar su contexto de origen; cambiar entre superficies pares no debe acumular un historial de visitas ajeno a la navegación aprobada.

Las ediciones manuales conviven con la asistencia agéntica. Una propuesta pendiente conserva el contenido original; cancelar, rechazar o retirar al agente devuelve los materiales. Los comandos de agentes y controles manuales actúan sobre los mismos datos.

El nombre y la representación de la vista del Mundo se revisan mediante propuestas visuales. La elección no incorpora nuevas escalas conceptuales ni cambia la forma de navegar.

## Matriz de comprobación

La capa de dominio comprueba los contratos de datos. Cada recorrido requiere además evidencia de los controles reales y su representación visual.

| Requisito   | Intención y acción                                                              | Resultado y contraejemplo                                                                                            | Casos de lógica disponibles                                      | Verificación de interfaz necesaria                                                                                                         |
| ----------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| REC-BASE    | Recuperar los recursos originales y construir desde las fuentes mantenidas.     | Hash original y recursos íntegros; detectar un archivo alterado o ausente.                                           | BASE-01, HARNESS-06                                              | Abrir la base y el HTML construido, compararlos y revisar errores.                                                                         |
| REC-STATE   | Editar el proyecto mediante sus comandos.                                       | Estado compartido coherente; impedir modificación externa, confirmaciones parciales y trazas alteradas.              | STATE-01–03, DOCS-03, AGENTS-04, PROFILE-01                      | Editar y consultar los mismos datos desde sus distintas vistas.                                                                            |
| REC-NAV     | Enfocar, entrar, cambiar de contexto y regresar.                                | Recuperar origen y cámara; rechazar destino inválido sin alterar contexto.                                           | NAV-01–04, SPATIAL-01–06                                         | Teclado, rueda, zoom semántico, paneo, filtros, gravedad y minimapa. UI-NAV-01–05 cubren entrada, regreso, rueda y controles del minimapa. |
| REC-CANVAS  | Editar, conectar y asignar materiales; revisar propuestas y usar historial.     | Conservar identidad, contenido y enlaces; impedir edición del material ocupado y aplicación prematura de propuestas. | CANVAS-01–10                                                     | Gestos, conexiones, atajos dentro y fuera de texto, zonas, densidades y devolución visible.                                                |
| REC-CODE    | Editar, proponer, aceptar y guardar código.                                     | Preservar la edición manual y rechazar una propuesta obsoleta.                                                       | CODE-01–04                                                       | Editor, árbol, búsqueda, diff y composer mediante controles reales.                                                                        |
| REC-DOCS    | Abrir una referencia, editar y regresar.                                        | Un único documento compartido y celdas válidas; detectar contenido perdido.                                          | DOCS-01–03                                                       | Edición, selección, desplazamiento, lista de documentos y composer.                                                                        |
| REC-BOARD   | Organizar tareas y activar Shipping desde distintos contextos.                  | Mismas tareas, propiedades y estado global; detectar cantidades o prioridades inconsistentes.                        | BOARD-01, SESSION-01, SHIPPING-01                                | Vistas, arrastre, edición, propiedades, toggle y consulta conversacional.                                                                  |
| REC-AGENTS  | Iniciar, revisar y cancelar trabajo.                                            | Una respuesta vigente por revisión, sin efectos posteriores al cierre; autoría del perfil activo.                    | SERVICE-01–03, SESSION-02, PROFILE-01                            | Actividad, errores, memoria, chat, borradores y cambio de superficie durante el trabajo.                                                   |
| REC-MOTION  | Recorrer transiciones, paneles y controles con acciones normales y encadenadas. | Continuidad de origen, foco y contexto, sin saltos, solapamientos ni controles inaccesibles.                         | Parámetros de navegación conservados; revisión visual requerida. | Estados intermedios, apertura/cierre reversible, movimiento reducido y comparación con el Universo original.                               |
| REC-WORLD   | Identificar y enfocar las seis superficies del Mundo.                           | Representación coherente, destinos inequívocos y ausencia de centro jerárquico.                                      | Navegación de Mundo conservada.                                  | Propuestas comparables, elección del usuario e implementación revisada.                                                                    |
| REC-HARNESS | Ejecutar controles positivos y negativos y contrastar evidencia con artefactos. | Fallos y ausencias impiden aprobar; detectar versión, fuente, proceso o HTML incorrectos.                            | HARNESS-01–07                                                    | Discrepancia visual intencional, trazas asociadas y lectura de artefactos finales.                                                         |

La matriz se amplía cuando los riesgos y fallos lo exijan. Los identificadores de pruebas conservan su significado; la aprobación de lógica no completa la columna de interfaz.

## Criterios visuales y de motion

- Conservar un origen espacial reconocible al entrar y regresar, incluidos cámara, escala y contenido.
- Mantener legibles las etiquetas y consistentes las áreas de interacción durante el movimiento.
- Hacer reversibles las aperturas y cierres de paneles y composers sin saltos al invertir una acción.
- Proteger borradores, selección, scroll y foco durante renders y transiciones.
- Evitar acumulación de listeners, temporizadores, capas de salida o trabajo de render tras abandonar una vista.
- Conservar controles accesibles en ventanas estrechas, contenido extenso y preferencias de movimiento reducido.
- Comparar la propuesta con el Universo original mediante los mismos recorridos y condiciones. Evaluar la secuencia completa y sus estados intermedios.

## Cierre

Aplicar el gate completo de [Validación del prototipo](validacion-prototipo.md). La evidencia debe corresponder al código y al HTML actuales y cubrir las funciones conservadas, las correcciones y la nueva presentación elegida. El informe identifica cada fallo, bloqueo y omisión.

La entrega incluye HTML, fuentes, arnés, informe y hashes comprobados. Después de la prueba libre, las correcciones y la aprobación del usuario, integrar en `dev` antes de iniciar 0.8.
