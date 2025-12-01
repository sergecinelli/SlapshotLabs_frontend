export interface Arena {
  id: number;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

export interface Rink {
  id: number;
  name: string;
  arena_id: number;
  arena_name?: string;
  surface_type?: string;
  description?: string;
}
