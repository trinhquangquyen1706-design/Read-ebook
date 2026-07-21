import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("contains the bilingual reader experience", async () => {
  const [reader, css, layout, page] = await Promise.all([
    readFile(new URL("../app/reader-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(reader, /focusMode/);
  assert.match(reader, /SpeechSynthesisUtterance/);
  assert.match(reader, /window\.localStorage/);
  assert.match(reader, /Be Vietnam Pro/);
  assert.match(reader, /Source Serif 4/);
  assert.match(reader, /Ctrl \+ Enter/);
  assert.match(reader, /aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /reader-app\[data-theme="sepia"\]/);
  assert.match(css, /reader-app\[data-theme="light"\]/);
  assert.match(layout, /<html lang="vi">/);
  assert.match(page, /ReaderApp/);

  assert.doesNotMatch([reader, css, layout, page].join("\n"), /[—–]/u);
});

test("uses a clean Next.js deployment shape", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(packageJson.name, "de-doc-reader");
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.dependencies.next, "16.2.6");
  assert.equal(packageJson.dependencies.vinext, undefined);
  assert.equal(packageJson.dependencies["drizzle-orm"], undefined);

  await Promise.all([
    assert.rejects(access(new URL("../vite.config.ts", import.meta.url))),
    assert.rejects(access(new URL("../worker", import.meta.url))),
    assert.rejects(access(new URL("../.openai", import.meta.url))),
  ]);
});
