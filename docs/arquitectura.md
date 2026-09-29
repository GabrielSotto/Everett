# Arquitectura de Everett

La reconstrucción utiliza TypeScript estricto y DOM nativo. El HTML autónomo se genera con esbuild a partir de fuentes y recursos separados.

## Responsabilidades

| Ruta                       | Responsabilidad                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `src/main.ts`              | Inicio y diagnóstico de fallos de arranque.                                           |
| `src/app/application.ts`   | Composición de vistas, navegación de interfaz y ciclo de vida de la aplicación.       |
| `src/app/store.ts`         | Confirmación de comandos, invariantes, historial de Canvas y notificación de cambios. |
| `src/app/agent-service.ts` | Respuestas simuladas, trabajos pendientes y cancelación.                              |
| `src/domain/`              | Modelo del Mundo, contratos de comandos, reglas, cálculos y navegación semántica.     |
| `src/domain/commands/`     | Aplicación de comandos agrupados por responsabilidad.                                 |
| `src/features/`            | Vistas y estado de interfaz propios de cada funcionalidad.                            |
| `src/ui/`                  | Shell, paneles, composer, controles y transiciones compartidas.                       |
| `src/spatial/`             | Cámara, gravedad, foco, render de Mundos, fondo y minimapa.                           |
| `src/platform/`            | Dictado del navegador y exportación de diagnósticos.                                  |
| `src/assets/`              | Imágenes y catálogos recuperados de la base.                                          |
| `src/styles/`              | Estilos de presentación.                                                              |

## Estado y comandos

`State` contiene los Mundos, el perfil, la ruta y los contextos de regreso. Cada Mundo reúne documentos, archivos, tareas, materiales, agentes, conversaciones, propuestas y ejecuciones.

Las vistas emiten una unión discriminada `Command`. `Store.dispatch` copia la entrada, produce un estado candidato mediante el reducer y valida sus invariantes antes de confirmarlo. Un comando rechazado conserva el estado anterior y genera un registro de diagnóstico.

`Store.get()` expone una lectura recursivamente inmutable. El estado confirmado se congela también en ejecución. `Store.snapshot()` produce una copia editable para inspección o pruebas. Los datos iniciales y los objetos recibidos por comandos se copian para impedir que su propietario externo altere el estado confirmado.

El reducer coordina los comandos de workspace, Canvas, documentos, código, Board, agentes y conversaciones. Cada grupo trabaja sobre el candidato privado. Los cálculos de dominio se mantienen independientes del DOM y de los módulos de interfaz.

## Estado de interfaz

Cada funcionalidad define su estado transitorio: selección de Canvas, archivo abierto, panel de Docs, vista de agente o borradores de chat. `src/app/ui-state.ts` compone esos estados junto con el shell y los paneles auxiliares.

El contenido del proyecto se modifica mediante comandos. La interfaz conserva por separado sus controles abiertos, selección y borradores. Un render no debe reponer texto ya enviado ni perder una edición en curso.

## Navegación y presentación

El dominio conserva ruta y contextos de regreso con sus cámaras. La cámara espacial interpreta los gestos usando los parámetros de `src/spatial/tuning.ts`. Las transiciones animan el cambio ya confirmado y conservan el contexto visual de salida.

Los gestos, umbrales, gravedad y reglas de regreso pertenecen al comportamiento aprobado. Cualquier trabajo de presentación debe verificarse contra ese comportamiento. La revisión de la vista del Mundo modifica su nombre y representación según la elección del usuario.

`src/features/spatial/surface-previews.ts` reúne las ilustraciones vectoriales de las seis actividades, con iconos y componentes gráficos compartidos. `surfaces.css` define sus contornos y estados visuales. Estas ilustraciones contienen ejemplos de cada actividad; los datos del proyecto se consultan y editan al entrar en la superficie correspondiente.

## Agentes y ciclo de vida

El servicio de agentes ejecuta una gramática local y respuestas simuladas. Las acciones resultantes utilizan los mismos comandos que los controles manuales. No hay conexión a proveedores de inferencia.

Cada trabajo guarda su revisión e identidad. Una respuesta tardía no reemplaza una revisión posterior. Cancelar elimina el temporizador y cierra su ejecución. Al liberar la aplicación se cancelan las tareas, se retiran listeners y suscripciones y se liberan las vistas. La caché de navegación del navegador conserva la instancia mientras la página permanece retenida.

El estado del prototipo vive en memoria durante la sesión de la página. La recarga restaura los datos iniciales. La persistencia y las integraciones reales se incorporarán únicamente cuando formen parte de una etapa autorizada.

## Convenciones

- Archivos y directorios en `kebab-case`; clases, interfaces y tipos en `PascalCase`; funciones y valores en `camelCase`.
- Identificadores en inglés y comentarios útiles en castellano. Los comentarios explican decisiones o restricciones que no resultan evidentes del código.
- Tipos discriminados para variantes de comandos, rutas y materiales. Entradas inválidas se rechazan antes de confirmar el estado.
- Extraer un módulo cuando tenga una responsabilidad concreta o se comparta una misma regla. Evitar capas anticipadas sin consumidor.
- Las imágenes se mantienen como archivos; el build las incorpora al HTML. Sus hashes de recuperación están en `docs/asset-manifest.json`.

## Estilos y plantillas

Cada funcionalidad conserva sus estilos en `src/features/`. `src/styles/` reúne fundamentos, shell, controles compartidos y reglas de adaptación que afectan a varias vistas. `main.css` declara las importaciones en el orden de cascada recuperado; los módulos complementarios conservan los ajustes que dependen de ese orden.

Las vistas coordinan eventos y estado local. Las plantillas con una responsabilidad separable, como la página y la lista de Docs, reciben datos de presentación y producen el marcado. Las reglas de dominio permanecen fuera de esas plantillas.
