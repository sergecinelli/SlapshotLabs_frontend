export interface Video extends Record<string, unknown> {
  id: number;
  name: string;
  description: string;
  youtube_link: string;
  added_by: string;
  date: string;
}

// API response format
export interface VideoApiResponse {
  name: string;
  description: string;
  youtube_link: string;
  id: number;
  added_by: string;
  date: string;
}

// API request format for POST/PATCH
export interface VideoApiRequest {
  name: string;
  description: string;
  youtube_link: string;
}
