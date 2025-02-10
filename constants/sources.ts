export const SOURCES = {
  INTERCOM: "intercom",
} as const;

export type Source = (typeof SOURCES)[keyof typeof SOURCES];
