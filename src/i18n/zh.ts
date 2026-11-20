import type { Messages } from "./en";
import { productZh } from "./product-zh.ts";
import { waterZh } from "./water-zh.ts";
import { electricityZh } from "./electricity-zh.ts";
import { mortgageZh } from "./mortgage-zh.ts";

export const zh: Messages = {
  analysis: electricityZh,
  water: waterZh,
  mortgage: mortgageZh,
  product: productZh,
  language: "简体中文",
  otherLanguage: "English",
  skip: "跳转到主要内容",
  navigation: "主导航",
  home: "首页",
  heroTitle: "看懂账单，少花钱。",
  heroDescription: "为新西兰家庭提供简单、独立的工具，帮助您了解并减少日常开支。",
  principlesTitle: "我们的原则",
  principles: [
    "免费使用，开放源代码。",
    "保持独立，无广告，不收取供应商佣金。",
    "您输入的家庭数据只在浏览器内处理。",
    "提供有据可查的信息。",
  ],
  heroNote: "输入仅保留在您的浏览器中。OpenBill 没有广告，也不收取供应商佣金。",
  noScript: "本地用电量计算需要启用 JavaScript。输入内容绝不会提交至服务器。",
  metaTitle: "OpenBill — 看懂账单，少花钱。",
  metaDescription: "OpenBill 是面向新西兰家庭的免费独立项目。使用英文或简体中文，在浏览器内了解电费、奥克兰水费和房贷成本。",
};
