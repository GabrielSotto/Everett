# Desarrollo de Everett

## Organización del repositorio

| Ruta                                              | Contenido y uso                                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TAREAS.md`                                       | Estado de las iteraciones y fallos abiertos, agrupados por versión.                                                                                        |
| `src/`                                            | Código y recursos de la aplicación.                                                                                                                        |
| `tests/unit/`, `tests/browser/`, `tests/tooling/` | Pruebas mantenidas de lógica, interacción y del propio arnés.                                                                                              |
| `design/wireframe-library/`                       | Catálogo de diseño de bosquejos, separado de la aplicación. Fuentes, contratos de estados y recursos con licencia.                                         |
| `scripts/`                                        | Construcción, ejecución, verificación y empaquetado.                                                                                                       |
| `docs/`                                           | Producto, alcance, arquitectura, desarrollo y validación, cada uno en su documento. Los manifiestos JSON comprueban la recuperación de fuentes y recursos. |
| `docs/iteraciones/`                               | Contratos y criterios específicos que siguen siendo referencia de regresión.                                                                               |
| `Everett-0.7.5.html`                              | Original conservado como base verificable.                                                                                                                 |
| `entregas/<versión>/`                             | Entrega aprobada: ZIP con fuentes y evidencias, HTML y verificación de integridad.                                                                         |
| `output/`                                         | Resultados de trabajo reemplazables, según la política indicada abajo.                                                                                     |
| `dist/`                                           | HTML construido y manifiesto del build actual; se regeneran con `bun run build`.                                                                           |
| `node_modules/`                                   | Dependencias instaladas por Bun; se regeneran con `bun install --frozen-lockfile`.                                                                         |

`src/`, `tests/`, `scripts/`, la documentación y la configuración se versionan en Git. `entregas/`, `output/`, `dist/` y `node_modules/` son archivos locales excluidos de Git. Las entregas deben copiarse a un respaldo si se necesita conservarlas fuera de esta computadora.

## Conservación de resultados

- Cada grupo de pruebas conserva su última ejecución en `output/pruebas/unitarias/<fecha UTC>/` o `output/pruebas/navegador/<fecha UTC>/`. Al finalizar el siguiente intento se elimina el anterior, incluso si el nuevo falla. El diagnóstico del último fallo permanece disponible.
- El runner bloquea ejecuciones simultáneas del mismo grupo. Si una interrupción forzada deja `en-curso.json`, comprobar que el PID registrado y sus procesos de prueba hayan terminado antes de retirar ese archivo. La ejecución siguiente retira los resultados reemplazados.
- Los módulos compilados para las pruebas unitarias se crean en el directorio temporal del sistema y se eliminan al terminar.
- `output/revision/<versión>/` contiene la revisión visual y de alcance de la etapa activa. `output/informe/` contiene un único informe generado; `output/paquete/`, un único paquete candidato verificado. Se sustituyen al preparar la siguiente candidata. Tras aprobar y conservar una entrega, se eliminan esas copias de trabajo.
- Una entrega aprobada se conserva en `entregas/<versión>/`. Los runners y el empaquetador no escriben ni limpian esa carpeta. Antes de eliminar las copias de trabajo, comprobar el ZIP y sus archivos contra sus hashes.
- Los fallos abiertos se registran en [Tareas](../TAREAS.md). Los corregidos permanecen cubiertos por pruebas de regresión y por el historial de Git. No conservar una bitácora adicional, capturas de propuestas descartadas ni ejecuciones reemplazadas.

## Entorno

Usar Node.js 24.19 o posterior de la rama 24 y Bun 1.3.14 con el `bun.lock` del repositorio. PowerShell 7 (`pwsh`) ejecuta el empaquetador y sus controles negativos dentro de las pruebas de herramientas. Instalar las dependencias fijadas con:

```powershell
bun install --frozen-lockfile
```

Las fuentes TypeScript de aplicación y pruebas se comprueban con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, comprobación de código no utilizado y tipos de importación explícitos. Los scripts de construcción y evidencia utilizan módulos de Node.

## Comandos

| Comando                       | Resultado                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`                 | Vite en `http://127.0.0.1:4173/`, con HMR de estilos y recarga automática del código.                               |
| `bun run typecheck`           | Comprueba los tipos sin generar archivos.                                                                           |
| `bun run format:check`        | Comprueba el formato de fuentes, configuración y documentación.                                                     |
| `bun run format`              | Aplica el formato del proyecto.                                                                                     |
| `bun run test:unit`           | Ejecuta pruebas de dominio, servicios, navegación y controles negativos del arnés.                                  |
| `bun run test:design`         | Comprueba el catálogo de bosquejos: semántica de estados, variantes, composición, recursos y controles de revisión. |
| `bun run test:design:browser` | Recorre el catálogo servido por Vite, comprueba geometría, recursos y controles y guarda capturas para revisión.    |
| `bun run verify:unit`         | Contrasta una ejecución concreta con su salida TAP, los tests descubiertos, las fuentes actuales y la versión.      |
| `bun run build`               | Herramienta histórica de HTML autónomo; fuera del flujo cotidiano de Vite.                                          |
| `bun run verify:build`        | Comprueba una salida histórica de HTML autónomo, cuando se utiliza ese formato.                                     |
| `bun run test:browser`        | Ejecuta Playwright sobre las fuentes servidas por Vite; usa 4173 o `EVERETT_TEST_URL`.                              |
| `bun run verify:browser`      | Comprueba la vigencia del HTML, las fuentes del arnés, todos los casos descubiertos y sus adjuntos.                 |

