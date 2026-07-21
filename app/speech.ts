export type SpeechLanguage = "vi" | "en";

export type SpeechChunk = {
  paragraphIndex: number;
  text: string;
};

const NATURAL_BREAKS = [". ", "! ", "? ", "… ", "; ", ": ", ", "];

export function splitSpeechChunks(source: string, maxLength = 220) {
  const text = source.replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const remaining = text.slice(cursor);
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    const searchWindow = remaining.slice(0, maxLength + 1);
    const minimumBreak = Math.floor(maxLength * 0.55);
    let breakAt = -1;

    for (const delimiter of NATURAL_BREAKS) {
      const delimiterIndex = searchWindow.lastIndexOf(delimiter);
      if (delimiterIndex >= minimumBreak) {
        breakAt = Math.max(breakAt, delimiterIndex + 1);
      }
    }

    if (breakAt < minimumBreak) {
      breakAt = searchWindow.lastIndexOf(" ", maxLength);
    }
    if (breakAt < minimumBreak) breakAt = maxLength;

    const chunk = remaining.slice(0, breakAt).trim();
    if (chunk) chunks.push(chunk);
    cursor += breakAt;
    while (text[cursor] === " ") cursor += 1;
  }

  return chunks;
}

export function buildSpeechQueue(
  paragraphs: string[],
  maxLength = 220,
): SpeechChunk[] {
  return paragraphs.flatMap((paragraph, paragraphIndex) =>
    splitSpeechChunks(paragraph, maxLength).map((text) => ({
      paragraphIndex,
      text,
    })),
  );
}

function normalizeLocale(locale: string) {
  return locale.toLocaleLowerCase().replaceAll("_", "-");
}

export function chooseSpeechVoice(
  voices: readonly SpeechSynthesisVoice[],
  language: SpeechLanguage,
) {
  const targetLocale = language === "vi" ? "vi-vn" : "en-us";
  const languagePrefix = `${language}-`;
  const normalizedVoices = voices.map((voice) => ({
    voice,
    locale: normalizeLocale(voice.lang),
  }));

  return (
    normalizedVoices.find(
      ({ locale, voice }) => locale === targetLocale && voice.localService,
    )?.voice ??
    normalizedVoices.find(({ locale }) => locale === targetLocale)?.voice ??
    normalizedVoices.find(
      ({ locale, voice }) =>
        locale.startsWith(languagePrefix) && voice.localService,
    )?.voice ??
    normalizedVoices.find(({ locale }) => locale.startsWith(languagePrefix))
      ?.voice ??
    normalizedVoices.find(({ locale }) => locale === language)?.voice ??
    null
  );
}
