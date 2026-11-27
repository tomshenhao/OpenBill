import type { WaterBillField } from "../domain/water/pdf-bill.ts";

const en = {
  entryMode: "Choose how to enter your water use", start: "Upload Watercare bill", manualMode: "Enter water usage manually", intro: "Select a digital residential bill. OpenBill reads it in this browser and keeps only the bill figures shown below until you clear or reload the page.",
  file: "Select a Watercare PDF bill", loading: "Reading the PDF in this browser…", fallback: "Use manual water entry", reset: "Clear PDF and bill details",
  preview: "Bill preview", extracted: "Bill figures extracted in this browser. Confirm them to see your analysis.", review: "Review or edit bill details", reviewHint: "Check the figures against your bill before confirming. Correct any highlighted fields that you can verify.", reviewNotice: "Some details need review before the charge check can be verified.", confirm: "Confirm figures and analyse", dateFormat: "For example, 10 Nov 2026", verification: "Detailed charge verification", usage: "Water usage", tips: "Three ways to save water", gstInclusive: "Rates and amounts are in NZD and include GST.",
  groups: { dates: "Billing dates and readings", water: "Water consumption", wastewater: "Wastewater consumption", fixed: "Fixed charges", totals: "GST and total amounts" },
  missing: "Missing", uncertain: "Conflicting values. Check this field.", invalid: "Enter a valid value.", unreadable: "At least one page had no selectable text. Check the extracted details against the bill.",
  occupants: "People in the household", reading: "Current meter reading type", results: "Watercare bill analysis", charges: "Current charges and amount due", billed: "As entered", calculated: "Calculated", unit: "NZD", notAvailable: "Unavailable", field: "Bill item",
  periodMismatch: "The reading dates and billed day count disagree. Correct them before relying on the charge check.", scheduleUnavailable: "No single indexed Watercare schedule covers these days. The fixed-charge calculation is unavailable.",
  incomplete: "Some figures are missing, so the full charge check is unavailable.", differs: "Some figures differ from the calculation.", reconciles: "The reviewed charges and GST match the calculation.",
  currentVsDue: "Current charges cover this billing period. The amount due can also reflect an earlier balance, payments or credits.",
  wastewaterExplain: "Wastewater charges cover collecting and treating water that goes down the drain. Watercare usually estimates it from a share of incoming water. Some properties use a different percentage.",
  fixedExplain: "The wastewater fixed charge helps fund the service even when usage is low. The check prorates the annual charge by billed days and rounds each charge to cents.",
  waterUnit: "One kilolitre (kL) is 1,000 litres. The same household usage is divided by the number of people to find the daily amount per person.",
  householdDaily: "Litres per household per day", personDaily: "Litres per person per day", meets: "Meets Watercare’s residential efficiency target", near: "At or slightly above the efficiency target, within the typical range", above: "Above the published typical range",
  objective: "Current Watercare residential efficiency objective · below 165 L per person per day", typical: "Watercare’s typical Auckland range · 140–170 L per person per day", historical: "Historical benchmark shown on this bill · 155 L per person per day (2021–2025)",
  guidance: "Compare several bills and check reading types before drawing conclusions about a change.", schedule: "Watercare’s published schedule for the period", actions: ["Run the washing machine with a full load.", "Take shorter showers.", "Check toilets and taps for drips."], saving: "Watercare’s water-saving tips", leaks: "Watercare’s leak-check guide",
  errors: { type: "Choose a PDF file.", size: "The file is empty or exceeds the PDF size or text limit.", pages: "The PDF exceeds 12 pages.", timeout: "The PDF took too long to read.", encrypted: "The PDF requires a password.", image: "No selectable text was found. Use manual entry for scanned bills.", unsupported: "This Watercare bill layout could not be recognised.", invalid: "The PDF could not be read." },
  fields: {
    invoiceDate: "Invoice date", dueDate: "Due date", previousDate: "Previous reading date", currentDate: "Current reading date", days: "Consumption days", kl: "Water used (kL)", dailyLitres: "Printed daily usage (L/day)",
    waterRate: "Water rate (NZD/kL)", waterAmount: "Water consumption charge", wastewaterPercent: "Wastewater factor (%)", wastewaterKl: "Billed wastewater (kL)", wastewaterRate: "Wastewater rate (NZD/kL)",
    wastewaterAmount: "Wastewater consumption charge", annualFixedRate: "Annual wastewater fixed rate (NZD)", fixedAmount: "Wastewater fixed charge this period", gst: "GST already included", currentCharges: "Current charges", amountDue: "Total amount due",
  } satisfies Record<WaterBillField, string>,
};

