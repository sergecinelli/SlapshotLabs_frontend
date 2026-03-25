export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  total_pages: number;
  page: number;
}
