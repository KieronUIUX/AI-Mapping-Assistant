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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { message, csvColumns, captions, currentMappings, requestType }: AIRequest = JSON.parse(event.body || '{}');

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Google API key not configured' }),
      };
    }

    // Build context
    const systemContext = `You are an AI assistant helping users map CSV columns to table captions.\n\n` +
      `Available CSV columns: ${csvColumns.join(', ')}\n` +
      `Available captions: ${captions.join(', ')}\n` +
      `Current mappings: ${Object.entries(currentMappings).map(([col, cap]) => `${col} → ${cap}`).join(', ') || 'none'}\n\n` +
      `Your task is to:\n` +
      `1) Understand the user's request.\n2) Suggest mappings between CSV columns and captions.\n` +
      `3) Provide helpful responses about the mapping process.\n4) If suggesting a mapping, include a confidence between 0.0 and 1.0.`;

    // Use a current Gemini model and the correct endpoint
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`;

    const userInstruction = requestType === 'initial_suggestions'
      ? `Using ONLY the provided CSV column names and captions, propose mappings. Respond with STRICT JSON only in this format:
{"suggestions":[{"csvColumn":"<exact CSV column name>","targetCaption":"<exact caption>","confidence":0.0}]}
Do not include any prose or markdown.`
      : `User message: ${message ?? ''}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemContext}\n\n${userInstruction}` },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const aiResponse: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';

    // Try to parse structured suggestions for initial mapping
    let mappingSuggestions: AIResponse['mappingSuggestions'] | undefined;
    let mappingSuggestion: AIResponse['mappingSuggestion'] | undefined;
    if (requestType === 'initial_suggestions') {
      try {
        // Extract JSON blob
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed?.suggestions)) {
            mappingSuggestions = parsed.suggestions
              .filter((s: any) => s && csvColumns.includes(s.csvColumn) && captions.includes(s.targetCaption))
              .map((s: any) => ({
                csvColumn: String(s.csvColumn),
                targetCaption: String(s.targetCaption),
                confidence: typeof s.confidence === 'number' ? s.confidence : 0.75,
              }));
            if (mappingSuggestions.length === 1) {
              mappingSuggestion = mappingSuggestions[0];
            }
          }
        }
      } catch {
        // Ignore JSON parse errors and fall back to heuristic
      }
    }

    if (!mappingSuggestions) {
      // Heuristic for single mapping in free-form text
      const match = aiResponse.match(/(?:map|mapping)\s+"?([^"]+?)"?\s+(?:to|→)\s+"?([^"\n]+)"?/i);
      if (match) {
        const suggestedColumn = match[1];
        const suggestedCaption = match[2];
        if (csvColumns.includes(suggestedColumn) && captions.includes(suggestedCaption)) {
          mappingSuggestion = {
            csvColumn: suggestedColumn,
            targetCaption: suggestedCaption,
            confidence: 0.85,
          };
        }
      }
    }

    const result: AIResponse = {
      content: aiResponse,
      mappingSuggestion,
      mappingSuggestions,
      provider: 'gemini',
      model,
    };

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
    console.error('AI Chat Gemini error:', error?.message || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', detail: String(error?.message || error) }),
    };
  }
};
