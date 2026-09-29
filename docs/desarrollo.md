# Desarrollo de Everett

## Entorno

Usar Node.js 24 y npm con el `package-lock.json` del repositorio. Instalar las versiones fijadas con:

```powershell
npm ci
```

Las fuentes TypeScript de aplicación y pruebas se comprueban con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, comprobación de código no utilizado y tipos de importación explícitos. Los scripts de construcción y evidencia utilizan módulos de Node.

## Comandos

| Comando                                                         | Resultado                                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                             | Comprueba los tipos sin generar archivos.                                                                      |
| `npm run format:check`                                          | Comprueba el formato de fuentes, configuración y documentación.                                                |
| `npm run format`                                                | Aplica el formato del proyecto.                                                                                |
| `npm run test:unit`                                             | Ejecuta pruebas de dominio, servicios, navegación y controles negativos del arnés.                             |
| `npm run verify:unit -- output/unit/<runId>/result.json`        | Contrasta una ejecución concreta con su salida TAP, los tests descubiertos, las fuentes actuales y la versión. |
| `npm run build`                                                 | Genera `dist/Everett-0.7.5.html` y `dist/build-manifest.json`.                                                 |
| `npm run verify:build`                                          | Comprueba existencia, bytes, hash, versión e identidad de las fuentes del build.                               |
| `npm run test:browser`                                          | Ejecuta los recorridos preparados en Playwright sobre la URL indicada en `EVERETT_TEST_URL`.                   |
| `npm run verify:browser -- output/browser/<runId>/results.json` | Comprueba la vigencia del HTML, las fuentes del arnés, todos los casos descubiertos y sus adjuntos.            |

`npm run recover` corresponde a la extracción inicial del HTML original. Rechaza sobrescribir archivos existentes y comprueba primero el hash de la base. El desarrollo cotidiano utiliza las fuentes mantenidas en `src/`.

## Build autónomo

`index.html` contiene los puntos de inserción del script y los estilos. esbuild incorpora los módulos y las imágenes locales al HTML final. La versión procede de `package.json`; el manifiesto registra el hash del HTML, su tamaño y los hashes de sus entradas. El identificador también aparece en la etiqueta `everett-build` del documento y en el diagnóstico exportado.

La carpeta `dist/` es una salida generada. El archivo `Everett-0.7.5.html` de la raíz permanece como referencia original y tiene tratamiento binario en Git para conservar sus bytes.

## Evidencias unitarias

Cada ejecución crea `output/unit/<runId>/` con:

- `result.json`: identidad, versión, entorno, fechas, estado del proceso, resumen y hashes de fuentes.
- `stdout.tap` y `stderr.log`: salidas del proceso.
- Módulos compilados de los casos ejecutados.

El comando devuelve un código de error ante fallos, interrupciones, tiempos excedidos, cero pruebas, omisiones o resultados contradictorios. Los controles negativos simulan una aserción fallida, un proceso que no inicia y otro que excede el límite, además de informes y artefactos inválidos.

Usar la ruta concreta emitida por el runner para comprobar vigencia. Modificar una entrada evaluada invalida esa evidencia para la revisión nueva.

## Pruebas de navegador

Antes de ejecutar por primera vez, instalar Chromium para la versión fijada de Playwright mediante `npx playwright install chromium`, si el entorno no lo tiene disponible.

Para evaluar el build en la propia computadora, ejecutar `node scripts/preview.mjs` y utilizar la URL que imprime. El servidor escucha exclusivamente en `127.0.0.1`, comprueba el manifiesto y sirve el HTML de `dist/` leído al arrancar. Reiniciarlo después de reconstruir el HTML y detenerlo con Ctrl+C al terminar. El argumento opcional de puerto acepta `0` para elegir uno libre.

`EVERETT_TEST_URL` debe apuntar a una dirección HTTP(S) admitida que sirva el HTML exacto de `dist/build-manifest.json`. El arnés comprueba los bytes recibidos antes del recorrido. La configuración no inicia un servidor ni publica archivos.

