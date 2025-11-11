export interface HighlightReelApi {
  id: number;
  name: string;
  description: string;
  created_by: string;
  date: string; // ISO date string (e.g., 2025-11-10)
  game_events: unknown[];
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

export interface HighlightReelUpsertPayload {
  name: string;
  description: string;
  game_events: number[];
}
