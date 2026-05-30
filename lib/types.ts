export interface Script {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  // Estimated read time in seconds, cached for the library list.
  estimatedSeconds: number;
}

export type NewScriptInput = {
  title: string;
  body: string;
};
