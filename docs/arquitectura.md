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
| `src/platform/`            | Persistencia local, archivos, PDF, dictado y exportación de diagnósticos.             |
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

Los borradores de composers se identifican por Mundo, formulario y contexto (archivo, documento o agente). Se conservan al desmontar una superficie y se vacían al enviar. Los cambios de contexto recuperan su propio borrador.

Canvas y Sessions usan `World.conversations` como historial común del Mundo. Cada conversación conserva identidad, nombre, participantes, mensajes y referencias; `world.chat`, `world.messages` y `world.codeMessages` mantienen compatibilidad con las vistas anteriores. Los comandos escriben también en el hilo común. La conversación activa y el borrador se identifican por usuario, Mundo y conversación; los comentarios privados, por usuario, Mundo y material. Los mensajes de un trabajo usan la conversación capturada al iniciarlo.

Al retirar una representación referenciada, `World.referenceTargets` conserva su destino por identidad de registro. Los mensajes y borradores siguen mostrando el nombre actual y abriendo el original de Docs, Board, Code o Agents mientras exista, sin recrear el material en Canvas ni guardar un alias. Un material propio eliminado se presenta como no disponible hasta restaurarlo.

Las conversaciones locales ordenan iniciador, agente y personas invitadas. `humanParticipants` distingue esos roles para la validación y la invocación, sin identificar al agente por coincidencia de nombre. Cuando nombres de distintos roles coinciden, la identificación contextual aclara su rol en las tres presentaciones. Esto mantiene la simulación local de participantes; no agrega autenticación ni rediseña Sessions o Agents.

## Navegación y presentación

El dominio conserva ruta y contextos de regreso con sus cámaras. La cámara espacial interpreta los gestos usando los parámetros de `src/spatial/tuning.ts`. Las transiciones animan el cambio ya confirmado y conservan el contexto visual de salida.

`src/spatial/planet-orbit.ts` define la trayectoria y la luna de los Mundos con órbita. `PlanetRenderer` compone el tramo posterior, el Mundo y el tramo delantero en el mismo canvas. El recorte posterior conserva la oclusión al atenuar Mundos con filtros. La órbita utiliza el reloj ambiental compartido, que se pausa con movimiento reducido y al ocultar la página.

Los gestos, umbrales, gravedad y reglas de regreso pertenecen al comportamiento aprobado. Cualquier trabajo de presentación debe verificarse contra ese comportamiento. La revisión de la vista del Mundo modifica su nombre y representación según la elección del usuario.

`src/features/spatial/surface-previews.ts` reúne las ilustraciones vectoriales de las seis actividades, con iconos y componentes gráficos compartidos. `surfaces.css` define sus contornos y estados visuales. Estas ilustraciones contienen ejemplos de cada actividad; los datos del proyecto se consultan y editan al entrar en la superficie correspondiente.

## Agentes y ciclo de vida

El servicio de agentes ejecuta una gramática local y respuestas simuladas. Las acciones resultantes utilizan los mismos comandos que los controles manuales. No hay conexión a proveedores de inferencia.

Cada trabajo guarda su revisión, identidad, instrucción, contexto recibido y vencimiento reproducible. Una respuesta tardía no reemplaza una revisión posterior. Cancelar explícitamente elimina el temporizador, cierra su ejecución y devuelve los materiales. Liberar la aplicación retira temporizadores, listeners, suscripciones, trabajadores PDF y URLs de Blob; conserva el trabajo persistido para reanudarlo. La caché de navegación del navegador conserva la instancia mientras la página permanece retenida.

La recuperación comprueba efectos ya registrados antes de reintentar. Una interrupción confirmada se presenta como `Interrumpido`, con Reintentar/Cancelar. Las propuestas recuperadas conservan su aceptación explícita pendiente; cerrar el chat o recargar no cancela al agente.

El posicionamiento de propuestas busca espacio libre sin mover materiales del usuario.
Store corrige la geometría de propuestas recuperadas antes de congelar el estado; los
comandos conservan esa separación al modificar contenido. Las máscaras SVG declaran
su región completa y el foco de una conexión resalta el cable.

## Persistencia y archivos de Canvas 0.8

`src/platform/local-storage.ts` usa IndexedDB (`everett-canvas`, esquema 1). `worlds` guarda el contenido compartido de los Mundos; `personal` guarda perfil, ruta, cámaras, selección válida, presentación del chat, conversación activa, borradores y atajos por usuario local; `assets` guarda los bytes de imágenes, videos y PDF como Blob. Contenido y contexto personal se confirman juntos en una transacción. La escritura comienza durante el evento que cambió el dato, sin debounce que pueda perder la última edición al recargar.

Las URLs temporales se generan al montar una vista y se revocan al liberarla. Las copias conservan su identidad independiente y pueden compartir los bytes originales; eliminar una representación no elimina el archivo externo ni los bytes necesarios para Deshacer. Este prototipo conserva los assets incorporados en el origen del navegador, incluso después de retirar sus representaciones; aún no incorpora recolección de archivos sin uso.

Un fallo de guardado conserva el estado en memoria y ofrece Reintentar y Descargar copia con contenido y bytes. Un guardado incompleto o inválido detiene la recuperación y ofrece reintento y diagnóstico, sin reemplazarlo con datos iniciales. Los datos iniciales se crean solo cuando no existe guardado. La recarga reinicia gestos y herramientas transitorios.

`pdf-preview.ts` integra PDF.js y su worker dentro del HTML autónomo. Genera una primera página real cuando puede y proporciona lectura por páginas, con scroll local y navegación espacial mediante Alt. Un PDF sin portada disponible conserva su archivo y muestra ese estado.

## Convenciones

- Archivos y directorios en `kebab-case`; clases, interfaces y tipos en `PascalCase`; funciones y valores en `camelCase`.
- Identificadores en inglés y comentarios útiles en castellano. Los comentarios explican decisiones o restricciones que no resultan evidentes del código.
- Tipos discriminados para variantes de comandos, rutas y materiales. Entradas inválidas se rechazan antes de confirmar el estado.
- Extraer un módulo cuando tenga una responsabilidad concreta o se comparta una misma regla. Evitar capas anticipadas sin consumidor.
- Las imágenes se mantienen como archivos; el build las incorpora al HTML. Sus hashes de recuperación están en `docs/asset-manifest.json`.

## Estilos y plantillas

Cada funcionalidad conserva sus estilos en `src/features/`. `src/styles/` reúne fundamentos, shell, controles compartidos y reglas de adaptación que afectan a varias vistas. `main.css` declara las importaciones en el orden de cascada recuperado; los módulos complementarios conservan los ajustes que dependen de ese orden.

Las vistas coordinan eventos y estado local. Las plantillas con una responsabilidad separable, como la página y la lista de Docs, reciben datos de presentación y producen el marcado. Las reglas de dominio permanecen fuera de esas plantillas.
