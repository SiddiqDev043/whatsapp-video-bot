export interface YoutubeVideoResult {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  durationText?: string;
  channel?: string;
}

/** A single item persisted for a user's search session, with a stable global index. */
export interface SearchResultItem extends YoutubeVideoResult {
  globalIndex: number;
}

export interface SearchSession {
  userId: string;       // WhatsApp JID
  query: string;        // last search query (normalized keywords)
  page: number;          // last fetched page (0-based)
  items: SearchResultItem[]; // all items seen so far in this session, indexed by globalIndex - 1
  updatedAt: number;
}

export type IntentType =
  | 'search'
  | 'next'
  | 'download'
  | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  query?: string;     // extracted search keywords, for 'search'
  index?: number;      // extracted global index, for 'download'
}

export enum ErrorCode {
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  BROKEN_LINK = 'BROKEN_LINK',
  REGION_RESTRICTED = 'REGION_RESTRICTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  NO_ACTIVE_SESSION = 'NO_ACTIVE_SESSION',
  INVALID_INDEX = 'INVALID_INDEX',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN',
}

export class BotError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'BotError';
  }
}
