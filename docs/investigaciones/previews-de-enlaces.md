# Previews reales de enlaces

Investigación solicitada el 25 de octubre de 2026, antes de implementar la generación de previews en Canvas 0.8. El usuario autorizó actualizar la candidata y el preview durante la implementación; priorizó funcionalidad y pruebas y excluyó el empaquetado ZIP de esta entrega.

## Patrón y estándares

- [Open Graph](https://ogp.me/) publica título, URL, imagen y descripción en los metadatos del destino. Es la base propuesta para las tarjetas estáticas de Everett, con fallback a título y descripción HTML cuando existan.
- [Miro](https://developers.miro.com/docs/preview-1) utiliza Open Graph para las previews de enlaces pegados. [FigJam](https://help.figma.com/hc/en-us/articles/4414079911575-Add-link-previews-in-FigJam) diferencia tarjetas estáticas de previews interactivas y conserva únicamente la información disponible en el sitio.
- [tldraw](https://tldraw.dev/sdk-features/external-content) distingue bookmarks de contenido incrustado. Su [documentación de integración](https://tldraw.dev/docs/sync#unfurling-service) contempla un servicio que obtiene los metadatos de los bookmarks.
- [oEmbed](https://oembed.com/) permite obtener representaciones de proveedores compatibles. Es una opción distinta de la tarjeta estática; no es necesario incorporar reproducción o HTML incrustado para resolver esta primera función.

## Bibliotecas comparadas

Versiones consultadas en npm durante la investigación, no deducidas de una rama de desarrollo.

| Biblioteca                                                           | Versión | Licencia | Compatibilidad declarada | Evaluación                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [link-preview-js](https://github.com/OP-Engineering/link-preview-js) | 5.0.1   | MIT      | Node >=22                | API directa para título, descripción e imágenes; permite recibir HTML ya descargado. Su variante Node contempla resolución de DNS, fijación de conexiones y validación de redirecciones. Candidato preferido para este alcance. |
| [metascraper](https://github.com/microlinkhq/metascraper)            | 5.58.5  | MIT      | Node >=22                | Reglas y fallbacks amplios, configurados mediante módulos. Alternativa válida cuando se necesite extracción más especializada; requiere componer la descarga y las reglas.                                                      |
| [open-graph-scraper](https://github.com/jshemas/openGraphScraper)    | 6.12.0  | MIT      | Node >=20                | Extrae Open Graph, Twitter Cards y otros metadatos; contempla decodificación de contenido. Su documentación indica que la biblioteca principal no funciona en navegador; la variante lite necesita recibir el HTML.             |

Las tres son compatibles con Node 24, utilizado por Everett. Incorporar una biblioteca de extracción permite reutilizar el parser y sus fallbacks en vez de escribirlos de cero. La integración con el estado, almacenamiento e interfaz de Everett sigue siendo código propio del producto.

## Comprobación aislada

Se instaló `link-preview-js@5.0.1` en `output/investigacion-enlaces`, sin modificar las dependencias raíz ni ejecutar scripts de instalación.

- Fixture Open Graph: se recuperaron el título y la descripción publicados y se resolvió una imagen relativa contra la URL de origen.
- Fixture sin Open Graph: se recuperaron `<title>` y la descripción HTML, sin inventar una imagen.
- Dos consultas reales, con timeout y resolución DNS: `https://ogp.me/` y la [guía de CORS de MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS). Ambas devolvieron título, descripción e imagen publicados por el destino.
- [Resultado de la evaluación](../../output/investigacion-enlaces/resultado.json) y [script reproducible](../../output/investigacion-enlaces/evaluate.mjs). Esta evaluación no es una integración ni sustituye el gate de una candidata.

## Decisión de alcance aprobada

El navegador solo puede leer respuestas de otros orígenes cuando el destino lo permite. Una biblioteca de parsing no elimina esa restricción. La [documentación de link-preview-js](https://github.com/OP-Engineering/link-preview-js#gotchas) requiere ejecutar la descarga en un servicio para resolver páginas generales.

El usuario aprobó un servicio local acotado a metadatos y portada como excepción al límite anterior de 0.8 sin backend. Reutiliza link-preview-js 5.0.1 para extracción, Undici 8.12.3 para HTTP con DNS fijado, ipaddr.js 2.5.0 para clasificación de IP e image-size 2.0.4 para límites de raster, todas MIT. Son dependencias de desarrollo del prototipo fijadas en el lockfile. No se agrega un proxy público ni procesamiento de agentes.

La descarga se compone aparte del parser para imponer límites durante la lectura, antes de retener el HTML o la imagen completos. Se reutilizan el cliente HTTP, el parser de metadatos, la clasificación de IP y la lectura de dimensiones; el código propio aplica los límites del servicio y coordina el estado de Everett. El costo es mantener un proceso Node local para generar nuevas previews y actualizar esas dependencias con el resto del prototipo.

El HTML autónomo debe conservar las tarjetas y previews ya almacenadas. Generar una nueva preview general requiere el servicio; abrir el archivo sin él no debe simular una descarga exitosa.

## Comportamiento propuesto para la integración

- Agregar desde el formulario o pegar una URL en el fondo del Canvas crea inmediatamente un enlace real. Pegar en un editor conserva la edición de texto habitual.
- El material muestra carga y después los metadatos reales disponibles. Si no hay imagen, requiere acceso privado o falla la descarga, conserva el enlace y explica el resultado sin fabricar contenido.
- Guardar metadatos y portada localmente permite recuperarlos al recargar. La respuesta tardía no debe recrear un material eliminado ni sobrescribir un nombre elegido por el usuario.
- El enlace conserva movimiento, tamaño, capas, conexiones, conjuntos, historial y navegación. La tarjeta estática sigue la dirección visual ya acordada en Canvas; no ejecuta HTML del destino.
- La descarga necesita límites de tamaño, tiempo y concurrencia, validación de protocolos y destinos, validación en cada redirección y tratamiento de imágenes no disponibles. Estos controles se aplican también al resolver portadas.

## Verificación necesaria

El arnés incorpora extracción y fallback; URLs relativas y contenido no confiable; fallos de descarga, respuesta no HTML, redirecciones y destinos rechazados; portada válida y rota; carga y recuperación; recarga y archivo autónomo sin servicio; eliminación, Undo/Redo y respuestas tardías; evento DOM de pegado dentro y fuera de editores; geometría, zoom y múltiples enlaces. El evento de pegado no modifica el portapapeles del usuario ni acredita una pulsación nativa de Ctrl+V. Las páginas controladas demuestran los errores de forma reproducible y las consultas públicas reales comprueban conectividad sin hacer depender de ellas todo el gate.

La integración pública del descargador recuperó los metadatos y bytes de portada de Open Graph y MDN: [resultado](../../output/investigacion-enlaces/integration-live.json). Una comprobación adicional del HTML servido, sin rutas sustituidas, creó la tarjeta de MDN mediante el formulario, la movió, recargó y abrió el visor: [resultado con hash del HTML](../../output/revision/0.8.15/live-ui.json), [Canvas](../../output/revision/0.8.15/live-mdn-canvas.png) y [visor](../../output/revision/0.8.15/live-mdn-viewer.png). Son evidencias complementarias al gate completo.

La integración debe completar el gate y revisión visual. Las consultas reales de la prueba inicial validaron conectividad y extracción; los casos controlados comprueban los fallos de forma reproducible.
