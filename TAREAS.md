# Tareas de Everett

Estado de las iteraciones y correcciones pendientes. El detalle funcional permanece en [Alcance del prototipo](docs/alcance-prototipo.md).

| Iteración                     | Estado                        | Trabajo                                                                                                                                                                                        |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.7.5                         | Aprobada e integrada en `dev` | [Reconstrucción y arnés](docs/iteraciones/0.7.5.md). Merge `dc1b4f4`. Entrega local en `entregas/0.7.5/`.                                                                                      |
| Mantenimiento del repositorio | Aprobado e integrado en `dev` | Salidas ordenadas, entrega conservada y reemplazo de ejecuciones comprobado. Rama `chore/orden-repositorio`.                                                                                   |
| 0.8                           | En desarrollo                 | [Canvas: contratos confirmados y verificación](docs/iteraciones/0.8.md). Desarrollo continuo con Vite; menús, bosquejos y copias conservados. Consulta espacial del iframe enfocado pendiente. |
| 0.9                           | Pendiente                     | Code y Docs; [editor integral por planificar](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral).                                                                            |
| 0.10                          | Pendiente                     | Sessions y Agents.                                                                                                                                                                             |
| 0.11                          | Pendiente                     | Board y Shipping Mode.                                                                                                                                                                         |
| 0.12                          | Pendiente                     | Vista de superficies del Mundo, barra global, perfil, configuración y sistema de diseño (Atomic Design).                                                                                       |
| 1.0 RC                        | Pendiente                     | Integración, regresión y pulido; definir el inicio y los nombres de Mundos y superficies.                                                                                                      |
| 1.0                           | Pendiente                     | Aprobación del prototipo.                                                                                                                                                                      |

## Después de 1.0

