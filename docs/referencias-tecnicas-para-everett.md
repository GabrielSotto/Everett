# Referencias técnicas para el desarrollo de Everett

Proyectos, modelos, protocolos y formatos que permiten estudiar cómo ejecutar agentes, componer contexto y ofrecer capacidades en Everett. Las consultas se vinculan con el [producto](producto.md): mundos con objetivos, conversaciones y trabajo distribuido entre Canvas, Docs, Code, Board y Agents.

**Actualización:** 17 de octubre de 2026. **Dirección de despliegue planteada:** ejecución en la nube; cliente pendiente de definición.

## Cómo consultar y mantener este documento

Buscar por el problema en el índice y comparar los mecanismos de las entradas relacionadas. Cada ficha conserva fuentes primarias, alcance de la revisión, aplicación posible en Everett y restricciones concretas. Al evaluar una incorporación, registrar el componente y la revisión elegidos, las adaptaciones necesarias y la evidencia obtenida.

Niveles de revisión utilizados:

- **Identificación:** se localizó el anuncio o proyecto; falta examinar su implementación y documentación técnica.
- **Documentación:** se revisaron descripciones, guías o especificaciones primarias; cada ficha indica el alcance.
- **Código:** además de documentación, se inspeccionaron los archivos o pruebas citados. La lectura de pruebas se distingue de su ejecución.

Las revisiones reunidas corresponden al 14–17 de octubre de 2026. Las fuentes de código fijadas a un commit identifican la revisión estudiada; los enlaces a documentación mantenida pueden cambiar. Las evaluaciones de rendimiento de los autores deben contrastarse con tareas de Everett al pasar a una prueba de integración.

## Índice por problema

