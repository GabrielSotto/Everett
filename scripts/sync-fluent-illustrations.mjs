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
  'Transporte y viajes':
    'delivery-truck:Camión:reparto flete transporte|compass:Brújula:orientación norte viaje|automobile:Auto:coche|bus:Colectivo:autobús|taxi:Taxi|bicycle:Bicicleta|motor-scooter:Motoneta|train:Tren|metro:Subterráneo|airplane:Avión|helicopter:Helicóptero|sailboat:Velero|ship:Barco|rocket:Cohete|tractor:Tractor|ambulance:Ambulancia|world-map:Mapa|luggage:Valija:equipaje|tent:Carpa:campamento|fuel-pump:Surtidor:gasolina|vertical-traffic-light:Semáforo|stop-sign:Señal de pare|motorway:Autopista|railway-track:Vías:ferrocarril|station:Estación de tren|tram:Tranvía|minibus:Minibús|articulated-lorry:Camión articulado|pickup-truck:Camioneta|kick-scooter:Monopatín|canoe:Canoa|passenger-ship:Crucero|anchor:Ancla|parachute:Paracaídas|motorcycle:Moto|monorail:Monorriel',
  'Alimentos y cocina':
    'strawberry:Frutilla:fresa fruta|red-apple:Manzana|avocado:Palta:aguacate|ear-of-corn:Maíz|carrot:Zanahoria|bread:Pan|egg:Huevo|glass-of-milk:Leche|hot-beverage:Café|cooking:Sartén|fork-and-knife:Cubiertos|basket:Canasta|banana:Banana:plátano|grapes:Uvas|lemon:Limón|pear:Pera|peach:Durazno:melocotón|watermelon:Sandía|pineapple:Ananá:piña|coconut:Coco|tomato:Tomate|potato:Papa:patata|onion:Cebolla|broccoli:Brócoli|mushroom:Champiñón|cheese-wedge:Queso|croissant:Medialuna|green-salad:Ensalada|honey-pot:Miel|steaming-bowl:Sopa',
  'Naturaleza y clima':
    'seedling:Brote:planta cultivo|deciduous-tree:Árbol|cactus:Cactus|palm-tree:Palmera|sunflower:Girasol|tulip:Tulipán|herb:Hierbas|fallen-leaf:Hoja|shamrock:Trébol|mountain:Montaña|volcano:Volcán|water-wave:Ola|droplet:Gota|sun:Sol|crescent-moon:Luna|rainbow:Arcoíris|cloud-with-rain:Lluvia|snowflake:Copo de nieve|fire:Fuego|evergreen-tree:Pino|maple-leaf:Hoja de arce|potted-plant:Maceta|hibiscus:Hibisco|cloud-with-lightning:Tormenta|tornado:Tornado|fog:Niebla|desert:Desierto|national-park:Parque nacional',
  Animales:
    'butterfly:Mariposa|honeybee:Abeja|turtle:Tortuga|dolphin:Delfín|whale:Ballena|lady-beetle:Mariquita|fox:Zorro|owl:Búho|penguin:Pingüino|elephant:Elefante|giraffe:Jirafa|zebra:Cebra|hedgehog:Erizo|rabbit:Conejo|bat:Murciélago|frog:Rana|octopus:Pulpo|fish:Pez|crab:Cangrejo|snail:Caracol|ant:Hormiga|bird:Ave|ewe:Oveja|cow:Vaca',
  'Salud y ciencia':
    'thermometer:Termómetro:temperatura frío|pill:Pastilla|stethoscope:Estetoscopio|microscope:Microscopio|dna:ADN|adhesive-bandage:Curita|anatomical-heart:Corazón|test-tube:Tubo de ensayo|petri-dish:Placa de Petri|telescope:Telescopio|syringe:Jeringa|tooth:Diente|lungs:Pulmones|brain:Cerebro|drop-of-blood:Gota de sangre|crutch:Muleta|x-ray:Radiografía|alembic:Alambique|magnet:Imán|lab-coat:Guardapolvo:bata',
  'Tecnología y comunicación':
    'mobile-phone:Teléfono:celular móvil|battery:Batería:energía carga|laptop:Computadora:ordenador portátil|desktop-computer:Monitor|keyboard:Teclado|computer-mouse:Ratón:mouse|camera:Cámara|video-camera:Videocámara|headphone:Auriculares|microphone:Micrófono|radio:Radio|satellite:Satélite|satellite-antenna:Antena|robot:Robot|electric-plug:Enchufe|floppy-disk:Disquete|television:Televisor|envelope:Carta:correo|megaphone:Megáfono|bell:Campana:aviso|speech-balloon:Conversación:chat mensaje|antenna-bars:Señal|printer:Impresora|joystick:Palanca de mando:joystick|optical-disk:Disco óptico|pager:Buscapersonas|flashlight:Linterna|low-battery:Batería baja|telephone-receiver:Auricular telefónico',
  'Trabajo y aprendizaje':
    'light-bulb:Idea:bombilla luz|magnifying-glass-tilted-left:Lupa:buscar investigar|books:Libros|open-book:Libro abierto|pencil:Lápiz|scissors:Tijeras|graduation-cap:Diploma:graduación|school:Escuela|backpack:Mochila|abacus:Ábaco|briefcase:Maletín|file-folder:Carpeta|clipboard:Portapapeles|calendar:Calendario|alarm-clock:Despertador|hourglass-not-done:Reloj de arena|paperclip:Clip|pushpin:Chincheta|triangular-ruler:Escuadra|bullseye:Objetivo|notebook:Cuaderno|bookmark:Marcapáginas|fountain-pen:Estilográfica|straight-ruler:Regla|memo:Apunte|card-index-dividers:Separadores de archivo|wastebasket:Papelera',
  'Comercio y finanzas':
    'package:Caja:paquete envío correo|convenience-store:Mercado:tienda comercio kiosco|shopping-cart:Carrito|bank:Banco|bar-chart:Gráfico de barras|chart-increasing:Tendencia|money-bag:Bolsa de dinero|coin:Moneda|credit-card:Tarjeta de crédito|receipt:Recibo|balance-scale:Balanza|chart-decreasing:Descenso de ventas|shopping-bags:Bolsas de compras|label:Etiqueta|yen-banknote:Billete de yenes|currency-exchange:Cambio de moneda|post-office:Oficina de correos',
  'Lugares y edificios':
    'house:Casa|office-building:Oficina|hospital:Hospital|factory:Fábrica|stadium:Estadio|classical-building:Museo|fountain:Fuente|ferris-wheel:Vuelta al mundo|castle:Castillo|bridge-at-night:Puente|building-construction:Construcción|hotel:Hotel|tokyo-tower:Torre de Tokio|house-with-garden:Casa con jardín|hut:Cabaña|camping:Camping|beach-with-umbrella:Playa|carousel-horse:Calesita',
  'Herramientas y seguridad':
    'gear:Engranaje:ajustes mecánica|brick:Ladrillo|hammer:Martillo|wrench:Llave inglesa|toolbox:Caja de herramientas|nut-and-bolt:Tornillo|ladder:Escalera|safety-vest:Chaleco|locked:Candado|key:Llave|shield:Escudo|hammer-and-wrench:Herramientas|crossed-swords:Espadas cruzadas|pick:Pico|axe:Hacha|carpentry-saw:Sierra|screwdriver:Destornillador|hook:Gancho|chains:Cadenas|fire-extinguisher:Extintor|safety-pin:Alfiler de gancho',
  'Personas y oficios':
    'astronaut:Astronauta|artist:Artista|cook:Cocinero|scientist:Científico|technologist:Programador|mechanic:Mecánico|teacher:Docente|farmer:Agricultor|health-worker:Profesional de salud|firefighter:Bombero|handshake:Acuerdo|clapping-hands:Aplausos|waving-hand:Saludo|pilot:Piloto|judge:Juez|student:Estudiante|office-worker:Oficinista|singer:Cantante|factory-worker:Operario de fábrica|construction-worker:Obrero de construcción|detective:Detective',
  'Arte y música':
    'artist-palette:Paleta:pintura|paintbrush:Pincel|guitar:Guitarra|musical-note:Nota musical|performing-arts:Teatro|camera-with-flash:Fotografía|violin:Violín|trumpet:Trompeta|saxophone:Saxofón|accordion:Acordeón|drum:Tambor|musical-keyboard:Teclado musical|film-projector:Proyector|clapper-board:Claqueta|framed-picture:Cuadro|thread:Hilo|sewing-needle:Aguja de coser',
  'Deportes y juegos':
    'trophy:Trofeo|puzzle-piece:Rompecabezas|soccer-ball:Pelota|game-die:Dado|kite:Barrilete|basketball:Pelota de básquet|tennis:Tenis|volleyball:Vóley|bowling:Boliche|badminton:Bádminton|ping-pong:Tenis de mesa|fishing-pole:Caña de pescar|running-shoe:Zapatilla|skateboard:Patineta|ice-skate:Patín de hielo|chess-pawn:Peón de ajedrez|video-game:Control de videojuegos',
  'Hogar y objetos':
    'wrapped-gift:Regalo|chair:Silla|bed:Cama|couch-and-lamp:Sofá|mirror:Espejo|window:Ventana|door:Puerta|bucket:Balde|broom:Escoba|sponge:Esponja|soap:Jabón|toothbrush:Cepillo de dientes|umbrella:Paraguas|candle:Vela',
};
const out = [];
const seen = new Set();
for (const [group, list] of Object.entries(groups)) {
  for (const entry of list.split('|')) {
    const [id, name, synonyms = ''] = entry.split(':');
    if (seen.has(id)) throw Error('ID repetido: ' + id);
    seen.add(id);
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
      category: group,
      keywords: synonyms,
      body: icon.body,
    });
  }
}
const featured = [
  'delivery-truck',
  'package',
  'convenience-store',
  'strawberry',
  'seedling',
  'thermometer',
  'light-bulb',
  'magnifying-glass-tilted-left',
  'gear',
  'mobile-phone',
  'battery',
  'compass',
];
const rank = (id) => (featured.includes(id) ? featured.indexOf(id) : featured.length);
out.sort((a, b) => rank(a.id) - rank(b.id));
await writeFile(
  new URL('../src/assets/illustrations/fluent-flat.json', import.meta.url),
  JSON.stringify(out) + '\n',
);
console.log(out.length + ' ilustraciones. SHA-256 del catálogo de origen: ' + hash);
