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
    description: "A fictional knowledge-sharing connection between two youth-focused community initiatives.",
  },
];