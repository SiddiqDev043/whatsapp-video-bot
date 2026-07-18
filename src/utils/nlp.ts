import { ParsedIntent } from '../types';

const NEXT_PHRASES = ['next', 'selanjutnya', 'berikutnya', 'lanjut'];

// Verbs/fillers stripped off the front of a search request so we're left with clean keywords.
const SEARCH_TRIGGER_PATTERNS: RegExp[] = [
  /^tolong\s+(berikan|carikan|cariin)\s+(saya|aku|gua|gw)?\s*/i,
  /^tolong\s+download(kan)?\s+/i, // handled separately below for download intent, kept out of search
  /^(carikan|cariin|cari)\s+(saya|aku|gua|gw)?\s*/i,
  /^(berikan|kasih|kasihkan)\s+(saya|aku|gua|gw)?\s*/i,
  /^tolong\s+/i,
  /^mau\s+(dong\s+)?/i,
  /^minta\s+/i,
];

const DOWNLOAD_PATTERNS: RegExp[] = [
  /download(?:kan)?\s+(?:video\s+)?nomor\s+(\d+)/i,
  /download(?:kan)?\s+.*?nomor\s+(\d+)/i,
  /(?:tolong\s+)?download(?:kan)?\s+nomor\s+(\d+)/i,
  /^dl\s+(\d+)$/i,
  /nomor\s+(\d+)\s+download/i,
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function parseIntent(rawText: string): ParsedIntent {
  const text = normalize(rawText);
  const lower = text.toLowerCase();

  // 1) "next" style continuation
  if (NEXT_PHRASES.includes(lower)) {
    return { type: 'next' };
  }

  // 2) download by index — check before generic search since it also contains verbs like "carikan"/"berikan"
  for (const pattern of DOWNLOAD_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      const index = parseInt(match[1], 10);
      if (!Number.isNaN(index)) {
        return { type: 'download', index };
      }
    }
  }
  if (/download/i.test(lower) === false && /^dl\b/i.test(lower)) {
    // no-op, kept for clarity of intent branches
  }

  // 3) search intent — strip conversational fillers, keep the remaining keywords
  let stripped = text;
  for (const pattern of SEARCH_TRIGGER_PATTERNS) {
    if (pattern.test(stripped)) {
      stripped = stripped.replace(pattern, '').trim();
    }
  }
  // avoid treating something like "tolong download nomor 2" (no digit matched above) as a search
  if (/download/i.test(lower) && /nomor/i.test(lower)) {
    return { type: 'unknown' };
  }

  if (stripped.length > 0 && stripped.length < 200) {
    return { type: 'search', query: stripped };
  }

  return { type: 'unknown' };
}
