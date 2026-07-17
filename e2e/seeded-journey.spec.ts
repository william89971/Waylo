import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/demo", "/onboarding", "/judge-tour", "/overview", "/profile", "/pathways", "/roadmap", "/compare", "/what-if", "/planning-session", "/evidence", "/evidence/coc-math-2025", "/advisor-summary"];

test("landing communicates the full consequence before the first click", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "See what changes before you change your plan." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start the 2-minute judge tour" })).toHaveCount(2);
  const preview = page.getByRole("region", { name: "Academic Twin consequence preview" });
  await expect(preview).toContainText("Fall 2028");
  await expect(preview).toContainText("Spring 2029");
  await expect(preview).toContainText("4 milestones move");
  for (const course of ["MATH 211", "MATH 212", "MATH 213", "MATH 214"]) await expect(preview).toContainText(course);
  await expect(preview).toContainText("Saved baseline stays protected until human confirmation.");
});

test("two-minute judge tour proves consequence, validation, evidence, and handoff", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop covers the complete guided sequence; mobile covers responsive route health.");
  await page.goto("/judge-tour?fresh=1");
  await expect(page.getByRole("heading", { name: "See one decision become a validated route." })).toBeVisible();
  await expect(page.getByText("Seeded · no OpenAI request", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Show me the consequence" }).click();
  await expect(page.getByText("Recorded GPT-5.6 demo result.", { exact: true })).toBeVisible();
  await expect(page.locator(".tour-before-after")).toContainText("Fall 2028");
  await expect(page.locator(".tour-before-after")).toContainText("Spring 2029");
  await expect(page.locator(".tour-impact-statement")).toContainText("4 academic milestones");

  await page.getByRole("button", { name: "See how Waylo validates it" }).click();
  await expect(page.getByRole("heading", { name: "The model interprets. Deterministic code decides." })).toBeVisible();
  await expect(page.getByText("GPT-5.6 structured interpretation", { exact: true })).toBeVisible();
  await expect(page.getByText("Deterministic rejection", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open Judge Mode" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("PlanCommandInterpretationSchema");
  await expect(dialog).toContainText("Human gate");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Evidence and trust/ }).click();
  await expect(page.getByRole("heading", { name: "A valid schedule is not the same as a verified equivalency." })).toBeVisible();
  await expect(page.getByText("assist-review", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Counselor handoff/ }).click();
  await expect(page.getByRole("heading", { name: "Turn the simulation into a better conversation." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open printable packet" })).toBeVisible();
  await expect(page.locator(".app-main")).not.toContainText("OPENAI_API_KEY");
});

test("Academic Twin command lifecycle previews, simulates, repairs, gates, and confirms", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The mobile project covers responsive command access separately.");
  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { name: "Your Academic Twin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fastest valid route" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Academic Twin position summary" })).toContainText("Fall 2028");

  await page.getByRole("button", { name: "Preview changes" }).click();
  await expect(page.getByText("Use 25 weekly work hours for advisory workload ranking", { exact: true })).toBeVisible();
  await expect(page.getByText("Move MATH 214 outside Spring 2028", { exact: true })).toBeVisible();
  await expect(page.getByText("Allow up to 1 summer course per term", { exact: true })).toBeVisible();
  await expect(page.getByText("Keep Fall 2028 as a preferred transfer target", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Proposed Run a simulation first/ })).toBeDisabled();

  await page.getByRole("button", { name: "Run deterministic simulation" }).click();
  await expect(page.getByText("Valid · target missed")).toBeVisible();
  await expect(page.locator(".before-after")).toContainText("Spring 2029");

  const proposed = page.getByRole("button", { name: /Proposed Rejected/ });
  const repaired = page.getByRole("button", { name: /Repaired Revalidated/ });
  await expect(proposed).toBeEnabled();
  await expect(repaired).toBeEnabled();
  await proposed.click();
  await expect(page.getByRole("complementary", { name: "Route context and next actions" })).toContainText("Unsaved proposal");
  await expect(page.getByRole("complementary", { name: "Route context and next actions" })).toContainText("25 hr/week");
  await repaired.click();
  await expect(page.getByRole("complementary", { name: "Route context and next actions" })).toContainText("Revalidated repair");

  const confirm = page.getByRole("button", { name: "Confirm and save plan" });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox", { name: "I understand this valid route misses my Fall 2028 target and finishes Spring 2029." }).check();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText("Normalized route saved")).toBeVisible();
  await expect(page.getByRole("region", { name: "Academic Twin position summary" })).toContainText("Spring 2029");
  await page.reload();
  await expect(page.getByRole("region", { name: "Academic Twin position summary" })).toContainText("Spring 2029");
  await page.screenshot({ path: "output/playwright/desktop-command-roadmap.png", fullPage: true });
});

test("Judge Mode reports sanitized runtime facts and honest build attestation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop covers the technical inspector sheet.");
  await page.goto("/roadmap?judge=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Waylo technical inspector" })).toBeVisible();
  await expect(dialog).toContainText("gpt-5.6-sol");
  await expect(dialog).toContainText("Recorded GPT-5.6 demo result.");
  await expect(dialog).toContainText("Deterministic validation");
  await expect(dialog).toContainText("6 pathways across 3 destinations");
  await expect(dialog).toContainText("Not verified for this build.");
  await expect(dialog).not.toContainText("OPENAI_API_KEY");
});

