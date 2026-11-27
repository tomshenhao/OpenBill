import { syntheticPdf } from "./electricity-bills.ts";

export function watercareFixture(options: { estimated?: boolean; conflicting?: boolean } = {}) {
  return syntheticPdf([
    ["Watercare", "SYNTHETIC-CUSTOMER-NOT-FOR-DISPLAY", [[440, "Invoice date:"]], [[439, "2 Jun 2026"]],
      [[440, "Due date:"]], [[439, "20 Jun 2026"]], "Previous balance $20.00", "Payments received $3.00", "Credit $3.00", "Current charges",
      [[490, options.conflicting ? "$27.53" : "$26.53"], [55, "Unrelated column"], [245, "Water consumption"]],
      [[490, "$38.28"], [245, "Wastewater consumption"]], [[490, "$30.00"], [245, "Wastewater fixed"]],
      [[490, "$94.81"], [245, "Balance of current charges"]], [[370, "$12.37"], [245, "Your current charges include 15% GST:"]],
      "Total amount due $114.81", "Average daily usage in May 411 L"],
    ["Watercare", "Consumption charges", [[250, "$26.53"], [65, "Water"], [158, "12.34 kL $2.15/kL"], [345, "Unrelated column"]],
      [[250, "$38.28"], [65, "Wastewater"], [158, "9.69 kL $3.95/kL"]], "Fixed charges", [[65, "Wastewater"], [158, "30 days $365.00 pa"], [250, "$30.00"]],
      "Consumption details", "Meter no. SYNTHETIC-METER - Consumption period 30 days", `This reading 31-May-26 1247 ${options.estimated ? "Estimated" : "Actual"}`,
      "Last reading 01-May-26 1235", "Consumption 12.34 kL", "Water 12.34 kL", "Wastewater @78.50% 9.69 kL",
      "Usage target", [[340, "155"]], "These figures reflect the water efficiency targets 2021-2025"],
  ]);
}