- Por evaluar: [Canvas — comentarios anclados a un punto de una imagen](docs/alcance-prototipo.md#después-de-10).

## Desarrollo continuo de Canvas

### Revisión del 1 de noviembre — biblioteca por rediseñar

El usuario fijó el alcance en bosquejos y wireframes de baja fidelidad, modernos o tradicionales,
mediante piezas elementales combinables. Media y alta fidelidad quedan fuera. La biblioteca actual
no se consideraba aprobada: rediseñar primero su catálogo y composición, evaluando fuentes MIT o
Apache-2.0, antes de seguir ampliando tipos aislados. Botones y campos deben poder descomponerse
en fondo, texto y símbolos. Cubrir login, inicio, invitaciones, alertas, mensajes, diálogos,
overlays, composers y paneles con una base común.

Quedan observados la selección difícil de una parte y la presentación de la distancia numérica
como «Separación exacta»: reunir valores y distribución dentro del bloque de alineación. El icono
de Bosquejos debe usar un lápiz. No se da por resuelto ese diseño con el control provisional.

La base de trabajo añade barras/rótulos, apariencia, dimensiones visibles, tabla que ocupa su alto,
edición por fila de listas antiguas, composiciones con partes independientes y distancia numérica.
El arnés incluye C08-U47–U49 y C08-B137–B142, con arrastres, edición real de partes, recarga,
Undo/Redo y una pantalla completa construida por gestos. Pasaron 115 pruebas unitarias y
21 recorridos dirigidos sobre las fuentes actuales, sin fallos, omisiones ni reintentos,
en `output/pruebas/navegador/2026-11-01_23-30-22-957Z/`. Esto no acredita la regresión
completa actual ni cierra el rediseño solicitado.

El [catálogo de diseño](design/wireframe-library/index.html), servido por el mismo Vite en
`/design/wireframe-library/`, contiene 109 muestras: 24 piezas y variantes de base, 65 composiciones
y 20 interfaces. Sus fuentes y arnés están versionados. CSS de Chalk y SVG
de Phosphor fijados por commit, con sus licencias MIT. La investigación sigue siendo temporal;
no se agrega un informe comparativo.

La revisión del usuario detectó estados artificiales y cargas genéricas en todas las familias.
La validación geométrica anterior no comprobaba su coherencia semántica. Se corrigió el alcance
por componente: herramienta activa y foco locales, selección distinta del foco, menús abiertos
anclados a su disparador, carga dentro de la región que espera datos y errores de la operación
correspondiente. Variantes de orientación, aspecto y tono se eligen por separado. Cada escenario
identifica qué parte cambia y por qué. Se conserva la estructura durante la carga y se distingue
texto simulado de skeleton de carga.

La comparación con Apple HIG y Material se aplica a anatomía, función y composición: acciones
normales, alternancias y destructivas; solo lectura, prefijos/unidades, intervalos y hora;
calendario completo; navegación inferior; paneles modales y no modales; confirmaciones; filas
con accesorios, agrupación y selección múltiple; chips por función y avisos con acciones.
Valor, foco y disponibilidad se combinan sin borrar la selección ni admitir estados incompatibles.
Cada muestra permite revisar su ancho y regla de composición; las interfaces permiten cambiar
el título. Reserva móvil, gestión de registros y conversación con panel reutilizan estas piezas.

La revisión de rótulos corrige el envío por icono y la cabecera propia de conversación; la
búsqueda queda en la lista de conversaciones. Paneles, pasos y navegación conservan palabras
completas al estrecharse. La adaptación usa el ancho de la composición. Registro, agenda,
invitación e inspector utilizan controles y contenido correspondientes a su tarea.

`npm run test:design` cubre 32 casos BLF-STATE-01–19 y BLF-ANATOMY-01–13: 1266 combinaciones
de muestra/variante/estado/datos y 488 combinaciones adicionales de estados y función.
`npm run test:design:browser` añade seis recorridos desde controles visibles y 2132
representaciones con geometría y recursos, a 1440/320 px, texto al 200 % y anchos propios
mínimos, intermedios y máximos, más resize por los puntos de cambio. Comprueba palabras completas
y contenido dentro de su control. Los contraejemplos detectan pérdida de valor, calendario
incompleto, piezas desancladas, palabras partidas y controles de chat fuera de contexto.
Las capturas se revisan además de las aserciones; el gate no equipara geometría
válida con calidad visual. Tipado y formato correctos. La última salida e identidad de fuentes
permanecen en `output/pruebas/diseno/`.
El 4 de noviembre el usuario aprobó integrar la biblioteca en Canvas. El trabajo incorpora
el catálogo compartido, variantes/estados, creación por botón y arrastre, piezas independientes
dentro de conjuntos y edición de texto, símbolos y apariencia. Las pruebas del catálogo por sí
solas no certifican esa integración: C08-U50 y C08-B143–B147 añaden historial, duplicación,
persistencia, cancelación, errores de recursos y correspondencia visual. El gate inicial aprobó
116 pruebas unitarias y 220 recorridos de navegador sobre las fuentes de esa integración, incluidos los
controles negativos del arnés y la sesión sostenida. La comparación de 568 representaciones
comprueba rótulos y barras, su geometría y color; se revisaron además las capturas de creación,
edición y ventana estrecha. El catálogo conserva sus 32 pruebas y seis recorridos aprobados.
Evidencia de esa integración en `output/pruebas/navegador/2026-11-04_10-23-51-276Z/`.
La revisión posterior la sustituye; 0.8 permanece abierta, sin integrar en `dev`.

La revisión posterior rechazó la navegación y detectó miniaturas descentradas y poco contraste.
La corrección retira la paleta anterior y abre un desplegable de hasta 280 × 360 px anclado a
Bosquejos, con categorías, búsqueda y scroll interno. Clic o arrastre insertan y cierran la
biblioteca; no hay ficha intermedia, formulario de ancho ni botón adicional para agregar.
Las variantes y estados útiles quedan en opciones compactas junto a la pieza; se cierran si
su anclaje se desplaza. Texto simulado/rótulos se elige en la biblioteca.
Los materiales ya guardados conservan sus editores. Se encuadra la tinta visible y se refuerza el
contraste de las miniaturas sin alterar el material insertado. La revisión con Emil e Impeccable
detectó además contraste insuficiente en la pestaña activa y componentes pequeños reducidos por
el espacio vacío del catálogo; ambos se corrigen. C08-B148–B149 añaden navegación, ventanas bajas,
creación sucesiva y centrado de las 24 piezas básicas, con contraejemplos de desplazamiento y
contraste insuficiente. La corrección supera 116 pruebas unitarias y 222 recorridos de navegador,
sin fallos, omisiones ni reintentos, incluidos los controles negativos y 30 ciclos sostenidos entre
superficies. Se revisaron las capturas del desplegable, miniaturas y opciones a 550 y 1440 px;
el arnés cubre también 320 px, ventanas bajas y texto al 200 %. Tipado y formato correctos.
Evidencia de esa corrección en `output/pruebas/unitarias/2026-11-05_01-45-49-678Z/` y
`output/pruebas/navegador/2026-11-05_01-52-31-003Z/`, verificada contra las fuentes servidas por
Vite en 4173, SHA-256 `ab5bde0374269f0fff79f635a6d35379c3bebce3f05c610b348ec416e10325da`.
Pendiente de revisión del usuario; 0.8 permanece abierta y sin integrar en `dev`.

La revisión del 6 de noviembre detectó miniaturas e inserciones fallidas, componentes que se
desarmaban al mover una parte y espaciado numérico fuera de contexto. Los recursos de la biblioteca
se incorporan a la aplicación: no dependen de nuevas peticiones para crear miniaturas ni piezas.
Los componentes se seleccionan, mueven, escalan, duplican y asignan como unidad; desagrupar es
explícito. Las piezas básicas y los conjuntos manuales conservan su comportamiento. Los botones
ya no incorporan la superficie blanca de exhibición; las composiciones que necesitan un fondo
de lectura lo conservan ajustado a sus partes. Los materiales guardados no se modifican.
La biblioteca usa un selector compacto Barras/Rótulos y un icono de hoja de bosquejo. Los campos
de espaciado forman parte de alineación y aparecen con dos o más unidades seleccionadas.
C08-U51 y C08-B150–B152 añaden desconexión de red, hora, arrastre, selección de componentes,
resize por puntero/teclado, asignación, copia, persistencia y cancelación del espaciado.
Verificación de esa corrección: 117 pruebas unitarias y 225 recorridos de navegador aprobados, sin fallos,
omisiones ni reintentos, incluidos los controles negativos y los 30 ciclos de uso sostenido.
La comparación conserva 568 representaciones; se revisaron además las capturas de la biblioteca
a 320 px, alineación contextual, hora y botón insertados sin red, y piezas después de desagrupar.
Tipado, formato y verificadores independientes correctos. Evidencia de esa corrección en
`output/pruebas/unitarias/2026-11-07_02-31-43-833Z/` y
`output/pruebas/navegador/2026-11-07_02-31-54-022Z/`, SHA-256 de las fuentes servidas
`8a307719f21687767b2ccf65533d2ac3d2ee112cec85a8e0c0b83138acf67ecb`.
Vite continúa en 4173. Pendiente de revisión del usuario; 0.8 permanece abierta y sin integrar en `dev`.

El ajuste del 7 de noviembre reemplaza Barras/Rótulos por el switch «Mostrar rótulos» y lleva
la búsqueda a la cabecera: la lupa la despliega hacia la izquierda, filtra al escribir y al cerrar
limpia el filtro y recupera la categoría. Escape cierra primero la búsqueda y después la biblioteca.
Cambiar el texto actualiza las miniaturas sin perder el punto de desplazamiento de la lista.
Con texto al 200 %, las pestañas se desplazan horizontalmente y las piezas pasan a una columna.
C08-B153 comprueba geometría durante la transición, teclado, foco, movimiento reducido,
conservación del scroll y correspondencia entre switch, miniaturas e inserción.
Pasaron 117 pruebas unitarias y los 32 recorridos afectados, sin fallos, omisiones ni reintentos;
tipado, formato, revisión visual y verificación independiente de fuentes/evidencias correctos.
Es una regresión dirigida del desarrollo continuo; no sustituye el gate completo de cierre.
Evidencia en `output/pruebas/unitarias/2026-11-07_14-32-09-353Z/` y
`output/pruebas/navegador/2026-11-07_14-32-09-664Z/`, SHA-256 de las fuentes servidas
`15123247e27e96fe88306893a2fb2cd4694a1e6a39ae78962594717dfcbfe5f9`.
Vite sigue en 4173; pendiente de revisión del usuario, sin cerrar 0.8 ni integrar en `dev`.

La revisión siguiente del 7 de noviembre corrige el parpadeo del switch y de la búsqueda:
conserva las tarjetas preparadas en las tres categorías. Unifica los contornos de las miniaturas
y usa el símbolo convencional de máscara de Phosphor (MIT). Las piezas nuevas de texto no llevan
placa blanca y adaptan su tinta a fondos planos; el color elegido explícitamente se conserva.
El foco de teclado permanece visible, el clic no deja halo en la lupa y el nombre del Mundo ocupa
el ancho de sus glifos. C08-U52 y C08-B154–B156 cubren continuidad por fotogramas, grosores,
texto sobre fondos claros/oscuros, teclado y cabeceras estrechas.
Pasaron 118 pruebas unitarias, 32 del catálogo y 67 recorridos de regresión dirigida, sin fallos,
omisiones ni reintentos, incluida la comparación de 568 representaciones y controles negativos.
Tipado, formato, revisión visual y verificación independiente de fuentes y evidencias correctos.
Evidencia en `output/pruebas/unitarias/2026-11-07_15-24-34-190Z/` y
`output/pruebas/navegador/2026-11-07_15-24-34-261Z/`, SHA-256
`bc0c250143783062349371503ae22ecf126174ff45f7a109eb2e6c6e1691efc9`.
Continúa en revisión del usuario sobre Vite en 4173; no sustituye el gate completo de cierre.

La revisión de alineación y notas del 7 de noviembre mantiene el acceso de cabecera, ahora Alinear.
Conserva visibles bordes, centros, espaciado por eje y capas; habilita cada acción según la
selección y la superposición real. Los valores y la distribución comparten el mismo bloque.
Seleccionar usa flecha sobre materiales y zonas; Mano, creación, tiradores y texto conservan sus
cursores. Las notas comparten formato y tinta entre tarjeta y editor: ocho colores, contraste
mínimo 4,5:1, tres familias de letra y tamaño de 12 a 32 px, guardados por nota. Los títulos y
cuerpos extensos crecen sin scroll interno. Se corrigió además el cierre exterior de paneles
al pulsar un control desactivado de la cabecera.
C08-U53 y C08-B157–B159 amplían el arnés; B118/B152 siguen el comportamiento autorizado de
controles visibles y B63 conserva el caso de cierre. Pasaron 119 pruebas unitarias/del arnés y
64 recorridos de regresión dirigida, sin fallos, omisiones ni reintentos. Tipado, formato,
revisión visual a 1440/320 px y verificación independiente de fuentes y 187 adjuntos correctos.
Evidencia en `output/pruebas/unitarias/2026-11-07_16-54-54-091Z/` y
`output/pruebas/navegador/2026-11-07_16-54-52-953Z/`, SHA-256 de las fuentes servidas
`5c18e0f4c44af2ef4a4326d7e9f2772881e87d223bbfcd3c3064d2049d348899`.
Pendiente de revisión del usuario en Vite 4173. No cierra 0.8 ni integra en `dev`.

La revisión de jerarquía del 7 de noviembre rediseña las trece interfaces existentes y añade
siete recorridos: producto, compra, archivos, lectura, perfil, notificaciones y curso con video.
Se separan navegación, contenido y acciones; se retiran fondos redundantes y se ajustan tamaños,
espaciados y adaptación. Dashboard, editor y archivos tienen navegación lateral compacta o
con rótulos. Reserva y atención de un caso usan contenido propio de su tarea. Se corrigió además
la contaminación de las composiciones por estilos globales del catálogo.
El filtro de familias se abre desde un icono compacto. Una interfaz seleccionada conserva su
nombre completo y Separar al alejarse; los nombres sin seleccionar admiten un ancho menor.
Las nuevas inserciones usan las plantillas revisadas; las composiciones guardadas y la comparación
manual del usuario permanecen intactas. C08-B160–B161 y BLF-ANATOMY-14/BLF-BROWSER-07 amplían
el arnés. Pasaron 119 pruebas unitarias/del arnés, 33 del catálogo, siete recorridos visuales
con 2.207 representaciones y 50 recorridos de regresión dirigida, sin fallos, omisiones ni
reintentos. Tipado, formato y revisión visual correctos; la comprobación independiente acredita
las fuentes servidas y 184 adjuntos. Evidencia en
`output/pruebas/unitarias/2026-11-07_18-41-26-253Z/`, `output/pruebas/diseno/` y
`output/pruebas/navegador/2026-11-07_19-08-24-019Z/`, SHA-256
`e1907311bff6c4dc547940ffe95af179688ef4f0bcf07992124476bed8c18e05`.
Pendiente de revisión del usuario; esta regresión dirigida no sustituye el gate completo de
cierre de 0.8. Sin integración en `dev`.

La revisión de bosquejos y organización del 28 de octubre está implementada en `0cfc2e4` y
`d86750d`: pantalla libre con formatos de dispositivo, texto editado sobre su pieza, incorporación
por arrastre y clic, distribución operable sobre solapamientos y guías con referencias visibles
identificadas. Agregar una pieza muy pequeña acerca como máximo al 100 %; el encuadre explícito
conserva su recorrido. El texto adapta su altura junto con cables, conjuntos e historial; los
botones Deshacer/Rehacer se actualizan durante la edición. Pendiente de revisión del usuario.

El arnés construye una pantalla con gestos reales y cubre cancelación, zoom, proporciones libres,
formatos, texto, geometría derivada y persistencia (C08-B132–B136). C08-U44 comprueba además
2.000 distribuciones reproducibles. La regresión detectó que el helper de navegación intentaba
pulsar el centro de Agents debajo de la cabecera, aunque había comprobado su rótulo visible.
`e0a9aed` dirige ese clic al rótulo con hit testing normal; UI-NAV-08 reproduce esa geometría.

El usuario retiró el flujo de entregas puntuales el 27 de octubre de 2026. Usar únicamente
Vite en 4173 para desarrollar y revisar las fuentes modulares. No generar HTML autónomo, ZIP
ni informe adicional por cada revisión. Conservar el origen y los datos locales del usuario.
No integrar en `dev` ni cerrar 0.8. El gate cotidiano evalúa fuentes identificadas y mantiene
los recorridos funcionales, la regresión, los controles negativos y la revisión visual.

Servidor Vite, protocolo de enlaces y worker PDF adaptados; CSS con HMR y código con recarga
automática y recuperación del guardado. DEV-01 comprueba cambios reales en una copia temporal,
recuperación de un error de sintaxis, datos de revisión y rechazo de puerto ocupado. Implementado
en `83489da`. El arnés
registra la identidad de las fuentes en `target.json` y rechaza una revisión distinta. Los dos
casos exclusivos de abrir el antiguo HTML como archivo se conservan en su gate histórico,
sin contarlos como aprobados sobre fuentes. La verificación inicial de la conexión a Vite
comprobó los nueve materiales del usuario y el zoom del 16 %. La revisión visual de bosquejos
se hizo en una pestaña auxiliar con otro origen de almacenamiento.

**Verificado: 112 pruebas unitarias/del arnés y 209 recorridos de navegador sobre Vite**, sin
fallos, omisiones ni reintentos. La regresión duró 29,7 minutos e incluyó 30 ciclos sostenidos
durante 541.449 ms. Pasaron los verificadores independientes de resultados, identidad de fuentes,
inventario de casos y adjuntos, además de tipado, formato y revisión en el navegador interno.
El tipo de objetivo es `development`; no se acredita un HTML ni una entrega empaquetada.

- [Resultado unitario](output/pruebas/unitarias/2026-10-28_08-42-51-536Z/result.json).
- [Resultado de navegador](output/pruebas/navegador/2026-10-28_09-01-59-915Z/results.json) e [identidad de fuentes](output/pruebas/navegador/2026-10-28_09-01-59-915Z/target.json): SHA-256 `2aacd3e6637e66fdc7088295435edf0bcec4de95b426df2dadb95fc079562fce`.
- Revisión visual: [pantalla compuesta mediante arrastres](output/revision/0.8.22/bosquejo-compuesto.png), [referencia de las guías](output/revision/0.8.22/guias-referencia-visible.png) y [texto conectado y agrupado](output/revision/0.8.22/texto-conectado.png).
- [Verificación inicial de Vite en la pestaña del usuario](output/revision/0.8.22/vite-iab.png). La conexión HMR está activa y se conserva el mismo origen de almacenamiento.

Solo queda Vite en 4173. El servidor de HTML anterior y las instancias y pestañas auxiliares de
pruebas se cerraron. La corrección no vuelve a acreditar el gesto dentro del iframe externo
enfocado: su límite sigue documentado debajo. 0.8 permanece abierta, sin integrar en `dev`.

## Menús por función — 0.8.22 verificada

El feedback de la revisión de 0.8.21 separa creación, organización de la selección y vista.
Implementado en `f1ca325`: Bosquejos abre la biblioteca directamente, Organizar ofrece alineación
y distribución y Vista conserva encuadre y ajustes. Canvas permanece como ubicación. Se preservan
las herramientas del dock, las acciones contextuales y los estados compartidos de preferencias.
C08-B131 comprueba ámbitos sin mezcla, un solo menú abierto, entradas directas, foco, teclado,
300–1440 px y texto al 200 %. Se corrigió el recorte del perfil con Superficies activado a 300 px
y el tooltip que tapaba el menú abierto. La regresión completa pasó sobre el HTML final,
servido en 4173 con identidad verificada, sin recargar la pestaña ni alterar los datos de revisión.
Pendiente de revisión y aprobación del usuario.

## Bosquejos de interfaz — 0.8.21 verificada

Implementados en `44ca124`: la biblioteca ofrece las nueve piezas confirmadas, con edición
automática de contenido y tablas por celdas. Se conservan selección, guías, tamaño, capas,
conjuntos, conexiones, comentarios, duplicación, portapapeles, búsqueda y persistencia. Pantalla
y piezas se agrupan explícitamente para mover una composición completa. El contrato permanece
en C08-WIRE-01; las licencias permisivas y sus avisos están registrados en Desarrollo.

El arnés incorpora C08-U42–U43 y C08-B126–B130. Las pruebas dirigidas encontraron y corrigieron
el nombre accesible del menú, el desborde de tablas extensas a 320 px/texto 200 %, el contraste
del texto sobre la pantalla clara y la geometría del borde durante resize. El historial distingue
escritura en diferentes celdas y cambios estructurales. La revisión visual añadió una regresión
para conservar la celda enfocada y el panel completo dentro de la ventana al ampliar el texto;
correcciones en `4e8508e` y `4fe1f33`. Gate completo aprobado sobre el HTML final, servido en 4173
sin recargar la pestaña ni alterar los datos del usuario. Pendiente de su revisión y aprobación.

## Antecedente: copias locales — 0.8.20 verificada

No inicia otra etapa ni implica aprobación de cierre. Las copias locales, duplicación múltiple,
Ctrl+D y Ctrl+C/Ctrl+V están implementados. La incorporación explícita transforma la pieza en una
referencia al elemento nuevo, según la decisión confirmada por el usuario. Regresión completa:
104 pruebas unitarias y 199 de navegador aprobadas sobre el HTML final; evidencia e integridad
verificadas. Servido en 4173, sin recargar la pestaña ni alterar los datos de revisión del usuario.

### Correcciones y capacidades confirmadas

- Copias independientes locales: aplicar C08-MAT-08 actualizado a notas, formas, dibujos, imágenes,
  videos, PDF, enlaces y materiales de Docs, Board y Code. La copia se guarda en Canvas; editarla,
  renombrarla o eliminarla no modifica el original ni crea elementos en otras superficies.
- Duplicación múltiple y copiar/pegar: menú contextual sobre toda la selección, atajo de duplicación
  y Ctrl+C/Ctrl+V. Conservar disposición relativa, tamaño, apariencia, independencia, persistencia
  y una operación de historial coherente; respetar el texto de los editores y manejar los fallos
  del portapapeles. Atajo Ctrl+D configurable; conservar conexiones internas y conjuntos completos.
- Incorporación explícita de una copia a Docs, Board o Code: crear un elemento nuevo únicamente
  cuando el usuario lo pida. Solicitar nombre o ruta y vincular la pieza al elemento recién creado.
  Los fragmentos se copian como texto independiente, con edición y guardado local.

### Pendientes conservados

- Navegación espacial en reproductores externos: sigue abierto Alt pulsado después de enfocar el
  iframe. Investigar una solución compatible con la acción local y los controles del proveedor;
  conservar la flecha y no presentar el límite como resuelto si exige otro contenedor.
- Panorama: corregido el solapamiento puntual entre identificación contextual y etiqueta de
  conexión al seleccionar o pasar el puntero por un documento a 0,4×. C08-B123 comprueba la
  geometría y el material intacto; C08-B84 conserva el recorrido anterior de anclajes y escalas.
- Zoom: queda pendiente la calibración perceptual con mouse/trackpad y revisión del recorrido
  1–600 %. No cambiar límites solo por su diferencia numérica; contrastar respuesta, punto de
  enfoque, inversión, detención y navegación local/espacial.
- Arnés: cubrir las operaciones nuevas y los fallos manuales con datos y representación reales,
  independencia de originales, no creación automática en otras superficies, recarga, historial,
  grupos, conexiones, fragmentos, errores y foco. Mantener la regresión y revisión visual.

### Pendientes que requieren definición de alcance o dirección visual

- Arrastrar referencias desde otro navegador, incluido un video de YouTube: idea por evaluar;
  verificar URI/HTML/texto y posición de suelta con un arrastre real entre ventanas.
- Aplicación final: definir el destino de Abrir original y el contenedor para aplicaciones web
  completas. El comportamiento del navegador interno de Codex no decide el de Everett.

Los errores de YouTube y su contraste ya están corregidos y comprobados debajo. Alineación,
distribución, menú superior y galería de selección ya están implementados; conservarlos y revisar
feedback nuevo, sin volver a presentarlos como funcionalidades pendientes. El editor integral
sigue en 0.9 y el procesamiento real de agentes requiere otro alcance. No integrar en `dev`.

## Corregido — errores de reproducción

YouTube devolvió `onError` 150 para `NIjruQLJQfo` tanto en Everett como en el iframe oficial aislado; `DYoSIFn_nac` reprodujo en ambos. El reproductor distingue los códigos documentados y usa un mensaje neutral cuando no puede identificar la causa. Se conserva Abrir original. C08-B97 cubre los códigos de YouTube, errores desconocidos, origen ajeno y Vimeo. La comparación real reproducible está en `tests/public/youtube-comparison.mjs`.

En la verificación de 0.8.19 se sirvió el HTML corregido en 4173 con SHA-256 `d4e0875a62887255f511a6feed3441c975af943f9c43c45bb80fade8b0d03bca`. Build, tipado, formato, 101 pruebas unitarias y 193 pruebas de navegador verificadas sobre ese HTML. La comparación pública y la captura del rechazo real están en `output/revision/0.8.19/youtube-comparison.json` y `youtube-error-real.png`. La primera regresión paralela agotó el tiempo en borradores de Agents; la ejecución completa posterior con un navegador pasó, incluido ese caso. La evidencia y el hash de la verificación anterior al final de este archivo corresponden al artefacto previo. Sigue pendiente el gesto espacial dentro del iframe enfocado; 0.8 no está cerrada ni integrada en `dev`.

## Implementado — organización de Canvas 0.8.19

- Menú de acciones y ajustes en la barra superior, ubicación confirmada por el usuario. Alinear y distribuir también pertenecen al menú contextual de la selección; las guías siguen activas automáticamente por defecto.
- Seis alineaciones y espacios iguales entre piezas de tamaños distintos, conservando extremos, conjuntos completos, tamaño, pertenencia, historial y persistencia. Contratos C08-ARRANGE-01 y C08-ACTIONS-01; comprobar geometría efectiva, no solo presencia de controles.
- Menú compacto y anclado, accesible por teclado, a 320 px y con texto ampliado. Los accesos a Preferencias y Atajos reutilizan la configuración y sus valores.
- Próximo bloque requerido de 0.8: bosquejos de interfaz útiles de baja fidelidad. Definir piezas editables y su representación y evaluar soluciones reutilizables compatibles con el carácter propietario antes de adoptar una biblioteca. La lista inicial propuesta está en [Alcance](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar). Sustituye la postergación anterior; la implementación 0.8.21 está verificada y pendiente de revisión del usuario.
- Preservar los límites de consulta externos documentados debajo. No integrar en `dev` ni cerrar 0.8.

## Base verificada — consulta 0.8.17

La revisión de 0.8.16 está implementada en `27ef7ce`, `b7200c2` y `689c131`: regreso por niveles de lectura, controles compactos, inspección de imágenes, reproducción y salida espacial, pegado recuperable y confirmaciones locales. Se aplicaron ampliamente las skills de Emil, break-ui y Apple junto con Transitions.dev, según los [criterios adoptados](docs/desarrollo.md#criterios-adoptados-para-la-revisión-de-canvas). La revisión transversal cubrió dock, tarjetas, conexiones, conjuntos, zonas, propuestas, chat, gestos y visores; los hallazgos corregidos permanecen en el arnés.

Gate completo aprobado: 95 pruebas unitarias/de herramientas y 181 de navegador, sin omisiones ni reintentos. Se verificaron artefacto, fuentes, controles negativos e informe. La revisión visual y las comprobaciones públicas corresponden al mismo HTML. Su revisión terminó y dio lugar a las correcciones 0.8.18 indicadas debajo. No integrar en dev ni cerrar 0.8.

## Correcciones implementadas — 0.8.18

La revisión de 0.8.17 terminó y el usuario autorizó implementar. Alcance: contrato global de rueda local y modificador espacial configurable en Atajos (Alt por defecto), zoom de imagen gradual, galería acotada a las imágenes seleccionadas, reanudación de lectura, estados útiles para aplicaciones web y fallos de red, sugerencia local aceptable con Tab, renombrado fiable con Enter, encuadre contextual y guías de alineación. Preservar los comportamientos confirmados. La base es 0.8.17. La regresión actual verifica los cambios; la comprobación pública mantiene abierto el gesto del iframe enfocado.

La galería de selección queda autorizada en 0.8 por el último feedback; no añade otra superficie de biblioteca. Las guías reutilizan el cálculo de proximidad de Moveable (MIT), adaptado al modelo de coordenadas existente, sin incorporar su framework de arrastre ni código de Penpot.

- Lectura web: la portada de YouTube no ofrece una consulta útil. Distinguir aplicaciones/índices de artículos o videos concretos y resolver un estado accionable; el lector actual no es un navegador de aplicaciones completo.
- Retomar una lectura: poder regresar a la última página consultada dentro de una referencia (ejemplo: Introduction de Godot) sin recorrer de nuevo la portada. Conservar el historial de regreso y distinguir posición de lectura de identidad de la referencia.
- Video: revisar autoplay al entrar; el usuario cuestiona que empiece solo. La rueda común debe quedar para la acción local del reproductor/visor y Alt + rueda para navegación espacial. Corregir el desplazamiento visible previo a salir y la salida sin Alt observados. Las pruebas deben reproducir el gesto sobre el video/iframe, con foco en los controles y cambios de modificador.
- Acceso contextual: ofrecer Ajustar a la selección sobre materiales seleccionados desde su menú contextual. Penpot Focus mode también oculta el resto de elementos: no confundir ese aislamiento con el encuadre de cámara existente ni incorporarlo automáticamente.
- Abrir original: definir dónde abre en la aplicación final, diferenciando la lectura interna, el entorno web y un eventual contenedor de escritorio. El comportamiento actual del navegador de Codex no define esa política.
- Navegador de Codex: el usuario intentó soltar el enlace de Penpot en la zona de pestañas para crear otra pestaña; allí aparece prohibido, mientras que la barra de direcciones sí lo acepta. No es un fallo atribuido al Canvas de Everett.
- Idea por evaluar para la incorporación a Canvas: arrastrar una referencia de video desde otro navegador (Brave/YouTube) y crear la tarjeta en el punto de suelta, reutilizando la resolución de enlaces existente. Comprobar el enlace de la miniatura/título y las representaciones URI/HTML/texto que entrega el navegador; no confundir el enlace al video con la imagen de portada ni asumir que se transfieren los bytes del video. Actualmente no hay receptor de arrastres externos en las fuentes. Verificar con arrastre real entre ventanas/navegadores, distintas escalas, persistencia y Undo/Redo antes de acreditarlo. No implementar durante esta revisión.
- Penpot se incorpora como referencia funcional y de calidad de vida para el trabajo espacial, junto con la investigación de alineación. Everett es propietario y de código cerrado: cualquier reutilización queda sujeta a los [criterios de compatibilidad de licencias](docs/desarrollo.md#compatibilidad-de-licencias-con-everett). No se ha incorporado código de Penpot; priorizar alternativas permisivas o implementación independiente si las obligaciones no encajan.

## Límites comprobados de consulta

- Dentro del iframe externo enfocado, sus teclas no llegan al documento de Everett. La rueda común ya no sale ni desplaza el visor; el modificador permite salir cuando el documento lo recibe. Alt pulsado después de enfocar los controles externos sigue pendiente: la prueba pública lo registra como fallo y la flecha conserva el regreso. Resolverlo por completo requiere cooperación del proveedor o captura en un contenedor nativo, sin apropiarse del teclado del reproductor.
- El lector no ejecuta la aplicación completa de YouTube.com. Su inicio muestra un estado compacto con explicación y origen; los videos específicos utilizan el reproductor oficial. La consulta de aplicaciones web completas dentro de Everett y el destino final de Abrir original requieren una decisión de contenedor.

## Implementada en 0.8.18 — guías de alineación

Solicitada durante la revisión de 0.8.17: mostrar guías temporales al arrastrar materiales para alinear bordes y centros con otros elementos, con ajuste por proximidad opcional. Contrastar Figma, Canva y otros canvases de diseño y evaluar soluciones reutilizables antes de implementar; no partir de cero por defecto. La investigación es temporal; conservar aquí el alcance y posteriormente las decisiones adoptadas.

La implementación usa cinco píxeles de pantalla y Ctrl/Meta para suspender temporalmente el ajuste. C08-U35, C08-B113 y C08-B115 comprueban bordes, centros, varias escalas, cancelación, Undo/Redo, geometría de guías y movimiento de selecciones/conjuntos sin deformarlos. El ajuste no debe introducir saltos al soltar ni mover elementos ajenos a la selección. Esta mejora se implementa en 0.8.18 y no formaba parte del HTML 0.8.17 revisado por el usuario.

## Antecedente — enlaces reales en 0.8.15

Implementación de C08-URL-01 en `feat/canvas-0.8`: previews mediante servicio local mínimo aprobado expresamente por el usuario. Se compararon bibliotecas y se adoptó link-preview-js (MIT) con descarga acotada y almacenamiento local. El usuario autorizó actualizar el preview durante este trabajo y excluyó el ZIP; se conservan el gate completo, revisión visual, informe y fuentes versionadas. No integrar en `dev` ni cerrar 0.8.

Candidata 0.8.15 con gate completo: tipado, formato, 91 pruebas de lógica/herramientas y 167 de navegador aprobadas, sin omisiones ni reintentos. Incluye siete regresiones nuevas de navegador y sesión sostenida de 30 ciclos. El informe, fuentes e identidad del HTML fueron verificados. La prueba pública de MDN sin respuestas sustituidas compara los mismos bytes de portada mediante SHA-256 antes y después de recargar. La evidencia de 0.8.14 se conserva como antecedente en su paquete.

## Antecedente — revisión de 0.8.17

La candidata 0.8.17 conserva la lectura web, los archivos por URL y los comportamientos confirmados. Se simplificó la consulta con una flecha compacta y regreso espacial por niveles, se unificaron los visores y se corrigieron las confirmaciones, el teclado, los datos externos extremos y los comentarios con zoom bajo y ventana estrecha. El detalle de cambios y recorridos de revisión permanece en la evidencia enlazada al final.

- Revisar la utilidad del lector, el regreso desde páginas seguidas y la incorporación de referencias visuales con material propio.
- La rueda de Canvas responde sin cola y Ajustar a la selección puede ampliar hasta el máximo de cámara. Se conserva 1–600 %; la calibración perceptual y el uso con trackpad físico requieren revisión del usuario. Las pruebas verifican cursor, inversión, detención, unidades de rueda y encuadre.
- Vimeo: cargó el iframe oficial, pero no reprodujo el ejemplo público en el navegador de pruebas. El mismo rechazo aparece en un iframe aislado, con autoplay y sin sandbox. No se acredita reproducción ni se atribuye una causa definitiva. YouTube sí reprodujo contenido real. El origen y el regreso permanecen disponibles.

## Antecedente — Canvas 0.8.14

**Candidata 0.8.14 con gate completo; pendiente de revisión del usuario.** Se corrigieron capacidad del dock, anclajes y densidad de identificaciones durante zoom, colisiones entre encabezados y tarjetas, rueda en zonas y ubicación de las preferencias. Se preservan capas, formas, conexiones, conjuntos y referencias confirmadas.

La revisión de 0.8.13 terminó. La corrección se limita a anclajes y densidad de etiquetas durante zoom, capacidad del dock, acciones de rueda en zonas y agrupación de preferencias. La cámara conserva el recorrido multiplicativo de 1–600 %; se comprueban cursor, reversibilidad, unidades de rueda y límites. El texto completo de zonas usa 16/14 px de pantalla. El rediseño general de configuración sigue en 0.12.

Implementación en `feat/canvas-0.8`. 0.8 sigue abierta y no se integra en `dev`. La revisión del usuario confirmó selección parcial, conjuntos y referencias a fragmentos; las correcciones actuales preservan esos recorridos.

Criterio de utilidad confirmado por el usuario: [organización visual y espacial](docs/alcance-prototipo.md#organización-visual-y-espacial) de materiales de distintas superficies, relaciones entre tareas, código, decisiones y referencias, comprensión del conjunto y diagramación. Debe servir para trabajo manual sin agentes; Everett es un ejemplo de proyecto complejo, no el límite del caso de uso.

La evaluación de 0.8.8 identificó pertenencia manual temporal, ausencia de referencias precisas y ocho etiquetas sobre tarjetas en el panorama de veinte materiales. La solución autorizada se concreta en C08-ORG-01 y C08-REF-01 y en la ampliación de C08-B49. El detalle funcional y la matriz están en [Canvas 0.8](docs/iteraciones/0.8.md).

- Conjuntos: crear desde selección múltiple, nombrar, mover, deshacer, recuperar y separar sin borrar materiales. Conservan miembros durante asignación/devolución y no sustituyen zonas ni propiedad de agentes.
- Fragmentos de Docs y Code: selección nativa del rango, preview y entrada al mismo origen, seguimiento de ediciones y estado no disponible. Copiar Docs conserva independencia. Las propuestas preservan contenido vecino y rechazan conflictos de origen.
- Controles: búsqueda siempre en la cabecera, Undo/Redo compactos, salida de Formas, conexión seleccionada con un clic, etiqueta con doble clic y Enter/Esc sin botones, eliminación por teclado, opacidad dentro del color. Superficies está oculto por defecto y tiene un switch persistente en Configuración → Preferencias.
- Panorama: comprobar etiquetas fuera de tarjetas, continuidad del cable, zoom, movimiento y nombres de conjuntos alcanzables. El nombre de una forma sigue en su identificación contextual; las piezas de texto editables se implementan en el bloque de bosquejos 0.8.21 indicado arriba.

## Límites y trabajo posterior

Canvas sigue en desarrollo. El gate de una candidata no acredita por sí solo la utilidad completa ni aprueba la iteración. Evaluar sus recorridos y resultados con la revisión del usuario.

- Agentes: la simulación local conserva y reorganiza archivos visuales sin interpretarlos. El procesamiento real requiere definir un trabajo e integración aparte; no se implementa un proveedor en esta etapa.
- Referencias: rangos de texto, sin identidad semántica de AST. Una reescritura completa o recuperación ambigua requiere revisar el vínculo. Los conjuntos son planos; sus miembros se pueden sacar por arrastre o acción contextual.
- Pulido del panorama: a 0,4×, la identificación contextual del documento seleccionado puede cubrir temporalmente una etiqueta de relación situada encima; deseleccionar recupera su lectura. C08-B49 comprueba los cuerpos de las tarjetas y los cables, no la ausencia universal de solapamientos con identificaciones transitorias.
- [Mejoras de Canvas](docs/alcance-prototipo.md#mejoras-de-canvas-por-evaluar): la galería de selección está implementada en 0.8.18; la organización y los bosquejos de baja fidelidad pasan a ser trabajo requerido de 0.8 según la ampliación indicada arriba. [Editor integral](docs/alcance-prototipo.md#ampliación-por-planificar-editor-integral): planificar y evaluar herramientas open source en 0.9.
- 0.12 conserva el rediseño general de perfil/configuración, barra global, Estado y vista de superficies. Las correcciones de búsqueda, navegación alternativa, agrupación de Preferencias/Herramientas y configuración compacta con preferencias de Canvas son los ajustes transversales de este trabajo de 0.8.

Sin fallos abiertos dentro del alcance cerrado de 0.7.5. Los ajustes de cada superficie permanecen en su etapa. Registrar aquí nuevos fallos con versión, reproducción, resultado esperado y regresión asociada. Al corregirlos, conservar el caso en tests y retirar el pendiente; Git conserva el cambio. Los resultados de ejecución viven en output/pruebas hasta la siguiente ejecución de su grupo.

## Antecedente verificado — HTML 0.8.22

Bosquejos implementados en `44ca124`, con los ajustes de panel y foco indicados arriba. C08-U42–U43 y C08-B126–B130 cubren las nueve piezas, edición, tablas y pegado de rangos, límites, contraste, copia, conexiones, grupos, tamaño transitorio, zoom, teclado, recarga y liberación de recursos. Se conserva la cobertura de copias de `7250022` y el presupuesto del recorrido de borradores de `7b079cb`, sin aumentar los límites de acciones o aserciones.

La separación de menús está implementada en `f1ca325`. C08-B131 añade ámbitos de contenido,
acceso directo, exclusividad, navegación por teclado entre menús y piezas, foco útil, tooltip
durante la apertura y controles alcanzables entre 300 y 1440 px y con texto al 200 %.

**Regresión verificada: 106 pruebas de lógica/herramientas y 205 de navegador**, sin fallos, omisiones ni reintentos. La ejecución completa con dos workers duró 27,4 minutos. Incluye 30 ciclos sostenidos durante 550.412 ms, con límites de memoria, listeners, temporizadores y respuesta cumplidos. Tipado, formato, inventario de casos, controles negativos, hashes del build y evidencia vigente comprobados. Las ejecuciones parciales e interrumpidas no se acreditan.

**El gate funcional conserva el bloqueo de `youtube-focused-modifier`:** Alt pulsado después de enfocar el iframe externo no llega a Everett. La comprobación pública previa documentó ese fallo; este bloque no modifica ni vuelve a acreditar ese recorrido externo. La rueda común conserva la acción local y la flecha permite regresar. No presentar la regresión controlada aprobada como cierre de ese fallo.

- [HTML de esa entrega](dist/Everett-0.8.22.html): 14.987.873 bytes, build `49bd97cd1cb2a7e4`, SHA-256 `e56ee06cc31b321505f7ad84bec7e17f0770334e48da9e073559cf4ec1552e78`. Es un antecedente; el servidor actual usa fuentes con Vite.
- Los resultados de esa ejecución fueron reemplazados por la verificación del flujo de desarrollo, según la conservación de la última ejecución de cada grupo. Sus cifras anteriores no acreditan las fuentes nuevas.
- Inspección visual del mismo artefacto: [Bosquejos](output/revision/0.8.22/bosquejos-iab.png), [Organizar](output/revision/0.8.22/organizar-iab.png), [Vista](output/revision/0.8.22/vista-iab.png) y [menús a 300 px con texto ampliado](output/revision/0.8.22/menus-300-texto200.png). Las pestañas de prueba se cerraron; la pestaña del usuario no se recargó.
- [Comprobación pública](output/revision/0.8.19/destinos-publicos.json), [inspección de medios](output/revision/0.8.19/inspeccion-medios.json) y [veredicto público bloqueado](output/revision/0.8.19/verificacion-publica.json). HARNESS-15 comprueba que un fallo público bloquee el resultado aunque pase la regresión controlada.
- Esa entrega utilizó el preview de HTML en 4173. El desarrollo continuo lo sustituyó por Vite en el mismo origen y conserva los datos locales de revisión del usuario.

0.8 sigue abierta en `feat/canvas-0.8`, sin integrar en `dev`. Los bosquejos de baja fidelidad y sus menús separados están implementados y verificados en 0.8.22, pendientes de revisión del usuario. El editor integral conserva su planificación en 0.9.
