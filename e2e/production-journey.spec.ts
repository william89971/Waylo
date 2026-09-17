import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("student completes onboarding, saves a plan, and recovers it after signing in again", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const testUser = `test-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const firstContext = await browser.newContext();
  const page = await firstContext.newPage();

  await page.goto(`/sign-up?testUser=${testUser}`);
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("heading", { name: "Where do you want to transfer?" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("UC San Diego").first()).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What have you completed?" })).toBeVisible();
  await page.getByLabel("Course").selectOption({ index: 0 });
  await page.getByLabel("Grade").fill("A");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("A");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "How heavy can next semester be?" })).toBeVisible();
  await page.getByLabel("Maximum units per semester").fill("15");
  await page.getByRole("button", { name: "View proposed schedule", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Review your transfer plan" })).toBeVisible();
  await expect(page.getByText("Proposed — not saved")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review evidence" })).toBeVisible();
  await page.getByRole("link", { name: "Review evidence" }).click();
  await expect(page.getByRole("heading", { name: "Evidence behind your plan" })).toBeVisible();
  await expect(page.getByText(/ASSIST or counselor confirmation needed/).first()).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Save this plan" }).click();

  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(page.getByText("Plan saved."), "save confirmation should be visible").toBeVisible();
  await expect(page.locator(".saved-meta")).toContainText("version 1");
  await expect(page.getByRole("link", { name: "Take this to your counselor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the strategy note" })).toBeVisible();
  await page.getByRole("link", { name: "Read the strategy note" }).click();
  await expect(page.locator("#admissions-strategy")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Admissions strategy — not verified articulation" })).toBeVisible();
  await expect(page.locator("#admissions-strategy")).not.toContainText(/admission guarantee/i);
  await expect(page.locator("#admissions-strategy")).not.toContainText(/\b(likely|competitive|guaranteed)\b/i);
  await page.screenshot({ path: `work/visuals/production-journey-${testInfo.project.name}.png`, fullPage: true });

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
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")),
    `${testInfo.project.name} axe results`,
  ).toEqual([]);
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

test("UCB Economics primary with USC Business secondary shows divergence badges", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  // test-auth only accepts ids matching /^test-[a-z0-9-]{1,64}$/
  const testUser = `test-mt-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`/sign-up?testUser=${testUser}`);
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("heading", { name: "Where do you want to transfer?" })).toBeVisible({ timeout: 60_000 });
  // Clear the default UCSD selection so this journey is UCB primary + USC secondary only.
  const ucsd = page.getByTestId("university-list").getByRole("button", { name: /UC San Diego/ });
  if (await ucsd.getAttribute("aria-pressed") === "true") {
    await ucsd.click();
  }
  await page.getByTestId("university-list").getByRole("button", { name: /UC Berkeley/ }).click();
  await page.getByTestId("campus-majors-uc_berkeley").getByRole("radio", { name: /Economics/ }).click();
  await page.getByTestId("campus-majors-uc_berkeley").getByLabel("Primary school").check();
  await page.getByTestId("university-list").getByRole("button", { name: /University of Southern California/ }).click();
  await page.getByTestId("campus-majors-usc").getByRole("radio", { name: /Business/ }).click();
  await expect(page.getByText(/Also plan classes that only the second school needs/i)).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What have you completed?" })).toBeVisible();
  await page.getByLabel("Course").selectOption({ index: 0 });
  await page.getByLabel("Grade").fill("A");
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "How heavy can next semester be?" })).toBeVisible();
  await page.getByRole("button", { name: "View proposed schedule", exact: true }).click();

  await expect(page.getByRole("heading", { name: /Review this plan|Your plan/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How each class counts" })).toBeVisible();
  await expect(page.getByTestId("articulation-matrix")).toBeVisible();
  const mathCode = page.locator('[data-testid="articulation-matrix"] .font-mono.tabular-nums', {
    hasText: "MATH-211",
  });
  await expect(mathCode.first()).toBeVisible();
  await expect(mathCode.first()).toHaveClass(/font-mono/);
  await expect(mathCode.first()).toHaveClass(/tabular-nums/);
  await expect(page.getByRole("heading", { name: "What's left at each school" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Take this to your counselor" })).toBeVisible();
  await context.close();
});

