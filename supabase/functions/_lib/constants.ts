export const Sources = {
  Intercom: 1,
};

export type Source = (typeof Sources)[keyof typeof Sources];
