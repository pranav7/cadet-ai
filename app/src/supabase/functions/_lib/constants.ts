export const Sources = {
  Intercom: 1,
};

export const SourceNames = {
  [Sources.Intercom]: "Intercom",
};

export type Source = (typeof Sources)[keyof typeof Sources];
