import IntercomIcon from "@/assets/intercom.svg";

export const Sources: Record<string, number> = {
  Intercom: 1,
};

export const SourceToIcon = {
  [Sources.Intercom]: IntercomIcon,
};

export const SourceToName = {
  [Sources.Intercom]: "Intercom",
};

export type Source = (typeof Sources)[keyof typeof Sources];
