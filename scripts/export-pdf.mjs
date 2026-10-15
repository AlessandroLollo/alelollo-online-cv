// Export a real, selectable-text résumé PDF from the static print route.
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, copyFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

const root = resolve("dist");
const base = (process.env.PUBLIC_BASE_PATH ?? "/me").replace(
  /\/?$/,
  "/",
);
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const relative = pathname.slice(base.length);
    const path = resolve(
      root,
      relative.endsWith("/") ? `${relative}index.html` : relative,
    );
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(path);
    response.setHeader(
      "Content-Type",
      path.endsWith(".css")
        ? "text/css"
        : path.endsWith(".js")
          ? "application/javascript"
          : "text/html; charset=utf-8",
    );
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage();
  const address = server.address();
  const response = await page.goto(
    `http://127.0.0.1:${address.port}${base}print/`,
    { waitUntil: "networkidle" },
  );
  if (!response?.ok())
    throw new Error("The print route failed during PDF export");
  if ((await page.locator(".resume article").count()) < 6)
    throw new Error("Missing résumé content");
  await page.pdf({
    path: resolve(root, "alessandro-lollo-cv.pdf"),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="font-size:8px;width:100%;text-align:center;color:#647269">Alessandro Lollo · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  // Also make the last generated CV available to the development server.
  await copyFile(
    resolve(root, "alessandro-lollo-cv.pdf"),
    resolve("public/alessandro-lollo-cv.pdf"),
  );
  console.log("Exported dist/alessandro-lollo-cv.pdf");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
