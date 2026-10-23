import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("shared records, saved perspectives, sort and filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Alessandro Lollo", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Download CV" })).toBeVisible();
  await expect(page.locator("[data-record]")).toHaveCount(6);
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Engineering", exact: true })
    .click();
  await expect(page.locator('[data-record="prefect-cube"]')).toBeVisible();
  await expect(page.locator('[data-record="earlier-roles"]')).toHaveCount(0);
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Leadership", exact: true })
    .click();
  await expect(page.locator('[data-record="cloud-academy"]')).toBeVisible();
  await expect(page.locator('[data-record="localstack"]')).toHaveCount(0);
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Business impact", exact: true })
    .click();
  await expect(page.locator('[data-record="cuebiq"]')).toBeVisible();
  await expect(page.locator('[data-record="prefect-cube"]')).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filter by focus" })
    .selectOption("Governance");
  await expect(page.locator("[data-record]")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Filter by focus" })
    .selectOption("all");
  await page
    .getByRole("searchbox", { name: "Filter visible records" })
    .fill("Cloud Academy");
  await expect(page.locator("[data-record]")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Filter visible records" })
    .fill("not-a-career-match");
  await expect(
    page.getByRole("heading", { name: "No matching records" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  const companySort = page.getByRole("button", {
    name: "Company",
    exact: true,
  });
  await companySort.click();
  await expect(page.locator("th").first()).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await companySort.click();
  await expect(page.locator("th").first()).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  expect(errors).toEqual([]);
});

test("record panel supports deep links, keyboard close and focus return", async ({
  page,
}) => {
  await page.goto("./#experience");
  const role = page.getByRole("link", {
    name: "Data Governance Manager",
    exact: true,
  });
  await role.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("150+ users");
  await expect(page).toHaveURL(/#experience\/record\/cuebiq$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(role).toBeFocused();
  await page.goto("./#business-impact/record/trusted-data");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const part of ["Problem", "Decision", "Delivery", "Outcome"])
    await expect(
      dialog.getByRole("heading", { name: part, exact: true }),
    ).toBeVisible();
  await dialog
    .getByRole("button", { name: "View supporting experience" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Data Governance Manager" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close record" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("skills reveal evidence and global search includes contributions", async ({
  page,
}) => {
  await page.goto("./#skills");
  const governance = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Data governance", exact: true }),
  });
  await governance.getByRole("button", { name: /evidence records/ }).click();
  await expect(page.locator('[data-record="cuebiq"]')).toBeVisible();
  await expect(page.locator("[data-record]")).toHaveCount(3);
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("searchbox", { name: "Search all career records" }),
  ).toBeFocused();
  await page
    .getByRole("searchbox", { name: "Search all career records" })
    .fill("Sifflet");
  await expect(page.locator("[data-record]")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Sifflet Prefect Collection", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search all career records" })
    .fill("Python");
  await expect(
    page.locator('[data-record="tool-data-manipulation-scripting"]'),
  ).toBeVisible();
  await expect(page.locator("[data-record]")).toHaveCount(1);
});

test("theme preference persists across reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

for (const width of [1440, 768, 390, 320]) {
  test(`all views fit ${width}px and mobile navigation works`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const view of [
      "overview",
      "experience",
      "projects",
      "skills",
      "opensource",
      "education",
      "engineering",
      "leadership",
      "business-impact",
    ]) {
      await page.goto(`./#${view}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${view} overflow`,
      ).toBe(false);
    }
    if (width < 760) {
      await page.getByRole("button", { name: "Switch to dark theme" }).click();
      await page.locator(".mobile-menu summary").click();
      await page
        .getByRole("navigation", { name: "Mobile career navigation" })
        .getByRole("link", { name: "Projects" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Projects", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "A shared foundation for trusted data" })
        .click();
      await expect(page.getByRole("dialog")).toHaveCSS("width", `${width}px`);
    }
  });
}

test("static HTML and the full résumé remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL as string,
  });
  const page = await context.newPage();
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Alessandro Lollo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Data Governance Manager · Cuebiq",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Data Governance Manager", exact: true })
    .click();
  await expect(page).toHaveURL(/print\/#cuebiq$/);
  await expect(page.locator("#cuebiq")).toContainText("150+ users");
  await expect(
    page.getByRole("heading", { name: "Tools & skills" }),
  ).toBeVisible();
  await context.close();
});

test("downloads a real PDF and serves all local assets at the Pages base path", async ({
  page,
  request,
}) => {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("./");
  const pdf = await request.get("./alessandro-lollo-cv.pdf");
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CV" }).click();
  expect((await download).suggestedFilename()).toBe("Alessandro-Lollo-CV.pdf");
  await page.goto("./print/");
  await expect(
    page.getByRole("heading", { name: "Alessandro Lollo", exact: true }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

for (const theme of ["light", "dark"]) {
  test(`automated accessibility checks for ${theme} overview, skills and record panel`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    if (theme === "dark")
      await page.getByRole("button", { name: "Switch to dark theme" }).click();
    for (const hash of ["overview", "skills", "experience/record/cuebiq"]) {
      await page.goto(`./#${hash}`);
      if (hash.includes("record"))
        await expect(page.getByRole("dialog")).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations, `${theme}: ${hash}`).toEqual([]);
    }
  });
}
