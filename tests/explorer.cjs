const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = (
  process.env.CV_BASE_URL || "http://127.0.0.1:4000/alelollo-online-cv/"
).replace(/\/?$/, "/");
const sections = [
  "overview",
  "experience",
  "leadership",
  "skills",
  "opensource",
  "education",
];

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().startsWith(base) && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(base);
    assert.equal(await page.locator(".view:visible").count(), 1);
    await page.getByRole("link", { name: "Experience", exact: true }).click();
    await page.locator("#experience-search").fill("Cloud Academy");
    assert.equal(await page.locator("[data-record]:visible").count(), 1);
    await page
      .getByRole("link", {
        name: "Read about Data Engineering Manager at Cloud Academy",
      })
      .click();
    await page.waitForFunction(() => document.getElementById("record-2").open);
    await page.locator("#experience-search").fill("zzzz-no-match");
    assert.equal(await page.locator("#no-results").isVisible(), true);
    await page.locator("#experience-search").fill("");
    await page.goto(`${base}#record-3`);
    assert.equal(
      await page.locator("#record-3").evaluate((element) => element.open),
      true,
    );
    await page.locator("#experience-search").fill("LocalStack");
    await page
      .getByRole("link", { name: "Leadership", exact: true })
      .last()
      .click();
    await page.getByRole("link", { name: "Explore Cuebiq" }).click();
    await page.waitForFunction(
      () => !document.getElementById("record-3").hidden,
    );
    assert.equal(await page.locator("#experience-search").inputValue(), "");
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of sections) {
        await page.goto(`${base}#${section}`);
        assert.equal(
          await page.locator(`#${section}`).isVisible(),
          true,
          section,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${section} overflows at ${width}px`,
        );
      }
    }
    const noScript = await browser.newPage({ javaScriptEnabled: false });
    await noScript.goto(base);
    assert.equal(
      await noScript.locator(".view:visible").count(),
      sections.length,
    );
    await noScript.locator("#record-2 summary").click();
    assert.equal(
      await noScript.locator("#record-2").evaluate((element) => element.open),
      true,
    );
    await page.goto(`${base}print`);
    assert.equal(
      await page.getByRole("heading", { name: "Alessandro Lollo" }).isVisible(),
      true,
    );
    assert.equal(
      await page
        .getByText("Data Engineering Manager", { exact: true })
        .isVisible(),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: navigation, filters, empty results, record links, four viewport widths, no-JS reading, local assets, and printable résumé.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
