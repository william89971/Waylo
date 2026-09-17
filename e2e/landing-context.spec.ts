import { expect, test } from "@playwright/test";

test("landing previews a real destination before account creation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Sign up", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Build your semester list" }).first()).toBeVisible();
  await expect(page.getByText("ASSIST 2025-26 · 3 UCs and USC")).toBeVisible();
  await expect(page.getByText("Target: UCLA Pre-Business Economics & UC Berkeley Economics")).toBeVisible();
  await expect(page.getByText("Satisfies prereqs for 4 target schools")).toBeVisible();
  await expect(page.getByText("Paste or upload a transcript, or pick from a list.")).toBeVisible();
  await expect(page.getByText(/Engineered to match official ASSIST\.org articulations/)).toBeVisible();

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  const school = page.locator('select[name="target-school"]');
  const major = page.locator('select[name="target-major"]');
  const preview = page.locator(".landing-teaser-preview");
  const cta = page.locator(".landing-teaser a.production-button");
  await expect(cta).toHaveAttribute("href", "/sign-up");
  await expect(preview).toContainText("MATH-211");
  await major.selectOption({ label: "Bioengineering" });
  await expect(preview).toContainText("CHEM-201");
  await school.selectOption({ label: "UCLA" });
  await expect(major).toHaveValue("ucla:business_administration");
  await expect(preview).toContainText("MATH-211");
  await expect(preview).toContainText("MATH-212");
  await cta.click();
  await expect(page).toHaveURL(/\/sign-up/);
});
