const HF_API_BASE = 'https://api-inference.huggingface.co/models'
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY

export interface ToxicityResult {
  toxic: number
  severe_toxic: number
  obscene: number
  threat: number
  insult: number
  identity_hate: number
}

interface HFResponseLabel {
  label: string
  score: number
}

export async function moderateContent(text: string): Promise<{
  toxicity: ToxicityResult
  isFlagged: boolean
}> {
  if (!HF_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY is not configured')
  }

  const res = await fetch(`${HF_API_BASE}/unitary/toxic-bert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  })

  if (!res.ok) {
    if (res.status === 503) {
      throw new Error('Model is loading — try again shortly')
    }
    throw new Error(`Hugging Face API error: ${res.status}`)
  }

  const data: HFResponseLabel[][] = await res.json()
  const labels = data[0]

  const toxicity: ToxicityResult = {
    toxic: 0,
    severe_toxic: 0,
    obscene: 0,
    threat: 0,
    insult: 0,
    identity_hate: 0,
  }

  for (const { label, score } of labels) {
    if (label in toxicity) {
      toxicity[label as keyof ToxicityResult] = score
    }
  }

  return {
    toxicity,
    isFlagged: toxicity.toxic > 0.75 || toxicity.severe_toxic > 0.5,
  }
}
