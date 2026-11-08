import { families, type LibraryEntry } from '../../design/wireframe-library/samples.js';

export interface LibraryFilter {
  id: string;
  label: string;
  includes: (entry: LibraryEntry) => boolean;
}
const category = (id: string, label: string, ids: string): LibraryFilter => ({
  id,
  label,
  includes: (entry) => ids.split(' ').includes(entry.id),
});
export function libraryFilters(tab: string): LibraryFilter[] {
  return [
    {
      id: 'all',
      label:
        tab === 'base'
          ? 'Todas las piezas'
          : tab === 'screens'
            ? 'Todas las interfaces'
            : 'Todos los componentes',
      includes: () => true,
    },
    ...(tab === 'base'
      ? [
          category(
            'geometry',
            'Formas y trazos',
            'block rounded ellipse polygon path line arrow divider dot bar',
          ),
          category('text', 'Texto', 'label heading paragraph text-bars'),
          category('media', 'Símbolos y medios', 'symbol check-mark image video'),
          category(
            'structure',
            'Contenedores y capas',
            'container frame clip mask overlay scroll-region',
          ),
        ]
      : tab === 'screens'
        ? [
            category('mobile', 'Móvil', 'booking-mobile mobile-inbox mobile-catalog'),
            category('tablet', 'Tablet', 'tablet-workspace tablet-planner'),
            {
              id: 'desktop',
              label: 'Escritorio',
              includes: (entry: LibraryEntry) =>
                ![
                  'booking-mobile',
                  'mobile-inbox',
                  'mobile-catalog',
                  'tablet-workspace',
                  'tablet-planner',
                ].includes(entry.id),
            },
          ]
        : families
            .filter(([id]) => !['all', 'base', 'screens'].includes(id))
            .map(([id, label]) => ({
              id,
              label,
              includes: (entry: LibraryEntry) => entry.family === id,
            }))),
  ];
}
