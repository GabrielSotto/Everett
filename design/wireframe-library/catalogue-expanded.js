import { entries, families, stateNames, renderSample, esc } from './samples.js';
const params = new URLSearchParams(location.search);
let family = families.some(([id]) => id === params.get('family')) ? params.get('family') : 'all';
const search = document.querySelector('#search');
const stateSelect = document.querySelector('#state-filter');
const dataSelect = document.querySelector('#data-filter');
search.value = params.get('q') ?? '';
stateSelect.innerHTML =
  '<option value="all">Todos los estados</option>' +
  Object.entries(stateNames)
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join('');
stateSelect.value = Object.hasOwn(stateNames, params.get('state')) ? params.get('state') : 'all';
dataSelect.value = ['demo', 'worst', 'one'].includes(params.get('data'))
  ? params.get('data')
  : 'demo';
document.body.classList.toggle('labels', params.get('text') === 'labels');
document.body.classList.toggle('parts', params.get('parts') === '1');
document.documentElement.classList.toggle('large-text', params.get('scale') === '2');
const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const chosenStates = new Map();
const chosenVariants = new Map();
const catalogue = document.querySelector('#catalogue');
const familyNav = document.querySelector('#families');
familyNav.innerHTML = families
  .map(
    ([id, name]) =>
      `<button type="button" data-family="${id}" aria-current="${id === family ? 'page' : 'false'}"><span>${name}</span><small>${id === 'all' ? entries.length : entries.filter((item) => item.family === id).length}</small></button>`,
  )
  .join('');
const base = entries.filter((item) => item.family === 'base').length;
const screens = entries.filter((item) => item.family === 'screens').length;
document.querySelector('#coverage').textContent =
  `${base} piezas y variantes de base · ${entries.length - base - screens} composiciones · ${screens} interfaces`;
catalogue.innerHTML = entries
  .map(
    (item) =>
      `<article class="catalogue-card ${item.wide ? 'wide' : ''}" data-id="${item.id}"><header><h3>${esc(item.name)}</h3><small>${item.kind}</small></header><div class="sample"></div><div class="sample-review">${item.variants.length > 1 ? `<label>Variante<select data-variant aria-label="Variante de ${esc(item.name)}">${item.variants.map((v) => `<option value="${v.id}">${esc(v.label)}</option>`).join('')}</select></label>` : ''}<div class="sample-states" role="group" aria-label="Estados de ${esc(item.name)}">${item.states.length > 1 ? item.states.map((state) => `<button type="button" data-state="${state}" aria-pressed="${state === 'default'}">${esc(item.stateDetails[state].label)}</button>`).join('') : ''}</div><p class="scenario-note"></p></div><footer>${esc(item.anatomy)}</footer></article>`,
  )
  .join('');
function syncUrl() {
  const next = new URLSearchParams();
  if (family !== 'all') next.set('family', family);
  if (search.value) next.set('q', search.value);
  if (stateSelect.value !== 'all') next.set('state', stateSelect.value);
  if (dataSelect.value !== 'demo') next.set('data', dataSelect.value);
  if (document.body.classList.contains('labels')) next.set('text', 'labels');
  if (document.body.classList.contains('parts')) next.set('parts', '1');
  if (document.documentElement.classList.contains('large-text')) next.set('scale', '2');
  history.replaceState(null, '', location.pathname + (next.size ? '?' + next : ''));
}
function updateSample(item, card) {
  const selected =
    chosenStates.get(item.id) ?? (stateSelect.value !== 'all' ? stateSelect.value : 'default');
  const state = item.states.includes(selected) ? selected : 'default';
  const variant = chosenVariants.get(item.id) ?? item.variants[0].id;
  card.querySelector('.sample').innerHTML = renderSample(item, state, dataSelect.value, variant);
  const detail = item.stateDetails[state];
  card.querySelector('.scenario-note').innerHTML =
    `<strong>${esc(detail.target)}.</strong> ${esc(detail.reason)}`;
  card
    .querySelectorAll('[data-state]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.state === state)),
    );
}
function filter() {
  const query = normalize(search.value.trim());
  let count = 0;
  entries.forEach((item) => {
    const card = catalogue.querySelector(`[data-id="${item.id}"]`);
    const matches =
      (family === 'all' || item.family === family) &&
      (stateSelect.value === 'all' || item.states.includes(stateSelect.value)) &&
      query
        .split(/\s+/)
        .every((word) =>
          normalize(item.name + ' ' + item.anatomy + ' ' + item.tags).includes(word),
        );
    card.hidden = !matches;
    if (matches) {
      count++;
      updateSample(item, card);
    }
  });
  document.querySelector('#family-title').textContent = families.find(([id]) => id === family)[2];
  document.querySelector('#count').textContent = count + (count === 1 ? ' muestra' : ' muestras');
  document.querySelector('#empty').hidden = count !== 0;
  document.querySelector('#reset').hidden =
    family === 'all' && !query && stateSelect.value === 'all';
  syncUrl();
}
familyNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-family]');
  if (!button) return;
  family = button.dataset.family;
  familyNav
    .querySelectorAll('button')
    .forEach((item) => item.setAttribute('aria-current', item === button ? 'page' : 'false'));
  filter();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
search.addEventListener('input', filter);
stateSelect.addEventListener('change', () => {
  chosenStates.clear();
  filter();
});
dataSelect.addEventListener('change', filter);
catalogue.addEventListener('click', (event) => {
  const button = event.target.closest('[data-state]');
  if (!button) return;
  const card = button.closest('[data-id]');
  const item = entries.find((item) => item.id === card.dataset.id);
  chosenStates.set(item.id, button.dataset.state);
  updateSample(item, card);
});
catalogue.addEventListener('change', (event) => {
  const select = event.target.closest('[data-variant]');
  if (!select) return;
  const card = select.closest('[data-id]');
  const item = entries.find((entry) => entry.id === card.dataset.id);
  chosenVariants.set(item.id, select.value);
  updateSample(item, card);
});
document.querySelector('#parts').addEventListener('click', (event) => {
  const on = document.body.classList.toggle('parts');
  event.currentTarget.setAttribute('aria-pressed', String(on));
  syncUrl();
});
document
  .querySelector('#parts')
  .setAttribute('aria-pressed', String(document.body.classList.contains('parts')));
const scaleButton = document.querySelector('#text-scale');
scaleButton.setAttribute(
  'aria-pressed',
  String(document.documentElement.classList.contains('large-text')),
);
scaleButton.addEventListener('click', () => {
  const enabled = document.documentElement.classList.toggle('large-text');
  scaleButton.setAttribute('aria-pressed', String(enabled));
  syncUrl();
});
document.querySelectorAll('[data-text]').forEach((button) => {
  button.setAttribute(
    'aria-pressed',
    String((button.dataset.text === 'labels') === document.body.classList.contains('labels')),
  );
  button.addEventListener('click', () => {
    document.body.classList.toggle('labels', button.dataset.text === 'labels');
    document
      .querySelectorAll('[data-text]')
      .forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    syncUrl();
  });
});
document.querySelector('#reset').addEventListener('click', () => {
  family = 'all';
  search.value = '';
  stateSelect.value = 'all';
  familyNav
    .querySelectorAll('button')
    .forEach((item) =>
      item.setAttribute('aria-current', item.dataset.family === 'all' ? 'page' : 'false'),
    );
  filter();
});
filter();
