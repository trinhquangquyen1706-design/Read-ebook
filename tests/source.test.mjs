import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadSpeechHelpers() {
  const source = await readFile(
    new URL("../app/speech.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const sandboxModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: sandboxModule,
    exports: sandboxModule.exports,
  });
  return sandboxModule.exports;
}

test("contains the bilingual reader experience", async () => {
  const [reader, speech, css, layout, page] = await Promise.all([
    readFile(new URL("../app/reader-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/speech.ts", import.meta.url), "utf8"),
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
  assert.match(reader, /paginateBookParagraphs/);
  assert.match(reader, /getBookPageCapacity/);
  assert.match(reader, /Hai trang/);
  assert.match(reader, /defaultValue=\{SAMPLE_TEXT\}/);
  assert.match(reader, /draftTextRef/);
  assert.match(reader, /statsTimer/);
  assert.doesNotMatch(reader, /countWords\(input\)/);
  assert.doesNotMatch(reader, /value=\{input\}/);
  assert.match(reader, /\.textContent/);
  assert.match(reader, /processedSourceRef/);
  assert.match(reader, /speechSessionRef/);
  assert.match(reader, /voiceschanged/);
  assert.match(speech, /buildSpeechQueue/);
  assert.match(speech, /chooseSpeechVoice/);
  assert.match(css, /\.book-spread/);
  assert.match(
    css,
    /\.book-spread\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.doesNotMatch(
    css,
    /\.book-spread\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
  );
  assert.match(
    css,
    /\.book-reader\s*\{[^}]*font-size:\s*clamp\(70%,\s*2\.15cqi,\s*100%\)/s,
  );
  assert.match(css, /\.book-gutter/);
  assert.match(css, /\.is-speaking/);
  assert.match(css, /@container reader/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /reader-app\[data-theme="sepia"\]/);
  assert.match(css, /reader-app\[data-theme="light"\]/);
  assert.match(layout, /<html lang="vi">/);
  assert.match(page, /ReaderApp/);

  assert.doesNotMatch(
    [reader, speech, css, layout, page].join("\n"),
    /[—–]/u,
  );
});

test("keeps long-form speech in exact paragraph order", async () => {
  const { buildSpeechQueue, chooseSpeechVoice } = await loadSpeechHelpers();
  const paragraphs = [
    "Đây là đoạn tiếng Việt đủ dài để kiểm tra việc chia audio theo dấu câu. " +
      "Mỗi cụm phải giữ nguyên thứ tự từ và không được bỏ mất nội dung. ".repeat(
        5,
      ),
    "This second paragraph must begin only after the first paragraph ends.",
  ];
  const queue = buildSpeechQueue(paragraphs, 140);

  assert.ok(queue.length > paragraphs.length);
  assert.ok(queue.every((chunk) => chunk.text.length <= 140));
  for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
    const reconstructed = queue
      .filter((chunk) => chunk.paragraphIndex === paragraphIndex)
      .map((chunk) => chunk.text)
      .join(" ");
    assert.equal(reconstructed, paragraph.replace(/\s+/g, " ").trim());
  }

  const voices = [
    { lang: "en-US", localService: true, name: "English Local" },
    { lang: "vi-VN", localService: false, name: "Vietnam Remote" },
    { lang: "vi_VN", localService: true, name: "Vietnam Local" },
  ];
  assert.equal(chooseSpeechVoice(voices, "vi").name, "Vietnam Local");
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