| Problema que se quiere estudiar                                | Referencias                                                                                                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucle de ejecución, sesiones, extensiones y recuperación       | [Pi](#h01-pi), [DeepSeek Harness](#h02-deepseek-harness), [fx y libfx](#h03-fx-y-libfx), [OpenCode](#h04-opencode)                                                           |
| Composición de contexto e instrucciones a demanda              | [Pi](#h01-pi), [DeepSeek Harness](#h02-deepseek-harness), [Operator Memory](#m02-operator-memory), [Agent Skills](#p02-agent-skills), [MCP](#p01-model-context-protocol-mcp) |
| Mejora de las instrucciones y procedimientos entre ejecuciones | [Harness²](#h05-harness2), [Hy Memory](#m01-hy-memory), [Engram de blakestone-x](#m04-engram-de-blakestone-x)                                                                |
| Memoria por mundo, procedencia, versiones y vigencia           | [Hy Memory](#m01-hy-memory), [Engram de Gentleman Programming](#m03-engram-de-gentleman-programming), [Graphiti](#m05-graphiti), [Mem0](#m07-mem0)                           |
| Decaimiento, consolidación y reducción del contexto activo     | [Engram de blakestone-x](#m04-engram-de-blakestone-x), [Mastra Memory](#m06-mastra-memory-y-observational-memory), [Hy Memory](#m01-hy-memory)                               |
| Selección de modelos, esfuerzo o capacidades                   | [Jev y sus routers](#r01-jev-y-sus-routers), [Span-02](#r02-span-02), [vLLM Semantic Router](#r03-vllm-semantic-router), [RouteLLM](#r04-routellm)                           |
| Proveedores, límites, reintentos y alternativas ante fallos    | [LiteLLM](#r05-litellm), [vLLM Semantic Router](#r03-vllm-semantic-router)                                                                                                   |
| Recuperación textual y multimodal                              | [EmbeddingGemma 2](#b01-embeddinggemma-2), [Evoke](#b02-evoke), [Graphiti](#m05-graphiti)                                                                                    |
| Descubrimiento y acceso a herramientas externas                | [MCP](#p01-model-context-protocol-mcp), [treg y WebAccess](#c04-treg-y-webaccess), [JevRouter](#r01-jev-y-sus-routers)                                                       |
| Comunicación entre ejecución, interfaz y editores              | [AG-UI](#p03-ag-ui), [ACP](#p04-agent-client-protocol-acp), [OpenCode](#h04-opencode)                                                                                        |
| Trazas, evaluación y diagnóstico de agentes                    | [AgentPlay](#e01-agentplay), [OpenTelemetry GenAI](#e02-opentelemetry-genai), [Langfuse](#e03-langfuse), [Promptfoo](#e04-promptfoo)                                         |
| Artefactos editables y capacidades creativas                   | [OpenDesign](#c01-opendesign), [OpenPencil](#c02-openpencil), [HyperFrames](#c03-hyperframes)                                                                                |
| Modelos pequeños para tareas auxiliares                        | [Bonsai 2](#n01-bonsai-2), [Span-02](#r02-span-02)                                                                                                                           |
| Visión, voz, OCR y captura pendientes de revisión              | [Referencias identificadas](#referencias-identificadas-pendientes-de-revisión)                                                                                               |

## Ejecución, contexto y composición de capacidades

### H01. Pi

**Tipo:** bibliotecas y aplicaciones para agentes. **Licencia:** MIT. **Revisión:** código; commit `381a2d8eb62b9f7e4c710cf66aa516f8a92cb9bd`.

Pi separa acceso a modelos (`pi-ai`), bucle de agente (`pi-agent-core`), aplicación y SDK de programación (`pi-coding-agent`) y ejecución durable experimental (`pi-durable`). Conviene comparar esas capas por separado.

Mecanismos relevantes de Pi Durable:

- Registro de extensiones con instalación, reemplazo y retiro; selección de extensiones y herramientas por conversación. Las herramientas ofrecidas al modelo pueden ser un subconjunto de las disponibles para el código del agente.
- Preparación de cada solicitud con modelo, instrucciones, mensajes y herramientas definidos para esa llamada. Los cambios de configuración posteriores afectan las llamadas siguientes.
- Hooks para transformar los mensajes de una solicitud, procesar respuestas e intervenir alrededor de las herramientas y las cesiones de control.
- Transcript persistente, commits atómicos con estado propio y checkpoints de tareas. La compactación modifica el contexto utilizado conservando las entradas originales almacenadas.
- Políticas de recuperación de herramientas para tratar operaciones que pueden repetirse y operaciones con efectos que requieren otra resolución tras una interrupción.

**Consulta para Everett:** cómo elegir capacidades y contexto por ejecución, retirar instrucciones de las llamadas posteriores, conservar el trabajo al interrumpir un proceso y coordinar cambios en artefactos con el historial del agente. Los modelos virtuales también permiten estudiar políticas de modelo y esfuerzo por solicitud.

**Aspectos que requieren adaptación:** el valor predeterminado de Durable incluye todas las extensiones instaladas; el host debe seleccionar las pertinentes. El almacenamiento documentado tiene un único proceso propietario. El reemplazo de una extensión deja a las ejecuciones que ya capturaron su implementación usando esa versión. La API de Durable está marcada como experimental.

**Fuentes:** [repositorio](https://github.com/earendil-works/pi), [Pi Durable en la revisión estudiada](https://github.com/earendil-works/pi/blob/381a2d8eb62b9f7e4c710cf66aa516f8a92cb9bd/packages/durable/README.md), [registro de extensiones](https://github.com/earendil-works/pi/blob/381a2d8eb62b9f7e4c710cf66aa516f8a92cb9bd/packages/durable/src/harness/registry.ts), [pruebas del registro](https://github.com/earendil-works/pi/blob/381a2d8eb62b9f7e4c710cf66aa516f8a92cb9bd/packages/durable/test/harness-registry.test.ts), [pruebas de recuperación de herramientas](https://github.com/earendil-works/pi/blob/381a2d8eb62b9f7e4c710cf66aa516f8a92cb9bd/packages/durable/test/harness-tools-recovery.test.ts), [modelos virtuales](https://pi.dev/docs/latest/virtual-models).

### H02. DeepSeek Harness

**Tipo:** runtime extensible y SDK para agentes. **Licencia:** MIT. **Revisión:** código; commit `d743267388641bc76f17c45ce8b4c231aed1d32c`, versión `0.2.1-alpha.2`.

Compone el sistema mediante plugins sobre Cordis: bucle de agente, adaptador de modelo, herramientas, sesiones y servicios participan del mismo mecanismo. Los perfiles reúnen plugins y configuración; los scopes agrupan contribuciones y permiten retirarlas al disponer su propietario. El registro de herramientas incorpora liberación y restricciones por agente.

El SDK arranca un proceso `dsh` de la misma versión y lo controla por JSON-RPC sobre stdio. Incluye ejecución, eventos y acceso a servicios. Su adaptador `llm-pi-ai` reutiliza la capa de proveedores de Pi.

**Consulta para Everett:** composición de capacidades, dependencias entre plugins, ciclo de vida por mundo o ejecución, y límites entre un host de producto y el motor de agentes. También permite examinar cuánto código compartir con Pi al comparar ambos proyectos.

**Aspectos que requieren adaptación:** los scopes operan entre plugins confiables dentro del proceso; el aislamiento de usuarios y la ejecución de código externo requieren un límite adicional. El resultado del SDK espera la inactividad del agente; una interfaz con mensajes encolados, steering o varias solicitudes necesita correlacionar sus operaciones. La revisión estudiada es una preview y utiliza una variante de Cordis incluida en el proyecto.

**Fuentes:** [arquitectura](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/architecture.md), [Cordis](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/cordis-primer.md), [scopes](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/scope/README.md), [herramientas](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/tools/src/index.ts), [SDK](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/sdk/client/README.md), [adaptador de Pi](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/llm/llm-pi-ai/README.md).

### H03. fx y libfx

**Tipo:** CLI y biblioteca de ejecución de agentes de Vercel Labs. **Licencia:** Apache-2.0. **Revisión:** código; commit `ffa755693c703a6a9cd5cad069bc1796cd18ad6e`.

El motor está escrito en Zig. `libfx` lo expone mediante un addon de Node.js y una alternativa Wasm. El SDK ofrece sesiones, turnos, eventos con cursor, checkpoints, steering y reanudación. Persiste las entradas antes de aceptarlas y utiliza identificadores de mensajes y ejecuciones de herramientas para coordinar reintentos y efectos.

La CLI incorpora descubrimiento progresivo de skills y herramientas. En el adaptador MCP del SDK inspeccionado, la lista de herramientas se carga de forma estática y tiene un máximo de 64.

**Consulta para Everett:** tamaño y separación del motor, streaming recuperable, interrupciones, reintentos y ejecución durable. Su integración con Vercel Workflow permite estudiar otra forma de alojar ejecuciones persistentes.

**Aspectos que requieren adaptación:** la persistencia depende del backend elegido; el almacenamiento en memoria del navegador dura lo que la página y el almacenamiento de archivos necesita una ubicación configurada para conservarse. La API pública inspeccionada no expone un hook de transformación de contexto equivalente al de Pi Durable. La revisión ofrece binarios nativos para macOS/Linux y una alternativa Wasm con JSPI.

**Fuentes:** [SDK](https://github.com/vercel-labs/fx/blob/ffa755693c703a6a9cd5cad069bc1796cd18ad6e/sdk/README.md), [API pública](https://github.com/vercel-labs/fx/blob/ffa755693c703a6a9cd5cad069bc1796cd18ad6e/sdk/types/libfx.d.cts), [adaptador MCP](https://github.com/vercel-labs/fx/blob/ffa755693c703a6a9cd5cad069bc1796cd18ad6e/sdk/mcp.js), [repositorio](https://github.com/vercel-labs/fx).

### H04. OpenCode

**Tipo:** agente de programación con servidor, clientes y SDK. **Licencia del repositorio:** MIT. **Revisión:** documentación de V1 y de V2; código de V2 pendiente de inspección.

V1 expone un servidor HTTP y un SDK TypeScript generado desde OpenAPI. La documentación específica de V2 incorpora mecanismos adicionales:

- Plugins con identidad estable, `setup(ctx)`, almacenamiento propio y liberación de sus registros al descargarse. Los hooks y transforms pueden retirarse individualmente; los catálogos por dominio admiten cambios y recarga.
- Hooks distintos para admisión de prompts, contexto inmediatamente anterior a una llamada de modelo, compactación y solicitudes HTTP. Una transformación que deba afectar otros tipos de llamada necesita registrarse en sus hooks correspondientes.
- `@opencode/sdk` para alojar el motor dentro de una aplicación, con llamadas en memoria, sesiones y eventos. Permite registrar plugins al iniciar y durante la vida del host.
- Warming opcional: llamadas periódicas para conservar caché del proveedor durante pausas. El prompt es transitorio y la respuesta se descarta; esas llamadas consumen recursos del proveedor.

**Consulta para Everett:** composición y retiro de capacidades, transformación del contexto, host embebido frente a servidor remoto y política de continuidad/caché entre turnos.

**Pendiente:** fijar una revisión de V2 y estudiar su implementación, persistencia y despliegue. La migración de plugins desde V1 requiere adaptar el código a sus contratos de registro y ciclo de vida.

**Fuentes:** [repositorio](https://github.com/anomalyco/opencode), [licencia](https://github.com/anomalyco/opencode/blob/v1.19.3/LICENSE), [SDK de V1](https://opencode.ai/docs/sdk/), [plugins de V2](https://dev.opencode.ai/v2/docs/plugins/), [migración de plugins y hooks](https://dev.opencode.ai/v2/docs/build/plugins/migrate-v1), [SDK embebible de V2](https://dev.opencode.ai/v2/docs/build/sdk/), [warming](https://dev.opencode.ai/v2/docs/warming/).

### H05. Harness2

**Tipo:** sistema de investigación para mejorar harnesses. **Licencia:** Apache-2.0. **Revisión:** documentación.

Harness², de Google Research, propone dos ciclos de mejora. Uno genera y compara cambios de harness para la tarea actual; otro conserva configuraciones y lecciones obtenidas entre tareas. Los componentes editables incluyen instrucciones, guardrails, memoria, orientación de herramientas, subagentes, skills, scripts y plugins. El repositorio incluye ejecutores para OpenCode y Codex.

**Consulta para Everett:** cómo experimentar con políticas de contexto y capacidades, conservar procedimientos útiles y vincular una modificación del harness con evidencia de sus resultados.

**Pendiente:** estudiar el selector de candidatos y su costo de ejecución. Las comparaciones publicadas utilizan entornos de evaluación específicos; la mejora en tareas con documentos compartidos, permisos y efectos externos requiere una evaluación propia.

**Fuentes:** [repositorio y descripción del método](https://github.com/google-research/harness2), [artículo](https://arxiv.org/abs/2610.14224).

## Memoria, conocimiento y vigencia

### M01. Hy Memory

**Tipo:** motor de memoria y SDK Python de Tencent Hunyuan. **Licencia del código:** Apache-2.0. **Revisión:** README y licencia de Hy Memory 2.0, SDK `2.0.3`.

Ofrece tres pipelines:

- **Chat:** conversaciones originales, hechos versionados, resúmenes, esquemas e intenciones con vencimiento. Combina extracción y reconciliación con una evolución de memoria activada mediante `evolve()` en el modo `ultra`.
- **Working:** hechos de lo realizado en una sesión y experiencias reutilizables. Mantiene enlaces entre las experiencias y los hechos de origen.
- **Coding:** agrega a Working una cadena de versiones con diffs y coordenadas de archivos, funciones y ramas. La recuperación selecciona hechos y adjunta la evolución del código relacionado.

Permite separar por usuario, workspace, rama y aplicación de origen. Los modos `lite`, `pro` y `ultra` cambian el trabajo realizado y sus dependencias. Working/Coding requieren trazas con llamadas de herramientas y funcionan en `pro`/`ultra`. MemHub es una aplicación de escritorio y CLI construida sobre el motor para reunir memoria de distintas herramientas.

**Consulta para Everett:** separar estado de trabajo, experiencias reutilizables y preferencias; actualizar recuerdos a partir de operaciones reales; conservar procedencia y evolución. La cadena de cambios de Coding puede orientar una evaluación equivalente sobre revisiones de Docs, Code y Canvas.

**Pendiente:** examinar el código de reconciliación, aislamiento y actualización concurrente. El almacenamiento documentado combina índices vectoriales, SQLite y un grafo según el modo; hay que evaluar su operación en un servicio con múltiples mundos. El modelo de escritura `Hy-Memory-30B-A3B` es un componente adicional cuya ficha y requisitos deben revisarse por separado.

**Fuentes:** [repositorio y arquitectura](https://github.com/Tencent-Hunyuan/Hy-Memory), [Working y Coding](https://github.com/Tencent-Hunyuan/Hy-Memory/blob/main/docs/scene_coding_usage.md), [guía de uso](https://github.com/Tencent-Hunyuan/Hy-Memory/blob/main/docs/usage.md), [MemHub](https://github.com/Tencent-Hunyuan/Hy-Memory/blob/main/memhub/README.md), [modelo de escritura](https://huggingface.co/tencent/Hy-Memory-30B-A3B), [licencia](https://github.com/Tencent-Hunyuan/Hy-Memory/blob/main/LICENSE).

### M02. Operator Memory

**Tipo:** memoria documental con adaptadores para harnesses. **Licencia:** BSD-3-Clause. **Revisión:** documentación y código de adaptadores; commit `2aa82652c998ab1b376577b531799e7feab9b43c`.

Organiza Markdown en espacios personales, privados del proyecto y compartidos. Un preámbulo e índices orientan al agente; las indicaciones `read_if` permiten recuperar documentos cuando se cumple una condición. Las instrucciones del flujo de trabajo indican cuándo mantener el contenido.

**Consulta para Everett:** una entrada compacta al conocimiento de un mundo, descubrimiento progresivo y separación de preferencias personales y conocimiento compartido.

**Aspectos que requieren adaptación:** las actualizaciones dependen del cumplimiento del flujo por el agente. Los adaptadores inspeccionados conservan el preámbulo por sesión o agente; los cambios de conocimiento durante la ejecución necesitan una política de invalidación. La jerarquía de autoridad de sus documentos debe contrastarse con las reglas de Everett.

**Fuentes:** [repositorio y documentación de la revisión estudiada](https://github.com/aerovato/operator-memory/tree/2aa82652c998ab1b376577b531799e7feab9b43c), [adaptador de Pi](https://github.com/aerovato/operator-memory/blob/2aa82652c998ab1b376577b531799e7feab9b43c/packages/pi/src/index.ts), [adaptador de DeepSeek](https://github.com/aerovato/operator-memory/blob/2aa82652c998ab1b376577b531799e7feab9b43c/packages/deepseek/src/index.ts).

### M03. Engram de Gentleman Programming

**Tipo:** servicio de memoria en Go, con CLI, HTTP, MCP y TUI. **Licencia:** MIT. **Revisión:** documentación; commit `f3f5aa789b0fcc5fcb520b4a1b910bbf1611655c`.

Utiliza SQLite y FTS5, con búsqueda vectorial opcional. Permite acotar por proyecto y sesión, buscar vistas breves y recuperar por identificador el contenido completo. Incluye claves de tema para actualizar una misma memoria, versiones, deduplicación y relaciones de procedencia, conflicto y reemplazo. Los plazos de revisión permiten señalar recuerdos que requieren comprobación.

**Consulta para Everett:** identidad estable para un hecho o decisión, historial de cambios, recuperación con presupuesto limitado y relaciones entre una memoria y sus fuentes.

**Pendiente:** comprobar cómo conservar los identificadores y revisiones de los objetos de Everett al ingresar datos y cómo se resuelven escrituras concurrentes. El plazo de revisión requiere una acción posterior que compruebe o actualice el contenido.

**Fuentes:** [repositorio](https://github.com/Gentleman-Programming/engram), [documentación de la revisión estudiada](https://github.com/Gentleman-Programming/engram/blob/f3f5aa789b0fcc5fcb520b4a1b910bbf1611655c/DOCS.md).

### M04. Engram de blakestone-x

**Tipo:** memoria en TypeScript basada en un vault Markdown. **Licencia:** MIT. **Revisión:** documentación; commit `8afb2072709f697cc777713522bf47324055eff3`, versión `0.3`.

Separa memoria de trabajo, episódica, semántica y procedural. Combina recuperación BM25F, fuerza y retención, con embeddings opcionales. Modela decaimiento según tiempo y estabilidad, refuerzo por acceso y protección por importancia. Permite previsualizar y aplicar consolidaciones, conservar procedencia y marcar memorias reemplazadas o deprecadas.

**Consulta para Everett:** la idea de decaimiento planteada en la conversación, consolidación de episodios y conservación de procedimientos útiles. Sus campos de vigencia y reemplazo permiten estudiar por separado la prioridad de recuperación y la validez de un hecho.

**Aspectos que requieren adaptación:** los filtros de scope limitan la recuperación; el servicio que lo integre debe aplicar los permisos de acceso. Falta comprobar el comportamiento con cambios de decisiones, reactivación de un mundo y referencias a contenido revisado o eliminado.

**Fuentes:** [README de la revisión estudiada](https://github.com/blakestone-x/engram/blob/8afb2072709f697cc777713522bf47324055eff3/README.md), [modelo de memoria](https://github.com/blakestone-x/engram/blob/8afb2072709f697cc777713522bf47324055eff3/docs/MEMORY-MODEL.md), [arquitectura](https://github.com/blakestone-x/engram/blob/8afb2072709f697cc777713522bf47324055eff3/docs/ARCHITECTURE.md).

### M05. Graphiti

**Tipo:** motor de grafos temporales para memoria y recuperación. **Licencia:** Apache-2.0. **Revisión:** documentación; commit `8d8a12a22452cbef9335792afb73b8cbfe6a79fa`.

Incorpora episodios, extrae entidades y relaciones y conserva información temporal y procedencia. Combina búsqueda semántica, textual y recorrido del grafo. Sus grupos permiten separar conjuntos de datos.

**Consulta para Everett:** recuperar relaciones entre decisiones, objetivos, personas y artefactos; consultar cómo cambió un hecho y qué evidencia lo sostiene. Puede compararse con una memoria documental cuando las relaciones temporales resultan necesarias.

**Aspectos que requieren evaluación:** requiere extracción mediante modelos, embeddings y un backend de grafos. Hay que comprobar la reconciliación de información y la propagación de cambios de las fuentes, además de aplicar autorización sobre los grupos consultables.

**Fuente:** [repositorio y documentación de la revisión estudiada](https://github.com/getzep/graphiti/tree/8d8a12a22452cbef9335792afb73b8cbfe6a79fa).

### M06. Mastra Memory y Observational Memory

**Tipo:** componentes de memoria de un framework TypeScript. **Licencia de `@mastra/memory`:** Apache-2.0. **Revisión:** documentación.

La memoria distingue recurso y thread. Ofrece historial, memoria de trabajo y recuperación semántica. Observational Memory utiliza un observador para convertir mensajes antiguos en observaciones y un reflector para condensarlas cuando crecen. Los scopes de los mecanismos se configuran según el componente; la documentación consultada utiliza thread como valor predeterminado de Observational Memory.

**Consulta para Everett:** separar conocimiento compartido del mundo y continuidad de una conversación o ejecución; estudiar cuándo condensar contexto y cuánto trabajo realizar en segundo plano.

**Pendiente:** comprobar qué enlaces con las fuentes originales conserva cada transformación, cómo invalidar observaciones ante cambios de documentos y qué ocurre cuando varias conversaciones actualizan información compartida.

**Fuentes:** [memoria](https://mastra.ai/docs/memory/overview), [Observational Memory](https://mastra.ai/docs/memory/observational-memory), [repositorio](https://github.com/mastra-ai/mastra).

### M07. Mem0

**Tipo:** biblioteca y servicio de memoria. **Licencia del código abierto:** Apache-2.0. **Revisión:** documentación; commit `d26ba5e4518cef7fff3c66d4f715b21adf9feabe`.

Proporciona operaciones para agregar, buscar, actualizar, eliminar y consultar el historial de memorias. Permite asociar identificadores y metadatos a los registros; la biblioteca configura modelos, embeddings y almacenamiento.

**Consulta para Everett:** comparar una API de memoria existente con las necesidades de escritura, recuperación e historial por mundo, usuario y agente.

**Pendiente:** examinar la extracción y actualización del componente elegido, el enlace con objetos de producto y las diferencias entre biblioteca autogestionada y plataforma alojada. La correspondencia entre sus scopes y los mundos de Everett debe definirse en la integración.

**Fuente:** [repositorio de la revisión estudiada](https://github.com/mem0ai/mem0/tree/d26ba5e4518cef7fff3c66d4f715b21adf9feabe).

## Selección de modelos y proveedores

### R01. Jev y sus routers

**Tipo:** modelo de decisión y proyectos de enrutamiento que lo utilizan. **Revisión:** documentación.

Jev, de TypeSafe, expone decisiones tipadas a partir de un estado y opciones: elección, puntuación y decisión de sí/no, con probabilidades o confianza según la operación. Hay varias implementaciones de router con objetivos diferentes:

| Proyecto                                                                    | Mecanismo documentado                                                                                                                                                                                                  | Licencia publicada | Consulta para Everett                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| [BillionsBobby/JevRouter](https://github.com/BillionsBobby/JevRouter)       | Catálogo de modelos, herramientas, skills, subagentes, servidores MCP, CLIs y plugins de DSH. Devuelve decisiones y planes; filtra disponibilidad y permisos y utiliza descubrimiento jerárquico en catálogos grandes. | MIT                | Selección de capacidades además de modelos; resultado de decisión inspeccionable antes de ejecutar. |
| [nautahakk/jev-codex-router](https://github.com/nautahakk/jev-codex-router) | Plugin de DeepSeek Harness que selecciona modelo y esfuerzo por prompt, con límites, alternativas y reutilización de la decisión en continuaciones breves.                                                             | MIT                | Integración concreta de un router en el ciclo de un harness.                                        |
| [prismhq/jev-router](https://github.com/prismhq/jev-router)                 | Integración con LiteLLM; selección entre modelos elegibles y criterio de costo, con uso opcional de Jev.                                                                                                               | MIT                | Separación entre gateway, catálogo elegible y decisión del modelo.                                  |
| [dirien/jev-router](https://github.com/dirien/jev-router)                   | Proxy para Anthropic Messages y OpenAI Responses; decisión por turno humano y escalamiento dentro de la sesión.                                                                                                        | Apache-2.0         | Política de continuidad de sesión y relación entre cambios de modelo y caché.                       |

**Pendiente:** verificar compatibilidad de versiones en los adaptadores y medir decisiones con tareas de Everett. El plugin de `nautahakk` documenta una versión de DSH distinta de la revisada en H02. El uso del servicio Jev y la licencia del código de cada router son aspectos separados; falta identificar una distribución de pesos si se quisiera alojar ese modelo.

**Fuente del modelo y la API:** [documentación de TypeSafe](https://docs.typesafe.ai/introduction). Las fuentes de implementación están enlazadas en la tabla.

### R02. Span-02

**Tipo:** modelo de decisión y motor de inferencia de Respan AI. **Licencia publicada:** Apache-2.0. **Revisión:** documentación y ficha del modelo.

Recibe texto, estado JSON e imágenes y produce decisiones tipadas: elección, sí/no, puntuación o número. Permite especificar un presupuesto de latencia. La ficha lo describe como un ajuste de Gemma 4 26B-A4B y publica pesos junto con un motor Rust/CUDA.

**Consulta para Everett:** selección de modelo, esfuerzo o herramienta a partir del estado de una tarea y evaluación de decisiones que necesitan observar una superficie visual.

**Restricción técnica documentada:** la distribución utiliza su motor propio y requisitos específicos de GPU; la ficha indica que esos pesos no se ejecutan directamente con Transformers o vLLM. Hay que comparar el costo de alojarlo con alternativas por API y con reglas deterministas.

**Fuentes:** [ficha y distribución](https://huggingface.co/respanai/span-02), [descripción de Respan](https://www.respan.ai/blog/introducing-span-2).

### R03. vLLM Semantic Router

**Tipo:** capa de enrutamiento y políticas para servicios de modelos. **Licencia:** Apache-2.0. **Revisión:** documentación; commit `003eb41222b35bbba77912c955afd4269ac8fe8e`.

Combina señales, reglas y modelos auxiliares para clasificar solicitudes y decidir su destino. Permite definir políticas y conectar proveedores alojados o locales. La capa de decisión está implementada principalmente en Go.

**Consulta para Everett:** políticas explícitas que combinen tipo de tarea, capacidades disponibles, restricciones y selección de proveedor; comparación entre decisiones aprendidas y reglas configuradas.

**Pendiente:** identificar el subconjunto de componentes necesario y medir calidad, latencia de decisión y operación del servicio con solicitudes que contienen contexto recuperado y herramientas.

**Fuentes:** [repositorio de la revisión estudiada](https://github.com/vllm-project/semantic-router/tree/003eb41222b35bbba77912c955afd4269ac8fe8e), [documentación](https://vllm-sr.ai).

### R04. RouteLLM

**Tipo:** biblioteca, servidor y evaluación de routers. **Licencia:** Apache-2.0. **Revisión:** documentación.

Permite entrenar y evaluar enrutamiento a partir de preferencias entre modelos y ajustar un umbral entre un modelo fuerte y uno económico. Incluye implementaciones y un servidor compatible con la API de OpenAI.

**Consulta para Everett:** construir un conjunto de tareas para calibrar la relación entre costo y resultado y comparar el router contra baselines medibles.

**Aspecto que requiere adaptación:** los ejemplos y umbrales dependen de los pares de modelos y datasets utilizados. Una política para Everett necesita calibración sobre sus tareas y modelos elegibles.

**Fuente:** [repositorio y documentación](https://github.com/lm-sys/RouteLLM).

### R05. LiteLLM

**Tipo:** SDK y gateway de modelos. **Licencia:** MIT en el núcleo; componentes empresariales con licencia propia. **Revisión:** documentación de routing.

Unifica acceso a proveedores y ofrece balanceo, límites, reintentos, alternativas ante fallos y estrategias de costo o latencia. Puede alojar la capa de transporte detrás de una política de selección como las de las fichas anteriores.

**Consulta para Everett:** separar la decisión de qué modelo usar de la operación de proveedores, credenciales, capacidad y fallos.

**Pendiente:** determinar qué funciones del gateway necesita Everett y a qué edición pertenecen, junto con el estado que debe compartir entre instancias.

**Fuentes:** [routing](https://docs.litellm.ai/docs/routing), [repositorio y licencia](https://github.com/BerriAI/litellm).

## Búsqueda y recuperación

### B01. EmbeddingGemma 2

**Tipo:** modelo de embeddings multimodales de Google. **Licencia publicada:** Apache-2.0. **Revisión:** ficha y documentación.

Representa texto, código, imágenes, audio y video en un espacio compartido. Su diseño permite cargar las modalidades necesarias y elegir dimensiones de salida mediante representaciones Matryoshka.

**Consulta para Everett:** recuperar materiales de Canvas y otras superficies usando consultas que atraviesen modalidades, y comparar un índice compartido con índices especializados.

**Pendiente:** evaluar español, documentos largos, capturas de interfaces y material del producto; fijar chunking, metadatos y revisión de la fuente. La representación vectorial necesita acompañarse de filtros de acceso y vigencia en el sistema que la utilice.

**Fuentes:** [ficha del modelo](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2), [uso multimodal con Sentence Transformers](https://ai.google.dev/gemma/docs/embeddinggemma/multimodal-embeddinggemma-with-sentence-transformers).

### B02. Evoke

**Tipo:** recuperación textual sobre PostgreSQL. **Licencia:** Apache-2.0. **Revisión:** documentación; proyecto en beta.

Combina BM25 con un encoder semántico disperso opcional en el mismo índice. Mantiene cambios léxicos en transacciones y procesa la convergencia semántica en segundo plano.

**Consulta para Everett:** búsqueda por términos exactos, nombres, identificadores y significado sobre documentos y registros, conservando las posibilidades de filtrado de PostgreSQL.

**Aspecto que requiere evaluación:** durante una actualización puede haber diferencia entre la disponibilidad del contenido para búsqueda léxica y semántica. Hay que medir ese intervalo y la recuperación de cambios recientes en tareas reales.

**Fuente:** [repositorio y descripción técnica](https://github.com/Intelligent-Internet/Evoke).

## Protocolos, formatos y comunicación

### P01. Model Context Protocol (MCP)

**Tipo:** protocolo para conectar hosts y servidores de capacidades. **Revisión:** especificación de herramientas `2026-07-28`.

Define descubrimiento, esquemas y llamadas de herramientas, junto con notificaciones de cambios de lista. El host puede mantener el catálogo disponible y seleccionar qué herramientas presenta en cada solicitud al modelo.

**Consulta para Everett:** integrar proveedores de herramientas mediante un contrato común y actualizar catálogos de capacidades. Hay que decidir cómo mapear identidades, permisos y ciclo de vida del servidor con cada mundo y ejecución.

**Fuente:** [especificación de herramientas](https://modelcontextprotocol.io/specification/2026-07-28/server/tools).

### P02. Agent Skills

**Tipo:** formato de instrucciones y recursos para agentes. **Revisión:** especificación.

Utiliza metadatos breves para descubrir una skill; su cuerpo y recursos se cargan al necesitarse. Permite empaquetar procedimientos, referencias y scripts con un punto de entrada común.

**Consulta para Everett:** catálogo ligero de capacidades y carga progresiva de instrucciones. Su integración con el harness debe definir activación, duración, actualización y retiro del contexto de las llamadas posteriores.

**Fuente:** [especificación](https://agentskills.io/specification).

### P03. AG-UI

**Tipo:** protocolo de eventos entre agentes e interfaces. **Licencia del proyecto:** MIT. **Revisión:** documentación de eventos.

Describe eventos de ejecución, pasos, mensajes y herramientas, junto con snapshots y deltas de estado. Proporciona una base para transmitir avances de un agente a una interfaz con estado.

**Consulta para Everett:** representar ejecuciones entre Sessions, Agents y las superficies donde se realizan cambios, manteniendo identificadores de ejecución y operación. Conviene comparar sus eventos con los que ya exponga el harness elegido.

**Pendiente:** revisar el contrato de reconexión, orden y recuperación requerido por Everett y distinguir eventos estables de extensiones propuestas.

**Fuentes:** [eventos](https://docs.ag-ui.com/concepts/events), [repositorio](https://github.com/ag-ui-protocol/ag-ui).

### P04. Agent Client Protocol (ACP)

**Tipo:** protocolo entre clientes de edición y agentes. **Licencia del proyecto:** Apache-2.0. **Revisión:** documentación introductoria.

Define una conexión basada en JSON-RPC para sesiones de agentes, actualizaciones, acceso a archivos e intervenciones del cliente. Su integración habitual utiliza stdio.

**Consulta para Everett:** conectar Code con agentes externos y compartir un contrato de sesión, edición y permisos.

**Pendiente:** verificar las capacidades de transporte de la revisión que se seleccione y su encaje con un runtime alojado en la nube.

**Fuentes:** [introducción](https://agentclientprotocol.com/get-started/introduction), [repositorio](https://github.com/agentclientprotocol/agent-client-protocol).

## Observabilidad y evaluación

### E01. AgentPlay

**Tipo:** parsers, formato y visualizador de ejecuciones. **Licencia:** Apache-2.0. **Revisión:** documentación.

Convierte transcripts de agentes de programación en una representación `agentplay/v1` y una línea de tiempo visual. Permite inspeccionar lecturas, ediciones, llamadas, errores, consumo y compactaciones según los datos de origen. Separa el núcleo TypeScript de la interfaz React.

**Consulta para Everett:** diagnóstico de ejecuciones en Agents/Sessions, visualización de qué contexto se consultó y relación entre operaciones y artefactos modificados.

**Pendiente:** comparar el formato con los eventos del harness y con los identificadores de objetos de Everett. La fidelidad de la visualización depende de lo que registre la fuente.

**Fuente:** [repositorio, formato y visualizador](https://github.com/Entelligence-AI/agentplay).

### E02. OpenTelemetry GenAI

**Tipo:** convenciones semánticas para telemetría de sistemas de IA. **Licencia del proyecto:** Apache-2.0. **Revisión:** documentación del repositorio.

Define atributos y convenciones para spans, métricas y eventos de operaciones de modelos y herramientas. Permite vincular solicitudes, tiempos, consumo y operaciones dentro de una traza.

**Consulta para Everett:** instrumentación que permita comparar harnesses, políticas de contexto, routers y proveedores mediante identificadores comunes.

**Pendiente:** fijar la versión de las convenciones utilizadas y definir el contenido que se registra de prompts, respuestas y resultados de herramientas, su acceso y conservación.

**Fuente:** [convenciones GenAI](https://github.com/open-telemetry/semantic-conventions-genai).

### E03. Langfuse

**Tipo:** observabilidad, gestión de prompts y evaluación. **Licencia:** MIT salvo las áreas empresariales indicadas en `LICENSE`. **Revisión:** documentación y licencia; commit `ac2f8309c0a4139a51e96fd5642190f6db62f402`.

Reúne trazas de llamadas, herramientas, consumo, latencia y costo; también ofrece datasets, evaluaciones y versiones de prompts.

**Consulta para Everett:** comparar ejecuciones y localizar si un fallo proviene de la recuperación, la selección de capacidades, el modelo o una herramienta.

**Restricción de distribución:** los directorios `ee/`, `web/src/ee/` y `worker/src/ee/` tienen condiciones empresariales separadas. La selección de funciones y despliegue debe contrastarse con esa división.

**Fuentes:** [observabilidad](https://langfuse.com/docs/observability/overview), [licencia de la revisión estudiada](https://github.com/langfuse/langfuse/blob/ac2f8309c0a4139a51e96fd5642190f6db62f402/LICENSE).

### E04. Promptfoo

**Tipo:** CLI y biblioteca de evaluación. **Licencia:** MIT. **Revisión:** documentación; commit `720657dab1e8b6880cd4a9c223e12db4a8c0fe21`.

Ejecuta casos sobre prompts, proveedores y agentes, con datasets y aserciones para comparar resultados.

**Consulta para Everett:** construir pruebas repetibles para recuperación de decisiones vigentes, selección de contexto, elección de modelos y ejecución de capacidades. Las tareas con cambios de estado necesitan fixtures y comprobaciones del resultado en las superficies afectadas.

**Fuente:** [repositorio de la revisión estudiada](https://github.com/promptfoo/promptfoo/tree/720657dab1e8b6880cd4a9c223e12db4a8c0fe21).

## Capacidades de edición y producción

### C01. OpenDesign

**Tipo:** aplicación de producción de contenido con agentes, plugins y skills. **Licencia:** Apache-2.0. **Revisión:** documentación.

Reúne producción de interfaces, presentaciones, imágenes y video en un workspace. Integra DeepSeek Harness mediante su CLI oficial, con streaming estructurado, descubrimiento de modelos, cancelación y reanudación. Incluye HyperFrames como parte de sus capacidades de motion.

**Consulta para Everett:** estudiar la integración entre un workspace visual, artefactos de distintos tipos y un runtime de agentes; cómo se descubren y presentan capacidades dentro del producto.

**Pendiente:** examinar la propiedad de los artefactos, las transacciones de edición y la forma en que la interfaz aplica o rechaza resultados del agente.

**Fuente:** [repositorio y arquitectura de integración](https://github.com/nexu-io/open-design).

### C02. OpenPencil

**Tipo:** editor de diseño programable. **Licencia:** MIT. **Revisión:** documentación.

Trabaja con formatos `.fig` y `.pen` y expone operaciones mediante SDK, CLI, MCP y ejecución headless. Las herramientas de IA y la edición manual operan sobre los nodos del documento. Incluye exportación de código y tokens de diseño.

**Consulta para Everett:** artefactos visuales que puedan editar tanto la persona como el agente, identidad compartida de objetos e incorporación de una capacidad de diseño programática.

**Pendiente:** revisar qué subconjunto de edición y formatos necesita Everett, la fidelidad de importación/exportación y el contrato para aplicar cambios sobre revisiones concurrentes.

**Fuente:** [repositorio y documentación](https://github.com/open-pencil/open-pencil).

### C03. HyperFrames

**Tipo:** motor y herramientas de composición de video con HTML/CSS y medios. **Licencia:** Apache-2.0. **Revisión:** documentación.

Representa escenas y animaciones con una línea de tiempo que permite posicionarse en un instante y renderizar a MP4. Incluye CLI, editor, skills y opciones para workers de renderizado.

**Consulta para Everett:** capacidad de producir y revisar video a partir de un artefacto editable; ejecución de renderizados prolongados con resultados recuperables.

**Pendiente:** estudiar determinismo del render, dependencias de medios, almacenamiento de assets, cancelación y costo de workers en la nube.

**Fuente:** [repositorio y documentación](https://github.com/heygen-com/hyperframes).

### C04. treg y WebAccess

**Tipo:** catálogo, descubrimiento y acceso a herramientas externas. **Licencia:** código disponible con condiciones adicionales a Apache-2.0. **Revisión:** README y `LICENSE`.

Treg permite descubrir herramientas por tarea y ejecutar endpoints de distintos proveedores. También admite credenciales del equipo, CLIs y skills, con secretos conservados en el servidor. WebAccess presenta una capa de acceso web con selección de proveedores y alternativas ante fallos. La interfaz incluye información de costos y límites por llamada.

**Consulta para Everett:** descubrimiento de capacidades externas a demanda, ocultamiento de credenciales al agente, adaptación de proveedores y atribución del costo de una operación.

**Condición relevante para Everett:** la licencia exige autorización escrita previa para ofrecer el software como servicio alojado o gestionado, o como componente de un servicio comercial para terceros. Cualquier evaluación de incorporación comercial debe partir de esa condición.

**Fuentes:** [repositorio](https://github.com/superdesigndev/treg), [WebAccess](https://treg.to/web-access), [licencia](https://github.com/superdesigndev/treg/blob/main/LICENSE).

## Modelos pequeños para tareas auxiliares

### N01. Bonsai 2

**Tipo:** familia de modelos de PrismML con cuantización ternaria, tamaños 2B, 4B y 9B. **Licencia publicada:** Apache-2.0. **Revisión:** fichas de distribución.

La familia deriva de Qwen 3.5. El archivo de pesos de lenguaje de 2B en formato PTQ1_0 ocupa aproximadamente 0,43 GB; otras cuantizaciones y los componentes visuales tienen tamaños diferentes. PrismML mantiene soporte específico en su variante de `llama.cpp`.

**Consulta para Everett:** modelos auxiliares alojados para clasificación, extracción o decisiones acotadas, comparando costo y calidad con alternativas por API.

**Pendiente:** comprobar la compatibilidad del runtime con la cuantización elegida, memoria total de ejecución y calidad en español y tareas específicas. El tamaño del archivo corresponde a los pesos publicados de esa variante.

**Fuentes:** [colección Bonsai 2](https://huggingface.co/collections/prism-ml/bonsai-2-small), [modelo de 2B y archivos GGUF](https://huggingface.co/prism-ml/Ternary-Bonsai-2-2B-gguf), [runtime de PrismML](https://github.com/PrismML-Eng/llama.cpp).

## Referencias identificadas pendientes de revisión

| Referencia                    | Capacidad anunciada                                  | Pregunta para Everett                                              | Fuente y verificación pendiente                                                                                                                           |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MiniCPM-V 4.7, OpenBMB        | Modelo multimodal.                                   | ¿Puede servir para comprensión visual de materiales y superficies? | [Anuncio de OpenBMB](https://x.com/OpenBMB/status/2109996566702633310). Localizar ficha de esta versión, pesos, licencia y requisitos.                    |
| Fluid Speech Mini, FluidVoice | Modelo de dictado derivado de Parakeet.              | ¿Qué ofrece para entrada de voz?                                   | [Anuncio de FluidVoice](https://x.com/FluidVoiceApp/status/2110060621886816593). Localizar repositorio, modelo, idiomas y condiciones de distribución.    |
| Indra OCR, Vik Paruchuri      | Extracción de texto de documentos.                   | ¿Cómo recupera estructura y coordenadas para citar materiales?     | [Anuncio del autor](https://x.com/VikParuchuri/status/2110058905875460393). Revisar implementación, formatos, licencia y preservación de estructura.      |
| Yap                           | Captura de pantalla/cámara y procesamiento de video. | ¿Qué primitivas ofrece para observar y registrar trabajo visual?   | [Anuncio del autor](https://x.com/dzhng/status/2109827309217980849), [sitio del proyecto](https://justyap.io). Revisar API, código disponible y licencia. |

## Comparaciones que siguen abiertas

Estas preguntas conectan las referencias con necesidades ya planteadas para Everett:

| Necesidad                                  | Qué comparar               | Evidencia que hace falta                                                                                                                                       |
| ------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Componer capacidades durante una ejecución | H01–H04, M02, P01–P02, R01 | Activación y retiro por llamada, costo del catálogo, cambios con una herramienta en curso y recuperación tras una interrupción.                                |
| Reconocer el estado vigente de un mundo    | M01, M03, M05, M07         | Recuperar objetivo, decisiones y trabajo pendiente con enlaces a revisiones de Board, Docs y conversaciones; actualizar la respuesta cuando cambie una fuente. |
| Reducir contexto sin perder continuidad    | H01, H03, M01, M04, M06    | Retomar una tarea después de condensar historial y recuperar una decisión reemplazada con su vigencia correcta.                                                |
| Elegir modelo y esfuerzo                   | R01–R05, N01               | Calidad final de tareas, costo total, latencia y efecto del cambio de modelo en continuidad y caché.                                                           |
| Buscar entre superficies y modalidades     | B01–B02, M05               | Consultas en español, identificadores exactos, material multimodal y cambios recientes, con autorización aplicada.                                             |
| Mostrar y diagnosticar trabajo real        | P03–P04, E01–E04           | Eventos correlacionados, reconexión, acceso a fuentes utilizadas y comprobación de los cambios producidos.                                                     |
| Incorporar capacidades editables           | C01–C03                    | Formato persistente, edición manual y por agente, revisiones y aplicación de propuestas sobre el mismo artefacto.                                              |
