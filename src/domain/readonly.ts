export type DeepReadonly<T> = {
  readonly [Key in keyof T]: DeepReadonly<T[Key]>;
};

/** El estado confirmado se comparte entre vistas; solo los comandos pueden sustituirlo. */
export function freezeState<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeState(child);
    Object.freeze(value);
  }
  return value;
}
