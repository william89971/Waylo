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

  const preview = page.locator(".landing-teaser-preview");
  await expect(preview).toContainText("MATH-211");
  await page.getByLabel("Major").selectOption({ label: "Bioengineering" });
  await expect(preview).toContainText("CHEM-201");
  await page.getByLabel("School").selectOption({ label: "UCLA" });
  await expect(page.getByLabel("Major")).toHaveValue("ucla:business_administration");
  await expect(preview).toContainText("MATH-211");
  await expect(preview).toContainText("MATH-212");
});
