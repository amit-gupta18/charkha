export const queryKeys = {
  dashboard: ["dashboard"] as const,
  expenses: ["expenses"] as const,
  income: ["income"] as const,
  savings: ["savings"] as const,
  settings: ["settings"] as const,
  flatmates: ["flatmates"] as const,
  splits: ["splits"] as const,
  splitSettlements: ["splits", "settlements"] as const,
  splitPlate: ["splits", "plate"] as const,
  lending: ["lending"] as const,
  knowledge: ["knowledge"] as const,
  knowledgeDetail: (id: string) => ["knowledge", id] as const,
};
