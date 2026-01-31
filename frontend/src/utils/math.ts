export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const randomId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
