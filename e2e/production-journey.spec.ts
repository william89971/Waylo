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
  await page.getByLabel("College of the Canyons class").selectOption({ index: 0 });
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).not.toContainText("No classes yet");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How heavy can next semester be?" })).toBeVisible();
  await page.getByRole("button", { name: "See next semester", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(page.getByText("Plan saved."), "save confirmation should be visible").toBeVisible();
  await expect(page.getByRole("button", { name: "Why this class?" }).first()).toBeVisible();
  await expect(page.getByText("Take this to your counselor").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email counselor" })).toBeVisible();
  await page.getByRole("button", { name: "Email counselor" }).click();
  await expect(page.getByLabel("Counselor's email")).toBeVisible();
  await page.getByRole("link", { name: "See all terms" }).click();
  await expect(page.getByRole("heading", { name: /All terms|Proposed sequence/ })).toBeVisible();
  await expect(page.getByTestId("articulation-matrix")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How each class counts" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Articulation status key" })).toContainText("Official");
  await expect(page.locator("#counselor-packet")).toContainText("Take this to your counselor");
  await expect(page.locator("#counselor-packet")).toContainText("ASSIST 2025-26");
  await expect(page.locator("body")).not.toContainText(/ucsd-data-2026|seed-articulation|multi-target-csp|planning-engine-v1/i);
  await page.goto("/app");
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
  await expect(returning.getByRole("button", { name: "Why this class?" }).first()).toBeVisible();
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

test("transcript rows stay off the plan until the student confirms them", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const testUser = `test-tr-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`/sign-up?testUser=${testUser}`);
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("heading", { name: "Where do you want to transfer?" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What have you completed?" })).toBeVisible();

  await page.getByRole("button", { name: "Paste a transcript" }).click();
  await page.getByLabel("Paste transcript text").fill("ENGL C1000 Academic Reading and Writing A Fall 2025");
  await page.getByRole("button", { name: "Read transcript" }).click();
  await expect(page.getByTestId("transcript-confirm")).toBeVisible();
  await expect(page.getByText(/Nothing is added to your plan until you confirm/)).toBeVisible();
  await expect(page.getByTestId("transcript-confirm")).toContainText("ENGL C1000");
  await expect(page.getByTestId("transcript-confirm")).not.toContainText("MATH 211");
  await expect(page.getByTestId("transcript-confirm")).not.toContainText("COMP SCI 111");
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByTestId("transcript-confirm")).toHaveCount(0);
  await expect(page.locator(".confirmed-course-list")).toContainText("No classes yet");

  await page.getByLabel("Paste transcript text").fill("ENGL C1000 Academic Reading and Writing A Fall 2025");
  await page.getByRole("button", { name: "Read transcript" }).click();
  await expect(page.getByTestId("transcript-confirm")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and add to my record" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("ENGL");
  await expect(page.locator(".confirmed-course-list")).not.toContainText("No classes yet");

  await context.close();
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
  await page.getByLabel("College of the Canyons class").selectOption({ index: 0 });
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How heavy can next semester be?" })).toBeVisible();
  await page.getByRole("button", { name: "See next semester", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await page.getByRole("link", { name: "See all terms" }).click();
  await expect(page.getByRole("heading", { name: /All terms|Proposed sequence/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How each class counts" })).toBeVisible();
  await expect(page.getByTestId("articulation-matrix")).toBeVisible();
  const mathCode = page.locator('[data-testid="articulation-matrix"] .font-mono.tabular-nums', {
    hasText: "MATH-211",
  });
  await expect(mathCode.first()).toBeVisible();
  await expect(mathCode.first()).toHaveClass(/font-mono/);
  await expect(mathCode.first()).toHaveClass(/tabular-nums/);
  await expect(page.getByRole("heading", { name: "What's left at each school" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email counselor" })).toBeVisible();
  await context.close();
});

