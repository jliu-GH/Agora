export type Citation = {
  marker: number;
  url: string;
  title: string;
  publisher: string;
  retrieved_at: string; // ISO
  as_of?: string;       // ISO
  quote?: string;
};

export type DebateTurn = {
  speaker: "A" | "B";
  text: string;         // must contain [n] markers
  citations: Citation[];
};

export type RagResult = {
  text: string;
  sourceUrl: string;
  publisher: string;
  retrievedAt: string;
  asOf?: string;
  spanStart: number;
  spanEnd: number;
  score: number;
};

export type DebateResult = {
  turns: DebateTurn[];
  summary: string;
  citations: Citation[];
  contested: string[];
};
