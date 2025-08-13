import { Handler } from '@netlify/functions';

interface AIRequest {
  message?: string;
  csvColumns: string[];
  captions: string[];
  currentMappings: Record<string, string>;
  requestType?: 'chat' | 'initial_suggestions';
}

interface AIResponse {
  content: string;
  mappingSuggestion?: {
    csvColumn: string;
    targetCaption: string;
    confidence: number;
  };
  mappingSuggestions?: Array<{
    csvColumn: string;
    targetCaption: string;
    confidence: number;
  }>;
  provider?: string;
  model?: string;
}

// Local mock engine (no external calls)
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  const intersectionSize = [...ta].filter((t) => tb.has(t)).length;
  const unionSize = new Set([...ta, ...tb]).size || 1;
  return intersectionSize / unionSize;
}

function stringContainmentBoost(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 0.6;
  if (na.includes(nb) || nb.includes(na)) return 0.35;
  return 0;
}

const SYNONYM_GROUPS: string[][] = [
  ['name', 'full name', 'employee name', 'username'],
  ['email', 'e-mail', 'mail', 'email address'],
  ['phone', 'telephone', 'mobile', 'cell'],
  ['date', 'timestamp', 'time', 'datetime'],
  ['address', 'location', 'site', 'worksite'],
  ['id', 'identifier', 'uid', 'code'],
];

function synonymBoost(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  for (const group of SYNONYM_GROUPS) {
    const set = new Set(group.map((g) => normalize(g)));
    if ([...set].some((t) => na.includes(t)) && [...set].some((t) => nb.includes(t))) {
      return 0.25;
    }
  }
  return 0;
}

function scorePair(csvColumn: string, caption: string): number {
  const jaccard = jaccardSimilarity(csvColumn, caption);
  const contain = stringContainmentBoost(csvColumn, caption);
  const syn = synonymBoost(csvColumn, caption);
  return Math.min(1, jaccard * 0.6 + contain * 0.3 + syn * 0.2 + 0.05);
}

function buildMockSuggestions(csvColumns: string[], captions: string[]): Array<{ csvColumn: string; targetCaption: string; confidence: number }> {
  const takenCaptions = new Set<string>();
  const suggestions: Array<{ csvColumn: string; targetCaption: string; confidence: number }> = [];

  for (const column of csvColumns) {
    let bestCaption = '';
    let bestScore = 0;
    for (const cap of captions) {
      if (takenCaptions.has(cap)) continue;
      const score = scorePair(column, cap);
      if (score > bestScore) {
        bestScore = score;
        bestCaption = cap;
      }
    }
    if (bestCaption) {
      takenCaptions.add(bestCaption);
      const confidence = Math.max(0.55, Math.min(0.93, bestScore));
      suggestions.push({ csvColumn: column, targetCaption: bestCaption, confidence });
    }
  }

  return suggestions;
}

function buildMockChatContent(params: { fileColumns: string[]; captions: string[]; mappings: Array<{ csvColumn: string; targetCaption: string; confidence: number }>; message?: string; provider: string; model: string; }): string {
  const { fileColumns, captions, mappings, message } = params;
  const coveragePct = captions.length > 0 ? Math.round((mappings.length / captions.length) * 100) : 0;
  const bullets = mappings
    .slice(0, 6)
    .map((m) => `• ${m.csvColumn} → ${m.targetCaption} (${Math.round(m.confidence * 100)}%)`)
    .join('\n');

  const intros = [
    'Here’s what I’m seeing so far.',
    'I took a quick look at your data.',
    'Thanks—let me walk you through what I found.',
  ];
  const intro = message && message.trim().length > 0
    ? `You said: "${message}". ${intros[Math.floor(Math.random() * intros.length)]}`
    : `I reviewed your CSV and prepared an initial mapping plan.`;

  const tips = [
    'Ask me things like: "Map Email to Email" or "What’s the best match for Manager Name?"',
    'You can say: "Map Full Name to Username" or "Show me matches for Department"',
    'Try: "Map \"Employee ID\" to \"Employee ID\"" or "Suggest a match for Org Unit"',
  ];

  const guidance = [
    bullets ? `Here are a few likely matches:\n${bullets}` : 'I couldn’t confidently match anything yet. Tell me a caption (like "Email"), and I’ll suggest the best column.',
    `Detected ${fileColumns.length} column${fileColumns.length === 1 ? '' : 's'} and ${captions.length} caption${captions.length === 1 ? '' : 's'}. Coverage so far: ${coveragePct}%.`,
    tips[Math.floor(Math.random() * tips.length)],
    'If a suggestion looks good, just confirm it and I’ll update the table for you.',
  ].join('\n');

  return [intro, guidance].join('\n\n');
}

function generateMockResponse(req: AIRequest): AIResponse {
  const { message, csvColumns, captions, requestType } = req;
  const suggestions = buildMockSuggestions(csvColumns || [], captions || []);

  const provider = 'mock';
  const model = 'local-simulator';

  if (requestType === 'initial_suggestions') {
    return {
      content: buildMockChatContent({ fileColumns: csvColumns || [], captions: captions || [], mappings: suggestions, provider, model }),
      mappingSuggestions: suggestions,
      provider,
      model,
    };
  }

  let mappingSuggestion: AIResponse['mappingSuggestion'];
  const re = /(?:map|mapping)\s+"?([^"\n]+?)"?\s+(?:to|→)\s+"?([^"\n]+)"?/i;
  const m = (message ?? '').match(re);
  if (m) {
    const [_, col, cap] = m;
    if (csvColumns.includes(col) && captions.includes(cap)) {
      const confidence = Math.max(0.6, scorePair(col, cap));
      mappingSuggestion = { csvColumn: col, targetCaption: cap, confidence };
    }
  }

  return {
    content: buildMockChatContent({ fileColumns: csvColumns || [], captions: captions || [], mappings: suggestions, message, provider, model }),
    mappingSuggestion,
    provider,
    model,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message, csvColumns, captions, currentMappings, requestType }: AIRequest = JSON.parse(event.body || '{}');

    // Simulated latency
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const jitter = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const baseDelay = requestType === 'initial_suggestions' ? jitter(1200, 2200) : jitter(700, 1500);
    await sleep(baseDelay);

    const result = generateMockResponse({ message, csvColumns, captions, currentMappings, requestType });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('AI Chat mock error:', error?.message || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', detail: String(error?.message || error) }),
    };
  }
};


