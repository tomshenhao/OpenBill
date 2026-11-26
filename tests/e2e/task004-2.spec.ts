import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";
import { positionedGenesis, syntheticPdf } from "../fixtures/electricity-bills";

for (const locale of ["en", "zh"] as const) test(`${locale}: PDF dates and parsing concerns are independent of arithmetic`, async ({ page }) => {
  const t = messages[locale].electricityReview;
  await page.goto(locale === "en" ? "/electricity/" : "/zh/electricity/");
  await page.getByRole("button", { name: t.choosePdf }).click();
  const pdf = page.getByLabel(t.file, { exact: true });
  const summary = page.getByTestId("current-electricity-review");
  const verification = page.getByTestId("electricity-verification");
  const withConcern = positionedGenesis.filter((row) => typeof row !== "string" || !row.startsWith("Billing period:"))
    .flatMap((row) => typeof row === "string" || row[0][1] !== "115.37" ? [row] : ["Unclassified line $1.00", row]);
  await pdf.setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: syntheticPdf([withConcern]) });
  await expect(summary.getByText(t.issues.period)).toBeVisible();
  await expect(summary.getByText(t.issues.unclassifiedAmount)).toHaveCount(0);
  await expect(summary.getByText(t.unresolved)).toHaveCount(0);
  await expect(verification).toHaveText(t.verification.matches);

  const incomplete = positionedGenesis.filter((row) => typeof row === "string" || row[0][1] !== "42.63");
  await pdf.setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: syntheticPdf([incomplete]) });
  await expect(verification).toHaveText(t.verification.review);
  await expect(summary.getByText(t.issues.dailyRate)).toBeVisible();
  await expect(summary.getByText(t.reviewAffectsVerification)).toBeVisible();
  await expect(summary.getByTestId("electricity-total")).toContainText("115.37");
  await expect(page.getByTestId("electricity-edit")).not.toHaveAttribute("open", "");

  const conflicting = positionedGenesis.flatMap<(typeof positionedGenesis)[number]>((row) => {
    if (typeof row !== "string") return [row.map(([x, text]) => [x, text === "57.69" ? "57.00" : text] as const)];
    // An explicit GST basis keeps the test focused on the printed usage discrepancy.
    return row.startsWith("Billing period:") ? [row, "Rates exclude GST"] : [row];
  });
  await pdf.setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: syntheticPdf([conflicting]) });
  await expect(verification).toHaveText(t.verification.review);
  await expect(summary.getByText(t.issues.usageAmount)).toBeVisible();
  await expect(summary.getByText(t.issues.fixedAmount)).toHaveCount(0);
  await expect(summary.getByText(t.reviewAffectsVerification)).toBeVisible();
  await expect(page.getByRole("heading", { name: t.scenarios })).toHaveCount(0);
});
