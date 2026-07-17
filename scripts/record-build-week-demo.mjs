import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [timingsPath, rawVideoPath] = process.argv.slice(2);

if (!timingsPath || !rawVideoPath) {
  throw new Error("Usage: node scripts/record-build-week-demo.mjs <timings.json> <raw-video.webm>");
}

const repoRoot = process.cwd();
const port = 3017;
const baseUrl = "http://127.0.0.1:" + port;
const timings = JSON.parse(await readFile(timingsPath, "utf8"));
const durationById = new Map(timings.map((scene) => [scene.id, scene.durationSeconds]));
const consoleErrors = [];
const serverOutput = [];

const seconds = (id) => {
  const value = durationById.get(id);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Missing duration for scene " + id);
  return value;
};

const hold = async (page, id, consumedSeconds = 0) => {
  await page.waitForTimeout(Math.max(500, Math.round((seconds(id) - consumedSeconds) * 1000)));
};

const waitForServer = async () => {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl + "/api/health");
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error("Waylo did not become ready on " + baseUrl + ".\n" + serverOutput.join(""));
};

const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: repoRoot,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on("data", (chunk) => serverOutput.push(chunk.toString()));

let browser;
let context;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: path.dirname(rawVideoPath),
      size: { width: 1600, height: 900 },
    },
    colorScheme: "light",
    reducedMotion: "reduce",
  });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "See what changes before you change your plan." }).hover();
  await page.getByRole("region", { name: "Academic Twin consequence preview" }).waitFor();
  await hold(page, "promise");

  await page.getByRole("link", { name: "Start the 2-minute judge tour" }).first().click();
  await page.getByRole("heading", { name: "See one decision become a validated route." }).waitFor();
  await page.waitForTimeout(1_300);
  await page.getByRole("button", { name: "Show me the consequence" }).click();
  await page.getByText("Recorded GPT-5.6 demo result.", { exact: true }).waitFor();
  await page.locator(".tour-impact-statement").hover();
  await hold(page, "consequence", 1.3);

  await page.getByRole("button", { name: "See how Waylo validates it" }).click();
  await page.getByRole("heading", { name: "The model interprets. Deterministic code decides." }).waitFor();
  await page.waitForTimeout(3_000);
  await page.getByRole("button", { name: "Open Judge Mode" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(Math.min(7_000, Math.round(seconds("validation") * 350)));
  await page.keyboard.press("Escape");
  await hold(page, "validation", 3 + Math.min(7, seconds("validation") * 0.35));

  await page.getByRole("button", { name: /Evidence and trust/ }).click();
  await page.getByRole("heading", { name: "A valid schedule is not the same as a verified equivalency." }).waitFor();
  await page.getByText("assist-review", { exact: false }).first().hover();
  await hold(page, "evidence");

  await page.getByRole("button", { name: /Counselor handoff/ }).click();
  await page.getByRole("heading", { name: "Turn the simulation into a better conversation." }).waitFor();
  const packetLink = page.getByRole("link", { name: "Open printable packet" });
  await packetLink.hover();
  const packetHold = Math.max(4, seconds("handoff") - 6);
  await page.waitForTimeout(Math.round(packetHold * 1000));
  await packetLink.click();
  await page.getByRole("heading", { name: "Advisor Decision Packet" }).waitFor();
  await page.waitForTimeout(Math.round(Math.max(2, seconds("handoff") - packetHold) * 1000));

  const video = page.video();
  await context.close();
  context = undefined;
  if (!video) throw new Error("Playwright did not create a video recording.");
  await video.saveAs(rawVideoPath);

  if (consoleErrors.length) {
    throw new Error("Browser errors during recording:\n" + consoleErrors.join("\n"));
  }
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
