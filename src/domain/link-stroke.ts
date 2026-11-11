export const linkDirections = ['none', 'forward', 'backward', 'both'] as const;
export type LinkDirection = (typeof linkDirections)[number];
export const validLinkDirection = (value: unknown): value is LinkDirection =>
  linkDirections.some((direction) => direction === value);

export const linkWeights = [1.4, 3, 6, 12] as const;
export const validLinkWeight = (value: unknown): value is number =>
  linkWeights.some((n) => n === value);
