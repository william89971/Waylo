import { expect, test, type Page } from "@playwright/test";

async function onboardMultiTargetPlan(page: Page, testUser: string) {
  await page.goto(`/sign-up?testUser=${testUser}`);
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("heading", { name: "What college do you attend?" })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Where do you want to transfer?" })).toBeVisible();
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
  await expect(page.getByText(/Include secondary major prep/i)).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What have you completed?" })).toBeVisible();
  await page.getByLabel("Course").selectOption({ index: 0 });
  await page.getByLabel("Grade").fill("A");
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Schedule preferences" })).toBeVisible();
  await page.getByRole("button", { name: "View proposed schedule", exact: true }).click();

  await expect(page.getByRole("heading", { name: /multi-target plan/i })).toBeVisible();
  await expect(page.getByTestId("articulation-matrix")).toBeVisible();
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    overflow.scrollWidth,
    "plan page should not widen the document; the matrix scrolls internally",
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("multi-target articulation matrix and evidence drawer", () => {
  test("matrix rows use mono tabular course codes and open the evidence drawer", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const testUser = `test-mx-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const context = await browser.newContext();
    const page = await context.newPage();

    await onboardMultiTargetPlan(page, testUser);

    const courseCode = page
      .locator('[data-testid="articulation-matrix"] th[scope="row"] .font-mono.tabular-nums')
      .filter({ hasText: "MATH-211" })
      .first();
    await expect(courseCode).toBeVisible();
    await expect(courseCode).toHaveClass(/font-mono/);
    await expect(courseCode).toHaveClass(/tabular-nums/);

    const row = page.locator('[data-testid="articulation-matrix"] tr[data-course-code="MATH-211"]');
    await expect(row).toBeVisible();
    await row.click();

    const drawer = page.getByTestId("evidence-drawer");
    await expect(drawer).toHaveAttribute("data-state", "open");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("MATH-211");
    await expect(drawer.getByText("Confirmed in an official ASSIST agreement.").first()).toBeVisible();
    await expect(drawer.getByText("Campus").first()).toBeVisible();
    await expect(drawer.getByText("Requirement").first()).toBeVisible();
    await expect(page.getByText(/usc:business_administration/)).toHaveCount(0);
    await expect(page.getByText(/UC Berkeley Economics/).first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("data-state", "closed");
    await expect(row).toBeFocused();

    await row.click();
    await expect(drawer).toHaveAttribute("data-state", "open");
    // Click the left-edge gutter so the backdrop receives the event even on narrow viewports.
    await page.getByRole("button", { name: "Dismiss evidence drawer" }).click({
      position: { x: 8, y: 120 },
    });
    await expect(drawer).toHaveAttribute("data-state", "closed");

    await context.close();
  });
});

test("multi-target Save this plan reaches the dashboard and shows strategy", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const testUser = `test-sv-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const context = await browser.newContext();
  const page = await context.newPage();

  await onboardMultiTargetPlan(page, testUser);
  await expect(page.getByRole("button", { name: "Save this plan" })).toBeVisible();
  await page.getByRole("button", { name: "Save this plan" }).click();

  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(page.getByText("Plan saved.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review semester plan" })).toHaveCount(1);
  await expect(page.getByText(/UC Berkeley Economics/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the strategy note" })).toBeVisible();
  await page.getByRole("link", { name: "Read the strategy note" }).click();
  await expect(page.locator("#admissions-strategy")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Admissions strategy — not verified articulation" })).toBeVisible();
  await expect(page.locator("#admissions-strategy")).not.toContainText(/admission guarantee/i);
  await expect(page.locator("body")).not.toContainText(/You are likely/i);

  await context.close();
});
