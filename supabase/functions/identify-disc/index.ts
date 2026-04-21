import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Require a valid Supabase user JWT — prevents unauthenticated Gemini API abuse
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || !mimeType) return json({ error: 'Missing imageBase64 or mimeType' });

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY not configured on server' });

    // Model IDs from https://ai.google.dev/gemini-api/docs/models (updated 2025)
    // gemini-1.5-* and gemini-2.0-flash are deprecated; use gemini-2.5-flash (stable)
    const candidates = [
      { model: 'gemini-2.5-flash', api: 'v1beta' },
      { model: 'gemini-2.5-pro',   api: 'v1beta' },
    ];
    let lastError = '';

    for (const { model, api } of candidates) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: `Identify this disc golf disc.

BRAND: The manufacturer name — usually in a logo at the top (e.g. Innova, Discmania, Discraft, Dynamic Discs, Latitude 64, MVP, Axiom, Prodigy, Westside, Kastaplast, Clash Discs, Streamline).

MOLD NAME: The specific disc model — usually the LARGEST text on the face (e.g. Wraith, Buzzz, Destroyer, Cloud Breaker 2, Stratosphere, Cosmic Fury 2, Pig, Wild Honey).
IGNORE these — they are NOT the mold name:
- Plastic types: Star, Champion, DX, Metal Flake, Swirly, Horizon, Lucid, Fuzion, S-Line, C-Line, Lumen, Burst
- Series labels: "Signature Series", "Tour Series", "Eagle McMahon", "Bradley Williams", "Kyle Klein", or any player name
- Disc category text: "Disc Golf", "Distance Driver"

DISC TYPE from rim shape:
- distance: thin sharp-edged wide rim
- fairway: moderate rim depth  
- midrange: blunt rim, flat
- putter: deep rounded blunt rim

FLIGHT RATINGS: Use your knowledge of this specific mold (Speed 1-14, Glide 1-7, Turn -5 to +1, Fade 0-5). Only null if you truly don't know the mold.

Output ONLY this JSON, nothing else:
{"name":"mold name","brand":"manufacturer","type":"distance OR fairway OR midrange OR putter","speed":9,"glide":5,"turn":-1,"fade":2}

Unidentifiable disc: {"name":null,"brand":null,"type":null,"speed":null,"glide":null,"turn":null,"fade":null}` },
              ],
            }],
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.1,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const err = await geminiRes.json().catch(() => ({}));
        lastError = `${model}(${api}): ${err.error?.message || geminiRes.status}`;
        continue;
      }

      const data = await geminiRes.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Strip markdown fences and extract JSON
      const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      // Extract the JSON object — handle partial truncation by trying to close it
      let jsonStr = (cleaned.match(/\{[\s\S]*\}/) || [])[0];
      if (!jsonStr) {
        // Try to recover a truncated object by closing it
        const partial = cleaned.match(/\{[\s\S]*/);
        if (partial) jsonStr = partial[0].replace(/,?\s*"[^"]*"?\s*:?\s*[^,}\n]*$/, '') + '}';
      }
      if (!jsonStr) return json({ error: `Could not parse response: ${rawText.slice(0, 120)}` });

      try {
        const result = JSON.parse(jsonStr);
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
