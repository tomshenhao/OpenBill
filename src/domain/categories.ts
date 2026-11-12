// Product scope, not a claim that every category has a calculator or data schema.
// Each category keeps its own evidence and calculation rules.
export const coreCategoryIds = ["electricity", "water", "mortgage", "insurance", "broadband", "mobile"] as const;
export const futureCategoryIds = ["gas-lpg", "council-rates", "rent", "transport", "waste-recycling", "subscriptions", "education-childcare", "healthcare-dental", "groceries"] as const;
export const categoryIds = [...coreCategoryIds, ...futureCategoryIds] as const;
export type BillCategory = typeof categoryIds[number];
