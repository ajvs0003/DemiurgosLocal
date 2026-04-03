export type Origin = "dnd" | "nae";

export interface SearchResult {
  id: string;
  name: string;
  summary: string;
  collection: string;
  origin: Origin;
}
