import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

// /rules #7: outputDimensionality MUST be 1536 (DB column is vector(1536),
// model default is 3072, HNSW caps at 2000 dims).
const model = google.textEmbedding("gemini-embedding-001");
const DIMS = 1536;

export async function embedChunks(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model,
    values: texts,
    providerOptions: {
      google: { outputDimensionality: DIMS, taskType: "RETRIEVAL_DOCUMENT" },
    },
  });
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model,
    value: text,
    providerOptions: {
      google: { outputDimensionality: DIMS, taskType: "RETRIEVAL_QUERY" },
    },
  });
  return embedding;
}
