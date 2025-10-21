export interface Video extends Record<string, unknown> {
  id: number;
  name: string;
  description: string;
  dateAdded: Date;
  addedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}
