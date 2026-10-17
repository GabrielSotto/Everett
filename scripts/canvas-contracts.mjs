/** Casos mínimos obligatorios: descubrir una suite incompleta nunca certifica Canvas 0.8. */
export const canvasCases = [
  { id: 'C08-U18', layer: 'unit', contracts: ['C08-REF-01', 'C08-MAT-09'] },
  { id: 'C08-U17', layer: 'unit', contracts: ['C08-REF-01', 'C08-MAT-08', 'C08-CHAT-07'] },
  { id: 'C08-U14', layer: 'unit', contracts: ['C08-ORG-01'] },
  { id: 'C08-U15', layer: 'unit', contracts: ['C08-REF-01'] },
  { id: 'C08-U16', layer: 'unit', contracts: ['C08-MAT-05', 'C08-LINK-02'] },
  { id: 'C08-B55', layer: 'browser', contracts: ['C08-MAT-09', 'C08-KEY-01', 'C08-STATE-01'] },
  { id: 'C08-B56', layer: 'browser', contracts: ['C08-MAT-05', 'C08-LINK-02'] },
  { id: 'C08-B57', layer: 'browser', contracts: ['C08-ORG-01', 'C08-STATE-01'] },
  { id: 'C08-B58', layer: 'browser', contracts: ['C08-REF-01', 'C08-STATE-01'] },
  { id: 'C08-U13', layer: 'unit', contracts: ['C08-MAT-09'] },
  { id: 'C08-B50', layer: 'browser', contracts: ['C08-MAT-05', 'C08-STATE-01'] },
  { id: 'C08-B51', layer: 'browser', contracts: ['C08-MAT-09', 'C08-STATE-01'] },
  { id: 'C08-B52', layer: 'browser', contracts: ['C08-MAT-09'] },
  { id: 'C08-B53', layer: 'browser', contracts: ['C08-MAT-09', 'C08-PROP-01'] },
  { id: 'C08-B54', layer: 'browser', contracts: ['C08-MAT-09'] },
  { id: 'C08-B47', layer: 'browser', contracts: ['C08-MAT-05'] },
  {
    id: 'C08-B48',
    layer: 'browser',
    contracts: ['C08-MAT-02', 'C08-MAT-08', 'C08-LINK-01', 'C08-LINK-02', 'C08-STATE-01'],
  },
  { id: 'C08-B49', layer: 'browser', contracts: ['C08-MAT-03', 'C08-MAT-05', 'C08-STATE-01'] },
  { id: 'C08-B46', layer: 'browser', contracts: ['C08-MAT-02', 'C08-MAT-05'] },
  { id: 'UI-HARNESS-03', layer: 'browser', contracts: ['C08-MAT-02'] },
  { id: 'C08-U09', layer: 'unit', contracts: ['C08-LINK-01', 'C08-MAT-08'] },
  { id: 'C08-U10', layer: 'unit', contracts: ['C08-PROP-01', 'C08-STATE-01', 'C08-STATE-02'] },
  { id: 'C08-B34', layer: 'browser', contracts: ['C08-MAT-03', 'C08-MAT-04', 'C08-STATE-01'] },
  { id: 'C08-B35', layer: 'browser', contracts: ['C08-MAT-01', 'C08-MAT-05', 'C08-STATE-01'] },
  { id: 'C08-B36', layer: 'browser', contracts: ['C08-LINK-01', 'C08-LINK-02', 'C08-MAT-08'] },
  { id: 'C08-B37', layer: 'browser', contracts: ['C08-PROP-01', 'C08-STATE-01', 'C08-STATE-02'] },
  { id: 'C08-B38', layer: 'browser', contracts: ['C08-PROP-01'] },
  { id: 'C08-B39', layer: 'browser', contracts: ['C08-MAT-05', 'C08-COM-02'] },
  { id: 'C08-B40', layer: 'browser', contracts: ['C08-MAT-05', 'C08-MAT-08', 'C08-STATE-01'] },
  { id: 'C08-B41', layer: 'browser', contracts: ['C08-MAT-05', 'C08-MAT-08', 'C08-STATE-01'] },
  { id: 'C08-B42', layer: 'browser', contracts: ['C08-MAT-05', 'C08-STATE-01'] },
  { id: 'C08-B45', layer: 'browser', contracts: ['C08-MAT-02', 'C08-STATE-02'] },
  { id: 'C08-B44', layer: 'browser', contracts: ['C08-MAT-02', 'C08-STATE-02'] },
  { id: 'C08-B43', layer: 'browser', contracts: ['C08-MAT-02', 'C08-MAT-03', 'C08-STATE-02'] },
  { id: 'C08-U11', layer: 'unit', contracts: ['C08-MAT-05', 'C08-MAT-08'] },
  { id: 'C08-U12', layer: 'unit', contracts: ['C08-MAT-02', 'C08-STATE-02'] },

  { id: 'C08-U01', layer: 'unit', contracts: ['C08-MAT-06', 'C08-MAT-08'] },
  { id: 'C08-U02', layer: 'unit', contracts: ['C08-CHAT-02', 'C08-CHAT-08', 'C08-CHAT-09'] },
  { id: 'C08-U03', layer: 'unit', contracts: ['C08-STATE-02', 'C08-PROP-01'] },
  { id: 'C08-U04', layer: 'unit', contracts: ['C08-LINK-01', 'C08-LINK-02', 'C08-MAT-05'] },
  { id: 'C08-U05', layer: 'unit', contracts: ['C08-KEY-01', 'C08-COM-02'] },
  {
    id: 'C08-B01',
    layer: 'browser',
    contracts: ['C08-MAT-02', 'C08-MAT-03', 'C08-MAT-05', 'C08-MAT-06', 'C08-MAT-08'],
  },
  {
    id: 'C08-B02',
    layer: 'browser',
    contracts: [
      'C08-CHAT-01',
      'C08-CHAT-02',
      'C08-CHAT-03',
      'C08-CHAT-04',
      'C08-CHAT-05',
      'C08-CHAT-06',
      'C08-CHAT-07',
      'C08-CHAT-08',
      'C08-CHAT-09',
      'C08-CHAT-10',
      'C08-CHAT-11',
    ],
  },
  {
    id: 'C08-B03',
    layer: 'browser',
    contracts: ['C08-COM-01', 'C08-COM-02', 'C08-COM-03', 'C08-KEY-01', 'C08-STATE-01'],
  },
  { id: 'C08-B04', layer: 'browser', contracts: ['C08-STATE-01', 'C08-STATE-02', 'C08-PROP-01'] },
  { id: 'C08-B05', layer: 'browser', contracts: ['C08-MAT-01', 'C08-MAT-04', 'C08-STATE-01'] },
  { id: 'C08-B06', layer: 'browser', contracts: ['C08-LINK-01', 'C08-LINK-02', 'C08-MAT-05'] },
  { id: 'C08-B07', layer: 'browser', contracts: ['C08-MAT-07', 'C08-CHAT-07', 'C08-STATE-01'] },
  {
    id: 'C08-B08',
    layer: 'browser',
    contracts: ['C08-MAT-01', 'C08-MAT-03', 'C08-MAT-04', 'C08-STATE-01'],
  },
  { id: 'C08-B09', layer: 'browser', contracts: ['C08-MAT-05', 'C08-LINK-01'] },
  { id: 'C08-B10', layer: 'browser', contracts: ['C08-STATE-01', 'C08-STATE-02'] },
  { id: 'C08-B11', layer: 'browser', contracts: ['C08-STATE-01', 'C08-CHAT-07', 'C08-CHAT-09'] },
  { id: 'C08-B12', layer: 'browser', contracts: ['C08-COM-03', 'C08-MAT-02', 'C08-PROP-01'] },
  { id: 'C08-B13', layer: 'browser', contracts: ['C08-MAT-01', 'C08-STATE-01'] },
  { id: 'C08-B14', layer: 'browser', contracts: ['C08-STATE-01'] },
  { id: 'C08-B15', layer: 'browser', contracts: ['C08-MAT-06', 'C08-PROP-01', 'C08-STATE-02'] },
  { id: 'C08-B16', layer: 'browser', contracts: ['C08-MAT-05', 'C08-LINK-01', 'C08-KEY-01'] },
  { id: 'C08-B17', layer: 'browser', contracts: ['C08-MAT-02', 'C08-PROP-01'] },
  { id: 'C08-B18', layer: 'browser', contracts: ['C08-CHAT-07', 'C08-PROP-01'] },
  { id: 'C08-B19', layer: 'browser', contracts: ['C08-CHAT-07', 'C08-KEY-01'] },
  {
    id: 'C08-B20',
    layer: 'browser',
    contracts: ['C08-CHAT-01', 'C08-CHAT-04', 'C08-CHAT-07', 'C08-KEY-01'],
  },
  { id: 'C08-B21', layer: 'browser', contracts: ['C08-MAT-01', 'C08-MAT-02', 'C08-MAT-06'] },
  { id: 'C08-U06', layer: 'unit', contracts: ['C08-MAT-05', 'C08-MAT-06', 'C08-PROP-01'] },
  { id: 'C08-B22', layer: 'browser', contracts: ['C08-LINK-01', 'C08-LINK-02'] },
  { id: 'C08-B23', layer: 'browser', contracts: ['C08-PROP-01', 'C08-MAT-06'] },
  { id: 'C08-B24', layer: 'browser', contracts: ['C08-MAT-05', 'C08-LINK-01', 'C08-COM-03'] },
  { id: 'C08-B25', layer: 'browser', contracts: ['C08-CHAT-07'] },
  { id: 'C08-B26', layer: 'browser', contracts: ['C08-CHAT-08', 'C08-CHAT-11'] },
  { id: 'C08-B27', layer: 'browser', contracts: ['C08-KEY-01'] },
  { id: 'C08-B28', layer: 'browser', contracts: ['C08-MAT-06', 'C08-STATE-02'] },
  { id: 'C08-B29', layer: 'browser', contracts: ['C08-MAT-01', 'C08-MAT-05', 'C08-STATE-01'] },
  { id: 'C08-U07', layer: 'unit', contracts: ['C08-LINK-01', 'C08-LINK-02'] },
  { id: 'C08-U08', layer: 'unit', contracts: ['C08-PROP-01', 'C08-STATE-02'] },
  { id: 'C08-B30', layer: 'browser', contracts: ['C08-MAT-01', 'C08-MAT-05', 'C08-STATE-01'] },
  { id: 'C08-B31', layer: 'browser', contracts: ['C08-LINK-01', 'C08-LINK-02', 'C08-STATE-01'] },
  { id: 'C08-B32', layer: 'browser', contracts: ['C08-MAT-02', 'C08-MAT-06', 'C08-MAT-05'] },
  { id: 'C08-B33', layer: 'browser', contracts: ['C08-MAT-07', 'C08-PROP-01'] },
];
export function verifyCanvasCoverage(layer, titles) {
  const required = canvasCases.filter((item) => item.layer === layer);
  for (const item of required) {
    const matches = titles.filter((title) => title.startsWith(item.id + ':'));
    if (matches.length !== 1)
      throw new Error(
        `Canvas 0.8 exige una única ejecución de ${item.id} (${item.contracts.join(', ')}).`,
      );
  }
  return required;
}
export function verifyContractInventory(document) {
  const defined = [...new Set(document.match(/C08-[A-Z]+-\d+/g))].sort();
  const covered = [...new Set(canvasCases.flatMap((item) => item.contracts))].sort();
  if (JSON.stringify(defined) !== JSON.stringify(covered))
    throw new Error(
      'La matriz del arnés no coincide con todos los contratos C08 de la definición mantenida.',
    );
}

