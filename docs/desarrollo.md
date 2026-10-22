# Desarrollo de Everett

## Organización del repositorio

| Ruta                                              | Contenido y uso                                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TAREAS.md`                                       | Estado de las iteraciones y fallos abiertos, agrupados por versión.                                                                                        |
| `src/`                                            | Código y recursos de la aplicación.                                                                                                                        |
| `tests/unit/`, `tests/browser/`, `tests/tooling/` | Pruebas mantenidas de lógica, interacción y del propio arnés.                                                                                              |
| `scripts/`                                        | Construcción, ejecución, verificación y empaquetado.                                                                                                       |
| `docs/`                                           | Producto, alcance, arquitectura, desarrollo y validación, cada uno en su documento. Los manifiestos JSON comprueban la recuperación de fuentes y recursos. |
| `docs/iteraciones/`                               | Contratos y criterios específicos que siguen siendo referencia de regresión.                                                                               |
| `Everett-0.7.5.html`                              | Original conservado como base verificable.                                                                                                                 |
| `entregas/<versión>/`                             | Entrega aprobada: ZIP con fuentes y evidencias, HTML y verificación de integridad.                                                                         |
| `output/`                                         | Resultados de trabajo reemplazables, según la política indicada abajo.                                                                                     |
| `dist/`                                           | HTML construido y manifiesto del build actual; se regeneran con `npm run build`.                                                                           |
| `node_modules/`                                   | Dependencias instaladas por npm; se regeneran con `npm ci`.                                                                                                |

`src/`, `tests/`, `scripts/`, la documentación y la configuración se versionan en Git. `entregas/`, `output/`, `dist/` y `node_modules/` son archivos locales excluidos de Git. Las entregas deben copiarse a un respaldo si se necesita conservarlas fuera de esta computadora.

## Conservación de resultados

- Cada grupo de pruebas conserva su última ejecución en `output/pruebas/unitarias/<fecha UTC>/` o `output/pruebas/navegador/<fecha UTC>/`. Al finalizar el siguiente intento se elimina el anterior, incluso si el nuevo falla. El diagnóstico del último fallo permanece disponible.
- El runner bloquea ejecuciones simultáneas del mismo grupo. Si una interrupción forzada deja `en-curso.json`, comprobar que el PID registrado y sus procesos de prueba hayan terminado antes de retirar ese archivo. La ejecución siguiente retira los resultados reemplazados.
- Los módulos compilados para las pruebas unitarias se crean en el directorio temporal del sistema y se eliminan al terminar.
- `output/revision/<versión>/` contiene la revisión visual y de alcance de la etapa activa. `output/informe/` contiene un único informe generado; `output/paquete/`, un único paquete candidato verificado. Se sustituyen al preparar la siguiente candidata. Tras aprobar y conservar una entrega, se eliminan esas copias de trabajo.
- Una entrega aprobada se conserva en `entregas/<versión>/`. Los runners y el empaquetador no escriben ni limpian esa carpeta. Antes de eliminar las copias de trabajo, comprobar el ZIP y sus archivos contra sus hashes.
- Los fallos abiertos se registran en [Tareas](../TAREAS.md). Los corregidos permanecen cubiertos por pruebas de regresión y por el historial de Git. No conservar una bitácora adicional, capturas de propuestas descartadas ni ejecuciones reemplazadas.

## Entorno

Usar Node.js 24 y npm con el `package-lock.json` del repositorio. PowerShell 7 (`pwsh`) ejecuta el empaquetador y sus controles negativos dentro de las pruebas de herramientas. Instalar las dependencias fijadas con:

```powershell
npm ci
```

Las fuentes TypeScript de aplicación y pruebas se comprueban con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, comprobación de código no utilizado y tipos de importación explícitos. Los scripts de construcción y evidencia utilizan módulos de Node.

## Comandos

| Comando                  | Resultado                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`      | Comprueba los tipos sin generar archivos.                                                                      |
| `npm run format:check`   | Comprueba el formato de fuentes, configuración y documentación.                                                |
| `npm run format`         | Aplica el formato del proyecto.                                                                                |
| `npm run test:unit`      | Ejecuta pruebas de dominio, servicios, navegación y controles negativos del arnés.                             |
| `npm run verify:unit`    | Contrasta una ejecución concreta con su salida TAP, los tests descubiertos, las fuentes actuales y la versión. |
| `npm run build`          | Genera `dist/Everett-0.8.13.html` y `dist/build-manifest.json`.                                                |
| `npm run verify:build`   | Comprueba existencia, bytes, hash, versión e identidad de las fuentes del build.                               |
| `npm run test:browser`   | Ejecuta los recorridos preparados en Playwright sobre la URL indicada en `EVERETT_TEST_URL`.                   |
| `npm run verify:browser` | Comprueba la vigencia del HTML, las fuentes del arnés, todos los casos descubiertos y sus adjuntos.            |

