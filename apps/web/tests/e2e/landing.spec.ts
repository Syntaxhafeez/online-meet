import { expect, test } from "@playwright/test";

test("landing page can start a meeting", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Your display name").fill("Ada");
  await expect(page.getByRole("button", { name: /start instant meeting/i })).toBeEnabled();
});
