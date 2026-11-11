// Sólo para actualizar los dibujos vendorizados; abrir la biblioteca no requiere red.
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const version = '1.2.6';
const url =
  'https://cdn.jsdelivr.net/npm/@iconify-json/fluent-emoji-flat@' + version + '/icons.json';
const response = await fetch(url);
if (!response.ok) throw Error('No se pudo descargar Fluent Emoji: ' + response.status);
const bytes = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(bytes).digest('hex');
if (hash !== 'f5f4cf457c0db2ad5a2e42e033e02e0c87d10e43d0164cfffb3bb84914970a63')
  throw Error('La fuente descargada no coincide con la revisión aprobada.');
const catalog = JSON.parse(bytes);
const groups = {
  Destacadas:
    'delivery-truck:Camión:reparto flete transporte|package:Caja:paquete envío correo|convenience-store:Mercado:tienda comercio kiosco|strawberry:Frutilla:fresa fruta|seedling:Brote:planta cultivo|thermometer:Termómetro:temperatura frío|light-bulb:Idea:bombilla luz|magnifying-glass-tilted-left:Lupa:buscar investigar|gear:Engranaje:ajustes mecánica|mobile-phone:Teléfono:celular móvil|battery:Batería:energía carga|compass:Brújula:orientación norte viaje',
  'Transporte y viajes':
    'automobile:Auto:coche|bus:Colectivo:autobús|taxi:Taxi|bicycle:Bicicleta|motor-scooter:Motoneta|train:Tren|metro:Subterráneo|airplane:Avión|helicopter:Helicóptero|sailboat:Velero|ship:Barco|rocket:Cohete|tractor:Tractor|ambulance:Ambulancia|world-map:Mapa|luggage:Valija:equipaje|tent:Carpa:campamento|fuel-pump:Surtidor:gasolina',
  'Naturaleza y clima':
    'deciduous-tree:Árbol|cactus:Cactus|palm-tree:Palmera|sunflower:Girasol|tulip:Tulipán|herb:Hierbas|fallen-leaf:Hoja|shamrock:Trébol|mountain:Montaña|volcano:Volcán|water-wave:Ola|droplet:Gota|sun:Sol|crescent-moon:Luna|rainbow:Arcoíris|cloud-with-rain:Lluvia|snowflake:Copo de nieve|fire:Fuego|butterfly:Mariposa|honeybee:Abeja|turtle:Tortuga|dolphin:Delfín|whale:Ballena|lady-beetle:Mariquita',
  'Alimentos y salud':
    'red-apple:Manzana|avocado:Palta:aguacate|ear-of-corn:Maíz|carrot:Zanahoria|bread:Pan|egg:Huevo|glass-of-milk:Leche|hot-beverage:Café|cooking:Sartén|fork-and-knife:Cubiertos|basket:Canasta|shopping-cart:Carrito|pill:Pastilla|stethoscope:Estetoscopio|microscope:Microscopio|dna:ADN|adhesive-bandage:Curita|anatomical-heart:Corazón|test-tube:Tubo de ensayo',
  'Comunicación y tecnología':
    'laptop:Computadora:ordenador portátil|desktop-computer:Monitor|keyboard:Teclado|computer-mouse:Ratón:mouse|camera:Cámara|video-camera:Videocámara|headphone:Auriculares|microphone:Micrófono|radio:Radio|satellite:Satélite|satellite-antenna:Antena|robot:Robot|electric-plug:Enchufe|floppy-disk:Disquete|television:Televisor|envelope:Carta:correo|megaphone:Megáfono|bell:Campana:aviso|speech-balloon:Conversación:chat mensaje|antenna-bars:Señal',
  'Trabajo y aprendizaje':
    'books:Libros|open-book:Libro abierto|pencil:Lápiz|artist-palette:Paleta:pintura|paintbrush:Pincel|scissors:Tijeras|graduation-cap:Diploma:graduación|school:Escuela|backpack:Mochila|abacus:Ábaco|briefcase:Maletín|file-folder:Carpeta|clipboard:Portapapeles|calendar:Calendario|bar-chart:Gráfico de barras|chart-increasing:Tendencia|alarm-clock:Despertador|hourglass-not-done:Reloj de arena|paperclip:Clip|pushpin:Chincheta|triangular-ruler:Escuadra|trophy:Trofeo|bullseye:Objetivo|puzzle-piece:Rompecabezas|musical-note:Nota musical',
  'Lugares y construcción':
    'house:Casa|office-building:Oficina|hospital:Hospital|factory:Fábrica|bank:Banco|stadium:Estadio|classical-building:Museo|fountain:Fuente|ferris-wheel:Vuelta al mundo|castle:Castillo|bridge-at-night:Puente|building-construction:Construcción|brick:Ladrillo|hammer:Martillo|wrench:Llave inglesa|toolbox:Caja de herramientas|nut-and-bolt:Tornillo|ladder:Escalera|safety-vest:Chaleco|vertical-traffic-light:Semáforo|stop-sign:Señal de pare|locked:Candado|key:Llave|shield:Escudo',
  'Personas y actividades':
    'astronaut:Astronauta|artist:Artista|cook:Cocinero|scientist:Científico|technologist:Programador|mechanic:Mecánico|teacher:Docente|farmer:Agricultor|health-worker:Profesional de salud|firefighter:Bombero|handshake:Acuerdo|clapping-hands:Aplausos|waving-hand:Saludo|soccer-ball:Pelota|guitar:Guitarra|performing-arts:Teatro|game-die:Dado|kite:Barrilete|camera-with-flash:Fotografía|wrapped-gift:Regalo',
};
const out = [];
for (const [group, list] of Object.entries(groups)) {
  for (const entry of list.split('|')) {
    const [id, name, synonyms = ''] = entry.split(':');
    const icon = catalog.icons[id];
    if (!icon) throw Error('No existe la ilustración ' + id);
    if (
      icon.width ||
      icon.height ||
      /<(?:script|image|foreignObject)|\bhref\s*=\s*"(?!#)|\bon\w+\s*=/i.test(icon.body)
    )
      throw Error('Revisar el SVG de ' + id);
    out.push({
      id,
      name,
      keywords: (group === 'Destacadas' ? '' : group + ' ') + synonyms,
      body: icon.body,
    });
  }
}
await writeFile(
  new URL('../src/assets/illustrations/fluent-flat.json', import.meta.url),
  JSON.stringify(out) + '\n',
);
console.log(out.length + ' ilustraciones. SHA-256 del catálogo de origen: ' + hash);