`npm run recover` corresponde a la extracción inicial del HTML original. Rechaza sobrescribir archivos existentes y comprueba primero el hash de la base. El desarrollo cotidiano utiliza las fuentes mantenidas en `src/`.

## Build autónomo

`index.html` contiene los puntos de inserción del script y los estilos. esbuild incorpora los módulos y las imágenes locales al HTML final. La versión procede de `package.json`; el manifiesto registra el hash del HTML, su tamaño y los hashes de sus entradas. El identificador también aparece en la etiqueta `everett-build` del documento y en el diagnóstico exportado.

La carpeta `dist/` es una salida generada. El archivo `Everett-0.7.5.html` de la raíz permanece como referencia original y tiene tratamiento binario en Git para conservar sus bytes.

## Canvas 0.8 y persistencia

IndexedDB conserva contenido compartido, contexto personal y bytes de archivos, según [Arquitectura](arquitectura.md#persistencia-y-archivos-de-canvas-08). El guardado es local al origen y perfil del navegador. Cambiar de puerto, navegador o entre HTTP y file crea otro contexto de almacenamiento. Las copias de emergencia incluyen los assets referenciados; no implican colaboración entre dispositivos. No borrar el almacenamiento para resolver un fallo de recuperación.

PDF.js añade el parser y un worker distribuido con el HTML. El DOM y el navegador no generan por sí solos una portada comprobable ni una lectura de páginas que respete Alt como embrague. El costo es un HTML mayor y la actualización de la dependencia y su licencia; sus versiones quedan fijadas en el lockfile. El build incluye el worker como texto y crea su URL Blob al usarlo.

La matriz obligatoria de contratos está en `scripts/canvas-contracts.mjs`. Los verificadores exigen todos los C08 de la definición y una ejecución única de cada caso mínimo; descubrir una suite antigua o incompleta no certifica 0.8. Las pruebas adversas ingresan por la frontera de IndexedDB con registros reales y reparables; no insertan DOM de prueba en la interfaz.

El arnés obtiene los bytes del documento cargado mediante una sesión CDP con buffers suficientes para el HTML autónomo, y contrasta su SHA-256 con el manifiesto antes de cada recorrido. Conserva el control del artefacto aunque el documento exceda la caché predeterminada de Playwright.

Esa sesión CDP se desconecta al terminar la comprobación, incluso si falla la carga o el hash. Su buffer no se mantiene durante el recorrido. Una ejecución que falla al cargar el documento no certifica el caso; reducir workers permite repetir el gate completo con menos consumo simultáneo, sin reintentos ni omisiones.

## Evidencias unitarias

Cada ejecución crea `output/pruebas/unitarias/<fecha UTC>/` con:

- `result.json`: identidad, versión, entorno, fechas, estado del proceso, resumen y hashes de fuentes.
- `stdout.tap` y `stderr.log`: salidas del proceso.
- `ejecucion.json`: identidad de la carpeta para su conservación y limpieza.

El comando devuelve un código de error ante fallos, interrupciones, tiempos excedidos, cero pruebas, omisiones o resultados contradictorios. Los controles negativos simulan una aserción fallida, un proceso que no inicia y otro que excede el límite, además de informes y artefactos inválidos.

Los verificadores usan la última ejecución por defecto; también aceptan su ruta explícita después de `--`. Modificar una entrada evaluada invalida esa evidencia para la revisión nueva.

## Pruebas de navegador

Antes de ejecutar por primera vez, instalar Chromium para la versión fijada de Playwright mediante `npx playwright install chromium`, si el entorno no lo tiene disponible.

Para evaluar el build en la propia computadora, ejecutar `node scripts/preview.mjs` y utilizar la URL que imprime. El servidor escucha exclusivamente en `127.0.0.1`, comprueba el manifiesto y sirve el HTML de `dist/` leído al arrancar. Reiniciarlo después de reconstruir el HTML y detenerlo con Ctrl+C al terminar. El argumento opcional de puerto acepta `0` para elegir uno libre.

`EVERETT_TEST_URL` debe apuntar a una dirección HTTP(S) admitida que sirva el HTML exacto de `dist/build-manifest.json`. El runner comprueba la respuesta y sus bytes antes de crear una ejecución; cada caso vuelve a comprobarlos antes del recorrido. La configuración no inicia un servidor ni publica archivos.

En una segunda terminal de PowerShell, definir `$env:EVERETT_TEST_URL = 'http://127.0.0.1:4173/'` con el puerto utilizado y ejecutar `npm run test:browser`.

La salida se guarda en `output/pruebas/navegador/<fecha UTC>/`: resultados JSON, informe HTML, trazas, capturas y videos de fallos. Cada caso carga y comprueba los bytes del HTML antes de operar. Los casos leen el diagnóstico para contrastar resultados; las acciones utilizan controles, teclado y arrastres. Un error de consola o de página hace fallar el recorrido.

Las acciones de interfaz tienen un límite de 10 segundos y las navegaciones de 30 segundos, además del límite del recorrido. Un control tapado o inaccesible debe producir un diagnóstico acotado; aumentar el tiempo no corrige su falta de acceso. Los casos que observan transiciones distinguen muestras durante el gesto de geometría final ya estabilizada.

`verify:browser` vuelve a descubrir los casos del proyecto y exige su correspondencia exacta con el informe. Rechaza ejecuciones parciales, omisiones, reintentos, fallos esperados, otro HTML, cambios en las fuentes del arnés y adjuntos ausentes o vacíos. Puede ejecutarse después de detener el servidor: descubre casos sin abrir el navegador.

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

## Empaquetado y cierre

Con el gate completo y la revisión visual y de alcance en `output/revision/<versión>/revision.md`, ejecutar en PowerShell 7 usando las rutas emitidas por los runners:

```powershell
./scripts/package.ps1 -BrowserResult output/pruebas/navegador/<fecha-UTC>/results.json -UnitResult output/pruebas/unitarias/<fecha-UTC>/result.json
```

El script exige evidencia unitaria y de navegador vigente. `scripts/report.mjs` deriva las cifras, fechas y casos de esos resultados y copia las capturas de sus adjuntos comprobando sus hashes. Sustituye el resumen JSON y el informe Markdown en `output/informe/`. Puede ejecutarse por separado con `node scripts/report.mjs <BrowserResult> <UnitResult>`.

El paquete incluye fuentes, recursos, configuración, arnés, HTML original y construido, documentación, tareas, revisión de alcance e informes de esas ejecuciones. Se construye en una carpeta temporal dentro de `output/`. El empaquetador reabre el ZIP y contrasta nombres, tamaños y SHA-256 de todos sus contenidos antes de sustituir `output/paquete/`. `verificacion.json` registra el nombre y el hash del ZIP y el HTML incluido. Un fallo de preparación conserva el paquete candidato anterior y retira el temporal.

Después de la aprobación explícita del usuario, conservar el ZIP y `verificacion.json` en `entregas/<versión>/`, junto al HTML probado. Verificar sus hashes tras el traslado y limpiar las copias de trabajo de esa entrega. Una corrección posterior recibe su propia versión; nunca sobrescribir una entrega aprobada.

El informe incluido identifica la cobertura y los pendientes de producto. La integridad del paquete y la aprobación de la etapa se comprueban por separado según [Validación](validacion-prototipo.md).

## Dependencias

| Dependencia        | Uso y motivo                                                                     | Licencia   |
| ------------------ | -------------------------------------------------------------------------------- | ---------- |
| TypeScript         | Comprobación estática de contratos, estados y variantes.                         | Apache-2.0 |
| esbuild            | Bundles del navegador, inclusión de recursos y compilación de pruebas para Node. | MIT        |
| `@playwright/test` | Navegador real, acciones, trazas, capturas y aserciones de interfaz.             | Apache-2.0 |
| `@types/node`      | Tipos de las APIs de Node usadas en pruebas y configuración.                     | MIT        |
| Prettier           | Formato uniforme sin reglas particulares por archivo.                            | MIT        |
| `pdfjs-dist`       | Portadas reales y lectura multipágina de PDF importados; worker dentro del HTML. | Apache-2.0 |

Todas están declaradas como dependencias de desarrollo. La aplicación mantiene DOM nativo; PDF.js se incorpora al bundle, incluido su worker, sin solicitar código externo en ejecución. Las versiones exactas y sus dependencias transitivas quedan fijadas en el lockfile; actualizar una herramienta requiere repetir las verificaciones afectadas. Playwright añade la descarga y mantenimiento de su navegador de pruebas.

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
