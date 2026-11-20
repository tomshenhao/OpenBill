import { productEn } from "./product-en.ts";
import { waterEn } from "./water-en.ts";
import { electricityEn } from "./electricity-en.ts";
import { mortgageEn } from "./mortgage-en.ts";

export const en = {
  analysis: electricityEn,
  water: waterEn,
  mortgage: mortgageEn,
  product: productEn,
  language: "English",
  otherLanguage: "简体中文",
  skip: "Skip to content",
  navigation: "Main navigation",
  home: "Home",
  heroTitle: "Understand your bills. Pay less.",
  heroDescription: "Simple, independent tools to help New Zealand households understand and reduce everyday expenses.",
  principlesTitle: "Our principles",
  principles: [
    "Free and open source.",
    "Independent, with no ads or supplier commissions.",
    "Household inputs stay in your browser.",
    "Information grounded in evidence.",
  ],
  heroNote: "Your entries stay in your browser. OpenBill has no ads or supplier commissions.",
  noScript: "JavaScript is needed for the local usage calculator. Your inputs are never submitted to a server.",
  metaTitle: "OpenBill — Understand your bills. Pay less.",
  metaDescription: "Understand electricity, Auckland water and mortgage costs privately with OpenBill, a free, independent project in English and Simplified Chinese.",
};

export type Messages = typeof en;
