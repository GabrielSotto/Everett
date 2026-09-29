# Desarrollo de Everett

## Entorno

Usar Node.js 24 y npm con el `package-lock.json` del repositorio. Instalar las versiones fijadas con:

```powershell
npm ci
```

Las fuentes TypeScript de aplicación y pruebas se comprueban con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, comprobación de código no utilizado y tipos de importación explícitos. Los scripts de construcción y evidencia utilizan módulos de Node.

## Comandos

| Comando                                                  | Resultado                                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                      | Comprueba los tipos sin generar archivos.                                                                      |
| `npm run format:check`                                   | Comprueba el formato de fuentes, configuración y documentación.                                                |
| `npm run format`                                         | Aplica el formato del proyecto.                                                                                |
| `npm run test:unit`                                      | Ejecuta pruebas de dominio, servicios, navegación y controles negativos del arnés.                             |
| `npm run verify:unit -- output/unit/<runId>/result.json` | Contrasta una ejecución concreta con su salida TAP, los tests descubiertos, las fuentes actuales y la versión. |
| `npm run build`                                          | Genera `dist/Everett-0.7.5.html` y `dist/build-manifest.json`.                                                 |
| `npm run verify:build`                                   | Comprueba existencia, bytes, hash, versión e identidad de las fuentes del build.                               |
| `npm run test:browser`                                   | Ejecuta los recorridos preparados en Playwright sobre la URL indicada en `EVERETT_TEST_URL`.                   |

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

La salida se guarda en `output/browser/<runId>/`: resultados JSON, informe HTML, trazas, capturas y videos de fallos. Los casos leen el diagnóstico para contrastar resultados; las acciones utilizan controles y teclado. Un error de consola o de página hace fallar el recorrido.

Los casos actuales cubren entrada y regreso iniciales. Deben ampliarse con las interacciones reales, accesibilidad, regresiones y revisión visual exigidas por [Validación del prototipo](validacion-prototipo.md). La existencia de los archivos de test y su typecheck no acreditan una ejecución.

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
