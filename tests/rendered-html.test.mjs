import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Dễ Đọc workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="vi"/i);
  assert.match(html, /<title>Dễ Đọc \| Reader song ngữ<\/title>/i);
  assert.match(html, /Biến khối chữ thành nhịp đọc\./);
  assert.match(html, /Làm dễ đọc/);
  assert.match(html, /Tập trung/);
  assert.match(html, /Be Vietnam Pro/);
  assert.match(html, /Source Serif 4/);
  assert.match(html, /Nghe bài/);
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.doesNotMatch(html, /Building your site|react-loading-skeleton/);
});

test("keeps the reader private, accessible, and free of starter assets", async () => {
  const [reader, css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/reader-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /ReaderApp/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.match(layout, /<html lang="vi">/);
  assert.match(layout, /Be_Vietnam_Pro, Lora, Source_Serif_4/);

  assert.match(reader, /window\.localStorage/);
  assert.match(reader, /SpeechSynthesisUtterance/);
  assert.match(reader, /focusMode/);
  assert.match(reader, /Ctrl \+ Enter/);
  assert.match(reader, /aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /reader-app\[data-theme="sepia"\]/);
  assert.match(css, /reader-app\[data-theme="light"\]/);

  const authoredSurface = [reader, css, page, layout].join("\n");
  assert.doesNotMatch(authoredSurface, /[—–]/u);
});