/** Entradas públicas obligatorias: una carga directa del input no demuestra el menú. */
export const canvasControlRequirements = {
  'C08-B55': { 'surface-toggle': 2, search: 1 },
  'C08-B56': { shapes: 1, 'canvas-tool': 1 },
  'C08-B57': { 'context-group': 1, 'group-rename': 1, 'group-ungroup': 1 },
  'C08-B58': { 'reference-fragment': 2 },
  'C08-B50': { 'canvas-tool': 1 },
  'C08-B51': { search: 1, 'search-result': 1 },
  'C08-B52': { search: 1, 'search-result': 1 },
  'C08-B53': { search: 1, 'search-result': 1, 'context-zone': 1, 'material-rename': 1 },
  'C08-B54': { search: 1 },
  'C08-B47': { 'canvas-tool': 1, shapes: 1 },
  'C08-B48': { 'reference-add': 3, 'canvas-undo': 1, 'canvas-redo': 1 },
  'C08-B49': { 'canvas-tool': 1 },
  'C08-B46': { references: 1, 'reference-add': 1 },
  'C08-B05': { 'canvas-import': 1 },
  'C08-B08': { 'canvas-import': 2 },
  'C08-B29': { 'canvas-examples': 1 },
  'C08-B35': { 'video-play': 6 },
  'C08-B44': { 'canvas-examples': 4 },
  'C08-B45': { 'canvas-import': 4 },
  'C08-B24': { 'canvas-tool': 1, shapes: 1, 'canvas-comment': 1 },
  'C08-B04': { 'assignment-revise': 2, 'assignment-accept': 1 },
  'C08-B23': { 'assignment-revise': 1 },
  'C08-B41': { 'canvas-undo': 1, 'canvas-redo': 1 },
};
export function verifyCanvasControls(title, controls) {
  if (
    !Array.isArray(controls) ||
    controls.some(
      (item) =>
        !item ||
        typeof item.action !== 'string' ||
        typeof item.trusted !== 'boolean' ||
        typeof item.visible !== 'boolean',
    )
  )
    throw new Error('Registro de controles inválido: ' + title);
  const id = title.match(/^C08-B\d+/)?.[0];
  for (const [action, minimum] of Object.entries(canvasControlRequirements[id] ?? {})) {
    const count = controls.filter(
      (item) => item.action === action && item.trusted && item.visible,
    ).length;
    if (count < minimum) throw new Error('Falta entrada visible ' + action + ' en ' + title);
  }
}
