/** Format Athletyx API sources into UI citations. */

const URI_LABELS = {
  'athletyx://legal/health-disclaimer': 'Health Disclaimer',
  'athletyx://legal/privacy-policy': 'Privacy Policy',
  'athletyx://legal/terms-of-service': 'Terms of Service',
  'athletyx://legal/ai-disclosure': 'AI Disclosure',
  'athletyx://privacy/data-categories': 'Data Categories',
  'athletyx://privacy/retention-policy': 'Retention Policy',
  'athletyx://guardian/policy': 'Goal Guardian Policy',
  'athletyx://ai/safety-rails': 'AI Safety Rails',
  'athletyx://exercises/catalog': 'Exercise Catalog',
  'athletyx://analytics/methodology': 'Analytics Methodology',
  'athletyx://coaching/personalization-guide': 'Personalization Guide',
}

export function uriToLabel(uri) {
  if (!uri) return 'Athletyx document'
  return URI_LABELS[uri] || uri.replace('athletyx://', '').replace(/\//g, ' · ')
}

export function buildCitationsFromAthletyxResponse(result) {
  if (!result) return []

  if (Array.isArray(result.citations) && result.citations.length > 0) {
    return result.citations
  }

  const citations = []
  const docs = result.sources?.documents ?? []
  for (const hit of docs) {
    citations.push({
      type: 'document',
      id: hit.uri,
      title: uriToLabel(hit.uri),
      snippet: hit.snippet,
      score: hit.score,
      source: 'Athletyx RAG',
    })
  }

  const webResults = result.sources?.web?.results ?? []
  for (const item of webResults) {
    if (!item.link && !item.title) continue
    citations.push({
      type: 'web',
      id: item.link || item.title,
      title: item.title || 'Web result',
      snippet: item.snippet,
      url: item.link,
      source: 'DuckDuckGo (SerpAPI)',
    })
  }

  return citations
}

export const ATHLETYX_STATUS_STEPS = [
  { key: 'personalize', label: 'Athletyx · personalizing for your profile' },
  { key: 'rag', label: 'Athletyx · searching knowledge base (RAG)' },
  { key: 'web', label: 'Athletyx · searching DuckDuckGo' },
  { key: 'synthesize', label: 'Athletyx · building your answer' },
]
