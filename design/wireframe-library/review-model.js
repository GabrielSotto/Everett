// Ejes independientes: un valor elegido no desaparece al cambiar foco o disponibilidad.
export const stateAxis = (id) =>
  ({
    selected: 'value',
    partial: 'value',
    active: 'value',
    hover: 'interaction',
    focus: 'interaction',
    pressed: 'interaction',
    disabled: 'availability',
    readonly: 'availability',
    loading: 'content',
    empty: 'content',
    error: 'result',
    success: 'result',
    open: 'visibility',
    closed: 'visibility',
  })[id];

export function resolveStates(item, input = 'default') {
  const states = [...new Set(Array.isArray(input) ? input : [input])].filter(
    (s) => s !== 'default',
  );
  for (const id of states)
    if (!item.states.includes(id))
      throw new Error('Estado no admitido para ' + item.id + ': ' + id);
  if (states.length > 1 && !item.combineStates)
    throw new Error('Estados no combinables: ' + item.id);
  const axes = states.map(stateAxis);
  if (new Set(axes).size !== axes.length) throw new Error('Estados incompatibles en el mismo eje');
  if (states.includes('disabled') && states.some((s) => stateAxis(s) === 'interaction'))
    throw new Error('Un control deshabilitado no recibe foco ni pulsación');
  if (states.includes('loading') && states.some((s) => ['pressed', 'error', 'success'].includes(s)))
    throw new Error('Carga incompatible con un resultado o una pulsación');
  if (
    states.some((s) => ['disabled', 'readonly'].includes(s)) &&
    states.some((s) => s === 'open' || (item.id === 'slider' && s === 'active'))
  )
    throw new Error('Disponibilidad incompatible con una edición activa');
  return states;
}

export function changeState(item, previous, next) {
  if (next === 'default' || !item.combineStates) return next;
  const current = resolveStates(item, previous);
  if (current.includes(next)) return current.filter((s) => s !== next);
  const remaining = current.filter((s) => stateAxis(s) !== stateAxis(next));
  if (next === 'disabled' || next === 'readonly')
    return [
      ...remaining.filter(
        (s) =>
          (next !== 'disabled' || stateAxis(s) !== 'interaction') &&
          s !== 'open' &&
          !(item.id === 'slider' && s === 'active'),
      ),
      next,
    ];
  if (next === 'open' || (item.id === 'slider' && next === 'active'))
    return [...remaining.filter((s) => !['disabled', 'readonly'].includes(s)), next];
  if (stateAxis(next) === 'interaction')
    return [
      ...remaining.filter((s) => s !== 'disabled' && !(next === 'pressed' && s === 'loading')),
      next,
    ];
  if (next === 'loading')
    return [...remaining.filter((s) => !['pressed', 'error', 'success'].includes(s)), next];
  return [
    ...remaining.filter((s) => !(['error', 'success'].includes(next) && s === 'loading')),
    next,
  ];
}

export function settingOptions(item, setting, variant) {
  if (['alert', 'toast', 'banner'].includes(item.id) && setting.id === 'action')
    return setting.options.filter(
      (o) =>
        o.id === 'none' ||
        (o.id === 'undo' && variant === 'success') ||
        (o.id === 'retry' && variant === 'error'),
    );
  return setting.options;
}

export function availableStates(item, variant, options = {}) {
  return item.states.filter((s) => {
    if (s === 'selected' && ['button', 'icon-button'].includes(item.id))
      return options.action === 'toggle';
    if (s === 'selected' && item.id === 'chip') return variant === 'filter';
    if (item.id === 'dialog' && variant === 'info') return s === 'default';
    return true;
  });
}

export function resolveOptions(item, input = {}, variant = item.variants[0].id) {
  const values = {};
  for (const setting of item.settings) {
    const value = input[setting.id] ?? setting.options[0].id;
    if (!settingOptions(item, setting, variant).some((option) => option.id === value))
      throw new Error('Opción no admitida: ' + setting.id);
    values[setting.id] = value;
  }
  for (const key of Object.keys(input))
    if (!item.settings.some((s) => s.id === key)) throw new Error('Propiedad desconocida: ' + key);
  return values;
}
