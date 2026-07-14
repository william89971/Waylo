import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("seeded desktop journey supports pathway, route, simulation, evidence, and print", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop journey has a separate mobile navigation check");
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find your way through college." })).toBeVisible();
  await page.getByRole("link", { name: "Explore your academic routes" }).click();
  await expect(page.getByRole("heading", { name: "Know where you are and what comes next." })).toBeVisible();

  await page.getByRole("link", { name: "Pathways" }).click();
  await expect(page.getByRole("heading", { name: "Explore your academic routes." })).toBeVisible();
  await expect(page.locator(".pathway-row")).toHaveCount(6);
  const berkeleyData = page.locator(".pathway-row").filter({ hasText: "UC Berkeley" }).filter({ hasText: "Data Science B.A." });
  await expect(berkeleyData).toHaveCount(1);
  await berkeleyData.getByRole("button", { name: "Choose pathway" }).click();
  await expect(berkeleyData.getByRole("button", { name: "Selected" })).toBeVisible();

  await page.getByRole("link", { name: "Roadmap" }).click();
  await expect(page.getByText("UC Berkeley · Data Science B.A.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fastest valid route" })).toBeVisible();
  await expect(page.getByText("Greatest overlap", { exact: true })).toBeVisible();
  await expect(page.getByText("Balanced workload", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("UC Berkeley · Data Science B.A.")).toBeVisible();

  await page.getByRole("link", { name: "What-If", exact: true }).click();
  await page.getByRole("button", { name: "Remove Calculus I" }).click();
  await expect(page.getByText("Why it changed")).toBeVisible();
  await expect(page.getByText("The schedule is recalculated from those dependencies—not from a scripted result.")).toBeVisible();

  await page.getByRole("link", { name: "Planning Session", exact: true }).click();
  await page.getByRole("button", { name: "Replay seeded" }).click();
  await expect(page.getByText("Rejected invalid candidate")).toBeVisible();
  await expect(page.getByText("Generated three validated routes")).toBeVisible();

  await page.getByRole("link", { name: "Evidence", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence behind your route" })).toBeVisible();
  await expect(page.locator(".evidence-row")).toHaveCount(11);

  await page.getByRole("link", { name: "Advisor Summary", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Advisor summary" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.getByText("Questions for my counselor")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("overview and advisor summary have no serious axe violations", async ({ page }) => {
  for (const path of ["/overview", "/advisor-summary"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  }
});

test("mobile roadmap keeps primary navigation and course evidence usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only interaction check");
  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { name: "Your semester-by-semester route" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Waylo navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Evidence", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence behind your route" })).toBeVisible();
});

test("health endpoint exposes configuration state without secrets", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", application: "Waylo", model: "gpt-5.6-sol", seededMode: true });
  expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY");
});
