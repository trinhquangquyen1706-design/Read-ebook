"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

type Theme = "night" | "sepia" | "light";
type LanguageProfile = "auto" | "vi" | "en";
type ReaderFont =
  | "lora"
  | "source-serif"
  | "be-vietnam"
  | "georgia"
  | "system";

type Preferences = {
  theme: Theme;
  language: LanguageProfile;
  font: ReaderFont;
  fontSize: number;
  lineHeight: number;
  lineWidth: number;
  focusMode: boolean;
};

const SAMPLE_TEXT = `Đọc trên màn hình thường khó hơn đọc trên giấy vì mắt phải liên tục tìm điểm bắt đầu của dòng mới. Khi một đoạn văn quá dài, khoảng trắng biến mất và người đọc dễ bỏ sót ý chính.

Dễ Đọc xử lý văn bản ngay trong trình duyệt. Công cụ nối lại những dòng bị ngắt khi sao chép từ PDF, làm sạch khoảng trắng và chia nội dung thành các đoạn có nhịp vừa phải. Văn bản của bạn không được gửi lên máy chủ.

Bạn có thể chọn kiểu chữ phù hợp cho tiếng Việt hoặc tiếng Anh, thay đổi cỡ chữ, độ giãn dòng và chiều rộng cột đọc. Khi cần tập trung, hãy bật chế độ Tập trung để chỉ giữ đoạn hiện tại ở độ tương phản cao. Dùng phím mũi tên lên và xuống để chuyển giữa các đoạn.`;

const STORAGE_KEY = "de-doc-preferences-v1";

const DEFAULT_PREFERENCES: Preferences = {
  theme: "night",
  language: "auto",
  font: "lora",
  fontSize: 20,
  lineHeight: 1.75,
  lineWidth: 66,
  focusMode: false,
};

const FONT_OPTIONS: Array<{
  id: ReaderFont;
  label: string;
  note: string;
}> = [
  {
    id: "lora",
    label: "Lora",
    note: "Việt và English, mềm khi đọc dài",
  },
  {
    id: "source-serif",
    label: "Source Serif 4",
    note: "Việt và English, nét chữ rõ",
  },
  {
    id: "be-vietnam",
    label: "Be Vietnam Pro",
    note: "Tối ưu dấu tiếng Việt, không chân",
  },
  {
    id: "georgia",
    label: "Georgia",
    note: "Kiểu chữ hệ thống cổ điển",
  },
  {
    id: "system",
    label: "Sans hệ thống",
    note: "Gọn và quen thuộc",
  },
];

const FONT_STACKS: Record<ReaderFont, string> = {
  lora: "var(--font-lora), Georgia, serif",
  "source-serif": "var(--font-source-serif), Georgia, serif",
  "be-vietnam": "var(--font-be-vietnam), 'Segoe UI', sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  system: "var(--font-be-vietnam), 'Segoe UI', Arial, sans-serif",
};

const THEMES: Array<{ id: Theme; label: string }> = [
  { id: "night", label: "Đêm" },
  { id: "sepia", label: "Giấy" },
  { id: "light", label: "Sáng" },
];

const LANGUAGES: Array<{ id: LanguageProfile; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
];

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readPreferences(value: string): Preferences | null {
  try {
    const parsed = JSON.parse(value) as Partial<Preferences>;
    const themes: Theme[] = ["night", "sepia", "light"];
    const languages: LanguageProfile[] = ["auto", "vi", "en"];
    const fonts: ReaderFont[] = [
      "lora",
      "source-serif",
      "be-vietnam",
      "georgia",
      "system",
    ];

    return {
      theme: themes.includes(parsed.theme as Theme)
        ? (parsed.theme as Theme)
        : DEFAULT_PREFERENCES.theme,
      language: languages.includes(parsed.language as LanguageProfile)
        ? (parsed.language as LanguageProfile)
        : DEFAULT_PREFERENCES.language,
      font: fonts.includes(parsed.font as ReaderFont)
        ? (parsed.font as ReaderFont)
        : DEFAULT_PREFERENCES.font,
      fontSize: clamp(parsed.fontSize, 16, 28, DEFAULT_PREFERENCES.fontSize),
      lineHeight: clamp(
        parsed.lineHeight,
        1.45,
        2.1,
        DEFAULT_PREFERENCES.lineHeight,
      ),
      lineWidth: clamp(
        parsed.lineWidth,
        48,
        82,
        DEFAULT_PREFERENCES.lineWidth,
      ),
      focusMode:
        typeof parsed.focusMode === "boolean"
          ? parsed.focusMode
          : DEFAULT_PREFERENCES.focusMode,
    };
  } catch {
    return null;
  }
}