const zh: typeof en = {
  entryMode: "选择用水数据的输入方式", start: "上传 Watercare 账单", manualMode: "手动输入用水数据", intro: "选择电子住宅账单。OpenBill 在此浏览器中读取账单，只会临时保留下方显示的账单数据，清除或刷新页面后即删除。",
  file: "选择 Watercare PDF 账单", loading: "正在此浏览器中读取 PDF…", fallback: "手动输入用水数据", reset: "清除 PDF 和账单数据",
  preview: "账单预览", extracted: "已在此浏览器中提取账单数据。确认数据后即可查看分析。", review: "核对或编辑账单明细", reviewHint: "确认前请对照账单核对数据。请更正您能核实的标记项目。", reviewNotice: "部分明细需核对后才能验证费用。", confirm: "确认数据并分析", dateFormat: "例如 10 Nov 2026", verification: "详细费用核算", usage: "用水量", tips: "三个节水方法", gstInclusive: "费率及金额均以新西兰元显示，并包含商品及服务税。",
  groups: { dates: "账单日期与抄表读数", water: "用水量", wastewater: "污水用量", fixed: "固定费", totals: "税费与总金额" },
  missing: "缺失", uncertain: "数据不一致，请核对此项。", invalid: "请输入有效数据。", unreadable: "至少一页没有可选文字，请对照账单核对提取的数据。",
  occupants: "家庭人数", reading: "本次水表读数类型", results: "Watercare 账单分析", charges: "本期费用和应付金额", billed: "输入金额", calculated: "计算金额", unit: "新西兰元", notAvailable: "暂无", field: "账单项目",
  periodMismatch: "抄表日期与计费天数不符。请更正后再参考费用核算。", scheduleUnavailable: "没有一份已收录的 Watercare 价目表覆盖整个账期，暂无法计算固定费。",
  incomplete: "部分数据缺失，暂无法核对全部费用。", differs: "部分数据与计算结果不一致。", reconciles: "核对后的费用及商品及服务税与计算结果一致。",
  currentVsDue: "本期费用只涵盖本账期。应付金额还可能包含以前的余额、付款或抵扣。",
  wastewaterExplain: "污水费涵盖收集和处理排入下水道的污水。Watercare 通常按进水量的一定比例估算污水量。部分住宅适用不同的比例。",
  fixedExplain: "即使用水量较低，污水固定费仍用于维持服务。此核算按计费天数分摊年度固定费，每项费用四舍五入至分。",
  waterUnit: "一千升（kL）等于 1,000 升。每日家庭用水量除以家庭人数，即为人均日用水量。",
  householdDaily: "家庭每日用水量（升）", personDaily: "人均每日用水量（升）", meets: "达到 Watercare 住宅用水效率目标", near: "达到或略高于效率目标，仍在典型范围内", above: "高于公布的典型范围",
  objective: "Watercare 当前住宅用水效率目标 · 每人每天低于 165 升", typical: "Watercare 奥克兰典型用水范围 · 每人每天 140 至 170 升", historical: "本账单所示历史基准 · 每人每天 155 升（2021 至 2025 年）",
  guidance: "判断用水是否变化前，请对比多期账单并核对读数类型。", schedule: "Watercare 发布的本账期价目表", actions: ["尽量满载洗衣。", "缩短淋浴时间。", "检查马桶及水龙头是否滴漏。"], saving: "Watercare 节水建议", leaks: "Watercare 漏水检查指南",
  errors: { type: "请选择 PDF 文件。", size: "文件为空，或超过 PDF 大小或文字上限。", pages: "PDF 超过 12 页。", timeout: "读取 PDF 超时。", encrypted: "PDF 需要密码。", image: "未找到可选文字。扫描账单请使用手动输入。", unsupported: "无法识别此 Watercare 账单格式。", invalid: "无法读取此 PDF。" },
  fields: {
    invoiceDate: "开票日期", dueDate: "付款截止日期", previousDate: "上次抄表日期", currentDate: "本次抄表日期", days: "用水计费天数", kl: "用水量（千升）", dailyLitres: "账单所示日用水量（升）",
    waterRate: "供水费率（新西兰元／千升）", waterAmount: "用水费", wastewaterPercent: "污水计算比例（%）", wastewaterKl: "计费污水量（千升）", wastewaterRate: "污水费率（新西兰元／千升）",
    wastewaterAmount: "污水用量费", annualFixedRate: "年度污水固定费（新西兰元）", fixedAmount: "本期污水固定费", gst: "已包含的商品及服务税", currentCharges: "本期费用", amountDue: "应付总额",
  },
};

export const waterPdfCopy = { en, zh };
