# Alcance de la primera demo v0

## Estado

- Forma general: **T**, confirmada.
- Eje horizontal: panorama amplio del ecosistema, confirmado.
- Eje vertical: **Mascotas**, elegido de forma provisional y reversible.
- Modelo de mascota: reactiva al contexto de la aplicación anfitriona, sin capacidades
  funcionales propias por ahora.
- Identidad persistente entre sesiones: confirmada.
- Reactividad expresiva profunda: confirmada como prioridad principal.
- Hambre y sueño como necesidades suaves: confirmados con alcance acotado.
- Acceso directo a un asistente de voz: fuera del alcance como diferenciador.
- Expresión verbal breve y contextual: confirmada con alcance básico.
- Modalidad verbal —texto, audio o ambas—: abierta.
- Separación entre runtime, personaje y conducta: confirmada.
- Las capas pueden instalarse juntas, pero deben seguir siendo inspeccionables y
  remixables por separado.
- Flujo exacto y eventos observables: abiertos.
- Taxonomía y arbitraje de reactividad: propuesta v0 pendiente de validación en
  [`areas/mascots-reactivity-v0.md`](areas/mascots-reactivity-v0.md).
- Dirección visual e implementación: no iniciadas.

La vertical se puede reemplazar por Juegos, aplicaciones web u otra familia si la
prueba revela que Mascotas comunica una parte demasiado pequeña o confusa del
ecosistema de Comunity Hub. Cambiarla no obliga a abandonar la estructura general
de la demo.

## Qué debe demostrar la T

El eje horizontal debe dejar claro que Comunity Hub reúne distintas clases de
creaciones. Mascotas tiene profundidad especial en esta primera prueba, pero
Juegos, aplicaciones web, plugins, automatizaciones y otros objetos siguen siendo
visibles como partes reales del mismo ecosistema.

El eje vertical debe volver tangible el modelo común de Comunity Hub:

> descubrir un resultado utilizable, comprender quién lo creó y bajo qué permisos,
> acceder a su fuente, adaptarlo y mantener la relación con la obra original.

## Eje horizontal: amplitud del ecosistema

La Home conceptual mostrará una selección representativa, no exhaustiva, de:

- mascotas;
- juegos;
- aplicaciones y sitios web;
- plugins y automatizaciones;
- otras creaciones compatibles con el modelo común.

Las categorías compartirán señales comprensibles de autoría, estado, compatibilidad,
licencia y actividad, aunque cada tipo conserve acciones propias. Esta amplitud es
necesaria para que la demo no se interprete como una tienda dedicada únicamente a
mascotas.

## Eje vertical provisional: Mascotas

El recorrido candidato contiene los siguientes momentos; su orden y protagonismo
todavía deben validarse:

1. descubrir una mascota desde una superficie pública;
2. verla reaccionar con variedad y profundidad a eventos seguros de la aplicación
   anfitriona;
3. experimentar hambre y sueño mediante una interacción ligera de cuidado;
4. observar una frase contextual coordinada con su estado y personalidad;
5. abrir su ficha con autor, versión, compatibilidad, procedencia y licencias por
   componente;
6. probarla o aplicarla en la aplicación anfitriona;
7. inspeccionar runtime, personaje, conducta, assets y archivos fuente disponibles;
8. abrir el proyecto en su espacio de trabajo;
9. modificar una reacción, frase o capa y crear un remix;
10. publicar el derivado con atribución y linaje visibles.

La compra, el intercambio, el alquiler y otros derechos asociados pertenecen al
territorio de Comunity Hub, pero todavía está abierto cuánto debe demostrar de
ellos la primera demo.

## Criterios para conservar o cambiar la vertical

Mascotas seguirá como vertical si permite que una persona entienda:

- que Comunity Hub abarca un ecosistema mayor;
- que una creación tiene resultado y fuente;
- que instalar o usar no equivale a poseer todos los derechos;
- que un remix conserva autoría, atribución y procedencia;
- que la aplicación anfitriona permite continuar directamente el trabajo.

La vertical debe reconsiderarse si la experiencia parece solamente cosmética, si
necesita demasiada explicación o si no vuelve convincente el paso desde usar hasta
crear y publicar.

## Decisión siguiente

Validar el vocabulario de eventos y el arbitraje de reactividad mediante una matriz
de comportamiento para la primera mascota provisional, antes de diseñar la interfaz.
La matriz debe permitir evaluar variedad, prioridades y conflictos a partir de la
[propuesta de reactividad](areas/mascots-reactivity-v0.md).