function splitLongSentence(sentence: string, limit = 430) {
  if (sentence.length <= limit) return [sentence];

  const words = sentence.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > limit && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function splitReadableBlock(block: string) {
  const sentences =
    block
      .match(/[^.!?…]+(?:[.!?…]+["'”’)]*|$)/gu)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

  if (sentences.length === 0) return splitLongSentence(block);

  const paragraphs: string[] = [];
  let current = "";
  let sentenceCount = 0;

  for (const originalSentence of sentences) {
    for (const sentence of splitLongSentence(originalSentence)) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      const shouldBreak =
        current.length > 0 && (candidate.length > 430 || sentenceCount >= 3);

      if (shouldBreak) {
        paragraphs.push(current);
        current = sentence;
        sentenceCount = 1;
      } else {
        current = candidate;
        sentenceCount += 1;
      }
    }
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

function formatText(source: string) {
  const normalized = source
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const readable: string[] = [];

  for (const rawBlock of blocks) {
    const lines = rawBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let prose: string[] = [];
    const flushProse = () => {
      if (prose.length === 0) return;
      const joined = prose
        .join("\n")
        .replace(/(\p{L})-\n(?=\p{Ll})/gu, "$1")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      readable.push(...splitReadableBlock(joined));
      prose = [];
    };

    for (const line of lines) {
      if (/^(?:[-*•]|\d+[.)])\s+/u.test(line)) {
        flushProse();
        readable.push(line.replace(/\s{2,}/g, " "));
      } else {
        prose.push(line);
      }
    }

    flushProse();
  }

  return readable.filter(Boolean);
}

function countWords(text: string) {
  return (
    text.match(/[\p{L}\p{M}\p{N}]+(?:['-][\p{L}\p{M}\p{N}]+)*/gu)
      ?.length ?? 0
  );
}

function detectLanguage(text: string): "vi" | "en" {
  const lower = text.toLocaleLowerCase("vi");
  const markedCharacters = lower.match(/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gu)
    ?.length ?? 0;
  const words = lower.match(/[\p{L}\p{M}]+/gu) ?? [];
  const commonVietnamese = new Set([
    "và",
    "của",
    "là",
    "có",
    "cho",
    "trong",
    "một",
    "được",
    "không",
    "với",
    "người",
    "khi",
  ]);
  const commonMatches = words.filter((word) => commonVietnamese.has(word)).length;
  return markedCharacters >= 2 || commonMatches >= 2 ? "vi" : "en";
}

function suggestedFont(language: LanguageProfile, detected: "vi" | "en") {
  const effective = language === "auto" ? detected : language;
  return effective === "vi" ? "be-vietnam" : "source-serif";
}

export function ReaderApp() {
  const initialParagraphs = useMemo(() => formatText(SAMPLE_TEXT), []);
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [paragraphs, setParagraphs] = useState(initialParagraphs);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [activeParagraph, setActiveParagraph] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    "Văn bản chỉ được xử lý trong trình duyệt.",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const processTimer = useRef<number | null>(null);

  const outputText = useMemo(() => paragraphs.join("\n\n"), [paragraphs]);
  const wordCount = useMemo(() => countWords(outputText), [outputText]);
  const detectedLanguage = useMemo(
    () => detectLanguage(outputText || input),
    [input, outputText],
  );
  const activeLanguage =
    preferences.language === "auto"
      ? detectedLanguage
      : preferences.language;
  const readingMinutes = Math.max(
    1,
    Math.ceil(wordCount / (activeLanguage === "vi" ? 200 : 230)),
  );
  const currentFont =
    FONT_OPTIONS.find((font) => font.id === preferences.font) ?? FONT_OPTIONS[0];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const savedPreferences = stored ? readPreferences(stored) : null;
      if (savedPreferences) setPreferences(savedPreferences);
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Reading preferences are optional when storage is unavailable.
    }
  }, [preferences, preferencesReady]);

  useEffect(() => {
    return () => {
      if (processTimer.current !== null) {
        window.clearTimeout(processTimer.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const updatePreferences = useCallback(
    (next: Partial<Preferences>) => {
      setPreferences((current) => ({ ...current, ...next }));
    },
    [],
  );

  const processInput = useCallback(() => {
    if (input.trim().length < 20) {
      setError("Hãy nhập ít nhất 20 ký tự để tạo một bản đọc có ý nghĩa.");
      setStatus("Chưa thể định dạng văn bản.");
      return;
    }

    setError("");
    setIsProcessing(true);
    setStatus("Đang làm sạch và chia lại đoạn văn.");

    if (processTimer.current !== null) {
      window.clearTimeout(processTimer.current);
    }

    processTimer.current = window.setTimeout(() => {
      const nextParagraphs = formatText(input);
      setParagraphs(nextParagraphs);
      setActiveParagraph(0);
      setIsProcessing(false);
      setStatus(
        `Đã tạo ${nextParagraphs.length} đoạn dễ đọc từ ${countWords(input)} từ.`,
      );
      processTimer.current = null;
    }, 120);
  }, [input]);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      processInput();
    }
  };

  const setLanguageProfile = (language: LanguageProfile) => {
    updatePreferences({
      language,
      font: suggestedFont(language, detectedLanguage),
    });
    const languageLabel =
      language === "auto"
        ? `Auto, đang nhận diện ${detectedLanguage === "vi" ? "Tiếng Việt" : "English"}`
        : language === "vi"
          ? "Tiếng Việt"
          : "English";
    setStatus(`Đã chọn hồ sơ ${languageLabel}.`);
  };

  const toggleFocusMode = () => {
    const next = !preferences.focusMode;
    updatePreferences({ focusMode: next });
    if (next) setActiveParagraph(0);
    setStatus(
      next
        ? "Đã bật Tập trung. Chọn một đoạn hoặc dùng phím mũi tên."
        : "Đã trở lại không gian chỉnh sửa.",
    );
  };

  const moveParagraph = useCallback(
    (direction: -1 | 1) => {
      setActiveParagraph((current) =>
        Math.min(paragraphs.length - 1, Math.max(0, current + direction)),
      );
    },
    [paragraphs.length],
  );

  const handleReaderKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!preferences.focusMode) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveParagraph(1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveParagraph(-1);
    }
  };

  const copyOutput = async () => {
    if (!outputText) {
      setStatus("Chưa có bản đọc để sao chép.");
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText);
      setStatus("Đã sao chép bản đọc.");
    } catch {
      setStatus("Trình duyệt chưa cho phép sao chép tự động.");
    }
  };

  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      setStatus("Trình duyệt này chưa hỗ trợ đọc thành tiếng.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStatus("Đã dừng đọc thành tiếng.");
      return;
    }

    if (!outputText) {
      setStatus("Chưa có bản đọc để nghe.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(outputText);
    utterance.lang = activeLanguage === "vi" ? "vi-VN" : "en-US";
    utterance.rate = activeLanguage === "vi" ? 0.92 : 0.96;
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus("Đã đọc xong văn bản.");
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus("Không thể đọc thành tiếng trên thiết bị này.");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setStatus(
      `Đang đọc bằng giọng ${activeLanguage === "vi" ? "Tiếng Việt" : "English"}.`,
    );
  };

  const clearText = () => {
    if (processTimer.current !== null) {
      window.clearTimeout(processTimer.current);
      processTimer.current = null;
    }
    setInput("");
    setParagraphs([]);
    setError("");
    setIsProcessing(false);
    setActiveParagraph(0);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setStatus("Đã xóa văn bản. Nội dung không được lưu trên máy chủ.");
  };

  const restoreSample = () => {
    setInput(SAMPLE_TEXT);
    setParagraphs(initialParagraphs);
    setActiveParagraph(0);
    setError("");
    setStatus("Đã khôi phục văn bản mẫu.");
  };

  const resetSettings = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setStatus("Đã đưa cài đặt đọc về mặc định.");
  };

  const readerStyle = {
    "--reader-font-size": `${preferences.fontSize}px`,
    "--reader-line-height": preferences.lineHeight,
    "--reader-line-width": `${preferences.lineWidth}ch`,
    "--reader-font-family": FONT_STACKS[preferences.font],
  } as CSSProperties;

  return (
    <main
      className={`reader-app${preferences.focusMode ? " is-focus" : ""}`}
      data-theme={preferences.theme}
    >
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#workspace" aria-label="Dễ Đọc, về đầu trang">
            <span className="brand-mark" aria-hidden="true">
              Đ
            </span>
            <span>Dễ Đọc</span>
          </a>
          <p className="privacy-note">
            Xử lý tại thiết bị. Không gửi nội dung lên máy chủ.
          </p>
        </header>

        <div id="workspace" className="workspace">
          <aside className="composer-panel" aria-labelledby="composer-title">
            <div className="composer-heading">
              <div>
                <p className="section-label">Văn bản nguồn</p>
                <h1 id="composer-title">Biến khối chữ thành nhịp đọc.</h1>
              </div>
              <button className="text-button" type="button" onClick={clearText}>
                Xóa
              </button>
            </div>

            <div className="input-group">
              <label htmlFor="source-text">Dán nội dung cần đọc</label>
              <textarea
                id="source-text"
                value={input}
                maxLength={120000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                aria-describedby="source-helper source-error"
                placeholder="Dán bài viết, ghi chú hoặc nội dung sao chép từ PDF vào đây."
              />
              <div className="input-meta" id="source-helper">
                <span>{input.length.toLocaleString("vi-VN")} ký tự</span>
                <span>{countWords(input).toLocaleString("vi-VN")} từ</span>
              </div>
              <p className="error-message" id="source-error" aria-live="polite">
                {error}
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={processInput}
              disabled={isProcessing}
            >
              {isProcessing ? "Đang định dạng..." : "Làm dễ đọc"}
            </button>
            <p className="shortcut-note">Nhấn Ctrl + Enter để định dạng nhanh.</p>
          </aside>

          <section className="reader-panel" aria-labelledby="reader-title">
            <header className="reader-header">
              <div>
                <p className="section-label">Không gian đọc</p>
                <div className="reader-title-row">
                  <h2 id="reader-title">Bản đọc</h2>
                  <span className="language-readout">
                    {activeLanguage === "vi" ? "Tiếng Việt" : "English"}
                  </span>
                </div>
                <div className="reading-stats" aria-label="Thống kê bản đọc">
                  <span>{wordCount.toLocaleString("vi-VN")} từ</span>
                  <span>{readingMinutes} phút đọc</span>
                  <span>{paragraphs.length} đoạn</span>
                </div>
              </div>

              <div className="reader-actions" aria-label="Thao tác bản đọc">
                <button type="button" onClick={copyOutput}>
                  Sao chép
                </button>
                <button
                  type="button"
                  onClick={toggleSpeech}
                  aria-pressed={isSpeaking}
                >
                  {isSpeaking ? "Dừng đọc" : "Nghe bài"}
                </button>
                <button
                  className={preferences.focusMode ? "is-active" : ""}
                  type="button"
                  onClick={toggleFocusMode}
                  aria-pressed={preferences.focusMode}
                >
                  {preferences.focusMode ? "Thoát tập trung" : "Tập trung"}
                </button>
              </div>
            </header>

            <div className="settings-panel" aria-label="Cài đặt hiển thị">
              <fieldset className="setting-group language-group">
                <legend>Ngôn ngữ</legend>
                <div className="segmented-control">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.id}
                      type="button"
                      className={
                        preferences.language === language.id ? "is-active" : ""
                      }
                      onClick={() => setLanguageProfile(language.id)}
                      aria-pressed={preferences.language === language.id}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="setting-group font-setting">
                <label htmlFor="reader-font">Kiểu chữ</label>
                <select
                  id="reader-font"
                  value={preferences.font}
                  onChange={(event) =>
                    updatePreferences({ font: event.target.value as ReaderFont })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.label}
                    </option>
                  ))}
                </select>
                <span className="setting-note">{currentFont.note}</span>
              </div>

              <label className="setting-group range-setting" htmlFor="font-size">
                <span>
                  Cỡ chữ <output>{preferences.fontSize}px</output>
                </span>
                <input
                  id="font-size"
                  type="range"
                  min="16"
                  max="28"
                  step="1"
                  value={preferences.fontSize}
                  onChange={(event) =>
                    updatePreferences({ fontSize: Number(event.target.value) })
                  }
                />
              </label>

              <label className="setting-group range-setting" htmlFor="line-height">
                <span>
                  Giãn dòng <output>{preferences.lineHeight.toFixed(2)}</output>
                </span>
                <input
                  id="line-height"
                  type="range"
                  min="1.45"
                  max="2.1"
                  step="0.05"
                  value={preferences.lineHeight}
                  onChange={(event) =>
                    updatePreferences({ lineHeight: Number(event.target.value) })
                  }
                />
              </label>

              <label className="setting-group range-setting" htmlFor="line-width">
                <span>
                  Độ rộng <output>{preferences.lineWidth}ch</output>
                </span>
                <input
                  id="line-width"
                  type="range"
                  min="48"
                  max="82"
                  step="2"
                  value={preferences.lineWidth}
                  onChange={(event) =>
                    updatePreferences({ lineWidth: Number(event.target.value) })
                  }
                />
              </label>

              <fieldset className="setting-group theme-group">
                <legend>Giao diện</legend>
                <div className="segmented-control">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={preferences.theme === theme.id ? "is-active" : ""}
                      onClick={() => updatePreferences({ theme: theme.id })}
                      aria-pressed={preferences.theme === theme.id}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button className="reset-button" type="button" onClick={resetSettings}>
                Đặt lại
              </button>
            </div>

            {preferences.focusMode && paragraphs.length > 0 ? (
              <div className="focus-toolbar" aria-label="Điều hướng chế độ tập trung">
                <button
                  type="button"
                  onClick={() => moveParagraph(-1)}
                  disabled={activeParagraph === 0}
                >
                  Đoạn trước
                </button>
                <p aria-live="polite">
                  Đoạn {activeParagraph + 1} / {paragraphs.length}
                </p>
                <button
                  type="button"
                  onClick={() => moveParagraph(1)}
                  disabled={activeParagraph === paragraphs.length - 1}
                >
                  Đoạn tiếp
                </button>
              </div>
            ) : null}

            <div className="reader-canvas">
              {paragraphs.length > 0 ? (
                <article
                  className={`reader-copy${preferences.focusMode ? " focus-copy" : ""}`}
                  style={readerStyle}
                  tabIndex={preferences.focusMode ? 0 : undefined}
                  onKeyDown={handleReaderKeyDown}
                  aria-label={
                    preferences.focusMode
                      ? "Bản đọc ở chế độ tập trung. Dùng phím mũi tên lên và xuống để đổi đoạn."
                      : "Bản đọc đã định dạng"
                  }
                >
                  {paragraphs.map((paragraph, index) => (
                    <p
                      key={`${paragraph.slice(0, 28)}-${index}`}
                      className={
                        preferences.focusMode
                          ? index === activeParagraph
                            ? "is-current"
                            : "is-dimmed"
                          : undefined
                      }
                      role={preferences.focusMode ? "button" : undefined}
                      tabIndex={preferences.focusMode ? 0 : undefined}
                      aria-current={
                        preferences.focusMode && index === activeParagraph
                          ? "true"
                          : undefined
                      }
                      onClick={() => {
                        if (preferences.focusMode) setActiveParagraph(index);
                      }}
                      onKeyDown={(event) => {
                        if (
                          preferences.focusMode &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          setActiveParagraph(index);
                        }
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </article>
              ) : (
                <div className="empty-state">
                  <p className="empty-title">Không gian đọc đang trống.</p>
                  <p>Dán văn bản ở khung bên trái, sau đó chọn Làm dễ đọc.</p>
                  <button type="button" onClick={restoreSample}>
                    Dùng văn bản mẫu
                  </button>
                </div>
              )}
            </div>

            <footer className="reader-footer">
              <p className="status-line" aria-live="polite">
                {status}
              </p>
              {preferences.focusMode ? (
                <p className="focus-hint">
                  Chọn một đoạn hoặc dùng phím mũi tên lên và xuống.
                </p>
              ) : null}
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
