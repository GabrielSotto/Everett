# AGENTS.md — Everett

Marco común: `C:/Proyectos/AGENTS.md`. Leerlo si no está ya cargado y aplicar sus reglas junto con estas instrucciones.

## Alcance y decisiones

- Al planificar o implementar, consultar [Producto](docs/producto.md), [Alcance del prototipo](docs/alcance-prototipo.md) y el detalle del área y la iteración afectadas.
- Antes de iniciar una implementación, contar con el alcance y la dirección visual acordados. Preservar los comportamientos aprobados y aplicar los cambios de alcance que autorice el usuario.
- Distinguir decisiones confirmadas de hipótesis. Comprobar la disponibilidad y el contenido de las referencias antes de afirmar que se inspeccionaron.
- Mantener las definiciones, el estado y los antecedentes del producto en sus documentos correspondientes dentro de `docs/`.

## Organización por iteración

- Trabajar una iteración por vez. Dedicarle un chat de implementación y una rama. Mantener los chats de organización e instrucciones separados de los de implementación.
- Crear las ramas desde `dev` con los prefijos del marco común. Integrarlas con `--no-ff` después de completar las verificaciones y correcciones y recibir la confirmación explícita del usuario aprobando el cierre de la iteración.
- Comenzar la siguiente iteración cuando la anterior esté aprobada e integrada en `dev`.
- Versionar el trabajo en el repositorio de Everett. Aplicar G1–G5 del marco común, incluidos los fixes.

## Convenciones y desarrollo

- Aplicar la [Arquitectura](docs/arquitectura.md) y el flujo de [Desarrollo](docs/desarrollo.md) a todo el prototipo. Utilizar las mismas convenciones de nombres, responsabilidades, herramientas y comandos.
- Consultar en Desarrollo los requisitos de entorno, dependencias, comandos y condiciones de ejecución. Mantener esa documentación alineada con las herramientas del repositorio.

## Verificación

- Para cambios de documentación, comprobar preservación del alcance y requisitos, enlaces locales y correspondencia con las fuentes adoptadas.
- Al modificar comportamiento, construir el arnés, validar o preparar una entrega, aplicar [Validación del prototipo](docs/validacion-prototipo.md). Sus comprobaciones son el piso obligatorio; ampliar la cobertura según los riesgos y fallos encontrados.
- En cada iteración, ampliar el arnés y las pruebas para cubrir las funciones y comportamientos incorporados o modificados. Convertir los fallos detectados durante las pruebas manuales en casos de regresión que comprueben su corrección y detecten su reaparición.
- Antes de entregar código o una versión, completar el gate correspondiente con evidencia del artefacto actual y comprobaciones del propio arnés. La aprobación de cada iteración y de las versiones del prototipo corresponde al usuario.
