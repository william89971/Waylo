import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("student completes onboarding, saves a plan, and recovers it after signing in again", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const testUser = `test-journey-${testInfo.project.name}`;
  const firstContext = await browser.newContext();
  const page = await firstContext.newPage();

  await page.goto(`/sign-up?testUser=${testUser}`);
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("heading", { name: "What college do you attend?" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("heading", { name: "Where do you want to transfer?" })).toBeVisible();
  await expect(page.getByText("UC San Diego")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("heading", { name: "What have you completed?" })).toBeVisible();
  await page.getByLabel("Course").selectOption({ index: 0 });
  await page.getByLabel("Grade").fill("A");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("A");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("heading", { name: "What should your plan account for?" })).toBeVisible();
  await page.getByLabel("Maximum units per semester").fill("15");
  await page.getByRole("button", { name: /Generate my plan/ }).click();

  await expect(page.getByRole("heading", { name: "Review your transfer plan" })).toBeVisible();
  await expect(page.getByText("Proposed — not saved")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review evidence" })).toBeVisible();
  await page.getByRole("link", { name: "Review evidence" }).click();
  await expect(page.getByRole("heading", { name: "Evidence behind your plan" })).toBeVisible();
  await expect(page.getByText(/ASSIST or counselor confirmation needed/).first()).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Save this plan" }).click();

  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(page.getByText("Your plan is saved"), "save confirmation should be visible").toBeVisible();
  await expect(page.locator(".saved-meta")).toContainText("version 1");
  await page.screenshot({ path: `../work/visuals/production-journey-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await firstContext.close();

  const returnContext = await browser.newContext();
  const returning = await returnContext.newPage();
  await returning.goto(`/sign-in?testUser=${testUser}`);
  await returning.getByRole("button", { name: "Continue as test student" }).click();
  await expect(returning.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(returning.locator(".saved-meta")).toContainText("version 1");
  await returnContext.close();
});

test("production journey is accessible and has no mobile overflow", async ({ page }, testInfo) => {
  await page.goto("/sign-up");
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${testInfo.project.name} axe results`).toEqual([]);
});

test("server ownership prevents one test user from reading another user workspace", async ({ request }) => {
  const first = await request.get("/api/me", { headers: { "x-waylo-test-user": "isolation-a" } });
  const second = await request.get("/api/me", { headers: { "x-waylo-test-user": "isolation-b" } });
  expect(first.ok()).toBeTruthy();
  expect(second.ok()).toBeTruthy();
  const firstBody = await first.json();
  const secondBody = await second.json();
  expect(firstBody.workspace.userId).not.toBe(secondBody.workspace.userId);
  expect(firstBody.workspace.courses).toEqual([]);
  expect(secondBody.workspace.courses).toEqual([]);
});