`bun run recover` corresponde a la extracción inicial del HTML original. Rechaza sobrescribir archivos existentes y comprueba primero el hash de la base. El desarrollo cotidiano utiliza las fuentes mantenidas en `src/`.

## Desarrollo continuo

La instalación utiliza Bun y `bun.lock`; `package-lock.json` se conserva sincronizado como
metadato de compatibilidad para los verificadores históricos. No ejecutar npm para este flujo.
Los scripts invocan Node 24 para conservar el entorno comprobado del arnés.

La distribución interna usa `yoga-layout` 3.2.1 ([Yoga](https://www.yogalayout.dev/docs/about-yoga),
[licencia MIT](https://github.com/facebook/yoga/blob/v3.2.1/LICENSE)). Aporta cálculo mantenido de
filas, columnas y tamaños intrínsecos; evita implementar un motor Flexbox propio. No introduce
React ni controla el DOM. Su módulo WASM se prepara una vez antes de recuperar el documento;
un fallo de carga se informa sin sobrescribir el guardado. Cada cálculo libera sus nodos en
`finally`. El costo es el módulo WASM y el mantenimiento de su versión fijada; contenido,
identidades, reglas de validación y migración permanecen en Everett.

El trabajo cotidiano usa `bun run dev`. Vite 8.3.5 sirve los módulos TypeScript y CSS de
`src/` directamente, observa sus cambios y gestiona HMR. Los estilos se sustituyen sin recargar
la página; los cambios de código recargan automáticamente la aplicación DOM nativa y recuperan
el guardado local. No se conserva el historial de Undo en memoria a través de una recarga de
código. Confirmar las ediciones transitorias antes de cambiar código durante una revisión.
Un error de sintaxis mantiene la vista actual y muestra el diagnóstico; corregirlo reanuda la carga.

`vite.config.mjs` y `scripts/development.mjs` adaptan la plantilla y reutilizan el servicio de
enlaces en el mismo origen. PDF.js conserva su worker como texto mediante el import raw de Vite.
El servidor escucha solo en `127.0.0.1`, no cambia de puerto si 4173 está ocupado y no abre pestañas.
Mantener un único servidor cotidiano en 4173 para conservar el almacenamiento de revisión.
Las pruebas que necesitan otro servidor lo crean en un puerto efímero y lo cierran al terminar.

No generar un HTML autónomo, ZIP ni informe de entrega por cada cambio o revisión de Canvas.
Las fuentes mantenidas son los módulos de `src/`; `dist/` nunca fue la fuente de desarrollo.
Los scripts del flujo anterior se conservan para reproducir sus entregas históricas, fuera del
trabajo cotidiano. El servidor `preview.mjs` queda retirado del uso diario.

### Google Fonts en notas

`/api/google-fonts` devuelve errores con código estable; distingue la respuesta de Google mediante
su estado HTTP y motivos estructurados. Un 403 no equivale necesariamente a credenciales inválidas:
puede indicar cuota, API deshabilitada o restricciones de acceso. El diagnóstico conserva
`providerStatus` y, si se reconoce, `providerReason`; nunca reenvía mensajes, metadatos ni claves.
JSON inválido y catálogo incompleto se clasifican como `invalid-response`, separados de `network`
y `timeout`. El cliente distingue además conexión y espera del servicio local, y muestra causa
y acción sin sustituir la tipografía guardada. Referencia: [errores de las APIs de Google](https://docs.cloud.google.com/resource-manager/docs/core_errors).

La consulta de familias usa Google Fonts Developer API, habilitada en un proyecto de Google Cloud.
Crear una clave restringida a esa API y configurar `GOOGLE_FONTS_API_KEY` en `.env.local`
(excluido de Git). No usar el prefijo `VITE_`: la clave se lee en el servicio local y no se
incluye en el cliente. `/api/google-fonts` acepta únicamente solicitudes del origen local;
conserva los nombres y categorías en memoria durante una hora, nunca archivos de fuentes.
La carga de la familia elegida usa `https://fonts.googleapis.com/css2` y `fonts.gstatic.com`
directamente desde el navegador, sin enviar el texto de la nota. No se implementa descarga
ni almacenamiento de fuentes para uso sin conexión. La elección por nombre también funciona
sin clave de catálogo. Documentación: [Developer API](https://developers.google.com/fonts/docs/developer_api)
y [CSS API](https://developers.google.com/fonts/docs/css2).

### Catálogo de diseño de bosquejos

Vite sirve el catálogo en `/design/wireframe-library/`. Sus definiciones y recursos se comparten
con Bosquejos → Biblioteca de componentes en Canvas. `state-contracts.js` declara los estados
pertinentes, la parte afectada y su intención por componente. `review-model.js` separa valor,
interacción, disponibilidad y resultado; rechaza combinaciones incompatibles. Presentación,
función y accesorios se eligen por separado. `composition-rules.js` define límites de tamaño y
relaciones entre piezas que se pueden comprobar con el control de ancho de cada muestra.
Estas reglas pertenecen a la propuesta visual; no son un motor de distribución de Canvas.
`components.js` representa esas partes; no hay un reemplazo genérico por skeleton ni
un estilo que active todos los controles de un escenario. Las muestras son ilustraciones estáticas
e `inert`; los controles de filtros, variantes y estados pertenecen al catálogo de revisión.

`src/features/canvas/library/` aísla esos estilos en Shadow DOM, resuelve la disposición y la
convierte en piezas gráficas tipadas. `wireframe.library` valida y crea los materiales y su
conjunto en una operación de historial. No se persiste HTML. El editor conserva los bosquejos
anteriores y permite modificar texto, símbolos y apariencia de las piezas nuevas. La identidad
del desarrollo incluye `design/wireframe-library/`, ahora necesario para la aplicación; Vite
sirve CSS e iconos locales sin servicios externos ni nuevas dependencias.

`bun run test:design` ejecuta `tests/design/`: regresiones semánticas, todas las combinaciones
admitidas de variantes/estados/datos, recursos, vacíos y acciones de la interfaz del catálogo.
Sus contraejemplos retiran cabeceras y fechas, pierden valores seleccionados, duplican indicadores
y activan todas las herramientas para comprobar que esas alteraciones fallen.
Con Vite activo, `bun run test:design:browser` ejecuta `tests/design/browser.spec.mjs` en un contexto
aislado. Usa el catálogo de 4173; `EVERETT_DESIGN_URL` admite otro puerto local con la misma ruta.
Contrasta estilos calculados, carga de imágenes y geometría a 320 px con texto al 200 %, datos
extensos, estados, variantes y límites de tamaño por muestra. Recorre anchos intermedios y puntos
de cambio; comprueba palabras completas y texto contenido en los controles. Comprueba las acciones
de revisión, selección conservada y contraejemplos de desplazamiento y palabras partidas.
Las tablas, pestañas y calendarios
pueden desplazar su contenido sin desbordar su región; Recorte ilustra una máscara deliberada.
Conservar la última salida de ambos comandos, hashes y capturas en `output/pruebas/diseno/`.
La ausencia de desbordamiento no acredita la pertinencia de un estado: revisar también qué parte
cambia y qué información debe conservarse. Este gate evalúa la propuesta; la integración exige el
gate de Canvas y sus recorridos reales.

`vendor/sources.json` fija los orígenes y commits de Chalk y Phosphor. Se conservan el CSS de Chalk
y los SVG de Phosphor junto con sus avisos MIT en `CHALK-LICENSE` y `PHOSPHOR-LICENSE`.
`symbols.js` comparte nombres entre catálogo, selector y dominio; los recursos se incorporan al
cargar la aplicación para permitir búsqueda e inserción sin red. No se añadió otra dependencia.

## Antecedente: build autónomo

`index.html` contiene los puntos de inserción del script y los estilos. esbuild incorpora los módulos y las imágenes locales al HTML final. La versión procede de `package.json`; el manifiesto registra el hash del HTML, su tamaño y los hashes de sus entradas. El identificador también aparece en la etiqueta `everett-build` del documento y en el diagnóstico exportado.

La carpeta `dist/` es una salida generada. El archivo `Everett-0.7.5.html` de la raíz permanece como referencia original y tiene tratamiento binario en Git para conservar sus bytes.

## Canvas 0.8 y persistencia

IndexedDB conserva contenido compartido, contexto personal y bytes de archivos, según [Arquitectura](arquitectura.md#persistencia-y-archivos-de-canvas-08). El guardado es local al origen y perfil del navegador. Cambiar de puerto, navegador o entre HTTP y file crea otro contexto de almacenamiento. Las copias de emergencia incluyen los assets referenciados; no implican colaboración entre dispositivos. No borrar el almacenamiento para resolver un fallo de recuperación.

PDF.js añade el parser y un worker distribuido con el HTML. El DOM y el navegador no generan por sí solos una portada comprobable ni una lectura de páginas que respete Alt como embrague. El costo es un HTML mayor y la actualización de la dependencia y su licencia; sus versiones quedan fijadas en el lockfile. El build incluye el worker como texto y crea su URL Blob al usarlo.

La matriz obligatoria de contratos está en `scripts/canvas-contracts.mjs`. Los verificadores exigen todos los C08 de la definición y una ejecución única de cada caso mínimo; descubrir una suite antigua o incompleta no certifica 0.8. Las pruebas adversas ingresan por la frontera de IndexedDB con registros reales y reparables; no insertan DOM de prueba en la interfaz.

En el gate histórico de HTML autónomo, el arnés obtiene los bytes del documento cargado mediante una sesión CDP con buffers suficientes y contrasta su SHA-256 con el manifiesto antes de cada recorrido. Conserva el control del artefacto aunque el documento exceda la caché predeterminada de Playwright. El gate cotidiano de fuentes usa la identidad de desarrollo descrita debajo.

Esa sesión CDP se desconecta al terminar la comprobación, incluso si falla la carga o el hash. Su buffer no se mantiene durante el recorrido. Una ejecución que falla al cargar el documento no certifica el caso; reducir workers permite repetir el gate completo con menos consumo simultáneo, sin reintentos ni omisiones.

Playwright 1.65.0 incorpora la [corrección de conexiones locales en Windows](https://github.com/microsoft/playwright/pull/43605):
desactiva `TcpPortRandomizationWin` dentro de sus opciones predeterminadas de Chromium. Evita los
fallos intermitentes `ERR_NO_BUFFER_SPACE` observados al cargar módulos de Vite, incluso con un
solo worker. Se usa la corrección mantenida por Playwright, sin flags propios ni filtros de errores.
La actualización afecta al navegador del arnés, conserva la licencia Apache-2.0 y requiere instalar
su Chromium con `bun x playwright install chromium`; no añade código a la aplicación.
La legibilidad de los atajos se mide desde la caja exterior menos borde y padding: el
[área cliente de los campos de texto](https://github.com/web-platform-tests/wpt/pull/63069)
excluye ahora el padding horizontal. C08-B27 conserva la exigencia de texto completo y comprueba
que estrechar deliberadamente el campo provoque un recorte detectable antes de restaurarlo.

## Evidencias unitarias

Cada ejecución crea `output/pruebas/unitarias/<fecha UTC>/` con:

- `result.json`: identidad, versión, entorno, fechas, estado del proceso, resumen y hashes de fuentes.
- `stdout.tap` y `stderr.log`: salidas del proceso.
- `ejecucion.json`: identidad de la carpeta para su conservación y limpieza.

El comando devuelve un código de error ante fallos, interrupciones, tiempos excedidos, cero pruebas, omisiones o resultados contradictorios. Los controles negativos simulan una aserción fallida, un proceso que no inicia y otro que excede el límite, además de informes y artefactos inválidos.

Los verificadores usan la última ejecución por defecto; también aceptan su ruta explícita después de `--`. Modificar una entrada evaluada invalida esa evidencia para la revisión nueva.

## Pruebas de navegador

Antes de ejecutar por primera vez, instalar Chromium para la versión fijada de Playwright mediante `bun x playwright install chromium`, si el entorno no lo tiene disponible.

Arrancar Vite con `bun run dev` y ejecutar `bun run test:browser` en otra terminal. No requiere
construir `dist/`. `EVERETT_TEST_URL` permite indicar otro servidor Vite para pruebas aisladas.

El runner guarda `target.json` con versión e identidad SHA-256 de todas las fuentes y recursos
de aplicación, configuración, lockfile y servicio local. Contrasta esa identidad con el endpoint
local antes y después de la ejecución. Cada caso verifica el mismo objetivo antes y después del
recorrido; cambiar fuentes durante las pruebas invalida su evidencia. No confundir ese hash de
fuentes con el hash de un HTML. `verify:browser` vuelve a calcular la identidad y funciona con
el servidor detenido.

En una segunda terminal de PowerShell, definir `$env:EVERETT_TEST_URL = 'http://127.0.0.1:4173/'` con el puerto utilizado y ejecutar `bun run test:browser`.

La salida se guarda en `output/pruebas/navegador/<fecha UTC>/`: resultados JSON, informe del
runner, trazas, capturas y videos de fallos. Los casos leen el diagnóstico para contrastar
resultados; las acciones utilizan controles, teclado y arrastres. Un error de consola o de
página hace fallar el recorrido. No se genera un informe adicional de entrega.

Las acciones de interfaz tienen un límite de 10 segundos y las navegaciones de 30 segundos, además del límite del recorrido. Un control tapado o inaccesible debe producir un diagnóstico acotado; aumentar el tiempo no corrige su falta de acceso. Los casos que observan transiciones distinguen muestras durante el gesto de geometría final ya estabilizada.

`verify:browser` vuelve a descubrir los casos del objetivo y exige su correspondencia exacta
con el informe. Rechaza ejecuciones parciales, omisiones, reintentos, fallos esperados, otras
fuentes, cambios en el arnés y adjuntos ausentes o vacíos. HARNESS-DEV y HARNESS-DEV-COVERAGE
comprueban que no se acepte evidencia cruzada ni se pierdan casos de aplicación.

C08-B13 y C08-B90 verifican exclusivamente abrir el antiguo HTML como archivo y llevan
`@standalone`. Se conservan en el gate histórico `bun run test:artifact`, que requiere ese
HTML construido y su servidor, y no se cuentan como aprobados en el gate de fuentes.
El resto de recorridos, incluido el servicio HTTP y parser real de C08-B91, se ejecutan contra
Vite sin depender de `dist/`. DEV-01 prueba en una copia temporal cambios reales de CSS y código,
error y recuperación de compilación, notas, cámara, borradores, PDF, protocolo HTTP y puerto ocupado.

Los recorridos preparados cubren navegación inicial, edición y propuestas de Code, documentos y hojas, Board y Shipping, notas y referencias de Canvas, asignación y devolución de materiales, memoria de agentes y motion de paneles y composers. La matriz de [Reconstrucción de 0.7.5](iteraciones/0.7.5.md) conserva los contratos y recorridos de regresión de la etapa cerrada.

El control `UI-HARNESS-01` captura un panel visible, comprueba una segunda captura idéntica y oculta sus campos deliberadamente para exigir una diferencia visual. Al restaurarlos, exige igualdad otra vez. Sus imágenes quedan dentro de la ejecución y comprueban el comparador; la referencia de diseño aprobada se evalúa por separado. La existencia de tests, su typecheck o una ejecución parcial no acreditan el gate completo.

### Interrupciones, secuencias y estabilidad

`gestures.spec.ts` inicia los gestos con el mouse del navegador y después inyecta `pointercancel` o `blur`, o solicita al navegador liberar la captura real del puntero. Comprueba paneo, materiales, tamaño, chat y minimapa, además de la recuperación posterior. El caso de salida del viewport utiliza movimiento y liberación reales fuera de sus límites. Estas inyecciones representan interrupciones del navegador; no simulan una sesión táctil ni un cambio de aplicación del sistema operativo.

`sequences.spec.ts` altera el orden de visitas mediante semillas 17, 91 y 2026 y encadena acciones durante transiciones; repite la semilla 17 con movimiento reducido. Cada fallo adjunta la semilla y los pasos completados. Incluye trabajo pendiente al cambiar de superficie y cancelación de una revisión antes de que llegue su respuesta. `drafts.spec.ts` comprueba conservación, aislamiento por contexto y consumo de borradores al enviar.

`UI-STABILITY-02` recorre las seis superficies durante al menos cinco minutos y 30 ciclos, con orden reproducible, visitas al Universo, edición, historial y composers. Los puntos de medición vuelven al mismo documento de Docs tras completar las transiciones. La sonda de pruebas cuenta temporizadores y fotogramas pendientes; Chromium aporta memoria tras recolección de basura, nodos y listeners. La instrumentación pertenece al arnés.

Los casos de `endurance.spec.ts` conservan acciones y snapshots del DOM en la traza, las mediciones y la captura final, sin grabación continua de fotogramas. Una sesión completa produjo una traza de 248 MB y agotó el límite de cierre del contexto al archivarla. Se acota esa grabación sin ampliar los tiempos de las acciones ni reducir ciclos, duración o aserciones. Los demás recorridos mantienen sus fotogramas de traza.

Tras tres ciclos de preparación, cada punto exige cero temporizadores, intervalos y fotogramas pendientes. Admite hasta dos listeners y 20 nodos sobre una referencia fija para variaciones del navegador. La memoria puede aumentar hasta un 25 % más 8 MiB para cachés y la traza acotada de la aplicación. La mediana de los cinco últimos ciclos debe quedar por debajo del doble de la inicial más 500 ms. Los adjuntos conservan todas las muestras; estos límites detectan acumulación y deterioro en ese recorrido, y no certifican sesiones de duración ilimitada. `UI-HARNESS-02` introduce recursos deliberadamente para comprobar que las mediciones detectan su presencia y su liberación.

Los resultados completos se rechazan si la traza de la aplicación contiene errores, aunque la consola del navegador esté vacía. Un caso aislado sirve para diagnosticar; el verificador de entrega continúa exigiendo todos los casos descubiertos.

### Órbitas de los Mundos

`orbits.spec.ts` comprueba la presencia y el movimiento de la luna, la continuidad al entrar y regresar, el zoom, los filtros y el movimiento reducido. Recorre un ciclo orbital completo con el reloj controlado del navegador a densidades de píxeles 1 y 2. La sonda crea una referencia del sprite real del planeta, con su transformación y opacidad, y compara sus píxeles con la composición final del mismo fotograma: el tramo posterior debe quedar oculto; el delantero y la luna visible deben cambiar la imagen. Un control negativo dibuja deliberadamente el tramo posterior sobre el planeta y exige que la comprobación lo detecte; después restaura el render y vuelve a comprobarlo. Las capturas y mediciones quedan adjuntas al caso.

La comparación admite un nivel de redondeo en los canales premultiplicados por alfa. Esto evita amplificar errores de cuantización al leer colores semitransparentes. El control negativo se repite con la opacidad real de un Mundo atenuado por el filtro y debe seguir detectando la órbita incorrecta.

## Antecedente: empaquetado y cierre de entregas

Este procedimiento corresponde a las entregas puntuales anteriores. El usuario retiró ese
flujo del trabajo continuo de Canvas el 27 de octubre de 2026. No ejecutarlo por cada revisión.

Con el gate completo y la revisión visual y de alcance en `output/revision/<versión>/revision.md`, ejecutar en PowerShell 7 usando las rutas emitidas por los runners:

```powershell
./scripts/package.ps1 -BrowserResult output/pruebas/navegador/<fecha-UTC>/results.json -UnitResult output/pruebas/unitarias/<fecha-UTC>/result.json
```

El script exige evidencia unitaria y de navegador vigente. `scripts/report.mjs` deriva las cifras, fechas y casos de esos resultados y copia las capturas de sus adjuntos comprobando sus hashes. Sustituye el resumen JSON y el informe Markdown en `output/informe/`. Puede ejecutarse por separado con `node scripts/report.mjs <BrowserResult> <UnitResult>`.

El paquete incluye fuentes, recursos, configuración, arnés, HTML original y construido, documentación, tareas, revisión de alcance e informes de esas ejecuciones. Se construye en una carpeta temporal dentro de `output/`. El empaquetador reabre el ZIP y contrasta nombres, tamaños y SHA-256 de todos sus contenidos antes de sustituir `output/paquete/`. `verificacion.json` registra el nombre y el hash del ZIP y el HTML incluido. Un fallo de preparación conserva el paquete candidato anterior y retira el temporal.

Después de la aprobación explícita del usuario, conservar el ZIP y `verificacion.json` en `entregas/<versión>/`, junto al HTML probado. Verificar sus hashes tras el traslado y limpiar las copias de trabajo de esa entrega. Una corrección posterior recibe su propia versión; nunca sobrescribir una entrega aprobada.

El informe incluido identifica la cobertura y los pendientes de producto. La integridad del paquete y la aprobación de la etapa se comprueban por separado según [Validación](validacion-prototipo.md).

## Dependencias

### Compatibilidad de licencias con Everett

Everett conserva su código propio cerrado, según [Producto](producto.md). Priorizar componentes con licencias permisivas compatibles, como MIT, BSD o Apache-2.0, cumpliendo sus avisos y condiciones. Comprobar la licencia de la versión y de los archivos concretos antes de reutilizarlos; que un repositorio sea público no concede por sí solo permiso para copiarlo.

Para componentes copyleft, evaluar el código cubierto, sus modificaciones y la forma de distribución antes de adoptarlos. No incorporar obligaciones de divulgar código propio o modificaciones de Everett sin que el usuario haya aceptado expresamente esa condición. Si no encaja, buscar una alternativa permisiva, una licencia comercial apropiada o una implementación propia e independiente desde requisitos funcionales y comportamiento observable. Renombrar, traducir o reordenar código copiado no se considera una implementación independiente.

Penpot usa MPL-2.0 y se mantiene como referencia funcional; no se ha incorporado su código al Canvas. La MPL permite combinar archivos cubiertos con archivos propietarios, pero distribuir sus partes cubiertas exige facilitar sus fuentes y las modificaciones correspondientes. El JavaScript entregado al navegador también cuenta como distribución; minificarlo no elimina esa obligación. Consultar las [secciones 1.10 y 3 de la MPL](https://www.mozilla.org/en-US/MPL/2.0/) y las [preguntas 8–11 y 16–17 de Mozilla](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) al evaluar una adopción concreta. Esto no implica autorizar la apertura de código de Everett.

Registrar origen, versión, licencia elegida y avisos que deban conservarse al incorporar código. En licencias alternativas, dejar explícita la opción adoptada: para DOMPurify se elige Apache-2.0 de su licencia dual `(MPL-2.0 OR Apache-2.0)`.

| Dependencia        | Uso y motivo                                                                                                                                                               | Licencia   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TypeScript         | Comprobación estática de contratos, estados y variantes.                                                                                                                   | Apache-2.0 |
| esbuild            | Bundles del navegador, inclusión de recursos y compilación de pruebas para Node.                                                                                           | MIT        |
| `vite` 8.3.5       | Servidor de desarrollo, HMR de CSS, recarga y diagnóstico de módulos. Reutiliza su protocolo y watcher; añade herramientas de desarrollo, sin incluirlas en la aplicación. | MIT        |
| `@playwright/test` | Navegador real, acciones, trazas, capturas y aserciones de interfaz.                                                                                                       | Apache-2.0 |
| `@types/node`      | Tipos de las APIs de Node usadas en pruebas y configuración.                                                                                                               | MIT        |
| Prettier           | Formato uniforme sin reglas particulares por archivo.                                                                                                                      | MIT        |
| `pdfjs-dist`       | Portadas reales y lectura multipágina de PDF importados; worker dentro del HTML.                                                                                           | Apache-2.0 |
| `roughjs` 4.6.6    | Contornos SVG deterministas de bosquejos, con tamaños del Mundo. Reutiliza el generador existente sin introducir otro motor de selección o un framework de interfaz.       | MIT        |

Todas están declaradas como dependencias de desarrollo. La aplicación mantiene DOM nativo; PDF.js se incorpora al bundle, incluido su worker, sin solicitar código externo en ejecución. Las versiones exactas y sus dependencias transitivas quedan fijadas en el lockfile; actualizar una herramienta requiere repetir las verificaciones afectadas. Playwright añade la descarga y mantenimiento de su navegador de pruebas.

Bosquejos reutiliza el generador SVG de [Rough.js](https://roughjs.com/) y los mecanismos actuales
de Canvas. Wired Elements se evaluó como biblioteca de controles, pero incorpora Lit y controles
funcionales y mide contornos mediante `getBoundingClientRect`; requiere adaptar esas mediciones
al plano transformado de Everett. La integración usa dimensiones del modelo y una semilla por
material para evitar regeneraciones aleatorias al acercar, editar o recargar. No se incorpora
código de Penpot. El build incluye los avisos MIT íntegros de Rough.js y sus dependencias
`hachure-fill`, `path-data-parser`, `points-on-curve` y `points-on-path`, conservados en
`src/assets/roughjs-notices.txt`. El manifiesto verifica también ese archivo.

## Documentación relacionada

- [Concepto de producto](producto.md): Mundo, superficies y continuidad del proyecto.
- [Arquitectura](arquitectura.md): responsabilidades, límites y contratos internos.
- [Reconstrucción de 0.7.5](iteraciones/0.7.5.md): alcance y criterios de cierre de esta reconstrucción.
- [Alcance hasta 1.0](alcance-prototipo.md): etapas y aprobaciones.
- [Validación](validacion-prototipo.md): exigencias obligatorias del arnés y de la entrega.

## Registro de controles del arnés

tests/browser/control-probe.ts observa clics antes de que los controles reconstruyan su DOM. El runner conserva hasta 1024 registros por caso a través de recargas y los adjunta como controls-used. No añade estado ni modifica la aplicación. scripts/browser-evidence.mjs valida su estructura y las entradas obligatorias de canvasControlRequirements en scripts/canvas-contracts.mjs. Ambos verificadores e identidades de fuentes incluyen esa matriz; el inventario de navegador incluye también el verificador.

La evidencia de controles complementa las aserciones de intención, datos y representación. Los requisitos de entradas visibles, fixtures y auditoría de recorridos están en [Validación](validacion-prototipo.md#entrada-observable-y-auditoría-de-recorridos-de-canvas).

El fixture comprueba las entradas obligatorias de cada caso al terminar sus acciones, usando la misma función y matriz que el verificador independiente. Un clic real sobre un menú todavía transparente no acredita una entrada visible. Esperar su estado visible antes de operarlo; no relajar el registro ni sustituirlo por una activación programática.

## Servicio local de previews

La excepción aprobada para 0.8.15 añade POST /api/link-preview al mismo servidor de preview, ligado únicamente a 127.0.0.1. Se ejecuta con `node scripts/preview.mjs 4173`; requiere `bun install --frozen-lockfile` y el build vigente. Valida Origin y Host locales, limita solicitudes, cachea seis horas y combina descargas concurrentes del mismo destino. link-preview-js extrae metadatos; Undici descarga con DNS público fijado y valida cada redirección; ipaddr.js clasifica direcciones e image-size limita portadas raster. Las versiones quedan fijadas en el lockfile. No recibe cookies ni credenciales del navegador ni ejecuta scripts del destino. Los archivos y las ilustraciones se descargan por el servicio y se conservan como Blobs locales.

La ampliación 0.8.16 reutiliza `@mozilla/readability` 0.6.0 (Apache-2.0) para seleccionar contenido, `jsdom` 30.1.3 (MIT) para analizar el documento sin ejecutar scripts ni cargar recursos y `dompurify` 3.4.17 (Apache-2.0, opción elegida de su licencia dual con MPL-2.0) para sanearlo en servidor y navegador. `get-video-id` 4.2.0 (MIT) reconoce IDs de YouTube/Vimeo, restringidos además por una lista de hosts; `file-type` 22.2.0 (MIT) identifica archivos por sus bytes. Estas bibliotecas evitan escribir parsers propios; añaden análisis DOM en el servicio y saneamiento al bundle.

Archivos directos admitidos: PNG, JPEG, GIF, WebP, MP4, WebM y QuickTime, sujetos a la decodificación disponible en el navegador. Límites: HTML 8 MiB; imagen directa 12 MiB y 24 megapíxeles; video directo 32 MiB; lectura 512 KiB antes de ilustraciones; hasta seis ilustraciones de 512 KiB con 1,5 MiB total. Se valida cada redirección y se limita el tiempo de descarga. Las páginas que requieren sesión o ejecución de JavaScript pueden no ofrecer lectura. El reproductor oficial depende de la autorización del proveedor; no se descarga el video de YouTube/Vimeo. La consulta conserva una única flecha de regreso. El historial interno del lector participa en Application.back; Alt y rueda vuelven primero a la lectura anterior. Los reproductores externos se montan al entrar y usan un contenedor de desplazamiento con plano fijo para recibir la rueda encadenada del iframe, sin sustituir sus controles. La flecha permite regresar también cuando el proveedor consume el gesto.

El HTML sigue siendo autónomo para leer tarjetas guardadas. Abrirlo directamente no puede generar previews generales sin el servicio: conserva el enlace y muestra esa condición. IndexedDB depende del origen; abrir por file o cambiar de puerto no traslada los datos del usuario.

La entrega actual prioriza implementación y gate; el usuario excluyó expresamente el ZIP del trabajo. La conservación y validación de evidencias siguen vigentes.

La corrección 0.8.17 reutiliza `@panzoom/panzoom` 4.6.2 (MIT) para punteros, pinch, zoom focal y paneo de imágenes. Se importa el bundle ESM oficial; una declaración acotada conserva sus tipos públicos porque el paquete omite el archivo de polyfills de sus declaraciones distribuidas. No se relajan los checks de TypeScript. Rotación y escala de consulta no modifican los bytes guardados. Las confirmaciones usan HTML `dialog` con modalidad nativa, bucle Tab explícito, foco inicial en Cancelar y restauración del foco; Transitions.dev aporta el patrón de apertura/cierre y se respeta movimiento reducido.

## Criterios adoptados para la revisión de Canvas

Se consultan las skills originales de [Emil Kowalski](https://github.com/emilkowalski/skills): [emil-design-eng](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md), [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md), [break-ui](https://github.com/emilkowalski/skills/blob/main/skills/break-ui/SKILL.md) y [apple-design](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md), junto con Transitions.dev. Se aplican a toda la superficie de Canvas: controles, dock, tarjetas, conexiones, conjuntos, zonas, propuestas, chat y visores. Guiar la jerarquía, respuesta inmediata a teclado, continuidad de gestos, origen de popovers, feedback, texto adaptable y datos extremos. Conservar la navegación espacial y comportamientos aprobados; una recomendación estética no los reemplaza. La revisión conserva hallazgos, decisiones y pruebas del artefacto, sin un informe comparativo permanente ni controles de fixtures dentro de producción.

Para los gestos de edición, contrastar Figma o FigJam y Penpot, y sumar otro Canvas cuando resuelva el mismo problema de otra manera. Revisar qué sucede al iniciar, invertir, cancelar y terminar el gesto, y qué conserva al deshacer. Cuando haya incidencias públicas pertinentes, convertir el caso observado en una prueba sobre el resultado visible en Everett. Antes de copiar una implementación, verificar su licencia y su encaje con el modelo de Canvas.

### Guías de alineación e imágenes seleccionadas (0.8.18)

La consulta seleccionada reutiliza Panzoom (MIT); el paso local baja de 0,3 a 0,1 y la rueda espacial consulta el modificador de Atajos. Los recorridos anterior/siguiente no cambian la selección de Canvas ni los archivos. La lectura recuerda el recorrido seguido y conserva sus assets en las copias de emergencia personales.

La primera implementación de alineación adaptó `checkSnap` de Moveable (MIT), fuente `packages/react-moveable/src/ables/snappable/snap.ts`, blob `ca9b728fab1680315e6ddff7093f96a88db66dda`. El cálculo actual de referencias vecinas, bordes, centros y huecos es propio de Everett. [Alineación en el dominio](../src/domain/alignment.ts). Ctrl o Meta durante el arrastre suspende temporalmente el ajuste.

### Comprobación pública de consulta

Las fuentes reproducibles viven en `tests/public/`: `canvas-inspection.mjs` comprueba galería, atajos y sugerencias; `canvas-links.mjs` comprueba lectura, bytes, reproducción y gestos con destinos públicos reales. Ejecutarlas contra el único preview de 4173 después de construir; escriben evidencia en `output/revision/<versión>/` y contrastan el HTML cargado.

`node tests/public/evidence.mjs` valida esa evidencia contra el SHA actual y devuelve error si falta una comprobación o falla un gesto. HARNESS-15 comprueba ese bloqueo aunque la regresión controlada haya pasado. La reproducción del caso con foco dentro del iframe externo permanece fallida en 0.8.18 y bloquea considerar completo su contrato espacial; el resultado aprobado de Playwright se presenta como regresión, con ese pendiente explícito.
