/** Casos mínimos obligatorios: descubrir una suite incompleta nunca certifica Canvas 0.8. */
export const canvasCases = [
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
