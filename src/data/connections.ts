/**
 * Relationships between changemakers. `type` is the short label rendered on the
 * globe arc and in the connection modal; `description` explains the link in one
 * sentence. Both ids must exist in src/data/changemakers.ts.
 */
export type Connection = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
};

export const connections: Connection[] = [
  {
    id: "connection-001",
    sourceId: "cm-001",
    targetId: "cm-002",
    type: "Knowledge Exchange",
    description: "A knowledge-sharing link between two youth-focused community initiatives in Kathmandu and Manila.",
  },
];