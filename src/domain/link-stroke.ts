export const linkWeights = [1.4, 3, 6, 12] as const;
export const validLinkWeight = (value: unknown): value is number =>
  linkWeights.some((n) => n === value);
