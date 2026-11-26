import type { Page } from "@playwright/test";

export async function addSyntheticSubmissionProbe(page: Page) {
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.action = "/electricity/";
    form.method = "post";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "synthetic";
    input.value = "987.654";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Synthetic submission probe";
    form.append(input, submit);
    document.body.append(form);
  });
}
