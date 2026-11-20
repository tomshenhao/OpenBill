import type { InsuranceModuleId, InsuranceSource } from "../config/insurance.ts";

export type InsuranceMessages = {
  title: string;
  intro: string;
  directoryNote: string;
  guideOnly: string;
  back: string;
  coverHeading: string;
  termsHeading: string;
  reviewHeading: string;
  plannedHeading: string;
  sourcesHeading: string;
  sources: Record<InsuranceSource, string>;
  modules: Record<InsuranceModuleId, {
    title: string;
    summary: string;
    cover: readonly string[];
    terms: readonly string[];
    review: readonly string[];
    planned: string;
  }>;
};

export const insuranceEn: InsuranceMessages = {
  title: "Insurance",
  intro: "Choose a guide to understand your cover and check the details in your policy.",
  directoryNote: "House Insurance also lets you review your policy and compare quotes you enter.",
  guideOnly: "General information only. Calculators and policy comparisons are planned.",
  back: "All insurance guides",
  coverHeading: "What it may cover",
  termsHeading: "Terms to check",
  reviewHeading: "How to review your policy",
  plannedHeading: "Planned features",
  sourcesHeading: "New Zealand information sources",
  sources: {
    consumerInsurance: "Consumer Protection · Understanding insurance",
    naturalHazards: "Natural Hazards Commission · Natural hazards cover",
    consumerCar: "Consumer Protection · Car insurance",
    sortedTypes: "Sorted · Types of insurance",
    fmaInsurance: "Financial Markets Authority · Insurance",
    fmaAdvice: "Financial Markets Authority · Getting insurance advice",
    publicHealth: "Immigration New Zealand · Who can get public health care",
    safeTravel: "SafeTravel (MFAT) · Travel insurance",
    consumerTravel: "Consumer Protection · Travel insurance",
  },
  modules: {
    house: {
      title: "House Insurance",
      summary: "Review your building cover and compare house insurance quotes you already have.",
      cover: [
        "Check which buildings and fixtures are included, such as a garage, and whether temporary accommodation is covered after a claim.",
        "In New Zealand, private house insurance that includes fire cover can also provide natural hazards cover through the Natural Hazards Commission. Check how it works alongside your policy.",
      ],
      terms: [
        "Sum insured and how the insurer settles rebuild claims, including any separate limits.",
        "The excess for each event and conditions for renovations, vacancy or gradual damage.",
      ],
      review: [
        "Check the building details on your policy schedule against the home as it stands today.",
        "Check whether your rebuild allowance includes demolition, professional fees and site work. A sale price includes land and is a different measure.",
        "Ask how your policy and natural hazards cover would apply to the same event.",
      ],
      planned: "A rebuild-cost checklist and a cover comparison by insured events, limits and excesses.",
    },
    car: {
      title: "Car Insurance",
      summary: "Car insurance can cover damage you cause to someone else's vehicle or property. Some policies also cover damage to or theft of your own car.",
      cover: [
        "Third-party cover generally protects against liability for damage to other people's property.",
        "Third-party fire and theft can add those risks for your car. Comprehensive cover can also include accidental damage to your car.",
      ],
      terms: [
        "Agreed value is set with the insurer. Market value depends on what the car was worth just before the loss.",
        "Check driver restrictions, excesses, modifications, and whether work or delivery use is covered.",
      ],
      review: [
        "Check that regular drivers, how you use the car and any modifications are reflected in your policy.",
        "Check what the insurer would pay if the car were written off, and which excess you would pay.",
        "Compare the same cover type and payout basis before comparing premiums.",
      ],
      planned: "A comparison by cover type, vehicle valuation, driver conditions and excess.",
    },
    contents: {
      title: "Contents Insurance",
      summary: "Contents insurance protects belongings, such as furniture, clothing and electronics, if they are lost or damaged in an event your policy covers. Renters and homeowners can both use it.",
      cover: [
        "Check which events are covered at home, including theft and fire, and whether cover extends to belongings taken away from home.",
        "Some policies pay to replace an item. Others account for its age or condition. A policy can use different bases for different items.",
      ],
      terms: [
        "Total contents limit, per-item limits and which valuables need to be listed separately.",
        "The excess, exclusions for out-of-home loss and whether the policy covers belongings in storage.",
      ],
      review: [
        "Make a room-by-room inventory privately and estimate what it would cost to replace ordinary items.",
        "Check jewellery, bikes and electronics against category limits. Ask which items need to be listed separately.",
        "Check who in the household is covered and whether cover continues during a move or while items are in storage.",
      ],
      planned: "A private contents inventory and a comparison of replacement terms, item limits and cover away from home.",
    },
    health: {
      title: "Health Insurance",
      summary: "Private health insurance helps pay for eligible private healthcare. What you can access through the public health system depends on your circumstances and is separate from your policy.",
      cover: [
        "Depending on the plan, cover may include private hospital treatment or surgery, specialist visits and diagnostic tests.",
        "Check whether consultations or tests are covered on their own or only as part of a covered treatment.",
      ],
      terms: [
        "Pre-existing condition rules, waiting periods and treatment exclusions.",
        "Annual or treatment limits, excesses, approved providers and any requirement to get approval before treatment.",
      ],
      review: [
        "Use your policy wording to check the services you expect to use and what you would pay towards them.",
        "Check how to get a treatment approved and whether the provider you would use is eligible.",
        "Before replacing cover, get written confirmation of any new exclusions or changes to cover you already have.",
      ],
      planned: "A comparison by treatment category, limits, excesses, waiting periods and approval rules.",
    },
    life: {
      title: "Life Insurance",
      summary: "Life insurance usually pays a lump sum when the insured person dies. The payment can help the people who depend on their income meet costs such as housing, debts or everyday expenses.",
      cover: [
        "Check the amount payable on death and when cover ends. Some policies can pay part or all of the benefit early for a terminal illness that meets their definition.",
        "Life cover has a different purpose from income protection, trauma cover or accident-only insurance.",
      ],
      terms: [
        "Sum insured, policy expiry, exclusions and any changes to premiums or cover over time.",
        "Who owns the policy and who would receive the benefit under the policy and ownership arrangements.",
      ],
      review: [
        "Review privately who depends on your income, what debts would remain and what savings or existing cover could help.",
        "Check that the cover amount and end date still fit those commitments.",
        "Before replacing a policy, check the new application's acceptance and terms in writing, including any difference in exclusions.",
      ],
      planned: "A life-cover needs worksheet and a comparison of benefit definitions, policy expiry and premium structure.",
    },
    travel: {
      title: "Travel Insurance",
      summary: "Travel insurance can help with covered costs before or during a trip. The destination, travel dates and activities can change what your policy covers.",
      cover: [
        "For overseas travel, check emergency medical treatment, evacuation and return to New Zealand.",
        "Depending on the policy, cancellation, delays, lost belongings or rental vehicle excess may also be covered.",
      ],
      terms: [
        "Destination and duration limits, treatment of travel advisories, and exclusions for activities or pre-existing conditions.",
        "Medical, cancellation and baggage limits, excesses, and emergency assistance requirements.",
      ],
      review: [
        "Check all travellers, destinations, transit stops and dates against the policy.",
        "Match your planned activities and non-refundable bookings to cover limits and exclusions. Check card-provided cover activation rules if relevant.",
        "Keep the insurer's emergency contact details handy and check when you need to contact them before arranging treatment or transport.",
      ],
      planned: "A trip-cover checklist and a comparison of medical, evacuation, cancellation and activity cover.",
    },
  },
};
