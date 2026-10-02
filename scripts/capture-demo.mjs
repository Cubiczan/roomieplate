import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.DEMO_URL || "http://127.0.0.1:43123";

await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});

page.on("pageerror", (error) => {
  console.error("pageerror", error.message);
});
page.on("console", (message) => {
  if (message.type() === "error") console.error("console", message.text());
});

const statusReady = page.waitForResponse((response) => response.url().includes("/api/status"));
await page.goto(baseUrl, { waitUntil: "networkidle" });
await statusReady;
await page.getByTestId("safety-banner").waitFor();
await page.screenshot({ path: "docs/screenshots/01-profile.png" });

await Promise.all([
  page.waitForResponse((response) => response.url().includes("/api/plan") && response.request().method() === "POST"),
  page.getByTestId("generate-week").click(),
]);
await page.getByTestId("allergen-callout").first().waitFor();
await page.getByTestId("week-board").screenshot({ path: "docs/screenshots/02-week.png" });
await page.getByTestId("meal-card").first().screenshot({ path: "docs/screenshots/02-monday-dinner.png" });

await Promise.all([
  page.waitForResponse((response) => response.url().includes("/api/plan") && response.request().method() === "POST"),
  page.getByRole("button", { name: "Swap meal" }).click(),
]);
await page.getByTestId("allergen-callout").first().waitFor();
await page.screenshot({ path: "docs/screenshots/03-after-swap.png" });

await page.locator("#grocery").scrollIntoViewIfNeeded();
await page.locator("#grocery").screenshot({ path: "docs/screenshots/04-grocery.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "docs/screenshots/05-mobile.png" });

await browser.close();
console.log("Saved screenshots in docs/screenshots/");
