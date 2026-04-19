import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || !mimeType) return json({ error: 'Missing imageBase64 or mimeType' });

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY not configured on server' });

    // Try flash first (faster, more available), fall back to pro
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError = '';

    for (const model of models) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: 'Identify this disc golf disc. Reply ONLY with valid JSON (no markdown): {"name":"disc model name","brand":"manufacturer","type":"putter or midrange or fairway or distance"}. If you cannot identify it, use null for each field.' },
              ],
            }],
            generationConfig: { maxOutputTokens: 150, temperature: 0.1 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const err = await geminiRes.json().catch(() => ({}));
        lastError = `${model}: ${err.error?.message || geminiRes.status}`;
        continue;
      }

      const data = await geminiRes.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Strip markdown fences and extract JSON
      const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      // Try to extract JSON object if there's extra text around it
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return json({ error: `Could not parse response: ${rawText.slice(0, 100)}` });

      try {
        const result = JSON.parse(jsonMatch[0]);
        return json(result);
      } catch {
        return json({ error: `Invalid JSON from AI: ${cleaned.slice(0, 100)}` });
      }
    }

    return json({ error: `All models failed: ${lastError}` });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Identification failed' });
  }
});
