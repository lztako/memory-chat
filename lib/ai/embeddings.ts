const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
const VOYAGE_MODEL = "voyage-3-lite"

export async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.VOYAGE_API_KEY) return null
  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: VOYAGE_MODEL, input: [text] }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return (data.data?.[0]?.embedding as number[]) ?? null
  } catch {
    return null
  }
}

export function toVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`
}
