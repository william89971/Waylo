import { expect, test, type Page } from "@playwright/test";

async function signUp(page: Page, testUser: string) {
  await page.goto(`/sign-up?testUser=${testUser}`);
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page.getByRole("heading", { name: "Where do you want to transfer?" })).toBeVisible({
    timeout: 60_000,
  });
}

async function continueToCourses(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What have you completed?" })).toBeVisible();
}

async function finishToHome(page: Page) {
  await page.getByRole("button", { name: "See next semester", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How heavy can next semester be?" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
}

async function assertHomeInvariants(page: Page, opts?: { completedCodes?: string[] }) {
  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(page.locator(".dashboard-rail")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Change unit limit" })).toBeVisible();
  const pdf = page.getByRole("button", { name: "Download PDF" });
  const alreadyFinished = page.getByRole("heading", { name: "Already finished" });
  await expect(pdf).toBeVisible();
  await expect(alreadyFinished).toBeVisible();
  const pdfBox = await pdf.boundingBox();
  const finishedBox = await alreadyFinished.boundingBox();
  expect(pdfBox, "PDF handoff should sit above Already finished").toBeTruthy();
  expect(finishedBox).toBeTruthy();
  expect(pdfBox!.y).toBeLessThan(finishedBox!.y);
  await expect(page.locator("body")).not.toContainText(/Production baseline pathway/i);
  await expect(page.getByRole("heading", { name: "Cal-GETC / general education" })).toBeVisible();
  await expect(page.getByText("Waylo does not certify Cal-GETC.")).toBeVisible();

  const recommended = page.getByRole("table", { name: "Recommended semester courses" });
  for (const code of opts?.completedCodes ?? []) {
    await expect(recommended).not.toContainText(code);
  }

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, "Home should not overflow horizontally").toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test("brand-new student still gets a next-semester answer with dated official sources", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const testUser = `test-new-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, testUser);
  await continueToCourses(page);
  await expect(page.getByText("No classes yet")).toBeVisible();
  await finishToHome(page);
  await assertHomeInvariants(page);
  await expect(page.getByText("No finished classes yet")).toBeVisible();
  await page.getByRole("link", { name: "Change unit limit" }).click();
  await expect(page.getByRole("heading", { name: "How heavy can next semester be?" })).toBeVisible();
  await expect(page.getByLabel("Weekly work hours")).toHaveCount(0);
  await page.getByRole("button", { name: "See next semester", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What to take next semester" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Why this class?" }).first()).toBeVisible();
  const verifiedRow = page.locator(".course-row").filter({ hasText: "Official agreement" }).first();
  await expect(verifiedRow).toBeVisible();
  await verifiedRow.click();
  const drawer = page.getByTestId("evidence-drawer");
  await expect(drawer).toHaveAttribute("data-state", "open");
  await expect(drawer.getByRole("link", { name: /View official source · / }).first()).toHaveText(/2025-26|20\d{2}/);
  await expect(page.locator("body")).not.toContainText(/waylo\.local/i);
  await page.screenshot({ path: `work/visuals/rc-new-${testInfo.project.name}.png`, fullPage: true });
  await context.close();
});

test("completed COC, C1000, unmatched, AP, other-college, and petition stay honest on Home", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const testUser = `test-rc-${testInfo.project.name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, testUser);
  await continueToCourses(page);

  await page.getByRole("button", { name: "Paste a transcript" }).click();
  await page.getByLabel("Paste transcript text").fill("ENGL C1000 Academic Reading and Writing A Fall 2025");
  await page.getByRole("button", { name: "Read transcript" }).click();
  await expect(page.getByTestId("transcript-confirm")).toBeVisible();
  await expect(page.getByTestId("transcript-confirm")).toContainText("ENGL C1000");
  await expect(page.getByTestId("transcript-confirm")).not.toContainText("MATH 211");
  await expect(page.locator(".confirmed-course-list")).toContainText("No classes yet");
  await page.getByRole("button", { name: "Confirm and add to my record" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("ENGL C1000");

  await page.getByTestId("coc-course-select").selectOption("coc-math-211");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("MATH 211");

  await page.getByTestId("coc-course-select").selectOption("coc-stat-c1000");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("STAT C1000");

  await page.getByTestId("coc-course-select").selectOption("coc-soci-101");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("SOCI 101");

  await page.getByTestId("coc-course-select").selectOption("ap:calc-ab");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("AP Calculus AB");
  await expect(page.locator(".confirmed-course-list")).toContainText("counselor confirmation required");

  await page.getByRole("button", { name: "Another college or a petition" }).click();
  await page.getByLabel("Other college").fill("Pierce College");
  await page.getByLabel("Course code").fill("ENGL 101");
  await page.getByLabel("Title").fill("College Reading and Composition");
  await page.getByRole("button", { name: "Save unmatched" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("Pierce College");

  await page.getByLabel("Petition or substitution").fill("Substitute MATH 140 for STAT C1000");
  await page.getByRole("button", { name: "Record as pending" }).click();
  await expect(page.locator(".confirmed-course-list")).toContainText("Substitute MATH 140 for STAT C1000");

  await finishToHome(page);
  await assertHomeInvariants(page, {
    completedCodes: ["MATH 211", "ENGL C1000", "STAT C1000", "SOCI 101", "AP Calculus AB"],
  });
  await expect(page.getByRole("heading", { name: "Already finished" })).toBeVisible();
  await expect(page.locator(".status-scan").getByText("Calculus I", { exact: true })).toBeVisible();
  await expect(page.locator(".status-scan").getByText("Done").first()).toBeVisible();
  await expect(page.locator(".status-scan").getByText("SOCI 101", { exact: true })).toBeVisible();
  await expect(page.locator(".status-scan").getByText("Unmatched").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Counselor confirmation required" })).toBeVisible();
  await expect(page.getByText("AP Calculus AB — counselor confirmation required")).toBeVisible();
  await expect(page.getByText(/petition pending/i)).toBeVisible();
  await expect(page.getByText(/does not treat them as/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Why this class?" }).first()).toBeVisible();
  const verifiedRow = page.locator(".course-row").filter({ hasText: "Official agreement" }).first();
  await verifiedRow.click();
  const drawer = page.getByTestId("evidence-drawer");
  await expect(drawer).toHaveAttribute("data-state", "open");
  await expect(drawer.getByRole("link", { name: /View official source · / })).toBeVisible();
  await page.screenshot({ path: `work/visuals/rc-credit-${testInfo.project.name}.png`, fullPage: true });
  await context.close();
});
