# AGENTS.md — Everett

Marco común: `C:/Proyectos/AGENTS.md`. Leerlo si no está ya cargado. Este archivo define las particularidades del proyecto; mantener ambos niveles alineados.

## Alcance y referencias

Everett es un prototipo interactivo cuyo alcance aprobado avanza desde 0.7.5 hasta 1.0 por etapas.

- Al planificar o implementar producto, leer [Alcance del prototipo](docs/alcance-prototipo.md) y el detalle de la etapa afectada. Preservar los comportamientos aprobados y la secuencia de aprobación del usuario.
- Al modificar comportamiento, construir el arnés, validar o preparar una entrega, aplicar [Validación del prototipo](docs/validacion-prototipo.md). Sus comprobaciones son el **piso obligatorio, nunca el techo**: ampliar la cobertura según los riesgos y fallos encontrados.
- Las referencias visuales citadas por el alcance no equivalen a archivos recuperados. Comprobar su disponibilidad antes de afirmar que se inspeccionaron.
- Para la reconstrucción actual, aplicar [Recuperación de 0.7.5](docs/recuperacion-0.7.5.md). Preservar zoom, paneo, foco, entrada y regreso aprobados. El nombre y la representación de la vista del Mundo requieren elección del usuario entre propuestas revisables.

## Organización por iteración

- Trabajar una iteración por vez, con un chat de implementación y una rama específicos para cada 0.x, incluida la recuperación de 0.7.5. Mantener los chats de organización e instrucciones separados de los de implementación.
- Integrar la rama de una iteración en `dev` únicamente después de completar sus verificaciones y recibir la confirmación explícita del usuario aprobando el cierre de esa iteración.
- Comenzar la siguiente iteración cuando la anterior esté verificada, aprobada por el usuario e integrada en `dev`. El flujo de Git, incluidos los fixes, se rige por G1–G5 del marco común.

## Base y herramientas

La base local recibida es `Everett-0.7.5.html`, un HTML autónomo con CSS, JavaScript y un source map que contiene 59 fuentes TypeScript. El inventario y hash inicial están en el contrato de validación. Preservar este archivo como referencia de partida.

Las fuentes recuperadas están en `src/`. El proyecto utiliza TypeScript estricto, DOM nativo, esbuild y npm con lockfile. [Arquitectura](docs/arquitectura.md) define las responsabilidades y [Desarrollo](docs/desarrollo.md) documenta los comandos reproducibles, las dependencias y las evidencias. Las afirmaciones de la conversación anterior no acreditan ejecuciones locales ni la existencia de una entrega 0.8.

Comprobaciones disponibles: `npm run typecheck`, `npm run format:check`, `npm run test:unit`, `npm run build` y `npm run verify:build`. `npm run test:browser` requiere una URL HTTP(S) admitida en `EVERETT_TEST_URL` que sirva el HTML exacto del manifiesto. Ninguno de estos comandos por separado cierra el gate de producto.

Everett tiene un repositorio Git propio en `C:/Proyectos/Everett`, con `dev` como rama de integración. Aplicar G1–G5 del marco común. El repositorio del directorio padre corresponde a infraestructura y excluye las carpetas de proyectos; no usarlo para versionar Everett.

## Verificación específica

Para cambios de documentación, comprobar preservación del alcance y requisitos, enlaces locales y correspondencia con la fuente adoptada. Esa revisión documental no certifica el producto.

Para código y entregas, completar el gate definido en el contrato de validación, con evidencia del artefacto actual y comprobaciones del propio arnés. La aprobación de cada etapa y de 1.0 corresponde al usuario.
