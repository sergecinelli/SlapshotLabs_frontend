// GET /api/hockey/highlight-reels
export interface HighlightReelApi {
  id: number;
  name: string;
  description: string;
  created_by: string;
  date: string; // ISO date string (e.g., 2025-11-11)
}

// GET /api/hockey/highlight-reels/{id}/highlights
export interface HighlightApi {
  id: number;
  game_event_id?: number;
  event_name?: string;
  note?: string;
  youtube_link?: string;
  date?: string; // ISO date string (e.g., 2025-11-11)
  time?: string;
  order: number;
  is_custom: boolean;
}

// POST /api/hockey/highlight-reels/{id}/highlights
export interface HighlightCreatePayload {
  game_event_id: number;
  event_name: string;
  note: string;
  youtube_link: string;
  date: string; // ISO date string (e.g., 2025-11-11)
  time: string; // ISO time string (e.g., "23:19:20.985Z")
  order: number;
}

export interface HighlightReelRow extends Record<string, unknown> {
  id: number;
  name: string;
  description: string;
  createdBy: string;
  // For display and sorting
  dateCreated: Date; // raw date for sorting
  dateCreatedFormatted: string; // e.g., "Nov, 7, 25"
}

// POST/PATCH /api/hockey/highlight-reels
export interface HighlightReelUpsertPayload {
  name: string;
  description: string;
  highlights: {
    id?: number; // include when updating existing highlights in edit mode
    is_custom?: boolean; // when true, omit game_event_id and send custom fields
    game_event_id?: number; // required only when is_custom is false/undefined
    event_name?: string; // name for custom highlights
    note?: string;
    youtube_link?: string;
    date?: string; // ISO date string (e.g., 2025-11-11)
    time?: string; // ISO time string (e.g., "23:19:20.985Z")
    order: number;
  }[];
}