En una segunda terminal de PowerShell, definir `$env:EVERETT_TEST_URL = 'http://127.0.0.1:4173/'` con el puerto utilizado y ejecutar `npm run test:browser`.

La salida se guarda en `output/browser/<runId>/`: resultados JSON, informe HTML, trazas, capturas y videos de fallos. Cada caso carga y comprueba los bytes del HTML antes de operar. Los casos leen el diagnóstico para contrastar resultados; las acciones utilizan controles, teclado y arrastres. Un error de consola o de página hace fallar el recorrido.

`verify:browser` vuelve a descubrir los casos del proyecto y exige su correspondencia exacta con el informe. Rechaza ejecuciones parciales, omisiones, reintentos, fallos esperados, otro HTML, cambios en las fuentes del arnés y adjuntos ausentes o vacíos. Puede ejecutarse después de detener el servidor: descubre casos sin abrir el navegador.

Los recorridos preparados cubren navegación inicial, edición y propuestas de Code, documentos y hojas, Board y Shipping, notas y referencias de Canvas, asignación y devolución de materiales, memoria de agentes y motion de paneles y composers. La matriz de [Recuperación de 0.7.5](recuperacion-0.7.5.md) mantiene los recorridos adicionales necesarios para cerrar la etapa.

El control `UI-HARNESS-01` captura un panel visible, comprueba una segunda captura idéntica y oculta sus campos deliberadamente para exigir una diferencia visual. Al restaurarlos, exige igualdad otra vez. Sus imágenes quedan dentro de la ejecución y comprueban el comparador; la referencia de diseño aprobada se evalúa por separado. La existencia de tests, su typecheck o una ejecución parcial no acreditan el gate completo.

## Empaquetado de la reconstrucción

Con el informe `output/rebuild-0.7.5/estado.md` actualizado, ejecutar en PowerShell 7:

```powershell
./scripts/package.ps1 -BrowserResult output/browser/<runId>/results.json -UnitResult output/unit/<runId>/result.json
```

El script exige evidencia unitaria y de navegador vigente. Incluye fuentes, recursos, configuración, arnés, HTML original y construido, documentación e informes de esas ejecuciones. Genera un ZIP en `output/packages/<buildId>/`, con un manifiesto de cada archivo. Reabre el ZIP y contrasta nombres, tamaños y SHA-256 de todos sus contenidos; `verification.json` registra el hash del ZIP y el HTML incluido. Rechaza sobrescribir un paquete existente para ese build.

El informe incluido identifica la cobertura y los pendientes de producto. La integridad del paquete y la aprobación de la etapa se comprueban por separado según [Validación](validacion-prototipo.md).

## Dependencias

| Dependencia        | Uso y motivo                                                                     | Licencia   |
| ------------------ | -------------------------------------------------------------------------------- | ---------- |
| TypeScript         | Comprobación estática de contratos, estados y variantes.                         | Apache-2.0 |
| esbuild            | Bundles del navegador, inclusión de recursos y compilación de pruebas para Node. | MIT        |
| `@playwright/test` | Navegador real, acciones, trazas, capturas y aserciones de interfaz.             | Apache-2.0 |
| `@types/node`      | Tipos de las APIs de Node usadas en pruebas y configuración.                     | MIT        |
| Prettier           | Formato uniforme sin reglas particulares por archivo.                            | MIT        |

Todas son dependencias de desarrollo. La aplicación mantiene su implementación DOM sin dependencias externas de ejecución. Las versiones exactas y sus dependencias transitivas quedan fijadas en el lockfile; actualizar una herramienta requiere repetir las verificaciones afectadas. Playwright añade la descarga y mantenimiento de su navegador de pruebas.

## Documentación relacionada

- [Concepto de producto](producto.md): Mundo, superficies y continuidad del proyecto.
- [Arquitectura](arquitectura.md): responsabilidades, límites y contratos internos.
- [Recuperación de 0.7.5](recuperacion-0.7.5.md): alcance y criterios de cierre de esta reconstrucción.
- [Alcance hasta 1.0](alcance-prototipo.md): etapas y aprobaciones.
- [Validación](validacion-prototipo.md): exigencias obligatorias del arnés y de la entrega.