test("uncertainty actions expose exact evidence, draft safely, and preserve source status", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Covered once with desktop focus checks.");
  await page.goto("/evidence");
  const review = page.getByRole("button", { name: "Review evidence" });
  await review.click();
  await expect(page.getByText("coc-math-2025", { exact: true })).toBeVisible();
  await expect(page.getByText("assist-review", { exact: true })).toBeVisible();
  await expect(page.getByText("ucla-data", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(review).toBeFocused();

  await page.getByRole("button", { name: "Draft counselor inquiry" }).click();
  const draft = page.getByLabel("Counselor inquiry draft");
  await expect(draft).toContainText("do not, by themselves, settle the exact equivalency");
  await expect(draft).toContainText("https://assist.org/");
  await page.locator('[data-slot="dialog-footer"]').getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Explore alternate route" }).click();
  await expect(page.getByRole("heading", { name: "Routes that do not rely on this match" })).toBeVisible();
  await expect(page.getByText("Waylo checks only the six supported pathway datasets and never invents an alternative.")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Mark as counselor-confirmed" }).click();
  await expect(page.getByText("The underlying source remains partial or uncertain and will never be relabeled verified.")).toBeVisible();
  await page.getByRole("button", { name: "Record confirmation" }).click();
  await expect(page.getByRole("button", { name: "Counselor-confirmed" })).toBeDisabled();
  await expect(page.locator(".evidence-row").filter({ hasText: "ASSIST — California articulation source" })).toContainText("partial");

  await page.getByRole("button", { name: "Compare controlled versions" }).click();
  await expect(page.getByText("Proposed review", { exact: true })).toBeVisible();
  await expect(page.getByText("MATH 214", { exact: true })).toBeVisible();
  await expect(page.getByText(/Controlled evaluation fixture only/)).toBeVisible();
});

test("recorded multimodal workflow shows all seven stages before normalized commit", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop verifies upload and commit; mobile verifies layout.");
  await page.goto("/profile");
  const input = page.locator('input[type="file"]');
  const boundedPngHeader = Buffer.alloc(24);
  boundedPngHeader.set([137, 80, 78, 71, 13, 10, 26, 10]);
  boundedPngHeader.writeUInt32BE(1, 16);
  boundedPngHeader.writeUInt32BE(1, 20);
  await input.setInputFiles({ name: "sanitized-transcript.png", mimeType: "image/png", buffer: boundedPngHeader });
  await expect(page.getByText("sanitized-transcript.png")).toBeVisible();
  await page.getByRole("button", { name: "Replay GPT-5.6 demonstration" }).click();
  await expect(page.getByText("4 of 7 stages complete")).toBeVisible();
  await expect(page.getByText("Student review", { exact: true })).toBeVisible();
  await expect(page.getByText("3 extracted courses")).toBeVisible();
  await expect(page.getByLabel("Visible code").first()).toBeEditable();
  await page.getByRole("checkbox", { name: "Exclude this possible duplicate from the workspace update" }).nth(1).uncheck();
  await page.getByRole("button", { name: "Confirm courses and generate routes" }).click();
  await expect(page.getByText("7 of 7 stages complete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Profile updated" })).toBeDisabled();
  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("waylo-workspace", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = database.transaction("workspace", "readonly");
    const get = transaction.objectStore("workspace").get("current");
    const value = await new Promise<unknown>((resolve, reject) => { get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    database.close();
    return JSON.stringify(value);
  });
  expect(stored).not.toContain("sanitized-transcript.png");
  expect(stored).not.toContain("rawTranscript");
  await page.screenshot({ path: "output/playwright/desktop-evidence-to-plan.png", fullPage: true });
});

test("sanitized planning trace reports operations without hidden reasoning", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Trace semantics are viewport-independent.");
  await page.goto("/planning-session");
  await expect(page.getByRole("button", { name: "Replay GPT-5.6 demonstration" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Try live GPT-5.6/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Replay GPT-5.6 demonstration" }).click();
  await expect(page.getByText("Rejected candidate").first()).toBeVisible();
  await expect(page.getByText("Published validated routes")).toBeVisible();
  await expect(page.getByText("Operational facts only")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("chain-of-thought transcript");
  await expect(page.locator(".event-detail code").filter({ hasText: "ucla-data" }).first()).toBeVisible();
});

test("advisor decision packet separates evidence categories and prints", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Print output is verified in the desktop project.");
  await page.goto("/advisor-summary");
  await expect(page.getByRole("heading", { name: "Advisor decision packet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verified route facts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Counselor-confirmed facts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unresolved evidence" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.getByText("Questions for my counselor")).toBeVisible();
});

test("all public and workspace routes have no overflow, console errors, or serious axe violations", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of routes) {
    const errors: string[] = [];
    const onConsole = (message: { type(): string; text(): string }) => { if (message.type() === "error") errors.push(message.text()); };
    page.on("console", onConsole);
    await page.goto(path);
    await expect(page.locator(".workspace-loading-shell")).toBeHidden();
    await expect(page.locator("main, body").first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth, `${path} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${path} axe results`).toEqual([]);
    expect(errors, `${path} console errors`).toEqual([]);
    page.off("console", onConsole);
  }
});

test("mobile Academic Twin, navigation, comparison, and evidence flow remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only interaction check.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { name: "Your Academic Twin" })).toBeVisible();
  await expect(page.locator(".mobile-route-narrative")).toBeVisible();
  await expect(page.locator(".route-canvas-svg")).toBeHidden();
  await page.getByRole("button", { name: "Preview changes" }).click();
  await expect(page.getByText("Use 25 weekly work hours for advisory workload ranking", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Waylo navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Pathway overlap" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Turn a transcript into a reviewable route" })).toBeVisible();
  await page.screenshot({ path: "output/playwright/mobile-evidence-to-plan.png", fullPage: true });
});

test("health endpoint exposes configuration state without secrets", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", application: "Waylo", model: "gpt-5.6-sol", seededMode: true, demoMode: "seeded", aiConfigured: false });
  expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY");
});
